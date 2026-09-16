/* ==========================================================================
   TESTING THE CANVA DESIGN PIPELINE WITHOUT CANVA

   WHY THIS EXISTS
   ---------------
   The container this was built in blocks canva.com completely, so not one
   of these calls has ever run against the real thing. What CAN be checked
   from here is everything around the calls: that a job which comes back
   "in_progress" is waited on, that a job which comes back "failed" is not
   waited on forever, that a failed export still returns the design, and
   that a person with no connection is told to connect rather than told it
   broke.

   Those are the branches that decide whether somebody gets a useful
   message or a shrug, and they are the ones a live test is worst at
   reaching, because you cannot easily make Canva fail on purpose.

     node scripts/tests/canva-design.test.mjs
   ========================================================================== */

import { build } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "canva-design-"));
await build({
  entryPoints: ["supabase/functions/canva-design/index.ts"],
  outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});

/* Deno.serve hands us the handler instead of listening. */
let handler;
globalThis.Deno = {
  serve: (fn) => { handler = fn; },
  env: { get: (k) => ({ SUPABASE_URL: "http://db", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "svc" }[k]) },
};

/* The supabase client and the token module are replaced at the module
   level by intercepting their imports through a tiny loader shim. Simpler
   here: stub global fetch for Canva, and stub the two modules by rewriting
   the built file's imports. */
const fs = await import("node:fs");
let code = fs.readFileSync(join(dir, "fn.mjs"), "utf8");
code = code
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = globalThis.__createClient;")
  /* Forwarded at call time, not bound at import time. Binding it here
     captures whatever __token was when the module loaded, which is
     before any test has set it. */
  .replace(/import \{ canvaAccessToken \} from "[^"]+";/,
           "const canvaAccessToken = (...a) => globalThis.__token(...a);");
fs.writeFileSync(join(dir, "fn2.mjs"), code);

globalThis.__createClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: "s1" } }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "s1", company_id: "c1" }, error: null }) }) }) }),
});

await import(join(dir, "fn2.mjs"));

let failures = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) console.log(`       wanted ${JSON.stringify(want)}\n       got    ${JSON.stringify(got)}`);
};

const call = async () => {
  const res = await handler(new Request("http://x/canva-design", {
    method: "POST",
    headers: { Authorization: "Bearer x", "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Amara poster", imageBase64: btoa("hello"), imageMime: "image/png" }),
  }));
  return { status: res.status, body: await res.json() };
};

/* A scripted Canva. Each entry answers one call in order. */
function canvaSays(script) {
  let i = 0;
  globalThis.fetch = async (url) => {
    const step = script[Math.min(i, script.length - 1)];
    i += 1;
    return new Response(JSON.stringify(step.body ?? {}), { status: step.status ?? 200 });
  };
}

console.log("\nCANVA DESIGN\n");

/* 1. Never connected is an invitation, not an error. */
globalThis.__token = async () => ({ ok: false, reason: "not_connected" });
{
  const r = await call();
  check("no connection asks them to connect", [r.status, r.body.needsConnect], [200, true]);
}

/* 2. A dead connection says so, and says it differently. */
globalThis.__token = async () => ({ ok: false, reason: "reconnect_needed" });
{
  const r = await call();
  check("a dead connection asks for a reconnect", r.body.needsConnect, true);
  check("  and says it expired", r.body.reason.includes("expired"), true);
}

/* 3. Canva having a bad day is a retry, not a reconnect. */
globalThis.__token = async () => ({ ok: false, reason: "failed" });
{
  const r = await call();
  check("a Canva outage is not a reconnect", [r.status, r.body.needsConnect], [503, undefined]);
}

globalThis.__token = async () => ({ ok: true, token: "tok" });

/* 4. THE HAPPY PATH, with both jobs starting in_progress so the polling is
      actually exercised rather than skipped. */
canvaSays([
  { body: { job: { id: "up1", status: "in_progress" } } },              // start upload
  { body: { job: { id: "up1", status: "in_progress" } } },              // poll 1
  { body: { job: { id: "up1", status: "success", asset: { id: "A1" } } } }, // poll 2
  { body: { design: { id: "D1", urls: { edit_url: "https://canva/edit/D1", view_url: "https://canva/view/D1" } } } },
  { body: { job: { id: "ex1", status: "in_progress" } } },              // start export
  { body: { job: { id: "ex1", status: "success", urls: ["https://canva/out.png"] } } },
]);
{
  const r = await call();
  check("the happy path returns the design", [r.body.ok, r.body.designId], [true, "D1"]);
  check("  the edit url comes back", r.body.editUrl, "https://canva/edit/D1");
  check("  and so does the export", r.body.exportUrl, "https://canva/out.png");
}

/* 5. A FAILED EXPORT STILL RETURNS THE DESIGN. It exists in their Canva
      either way, so telling them it failed sends them to build it twice. */
canvaSays([
  { body: { job: { id: "up1", status: "in_progress" } } },                  // start upload
  { body: { job: { id: "up1", status: "success", asset: { id: "A1" } } } }, // poll it
  { body: { design: { id: "D2", urls: { edit_url: "https://canva/edit/D2" } } } },
  { body: { job: { id: "ex1", status: "in_progress" } } },                  // start export
  { body: { job: { id: "ex1", status: "failed", error: { message: "too big" } } } },
]);
{
  const r = await call();
  check("a failed export still hands back the design", [r.body.ok, r.body.designId], [true, "D2"]);
  check("  with no export url", r.body.exportUrl, "");
}

/* 6. A refused upload names the step, so the chat can say something true. */
canvaSays([{ status: 400, body: { message: "unsupported" } }]);
{
  const r = await call();
  check("a refused upload names the step", [r.body.ok, r.body.step], [false, "upload"]);
}

/* 7. A failed upload job is not retried forever. */
canvaSays([
  { body: { job: { id: "up1", status: "in_progress" } } },
  { body: { job: { id: "up1", status: "failed", error: { message: "bad image" } } } },
]);
{
  const r = await call();
  check("a failed upload job stops", [r.body.ok, r.body.step], [false, "upload"]);
  check("  and passes Canva's reason on", r.body.reason, "bad image");
}

/* 8. No picture is refused before any of it starts. */
{
  const res = await handler(new Request("http://x/canva-design", {
    method: "POST",
    headers: { Authorization: "Bearer x", "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nothing" }),
  }));
  check("no picture is refused up front", res.status, 400);
}

console.log(failures === 0 ? "\nAll clean.\n" : `\n${failures} failing.\n`);
process.exit(failures === 0 ? 0 : 1);
