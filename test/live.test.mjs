import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tmpProject, cli, latestRun } from '../testlib/project.mjs';
import { PACKAGE_ROOT } from '../src/util.mjs';

const FAKE = path.join(PACKAGE_ROOT, 'testlib', 'fake-kane.mjs');
const withEnv = async (env, fn) => { const old = {}; for (const k of Object.keys(env)) { old[k] = process.env[k]; process.env[k] = env[k]; } try { return await fn(); } finally { for (const k of Object.keys(old)) old[k] === undefined ? delete process.env[k] : (process.env[k] = old[k]); } };

test('AC-05/06 live runner builds the documented argv, survives malformed lines and stderr noise (fake kane test double)', async () => {
  const dir = tmpProject(); const log = path.join(os.tmpdir(), `fk-${Date.now()}.log`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'double', FAKE_KANE_LOG: log, KANE_HEADLESS: '1' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 1); assert.match(r.out, /LIVE/); assert.match(r.out, /impatient CONFIRMED/);
  });
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(calls.length, 2); // pass 1 + confirmation of the failure
  const a = calls[0];
  assert.equal(a[0], 'run'); assert.match(a[1], /Start at http:\/\/localhost:3000\//);
  for (const f of ['--agent', '--url', 'http://localhost:3000', '--max-steps', '40', '--timeout', '180', '--headless']) assert.ok(a.includes(f), f);
  const rep = JSON.parse(fs.readFileSync(path.join(latestRun(dir), 'report.json'), 'utf8'));
  assert.equal(rep.mode, 'live');
});

test('AC-07 a Kane setup error (exit 2) is inconclusive, never confirmed', async () => {
  const dir = tmpProject();
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'error' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 3); assert.match(r.out, /inconclusive/);
  });
});

test('missing kane binary gives a setup error, not a stack trace', async () => {
  const dir = tmpProject();
  await withEnv({ KANE_BIN: '/nonexistent/kane-cli' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 2); assert.match(r.err, /npm install -g @testmuai\/kane-cli/);
  });
});

test('AC-26 budget guard refuses an impossible live audit and --force overrides', async () => {
  const dir = tmpProject();
  const f = path.join(dir, 'stuntman.json'); const cfg = JSON.parse(fs.readFileSync(f, 'utf8')); cfg.budget.max_credits = 50; fs.writeFileSync(f, JSON.stringify(cfg));
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean' }, async () => {
    const r = await cli(dir, ['audit', '--live']);
    assert.equal(r.code, 2); assert.match(r.err, /exceeds budget\.max_credits/); assert.match(r.out, /credit estimate: 188/);
    const forced = await cli(dir, ['audit', '--live', '--force']);
    assert.match(forced.out, /skipped/);               // ceiling (50) reached after 3 runs of 20 credits
    assert.match(forced.out, /budget ceiling reached/);
  });
});

test('AC-18 verify --live runs testmd and waits for test_md_done', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const log = path.join(os.tmpdir(), `fk2-${Date.now()}.log`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean', FAKE_KANE_LOG: log }, async () => {
    const r = await cli(dir, ['verify', '--live']); assert.equal(r.code, 0); assert.match(r.out, /PASS/);
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(log, 'utf8').trim()), ['testmd', 'run', 'tests/stuntman-impatient_test.md', '--agent']);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'double' }, async () => { assert.equal((await cli(dir, ['verify', '--live'])).code, 1); });
});
