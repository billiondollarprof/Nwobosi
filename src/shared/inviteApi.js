/* ==========================================================================
   INVITING SOMEBODY
   The browser asks, the server decides. Creating an account needs the
   service role key, which must never be in a bundle, so this is a thin
   call and every real check lives in the edge function.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/* Supabase's gateway wants both headers on every call to an edge
   function: the publishable key to say which project, and the caller's
   token to say who they are. supabase.functions.invoke adds the first
   one for you, and this file uses raw fetch so it can stream, so it has
   to add it itself. Leaving it out gets the request refused at the door,
   which the browser then reports as a connection problem, sending
   everybody looking at their wifi instead of at this line. */
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function inviteStaff({ name, email, role, ceiling, dailyLimit }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: "Sign in again to invite somebody." };

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/${FUNCTIONS.inviteStaff}`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, role, ceiling, dailyLimit }),
    });
  } catch (err) {
    console.error("invite failed", err);
    return { ok: false, reason: "Could not reach the server. Check your connection." };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* not JSON, fall through */
  }

  if (!response.ok || !payload?.ok) {
    return { ok: false, reason: payload?.reason ?? "Could not send that invite." };
  }

  /* The server makes the token, this side makes the link. It is the only
     side that knows what address the app is being served from, which
     matters because the same function answers the live site, a preview
     deployment and a laptop. */
  return { ...payload, link: payload.token ? inviteLink(payload.token) : null };
}

export function inviteLink(token) {
  return `${window.location.origin}/join/${token}`;
}

/* "in 3 days", "in 8 hours", "in 40 minutes". The admin has to be able to
   tell someone how long they have without doing arithmetic. */
export function timeLeft(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "now";

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/* --------------------------------------------------------------------------
   SECTION: Accepting one

   The other side of the link. The token is checked server side, spent
   there, and answered with a one time session token this swaps for a real
   session. No password at either end.
   -------------------------------------------------------------------------- */

export async function acceptInvite(token) {
  if (!/^[0-9a-f]{64}$/.test(String(token || "").trim())) {
    return { ok: false, reason: "That invitation link is not right. Ask for a new one." };
  }

  try {
    const { data, error } = await supabase.functions.invoke("accept-invite", {
      body: { token },
    });

    if (error) {
      let detail = null;
      try {
        detail = (await error?.context?.json?.())?.reason ?? null;
      } catch {
        /* the body was not JSON, fall through to the generic message */
      }
      console.error("accept-invite failed", error);
      return { ok: false, reason: detail ?? "Could not reach the server. Check your connection." };
    }

    if (!data?.ok || !data?.sessionToken) {
      return { ok: false, reason: data?.reason ?? "Could not open that invitation." };
    }

    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.sessionToken,
      type: "magiclink",
    });

    if (sessionError) {
      console.error("accept-invite: could not use the session token", sessionError);
      return { ok: false, reason: "Your invitation worked but we could not sign you in. Sign in with your email instead." };
    }

    return { ok: true, slug: data.slug };
  } catch (err) {
    console.error("accept-invite threw", err);
    return { ok: false, reason: "Could not reach the server. Check your connection." };
  }
}
