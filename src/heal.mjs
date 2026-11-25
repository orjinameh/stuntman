import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, c, sleep } from './util.mjs';
import { reportFromOpt } from './report.mjs';
import { findFinding, writeBrief } from './brief.mjs';
import { runAudit, checkLock } from './audit.mjs';
import { classifyHeal, judgeRun } from './classify.mjs';
import { makeFixtureRunner } from './kane/fixture.mjs';
import { makeLiveRunner } from './kane/runner.mjs';
import { compileObjective } from './compile.mjs';
import { resetApp } from './reset.mjs';
import { restartApp } from './restart.mjs';

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

export async function heal(project, id, { agentCmd, run, live = false, fixtureState = 'broken', log = console.log, headless = false, settle, attempts } = {}) {
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
  // A file watcher (node --watch) needs a moment to restart the app before the first reset/run.
  if (live && (project.config.app.start_cmd || project.config.app.restart_cmd)) {
    // Deterministic: do not rely on a file watcher. Restart the app ourselves and wait until it answers.
    log(c.dim('  restarting the app so the repaired code is the code under test…'));
    await restartApp(project.config);
  } else {
    const settleS = settle === undefined || settle === true ? (live ? 4 : 0) : Number(settle);
    if (settleS > 0) { log(c.dim(`  waiting ${settleS}s for the app to restart (no app.start_cmd configured)…`)); await sleep(settleS * 1000); }
  }
  const persona = project.personas.find((p) => p.id === lane.id);
  const runner = live ? makeLiveRunner(project.config) : makeFixtureRunner(project.config, project.cwd, fixtureState);
  const objective = compileObjective(project.config, persona);
  // Kane's agent can fail to execute a persona for reasons unrelated to the repair (skipped step, overshot Back, empty page).
  // Such attempts are reported but do not count: the verdict needs two USABLE runs (a value was captured and judged).
  const maxAttempts = Math.max(2, Number(attempts === undefined || attempts === true ? (live ? 4 : 2) : attempts));
  const runs = []; const usable = [];
  for (let index = 1; index <= maxAttempts && usable.length < 2; index++) {
    if (live) await resetApp(project.config);
    log(c.dim(`  ▸ re-audit ${persona.id} attempt ${index}/${maxAttempts}…`));
    const rec = await runner.run({ persona, index, objective, headless });
    runs.push(rec);
    const j = judgeRun(rec, persona.invariant);
    const counts = j.kind === 'ok' || j.kind === 'violation';
    if (counts) usable.push(rec);
    log(c.dim(`    attempt ${index}: ${counts ? j.kind : 'not usable'}${j.note ? ' — ' + String(j.note).slice(0, 140) : ''}`));
  }
  // Keep the raw transcripts of the re-audit as evidence next to the report.
  const healDir = path.join(report.run_dir_abs, 'heal');
  fs.mkdirSync(healDir, { recursive: true });
  for (const r of runs) fs.writeFileSync(path.join(healDir, `${id}.${persona.id}.run${r.index}.ndjson`), r.raw_text || '');
  fs.writeFileSync(path.join(healDir, `${id}.summary.json`), JSON.stringify(runs.map(({ raw_text, ...rest }) => rest), null, 2));
  log(c.dim(`  re-audit transcripts: ${path.relative(project.cwd, healDir)}/`));
  let res;
  if (usable.length >= 2) { res = classifyHeal(persona, usable); res.basis += ` (${usable.length} usable of ${runs.length} attempts)`; }
  else if (usable.some((r) => judgeRun(r, persona.invariant).kind === 'violation')) res = { verdict: 'suspected', basis: `1 usable run, and it still fails (${runs.length} attempts)` };
  else res = { verdict: 'inconclusive', basis: `only ${usable.length} of ${runs.length} attempts were usable; ${runs.length ? judgeRun(runs[runs.length - 1], persona.invariant).note || '' : ''}`.trim() };
  if (res.verdict === 'clean') { log(c.green(c.bold('CLEAN — the hazard is no longer reproducible')) + c.dim(` (${res.basis})`)); return { exit: 0, ...res }; }
  if (res.verdict === 'confirmed') { log(c.red(c.bold('STILL REPRODUCIBLE')) + ` — ${res.basis}`); return { exit: 1, ...res }; }
  if (res.verdict === 'suspected') { log(c.yellow(c.bold('NOT CLEAN')) + ` — ${res.basis}`); return { exit: 1, ...res }; }
  log(c.yellow('INCONCLUSIVE') + ` — ${res.basis}`);
  return { exit: 2, ...res };
}
