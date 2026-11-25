import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { StuntmanError, sleep } from './util.mjs';

/** PIDs that are LISTENing on a TCP port (Linux: /proc). Never matches by command line, so it cannot hit ourselves. */
export function listeningPids(port) {
  const inodes = new Set();
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    let text; try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of text.split('\n').slice(1)) {
      const f = line.trim().split(/\s+/);
      if (f.length < 10 || f[3] !== '0A') continue;           // 0A = LISTEN
      if (parseInt(f[1].split(':')[1], 16) === Number(port)) inodes.add(f[9]);
    }
  }
  if (!inodes.size) return [];
  const pids = [];
  for (const pid of fs.readdirSync('/proc').filter((n) => /^\d+$/.test(n))) {
    if (Number(pid) === process.pid) continue;
    let fds; try { fds = fs.readdirSync(`/proc/${pid}/fd`); } catch { continue; }
    for (const fd of fds) {
      let link; try { link = fs.readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { continue; }
      const m = link.match(/^socket:\[(\d+)\]$/);
      if (m && inodes.has(m[1])) { pids.push(Number(pid)); break; }
    }
  }
  return pids;
}

export async function stopApp(config, { timeoutS = 8 } = {}) {
  const port = new URL(config.app.base_url).port || '80';
  const deadline = Date.now() + timeoutS * 1000;
  let pids = listeningPids(port);
  for (const pid of pids) { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
  while (pids.length && Date.now() < deadline) { await sleep(250); pids = listeningPids(port); }
  for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
  if (pids.length) await sleep(500);
  return listeningPids(port).length === 0;
}

/** Stop whatever listens on the app's port, run app.start_cmd (or legacy app.restart_cmd) detached, wait for health. */
export async function restartApp(config, { timeoutS = 25 } = {}) {
  const startCmd = config.app.start_cmd;
  if (startCmd) {
    if (!(await stopApp(config))) throw new StuntmanError(`could not stop the process listening on ${config.app.base_url}`);
  }
  const cmd = startCmd || config.app.restart_cmd;
  const child = spawn('sh', ['-c', cmd], { detached: true, stdio: 'ignore' });
  child.unref();
  const url = config.app.base_url.replace(/\/$/, '') + (config.app.health || '/health');
  const deadline = Date.now() + timeoutS * 1000;
  await sleep(800);
  while (Date.now() < deadline) {
    try { const res = await fetch(url, { signal: AbortSignal.timeout(2000) }); if (res.ok) return true; } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new StuntmanError(`the app did not answer at ${url} within ${timeoutS}s after the restart. Command: ${cmd}`);
}
