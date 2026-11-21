import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, gitCommit, writeJson, safeJoin } from './util.mjs';
import { contractHashes } from './config.mjs';
import { LOCK_FILE } from './audit.mjs';
import { reportFromOpt } from './report.mjs';

export function testMarkdown(config, persona) {
  const base = config.app.base_url.replace(/\/$/, '');
  const inv = persona.invariant;
  const obs = config.observations.find((o) => o.name === inv.observation);
  const frontmatter = ['---', 'mode: testing', `url: ${base}${config.journey.entry}`, `tags: [stuntman, ${persona.id}, ${String(persona.severity).toLowerCase()}]`, `max_steps: ${config.budget.max_steps}`, `timeout: ${config.budget.timeout_seconds}`, 'code_export: false', '---'].join('\n');
  const steps = [];
  steps.push(['Open the store', `Open ${base}${config.journey.entry}. If the application has a reset or demo-data control, leave it alone.`]);
  config.journey.steps.forEach((s, i) => steps.push([`Journey step ${i + 1}`, s]));
  steps.push([`Perform the ${persona.name} behaviour`, `${persona.behaviour}${persona.notes ? ' ' + persona.notes : ''}`]);
  steps.push([`Observe and assert ${inv.observation}`, `Open ${base}${obs.url}. ${obs.instruction} Then assert that '${inv.observation}' equals ${inv.equals}. ${inv.reason} Do not retry or fix anything.`]);
  return `${frontmatter}\n\n# Stuntman: ${persona.name} — ${config.journey.title}\n\n${steps.map(([h, b]) => `## ${h}\n\n${b}\n`).join('\n')}`;
}

export function lockContract(project, { run, force = false } = {}) {
  const report = reportFromOpt(project.cwd, run);
  const confirmed = report.personas.filter((l) => l.verdict === 'confirmed');
  if (!confirmed.length) throw new StuntmanError('that report has no confirmed hazard to lock');
  const lockPath = path.join(project.cwd, LOCK_FILE);
  if (fs.existsSync(lockPath) && !force) throw new StuntmanError(`${LOCK_FILE} already exists. Use --force to overwrite (the lock is meant to be written once, before the fix).`);
  const tests = [];
  for (const l of confirmed) {
    const persona = project.personas.find((p) => p.id === l.id);
    if (!persona) throw new StuntmanError(`persona '${l.id}' from the report is not in the current config`);
    const rel = `tests/stuntman-${persona.id}_test.md`;
    const file = safeJoin(project.cwd, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, testMarkdown(project.config, persona));
    tests.push(rel);
  }
  const hashes = contractHashes(project.config, project.personas);
  const lock = {
    schema: 'stuntman.lock/1', ...hashes,
    audited_commit: report.commit || gitCommit(project.cwd), created_at: new Date().toISOString(),
    personas: project.personas.map((p) => ({ id: p.id, version: p.version })),
    tests,
  };
  writeJson(lockPath, lock);
  return { lock, tests, report };
}
