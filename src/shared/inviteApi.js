/* ==========================================================================
   INVITING SOMEBODY
   The browser asks, the server decides. Creating an account needs the
   service role key, which must never be in a bundle, so this is a thin
   call and every real check lives in the edge function.
   ========================================================================== */

import { supabase } from "./supabase.js";

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
    response = await fetch(`${FUNCTIONS_BASE}/invite-staff`, {
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
  return payload;
}
