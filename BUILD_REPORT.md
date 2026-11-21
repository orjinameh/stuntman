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

All 40 tests pass on Node 22 in the build sandbox. The project declares `node >=20` and uses only Node 20 built-ins, but it was **not run on Node 20**.

## Verified vs unverified
**Verified (automated, offline):** compiler, classifier (numeric and text invariants) and the confidence rule, fixture audit and exit codes, report JSON/HTML (escaping, no external requests), brief, lock and contract refusal, heal, verify (fixture), budget guard, demo storefront behaviour over HTTP (one order, one redirect to an empty cart), the reference patch (`git apply`, a repeat submit lands on the confirmation), second-app audit, evidence extraction from a synthetic pack.

**Verified only against a test double** (`testlib/fake-kane.mjs`, which emits the documented NDJSON shape and is **not Kane**): the argv passed to `kane-cli run` and `testmd run`, tolerance of malformed lines and stderr noise, exit-code mapping, `test_md_done` parsing.

**Unverified live (no real Kane was run):** that the `kane-cli` flags and event shapes behave exactly as the cited docs say; that Kane's agent actually double-clicks from the persona sentences; that the emitted `_test.md` is accepted by `kane-cli testmd run` (only documented frontmatter keys are used); real `.evidence` pack layout and screenshot extraction; `run_end.final_state` carrying the stored values as assumed.

## Decisions
1. **Fixtures are hand-authored, not recordings.** I could not record Kane runs, so `fixtures/` holds NDJSON in the documented `run_end` shape. They are labelled `FIXTURE` everywhere and the README says so.
2. **Untyped repeated failures are suspected, not confirmed.** AC-09 allows "same typed violation or the same normalized reason"; the risk table says untyped repeats are labelled suspected. I followed the stricter reading: only a repeated *typed* value confirms. `normalizeReason` is exported but not used to confirm.
3. **A violating value counts even if Kane said `passed`** (the typed value wins over the status). A pass without the observation value is inconclusive.
4. **Audit exit code 3** when nothing is confirmed but some persona is inconclusive; 1 wins if any hazard is confirmed.
5. **Persona lookup:** `./personas` in the working directory first, then the packaged ones. That is how `demo/second` carries its own persona.
6. **Demo app and hazard.** `demo/app/server.mjs` is the app a fresh Claude session wrote from `demo/BRIEF.md`; I did not edit it. It already empties the cart before the 1.5 s payment call, so a double submit cannot create a second order. Reading the code, the remaining hazard is that the second submit redirects to `/cart` (empty), so a customer who clicks Pay twice can land on an empty cart after paying. `impatient` and `refresher` therefore assert the final page heading is `Order confirmed` (a text invariant). `back-button` and `slow-submit` keep `order_count = 1` and are expected to come back clean on this app; `slow-submit` waits 2 s but the payment takes 1.5 s, so it is effectively a control.
7. **`heal` does not require a lock** but warns loudly if `stuntman.lock` is missing; with a lock, it refuses if the contract changed during the agent run.
8. **No TypeScript, no YAML:** JSON config as the handoff specified. `.env` files are not auto-loaded.
9. I did **not** commit anything to git. The folder keeps the two pre-existing commits; you commit the build (commands in the delivery message).

## Known gaps
- **The predicted hazard is unconfirmed.** The fixtures encode what reading `demo/app/server.mjs` suggests (the second submit's response is an empty cart and the browser shows the winning navigation). HTTP-level tests prove the redirect to `/cart`; only a live Kane run shows what the browser displays. If `impatient` is clean live, report that honestly.
- No recorded live run, no `runs/demo/`, no screen capture. `examples/fixture-report/` is a fixture report.
- Windows paths and quoting were written defensively but never run. `shell: true` is used only for the user's agent command.
- `refresher`, `back-button` and `slow-submit` rely on Kane's agent honouring plain-English timing; expect to tune the sentences.
- The `returning` control persona expects 2 orders; if Kane buys only once it will report a violation (it is a control, adjust or drop it from `stuntman.json`).
- `stuntman report --open` shells out to `open`/`xdg-open`/`start` and is untested.
- CI workflow untested on GitHub. The `live` job uses the documented `kane-cli login --username --access-key`.
- Heal's re-audit in fixture mode only proves the plumbing; whether the agent's fix actually works is proven only by `--live`.
- Raw NDJSON is capped at 5 MB per run (truncated with a note); per-persona retention across runs is not.
