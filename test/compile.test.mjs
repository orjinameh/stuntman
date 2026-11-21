import test from 'node:test';
import assert from 'node:assert/strict';
import { compileObjective } from '../src/compile.mjs';
import { loadProject, contractHashes } from '../src/config.mjs';
import { PACKAGE_ROOT, StuntmanError } from '../src/util.mjs';
import { loadLibrary, resolvePersonas } from '../src/personas.mjs';

const project = loadProject(PACKAGE_ROOT);
const impatient = project.personas.find((p) => p.id === 'impatient');

test('AC-02 objective contains url, steps in order, behaviour, store-as, assertion, stop instruction', () => {
  const o = compileObjective(project.config, impatient);
  assert.match(o, /Start at http:\/\/localhost:3000\//);
  const i1 = o.indexOf('1. Add the'); const i2 = o.indexOf('2. Open the cart'); const i3 = o.indexOf('3. Enter buyer');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2);
  assert.ok(o.includes(impatient.behaviour));
  assert.match(o, /store its text as 'final_heading'/);
  assert.match(o, /store the number as 'order_count'/);
  assert.match(o, /store the total as 'charged_total'/);
  assert.ok(o.indexOf("'final_heading'") < o.indexOf("'order_count'"), 'page-local observation is captured before navigating away');
  assert.match(o, /assert that 'final_heading' equals Order confirmed/i);
  assert.match(o, /Do not retry anything, do not try to fix problems/);
});

test('AC-03 refuses undeclared observation, missing behaviour, missing store-as', () => {
  const cfg = structuredClone(project.config);
  assert.throws(() => compileObjective(cfg, { ...impatient, invariant: { ...impatient.invariant, observation: 'nope' } }), (e) => e instanceof StuntmanError && /nope/.test(e.message) && /order_count/.test(e.message));
  assert.throws(() => compileObjective(cfg, { ...impatient, behaviour: '' }), /no behaviour/);
  cfg.observations[0].instruction = 'Read the heading.';
  assert.throws(() => compileObjective(cfg, impatient), /store/);
});

test('AC-23 persona packs are complete and unknown ids list the available ones', () => {
  const lib = loadLibrary(PACKAGE_ROOT);
  assert.equal(lib.size, 5);
  for (const p of lib.values()) for (const k of ['id', 'version', 'name', 'behaviour', 'severity', 'invariant', 'notes']) assert.ok(p[k], `${p.id}.${k}`);
  assert.throws(() => resolvePersonas(['ghost'], lib), (e) => /ghost/.test(e.message) && /impatient/.test(e.message));
  assert.throws(() => resolvePersonas(['../etc'], lib), /unknown persona/);
});

test('contract hashes are stable and section-sensitive', () => {
  const a = contractHashes(project.config, project.personas);
  const b = contractHashes(structuredClone(project.config), structuredClone(project.personas));
  assert.deepEqual(a, b);
  const cfg = structuredClone(project.config); cfg.journey.steps.push('extra');
  const c = contractHashes(cfg, project.personas);
  assert.notEqual(a.journey_hash, c.journey_hash);
  assert.equal(a.observations_hash, c.observations_hash);
  assert.notEqual(a.contract_hash, c.contract_hash);
});
