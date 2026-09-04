/* ==========================================================================
   SEND CONTACT
   The "book a live call" form on the public site. Takes what somebody
   typed and emails it to StellaXafe.

   This has to be a server function. Sending mail needs an API key, and a
   key that reaches a browser is a key anybody can read and use to send
   mail as us.

   verify_jwt is off on purpose. Whoever fills in this form has no account
   and never will, that is the point of a contact form. Nothing here reads
   or writes company data, so there is no identity to check. What it does
   instead is refuse anything that is not a plausible enquiry, and cap how
   often one address can send.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* Where it goes, and who it comes from. Both are settable so a change of
   inbox does not need a code change. The from address has to be on a
   domain verified with the mail provider or nothing sends. */
const TO = Deno.env.get("CONTACT_TO") ?? "anthony@stellaxafe.com";
const FROM = Deno.env.get("CONTACT_FROM") ?? "StellaXafe <noreply@mail.stellaxafe.com>";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Caps, so a form post cannot become a way to push a novel through our
   mail provider. Anything longer than this is not somebody asking for a
   call. */
const LIMITS = { name: 120, email: 254, organization: 160, message: 4000 };

/* Best effort throttle. Memory lives as long as the isolate does, so this
   is a speed bump for casual abuse rather than a guarantee. It costs
   nothing and stops the obvious case: one script hammering the form. A
   real limit would need a table, which is worth doing if this is ever
   actually targeted. */
const RECENT = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 3;

function tooMany(key: string): boolean {
  const now = Date.now();
  const seen = (RECENT.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  seen.push(now);
  RECENT.set(key, seen);
  return seen.length > MAX_IN_WINDOW;
}

/* The enquiry is written by a stranger and lands in a mail client that
   renders HTML. Escaping it means what they typed is read as text, never
   as markup. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    return json({ ok: false, reason: "Could not send that just now. Try again shortly." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const name = clean(body?.name, LIMITS.name);
  const email = clean(body?.email, LIMITS.email).toLowerCase();
  const organization = clean(body?.organization, LIMITS.organization);
  const message = clean(body?.message, LIMITS.message);

  if (!name) return json({ ok: false, reason: "Enter your name." }, 400);
  if (!EMAIL_SHAPE.test(email)) return json({ ok: false, reason: "That email does not look right." }, 400);

  /* Newlines in a name or an organization are header injection shaped, and
     no real answer to either field contains one. */
  if (/[\r\n]/.test(name) || /[\r\n]/.test(organization)) {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(`${ip}:${email}`)) {
    return json({ ok: false, reason: "That is already with us. We will be in touch shortly." }, 429);
  }

  const rows = [
    ["Name", name],
    ["Email", email],
    ["Organization", organization || "Not given"],
    ["Looking to solve", message || "Not given"],
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = `<h2 style="font-family:sans-serif">Live call request</h2>${rows
    .map(
      ([label, value]) =>
        `<p style="font-family:sans-serif;margin:0 0 12px"><strong>${label}</strong><br>${escapeHtml(
          value,
        ).replaceAll("\n", "<br>")}</p>`,
    )
    .join("")}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      /* Replying goes straight back to the person who asked, rather than
         to a noreply address nobody reads. */
      reply_to: email,
      subject: `Live call request: ${name}${organization ? ` (${organization})` : ""}`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    /* The provider's own reason is logged, never returned. It can name
       the from address and the account, and neither is a stranger's
       business. */
    console.error("resend rejected the send", response.status, await response.text());
    return json({ ok: false, reason: "Could not send that just now. Try again shortly." }, 502);
  }

  console.log(`contact request from ${email}`);
  return json({ ok: true });
});
