# BUILD_REPORT

## Phases
| Phase | Status |
|---|---|
| P1 skeleton, compiler, fixtures, failing report | done, tested |
| P2 brief, heal, lock, verify, evidence, patch, stand-in agent | done, tested |
| P3 live Kane validation | **not done** (no Kane, Chrome or network here) |
| P4 second app, budget guard, CI, `--json`, `personas`, `NO_COLOR` | done (CI workflow written, never executed on GitHub) |
| P5 docs | done; recorded live run and screen capture **not possible** here |
| P6 submission hardening | human tasks (repo, video, posts, form) |

All 39 tests pass on Node 22 in the build sandbox. The project declares `node >=20` and uses only Node 20 built-ins, but it was **not run on Node 20**.

## Verified vs unverified
**Verified (automated, offline):** compiler, classifier and the confidence rule, fixture audit and exit codes, report JSON/HTML (escaping, no external requests), brief, lock and contract refusal, heal, verify (fixture), budget guard, demo storefront race (two orders, two charges), the reference patch (`git apply`, one order), second-app audit, evidence extraction from a synthetic pack.

**Verified only against a test double** (`testlib/fake-kane.mjs`, which emits the documented NDJSON shape and is **not Kane**): the argv passed to `kane-cli run` and `testmd run`, tolerance of malformed lines and stderr noise, exit-code mapping, `test_md_done` parsing.

**Unverified live (no real Kane was run):** that the `kane-cli` flags and event shapes behave exactly as the cited docs say; that Kane's agent actually double-clicks from the persona sentences; that the emitted `_test.md` is accepted by `kane-cli testmd run` (only documented frontmatter keys are used); real `.evidence` pack layout and screenshot extraction; `run_end.final_state` carrying the stored values as assumed.

## Decisions
1. **Fixtures are hand-authored, not recordings.** I could not record Kane runs, so `fixtures/` holds NDJSON in the documented `run_end` shape. They are labelled `FIXTURE` everywhere and the README says so.
2. **Untyped repeated failures are suspected, not confirmed.** AC-09 allows "same typed violation or the same normalized reason"; the risk table says untyped repeats are labelled suspected. I followed the stricter reading: only a repeated *typed* value confirms. `normalizeReason` is exported but not used to confirm.
3. **A violating value counts even if Kane said `passed`** (the typed value wins over the status). A pass without the observation value is inconclusive.
4. **Audit exit code 3** when nothing is confirmed but some persona is inconclusive; 1 wins if any hazard is confirmed.
5. **Persona lookup:** `./personas` in the working directory first, then the packaged ones. That is how `demo/second` carries its own persona.
6. **Demo race:** the storefront's fake payment provider waits 400 ms (`PAYMENT_LATENCY_MS`) between reading and clearing the cart. That window is the realistic cause of the duplicate order. There is no hidden switch; the shipped app has no idempotency key.
7. **`heal` does not require a lock** but warns loudly if `stuntman.lock` is missing; with a lock, it refuses if the contract changed during the agent run.
8. **No TypeScript, no YAML:** JSON config as the handoff specified. `.env` files are not auto-loaded.
9. I did **not** commit anything to git. The folder keeps the two pre-existing commits; you commit the build (commands in the delivery message).

## Known gaps
- **The demo app was not built from `demo/BRIEF.md` by a fresh agent session.** The same session wrote the app and the patch, so a judge could call the bug planted. Before recording: give `demo/PROMPT.md` plus `demo/BRIEF.md` to a fresh agent, replace `demo/app/server.mjs`, check `npm test` and `audit --live`, and regenerate the patch if the code differs (`demo.test.mjs` and `agent-fix.mjs` assume the patch applies to the shipped file).
- No recorded live run, no `runs/demo/`, no screen capture. `examples/fixture-report/` is a fixture report.
- Windows paths and quoting were written defensively but never run. `shell: true` is used only for the user's agent command.
- `refresher`, `back-button` and `slow-submit` rely on Kane's agent honouring plain-English timing; expect to tune the sentences.
- The `returning` control persona expects 2 orders; if Kane buys only once it will report a violation (it is a control, adjust or drop it from `stuntman.json`).
- `stuntman report --open` shells out to `open`/`xdg-open`/`start` and is untested.
- CI workflow untested on GitHub. The `live` job uses the documented `kane-cli login --username --access-key`.
- Heal's re-audit in fixture mode only proves the plumbing; whether the agent's fix actually works is proven only by `--live`.
- Raw NDJSON is capped at 5 MB per run (truncated with a note); per-persona retention across runs is not.
