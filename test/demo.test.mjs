import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { PACKAGE_ROOT } from '../src/util.mjs';

// The app listens on PORT at import; run it as a child process on a free port.
async function startApp(file) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn('node', [file], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`${base}/health`)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 100)); }
  return { base, close: () => child.kill() };
}
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
async function cartReady(base) {
  const add = await fetch(`${base}/cart/add`, { method: 'POST', redirect: 'manual', headers: FORM, body: 'id=mug' });
  return add.headers.get('set-cookie').split(';')[0];
}
const pay = (base, cookie) => fetch(`${base}/checkout`, { method: 'POST', redirect: 'manual', headers: { ...FORM, cookie }, body: 'email=buyer%40example.test&card=4242+4242+4242+4242' });
const state = async (base) => (await fetch(`${base}/__state`)).json();

test('AC-20 demo app serves seeded products and a normal purchase ends on the confirmation', async () => {
  const app = await startApp(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'));
  try {
    assert.deepEqual(await (await fetch(`${app.base}/health`)).json(), { ok: true });
    const home = await (await fetch(`${app.base}/`)).text();
    for (const s of ['Harbor Mug', '$49.00', 'Field Notebook', '$12.00', 'Canvas Tote', '$28.00']) assert.ok(home.includes(s), s);
    const cookie = await cartReady(app.base);
    const r = await pay(app.base, cookie);
    assert.equal(r.status, 303);
    assert.match(await (await fetch(`${app.base}${r.headers.get('location')}`)).text(), /<h1>Order confirmed<\/h1>/);
    assert.equal((await state(app.base)).orders.length, 1);
    await fetch(`${app.base}/admin/reset`, { method: 'POST' });
    assert.equal((await state(app.base)).orders.length, 0);
  } finally { app.close(); }
});

test('AC-21 double submit on the shipped app: ONE order and charge, but one response sends the customer to an empty cart', async () => {
  const app = await startApp(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'));
  try {
    const cookie = await cartReady(app.base);
    const rs = await Promise.all([pay(app.base, cookie), pay(app.base, cookie)]);
    const locs = rs.map((r) => r.headers.get('location')).sort();
    assert.deepEqual(locs, ['/cart', '/orders/1']);
    const s = await state(app.base);
    assert.equal(s.orders.length, 1); assert.equal(s.charges.length, 1);
    const cart = await (await fetch(`${app.base}/cart`, { headers: { cookie } })).text();
    assert.match(cart, /<h1>Cart<\/h1>/); assert.match(cart, /Your cart is empty/); assert.doesNotMatch(cart, /Order confirmed/);
  } finally { app.close(); }
});

test('AC-22 the reference patch applies with git apply; a repeat submit lands on the same confirmation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'patched-'));
  fs.mkdirSync(path.join(dir, 'demo/app'), { recursive: true });
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'), path.join(dir, 'demo/app/server.mjs'));
  execFileSync('git', ['apply', path.join(PACKAGE_ROOT, 'demo/patches/0001-confirm-repeat-submit.patch')], { cwd: dir });
  const app = await startApp(path.join(dir, 'demo/app/server.mjs'));
  try {
    const cookie = await cartReady(app.base);
    const rs = await Promise.all([pay(app.base, cookie), pay(app.base, cookie)]);
    assert.deepEqual(rs.map((r) => r.headers.get('location')), ['/orders/1', '/orders/1']);
    const s = await state(app.base);
    assert.equal(s.orders.length, 1); assert.equal(s.charges.length, 1);
    assert.equal((await pay(app.base, cookie)).headers.get('location'), '/orders/1'); // a later replay (Back button) too
    assert.equal((await state(app.base)).orders.length, 1);
  } finally { app.close(); }
});

test('agent-fix is idempotent and rejects an unknown hazard', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-'));
  fs.mkdirSync(path.join(dir, 'demo/app'), { recursive: true });
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'demo/app/server.mjs'), path.join(dir, 'demo/app/server.mjs'));
  const brief = path.join(dir, 'b.json'); fs.writeFileSync(brief, JSON.stringify({ finding_id: 'F-001', invariant: { observation: 'final_heading' } }));
  const run = () => execFileSync('node', [path.join(PACKAGE_ROOT, 'demo/agent-fix.mjs'), brief], { cwd: dir, encoding: 'utf8' });
  assert.match(run(), /applied/); assert.match(run(), /already applied/);
  fs.writeFileSync(brief, JSON.stringify({ finding_id: 'F-001', invariant: { observation: 'x' } }));
  assert.throws(run);
});

test('AC-25 zero runtime dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined);
});
