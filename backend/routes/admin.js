import express from 'express';
import { db } from '../server.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

// In real app, check user role
function adminMiddleware(req, res, next) {
  // TODO: Add actual admin role check
  next();
}

router.get('/orders', adminMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

router.get('/products', adminMiddleware, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(products.map(p => ({ ...p, features: JSON.parse(p.features) })));
});

router.post('/products', adminMiddleware, validate(schemas.product), (req, res) => {
  const { id, name, price, old_price, image, description, features, category, stock } = req.validated;

  db.prepare(`
    INSERT OR REPLACE INTO products (id, name, price, old_price, image, description, features, category, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, price, old_price || null, image || null, description || null, JSON.stringify(features || []), category || null, stock || 0);
  res.status(201).json({ success: true });
});

router.delete('/products/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;