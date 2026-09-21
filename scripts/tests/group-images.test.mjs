/* EVERY PICTURE IN EXACTLY ONE GROUP.

   The grouping is a judgement and judgements are sometimes wrong, so the
   one thing that must never happen is a picture quietly disappearing. A
   dropped page is a file somebody uploaded and never got, and they would
   only find out weeks later when an answer was missing it.

   So the answer is checked rather than trusted, and anything that does not
   add up falls back to one entry per picture, which is never wrong, only
   tedious. These are the ways it can fail to add up. */

import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const dir = mkdtempSync(join(tmpdir(), "group-images-"));
await build({
  entryPoints: ["supabase/functions/group-images/index.ts"],
  outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});

let code = readFileSync(join(dir, "fn.mjs"), "utf8");
code = code
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = () => ({});")
  .replace(/import Anthropic from "[^"]+";/, "class Anthropic {}")
  .replace(/import "[^"]*edge-runtime[^"]*";/, "");
writeFileSync(join(dir, "fn2.mjs"), code);

globalThis.Deno = { serve: () => {}, env: { get: () => "" } };
const { groupsAreSound } = await import(join(dir, "fn2.mjs"));

/* The case Anthony actually described: ten pictures, seven of them one
   document and three separate things. */
const sevenAndThree = [
  { members: [0, 1, 2, 3, 4, 5, 6] },
  { members: [7] },
  { members: [8] },
  { members: [9] },
];
check("seven pages and three loose ones is sound", groupsAreSound(sevenAndThree, 10));

check("ten separate logos is sound",
  groupsAreSound(Array.from({ length: 10 }, (_, i) => ({ members: [i] })), 10));
check("one document of ten pages is sound", groupsAreSound([{ members: [0,1,2,3,4,5,6,7,8,9] }], 10));
check("a single picture is sound", groupsAreSound([{ members: [0] }], 1));
check("out of order members are still sound", groupsAreSound([{ members: [2,0,1] }], 3));

/* Every way it can be wrong. */
check("a dropped picture is REFUSED", !groupsAreSound([{ members: [0, 1] }], 3));
check("a picture in two groups is REFUSED", !groupsAreSound([{ members: [0, 1] }, { members: [1, 2] }], 3));
check("a position that does not exist is REFUSED", !groupsAreSound([{ members: [0, 5] }], 2));
check("a negative position is REFUSED", !groupsAreSound([{ members: [-1, 0] }], 2));
check("an empty group is REFUSED", !groupsAreSound([{ members: [] }, { members: [0] }], 1));
check("no groups at all is REFUSED", !groupsAreSound([], 3));
check("members that are not a list is REFUSED", !groupsAreSound([{ members: "0,1" }], 2));
check("a group with no members key is REFUSED", !groupsAreSound([{ title: "x" }], 1));
check("not an array at all is REFUSED", !groupsAreSound(null, 2));
check("a fractional position is REFUSED", !groupsAreSound([{ members: [0.5] }], 1));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
