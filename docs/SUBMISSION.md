# Submission kit (fill the [brackets] only with things that are true)

## Form answers

- **Solo or team:** Solo
- **Claimed the free Kane CLI credits before building:** Yes (confirm)
- **GitHub repository:** https://github.com/orjinameh/stuntman
- **Demo video:** [YouTube unlisted URL]
- **One paragraph (update the repair sentence if you re-record):** Stuntman is a zero-dependency Node CLI that turns one plain-English journey into a cast of adversarial human behaviours (the impatient double-clicker, the person who goes Back to an old checkout form, the abandoner) and runs them through Kane CLI in a real browser. A hazard is only reported when it reproduces twice with the same typed value; one failure is "suspected", and setup errors or an unachievable behaviour are "inconclusive". A confirmed hazard becomes a repair brief for a coding agent, a locked `_test.md` written before the fix, and a re-audit of the repaired app against that locked contract, followed by `kane-cli testmd run` as a replay. On a store written by a fresh Claude session, Stuntman confirmed that a customer shown $49.00 could be charged $61 (2 of 2 runs). OpenCode (model opencode/big-pickle) then read Kane's repair brief and patched the shop itself (a server-side draft token that binds each checkout form to the exact total shown); the re-audit against the locked contract was clean (2 of 2 usable runs) and the locked test replayed PASS. I built it with Claude (Anthropic) [add any other agent you used]. Kane verifies the behaviours end to end in a real browser; Stuntman adds the confidence rule, the lock and the repair loop around it. Limits are documented honestly: Kane's agent cannot perform in-flight actions, the agent is only told (not sandboxed) not to read git history, and the offline fixtures are hand-authored.
- **Live URL:** https://orjinameh.github.io/stuntman/ (enable GitHub Pages first, see below)
- **Install command:** `git clone https://github.com/orjinameh/stuntman && cd stuntman && npm test` (offline demo: `node bin/stuntman.mjs audit --fixture-state broken`)
- **Lane:** Verification baked into your workflow
- **Coding agents:** Claude (built the tool) and OpenCode (repaired the app through `heal`)

## Video (3 to 4 minutes, screen recording with your voice)

Record these real things; cut waiting time rather than faking it.

1. **0:00 The bug (20 s).** Show the checkout page with the total, then `examples/live-f001-report/report.html`: "Shown $49.00. Charged $61. The agent's tests passed."
2. **0:20 Why nobody tests it (20 s).** "Agents test the happy path. Nobody wrote down what a customer who changes their mind does."
3. **0:40 One persona is one JSON file (30 s).** Open `personas/stale-total.json`: behaviour plus invariant ("never charged more than shown").
4. **1:10 The audit (50 s).** Show `stuntman audit --live` output (sped up). Point at CONFIRMED and "2 of 2 runs failed with the same typed violation". Mention one failure is only "suspected".
5. **2:00 Brief and lock (30 s).** Open the repair brief, then `lock`: "The test exists before the fix, so the agent cannot weaken it."
6. **2:30 Repair and re-audit (40 s).** `heal` with OpenCode: show the agent reading the brief, then `git diff demo/app/server.mjs | head -40`, the app restarting, and CLEAN with "2 usable of 2".
7. **3:10 Replay (20 s).** `verify`: PASS (118 s). If you cannot re-run it live, show `examples/opencode-heal/4-verify-pass.jpg`.
8. **3:30 Honesty (20 s).** "The agent was told not to look at the pre-written fix and its design is different from mine. Kane's agent can't do in-flight actions, so some personas come back inconclusive instead of guessing."

## Posts (post only after the video link exists)

**Post 1 (X / LinkedIn)**
An agent built a store. Its tests passed. A customer shown $49.00 was charged $61.
I built Stuntman for the Kane CLI hackathon: it plays the customers nobody wrote a test for, proves bugs in a real browser (two identical failures or it's only "suspected"), locks the test before the fix, and re-audits the repair.
Repo: https://github.com/orjinameh/stuntman · Video: [URL]

**Post 2 (Hacker News / Reddit / dev.to)**
Title: Show HN: Stuntman – adversarial customer personas that find bugs your agent's tests miss
Body: [2 to 3 sentences from the paragraph above]. What was hard: Kane's agent works one step at a time, so some personas (in-flight second click) are unachievable and reported as inconclusive; my first oracle compared against a stale total; my first restart killed my own process. All of that is in LIVE_RUN.md. Repo: https://github.com/orjinameh/stuntman
