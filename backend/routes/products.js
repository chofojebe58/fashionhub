import express from 'express';
import { db } from '../db.js';
import { validate, schemas } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const SORTS = {
  'price-asc': 'price ASC, name ASC',
  'price-desc': 'price DESC, name ASC',
  newest: 'created_at DESC, name ASC',
  name: 'name ASC',
};

/** `features` is stored as a JSON string; never let a NULL/bad row crash the response. */
function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeProduct(row) {
  return {
    ...row,
    features: parseJsonArray(row.features),
    gallery: parseJsonArray(row.gallery),
    published: Boolean(row.published),
    featured: Boolean(row.featured),
  };
}

router.get('/', optionalAuth, validate(schemas.productQuery, 'query'), (req, res) => {
  const { category, search, sort, minPrice, maxPrice, limit, offset, featured } = req.validated;

  const where = [];
  const params = [];

  // Unpublished products are invisible to shoppers; an admin token sees them all.
  if (req.user?.role !== 'admin') where.push('published = 1');
  if (featured) where.push('featured = 1');

  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (minPrice !== undefined) {
    where.push('price >= ?');
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    where.push('price <= ?');
    params.push(maxPrice);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = `ORDER BY ${SORTS[sort] ?? SORTS.name}`;

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM products ${whereSql}`)
    .get(...params);

  const pageSql = `SELECT * FROM products ${whereSql} ${orderSql} LIMIT ? OFFSET ?`;
  const products = db
    .prepare(pageSql)
    .all(...params, limit ?? 100, offset ?? 0);

  res.set('X-Total-Count', String(total));
  res.json(products.map(serializeProduct));
});

/** Distinct categories with product counts — drives the shop filter list. */
router.get('/meta/categories', (req, res) => {
  const categories = db
    .prepare(
      `SELECT category AS name, COUNT(*) AS count
       FROM products
       WHERE category IS NOT NULL AND category <> '' AND published = 1
       GROUP BY category
       ORDER BY category ASC`
    )
    .all();
  res.json(categories);
});

router.get('/:id', optionalAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!product.published && req.user?.role !== 'admin') {
    return res.status(404).json({ error: 'Product not found' });
  }

  const variants = db
    .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color')
    .all(product.id);

  res.json({ ...serializeProduct(product), variants });
});

router.get('/:id/variants', (req, res) => {
  const variants = db
    .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color')
    .all(req.params.id);
  res.json(variants);
});

export default router;
