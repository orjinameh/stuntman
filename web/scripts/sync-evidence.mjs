// Copies the original screenshots from ../examples/opencode-heal into public/evidence.
// Originals are only read, never modified. Skips quietly if the source is missing
// (for example when Vercel's root directory excludes the parent), keeping any committed copies.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "examples", "opencode-heal");
const dst = join(here, "..", "public", "evidence");
const files = ["1-agent-run-and-guard.jpg", "2-clean-verdict.jpg", "3-agent-diff.jpg", "4-verify-pass.jpg"];

mkdirSync(dst, { recursive: true });
for (const f of files) {
  const from = join(src, f);
  if (existsSync(from)) copyFileSync(from, join(dst, f));
  else if (!existsSync(join(dst, f))) console.warn("evidence missing: " + f);
}
