#!/usr/bin/env node
import { main } from '../src/cli.mjs';

// Piping into `head` closes stdout early; that is not an error.
for (const stream of [process.stdout, process.stderr]) stream.on('error', (e) => { if (e.code !== 'EPIPE') throw e; });
main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code ?? 0; },
  (err) => { process.stderr.write(`stuntman: unexpected error: ${err && err.stack || err}\n`); process.exitCode = 2; }
);
