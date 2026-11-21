# Positive control (seeded hazard)

`app/server.mjs` is a small store with a **deliberately seeded** bug: the order handler reads the cart, waits for the fake payment provider (400 ms), and only then clears the cart, so two submits inside that window create two orders and two charges. It was written by the Stuntman builder, not by a fresh agent session, and is **not** the main demo (`demo/app` is).

Why it exists: a clean audit of `demo/app` proves nothing unless the detector can also find a bug. This is the known-bad case. `app/server.fixed.mjs` is the same app with a single-use checkout nonce (a reference repair).

Run it (port 3001) from this folder:

```bash
PORT=3001 node app/server.mjs &
node ../../bin/stuntman.mjs audit --live --headless          # real Kane
node ../../bin/stuntman.mjs audit --fixture-state broken     # offline replay
```
