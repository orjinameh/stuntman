# Stuntman

**A customer clicked Pay twice. The payment went through. They landed on an empty cart with no confirmation. Your agent's tests passed.**

Your agent tested the happy path. Stuntman plays everyone else.

Stuntman is a zero-dependency Node CLI. It turns one plain-English purchase journey into a cast of adversarial human behaviours (the impatient double-clicker, the refresher, the back-button user), proves which hazards are real in a real browser with [Kane CLI](https://github.com/LambdaTest/kane-cli), hands your coding agent a typed repair brief, and locks every confirmed hazard into a committed `_test.md` that replays for free.

Built for the KaneCLI Online Hackathon (TestMu AI, 12–26 Nov 2026). Judged on Ships, Verified, Closed loop, Craft.

## The cold open

```
persona      sev  verdict    observed                                          runs  finding
───────────  ───  ─────────  ────────────────────────────────────────────────  ────  ───────
impatient    P1   CONFIRMED  final_heading = "Cart" (1 order, $49.00 charged)  2     F-001
refresher    P1   suspected  final_heading = "Cart" (1 order, $49.00 charged)  2     —
back-button  P0   clean     1 order, $49.00 charged                           1     —
slow-submit  P0   clean     1 order, $49.00 charged                           1     —
returning    P2   clean     2 orders, $98.00 charged                          1     —
```

The customer was charged once, correctly, but ended on "Cart" instead of "Order confirmed". Someone who sees an empty cart after paying assumes it failed and may pay again. `refresher` failed once in two runs, so it is only *suspected*: **one failure is not a finding**.

The demo store (`demo/app`) was written by a fresh Claude session from `demo/BRIEF.md`. It already protects against a double charge; the hazard Stuntman targets is the screen the customer is left on. The fixture table is a prediction from reading that code, and only a live Kane run can confirm it.

> **Honesty note.** The table above comes from the offline **fixture mode**: hand-authored files in Kane's documented `run_end` shape, so anyone can reproduce the flow with no account. It is a deterministic demo of the classifier, report, brief, lock and heal loop. It is **not** live Kane evidence, and every report says `FIXTURE` on it. Live mode (`--live`) is implemented against the documented Kane CLI interface but has **not been run against a real Kane install yet**: see `BUILD_REPORT.md` and `LIVE_RUN.md`.

## Quick start (no Kane account, no network)

Node 20+ and git.

```bash
npm test                                          # 40 offline tests
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

## The cast

| id | behaviour | invariant | sev |
|---|---|---|---|
| `impatient` | clicks Pay, clicks again within a second | ends on the page headed `Order confirmed` | P1 |
| `refresher` | reloads while the payment is in flight | ends on the page headed `Order confirmed` | P1 |
| `back-button` | pays, then goes Back and submits again | `order_count = 1` | P0 |
| `slow-submit` | waits two seconds, then retries Pay | `order_count = 1` | P0 |
| `returning` | two deliberate purchases (control) | `order_count = 2` | P2 |

Add a behaviour by dropping a JSON file in `personas/`: no code change. `node bin/stuntman.mjs personas` lists them. `demo/second/` is a second app with a different hazard class (a delete that comes back after reload) and its own persona, run with `cd demo/second && node ../../bin/stuntman.mjs audit --fixture-state broken`.

## Commands

```
stuntman init [--force]
stuntman audit [--live|--fixture] [--fixture-state broken|fixed] [--persona id] [--concurrency N]
               [--allow-contract-change] [--force] [--json] [--headless]
stuntman brief F-001 [--run <dir>] [--json]
stuntman lock [--run <dir>] [--force]
stuntman heal F-001 --agent-cmd "<cmd with {brief} {brief_json} {finding_id}>" [--live] [--fixture-state fixed]
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
docs/idea-forge/          brief and handoff this was built from
```

## Documents
`SETUP.md` · `DEPLOY.md` · `TESTING.md` · `BUILD_REPORT.md` · `LIVE_RUN.md`
