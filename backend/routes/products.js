import express from 'express';
import { z } from 'zod';
import { db } from '../server.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, search, sort, minPrice, maxPrice, limit, offset } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) { query += ' AND category = ?'; params.push(category); }
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (minPrice) { query += ' AND price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND price <= ?'; params.push(Number(maxPrice)); }

  switch (sort) {
    case 'price-asc': query += ' ORDER BY price ASC'; break;
    case 'price-desc': query += ' ORDER BY price DESC'; break;
    case 'newest': query += ' ORDER BY created_at DESC'; break;
    default: query += ' ORDER BY name ASC';
  }

  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); }
  if (offset) { query += ' OFFSET ?'; params.push(Number(offset)); }

  const products = db.prepare(query).all(...params);
  res.json(products.map(p => ({ ...p, features: JSON.parse(p.features) })));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id);
  res.json({ ...product, features: JSON.parse(product.features), variants });
});

router.get('/:id/variants', (req, res) => {
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id);
  res.json(variants);
});

export default router;