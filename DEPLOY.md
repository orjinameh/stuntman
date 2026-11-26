# DEPLOY

Stuntman is a local CLI. There is nothing you must deploy. Everything below is optional.

## 1. Publish the repository (required by the hackathon)
Accounts: GitHub.
```bash
git init            # skip if the folder is already a repo (the supplied folder already has history)
git add -A
git commit -m "Build Stuntman from the implementation handoff"
git branch -M main
git remote add origin git@github.com:<you>/stuntman.git
git push -u origin main
```
The hackathon requires a **public** repo **initialised on or after 12 Nov 2026** with real commit history, and no pushes after 23:59 IST on 26 Nov 2026. Check that the repo you push has history from 12 Nov or later; if you create a new repository, create it fresh.

Before pushing: no `runs/`, `.testmuai/`, `.evidence` packs or secrets (`.gitignore` covers them). Commit the generated `tests/stuntman-*_test.md` and `stuntman.lock` (they are the point), plus Kane's `output-<stem>/` recordings once you have them.

## 2. CI (optional)
`.github/workflows/ci.yml` runs offline checks on every push with no secrets. For the manual live job, add repository secrets `LT_USERNAME` and `LT_ACCESS_KEY` (TestMu AI dashboard, Settings, Keys), then Actions, ci, Run workflow, tick `live`.

## 3. npm publish (optional)
Accounts: npm. `npm view stuntman` first to confirm the name is free (it was reported free on 2026-11-21 by the handoff, unverified here). Then `npm publish`. Fallback names: `fifth-user`, `hazard-audit`.

## 4. Hosting the demo storefront (optional)
It is `node demo/app/server.mjs` with `PORT`. Any Node host works (Render, Fly.io, Railway free tiers). State is in memory and resets on restart. Stuntman audits a URL, so you can point `app.base_url` at the hosted copy. Not required: judges can run it locally.

## 5. Submission checklist (human tasks)
- [x] `demo/app` was written by a fresh Claude session from `demo/BRIEF.md` (not by the Stuntman builder).
- [ ] Record the live run; store its report under `examples/` (not `runs/`).
- [ ] 3 to 5 minute YouTube demo (plan in `docs/SUBMISSION.md`).
- [ ] Two public launch posts (Hacker News, X, Reddit or LinkedIn).
- [ ] Submission form before 23:59 IST on 26 Nov 2026.
