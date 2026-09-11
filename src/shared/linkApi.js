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

/* --------------------------------------------------------------------------
   SECTION: Tidying what somebody actually typed or pasted

   WHY THIS EXISTS, WITH THE REAL CASE THAT CAUSED IT
   On 2026-09-09 an admin pasted "amara.ng," into the address box, with a
   comma on the end that had come along for the ride. The server builds a
   URL out of it, and `new URL("https://amara.ng,")` does not throw. It
   quietly accepts the comma as part of the hostname and hands back
   "https://amara.ng,/". No such host exists, so the fetch failed and the
   screen said "Could not open that page. Check the address and try again."

   Which is true, and useless. The address was right. One character of
   punctuation was wrong, and nothing on screen could tell them which.

   So a stray character is cleaned here rather than costing a round trip,
   and an address that is genuinely not an address is refused here with a
   reason, before the server is asked at all.

   WHAT IS SAFE TO STRIP FROM THE END, AND WHAT IS NOT
   Commas, semicolons, quotes and angle brackets are never part of a real
   web address, and they are exactly what a paste out of a sentence, a
   chat message or a markdown link drags along. A full stop goes too, for
   the same reason.

   Brackets are deliberately left alone. Plenty of real addresses end in
   one, Wikipedia's especially, and stripping it would break a working
   link to fix a typo nobody made.
   -------------------------------------------------------------------------- */

const TRAILING_JUNK = /[\s,;:!?'"<>«»„“”‘’.]+$/;
const LEADING_JUNK = /^[\s'"<>«»„“”‘’]+/;

/* A hostname is letters, digits and hyphens in dot separated labels, with
   at least one dot. Deliberately plain: this is here to catch punctuation
   and obvious nonsense, not to be the final word on what resolves. The
   server still decides, and it still refuses private addresses. */
const HOSTNAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export function tidyAddress(raw) {
  const cleaned = String(raw ?? "")
    .replace(LEADING_JUNK, "")
    .replace(TRAILING_JUNK, "")
    .trim();

  if (!cleaned) return { ok: false, message: "Put in a web address first." };

  const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, message: "That does not look like a web address." };
  }

  /* Punycode, so an address in another script is judged on what it really
     is rather than on characters this pattern was never written for. */
  if (!HOSTNAME.test(parsed.hostname)) {
    return {
      ok: false,
      message: `"${parsed.hostname}" is not a web address. Check for a stray character.`,
    };
  }

  return { ok: true, url: parsed.toString() };
}

export async function fetchLinkSource({ url, description }) {
  const tidy = tidyAddress(url);
  if (!tidy.ok) return { ok: false, message: tidy.message };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Sign in again to add a link." };

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/${FUNCTIONS.addLink}`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: tidy.url, description }),
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
