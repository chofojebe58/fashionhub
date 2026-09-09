import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, JWT_SECRET } from '../server.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', validate(schemas.register), async (req, res) => {
  const { email, password, firstName, lastName } = req.validated;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)');
  const info = stmt.run(email, passwordHash, firstName || '', lastName || '');

  const token = jwt.sign({ userId: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: info.lastInsertRowid, email, firstName, lastName } });
});

router.post('/login', validate(schemas.login), async (req, res) => {
  const { email, password } = req.validated;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
});

router.get('/me', (req, res) => {
  const user = db.prepare('SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, createdAt: user.created_at } });
});

export default router;