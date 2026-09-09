import { loadProducts, saveProducts } from '../utils/storage.ts';
import type { Product } from '../types/cart.ts';

const DEFAULT_PRODUCTS: Record<string, Product> = {
  'linen-blend-blazer': {
    id: 'linen-blend-blazer',
    name: 'Linen Blend Blazer',
    price: 89.99,
    oldPrice: 129.99,
    image:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    description:
      'A tailored, lightweight essential designed to bring structure and softness to your everyday wardrobe.',
    features: [
      'Premium linen blend texture',
      'Relaxed tailored fit',
      'Made for layering all season',
    ],
    rating: '★★★★★',
    reviews: '(124 reviews)',
  },
  'ribbed-knit-top': {
    id: 'ribbed-knit-top',
    name: 'Ribbed Knit Top',
    price: 25.99,
    oldPrice: 49.0,
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    description:
      'Soft-touch knitwear with a flattering silhouette that layers beautifully from work to weekend.',
    features: ['Breathable cotton blend', 'Stretch comfort fit', 'Elevated everyday staple'],
    rating: '★★★★★',
    reviews: '(98 reviews)',
  },
  'wide-leg-trousers': {
    id: 'wide-leg-trousers',
    name: 'Wide Leg Trousers',
    price: 59.99,
    oldPrice: 85.99,
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    description:
      'Crafted to create a fluid silhouette with a polished finish that moves effortlessly through the day.',
    features: ['Soft drape fabric', 'Comfortable high-rise waist', 'Day-to-evening versatility'],
    rating: '★★★★★',
    reviews: '(181 reviews)',
  },
  'leather-shoulder-bag': {
    id: 'leather-shoulder-bag',
    name: 'Leather Shoulder Bag',
    price: 79.99,
    oldPrice: 110.0,
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
    description:
      'A refined everyday companion with structured lines, room for essentials, and timeless appeal.',
    features: ['Full-grain leather finish', 'Spacious interior', 'Adjustable strap comfort'],
    rating: '★★★★★',
    reviews: '(112 reviews)',
  },
  'minimalist-strappy-heels': {
    id: 'minimalist-strappy-heels',
    name: 'Minimalist Strappy Heels',
    price: 49.99,
    oldPrice: 79.0,
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    description:
      'A sleek statement heel with a refined profile that elevates evening wear and special occasions alike.',
    features: ['Comfort cushioned insole', 'Lightweight design', 'Elegant evening-ready finish'],
    rating: '★★★★★',
    reviews: '(164 reviews)',
  },
};

let productCatalog: Record<string, Product> | null = null;

export function getProductCatalog(): Record<string, Product> {
  if (!productCatalog) {
    productCatalog = loadProducts() || DEFAULT_PRODUCTS;
  }
  return productCatalog;
}

export function getProduct(id: string): Product {
  const catalog = getProductCatalog();
  return catalog[id] || catalog['linen-blend-blazer'];
}

export function setProductCatalog(catalog: Record<string, Product>): void {
  productCatalog = catalog;
  saveProducts(catalog);
}

export function addProduct(product: Product): void {
  const catalog = getProductCatalog();
  catalog[product.id] = product;
  saveProducts(catalog);
}

export function deleteProduct(id: string): void {
  const catalog = getProductCatalog();
  delete catalog[id];
  saveProducts(catalog);
}

export function resetToDefaults(): void {
  productCatalog = DEFAULT_PRODUCTS;
  saveProducts(DEFAULT_PRODUCTS);
}
