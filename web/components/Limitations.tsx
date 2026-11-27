const ITEMS = [
  "Stuntman is an evidence-backed research tool. It does not find every vulnerability and is not a security guarantee.",
  "Kane's agent works one step at a time in one tab and cannot act while a request is in flight. In the live runs slow-submit and returning came back inconclusive, and refresher only passed weakly.",
  "The contract lock is a tripwire, not a security boundary. It makes weakening the test visible in git diff; a determined agent with write access can still edit files.",
  "The repair agent is told not to read git history, but it is not sandboxed from doing so. In the OpenCode run the pre-written repair sat in hidden directories inside the repo, with names visible to the agent; its design differed from the pre-written one.",
  "Kane's runs are stochastic. The two-pass rule reduces false findings but cannot remove them. In both confirming runs Kane's own triage labelled the run an automation issue; the finding rests on the typed values and the order recorded on the Orders page.",
  "Offline fixtures are hand-authored demo data labelled FIXTURE. They are not live evidence. The live evidence is the archived Kane run.",
  "Repair B is evidenced by screenshots and re-audit transcripts, but its source file was not saved. Only Repair A is checked in as code.",
  "The simulator on this site is a simulation of documented behaviour, written for this page. It is not the real server and processes no payments.",
  "Only shop-style and note-style journeys have been exercised. Do not read this as \"tests any app\".",
];

export function Limitations() {
  return (
    <section id="limits" className="wrap section" aria-labelledby="lim-h">
      <h2 id="lim-h">Limits and trust</h2>
      <ul className="limits">{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );
}
