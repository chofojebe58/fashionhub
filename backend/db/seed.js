/**
 * Seeds the catalogue: 5 products + 40 size/colour variants.
 *
 * Safe to re-run: products are upserted and variants are inserted only if the
 * SKU is new. Run `npm run db:migrate` first.
 */
import { db } from '../db.js';

const IMG = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const products = [
  {
    id: 'linen-blend-blazer',
    name: 'Linen Blend Blazer',
    price: 89.99,
    old_price: 129.99,
    image: IMG('photo-1529139574466-a303027c1d8b'),
    description:
      'A tailored, lightweight essential designed to bring structure and softness to your everyday wardrobe.',
    features: [
      'Premium linen blend texture',
      'Relaxed tailored fit',
      'Made for layering all season',
    ],
    rating: '★★★★★',
    reviews: '(124 reviews)',
    category: 'Women',
    stock: 50,
    featured: 1,
    created_at: '2026-01-12 09:00:00',
  },
  {
    id: 'ribbed-knit-top',
    name: 'Ribbed Knit Top',
    price: 25.99,
    old_price: 49.0,
    image: IMG('photo-1483985988355-763728e1935b'),
    description:
      'Soft-touch knitwear with a flattering silhouette that layers beautifully from work to weekend.',
    features: ['Breathable cotton blend', 'Stretch comfort fit', 'Elevated everyday staple'],
    rating: '★★★★★',
    reviews: '(98 reviews)',
    category: 'Tops',
    stock: 100,
    featured: 1,
    created_at: '2026-02-03 09:00:00',
  },
  {
    id: 'wide-leg-trousers',
    name: 'Wide Leg Trousers',
    price: 59.99,
    old_price: 85.99,
    image: IMG('photo-1524504388940-b1c1722653e1'),
    description:
      'Crafted to create a fluid silhouette with a polished finish that moves effortlessly through the day.',
    features: ['Soft drape fabric', 'Comfortable high-rise waist', 'Day-to-evening versatility'],
    rating: '★★★★★',
    reviews: '(181 reviews)',
    category: 'Women',
    stock: 75,
    featured: 1,
    created_at: '2026-03-18 09:00:00',
  },
  {
    id: 'leather-shoulder-bag',
    name: 'Leather Shoulder Bag',
    price: 79.99,
    old_price: 110.0,
    image: IMG('photo-1584917865442-de89df76afd3'),
    description:
      'A refined everyday companion with structured lines, room for essentials, and timeless appeal.',
    features: ['Full-grain leather finish', 'Spacious interior', 'Adjustable strap comfort'],
    rating: '★★★★★',
    reviews: '(112 reviews)',
    category: 'Bags',
    stock: 30,
    featured: 0,
    created_at: '2026-04-27 09:00:00',
  },
  {
    id: 'minimalist-strappy-heels',
    name: 'Minimalist Strappy Heels',
    price: 49.99,
    old_price: 79.0,
    image: IMG('photo-1517841905240-472988babdf9'),
    description:
      'A sleek statement heel with a refined profile that elevates evening wear and special occasions alike.',
    features: ['Comfort cushioned insole', 'Lightweight design', 'Elegant evening-ready finish'],
    rating: '★★★★★',
    reviews: '(164 reviews)',
    category: 'Shoes',
    stock: 40,
    featured: 0,
    created_at: '2026-05-09 09:00:00',
  },
];

const sizes = {
  apparel: ['XS', 'S', 'M', 'L', 'XL'],
  waist: ['24', '26', '28', '30', '32'],
  euShoe: ['36', '37', '38', '39', '40'],
  one: ['One Size'],
};

/** [productId, sizeSet, colours, prefix, stockBySize] */
const variantSpecs = [
  ['linen-blend-blazer', sizes.apparel, ['Beige', 'Black'], 'LBB', { XS: 5, S: 10, M: 15, L: 10, XL: 5 }],
  ['ribbed-knit-top', sizes.apparel.slice(0, 4), ['Cream', 'Black'], 'RKT', { XS: 20, S: 25, M: 30, L: 15 }],
  ['wide-leg-trousers', sizes.waist, ['Charcoal', 'Navy'], 'WLT', { 24: 8, 26: 12, 28: 15, 30: 12, 32: 8 }],
  ['leather-shoulder-bag', sizes.one, ['Tan', 'Black'], 'LSB', { 'One Size': 15 }],
  ['minimalist-strappy-heels', sizes.euShoe, ['Black', 'Nude'], 'MSH', { 36: 5, 37: 8, 38: 10, 39: 8, 40: 5 }],
];

const colourCode = {
  Beige: 'BEI', Black: 'BLK', Cream: 'CRM', Charcoal: 'CHA', Navy: 'NAV',
  Tan: 'TAN', Nude: 'NUD',
};

const sizeCode = (size) =>
  size === 'One Size' ? 'OS' : /^\d+$/.test(size) ? size : size;

const variants = variantSpecs.flatMap(([productId, sizeList, colours, prefix, stockBySize]) =>
  colours.flatMap((color) =>
    sizeList.map((size) => ({
      product_id: productId,
      size,
      color,
      sku: `${prefix}-${colourCode[color] || color.slice(0, 3).toUpperCase()}-${sizeCode(size)}`,
      stock: stockBySize[size] ?? 0,
    }))
  )
);

const insertProduct = db.prepare(`
  INSERT INTO products
    (id, name, price, old_price, image, description, features, rating, reviews,
     category, stock, created_at, published, featured, gallery)
  VALUES
    (@id, @name, @price, @old_price, @image, @description, @features, @rating, @reviews,
     @category, @stock, @created_at, 1, @featured, '[]')
  ON CONFLICT(id) DO UPDATE SET
    name        = excluded.name,
    price       = excluded.price,
    old_price   = excluded.old_price,
    image       = excluded.image,
    description = excluded.description,
    features    = excluded.features,
    rating      = excluded.rating,
    reviews     = excluded.reviews,
    category    = excluded.category,
    stock       = excluded.stock,
    updated_at  = CURRENT_TIMESTAMP
`);

const insertVariant = db.prepare(`
  INSERT OR IGNORE INTO product_variants (product_id, size, color, sku, stock)
  VALUES (@product_id, @size, @color, @sku, @stock)
`);

const seed = db.transaction(() => {
  for (const product of products) {
    insertProduct.run({
      ...product,
      features: JSON.stringify(product.features),
      featured: product.featured ?? 0,
    });
  }
  for (const variant of variants) {
    insertVariant.run(variant);
  }
});

seed();

console.log(
  `✓ Seeded ${products.length} products and ${variants.length} variants into ${db.name}`
);
