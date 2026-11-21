import { parseNumber } from '../util.mjs';

/** Parse NDJSON text. Tolerates malformed lines and untyped progress events. */
export function parseNdjson(text) {
  const events = [];
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try { const o = JSON.parse(t); if (o && typeof o === 'object') events.push(o); } catch { /* ignore malformed line */ }
  }
  return events;
}

export const EXIT_STATUS = { 0: 'passed', 1: 'failed', 2: 'error', 3: 'timeout' };

/**
 * Build the internal run record from events + exit code.
 * Values come from run_end.final_state (Kane keeps only 'store ... as' values there).
 */
export function buildRecord({ persona, index, events, exitCode, stderr = '', rawText = '', rawPath = null, mode, sessionDir = null }) {
  const runEnd = [...events].reverse().find((e) => e.type === 'run_end') || null;
  let code = exitCode;
  if (code === null || code === undefined) code = runEnd ? (runEnd.status === 'passed' ? 0 : 1) : 2;
  const status = EXIT_STATUS[code] || 'error';
  const values = {};
  const fs = runEnd && runEnd.final_state && typeof runEnd.final_state === 'object' ? runEnd.final_state : {};
  for (const [k, v] of Object.entries(fs)) values[k] = v === null || v === undefined ? null : String(v);
  return {
    persona, index, exit_code: code, status,
    reason: runEnd ? (runEnd.reason || runEnd.one_liner || runEnd.summary || '') : (stderr.trim().split('\n').pop() || 'no run_end event received'),
    values,
    duration: runEnd && typeof runEnd.duration === 'number' ? runEnd.duration : null,
    credits: runEnd && typeof runEnd.credits === 'number' ? runEnd.credits : 0,
    session_dir: runEnd && runEnd.session_dir ? runEnd.session_dir : sessionDir,
    test_url: runEnd && runEnd.test_url ? runEnd.test_url : null,
    has_run_end: Boolean(runEnd),
    mode, raw_path: rawPath, raw_text: rawText,
  };
}

export { parseNumber };
