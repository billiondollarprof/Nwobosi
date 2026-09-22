/* ==========================================================================
   REVOKE STAFF
   An admin takes somebody's access away, and it actually happens.

   WHY THIS EXISTS AT ALL

   Anthony, 2026-09-22: "the revoke button is useless, no verification, once
   clicked it pretends as though someone has been deleted but after a
   refresh the account returns. I deleted Francis duru twice but it's still
   there."

   He was right. `revoke` in Admin.jsx filtered the person out of a list in
   the browser and nothing else. No request ever left the page. So an admin
   pressed it, watched the person disappear, believed they had cut off
   access, and that person still had a working account with everything the
   company had ever uploaded. A refresh brought them straight back.

   The other dead controls on that screen lost a setting. This one lost a
   boundary, which is why it is a function of its own rather than one more
   line in the browser.

   WHAT IT DOES, IN ORDER
   1. Checks who is asking, under their own identity.
   2. Refuses anybody who is not an admin.
   3. Refuses an admin revoking themselves.
   4. Refuses a person who is not on the asking admin's company.
   5. Deletes the staff row, then the account.

   WHY THE STAFF ROW GOES FIRST. It is the row that grants access to the
   company's material. If the account delete fails afterwards, the worst
   case is an account that belongs to no company and can see nothing. Doing
   it the other way round would leave a staff row pointing at a user that no
   longer exists, which is a broken screen for everybody else.

   THIS IS NOT REVERSIBLE, and that is why the screen asks first. Inviting
   them again makes a new account, not the old one.

   verify_jwt stays OFF, the same as every other function here. The toggle
   checks a legacy secret this project no longer uses, and the caller is
   verified below with auth.getUser().
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile, x-supabase-api-version, range",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const asked = req.headers.get("access-control-request-headers");
    return new Response(null, {
      status: 204,
      headers: asked ? { ...CORS, "Access-Control-Allow-Headers": asked } : CORS,
    });
  }
  if (req.method !== "POST") return json({ ok: false, reason: "Use POST." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const staffId = String(body?.staffId ?? "").trim();
  if (!staffId) return json({ ok: false, reason: "Nobody was named." }, 400);

  /* THE ONE THAT WOULD LOCK EVERYBODY OUT. An admin revoking themselves
     removes the only person who can let anybody back in, and there is no
     screen anywhere that undoes it. The browser hides the button on your
     own row; this is the half a browser cannot be trusted with. */
  if (staffId === user.id) {
    return json({ ok: false, reason: "You cannot take away your own access." }, 400);
  }

  /* Who is asking, read under their own identity so the database decides
     rather than this function believing the request. */
  const { data: admin, error: adminError } = await asUser
    .from("staff")
    .select("id, company_id, access_level")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !admin) return json({ ok: false, reason: "Your account is not on a company." }, 403);
  if (admin.access_level !== "admin") {
    return json({ ok: false, reason: "Only an admin can take away access." }, 403);
  }

  const asService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* THE COMPANY IS CHECKED HERE AND NOT TAKEN FROM THE REQUEST. Without
     this, an admin at one company could post any staff id and delete
     somebody at another company. The browser never sends a company id and
     this function never reads one from the body. */
  const { data: target, error: targetError } = await asService
    .from("staff")
    .select("id, name, company_id")
    .eq("id", staffId)
    .maybeSingle();

  if (targetError) {
    console.error("could not read the person being revoked", targetError);
    return json({ ok: false, reason: "Could not do that. Try again." }, 500);
  }
  if (!target) return json({ ok: false, reason: "That person is not on your team." }, 404);
  if (target.company_id !== admin.company_id) {
    /* Answered the same way as a missing person on purpose. A different
       message here would tell somebody probing that the id is real. */
    return json({ ok: false, reason: "That person is not on your team." }, 404);
  }

  /* SELECTED BACK, so a delete that row level security filtered out is a
     failure rather than a silent success. That is the fault that started
     this whole thing. See removeSource in src/shared/session.js. */
  const { data: removed, error: removeError } = await asService
    .from("staff")
    .delete()
    .eq("id", staffId)
    .select("id");

  if (removeError) {
    console.error("could not remove the staff row", removeError);
    return json({ ok: false, reason: "Could not take their access away. Try again." }, 500);
  }
  if (!removed?.length) {
    console.error("staff delete matched no row", staffId);
    return json({ ok: false, reason: "Could not take their access away. Try again." }, 500);
  }

  /* The account itself. Their access is already gone at this point, because
     the staff row was what granted it, so a failure here is reported and
     not treated as the whole thing failing. */
  const { error: deleteError } = await asService.auth.admin.deleteUser(staffId);
  if (deleteError) {
    console.error(
      `staff row removed but the account remains staff=${staffId} ` +
        `message=${deleteError.message ?? "no message"}`,
    );
    return json({
      ok: true,
      name: target.name,
      accountRemains: true,
      reason: "Their access is gone. The account itself could not be deleted, so tell StellaXafe.",
    });
  }

  console.log(`revoke company=${admin.company_id} by=${user.id} staff=${staffId}`);

  return json({ ok: true, name: target.name, accountRemains: false });
});
