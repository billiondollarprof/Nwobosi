/* ==========================================================================
   DEPLOY FUNCTIONS
   Puts the edge functions that changed live, from the repo, with a guard
   before and a check after. Run by .github/workflows/functions.yml on every
   push to main. Anthony's decision, 2026-11-02: GitHub deploys the functions,
   not a person in the dashboard.

   WHY THE GUARD. The live copy and the repo have drifted before: fixes made
   in the dashboard that never came back to git, and versions that went out
   with nobody recording why (assistant v53). Deploying the repo over such a
   copy would silently undo somebody's work. So, before deploying a function,
   this checks that the LIVE copy is the PREVIOUS repo copy (every long text
   literal of the repo file at the commit before this push is present in the
   live bundle). If not, the live one wins: it is NOT deployed, and the run
   goes red so a person looks. The technique is scripts/check-deploy.mjs,
   which this calls.

   WHAT IT DEPLOYS. Only functions whose own folder changed, or that import a
   changed file from _shared (followed through every level of import). Never
   anything in supabase/amara-functions, which belongs to another project.

   WHAT IT MUST NEVER DO
   - Deploy over a live copy that failed the guard.
   - Turn on verify_jwt. Every function here runs with it OFF on purpose
     (docs/rules/DEPLOY.md), so every deploy passes --no-verify-jwt.
   - Report success for a function it did not check after deploying.

   Usage (normally only from the workflow):
     node scripts/deploy-functions.mjs <base-sha> <head-sha>
     node scripts/deploy-functions.mjs --compare-all
   Needs SUPABASE_ACCESS_TOKEN. SUPABASE_PROJECT_REF defaults to StellaXafe's.
   ========================================================================== */

import { readdirSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";

const REF = process.env.SUPABASE_PROJECT_REF || "cbunsqzkhidwjtxdsmxd";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FUNCTIONS_DIR = "supabase/functions";

/* ===== 1. Small helpers ===== */

/* Writes a line to the console and to the run's summary page on GitHub. */
function report(line = "") {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + "\n");
}

/* Runs a command, shows its output, and returns true when it succeeded. */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  return result.status === 0;
}

/* Every function folder in the repo (not _shared, not hidden folders). */
function allFunctions() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."))
    .filter((entry) => existsSync(`${FUNCTIONS_DIR}/${entry.name}/index.ts`))
    .map((entry) => entry.name)
    .sort();
}

/* The _shared files a function uses, following imports inside _shared too. */
function sharedFilesOf(slug) {
  const found = new Set();
  const queue = [];
  const own = readFileSync(`${FUNCTIONS_DIR}/${slug}/index.ts`, "utf8");
  for (const m of own.matchAll(/from "\.\.\/_shared\/([A-Za-z0-9_.-]+\.ts)"/g)) queue.push(m[1]);
  while (queue.length) {
    const file = queue.shift();
    if (found.has(file)) continue;
    found.add(file);
    const path = `${FUNCTIONS_DIR}/_shared/${file}`;
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const m of text.matchAll(/from "\.\/([A-Za-z0-9_.-]+\.ts)"/g)) queue.push(m[1]);
  }
  return found;
}

/* The slugs that exist on the live project right now. */
async function liveSlugs() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/functions`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Could not list live functions: ${res.status} ${await res.text()}`);
  return new Set((await res.json()).map((f) => f.slug));
}

/* ===== 2. Which functions changed between two commits ===== */
function changedFunctions(base, head) {
  const files = execSync(`git diff --name-only ${base} ${head} -- ${FUNCTIONS_DIR}`).toString().split("\n").filter(Boolean);
  const changedShared = new Set(
    files.filter((f) => f.startsWith(`${FUNCTIONS_DIR}/_shared/`)).map((f) => f.slice(`${FUNCTIONS_DIR}/_shared/`.length)),
  );
  const changedDirs = new Set(
    files.filter((f) => !f.startsWith(`${FUNCTIONS_DIR}/_shared/`)).map((f) => f.split("/")[2]),
  );
  return allFunctions().filter((slug) => {
    if (changedDirs.has(slug)) return true;
    for (const file of sharedFilesOf(slug)) if (changedShared.has(file)) return true;
    return false;
  });
}

/* ===== 3. Compare every function with live, change nothing ===== */
async function compareAll() {
  const live = await liveSlugs();
  report("## Live functions compared with the repo");
  report("");
  let drifted = 0;
  for (const slug of allFunctions()) {
    if (!live.has(slug)) {
      report(`- \`${slug}\`: not live yet (new)`);
      continue;
    }
    const ok = run("node", ["scripts/check-deploy.mjs", slug]);
    report(`- \`${slug}\`: ${ok ? "live carries the repo copy" : "**live differs from the repo**"}`);
    if (!ok) drifted += 1;
  }
  report("");
  report(drifted ? `**${drifted} function(s) differ.** The live copy wins until a person looks.` : "All live functions carry the repo copy.");
  return drifted === 0;
}

/* ===== 4. Guard, deploy, check, one function at a time ===== */
async function deploy(base, head) {
  const slugs = changedFunctions(base, head);
  report(`## Edge functions for ${head.slice(0, 7)}`);
  report("");
  if (!slugs.length) {
    report("No function changed. Nothing deployed.");
    return true;
  }
  report(`Changed: ${slugs.map((s) => `\`${s}\``).join(", ")}`);
  report("");
  const live = await liveSlugs();
  let allGood = true;

  for (const slug of slugs) {
    // 4a. The guard: is the live copy the repo copy from before this push?
    //     A brand new function has nothing live to protect.
    if (live.has(slug)) {
      const guardOk = run("node", ["scripts/check-deploy.mjs", slug, "--from", base]);
      if (!guardOk) {
        report(`- \`${slug}\`: **NOT deployed.** The live copy is not the previous repo copy. The live one wins until a person looks.`);
        allGood = false;
        continue;
      }
    }

    // 4b. Deploy, with verify_jwt kept OFF.
    const deployed = run("npx", [
      "--yes", "supabase@2", "functions", "deploy", slug,
      "--project-ref", REF, "--no-verify-jwt", "--use-api",
    ]);
    if (!deployed) {
      report(`- \`${slug}\`: **deploy failed.** See the log above.`);
      allGood = false;
      continue;
    }

    // 4c. The check after: every marker of the new repo copy is now live.
    const landed = run("node", ["scripts/check-deploy.mjs", slug]);
    report(`- \`${slug}\`: ${landed ? "deployed and checked" : "**deployed, but the check after did not find the new copy**"}`);
    if (!landed) allGood = false;
  }
  report("");
  report("Update `docs/state/LIVE.md` with the new versions.");
  return allGood;
}

/* ===== 5. Start ===== */
if (!TOKEN) {
  report("SUPABASE_ACCESS_TOKEN is not set, so nothing was compared or deployed.");
  process.exit(0);
}

const args = process.argv.slice(2);
let ok;
if (args[0] === "--compare-all") {
  ok = await compareAll();
} else {
  const [base, head] = args;
  if (!base || !head) {
    console.error("Usage: node scripts/deploy-functions.mjs <base-sha> <head-sha> | --compare-all");
    process.exit(2);
  }
  ok = await deploy(base, head);
}
process.exit(ok ? 0 : 1);
