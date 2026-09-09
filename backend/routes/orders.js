import express from 'express';
import { db } from '../server.js';
import { getCartIdentifier } from '../services/cart.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.post('/', optionalAuth, validate(schemas.checkout), async (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  let query = `
    SELECT ci.*, p.name, p.price, p.image, pv.size, pv.color
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE 1=1
  `;
  const params = [];
  if (ident.userId) { query += ' AND ci.user_id = ?'; params.push(ident.userId); }
  else { query += ' AND ci.session_id = ?'; params.push(ident.sessionId); }

  const cartItems = db.prepare(query).all(...params);
  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

  for (const item of cartItems) {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    let availableStock = product.stock;
    if (item.variant_id) {
      const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id);
      availableStock = variant?.stock || 0;
    }
    if (item.quantity > availableStock) {
      return res.status(400).json({ error: `Not enough stock for ${item.name}` });
    }
  }

  const { email, firstName, lastName, address, city, postalCode, country, paymentMethodId } = req.validated;
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= 99 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  const orderStmt = db.prepare(`
    INSERT INTO orders (id, user_id, session_id, email, first_name, last_name, address, city, postal_code, country, subtotal, shipping, tax, total, status, payment_intent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  orderStmt.run(
    orderId,
    ident.userId || null,
    ident.sessionId || null,
    email, firstName, lastName, address, city, postalCode, country,
    subtotal, shipping, tax, total, 'confirmed', paymentMethodId || null
  );

  const orderItemStmt = db.prepare(`
    INSERT INTO order_items (order_id, product_id, variant_id, name, price, quantity, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of cartItems) {
    orderItemStmt.run(orderId, item.product_id, item.variant_id || null, item.name, item.price, item.quantity, item.image);
    if (item.variant_id) {
      db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(item.quantity, item.variant_id);
    } else {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
  }

  ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(ident.sessionId);

  res.status(201).json({ orderId, total, status: 'confirmed' });
});

router.get('/', authMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.userId);
  res.json(orders);
});

router.get('/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

export default router;