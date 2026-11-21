# 12 — Winning brief (P10)

**ID:** SY-001 · **Name:** **Stuntman** (`stuntman` is free on npm — checked 2026-11-21; fallbacks: `fifth-user`, `hazard-audit`)
**Tagline:** *Your agent tested the happy path. Stuntman plays everyone else.*
**Track:** Workflow (with a Web + Mobile surface) · **Builder:** solo human + Claude mobile (`claude-mobile-zip`)
**Deadline:** 26 Nov 2026, 23:59 IST · **Budget:** $0 + 10,000 Kane credits · **Repo:** public, initialised on/after 12 Nov 2026

---

## Problem

An agent asked to "build a checkout" builds the checkout it was asked for. It clicks Pay once, with a fast connection, in one tab, as a first-time user. Its own tests pass. Then a real customer clicks Pay twice because the spinner looked stuck, refreshes mid-flow, hits Back after paying, or returns a week later with an expired session — and the app charges them twice, loses the cart, or re-submits the payment.

This is not a code-quality problem that a diff review can catch. It is a **missing test author problem**: nobody wrote down what an impatient, distracted or returning human does, so nothing ever performed it. The failure class is expensive enough that Stripe ships a dedicated mechanism to prevent it (idempotency keys: https://docs.stripe.com/api/idempotent_requests, E3, retrieved 2026-11-21).

**Who is hurt, repeatedly:** solo builders and small agencies shipping agent-built apps, who have no QA function and no test suite; and platform teams using Claude Code/Cursor, who can generate a flow in minutes but cannot generate the humans who will break it.

**Why now:** the hackathon's own premise is that agents write code faster than anyone can verify it (E3), and the current field of Kane products all begin with something already known — a filed bug (Gremlin), a security checklist (DappSentinel), a scripted shopper (Cartwalk), a monitor (ShipProof). None begins with *the absence of a report*.

## Solution

**Stuntman is a local CLI that turns one plain-English critical journey into a cast of adversarial human performances, proves which hazards are real in a real browser, hands the coding agent a machine-generated repair brief, and locks every confirmed hazard into a committed test that replays for free.**

```bash
npx stuntman init                      # writes stuntman.yaml from a guided prompt
npx stuntman audit --url http://localhost:3000
npx stuntman brief F-001               # the machine-readable repair brief
npx stuntman heal --agent-cmd 'claude -p "$(cat {brief})"'
npx stuntman lock                      # confirmed hazards → tests/*_test.md
npx stuntman verify                    # replays the locked suite (Kane testmd, cached)
```

**The unit of testing is a human, not a script.** A persona is a triple: a *behaviour* (what the human does), an *invariant* (what must remain true), and a *severity* (what it costs if violated). The six launch personas:

| Persona | Behaviour | Invariant | Severity |
|---|---|---|---|
| **Impatient** | clicks the primary action twice in quick succession | exactly one charge / one order | P0 (money) |
| **Refresher** | reloads mid-flow | no duplicate, no lost cart | P1 (lost sale) |
| **Back-button** | navigates back after paying | no second charge | P0 (money) |
| **Slow-network** | submits while the request is still in flight | one record, one charge | P0 (money) |
| **Returning** | logs out, returns, signs back in | cart and order state are correct | P1 (state loss) |
| **Two-tab** | edits the same record in a second tab | no silent overwrite | P2 (data) |

> Two-tab is a **stretch** persona: Kane's documented surface is one page per run. It ships only if a spike proves it; otherwise it is cut, not faked.

### How Kane is used (this is the product, not an integration)

| Kane surface | Role in Stuntman |
|---|---|
| `kane-cli run "<objective>" --agent` + NDJSON `run_end` | The oracle. Every persona is a run; `status`, `reason`, `duration`, `credits` and `final_state` are parsed, never a screenshot eyeballed by a human. |
| `store as` extraction | The typed result channel. Every invariant is compiled into an extraction (e.g. `charge_count`), so a finding is a value, not an opinion. |
| Plain-English assertions (network, console, visible text) | The invariant is stated inside the objective in Kane's own vocabulary, so the run itself fails when the hazard occurs. |
| Exit codes `0/1/2/3` | `0` clean, `1` hazard, `2` setup error (retry once, then mark inconclusive), `3` timeout (inconclusive, never a finding). |
| `--cdp-endpoint` + throttling | The slow-network persona is a real constrained browser, not a simulated promise. |
| `--name` / `_test.md` / `testmd run` | The lock. A confirmed hazard is emitted as a committable test that replays from cache with no LLM cost. |
| Evidence pack (`session_dir`) | Linked from every finding and embedded, as a screenshot, in the report. |
| `--parallel` (via `testrun` / lanes) | Six humans perform at once; the audit finishes inside a demo. |

### The three mechanisms that make it a system, not a wrapper

1. **The compiler.** One journey plus one persona becomes a valid, assert-bearing objective with an explicit extraction. This is where Kane's footgun is removed: *vague objectives do not persist values* (E3, Kane troubleshooting), so the compiler refuses any invariant that is not `store as`.
2. **The confidence rule for a stochastic oracle.** Kane's agentic runs are not deterministic, so one failure is not proof. Each hazard objective runs up to **2×**:
   - **Confirmed** — 2/2 fail, or a typed value violates the invariant identically both times.
   - **Suspected** — 1/2 fail. Shown in the report, *never* turned into a repair brief.
   - **Clean** — 0/2.
   This is the technical honesty that separates a finding from a flake, and it is visible in the demo.
3. **The lock.** The audited commit and a SHA-256 of the canonical `{journey, invariants, persona versions}` are recorded. If the agent edits the contract to make itself pass, `audit` refuses to run and says why. A confirmed hazard becomes `tests/<persona>_test.md` tagged `stuntman`, composed with `@import` for login.

### The closed loop, exactly

```
stuntman.yaml ──compile──▶ N objectives ──kane-cli run --agent──▶ run_end + evidence
        ▲                                                              │
        │                                                              ▼
   hash lock ◀── confirmed hazard ◀── confidence rule ◀── typed classifier
        │                                                              │
        │                                                              ▼
   tests/<persona>_test.md ◀── lock ◀── verified fix ◀── agent patch ◀── repair brief
```

No human summarises anything between Kane's output and the agent's input. That is the "tighter is better" criterion, literally.

## Target user and why they install it tonight

A solo builder who just shipped an agent-built store and cannot afford a QA hire. They already have a URL and one critical journey in their head. They run one command, get a red finding with a screenshot and a charge count, paste the brief into their agent, re-run, and keep a test that costs nothing to replay. Time to first finding: one audit. Time to install: one `npx`.

## Differentiation (honest, with prior art)

| Neighbour | What it does | Why Stuntman is not it |
|---|---|---|
| **Gremlin** (Kane field) | Issue → failing test → fix → regression test, Kane-refereed. | Starts from a *filed bug*. Stuntman starts from the absence of one and generates the human who would have filed it. |
| **Cartwalk** (Kane field) | One scripted shopper audits cart arithmetic. | One behaviour, rule-based judgement. Stuntman is a cast of behaviours with typed invariants and a repair handoff. |
| **DappSentinel** (Kane field) | Pre-launch security gate with anti-cheating. | Different surface (security vs human behaviour), different output (block vs repair brief + permanent test). |
| **ShipProof** (Kane field) | 24/7 store guardian, self-healing. | Continuous monitoring of a known set. Stuntman discovers new hazards on demand. |
| **Meticulous / Momentic / QA Wolf** | Commercial behavioural QA and test generation. | Enterprise-shaped, commit-diff or generation based; none simulates human behaviours or returns a repair brief. |
| **`drugpl/bbq`**, **CrowdMind** | Personas in code-level BDD / marketing research. | Conceptual prior art only; no browser, no evidence, no loop. |

## Three-novelty verdict

- **Conceptual novelty — incremental.** Personas are an old testing metaphor (E3: `drugpl/bbq`, 92★) and a marketing-research technique (E3: CrowdMind). The framing *"a persona is a hazard × an invariant, compiled into a browser objective"* was not found, but the word is not new and must not be sold as new.
- **Product novelty — white space (E2, negative search).** No browser-level product was found that compiles a journey into hostile human performances and proves the resulting hazards. Ten queries and four direct fetches; absence is E2, not proof.
- **Execution novelty — white space.** No competitor demonstrated: a typed duplicate-charge proof under an impatient double click, a confidence rule that distinguishes a flake from a finding, and a hazard that becomes a committed zero-cost test in the same loop.

## Judging criteria — how SY-001 scores on each

| Criterion (25% each) | What the submission shows | Score claim |
|---|---|---|
| **Ships** | A real CLI against a real local storefront; a clean clone runs the whole flow in fixture mode, then live against Kane. | 4–5 |
| **Verified** | "One purchase intent produced two charges, $98.00" — a typed `charge_count`, a screenshot, a network record and a sealed pack. Not a boolean. | 5 |
| **Closed loop** | `run_end` → repair brief → agent patch → re-audit → committed test. Machine to machine, and the agent cannot weaken the check. | 5 |
| **Craft** | `npx stuntman audit`, a beautiful report, persona packs, a test that replays free, and a fixture mode for offline use. | 4–5 |
| **Tie-breakers** | Verified then Closed loop — the two strongest claims. | — |

## Demo money shot (the 15 seconds a judge retells)

> The terminal shows six persona lanes. The **impatient** lane turns red: `CHARGED TWICE — 2 requests to POST /api/charge, order total $98.00`. A screenshot slides in showing the confirmation page saying "2 charges". The reporter says: *"The agent's own test clicked Pay once. We clicked it twice."*

Full 3–5 minute structure:

1. **0:00–0:30 — the setup.** "Claude built this store from one prompt. Its tests pass. Watch what happens when a human uses it."
2. **0:30–1:10 — the audit.** One command, six lanes, live NDJSON from Kane. Baseline green.
3. **1:10–1:45 — the catch.** Impatient lane red with the charge count, the network assertion and the screenshot. Refresher lane shows **suspected** (1/2) and is *not* reported as a finding — the honesty beat.
4. **1:45–2:40 — the loop.** `stuntman brief` → the JSON/Markdown brief → the agent patches idempotency and the button state → re-audit → green.
5. **2:40–3:15 — the lock.** `stuntman lock` writes `tests/impatient_test.md`; `kane-cli testmd run` replays it in seconds with no LLM cost.
6. **3:15–3:45 — the proof it generalises.** A second app (built by a different agent or a different prompt) produces a different hazard. Close on the report and the repo.

## Out of scope (do not build these)

- Native mobile targets (emulator/simulator needs macOS Apple Silicon; real devices need a paid plan).
- Visual regression, pixel diffing, or continuous monitoring — different products, already served.
- Generating tests from a PRD or measuring requirement coverage — the sponsor's `assurance` suite owns this; duplicating it loses.
- Hosted dashboards, accounts, databases, schedulers, status pages.
- Real payment providers, real identity providers, real email providers in the demo path (test doubles only, clearly labelled).
- Model-backed features, LLM judging, claim extraction, prompt evaluation.
- Multi-tenant isolation, two-agent arenas, bisect, and README lie detection — crowded lanes, explicitly cut.
- Any Kane flag or behaviour not documented in the README/cookbook. No invented surface.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Kane cannot reliably double-click | Medium | Phrase the objective explicitly ("click Pay twice in quick succession"); fall back to the slow-network persona, which is more deterministic; test both in the first 48 hours. |
| Kane's stochasticity produces a false finding | High | The confidence rule: 2/2 to confirm, 1/2 = suspected, never a brief. Show a suspected case in the video. |
| The demo app's bug looks planted | High (the adversary's main attack) | Build the app by prompting an agent with a happy-path brief, publish the commit history, and find a hazard on a second app before recording. |
| `_test.md` emission format drifts | Medium | Generate the documented shape (frontmatter + `## step` + objective); verify with `kane-cli testmd run`; ship a fallback that writes the markdown without invoking Kane. |
| An audit is too slow for a live demo | Medium | Parallel lanes, `--max-steps` and `--timeout` caps, cached fixture replay for the stage, live run recorded in advance as a backup. |
| Credits run out | Low | 10,000 credits; ~6 runs per audit at 9–40 credits; `--dry-run` prints estimated cost; hard budget ceiling per audit. |
| Judges cannot reproduce the demo | Medium | Fixture mode passes offline; `npm run demo:fixtures` regenerates the report with no Kane; a recorded run and a written transcript ship in the repo. |

## Evidence table (the claims this brief stands on)

| Claim | Source | Grade |
|---|---|---|
| Agents write faster than they can verify; Kane closes the loop | https://www.kaneclihack.sh/ (2026-11-21) | E3 |
| Duplicate charges on retry are a documented failure class | https://docs.stripe.com/api/idempotent_requests (2026-11-21) | E3 |
| Values persist only via `store as`; vague phrasing does not capture | https://github.com/LambdaTest/kane-cli (2026-11-21) | E3 |
| Exit codes and `run_end` are the stable automation surface | same README, NDJSON + exit-code sections (2026-11-21) | E3 |
| Network, console, cookie, storage and performance assertions exist | https://www.testmuai.com/kane-cli-cookbook/ (2026-11-21) | E3 |
| `--name` writes a `_test.md`; replay is cached and free of LLM cost | Kane README, testmd section (2026-11-21) | E3 |
| `--cdp-endpoint` allows a controlled browser | Kane README, flags table (2026-11-21) | E3 |
| Native mobile is paid or macOS-Apple-Silicon-only | Kane README, mobile section (2026-11-21) | E3 |
| Deploy gates, bug loops, shopper audits and monitors are already in the field | Gremlin / DappSentinel / Cartwalk / ShipProof READMEs (2026-11-20) | E3 |
| Personas exist as a code-level testing metaphor | https://github.com/drugpl/bbq (2026-11-21) | E3 |
| Behavioural diffing is commercially served | https://www.meticulous.ai/ (2026-11-20) | E3 |
| No browser-level persona product was found | 10 queries, 4 direct fetches (`09-prior-art.md`) | E2 (negative) |

## The adversary's strongest attack, and our answer

> **Attack:** "It is a well-dressed wrapper: a prompt template plus a for-loop around `kane-cli run`, with an HTML report. Personas have prior art, the fix loop has prior art, and the pain is inferred. If the bug is planted, it is theatre."

**Answer, in the product and in the video:**

1. **The bug is emergent, not planted.** The demo app is built from a happy-path prompt with a public commit history; the hazard is what the agent naturally failed to handle. A second app, built differently, produces a different hazard.
2. **The oracle is honest.** The confidence rule is shown refusing to report a 1/2 flake. A wrapper prints every failure; this does not.
3. **The loop has a lock.** The agent cannot edit the contract, and the confirmed hazard becomes a test that outlives the demo. A wrapper has no lock and no lasting artefact.
4. **The unit is the product.** Six hard-coded prompts would confirm the attack; the submission ships a versioned persona library with hazards and severities, composed with `@import`, not six strings.

**Residual risk after the answer:** a judge may still see the lineage to Gremlin and Cartwalk. The brief does not claim to have invented the fix loop or the shopper; it claims to have invented the *human who was never tested*, and it shows that claim in the first 90 seconds.

## Build plan (4 days, one human + Claude mobile)

| Day | Deliverable |
|---|---|
| **Sat 21 Nov** | Repo + scaffold + `stuntman.yaml` schema + compiler + Kane runner + fixture player. One objective end to end against the demo app. |
| **Sun 22 Nov** | Demo storefront (buggy by construction, agent-built), six personas, classifier + confidence rule, terminal lanes. First real double-charge finding. |
| **Mon 23 Nov** | Repair brief, heal loop, HTML report, testmd lock, `verify`. Record a first rough run. |
| **Tue 24 Nov** | Second app, polish, README, fixture mode, CI, `--dry-run`, cost meter. Freeze features. |
| **Wed 25 Nov** | Demo video (record, narrate, captions), repo cleanup, live URL or recorded fallback. |
| **Thu 26 Nov** | Submission form, two public launch posts, final validation. **No pushes after 23:59 IST.** |

## Appendix — the complete candidate ledger (211 rows)

Every candidate that entered the gate, with its source lens, opportunity link and gate verdict. Scores for survivors are in `07-scores.md`; knockout reasons are in `06-gate.md`.

| ID | Candidate | Source | Opp | Gate | B /100 |
|---|---|---|---|---|---:|
| SY-001 | Stuntman | synthesis | O-010 | PASS | 97.0 |
| SC-002 | Trial Clock | scout | O-015 | PASS | 67.0 |
| SC-003 | Coupon Integrity | scout | O-011 | PASS | 57.0 |
| SC-004 | Address Failover | scout | O-010 | PASS | 54.0 |
| SC-005 | Cart Continuity | scout | O-012 | PASS | 54.0 |
| SC-006 | Guest Merge | scout | O-012 | PASS | 54.0 |
| SC-007 | Last-Seat Race | scout | O-011 | PASS | 70.0 |
| SC-008 | Price Truth | scout | O-005 | PASS | 66.0 |
| SC-009 | Delivery Promise | scout | O-021 | PASS | 54.0 |
| SC-012 | Invoice Match | scout | O-021 | PASS | 57.0 |
| SC-014 | Role Wall | scout | O-013 | PASS | 60.0 |
| SC-015 | Onboarding Resume | scout | O-012 | PASS | 54.0 |
| SC-018 | Domain Gate | scout | O-013 | OUT | — |
| SC-019 | Invite Landing | scout | O-012 | PASS | 54.0 |
| SC-021 | Preference Truth | scout | O-022 | PASS | 50.0 |
| SC-022 | One-Click Unsub | scout | O-021 | OUT | — |
| SC-023 | Export Fidelity | scout | O-021 | PASS | 54.0 |
| SC-024 | Selection Safety | scout | O-011 | PASS | 57.0 |
| SC-025 | Undo Proof | scout | O-021 | PASS | 54.0 |
| SC-026 | Search Recall | scout | O-021 | PASS | 40.0 |
| SC-027 | Filter Memory | scout | O-012 | PASS | 40.0 |
| SC-028 | Empty State Escape | scout | O-002 | PASS | 55.0 |
| SC-029 | Error Voice | scout | O-005 | PASS | 50.0 |
| SC-030 | Upload Boundary | scout | O-010 | PASS | 47.0 |
| SC-031 | Avatar Persistence | scout | O-012 | PASS | 40.0 |
| SC-032 | Long Input Survival | scout | O-010 | PASS | 40.0 |
| SC-033 | Validation Parity | scout | O-005 | PASS | 40.0 |
| SC-034 | Double-Click Money | scout | O-011 | PASS | 79.0 |
| SC-035 | Refresh Mid-Flow | scout | O-012 | PASS | 58.0 |
| SC-036 | Back-Button Billing | scout | O-011 | PASS | 75.0 |
| SC-037 | Slow Submit | scout | O-010 | PASS | 61.0 |
| SC-038 | Two-Tab Edit | scout | O-012 | OUT | — |
| SC-039 | Expiry Grace | scout | O-012 | PASS | 55.0 |
| SC-040 | Offline Recovery | scout | O-010 | PASS | 54.0 |
| SC-041 | Locale Money | scout | O-005 | PASS | 54.0 |
| SC-042 | Deadline Zones | scout | O-010 | PASS | 43.0 |
| SC-043 | RTL Checkout | scout | O-002 | PASS | 50.0 |
| SC-044 | Rounding Truth | scout | O-005 | PASS | 57.0 |
| SC-045 | Tax Timing | scout | O-021 | PASS | 50.0 |
| SC-046 | Stock Hold | scout | O-011 | PASS | 60.0 |
| SC-047 | Webhook Replay | scout | O-011 | PASS | 60.0 |
| SC-048 | Status Mirror | scout | O-021 | PASS | 40.0 |
| SC-049 | Consent First | scout | O-022 | PASS | 64.0 |
| SC-050 | Tag Budget | scout | O-009 | PASS | 53.0 |
| SC-052 | Cold Start Budget | scout | O-009 | PASS | 60.0 |
| SC-054 | Audit Completeness | scout | O-021 | PASS | 50.0 |
| SC-055 | Handoff Context | scout | O-005 | OUT | — |
| SC-056 | Invoice Chaser | scout | O-021 | OUT | — |
| SC-057 | Warranty Runner | scout | O-021 | OUT | — |
| SC-058 | Compliance Filer | scout | O-021 | OUT | — |
| SC-059 | Benefits Navigator | scout | O-002 | OUT | — |
| SC-060 | Grant Scout | scout | O-016 | OUT | — |
| SC-061 | Portal Watch | scout | O-021 | OUT | — |
| SC-062 | Gift Card Ledger | scout | O-011 | PASS | 54.0 |
| SC-063 | Store Credit | scout | O-011 | PASS | 57.0 |
| SC-064 | Proration Proof | scout | O-021 | PASS | 60.0 |
| SC-065 | Dunning Ladder | scout | O-021 | PASS | 61.0 |
| SC-066 | Split Fulfilment | scout | O-011 | PASS | 57.0 |
| SC-067 | Backorder Promise | scout | O-021 | PASS | 54.0 |
| SC-068 | Referral Loop | scout | O-011 | PASS | 57.0 |
| SC-069 | Tax Exemption | scout | O-021 | PASS | 50.0 |
| SC-070 | Review Pipeline | scout | O-011 | PASS | 50.0 |
| IN-001 | Behaviour Autopsy | inventor | O-006 | OUT | — |
| IN-002 | App X-Ray | inventor | O-006 | OUT | — |
| IN-003 | Persona Repertory | inventor | O-010 | PASS | 84.0 |
| IN-004 | Hazard Roulette | inventor | O-019 | PASS | 68.0 |
| IN-005 | Test Debt Ledger | inventor | O-008 | OUT | — |
| IN-006 | Claim Ledger | inventor | O-018 | PASS | 85.0 |
| IN-007 | Proof-Carrying PR | inventor | O-006 | PASS | 79.0 |
| IN-008 | Behavioural Lockfile | inventor | O-023 | PASS | 86.0 |
| IN-009 | Commit Court | inventor | O-029 | PASS | 70.0 |
| IN-010 | Merge Referee | inventor | O-021 | OUT | — |
| IN-011 | Agent Olympics | inventor | O-016 | OUT | — |
| IN-012 | Inside Bounty | inventor | O-017 | OUT | — |
| IN-013 | Red Team Rehearsal | inventor | O-017 | OUT | — |
| IN-014 | Release Note Truth | inventor | O-022 | PASS | 66.0 |
| IN-016 | Docs Dojo | inventor | O-022 | PASS | 59.0 |
| IN-017 | Onboarding Oracle | inventor | O-002 | PASS | 65.0 |
| IN-018 | Empty Wallet Run | inventor | O-017 | PASS | 55.0 |
| IN-019 | One-Hand Mode | inventor | O-014 | OUT | — |
| IN-020 | Panic Mode | inventor | O-009 | PASS | 60.0 |
| IN-021 | Chaos Clicks | inventor | O-010 | OUT | — |
| IN-022 | Tab Tornado | inventor | O-012 | OUT | — |
| IN-023 | Ghost User | inventor | O-013 | PASS | 74.0 |
| IN-024 | Twin Accounts | inventor | O-013 | PASS | 89.0 |
| IN-025 | Price Poison | inventor | O-011 | OUT | — |
| IN-026 | Coupon Fuzzer | inventor | O-011 | PASS | 56.0 |
| IN-027 | Form Fuzzer | inventor | O-010 | PASS | 56.0 |
| IN-029 | Time Machine | inventor | O-015 | PASS | 67.0 |
| IN-030 | Inbox Proof | inventor | O-021 | PASS | 67.0 |
| IN-032 | Print Proof | inventor | O-021 | OUT | — |
| IN-033 | Keyboard Trail | inventor | O-014 | OUT | — |
| IN-034 | Zoom 200 | inventor | O-014 | OUT | — |
| IN-035 | Dark Truth | inventor | O-017 | OUT | — |
| IN-036 | Motion Respect | inventor | O-014 | OUT | — |
| IN-037 | Data Diet | inventor | O-009 | OUT | — |
| IN-038 | Cookie Diet | inventor | O-022 | PASS | 50.0 |
| IN-039 | Storage Hygiene | inventor | O-022 | PASS | 57.0 |
| IN-040 | Bundle Leak | inventor | O-022 | PASS | 65.0 |
| IN-041 | Env Leak | inventor | O-022 | PASS | 64.0 |
| IN-042 | Console Silence | inventor | O-005 | PASS | 47.0 |
| IN-043 | Network Silence | inventor | O-005 | PASS | 53.0 |
| IN-044 | Third-Party Census | inventor | O-022 | PASS | 53.0 |
| IN-045 | Consent Receipt | inventor | O-022 | PASS | 57.0 |
| IN-046 | Delete-Me Drill | inventor | O-022 | PASS | 57.0 |
| IN-047 | Age Gate | inventor | O-013 | PASS | 50.0 |
| IN-048 | Support Truth | inventor | O-022 | OUT | — |
| IN-049 | Prompt Guard | inventor | O-017 | OUT | — |
| IN-050 | Citation Check | inventor | O-017 | OUT | — |
| IN-051 | Sitemap Sprint | inventor | O-021 | PASS | 40.0 |
| IN-052 | Rollback Rehearsal | inventor | O-021 | OUT | — |
| IN-053 | Staging Twin | inventor | O-023 | PASS | 80.0 |
| IN-054 | Preview Judge | inventor | O-021 | OUT | — |
| IN-055 | Self-Test | inventor | O-032 | PASS | 51.0 |
| EN-001 | Kane Runner | engineer | O-004 | OUT | — |
| EN-002 | Objective Compiler | engineer | O-004 | OUT | — |
| EN-003 | Fixture Player | engineer | O-004 | OUT | — |
| EN-004 | Oracle Ensemble | engineer | O-019 | OUT | — |
| EN-005 | Impact Selector | engineer | O-008 | OUT | — |
| EN-006 | Lane Runner | engineer | O-009 | OUT | — |
| EN-007 | Cost Governor | engineer | O-008 | OUT | — |
| EN-008 | Test Emitter | engineer | O-007 | OUT | — |
| EN-009 | Contract Lock | engineer | O-018 | OUT | — |
| EN-010 | Repair Brief | engineer | O-018 | OUT | — |
| EN-011 | Agent Bridge | engineer | O-018 | OUT | — |
| EN-012 | Heal Loop | engineer | O-018 | OUT | — |
| EN-013 | Static Report | engineer | O-006 | OUT | — |
| EN-014 | Live Dashboard | engineer | O-009 | OUT | — |
| EN-015 | CI Recipe | engineer | O-025 | OUT | — |
| EN-016 | PR Commenter | engineer | O-006 | OUT | — |
| EN-017 | Failure Clusterer | engineer | O-019 | OUT | — |
| EN-018 | Severity Model | engineer | O-011 | OUT | — |
| EN-019 | Baseline Recorder | engineer | O-023 | OUT | — |
| EN-020 | Fingerprint Differ | engineer | O-023 | OUT | — |
| EN-021 | Journey DSL | engineer | O-026 | OUT | — |
| EN-022 | Persona Library | engineer | O-017 | OUT | — |
| EN-023 | Objective Linter | engineer | O-004 | OUT | — |
| EN-024 | Extraction Enforcer | engineer | O-004 | OUT | — |
| EN-025 | Run Cache | engineer | O-027 | OUT | — |
| EN-026 | Evidence Index | engineer | O-006 | OUT | — |
| EN-027 | Credit Meter | engineer | O-008 | OUT | — |
| EN-028 | Multi-App Matrix | engineer | O-016 | PASS | 58.0 |
| EN-030 | Parity Runner | engineer | O-023 | OUT | — |
| EN-031 | Canary | engineer | O-021 | PASS | 64.0 |
| EN-032 | Rollback Webhook | engineer | O-021 | OUT | — |
| EN-033 | Digest | engineer | O-021 | OUT | — |
| EN-034 | Issue Sync | engineer | O-020 | OUT | — |
| EN-035 | Nightly Sentinel | engineer | O-027 | OUT | — |
| EN-036 | Dedupe | engineer | O-008 | OUT | — |
| EN-037 | Rewriter | engineer | O-019 | OUT | — |
| EN-038 | Step Splitter | engineer | O-009 | OUT | — |
| EN-039 | Credential Vault | engineer | O-009 | OUT | — |
| EN-040 | Seed Reset | engineer | O-019 | OUT | — |
| EN-041 | Clock Control | engineer | O-015 | OUT | — |
| EN-042 | Mail Sink | engineer | O-021 | OUT | — |
| EN-044 | Profile Manager | engineer | O-012 | OUT | — |
| EN-045 | Throttler | engineer | O-009 | OUT | — |
| EN-046 | Viewport Matrix | engineer | O-009 | OUT | — |
| EN-047 | Log Extractor | engineer | O-005 | OUT | — |
| EN-048 | Vitals Extractor | engineer | O-005 | OUT | — |
| EN-049 | Report Signer | engineer | O-006 | OUT | — |
| EN-050 | Benchmark Mode | engineer | O-016 | OUT | — |
| EN-051 | Read-Only Mode | engineer | O-016 | PASS | 38.0 |
| EN-052 | Dry Run | engineer | O-008 | OUT | — |
| EN-053 | Resume | engineer | O-008 | OUT | — |
| EN-054 | Explain | engineer | O-017 | OUT | — |
| EN-055 | Self-Host | engineer | O-032 | OUT | — |
| ST-001 | Judge Mode | strategist | O-032 | OUT | — |
| ST-002 | Proof Page | strategist | O-025 | PASS | 69.0 |
| ST-004 | Agency Console | strategist | O-016 | OUT | — |
| ST-005 | Trust Center | strategist | O-022 | OUT | — |
| ST-006 | Launch Readiness Score | strategist | O-021 | PASS | 72.0 |
| ST-007 | Client Sign-off Pack | strategist | O-020 | PASS | 54.0 |
| ST-008 | Procurement Pack | strategist | O-022 | OUT | — |
| ST-009 | Certification | strategist | O-016 | OUT | — |
| ST-010 | Badge Verify | strategist | O-006 | PASS | 38.0 |
| ST-011 | Evidence Escrow | strategist | O-006 | OUT | — |
| ST-013 | Persona Pack Store | strategist | O-017 | OUT | — |
| ST-014 | Benchmark Index | strategist | O-016 | OUT | — |
| ST-015 | Builder Scorecard | strategist | O-016 | OUT | — |
| ST-016 | Agent Bake-off | strategist | O-016 | OUT | — |
| ST-017 | Prompt-to-Proof | strategist | O-018 | PASS | 70.0 |
| ST-018 | Acceptance Contract | strategist | O-018 | PASS | 81.0 |
| ST-019 | Scope Creep Detector | strategist | O-023 | OUT | — |
| ST-024 | Release Gate | strategist | O-021 | PASS | 58.0 |
| ST-025 | OSS Maintainer Kit | strategist | O-016 | OUT | — |
| ST-026 | Hackathon Kit | strategist | O-032 | OUT | — |
| ST-027 | Demo Director | strategist | O-006 | OUT | — |
| ST-028 | Launch Buzz Kit | strategist | O-025 | OUT | — |
| ST-029 | Public Incident Replay | strategist | O-006 | OUT | — |
| ST-030 | Bug of the Week | strategist | O-016 | OUT | — |
| ST-031 | Verified Changelog | strategist | O-022 | PASS | 61.0 |
| ST-032 | Status Honesty | strategist | O-021 | OUT | — |
| ST-033 | "Works with X" Prover | strategist | O-022 | PASS | 54.0 |
| ST-034 | Pricing Page Prover | strategist | O-022 | PASS | 61.0 |
| ST-036 | Onboarding Promise Prover | strategist | O-002 | PASS | 59.0 |
| ST-037 | Migration Assurance | strategist | O-023 | PASS | 74.0 |
| ST-040 | Dependency Assurance | strategist | O-023 | PASS | 57.0 |
| ST-041 | Design Migration Proof | strategist | O-023 | PASS | 57.0 |
| ST-042 | Localization Launch | strategist | O-002 | PASS | 57.0 |
| ST-043 | Market Entry Proof | strategist | O-002 | OUT | — |
| ST-044 | Compliance Story | strategist | O-014 | OUT | — |
| ST-046 | Payments Certification | strategist | O-021 | PASS | 73.0 |
| ST-047 | Subscription Certification | strategist | O-021 | PASS | 65.0 |
| ST-048 | Auth Certification | strategist | O-021 | PASS | 67.0 |
| ST-050 | AI Feature Certification | strategist | O-017 | OUT | — |
| ST-051 | Post-Merger Audit | strategist | O-023 | OUT | — |
| ST-052 | Vendor Due Diligence | strategist | O-016 | OUT | — |
| ST-053 | Acquisition Diligence | strategist | O-023 | OUT | — |
| ST-054 | Insurance Evidence | strategist | O-022 | OUT | — |
| ST-055 | Escrow Release Condition | strategist | O-006 | OUT | — |
