/* THE THREE WORDS A SOURCE'S STATUS IS ALLOWED TO BE.

   On 2026-09-21 addImageSource was written with status "processing". The
   column only accepts pending, ready and failed, so every insert was
   rejected and adding any picture failed with "Could not save that",
   immediately after it had been read and named. It reached main and
   Anthony hit it within the hour.

   Nothing caught it. Lint cannot know what a database column allows, the
   build does not run any of it, and a screenshot of a failed save looks
   the same as a screenshot of a save nobody tried.

   So this reads the source files and refuses any status that is not one
   of the three. It is a blunt check and that is the point: the failure it
   guards against was one invented word. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = ["pending", "ready", "failed"];

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

/* Every `status: "..."` and every `{ status: "..." }` written against a
   knowledge source, wherever it lives. */
const offenders = [];
const looked = [];
for (const file of [...walk("src"), ...walk("supabase/functions")]) {
  const text = readFileSync(file, "utf8");

  /* ONLY FILES THAT WRITE A KNOWLEDGE SOURCE. Scoped, because a chat
     attachment has its own statuses ("reading", "unreadable") that are
     nothing to do with this column, and a check that shouts about those
     is one somebody learns to ignore. */
  if (!text.includes("knowledge_sources")) continue;
  looked.push(file);

  for (const line of text.split("\n")) {
    /* Skip comments, so the note explaining this very bug does not trip it. */
    const trimmed = line.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

    for (const match of line.matchAll(/status:\s*"([a-z_]+)"/g)) {
      if (!ALLOWED.includes(match[1])) offenders.push(`${file}: status: "${match[1]}"`);
    }
  }
}

check(
  `no source is given a status outside ${ALLOWED.join(", ")}`,
  offenders.length === 0,
);
check("and it actually looked at the files that write them", looked.length >= 3);
if (offenders.length) for (const o of offenders) console.log("       " + o);

/* And prove the check can actually fail, because a check that has never
   said no is not a check. */
const pretend = 'status: "processing",';
const caught = [...pretend.matchAll(/status:\s*"([a-z_]+)"/g)].some((m) => !ALLOWED.includes(m[1]));
check("and it really would catch an invented one", caught);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
