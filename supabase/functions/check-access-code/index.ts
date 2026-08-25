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
  already_used: "That code has already been used. Codes work once.",
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

  const { data, error } = await supabase.rpc("peek_access_code", { p_code: code });

  if (error) {
    console.error("peek_access_code failed", error);
    return json({ ok: false, reason: "Something went wrong on our side. Try again." }, 500);
  }

  if (data === "ok") return json({ ok: true, code });
  return json({ ok: false, reason: REASONS[data as string] ?? REASONS.not_found });
});
