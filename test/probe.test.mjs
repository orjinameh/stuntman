import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProbe, mergeProbe, probeApp } from '../src/probe.mjs';
import { classify, judgeRun } from '../src/classify.mjs';
import http from 'node:http';

const spec = { path: '/__state', values: { order_count: { count: 'orders' }, charged_total: { sum: 'charges', field: 'cents', divide: 100 } } };
const persona = { id: 'stale-total', invariant: { observation: 'charged_total', at_most_observation: 'displayed_total', reason: 'r' } };
const run = (values, extra = {}) => ({ status: 'failed', exit_code: 1, values, has_run_end: true, ...extra });

test('probe derives counts and totals from state, and an empty shop is a real zero', () => {
  assert.deepEqual(evaluateProbe(spec, { orders: [{}], charges: [{ cents: 6100 }] }), { order_count: '1', charged_total: '61.00' });
  assert.deepEqual(evaluateProbe(spec, { orders: [], charges: [] }), { order_count: '0', charged_total: '0.00' });
  assert.deepEqual(evaluateProbe(spec, { nothing: true }), {});
});

test('a refused payment is judged from the probe even when Kane read nothing off the empty page', () => {
  const merged = mergeProbe(run({ displayed_total: '$49.00' }), { values: { order_count: '0', charged_total: '0.00' }, error: null });
  assert.equal(classify(persona, [merged]).verdict, 'clean');
});

test('an overcharge is confirmed from the probe in two runs, and Kane disagreement is recorded', () => {
  const a = mergeProbe(run({ displayed_total: '$49.00', charged_total: 'NONE' }), { values: { charged_total: '61.00' }, error: null });
  const b = mergeProbe(run({ displayed_total: '$49.00' }), { values: { charged_total: '61.00' }, error: null });
  assert.equal(classify(persona, [a, b]).verdict, 'confirmed');
  assert.equal(a.kane_values.charged_total, 'NONE');
});

test('a Kane exit error after run_end still counts when the values exist; a real setup error does not', () => {
  assert.equal(judgeRun({ status: 'error', has_run_end: true, values: { charged_total: '0.00', displayed_total: '$49.00' } }, persona.invariant).kind, 'ok');
  assert.equal(judgeRun({ status: 'error', has_run_end: false, values: {}, reason: 'boom' }, persona.invariant).kind, 'error');
});

test('probeApp reads a live endpoint and never throws when the app is down', async () => {
  const srv = http.createServer((q, r) => r.end(JSON.stringify({ orders: [{}, {}], charges: [{ cents: 100 }, { cents: 250 }] })));
  await new Promise((r) => srv.listen(0, r));
  const cfg = { app: { base_url: `http://127.0.0.1:${srv.address().port}`, probe: spec } };
  assert.deepEqual((await probeApp(cfg)).values, { order_count: '2', charged_total: '3.50' });
  srv.close(); await new Promise((r) => setTimeout(r, 50));
  const down = await probeApp(cfg);
  assert.deepEqual(down.values, {}); assert.ok(down.error);
});
