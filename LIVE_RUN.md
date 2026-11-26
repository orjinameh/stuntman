# LIVE_RUN

**Status: first live run done by the user, 2026-11-21, kane-cli 0.10.7, headless Chrome 158 in a GitHub Codespace.**

First run (`audit --live --persona impatient`): inconclusive, correctly. Kane's agent performed the journey (add to cart, checkout, fill the form, click Pay once) but could not perform a second in-flight click: its click action returns only after the page navigates (`reason_code: assertion_error.step_not_achievable`). So the product was never exercised and no finding was made. Parser lessons: stored values arrive in `run_end.context.variables.<name>.value` (not `final_state`), credits in `credits_consumed`. Both fixed. The `impatient` persona was reworded to ask for a single double-click action; whether that makes the browser submit twice is the next thing to learn. `refresher` and `slow-submit` also depend on in-flight actions and may be unachievable with Kane's sequential agent.

Fill in the rest after the next live audit.

| Field | Value |
|---|---|
| Date / time (UTC) | |
| Kane CLI version (`kane-cli --version`) | |
| Commands run | `node bin/stuntman.mjs audit --live` |
| Credits used (from the report) | |
| `impatient` verdict and observed values | |
| Did `refresher` flake as expected? | |
| Sealed pack path | |
| `testmd run` emitted `test_md_done`? | |
| What differed from fixtures (phrasing that failed, parser surprises) | |

If a persona sentence did not make Kane double-click, rewrite the sentence in `personas/<id>.json` (not in code), then run `stuntman lock --force` if a lock exists.

Second live run: `impatient` came back clean with `final_heading = "Order confirmed"`, but the observed tally said "2 orders" and an odd charged total. The shop had not been reset between runs and orders placed by hand or in the earlier run were still in memory. Stuntman now calls `POST /admin/reset` (config `app.reset`) before every live run, confirming run, heal re-audit and verify. Re-run after this fix; the earlier tally is not trustworthy.

Third live run (after the reset fix): `impatient` was **clean** on `demo/app`. Kane performed "Double-clicking the Pay button", the shop recorded 1 order ($49 charged) and the customer ended on "Order confirmed". The hazard predicted from reading the code did not reproduce in a real browser; that is a genuine result. To prove the detector can find a bug, `demo/control/` (seeded double-order bug, labelled) is the positive control: run it live and record the outcome here.

Fourth live run (full cast, kane-cli 0.10.7, headless, 474.6 credits, 2026-11-21):
- `stale-total`: **CONFIRMED** twice. The checkout page displayed $49.00; after the persona added a second item and used Back to the old form, the shop charged 61. Same typed violation both runs, so F-001.
- `abandoner`, `back-button`, `impatient`: clean. `refresher`: clean (Kane cannot truly reload mid-payment, so this is a weak result; its tally also read "2 orders" next to a single $49 charge, so that count is unreliable).
- `slow-submit`: inconclusive. Kane reported the first Pay click had already navigated (`step_not_achievable`), as predicted.
- `returning`: inconclusive (timeout after 277 s; Kane's own check said `order_count` was not 2 and it read 3 orders / 147 charged). Investigate `raw/returning.run1.*` before trusting either number.
The invariant for `stale-total` was changed from "equals the displayed total" to "no more than the displayed total" (persona 1.1.0) before locking, so a shop that refuses the stale payment passes instead of failing as a zero charge. The finding was produced under 1.0.0; re-audit that persona before locking.

Fifth live run (`--persona stale-total`, 65 credits): inconclusive. Kane followed the journey literally and clicked Pay on the original cart (journey step 3) before performing the persona's detour; its own verdict: "paid for the original cart before adding the extra item, so it did not follow the requested checkout journey". After Back, Chrome re-fetched the checkout form and showed the updated total, so whether the stale total is shown depends on browser caching. Persona 1.2.0 now says not to click Pay until after the detour, and the compiled objective states that the behaviour overrides the journey wording.

Sixth live run (`--persona stale-total`, persona 1.2.0, 166.5 credits): **CONFIRMED**, 2 of 2 runs, `charged_total = 61` against `displayed_total = $49.00` (F-001). Brief written, contract locked, repair applied from `demo/patches/0002-charge-never-exceeds-displayed-total.patch` (hidden `expected_cents` field; the server redirects to a fresh checkout instead of charging when the cart total changed). The repair was written by Claude in the same chat as the build, not by a fresh session; the locked test decides whether it works.

Seventh live run (`heal F-001`, repair applied, 2 re-audit runs): STILL REPRODUCIBLE, `charged_total = $61.00` against `displayed_total = $49.00`. With the repair loaded a stale $49 form is refused (nothing charged), so a $61 charge means the form that was submitted showed $61 and the oracle compared against a total read earlier. The oracle was flawed: `displayed_total` was captured once, before the cart changed. Persona 1.3.0 captures it immediately before Pay from the form actually submitted. This casts doubt on the first confirmation of F-001 (it may have been a stale-oracle artefact), so the baseline must be re-audited with 1.3.0 before locking again. Open question until then: is F-001 real?

Eighth live run (`heal F-001` after a proper restart, repair loaded): INCONCLUSIVE, `charged_total` not captured. With the repair loaded the stale form is refused and no order is created, so the orders page is empty and the observation had no value. The observation instructions now say to store 0 when there are no orders (this clarifies how an empty page is read; it does not loosen the invariant: the charge must still be no more than the displayed total). The contract changed, so it is re-locked (`lock --force`) before the next heal. F-001's baseline confirmation (charged 61 vs displayed $49.00, 2 of 2, persona 1.3.0, report 20261121-154830) is unaffected because orders existed.

Ninth live run (`heal F-001`, repair loaded, contract re-locked with the empty-page rule): INCONCLUSIVE (`step_not_achievable`: `displayed_total` was never stored; Kane skipped the store step in at least one run). The shop state afterwards held a single $61.00 order and charge. With the repair loaded a payment is accepted only when the form's hidden total equals the cart total, and that total is the one printed on the page, so a $61 charge implies the form showed $61: the repair is consistent with the evidence, but the oracle had no captured value to prove it. Persona 1.4.0 turns the routine into numbered steps and forbids paying until `displayed_total` is stored (wording only; same invariant). F-001 was established on the unfixed app under 1.3.0 (2 of 2); re-audit the unfixed app once under 1.4.0 so the before and after use the same contract.

Tenth live run: unfixed app under persona 1.4.0 CONFIRMED again (2 of 2, 122.8 credits, report 20261121-163242). The following `heal` (repair loaded) was INCONCLUSIVE: Kane pressed Back too many times and reached the original shop page without showing the checkout form (`step_not_achievable`). The browser history is deterministic ([/, /cart, /checkout, /, /cart]), so persona 1.5.0 says exactly two Back presses with a Forward recovery (wording only). Three consecutive heal attempts have now been inconclusive for three different agent-execution reasons (empty orders page, `displayed_total` skipped, Back overshoot); none contradicts the repair.

Eleventh live run: `heal` with persona 1.5.0 was INCONCLUSIVE again (`displayed_total` unavailable). Four consecutive heals have failed for agent-execution reasons. `heal` now retries unusable attempts (up to 4, needs two usable runs) and prints why each attempt was not usable.

Twelfth live run (`heal`, 4 attempts, repair loaded): 1 usable run (OK), 3 unusable with `charged_total` not captured. The unusable ones are the refusal case: the repaired shop refuses the stale payment, the orders page is empty, and Kane would not store a number for an empty page even when told to store 0. The observations now ask for the word NONE on an empty orders page, and the classifier reads NONE (and similar words) as zero for numeric comparisons. Contract changed again: re-lock before the next heal.

Thirteenth live run (`heal`, 4 attempts): again 1 usable (ok), 2 `charged_total` not captured, 1 `Objective completed` not usable. Added `app.probe` so order count and total charged come from the shop's `/__state` instead of Kane reading an empty page; re-run the heal to see whether the refusal case now resolves to a zero charge.

Fourteenth live run (`heal`, probe active): attempt 1 violation (`61.00` vs `$49.00`), attempt 2 not usable (`displayed_total` unavailable), attempt 3 ok, so NOT CLEAN. No restart line appeared after the repair was copied in, so the shop may have kept running the old code and attempt 1 may have re-tested the bug. `heal` now restarts the app itself (`app.restart_cmd`) and waits for `/health` before re-auditing.

Fifteenth run: the heal produced no verdict and the shell only showed `2` from the following `grep`. Cause: the new `restart_cmd` used `pkill -f` on the shop's file path, which also matched the running `heal` process (its command line contains `demo/app/server.mjs`), so heal killed itself. The pattern is now anchored (`^node( --watch)? demo/app/server\.mjs$`) and a regression test proves it spares a process that only mentions the path.

Fifteenth attempt: the restart added to `heal` used `pkill -f` on the shop's path, which also matched `heal`'s own command line (it contains `demo/app/server.mjs`), so the heal was killed right after printing "restarting the app…" (`Terminated`). Replaced by `app.start_cmd`: the app's port is found through `/proc`, only the listener on that port is stopped, then the start command runs detached and `/health` is awaited. A test runs a heal whose agent command contains the app path and checks it survives.

Final live results (2026-11-21, kane-cli 0.10.7, headless Chrome 158, Codespaces): after `app.start_cmd` made `heal` restart the app deterministically, the repaired shop was re-audited **CLEAN** (2 of 2 usable runs, attempts 1 and 2), and `verify --live` replayed `tests/stuntman-stale-total_test.md` with **PASS** in 161.0 s. F-001 (charged 61 against a displayed $49.00) was confirmed 2 of 2 on the unfixed app (report 20261121-163242, under persona 1.4.0); the re-audit ran under persona 1.5.0 (wording only). Evidence copied to `examples/live-f001-report/`. The repair was written by Claude in the build chat and applied by `cp`; no autonomous agent fix was demonstrated.

Autonomous repair run (2026-11-25, OpenCode 1.19.6, model opencode/big-pickle, `heal F-001 --agent-cmd 'node demo/agent-run.mjs {brief}'`): the agent read the repair brief, inspected `demo/app/server.mjs`, edited it, ran `node --check`, and summarised its change. The adapter reported `changed by opencode; protected files untouched; file parses`. After the restart the re-audit was **CLEAN** (attempts 1 and 2 both ok, 2 usable of 2). The agent's design differs from the pre-written repair: a server-side draft token bound to the session and the exact displayed total, charging that snapshot, consuming only those lines from the cart, idempotent replay. Caveat: in this run the pre-written repair had been moved to `.stuntman-hidden-*` directories inside the repository, whose names were visible in the agent's own directory listing; the adapter now stashes it in a random temp directory instead. Not yet replayed: `verify --live` against the agent-repaired app.
