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

/* THIS LIST WAS WRONG AND IT WAS BREAKING EVERY INVITATION. Fixed
   2026-09-21.

   It read ["haiku-4-5", "sonnet-5"], which are vendor model names. The
   enum behind staff.model_ceiling stopped holding those on 2026-09-10,
   when it was renamed to capability levels, and the admin screen started
   sending a level the same day. This function was last touched four days
   before that, so it never heard about it.

   That broke inviting a member of staff twice over. First the screen sent
   "standard" and this check refused it as not available. Second, if
   anything had got past the check carrying "sonnet-5", the insert below
   would have failed anyway, because the enum no longer has that label.

   It is levels now, which is what the column actually holds. Two of them,
   because the ladder came down from four rungs to two on 2026-09-21. See
   the header of supabase/functions/assistant/index.ts. */
const ALLOWED_CEILINGS = ["conversational", "standard"];

/* Where the invitation link points. Deliberately read here and never from
   the request: an admin inviting their own staff could otherwise have the
   email carry a link to a site they control, which is a phishing email sent
   from our domain with our name on it.

   Same sending address as the contact form, on a domain verified with
   Resend. */
const APP_URL = (Deno.env.get("APP_URL") ?? "https://stellaxafe.com").replace(/\/+$/, "");
const FROM = Deno.env.get("CONTACT_FROM") ?? "StellaXafe <noreply@mail.stellaxafe.com>";

Deno.serve(async (req) => {
  /* The preflight. A browser asks before it will send a request carrying
     an Authorization or apikey header, and if this answer is not exactly
     right it refuses to send anything at all, which looks from inside the
     app like the network is down. Echoing back whatever headers it asked
     about means a header added later cannot quietly break it again. */
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

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = String(body?.role ?? "").trim();
  const ceiling = String(body?.ceiling ?? "standard");
  const dailyLimit = Math.min(Math.max(Number(body?.dailyLimit) || 5, 1), 100);

  if (!name) return json({ ok: false, reason: "Their name is needed." }, 400);
  if (!email || !email.includes("@")) return json({ ok: false, reason: "A real work email is needed." }, 400);
  if (!role) return json({ ok: false, reason: "Their job role is needed." }, 400);
  if (!ALLOWED_CEILINGS.includes(ceiling)) {
    return json({ ok: false, reason: "That is not a level this deployment offers." }, 400);
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

  /* The account is real from this moment, so the admin sees the person in
     their list straight away. Its password is random and immediately
     forgotten: nobody signs in with it. The way in is the invitation link
     made below, and after that it is the staff member's own email. */
  const { data: created, error: createError } = await asService.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created?.user) {
    /* LOG THE REAL REASON. Fixed 2026-09-22.

       This branch used to throw the error away. It matched three words in
       the message, chose one of two sentences, and returned. So when
       somebody hit "Could not create that account. Try again." there was
       nothing to read, not on the screen and not in the logs either,
       because nothing was ever written to them.

       That is the same failure the support outage taught on 2026-09-09: a
       thing went wrong, a person saw a shrug, and the cause existed only
       for the microsecond before it was discarded. Anything that refuses
       somebody says why, somewhere a person can read it. */
    const status = (createError as { status?: number } | null)?.status;
    const code = (createError as { code?: string } | null)?.code;
    console.error(
      `createUser refused email=${email} status=${status ?? "none"} ` +
        `code=${code ?? "none"} message=${createError?.message ?? "no message"}`,
    );

    /* THE CODE FIRST, THE WORDS ONLY AS A FALLBACK.

       It used to read the message alone, looking for already, exists or
       registered. A message is wording, and wording changes between
       versions of the auth service, so a duplicate whose sentence was
       phrased differently fell through to "Could not create that account.
       Try again." and sent somebody looking for a bug that was not there.

       The code is the stable fact. The regex stays underneath it, because
       an older deployment may send a message and no code at all. */
    const already =
      code === "email_exists" ||
      code === "user_already_exists" ||
      status === 422 ||
      /already|exists|registered|duplicate/i.test(createError?.message ?? "");

    /* Supabase refuses some addresses outright. Telling somebody to "try
       again" for an address that will never be accepted is an instruction
       to repeat a thing that cannot work. */
    const badAddress = code === "email_address_invalid";

    return json(
      {
        ok: false,
        reason: already
          ? "Somebody already has an account with that email."
          : badAddress
            ? "That email address was refused. Check it and try a different one."
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

  /* ----------------------------------------------------------------------
     THE INVITATION LINK
     Single use, and how long it lasts comes from the database rather than
     from here. 72 hours by default, which is long enough to survive a
     weekend and short enough that a forwarded email, or a mailbox somebody
     else gets into, stops being a way in.

     The raw token goes into the link and nowhere else. Only its SHA-256 is
     stored, the same way a password would be, so a copy of the invites
     table hands nobody a session.
     ---------------------------------------------------------------------- */

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const tokenHash = await sha256(token);

  const { data: lifetime } = await asService.rpc("staff_invite_lifetime");
  const lifetimeHours = hoursFrom(lifetime);
  const expiresAt = new Date(Date.now() + lifetimeHours * 3600_000).toISOString();

  const { error: inviteError } = await asService.from("staff_invites").insert({
    company_id: admin.company_id,
    staff_id: created.user.id,
    email,
    token_hash: tokenHash,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (inviteError) {
    /* The person exists and is on the team, they just have no way in yet.
       Worth saying plainly rather than rolling back a good staff row: the
       admin can invite again and get a fresh link. */
    console.error("staff row created but the invitation link failed", inviteError);
    return json({
      ok: true,
      name,
      email,
      token: null,
      reason: "They are on your team, but the invitation link could not be made. Invite them again to send one.",
    });
  }

  /* ----------------------------------------------------------------------
     SEND IT
     Best effort, and deliberately not fatal. The invitation is already real
     and the admin gets the link back either way, so a mail provider having
     a bad minute must not cost them the person they just added. `emailed`
     says which happened so the screen can tell the truth about it.
     ---------------------------------------------------------------------- */

  const link = `${APP_URL}/join/${token}`;
  const emailed = await sendInvite({ to: email, name, link, hours: lifetimeHours });

  console.log(
    `invite company=${admin.company_id} by=${user.id} ceiling=${ceiling} emailed=${emailed}`,
  );

  return json({ ok: true, name, email, token, expiresAt, emailed });
});

/* --------------------------------------------------------------------------
   THE INVITATION EMAIL
   Plain, short, and it says who invited them and how long they have. No
   images and no tracking: this lands in corporate inboxes, and the more a
   message looks like marketing the more likely it is to be held.
   -------------------------------------------------------------------------- */

async function sendInvite(
  { to, name, link, hours }: { to: string; name: string; link: string; hours: number },
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("RESEND_API_KEY is not set, invitation not emailed");
    return false;
  }

  const first = name.split(/\s+/)[0] || "there";
  const text =
    `Hi ${first},\n\n` +
    `You have been added to your company's StellaXafe workspace.\n\n` +
    `Open it here:\n${link}\n\n` +
    `This link works once and runs out in ${howLong(hours)}. After that, sign in with this email address ` +
    `and we will send you a code.\n\n` +
    `StellaXafe`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: "Your StellaXafe workspace",
        text,
      }),
    });

    if (!response.ok) {
      console.error("resend refused the invitation email", response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("could not reach resend", err);
    return false;
  }
}

/* Hex SHA-256. Deno has WebCrypto, so nothing needs importing. */
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* HOW LONG THEY HAVE, SAID THE WAY A PERSON WOULD SAY IT.

   This line used to read "72 hours", written into the sentence by hand,
   while the real lifetime was read from the database three functions
   above. So the day anybody changed that setting the email started telling
   people a number that was not true, and nothing would have caught it.

   The bands match timeLeft in src/shared/inviteApi.js on purpose, so the
   admin reading "3 days" on their screen and the person reading the email
   are told the same thing in the same words.

   IT ROUNDS DOWN, WHICH IS THE ONE THING timeLeft DOES DIFFERENTLY. That
   one is telling an admin roughly how long is left, so nearest is fine.
   This one is a promise made to somebody who is not in the room, and a
   promise of more time than the link actually has is the version that
   leaves them locked out. */
export function howLong(hours: number) {
  const minutes = Math.floor(hours * 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const whole = Math.floor(minutes / 60);
  if (whole < 48) return `${whole} hour${whole === 1 ? "" : "s"}`;

  const days = Math.floor(whole / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/* Postgres hands an interval back as "72:00:00" or as an object, depending
   on the driver. Both are read here so the lifetime stays a database fact
   rather than a number copied into two places. Falls back to 72. */
function hoursFrom(interval: unknown): number {
  if (typeof interval === "string") {
    const [h, m] = interval.split(":").map(Number);
    if (Number.isFinite(h)) return h + (Number.isFinite(m) ? m / 60 : 0);
  }
  if (interval && typeof interval === "object") {
    const o = interval as Record<string, number>;
    const h = (o.hours ?? 0) + (o.days ?? 0) * 24 + (o.minutes ?? 0) / 60;
    if (h > 0) return h;
  }
  return 72;
}
