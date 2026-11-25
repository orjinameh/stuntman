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
  const dir = tmpProject({ noReset: true }); const log = path.join(os.tmpdir(), `fk-${Date.now()}.log`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'double', FAKE_KANE_LOG: log, KANE_HEADLESS: '1' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 1); assert.match(r.out, /LIVE/); assert.match(r.out, /impatient CONFIRMED/);
  });
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(calls.length, 2); // pass 1 + confirmation of the failure
  const a = calls[0];
  assert.equal(a[0], 'run'); assert.match(a[1], /Start at http:\/\/localhost:3000\//);
  for (const f of ['--agent', '--url', 'http://localhost:3000', '--max-steps', '40', '--timeout', '300', '--headless']) assert.ok(a.includes(f), f);
  const rep = JSON.parse(fs.readFileSync(path.join(latestRun(dir), 'report.json'), 'utf8'));
  assert.equal(rep.mode, 'live');
});

test('AC-07 a Kane setup error (exit 2) is inconclusive, never confirmed', async () => {
  const dir = tmpProject({ noReset: true });
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'error' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 3); assert.match(r.out, /inconclusive/);
  });
});

test('missing kane binary gives a setup error, not a stack trace', async () => {
  const dir = tmpProject({ noReset: true });
  await withEnv({ KANE_BIN: '/nonexistent/kane-cli' }, async () => {
    const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
    assert.equal(r.code, 2); assert.match(r.err, /npm install -g @testmuai\/kane-cli/);
  });
});

test('AC-26 budget guard refuses an impossible live audit and --force overrides', async () => {
  const dir = tmpProject({ noReset: true });
  const f = path.join(dir, 'stuntman.json'); const cfg = JSON.parse(fs.readFileSync(f, 'utf8')); cfg.budget.max_credits = 50; fs.writeFileSync(f, JSON.stringify(cfg));
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean' }, async () => {
    const r = await cli(dir, ['audit', '--live']);
    assert.equal(r.code, 2); assert.match(r.err, /exceeds budget\.max_credits/); assert.match(r.out, /credit estimate: 263/);
    const forced = await cli(dir, ['audit', '--live', '--force']);
    assert.match(forced.out, /skipped/);               // ceiling (50) reached after 3 runs of 20 credits
    assert.match(forced.out, /budget ceiling reached/);
  });
});

test('AC-18 verify --live runs testmd and waits for test_md_done', async () => {
  const dir = tmpProject({ noReset: true }); await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const log = path.join(os.tmpdir(), `fk2-${Date.now()}.log`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean', FAKE_KANE_LOG: log }, async () => {
    const r = await cli(dir, ['verify', '--live']); assert.equal(r.code, 0); assert.match(r.out, /PASS/);
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(log, 'utf8').trim()), ['testmd', 'run', 'tests/stuntman-impatient_test.md', '--agent']);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'double' }, async () => { assert.equal((await cli(dir, ['verify', '--live'])).code, 1); });
});

test('live audit resets the app before every run and stops if the reset fails', async () => {
  const http = await import('node:http');
  let resets = 0;
  const srv = http.createServer((req, res) => { if (req.method === 'POST' && req.url === '/admin/reset') resets++; res.end('{"ok":true}'); });
  await new Promise((r) => srv.listen(0, r));
  const dir = tmpProject();
  const f = path.join(dir, 'stuntman.json'); const cfg = JSON.parse(fs.readFileSync(f, 'utf8')); cfg.app.base_url = `http://127.0.0.1:${srv.address().port}`; fs.writeFileSync(f, JSON.stringify(cfg));
  try {
    await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'double' }, async () => {
      const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
      assert.equal(r.code, 1);
      assert.equal(resets, 2); // run 1 and its confirming run 2
    });
    srv.close(); await new Promise((r) => setTimeout(r, 50));
    await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean' }, async () => {
      const r = await cli(dir, ['audit', '--live', '--persona', 'impatient']);
      assert.equal(r.code, 2); assert.match(r.err, /could not reset the app/);
    });
  } finally { srv.close(); }
});

test('heal retries attempts that were not usable and only judges usable runs', async () => {
  const dir = tmpProject({ noReset: true });
  await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const counter = path.join(os.tmpdir(), `fkc-${Date.now()}`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_SEQ: 'unachievable,clean,unachievable,clean', FAKE_KANE_COUNTER: counter }, async () => {
    const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'true', '--live', '--settle', '0']);
    assert.equal(r.code, 0); assert.match(r.out, /CLEAN/); assert.match(r.out, /2 usable of 4 attempts/); assert.match(r.out, /attempt 1: not usable/);
  });
  const counter2 = path.join(os.tmpdir(), `fkc2-${Date.now()}`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_SEQ: 'unachievable', FAKE_KANE_COUNTER: counter2 }, async () => {
    const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'true', '--live', '--settle', '0', '--attempts', '3']);
    assert.equal(r.code, 2); assert.match(r.out, /INCONCLUSIVE/); assert.match(r.out, /only 0 of 3 attempts were usable/);
  });
  const counter3 = path.join(os.tmpdir(), `fkc3-${Date.now()}`);
  await withEnv({ KANE_BIN: FAKE, FAKE_KANE_SEQ: 'double,double', FAKE_KANE_COUNTER: counter3 }, async () => {
    const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'true', '--live', '--settle', '0']);
    assert.equal(r.code, 1); assert.match(r.out, /STILL REPRODUCIBLE/);
  });
});

test('heal restarts the app itself (restart_cmd) and waits for health before re-auditing', async () => {
  const http = await import('node:http');
  const srv = http.createServer((q, r) => r.end('{"ok":true}'));
  await new Promise((r) => srv.listen(0, r));
  const dir = tmpProject({ noReset: true });
  const marker = path.join(dir, 'restarted.txt');
  const f = path.join(dir, 'stuntman.json'); const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  cfg.app.base_url = `http://127.0.0.1:${srv.address().port}`; cfg.app.restart_cmd = `echo restarted > ${marker}`; delete cfg.app.probe;
  fs.writeFileSync(f, JSON.stringify(cfg));
  await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  try {
    await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean' }, async () => {
      const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'true', '--live']);
      assert.equal(r.code, 0); assert.match(r.out, /restarting the app/);
    });
    assert.equal(fs.readFileSync(marker, 'utf8').trim(), 'restarted');
  } finally { srv.close(); }
});

test('stopApp kills exactly the listener on the port, and never the caller', async () => {
  const { spawn } = await import('node:child_process');
  const { listeningPids, stopApp } = await import('../src/restart.mjs');
  const port = 21000 + Math.floor(Math.random() * 5000);
  const child = spawn('node', ['-e', `require('http').createServer((q,r)=>r.end('x')).listen(${port})`], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !listeningPids(port).length; i++) await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(listeningPids(port), [child.pid]);
  assert.ok(!listeningPids(port).includes(process.pid));
  assert.equal(await stopApp({ app: { base_url: `http://127.0.0.1:${port}` } }), true);
  assert.deepEqual(listeningPids(port), []);
});

test('heal with start_cmd stops the old listener, starts the new one and waits for health', async () => {
  const { spawn } = await import('node:child_process');
  const { listeningPids } = await import('../src/restart.mjs');
  const port = 26000 + Math.floor(Math.random() * 5000);
  const script = path.join(os.tmpdir(), `srv-${port}.cjs`);
  fs.writeFileSync(script, `require('http').createServer((q,r)=>r.end('{"ok":true}')).listen(${port});`);
  const old = spawn('node', [script], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !listeningPids(port).length; i++) await new Promise((r) => setTimeout(r, 100));
  const dir = tmpProject({ noReset: true });
  const f = path.join(dir, 'stuntman.json'); const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  cfg.app.base_url = `http://127.0.0.1:${port}`; cfg.app.start_cmd = `nohup node ${script} > /dev/null 2>&1 &`; delete cfg.app.probe;
  fs.writeFileSync(f, JSON.stringify(cfg));
  await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  try {
    await withEnv({ KANE_BIN: FAKE, FAKE_KANE_MODE: 'clean' }, async () => {
      const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'echo fixed demo/app/server.mjs', '--live']);
      assert.equal(r.code, 0); assert.match(r.out, /CLEAN/);   // the agent command itself contains the app path and must survive
    });
    const now = listeningPids(port);
    assert.equal(now.length, 1); assert.notEqual(now[0], old.pid);
  } finally { for (const p of listeningPids(port)) { try { process.kill(p); } catch { /* gone */ } } try { old.kill(); } catch { /* gone */ } }
});
