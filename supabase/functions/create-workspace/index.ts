/* ==========================================================================
   CREATE WORKSPACE

   The last step of setup, and the only one that changes anything. Spends
   the access code, creates the admin's account, and builds the company's
   workspace. Everything before this point was a conversation.

   verify_jwt is off for the same reason as check-access-code: the person
   calling this does not have an account yet, this request is what creates
   it. The access code is the credential, and it is checked and spent
   server side inside a table no browser can reach.

   ORDER MATTERS, AND SO DOES UNDOING IT
   -------------------------------------
   Four things happen, in this order:

     1. claim   the code, atomically. Exactly one caller can win this.
     2. create  the admin's auth account.
     3. create  the company and the admin's staff row, in one transaction.
     4. finalise the code, which kills it permanently.

   Anything that fails partway has to leave no debris. A failure at step 2
   releases the code. A failure at step 3 deletes the account it just made
   and then releases the code. Someone whose setup breaks gets their code
   back, not a dead code and half an account.

   Step 4 is the exception, and deliberately so. By then the workspace and
   the account both really exist and work. Tearing down a working company
   because a bookkeeping call failed would be the worse outcome, so that
   one logs loudly and still reports success. The claim's own five minute
   staleness window is the backstop.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CODE_SHAPE = /^SX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

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

/* Claim outcomes that are not "ok". Same wording as check-access-code, so
   a code that went stale between the two screens does not suddenly start
   speaking a different language. */
const CLAIM_REASONS: Record<string, string> = {
  not_found: "That code is not right. Check it and try again.",
  already_used: "That code has already been used. Codes work once.",
  revoked: "That code is no longer active.",
  in_progress: "That code is being set up right now. Try again in a few minutes.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  /* ----------------------------------------------------------------------
     READ AND CHECK THE INPUT
     All of this is checked in the browser too. None of that is trusted.
     ---------------------------------------------------------------------- */

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const code = String(body?.code ?? "").toUpperCase().trim();
  const adminName = String(body?.adminName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const companyName = String(body?.companyName ?? "").trim();
  const whatWeDo = String(body?.whatWeDo ?? "").trim();
  const industry = String(body?.industry ?? "").trim();

  if (!CODE_SHAPE.test(code)) {
    return json({ ok: false, reason: "That code is not right. Check it and try again." });
  }
  if (!adminName) return json({ ok: false, reason: "Enter your name." });
  if (!EMAIL_SHAPE.test(email)) return json({ ok: false, reason: "That email does not look right." });
  if (password.length < MIN_PASSWORD) {
    return json({ ok: false, reason: `Use at least ${MIN_PASSWORD} characters in your password.` });
  }
  if (companyName.length < 2) return json({ ok: false, reason: "Enter your company name." });
  if (whatWeDo.split(/\s+/).filter(Boolean).length < 5) {
    return json({ ok: false, reason: "Tell us a bit more about what your company does." });
  }
  if (!industry) return json({ ok: false, reason: "Pick the closest industry." });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* ----------------------------------------------------------------------
     1. CLAIM THE CODE
     Atomic. If two people somehow submit the same code at the same instant,
     exactly one gets past this line.
     ---------------------------------------------------------------------- */

  const { data: claimRows, error: claimError } = await supabase.rpc("claim_access_code", {
    p_code: code,
  });

  if (claimError) {
    console.error("claim_access_code failed", claimError);
    return json({ ok: false, reason: "Something went wrong on our side. Try again." }, 500);
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (!claim || claim.outcome !== "ok") {
    return json({
      ok: false,
      reason: CLAIM_REASONS[claim?.outcome as string] ?? CLAIM_REASONS.not_found,
    });
  }

  /* From here on the code is held. Every exit path below either finalises
     it or releases it. There is no path that just returns. */
  async function releaseAndFail(reason: string, status = 200) {
    const { error } = await supabase.rpc("release_access_code", { p_code: code });
    if (error) console.error("release_access_code failed, code may be held until it goes stale", error);
    return json({ ok: false, reason }, status);
  }

  /* ----------------------------------------------------------------------
     2. CREATE THE ADMIN ACCOUNT
     email_confirm is true because the access code already proved this
     person was invited. Making them also click a confirmation link would
     be a second door with the same key. When the OTP rework lands this
     becomes the place it hooks in.
     ---------------------------------------------------------------------- */

  const { data: created, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  if (createUserError || !created?.user) {
    console.error("createUser failed", createUserError);

    /* The one case worth naming precisely. Anything else stays vague. */
    const alreadyExists =
      createUserError?.status === 422 ||
      /already (been )?registered|already exists/i.test(createUserError?.message ?? "");

    return await releaseAndFail(
      alreadyExists
        ? "That email already has an account. Use a different one, or sign in instead."
        : "Could not create your account. Try again.",
    );
  }

  const adminId = created.user.id;

  /* ----------------------------------------------------------------------
     3. CREATE THE COMPANY
     Company row plus the admin's staff row, one transaction, slug
     collisions handled inside. The budget and exemption come from the
     code itself, not from anything the browser sent.
     ---------------------------------------------------------------------- */

  const { data: workspaceRows, error: workspaceError } = await supabase.rpc(
    "create_company_workspace",
    {
      p_admin_id: adminId,
      p_admin_name: adminName,
      p_company_name: companyName,
      p_what_we_do: whatWeDo,
      p_industry: industry,
      p_budget_cents: claim.budget_cents,
      p_is_exempt: claim.is_exempt,
    },
  );

  const workspace = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

  if (workspaceError || !workspace?.slug) {
    console.error("create_company_workspace failed", workspaceError);

    /* Undo the account so a retry with the same email is not blocked by
       the half finished attempt that just failed. */
    const { error: deleteError } = await supabase.auth.admin.deleteUser(adminId);
    if (deleteError) console.error("could not remove the orphaned account", deleteError);

    return await releaseAndFail("Could not build your workspace. Try again.");
  }

  /* ----------------------------------------------------------------------
     4. SPEND THE CODE
     Past this line the workspace is real and works. A failure here is a
     bookkeeping problem, not a user problem, so it is logged rather than
     surfaced. Tearing down a working company over it would be worse.
     ---------------------------------------------------------------------- */

  const { error: finaliseError } = await supabase.rpc("finalise_access_code", {
    p_code: code,
    p_company_id: workspace.company_id,
  });

  if (finaliseError) {
    console.error(
      "finalise_access_code failed after the workspace was created. The code is still held and will " +
        "go stale rather than being marked used. Company:",
      workspace.company_id,
      finaliseError,
    );
  }

  return json({ ok: true, slug: workspace.slug, companyId: workspace.company_id });
});
