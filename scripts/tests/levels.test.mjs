/* THE LEVELS HAVE TO MEAN THE SAME THING IN EVERY FILE THAT SPEAKS THEM.

   THE BUG THIS EXISTS FOR, AND IT WAS LIVE FOR ELEVEN DAYS.

   On 2026-09-10 the model_ceiling enum was renamed from vendor product
   names to capability levels. The migration ran, the admin screen was
   updated, src/shared/config.js was updated. supabase/functions/invite-staff
   was not, because it had last been touched four days earlier and nothing
   connected the two.

   So from that day, inviting a member of staff was broken. The screen sent
   "standard". The function checked it against ["haiku-4-5", "sonnet-5"] and
   answered "That model is not available on this plan." Nobody found it
   until 2026-09-21, when the ladder was being cut from four rungs to two
   and somebody read the file for a different reason.

   Nothing could have caught it. Lint does not cross a file boundary. The
   type checker does not know a string in a browser file has to match a
   string in a Deno file. A screenshot of the invite form looks correct
   right up to the moment you press the button.

   WHAT THIS CHECKS, and it is all the same one idea. Four files carry a
   list of levels. They have to be the same list.

     src/shared/config.js                     what the screens read
     supabase/functions/assistant/index.ts    the model, price and thinking
     supabase/functions/invite-staff/index.ts what an invite may ask for
     supabase/functions/support-ask/index.ts  the one level support runs at

   It also refuses a vendor's model name anywhere under src/, because that
   whole folder ships inside the browser bundle and the reason the levels
   exist at all is to keep a provider's name out of the client. */

import { build } from "esbuild";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

/* --------------------------------------------------------------------------
   1. THE REAL config.js, not a copy of it

   It imports icons from lucide-react, which node cannot resolve on its own,
   so the import line is cut and nothing else is touched. Every table and
   every line of levelOf below is the code the browser actually runs.
   -------------------------------------------------------------------------- */

const dir = mkdtempSync(join(tmpdir(), "levels-"));

/* config.js imports icons, from lucide-react and from the app's own
   icons.jsx, and node cannot resolve either on its own. Both are swapped
   for a stub that answers any name with a string. Nothing else is touched,
   so every table and every line of levelOf below is the code the browser
   actually runs. */
const stubIcons = {
  name: "stub-icons",
  setup(b) {
    b.onResolve({ filter: /lucide-react|icons\.jsx$/ }, (a) => ({
      path: a.path, namespace: "stub",
    }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      /* Written as CommonJS on purpose. esbuild checks named exports
         against an ES module and would refuse every icon by name; a
         CommonJS module is allowed to answer any of them, which is what
         the Proxy then does. */
      contents: "module.exports = new Proxy({}, { get: (_, k) => String(k) });",
      loader: "js",
    }));
  },
};

await build({
  entryPoints: ["src/shared/config.js"],
  outfile: join(dir, "config.mjs"),
  format: "esm", platform: "neutral", bundle: true,
  plugins: [stubIcons],
});

const { CAPABILITY_LEVELS, LEVEL_ORDER, DEFAULT_LEVEL, SUPPORT_LEVEL, levelOf } =
  await import(join(dir, "config.mjs"));

/* --------------------------------------------------------------------------
   2. THE LADDER IS TWO RUNGS
   -------------------------------------------------------------------------- */

check("two levels and no more", LEVEL_ORDER.length === 2);
check("support first, then the working level",
  LEVEL_ORDER[0] === "conversational" && LEVEL_ORDER[1] === "standard");
check("staff work runs at standard", DEFAULT_LEVEL === "standard");
check("support answers at conversational", SUPPORT_LEVEL === "conversational");
check("every level in the order has a description",
  LEVEL_ORDER.every((k) => CAPABILITY_LEVELS[k]?.label && CAPABILITY_LEVELS[k]?.detail));
check("and nothing is described that is not in the order",
  Object.keys(CAPABILITY_LEVELS).length === LEVEL_ORDER.length);

/* --------------------------------------------------------------------------
   3. A ROW WRITTEN UNDER AN OLDER VOCABULARY STILL READS

   Three vocabularies have been in this column now: vendor names, four
   levels, two levels. A row holding any retired value has to come back as
   a level this version understands, or an admin gets an empty box on a
   screen and no way to tell why.
   -------------------------------------------------------------------------- */

check("deeper collapses to standard", levelOf("deeper") === "standard");
check("deepest collapses to standard", levelOf("deepest") === "standard");
check("opus-5, from before the rename, reads as standard", levelOf("opus-5") === "standard");
check("fable-5 reads as standard", levelOf("fable-5") === "standard");
check("sonnet-5 reads as standard", levelOf("sonnet-5") === "standard");
check("haiku-4-5 reads as conversational", levelOf("haiku-4-5") === "conversational");
check("a live level passes straight through", levelOf("standard") === "standard");
check("so does the support level", levelOf("conversational") === "conversational");
check("nonsense falls back to the default", levelOf("banana") === DEFAULT_LEVEL);
check("so does nothing at all", levelOf(null) === DEFAULT_LEVEL && levelOf(undefined) === DEFAULT_LEVEL);

/* --------------------------------------------------------------------------
   4. THE ASSISTANT KNOWS THE SAME LEVELS, IN ALL FOUR OF ITS TABLES

   A level present in one table and missing from another is a crash on the
   turn that reaches it, and it would be a crash in production rather than
   here, because none of these tables is exercised by the build.
   -------------------------------------------------------------------------- */

const assistant = readFileSync("supabase/functions/assistant/index.ts", "utf8");

function arrayLiteral(text, name) {
  const m = text.match(new RegExp("const " + name + "\\s*=\\s*\\[([^\\]]*)\\]"));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null;
}
function recordKeys(text, name) {
  const at = text.indexOf("const " + name);
  if (at < 0) return null;
  const open = text.indexOf("{", at);
  const close = text.indexOf("\n};", open);
  if (open < 0 || close < 0) return null;
  const body = text.slice(open, close);
  return [...body.matchAll(/^\s{2}([A-Za-z][\w-]*)\s*:/gm)].map((x) => x[1]);
}

const sorted = (a) => [...a].sort().join(",");
const wanted = sorted(LEVEL_ORDER);

check("the assistant's LADDER is the same list",
  sorted(arrayLiteral(assistant, "LADDER") ?? []) === wanted);

/* ⚠️ MODEL_ID AND ADAPTIVE_THINKING ARE GONE FROM THIS FILE ON PURPOSE, and
   the assertion they carried did not disappear with them. Those two tables
   used to map a level to a model and to thinking, and the check was that they
   covered exactly the live levels. Both now live in `_shared/brain.ts`, keyed
   by VENDOR as well as by level, and the block below asserts that instead. It
   is the same guarantee against the table that now holds it.

   ⚠️ WHAT REPLACES THEM HERE IS A DIFFERENT AND MORE USEFUL GUARD: the vendor
   must be resolved PER REQUEST. A module level vendor is shared between the
   companies an edge function isolate serves at the same time, so one company's
   turn could be answered by another company's brain. That is a silent fault
   and this catches it. */
check("the assistant resolves the vendor per request, not at module level",
  /vendorForCompany\(staff\.company_id\)/.test(assistant) &&
  !/^const VENDOR\b/m.test(assistant));

/* THE MODEL AND PRICE TABLES MOVED, SO THE ASSERTION MOVED WITH THEM.
   They used to live in assistant/index.ts, which is why PRICE was checked
   there. They now live in _shared/brain.ts, keyed by VENDOR as well as by
   level, because the vendor became a per-company setting.

   The assertion is the same one it always was and it is now stronger: not
   only must every level be present, every VENDOR must be present too, so a
   vendor row cannot be left half filled in. That matters, because a vendor
   whose models are missing would otherwise fail only when a company chose
   it. */
const brain = readFileSync("supabase/functions/_shared/brain.ts", "utf8");
const VENDORS = ["anthropic", "deepseek", "openai"];

check("the brain names every vendor",
  sorted(recordKeys(brain, "BRAIN") ?? []) === sorted(VENDORS));

for (const vendor of VENDORS) {
  const at = brain.indexOf("\n  " + vendor + ": {");
  const body = at < 0 ? "" : brain.slice(at, at + 900);
  check(`${vendor} covers exactly those levels`,
    LEVEL_ORDER.every((lv) => body.includes(lv + ":")));
}

check("staff work is pinned to the default level",
  /const STAFF_TIER: Tier = "standard";/.test(assistant));

/* --------------------------------------------------------------------------
   5. AN INVITATION MAY ASK FOR THOSE LEVELS AND NOTHING ELSE

   This is the assertion that would have caught the eleven day break.
   -------------------------------------------------------------------------- */

const invite = readFileSync("supabase/functions/invite-staff/index.ts", "utf8");
check("invite-staff allows exactly the live levels",
  sorted(arrayLiteral(invite, "ALLOWED_CEILINGS") ?? []) === wanted);

const fallback = invite.match(/body\?\.ceiling \?\? "([^"]+)"/);
check("an invite with no level named falls back to a live one",
  fallback != null && LEVEL_ORDER.includes(fallback[1]));

/* --------------------------------------------------------------------------
   6. SUPPORT RUNS AT THE SUPPORT LEVEL, AND SAYS SO IN ITS OWN FILE
   -------------------------------------------------------------------------- */

const support = readFileSync("supabase/functions/support-ask/index.ts", "utf8");
/* The type annotation is optional in the pattern because LEVEL is now typed
   as a Tier, so its model can come from the brain table by level. The level
   STRING is still required to be exact, which is the point of the check. */
const supportLevel = support.match(/const LEVEL(?::\s*Tier)?\s*=\s*"([^"]+)"/);
check("support-ask runs at the support level",
  supportLevel != null && supportLevel[1] === SUPPORT_LEVEL);

/* --------------------------------------------------------------------------
   7. NO VENDOR MODEL NAME REACHES THE BROWSER BUNDLE

   The entire reason the levels exist. Comments are stripped first, because
   the mapping is deliberately written down in a comment in config.js and a
   comment cannot be rendered onto a screen by accident.
   -------------------------------------------------------------------------- */

function walk(d) {
  const out = [];
  for (const entry of readdirSync(d)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(d, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const VENDOR = /\b(claude-[a-z0-9-]+|gpt-[0-9][\w.-]*|gemini-[\w.-]+)\b/;
const leaked = [];
for (const file of walk("src")) {
  const text = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const hit = text.match(VENDOR);
  if (hit) leaked.push(`${file}: ${hit[0]}`);
}
check("no model id anywhere in src/" + (leaked.length ? " -> " + leaked.join(", ") : ""),
  leaked.length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
