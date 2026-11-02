/* ==========================================================================
   STAMP VERSION
   Writes dist/version.txt holding the commit the build was made from.

   WHY IT EXISTS. After a push, GitHub's smoke test (.github/workflows/
   smoke.yml) has to know when Cloudflare has actually published THAT commit,
   and not the one before it. Cloudflare builds on its own, so the only honest
   signal is the site itself saying which commit it is serving. This file is
   that signal: the smoke test asks for /version.txt until it shows the commit
   that was pushed, then checks the pages answer.

   WHERE THE COMMIT COMES FROM, in order:
     1. CF_PAGES_COMMIT_SHA      set by Cloudflare Pages during its build
     2. WORKERS_CI_COMMIT_SHA    set by Cloudflare Workers builds
     3. GITHUB_SHA               set by GitHub Actions
     4. git rev-parse HEAD       a local build
     5. "unknown"                nothing worked

   WHAT IT MUST NEVER DO. Fail the build. A site losing a deploy because a
   housekeeping file could not be written is worse than a smoke test that
   waits and then says it never saw the commit. Every path exits 0.
   ========================================================================== */

import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

/* ===== 1. Work out the commit ===== */
function commit() {
  const fromEnv =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.trim();
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}

/* ===== 2. Write it, and never fail ===== */
try {
  await mkdir("dist", { recursive: true });
  const sha = commit();
  await writeFile("dist/version.txt", sha + "\n");
  console.log(`stamp-version: dist/version.txt = ${sha}`);
} catch (error) {
  console.log(`stamp-version: could not write version.txt (${error.message}), carrying on`);
}
process.exit(0);
