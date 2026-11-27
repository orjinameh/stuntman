# Stuntman web (judge site)

Additive Next.js (App Router, TypeScript) site. The root Node CLI, its tests and the GitHub Pages site (`docs/`) are untouched.

```bash
cd web
npm install
npm run dev        # http://localhost:3000 (copies screenshots from ../examples/opencode-heal first)
npm test           # simulator tests (Node >= 22.6, type stripping)
npm run build
```

- `lib/simulator-model.ts`: pure simulation (integer cents). `lib/simulator-reducer.ts`: reducer. Tests in `tests/simulator-model.spec.ts` (named `.spec.ts` so the root `node --test` does not collect it).
- The simulator is a labelled simulation of documented behaviour; no payments, no backend.
- Report numbers on `/report` are copied from `examples/live-f001-report/report.json`, `README.md` and `LIVE_RUN.md`.

## Vercel

Import the GitHub repo, then set **Root Directory = `web`**, Framework Preset = Next.js (auto), Build Command = default (`next build`), Install = default, Node.js 22.x. No environment variables. `prebuild` copies screenshots from `../examples` when available and otherwise uses the committed copies in `public/evidence/`.
