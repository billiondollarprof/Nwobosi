/* ==========================================================================
   CHECK ACCESS CODE

   Step 1 of setup. Looks at a code, does not spend it. Someone who enters
   their code and then gets pulled into a meeting still has a working code
   when they come back.

   verify_jwt is off on purpose. The person calling this has no account
   yet, that is the entire point of the screen. The access code IS the
   credential here, and it is checked server side against a table no
   browser can read.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CODE_SHAPE = /^SX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* Every failure says roughly the same thing, except the two cases where
   being specific genuinely helps the person in front of the screen. */
const REASONS: Record<string, string> = {
  not_found: "That code is not right. Check it and try again.",
  /* Kept for anything the database still answers this way, though the
     resolver now treats a used code as a way back in rather than a wall. */
  already_used: "That code has already been used.",
  revoked: "That code is no longer active.",
  in_progress: "That code is being set up right now. Try again in a few minutes.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").toUpperCase().trim();
  } catch {
    return json({ ok: false, reason: "That code is not right. Check it and try again." }, 400);
  }

  /* Shape is checked here, before any query runs. Brute force traffic and
     junk requests die on this line without ever costing a database call. */
  if (!CODE_SHAPE.test(code)) {
    return json({ ok: false, reason: "That code is not right. Check it and try again." });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* resolve, not peek. A code that has already been used is no longer a
     dead end: it is the key to the workspace it built, and this is where
     that fork is decided. peek_access_code is left in the database
     untouched for anything still calling it. */
  const { data: rows, error } = await supabase.rpc("resolve_access_code", { p_code: code });

  if (error) {
    console.error("resolve_access_code failed", error);
    return json({ ok: false, reason: "Something went wrong on our side. Try again." }, 500);
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  const outcome = row?.outcome as string | undefined;

  /* Nothing built yet. Carry on into setup. */
  if (outcome === "new") return json({ ok: true, code, mode: "new" });

  /* Already built. The next call opens it. Note this returns the slug but
     no session: minting one lives in resume-demo, so a wrong guess at a
     code can never be answered with credentials. */
  if (outcome === "resume") {
    return json({ ok: true, code, mode: "resume", slug: row?.slug ?? null });
  }

  return json({ ok: false, reason: REASONS[outcome as string] ?? REASONS.not_found });
});
