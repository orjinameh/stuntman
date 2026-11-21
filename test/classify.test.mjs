import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, classifyHeal, judgeRun } from '../src/classify.mjs';

const persona = { id: 'impatient', invariant: { observation: 'order_count', equals: 1, reason: 'r' } };
const run = (status, count, extra = {}) => ({ status, exit_code: { passed: 0, failed: 1, error: 2, timeout: 3 }[status], reason: '', values: count === undefined ? {} : { order_count: String(count) }, ...extra });

test('AC-09 confirmed only when two runs fail with the same typed value', () => {
  assert.equal(classify(persona, [run('failed', 2), run('failed', 2)]).verdict, 'confirmed');
});
test('one of two failing is suspected, never confirmed', () => {
  assert.equal(classify(persona, [run('failed', 2), run('passed', 1)]).verdict, 'suspected');
  assert.equal(classify(persona, [run('failed', 2)]).verdict, 'suspected');
});
test('two failures with different values are suspected and labelled inconsistent', () => {
  const r = classify(persona, [run('failed', 2), run('failed', 3)]);
  assert.equal(r.verdict, 'suspected'); assert.match(r.basis, /inconsistent/);
});
test('AC-07 error and timeout never confirm', () => {
  assert.equal(classify(persona, [run('error')]).verdict, 'inconclusive');
  assert.equal(classify(persona, [run('timeout')]).verdict, 'inconclusive');
  assert.equal(classify(persona, [run('failed', 2), run('timeout')]).verdict, 'suspected');
});
test('missing observation value never confirms, even on a pass', () => {
  assert.equal(classify(persona, [run('failed')]).verdict, 'inconclusive');
  assert.equal(classify(persona, [run('passed')]).verdict, 'inconclusive');
});
test('a violating value counts even if the tool said passed', () => {
  assert.equal(judgeRun(run('passed', 2), persona.invariant).kind, 'violation');
});
test('money-formatted values parse', () => {
  const p = { invariant: { observation: 'charged_total', equals: '$49.00' } };
  assert.equal(judgeRun({ status: 'passed', values: { charged_total: '$49.00' } }, p.invariant).kind, 'ok');
  assert.equal(judgeRun({ status: 'failed', values: { charged_total: '$98.00' } }, p.invariant).kind, 'violation');
});
test('clean on first-run success', () => { assert.equal(classify(persona, [run('passed', 1)]).verdict, 'clean'); });
test('heal re-audit verdicts', () => {
  assert.equal(classifyHeal(persona, [run('passed', 1), run('passed', 1)]).verdict, 'clean');
  assert.equal(classifyHeal(persona, [run('failed', 2), run('failed', 2)]).verdict, 'confirmed');
  assert.equal(classifyHeal(persona, [run('failed', 2), run('passed', 1)]).verdict, 'suspected');
  assert.equal(classifyHeal(persona, [run('error'), run('passed', 1)]).verdict, 'inconclusive');
});

test('text invariants compare normalised text and confirm on the same typed value', () => {
  const t = { id: 'impatient', invariant: { observation: 'final_heading', equals: 'Order confirmed', reason: 'r' } };
  const r = (status, h) => ({ status, values: h === undefined ? {} : { final_heading: h } });
  assert.equal(judgeRun(r('passed', '  order   CONFIRMED '), t.invariant).kind, 'ok');
  assert.equal(classify(t, [r('failed', 'Cart'), r('failed', 'cart')]).verdict, 'confirmed');
  assert.equal(classify(t, [r('failed', 'Cart'), r('failed', 'Shop')]).verdict, 'suspected');
  assert.equal(classify(t, [r('failed')]).verdict, 'inconclusive');
});
