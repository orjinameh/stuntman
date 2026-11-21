import { spawn } from 'node:child_process';
import path from 'node:path';
import { StuntmanError, c } from './util.mjs';
import { reportFromOpt } from './report.mjs';
import { findFinding, writeBrief } from './brief.mjs';
import { runAudit, checkLock } from './audit.mjs';
import { classifyHeal } from './classify.mjs';
import { makeFixtureRunner } from './kane/fixture.mjs';
import { makeLiveRunner } from './kane/runner.mjs';
import { compileObjective } from './compile.mjs';
import { resetApp } from './reset.mjs';

function shQuote(p) {
  return process.platform === 'win32' ? `"${p}"` : `'${p.replace(/'/g, `'\\''`)}'`;
}

/** Substitute only the three documented tokens, each with a quoted absolute path or a validated id. */
export function substitute(cmd, { brief, briefJson, findingId }) {
  if (!/^F-\d{3,}$/.test(findingId)) throw new StuntmanError(`bad finding id '${findingId}'`);
  return cmd.split('{brief_json}').join(shQuote(briefJson)).split('{brief}').join(shQuote(brief)).split('{finding_id}').join(findingId);
}

export function runCommand(cmd, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, cwd, stdio: 'inherit', env: process.env });
    child.on('error', () => resolve(127));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export async function heal(project, id, { agentCmd, run, live = false, fixtureState = 'broken', log = console.log, headless = false } = {}) {
  if (!agentCmd || agentCmd === true) throw new StuntmanError("heal needs --agent-cmd '<command containing {brief}>'");
  const report = reportFromOpt(project.cwd, run, (r) => r.personas.some((l) => l.finding_id === id));
  const lane = findFinding(report, id);
  const lockState = checkLock(project);
  if (!lockState) log(c.yellow('warning: no stuntman.lock. Run `stuntman lock` BEFORE the fix so the agent cannot weaken the test it must satisfy.'));
  const { md, json } = writeBrief(report, id, project);
  log(`brief written: ${path.relative(project.cwd, md)}`);
  const cmd = substitute(agentCmd, { brief: md, briefJson: json, findingId: id });
  log(c.dim(`running agent command in ${project.cwd}:\n  ${cmd}`));
  const code = await runCommand(cmd, project.cwd);
  if (code !== 0) { log(c.red(`agent command failed (exit ${code}); not re-auditing`)); return { exit: 2, verdict: 'agent_failed' }; }
  // The agent changed the code; the contract must be untouched.
  checkLock(project);
  const persona = project.personas.find((p) => p.id === lane.id);
  const runner = live ? makeLiveRunner(project.config) : makeFixtureRunner(project.config, project.cwd, fixtureState);
  const objective = compileObjective(project.config, persona);
  const runs = [];
  for (const index of [1, 2]) {
    if (live) await resetApp(project.config);
    log(c.dim(`  ▸ re-audit ${persona.id} run ${index}…`));
    runs.push(await runner.run({ persona, index, objective, headless }));
  }
  const res = classifyHeal(persona, runs);
  if (res.verdict === 'clean') { log(c.green(c.bold('CLEAN — the hazard is no longer reproducible')) + c.dim(` (${res.basis})`)); return { exit: 0, ...res }; }
  if (res.verdict === 'confirmed') { log(c.red(c.bold('STILL REPRODUCIBLE')) + ` — ${res.basis}`); return { exit: 1, ...res }; }
  if (res.verdict === 'suspected') { log(c.yellow(c.bold('NOT CLEAN')) + ` — ${res.basis}`); return { exit: 1, ...res }; }
  log(c.yellow('INCONCLUSIVE') + ` — ${res.basis}`);
  return { exit: 2, ...res };
}
