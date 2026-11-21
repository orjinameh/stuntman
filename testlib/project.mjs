import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PACKAGE_ROOT } from '../src/util.mjs';
import { main } from '../src/cli.mjs';

export function tmpProject({ noReset = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stuntman-'));
  for (const n of ['stuntman.json', 'personas', 'fixtures', 'demo']) fs.cpSync(path.join(PACKAGE_ROOT, n), path.join(dir, n), { recursive: true });
  if (noReset) { const f = path.join(dir, 'stuntman.json'); const c = JSON.parse(fs.readFileSync(f, 'utf8')); delete c.app.reset; fs.writeFileSync(f, JSON.stringify(c, null, 2)); }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'], { cwd: dir });
  return dir;
}

export async function cli(cwd, argv) {
  const out = []; const err = [];
  const noColor = process.env.NO_COLOR; process.env.NO_COLOR = '1';
  const code = await main(argv, { cwd, out: (s) => out.push(s), err: (s) => err.push(s) });
  if (noColor === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = noColor;
  return { code, out: out.join('\n'), err: err.join('\n') };
}

export function latestRun(cwd) {
  const root = path.join(cwd, 'runs');
  const d = fs.readdirSync(root).sort().pop();
  return path.join(root, d);
}
