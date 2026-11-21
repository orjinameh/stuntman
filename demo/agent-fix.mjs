#!/usr/bin/env node
// Reference agent command. A STAND-IN for a real coding agent, used by the test suite and the offline fallback.
// Usage: node demo/agent-fix.mjs <brief.json | brief.md>
// Reads the brief, checks the finding is the 'paid but not shown the confirmation' hazard, applies demo/patches/0001 (idempotently).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const patch = path.join(here, 'patches', '0001-confirm-repeat-submit.patch');
let briefPath = process.argv[2];
if (!briefPath) { console.error('usage: agent-fix.mjs <brief>'); process.exit(2); }
if (briefPath.endsWith('.md')) briefPath = briefPath.replace(/\.md$/, '.json');
let brief;
try { brief = JSON.parse(fs.readFileSync(briefPath, 'utf8')); } catch (e) { console.error(`cannot read brief JSON: ${e.message}`); process.exit(2); }
if (brief.invariant?.observation !== 'final_heading') { console.error(`reference agent only knows the final_heading hazard (got ${brief.invariant?.observation})`); process.exit(3); }
const run = (args) => spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
if (run(['apply', '--check', '--reverse', patch]).status === 0) { console.log(`[agent-fix] ${brief.finding_id}: patch already applied, nothing to do`); process.exit(0); }
const chk = run(['apply', '--check', patch]);
if (chk.status !== 0) { console.error(`[agent-fix] patch does not apply here:\n${chk.stderr}`); process.exit(1); }
const ap = run(['apply', patch]);
if (ap.status !== 0) { console.error(ap.stderr); process.exit(1); }
console.log(`[agent-fix] ${brief.finding_id}: applied 0001-confirm-repeat-submit.patch (a repeat submit lands on the order confirmation)`);
