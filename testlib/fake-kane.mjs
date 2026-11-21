#!/usr/bin/env node
// Test double for kane-cli. NOT Kane: it only emits the documented NDJSON shape so the runner's parsing can be tested offline.
import fs from 'node:fs';
const args = process.argv.slice(2);
if (process.env.FAKE_KANE_LOG) fs.appendFileSync(process.env.FAKE_KANE_LOG, JSON.stringify(args) + '\n');
const mode = process.env.FAKE_KANE_MODE || 'clean';
process.stderr.write('progress UI noise on stderr\n');
if (mode === 'error') { process.stdout.write('not json at all\n'); process.exit(2); }
if (args[0] === 'testmd') {
  process.stdout.write(JSON.stringify({ type: 'test_md_done', overall_status: mode === 'double' ? 'failed' : 'passed', duration_s: 4.2, session_id: 'x' }) + '\n');
  process.exit(mode === 'double' ? 1 : 0);
}
process.stdout.write('{"type":"step","summary":"hello"}\n{broken json\n');
const bad = mode === 'double';
process.stdout.write(JSON.stringify({ type: 'run_end', status: bad ? 'failed' : 'passed', reason: bad ? 'Assertion failed: order_count was 2, expected 1' : 'ok', duration: 3.3, credits: 20, final_state: { order_count: bad ? '2' : '1', charged_total: bad ? '$98.00' : '$49.00' }, session_dir: '/tmp/none' }) + '\n');
process.exit(bad ? 1 : 0);
