/* THE INVITATION EMAIL HAS TO SAY HOW LONG THE LINK REALLY LASTS.

   THE BUG THIS EXISTS FOR. The email read "This link works once and runs
   out in 72 hours", with the number typed into the sentence by hand. The
   real lifetime is read from the database, from staff_invite_lifetime,
   three steps earlier in the same function. So the two were never
   connected, and the day anybody changed that setting the email would
   start telling people a number that was not true.

   Nobody would have found it either. The email is sent to somebody outside
   the company, the admin never sees it, and a wrong number in it looks
   exactly like a right one until the link has already died in somebody's
   hands.

   Two things are checked. That howLong turns an interval into the words a
   person would use, and that the email sentence carries no number of its
   own any more. The second one is the real guard: the helper being correct
   is worth nothing if the sentence stops using it. */

import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const SOURCE = "supabase/functions/invite-staff/index.ts";

/* The real function, with Deno.serve handing the handler over instead of
   listening and the remote import cut out. Same shape as the read-image
   test, so howLong below is the one that actually ships. */
const dir = mkdtempSync(join(tmpdir(), "invite-expiry-"));
await build({
  entryPoints: [SOURCE],
  outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});
const code = readFileSync(join(dir, "fn.mjs"), "utf8")
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = () => ({});");
writeFileSync(join(dir, "fn2.mjs"), code);

globalThis.Deno = { serve: () => {}, env: { get: () => "" } };

const { howLong } = await import(join(dir, "fn2.mjs"));

/* --------------------------------------------------------------------------
   1. THE WORDS, AT THE VALUES THAT ACTUALLY COME UP
   -------------------------------------------------------------------------- */

check("the default, 72 hours, reads as 3 days", howLong(72) === "3 days");
check("48 hours is 2 days, the moment it flips", howLong(48) === "2 days");
check("47 hours is still hours", howLong(47) === "47 hours");
check("24 hours stays hours, because 1 day reads as less", howLong(24) === "24 hours");
check("a week reads as 7 days", howLong(168) === "7 days");
check("one hour is singular", howLong(1) === "1 hour");
check("half an hour is minutes", howLong(0.5) === "30 minutes");
check("one minute is singular", howLong(1 / 60) === "1 minute");

/* --------------------------------------------------------------------------
   2. IT ROUNDS DOWN, AND THAT IS THE POINT

   This is a promise made to somebody who is not in the room. Telling them
   they have more time than the link really has is the version that leaves
   them locked out, so every boundary goes the safe way.
   -------------------------------------------------------------------------- */

check("47.9 hours is 47 hours, never 48", howLong(47.9) === "47 hours");
check("71 hours is 2 days, never 3", howLong(71) === "2 days");
check("95 hours is 3 days, never 4", howLong(95) === "3 days");
check("59 minutes is 59 minutes, never an hour", howLong(59 / 60) === "59 minutes");

/* --------------------------------------------------------------------------
   3. THE SENTENCE USES IT, AND CARRIES NO NUMBER OF ITS OWN

   The helper being right is worth nothing if the email stops calling it.
   -------------------------------------------------------------------------- */

const source = readFileSync(SOURCE, "utf8");
const sentence = source.match(/`This link works once and runs out in [^`]*`/);

check("the email sentence is still there", sentence != null);
check("and it asks howLong rather than stating a number",
  sentence != null && sentence[0].includes("${howLong(hours)}"));
check("no hard coded duration anywhere in the email text",
  sentence != null && !/\d/.test(sentence[0].replace("${howLong(hours)}", "")));

/* And the number it is handed is the one the expiry was worked out from,
   not a second reading that could drift away from it. */
check("the lifetime is read once and used for both",
  /const lifetimeHours = hoursFrom\(lifetime\);/.test(source) &&
  /Date\.now\(\) \+ lifetimeHours \* 3600_000/.test(source) &&
  /sendInvite\(\{ to: email, name, link, hours: lifetimeHours \}\)/.test(source));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
