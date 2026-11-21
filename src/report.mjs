import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml as h, c, writeJson, readJson, StuntmanError } from './util.mjs';

const VERDICT_LABEL = { confirmed: 'CONFIRMED', suspected: 'suspected', clean: 'clean', inconclusive: 'inconclusive', skipped: 'skipped' };

export function observedText(lane) {
  const last = lane.runs[0];
  if (!last || !last.values) return '—';
  const v = last.values;
  const inv = lane.invariant;
  const oc = v.order_count; const ct = v.charged_total;
  const tally = oc !== undefined && ct !== undefined ? `${oc} ${Number(oc) === 1 ? 'order' : 'orders'}, ${ct} charged` : null;
  if (inv.observation === 'order_count' && tally) return tally;
  const val = v[inv.observation];
  if (val === undefined || val === null) return '—';
  const shown = typeof inv.equals === 'number' ? `${inv.observation} = ${val}` : `${inv.observation} = "${val}"`;
  return tally ? `${shown} (${tally})` : shown;
}

function colorVerdict(v, s) {
  if (v === 'confirmed') return c.red(c.bold(s));
  if (v === 'suspected') return c.yellow(s);
  if (v === 'clean') return c.green(s);
  return c.dim(s);
}

/** Terminal lane table. Uses plain padding so it is stable without a TTY. */
export function renderTable(report) {
  const rows = report.personas.map((l) => {
    const dur = l.runs.reduce((a, r) => a + (r.duration || 0), 0);
    const cr = l.runs.reduce((a, r) => a + (r.credits || 0), 0);
    const verdict = VERDICT_LABEL[l.verdict];
    const detail = l.verdict === 'confirmed' ? `— ${observedText(l)}` : l.verdict === 'suspected' ? `— ${l.basis}` : '';
    return { cells: [l.id, l.severity, verdict, observedText(l), `${l.runs.length}`, dur ? `${dur.toFixed(1)}s` : '—', `${cr}`, l.finding_id || '—'], l, detail };
  });
  const head = ['persona', 'sev', 'verdict', 'observed', 'runs', 'time', 'credits', 'finding'];
  const widths = head.map((hd, i) => Math.max(hd.length, ...rows.map((r) => r.cells[i].length)));
  const pad = (s, i) => String(s).padEnd(widths[i]);
  const out = [];
  out.push(c.bold(head.map(pad).join('  ')));
  out.push(c.dim(widths.map((w) => '─'.repeat(w)).join('  ')));
  for (const r of rows) {
    const cells = r.cells.map((s, i) => pad(s, i));
    cells[2] = colorVerdict(r.l.verdict, cells[2]);
    out.push(cells.join('  '));
  }
  return out.join('\n');
}

export function terminalSummary(report) {
  const s = report.summary;
  const badge = report.mode === 'live' ? c.cyan('LIVE') : c.yellow('FIXTURE');
  const lines = [];
  lines.push(`${c.bold('Stuntman')} · ${report.app.name} · ${report.journey.title} · ${badge}${report.mode === 'fixture' ? c.dim(` (${report.fixture_state}; recorded-shape fixtures, not live evidence)`) : ''}`);
  lines.push('');
  lines.push(renderTable(report));
  lines.push('');
  for (const l of report.personas.filter((x) => x.verdict === 'confirmed')) {
    lines.push(c.red(`${l.id} CONFIRMED — ${observedText(l)}`) + c.dim(`  (${l.finding_id}: ${l.basis})`));
  }
  for (const l of report.personas.filter((x) => x.verdict === 'suspected')) {
    lines.push(c.yellow(`${l.id} suspected — ${l.basis}. One failure is not a finding.`));
  }
  lines.push(`${s.confirmed} confirmed · ${s.suspected} suspected · ${s.clean} clean · ${s.inconclusive} inconclusive · ${s.skipped} skipped · ${s.credits} credits`);
  if (report.budget_ceiling_hit) lines.push(c.yellow('budget ceiling reached: remaining personas were skipped (budget)'));
  if (s.confirmed) {
    const first = report.personas.find((l) => l.finding_id).finding_id;
    lines.push('');
    lines.push(`Next: ${c.bold(`stuntman brief ${first}`)}   then   ${c.bold('stuntman lock')}   then   ${c.bold(`stuntman heal ${first} --agent-cmd '<your agent> {brief}'`)}`);
  }
  return lines.join('\n');
}

export function writeReportFiles(report, runDir) {
  writeJson(path.join(runDir, 'report.json'), { ...report, run_dir: path.basename(runDir) });
  fs.writeFileSync(path.join(runDir, 'report.html'), renderHtml(report));
}

const CSS = `:root{--bg:#f6f4ef;--fg:#1b1b1f;--mut:#6b6b73;--card:#fff;--line:#e3e0d8;--red:#b3261e;--amber:#9a6700;--green:#1a7f37;--blue:#1f4fb8}
@media (prefers-color-scheme:dark){:root{--bg:#141417;--fg:#ececf0;--mut:#9a9aa4;--card:#1d1d22;--line:#2c2c33;--red:#ff6b61;--amber:#e3b341;--green:#56d364;--blue:#79a6ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:960px;margin:0 auto;padding:28px 18px 60px}h1{margin:0 0 4px;font-size:26px}h2{margin:30px 0 10px;font-size:18px}
.sub{color:var(--mut)}.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.06em;border:1px solid currentColor}
.live{color:var(--blue)}.fixture{color:var(--amber)}
.cards{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 16px;min-width:110px}
.stat b{display:block;font-size:22px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--line);font-size:14px}th{color:var(--mut);font-weight:600}
.v-confirmed{color:var(--red);font-weight:700}.v-suspected{color:var(--amber);font-weight:600}.v-clean{color:var(--green)}.v-inconclusive,.v-skipped{color:var(--mut)}
.finding{background:var(--card);border:1px solid var(--red);border-radius:12px;padding:16px 18px;margin:14px 0}
.finding h3{margin:0 0 6px;color:var(--red)}pre,code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 12px;overflow-x:auto}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:640px){.cols{grid-template-columns:1fr}}
img.shot{max-width:100%;border:1px solid var(--line);border-radius:8px}.note{color:var(--mut);font-size:13px}`;

export function renderHtml(report) {
  const s = report.summary;
  const badge = report.mode === 'live' ? '<span class="badge live">LIVE</span>' : '<span class="badge fixture">FIXTURE</span>';
  const rows = report.personas.map((l) => {
    const dur = l.runs.reduce((a, r) => a + (r.duration || 0), 0);
    const cr = l.runs.reduce((a, r) => a + (r.credits || 0), 0);
    return `<tr><td>${h(l.name)} <span class="note">(${h(l.id)})</span></td><td>${h(l.severity)}</td><td class="v-${l.verdict}">${h(VERDICT_LABEL[l.verdict])}</td><td>${h(observedText(l))}</td><td>${l.runs.length}</td><td>${dur ? h(dur.toFixed(1)) + 's' : '—'}</td><td>${cr}</td><td>${h(l.finding_id || '—')}</td></tr>`;
  }).join('\n');
  const findings = report.personas.filter((l) => l.finding_id).map((l) => {
    const r = l.runs[0];
    const evid = report.evidence && report.evidence.screenshot_b64 && report.mode === 'live'
      ? `<p><b>Screenshot from the sealed Kane pack</b></p><img class="shot" alt="Last step screenshot from the Kane evidence pack" src="data:image/png;base64,${report.evidence.screenshot_b64}">`
      : `<p class="note">${h(report.mode === 'live' ? (report.evidence && report.evidence.note) || 'no screenshot extracted' : 'Fixture run: there is no sealed Kane pack and no screenshot. Run with --live for real evidence.')}</p>`;
    const refs = l.runs.map((x) => `<li>run ${x.index}: exit ${x.exit_code} (${h(x.status)}) · values ${h(JSON.stringify(x.values))} · <code>${h(x.raw_path || '')}</code> · session <code>${h(x.session_dir || '—')}</code></li>`).join('');
    const pack = report.evidence && report.evidence.pack ? `<li>sealed pack: <code>${h(report.evidence.pack)}</code></li>` : '';
    return `<section class="finding"><h3>${h(l.finding_id)} · ${h(l.name)} — CONFIRMED</h3>
<div class="cols"><div><p class="note">Expected</p><p><b>${h(l.invariant.observation)} = ${h(l.invariant.equals)}</b><br>${h(l.invariant.reason)}</p></div>
<div><p class="note">Observed</p><p class="v-confirmed"><b>${h(observedText(l))}</b><br>${h(l.basis)}</p></div></div>
<p><b>Evidence</b></p><ul>${refs}${pack}</ul>${evid}
<p><b>Reproduce</b></p><pre>node bin/stuntman.mjs audit ${report.mode === 'live' ? '--live' : '--fixture-state ' + h(report.fixture_state || 'broken')} --persona ${h(l.id)}</pre>
<p><b>Next</b></p><pre>node bin/stuntman.mjs brief ${h(l.finding_id)}
node bin/stuntman.mjs lock
node bin/stuntman.mjs heal ${h(l.finding_id)} --agent-cmd '&lt;your agent&gt; {brief}'</pre></section>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stuntman report · ${h(report.app.name)}</title><style>${CSS}</style></head><body><main>
<h1>Stuntman ${badge}</h1>
<p class="sub">${h(report.app.name)} · ${h(report.journey.title)} · commit <code>${h(report.commit)}</code> · ${h(report.started_at)} · contract <code>${h(String(report.contract_hash).slice(0, 12))}</code></p>
${report.mode === 'fixture' ? '<p class="note">FIXTURE: these results replay hand-authored fixtures in the Kane run_end shape. They are a deterministic offline demo, not live evidence.</p>' : ''}
<div class="cards"><div class="stat"><b class="v-confirmed">${s.confirmed}</b>confirmed</div><div class="stat"><b class="v-suspected">${s.suspected}</b>suspected</div><div class="stat"><b class="v-clean">${s.clean}</b>clean</div><div class="stat"><b>${s.inconclusive}</b>inconclusive</div><div class="stat"><b>${s.credits}</b>credits</div></div>
<h2>Cast</h2><table><thead><tr><th>Persona</th><th>Sev</th><th>Verdict</th><th>Observed</th><th>Runs</th><th>Time</th><th>Credits</th><th>Finding</th></tr></thead><tbody>${rows}</tbody></table>
${findings ? `<h2>Findings</h2>${findings}` : '<h2>Findings</h2><p>No hazard was confirmed.</p>'}
<h2>How to read this</h2>
<p>Every persona performs one human behaviour against the same journey. A hazard is <b>confirmed</b> only when the persona fails twice with the same typed value for the invariant. A single failure is <b>suspected</b> and never produces a repair brief. A setup error, a timeout, or a missing observation is <b>inconclusive</b> and never confirms anything.</p>
<p class="note">Generated by Stuntman. This file makes no external requests.</p></main></body></html>`;
}

export function findReportDirs(cwd) {
  const root = path.join(cwd, 'runs');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, 'report.json'))).sort().reverse().map((d) => path.join(root, d));
}

export function loadReport(dir) {
  const r = readJson(path.join(dir, 'report.json'), 'report.json');
  r.run_dir_abs = dir;
  return r;
}

/** Most recent report that satisfies pred (default: has a confirmed finding). */
export function latestReport(cwd, pred = (r) => r.summary.confirmed > 0) {
  for (const d of findReportDirs(cwd)) { const r = loadReport(d); if (pred(r)) return r; }
  return null;
}

export function reportFromOpt(cwd, runOpt, pred) {
  if (runOpt && runOpt !== true) {
    const dir = path.resolve(cwd, runOpt);
    if (!fs.existsSync(path.join(dir, 'report.json'))) throw new StuntmanError(`no report.json in ${dir}`);
    return loadReport(dir);
  }
  const r = latestReport(cwd, pred);
  if (!r) throw new StuntmanError('no report with a confirmed finding found under runs/. Run: stuntman audit');
  return r;
}
