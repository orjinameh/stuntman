import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PACKAGE_ROOT } from '../src/util.mjs';

// Stand-in agents: tiny shell scripts named like the real CLIs, placed first on PATH. They test the adapter's guards, not any real agent.
function setup(agentBody, agentName = 'claude') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentrun-'));
  for (const f of ['demo/app', 'demo/fixed', 'demo/patches', 'demo/baseline', 'personas', 'tests', 'fixtures']) fs.mkdirSync(path.join(dir, f), { recursive: true });
  fs.writeFileSync(path.join(dir, 'demo/app/server.mjs'), 'console.log("old");\n');
  fs.writeFileSync(path.join(dir, 'demo/fixed/server.mjs'), 'console.log("prewritten fix");\n');
  fs.writeFileSync(path.join(dir, 'stuntman.json'), '{"a":1}\n'); fs.writeFileSync(path.join(dir, 'stuntman.lock'), '{}\n'); fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'brief.md'), '# brief\nthe hazard\n');
  const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, agentName), `#!/bin/sh\n${agentBody}\n`, { mode: 0o755 });
  const run = (extraEnv = {}) => spawnSync('node', [path.join(PACKAGE_ROOT, 'demo/agent-run.mjs'), 'brief.md'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, STUNTMAN_AGENT: agentName, ...extraEnv } });
  return { dir, run };
}

test('a well-behaved agent edits only the app; the pre-written repair is hidden during the run and restored after', () => {
  const { dir, run } = setup('test ! -e demo/fixed || { echo "fix visible" >&2; exit 9; }\nls -a | grep -qi hidden && { echo "hidden dir visible in repo" >&2; exit 9; }\necho \'console.log("agent fix");\' > demo/app/server.mjs');
  const r = run();
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(fs.readFileSync(path.join(dir, 'demo/app/server.mjs'), 'utf8'), /agent fix/);
  assert.ok(fs.existsSync(path.join(dir, 'demo/fixed/server.mjs')), 'the hidden directory is restored');
});

test('an agent that edits the locked contract is refused', () => {
  const { run } = setup('echo \'console.log("x");\' > demo/app/server.mjs\necho \'{"weakened":true}\' > stuntman.json');
  const r = run(); assert.equal(r.status, 3); assert.match(r.stderr, /protected files: stuntman\.json/);
});

test('an agent that changes nothing, breaks the syntax, or fails is reported', () => {
  assert.equal(setup('true').run().status, 4);
  assert.equal(setup('echo "function (" > demo/app/server.mjs').run().status, 7);
  assert.equal(setup('exit 1').run().status, 6);
});

test('with no agent and no API key the adapter says what to install', () => {
  const { dir } = setup('true');
  const r = spawnSync('node', [path.join(PACKAGE_ROOT, 'demo/agent-run.mjs'), 'brief.md'], { cwd: dir, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', HOME: dir } });
  assert.equal(r.status, 5); assert.match(r.stderr, /no coding agent found/);
});

test('opencode is driven as `opencode run [-m model] <prompt>` and may be forced with STUNTMAN_AGENT', () => {
  const dir0 = fs.mkdtempSync(path.join(os.tmpdir(), 'argv-')); const log = path.join(dir0, 'argv.txt');
  const { dir, run } = setup(`printf '%s\\n' "$@" > ${log}\necho 'console.log("oc fix");' > demo/app/server.mjs`, 'opencode');
  const r = run({ STUNTMAN_AGENT_MODEL: 'openrouter/some-model' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const argv = fs.readFileSync(log, 'utf8').split('\n');
  assert.equal(argv[0], 'run'); assert.equal(argv[1], '-m'); assert.equal(argv[2], 'openrouter/some-model');
  assert.match(argv.slice(3).join('\n'), /REPAIR BRIEF/);
  assert.match(fs.readFileSync(path.join(dir, 'demo/app/server.mjs'), 'utf8'), /oc fix/);
});

test('manual mode: waits for Enter while the repair is hidden, then applies the same guards', async () => {
  const { spawn } = await import('node:child_process');
  const { dir } = setup('true');
  const child = spawn('node', [path.join(PACKAGE_ROOT, 'demo/agent-run.mjs'), 'brief.md'], { cwd: dir, env: { ...process.env, STUNTMAN_AGENT: 'manual' } });
  let out = ''; child.stdout.on('data', (d) => { out += d; });
  for (let i = 0; i < 100 && !/press Enter/.test(out); i++) await new Promise((r) => setTimeout(r, 50));
  assert.match(out, /MANUAL MODE/); assert.ok(!fs.existsSync(path.join(dir, 'demo/fixed')), 'the pre-written repair is hidden while waiting');
  assert.match(fs.readFileSync(path.join(os.tmpdir(), 'stuntman-agent-prompt.txt'), 'utf8'), /REPAIR BRIEF/);
  fs.writeFileSync(path.join(dir, 'demo/app/server.mjs'), 'console.log("manual agent fix");\n');   // what the interactive agent would do
  child.stdin.write('\n');
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 0); assert.ok(fs.existsSync(path.join(dir, 'demo/fixed/server.mjs')), 'restored afterwards');
});
