import { REPO } from "../lib/links.ts";

export function Hero() {
  return (
    <section className="hero wrap" aria-labelledby="hero-h">
      <p className="eyebrow">Real finding F-001 · confirmed 2 of 2 in a real browser</p>
      <h1 id="hero-h">The customer saw <span className="shown">$49</span>. The server charged <span className="charged">$61</span>.</h1>
      <p className="lede">
        Stuntman tests whether an application actually preserves its invariants under realistic human behaviour.
        It finds failures, produces evidence, and verifies repairs. The store's own agent-written tests passed.
      </p>
      <div className="compare" role="group" aria-label="Shown versus charged">
        <div className="tile shown-tile">
          <span className="tile-label">Checkout page showed</span>
          <span className="tile-num">$49.00</span>
        </div>
        <div className="arrow" aria-hidden="true">→</div>
        <div className="tile charged-tile">
          <span className="tile-label">Server charged</span>
          <span className="tile-num">$61.00</span>
        </div>
      </div>
      <div className="actions">
        <a className="btn primary" href="#demo">Try the interactive demo</a>
        <a className="btn" href="#evidence">Explore the evidence</a>
        <a className="btn" href={REPO} rel="noreferrer">View the GitHub repository</a>
      </div>
    </section>
  );
}
