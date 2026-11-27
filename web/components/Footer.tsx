import { PAGES, REPO } from "../lib/links.ts";

export function Footer() {
  return (
    <footer className="wrap foot">
      <p>Stuntman · built for the KaneCLI Online Hackathon (TestMu AI).</p>
      <p><a href={REPO} rel="noreferrer">GitHub</a> · <a href={PAGES} rel="noreferrer">GitHub Pages site</a> · <a href="/report">F-001 report</a></p>
    </footer>
  );
}
