import { db } from '../server.js';

export function getCartIdentifier(req) {
  // Logged-in user
  if (req.user?.userId) {
    return {
      userId: req.user.userId
    };
  }

  // Guest user
  const sessionId =
    req.headers['x-session-id'] ||
    req.query.sessionId ||
    req.body?.sessionId;

  if (!sessionId) {
    return null;
  }

  return {
    sessionId: String(sessionId)
  };
}


function validateCartIdentifier(ident) {
  if (!ident) {
    throw new Error('Cart identifier is required');
  }

  if (!ident.userId && !ident.sessionId) {
    throw new Error('Invalid cart identifier');
  }
}


export function getCartItems(ident) {
  validateCartIdentifier(ident);

  let query = `
    SELECT
      ci.*,
      p.name,
      p.price,
      p.image,
      p.old_price,
      pv.size,
      pv.color,
      pv.sku
    FROM cart_items ci
    JOIN products p
      ON ci.product_id = p.id
    LEFT JOIN product_variants pv
      ON ci.variant_id = pv.id
    WHERE
  `;

  const params = [];

  if (ident.userId) {
    query += `ci.user_id = ?`;
    params.push(ident.userId);
  } else {
    query += `ci.session_id = ?`;
    params.push(ident.sessionId);
  }

  const items = db.prepare(query).all(...params);

  const total = items.reduce((sum, item) => {
    return sum +
      Number(item.price || 0) *
      Number(item.quantity || 0);
  }, 0);

  const count = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  return {
    items,
    total,
    count
  };
}


export function getCartItemsForCheckout(ident) {
  validateCartIdentifier(ident);

  let query = `
    SELECT
      ci.*,
      p.name,
      p.price,
      p.image,
      pv.size,
      pv.color
    FROM cart_items ci
    JOIN products p
      ON ci.product_id = p.id
    LEFT JOIN product_variants pv
      ON ci.variant_id = pv.id
    WHERE
  `;

  const params = [];

  if (ident.userId) {
    query += `ci.user_id = ?`;
    params.push(ident.userId);
  } else {
    query += `ci.session_id = ?`;
    params.push(ident.sessionId);
  }

  return db.prepare(query).all(...params);
}


export function clearCart(ident) {
  validateCartIdentifier(ident);

  if (ident.userId) {
    return db
      .prepare(`
        DELETE FROM cart_items
        WHERE user_id = ?
      `)
      .run(ident.userId);
  }

  return db
    .prepare(`
      DELETE FROM cart_items
      WHERE session_id = ?
    `)
    .run(ident.sessionId);
}