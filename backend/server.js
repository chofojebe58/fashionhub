import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import subscriberRoutes from './routes/subscribers.js';
import adminRoutes from './routes/admin.js';
import { authMiddleware, optionalAuth } from './middleware/auth.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const dbPath = resolve(__dirname, 'fashionhub.db');
export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
app.use('/api/auth', authLimiter);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', optionalAuth, cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/admin', adminRoutes);

// --- Health check ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
import { z } from 'zod';
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof z.ZodError) {
    return res.status(400).json({ errors: err.flatten() });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});