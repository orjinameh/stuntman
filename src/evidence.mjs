import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

/** Best-effort: newest .evidence pack under session_dir/evidence and its last step screenshot (base64). Never throws. */
export function extractEvidence(sessionDir) {
  const out = { pack: null, screenshot_b64: null, note: null };
  try {
    if (!sessionDir || sessionDir.startsWith('fixtures://')) { out.note = 'fixture run: no sealed pack'; return out; }
    const dir = path.join(sessionDir.replace(/^~(?=\/|$)/, os.homedir()), 'evidence');
    if (!fs.existsSync(dir)) { out.note = 'no evidence directory in session_dir'; return out; }
    const packs = fs.readdirSync(dir).filter((f) => f.endsWith('.evidence')).map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (!packs.length) { out.note = 'no .evidence pack found'; return out; }
    out.pack = path.join(dir, packs[0].f);
    const list = spawnSync('unzip', ['-l', out.pack], { encoding: 'utf8' });
    if (list.error || list.status !== 0) { out.note = 'unzip unavailable; pack path recorded only'; return out; }
    const shots = list.stdout.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((n) => /^tests\/[^/]+\/steps\/[^/]+\/screenshot\.png$/.test(n || '')).sort();
    if (!shots.length) { out.note = 'pack has no step screenshot'; return out; }
    const img = spawnSync('unzip', ['-p', out.pack, shots[shots.length - 1]], { maxBuffer: 20 * 1024 * 1024 });
    if (img.status === 0 && img.stdout && img.stdout.length) out.screenshot_b64 = img.stdout.toString('base64');
    else out.note = 'screenshot extraction failed';
  } catch (e) { out.note = `evidence extraction skipped: ${e.message}`; }
  return out;
}
