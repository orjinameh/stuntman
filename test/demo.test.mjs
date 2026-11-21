import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PACKAGE_ROOT } from '../src/util.mjs';

async function startApp(file) {
  process.env.PAYMENT_LATENCY_MS = '150';
  const mod = await import(`${file}?t=${Date.now()}${Math.random()}`);
  const server = mod.createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, mod, close: () => new Promise((r) => server.close(r)) };
}
async function cartAndCheckout(base) {
  const add = await fetch(`${base}/cart/add`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'product_id=mug' });
  const cookie = add.headers.get('set-cookie').split(';')[0];
  const page = await (await fetch(`${base}/checkout`, { headers: { cookie } })).text();
  const nonce = (page.match(/name="nonce" value="([a-f0-9]+)"/) || [])[1];
  return { cookie, nonce };
}
const pay = (base, cookie, nonce) => fetch(`${base}/api/orders`, { method: 'POST', redirect: 'manual', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'buyer@example.test', card: '4242 4242 4242 4242', ...(nonce ? { nonce } : {}) }).toString() });
const state = async (base) => (await fetch(`${base}/__state`)).json();

test('AC-20 demo app serves seeded products and routes', async () => {
  const app = await startApp(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'));
  try {
    assert.deepEqual(await (await fetch(`${app.base}/health`)).json(), { ok: true });
    const home = await (await fetch(`${app.base}/`)).text();
    for (const s of ['Harbor Mug', '$49.00', 'Field Notebook', '$12.00', 'Canvas Tote', '$28.00']) assert.ok(home.includes(s), s);
    const { cookie } = await cartAndCheckout(app.base);
    const r = await pay(app.base, cookie);
    assert.equal(r.status, 303);
    const conf = await (await fetch(`${app.base}${r.headers.get('location')}`)).text();
    assert.match(conf, /Order confirmed/);
    assert.equal((await state(app.base)).orders.length, 1);
    await fetch(`${app.base}/admin/reset`, { method: 'POST' });
    assert.equal((await state(app.base)).orders.length, 0);
  } finally { await app.close(); }
});

test('AC-21 a double submit on the shipped app creates two orders and two charges', async () => {
  const app = await startApp(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'));
  try {
    const { cookie, nonce } = await cartAndCheckout(app.base);
    await Promise.all([pay(app.base, cookie, nonce), pay(app.base, cookie, nonce)]);
    const s = await state(app.base);
    assert.equal(s.orders.length, 2); assert.equal(s.charges.length, 2);
    assert.equal(s.charges.reduce((a, c) => a + c.amount, 0), 9800);
  } finally { await app.close(); }
});

test('AC-22 the reference patch applies with git apply and makes the double submit produce one order', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'patched-'));
  fs.mkdirSync(path.join(dir, 'demo/app'), { recursive: true });
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'), path.join(dir, 'demo/app/server.mjs'));
  execFileSync('git', ['apply', path.join(PACKAGE_ROOT, 'demo/patches/0001-idempotent-checkout.patch')], { cwd: dir });
  const app = await startApp(path.join(dir, 'demo/app/server.mjs'));
  try {
    const { cookie, nonce } = await cartAndCheckout(app.base);
    assert.ok(nonce, 'checkout form carries a nonce');
    const [a, b] = await Promise.all([pay(app.base, cookie, nonce), pay(app.base, cookie, nonce)]);
    assert.equal(a.headers.get('location'), b.headers.get('location'));
    const s = await state(app.base);
    assert.equal(s.orders.length, 1); assert.equal(s.charges.length, 1);
    await pay(app.base, cookie, nonce); // later replay with the same nonce is still one order
    assert.equal((await state(app.base)).orders.length, 1);
  } finally { await app.close(); }
});

test('agent-fix is idempotent and rejects an unknown hazard', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-'));
  fs.mkdirSync(path.join(dir, 'demo/app'), { recursive: true });
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'), path.join(dir, 'demo/app/server.mjs'));
  const brief = path.join(dir, 'b.json'); fs.writeFileSync(brief, JSON.stringify({ finding_id: 'F-001', invariant: { observation: 'order_count' } }));
  const run = () => execFileSync('node', [path.join(PACKAGE_ROOT, 'demo/agent-fix.mjs'), brief], { cwd: dir, encoding: 'utf8' });
  assert.match(run(), /applied/); assert.match(run(), /already applied/);
  fs.writeFileSync(brief, JSON.stringify({ finding_id: 'F-001', invariant: { observation: 'x' } }));
  assert.throws(run);
});

test('AC-25 zero runtime dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined);
});
