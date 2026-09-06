/* ==========================================================================
   RESUME DEMO

   Opens the workspace an access code already built.

   The code is the identity in the demo. Someone enters it the first time
   and create-workspace builds them a company; they enter it again a week
   later and this puts them back inside the same one, with the documents
   they uploaded and the conversations they had still there.

   verify_jwt is off, for the same reason as the other two setup functions:
   the caller has no session yet, and getting one is the entire point. The
   code is the credential and it is checked server side against a table no
   browser can reach.

   WHY THIS IS A SEPARATE FUNCTION
   -------------------------------
   check-access-code says whether a code is real and which of the two things
   it is. It never hands back credentials. This one does, so it is its own
   endpoint with its own name, and a wrong guess at a code on the first call
   can never be answered with a session.

   WHY IT DOES NOT SIGN IN WITH A PASSWORD
   ---------------------------------------
   The password the workspace was built with was random and discarded the
   moment it was used. Nothing has it. Instead this mints a one time token
   with the service role and hands that to the browser, which swaps it for a
   real session.

   It resolves the admin by their staff row rather than by deriving the
   address from the code, so workspaces built before the code became the
   identity, back when a person typed their own email, resume too.
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

/* Same wording as the other two, so a code that changes state between two
   screens does not start speaking a different language. */
const REASONS: Record<string, string> = {
  not_found: "That code is not right. Check it and try again.",
  revoked: "That code is no longer active.",
  in_progress: "That code is being set up right now. Try again in a few minutes.",
  new: "That code has not been used yet. Continue to set your workspace up.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").toUpperCase().trim();
  } catch {
    return json({ ok: false, reason: REASONS.not_found }, 400);
  }

  /* Shape first, so junk and brute force traffic die before a query runs. */
  if (!CODE_SHAPE.test(code)) return json({ ok: false, reason: REASONS.not_found });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase.rpc("resolve_access_code", { p_code: code });

  if (error) {
    console.error("resolve_access_code failed", error);
    return json({ ok: false, reason: "Something went wrong on our side. Try again." }, 500);
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  const outcome = row?.outcome as string | undefined;

  if (outcome !== "resume") {
    return json({ ok: false, reason: REASONS[outcome as string] ?? REASONS.not_found });
  }

  /* A redeemed code whose company has an admin is the only case that gets
     a session. A company with no admin row is broken in a way retyping
     cannot fix, so it says so rather than failing vaguely. */
  const adminId = row?.admin_id as string | undefined;
  if (!adminId) {
    console.error("resume: company has no admin staff row", row?.company_id);
    return json({ ok: false, reason: "That workspace is missing its admin. Get in touch and we will fix it." });
  }

  const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(adminId);

  if (adminError || !adminUser?.user?.email) {
    console.error("resume: could not read the admin account", adminError);
    return json({ ok: false, reason: "Could not open that workspace. Try again." }, 500);
  }

  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: adminUser.user.email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("resume: generateLink failed", linkError);
    return json({ ok: false, reason: "Could not open that workspace. Try again." }, 500);
  }

  return json({
    ok: true,
    slug: row?.slug ?? null,
    sessionToken: link.properties.hashed_token,
  });
});
