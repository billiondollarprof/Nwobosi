/* ==========================================================================
   NAMING A SOURCE, SO THE ADMIN DOES NOT HAVE TO
   The browser half of the describe-source edge function.

   WHAT IT IS FOR
   --------------
   An admin used to type a title and a line saying what a file holds. Now
   the model reads the file and writes both, and the admin corrects them if
   they want to. See the header of supabase/functions/describe-source for
   why that second field is better written by the thing that has to use it.

   IT NEVER FAILS LOUDLY
   ---------------------
   Every path that does not produce two strings returns nulls, and the
   screen keeps the file name and an empty description. That is exactly
   what the admin had before this existed, so a failure here costs them
   nothing they were not already doing. A red message for a convenience
   that did not work would make the product worse than not having it.

   The timeout is short for the same reason. Somebody is watching an empty
   field, so waiting is the thing that makes this feel worse than typing it
   themselves. Past the timeout it gives up quietly and they type.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/* Twelve seconds. Long enough for a real read of a long document on a slow
   connection, short enough that nobody sits looking at a spinner deciding
   the upload has broken. */
const DESCRIBE_TIMEOUT_MS = 12000;

const NOTHING = { title: null, description: null };

/* Takes either { name, text } for a document or { name, image } for a
   picture, where image is { media_type, data } and data is base64 with no
   data URL prefix on the front of it. */
export async function describeSource({ name, text, image }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NOTHING;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DESCRIBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${FUNCTIONS_BASE}/${FUNCTIONS.describeSource}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(image ? { name, image } : { name, text }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return NOTHING;

    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const description = typeof payload.description === "string" ? payload.description.trim() : "";

    /* Both or neither. A title with no description leaves the admin with
       one filled field and one empty one, which reads as broken rather
       than as helpful. */
    if (!title || !description) return NOTHING;

    return { title, description };
  } catch {
    /* An abort is the timeout above. Everything else is a network that
       did not answer. Neither is worth a message. */
    return NOTHING;
  } finally {
    clearTimeout(timer);
  }
}
