/* ==========================================================================
   PROVE A DEPLOY BEFORE AND AFTER YOU MAKE IT

   WHY THIS EXISTS. The rule is that a redeploy must match what was already
   live and working, byte for byte, except the lines deliberately changed. The
   repository copy and the deployed copy drift: something on this project
   redeploys functions without being asked, and fixes have been made in the
   console and never came back to git. Deploying the repo file over a live
   function can therefore silently undo somebody's fix.

   HOW IT PROVES IT, given that comparison is not literal. The deployed body
   comes back as a transpiled bundle (an eszip), with the types stripped and
   the whitespace collapsed, so a byte comparison is impossible. What DOES
   survive transpiling is every STRING LITERAL, comments do not. So:

     every long string literal in the source   must appear in the deployed body

   That is the technique CLAUDE.md already describes, made into a command.
   "623 of 623" is honest; "byte for byte identical" is not, and cannot be.

   BEFORE A DEPLOY
     node scripts/check-deploy.mjs assistant
   Reads the live body and checks the repo file you are about to deploy from.
   If this says the live copy is NOT the repo copy, STOP: the live one wins.

   AFTER A DEPLOY, WITH THE PREVIOUS COPY TO HAND
     node scripts/check-deploy.mjs assistant --no-loss /tmp/assistant.before.ts
   Checks the new lines landed AND that every literal the old copy had is
   still there, which is how a silently deleted line gets caught.

   Usage:
     node scripts/check-deploy.mjs <slug> [--from <gitref>] [--no-loss <file>]
   ========================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const REF = process.env.SUPABASE_PROJECT_REF || "cbunsqzkhidwjtxdsmxd";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
  || (() => { try { return readFileSync("/data/workspace/.supabase-token", "utf8").trim(); } catch { return ""; } })();

if (!TOKEN) {
  console.error("No token. Set SUPABASE_ACCESS_TOKEN, or put one in /data/workspace/.supabase-token");
  process.exit(2);
}

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
if (!slug) {
  console.error("Usage: node scripts/check-deploy.mjs <slug> [--from <gitref>] [--no-loss <file>]");
  process.exit(2);
}
const fromIdx = args.indexOf("--from");
const fromRef = fromIdx >= 0 ? args[fromIdx + 1] : null;
const lossIdx = args.indexOf("--no-loss");
const noLossFile = lossIdx >= 0 ? args[lossIdx + 1] : null;

/* The markers: string literals long enough to be a sentence, so a comment or
   a variable name cannot produce a false match. */
function literals(source) {
  return [...new Set((source.match(/"[^"\n]{40,400}"/g) ?? []))].map((s) => s.slice(1, -1));
}

const localPath = `supabase/functions/${slug}/index.ts`;
let source, describedAs;
if (fromRef) {
  source = execSync(`git show ${fromRef}:${localPath}`).toString();
  describedAs = `${localPath} at ${fromRef}`;
} else {
  if (!existsSync(localPath)) { console.error(`No such function file: ${localPath}`); process.exit(2); }
  source = readFileSync(localPath, "utf8");
  describedAs = `${localPath} in the working tree`;
}

const metaRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/functions/${slug}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!metaRes.ok) { console.error(`Could not read ${slug}: ${metaRes.status} ${await metaRes.text()}`); process.exit(1); }
const meta = await metaRes.json();

const bodyRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/functions/${slug}/body`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!bodyRes.ok) { console.error(`Could not read the deployed body: ${bodyRes.status}`); process.exit(1); }
const body = Buffer.from(await bodyRes.arrayBuffer());

console.log(`function   : ${slug}   LIVE version v${meta.version}, ${meta.status}`);
console.log(`source     : ${describedAs}`);
console.log(`deployed   : ${body.length} bytes (a transpiled bundle, so this is a marker check, not a byte diff)\n`);

const marks = literals(source);
let found = 0;
const missing = [];
for (const m of marks) {
  if (body.includes(Buffer.from(m, "utf8"))) found += 1;
  else missing.push(m);
}

console.log(`markers in the source : ${marks.length}`);
console.log(`present in the deployed: ${found}`);
console.log(`MISSING                : ${missing.length}`);
for (const m of missing.slice(0, 10)) console.log(`   - ${m.slice(0, 90)}`);

let failed = false;
if (missing.length) {
  console.log(`\n*** THE DEPLOYED COPY IS NOT THIS SOURCE. ***`);
  console.log(`    Do not deploy over it. The live one wins until you know why they differ.`);
  failed = true;
} else {
  console.log(`\n ok  the deployed copy carries every marker from this source`);
}

/* Nothing lost: used AFTER a deploy, against the copy that was live before. */
if (noLossFile) {
  if (!existsSync(noLossFile)) { console.error(`\n--no-loss file not found: ${noLossFile}`); process.exit(2); }
  const was = literals(readFileSync(noLossFile, "utf8"));
  const lost = was.filter((m) => !body.includes(Buffer.from(m, "utf8")));
  console.log(`\nNOTHING LOST: the previous copy had ${was.length} markers, ${lost.length} are gone`);
  for (const m of lost.slice(0, 10)) console.log(`   - ${m.slice(0, 90)}`);
  if (lost.length) {
    console.log(`\n*** THE DEPLOY DELETED LINES. *** Adding to a working function should delete nothing.`);
    failed = true;
  } else {
    console.log(`  ok  nothing the working copy had was removed`);
  }
}

console.log(failed ? "\nVERDICT   : FAILED" : "\nVERDICT   : CLEAN");
process.exit(failed ? 1 : 0);
