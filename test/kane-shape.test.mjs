import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNdjson, buildRecord } from '../src/kane/parse.mjs';
import { classify } from '../src/classify.mjs';

// Shape captured from a real kane-cli 0.10.7 run (fields trimmed). Values live in context.variables; credits in credits_consumed.
const REAL_FAILED = [
  '{"type":"stream_start","cli_version":"0.10.7","surface":"run","v":1}',
  '{"step":9,"status":"failed","remark":"wait: Waiting after payment navigation","v":1}',
  JSON.stringify({ type: 'run_end', status: 'failed', summary: 's', one_liner: 'o', final_state: {}, reason: 'The first Pay click navigated immediately, leaving no Pay button for the required in-flight second click.', duration: 62.3, context: { memory: {}, variables: { final_heading: { value: '', type: 'text' }, order_count: { value: '', type: 'text' } } }, credits_consumed: 21.6878775, session_dir: '/home/codespace/.testmuai/kaneai/sessions/x', reason_code: 'assertion_error.step_not_achievable', verdict: { status: 'broken', family: 'automation_bug' } }),
].join('\n');
const persona = { id: 'impatient', invariant: { observation: 'final_heading', equals: 'Order confirmed', reason: 'r' } };

test('real Kane run_end: credits from credits_consumed, empty variables are not values', () => {
  const rec = buildRecord({ persona: 'impatient', index: 1, events: parseNdjson(REAL_FAILED), exitCode: 1, mode: 'live' });
  assert.equal(rec.credits, 21.6878775);
  assert.deepEqual(rec.values, {});
  assert.equal(rec.reason_code, 'assertion_error.step_not_achievable');
});

test('an unachievable behaviour is inconclusive and explains why, never a finding', () => {
  const rec = buildRecord({ persona: 'impatient', index: 1, events: parseNdjson(REAL_FAILED), exitCode: 1, mode: 'live' });
  const r = classify(persona, [rec]);
  assert.equal(r.verdict, 'inconclusive'); assert.match(r.basis, /could not perform the persona's behaviour/);
});

test('stored values are read from context.variables when final_state is empty', () => {
  const end = JSON.parse(REAL_FAILED.split('\n')[2]);
  end.status = 'failed'; end.reason_code = 'assertion_error.x'; end.context.variables.final_heading.value = 'Cart'; end.context.variables.order_count.value = '1';
  const rec = buildRecord({ persona: 'impatient', index: 1, events: [end], exitCode: 1, mode: 'live' });
  assert.deepEqual(rec.values, { final_heading: 'Cart', order_count: '1' });
  assert.equal(classify(persona, [rec]).verdict, 'suspected');
});
