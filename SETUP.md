# SETUP

## Offline (everything except real Kane runs)

1. Install Node.js 20 or newer and git. Check: `node -v` (>= 20), `git --version`.
2. Unzip and enter the project:
   ```bash
   unzip -o stuntman-built.zip
   rm stuntman-built.zip
   cd stuntman
   ```
3. Run the tests: `npm test` (50 tests, no network, no dependencies to install).
4. Run the fixture demo:
   ```bash
   node bin/stuntman.mjs audit --fixture-state broken    # exit 1 is expected
   node bin/stuntman.mjs brief F-001
   node bin/stuntman.mjs lock
   node bin/stuntman.mjs heal F-001 --agent-cmd 'node demo/agent-fix.mjs {brief}' --fixture-state fixed
   node bin/stuntman.mjs verify --fixture
   ```
5. Optional: install globally with `npm install -g .` and use `stuntman` instead of `node bin/stuntman.mjs`.

`demo/agent-fix.mjs` modifies `demo/app/server.mjs` (applies the reference patch). To repeat the demo afterwards: `git apply -R demo/patches/0001-confirm-repeat-submit.patch && rm -rf tests stuntman.lock runs` (or `git checkout demo/app/server.mjs` once the unpatched app is committed).

## Live (real browser through Kane CLI)

1. Install Google Chrome (stable).
2. Create a TestMu AI account and claim the hackathon's free Kane credits with the same email you use for the event.
3. `npm install -g @testmuai/kane-cli`, then `kane-cli login` (browser OAuth) or `kane-cli login --username <user> --access-key <key>` (key under Settings, then Keys, in the TestMu AI dashboard).
4. Confirm: `kane-cli whoami` and `kane-cli balance`.
5. Start the app under test in a second terminal: `node demo/app/server.mjs` (port 3000; use `PORT=3100` and edit `app.base_url` if 3000 is taken).
6. `node bin/stuntman.mjs audit --live`. Add `--headless` or `KANE_HEADLESS=1` for CI.
7. Fill in `LIVE_RUN.md` with what you saw.
