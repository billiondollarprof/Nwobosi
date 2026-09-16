/* ==========================================================================
   SUPPORT REPLY
   A person answering a customer, in their own words, from the queue.

   WHY THIS IS A FUNCTION AND NOT A DATABASE WRITE
   -----------------------------------------------
   The reply has to go two places and both of them matter. It goes into
   support_messages, so the thread reads as one conversation next time
   anybody opens it. And it goes OUT, to the customer, by email. A browser
   can do the first on its own and cannot do the second, because sending
   needs a key that must never be in a bundle.

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

   WHATSAPP IS NOT WIRED YET, and it says so rather than pretending. A
   thread with no email address comes back refused, with the reason, so
   nobody types a real answer into a box that quietly drops it.

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
    .select("id, company_id, customer_email, customer_name, channel")
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

     Email if there is an address. WhatsApp is not wired yet, and saying so
     is the whole point of this branch: a reply box that accepts a real
     answer and then drops it is worse than a reply box that refuses. */
  if (!thread.customer_email) {
    return json({
      ok: false,
      reason: thread.channel === "whatsapp"
        ? "This one came in on WhatsApp and replying from here is not built yet. Answer it in WhatsApp."
        : "This person left no email address, so there is nowhere to send a reply.",
    }, 400);
  }

  const sent = await sendEmail(String(thread.customer_email), companyName, message);
  if (!sent.ok) return json({ ok: false, reason: sent.reason }, 502);

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

  return json({ ok: true });
});
