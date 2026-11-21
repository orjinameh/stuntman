# Stuntman

**Your agent tested the happy path. Stuntman plays everyone else.**

A human-factor regression suite for agent-built web apps, built for the KaneCLI Online Hackathon (TestMu AI, 12–26 Nov 2026).

Stuntman turns one plain-English purchase journey into a cast of adversarial human behaviours, proves which hazards are real in a real browser with Kane CLI, hands the coding agent a typed repair brief, and locks every confirmed hazard into a committed test that replays for free.

## Status

The idea is selected and the implementation handoff is ready. Product code is being built from the handoff; this repository currently contains the brief and the self-contained build specification.

## Documents

- **Winning brief:** [`docs/idea-forge/2026-11-20-kanecli-brief.md`](docs/idea-forge/2026-11-20-kanecli-brief.md)
- **Implementation handoff:** [`docs/idea-forge/2026-11-20-kanecli-handoff/implementation-handoff.md`](docs/idea-forge/2026-11-20-kanecli-handoff/implementation-handoff.md)
- **Paste-ready prompt:** [`docs/idea-forge/2026-11-20-kanecli-handoff/PASTE_ME.md`](docs/idea-forge/2026-11-20-kanecli-handoff/PASTE_ME.md)

## The product in one paragraph

An agent asked to "build a checkout" builds the checkout it was asked for. It clicks Pay once, on a fast connection, in one tab. Its tests pass. Then a real customer clicks Pay twice because the spinner looked stuck, refreshes mid-flow, or comes back after paying — and the app creates a second order and a second charge. Stuntman compiles the journey into a cast of behaviours, runs each one through Kane CLI, confirms only the hazards that reproduce, and hands the coding agent a repair brief plus a test it cannot quietly weaken.

## Event

- KaneCLI Online Hackathon — <https://www.kaneclihack.sh>
- 12–26 Nov 2026 · deadline 26 Nov 2026, 23:59 IST
- Judged on Ships, Verified, Closed loop, and Craft, each weighted equally

Workspace and brief produced with the build-system pipeline.
