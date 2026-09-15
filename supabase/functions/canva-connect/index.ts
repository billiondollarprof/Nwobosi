/* ==========================================================================
   CANVA CONNECT, THE START OF THE HANDSHAKE

   Hands back the address an admin is sent to so they can say yes to Canva.
   It does not talk to Canva at all. It invents two secrets, keeps one, and
   puts a fingerprint of it in the address.

   WHY THE BROWSER CANNOT JUST BUILD THIS ADDRESS ITSELF
   ----------------------------------------------------
   Two reasons, and only the second is obvious.

     1. PKCE (a handshake that proves, at the end, that whoever redeems the
        code is the same party that started it). It works by inventing a
        random secret called the verifier, sending only a SHA-256
        fingerprint of it out into the world, and producing the original
        at the end. The verifier must never leave the server. A browser
        that generated it would be holding the one thing that makes the
        proof worth anything.
     2. `state`, a random value sent out and checked on the way back. It is
        what stops somebody feeding our callback a code they obtained
        elsewhere. Generated here so the callback can recognise its own
        work.

   ONE CONNECTION FOR THE WHOLE DEPLOYMENT
   ---------------------------------------
   Anthony is on a free personal Canva account and the plan is that his one
   account backs everybody. So this is not per person and not per company.
   It writes one row, keyed by provider, and connecting again replaces it.

   ONLY AN ADMIN
   -------------
   Checked here rather than in the browser, because a browser can be told to
   say anything. Same shape as read-before-publish and add-link.

   The dashboard's verify_jwt toggle stays OFF, as on every function in this
   project. See CURRENT.md.

   THREE JOBS, AND THE SAFE ONE IS THE DEFAULT
   -------------------------------------------
   The admin screen needs three things from here: "is Canva connected",
   "start connecting it", and "forget the account that is connected". They
   are one function because the last two are meaningless without the first,
   and because a second function is a second deploy and a second place to
   keep the admin check in step.

   `intent` picks. Anything that is not exactly "start" or "disconnect" is
   treated as a status request, so a malformed body, a typo, or an old
   browser reads the state rather than quietly starting a handshake or
   throwing a connection away. Both of the jobs that change something have
   to be asked for by name.

   WHY DISCONNECT EXISTS AT ALL
   ----------------------------
   Anthony connected the wrong Canva account on 2026-09-15 and then had no
   way back. Canva itself offered him an account switcher and the switcher
   would not take, so the only control left on our side was "Check again",
   which only re-reads what is already there. A connection somebody can
   make and cannot unmake is a trap, and the way out of it has to live on
   the same panel that made it.

   What it deletes is the token row, and that is all it deletes. It does
   not tell Canva anything and it does not revoke the grant on Canva's
   side. The person still has the option to remove our integration from
   their own Canva settings, and they should be told that, because after
   this the tokens are gone from here and we could not revoke them even if
   we wanted to.

   STATUS NEVER RETURNS A TOKEN. Not the access token, not the refresh
   token, not a prefix of either. It returns whether a row exists, when it
   was made, and what it is allowed to do. That is everything a person needs
   to decide whether to reconnect.

   READ TOP TO BOTTOM
     1. Plumbing: CORS and JSON
     2. The two secrets
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeReturnTo } from "../_shared/returnTo.ts";

/* ==========================================================================
   1. PLUMBING
   ========================================================================== */

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

/* Where Canva sends a person to approve, and where it sends them back.

   THE REDIRECT MUST MATCH THE PORTAL EXACTLY, character for character,
   including the scheme and any trailing slash. Canva compares the string.
   A mismatch is refused at their end with an error that does not say which
   part is wrong, so this is built from one constant rather than assembled
   in two places that can drift. */
const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

/* What the connection is allowed to do, and nothing beyond it.

   Deliberately does NOT ask for brand template or autofill scopes. Those
   need a Canva Enterprise plan, and asking for a scope the account cannot
   grant fails the whole authorisation rather than quietly granting less. */
const SCOPES = [
  "asset:read",
  "asset:write",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "profile:read",
].join(" ");

/* ==========================================================================
   2. THE TWO SECRETS

   crypto.getRandomValues, not Math.random. Math.random is predictable
   enough that somebody who has seen a few of its outputs can work out the
   next one, and both of these values exist only to be unguessable.
   ========================================================================== */

/* base64url: base64 with the two URL hostile characters swapped and the
   padding dropped. Both of these travel in a query string. */
function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/* The fingerprint of the verifier, which is the only part that leaves here.
   SHA-256, which is what code_challenge_method=s256 means. */
async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/* ==========================================================================
   3. THE REQUEST
   ========================================================================== */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const asked = req.headers.get("Access-Control-Request-Headers");
    return new Response(null, {
      status: 204,
      headers: asked ? { ...CORS, "Access-Control-Allow-Headers": asked } : CORS,
    });
  }
  if (req.method !== "POST") return json({ ok: false, reason: "Use POST." }, 405);

  /* --- What is being asked for ---------------------------------------

     Read before the admin check so a malformed body cannot be mistaken for
     a request to start. Default is status, which changes nothing. */
  let intent = "status";
  let returnTo: string | null = null;
  try {
    const body = await req.json() as Record<string, unknown>;
    if (body && typeof body === "object") {
      if (body.intent === "start") intent = "start";
      if (body.intent === "disconnect") intent = "disconnect";
      /* Checked against the list of addresses this product is served from,
         never trusted. A rejected address is simply null, and the callback
         falls back to a page it controls. See _shared/returnTo.ts for why
         this is a list rather than a tidy up. */
      returnTo = safeReturnTo(body.returnTo);
    }
  } catch {
    /* No body at all is a status request. */
  }

  /* --- Who is asking ------------------------------------------------- */

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again." }, 401);

  const { data: staff, error: staffError } = await asUser
    .from("staff")
    .select("id, access_level")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }
  if (staff.access_level !== "admin") {
    return json({ ok: false, reason: "Only an admin can connect Canva." }, 403);
  }

  /* The service role, because both tables have row level security on and no
     policies at all. Nobody reaches them except this. */
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* --- JOB ONE: say whether it is connected ---------------------------

     The columns picked here are deliberate. access_token and refresh_token
     are NOT among them, so there is no path from this response to a secret
     even if somebody later widens what the screen shows. */
  if (intent === "status") {
    const { data: row, error: readError } = await admin
      .from("integration_tokens")
      .select("provider, scopes, connected_at, expires_at")
      .eq("provider", "canva")
      .maybeSingle();

    if (readError) {
      console.error("could not read the canva connection", readError.message);
      return json({ ok: false, reason: "Could not check that. Try again." }, 500);
    }

    return json({
      ok: true,
      connected: Boolean(row),
      connectedAt: row?.connected_at ?? null,
      /* Whether the four hour access token has gone stale. Not a problem and
         not shown as one: the refresh token fixes it on the next use. It is
         here so a screen can say "reconnect" if refreshing ever fails. */
      accessStale: row ? new Date(row.expires_at as string).getTime() < Date.now() : false,
      scopes: row?.scopes ?? null,
    });
  }

  /* --- JOB TWO: forget the connected account ---------------------------

     A delete, and it is the only destructive thing this function does. The
     admin check above has already run, so by here we know an admin asked
     for it by name.

     It succeeds when there was nothing to delete. An admin pressing this
     wants to end up disconnected, and they are disconnected either way, so
     reporting "there was no row" as a failure would be the function
     telling them off for arriving at the outcome they asked for. */
  if (intent === "disconnect") {
    const { error: dropError } = await admin
      .from("integration_tokens")
      .delete()
      .eq("provider", "canva");

    if (dropError) {
      console.error("could not disconnect canva", dropError.message);
      return json({ ok: false, reason: "Could not disconnect that. Try again." }, 500);
    }

    /* Any half finished handshake goes too. Somebody who disconnects has
       changed their mind about the account they were connecting, so a
       pending row from a minute ago is only there to complete into the
       account they just walked away from.

       Its own try, and its failure is ignored. The disconnect has already
       worked by this point, and tidying must never turn a success into an
       error message. */
    try {
      await admin.from("oauth_pending").delete().eq("provider", "canva");
    } catch (err) {
      console.error("could not clear pending canva handshakes", err);
    }

    return json({ ok: true, connected: false });
  }

  /* --- JOB THREE: start connecting ------------------------------------- */

  const clientId = Deno.env.get("CANVA_CLIENT_ID");
  if (!clientId) {
    return json({ ok: false, reason: "Canva is not set up on this deployment yet." }, 500);
  }

  /* --- Invent, keep, and hand back ------------------------------------ */

  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await challengeFor(verifier);

  const { error: keepError } = await admin
    .from("oauth_pending")
    .insert({ state, provider: "canva", code_verifier: verifier, return_to: returnTo });

  if (keepError) {
    console.error("could not start the canva handshake", keepError);
    return json({ ok: false, reason: "Could not start that. Try again." }, 500);
  }

  /* Anything left from an abandoned attempt goes now. Ten minutes is long
     enough for somebody to read Canva's approval screen and short enough
     that a forgotten row is not sitting there for a month.

     Its own try, and its failure is ignored on purpose. This is tidying,
     and tidying must never be the reason an admin cannot connect. */
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await admin.from("oauth_pending").delete().lt("created_at", tenMinutesAgo);
  } catch (err) {
    console.error("could not clear old handshakes", err);
  }

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");

  return json({ ok: true, url: url.toString() });
});
