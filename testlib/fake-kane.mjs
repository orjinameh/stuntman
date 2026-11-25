#!/usr/bin/env node
// Test double for kane-cli. NOT Kane: it only emits the documented NDJSON shape so the runner's parsing can be tested offline.
import fs from 'node:fs';
const args = process.argv.slice(2);
if (process.env.FAKE_KANE_LOG) fs.appendFileSync(process.env.FAKE_KANE_LOG, JSON.stringify(args) + '\n');
let mode = process.env.FAKE_KANE_MODE || 'clean';
if (process.env.FAKE_KANE_SEQ && process.env.FAKE_KANE_COUNTER) {
  const seq = process.env.FAKE_KANE_SEQ.split(',');
  let n = 0; try { n = Number(fs.readFileSync(process.env.FAKE_KANE_COUNTER, 'utf8')) || 0; } catch { /* first call */ }
  fs.writeFileSync(process.env.FAKE_KANE_COUNTER, String(n + 1));
  mode = seq[Math.min(n, seq.length - 1)];
}
if (mode === 'unachievable') {
  process.stdout.write(JSON.stringify({ type: 'run_end', status: 'failed', reason: 'The final assertion cannot evaluate because displayed_total was never stored.', duration: 2, credits_consumed: 10, context: { variables: { final_heading: { value: '' } } }, reason_code: 'assertion_error.step_not_achievable', session_dir: '/tmp/none' }) + '\n');
  process.exit(1);
}
process.stderr.write('progress UI noise on stderr\n');
if (mode === 'error') { process.stdout.write('not json at all\n'); process.exit(2); }
if (args[0] === 'testmd') {
  process.stdout.write(JSON.stringify({ type: 'test_md_done', overall_status: mode === 'double' ? 'failed' : 'passed', duration_s: 4.2, session_id: 'x' }) + '\n');
  process.exit(mode === 'double' ? 1 : 0);
}
process.stdout.write('{"type":"step","summary":"hello"}\n{broken json\n');
const bad = mode === 'double';
process.stdout.write(JSON.stringify({ type: 'run_end', status: bad ? 'failed' : 'passed', reason: bad ? 'Assertion failed: final_heading was Cart' : 'ok', duration: 3.3, credits: 20, final_state: { final_heading: bad ? 'Cart' : 'Order confirmed', order_count: '1', charged_total: '$49.00' }, session_dir: '/tmp/none' }) + '\n');
process.exit(bad ? 1 : 0);
