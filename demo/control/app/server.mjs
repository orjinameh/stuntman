// Corner Store: the demo app under test. Zero dependencies, in-memory state.
// Built from demo/BRIEF.md. Run: node demo/app/server.mjs  (PORT defaults to 3000)
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PRODUCTS = [
  { id: 'mug', name: 'Harbor Mug', price: 4900 },
  { id: 'notebook', name: 'Field Notebook', price: 1200 },
  { id: 'tote', name: 'Canvas Tote', price: 2800 },
];
const PAYMENT_LATENCY_MS = Number(process.env.PAYMENT_LATENCY_MS ?? 400);

function seed() { return { carts: new Map(), orders: [], charges: [], nextOrder: 1 }; }
let state = seed();

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Corner Store</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#faf8f4;color:#222}header{padding:16px 24px;background:#fff;border-bottom:1px solid #e6e1d8;display:flex;gap:20px;align-items:center}
header a{color:#222;text-decoration:none}header .brand{font-weight:700}main{max-width:760px;margin:24px auto;padding:0 20px}.card{background:#fff;border:1px solid #e6e1d8;border-radius:10px;padding:14px 18px;margin:12px 0;display:flex;justify-content:space-between;align-items:center}
button{background:#1f4d4a;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-size:15px;cursor:pointer}input{padding:8px;border:1px solid #cfc9bd;border-radius:6px;width:100%;margin:4px 0 12px;font-size:15px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #e6e1d8;text-align:left}</style></head>
<body><header><a class="brand" href="/">Corner Store</a><a href="/cart">Cart</a><a href="/orders">Orders</a></header><main>${body}</main></body></html>`;
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}

function session(req, res) {
  let sid = parseCookies(req).sid;
  if (!sid || !/^[a-f0-9]{16}$/.test(sid)) { sid = crypto.randomBytes(8).toString('hex'); res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`); }
  if (!state.carts.has(sid)) state.carts.set(sid, []);
  return state.carts.get(sid);
}

async function readForm(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}

const cartTotal = (items) => items.reduce((a, it) => a + it.price * it.qty, 0);
function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) { res.writeHead(status, { 'Content-Type': type, ...headers }); res.end(body); }
const redirect = (res, to) => send(res, 303, '', 'text/plain', { Location: to });

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const cart = session(req, res);

  if (req.method === 'GET' && p === '/health') return send(res, 200, JSON.stringify({ ok: true }), 'application/json');
  if (req.method === 'GET' && p === '/__state') {
    return send(res, 200, JSON.stringify({ products: PRODUCTS, cart, carts: state.carts.size, orders: state.orders, charges: state.charges }), 'application/json');
  }
  if (req.method === 'POST' && p === '/admin/reset') { state = seed(); return send(res, 200, JSON.stringify({ ok: true }), 'application/json'); }

  if (req.method === 'GET' && p === '/') {
    const items = PRODUCTS.map((pr) => `<div class="card"><div><b>${esc(pr.name)}</b><br>${money(pr.price)}</div><form method="post" action="/cart/add"><input type="hidden" name="product_id" value="${pr.id}"><button type="submit">Add ${esc(pr.name)} to cart</button></form></div>`).join('');
    return send(res, 200, page('Shop', `<h1>Shop</h1>${items}`));
  }
  if (req.method === 'POST' && p === '/cart/add') {
    const f = await readForm(req); const pr = PRODUCTS.find((x) => x.id === f.product_id);
    if (!pr) return send(res, 400, page('Error', '<p>Unknown product.</p>'));
    const line = cart.find((l) => l.id === pr.id);
    if (line) line.qty += 1; else cart.push({ id: pr.id, name: pr.name, price: pr.price, qty: 1 });
    return redirect(res, '/cart');
  }
  if (req.method === 'GET' && p === '/cart') {
    if (!cart.length) return send(res, 200, page('Cart', '<h1>Cart</h1><p>Your cart is empty.</p><p><a href="/">Continue shopping</a></p>'));
    const rows = cart.map((l) => `<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${money(l.price * l.qty)}</td></tr>`).join('');
    return send(res, 200, page('Cart', `<h1>Cart</h1><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>${rows}</table><p><b>Total: ${money(cartTotal(cart))}</b></p><p><a href="/checkout"><button type="button">Continue to checkout</button></a></p>`));
  }
  if (req.method === 'GET' && p === '/checkout') {
    if (!cart.length) return redirect(res, '/cart');
    return send(res, 200, page('Checkout', `<h1>Checkout</h1><p>Total: <b>${money(cartTotal(cart))}</b></p>
<form method="post" action="/api/orders"><label>Email<input name="email" type="email" required></label><label>Card number<input name="card" required placeholder="4242 4242 4242 4242"></label><button type="submit" id="pay">Pay ${money(cartTotal(cart))}</button></form>`));
  }
  if (req.method === 'POST' && p === '/api/orders') {
    const f = await readForm(req);
    if (!f.email || !f.card) return send(res, 400, page('Error', '<p>Email and card are required.</p>'));
    if (!cart.length) return send(res, 400, page('Error', '<p>Your cart is empty, so there is nothing to pay for.</p><p><a href="/">Back to the shop</a></p>'));
    const items = cart.map((l) => ({ ...l }));
    const total = cartTotal(cart);
    await sleep(PAYMENT_LATENCY_MS); // the (fake) payment provider takes a moment
    const id = state.nextOrder++;
    state.charges.push({ order: id, amount: total, card_last4: String(f.card).replace(/\D/g, '').slice(-4), at: new Date().toISOString() });
    state.orders.push({ id, email: f.email, items, total, at: new Date().toISOString() });
    cart.length = 0;
    return redirect(res, `/orders/${id}`);
  }
  if (req.method === 'GET' && p === '/orders') {
    const rows = state.orders.map((o) => { const ch = state.charges.find((c) => c.order === o.id); return `<tr class="order-row"><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${money(o.total)}</td><td>${esc(o.at)}</td><td>Charge: ${money(ch ? ch.amount : 0)}</td></tr>`; }).join('');
    return send(res, 200, page('Orders', `<h1>Orders</h1>${state.orders.length ? `<table><tr><th>Order</th><th>Total</th><th>Placed</th><th>Charge</th></tr>${rows}</table>` : '<p>No orders yet.</p>'}`));
  }
  const m = p.match(/^\/orders\/(\d+)$/);
  if (req.method === 'GET' && m) {
    const o = state.orders.find((x) => x.id === Number(m[1]));
    if (!o) return send(res, 404, page('Not found', '<p>No such order.</p>'));
    return send(res, 200, page('Order', `<h1>Order confirmed</h1><p>Order #${o.id} for ${esc(o.email)}. Total ${money(o.total)}.</p><p><a href="/orders">All orders</a></p>`));
  }
  return send(res, 404, page('Not found', '<p>Not found.</p>'));
}

export function createServer() {
  return http.createServer((req, res) => { handle(req, res).catch((e) => { if (!res.headersSent) send(res, 500, page('Error', `<p>${esc(e.message)}</p>`)); }); });
}
export function resetState() { state = seed(); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`Corner Store listening on http://localhost:${port}`));
}
