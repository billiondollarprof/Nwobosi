/* ==========================================================================
   DRIVE UPLOAD, PUTTING A FINISHED FILE IN THE PERSON'S GOOGLE DRIVE

   Anthony, 2026-09-21: "once the file is ready, it asks you... whether you
   want to upload this to the drive. When you say yes, it uploads."

   The browser builds the file (the same PDF, Word, Slides or Spreadsheet
   it would download) and sends it here. This puts it in a folder in the
   person's own Drive and hands back the link.

   WHY THE FILE IS BUILT IN THE BROWSER AND NOT HERE
   The writers already run there, from the one reading of the document
   (src/shared/docs/). Building it twice, once there and once here, would
   be two places for a file to come out different. So what lands in Drive
   is byte for byte what the Download button gives.

   WHAT IT CAN SEE
   Only files this product made. The connection asks for drive.file and
   nothing wider, see drive-connect. So the folder below is found by name
   among the app's own files, and nothing else in the Drive is visible.

   THE ONE HOUR KEY
   Google's access token lasts an hour. When it has run out, the refresh
   token (the long lived one) is traded for a new one here, before the
   upload, and the row is updated. If Google refuses that trade, the person
   removed access on Google's side, and they are told to connect again.

   WHAT IT MUST NEVER DO
   - Never return or log a token. Keys of a response, never values.
   - Never put a file anywhere but the caller's own Drive. The token row is
     read by the caller's own staff id, never by anything in the request.

   THE SECRETS IT READS
     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   to renew the one hour key

   READ TOP TO BOTTOM
     1. Plumbing
     2. The key: read it, renew it when it has run out
     3. The folder
     4. The upload
     5. The request
   ========================================================================== */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const PROVIDER = "google-drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/* Big enough for any document this product makes, many times over. A
   bigger body is a mistake or an abuse, and is refused before it is read
   into memory as a file. */
const MAX_BASE64 = 12_000_000;

/* The four kinds of file this product makes, and nothing else. A file of
   any other type is refused rather than trusted. */
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/* Said to the person when the connection needs doing again. */
const RECONNECT = "Google Drive needs connecting again. Open the tools menu and connect it, then try once more.";

/* ==========================================================================
   2. THE KEY
   ========================================================================== */

async function liveAccessToken(admin: SupabaseClient, staffId: string) {
  const { data: row, error } = await admin
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("staff_id", staffId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) {
    console.error("could not read the drive connection", error.message);
    return { ok: false as const, reason: "Could not reach your storage just now. Try again.", state: "unreachable" };
  }
  if (!row) return { ok: false as const, reason: "Google Drive is not connected.", state: "none" };

  /* A minute of slack, so a key that dies halfway through an upload is
     renewed first rather than failing in the middle. */
  const fresh = new Date(row.expires_at as string).getTime() - 60_000 > Date.now();
  if (fresh) return { ok: true as const, token: String(row.access_token) };

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: String(row.refresh_token),
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
    }).toString(),
  });
  const text = await response.text();

  if (!response.ok) {
    /* Google's error body names the problem ("invalid_grant" when access
       was removed) and carries no secret of ours. */
    console.error("google refused to renew the drive key", response.status, text.slice(0, 300));
    return { ok: false as const, reason: RECONNECT, state: "unreachable" };
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false as const, reason: RECONNECT, state: "unreachable" };
  }

  const token = String(data.access_token ?? "");
  if (!token) {
    console.error("google renewed with no access token", Object.keys(data));
    return { ok: false as const, reason: RECONNECT, state: "unreachable" };
  }

  /* Kept for next time. Bookkeeping, so its own try: a failure to save the
     new key must not stop this upload, which already has it. */
  try {
    const seconds = Number(data.expires_in ?? 3600);
    await admin
      .from("integration_tokens")
      .update({
        access_token: token,
        /* Google usually keeps the same refresh token; if it sends a new
           one, the new one is the one that works from now on. */
        ...(typeof data.refresh_token === "string" ? { refresh_token: data.refresh_token } : {}),
        expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("staff_id", staffId)
      .eq("provider", PROVIDER);
  } catch (err) {
    console.error("could not save the renewed drive key", err);
  }

  return { ok: true as const, token };
}

/* ==========================================================================
   3. THE FOLDER

   One folder per company in the person's Drive, named after the company,
   so every file this product makes for them is in one obvious place.
   Found by name among the files this app made; made if it is not there.
   ========================================================================== */

async function folderFor(token: string, name: string) {
  const q = `name = '${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const found = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (found.ok) {
    const body = await found.json() as { files?: { id: string }[] };
    if (body.files?.[0]?.id) return body.files[0].id;
  }

  const made = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!made.ok) {
    console.error("could not make the drive folder", made.status, (await made.text()).slice(0, 300));
    return null;
  }
  return ((await made.json()) as { id: string }).id;
}

/* ==========================================================================
   4. THE UPLOAD

   One request carrying the file's name and its bytes together, which is
   Google's "multipart" upload. Right for anything under 5 MB, which every
   document here is.
   ========================================================================== */

function base64ToBytes(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function upload(token: string, folderId: string | null, name: string, mimeType: string, bytes: Uint8Array) {
  const boundary = `sx${crypto.randomUUID().replace(/-/g, "")}`;
  const meta = JSON.stringify({ name, ...(folderId ? { parents: [folderId] } : {}) });
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  return fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

/* ==========================================================================
   5. THE REQUEST
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

  let name = "";
  let mimeType = "";
  let base64 = "";
  try {
    const body = await req.json() as Record<string, unknown>;
    name = String(body.filename ?? "").trim().slice(0, 200);
    mimeType = String(body.mimeType ?? "");
    base64 = String(body.base64 ?? "");
  } catch {
    return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  }
  if (!name || !base64) return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  if (!ALLOWED_TYPES.has(mimeType)) return json({ ok: false, reason: "That kind of file cannot be filed." }, 400);
  if (base64.length > MAX_BASE64) return json({ ok: false, reason: "That file is too big to file." }, 413);

  /* --- Who is asking. -------------------------------------------------- */
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again." }, 401);

  const { data: staff } = await asUser.from("staff").select("id, company_id").eq("id", user.id).maybeSingle();
  if (!staff) return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);

  const { data: company } = await asUser.from("companies").select("name").eq("id", staff.company_id).maybeSingle();
  const folderName = `${String(company?.name ?? "Company").trim() || "Company"} documents`;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  /* --- The key. -------------------------------------------------------- */
  const key = await liveAccessToken(admin, staff.id);
  if (!key.ok) return json({ ok: false, reason: key.reason, state: key.state }, key.state === "none" ? 409 : 502);

  /* --- The folder, then the file. -------------------------------------- */
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return json({ ok: false, reason: "That did not arrive. Try again." }, 400);
  }

  const folderId = await folderFor(key.token, folderName);
  const sent = await upload(key.token, folderId, name, mimeType, bytes);

  if (!sent.ok) {
    const detail = (await sent.text()).slice(0, 300);
    console.error("drive refused the upload", sent.status, detail);
    /* 401 or 403 means the grant is gone or narrowed on Google's side. */
    if (sent.status === 401 || sent.status === 403) {
      return json({ ok: false, reason: RECONNECT, state: "unreachable" }, 502);
    }
    return json({ ok: false, reason: "Google Drive would not take that just now. Try again.", state: "unreachable" }, 502);
  }

  const file = await sent.json() as { id?: string; name?: string; webViewLink?: string };
  return json({ ok: true, name: file.name ?? name, folder: folderName, link: file.webViewLink ?? null });
});
