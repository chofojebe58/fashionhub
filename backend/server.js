import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const dbPath = resolve(__dirname, 'fashionhub.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
}

// --- Validation schemas ---
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.number().optional(),
  quantity: z.number().int().min(1).max(99)
});

const checkoutSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('US'),
  paymentMethodId: z.string().optional() // Stripe payment method ID
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() });

  const { email, password, firstName, lastName } = result.data;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)');
  const info = stmt.run(email, passwordHash, firstName || '', lastName || '');

  const token = jwt.sign({ userId: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: info.lastInsertRowid, email, firstName, lastName } });
});

app.post('/api/auth/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() });

  const { email, password } = result.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, createdAt: user.created_at } });
});

// --- Product Routes ---
app.get('/api/products', (req, res) => {
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

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id);
  res.json({ ...product, features: JSON.parse(product.features), variants });
});

app.get('/api/products/:id/variants', (req, res) => {
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id);
  res.json(variants);
});

// --- Cart Routes ---
function getCartIdentifier(req) {
  if (req.user) return { userId: req.user.userId };
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) return null;
  return { sessionId };
}

app.get('/api/cart', optionalAuth, (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.json({ items: [], total: 0, count: 0 });

  let query = `
    SELECT ci.*, p.name, p.price, p.image, p.old_price, pv.size, pv.color, pv.sku
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE 1=1
  `;
  const params = [];
  if (ident.userId) { query += ' AND ci.user_id = ?'; params.push(ident.userId); }
  else { query += ' AND ci.session_id = ?'; params.push(ident.sessionId); }

  const items = db.prepare(query).all(...params);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ items, total, count });
});

app.post('/api/cart', optionalAuth, (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const result = cartItemSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() });

  const { productId, variantId, quantity } = result.data;
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
    if (ident.userId) {
      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, existing.id);
    }
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

  // Return updated cart
  const updatedIdent = getCartIdentifier(req);
  let query = `
    SELECT ci.*, p.name, p.price, p.image, p.old_price, pv.size, pv.color
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE 1=1
  `;
  const params = [];
  if (updatedIdent.userId) { query += ' AND ci.user_id = ?'; params.push(updatedIdent.userId); }
  else { query += ' AND ci.session_id = ?'; params.push(updatedIdent.sessionId); }

  const items = db.prepare(query).all(...params);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ items, total, count });
});

app.patch('/api/cart/:itemId', optionalAuth, (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: 'Invalid quantity' });

  const item = ident.userId
    ? db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.itemId, ident.userId)
    : db.prepare('SELECT * FROM cart_items WHERE id = ? AND session_id = ?').get(req.params.itemId, ident.sessionId);

  if (!item) return res.status(404).json({ error: 'Cart item not found' });

  if (quantity === 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.itemId);
  } else {
    // Check stock
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    let availableStock = product.stock;
    if (item.variant_id) {
      const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id);
      availableStock = variant?.stock || 0;
    }
    const newQty = Math.min(quantity, availableStock);
    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, req.params.itemId);
  }

  // Return updated cart
  const updatedIdent = getCartIdentifier(req);
  let query = `
    SELECT ci.*, p.name, p.price, p.image, p.old_price, pv.size, pv.color
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE 1=1
  `;
  const params = [];
  if (updatedIdent.userId) { query += ' AND ci.user_id = ?'; params.push(updatedIdent.userId); }
  else { query += ' AND ci.session_id = ?'; params.push(updatedIdent.sessionId); }

  const items = db.prepare(query).all(...params);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ items, total, count });
});

app.delete('/api/cart/:itemId', optionalAuth, (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const result = ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.itemId, ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(req.params.itemId, ident.sessionId);

  if (result.changes === 0) return res.status(404).json({ error: 'Cart item not found' });
  res.status(204).send();
});

app.delete('/api/cart', optionalAuth, (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(ident.sessionId);

  res.status(204).send();
});

// --- Orders Routes ---
app.post('/api/orders', optionalAuth, async (req, res) => {
  const ident = getCartIdentifier(req);
  if (!ident) return res.status(400).json({ error: 'Session ID required' });

  const result = checkoutSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() });

  // Get cart items
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

  // Verify stock
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

  const { email, firstName, lastName, address, city, postalCode, country, paymentMethodId } = result.data;
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= 99 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // TODO: Process payment with Stripe if paymentMethodId provided
  // const paymentIntent = await stripe.paymentIntents.create({ ... });

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
    // Decrement stock
    if (item.variant_id) {
      db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(item.quantity, item.variant_id);
    } else {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
  }

  // Clear cart
  ident.userId
    ? db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(ident.userId)
    : db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(ident.sessionId);

  res.status(201).json({ orderId, total, status: 'confirmed' });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.userId);
  res.json(orders);
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

// --- Subscriber Routes ---
app.post('/api/subscribers', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  try {
    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email);
    res.status(201).json({ success: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email already subscribed' });
    }
    throw e;
  }
});

// --- Admin Routes (protected) ---
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    // In real app, check user role
    next();
  });
}

app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

app.get('/api/admin/products', adminMiddleware, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(products.map(p => ({ ...p, features: JSON.parse(p.features) })));
});

app.post('/api/admin/products', adminMiddleware, (req, res) => {
  const { id, name, price, old_price, image, description, features, category, stock } = req.body;
  if (!id || !name || !price) return res.status(400).json({ error: 'id, name, price required' });

  db.prepare(`
    INSERT OR REPLACE INTO products (id, name, price, old_price, image, description, features, category, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, price, old_price || null, image || null, description || null, JSON.stringify(features || []), category || null, stock || 0);
  res.status(201).json({ success: true });
});

app.delete('/api/admin/products/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Health check ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});