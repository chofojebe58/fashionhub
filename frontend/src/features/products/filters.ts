import { getProductCatalog } from './catalog.ts';
import type { Product } from '@app-types/cart.ts';

export interface FilterState {
  query: string;
  categories: string[];
  priceRange: [number, number];
  inStock: boolean;
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest';
}

const defaultFilters: FilterState = {
  query: '',
  categories: [],
  priceRange: [0, 1000],
  inStock: false,
  sortBy: 'name',
};

let currentFilters = { ...defaultFilters };
let listeners: Array<(filters: FilterState, results: Product[]) => void> = [];

export function getFilters(): FilterState {
  return { ...currentFilters };
}

export function setFilters(partial: Partial<FilterState>): void {
  currentFilters = { ...currentFilters, ...partial };
  notify();
}

export function resetFilters(): void {
  currentFilters = { ...defaultFilters };
  notify();
}

export function subscribe(fn: (filters: FilterState, results: Product[]) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

function notify(): void {
  const results = applyFilters(getProductCatalog(), currentFilters);
  listeners.forEach(fn => fn(currentFilters, results));
}

function applyFilters(catalog: Record<string, Product>, filters: FilterState): Product[] {
  let products = Object.values(catalog);

  if (filters.query) {
    const q = filters.query.toLowerCase();
    products = products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.features.some(f => f.toLowerCase().includes(q))
    );
  }

  if (filters.categories.length > 0) {
    products = products.filter(p =>
      filters.categories.some(
        c => p.id.includes(c.toLowerCase()) || p.name.toLowerCase().includes(c.toLowerCase())
      )
    );
  }

  products = products.filter(
    p => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
  );

  if (filters.inStock) {
    products = products.filter(p => p.price > 0);
  }

  products.sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return b.id.localeCompare(a.id);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return products;
}

export function getFilteredProducts(): Product[] {
  return applyFilters(getProductCatalog(), currentFilters);
}
