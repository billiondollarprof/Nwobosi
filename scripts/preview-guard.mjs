/* ==========================================================================
   PREVIEW GUARD
   Keeps everything that is not production out of search results.

   Cloudflare Pages builds every branch, and a preview deployment is a real
   public URL: testing.<project>.pages.dev serves whatever is on the testing
   branch to anyone who asks for it. That is fine for looking at work in
   progress, and not fine if Google finds it first. Unreleased copy, prices
   and claims indexed under a pages.dev domain is a mess to undo and an
   embarrassing thing for a company selling containment.

   So on any branch that is not production, the build writes two files that
   tell crawlers to stay away: a robots.txt that disallows everything, and
   an X-Robots-Tag header, which is the one that actually binds, because a
   robots.txt asks a crawler not to fetch a page while the header tells it
   not to index one it already has.

   Production writes neither and is untouched.

   This runs after every build, including local ones, where CF_PAGES_BRANCH
   is not set and it does nothing at all.

   It can never fail the build. A marketing site losing a deploy because a
   housekeeping script threw would be a worse outcome than the problem this
   solves, so every path here ends in exit code zero.
   ========================================================================== */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");

/* The branch Cloudflare Pages publishes as the live site. */
const PRODUCTION_BRANCH = "main";

const HEADERS = `# Written by scripts/preview-guard.mjs. Not a source file.
# This is a preview deployment, not the live site.
/*
  X-Robots-Tag: noindex, nofollow, noarchive
`;

const ROBOTS = `# Written by scripts/preview-guard.mjs. Not a source file.
# This is a preview deployment, not the live site.
User-agent: *
Disallow: /
`;

async function main() {
  const branch = process.env.CF_PAGES_BRANCH;

  if (!branch) {
    console.log("preview-guard: not a Cloudflare Pages build, nothing to do.");
    return;
  }

  if (branch === PRODUCTION_BRANCH) {
    console.log(`preview-guard: branch "${branch}" is production, left indexable.`);
    return;
  }

  await writeFile(path.join(OUT, "_headers"), HEADERS, "utf8");
  await writeFile(path.join(OUT, "robots.txt"), ROBOTS, "utf8");
  console.log(`preview-guard: branch "${branch}" is a preview, marked noindex.`);
}

try {
  await main();
} catch (error) {
  /* Deliberately not a failure. See the note at the top of this file. */
  console.warn("preview-guard: skipped.", error?.message ?? error);
}
