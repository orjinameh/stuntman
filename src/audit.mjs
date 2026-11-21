import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, hashOf, stamp, gitCommit, safeJoin, c } from './util.mjs';
import { compileObjective } from './compile.mjs';
import { classify } from './classify.mjs';
import { contractHashes } from './config.mjs';
import { estimateCredits } from './budget.mjs';
import { makeFixtureRunner } from './kane/fixture.mjs';
import { makeLiveRunner } from './kane/runner.mjs';
import { extractEvidence } from './evidence.mjs';

export const LOCK_FILE = 'stuntman.lock';

/** Refuse to audit when the contract drifted from stuntman.lock (a tripwire, not a security boundary). */
export function checkLock(project, { allowChange = false } = {}) {
  const lockPath = path.join(project.cwd, LOCK_FILE);
  if (!fs.existsSync(lockPath)) return null;
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const now = contractHashes(project.config, project.personas);
  const changed = ['journey_hash', 'observations_hash', 'personas_hash'].filter((k) => lock[k] && lock[k] !== now[k]).map((k) => k.replace('_hash', ''));
  if (changed.length && !allowChange) {
    throw new StuntmanError(`contract changed since stuntman.lock was written: ${changed.join(', ')}. The locked contract must not be weakened to make an audit pass. If the change is intended, re-run with --allow-contract-change, then run: stuntman lock --force`);
  }
  return { lock, changed };
}

function makeRunner(project, opts) {
  const live = opts.live;
  return live ? makeLiveRunner(project.config) : makeFixtureRunner(project.config, project.cwd, opts.fixtureState || 'broken', { delayMs: opts.delayMs ?? 25 });
}

async function pool(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) { const i = next++; if (i >= items.length) return; results[i] = await fn(items[i], i); }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Run an audit. Returns { report, runs } and writes nothing; report.mjs persists.
 * Pass 1: every selected persona once. Pass 2: only failures once more.
 */
export async function runAudit(project, opts = {}) {
  const { config } = project;
  let personas = project.personas;
  if (opts.persona) {
    personas = personas.filter((p) => p.id === opts.persona);
    if (!personas.length) throw new StuntmanError(`persona '${opts.persona}' is not in the configured cast: ${project.personas.map((p) => p.id).join(', ')}`);
  }
  const runner = makeRunner(project, opts);
  const log = opts.log || (() => {});
  const objectives = new Map(personas.map((p) => [p.id, compileObjective(config, p)]));
  const live = runner.mode === 'live';
  let credits = 0; let ceilingHit = false;
  const record = { runs: [] };

  const execute = async (persona, index) => {
    if (live && credits >= config.budget.max_credits) { ceilingHit = true; return null; }
    log(c.dim(`  ▸ ${persona.id} run ${index}…`));
    const rec = await runner.run({ persona, index, objective: objectives.get(persona.id), headless: opts.headless });
    credits += rec.credits || 0;
    record.runs.push(rec);
    return rec;
  };

  const conc = Math.max(1, Number(opts.concurrency) || (live ? 1 : 5));
  const first = await pool(personas, conc, (p) => execute(p, 1));
  const second = new Map();
  const needRepeat = personas.filter((p, i) => first[i] && classify(p, [first[i]]).verdict === 'suspected');
  await pool(needRepeat, conc, async (p) => { second.set(p.id, await execute(p, 2)); });

  const lanes = personas.map((p, i) => {
    const r1 = first[i];
    if (!r1) return { id: p.id, name: p.name, severity: p.severity, verdict: 'skipped', basis: 'skipped (budget)', invariant: p.invariant, runs: [], observed: null, finding_id: null };
    const r2 = second.get(p.id);
    const runs = r2 ? [r1, r2] : [r1];
    const cls = classify(p, runs);
    return { id: p.id, name: p.name, severity: p.severity, verdict: cls.verdict, basis: cls.basis, observed: cls.observed, invariant: p.invariant, runs, finding_id: null };
  });
  let n = 0;
  for (const l of lanes) if (l.verdict === 'confirmed') l.finding_id = `F-${String(++n).padStart(3, '0')}`;
  return { lanes, mode: runner.mode, fixture_state: runner.state || null, credits, ceilingHit, personas, objectives };
}

export function summarize(lanes, credits) {
  const s = { confirmed: 0, suspected: 0, clean: 0, inconclusive: 0, skipped: 0, credits };
  for (const l of lanes) s[l.verdict]++;
  return s;
}

/** Assemble the report object and write the run directory (raw transcripts included). */
export function buildReport(project, result, { startedAt, finishedAt, runDir }) {
  const { config } = project;
  const hashes = contractHashes(config, project.personas);
  const lanes = result.lanes.map((l) => {
    const runs = l.runs.map((r) => {
      const { raw_text, ...rest } = r;
      return rest;
    });
    return { ...l, runs };
  });
  const finding = lanes.find((l) => l.finding_id);
  let evidence = null;
  if (result.mode === 'live' && finding) evidence = extractEvidence(finding.runs[0].session_dir);
  return {
    schema: 'stuntman.report/1',
    mode: result.mode, fixture_state: result.fixture_state,
    app: config.app, journey: { id: config.journey.id, title: config.journey.title, steps: config.journey.steps },
    commit: gitCommit(project.cwd), started_at: startedAt, finished_at: finishedAt,
    contract_hash: hashes.contract_hash,
    summary: summarize(lanes, result.credits),
    budget_ceiling_hit: result.ceilingHit,
    personas: lanes,
    evidence,
    run_dir: runDir,
  };
}

export function writeRawTranscripts(result, runDir) {
  const rawDir = safeJoin(runDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });
  for (const l of result.lanes) for (const r of l.runs) {
    const rel = `raw/${l.id}.run${r.index}.ndjson`;
    fs.writeFileSync(safeJoin(runDir, rel), r.raw_text || '');
    r.raw_path = rel;
  }
}

export function newRunDir(cwd) {
  let dir = path.join(cwd, 'runs', stamp());
  let i = 1; while (fs.existsSync(dir)) dir = path.join(cwd, 'runs', `${stamp()}-${++i}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export { estimateCredits, hashOf };
