import { REPO } from "../lib/links.ts";

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand" href="/" aria-label="Stuntman home">stuntman</a>
        <nav aria-label="Primary">
          <a href="/#demo">Demo</a>
          <a href="/#evidence">Evidence</a>
          <a href="/#how">How it works</a>
          <a href="/report">Report</a>
          <a href="/#limits">Limits</a>
          <a className="gh" href={REPO} rel="noreferrer">GitHub</a>
        </nav>
      </div>
    </header>
  );
}
