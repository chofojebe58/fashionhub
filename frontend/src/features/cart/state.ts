import { api } from '@api/client.ts';
import { loadCart, saveCart } from '@utils/storage.ts';
import type { CartItem } from '@app-types/cart.ts';

interface ApiCartItem {
  id: number;
  product_id: string;
  variant_id: number | null;
  quantity: number;
  name: string;
  price: number;
  image: string;
  old_price: number | null;
  size: string | null;
  color: string | null;
  sku: string | null;
}

interface ApiCartResponse {
  items: ApiCartItem[];
  total: number;
  count: number;
}

export interface AddToCartInput {
  id: string;
  name: string;
  price: number;
  image: string;
  variantId?: number;
  size?: string;
  color?: string;
}

let cart: CartItem[] = [];
let listeners: Array<(cart: CartItem[]) => void> = [];
let isLoading = false;
let useLocalFallback = false;
let localIdCounter = 1;

function mapApiItem(item: ApiCartItem): CartItem {
  return {
    id: item.id,
    productId: item.product_id,
    name: item.name,
    price: Number(item.price),
    image: item.image,
    quantity: Number(item.quantity),
    variantId: item.variant_id ?? undefined,
    size: item.size ?? undefined,
    color: item.color ?? undefined,
  };
}

function notify(): void {
  listeners.forEach(fn => fn(cart));
}

function persistLocalCart(): void {
  saveCart(cart);
}

function nextLocalId(): number {
  const maxId = cart.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  localIdCounter = Math.max(localIdCounter, maxId + 1);
  return localIdCounter++;
}

export function getCart(): CartItem[] {
  return cart;
}

export function isCartLoading(): boolean {
  return isLoading;
}

export function subscribe(fn: (cart: CartItem[]) => void): () => void {
  listeners.push(fn);

  return () => {
    listeners = listeners.filter(listener => listener !== fn);
  };
}

async function fetchAndRender(): Promise<void> {
  if (useLocalFallback) {
    cart = loadCart();
    notify();
    return;
  }

  try {
    isLoading = true;
    notify();

    const data = (await api.cart.get()) as ApiCartResponse;
    cart = data.items.map(mapApiItem);
    useLocalFallback = false;
    notify();
  } catch (error) {
    console.warn('Cart API unavailable, using local cart:', error);
    useLocalFallback = true;
    cart = loadCart();
    notify();
  } finally {
    isLoading = false;
    notify();
  }
}

function addToLocalCart(product: AddToCartInput): void {
  const existing = cart.find(
    item =>
      item.productId === product.id &&
      (item.variantId ?? undefined) === (product.variantId ?? undefined)
  );

  if (existing) {
    existing.quantity = Number(existing.quantity) + 1;
  } else {
    cart.push({
      id: nextLocalId(),
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity: 1,
      variantId: product.variantId,
      size: product.size,
      color: product.color,
    });
  }

  persistLocalCart();
  notify();
}

export async function addToCart(product: AddToCartInput): Promise<void> {
  if (useLocalFallback) {
    addToLocalCart(product);
    return;
  }

  try {
    await api.cart.add({
      productId: product.id,
      variantId: product.variantId,
      quantity: 1,
    });

    await fetchAndRender();
  } catch (error) {
    console.warn('Add to cart API failed, falling back to local cart:', error);
    useLocalFallback = true;
    cart = loadCart();
    addToLocalCart(product);
  }
}

export async function removeFromCart(itemId: number): Promise<void> {
  if (useLocalFallback) {
    cart = cart.filter(item => item.id !== itemId);
    persistLocalCart();
    notify();
    return;
  }

  try {
    await api.cart.remove(String(itemId));
    await fetchAndRender();
  } catch (error) {
    console.error('Failed to remove cart item:', error);
    throw error;
  }
}

export async function updateQuantity(
  itemId: number,
  delta: number
): Promise<void> {
  const item = cart.find(cartItem => cartItem.id === itemId);

  if (!item) return;

  const newQuantity = Number(item.quantity) + delta;

  if (newQuantity <= 0) {
    await removeFromCart(itemId);
    return;
  }

  if (useLocalFallback) {
    item.quantity = newQuantity;
    persistLocalCart();
    notify();
    return;
  }

  try {
    await api.cart.update(String(itemId), newQuantity);
    await fetchAndRender();
  } catch (error) {
    console.error('Failed to update cart quantity:', error);
    throw error;
  }
}

export async function clearCart(): Promise<void> {
  if (useLocalFallback) {
    cart = [];
    persistLocalCart();
    notify();
    return;
  }

  try {
    await api.cart.clear();
    cart = [];
    notify();
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
}

export function getCartTotal(): number {
  return cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
}

export function getCartCount(): number {
  return cart.reduce((sum, item) => sum + Number(item.quantity), 0);
}

export async function initCart(): Promise<void> {
  await fetchAndRender();
}
