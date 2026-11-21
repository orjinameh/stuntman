# TESTING

Tick each box. "Auto" items are covered by `npm test` (40 offline tests, no network).

## A. Automated
- [ ] `npm test` passes (40 tests)
- [ ] `npm ls --prod` prints no dependencies (AC-25)
- [ ] `node bin/stuntman.mjs audit --fixture-state broken` exits 1 with `impatient CONFIRMED` (AC-04)

## B. Manual demo run-through (fixture mode, about 2 minutes)
```bash
node bin/stuntman.mjs audit --fixture-state broken ; echo "exit=$?"   # 1
node bin/stuntman.mjs brief F-001
node bin/stuntman.mjs lock
node bin/stuntman.mjs heal F-001 --agent-cmd 'node demo/agent-fix.mjs {brief}' --fixture-state fixed ; echo "exit=$?"   # 0, CLEAN
node bin/stuntman.mjs verify --fixture ; echo "exit=$?"               # 0, PASS, replayed from fixture
git apply -R demo/patches/0001-confirm-repeat-submit.patch && rm -rf tests stuntman.lock runs   # reset (the agent-fix step patched the app)
```
- [ ] Open `runs/<ts>/report.html` from disk: FIXTURE badge, finding card, no external requests (AC-11, AC-27)
- [ ] Edit `personas/impatient.json` (`equals`: `Cart`), run `audit`: exit 2 naming `personas` (AC-17); `git checkout personas`

## C. Manual live checklist (needs Chrome and a TestMu AI account; NOT run by the builder)
- [ ] `kane-cli whoami` and `kane-cli balance` look right
- [ ] `node demo/app/server.mjs &` then `node bin/stuntman.mjs audit --live` completes; `impatient` confirms with `final_heading = "Cart"` (if it comes back clean, record that in `LIVE_RUN.md`; it is a real result)
- [ ] Report contains a `session_dir`; with `unzip` installed it embeds a screenshot from the `.evidence` pack (AC-30)
- [ ] `brief`, `lock`, then `kane-cli testmd run tests/stuntman-impatient_test.md --agent` accepts the emitted file (frontmatter keys, H2 steps) and emits `test_md_done`
- [ ] Apply the fix (`git apply demo/patches/0001-confirm-repeat-submit.patch`, restart the app), re-audit: clean; `verify --live` PASS
- [ ] Record results in `LIVE_RUN.md`

## D. Acceptance criteria map

| AC | Check | Where |
|---|---|---|
| AC-01 | init / overwrite refusal / unknown persona lists ids | auto: `test/cli.test.mjs` |
| AC-02 | objective contents | auto: `test/compile.test.mjs` |
| AC-03 | compiler refusals | auto: `test/compile.test.mjs` |
| AC-04 | fixture is the default, exits 1 | auto: `test/cli.test.mjs` |
| AC-05 | live argv, `KANE_HEADLESS`, `KANE_BIN` | auto vs a test double (`testlib/fake-kane.mjs`); real Kane: section C |
| AC-06 | NDJSON parsing, malformed lines, stderr noise | auto vs test double |
| AC-07 | exit-code mapping, 2/3 never confirm | auto: `classify.test.mjs`, `live.test.mjs` |
| AC-08 | only failures repeated | auto: `cli.test.mjs` (run counts) |
| AC-09 | confirmation rule | auto: `classify.test.mjs` |
| AC-10 | table, report.json, raw transcripts | auto: `cli.test.mjs` |
| AC-11 | single-file HTML, no external requests | auto: `cli.test.mjs` |
| AC-12 | brief md + json | auto: `cli.test.mjs` |
| AC-13 | heal substitution, re-audit twice | auto: `cli.test.mjs` |
| AC-14 | CLEAN / STILL REPRODUCIBLE / exit 2 | auto: `cli.test.mjs` |
| AC-15 | lock writes `_test.md` with documented keys only | auto for structure; Kane acceptance: section C |
| AC-16 | lock file fields | auto: `cli.test.mjs` |
| AC-17 | contract mismatch refuses | auto: `cli.test.mjs` |
| AC-18 | verify --live parses `test_md_done` | auto vs test double; real Kane: section C |
| AC-19 | verify --fixture | auto: `cli.test.mjs` |
| AC-20 | demo app routes and seed | auto: `demo.test.mjs` |
| AC-21 | double submit: one order, one response redirects to an empty cart | auto: `demo.test.mjs` |
| AC-22 | patch applies; repeat submit lands on the confirmation | auto: `demo.test.mjs` |
| AC-23 | persona packs and loader | auto: `compile.test.mjs` |
| AC-24 | clean clone, fixture audit | manual: section B in a fresh clone |
| AC-25 | zero dependencies | auto + `npm ls --prod` |
| AC-26 | budget estimate, refusal, ceiling | auto: `live.test.mjs` |
| AC-27 | LIVE / FIXTURE badge | auto: `cli.test.mjs` |
| AC-28 | second app, other hazard class | auto (fixture): `cli.test.mjs` |
| AC-29 | verify exit codes | auto: `cli.test.mjs`, `live.test.mjs` |
| AC-30 | screenshot extraction | auto vs a synthetic pack: `evidence.test.mjs`; real pack: section C |
