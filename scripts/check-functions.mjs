/* ==========================================================================
   CHECK THE EDGE FUNCTIONS BEFORE ANYTHING GOES NEAR A DEPLOY

   WHY THIS EXISTS
   On 2026-09-09 a change to support-ask went live carrying a variable that
   was used and never declared. It took support down for three messages.
   Every reply was composed, saved to the database, and then the function
   threw on the way out, so the customer got silence while the record showed
   a perfect answer.

   TWO THINGS FAILED, AND ONLY ONE OF THEM WAS THE CODE.

   1. An edit script asserted on three anchors, the third missed, Python
      raised, and the file was never written. The two edits that HAD matched
      were lost. A later script then added the code that USED the variable
      without the code that declared it.

   2. The type checker was run, and it knew. But it was run as
      `... | grep -E "TS1[0-9]{3}"`, which only shows syntax errors. A
      missing name is TS2304. The check was told not to report the one thing
      that was wrong.

   So this script exists to make the second one impossible to repeat. It
   does not filter down to a class of error somebody guessed at in advance.
   It reports everything except the two things that are genuinely fine in
   Deno and genuinely broken in tsc: the Deno global, and jsr: / npm: /
   https: module specifiers.

   RUN IT
     node scripts/check-functions.mjs

   Exits non zero if anything is wrong. Run it before every deploy.
   ========================================================================== */

import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "supabase/functions";

/* The only excuses. Everything else is a real problem.
     TS2304 Cannot find name 'Deno'   the Deno global, absent from tsc's libs
     TS2307 / TS2882  jsr:, npm: and https: imports, which tsc cannot resolve
     TS7006 implicit any on a callback parameter, which Deno does not enforce
   Note that TS2304 is only excused for Deno itself. A missing name of any
   other kind is exactly the bug this file was written for and must fail. */
function isJustDenoNoise(line) {
  if (/error TS2304: Cannot find name 'Deno'/.test(line)) return true;
  if (/error TS(2307|2882).*(jsr:|npm:|https:)/.test(line)) return true;
  if (/error TS7006/.test(line)) return true;
  return false;
}

/* Every function's entry point, PLUS every file in _shared.

   _shared was added on 2026-09-15 and here is why. A shared module only
   got type checked if some function already imported it, because the walk
   below only ever looked for <dir>/index.ts. So a shared module written
   before its first caller existed was checked by nothing at all, and the
   first time anybody found out it was broken was at runtime, on the live
   project. _shared/canva.ts sat in exactly that state for an hour.

   A shared module is the worst place to leave unchecked, because when it
   does break it breaks every function that imports it rather than one. */
const functions = existsSync(ROOT)
  ? [
      ...readdirSync(ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
        .map((entry) => join(ROOT, entry.name, "index.ts"))
        .filter((path) => existsSync(path)),
      ...(existsSync(join(ROOT, "_shared"))
        ? readdirSync(join(ROOT, "_shared"))
            .filter((name) => name.endsWith(".ts"))
            .map((name) => join(ROOT, "_shared", name))
        : []),
    ]
  : [];

if (!functions.length) {
  console.error(`No functions found under ${ROOT}`);
  process.exit(1);
}

let bad = 0;

for (const file of functions) {
  let output = "";
  try {
    execFileSync(
      "npx",
      /* allowImportingTsExtensions, added 2026-09-14 when the first shared
         module between two functions appeared. Deno REQUIRES the .ts on a
         relative import; tsc refuses it by default with TS5097. Without
         this flag the checker fails correct code, which is the fastest way
         to teach somebody to stop running the checker. */
      ["tsc", "--noEmit", "--target", "es2022", "--lib", "es2022,dom",
       "--module", "esnext", "--moduleResolution", "bundler", "--skipLibCheck",
       "--allowImportingTsExtensions", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }

  const real = output
    .split("\n")
    .filter((line) => line.includes("error TS"))
    .filter((line) => !isJustDenoNoise(line));

  if (real.length) {
    bad += real.length;
    console.log(`FAIL  ${file}`);
    for (const line of real) console.log(`      ${line.trim()}`);
  } else {
    console.log(`ok    ${file}`);
  }
}

console.log(bad ? `\n${bad} real problem${bad === 1 ? "" : "s"}. Do not deploy.` : "\nAll clean.");
process.exit(bad ? 1 : 0);
