/* ==========================================================================
   SUPPORT REPLY
   A person answering a customer, in their own words, from the queue.

   WHY THIS IS A FUNCTION AND NOT A DATABASE WRITE
   -----------------------------------------------
   The reply has to go two places and both of them matter. It goes into
   support_messages, so the thread reads as one conversation next time
   anybody opens it. And it goes OUT, to the customer, on WhatsApp or by
   email. A browser can do the first on its own and cannot do the second,
   because both sending paths need a key that must never be in a bundle.

   WHO IS ALLOWED
   --------------
   Only somebody an admin has given support access to. Checked here rather
   than in the browser, because a browser can be told to say anything, and
   this is the one screen in the product that speaks to a customer in the
   company's name.

   The thread has to belong to their company too. Without that check
   somebody with support access at one company could answer another
   company's customer by putting a different thread id in the request.

   WHAT IT NEVER DOES
   ------------------
   It never writes the reply itself and it never sends on its own. Every
   word is typed by a person and every send is a person pressing send. The
   assistant already answered what it could before this thread reached a
   human at all, so anything happening here is the part that needed one.

   IT ANSWERS ON THE DOOR THEY KNOCKED ON, since 2026-09-22. A question
   that came in on WhatsApp goes back out on WhatsApp, through the bridge
   in the Amara project that carried it here in the first place. Email is
   the fallback, not the default.

   Before that it could only send email, so somebody who asked on WhatsApp
   got the answer in an inbox they may never have given us, and a thread
   with no email at all was refused outright, which threw away an answer a
   member of staff had already written.

   The one thing it still cannot beat is Meta's 24 hour window: a customer
   has to have messaged within 24 hours for a plain reply to be allowed.
   Past that it falls back to email and says so, rather than showing a
   reply that never left the building. See sendWhatsApp at the bottom.

   READ TOP TO BOTTOM
     1. Plumbing
     2. Sending it
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ==========================================================================
   1. PLUMBING
   ========================================================================== */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile, x-supabase-api-version, range",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

/* Escaped before it goes in an HTML email. The body is typed by a person
   and a person's apostrophe should not break the message, and a person's
   angle bracket should not become a tag. */
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ==========================================================================
   2. SENDING IT
   ========================================================================== */

async function sendEmail(to: string, companyName: string, body: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("RESEND_API_KEY is not set, nothing sent");
    return { ok: false as const, reason: "Sending is not set up on this deployment yet." };
  }

  const from = Deno.env.get("CONTACT_FROM") ?? "StellaXafe <noreply@mail.stellaxafe.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Re: your message to ${companyName}`,
      text: body,
      html: `<p style="font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">${
        escapeHtml(body).replaceAll("\n", "<br>")
      }</p>`,
    }),
  });

  if (!response.ok) {
    console.error("resend rejected the support reply", response.status, await response.text());
    return { ok: false as const, reason: "The email would not send. Try again." };
  }
  return { ok: true as const };
}

/* ==========================================================================
   3. THE REQUEST

   In:  { threadId, body }
   Out: { ok: true } or { ok: false, reason }
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
    .select("id, name, company_id, can_support")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }
  if (staff.can_support !== true) {
    return json({ ok: false, reason: "You do not have the support queue." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong." }, 400);
  }

  const threadId = String(body?.threadId ?? "");
  const message = String(body?.body ?? "").trim();

  if (!threadId) return json({ ok: false, reason: "Which conversation?" }, 400);
  if (!message) return json({ ok: false, reason: "There is nothing to send." }, 400);
  if (message.length > 5000) {
    return json({ ok: false, reason: "That is too long to send as one message." }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* --- WHOSE CUSTOMER IS THIS? -----------------------------------------

     The thread id came from a browser, so it is checked against the
     caller's own company rather than trusted. Without this, somebody with
     support access at one company could answer another company's customer
     by putting a different id in the request, and the customer would
     receive it under the wrong company's name. */
  const { data: thread, error: threadError } = await admin
    .from("support_threads")
    .select("id, company_id, customer_email, customer_name, channel, customer_ref")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError || !thread) {
    return json({ ok: false, reason: "That conversation is not here." }, 404);
  }
  if (thread.company_id !== staff.company_id) {
    /* Said the same way as a thread that does not exist. Telling somebody
       a thread is real but not theirs confirms it is real. */
    return json({ ok: false, reason: "That conversation is not here." }, 404);
  }

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", staff.company_id)
    .maybeSingle();

  const companyName = String(company?.name ?? "us");

  /* --- HOW IT GOES OUT ------------------------------------------------

     ANSWER ON THE DOOR THEY KNOCKED ON. Changed 2026-09-22.

     Anthony: "only email when in escalation no direct back to Whatsapp."

     He was right and it was the wrong shape. Somebody asks a question on
     WhatsApp, waits, and the answer turns up in an email inbox they may
     not have given us and may not check. Worse, when there was no email
     at all this branch simply refused, so a member of staff wrote a real
     answer and the box threw it away.

     Now WhatsApp goes back to WhatsApp, through the same bridge the
     question came in on. Email is the fallback, not the default, and the
     staff member is told which one happened.

     THE ORDER IS: try WhatsApp, then email. Never both, because a customer
     receiving the same answer twice reads as a system that is confused. */
  let wentBy: "whatsapp" | "email" | null = null;
  let whyNotWhatsApp = "";

  if (thread.channel === "whatsapp" && thread.customer_ref) {
    const wa = await sendWhatsApp(String(thread.customer_ref), message);
    if (wa.ok) {
      wentBy = "whatsapp";
    } else {
      whyNotWhatsApp = wa.reason;
      console.error(`whatsapp reply refused thread=${threadId} reason=${wa.reason}`);
    }
  }

  if (!wentBy) {
    if (!thread.customer_email) {
      /* Nowhere left to send it. Say which wall was hit, because "WhatsApp
         would not take it and there is no email" and "this person never
         left an email" send a member of staff to do two different things. */
      return json({
        ok: false,
        reason: whyNotWhatsApp === "window_closed"
          ? "WhatsApp only allows a reply within 24 hours of their last message, and that has passed. They left no email either, so message them on WhatsApp yourself and they can reply to reopen it."
          : whyNotWhatsApp
            ? "WhatsApp would not take that reply and this person left no email address. Try again, and tell StellaXafe if it keeps happening."
            : "This person left no email address, so there is nowhere to send a reply.",
      }, 400);
    }

    const sent = await sendEmail(String(thread.customer_email), companyName, message);
    if (!sent.ok) return json({ ok: false, reason: sent.reason }, 502);
    wentBy = "email";
  }

  /* --- THE RECORD, AFTER THE SEND -------------------------------------

     THE ORDER IS DELIBERATE AND IT IS SEND FIRST. If the write fails after
     a successful send, the customer has their answer and the thread is
     missing a line, which somebody can see and fix. Write first and the
     thread would show an answer that never left the building, which nobody
     can see is wrong.

     Its own try for the same reason bookkeeping always gets one here: a
     row nobody reads is never worth telling somebody their reply failed
     when it did not. */
  try {
    await admin.rpc("support_message_add", {
      p_thread_id: threadId,
      p_company_id: staff.company_id,
      p_author_role: "support",
      p_body: message,
      p_external_id: null,
    });
  } catch (err) {
    console.error("the reply was sent but not written to the thread", err);
  }

  /* WHICH DOOR IT ACTUALLY WENT OUT OF, handed back so the screen can say
     so. A member of staff who asked on WhatsApp and answered on WhatsApp
     should see that, and one whose reply fell back to email must see THAT,
     because it changes whether they chase it. */
  return json({ ok: true, sentBy: wentBy, fellBack: wentBy === "email" && whyNotWhatsApp !== "" });
});

/* --------------------------------------------------------------------------
   SENDING BACK DOWN THE WHATSAPP PATH

   StellaXafe has no WhatsApp connection of its own and should not have one.
   The number, the Meta token and the approval all belong to Amara, which is
   the project that receives the question in the first place. So this posts
   to a function over there and lets it do the sending.

   THE SECRET IS THE WHOLE CHECK. There is no user to authenticate, because
   there is no user: this function has already established that a real member
   of staff, with support access, at the company that owns this thread, wrote
   this reply. Amara only needs to know the caller is us.

   NOT CONFIGURED IS NOT A CRASH. A deployment with no bridge set up falls
   through to email exactly as before, because a company that never wired
   WhatsApp should not see WhatsApp errors.
   -------------------------------------------------------------------------- */

async function sendWhatsApp(phone: string, message: string) {
  const base = (Deno.env.get("AMARA_FUNCTIONS_URL") ?? "").replace(/\/+$/, "");
  const secret = Deno.env.get("SUPPORT_BRIDGE_SECRET") ?? "";

  if (!base || !secret) {
    return { ok: false as const, reason: "not_configured" };
  }

  try {
    const response = await fetch(`${base}/support-whatsapp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-support-secret": secret,
      },
      body: JSON.stringify({ phone, body: message }),
    });

    let payload: Record<string, unknown> = {};
    try {
      payload = await response.json();
    } catch {
      /* Not JSON. Treated as a plain failure below rather than thrown, so a
         bad gateway response falls back to email instead of losing the
         reply somebody just wrote. */
    }

    if (response.ok && payload?.ok === true) return { ok: true as const };
    return { ok: false as const, reason: String(payload?.reason ?? `http_${response.status}`) };
  } catch (err) {
    console.error("could not reach the WhatsApp bridge", err);
    return { ok: false as const, reason: "unreachable" };
  }
}
