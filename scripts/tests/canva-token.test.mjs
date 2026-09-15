/* ==========================================================================
   TESTING THE CANVA TOKEN REFRESH

   WHY THIS FILE EXISTS
   --------------------
   A Canva refresh token can only be used once. Canva hands back a new one
   on every refresh and kills the old one there and then. That makes two
   failures possible which are both silent and both lock a company out
   until somebody reconnects by hand:

     1. The new refresh token is not stored, so the next refresh sends a
        token Canva already killed.
     2. Two requests refresh at the same moment, both spend the same token,
        and the slower one writes its pair over the faster one's. Only one
        of those pairs was ever honoured, so half the time the row ends up
        holding a pair that has never worked.

   Neither shows up in a build, in a type check, or in a screenshot. They
   show up a week later as "Canva keeps disconnecting". So they get a test.

   HOW IT RUNS WITHOUT DENO OR A DATABASE
   --------------------------------------
   The module under test is Deno TypeScript. esbuild transpiles it, Deno
   and fetch are stubbed, and the supabase client is replaced by a tiny
   fake table that behaves the way Postgres does for the one thing that
   matters: an update with a condition that matches nothing writes nothing.

     node scripts/tests/canva-token.test.mjs
   ========================================================================== */

import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* ---------------------------------------------------------------------
   A fake integration_tokens table.

   Only the calls the module actually makes, and the one behaviour that
   this whole test is about: .eq() narrows, and an update whose conditions
   match no row writes nothing and returns an empty array.
   --------------------------------------------------------------------- */
function fakeDb(rows) {
  const db = { rows, updates: 0 };

  db.from = () => {
    const state = { conditions: {}, mode: "select", patch: null };
    const api = {
      select() { return api; },
      update(patch) { state.mode = "update"; state.patch = patch; return api; },
      eq(column, value) { state.conditions[column] = value; return api; },
      maybeSingle() {
        const hit = db.rows.find((r) => match(r, state.conditions));
        return Promise.resolve({ data: hit ?? null, error: null });
      },
      then(resolve) {
        const hits = db.rows.filter((r) => match(r, state.conditions));
        if (state.mode === "update") {
          hits.forEach((r) => { Object.assign(r, state.patch); db.updates += 1; });
          return resolve({ data: hits.map((r) => ({ access_token: r.access_token })), error: null });
        }
        return resolve({ data: hits, error: null });
      },
    };
    return api;
  };

  const match = (row, conditions) =>
    Object.entries(conditions).every(([k, v]) => row[k] === v);

  return db;
}

const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

/* --------------------------------------------------------------------- */

const dir = mkdtempSync(join(tmpdir(), "canva-test-"));
await build({
  entryPoints: ["supabase/functions/_shared/canva.ts"],
  outfile: join(dir, "canva.mjs"),
  format: "esm",
  platform: "neutral",
  bundle: false,
});

globalThis.Deno = { env: { get: (k) => ({ CANVA_CLIENT_ID: "id", CANVA_CLIENT_SECRET: "secret" }[k]) } };
const { canvaAccessToken } = await import(join(dir, "canva.mjs"));

let failures = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) console.log(`       wanted ${JSON.stringify(want)}\n       got    ${JSON.stringify(got)}`);
};

const canvaReplies = (status, body) => {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
};

console.log("\nCANVA TOKEN\n");

/* 1. A token with hours left is handed back untouched. No refresh, no
      write, because a refresh we did not need spends a refresh token we
      cannot get back. */
{
  const db = fakeDb([{ company_id: "c1", provider: "canva", access_token: "good", refresh_token: "r1", expires_at: hoursFromNow(3) }]);
  globalThis.fetch = async () => { throw new Error("should not have called canva"); };
  check("a fresh token is used as is", await canvaAccessToken(db, "c1"), { ok: true, token: "good" });
  check("  and nothing was written", db.updates, 0);
}

/* 2. A stale token is refreshed, and BOTH halves of the new pair are
      stored. Storing only the access token is failure 1 above. */
{
  const row = { company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: hoursFromNow(-1) };
  const db = fakeDb([row]);
  canvaReplies(200, { access_token: "new", refresh_token: "r2", expires_in: 14400 });
  check("a stale token is refreshed", await canvaAccessToken(db, "c1"), { ok: true, token: "new" });
  check("  the new access token is stored", row.access_token, "new");
  check("  the new REFRESH token is stored", row.refresh_token, "r2");
}

/* 3. A token expiring in two minutes counts as stale. A job that uploads,
      creates and exports takes longer than that, so handing it back would
      fail somewhere in the middle. */
{
  const row = { company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() };
  const db = fakeDb([row]);
  canvaReplies(200, { access_token: "new", refresh_token: "r2", expires_in: 14400 });
  check("expiring in two minutes counts as stale", (await canvaAccessToken(db, "c1")).token, "new");
}

/* 4. THE CONCURRENT CASE. Another request refreshed while this one was
      waiting on Canva, so the row already holds a newer pair. This one
      must NOT write over it, and must use the newer token. */
{
  const row = { company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: hoursFromNow(-1) };
  const db = fakeDb([row]);
  globalThis.fetch = async () => {
    /* The other request lands while Canva is answering this one. */
    row.access_token = "theirs";
    row.refresh_token = "r9";
    row.expires_at = hoursFromNow(4);
    return new Response(JSON.stringify({ access_token: "ours", refresh_token: "r2", expires_in: 14400 }), { status: 200 });
  };
  const got = await canvaAccessToken(db, "c1");
  check("a concurrent refresh does not get overwritten", row.refresh_token, "r9");
  check("  and the winner's token is the one used", got, { ok: true, token: "theirs" });
}

/* 5. Canva refusing the refresh token is not a retry. It is spent, revoked
      or from a changed secret, and the admin has to reconnect. */
{
  const db = fakeDb([{ company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: hoursFromNow(-1) }]);
  canvaReplies(400, { error: "invalid_grant" });
  check("a refused refresh asks for a reconnect", await canvaAccessToken(db, "c1"), { ok: false, reason: "reconnect_needed" });
}

/* 6. Canva having a bad day IS a retry, and must not tell somebody to
      reconnect a connection that is perfectly fine. */
{
  const db = fakeDb([{ company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: hoursFromNow(-1) }]);
  canvaReplies(503, { error: "unavailable" });
  check("a Canva outage is not a reconnect", await canvaAccessToken(db, "c1"), { ok: false, reason: "failed" });
}

/* 7. Half a pair is no pair. Storing the access token without the new
      refresh token locks the company out on the next call. */
{
  const row = { company_id: "c1", provider: "canva", access_token: "old", refresh_token: "r1", expires_at: hoursFromNow(-1) };
  const db = fakeDb([row]);
  canvaReplies(200, { access_token: "new", expires_in: 14400 });
  check("a reply missing the refresh token is refused", await canvaAccessToken(db, "c1"), { ok: false, reason: "failed" });
  check("  and nothing was written", row.access_token, "old");
}

/* 8. A company that never connected is told that, not that it is broken. */
{
  const db = fakeDb([]);
  check("never connected says so", await canvaAccessToken(db, "c1"), { ok: false, reason: "not_connected" });
}

/* 9. One company's row is never handed to another company. */
{
  const db = fakeDb([{ company_id: "c1", provider: "canva", access_token: "amara", refresh_token: "r1", expires_at: hoursFromNow(3) }]);
  check("another company gets nothing", await canvaAccessToken(db, "c2"), { ok: false, reason: "not_connected" });
}

console.log(failures === 0 ? "\nAll clean.\n" : `\n${failures} failing.\n`);
process.exit(failures === 0 ? 0 : 1);
