# Stuntman

**A customer was shown a total of $49.00 and charged $61.** The app's own agent-written tests passed. Stuntman found it in a real browser, proved it twice, locked it as a test, got a repair, and re-audited clean.

Your agent tested the happy path. Stuntman plays everyone else.

Stuntman is a zero-dependency Node CLI. You describe one purchase journey in plain English; it compiles a cast of adversarial human behaviours into [Kane CLI](https://github.com/LambdaTest/kane-cli) objectives, runs them in a real browser, and only reports a hazard when it reproduces twice with the same typed value. A confirmed hazard becomes a repair brief for your coding agent, a locked `_test.md` written **before** the fix, and a re-audit of the repaired app against that locked contract.

Built for the KaneCLI Online Hackathon (TestMu AI). Judged on Ships, Verified, Closed loop, Craft.

## What it found (real Kane runs, kane-cli 0.10.7, headless Chrome)

The target is a small store (`demo/app`) written by a fresh Claude session from `demo/BRIEF.md`; nobody planted a bug in it.

| Step | Result |
|---|---|
| Audit, persona `stale-total` (adds an item after seeing the total, goes Back to the old checkout form, pays) | **CONFIRMED**, 2 of 2 runs: Kane read **$49.00** on the form it submitted, the shop charged **61** (F-001) |
| Brief + lock | repair brief written, contract locked **before** the fix (`stuntman.lock`, `tests/stuntman-stale-total_test.md`) |
| Repair | the form now carries the displayed total; the server refuses to charge when the cart total has changed (`demo/patches/0002-…`, `demo/fixed/server.mjs`) |
| Re-audit after repair (`heal`) | **CLEAN**, 2 of 2 usable runs honoured "never charged more than shown" |
| Replay of the locked test (`verify`) | **PASS**, `kane-cli testmd run`, 161 s |
| **Autonomous repair** (`heal` with OpenCode, model `opencode/big-pickle`) | the agent read only Kane's repair brief and edited the shop itself: each checkout form now carries a server-side draft token bound to the session and the exact total shown; `POST /checkout` charges that snapshot, consumes only those items and is idempotent on replay. Re-audit **CLEAN**, 2 of 2 usable runs. The locked contract was untouched (checked by the adapter) |

Evidence is in `examples/live-f001-report/` (`report.html`, `report.json`, raw Kane transcripts, heal re-audit transcripts, the brief). `LIVE_RUN.md` is the honest log of every live run, including the failures.

**Disclosures.** Two repairs were run against the same finding: first one I wrote (`demo/fixed/server.mjs`, applied with `cp`), then an autonomous OpenCode repair through `heal --agent-cmd 'node demo/agent-run.mjs {brief}'`; `demo/app/server.mjs` now holds the OpenCode version. During the OpenCode run the pre-written repair was moved out of the working tree, but the first version of that adapter moved it to a hidden directory *inside* the repo whose name was visible in a directory listing (the agent's solution is a different design, so it did not copy it; later versions move it to a random temp directory). The agent is also only *told* not to read git history. The "before" confirmation and the "after" re-audits used persona wording versions 1.4.0 and 1.5.0 (wording only; same invariant). Four other personas ran clean, two were inconclusive because Kane's agent cannot act while a request is in flight (see Limitations). The `fixtures/` directory is hand-authored offline demo data, labelled `FIXTURE` in every report; it is not live evidence.

## Quick start (no Kane account, no network)

Node 20+ and git.

```bash
npm test                                          # 50 offline tests
node bin/stuntman.mjs audit --fixture-state broken   # exits 1: impatient CONFIRMED
node bin/stuntman.mjs brief F-001                 # repair brief for a coding agent
node bin/stuntman.mjs lock                        # locks the contract BEFORE the fix
node bin/stuntman.mjs heal F-001 \
  --agent-cmd 'node demo/agent-fix.mjs {brief}' --fixture-state fixed   # CLEAN, exit 0
node bin/stuntman.mjs verify --fixture            # replays the locked test
```

Open `runs/<timestamp>/report.html` (one file, no external requests). A pre-generated copy is in `examples/fixture-report/`.

`demo/agent-fix.mjs` is a **stand-in** for a real coding agent: it applies a reference patch so the loop is testable offline. In real use you pass your own agent command.

## Live mode (real browser)

```bash
npm install -g @testmuai/kane-cli          # Kane 0.10.7, needs Chrome
kane-cli login                             # or: kane-cli login --username <u> --access-key <k>
node demo/app/server.mjs &                 # the storefront under test, port 3000 (restart it between runs: state is in memory)
node bin/stuntman.mjs audit --live         # 5 personas, failures repeated once
node bin/stuntman.mjs brief F-001 && node bin/stuntman.mjs lock
node bin/stuntman.mjs heal F-001 --agent-cmd '<your agent cli> "$(cat {brief})"' --live
node bin/stuntman.mjs verify --live        # kane-cli testmd run, replays from cache
```

Kane uploads runs to your TestMu AI account by default. The demo app is localhost-only with a fake card and email; use a throwaway account if that matters to you.

## The loop

1. **Compile.** `stuntman.json` holds one journey plus *observations* (typed values Kane must `store ... as 'name'`). Each persona pack in `personas/*.json` is a behaviour plus an invariant. The compiler joins them into one plain-English Kane objective.
2. **Audit.** Every persona runs once. Only failures run a second time.
3. **Classify** with the confidence rule below.
4. **Brief.** A confirmed hazard becomes `briefs/F-001.md` + `.json`: behaviour, invariant, expected vs observed, evidence, repro command, a done-when checklist, suspect files, and a *do not* list.
5. **Lock.** `stuntman lock` writes `tests/stuntman-<persona>_test.md` and `stuntman.lock` (contract hashes) **before** the fix, so the agent cannot weaken the test it has to satisfy.
6. **Heal.** Runs your agent command with `{brief}` substituted, then re-audits that persona twice against the locked contract.
7. **Verify.** `kane-cli testmd run` replays the locked test from cache in seconds with no LLM cost.

## The confidence rule

| Situation | Verdict |
|---|---|
| Both usable runs fail with the **same typed value** | **CONFIRMED** (gets a finding id and a brief) |
| One failure, a 1-of-2 flake, two failures with different values (`inconsistent`) | suspected (never a brief) |
| Setup error, timeout, or the observation value is missing | inconclusive (never confirms) |
| First run honours the invariant | clean |

## The cast and journey-aware selection

Stuntman does not run every behaviour blindly. Each persona declares what it `requires`; your `stuntman.json` declares the `capabilities` of the journey (`"personas": ["auto"]`). Personas whose requirements are not met are listed as **not applicable** with the reason, and personas whose invariant needs an observation your journey does not declare are skipped the same way.

| id | behaviour | invariant | needs | status |
|---|---|---|---|---|
| `impatient` | double-clicks Pay | ends on `Order confirmed` | submit-form, creates-record | live-run: clean on `demo/app` |
| `refresher` | reloads while the payment is in flight | ends on `Order confirmed` | submit-form, creates-record | live: clean (weak: Kane cannot truly reload mid-flight) |
| `back-button` | pays, goes Back, submits again | `order_count = 1` | submit-form, creates-record | live: clean |
| `slow-submit` | waits 2 s, retries Pay | `order_count = 1` | submit-form, creates-record | live: inconclusive (not achievable) |
| `returning` | two deliberate purchases (control) | `order_count = 2` | creates-record, checkout | live: inconclusive (timeout) |
| `abandoner` | leaves checkout, returns, pays once | `order_count = 1` | checkout, creates-record | live: clean |
| `stale-total` | changes the cart, goes Back to the old checkout, pays | charge is never more than the total displayed | checkout, creates-record | **live: CONFIRMED on `demo/app`** |
| `chaotic-input` | submits `<b>bold</b> & "quotes" 🚀` | shown exactly as typed | submit-form, echoes-user-text | draft |
| `retry-spammer`, `coupon-abuser` | repeated failed payments; coupon toggling | no stray orders; charge matches display | payment-can-fail / coupons | draft, no app to run on yet |

"Untested live" means the pack exists and the offline pipeline handles it, but it has not been run against real Kane. `refresher`, `slow-submit` and the draft packs may come back inconclusive; that is reported honestly, never as a finding.

**Deliberately not built yet:** network dropout, multi-tab checkout, session expiry and cart edits while a payment is in flight. Kane's agent works one step at a time in one tab and cannot cut the network or expire a session, so these would only ever come back inconclusive.

**Scope:** the engine (journey, observations, invariants, personas with `requires`, two-pass confirmation) is not tied to checkout, and `demo/second` runs a non-checkout journey. But only shop-style and note-style journeys have been exercised, so do not read this as "tests any app". Add a behaviour by dropping a JSON file in `personas/`; `node bin/stuntman.mjs personas` lists them with their requirements.

## Positive control

A clean audit only means something if the detector can also catch a bug. `demo/control/` is a store with a **seeded** double-order bug (written by the builder, labelled as such) plus a repaired twin. Run `cd demo/control && PORT=3001 node app/server.mjs &` then `node ../../bin/stuntman.mjs audit --live --headless`. The main demo (`demo/app`, written by a fresh agent session) is the realistic target; the control proves detection.

## Using a real coding agent

`demo/agent-run.mjs` is the adapter that lets `heal` hand the repair brief to Claude Code, OpenCode or Codex (auto-detected, or force one with `STUNTMAN_AGENT=claude|opencode|codex|api`; `manual` waits while you drive an interactive agent such as the OpenCode interface; `api` calls the Anthropic API with `ANTHROPIC_API_KEY`; `STUNTMAN_AGENT_MODEL` picks the model). While the agent works, the pre-written repair is moved out of its sight, and afterwards the adapter refuses the result if the agent touched the locked contract, changed nothing, or left a file that does not parse. The agent is *told* not to read git history; that cannot be sandboxed.

```bash
cp demo/baseline/server.mjs demo/app/server.mjs     # the unfixed app
export STUNTMAN_AGENT=opencode                       # or claude / codex / api
node bin/stuntman.mjs heal F-001 --agent-cmd 'node demo/agent-run.mjs {brief}' --live --headless
```

## Restarting the app under test

`app.start_cmd` in `stuntman.json` tells `heal` how to start the app. After the repair is applied `heal` stops whatever is listening on the app's port (found through `/proc`, never by matching command lines, so it cannot kill itself), runs the start command detached, waits until `/health` answers, and only then re-audits, so the repaired code is guaranteed to be the code under test instead of depending on a file watcher. Without `restart_cmd` it falls back to a short wait.

## Ground-truth probe

Kane drives the human behaviour and reads what is on screen; it is unreliable at reading an *empty* page (a refused payment leaves an empty orders list). So `app.probe` in `stuntman.json` names an endpoint (the demo store's `/__state`) and a small declarative spec (`count`, `sum`) from which Stuntman derives server-side values such as `order_count` and `charged_total` right after each live run. The probe is authoritative for what it measures; Kane's own reading is kept in the report (`kane_values`, `probe_conflicts`). If the probe fails, Kane's values are used. The spec is data, never code, and the probe is optional: apps without a state endpoint keep working through Kane's reading.

## Commands

```
stuntman init [--force]
stuntman audit [--live|--fixture] [--fixture-state broken|fixed] [--persona id] [--concurrency N]
               [--allow-contract-change] [--force] [--json] [--headless]
stuntman brief F-001 [--run <dir>] [--json]
stuntman lock [--run <dir>] [--force]
stuntman heal F-001 --agent-cmd "<cmd with {brief} {brief_json} {finding_id}>" [--live] [--attempts N] [--settle sec] [--fixture-state fixed]
stuntman verify [--live|--fixture] [--json]
stuntman personas [--json]
stuntman report [--run <dir>] [--open]
```

Exit codes: `0` clean/success · `1` confirmed hazard or failed verify/heal · `2` config, setup or contract error · `3` inconclusive.

## Limitations (read these)

- The contract lock is a **tripwire, not a security boundary**. It makes weakening the test loud and visible in `git diff`; a determined agent with write access can still edit files.
- `--agent-cmd` is arbitrary code and runs with your privileges. Stuntman never builds it from config or app data.
- Kane's agentic runs are stochastic; the two-pass rule reduces false findings but cannot remove them.
- One page per run: no two-tab persona, no network throttling (`slow-submit` uses plain waiting).
- Desktop web only. Windows is expected to work in fixture mode; macOS/Linux are the supported live platforms.
- The demo hazard (paid, then shown an empty cart) is predicted from reading `demo/app/server.mjs`. Whether Kane's agent actually triggers it is unknown until a live run; if `impatient` comes back clean, that is a real result, not a bug in Stuntman.

## Layout

```
bin/stuntman.mjs          CLI entry          src/        compiler, classifier, runners, report, brief, lock, heal, verify
personas/*.json           versioned packs    fixtures/   offline run_end transcripts (broken / fixed)
demo/app/server.mjs       storefront (the demo, not the product)   demo/BRIEF.md  the brief it was built from
demo/patches + agent-fix  reference repair (confirmation on repeat submit) + stand-in agent         demo/second/   second app, other hazard
docs/SUBMISSION.md        submission kit (form answers, video plan, posts)
```

## Documents
`SETUP.md` · `DEPLOY.md` · `TESTING.md` · `BUILD_REPORT.md` · `LIVE_RUN.md`
