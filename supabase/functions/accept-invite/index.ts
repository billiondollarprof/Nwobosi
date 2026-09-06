/* ==========================================================================
   ACCEPT INVITE

   The other half of an invitation. Someone clicks the link their admin sent
   them, and this puts them inside their company's workspace.

   verify_jwt is off, for the same reason as the setup functions: the person
   clicking has no session yet, and getting one is the entire point. The
   token in the link is the credential.

   WHAT THE TOKEN IS WORTH
   ----------------------
   Everything, once, for 72 hours. So it is treated like a password:

     Only its SHA-256 is stored. The raw token exists in the link and
     nowhere else, so a copy of the invites table hands nobody a session.
     Redeeming is a single guarded UPDATE in the database, so two clicks on
     the same link cannot both win.
     Expiry and reuse are answered differently, because the person reading
     them needs different things. One asks their admin to send another, the
     other just signs in normally.

   No password is involved at either end. The account was created with a
   random one that was immediately forgotten, and this mints a one time
   session with the service role instead, the same way resume-demo does.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

/* Each one tells the person what to do next, which is the only reason to
   distinguish them at all. */
const REASONS: Record<string, string> = {
  not_found: "That invitation link is not right. Ask for a new one.",
  already_used: "That invitation has already been used. Sign in with your email instead.",
  expired: "That invitation has run out. Ask whoever invited you to send another.",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  let token = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "").trim();
  } catch {
    return json({ ok: false, reason: REASONS.not_found }, 400);
  }

  /* Shape first, so junk dies before a query runs. Tokens are two UUIDs
     with the dashes taken out. */
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return json({ ok: false, reason: REASONS.not_found });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase.rpc("redeem_staff_invite", {
    p_token_hash: await sha256(token),
  });

  if (error) {
    console.error("redeem_staff_invite failed", error);
    return json({ ok: false, reason: "Something went wrong on our side. Try again." }, 500);
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  const outcome = row?.outcome as string | undefined;

  if (outcome !== "ok" || !row?.email) {
    return json({ ok: false, reason: REASONS[outcome as string] ?? REASONS.not_found });
  }

  /* The invitation is spent by this point whether or not the next call
     works. That is the right way round: a link that stays live because the
     session failed is a link that can be replayed. A person who hits this
     rare case signs in with their email instead. */
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: row.email as string,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("accept-invite: generateLink failed", linkError);
    return json({
      ok: false,
      reason: "Your invitation worked but we could not sign you in. Sign in with your email instead.",
    }, 500);
  }

  return json({
    ok: true,
    slug: row?.slug ?? null,
    sessionToken: link.properties.hashed_token,
  });
});
