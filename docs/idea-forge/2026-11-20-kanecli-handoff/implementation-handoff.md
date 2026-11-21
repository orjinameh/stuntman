# Stuntman — Implementation Handoff

Event: KaneCLI Online Hackathon (TestMu AI) · Deadline: 2026-11-26 23:59 IST (18:29 UTC) · Handoff version: 1 · Date: 2026-11-21
Builder: one implementation agent working from this document alone. It has no access to the ideation conversation.

## 1. Mission

Build **Stuntman**, a zero-dependency Node CLI that turns one plain-English purchase journey into a cast of adversarial human performances, runs each performance against a real web app through Kane CLI, and proves which behaviours break a business invariant. A confirmed hazard becomes a typed finding, a machine-readable repair brief for a coding agent, and a committed `_test.md` that replays for free. The repo also contains a small storefront whose only defence against duplicate submission is the one the coding agent forgot to write; that storefront is the demo, not the product.

Done means: a clean clone runs `npm test` offline, then `node bin/stuntman.mjs audit --fixture-state broken` produces the confirmed double-order finding, `brief` emits the repair brief, `heal` hands it to an agent command and re-audits, and `lock` writes a replayable Kane test. A judge opens the README, sees the one-command quick start, the report, and the honest confidence rule, and can reproduce the whole flow without a Kane account in fixture mode.

The first thing a judge should open is `README.md`, then `runs/<timestamp>/report.html` from the recorded demo. The README must lead with the customer being charged twice, not with the word "persona".

## 2. Event and judging

- Event, URL, track(s): KaneCLI Online Hackathon, https://www.kaneclihack.sh/, hosted by TestMu AI (formerly LambdaTest), 12–26 Nov 2026. Primary track: **Workflow**; demo surface: **desktop web**. The event is worldwide, solo or teams of up to four, 18+.
- Published judging criteria (all four weighted equally, averaged, ties break on Verified then Closed loop):
  - **Ships — 25%** — a real flow that runs end to end, not slides. Stuntman ships a CLI, a local storefront, fixtures, and a recorded live run.
  - **Verified — 25%** — Kane caught or confirmed something meaningful. Stuntman proves a second order and a second charge with a typed `order_count` and a sealed pack.
  - **Closed loop — 25%** — Kane's result feeds back to the agent, tighter is better. Stuntman turns `run_end` into a repair brief, invokes an agent command, re-audits the same persona, and locks the fix as a test.
  - **Craft — 25%** — would a developer install it tonight? One command, zero runtime dependencies, a report with a screenshot, and a test that replays without LLM cost.
- Prizes / sponsor goals: 1st $1,500, 2nd $1,000, 3rd $500, each with $250 in OpenAI credits; winners also get a founder 1:1, three months of Kane CLI Pro, and a featured blog post. Every valid shipper gets a "Verified with Kane CLI" badge. The sponsor's goal is evidence that Kane is the validation layer for agent-written software.
- Submission requirements: a **public GitHub repository initialised on or after 12 Nov 2026** with a real commit history; a **3–5 minute YouTube demo**; at least **two public launch posts** (Hacker News, X, Reddit, or LinkedIn); the submission form; and a TestMu AI account that claimed the **10,000 free Kane credits** with the same email used for the hackathon. No pushes after 23:59 IST on 26 Nov. The repo must let judges run the project; a hosted demo is optional.

Source for every line above: https://www.kaneclihack.sh/ (retrieved 2026-11-21, E3).

## 3. Problem

An agent asked to "build a checkout" builds the checkout it was asked for. It clicks Pay once, on a fast connection, in one tab, as a first-time buyer. Its own tests pass. Then a real customer clicks Pay twice because the spinner looked stuck, reloads mid-flow, navigates back after paying, or returns later and submits again. The app creates a second order and a second charge.

This is not a code-review problem. It is a **missing test-author problem**: nobody wrote down what an impatient, distracted, or returning human does, so nothing ever performed it. The failure class is expensive enough that Stripe ships idempotency keys specifically to prevent duplicate charges on retry (https://docs.stripe.com/api/idempotent_requests, retrieved 2026-11-21, E3). The hackathon's own premise is that agents write code faster than anyone can verify it (https://www.kaneclihack.sh/, retrieved 2026-11-21, E3).

**Who hurts, repeatedly:** solo builders and small agencies shipping agent-built stores with no QA function and no test suite; platform teams using coding agents that can generate a flow in minutes but cannot generate the humans who will break it. Existing tools start from a filed bug (Gremlin), a security checklist (DappSentinel), one scripted shopper (Cartwalk), or a monitor (ShipProof). None starts from the absence of a report. That is the gap.

## 4. Solution and differentiation

- **Solution (one line):** Stuntman compiles one journey into a cast of adversarial human behaviours, proves which hazards are real with Kane, hands the coding agent a typed repair brief, and locks every confirmed hazard into a committable test that replays for free.
- **Novelty — conceptual:** Personas are an established testing metaphor at the code level (`drugpl/bbq`, https://github.com/drugpl/bbq, retrieved 2026-11-21, E3) and a marketing-research technique (CrowdMind, https://github.com/Brokenwatch24/crowdmind, retrieved 2026-11-21, E3). The framing "a persona is a human behaviour times an invariant, compiled into a browser objective with a typed extraction" was not found; the word is not new and must not be sold as new.
- **Novelty — product:** No browser-level product was found that compiles a journey into hostile human performances and proves the resulting hazards. Ten queries and four direct fetches; the absence is E2 (negative search), not proof. The nearest products start from a known bug, one scripted user, or a commit diff.
- **Novelty — execution:** No competitor demonstrated a typed duplicate-order proof under an impatient double click, a confidence rule that refuses to report a one-of-two flake, and a confirmed hazard that becomes a committed zero-cost test in the same loop. Gremlin owns the fix loop; Cartwalk owns the shopper; Stuntman owns the human who was never tested.

### Prior art and what we do differently

| Project — URL — what it does — our edge |
|---|
| **Gremlin** — https://github.com/SCARPxVeNOM/gremlin — every filed bug becomes a failing test, a fix, and a regression test, with Kane as referee. We start before the bug report exists and generate the human who would have filed it. |
| **Cartwalk** — https://github.com/ibnweb3/cartwalk — Kane acts as one shopper; plain code judges cart arithmetic. We run a cast of behaviours with typed invariants and hand the result to an agent. |
| **DappSentinel** — https://github.com/Guzman0/DappSentinel — a pre-launch security gate with anti-cheating and public proof. Different surface, different output: a repair brief and a permanent test, not a block. |
| **ShipProof** — https://github.com/prathamxeth/ShipProof — a 24/7 store guardian with closed-loop self-healing. We discover new hazards on demand; we are not a monitor. |
| **Meticulous** — https://www.meticulous.ai/ — deterministic behavioural verification on every commit. It diffs commits; we simulate humans and produce a test, not a diff. |
| **Momentic** — https://momentic.ai/ — AI QA that explores, writes, runs, and repairs tests. Enterprise-shaped test generation, no human-behaviour cast and no repair brief for a coding agent. |
| **QA Wolf** — https://www.qawolf.com/ — parallel end-to-end test factory. A service, not an installable CLI, and not behaviour discovery. |

All URLs retrieved 2026-11-20 or 2026-11-21. Full evidence table with grades is in the submission notes; the claims above are E3 for each page fetched.

### Head-to-head on judging criteria

| Criterion | Result vs strongest prior art | Demonstrable reason |
|---|---|---|
| **Ships** | **Win** | One local app, one journey, one binary; the fixture path runs from a clean clone with no account. Gremlin needs a filed issue and a repo workflow; Meticulous needs a baseline and a hosted service. |
| **Verified** | **Win** | The finding is typed: `order_count = 2` and `charged_total = $98.00`, with the sealed pack and the screenshot. Cartwalk's arithmetic proof is narrower; a diff is not a defect. |
| **Closed loop** | **Tie with Gremlin, win on discovery** | Gremlin's issue-to-regression loop is the benchmark; Stuntman matches it and starts from discovery, then locks the hazard as a replayable test the agent cannot quietly weaken. |
| **Craft** | **Win** | `node bin/stuntman.mjs audit` against a URL, a report a human can read, five persona packs, and a free replay. No account, no dashboard, no enterprise onboarding. |

## 5. Users and flows

**Actor:** a solo builder or platform engineer who has an agent-built web app and one critical journey in mind. **Trigger:** they are about to ship, or an agent has just said "done".

1. **First run, no Kane account (fixture mode).**
   Actor runs `npm test`, then `node bin/stuntman.mjs audit --fixture-state broken` in a clean clone. Stuntman compiles five persona objectives, replays eight recorded NDJSON runs, classifies them, prints a lane table, writes `runs/<timestamp>/report.html`, and exits 1. Visible result: `impatient` is **CONFIRMED** with `2 orders, $98.00 charged`; `refresher` is **suspected** (one of two runs failed); three personas are clean. The report carries a `FIXTURE` badge.

2. **Live audit.**
   Actor installs Kane (`npm install -g @testmuai/kane-cli`), runs `kane-cli login`, starts the demo app (`node demo/app/server.mjs`), and runs `node bin/stuntman.mjs audit --live`. Stuntman spawns `kane-cli run "<objective>" --agent --url ... --max-steps 40 --timeout 180` for each persona, parses the NDJSON `run_end` event, repeats only the failures, and prints the same table with a `LIVE` badge. Visible result: the same finding, backed by a `session_dir`, a sealed `.evidence` pack, and a screenshot embedded in the report.

3. **Repair loop.**
   Actor runs `node bin/stuntman.mjs brief F-001`. Stuntman writes `runs/<timestamp>/briefs/F-001.md` and `F-001.json`. Actor runs `node bin/stuntman.mjs heal F-001 --agent-cmd '<agent command> {brief}'`. Stuntman substitutes the absolute brief path, runs the command in the project root, then re-audits only the `impatient` persona twice. Visible result: `heal` exits 0 and prints `CLEAN — the hazard is no longer reproducible`; if the hazard survives, it exits 1 and says so.

4. **Lock.**
   Actor runs `node bin/stuntman.mjs lock`. Stuntman writes `tests/stuntman-impatient_test.md` with `mode: testing`, `url`, `tags: [stuntman, impatient, p0]`, `max_steps`, `timeout`, and prose steps, then writes `stuntman.lock` with the contract hashes. Visible result: a committable test plus a lock file; `git diff` shows exactly what was locked.

5. **Verify.**
   Actor runs `node bin/stuntman.mjs verify --live`. Stuntman runs `kane-cli testmd run tests/stuntman-impatient_test.md --agent` and parses the `test_md_done` event. Visible result: `PASS` in seconds on a replayed test, with a Test Manager link and a pack in `.testmuai/evidence/`. With `--fixture`, the same command replays the recorded fixture and prints `replayed from fixture`.

6. **CI / pre-push.**
   Actor adds the shipped GitHub Actions workflow (or runs `npm run check`). Fixture tests run on every push with no secrets; a manual `workflow_dispatch` job runs the live audit with `LT_USERNAME` and `LT_ACCESS_KEY` secrets. Visible result: a red check when a locked hazard regresses.

## 6. Features

### F-01 CLI skeleton, config, and init [MUST]

`bin/stuntman.mjs` dispatches `init`, `audit`, `brief`, `heal`, `lock`, `verify`, `personas`, and `report`. `stuntman init` writes a valid `stuntman.json` with the demo defaults and refuses to overwrite without `--force`. Config validation checks required keys, `base_url` is http(s), persona ids exist, every invariant references a declared observation, and budget numbers are positive. Unknown commands print usage and exit 2. Covers AC-01, AC-23.

### F-02 Journey and observation compiler [MUST]

`src/compile.mjs` turns the journey, one persona pack, and the observations into a single plain-English Kane objective. The objective always contains: the start URL, every journey step in order, the persona behaviour sentence, every observation instruction with an explicit `store ... as '<name>'`, the invariant assertion, and a stop instruction that forbids retrying or fixing. The compiler refuses to compile when an invariant names an observation that does not exist, when a persona has no behaviour, or when an observation instruction lacks a `store as` clause. Covers AC-02, AC-03.

### F-03 Versioned persona library [MUST]

Five JSON packs ship in `personas/`: `impatient`, `refresher`, `back-button`, `slow-submit`, `returning`. Each has `id`, `version`, `name`, `behaviour`, `severity`, `invariant` (`observation`, `equals`, `reason`), and `notes`. The library is loaded by id; an unknown id is a config error that lists the available ids. The persona file is the product artefact: adding a behaviour must not require a code change. Covers AC-23.

### F-04 Live Kane runner [MUST]

`src/kane/runner.mjs` spawns `kane-cli` with `run`, the objective, `--agent`, `--url`, `--max-steps`, and `--timeout`. It adds `--headless` when `KANE_HEADLESS=1` or `--headless` is passed. It reads stdout line by line, ignores untyped progress events, keeps the last `run_end`, captures stderr, and enforces a Node-side kill timer at `timeout + 30s`. It records the exit code and maps 0 pass, 1 fail, 2 error, 3 timeout. A missing binary produces a clear setup error, not a stack trace. Covers AC-05, AC-06, AC-07.

### F-05 Fixture runner, the default [MUST]

`src/kane/fixture.mjs` replays NDJSON files from `fixtures/<journey>/<state>/<persona>.run<N>.ndjson` with a small delay so the terminal shows progress. Fixture mode is the default; `--live` or `STUNTMAN_MODE=live` switches. The runner synthesises the same run record shape as the live runner, with `session_dir` set to a `fixtures://` pseudo-path. Fixture mode requires no network, no Kane install, and no Chrome. Covers AC-04, AC-27.

### F-06 Two-pass audit and confidence rule [MUST]

The first pass runs every selected persona once. Only failures are repeated once. A hazard is **CONFIRMED** only when both usable runs fail with the same typed invariant violation, or with the same normalized reason. One failure is **SUSPECTED** and never produces a brief. Two failures with different values are suspected and labelled `inconsistent`. A setup error (exit 2) or timeout (exit 3) is **INCONCLUSIVE** and never confirms. A missing observation value is never confirmed. Covers AC-08, AC-09.

### F-07 Terminal and JSON results [MUST]

`src/report.mjs` prints a lane table with persona, severity, verdict, observed value, run count, duration, and credits. It writes `runs/<timestamp>/report.json` with the full schema: mode, app, journey, contract hash, git commit, timestamps, summary counts, per-persona runs, evidence paths, and finding ids. It copies every raw NDJSON transcript into `runs/<timestamp>/raw/`. It exits 1 when at least one hazard is confirmed, 0 when none is, and 2 on a configuration or setup error. Covers AC-10.

### F-08 Self-contained HTML report [MUST]

`report.html` is one file with inline CSS and base64 images. It has a header with the app, journey, commit, timestamp, and a `LIVE` or `FIXTURE` badge; a summary; a lane table; a finding card with expected versus observed, the evidence list, the repro command, and the next command; and a short "how to read this" section that states the confidence rule. It makes no external requests: no fonts, no scripts, no CDN. Covers AC-11, AC-27.

### F-09 Evidence extraction from the sealed pack [SHOULD]

When a live `run_end` provides `session_dir`, `src/evidence.mjs` looks for `session_dir/evidence/*.evidence`, lists it with `unzip -l`, picks the last `tests/*/steps/*/screenshot.png`, extracts it with `unzip -p`, and embeds it as a base64 image in the report. If `unzip` is missing or the pack has no screenshot, the report omits the image and links the pack path; it never fails the audit. Covers AC-30.

### F-10 Repair brief [MUST]

`stuntman brief F-001` reads the run report and writes `briefs/F-001.md` and `briefs/F-001.json`. The Markdown is addressed to a coding agent and contains: the human behaviour, the invariant, expected versus observed with units, the evidence paths and run ids, the exact repro command, a checklist of conditions that must hold when done, the files most likely involved, and a "do not" list that forbids changing the contract, the persona, or the locked test. The JSON carries the same fields for machine use. Covers AC-12.

### F-11 Heal loop [MUST]

`stuntman heal F-001 --agent-cmd "<command>"` writes the brief, substitutes `{brief}`, `{brief_json}`, and `{finding_id}` in the command, runs it with `shell: true` and inherited stdio in the project root, and then re-audits only the finding's persona twice. It exits 0 with `CLEAN` when the hazard is gone, 1 with `STILL REPRODUCIBLE` when it is confirmed again, and 2 when the agent command fails or the re-audit is inconclusive. It never edits product code itself. Covers AC-13, AC-14.

### F-12 Test lock and contract hash [MUST]

`stuntman lock` writes one `tests/stuntman-<persona>_test.md` per confirmed hazard. The frontmatter uses only documented Kane keys: `mode: testing`, `url`, `tags`, `max_steps`, `timeout`, `code_export: false`. The body has an H1 title and one H2 per step, with the persona behaviour as its own step and the observation plus assertion as the final step. `stuntman.lock` stores `contract_hash`, per-section hashes (`journey`, `observations`, `personas`), `audited_commit`, `created_at`, persona versions, and the test paths. `audit` recomputes the hashes and refuses to run on a mismatch, naming the changed section; `--allow-contract-change` overrides. The README states plainly that this is a tripwire, not a security boundary. Covers AC-15, AC-16, AC-17.

### F-13 Verify locked tests [SHOULD]

`stuntman verify --live` runs each locked test with `kane-cli testmd run <path> --agent`, waits for the `test_md_done` event, reads `overall_status`, and prints PASS or FAIL per test with the duration and the share URL when present. `--fixture` replays the fixed fixture for each locked persona and prints `replayed from fixture`. Exit 0 when all pass, 1 when any fails, 2 when Kane is unavailable. Covers AC-18, AC-19, AC-29.

### F-14 Demo storefront [MUST]

`demo/app/server.mjs` is a zero-dependency Node HTTP server with in-memory state and three seeded products: Harbor Mug $49.00, Field Notebook $12.00, Canvas Tote $28.00. Routes: `GET /`, `GET /cart`, `GET /checkout`, `POST /cart/add`, `POST /api/orders`, `GET /orders`, `GET /orders/:id`, `GET /__state`, `POST /admin/reset`, `GET /health`. Checkout takes an email and a test card, posts to `/api/orders`, creates one order and one charge, clears the cart, and redirects to a confirmation page that says `Order confirmed`. The Pay button is a normal submit and is not disabled while the request is in flight. The server deliberately has no idempotency key: the brief it was built from never asked for one. Covers AC-20, AC-21.

### F-15 Reference patch and reference agent [MUST]

`demo/patches/0001-idempotent-checkout.patch` is a real unified diff that adds a single-use checkout nonce and makes a repeated POST with the same nonce redirect to the existing order instead of creating a second one. `demo/agent-fix.mjs` is a reference agent command that reads the brief JSON, checks the finding id, and applies the patch; it exists for the automated test suite and the offline fallback, and the README labels it as a stand-in, not as the live demo's agent. The patch must apply cleanly with `git apply` and must make the double-POST test produce one order. Covers AC-22.

### F-16 Budget guard [SHOULD]

Before a live audit, `stuntman audit` prints an estimate: `ceil(personas × 1.5 × estimated_credits_per_run)` credits. It refuses to start when the estimate exceeds `budget.max_credits`, unless `--force` is passed. During the run it sums reported credits and stops scheduling new runs when the ceiling is reached, marking the remaining personas `skipped (budget)`. Covers AC-26.

### F-17 Second app for generality [SHOULD]

`demo/second/` is a second tiny app built from `demo/SECOND_BRIEF.md` with a different hazard class: a delete that removes the note from the rendered list but not from the store, so a refresh restores it. A second journey and a second observation prove that Stuntman is not hard-coded to the storefront. If this is cut for time, the video must say "one app, one hazard class" and must not claim generality. Covers AC-28.

### F-18 CI workflow [COULD]

`.github/workflows/ci.yml` runs `npm test` and the fixture audit on push and pull request, with no secrets. A second job, `workflow_dispatch` only, runs the live audit with `LT_USERNAME` and `LT_ACCESS_KEY` from repository secrets and uploads the report as an artefact.

### F-19 Machine-readable audit output [COULD]

`audit --json` prints the report JSON to stdout and suppresses the human table, so the CLI can be piped into another agent without parsing prose. Errors still go to stderr.

### F-20 Persona listing [COULD]

`stuntman personas` prints a table of id, name, severity, invariant, and version, and `--json` returns the same data. This is the discovery surface for the library.

## 7. Architecture

**Shape:** a local CLI with a pluggable runner, a compiler, a classifier, and three artefacts: the report, the brief, and the lock. No server, no database, no queue. The only network call is the child process that runs Kane; the demo app is local.

```
bin/stuntman.mjs
  └─ src/cli.mjs ── init | audit | brief | heal | lock | verify | personas | report
       ├─ src/config.mjs        load + validate stuntman.json, resolve personas
       ├─ src/compile.mjs       journey + persona + observations -> objective
       ├─ src/kane/runner.mjs   spawn kane-cli, parse NDJSON, return run record
       ├─ src/kane/fixture.mjs  replay NDJSON fixtures (default)
       ├─ src/classify.mjs      pass/fail/error/timeout -> confirmed/suspected/clean
       ├─ src/evidence.mjs      optional screenshot extraction from .evidence
       ├─ src/report.mjs        report.json + report.html + terminal table
       ├─ src/brief.mjs         briefs/F-00N.md + .json
       ├─ src/heal.mjs          run agent command, re-audit one persona
       ├─ src/lock.mjs          tests/*_test.md + stuntman.lock
       └─ src/verify.mjs        testmd run / fixture replay
demo/app/server.mjs            local storefront (the demo, not the product)
demo/agent-fix.mjs             reference agent command (tests + fallback)
personas/*.json                five versioned packs
fixtures/buy-a-mug/**/*.ndjson recorded runs for offline mode
tests/*_test.md                generated by lock
```

**Sequence for the money-shot flow**

```
audit --live
  ├─ load config, recompute contract hashes, compare with stuntman.lock
  ├─ compile 5 objectives
  ├─ pass 1: run each persona once  ──> kane-cli run ... --agent ──> run_end
  ├─ pass 2: rerun only failures    ──> kane-cli run ... --agent ──> run_end
  ├─ classify: confirmed / suspected / clean / inconclusive
  ├─ write report.json, report.html, raw/*.ndjson
  └─ exit 1 if confirmed
brief F-001
  └─ report.json ──> briefs/F-001.md + F-001.json
heal F-001 --agent-cmd "agent {brief}"
  ├─ spawn agent in project root
  └─ rerun impatient twice ──> clean? exit 0 : exit 1
lock
  ├─ confirmed findings ──> tests/stuntman-impatient_test.md
  └─ hashes ──> stuntman.lock
verify --live
  └─ kane-cli testmd run tests/stuntman-impatient_test.md --agent ──> test_md_done
```

**Data model**

`stuntman.json`:

```json
{
  "version": 1,
  "app": { "name": "Corner Store", "base_url": "http://localhost:3000" },
  "journey": {
    "id": "buy-a-mug",
    "title": "Buy a mug as a guest",
    "entry": "/",
    "steps": [
      "Add the \"Harbor Mug\" to the cart.",
      "Open the cart and continue to checkout.",
      "Enter buyer@example.test as the email and pay with the test card 4242 4242 4242 4242."
    ],
    "success_text": "Order confirmed"
  },
  "observations": [
    {
      "name": "order_count",
      "url": "/orders",
      "instruction": "Count the order rows on the orders page and store the number as 'order_count'."
    },
    {
      "name": "charged_total",
      "url": "/orders",
      "instruction": "Add up every charge amount shown on the orders page and store the total as 'charged_total'."
    }
  ],
  "personas": ["impatient", "refresher", "back-button", "slow-submit", "returning"],
  "budget": {
    "max_credits": 400,
    "estimated_credits_per_run": 25,
    "max_steps": 40,
    "timeout_seconds": 180
  },
  "kane": { "bin": "kane-cli", "headless": false }
}
```

Persona pack (`personas/impatient.json`):

```json
{
  "id": "impatient",
  "version": "1.0.0",
  "name": "Impatient customer",
  "behaviour": "You are an impatient customer. Click the Pay button once, then click it again within one second because the spinner makes you think the first click did not register.",
  "severity": "P0",
  "invariant": {
    "observation": "order_count",
    "equals": 1,
    "reason": "One purchase intent must create exactly one order."
  },
  "notes": "The second click happens while the first request is still in flight. Do not wait for the confirmation page before clicking again."
}
```

Run record (internal, one per Kane invocation):

```json
{
  "persona": "impatient",
  "index": 1,
  "exit_code": 1,
  "status": "failed",
  "reason": "Assertion failed: order_count was 2, expected 1",
  "value": "2",
  "values": { "order_count": "2", "charged_total": "$98.00" },
  "duration": 41.2,
  "credits": 18,
  "session_dir": "~/.testmuai/kaneai/sessions/abc123",
  "raw_path": "runs/20261123-142233/raw/impatient.run1.ndjson"
}
```

Report JSON: `{ schema, mode, app, journey, commit, started_at, finished_at, contract_hash, summary: { confirmed, suspected, clean, inconclusive, skipped, credits }, personas: [ { id, name, severity, verdict, basis, invariant, runs, finding_id } ] }`.

Brief JSON: `{ schema, finding_id, persona, severity, title, behaviour, invariant, observed, evidence, reproduce, acceptance, suspects, do_not }`.

Lock file: `{ schema, contract_hash, journey_hash, observations_hash, personas_hash, audited_commit, created_at, personas: [{ id, version }], tests: ["tests/stuntman-impatient_test.md"] }`.

**CLI surface**

```
stuntman init [--force]
stuntman audit [--live|--fixture] [--fixture-state broken|fixed] [--persona id]
               [--concurrency N] [--allow-contract-change] [--force] [--json]
stuntman brief F-001 [--run <dir>] [--json]
stuntman heal F-001 --agent-cmd "<cmd>" [--run <dir>] [--fixture-state fixed]
stuntman lock [--run <dir>] [--force]
stuntman verify [--live|--fixture] [--json]
stuntman personas [--json]
stuntman report [--run <dir>] [--open]
```

Exit codes: 0 clean or success, 1 confirmed hazard or failed verify or failed heal, 2 configuration/setup/contract error, 3 timeout or inconclusive.

## 8. Tech stack

- **Node.js 20 LTS or newer** (`engines: ">=20"`), ES modules, no build step. Node 20 is the oldest line that ships a stable `node:test` and `fetch`; the code uses only `node:fs`, `node:path`, `node:url`, `node:crypto`, `node:http`, `node:child_process`, `node:test`, and `node:assert`.
- **Zero runtime dependencies.** `npm ls --prod` must be empty. No YAML parser: the config and personas are JSON, which keeps the CLI installable from a single `npm install -g .` and removes a whole class of parser bugs.
- **No TypeScript.** Plain JavaScript with JSDoc type comments. One implementation session, no compile step, and `node --test` runs the source directly. This is a deliberate scope decision, not a preference against types.
- **Kane CLI 0.10.7** (`@testmuai/kane-cli`, npm, retrieved 2026-11-21), installed globally by the user, not vendored. Node 18+ is Kane's requirement; this project's Node 20+ floor is stricter.
- **Google Chrome stable**, required by Kane for desktop web. `--headless` is used in CI.
- **HTML/CSS handwritten**, inline in the report template. No framework, no chart library, no fonts.
- **`unzip`** (optional) for screenshot extraction. macOS and Linux ship it; Windows users can skip it and still get the full report.
- **Git 2.40+** for `git rev-parse`, `git apply`, and the commit history the event requires.
- **GitHub Actions** for the optional CI workflow. No hosting, no database, no queue.

Why this stack: the event rewards installability and a tight loop. Every dependency is a reason a judge cannot run the project in one command. The only external moving part is Kane itself, and fixture mode removes even that for the first run.

## 9. Integrations and technical references

### I-01 Kane CLI — objective runs

- Docs: https://github.com/LambdaTest/kane-cli
- Retrieved: 2026-11-21
- Verified: yes
- Auth / limits / SDK version: `@testmuai/kane-cli` **0.10.7** on npm; Node 18+; Google Chrome stable is required, found at the standard path or via `KANE_CLI_CHROME_PATH`; authenticate with `kane-cli login` (interactive OAuth) or `kane-cli login --username <user> --access-key <key>` (access key from the TestMu AI dashboard under Settings, then Keys); `kane-cli whoami` reports auth state; `kane-cli balance` reports credits. Published run examples cost roughly 9–40 credits; the hackathon grants 10,000. `kane-cli run` is desktop web by default; native mobile needs macOS Apple Silicon or a paid real-device plan and is out of scope.
- Endpoints / signatures used (copied from the docs):
  - `kane-cli run "<objective>" --agent --url <url> --max-steps <n> --timeout <s>`
  - `--agent` writes one JSON object per line to stdout; the progress UI goes to stderr. Script against `run_end`, not the untyped progress events.
  - `run_end` fields: `type`, `status` (`passed` or `failed`), `summary`, `one_liner`, `reason`, `duration`, `credits`, `final_state`, `context`, `session_dir`, `run_dir`, `test_url`.
  - Exit codes: `0` passed, `1` failed, `2` error (auth, setup, infrastructure), `3` timeout or cancelled.
  - Extraction rule: values persist **only** when the objective says "store ... as 'name'". "Read", "report", and "tell me" observe but do not capture. `final_state` is a map of every extracted value.
  - Flags used: `--agent`, `--headless`, `--max-steps` (default 50), `--timeout` (seconds), `--url`, `--mode` (`action` or `testing`). Flags deliberately not used: `--cdp-endpoint`, `--ws-endpoint`, `--target`, `--name`, `--bug-detection`, `--variables`.
- Mock mode: `src/kane/fixture.mjs` replays `fixtures/<journey>/<state>/<persona>.run<N>.ndjson`. It synthesises the same run record, with `session_dir` set to `fixtures://...`. Fixture mode is the default and passes offline.
- Live mode: `--live` or `STUNTMAN_MODE=live`. Requires `kane-cli` on `PATH` (or `KANE_BIN`), an authenticated profile, and Chrome. `KANE_HEADLESS=1` adds `--headless`. `KANE_TIMEOUT_GRACE_MS` overrides the 30-second Node-side kill grace.
- If unavailable: fixture mode ships and is the default; the report carries a `FIXTURE` badge and never presents fixture results as live evidence.

### I-02 Kane saved tests — testmd and verify

- Docs: https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/testmd/overview.md
- Retrieved: 2026-11-21
- Verified: yes
- Auth / limits / SDK version: same Kane install and profile as I-01. A `_test.md` run records each step on first execution and **replays from cache in seconds with no LLM cost** after that. `kane-cli testmd run` always copies its sealed pack into `.testmuai/evidence/`. Recordings live in `output-<stem>/` next to the test and should be committed so teammates and CI replay the same recordings.
- Endpoints / signatures used (copied from the docs):
  - `kane-cli testmd run <path> --agent`
  - Frontmatter keys accepted: `mode` (`action` or `testing`), `url`, `tags` (list, bracketed inline list, or comma string), `max_steps`, `timeout`, `code_export`, `code_language`, `headless`, and the mobile keys. Unknown keys are rejected with `unknown config key: <key>`.
  - Body: `# Title` is decorative; every step is a `## Step heading` followed by a prose objective or a single `@import <path>` line, not both. An optional fenced YAML block under a heading overrides `max_steps`, `timeout`, and `optional` for that step.
  - Files ending in `_test.md` are tests and entry points; other Markdown files are helpers reachable only through `@import`.
  - In `--agent` mode, wait for **`test_md_done`** (file-level `overall_status`, `duration_s`, `session_id`, optional `share_url`) and the process exit. Individual `run_end` events do not complete the file.
  - Exit codes: `0` passed, `1` at least one non-optional step failed, `2` error before or during the run, `3` cancelled or timed out.
  - Batch alternative (not used by the default verify path): `kane-cli testrun run --tags stuntman --parallel 2 < /dev/null`; `testrun run` emits NDJSON when stdin is not a TTY, and the first line is `stream_start`.
- Mock mode: `verify --fixture` replays `fixtures/<journey>/fixed/<persona>.run1.ndjson` and prints `replayed from fixture`.
- Live mode: `verify --live` runs each locked test with `testmd run --agent` and parses `test_md_done`.
- If unavailable: `verify` prints the exact command it would run and exits 2; the locked test files remain valid and can be run by hand.

### I-03 Kane evidence packs

- Docs: https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/evidence.md
- Retrieved: 2026-11-21
- Verified: yes
- Auth / limits / SDK version: same Kane install. Every run seals one `.evidence` file, which is a standard zip. It contains `run.yaml`, `failure.yaml`, and `tests/<test-id>/` with `test.md`, `result.yaml`, `logs/` (`tui.log`, `<n>-run.log`, `<n>-actions.ndjson`, `<n>-console.ndjson`, `<n>-network.har`), `steps/<ordinal>-<step-id>/` (`screenshot.png`, `annotated.png`, `step.json`, and `failure.yaml` on failures), `auteur/execution.json`, and `v16-trajectory/`.
- Endpoints / signatures used (copied from the docs):
  - Packs live at `~/.testmuai/kaneai/sessions/<session-id>/evidence/<execution_id>.evidence`; named `run` sessions and all `testmd` runs also copy to `<cwd>/.testmuai/evidence/`.
  - `kane-cli evidence serve <path>` starts a local-only server and prints a hosted-viewer URL that reads the pack from this machine; nothing is uploaded. Exit `0` on clean shutdown, `2` on bad input or a port that cannot bind.
  - `kane-cli evidence validate <execution-id-or-path>` checks integrity and completeness.
  - `kane-cli evidence merge <targets...> --run-id <id>` combines packs.
  - `unzip -l <pack>` lists entries; `unzip -p <pack> <entry>` prints one entry.
- Mock mode: fixture runs use `fixtures://` pseudo-paths; the report disables the viewer link and never unzips anything.
- Live mode: the report reads `session_dir` from `run_end`, finds the newest `.evidence` under `session_dir/evidence/`, optionally extracts the last step screenshot with `unzip`, and always records the pack path.
- If unavailable: the report still shows the typed values, the raw NDJSON, and the `session_dir`; the screenshot is best-effort.

### I-04 Local demo storefront (Node HTTP)

- Docs: https://nodejs.org/api/http.html
- Retrieved: 2026-11-21
- Verified: yes
- Auth / limits / SDK version: Node 20+ built-in `node:http`, no dependencies, localhost only. In-memory state; no database, no external payment provider, no real card data. The test card is a fixed string and is never sent anywhere.
- Endpoints / signatures used (this project's contract):
  - `GET /` storefront with the three products.
  - `GET /cart`, `POST /cart/add` (form field `product_id`), `GET /checkout`.
  - `POST /api/orders` (form fields `email`, `card`, `nonce`) creates an order and a charge, clears the cart, and responds `303` to `/orders/<id>`.
  - `GET /orders/<id>` confirmation with `Order confirmed`; `GET /orders` lists every order with id, total, timestamp, and charge amount.
  - `GET /__state` returns `{ products, cart, orders, charges }` as JSON for tests.
  - `POST /admin/reset` resets the state to the seed.
  - `GET /health` returns `{ ok: true }`.
- Mock mode: the storefront is local and deterministic; `POST /admin/reset` restores the seed between tests.
- Live mode: `node demo/app/server.mjs` with `PORT` (default 3000). It is the app under test, not an external service.
- If unavailable: the repo ships the app and its tests; there is no external dependency to lose.

### I-05 Agent command bridge (user-supplied)

- Docs: https://nodejs.org/api/child_process.html
- Retrieved: 2026-11-21
- Verified: yes
- Auth / limits / SDK version: Node built-in `node:child_process.spawn` with `shell: true`, inherited stdio, and the project root as cwd. The command is supplied by the user at runtime; Stuntman does not ship an agent or call a model API. The command must accept a brief path and exit 0 on success. Substitutions: `{brief}`, `{brief_json}`, `{finding_id}`.
- Endpoints / signatures used (this project's contract):
  - `spawn(command, { shell: true, cwd: projectRoot, stdio: 'inherit', env: process.env })`
  - The brief path is quoted before substitution; values from the brief are never interpolated into the command.
  - Exit 0 means the agent claims success; any other exit is a failed heal and is reported as such.
- Mock mode: `node demo/agent-fix.mjs {brief}` applies the reference patch. It is used by the test suite and the offline fallback, and the README labels it as a stand-in.
- Live mode: the user's own agent command, for example a coding-agent CLI in non-interactive mode. The README shows the contract and one generic example, not a vendor-specific flag.
- If unavailable: `heal` can be skipped; the brief is still a valid artefact a human can paste into any agent, and `lock` still works from the confirmed report.

## 10. Implementation plan

### P1 Skeleton, compiler, fixtures, and the failing report

- Priority: P0 must-ship
- Deadline: 2026-11-22
- Deliverables: `package.json`, `bin/stuntman.mjs`, `src/cli.mjs`, `src/config.mjs`, `src/compile.mjs`, `src/personas.mjs`, `src/kane/runner.mjs`, `src/kane/fixture.mjs`, `src/classify.mjs`, `src/report.mjs`, `src/util.mjs`; `stuntman.json`; five persona packs; eight fixture NDJSON files; `demo/BRIEF.md`; `demo/app/server.mjs`; the unit tests for compile, classify, and fixture replay.
- Exit criteria: `npm test` passes offline; `node bin/stuntman.mjs audit --fixture-state broken` exits 1 and prints `impatient CONFIRMED 2 orders, $98.00 charged` plus `refresher suspected`; `report.json` and `report.html` exist; the HTML makes no external requests; the demo app starts and `POST /admin/reset` works.

### P2 Brief, heal, lock, and verify

- Priority: P0 must-ship
- Deadline: 2026-11-23
- Deliverables: `src/brief.mjs`, `src/heal.mjs`, `src/lock.mjs`, `src/verify.mjs`, `src/evidence.mjs` (best-effort), `demo/patches/0001-idempotent-checkout.patch`, `demo/agent-fix.mjs`, and the integration tests for brief, heal, lock, and verify.
- Exit criteria: `brief F-001` writes both files and names the observed value; `heal F-001 --agent-cmd 'node demo/agent-fix.mjs {brief}' --fixture-state fixed` exits 0 and prints `CLEAN`; the same command without the fixed state exits 1; `lock` writes a valid `_test.md` and `stuntman.lock`; changing a persona makes `audit` refuse with a contract error; `verify --fixture` passes.

### P3 Live Kane validation

- Priority: P0 must-ship
- Deadline: 2026-11-23
- Deliverables: a real `kane-cli run` against the demo app; a recorded live report; any adapter fixes found by the live run; `LIVE_RUN.md` with the exact commands, timestamps, credits, and what differed from fixtures.
- Exit criteria: Kane is installed and authenticated; one live audit completes; the `impatient` lane confirms with `order_count = 2`; the report contains the sealed pack path; a second live run after the patch is clean; `kane-cli testmd run` replays the locked test and emits `test_md_done`.

### P4 Second app, budget guard, CI, and hardening

- Priority: P1 should-ship
- Deadline: 2026-11-24
- Deliverables: `demo/second/` and `demo/SECOND_BRIEF.md` (or a written note that it was cut), `src/budget.mjs`, `.github/workflows/ci.yml`, `audit --json`, `personas` command, Windows path checks, `NO_COLOR` support.
- Exit criteria: `npm test` still passes; the fixture audit is unchanged; the budget guard refuses an impossible live audit and stops at the ceiling; CI is green on a clean clone; the second app, if shipped, produces a different hazard on a different journey.

### P5 Documentation, recording support, and the fallback

- Priority: P0 must-ship
- Deadline: 2026-11-25
- Deliverables: `README.md`, `SETUP.md`, `DEPLOY.md`, `TESTING.md`, `.env.example`, `.gitignore`, `BUILD_REPORT.md`, a recorded live run and its report in `runs/demo/`, a 60–90 second silent screen capture of the money shot, and a transcript of the commands.
- Exit criteria: a clean clone follows the README in fixture mode without help; the live section is accurate and names every account and key the human needs; the recorded report opens and contains the confirmed finding; the fallback video exists and is playable.

### P6 Submission hardening

- Priority: P1 should-ship
- Deadline: 2026-11-26
- Deliverables: final `README` pass, repo cleanup (no `runs/` junk, no `.evidence` packs, no secrets), the 3–5 minute video, two public launch posts, the submission form, and a final `npm test` plus fixture audit on a clean clone.
- Exit criteria: the repo is public and was initialised on or after 12 Nov 2026; the video is on YouTube and linked in the README; both launch posts are live; the submission form is submitted before 23:59 IST; the last commit is before the deadline.

## 11. Risks, unavailable infrastructure, alternatives

| Risk | Likelihood | Impact | Mitigation | Fallback |
|---|---|---|---|---|
| Kane cannot reliably double-click | Medium | The money shot disappears | Phrase the behaviour explicitly and test it in the first 48 hours; keep the double POST test in the app as a deterministic oracle | Use the `slow-submit` persona or the refresh race; the report still proves a duplicate order |
| Kane's agentic run is stochastic | High | False findings | Two-pass rule: 2/2 to confirm, 1/2 is suspected, exit 2/3 never confirms; show a suspected lane on camera | Report only typed violations; label untyped repeat failures as suspected |
| The demo app's bug looks planted | High | Credibility loss | Build `demo/app` from `demo/BRIEF.md` in a fresh session with no knowledge of the hazard; publish the commit history; never add a hidden switch | Rebuild the app in a fresh chat, commit it, and re-record; the brief is in the repo |
| `_test.md` emission drifts from Kane's parser | Medium | Locked tests do not run | Use only documented frontmatter keys; run `kane-cli testmd run` on the emitted file in P3; assert the structure in a unit test | Keep the test files and print the exact manual command; the lock still records the hazard |
| Live demo fails on stage | Medium | No finding on camera | Record a full live run in advance; fixture mode reproduces the report offline; keep the evidence pack | Play the recorded run, then show the live report and the replay |
| Credits run out | Low | Audit stops | Estimate before the run; confirm only failures; `max_credits` ceiling; 10,000 credits is ample for 10–20 runs | Fixture mode and the recorded report |
| Judges cannot reproduce the demo | Medium | Ships score drops | Fixture mode is the default; `npm test` is offline; the repo ships the demo app and the exact commands | A recorded transcript plus screenshots of the report and the pack |
| Evidence screenshot extraction fails | Medium | Report is less visual | Extraction is best-effort and never fails the audit; `unzip` is optional | Link the pack and show the typed values; the video shows the pack in Kane's viewer |
| Windows path or spawn differences | Medium | CLI fails for some judges | Use `path`, `shell: true` only on Windows, `KANE_BIN`, and no POSIX-only shell syntax in the product | Document macOS/Linux as the supported demo platform; Windows remains fixture-capable |
| The app uploads local runs to TestMu by default | Low | Privacy surprise | Say it in the README; the demo app is localhost-only and contains no personal data | Use a throwaway TestMu account for the demo, or fixture mode |
| One session cannot finish the build | Medium | Incomplete ZIP | P1 is the whole money shot in fixture mode; later phases are additive; cut SHOULD/COULD before MUST | Ship P1+P2 with the fixture demo and a recorded live run |

The builder sandbox cannot deploy, cannot call live third-party services, and cannot run a long-lived service. The substitutes are: fixture mode for Kane, a local Node server for the app, static files for the report, and a human-run deploy step documented in `DEPLOY.md`. No integration in this handoff is marked `Verified: no`.

## 12. Demo strategy

**Money shot:** the terminal shows `impatient` turning red with `CONFIRMED — 2 orders, $98.00 charged`; the report opens on the finding card, showing the second order created 0.4 seconds after the first and the screenshot from the sealed Kane pack. The narrator says: "The agent's own test clicked Pay once. We clicked it twice."

**Fallback:** if the live browser or network fails, play the pre-recorded live run and open its `report.html`, then run the fixture audit live to show the same classification and the same repair brief. Never present fixture output as live; the badge on the report makes the difference visible.

**90-second spine (the video is 3–5 minutes; this is the part that must land):**

1. **0:00–0:10 — cold open.** A checkout confirmation with two identical orders. "One purchase. Two orders. The agent's tests passed."
2. **0:10–0:25 — setup.** "This store was built by an agent from a one-paragraph brief. Stuntman takes one journey and performs the humans the agent never tested."
3. **0:25–0:45 — audit.** Run `node bin/stuntman.mjs audit --live`; five lanes appear; four go green; `impatient` goes red with `2 orders, $98.00`.
4. **0:45–0:55 — honesty beat.** `refresher` shows `SUSPECTED — 1 of 2 runs failed`; the narrator: "One failure is not a finding. We only report what reproduces."
5. **0:55–1:10 — brief.** `node bin/stuntman.mjs brief F-001`; show the brief's acceptance checklist and the "do not change the contract" section.
6. **1:10–1:25 — heal.** Run `heal` with the agent command; the agent patches the checkout; the re-audit goes green.
7. **1:25–1:30 — lock.** `lock` writes `tests/stuntman-impatient_test.md`; `verify` replays it in seconds. "The hazard is now a test that costs nothing to run."

**Extended 3–5 minute cut:** add the problem (agent-built apps, missing test author), the confidence rule explainer, the contract hash, one clean persona, and the second app if it shipped. Keep the cold open and the money shot exactly as above.

**Seeded data:** `POST /admin/reset`, then one Harbor Mug at $49.00. The double order is $98.00. Use the fixed test card string and a `buyer@example.test` email. Record the exact commit in the report.

**What judges must see against each criterion:** Ships — the command runs against a real local URL and produces a file. Verified — the typed `order_count = 2`, the charge total, the pack, and the screenshot. Closed loop — the brief, the agent command, the re-audit, the lock. Craft — one command, no dependencies, a readable report, a replayable test.

**What not to show:** do not show the patch before the live fix; do not show fixture mode as live; do not show a two-tab persona (it is out of scope); do not claim the report extracts live screenshots if `unzip` was unavailable; do not claim a second app if it was cut.

## 13. Acceptance criteria and test plan

- AC-01 `stuntman init` creates a valid `stuntman.json`; a second run without `--force` exits 2; the five persona ids resolve; an unknown id exits 2 and lists the available ids.
- AC-02 A compiled objective contains the start URL, every journey step in order, the persona behaviour sentence, every observation instruction with `store ... as '<name>'`, the invariant assertion, and the stop instruction.
- AC-03 The compiler exits 2 and names both sides when an invariant references an observation that is not declared, when a persona has no behaviour, or when an observation instruction lacks a `store as` clause.
- AC-04 Fixture mode is the default; `audit --fixture-state broken` completes with no network, no Kane install, and no Chrome, and exits 1.
- AC-05 `audit --live` invokes `kane-cli run <objective> --agent --url <url> --max-steps <n> --timeout <s>`; `KANE_HEADLESS=1` adds `--headless`; `KANE_BIN` overrides the binary.
- AC-06 The runner parses NDJSON line by line, ignores untyped progress events, keeps the last `run_end`, and does not crash on a malformed line or on stderr noise.
- AC-07 Exit codes map to 0 pass, 1 fail, 2 setup error, 3 timeout; 2 and 3 never produce a confirmed finding.
- AC-08 The first pass runs every selected persona once; only failed personas are repeated once for confirmation.
- AC-09 A hazard is CONFIRMED only when both usable runs fail with the same typed violation or the same normalized reason; one failure is SUSPECTED and produces no brief; missing values never confirm.
- AC-10 The terminal table and `report.json` list every persona with verdict, expected and observed values, duration, credits, evidence paths, and finding id; raw NDJSON is copied to `raw/`.
- AC-11 `report.html` is one file with inline CSS and base64 images, opens from disk, and makes no external requests.
- AC-12 `brief F-001` writes `briefs/F-001.md` and `briefs/F-001.json` containing the behaviour, invariant, observed value, evidence, repro command, acceptance checklist, suspects, and do-not list.
- AC-13 `heal F-001 --agent-cmd "<cmd>"` substitutes `{brief}` with the absolute path, runs the command in the project root, and re-audits only that persona twice.
- AC-14 `heal` exits 0 with `CLEAN` when the hazard is gone, 1 with `STILL REPRODUCIBLE` when it is confirmed again, and 2 when the agent command fails or the re-audit is inconclusive.
- AC-15 `lock` writes one `tests/stuntman-<persona>_test.md` per confirmed hazard with only documented frontmatter keys, an H1 title, and one H2 per step.
- AC-16 `stuntman.lock` contains `contract_hash`, `journey_hash`, `observations_hash`, `personas_hash`, the audited commit, the persona versions, and the test paths.
- AC-17 `audit` recomputes the hashes, exits 2 on a mismatch, names the changed section, and explains how to update the lock; `--allow-contract-change` overrides.
- AC-18 `verify --live` runs each locked test with `kane-cli testmd run <path> --agent`, waits for `test_md_done`, and prints PASS or FAIL with the duration and share URL when present.
- AC-19 `verify --fixture` replays the fixed fixture, prints `replayed from fixture`, and makes no network call.
- AC-20 The demo app starts on `PORT` (default 3000), serves the three seeded products, and supports `/`, `/cart`, `/checkout`, `POST /api/orders`, `/orders`, `/orders/:id`, `/__state`, `/admin/reset`, and `/health`.
- AC-21 A double submit to `/api/orders` with the shipped app creates two orders and two charges; a single submit creates one; `POST /admin/reset` restores the seed.
- AC-22 `demo/patches/0001-idempotent-checkout.patch` applies cleanly with `git apply`, makes the double submit produce one order, and is never applied automatically by `heal`.
- AC-23 Every persona pack has `id`, `version`, `name`, `behaviour`, `severity`, `invariant`, and `notes`; the loader rejects duplicates and unknown ids with a message that lists the available ids.
- AC-24 A clean clone with Node 20+ follows `README.md` and completes the fixture audit without a Kane account or a network call.
- AC-25 `npm ls --prod` is empty; `npm test` runs with `node --test` and passes without a network call.
- AC-26 `audit` prints a credit estimate before a live run, refuses an estimate above `budget.max_credits` without `--force`, and stops scheduling when reported credits reach the ceiling.
- AC-27 The report and terminal output show `LIVE` or `FIXTURE`; a fixture run never claims live evidence.
- AC-28 The second app, if shipped, runs on its own port and produces a different hazard class on a different journey; if cut, `BUILD_REPORT.md` says so and the video does not claim generality.
- AC-29 `verify` exits 1 if any locked test fails, 0 if all pass, and 2 if Kane is unavailable.
- AC-30 If `unzip` is available and the live pack contains a step screenshot, the report embeds the last screenshot as base64; otherwise it omits the image and links the pack without failing the audit.

**Test plan**

- **Unit (`node --test`):** config validation and unknown ids; objective compilation and every refusal; money and integer parsing; classification for pass, fail, error, timeout, missing value, identical reason, different values, and 1-of-2; contract hash stability and section changes; report escaping; brief field mapping; frontmatter emission.
- **Integration, fixture mode:** run the CLI into a temporary directory and assert exit 1, the confirmed and suspected counts, the raw transcripts, the report files, the brief, the lock, the contract refusal, `heal` with a fake agent, and `verify`.
- **Demo app:** start the server on an ephemeral port; reset; POST twice with the same nonce; assert two orders in the broken app; apply the patch in a temporary copy with `git apply`; assert one order; reset between tests.
- **Manual live checklist:** install Kane 0.10.7; `kane-cli whoami`; run one objective by hand; run the full live audit; open the pack; run `testmd run`; confirm the screenshot and the `test_md_done` event.
- **Demo run-through:** follow section 12 twice, once with fixtures and once live, and time it. The live run must fit inside the video budget with the recording as the fallback.

## 14. Builder deliverables

Return one complete project **ZIP** containing: the working source, `README.md`, `.env.example`, `SETUP.md`, `DEPLOY.md`, `TESTING.md`, and `BUILD_REPORT.md`. The README is the product page and must include the cold open, the quick start, the persona table, the confidence rule, the lock, and the limitations. `SETUP.md` is the step-by-step local install. `DEPLOY.md` covers the optional GitHub release, the optional npm publish, and the optional free deployment of the demo app, naming every account and key the human must create. `TESTING.md` is a testing checklist that maps every acceptance criterion to a command or a manual check. `BUILD_REPORT.md` records the phases completed, the decisions made, what was verified live, what is unverified, and every known gap.

After the ZIP, reply with the download, a five-line summary, the exact commands to run it, and the acceptance criteria with pass, fail, or unverified.

## 15. Security rules

- No real secrets, API keys, private keys, mnemonics, or access tokens in the repo, tests, fixtures, report, or docs. `.env.example` contains variable names and one-line explanations only.
- The demo app uses a fixed test card string and a fake email; it never calls a payment provider and never stores personal data.
- Kane uploads runs to the TestMu AI account by default. The README says this; the demo app is localhost-only; use a throwaway account if that matters.
- The `--agent-cmd` value is arbitrary code by design. The README warns that it runs with the user's privileges, and Stuntman never builds that command from config or app data.
- Validate persona ids against `^[a-z0-9-]+$` before using them in a path. Resolve every generated path under the run directory and reject escapes.
- HTML-escape every value that comes from the app, Kane, or the config before inserting it into `report.html`. No `eval`, no `new Function`, no dynamic `require`.
- Do not commit `runs/`, `.testmuai/`, `.evidence` packs, or `node_modules/`. The `.gitignore` covers them.
- Cap raw NDJSON retention per run at 5 MB per persona; the runner truncates with a note rather than exhausting disk.
- No analytics, no telemetry, no outbound calls except the explicit Kane child process and the local demo app.

## 16. Out of scope

- Native mobile targets, emulators, simulators, and real devices. They need macOS Apple Silicon or a paid plan.
- The two-tab persona. Kane's documented surface is one page per run; the capability is unverified.
- CDP network throttling and `--cdp-endpoint`. The slow-submit persona uses plain-English timing, not a constrained browser.
- Visual regression, pixel diffing, continuous monitoring, scheduled runs, and hosted dashboards.
- Requirements ingestion, PRD-to-test generation, coverage measurement, and requirement tracing. The sponsor's assurance suite owns that.
- Real payment providers, real identity providers, real email providers, and real customer data.
- Model-backed judging, claim extraction, prompt evaluation, and LLM-as-a-judge.
- Multi-tenant isolation, git bisect, README lie detection, two-agent arenas, and PR bug reels. These lanes are crowded.
- Publishing to npm, a hosted demo, user accounts, billing, and a database.
- Any Kane flag or behaviour not documented in the README or the user-guide pages cited in section 9.

## 17. Assumptions

- The human has Node 20+ and Google Chrome stable. If Chrome is missing, live mode fails with a clear error; fixture mode still works.
- The human can install `@testmuai/kane-cli` 0.10.7 and authenticate with a TestMu AI account that has the 10,000 credits. If not, the fixture demo and the recorded live run carry the submission.
- Port 3000 is free for the demo app. If it is not, `PORT=3100` and update `base_url`; the CLI reads the config, so no code change is needed.
- The human records the 3–5 minute video and publishes the two launch posts. The repo supplies the script, the seeded data, and the fallback recording.
- The demo app is rebuilt in a fresh agent session from `demo/BRIEF.md` before recording, so the hazard is emergent rather than inserted. If the rebuilt app differs, re-record the fixtures and the live run; the brief is the source of truth.
- Kane's plain-English objectives accept the behaviour sentences in the persona packs. If a phrasing fails, rewrite the sentence in the persona file, not in code; the compiler and the classifier are behaviour-agnostic.
- The test card string is accepted by the demo app because the app validates only that the field is non-empty; no real payment network is involved.
- The event's judging is human and averaged across four criteria; ties break on Verified then Closed loop. The build prioritises the typed finding and the closed loop over extra features.
- The repo is created on or after 12 Nov 2026 and the commit history is public. The human handles repository creation, the video upload, and the submission form.
