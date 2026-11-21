// Shared helpers. Zero dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Error that maps to a CLI exit code (default 2: configuration/setup/contract error). */
export class StuntmanError extends Error {
  constructor(message, code = 2) { super(message); this.name = 'StuntmanError'; this.code = code; }
}

export function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

/** Stable JSON: object keys sorted recursively. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export function hashOf(value) { return sha256(canonical(value)); }

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Minimal flag parser: --key value, --flag, --key=value. Positionals collected in _. */
export function parseArgs(argv, booleans = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const key = a.slice(2);
      if (booleans.includes(key) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) out[key] = true;
      else out[key] = argv[++i];
    } else out._.push(a);
  }
  return out;
}

const useColor = () => !process.env.NO_COLOR && process.stdout.isTTY;
const wrap = (n) => (s) => (useColor() ? `\x1b[${n}m${s}\x1b[0m` : String(s));
export const c = { red: wrap(31), green: wrap(32), yellow: wrap(33), dim: wrap(2), bold: wrap(1), cyan: wrap(36) };

export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}

export function gitCommit(cwd) {
  try {
    const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim() : 'no-git';
  } catch { return 'no-git'; }
}

/** Resolve child under root and reject escapes. */
export function safeJoin(root, ...parts) {
  const full = path.resolve(root, ...parts);
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new StuntmanError(`path escapes ${root}: ${parts.join('/')}`);
  return full;
}

export function readJson(file, what = file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { throw new StuntmanError(`cannot read ${what}: ${file}`); }
  try { return JSON.parse(text); } catch (e) { throw new StuntmanError(`${what} is not valid JSON: ${e.message}`); }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export const PERSONA_ID = /^[a-z0-9-]+$/;

/** "$98.00" -> 98 ; "2" -> 2 ; null if unparsable. */
export function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const m = v.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
