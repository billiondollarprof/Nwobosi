/* ==========================================================================
   ADDING A LINK
   A browser cannot read another site's page. A server can. So this hands
   the address to an edge function, which fetches it once, turns it into
   text, and stores it as a source like any other.

   That split is deliberate and it is the whole rule in one place. A link
   is read once, on the server, at the moment an admin vouches for it. The
   assistant is never given the ability to open one, so a page that
   changes after it was added cannot quietly change what the assistant
   believes, and a link a staff member pastes into the chat is still just
   text.
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

export async function fetchLinkSource({ url, description }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Sign in again to add a link." };

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/add-link`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, description }),
    });
  } catch (err) {
    console.error("add-link failed", err);
    return { ok: false, message: "Could not reach the server. Check your connection." };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* not JSON, fall through to the generic message */
  }

  if (!response.ok || !payload?.ok) {
    return { ok: false, message: payload?.reason ?? "Could not read that page." };
  }

  return { ok: true, name: payload.name, chunks: payload.chunks };
}
