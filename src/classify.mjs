import { parseNumber } from './util.mjs';

/** A run's relationship to the persona invariant. */
export function judgeRun(run, invariant) {
  if (run.status === 'error') return { kind: 'error', note: run.reason || 'setup error' };
  if (run.status === 'timeout') return { kind: 'timeout', note: run.reason || 'timed out' };
  const raw = run.values ? run.values[invariant.observation] : undefined;
  const have = raw !== undefined && raw !== null && String(raw).trim() !== '';
  if (!have) {
    // A missing observation never confirms anything, and a pass without the value proves nothing.
    return { kind: 'missing', note: `observation '${invariant.observation}' was not captured` };
  }
  const expected = parseNumber(invariant.equals);
  if (expected === null) {
    // Text invariant (e.g. the heading of the page the customer ended on): compare normalised text.
    const norm = (v) => String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    if (norm(raw) !== norm(invariant.equals)) return { kind: 'violation', observed: String(raw), key: `typed:${invariant.observation}=${norm(raw)}`, note: `${invariant.observation} was "${raw}", expected "${invariant.equals}"` };
    return { kind: 'ok', observed: String(raw) };
  }
  const observed = parseNumber(raw);
  if (observed === null) return { kind: 'missing', note: `observation '${invariant.observation}' is not numeric: ${raw}` };
  if (observed !== expected) return { kind: 'violation', observed: String(raw), key: `typed:${invariant.observation}=${observed}`, note: `${invariant.observation} was ${raw}, expected ${invariant.equals}` };
  return { kind: 'ok', observed: String(raw) };
}

export function normalizeReason(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}\S*/g, '').trim();
}

/**
 * Two-pass confidence rule.
 * runs = [run1] or [run1, run2]. Only a failure is repeated (the caller decides; we classify what we are given).
 * CONFIRMED  : both runs violate the invariant with the same typed value.
 * SUSPECTED  : exactly one failure, or two failures that disagree (inconsistent), or an untyped repeat.
 * INCONCLUSIVE: setup error, timeout or missing observation (never confirms).
 * CLEAN      : the first run honoured the invariant.
 */
export function classify(persona, runs) {
  const inv = persona.invariant;
  const j = runs.map((r) => judgeRun(r, inv));
  const first = j[0];
  const base = (verdict, basis, observed = null) => ({ verdict, basis, observed });
  if (first.kind === 'ok') return base('clean', 'invariant held on the first run', first.observed);
  if (first.kind === 'error') return base('inconclusive', `setup error: ${first.note}`);
  if (first.kind === 'timeout') return base('inconclusive', `timeout: ${first.note}`);
  if (first.kind === 'missing') return base('inconclusive', first.note);
  // first is a violation
  if (j.length < 2) return base('suspected', '1 of 1 runs failed; not yet repeated', first.observed);
  const second = j[1];
  if (second.kind === 'violation') {
    if (second.key === first.key) return base('confirmed', `2 of 2 runs failed with the same typed violation (${first.note})`, first.observed);
    return base('suspected', `inconsistent: run 1 ${first.note}; run 2 ${second.note}`, first.observed);
  }
  if (second.kind === 'ok') return base('suspected', '1 of 2 runs failed', first.observed);
  return base('suspected', `1 failure; the confirming run was inconclusive (${second.note})`, first.observed);
}

/** Heal re-audit: both runs are always executed against the locked contract. */
export function classifyHeal(persona, runs) {
  const j = runs.map((r) => judgeRun(r, persona.invariant));
  if (j.some((x) => ['error', 'timeout', 'missing'].includes(x.kind))) return { verdict: 'inconclusive', basis: j.find((x) => x.kind !== 'ok' && x.kind !== 'violation').note };
  const bad = j.filter((x) => x.kind === 'violation');
  if (bad.length === 0) return { verdict: 'clean', basis: `${j.length} of ${j.length} re-audit runs honoured the invariant` };
  if (bad.length === j.length && new Set(bad.map((b) => b.key)).size === 1) return { verdict: 'confirmed', basis: `${bad.length} of ${j.length} re-audit runs still fail (${bad[0].note})` };
  return { verdict: 'suspected', basis: `${bad.length} of ${j.length} re-audit runs failed` };
}
