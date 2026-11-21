import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, cli, latestRun } from '../testlib/project.mjs';

test('AC-01 init refuses to overwrite, and unknown persona ids exit 2 listing available ids', async () => {
  const dir = tmpProject(); fs.rmSync(path.join(dir, 'stuntman.json'));
  assert.equal((await cli(dir, ['init'])).code, 0);
  const again = await cli(dir, ['init']);
  assert.equal(again.code, 2); assert.match(again.err, /--force/);
  assert.equal((await cli(dir, ['init', '--force'])).code, 0);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'stuntman.json'), 'utf8')); cfg.personas.push('ghost');
  fs.writeFileSync(path.join(dir, 'stuntman.json'), JSON.stringify(cfg));
  const bad = await cli(dir, ['audit']);
  assert.equal(bad.code, 2); assert.match(bad.err, /ghost/); assert.match(bad.err, /impatient/);
});

test('unknown command exits 2', async () => { assert.equal((await cli(tmpProject(), ['wat'])).code, 2); });

test('AC-04/08/09/10/11 fixture audit: exit 1, confirmed impatient, suspected refresher, files, no external requests', async () => {
  const dir = tmpProject();
  const r = await cli(dir, ['audit', '--fixture-state', 'broken']);
  assert.equal(r.code, 1);
  assert.match(r.out, /impatient CONFIRMED — 2 orders, \$98\.00 charged/);
  assert.match(r.out, /refresher suspected/);
  assert.match(r.out, /FIXTURE/);
  const run = latestRun(dir);
  const rep = JSON.parse(fs.readFileSync(path.join(run, 'report.json'), 'utf8'));
  assert.equal(rep.mode, 'fixture');
  assert.deepEqual([rep.summary.confirmed, rep.summary.suspected, rep.summary.clean], [1, 1, 3]);
  assert.equal(rep.personas.find((p) => p.id === 'impatient').finding_id, 'F-001');
  assert.equal(rep.personas.find((p) => p.id === 'impatient').runs.length, 2);   // only failures repeated
  assert.equal(rep.personas.find((p) => p.id === 'back-button').runs.length, 1);
  assert.ok(fs.existsSync(path.join(run, 'raw', 'impatient.run2.ndjson')));
  const html = fs.readFileSync(path.join(run, 'report.html'), 'utf8');
  assert.match(html, /FIXTURE/); assert.match(html, /How to read this/);
  assert.doesNotMatch(html, /(src|href)=["']https?:/i); assert.doesNotMatch(html, /@import|<script/i);
});

test('fixed state is clean and exits 0', async () => {
  const dir = tmpProject();
  const r = await cli(dir, ['audit', '--fixture-state', 'fixed']);
  assert.equal(r.code, 0);
});

test('audit --json prints report JSON only on stdout', async () => {
  const r = await cli(tmpProject(), ['audit', '--fixture-state', 'broken', '--json']);
  assert.equal(r.code, 1);
  assert.equal(JSON.parse(r.out).summary.confirmed, 1);
});

test('AC-12 brief writes md + json with the required sections; suspected hazards get no brief', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']);
  const r = await cli(dir, ['brief', 'F-001']);
  assert.equal(r.code, 0);
  const b = JSON.parse(fs.readFileSync(path.join(latestRun(dir), 'briefs', 'F-001.json'), 'utf8'));
  for (const k of ['behaviour', 'invariant', 'observed', 'evidence', 'reproduce', 'acceptance', 'suspects', 'do_not']) assert.ok(b[k], k);
  assert.match(b.observed.text, /2 orders, \$98\.00/);
  const md = fs.readFileSync(path.join(latestRun(dir), 'briefs', 'F-001.md'), 'utf8');
  assert.match(md, /## Do not/); assert.match(md, /stuntman\.lock/); assert.match(md, /- \[ \]/);
  assert.equal((await cli(dir, ['brief', 'F-002'])).code, 2);
});

test('AC-15/16 lock writes the test and the lock; AC-17 contract change makes audit refuse', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']);
  const r = await cli(dir, ['lock']); assert.equal(r.code, 0);
  const t = fs.readFileSync(path.join(dir, 'tests', 'stuntman-impatient_test.md'), 'utf8');
  assert.match(t, /^---\nmode: testing\nurl: http:\/\/localhost:3000\/\n/);
  const keys = t.split('---')[1].trim().split('\n').map((l) => l.split(':')[0]);
  assert.deepEqual(keys, ['mode', 'url', 'tags', 'max_steps', 'timeout', 'code_export']);
  assert.match(t, /^# Stuntman:/m);
  const h2 = t.match(/^## /gm); assert.ok(h2.length >= 5);
  assert.match(t, /assert that 'order_count' equals 1/);
  const lock = JSON.parse(fs.readFileSync(path.join(dir, 'stuntman.lock'), 'utf8'));
  for (const k of ['contract_hash', 'journey_hash', 'observations_hash', 'personas_hash', 'audited_commit', 'personas', 'tests']) assert.ok(lock[k], k);
  assert.equal((await cli(dir, ['lock'])).code, 2); // already locked
  // weaken the persona: audit must refuse and name the section
  const pf = path.join(dir, 'personas', 'impatient.json'); const p = JSON.parse(fs.readFileSync(pf, 'utf8')); p.invariant.equals = 2;
  fs.writeFileSync(pf, JSON.stringify(p));
  const bad = await cli(dir, ['audit', '--fixture-state', 'fixed']);
  assert.equal(bad.code, 2); assert.match(bad.err, /personas/); assert.match(bad.err, /--allow-contract-change/);
  assert.notEqual((await cli(dir, ['audit', '--fixture-state', 'fixed', '--allow-contract-change'])).code, 2);
});

test('lock reads the most recent report WITH a confirmed finding, not a later clean one', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']);
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal((await cli(dir, ['audit', '--fixture-state', 'fixed'])).code, 0);
  assert.equal((await cli(dir, ['lock'])).code, 0);
  assert.ok(fs.existsSync(path.join(dir, 'tests', 'stuntman-impatient_test.md')));
});

test('AC-13/14 heal: CLEAN (exit 0) in fixed state, STILL REPRODUCIBLE (exit 1) otherwise, agent failure exits 2', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const bad = await cli(dir, ['heal', 'F-001', '--agent-cmd', 'node demo/agent-fix.mjs {brief}']);
  assert.equal(bad.code, 1); assert.match(bad.out, /STILL REPRODUCIBLE/);
  const dir2 = tmpProject(); await cli(dir2, ['audit', '--fixture-state', 'broken']); await cli(dir2, ['lock']);
  const ok = await cli(dir2, ['heal', 'F-001', '--agent-cmd', 'node demo/agent-fix.mjs {brief}', '--fixture-state', 'fixed']);
  assert.equal(ok.code, 0); assert.match(ok.out, /CLEAN — the hazard is no longer reproducible/);
  assert.match(fs.readFileSync(path.join(dir2, 'demo/app/server.mjs'), 'utf8'), /nonce/); // the stand-in agent applied the patch
  const dir3 = tmpProject(); await cli(dir3, ['audit', '--fixture-state', 'broken']); await cli(dir3, ['lock']);
  assert.equal((await cli(dir3, ['heal', 'F-001', '--agent-cmd', 'node -e "process.exit(5)"', '--fixture-state', 'fixed'])).code, 2);
});

test('heal passes the absolute brief path and does not touch the lock', async () => {
  const dir = tmpProject(); await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const before = fs.readFileSync(path.join(dir, 'stuntman.lock'), 'utf8');
  const probe = path.join(dir, 'probe.txt');
  const r = await cli(dir, ['heal', 'F-001', '--agent-cmd', `node -e "require('fs').writeFileSync(process.argv[1], process.argv[2])" ${JSON.stringify(probe)} {brief}`, '--fixture-state', 'fixed']);
  assert.equal(r.code, 0);
  assert.ok(path.isAbsolute(fs.readFileSync(probe, 'utf8'))); assert.match(fs.readFileSync(probe, 'utf8'), /F-001\.md$/);
  assert.equal(fs.readFileSync(path.join(dir, 'stuntman.lock'), 'utf8'), before);
});

test('AC-19 verify --fixture replays and passes; no lock exits 2', async () => {
  const dir = tmpProject();
  assert.equal((await cli(dir, ['verify'])).code, 2);
  await cli(dir, ['audit', '--fixture-state', 'broken']); await cli(dir, ['lock']);
  const r = await cli(dir, ['verify', '--fixture']);
  assert.equal(r.code, 0); assert.match(r.out, /replayed from fixture/); assert.match(r.out, /PASS/);
});

test('personas lists the library', async () => {
  const r = await cli(tmpProject(), ['personas']);
  assert.equal(r.code, 0); for (const id of ['impatient', 'refresher', 'back-button', 'slow-submit', 'returning']) assert.match(r.out, new RegExp(id));
  assert.equal(JSON.parse((await cli(tmpProject(), ['personas', '--json'])).out).length, 5);
});

test('second app: a different hazard class on a different journey (AC-28)', async () => {
  const dir = tmpProject();
  const sub = path.join(dir, 'demo', 'second');
  const r = await cli(sub, ['audit', '--fixture-state', 'broken']);
  assert.equal(r.code, 1); assert.match(r.out, /note_count = 2/);
});
