import { spawn } from 'node:child_process';
import { StuntmanError } from '../util.mjs';
import { parseNdjson, buildRecord } from './parse.mjs';
import { probeApp, mergeProbe } from '../probe.mjs';

const RAW_CAP = 5 * 1024 * 1024;

export function kaneBin(config) { return process.env.KANE_BIN || (config.kane && config.kane.bin) || 'kane-cli'; }

export function buildRunArgs(config, objective, { headless = false } = {}) {
  const args = ['run', objective, '--agent', '--url', config.app.base_url, '--max-steps', String(config.budget.max_steps), '--timeout', String(config.budget.timeout_seconds)];
  if (headless || process.env.KANE_HEADLESS === '1' || (config.kane && config.kane.headless)) args.push('--headless');
  return args;
}

/** Spawn a Kane process, stream stdout lines, enforce a Node-side kill timer. Resolves { stdout, stderr, code }. */
export function spawnKane(bin, args, { graceMs, timeoutS }) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false }); }
    catch (e) { return reject(new StuntmanError(setupMessage(bin, e))); }
    let stdout = ''; let stderr = ''; let truncated = false; let killed = false;
    const grace = graceMs ?? Number(process.env.KANE_TIMEOUT_GRACE_MS || 30000);
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, timeoutS * 1000 + grace);
    child.stdout.on('data', (d) => { if (stdout.length < RAW_CAP) stdout += d; else truncated = true; });
    child.stderr.on('data', (d) => { if (stderr.length < 64 * 1024) stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(new StuntmanError(setupMessage(bin, e))); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (truncated) stdout += '\n{"type":"stuntman_note","note":"stdout truncated at 5 MB"}\n';
      resolve({ stdout, stderr, code: killed ? 3 : code });
    });
  });
}

function setupMessage(bin, e) {
  if (e && e.code === 'ENOENT') {
    return `Kane CLI not found ('${bin}'). Install it with: npm install -g @testmuai/kane-cli   then: kane-cli login   (or set KANE_BIN). Use fixture mode (the default) to run without it.`;
  }
  return `could not start '${bin}': ${e && e.message}`;
}

/** Live runner: one kane-cli invocation per persona run. */
export function makeLiveRunner(config) {
  const bin = kaneBin(config);
  return {
    mode: 'live',
    async run({ persona, index, objective, headless }) {
      const args = buildRunArgs(config, objective, { headless });
      const { stdout, stderr, code } = await spawnKane(bin, args, { timeoutS: config.budget.timeout_seconds });
      const events = parseNdjson(stdout);
      const rec = buildRecord({ persona: persona.id, index, events, exitCode: code, stderr, rawText: stdout, mode: 'live' });
      // Server-side observations come from the app's own state, read right after the run (before the next reset).
      return mergeProbe(rec, await probeApp(config));
    },
  };
}
