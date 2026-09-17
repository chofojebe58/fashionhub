import Database from 'better-sqlite3';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const dbPath = resolve(__dirname, '..', 'fashionhub.db');

const db = new Database(dbPath);

const products = [
  {
    id: 'linen-blend-blazer',
    name: 'Linen Blend Blazer',
    price: 89.99,
    old_price: 129.99,
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    description: 'A tailored, lightweight essential designed to bring structure and softness to your everyday wardrobe.',
    features: JSON.stringify(['Premium linen blend texture', 'Relaxed tailored fit', 'Made for layering all season']),
    rating: '★★★★★',
    reviews: '(124 reviews)',
    category: 'Women',
    stock: 50
  },
  {
    id: 'ribbed-knit-top',
    name: 'Ribbed Knit Top',
    price: 25.99,
    old_price: 49.00,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    description: 'Soft-touch knitwear with a flattering silhouette that layers beautifully from work to weekend.',
    features: JSON.stringify(['Breathable cotton blend', 'Stretch comfort fit', 'Elevated everyday staple']),
    rating: '★★★★★',
    reviews: '(98 reviews)',
    category: 'Women',
    stock: 100
  },
  {
    id: 'wide-leg-trousers',
    name: 'Wide Leg Trousers',
    price: 59.99,
    old_price: 85.99,
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    description: 'Crafted to create a fluid silhouette with a polished finish that moves effortlessly through the day.',
    features: JSON.stringify(['Soft drape fabric', 'Comfortable high-rise waist', 'Day-to-evening versatility']),
    rating: '★★★★★',
    reviews: '(181 reviews)',
    category: 'Women',
    stock: 75
  },
  {
    id: 'leather-shoulder-bag',
    name: 'Leather Shoulder Bag',
    price: 79.99,
    old_price: 110.00,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&
    
    
    =80',
    description: 'A refined everyday companion with structured lines, room for essentials, and timeless appeal.',
    features: JSON.stringify(['Full-grain leather finish', 'Spacious interior', 'Adjustable strap comfort']),
    rating: '★★★★★',
    reviews: '(112 reviews)',
    category: 'Bags',
    stock: 30
  },
  {
    id: 'minimalist-strappy-heels',
    name: 'Minimalist Strappy Heels',
    price: 49.99,
    old_price: 79.00,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    description: 'A sleek statement heel with a refined profile that elevates evening wear and special occasions alike.',
    features: JSON.stringify(['Comfort cushioned insole', 'Lightweight design', 'Elegant evening-ready finish']),
    rating: '★★★★★',
    reviews: '(164 reviews)',
    category: 'Shoes',
    stock: 40
  }
];

const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (id, name, price, old_price, image, description, features, rating, reviews, category, stock)
  VALUES (@id, @name, @price, @old_price, @image, @description, @features, @rating, @reviews, @category, @stock)
`);

const insertVariant = db.prepare(`
  INSERT OR IGNORE INTO product_variants (product_id, size, color, sku, stock)
  VALUES (@product_id, @size, @color, @sku, @stock)
`);

const variants = [
  // Linen Blend Blazer variants
  { product_id: 'linen-blend-blazer', size: 'XS', color: 'Beige', sku: 'LBB-BEI-XS', stock: 5 },
  { product_id: 'linen-blend-blazer', size: 'S', color: 'Beige', sku: 'LBB-BEI-S', stock: 10 },
  { product_id: 'linen-blend-blazer', size: 'M', color: 'Beige', sku: 'LBB-BEI-M', stock: 15 },
  { product_id: 'linen-blend-blazer', size: 'L', color: 'Beige', sku: 'LBB-BEI-L', stock: 10 },
  { product_id: 'linen-blend-blazer', size: 'XL', color: 'Beige', sku: 'LBB-BEI-XL', stock: 5 },
  { product_id: 'linen-blend-blazer', size: 'XS', color: 'Black', sku: 'LBB-BLK-XS', stock: 5 },
  { product_id: 'linen-blend-blazer', size: 'S', color: 'Black', sku: 'LBB-BLK-S', stock: 10 },
  { product_id: 'linen-blend-blazer', size: 'M', color: 'Black', sku: 'LBB-BLK-M', stock: 15 },
  { product_id: 'linen-blend-blazer', size: 'L', color: 'Black', sku: 'LBB-BLK-L', stock: 10 },
  { product_id: 'linen-blend-blazer', size: 'XL', color: 'Black', sku: 'LBB-BLK-XL', stock: 5 },

  // Ribbed Knit Top variants
  { product_id: 'ribbed-knit-top', size: 'XS', color: 'Cream', sku: 'RKT-CRM-XS', stock: 20 },
  { product_id: 'ribbed-knit-top', size: 'S', color: 'Cream', sku: 'RKT-CRM-S', stock: 25 },
  { product_id: 'ribbed-knit-top', size: 'M', color: 'Cream', sku: 'RKT-CRM-M', stock: 30 },
  { product_id: 'ribbed-knit-top', size: 'L', color: 'Cream', sku: 'RKT-CRM-L', stock: 15 },
  { product_id: 'ribbed-knit-top', size: 'XS', color: 'Black', sku: 'RKT-BLK-XS', stock: 10 },
  { product_id: 'ribbed-knit-top', size: 'S', color: 'Black', sku: 'RKT-BLK-S', stock: 15 },
  { product_id: 'ribbed-knit-top', size: 'M', color: 'Black', sku: 'RKT-BLK-M', stock: 20 },
  { product_id: 'ribbed-knit-top', size: 'L', color: 'Black', sku: 'RKT-BLK-L', stock: 10 },

  // Wide Leg Trousers variants
  { product_id: 'wide-leg-trousers', size: '24', color: 'Charcoal', sku: 'WLT-CHA-24', stock: 8 },
  { product_id: 'wide-leg-trousers', size: '26', color: 'Charcoal', sku: 'WLT-CHA-26', stock: 12 },
  { product_id: 'wide-leg-trousers', size: '28', color: 'Charcoal', sku: 'WLT-CHA-28', stock: 15 },
  { product_id: 'wide-leg-trousers', size: '30', color: 'Charcoal', sku: 'WLT-CHA-30', stock: 12 },
  { product_id: 'wide-leg-trousers', size: '32', color: 'Charcoal', sku: 'WLT-CHA-32', stock: 8 },
  { product_id: 'wide-leg-trousers', size: '24', color: 'Navy', sku: 'WLT-NAV-24', stock: 5 },
  { product_id: 'wide-leg-trousers', size: '26', color: 'Navy', sku: 'WLT-NAV-26', stock: 10 },
  { product_id: 'wide-leg-trousers', size: '28', color: 'Navy', sku: 'WLT-NAV-28', stock: 12 },
  { product_id: 'wide-leg-trousers', size: '30', color: 'Navy', sku: 'WLT-NAV-30', stock: 10 },
  { product_id: 'wide-leg-trousers', size: '32', color: 'Navy', sku: 'WLT-NAV-32', stock: 5 },

  // Leather Shoulder Bag variants
  { product_id: 'leather-shoulder-bag', size: 'One Size', color: 'Tan', sku: 'LSB-TAN-OS', stock: 15 },
  { product_id: 'leather-shoulder-bag', size: 'One Size', color: 'Black', sku: 'LSB-BLK-OS', stock: 15 },

  // Minimalist Strappy Heels variants
  { product_id: 'minimalist-strappy-heels', size: '36', color: 'Black', sku: 'MSH-BLK-36', stock: 5 },
  { product_id: 'minimalist-strappy-heels', size: '37', color: 'Black', sku: 'MSH-BLK-37', stock: 8 },
  { product_id: 'minimalist-strappy-heels', size: '38', color: 'Black', sku: 'MSH-BLK-38', stock: 10 },
  { product_id: 'minimalist-strappy-heels', size: '39', color: 'Black', sku: 'MSH-BLK-39', stock: 8 },
  { product_id: 'minimalist-strappy-heels', size: '40', color: 'Black', sku: 'MSH-BLK-40', stock: 5 },
  { product_id: 'minimalist-strappy-heels', size: '36', color: 'Nude', sku: 'MSH-NUD-36', stock: 5 },
  { product_id: 'minimalist-strappy-heels', size: '37', color: 'Nude', sku: 'MSH-NUD-37', stock: 8 },
  { product_id: 'minimalist-strappy-heels', size: '38', color: 'Nude', sku: 'MSH-NUD-38', stock: 10 },
  { product_id: 'minimalist-strappy-heels', size: '39', color: 'Nude', sku: 'MSH-NUD-39', stock: 8 },
  { product_id: 'minimalist-strappy-heels', size: '40', color: 'Nude', sku: 'MSH-NUD-40', stock: 5 },
];

const transaction = db.transaction(() => {
  for (const product of products) {
    insertProduct.run(product);
  }
  for (const variant of variants) {
    insertVariant.run(variant);
  }
});

transaction();
console.log('Database seeded with', products.length, 'products and', variants.length, 'variants');
db.close();