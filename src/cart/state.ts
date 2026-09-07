import { api } from '../api/client.ts';
import { renderCartUI } from './ui.ts';
import type { CartItem } from '../types/cart.ts';

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
}

let cart: CartItem[] = [];
let listeners: Array<(cart: CartItem[]) => void> = [];
let isLoading = false;

function mapApiItem(item: ApiCartItem): CartItem {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    quantity: item.quantity,
    variantId: item.variant_id ?? undefined,
    size: item.size ?? undefined,
    color: item.color ?? undefined,
  };
}

function notify() {
  listeners.forEach(fn => fn(cart));
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
    listeners = listeners.filter(l => l !== fn);
  };
}

async function fetchAndRender(): Promise<void> {
  try {
    isLoading = true;
    notify();
    const data = (await api.cart.get()) as ApiCartResponse;
    cart = data.items.map(mapApiItem);
    notify();
  } catch (err) {
    console.error('Failed to fetch cart:', err);
    cart = [];
    notify();
  } finally {
    isLoading = false;
    notify();
  }
}

export async function addToCart(product: AddToCartInput): Promise<void> {
  try {
    await api.cart.add({
      productId: product.id,
      variantId: product.variantId,
      quantity: 1,
    });
    await fetchAndRender();
  } catch (err) {
    console.error('Failed to add to cart:', err);
    throw err;
  }
}

export async function removeFromCart(itemId: number): Promise<void> {
  try {
    await api.cart.remove(String(itemId));
    await fetchAndRender();
  } catch (err) {
    console.error('Failed to remove from cart:', err);
    throw err;
  }
}

export async function updateQuantity(itemId: number, delta: number): Promise<void> {
  const item = cart.find(i => i.id === itemId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    await removeFromCart(itemId);
    return;
  }
  try {
    await api.cart.update(String(itemId), newQty);
    await fetchAndRender();
  } catch (err) {
    console.error('Failed to update quantity:', err);
    throw err;
  }
}

export async function clearCart(): Promise<void> {
  try {
    await api.cart.clear();
    cart = [];
    notify();
  } catch (err) {
    console.error('Failed to clear cart:', err);
    throw err;
  }
}

export function getCartTotal(): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount(): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export async function initCart(): Promise<void> {
  await fetchAndRender();
  renderCartUI();
}
