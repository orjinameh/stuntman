const STEPS = [
  ["Compile", "stuntman.json holds one journey plus typed observations. Each persona pack in personas/*.json is a behaviour plus an invariant; the compiler joins them into a plain-English Kane objective."],
  ["Audit", "Every applicable persona runs once in a real browser through Kane CLI. Only failures run a second time."],
  ["Confirm", "Results go through the confidence rule below. One failure is never a finding."],
  ["Finding", "A confirmed hazard gets an id (F-001) and a report with the observed typed values and transcripts."],
  ["Brief", "briefs/F-001.md: behaviour, invariant, expected vs observed, evidence, repro command, done-when checklist, and a do-not list."],
  ["Lock + repair", "lock writes the _test.md and contract hashes before the fix. heal then runs your agent command with the brief."],
  ["Re-audit + verify", "heal re-audits the persona against the locked contract. verify replays the locked test with kane-cli testmd run."],
] as const;

const VERDICTS = [
  ["CONFIRMED", "Both usable runs fail with the same typed value.", "c-confirmed"],
  ["suspected", "One failure, a 1-of-2 flake, or two failures with different values. Never gets a brief.", "c-suspected"],
  ["inconclusive", "Setup error, timeout, or the observation value is missing. Never confirms.", "c-inconclusive"],
  ["clean", "The first run honours the invariant.", "c-clean"],
] as const;

export function Workflow() {
  return (
    <section id="how" className="wrap section" aria-labelledby="how-h">
      <h2 id="how-h">How Stuntman works</h2>
      <ol className="flow">
        {STEPS.map(([t, d], i) => (
          <li key={t}><span className="n">{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div></li>
        ))}
      </ol>
      <h3>The confidence rule</h3>
      <table className="rule">
        <thead><tr><th>Verdict</th><th>When</th></tr></thead>
        <tbody>
          {VERDICTS.map(([v, w, c]) => (
            <tr key={v}><td><span className={"vtag " + c}>{v}</span></td><td>{w}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        The persona behind this finding, <code>stale-total</code>, changes the cart after seeing the total, goes Back to the old checkout form, and pays.
        Its invariant: charged total is never more than the displayed total.
      </p>
    </section>
  );
}
