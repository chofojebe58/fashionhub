import type { CartItem, Product, Order } from '../types/cart.ts';

const STORAGE_KEYS = {
  cart: 'fashionhub-cart',
  orders: 'fashionhub-orders',
  products: 'fashionhub-products',
  subscriberEmail: 'fashionhub-subscriber-email',
} as const;

export function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.cart) || '[]';
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

export function loadOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  try {
    const existing = loadOrders();
    existing.push(order);
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function loadProducts(): Record<string, Product> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.products);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      const map: Record<string, Product> = {};
      parsed.forEach(p => {
        if (p && p.id) map[p.id] = p;
      });
      return map;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProducts(products: Product[] | Record<string, Product>): void {
  const arr = Array.isArray(products) ? products : Object.values(products);
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(arr));
}

export function getSubscriberEmail(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.subscriberEmail) || '';
  } catch {
    return '';
  }
}

export function setSubscriberEmail(email: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.subscriberEmail, email);
  } catch {
    // ignore
  }
}
