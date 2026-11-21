import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT, StuntmanError, sleep } from '../util.mjs';
import { parseNdjson, buildRecord } from './parse.mjs';

export function fixtureDir(cwd, journeyId, state) {
  for (const root of [path.join(cwd, 'fixtures'), path.join(PACKAGE_ROOT, 'fixtures')]) {
    const d = path.join(root, journeyId, state);
    if (fs.existsSync(d)) return d;
  }
  throw new StuntmanError(`no fixtures for journey '${journeyId}' state '${state}' (looked in ./fixtures and the package)`);
}

/** Fixture runner (the default). Replays recorded NDJSON; synthesises the same record as the live runner. */
export function makeFixtureRunner(config, cwd, state = 'broken', { delayMs = 25 } = {}) {
  const dir = fixtureDir(cwd, config.journey.id, state);
  return {
    mode: 'fixture', state,
    async run({ persona, index }) {
      const file = path.join(dir, `${persona.id}.run${index}.ndjson`);
      if (!fs.existsSync(file)) throw new StuntmanError(`missing fixture ${path.relative(cwd, file) || file}`);
      const text = fs.readFileSync(file, 'utf8');
      if (delayMs) await sleep(delayMs);
      const events = parseNdjson(text);
      const meta = events.find((e) => e.type === 'fixture_meta');
      const rec = buildRecord({ persona: persona.id, index, events, exitCode: meta && meta.exit_code !== undefined ? meta.exit_code : null, rawText: text, mode: 'fixture', sessionDir: `fixtures://${config.journey.id}/${state}/${persona.id}.run${index}` });
      return rec;
    },
  };
}

export function readFixtureRun(cwd, config, state, personaId, index = 1) {
  const dir = fixtureDir(cwd, config.journey.id, state);
  const file = path.join(dir, `${personaId}.run${index}.ndjson`);
  if (!fs.existsSync(file)) throw new StuntmanError(`missing fixture ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  const events = parseNdjson(text);
  return buildRecord({ persona: personaId, index, events, exitCode: null, rawText: text, mode: 'fixture', sessionDir: `fixtures://${config.journey.id}/${state}/${personaId}.run${index}` });
}
