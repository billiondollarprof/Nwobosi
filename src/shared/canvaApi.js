/* ==========================================================================
   TALKING TO THE CANVA HANDSHAKE
   One place, because two screens now need it.

   The admin knowledge base used to own this and does not any more. Anthony,
   2026-09-16: "Admin is not creating any design... Canva, it's not
   knowledge base. It's a place for work." So it lives with the other
   connectors in the chat, where a staff member connects their own, and
   this file is what both the connector row and the panel call.

   THREE INTENTS, and status is the default at the other end too, so a
   request that loses its body reads the state rather than starting a
   handshake or throwing a connection away.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

export async function askCanva(intent) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.canvaConnect, {
    body: {
      intent,
      /* WHERE TO COME BACK TO.

         Sent on the way out so the callback can bring the person straight
         back to the screen they left, rather than to a page that says
         "you can close this tab now".

         The server does not trust it. It is checked against a list of
         addresses this product is actually served from, and anything else
         is ignored. An address that comes from a browser and is then
         redirected to without checking is an open redirect, which is how
         a convincing phishing link gets built out of somebody's own
         domain. */
      returnTo: intent === "start" ? window.location.href : undefined,
    },
  });

  if (error) {
    /* invoke reports a non 200 as an error and throws the useful part away,
       so the body is read back off the response when there is one. Without
       this an admin sees "Edge Function returned a non-2xx status code",
       which tells them nothing they can act on. */
    let reason = "Could not reach Canva just now. Try again.";
    const status = error.context?.status ?? 0;
    try {
      const body = await error.context?.json?.();
      if (body?.reason) reason = body.reason;
    } catch {
      /* keep the plain message */
    }
    /* 403 is "you are not allowed", which is a completely different thing
       from "it broke". The panel hides its buttons for the first and keeps
       them for the second, so nobody is offered a control that cannot work
       for them. */
    return { ok: false, reason, denied: status === 403 };
  }

  return data ?? { ok: false, reason: "Nothing came back. Try again." };
}
