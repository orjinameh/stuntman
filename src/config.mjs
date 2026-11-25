import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, PACKAGE_ROOT, readJson, hashOf, canonical, sha256 } from './util.mjs';
import { loadLibrary, resolvePersonas } from './personas.mjs';

/** 'auto' picks every library persona whose required capabilities the app declares; the rest are reported as not applicable. */
export function selectPersonas(config, library) {
  const caps = new Set(config.capabilities || []);
  const missing = (p) => (p.requires || []).filter((r) => !caps.has(r));
  const selected = []; const skipped = [];
  if (config.personas.includes('auto')) {
    for (const p of library.values()) { const m = missing(p); if (m.length) skipped.push({ id: p.id, name: p.name, missing: m }); else selected.push(p); }
  }
  for (const p of resolvePersonas(config.personas.filter((i) => i !== 'auto'), library)) {
    const m = missing(p);
    if (m.length) throw new StuntmanError(`persona '${p.id}' needs capability ${m.join(', ')}, which stuntman.json does not declare under 'capabilities'`);
    if (!selected.includes(p)) selected.push(p);
  }
  selected.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
  return { selected, skipped };
}

export const CONFIG_FILE = 'stuntman.json';

export function loadConfig(cwd, file = CONFIG_FILE) {
  const p = path.join(cwd, file);
  if (!fs.existsSync(p)) throw new StuntmanError(`no ${file} in ${cwd}. Run: stuntman init`);
  const config = readJson(p, file);
  validateConfig(config);
  return config;
}

export function validateConfig(cfg) {
  const need = (cond, msg) => { if (!cond) throw new StuntmanError(`config: ${msg}`); };
  need(cfg && typeof cfg === 'object', 'must be an object');
  need(cfg.app && cfg.app.name, "missing 'app.name'");
  need(cfg.app && typeof cfg.app.base_url === 'string' && /^https?:\/\//.test(cfg.app.base_url), "'app.base_url' must be an http(s) URL");
  const j = cfg.journey;
  need(j && j.id && j.title && j.entry, "journey needs 'id', 'title' and 'entry'");
  need(/^[a-z0-9-]+$/.test(j.id), "journey.id must match ^[a-z0-9-]+$");
  need(Array.isArray(j.steps) && j.steps.length > 0, "journey.steps must be a non-empty array");
  need(Array.isArray(cfg.observations) && cfg.observations.length > 0, "'observations' must be a non-empty array");
  for (const o of cfg.observations) need(o.name && o.instruction, "every observation needs 'name' and 'instruction' ('url' is optional: without it the value is read from the page the persona ended on)");
  need(Array.isArray(cfg.personas) && cfg.personas.length > 0, "'personas' must be a non-empty array of ids (or [\"auto\"])");
  need(cfg.capabilities === undefined || Array.isArray(cfg.capabilities), "'capabilities' must be an array of names");
  need(cfg.app.restart_cmd === undefined || typeof cfg.app.restart_cmd === 'string', 'app.restart_cmd must be a string');
  need(cfg.app.start_cmd === undefined || typeof cfg.app.start_cmd === 'string', 'app.start_cmd must be a string');
  if (cfg.app.probe !== undefined) need(cfg.app.probe && typeof cfg.app.probe.path === 'string' && cfg.app.probe.values && typeof cfg.app.probe.values === 'object', "app.probe needs 'path' and 'values'");
  const b = cfg.budget || {};
  for (const k of ['max_credits', 'estimated_credits_per_run', 'max_steps', 'timeout_seconds']) {
    need(typeof b[k] === 'number' && b[k] > 0, `budget.${k} must be a positive number`);
  }
}

/** Load config plus resolved personas and validate every invariant against declared observations. */
export function loadProject(cwd, file = CONFIG_FILE) {
  const config = loadConfig(cwd, file);
  const library = loadLibrary(cwd);
  const { selected, skipped } = selectPersonas(config, library);
  const declared = new Set(config.observations.map((o) => o.name));
  const notApplicable = skipped.map((k) => ({ id: k.id, reason: `needs capability: ${k.missing.join(', ')}` }));
  const explicit = new Set(config.personas.filter((i) => i !== 'auto'));
  // Auto-selected personas whose invariant observation this journey does not declare are not applicable (explicit ones still error).
  const personas = selected.filter((p) => {
    if (explicit.has(p.id) || declared.has(p.invariant.observation)) return true;
    notApplicable.push({ id: p.id, reason: `needs observation '${p.invariant.observation}', which this journey does not declare` });
    return false;
  });
  if (!personas.length) throw new StuntmanError('no persona applies to this journey. Declare capabilities/observations or list personas explicitly.');
  for (const p of personas) {
    if (!declared.has(p.invariant.observation)) {
      throw new StuntmanError(`persona '${p.id}' invariant references observation '${p.invariant.observation}', but the config declares only: ${[...declared].join(', ')}`);
    }
  }
  return { cwd, config, personas, skipped, notApplicable, library };
}

/** Contract = what the audit promises to check: the journey, the observations and the persona packs. */
export function contractHashes(config, personas) {
  const journey_hash = hashOf(config.journey);
  const observations_hash = hashOf(config.observations);
  const personas_hash = hashOf(personas.map((p) => ({ id: p.id, version: p.version, behaviour: p.behaviour, invariant: p.invariant, notes: p.notes, severity: p.severity })));
  const contract_hash = sha256(canonical({ journey_hash, observations_hash, personas_hash }));
  return { journey_hash, observations_hash, personas_hash, contract_hash };
}

export function defaultConfigText() {
  return fs.readFileSync(path.join(PACKAGE_ROOT, 'stuntman.json'), 'utf8');
}
