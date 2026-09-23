/* ==========================================================================
   CONVERT DOCUMENT: A WORD FILE TO PDF, OR A PDF TO WORD

   Anthony, 2026-09-23: "someone can actually upload any document and ask
   for PDF version or word version... it's a conversion, meaning nothing
   inside the original document is missing and no new thing is added."
   (DOCUMENT-HARNESS.md, section 8.)

   WHAT THIS IS
   The door between the browser and the converter service (converter/ in
   this repo, running on Google Cloud Run). The browser sends the file here;
   this checks who is asking, then passes the file on with a secret only
   this function and the converter know, and hands the result back.

   WHY A DOOR AND NOT A DIRECT CALL
   The converter's secret must never be in the browser. And the converter
   should never be doing work for somebody who is not signed in on a
   company. This function does both checks before a byte is passed on.

   WHEN THE CONVERTER IS NOT SET UP
   It answers { ok: false, state: "not_set_up" }, plainly, and the browser
   converts the file itself instead (src/shared/convert/), saying the look
   is not the original's. So conversion works on day one, and gets exact
   the day the converter is deployed.

   WHAT IT MUST NEVER DO
   - Return or log the secret, or a file's contents or name. The log says
     which way it converted and how big it was.
   - Keep the file. It is passed through and forgotten.

   THE SECRETS IT READS
     CONVERTER_URL      the Cloud Run address, for example
                        https://stellaxafe-converter-xxxxx-ew.a.run.app
     CONVERTER_SECRET   the same long random value the converter was
                        started with

   READ TOP TO BOTTOM
     1. Plumbing
     2. The request
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

/* About 15 MB of file once decoded. Refused before it is decoded. */
const MAX_BASE64 = 20_000_000;

/* Long enough for a big Word file to print, short enough that nobody sits
   watching a spinner for ever. The browser converts it itself after this. */
const TIMEOUT_MS = 90_000;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

/* ==========================================================================
   2. THE REQUEST
   Body: { to: "pdf" | "docx", base64 }. Answer: { ok, base64 } or
   { ok: false, reason, state }.
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

  let to = "";
  let base64 = "";
  try {
    const body = await req.json() as Record<string, unknown>;
    to = String(body.to ?? "");
    base64 = String(body.base64 ?? "");
  } catch {
    return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  }
  if (to !== "pdf" && to !== "docx") return json({ ok: false, reason: "It can make a PDF or a Word file." }, 400);
  if (!base64) return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  if (base64.length > MAX_BASE64) return json({ ok: false, reason: "That file is too big to convert here." }, 413);

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

  /* --- Is the converter there. ----------------------------------------- */
  const url = (Deno.env.get("CONVERTER_URL") ?? "").replace(/\/+$/, "");
  const secret = Deno.env.get("CONVERTER_SECRET") ?? "";
  if (!url || !secret) return json({ ok: false, reason: "The exact converter is not set up.", state: "not_set_up" }, 503);

  /* --- Pass it on. ------------------------------------------------------ */
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/convert?to=${to}`, {
      method: "POST",
      headers: { "X-Converter-Secret": secret, "Content-Type": "application/octet-stream" },
      body: new Blob([bytes as BlobPart]),
      signal: controller.signal,
    });
    if (!response.ok) {
      /* The converter's own message is short and carries no file content. */
      const detail = (await response.text()).slice(0, 200);
      console.error("the converter refused", to, response.status, detail);
      const reason = response.status === 400
        ? "That file is not the kind that can be converted this way."
        : "The converter could not do that one.";
      return json({ ok: false, reason, state: "failed" }, 502);
    }
    const out = new Uint8Array(await response.arrayBuffer());
    console.log(`converted to=${to} in_bytes=${bytes.length} out_bytes=${out.length}`);
    return json({ ok: true, base64: bytesToBase64(out) });
  } catch (error) {
    const timedOut = (error as Error)?.name === "AbortError";
    console.error("could not reach the converter", to, timedOut ? "timeout" : (error as Error)?.name);
    return json({ ok: false, reason: "The converter did not answer.", state: timedOut ? "timeout" : "unreachable" }, 504);
  } finally {
    clearTimeout(timer);
  }
});
