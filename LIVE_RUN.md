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
