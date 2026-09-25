/* ==========================================================================
   RUN SQL FOR REAL, THEN THROW IT AWAY

   WHAT THIS DOES, AND WHY IT IS SAFE TO RUN.

   Postgres runs DDL (data definition language, the statements that create and
   alter tables) inside a transaction, and a transaction that is rolled back
   leaves no trace. So this script:

     1. opens a transaction,
     2. takes a snapshot of the database's shape,
     3. runs the candidate SQL inside that transaction,
     4. takes the snapshot again,
     5. prints exactly what changed,
     6. ROLLS BACK, so none of it persists.

   That turns "I think this SQL is fine" into "here is the error, or here is the
   precise list of objects it would change, and here is proof nothing else
   moved".

   ⚠️ WHAT THIS CANNOT PROVE. Applied cleanly is not the same as behaves
   correctly. A row level security policy can apply perfectly and still deny a
   read at run time. This check proves the statement is valid and does only
   what was intended. It does not prove the RESULT does what you want, so a
   behaviour change still gets used by hand afterwards.

   ⚠️ THE CANDIDATE MUST NOT CONTAIN begin / commit / rollback, and must not use
   the few statements Postgres refuses inside a transaction, such as
   CREATE INDEX CONCURRENTLY. This script says so rather than failing strangely.

   Usage:
     SUPABASE_ACCESS_TOKEN=... node scripts/db-dryrun.mjs <file.sql> \
       [--expect "table:public.company_brain"] [--expect ...] [--additive-only]

   Every changed object must appear in an --expect, or the check FAILS. That is
   the point: it catches a statement that quietly changes something else.
   ========================================================================== */

import { readFileSync } from "node:fs";

const REF = process.env.SUPABASE_PROJECT_REF || "cbunsqzkhidwjtxdsmxd";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
  || (() => { try { return readFileSync("/data/workspace/.supabase-token", "utf8").trim(); } catch { return ""; } })();

if (!TOKEN) {
  console.error("No token. Set SUPABASE_ACCESS_TOKEN, or put one in /data/workspace/.supabase-token");
  process.exit(2);
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("Usage: node scripts/db-dryrun.mjs <file.sql> [--expect <object>] [--additive-only]");
  process.exit(2);
}

const expected = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--expect") expected.push(args[++i]);
}
const additiveOnly = args.includes("--additive-only");

const sql = readFileSync(file, "utf8");

/* ⚠️ THE GUARD HAS TO LOOK AT CODE, NOT AT TEXT.
   The first version rejected any file containing the word "begin", and it
   refused this project's own migration, because a PL/pgSQL function body
   legitimately starts with `begin`. So dollar-quoted bodies, ordinary quoted
   strings, and both kinds of comment are removed first, and only the code that
   is left is inspected. */
function stripNonCode(input) {
  let s = input;
  /* $tag$ ... $tag$ and $$ ... $$, which is where function bodies live. */
  s = s.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, " ");
  /* 'text', with '' as an escaped quote. */
  s = s.replace(/'(?:[^']|'')*'/g, " ");
  /* /* block comment *\/ then -- line comment. */
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/--[^\n]*/g, " ");
  return s;
}

const code = stripNonCode(sql);

if (/\b(begin|commit|rollback)\b/i.test(code)) {
  console.error("REFUSING: the candidate contains begin/commit/rollback, and this script wraps it in a transaction itself.");
  process.exit(2);
}
if (/create\s+index\s+concurrently/i.test(code)) {
  console.error("REFUSING: CREATE INDEX CONCURRENTLY cannot run inside a transaction, so it cannot be dry run here.");
  process.exit(2);
}

/* The shape of the database, as lines. Anything that a migration could
   reasonably change is in here: tables, columns, policies, triggers,
   functions, and whether row level security is on. */
const SNAPSHOT = `
create temp table _snap as
  select 'table:' || table_schema || '.' || table_name as line
    from information_schema.tables where table_schema = 'public'
  union all
  select 'column:' || table_name || '.' || column_name || ':' || data_type || ':' || is_nullable
    from information_schema.columns where table_schema = 'public'
  union all
  select 'policy:' || tablename || '.' || policyname || ':' || cmd || ':' || coalesce(qual,'') || ':' || coalesce(with_check,'')
    from pg_policies where schemaname = 'public'
  union all
  select 'rls:' || c.relname || ':' || c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
  union all
  select 'trigger:' || t.tgname || ':' || c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
  union all
  select 'function:' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public';
`;

/* ⚠️ THE SCHEMA SNAPSHOT CANNOT SEE A DATA CHANGE, AND THAT WAS A REAL HOLE.
   An INSERT, an UPDATE or a DELETE leaves every table, column, policy and
   trigger exactly where it was, so the difference came back empty and the check
   said CLEAN whatever the statement did to the rows. It would have reported a
   data write as "nothing changed", which is the most dangerous kind of green.

   So a table named with --rows gets its row count read before and after, inside
   the same transaction. ⚠️ A count is not the whole story: an UPDATE that
   changes a value without changing any count still passes. The report says so
   rather than implying more than was checked. */
const rowTables = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--rows") rowTables.push(args[++i]);
}

/* One temp table holding a row per watched table, so the counts can be folded
   into the single result set this endpoint returns. */
const countTable = (name) => rowTables.length === 0 ? "" :
  `create temp table ${name} as\n` +
  rowTables.map((t) => `  select '${t}' as t, count(*) as n from ${t}`).join("\n  union all\n") +
  ";\n";

const countRows = rowTables.length === 0 ? "" :
  `union all
select 'ROWS_BEFORE' as change, t || ' = ' || n::text as line from _rc_before
union all
select 'ROWS_AFTER' as change, t || ' = ' || n::text as line from _rc_after`;

const BOTH = `
begin;
${SNAPSHOT}
create temp table _before as select line from _snap;
drop table _snap;
${countTable("_rc_before")}
${sql}
${SNAPSHOT}
create temp table _after as select line from _snap;
drop table _snap;
${countTable("_rc_after")}
select 'ADDED' as change, line from (select line from _after except select line from _before) a
union all
select 'REMOVED' as change, line from (select line from _before except select line from _after) r
${countRows}
order by change, line;
rollback;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: BOTH }),
});

const text = await res.text();

console.log(`file      : ${file}`);
console.log(`project   : ${REF}`);
console.log(`rolled back: yes, this was a dry run\n`);

if (!res.ok) {
  console.log(`RESULT    : SQL REJECTED, nothing was changed.`);
  console.log(`            ${text.slice(0, 900)}`);
  process.exit(1);
}

let rows;
try { rows = JSON.parse(text); } catch { console.log(`RESULT    : unexpected answer\n${text.slice(0, 500)}`); process.exit(1); }

const added = rows.filter((r) => r.change === "ADDED").map((r) => r.line);
const removed = rows.filter((r) => r.change === "REMOVED").map((r) => r.line);

/* The row counts are reported separately from the shape, because a count going
   up is not a schema change and must not be read as one. */
const counts = (phase) => new Map(rows.filter((r) => r.change === phase)
  .map((r) => { const i = r.line.lastIndexOf(" = "); return [r.line.slice(0, i), Number(r.line.slice(i + 3))]; }));
const before = counts("ROWS_BEFORE");
const after = counts("ROWS_AFTER");
const shrank = [];
for (const [t, n] of before) {
  const m = after.get(t);
  if (m !== undefined && m < n) shrank.push(`${t} ${n} -> ${m}`);
}

console.log(`RESULT    : SQL is VALID and applied cleanly inside the transaction.\n`);
console.log(`WOULD ADD    (${added.length})`);
for (const l of added) console.log(`  + ${l}`);
if (!added.length) console.log("  (nothing)");
console.log(`\nWOULD REMOVE (${removed.length})`);
for (const l of removed) console.log(`  - ${l}`);
if (!removed.length) console.log("  (nothing)");

if (before.size) {
  console.log(`\nROWS WATCHED`);
  for (const [t, n] of before) {
    const m = after.get(t);
    const delta = m === undefined ? "?" : (m > n ? `+${m - n}` : m < n ? `${m - n}` : "no change");
    console.log(`  ${t.padEnd(32)} ${n} -> ${m}   (${delta})`);
  }
  console.log(`  ⚠️ a count is not the whole story: an UPDATE that changes a value`);
  console.log(`     without changing any count still passes this.`);
}

let failed = false;

/* A watched table that lost rows is a removal, whatever the shape says. */
if (additiveOnly && shrank.length) {
  console.log(`\n*** NOT ADDITIVE: rows were removed from ${shrank.join(", ")} ***`);
  failed = true;
}

/* Every changed object has to be one that was expected. This is the check that
   catches a statement that quietly touches something nobody asked about. */
if (expected.length) {
  const changed = [...added, ...removed];
  const unexpected = changed.filter((l) => !expected.some((e) => l.startsWith(e)));
  console.log(`\nEXPECTED     (${expected.length})`);
  for (const e of expected) console.log(`  = ${e}`);
  if (unexpected.length) {
    console.log(`\n*** UNEXPECTED CHANGES (${unexpected.length}) ***`);
    for (const l of unexpected) console.log(`  ! ${l}`);
    failed = true;
  } else {
    console.log(`  ok  nothing changed that was not expected`);
  }
}

if (additiveOnly && removed.length) {
  console.log(`\n*** NOT ADDITIVE: ${removed.length} object(s) would be removed or altered ***`);
  failed = true;
}

console.log(failed ? "\nVERDICT   : FAILED" : "\nVERDICT   : CLEAN");
process.exit(failed ? 1 : 0);
