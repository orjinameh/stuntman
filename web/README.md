# Stuntman web (judge site)

Additive Next.js (App Router, TypeScript) site that lets a visitor experience finding F-001 (shown $49.00, charged $61) and see the evidence. The root Node CLI, its tests and the GitHub Pages site (`docs/`) are untouched by this folder.

```bash
cd web
npm install
npm run dev        # http://localhost:3000 (copies screenshots from ../examples/opencode-heal first)
npm test           # simulator tests (Node >= 22.6, type stripping)
npm run build
```

## What is where

- `app/page.tsx`: landing page (hero, simulator, evidence, how it works, limits). `app/report/page.tsx`: the F-001 report.
- `lib/simulator-model.ts`: pure simulation in integer cents. `lib/simulator-reducer.ts`: reducer. `tests/simulator-model.spec.ts`: 12 tests (named `.spec.ts` so the root `node --test` never collects them).
- `components/`: Header, Hero, CheckoutSimulator, EvidenceGallery, Workflow, Limitations, Footer.
- `public/evidence/`: copies of the four screenshots in `examples/opencode-heal/` (originals are only read).

## Honesty notes

- The simulator is a labelled simulation of the documented behaviour of `demo/baseline`, `demo/fixed` (Repair A) and the Repair B description. It is not the real server and processes no payments.
- Repair B is evidenced by screenshots and re-audit transcripts only; its source file was not saved. Only Repair A is checked in as code.
- Report numbers come from `examples/live-f001-report/report.json`, the root `README.md` and `LIVE_RUN.md`. Offline `fixtures/` are never used as evidence.

## Design layer

`app/awwwards.css` is a presentation layer ("Solar Clay": warm paper, hard ink edges, vermilion, sun yellow, green). It is imported after `globals.css` by one line in `app/layout.tsx`. Delete that line to return to the plain styles. Colour meanings: gold = total shown, vermilion = charged / FAIL, green = PASS. All motion is behind `prefers-reduced-motion: no-preference`; scroll-driven effects are behind `@supports (animation-timeline: scroll())`.

## Vercel

Import the GitHub repo, then set **Root Directory = `web`**, Framework Preset = Next.js (auto), default build (`next build`), default install, Node.js 22.x. No environment variables. `prebuild` copies screenshots from `../examples` when available and otherwise uses the committed copies in `public/evidence/`.

## Hackathon deadline

The KaneCLI Online Hackathon rules say submissions lock at 11:59 PM IST on 26 Nov 2026 (18:29 UTC) and "No pushes after this." Do not push this folder to the submitted repository after that time. Host it from a separate repository or fork, and link the submitted repo from there.
