import express from 'express';
import { z } from 'zod';
import { db } from '../server.js';
import { getCartIdentifier, getCartItems } from '../services/cart.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

const quantitySchema = z.object({
  quantity: z.number().int().min(0)
});

router.get('/', (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.json({ items: [], total: 0, count: 0 });
  res.json(getCartItems(ident));
});

router.post('/', validate(schemas.cartItem), (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const { productId, variantId, quantity } = req.validated;
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  let availableStock = product.stock;
  if (variantId) {
    const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(variantId);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    availableStock = variant.stock;
  }

  const existing = ident.userId
    ? db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?').get(ident.userId, productId, variantId || null)
    : db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND product_id = ? AND variant_id = ?').get(ident.sessionId, productId, variantId || null);

  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, availableStock);
    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, existing.id);
  } else {
    if (quantity > availableStock) return res.status(400).json({ error: 'Not enough stock' });
    if (ident.userId) {
      db.prepare('INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)')
        .run(ident.userId, productId, variantId || null, quantity);
    } else {
      db.prepare('INSERT INTO cart_items (session_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)')
        .run(ident.sessionId, productId, variantId || null, quantity);
    }
  }

  res.json(getCartItems(getCartIdentifier(req)));
});

router.patch('/:itemId', validate(quantitySchema), (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const { quantity } = req.validated;
  const item = ident.userId
    ? db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.itemId, ident.userId)
    : db.prepare('SELECT * FROM cart_items WHERE id = ? AND session_id = ?').get(req.params.itemId, ident.sessionId);

  if (!item) return res.status(404).json({ error: 'Cart item not found' });

  if (quantity === 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.itemId);
  } else {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    let availableStock = product.stock;
    if (item.variant_id) {
      const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id);
      availableStock = variant?.stock || 0;
    }
    const newQty = Math.min(quantity, availableStock);
    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, req.params.itemId);
  }

  res.json(getCartItems(getCartIdentifier(req)));
});

router.delete('/:itemId', (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const result = ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.itemId, ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(req.params.itemId, ident.sessionId);

  if (result.changes === 0) return res.status(404).json({ error: 'Cart item not found' });
  res.status(204).send();
});

router.delete('/', (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(ident.sessionId);

  res.status(204).send();
});

export default router;