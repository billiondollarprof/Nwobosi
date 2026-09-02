/* ==========================================================================
   CONTACT API
   The one server call the contact form makes, plus the checks that decide
   whether it is worth making.

   Nothing here can send mail on its own. The browser asks the send-contact
   edge function, and the key that actually sends lives there, where a
   browser cannot read it.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

const UNREACHABLE = "Could not reach the server. Check your connection and try again.";

/* --------------------------------------------------------------------------
   SECTION: Field checks
   Same shape as the setup flow's checks: return the sentence to show, or
   null when the field is fine. The server checks all of this again and
   does not trust any of it.
   -------------------------------------------------------------------------- */

export function nameProblem(name) {
  const value = (name || "").trim();
  if (!value) return "Enter your name.";
  if (value.length < 2) return "That name looks too short.";
  return null;
}

export function emailProblem(email) {
  const value = (email || "").trim();
  if (!value) return "Enter your work email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "That email does not look right.";
  return null;
}

/* --------------------------------------------------------------------------
   SECTION: Send it
   -------------------------------------------------------------------------- */

export async function sendContactRequest({ name, email, organization, message }) {
  const problem = nameProblem(name) ?? emailProblem(email);
  if (problem) return { ok: false, reason: problem };

  try {
    const { data, error } = await supabase.functions.invoke(FUNCTIONS.sendContact, {
      body: {
        name: name.trim(),
        email: email.trim(),
        organization: (organization || "").trim(),
        message: (message || "").trim(),
      },
    });

    if (error) {
      /* A non 2xx arrives with the useful sentence still sitting unread in
         the response body, so dig it out rather than showing a generic
         failure over a message that explains itself. */
      const detail = await readFunctionError(error);
      console.error("send-contact failed", error);
      return { ok: false, reason: detail ?? UNREACHABLE };
    }

    if (data?.ok) return { ok: true };
    return { ok: false, reason: data?.reason ?? "Could not send that just now. Try again shortly." };
  } catch (err) {
    console.error("send-contact threw", err);
    return { ok: false, reason: UNREACHABLE };
  }
}

async function readFunctionError(error) {
  try {
    const body = await error?.context?.json?.();
    return typeof body?.reason === "string" ? body.reason : null;
  } catch {
    return null;
  }
}
