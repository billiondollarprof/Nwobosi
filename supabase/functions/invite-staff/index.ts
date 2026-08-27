/* ==========================================================================
   INVITE STAFF
   An admin adds somebody to their company, and that person can sign in.

   This has to be a server function. Creating an account needs the service
   role key, which must never reach a browser, so the browser asks and the
   server decides. Every check that matters happens here: who is asking,
   whether they are an admin, and which company they may add to. None of
   it is taken from the request body.

   verify_jwt stays OFF. The toggle checks a legacy secret this project no
   longer uses, and the caller is verified below with auth.getUser().
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/* A staff member may never be given a model their company's own default
   does not reach. Fable and Opus are deliberately not offered. */
const ALLOWED_CEILINGS = ["haiku-4-5", "sonnet-5"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
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

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = String(body?.role ?? "").trim();
  const ceiling = String(body?.ceiling ?? "sonnet-5");
  const dailyLimit = Math.min(Math.max(Number(body?.dailyLimit) || 5, 1), 100);

  if (!name) return json({ ok: false, reason: "Their name is needed." }, 400);
  if (!email || !email.includes("@")) return json({ ok: false, reason: "A real work email is needed." }, 400);
  if (!role) return json({ ok: false, reason: "Their job role is needed." }, 400);
  if (!ALLOWED_CEILINGS.includes(ceiling)) {
    return json({ ok: false, reason: "That model is not available on this plan." }, 400);
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
    return json({ ok: false, reason: "Only an admin can invite people." }, 403);
  }

  const asService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* A temporary password, told to the admin once so they can pass it on.
     There is no invitation email yet, and a password nobody is given is
     an account nobody can open. Random, long, and never logged. */
  const temporary = `sx-${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`;

  const { data: created, error: createError } = await asService.auth.admin.createUser({
    email,
    password: temporary,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created?.user) {
    const already = /already|exists|registered/i.test(createError?.message ?? "");
    return json(
      {
        ok: false,
        reason: already
          ? "Somebody already has an account with that email."
          : "Could not create that account. Try again.",
      },
      400,
    );
  }

  const { error: staffError } = await asService.from("staff").insert({
    id: created.user.id,
    company_id: admin.company_id,
    name,
    role,
    access_level: "staff",
    model_ceiling: ceiling,
    daily_limit: dailyLimit,
  });

  if (staffError) {
    /* The account exists and belongs to nobody's company, which is worse
       than never having made it. Undo. */
    console.error("could not add staff row, rolling back", staffError);
    await asService.auth.admin.deleteUser(created.user.id);
    return json({ ok: false, reason: "Could not add them to your company. Try again." }, 500);
  }

  console.log(`invite company=${admin.company_id} by=${user.id} ceiling=${ceiling}`);

  return json({ ok: true, name, email, temporary });
});
