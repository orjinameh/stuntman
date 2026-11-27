import { REPO, blob, tree } from "../lib/links.ts";

const SHOTS = [
  {
    file: "1-agent-run-and-guard.jpg",
    title: "The adapter starts the agent",
    text: "Terminal at the start of the autonomous repair: the adapter reports agent: opencode and the agent reads demo/app/server.mjs. Its directory listing shows the .stuntman-hidden-* folders where this first adapter version parked the pre-written repair, which is why the adapter now uses a random temp directory instead.",
  },
  {
    file: "2-clean-verdict.jpg",
    title: "Re-audit verdict: CLEAN",
    text: "The agent's own summary, the adapter confirming protected files untouched and the file parsing, the app restarting, attempts 1 and 2 ok, and CLEAN with 2 usable of 2 attempts.",
  },
  {
    file: "3-agent-diff.jpg",
    title: "The agent's diff (Repair B)",
    text: "git diff of demo/app/server.mjs: a drafts store, a token minted at GET /checkout and a hidden draft field, and consumeDraftLines so only the snapshot's items leave the cart.",
  },
  {
    file: "4-verify-pass.jpg",
    title: "Locked test replay: PASS",
    text: "verify --live replaying tests/stuntman-stale-total_test.md against the repaired app: PASS in 118.0 s.",
  },
] as const;

export function EvidenceGallery() {
  return (
    <section id="evidence" className="wrap section" aria-labelledby="ev-h">
      <h2 id="ev-h">Evidence</h2>
      <p className="lede small-lede">
        Four screenshots of the real terminal during the autonomous repair (OpenCode 1.19.6, model opencode/big-pickle, 2026-11-25).
        They are screenshots because the Codespace expired before the repaired file was saved. The repository does not contain Repair B's
        source: <code>demo/app/server.mjs</code> there is Repair A.
      </p>
      <div className="shots">
        {SHOTS.map((s) => (
          <figure key={s.file} className="shot">
            <a href={`/evidence/${s.file}`} target="_blank" rel="noreferrer" aria-label={`Open ${s.title} at full size`}>
              <img src={`/evidence/${s.file}`} alt={s.title} loading="lazy" width={1206} height={2133} />
            </a>
            <figcaption>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
              <a href={`/evidence/${s.file}`} target="_blank" rel="noreferrer">Open original size</a>
            </figcaption>
          </figure>
        ))}
      </div>
      <ul className="linklist">
        <li><a href="/report">Finding F-001 report (this site)</a></li>
        <li><a href={tree("examples/live-f001-report")} rel="noreferrer">Archived Kane report, raw transcripts and brief</a></li>
        <li><a href={blob("LIVE_RUN.md")} rel="noreferrer">LIVE_RUN.md: the honest log of every live run, including failures</a></li>
        <li><a href={REPO} rel="noreferrer">GitHub repository</a></li>
      </ul>
    </section>
  );
}
