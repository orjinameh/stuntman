import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { StuntmanError, parseArgs, c, writeJson } from './util.mjs';
import { CONFIG_FILE, loadProject, defaultConfigText } from './config.mjs';
import { runAudit, buildReport, writeRawTranscripts, newRunDir, checkLock } from './audit.mjs';
import { estimateCredits } from './budget.mjs';
import { terminalSummary, writeReportFiles, reportFromOpt, findReportDirs, loadReport } from './report.mjs';
import { writeBrief } from './brief.mjs';
import { lockContract } from './lock.mjs';
import { heal } from './heal.mjs';
import { verify } from './verify.mjs';
import { loadLibrary } from './personas.mjs';

const USAGE = `stuntman — your agent tested the happy path. Stuntman plays everyone else.

Usage:
  stuntman init [--force]
  stuntman audit [--live|--fixture] [--fixture-state broken|fixed] [--persona id]
                 [--concurrency N] [--allow-contract-change] [--force] [--json] [--headless]
  stuntman brief F-001 [--run <dir>] [--json]
  stuntman lock [--run <dir>] [--force]
  stuntman heal F-001 --agent-cmd "<cmd with {brief}>" [--run <dir>] [--live] [--fixture-state fixed]
  stuntman verify [--live|--fixture] [--json]
  stuntman personas [--json]
  stuntman report [--run <dir>] [--open]

Exit codes: 0 clean/success · 1 confirmed hazard or failed verify/heal · 2 config/setup/contract error · 3 inconclusive
Mode: fixture (default, offline) or live (--live or STUNTMAN_MODE=live; needs kane-cli).`;

const BOOL = ['live', 'fixture', 'force', 'json', 'open', 'headless', 'allow-contract-change'];

export async function main(argv, { cwd = process.cwd(), out = (s) => process.stdout.write(s + '\n'), err = (s) => process.stderr.write(s + '\n') } = {}) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { out(USAGE); return cmd ? 0 : 2; }
  const args = parseArgs(rest, BOOL);
  try {
    switch (cmd) {
      case 'init': return cmdInit(cwd, args, out);
      case 'audit': return await cmdAudit(cwd, args, out, err);
      case 'brief': return cmdBrief(cwd, args, out);
      case 'lock': return cmdLock(cwd, args, out);
      case 'heal': return await cmdHeal(cwd, args, out);
      case 'verify': return await cmdVerify(cwd, args, out);
      case 'personas': return cmdPersonas(cwd, args, out);
      case 'report': return cmdReport(cwd, args, out);
      default: err(`unknown command '${cmd}'\n`); err(USAGE); return 2;
    }
  } catch (e) {
    if (e instanceof StuntmanError) { err(c.red(`stuntman: ${e.message}`)); return e.code; }
    throw e;
  }
}

const isLive = (args) => !args.fixture && (args.live === true || process.env.STUNTMAN_MODE === 'live');

function cmdInit(cwd, args, out) {
  const file = path.join(cwd, CONFIG_FILE);
  if (fs.existsSync(file) && !args.force) throw new StuntmanError(`${CONFIG_FILE} already exists. Use --force to overwrite.`);
  fs.writeFileSync(file, defaultConfigText());
  loadProject(cwd);
  out(`wrote ${CONFIG_FILE} with the demo defaults. Edit app.base_url, journey and observations for your app.`);
  return 0;
}

async function cmdAudit(cwd, args, out, err) {
  const project = loadProject(cwd);
  checkLock(project, { allowChange: args['allow-contract-change'] === true });
  const live = isLive(args);
  const json = args.json === true;
  const say = json ? err : out;
  const count = args.persona ? 1 : project.personas.length;
  if (live) {
    const est = estimateCredits(project.config, count);
    say(`credit estimate: ${est} (ceiling ${project.config.budget.max_credits})`);
    if (est > project.config.budget.max_credits && args.force !== true) {
      throw new StuntmanError(`estimated ${est} credits exceeds budget.max_credits (${project.config.budget.max_credits}). Lower the cast, raise the budget, or pass --force.`);
    }
  }
  const startedAt = new Date().toISOString();
  const result = await runAudit(project, { live, fixtureState: args['fixture-state'] || 'broken', persona: typeof args.persona === 'string' ? args.persona : undefined, concurrency: args.concurrency, headless: args.headless === true, log: json ? () => {} : say });
  const runDir = newRunDir(cwd);
  writeRawTranscripts(result, runDir);
  const report = buildReport(project, result, { startedAt, finishedAt: new Date().toISOString(), runDir: path.relative(cwd, runDir) });
  writeReportFiles(report, runDir);
  if (json) out(JSON.stringify({ ...report, run_dir: path.relative(cwd, runDir) }, null, 2));
  else {
    out(terminalSummary(report));
    out(c.dim(`report: ${path.relative(cwd, path.join(runDir, 'report.html'))}`));
  }
  const s = report.summary;
  if (s.confirmed) return 1;
  if (s.inconclusive) return 3;
  return 0;
}

function cmdBrief(cwd, args, out) {
  const id = args._[0];
  if (!id) throw new StuntmanError('usage: stuntman brief F-001');
  const project = loadProject(cwd);
  const report = reportFromOpt(cwd, args.run, (r) => r.personas.some((l) => l.finding_id === id));
  const { md, json, brief } = writeBrief(report, id, project);
  if (args.json === true) out(JSON.stringify(brief, null, 2));
  else { out(`wrote ${path.relative(cwd, md)}`); out(`wrote ${path.relative(cwd, json)}`); out(c.dim(`observed: ${brief.observed.text}`)); }
  return 0;
}

function cmdLock(cwd, args, out) {
  const project = loadProject(cwd);
  const { lock, tests } = lockContract(project, { run: args.run, force: args.force === true });
  for (const t of tests) out(`wrote ${t}`);
  out(`wrote stuntman.lock (contract ${lock.contract_hash.slice(0, 12)})`);
  out(c.dim('Locked BEFORE the fix. This is a tripwire, not a security boundary: git diff shows exactly what was locked.'));
  return 0;
}

async function cmdHeal(cwd, args, out) {
  const id = args._[0];
  if (!id) throw new StuntmanError("usage: stuntman heal F-001 --agent-cmd '<cmd {brief}>'");
  const project = loadProject(cwd);
  const r = await heal(project, id, { agentCmd: args['agent-cmd'], run: args.run, live: isLive(args), fixtureState: args['fixture-state'] || 'broken', log: out, headless: args.headless === true });
  return r.exit;
}

async function cmdVerify(cwd, args, out) {
  const project = loadProject(cwd);
  const r = await verify(project, { live: isLive(args), log: args.json === true ? () => {} : out, headless: args.headless === true });
  if (args.json === true) out(JSON.stringify(r.results, null, 2));
  return r.exit;
}

function cmdPersonas(cwd, args, out) {
  const lib = [...loadLibrary(cwd).values()];
  if (args.json === true) { out(JSON.stringify(lib.map((p) => ({ id: p.id, name: p.name, severity: p.severity, invariant: p.invariant, version: p.version })), null, 2)); return 0; }
  const rows = lib.map((p) => [p.id, p.name, p.severity, `${p.invariant.observation} = ${p.invariant.equals}`, p.version]);
  const head = ['id', 'name', 'sev', 'invariant', 'version'];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  out(head.map((h, i) => h.padEnd(w[i])).join('  '));
  for (const r of rows) out(r.map((x, i) => x.padEnd(w[i])).join('  '));
  return 0;
}

function cmdReport(cwd, args, out) {
  let report;
  if (args.run && args.run !== true) report = loadReport(path.resolve(cwd, args.run));
  else { const d = findReportDirs(cwd)[0]; if (!d) throw new StuntmanError('no reports under runs/. Run: stuntman audit'); report = loadReport(d); }
  const html = path.join(report.run_dir_abs, 'report.html');
  out(terminalSummary(report));
  out(c.dim(`report: ${path.relative(cwd, html)}`));
  if (args.open === true) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawnSync(opener, [html], { stdio: 'ignore', shell: process.platform === 'win32' });
  }
  return 0;
}
