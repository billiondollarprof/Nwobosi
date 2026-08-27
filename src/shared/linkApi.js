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

export async function fetchLinkSource({ url, description }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Sign in again to add a link." };

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/add-link`, {
      method: "POST",
      headers: {
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
