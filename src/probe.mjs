// Ground-truth probe: after a live Kane run, read the app's own state endpoint and derive server-side observations
// (order count, total charged) directly, instead of asking Kane to read them off a page (it fails on empty pages).
// The spec is data, never code: { path, values: { name: { count: "orders" } | { sum: "charges", field: "cents", divide: 100 } } }.

function at(obj, dotted) {
  let cur = obj;
  for (const part of String(dotted).split('.')) { if (cur === null || cur === undefined) return undefined; cur = cur[part]; }
  return cur;
}

export function evaluateProbe(spec, json) {
  const out = {};
  for (const [name, rule] of Object.entries((spec && spec.values) || {})) {
    if (rule.count) {
      const list = at(json, rule.count);
      if (Array.isArray(list)) out[name] = String(list.length);
    } else if (rule.sum) {
      const list = at(json, rule.sum);
      if (Array.isArray(list)) {
        const total = list.reduce((a, x) => a + Number(x && x[rule.field] || 0), 0) / (Number(rule.divide) || 1);
        out[name] = total.toFixed(2);
      }
    }
  }
  return out;
}

/** Fetch the probe endpoint. Never throws: a failed probe just means Kane's own values are used. */
export async function probeApp(config) {
  const spec = config.app && config.app.probe;
  if (!spec || !spec.path) return { values: {}, error: null };
  const url = config.app.base_url.replace(/\/$/, '') + spec.path;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { values: evaluateProbe(spec, await res.json()), error: null };
  } catch (e) { return { values: {}, error: `${url}: ${e.message}` }; }
}

/** The probe is authoritative for what it measures; Kane's own reading is kept for the record. */
export function mergeProbe(record, probe) {
  const kane_values = { ...record.values };
  const conflicts = Object.keys(probe.values).filter((k) => kane_values[k] !== undefined && kane_values[k] !== null && String(kane_values[k]).replace(/[^0-9.]/g, '') !== String(probe.values[k]).replace(/[^0-9.]/g, '') && !/^(none|no orders?)$/i.test(String(kane_values[k]).trim()));
  return { ...record, values: { ...record.values, ...probe.values }, kane_values, probe: probe.values, probe_error: probe.error, probe_conflicts: conflicts };
}
