import { StuntmanError } from './util.mjs';

/** Reset the app under test before a live run, so earlier runs cannot pollute observations (orders, counts). */
export async function resetApp(config) {
  const r = config.app && config.app.reset;
  if (!r || !r.path) return false;
  const url = config.app.base_url.replace(/\/$/, '') + r.path;
  try {
    const res = await fetch(url, { method: r.method || 'POST', signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (e) {
    throw new StuntmanError(`could not reset the app before the run (${r.method || 'POST'} ${url}: ${e.message}). Is the app running? Observations would be polluted by earlier runs, so the audit stops here.`);
  }
}
