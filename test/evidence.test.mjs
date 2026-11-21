import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { extractEvidence } from '../src/evidence.mjs';
import { renderHtml } from '../src/report.mjs';

// A synthetic pack laid out like the documented .evidence zip (tests/<id>/steps/<n>-<id>/screenshot.png). Not a real Kane pack.
function fakeSession() {
  const s = fs.mkdtempSync(path.join(os.tmpdir(), 'sess-'));
  const stage = path.join(s, 'stage'); fs.mkdirSync(path.join(stage, 'tests/t1/steps/01-a'), { recursive: true }); fs.mkdirSync(path.join(stage, 'tests/t1/steps/02-b'), { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(stage, 'tests/t1/steps/01-a/screenshot.png'), Buffer.from('first'));
  fs.writeFileSync(path.join(stage, 'tests/t1/steps/02-b/screenshot.png'), png);
  fs.mkdirSync(path.join(s, 'evidence'));
  execFileSync('zip', ['-qr', path.join(s, 'evidence', 'run1.evidence'), 'tests'], { cwd: stage });
  return { s, png };
}

test('AC-30 extracts the LAST step screenshot as base64 from a pack and embeds it in the report', () => {
  const { s, png } = fakeSession();
  const ev = extractEvidence(s);
  assert.ok(ev.pack.endsWith('run1.evidence'));
  assert.equal(ev.screenshot_b64, png.toString('base64'));
  const report = { mode: 'live', fixture_state: null, app: { name: 'x' }, journey: { title: 'j' }, commit: 'c', started_at: 's', contract_hash: 'h', summary: { confirmed: 1, suspected: 0, clean: 0, inconclusive: 0, credits: 1 },
    personas: [{ id: 'impatient', name: 'I', severity: 'P0', verdict: 'confirmed', basis: 'b', finding_id: 'F-001', invariant: { observation: 'order_count', equals: 1, reason: 'r' }, runs: [{ index: 1, exit_code: 1, status: 'failed', values: { order_count: '2', charged_total: '$98.00' }, raw_path: 'raw/x', session_dir: s }] }], evidence: ev };
  assert.match(renderHtml(report), /data:image\/png;base64,/);
});

test('AC-30 evidence extraction never throws: no dir, fixture path, empty pack', () => {
  assert.equal(extractEvidence('fixtures://x').screenshot_b64, null);
  assert.equal(extractEvidence('/nonexistent/path').screenshot_b64, null);
  const s = fs.mkdtempSync(path.join(os.tmpdir(), 'sess-')); fs.mkdirSync(path.join(s, 'evidence'));
  assert.equal(extractEvidence(s).screenshot_b64, null);
});

test('report escapes values that come from the app or Kane', () => {
  const report = { mode: 'fixture', fixture_state: 'broken', app: { name: '<img src=x onerror=alert(1)>' }, journey: { title: 'j' }, commit: 'c', started_at: 's', contract_hash: 'h', summary: { confirmed: 0, suspected: 0, clean: 1, inconclusive: 0, credits: 0 },
    personas: [{ id: 'p', name: '<script>alert(1)</script>', severity: 'P0', verdict: 'clean', basis: 'b', finding_id: null, invariant: { observation: 'order_count', equals: 1, reason: 'r' }, runs: [{ index: 1, values: {}, duration: 1, credits: 0 }] }] };
  const html = renderHtml(report);
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
});
