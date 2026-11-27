/* ==========================================================================
   PRINT PDF: A DESIGNED PAGE, PRINTED BY A REAL BROWSER

   Anthony, 2026-11-27: the documents he makes with Claude are web pages
   (HTML) printed to PDF by Chromium, and they are cleaner and better laid
   out than anything the app's own PDF writer can draw. So the app now
   builds each document as a designed page (src/shared/docs/html/) and this
   function has it printed.

   WHAT THIS IS
   The door between the browser and Gotenberg, a free open source print
   service (MIT licence) running on Google Cloud Run in Anthony's own Google
   Cloud. Gotenberg is Chromium, the browser engine, behind a small web
   address. This function checks who is asking, sends the page to Gotenberg
   with the password only this function knows, and hands the PDF back.

   THE TWO PRINTS AND THE JOIN
   A long document has a cover that runs to the edge of the paper with no
   running header, then body pages with the header, the footer and "Page x
   of y" counted from the first body page, as in his RHEMA proposal. So the
   cover and the body are printed separately and Gotenberg joins them.

   WHEN THE PRINTER IS NOT SET UP OR DOES NOT ANSWER
   It answers { ok: false, state }, and the browser makes the PDF with its
   own writer instead (src/shared/docs/pdf.js). Nobody is left without a
   file.

   WHAT IT MUST NEVER DO
   - Return or log the password, or anything a document says. The log says
     how big the pages were and how long the print took.
   - Keep a document. It is passed through and forgotten.

   THE SECRETS IT READS (Supabase, Edge Functions, Secrets)
     PDF_PRINTER_URL        the Cloud Run address of Gotenberg
     PDF_PRINTER_USER       the user name Gotenberg was started with
     PDF_PRINTER_PASSWORD   the password Gotenberg was started with

   READ TOP TO BOTTOM
     1. Plumbing
     2. Talking to Gotenberg
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
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* A page with its pictures inside can be large; past this it is refused
   before anything is sent on. */
const MAX_CHARS = 25_000_000;

/* Chromium usually prints in a few seconds. The browser's own writer takes
   over after this. */
const TIMEOUT_MS = 60_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

/* Gotenberg wants the header and footer as whole pages. */
function wrap(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${fragment}</body></html>`;
}

/* ==========================================================================
   2. TALKING TO GOTENBERG
   Paper sizes are in inches: A4 is 8.27 by 11.7. The body leaves 20 mm at
   the top and 17 mm at the bottom for the running header and footer; the
   side margins live in the page itself.
   ========================================================================== */

type Printer = { url: string; auth: string };

async function call(printer: Printer, path: string, form: FormData, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(`${printer.url}${path}`, {
    method: "POST",
    headers: { Authorization: printer.auth },
    body: form,
    signal,
  });
  if (!response.ok) {
    /* Gotenberg's message is short and says nothing of the document. */
    throw new Error(`printer ${response.status}: ${(await response.text()).slice(0, 160)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function printPage(printer: Printer, html: string, framed: { header: string; footer: string } | null, signal: AbortSignal) {
  const form = new FormData();
  form.append("files", new Blob([html], { type: "text/html" }), "index.html");
  if (framed) {
    form.append("files", new Blob([wrap(framed.header)], { type: "text/html" }), "header.html");
    form.append("files", new Blob([wrap(framed.footer)], { type: "text/html" }), "footer.html");
  }
  form.append("paperWidth", "8.27");
  form.append("paperHeight", "11.7");
  form.append("marginTop", framed ? "0.79" : "0");
  form.append("marginBottom", framed ? "0.67" : "0");
  form.append("marginLeft", "0");
  form.append("marginRight", "0");
  form.append("printBackground", "true");
  return call(printer, "/forms/chromium/convert/html", form, signal);
}

async function join(printer: Printer, first: Uint8Array, second: Uint8Array, signal: AbortSignal) {
  const form = new FormData();
  /* Joined in the order of the file names. */
  form.append("files", new Blob([first as BlobPart], { type: "application/pdf" }), "1-cover.pdf");
  form.append("files", new Blob([second as BlobPart], { type: "application/pdf" }), "2-body.pdf");
  return call(printer, "/forms/pdfengines/merge", form, signal);
}

/* ==========================================================================
   3. THE REQUEST
   Body: { cover: html | null, body: html, header, footer }.
   Answer: { ok: true, base64 } or { ok: false, reason, state }.
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

  let cover = "";
  let body = "";
  let header = "";
  let footer = "";
  try {
    const sent = await req.json() as Record<string, unknown>;
    cover = typeof sent.cover === "string" ? sent.cover : "";
    body = String(sent.body ?? "");
    header = String(sent.header ?? "");
    footer = String(sent.footer ?? "");
  } catch {
    return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  }
  if (!body) return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  if (cover.length + body.length > MAX_CHARS) return json({ ok: false, reason: "That document is too big to print here.", state: "too_big" }, 413);

  /* --- Who is asking. -------------------------------------------------- */
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again." }, 401);
  const { data: staff } = await asUser.from("staff").select("id").eq("id", user.id).maybeSingle();
  if (!staff) return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);

  /* --- Is the printer there. ------------------------------------------- */
  const url = (Deno.env.get("PDF_PRINTER_URL") ?? "").replace(/\/+$/, "");
  const userName = Deno.env.get("PDF_PRINTER_USER") ?? "";
  const password = Deno.env.get("PDF_PRINTER_PASSWORD") ?? "";
  if (!url || !userName || !password) return json({ ok: false, reason: "The printer is not set up.", state: "not_set_up" }, 503);
  const printer = { url, auth: `Basic ${btoa(`${userName}:${password}`)}` };

  /* --- Print, and join the cover on. ----------------------------------- */
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const [coverPdf, bodyPdf] = await Promise.all([
      cover ? printPage(printer, cover, null, controller.signal) : Promise.resolve(null),
      printPage(printer, body, { header, footer }, controller.signal),
    ]);
    const pdf = coverPdf ? await join(printer, coverPdf, bodyPdf, controller.signal) : bodyPdf;
    console.log(`printed in_chars=${cover.length + body.length} out_bytes=${pdf.length} ms=${Date.now() - started}`);
    return json({ ok: true, base64: bytesToBase64(pdf) });
  } catch (error) {
    const timedOut = (error as Error)?.name === "AbortError";
    console.error("could not print", timedOut ? "timeout" : String((error as Error)?.message ?? error).slice(0, 200));
    return json({ ok: false, reason: "The printer did not answer.", state: timedOut ? "timeout" : "failed" }, 504);
  } finally {
    clearTimeout(timer);
  }
});
