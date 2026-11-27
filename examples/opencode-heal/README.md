# Autonomous repair by OpenCode (screenshots)

Four photos of the terminal during `heal F-001 --agent-cmd 'node demo/agent-run.mjs {brief}' --live --headless` with OpenCode 1.19.6 and model `opencode/big-pickle` (2026-11-25). They are screenshots because the Codespace expired before the transcripts and the repaired file were saved; `demo/app/server.mjs` in this repository is the earlier repair (`demo/fixed/server.mjs`), **not** the agent's file.

| File | What it shows |
|---|---|
| `1-agent-run-and-guard.jpg` | the adapter starting (`agent: opencode`), the agent reading `demo/app/server.mjs` and listing the repo. Note the `.stuntman-hidden-*` directories in its listing: this first version of the adapter hid the pre-written repair inside the repo, so their names were visible. The adapter now stashes it in a random temp directory. |
| `2-clean-verdict.jpg` | the agent's summary, `[agent-run] … changed by opencode; protected files untouched; file parses`, the app restarting, `attempt 1: ok`, `attempt 2: ok`, and `CLEAN — … (2 usable of 2 attempts)` |
| `3-agent-diff.jpg` / `4-verify-pass.jpg` | `git diff` of the agent's change (a server-side draft token bound to the session and the exact displayed total; the charge uses that snapshot; replay is idempotent) and then `PASS tests/stuntman-stale-total_test.md 118.0s` from `verify --live` |

The agent's design differs from the pre-written repair, which used a hidden total field and refused stale payments.
