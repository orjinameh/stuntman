#!/usr/bin/env node
// Adapter that lets `stuntman heal` use a REAL coding agent.
//   node demo/agent-run.mjs <brief.md>            (agent auto-detected)
//   STUNTMAN_AGENT=claude|opencode|codex|api node demo/agent-run.mjs <brief.md>
// The agent receives the repair brief (what Kane observed) and edits the app. While it runs, the pre-written repair
// (demo/fixed, demo/patches) is moved out of its sight. Afterwards the adapter checks that the target file changed, that the
// locked contract files were NOT touched, and that the result parses.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const briefPath = process.argv[2];
if (!briefPath || !fs.existsSync(briefPath)) { console.error('usage: agent-run.mjs <brief.md>'); process.exit(2); }
const TARGET = process.env.STUNTMAN_TARGET || 'demo/app/server.mjs';
const PROTECTED = ['stuntman.json', 'stuntman.lock', 'personas', 'tests', 'fixtures', 'package.json'];
const HIDDEN = ['demo/fixed', 'demo/patches', 'demo/baseline'];

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function snapshot(paths) {
  const out = {};
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) { for (const n of fs.readdirSync(p)) walk(path.join(p, n)); } else out[p] = sha(p);
  };
  paths.forEach(walk); return out;
}
const onPath = (bin) => spawnSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' }).status === 0;

function buildPrompt(brief) {
  return `You are a coding agent fixing a bug in a small web app (the file ${TARGET}).
An automated audit drove a real browser through the app and reproduced the hazard described below. Fix the APPLICATION so the hazard is handled.

Rules:
- Edit only ${TARGET}. Keep it a single zero-dependency Node file and keep every existing route and behaviour (including /health, /__state and /admin/reset).
- Do not edit stuntman.json, stuntman.lock, anything under personas/, tests/, fixtures/ or demo/. Do not weaken, special-case or detect the audit.
- Do not look for a pre-written solution: do not read demo/fixed, demo/patches or git history. Work from the brief and the code.
- Do not start servers or run the audit. Make the edit, then stop.

--- REPAIR BRIEF ---
${brief}`;
}

async function viaApi(prompt, source) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.STUNTMAN_AGENT_MODEL || 'claude-sonnet-5-5', max_tokens: 16000,
      messages: [{ role: 'user', content: `${prompt}\n\nCurrent contents of ${TARGET}:\n<file>\n${source}\n</file>\n\nReply with the COMPLETE fixed file inside <file> and </file> tags and nothing else.` }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = (await res.json()).content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/<file>\n?([\s\S]*?)\n?<\/file>/);
  if (!m) throw new Error('the model did not return a <file> block');
  fs.writeFileSync(TARGET, m[1].endsWith('\n') ? m[1] : m[1] + '\n');
}

function runCli(agent, prompt) {
  const cmds = {
    claude: ['claude', ['-p', prompt, '--permission-mode', 'acceptEdits']],
    opencode: ['opencode', ['run', ...(process.env.STUNTMAN_AGENT_MODEL ? ['-m', process.env.STUNTMAN_AGENT_MODEL] : []), prompt]],
    codex: ['codex', ['exec', '--full-auto', prompt]],
  };
  const [bin, args] = cmds[agent];
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} exited with status ${r.status}`);
}

const hidden = [];
let stash = null;
function move(from, to) { try { fs.renameSync(from, to); } catch { fs.cpSync(from, to, { recursive: true }); fs.rmSync(from, { recursive: true, force: true }); } }
// The pre-written repair is moved OUT of the repository (a random temp directory), so a directory listing of the repo does not even show its name.
function hide() { stash = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-')); for (const d of HIDDEN) if (fs.existsSync(d)) { const to = path.join(stash, d.replace(/[\\/]/g, '__')); move(d, to); hidden.push([d, to]); } }
function unhide() { while (hidden.length) { const [d, to] = hidden.pop(); try { move(to, d); } catch { /* already restored */ } } if (stash) { try { fs.rmSync(stash, { recursive: true, force: true }); } catch { /* ignore */ } stash = null; } }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { unhide(); process.exit(130); });

const PROMPT_FILE = path.join(os.tmpdir(), 'stuntman-agent-prompt.txt');
function waitForEnter() { return new Promise((resolve) => { process.stdin.resume(); process.stdin.once('data', () => { process.stdin.pause(); resolve(); }); }); }

let agent = process.env.STUNTMAN_AGENT || ['claude', 'opencode', 'codex'].find(onPath) || (process.env.ANTHROPIC_API_KEY ? 'api' : null);
if (!agent) {
  console.error('[agent-run] no coding agent found. Install one (claude / opencode / codex) or set ANTHROPIC_API_KEY to use the API directly.');
  process.exit(5);
}
const beforeProtected = snapshot(PROTECTED);
const beforeTarget = sha(TARGET);
const prompt = buildPrompt(fs.readFileSync(briefPath, 'utf8'));
let failure = null;
console.log(`[agent-run] agent: ${agent}; target: ${TARGET}; the pre-written repair is moved out of the repository while it works`);
hide();
try {
  if (agent === 'api') await viaApi(prompt, fs.readFileSync(TARGET, 'utf8'));
  else if (agent === 'manual') {
    // You drive an interactive agent (for example the OpenCode interface) in another terminal; we wait, then run the same guards.
    fs.writeFileSync(PROMPT_FILE, prompt);
    console.log(`\n[agent-run] MANUAL MODE. Open your agent in ANOTHER terminal tab (for example: opencode) and send it this one message:\n\n    Read ${PROMPT_FILE} and follow it exactly.\n\nWhen the agent has finished editing ${TARGET}, come back to THIS tab and press Enter.`);
    await waitForEnter();
  } else runCli(agent, prompt);
} catch (e) { failure = e.message; } finally { unhide(); }
if (failure) { console.error(`[agent-run] agent failed: ${failure}`); process.exit(6); }

const afterProtected = snapshot(PROTECTED);
const touched = Object.keys({ ...beforeProtected, ...afterProtected }).filter((p) => beforeProtected[p] !== afterProtected[p]);
if (touched.length) { console.error(`[agent-run] REFUSED: the agent changed protected files: ${touched.join(', ')}. Restore them (git checkout) and retry.`); process.exit(3); }
if (sha(TARGET) === beforeTarget) { console.error('[agent-run] the agent made no change to the app'); process.exit(4); }
const syntax = spawnSync('node', ['--check', TARGET], { encoding: 'utf8' });
if (syntax.status !== 0) { console.error(`[agent-run] the edited file does not parse:\n${syntax.stderr}`); process.exit(7); }
console.log(`[agent-run] ${TARGET} changed by ${agent}; protected files untouched; file parses`);
process.exit(0); // do not wait on an open stdin pipe (manual mode)
