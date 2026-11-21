import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PACKAGE_ROOT } from '../src/util.mjs';

async function startApp(file) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn('node', [file], { env: { ...process.env, PORT: String(port), PAYMENT_LATENCY_MS: '150' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`${base}/health`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
  return { base, close: () => child.kill() };
}
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
async function run(file) {
  const app = await startApp(file);
  try {
    const add = await fetch(`${app.base}/cart/add`, { method: 'POST', redirect: 'manual', headers: FORM, body: 'product_id=mug' });
    const cookie = add.headers.get('set-cookie').split(';')[0];
    const page = await (await fetch(`${app.base}/checkout`, { headers: { cookie } })).text();
    const nonce = (page.match(/name="nonce" value="([a-f0-9]+)"/) || [])[1];
    const body = new URLSearchParams({ email: 'b@e.test', card: '4242 4242 4242 4242', ...(nonce ? { nonce } : {}) }).toString();
    const pay = () => fetch(`${app.base}/api/orders`, { method: 'POST', redirect: 'manual', headers: { ...FORM, cookie }, body });
    await Promise.all([pay(), pay()]);
    const s = await (await fetch(`${app.base}/__state`)).json();
    return { orders: s.orders.length, charges: s.charges.length };
  } finally { app.close(); }
}
const dir = path.join(PACKAGE_ROOT, 'demo/control/app');

test('control app: a double submit creates two orders and two charges (the seeded hazard)', async () => {
  assert.deepEqual(await run(path.join(dir, 'server.mjs')), { orders: 2, charges: 2 });
});
test('control app, repaired twin: one order, one charge', async () => {
  assert.deepEqual(await run(path.join(dir, 'server.fixed.mjs')), { orders: 1, charges: 1 });
});
