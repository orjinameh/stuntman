import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, c, readJson } from './util.mjs';
import { LOCK_FILE } from './audit.mjs';
import { parseNdjson } from './kane/parse.mjs';
import { kaneBin, spawnKane } from './kane/runner.mjs';
import { readFixtureRun } from './kane/fixture.mjs';
import { judgeRun } from './classify.mjs';

export function testPathPersona(rel) {
  const m = path.basename(rel).match(/^stuntman-([a-z0-9-]+)_test\.md$/);
  return m ? m[1] : null;
}

export async function verify(project, { live = false, log = console.log, headless = false } = {}) {
  const lockPath = path.join(project.cwd, LOCK_FILE);
  if (!fs.existsSync(lockPath)) throw new StuntmanError('no stuntman.lock. Run `stuntman lock` after a confirmed audit.');
  const lock = readJson(lockPath, LOCK_FILE);
  if (!lock.tests || !lock.tests.length) throw new StuntmanError('stuntman.lock lists no tests');
  const results = [];
  for (const rel of lock.tests) {
    const pid = testPathPersona(rel);
    if (live) {
      const bin = kaneBin(project.config);
      const args = ['testmd', 'run', rel, '--agent'];
      if (headless || process.env.KANE_HEADLESS === '1') args.push('--headless');
      const { stdout, code } = await spawnKane(bin, args, { timeoutS: project.config.budget.timeout_seconds * 2 });
      const done = [...parseNdjson(stdout)].reverse().find((e) => e.type === 'test_md_done');
      const pass = done ? done.overall_status === 'passed' || done.overall_status === 'pass' : code === 0;
      if (!done && code === 2) throw new StuntmanError(`Kane could not run ${rel} (exit 2). Run by hand: ${bin} ${args.join(' ')}`);
      results.push({ test: rel, persona: pid, pass, duration: done ? done.duration_s : null, share_url: done ? done.share_url || null : null, source: 'live' });
    } else {
      const persona = project.personas.find((p) => p.id === pid);
      const rec = readFixtureRun(project.cwd, project.config, 'fixed', pid, 1);
      const j = judgeRun(rec, persona.invariant);
      results.push({ test: rel, persona: pid, pass: j.kind === 'ok', duration: rec.duration, share_url: null, source: 'fixture' });
    }
  }
  for (const r of results) {
    const tag = r.pass ? c.green('PASS') : c.red('FAIL');
    log(`${tag}  ${r.test}${r.duration != null ? c.dim(`  ${Number(r.duration).toFixed(1)}s`) : ''}${r.share_url ? `  ${r.share_url}` : ''}${r.source === 'fixture' ? c.dim('  replayed from fixture') : ''}`);
  }
  return { results, exit: results.every((r) => r.pass) ? 0 : 1 };
}
