import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT, StuntmanError, PERSONA_ID, readJson } from './util.mjs';

const REQUIRED = ['id', 'version', 'name', 'behaviour', 'severity', 'invariant', 'notes'];

export function personaDirs(cwd) {
  const dirs = [];
  const local = path.join(cwd, 'personas');
  if (fs.existsSync(local)) dirs.push(local);
  const pkg = path.join(PACKAGE_ROOT, 'personas');
  if (!dirs.includes(pkg)) dirs.push(pkg);
  return dirs;
}

/** Load every persona pack. Project-local packs win over packaged ones. Rejects duplicates inside one directory. */
export function loadLibrary(cwd) {
  const lib = new Map();
  for (const dir of personaDirs(cwd)) {
    const seen = new Set();
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const p = readJson(path.join(dir, f), `persona pack ${f}`);
      validatePersona(p, f);
      if (seen.has(p.id)) throw new StuntmanError(`duplicate persona id '${p.id}' in ${dir}`);
      seen.add(p.id);
      if (!lib.has(p.id)) lib.set(p.id, p);
    }
  }
  return lib;
}

export function validatePersona(p, where = 'persona') {
  for (const k of REQUIRED) if (p[k] === undefined || p[k] === null || p[k] === '') {
    if (k === 'behaviour') throw new StuntmanError(`persona '${p.id ?? where}' has no behaviour`);
    throw new StuntmanError(`${where}: missing required key '${k}'`);
  }
  if (!PERSONA_ID.test(p.id)) throw new StuntmanError(`${where}: persona id must match ^[a-z0-9-]+$ (got '${p.id}')`);
  const inv = p.invariant;
  if (!inv || !inv.observation || inv.equals === undefined || !inv.reason) {
    throw new StuntmanError(`${where}: invariant needs observation, equals and reason`);
  }
}

export function resolvePersonas(ids, library) {
  return ids.map((id) => {
    if (!PERSONA_ID.test(String(id)) || !library.has(id)) {
      throw new StuntmanError(`unknown persona id '${id}'. Available: ${[...library.keys()].join(', ')}`);
    }
    return library.get(id);
  });
}
