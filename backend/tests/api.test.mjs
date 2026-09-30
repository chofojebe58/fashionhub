/**
 * API integration tests.
 *
 * These run against a live server, so start one first:
 *
 *   cd backend && cp .env.example .env && npm run db:setup && npm run dev
 *   npm run test:api            # from the repo root, or:
 *   node --test tests/          # from backend/
 *
 * Point them somewhere else with BASE_URL:
 *   BASE_URL=http://localhost:3001 node --test tests/
 *
 * IMPORTANT: they create users, carts and orders — never run them against a
 * database you care about.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const RUN_ID = Date.now().toString(36);

let sessionCounter = 0;
const newSession = () => `test-${RUN_ID}-${++sessionCounter}`;

async function api(path, { method = 'GET', body, token, session } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (session) headers['X-Session-Id'] = session;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const adminEmail = `admin-${RUN_ID}@example.com`;
const customerEmail = `customer-${RUN_ID}@example.com`;
const PASSWORD = 'supersecret123';

/* ------------------------------------------------------------------ health */

test('GET /api/health reports ok', async () => {
  const res = await api('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'ok');
});

test('unknown /api route returns a JSON 404', async () => {
  const res = await api('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.ok(res.data.error);
});

/* ---------------------------------------------------------------- products */

test('GET /api/products returns the seeded catalogue', async () => {
  const res = await api('/api/products');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length >= 5, 'expected the seeded products');

  const blazer = res.data.find((p) => p.id === 'linen-blend-blazer');
  assert.ok(blazer, 'linen-blend-blazer should exist');
  assert.equal(blazer.category, 'Women');
  assert.ok(Array.isArray(blazer.features), 'features must be parsed into an array');
  assert.equal(typeof blazer.stock, 'number');
});

test('GET /api/products filters by category', async () => {
  const res = await api('/api/products?category=Women');
  assert.equal(res.status, 200);
  assert.ok(res.data.length > 0, 'Women should not be empty');
  assert.ok(res.data.every((p) => p.category === 'Women'));
});

test('GET /api/products searches by name', async () => {
  const res = await api('/api/products?search=linen');
  assert.equal(res.status, 200);
  assert.ok(res.data.some((p) => p.id === 'linen-blend-blazer'));
});

test('GET /api/products sorts and pages', async () => {
  const asc = await api('/api/products?sort=price-asc&limit=2');
  assert.equal(asc.status, 200);
  assert.equal(asc.data.length, 2);
  assert.ok(asc.data[0].price <= asc.data[1].price);

  const desc = await api('/api/products?sort=price-desc');
  assert.ok(desc.data[0].price >= desc.data[desc.data.length - 1].price);

  assert.ok(asc.headers.get('x-total-count'), 'should expose X-Total-Count');
});

test('GET /api/products honours the price range', async () => {
  const res = await api('/api/products?minPrice=50&maxPrice=90');
  assert.equal(res.status, 200);
  assert.ok(res.data.every((p) => p.price >= 50 && p.price <= 90));
});

test('GET /api/products rejects an unknown sort value', async () => {
  const res = await api('/api/products?sort=DROP%20TABLE');
  assert.equal(res.status, 400);
});

test('GET /api/products/meta/categories lists real categories', async () => {
  const res = await api('/api/products/meta/categories');
  assert.equal(res.status, 200);
  assert.ok(res.data.length > 0);
  assert.ok(res.data.every((c) => typeof c.name === 'string' && typeof c.count === 'number'));
});

test('GET /api/products/:id includes variants', async () => {
  const res = await api('/api/products/linen-blend-blazer');
  assert.equal(res.status, 200);
  assert.equal(res.data.id, 'linen-blend-blazer');
  assert.ok(res.data.variants.length > 0);
  assert.ok(res.data.variants.every((v) => v.size && v.color && v.sku));
});

test('GET /api/products/:id 404s for an unknown product', async () => {
  const res = await api('/api/products/not-a-real-product');
  assert.equal(res.status, 404);
});

/* -------------------------------------------------------------------- auth */

test('GET /api/auth/me without a token is 401 (not 500)', async () => {
  const res = await api('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me with a bogus token is 401', async () => {
  const res = await api('/api/auth/me', { token: 'not.a.jwt' });
  assert.equal(res.status, 401);
});

let customerToken = null;

test('POST /api/auth/register creates an account and returns a token', async () => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { email: customerEmail, password: PASSWORD, firstName: 'Test', lastName: 'Customer' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.token);
  assert.equal(res.data.user.email, customerEmail);
  assert.equal(res.data.user.role, 'customer');
  assert.equal(res.data.user.password_hash, undefined, 'must never leak the hash');
  customerToken = res.data.token;
});

test('registration rejects a short password', async () => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { email: `short-${RUN_ID}@example.com`, password: 'abc' },
  });
  assert.equal(res.status, 400);
  assert.ok(res.data.errors);
});

test('registration rejects a duplicate email', async () => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { email: customerEmail, password: PASSWORD },
  });
  assert.equal(res.status, 409);
});

test('emails are normalised, so case does not create a second account', async () => {
  const upper = customerEmail.toUpperCase();
  const dupe = await api('/api/auth/register', {
    method: 'POST',
    body: { email: upper, password: PASSWORD },
  });
  assert.equal(dupe.status, 409, 'upper-cased duplicate should collide');

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: upper, password: PASSWORD },
  });
  assert.equal(login.status, 200);
});

test('login rejects a wrong password with a generic message', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'wrong-password' },
  });
  assert.equal(res.status, 401);
  assert.match(res.data.error, /invalid email or password/i);
});

test('GET /api/auth/me returns the signed-in user', async () => {
  const res = await api('/api/auth/me', { token: customerToken });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.email, customerEmail);
});

/* --------------------------------------------------------------- guest cart */

test('guest cart: add, read, update and remove', async () => {
  const session = newSession();

  const empty = await api('/api/cart', { session });
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.data.items, []);
  assert.equal(empty.data.count, 0);

  const added = await api('/api/cart', {
    method: 'POST',
    session,
    body: { productId: 'ribbed-knit-top', quantity: 2 },
  });
  assert.equal(added.status, 201);
  assert.equal(added.data.count, 2);
  assert.equal(added.data.items.length, 1);
  assert.ok(added.data.items[0].id, 'line should have an id');

  const itemId = added.data.items[0].id;
  const bumped = await api(`/api/cart/${itemId}`, {
    method: 'PATCH',
    session,
    body: { quantity: 3 },
  });
  assert.equal(bumped.status, 200);
  assert.equal(bumped.data.count, 3);

  const removed = await api(`/api/cart/${itemId}`, { method: 'DELETE', session });
  assert.equal(removed.status, 204);

  const after = await api('/api/cart', { session });
  assert.equal(after.data.count, 0);
});

test('cart requires some identity', async () => {
  const res = await api('/api/cart', {
    method: 'POST',
    body: { productId: 'ribbed-knit-top', quantity: 1 },
  });
  assert.equal(res.status, 400);
});

test('cart rejects an unknown product', async () => {
  const res = await api('/api/cart', {
    method: 'POST',
    session: newSession(),
    body: { productId: 'does-not-exist', quantity: 1 },
  });
  assert.equal(res.status, 404);
});

test('cart cannot exceed available stock', async () => {
  const session = newSession();
  const res = await api('/api/cart', {
    method: 'POST',
    session,
    body: { productId: 'leather-shoulder-bag', quantity: 99 },
  });
  assert.equal(res.status, 409);
  assert.match(res.data.error, /available|stock/i);
});

test('cart rejects a variant that belongs to another product', async () => {
  const variants = await api('/api/products/linen-blend-blazer/variants');
  const foreignVariant = variants.data[0].id;

  const res = await api('/api/cart', {
    method: 'POST',
    session: newSession(),
    body: { productId: 'ribbed-knit-top', variantId: foreignVariant, quantity: 1 },
  });
  assert.equal(res.status, 404);
});

test('cart is isolated per session', async () => {
  const a = newSession();
  const b = newSession();

  await api('/api/cart', { method: 'POST', session: a, body: { productId: 'ribbed-knit-top', quantity: 1 } });

  const cartB = await api('/api/cart', { session: b });
  assert.equal(cartB.data.count, 0, 'another session must not see this cart');
});

/* ------------------------------------------------------------------ orders */

let guestOrder = null;
let guestOrderSession = null;

test('POST /api/orders returns a complete order and clears the cart', async () => {
  guestOrderSession = newSession();

  await api('/api/cart', {
    method: 'POST',
    session: guestOrderSession,
    body: { productId: 'ribbed-knit-top', quantity: 2 },
  });

  const before = await api('/api/products/ribbed-knit-top');
  const stockBefore = before.data.stock;

  const res = await api('/api/orders', {
    method: 'POST',
    session: guestOrderSession,
    body: {
      email: `buyer-${RUN_ID}@example.com`,
      firstName: 'Guest',
      lastName: 'Buyer',
      address: '1 Test Street',
      city: 'Testville',
      postalCode: 'TE5 7ER',
      country: 'GB',
    },
  });

  assert.equal(res.status, 201);
  guestOrder = res.data;

  assert.match(res.data.id, /^ORD-/);
  assert.equal(res.data.status, 'pending_payment', 'a new order must await payment');
  assert.ok(res.data.payment.intentId, 'a payment intent should be issued');
  assert.ok(res.data.payment.clientSecret, 'the client needs a secret to confirm with');
  assert.equal(res.data.payment.amount, res.data.total);
  assert.equal(res.data.payment.provider, 'demo');
  assert.equal(res.data.customer.firstName, 'Guest');
  assert.equal(res.data.customer.country, 'GB');
  assert.equal(res.data.items.length, 1);
  assert.equal(res.data.items[0].quantity, 2);
  assert.ok(res.data.date, 'order must carry a date for the confirmation page');

  // subtotal 51.98 → below the $99 threshold, so shipping applies
  assert.equal(res.data.subtotal, 51.98);
  assert.equal(res.data.shipping, 9.99);
  assert.equal(res.data.tax, 4.16);
  assert.equal(res.data.total, 66.13);

  const after = await api('/api/products/ribbed-knit-top');
  assert.equal(after.data.stock, stockBefore - 2, 'stock must be decremented');

  const cart = await api('/api/cart', { session: guestOrderSession });
  assert.equal(cart.data.count, 0, 'cart must be emptied after checkout');
});

test('POST /api/orders validates the payload', async () => {
  const session = newSession();
  await api('/api/cart', {
    method: 'POST',
    session,
    body: { productId: 'ribbed-knit-top', quantity: 1 },
  });

  const res = await api('/api/orders', {
    method: 'POST',
    session,
    body: { email: 'not-an-email', firstName: '', lastName: '', address: '', city: '', postalCode: '' },
  });
  assert.equal(res.status, 400);
  assert.ok(res.data.errors.fieldErrors.email, 'email error should be reported');
});

test('POST /api/orders rejects an empty cart', async () => {
  const res = await api('/api/orders', {
    method: 'POST',
    session: newSession(),
    body: {
      email: `empty-${RUN_ID}@example.com`,
      firstName: 'A',
      lastName: 'B',
      address: 'x',
      city: 'y',
      postalCode: 'z',
    },
  });
  assert.equal(res.status, 400);
});

test('the guest that placed an order can read it back', async () => {
  const res = await api(`/api/orders/${guestOrder.id}`, { session: guestOrderSession });
  assert.equal(res.status, 200);
  assert.equal(res.data.id, guestOrder.id);
  assert.equal(res.data.items.length, 1);
});

test('another session cannot read that order', async () => {
  const res = await api(`/api/orders/${guestOrder.id}`, { session: newSession() });
  assert.equal(res.status, 404);
});

test('GET /api/orders requires authentication', async () => {
  const res = await api('/api/orders');
  assert.equal(res.status, 401);
});

test('GET /api/orders lists the signed-in user’s orders', async () => {
  const session = newSession();
  await api('/api/cart', {
    method: 'POST',
    session,
    body: { productId: 'wide-leg-trousers', quantity: 1 },
  });

  // Logging in with the session header adopts the guest cart, exactly like a browser would.
  const login = await api('/api/auth/login', {
    method: 'POST',
    session,
    body: { email: customerEmail, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  const token = login.data.token;

  const placed = await api('/api/orders', {
    method: 'POST',
    token,
    session,
    body: {
      email: customerEmail,
      firstName: 'Test',
      lastName: 'Customer',
      address: '2 Test Street',
      city: 'Testville',
      postalCode: 'TE5 7ER',
    },
  });
  assert.equal(placed.status, 201);

  const list = await api('/api/orders', { token });
  assert.equal(list.status, 200);
  assert.ok(list.data.some((o) => o.id === placed.data.id));
});

test('a guest cart is merged into the account on login', async () => {
  const session = newSession();

  await api('/api/cart', {
    method: 'POST',
    session,
    body: { productId: 'minimalist-strappy-heels', quantity: 1 },
  });

  const email = `merge-${RUN_ID}@example.com`;
  await api('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

  const login = await api('/api/auth/login', {
    method: 'POST',
    session,
    body: { email, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.ok(login.data.cartMerged >= 1, 'the guest line should have been absorbed');

  const cart = await api('/api/cart', { token: login.data.token });
  assert.equal(cart.data.count, 1);
  assert.equal(cart.data.items[0].productId, 'minimalist-strappy-heels');

  // The old session must no longer own those lines.
  const oldCart = await api('/api/cart', { session });
  assert.equal(oldCart.data.count, 0);
});

/* ------------------------------------------------------------------- admin */

test('admin routes reject anonymous requests', async () => {
  for (const path of ['/api/admin/products', '/api/admin/orders', '/api/admin/stats']) {
    const res = await api(path);
    assert.equal(res.status, 401, `${path} must require auth`);
  }
});

test('admin routes reject a normal customer', async () => {
  const res = await api('/api/admin/products', { token: customerToken });
  assert.equal(res.status, 403);
});

test('admin routes reject writes from a normal customer', async () => {
  const res = await api('/api/admin/products', {
    method: 'POST',
    token: customerToken,
    body: { id: 'hacked', name: 'Hacked', price: 0.01, stock: 1 },
  });
  assert.equal(res.status, 403);
});

test('admin: create, update (preserving rating) and protect ordered products', async () => {
  // Register, then promote via SQL — mirrors `npm run db:promote`.
  await api('/api/auth/register', {
    method: 'POST',
    body: { email: adminEmail, password: PASSWORD, firstName: 'Ada', lastName: 'Admin' },
  });

  // Promote through the same CLI helper a developer would use.
  const { execFileSync } = await import('node:child_process');
  const backendDir = new URL('..', import.meta.url).pathname;
  execFileSync(process.execPath, ['db/promote-admin.js', adminEmail], {
    cwd: backendDir,
    stdio: 'ignore',
    env: { ...process.env, DB_PATH: process.env.TEST_DB_PATH ?? '' },
  });

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.role, 'admin', 'promotion should be reflected in the JWT');
  const adminToken = login.data.token;

  const productId = `test-product-${RUN_ID}`;

  const created = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      id: productId,
      name: 'Integration Test Scarf',
      price: 19.99,
      old_price: 29.99,
      description: 'Created by the API test suite.',
      features: ['Soft', 'Warm'],
      rating: '★★★★☆',
      reviews: '(3 reviews)',
      category: 'Accessories',
      stock: 7,
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.rating, '★★★★☆');

  // Update WITHOUT rating/reviews — they must survive.
  const updated = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: { id: productId, name: 'Integration Test Scarf v2', price: 24.99, stock: 5 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.name, 'Integration Test Scarf v2');
  assert.equal(updated.data.rating, '★★★★☆', 'rating must not be wiped by an update');
  assert.equal(updated.data.reviews, '(3 reviews)');

  const publicRes = await api(`/api/products/${productId}`);
  assert.equal(publicRes.status, 200);
  assert.equal(publicRes.data.category, 'Accessories');

  const deleted = await api(`/api/admin/products/${productId}`, {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(deleted.status, 204);

  // A product that appears in an order must NOT be deletable.
  const protectedDelete = await api('/api/admin/products/ribbed-knit-top', {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(protectedDelete.status, 409);
  assert.match(protectedDelete.data.error, /order/i);

  const stats = await api('/api/admin/stats', { token: adminToken });
  assert.equal(stats.status, 200);
  assert.equal(typeof stats.data.products, 'number');
  assert.ok(stats.data.orders >= 1);
});

/* ------------------------------------------------------------- subscribers */

test('newsletter sign-up works and is idempotent', async () => {
  const email = `news-${RUN_ID}@example.com`;

  const first = await api('/api/subscribers', { method: 'POST', body: { email } });
  assert.equal(first.status, 201);

  const second = await api('/api/subscribers', { method: 'POST', body: { email } });
  assert.equal(second.status, 200, 'a repeat sign-up must not 409 at the user');
  assert.equal(second.data.alreadySubscribed, true);

  const invalid = await api('/api/subscribers', { method: 'POST', body: { email: 'nope' } });
  assert.equal(invalid.status, 400);
});

/* ------------------------------------------------------------ rate limiting */

test('auth endpoints advertise rate-limit headers', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `nobody-${RUN_ID}@example.com`, password: 'whatever123' },
  });
  assert.ok(res.status === 401 || res.status === 429);
  // standardHeaders: 'draft-7' emits `RateLimit` + `RateLimit-Policy`.
  assert.ok(
    res.headers.get('ratelimit') || res.headers.get('ratelimit-limit'),
    'rate-limit headers should be present'
  );
});

/* --------------------------------------------------------------- payments */

const GOOD_CARD = { name: 'Test Buyer', number: '4242 4242 4242 4242', exp: '04/29', cvc: '123' };
const DECLINED_CARD = { name: 'Test Buyer', number: '4000 0000 0000 0002', exp: '04/29', cvc: '123' };

async function placeGuestOrder(productId = 'ribbed-knit-top', quantity = 1) {
  const session = newSession();
  await api('/api/cart', { method: 'POST', session, body: { productId, quantity } });

  const res = await api('/api/orders', {
    method: 'POST',
    session,
    body: {
      email: `pay-${RUN_ID}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      firstName: 'Pay',
      lastName: 'Test',
      address: '1 Gateway Street',
      city: 'Payville',
      postalCode: 'PA1 1AA',
      country: 'US',
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return { session, order: res.data };
}

test('GET /api/store-config describes the payment mode', async () => {
  const res = await api('/api/store-config');
  assert.equal(res.status, 200);
  assert.equal(res.data.payment.provider, 'demo');
  assert.equal(res.data.payment.live, false);
  assert.match(res.data.payment.notice, /demo/i);
  assert.equal(res.data.pricing.freeShippingThreshold, 99);
});

test('a new order is unpaid until the gateway confirms it', async () => {
  const { order } = await placeGuestOrder();
  assert.equal(order.status, 'pending_payment');
  assert.equal(order.payment.paidAt, null);
  assert.equal(order.payment.last4, null);
});

test('paying with a good card marks the order paid and stores only the last 4', async () => {
  const { session, order } = await placeGuestOrder();

  const res = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: GOOD_CARD },
  });

  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.status, 'paid');
  assert.ok(res.data.payment.paidAt, 'paidAt should be set');
  assert.equal(res.data.payment.last4, '4242');
  assert.equal(res.data.payment.failureReason, null);

  // The full PAN must never be persisted anywhere in the response.
  assert.ok(!JSON.stringify(res.data).includes('4242424242424242'));
});

test('paying with a declined card returns 402 and a reason', async () => {
  const { session, order } = await placeGuestOrder();

  const res = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: DECLINED_CARD },
  });

  assert.equal(res.status, 402);
  assert.match(res.data.error, /declined/i);
  assert.equal(res.data.order.status, 'pending_payment', 'the order stays payable');
  assert.equal(res.data.order.payment.failureReason, res.data.error);
});

test('an insufficient-funds card reports the right reason', async () => {
  const { session, order } = await placeGuestOrder();
  const res = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: { ...GOOD_CARD, number: '4000 0000 0000 9995' } },
  });
  assert.equal(res.status, 402);
  assert.match(res.data.error, /insufficient funds/i);
});

test('payment rejects a malformed card before reaching the gateway', async () => {
  const { session, order } = await placeGuestOrder();

  const bad = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: { name: 'x', number: '12', exp: 'nope', cvc: '1' } },
  });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.errors);

  // Well-formed but expired: passes validation, fails authorisation (402, not 400).
  const expired = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: { ...GOOD_CARD, exp: '01/20' } },
  });
  assert.equal(expired.status, 402);
  assert.match(expired.data.error, /expired/i);
});

test('an order cannot be paid twice', async () => {
  const { session, order } = await placeGuestOrder();
  await api(`/api/orders/${order.id}/pay`, { method: 'POST', session, body: { card: GOOD_CARD } });

  const again = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session,
    body: { card: GOOD_CARD },
  });
  assert.equal(again.status, 409);
});

test('someone else cannot pay for your order', async () => {
  const { order } = await placeGuestOrder();
  const res = await api(`/api/orders/${order.id}/pay`, {
    method: 'POST',
    session: newSession(),
    body: { card: GOOD_CARD },
  });
  assert.equal(res.status, 404);
});

test('cancelling an unpaid order returns the reserved stock', async () => {
  const product = await api('/api/products/ribbed-knit-top');
  const stockBefore = product.data.stock;

  const { session, order } = await placeGuestOrder('ribbed-knit-top', 3);
  const reserved = await api('/api/products/ribbed-knit-top');
  assert.equal(reserved.data.stock, stockBefore - 3, 'stock should be reserved on order');

  const cancelled = await api(`/api/orders/${order.id}/cancel`, { method: 'POST', session });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, 'cancelled');

  const after = await api('/api/products/ribbed-knit-top');
  assert.equal(after.data.stock, stockBefore, 'cancelling must restock');
});

test('a paid order cannot be cancelled', async () => {
  const { session, order } = await placeGuestOrder();
  await api(`/api/orders/${order.id}/pay`, { method: 'POST', session, body: { card: GOOD_CARD } });

  const res = await api(`/api/orders/${order.id}/cancel`, { method: 'POST', session });
  assert.equal(res.status, 409);
});

/* --------------------------------------------------------------- wishlist */

let wishlistToken = null;

test('the wishlist requires authentication', async () => {
  const res = await api('/api/wishlist');
  assert.equal(res.status, 401);
});

test('wishlist add, list, remove and bulk replace', async () => {
  const email = `wish-${RUN_ID}@example.com`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { email, password: PASSWORD, firstName: 'Wish', lastName: 'Lister' },
  });
  wishlistToken = reg.data.token;

  const empty = await api('/api/wishlist', { token: wishlistToken });
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.data.items, []);

  const added = await api('/api/wishlist', {
    method: 'POST',
    token: wishlistToken,
    body: { productId: 'linen-blend-blazer' },
  });
  assert.equal(added.status, 201);
  assert.equal(added.data.items.length, 1);
  assert.equal(added.data.items[0].productId, 'linen-blend-blazer');
  assert.equal(added.data.items[0].name, 'Linen Blend Blazer');

  // Adding twice must not duplicate.
  await api('/api/wishlist', {
    method: 'POST',
    token: wishlistToken,
    body: { productId: 'linen-blend-blazer' },
  });
  const afterDupe = await api('/api/wishlist', { token: wishlistToken });
  assert.equal(afterDupe.data.items.length, 1);

  const unknown = await api('/api/wishlist', {
    method: 'POST',
    token: wishlistToken,
    body: { productId: 'not-a-product' },
  });
  assert.equal(unknown.status, 404);

  const replaced = await api('/api/wishlist', {
    method: 'PUT',
    token: wishlistToken,
    body: { productIds: ['ribbed-knit-top', 'wide-leg-trousers', 'not-a-product'] },
  });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.data.items.length, 2, 'unknown ids should be skipped');

  const removed = await api('/api/wishlist/ribbed-knit-top', {
    method: 'DELETE',
    token: wishlistToken,
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.data.items.length, 1);

  const missing = await api('/api/wishlist/never-added', { method: 'DELETE', token: wishlistToken });
  assert.equal(missing.status, 404);
});

test('wishlists are isolated per user', async () => {
  const other = await api('/api/auth/register', {
    method: 'POST',
    body: { email: `wish2-${RUN_ID}@example.com`, password: PASSWORD },
  });
  const res = await api('/api/wishlist', { token: other.data.token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.items, []);
});

/* --------------------------------------------------------- account editing */

test('PATCH /api/auth/me updates the profile', async () => {
  const res = await api('/api/auth/me', {
    method: 'PATCH',
    token: wishlistToken,
    body: { firstName: 'Renamed' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.firstName, 'Renamed');
  assert.equal(res.data.user.lastName, 'Lister', 'untouched fields must survive');
});

test('PATCH /api/auth/me rejects an empty body', async () => {
  const res = await api('/api/auth/me', { method: 'PATCH', token: wishlistToken, body: {} });
  assert.equal(res.status, 400);
});

test('PATCH /api/auth/me requires authentication', async () => {
  const res = await api('/api/auth/me', { method: 'PATCH', body: { firstName: 'x' } });
  assert.equal(res.status, 401);
});

test('password changes require the current password and re-issue a token', async () => {
  const email = `pw-${RUN_ID}@example.com`;
  await api('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });

  const wrong = await api('/api/auth/password', {
    method: 'POST',
    token: login.data.token,
    body: { currentPassword: 'not-my-password', newPassword: 'brandnewpass1' },
  });
  assert.equal(wrong.status, 401);

  const same = await api('/api/auth/password', {
    method: 'POST',
    token: login.data.token,
    body: { currentPassword: PASSWORD, newPassword: PASSWORD },
  });
  assert.equal(same.status, 400);

  const ok = await api('/api/auth/password', {
    method: 'POST',
    token: login.data.token,
    body: { currentPassword: PASSWORD, newPassword: 'brandnewpass1' },
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);

  const oldFails = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  });
  assert.equal(oldFails.status, 401, 'the old password must stop working');

  const newWorks = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'brandnewpass1' },
  });
  assert.equal(newWorks.status, 200);
});

/* ========================================================================
   Phase 5 — publishing control, site settings, variants, uploads
   ======================================================================== */

/** Registers a user and promotes them to admin; returns a bearer token. */
async function adminToken(suffix) {
  const email = `admin-${suffix}-${RUN_ID}@example.com`;
  await api('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['db/promote-admin.js', email], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
  });

  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(login.data.user.role, 'admin');
  return login.data.token;
}

let admin = null;

test('admin token can be obtained for the publishing tests', async () => {
  admin = await adminToken('pub');
  assert.ok(admin);
});

/* ------------------------------------------------------- public settings */

test('GET /api/settings is public and complete', async () => {
  const res = await api('/api/settings');
  assert.equal(res.status, 200);
  assert.equal(res.data.settings.heroTitle, 'Elevate Your Everyday Style');
  assert.equal(res.data.settings.heroCtaPrimaryHref, 'shop.html');
  assert.ok(Object.keys(res.data.settings).length >= 20, 'all editable keys should be present');
});

test('PUT /api/admin/settings requires admin', async () => {
  const anon = await api('/api/admin/settings', {
    method: 'PUT',
    body: { heroTitle: 'Hacked' },
  });
  assert.equal(anon.status, 401);

  const customer = await api('/api/admin/settings', {
    method: 'PUT',
    token: customerToken,
    body: { heroTitle: 'Hacked' },
  });
  assert.equal(customer.status, 403);

  const unchanged = await api('/api/settings');
  assert.equal(unchanged.data.settings.heroTitle, 'Elevate Your Everyday Style');
});

test('an admin can edit the public homepage copy', async () => {
  const res = await api('/api/admin/settings', {
    method: 'PUT',
    token: admin,
    body: { heroTitle: 'Autumn Edit', heroEyebrow: 'New Season' },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.applied.sort(), ['heroEyebrow', 'heroTitle']);
  assert.deepEqual(res.data.rejected, []);

  const published = await api('/api/settings');
  assert.equal(published.data.settings.heroTitle, 'Autumn Edit');
  assert.equal(published.data.settings.heroEyebrow, 'New Season');
  // Untouched keys keep their values.
  assert.equal(published.data.settings.footerBlurb.includes('Timeless fashion'), true);
});

test('unknown setting keys are rejected, not silently stored', async () => {
  const res = await api('/api/admin/settings', {
    method: 'PUT',
    token: admin,
    body: { heroTitle: 'Fine', notARealKey: 'nope' },
  });
  assert.equal(res.status, 400);
});

test('setting links are validated so a typo cannot break the homepage', async () => {
  const bad = await api('/api/admin/settings', {
    method: 'PUT',
    token: admin,
    body: { heroCtaPrimaryHref: 'javascript:alert(1)' },
  });
  assert.equal(bad.status, 400);

  const good = await api('/api/admin/settings', {
    method: 'PUT',
    token: admin,
    body: { heroCtaPrimaryHref: 'shop.html#featured' },
  });
  assert.equal(good.status, 200);
});

test('settings can be reset to their defaults', async () => {
  const res = await api('/api/admin/settings/reset', {
    method: 'POST',
    token: admin,
    body: { keys: ['heroTitle'] },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.settings.heroTitle, 'Elevate Your Everyday Style');
});

/* ----------------------------------------------------------- publishing */

test('unpublished products are invisible to shoppers but visible to admins', async () => {
  const id = `draft-${RUN_ID}`;

  const created = await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id, name: 'Draft Coat', price: 199, category: 'Women', stock: 4, published: false },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.published, false);

  const publicList = await api('/api/products');
  assert.ok(!publicList.data.some((p) => p.id === id), 'a draft must not appear in the shop');

  const publicOne = await api(`/api/products/${id}`);
  assert.equal(publicOne.status, 404, 'a draft must not be reachable by URL either');

  const adminList = await api('/api/admin/products', { token: admin });
  assert.ok(adminList.data.some((p) => p.id === id), 'the admin must still see it');

  // Publish it.
  const published = await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id, published: true },
  });
  assert.equal(published.status, 200);
  assert.equal(published.data.published, true);

  const nowVisible = await api(`/api/products/${id}`);
  assert.equal(nowVisible.status, 200);

  await api(`/api/admin/products/${id}`, { method: 'DELETE', token: admin });
});

test('featured products can be requested explicitly', async () => {
  const featured = await api('/api/products?featured=true');
  assert.equal(featured.status, 200);
  assert.ok(featured.data.length >= 1, 'the seed marks three products featured');
  assert.ok(featured.data.every((p) => p.featured === true));

  const all = await api('/api/products');
  assert.ok(all.data.length >= featured.data.length);
});

test('toggling featured does not disturb the rest of the product', async () => {
  const before = await api('/api/products/leather-shoulder-bag');
  assert.equal(before.data.featured, false);

  await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id: 'leather-shoulder-bag', featured: true },
  });

  const after = await api('/api/products/leather-shoulder-bag');
  assert.equal(after.data.featured, true);
  assert.equal(after.data.name, before.data.name, 'name must survive a partial update');
  assert.equal(after.data.price, before.data.price);
  assert.equal(after.data.rating, before.data.rating, 'rating must survive a partial update');
  assert.equal(after.data.category, before.data.category);

  // put it back
  await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id: 'leather-shoulder-bag', featured: false },
  });
});

test('a product can carry a gallery of extra images', async () => {
  const id = `gallery-${RUN_ID}`;
  const created = await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: {
      id,
      name: 'Gallery Dress',
      price: 120,
      image: '/uploads/a.jpg',
      gallery: ['/uploads/b.jpg', 'https://example.com/c.jpg'],
      stock: 2,
    },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.data.gallery, ['/uploads/b.jpg', 'https://example.com/c.jpg']);

  const rejected = await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id: `${id}-2`, name: 'Bad', price: 1, gallery: ['javascript:alert(1)'] },
  });
  assert.equal(rejected.status, 400, 'a javascript: URL must not be storable as an image');

  await api(`/api/admin/products/${id}`, { method: 'DELETE', token: admin });
});

/* ------------------------------------------------------------- variants */

test('an admin can replace a product variant matrix', async () => {
  const id = `variant-${RUN_ID}`;
  await api('/api/admin/products', {
    method: 'POST',
    token: admin,
    body: { id, name: 'Variant Tee', price: 30, category: 'Tops', stock: 0 },
  });

  const created = await api(`/api/admin/products/${id}/variants`, {
    method: 'PUT',
    token: admin,
    body: {
      variants: [
        { size: 'S', color: 'Black', stock: 5 },
        { size: 'M', color: 'Black', stock: 8 },
        { size: 'M', color: 'White', stock: 3 },
      ],
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.variants.length, 3);
  assert.equal(created.data.inserted, 3);
  assert.ok(created.data.variants.every((v) => v.sku), 'SKUs should be auto-generated');
  assert.equal(new Set(created.data.variants.map((v) => v.sku)).size, 3, 'SKUs must be unique');

  // Update stock, drop one, add one — the survivors must keep their ids so
  // existing cart and order lines still resolve.
  const firstIds = Object.fromEntries(created.data.variants.map((v) => [`${v.size}/${v.color}`, v.id]));

  const updated = await api(`/api/admin/products/${id}/variants`, {
    method: 'PUT',
    token: admin,
    body: {
      variants: [
        { size: 'S', color: 'Black', stock: 12 },
        { size: 'L', color: 'Black', stock: 2 },
      ],
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.updated, 1);
  assert.equal(updated.data.inserted, 1);
  assert.equal(updated.data.removed, 2);

  const kept = updated.data.variants.find((v) => v.size === 'S' && v.color === 'Black');
  assert.equal(kept.id, firstIds['S/Black'], 'an unchanged pair must keep its row id');
  assert.equal(kept.stock, 12);

  const duplicate = await api(`/api/admin/products/${id}/variants`, {
    method: 'PUT',
    token: admin,
    body: {
      variants: [
        { size: 'S', color: 'Black', stock: 1 },
        { size: 's', color: 'black', stock: 2 },
      ],
    },
  });
  assert.equal(duplicate.status, 400, 'a duplicate size/colour pair must be rejected');

  const publicVariants = await api(`/api/products/${id}/variants`);
  assert.equal(publicVariants.data.length, 2);

  await api(`/api/admin/products/${id}`, { method: 'DELETE', token: admin });
});

test('variant editing requires admin', async () => {
  const res = await api('/api/admin/products/linen-blend-blazer/variants', {
    method: 'PUT',
    body: { variants: [{ size: 'S', color: 'Black', stock: 1 }] },
  });
  assert.equal(res.status, 401);
});

/* -------------------------------------------------------------- uploads */

test('image upload stores the file and returns a URL', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  const res = await fetch(`${BASE_URL}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'image/png' },
    body: png,
  });
  const data = await res.json();
  assert.equal(res.status, 201, JSON.stringify(data));
  assert.match(data.url, /^\/uploads\/[a-z0-9-]+\.png$/);
  assert.equal(data.bytes, png.length);

  // The stored file must be servable.
  const fetched = await fetch(`${BASE_URL}${data.url}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers.get('x-content-type-options'), 'nosniff');
});

test('upload rejects non-image payloads', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'text/html' },
    body: '<script>alert(1)</script>',
  });
  assert.equal(res.status, 415);
});

test('upload rejects SVG (it can carry script)', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'image/svg+xml' },
    body: '<svg onload="alert(1)"></svg>',
  });
  assert.equal(res.status, 415);
});

test('upload requires admin', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: Buffer.from('00', 'hex'),
  });
  assert.equal(res.status, 401);
});

/* ----------------------------------------------------------------- stats */

test('admin stats report the publishing state', async () => {
  const res = await api('/api/admin/stats', { token: admin });
  assert.equal(res.status, 200);
  assert.equal(typeof res.data.published, 'number');
  assert.equal(typeof res.data.hidden, 'number');
  assert.equal(typeof res.data.featured, 'number');
  assert.equal(res.data.published + res.data.hidden, res.data.products);
  assert.ok(Array.isArray(res.data.lowStock));
});
