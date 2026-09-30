import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { validate, schemas } from '../middleware/validate.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import { mergeGuestCartIntoUser } from '../services/cart.js';

const router = express.Router();

const PUBLIC_USER_FIELDS = 'id, email, first_name, last_name, role, created_at';

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role || 'customer',
    createdAt: row.created_at,
  };
}

router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.validated;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const info = db
      .prepare(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
      )
      .run(email, passwordHash, firstName, lastName);

    const user = db
      .prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
      .get(info.lastInsertRowid);

    // Adopt whatever was in the guest cart for this browser.
    const sessionId = req.headers['x-session-id'];
    const cart = sessionId ? mergeGuestCartIntoUser(String(sessionId), user.id) : { merged: 0 };

    res.status(201).json({ token: signToken(user), user: toPublicUser(user), cartMerged: cart.merged });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    const user = db
      .prepare(`SELECT ${PUBLIC_USER_FIELDS}, password_hash FROM users WHERE email = ?`)
      .get(email);

    // Same message for "no such user" and "wrong password" so the endpoint
    // cannot be used to enumerate registered addresses.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionId = req.headers['x-session-id'];
    const cart = sessionId ? mergeGuestCartIntoUser(String(sessionId), user.id) : { merged: 0 };

    res.json({ token: signToken(user), user: toPublicUser(user), cartMerged: cart.merged });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db
    .prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
    .get(req.user.userId);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
});

/** Update the signed-in user's name. */
router.patch('/me', authMiddleware, validate(schemas.updateProfile), (req, res) => {
  const { firstName, lastName } = req.validated;

  const fields = [];
  const values = [];
  if (firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(firstName);
  }
  if (lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(lastName);
  }

  db.prepare(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(...values, req.user.userId);

  const user = db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(req.user.userId);
  res.json({ user: toPublicUser(user) });
});

/** Change the password. Requires the current one, and re-issues the token. */
router.post('/password', authMiddleware, validate(schemas.changePassword), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validated;

    const user = db
      .prepare(`SELECT ${PUBLIC_USER_FIELDS}, password_hash FROM users WHERE id = ?`)
      .get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Your current password is incorrect' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Choose a password you have not used before' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(passwordHash, user.id);

    res.json({ user: toPublicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
