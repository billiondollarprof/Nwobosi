/* ==========================================================================
   DRIVE CONNECT, THE START OF THE GOOGLE DRIVE HANDSHAKE

   Anthony, 2026-09-23: "Google drive since I already collected the
   credentials and the secret is already stored in edge function."

   The same three jobs as canva-connect, and the same shape on purpose, so
   the security is identical and nobody has to learn a second way:

     status      is Drive connected for this person. Never returns a token.
     start       the address to send them to, to say yes to Google.
     disconnect  forget this person's Drive connection.

   Read canva-connect for the long reasoning behind each piece (PKCE, the
   state value, why the verifier never leaves the server, why a person can
   only ever touch their own row). Only what differs is explained here.

   WHAT DIFFERS FROM CANVA
   -----------------------
   1. THE SCOPE IS drive.file, AND THAT IS A DELIBERATE LIMIT. It lets this
      product see and change ONLY the files it created itself. It cannot
      read anything else in the person's Drive, cannot list their folders,
      cannot open a file somebody else shared with them. A product whose
      whole argument is privacy asks for the least it can do its job with.
   2. access_type=offline and prompt=consent. Google only hands out a
      refresh token (the long lived key that keeps the connection alive
      after the first hour) when asked for offline access, and only on a
      fresh consent. Without prompt=consent, somebody reconnecting gets an
      access token that dies in an hour and nothing to renew it with.
   3. Google's PKCE method is written S256, in capitals.

   ONE CONNECTION PER PERSON, like Canva. It is the person's own Drive, and
   the file lands where they will look for it.

   THE SECRETS IT READS
     GOOGLE_CLIENT_ID      the OAuth client id from Google Cloud
   (GOOGLE_CLIENT_SECRET is read by oauth-callback and drive-upload, never
   here: starting a handshake does not need it.)

   verify_jwt stays OFF, as on every function in this project. This checks
   who is calling itself.

   READ TOP TO BOTTOM
     1. Plumbing
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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const PROVIDER = "google-drive";
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/* The same callback as Canva. It must be registered, character for
   character, as an "Authorised redirect URI" on the OAuth client in Google
   Cloud, or Google refuses with redirect_uri_mismatch. */
const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

/* Only the files this product makes. See the header. */
const SCOPES = "https://www.googleapis.com/auth/drive.file";

/* ==========================================================================
   2. THE TWO SECRETS
   ========================================================================== */

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

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

  /* Status unless start or disconnect is asked for BY NAME. */
  let intent = "status";
  let returnTo: string | null = null;
  try {
    const body = await req.json() as Record<string, unknown>;
    if (body && typeof body === "object") {
      if (body.intent === "start") intent = "start";
      if (body.intent === "disconnect") intent = "disconnect";
      returnTo = safeReturnTo(body.returnTo);
    }
  } catch {
    /* No body is a status request. */
  }

  /* --- Who is asking. Read off their own staff row, never the request. */
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again." }, 401);

  const { data: staff, error: staffError } = await asUser
    .from("staff")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }

  /* Service role: integration_tokens and oauth_pending have RLS on and no
     policies, so nothing else can reach them. */
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  /* --- JOB ONE: is it connected. No token column is even selected. ---- */
  if (intent === "status") {
    const { data: row, error: readError } = await admin
      .from("integration_tokens")
      .select("connected_at, account_label")
      .eq("staff_id", staff.id)
      .eq("provider", PROVIDER)
      .maybeSingle();
    if (readError) {
      console.error("could not read the drive connection", readError.message);
      return json({ ok: false, reason: "Could not check that. Try again." }, 500);
    }
    return json({ ok: true, connected: Boolean(row), connectedAt: row?.connected_at ?? null });
  }

  /* --- JOB TWO: forget it. Only this person's own row. --------------- */
  if (intent === "disconnect") {
    const { error: dropError } = await admin
      .from("integration_tokens")
      .delete()
      .eq("staff_id", staff.id)
      .eq("provider", PROVIDER);
    if (dropError) {
      console.error("could not disconnect drive", dropError.message);
      return json({ ok: false, reason: "Could not disconnect that. Try again." }, 500);
    }
    try {
      await admin.from("oauth_pending").delete().eq("staff_id", staff.id).eq("provider", PROVIDER);
    } catch (err) {
      console.error("could not clear pending drive handshakes", err);
    }
    return json({ ok: true, connected: false });
  }

  /* --- JOB THREE: start. ---------------------------------------------- */
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) {
    return json({ ok: false, reason: "Google Drive is not set up on this deployment yet." }, 500);
  }

  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await challengeFor(verifier);

  const { error: keepError } = await admin.from("oauth_pending").insert({
    state,
    provider: PROVIDER,
    code_verifier: verifier,
    return_to: returnTo,
    staff_id: staff.id,
    company_id: staff.company_id,
  });
  if (keepError) {
    console.error("could not start the drive handshake", keepError);
    return json({ ok: false, reason: "Could not start that. Try again." }, 500);
  }

  /* Tidying abandoned attempts. Its own try: tidying never blocks a start. */
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
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  return json({ ok: true, url: url.toString() });
});
