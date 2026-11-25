import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PRODUCTS = [
  { id: 'mug', name: 'Harbor Mug', cents: 4900 },
  { id: 'notebook', name: 'Field Notebook', cents: 1200 },
  { id: 'tote', name: 'Canvas Tote', cents: 2800 },
];

let state;
function seed() {
  state = { products: PRODUCTS.map(p => ({ ...p })), carts: {}, orders: [], charges: [], nextOrderId: 1 };
}
seed();

const money = c => '$' + (c / 100).toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CSS = `
body{margin:0;background:#faf6ee;color:#222;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:16px 24px;display:flex;gap:20px;align-items:baseline}
header a{color:#1f4d36;text-decoration:none}header .brand{font-weight:700;font-size:20px}
main{max-width:760px;margin:0 auto;padding:8px 24px 48px}
.card{background:#fff;border-radius:10px;padding:18px 20px;margin:12px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px}
button{background:#1f4d36;color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}
input{width:100%;box-sizing:border-box;padding:10px;margin:4px 0 14px;border:1px solid #d6d0c2;border-radius:8px;font:inherit}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}
`;

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><header><a class="brand" href="/">Corner Store</a><a href="/cart">Cart</a><a href="/orders">Orders</a></header><main>${body}</main></body></html>`;
}

function getSid(req, res) {
  const m = /(?:^|;\s*)sid=([\w-]+)/.exec(req.headers.cookie || '');
  let sid = m && m[1];
  if (!sid) {
    sid = randomUUID();
    res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return sid;
}

const cartLines = cart => Object.entries(cart || {}).map(([id, qty]) => {
  const p = state.products.find(x => x.id === id);
  return { id, name: p.name, cents: p.cents, qty, line: p.cents * qty };
});
const sum = lines => lines.reduce((a, l) => a + l.line, 0);

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => (d += c));
    req.on('end', () => resolve(new URLSearchParams(d)));
  });
}

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
const html = (res, body, code = 200) => send(res, code, 'text/html; charset=utf-8', body);
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  try {
    if (m === 'GET' && path === '/health') return send(res, 200, 'application/json', '{"ok":true}');
    if (m === 'GET' && path === '/__state') return send(res, 200, 'application/json', JSON.stringify(state));
    if (m === 'POST' && path === '/admin/reset') { seed(); return send(res, 200, 'application/json', '{"ok":true}'); }

    if (m === 'GET' && path === '/') {
      const cards = state.products.map(p => `<div class="card row"><div><strong>${esc(p.name)}</strong><br>${money(p.cents)}</div>
<form method="post" action="/cart/add"><input type="hidden" name="id" value="${p.id}"><button>Add to cart</button></form></div>`).join('');
      return html(res, page('Shop', `<h1>Shop</h1>${cards}`));
    }

    if (m === 'POST' && path === '/cart/add') {
      const sid = getSid(req, res);
      const id = (await readBody(req)).get('id');
      if (state.products.some(p => p.id === id)) {
        const cart = (state.carts[sid] ||= {});
        cart[id] = (cart[id] || 0) + 1;
      }
      return redirect(res, '/cart');
    }

    if (m === 'GET' && path === '/cart') {
      const lines = cartLines(state.carts[getSid(req, res)]);
      if (!lines.length) return html(res, page('Cart', `<h1>Cart</h1><div class="card">Your cart is empty.</div>`));
      const rows = lines.map(l => `<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${money(l.cents)}</td><td>${money(l.line)}</td></tr>`).join('');
      return html(res, page('Cart', `<h1>Cart</h1><div class="card"><table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Line</th></tr>${rows}
<tr><td colspan="3"><strong>Total</strong></td><td><strong>${money(sum(lines))}</strong></td></tr></table></div>
<form method="get" action="/checkout"><button>Continue to checkout</button></form>`));
    }

    if (m === 'GET' && path === '/checkout') {
      const lines = cartLines(state.carts[getSid(req, res)]);
      if (!lines.length) return redirect(res, '/cart');
      return html(res, page('Checkout', `<h1>Checkout</h1><form class="card" method="post" action="/checkout">
<p>Total: <strong>${money(sum(lines))}</strong></p>
<label>Email<input name="email" type="email" required></label>
<label>Card number<input name="card" required placeholder="4242 4242 4242 4242"></label>
<button>Pay</button></form>`));
    }

    if (m === 'POST' && path === '/checkout') {
      const sid = getSid(req, res);
      const form = await readBody(req);
      const email = (form.get('email') || '').trim();
      const card = (form.get('card') || '').trim();
      const lines = cartLines(state.carts[sid]);
      if (!lines.length) return redirect(res, '/cart');
      if (!email || !card) return html(res, page('Checkout', `<h1>Checkout</h1><div class="card">Email and card number are required. <a href="/checkout">Back</a></div>`), 400);
      // Take the lines and empty the cart before the provider call, so a repeated submit cannot charge twice.
      delete state.carts[sid];
      const total = sum(lines);
      await sleep(1500); // fake payment provider
      const id = state.nextOrderId++;
      const at = new Date().toISOString();
      state.charges.push({ id: 'ch_' + id, orderId: id, cents: total, at });
      state.orders.push({ id, email, lines, totalCents: total, chargedCents: total, at });
      return redirect(res, '/orders/' + id);
    }

    if (m === 'GET' && path === '/orders') {
      const rows = state.orders.map(o => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${money(o.totalCents)}</td><td>${esc(o.at)}</td><td>${money(o.chargedCents)}</td></tr>`).join('');
      return html(res, page('Orders', `<h1>Orders</h1><div class="card"><table><tr><th>Order</th><th>Total</th><th>Time</th><th>Charged</th></tr>${rows}</table></div>`));
    }

    const om = /^\/orders\/(\d+)$/.exec(path);
    if (m === 'GET' && om) {
      const o = state.orders.find(x => x.id === Number(om[1]));
      if (!o) return html(res, page('Not found', '<h1>Order not found</h1>'), 404);
      return html(res, page('Order confirmed', `<h1>Order confirmed</h1><div class="card">Order number: <strong>#${o.id}</strong><br>Total charged: ${money(o.chargedCents)}</div>`));
    }

    html(res, page('Not found', '<h1>Not found</h1>'), 404);
  } catch (e) {
    console.error(e);
    send(res, 500, 'text/plain', 'Server error');
  }
});

server.listen(Number(process.env.PORT) || 3000);
