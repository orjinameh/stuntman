import type { Metadata } from "next";
import { Footer } from "../../components/Footer.tsx";
import { Header } from "../../components/Header.tsx";
import { blob, tree } from "../../lib/links.ts";

export const metadata: Metadata = { title: "F-001 report · Stuntman", description: "Finding F-001: shown $49.00, charged $61, confirmed 2 of 2 in a real browser." };

// Figures below are copied from examples/live-f001-report/report.json, briefs/F-001.md,
// README.md and LIVE_RUN.md in the repository. Nothing here is generated or estimated.
const RUNS = [
  { n: 1, displayed: "$49.00", charged: "61", secs: "177.9", credits: "63.8" },
  { n: 2, displayed: "$49.00", charged: "61.00", secs: "190.8", credits: "59.0" },
];

export default function ReportPage() {
  return (
    <>
      <Header />
      <main id="main" className="wrap section report">
        <p className="eyebrow">Live evidence · kane-cli 0.10.7 · headless Chrome · target: Corner Store (demo/app)</p>
        <h1>F-001: shown $49.00, charged $61</h1>

        <div className="callout live">
          <strong>Live agent evidence.</strong> This report summarises the archived real Kane run in <a href={tree("examples/live-f001-report")} rel="noreferrer">examples/live-f001-report/</a>.
          It is not offline fixture data. Fixtures in <code>fixtures/</code> are hand-authored, labelled FIXTURE in every report, and are not used here.
        </div>

        <h2>Summary</h2>
        <table className="rule">
          <tbody>
            <tr><th>Persona</th><td><code>stale-total</code>, severity P1</td></tr>
            <tr><th>Verdict</th><td><span className="vtag c-confirmed">CONFIRMED</span> 2 of 2 runs failed with the same typed violation</td></tr>
            <tr><th>Invariant</th><td>A customer must never be charged more than the total they were shown when they paid.</td></tr>
            <tr><th>Observed</th><td>charged_total 61 against displayed_total $49.00</td></tr>
            <tr><th>Report</th><td>2026-11-21, commit 7f6f7d1, 122.8 Kane credits, persona wording 1.4.0</td></tr>
          </tbody>
        </table>

        <h2>The vulnerability</h2>
        <p>
          The checkout page prints the total of the cart as it was when the page rendered. On payment, the original server ignores that
          number and recalculates from the live cart. If the cart changed after the page was rendered and the customer returns to the
          old page with the browser Back button, the page still says $49.00 while the server charges the new cart total of $61.00.
          No one planted this bug: the store was written by a fresh Claude session from <a href={blob("demo/BRIEF.md")} rel="noreferrer">demo/BRIEF.md</a>.
        </p>

        <h2>Reproduction</h2>
        <ol>
          <li>Add the Harbor Mug ($49), open the cart, continue to checkout. Stop before paying.</li>
          <li>Use the header link back to the shop and add one Field Notebook ($12). You land on the cart.</li>
          <li>Press Back twice: first the shop, then the old checkout form, still showing $49.00.</li>
          <li>Click Pay once. The shop confirms the order and charges 61.</li>
        </ol>
        <pre className="code">{`node bin/stuntman.mjs report --run examples/live-f001-report   # replay the archived real run
node bin/stuntman.mjs audit --live --persona stale-total      # needs kane-cli and a Kane account`}</pre>
        <p className="muted small">Browser history in the demo is deterministic: [/, /cart, /checkout, /, /cart].</p>

        <h2>Confirming runs</h2>
        <table className="rule">
          <thead><tr><th>Run</th><th>Displayed total</th><th>charged_total</th><th>Duration (s)</th><th>Credits</th></tr></thead>
          <tbody>{RUNS.map((r) => <tr key={r.n}><td>{r.n}</td><td>{r.displayed}</td><td>{r.charged}</td><td>{r.secs}</td><td>{r.credits}</td></tr>)}</tbody>
        </table>
        <p className="muted small">
          Disclosure: in both confirming runs Kane's own triage labelled the run an automation issue (run 1: the agent misread the Orders page and ran its final
          check with unresolved placeholders). Stuntman's classification rests on the typed values Kane stored in both runs, which agree. Raw transcripts:{" "}
          <a href={tree("examples/live-f001-report/raw")} rel="noreferrer">raw/</a>.
        </p>

        <h2>Repairs</h2>
        <h3>Repair A: reject stale checkout (checked in)</h3>
        <p>
          The form carries the displayed total in a hidden <code>expected_cents</code> field; the server redirects to a fresh checkout when it no longer matches the cart.
          Source: <a href={blob("demo/fixed/server.mjs")} rel="noreferrer">demo/fixed/server.mjs</a> (also what <code>demo/app/server.mjs</code> holds). Written by hand and applied with <code>cp</code>.
          Re-audit <strong>CLEAN</strong>, 2 of 2 usable runs. <code>verify --live</code> <strong>PASS</strong>, 161.0 s.
        </p>
        <h3>Repair B: snapshot checkout (autonomous, OpenCode)</h3>
        <p>
          OpenCode 1.19.6 (model opencode/big-pickle) read only Kane's repair brief and edited the shop: each checkout form carries a server-side draft token bound to the session and
          the exact total shown; <code>POST /checkout</code> charges that snapshot, consumes only those items, and is idempotent on replay.
          Re-audit <strong>CLEAN</strong>, 2 of 2 usable runs; the adapter confirmed the locked contract was untouched; <code>verify --live</code> <strong>PASS</strong>, 118.0 s.
        </p>
        <div className="callout">
          <strong>Evidence qualification.</strong> Repair B is shown by screenshots (<a href="/#evidence">gallery</a>). Its repaired source file was lost when the Codespace expired and is not in the repository.
          The repository also holds re-audit transcripts in <a href={tree("examples/live-f001-opencode-heal")} rel="noreferrer">examples/live-f001-opencode-heal/</a>; its heal summary
          lists two passed attempts, each with the shop's own state probe reading order_count 1 and charged_total 49.00 against a displayed $49.00. The README does not reference that folder.
        </div>

        <h2>Verification and process</h2>
        <ul>
          <li>The repair brief was written and the contract locked (<code>stuntman.lock</code>, <code>tests/stuntman-stale-total_test.md</code>) before either repair.</li>
          <li>Four other personas ran clean; two (slow-submit, returning) were inconclusive because Kane's agent cannot act while a request is in flight.</li>
          <li>Before and after used persona wording 1.4.0 and 1.5.0 (wording only, same invariant).</li>
          <li>LIVE_RUN.md records at least fifteen runs including the inconclusive and failed ones: <a href={blob("LIVE_RUN.md")} rel="noreferrer">read it</a>.</li>
        </ul>

        <h2>Limitations</h2>
        <ul className="limits">
          <li>The contract lock is a tripwire, not a security boundary.</li>
          <li>The repair agent was told, not sandboxed, not to read git history; in the OpenCode run the pre-written repair was parked in hidden directories whose names the agent could see.</li>
          <li>Kane's runs are stochastic and one page per run; some personas cannot be achieved.</li>
          <li>One finding on one small demo store. This is not a claim about arbitrary applications.</li>
        </ul>
        <p><a className="btn" href="/#demo">Back to the interactive demo</a></p>
      </main>
      <Footer />
    </>
  );
}
