/* ==========================================================================
   CANVA DESIGN
   Takes a picture and a title, puts them into Canva, and hands back a
   design the person can open and edit.

   WHAT IT ACTUALLY DOES, IN ORDER
   -------------------------------
     1. Works out who is asking and gets their Canva token, refreshing it
        if it has gone stale.
     2. Uploads the picture to their Canva as an asset. That is an
        asynchronous job, so it is started and then polled.
     3. Creates a design from that asset.
     4. Starts an export, polls it, and comes back with a link to the
        finished image.
     5. Returns the edit URL as well, which is the whole point.

   EVERY STEP IS THAT PERSON'S OWN CANVA
   -------------------------------------
   Not the admin's. That is what makes the edit URL worth returning: the
   design is in the account they are already signed into, so clicking
   through actually opens it. When this ran on one company account, the
   edit link led to a file the staff member could not see.

   THE JOBS ARE ASYNCHRONOUS AND THAT IS NOT A DETAIL
   --------------------------------------------------
   Canva answers an upload or an export immediately with a job id and a
   status of "in_progress". The finished thing arrives later. So both are
   polled, both have a ceiling on how long they are polled for, and both
   report a timeout as a timeout rather than as a failure, because the job
   may well still be running at Canva's end.

   WHAT IT NEVER DOES
   ------------------
   It never returns a token, it never logs one, and it never touches
   anybody else's row. It also never invents a design: if Canva refuses,
   the caller is told which step refused and why, so the chat can say
   something true instead of "could not build that".

   NOT TESTED AGAINST CANVA FROM HERE. The container this was written in
   blocks canva.com entirely, so every call below is written from their
   documented shapes and has never run. The first real run is the test.
   Read the logs on it rather than assuming.

   READ TOP TO BOTTOM
     1. Plumbing
     2. Talking to Canva
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canvaAccessToken } from "../_shared/canva.ts";

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

const API = "https://api.canva.com/rest/v1";

/* How long a job is waited on, and how often it is asked.

   Canva's own guidance is to poll rather than to hold a connection open.
   Ninety seconds covers a normal upload and export with room to spare, and
   it stays inside the time an edge function is allowed to run. Past it the
   answer is "still running", which is true and is different from broken. */
const POLL_EVERY_MS = 1500;
const POLL_CEILING_MS = 90000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ==========================================================================
   2. TALKING TO CANVA

   One place that makes a request and one that waits on a job, so the three
   calls below cannot each grow their own idea of what an error looks like.
   ========================================================================== */

type CanvaFail = { step: string; status: number; detail: string };

async function canva(
  token: string,
  path: string,
  init: RequestInit,
  step: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; fail: CanvaFail }> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error(`could not reach canva at ${step}`, err);
    return { ok: false, fail: { step, status: 0, detail: "Canva did not answer." } };
  }

  const text = await response.text();

  if (!response.ok) {
    /* The body is logged because it names which field Canva disliked, and
       that is the difference between fixing this in a minute and guessing
       for an hour. It carries no secret of ours: the token went in a
       header and this is Canva's error, not our request. */
    console.error(`canva refused at ${step}`, response.status, text);
    return { ok: false, fail: { step, status: response.status, detail: text.slice(0, 400) } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    console.error(`canva returned something that was not json at ${step}`, text.slice(0, 200));
    return { ok: false, fail: { step, status: 502, detail: "Canva sent something unreadable." } };
  }
}

/* Waits on one asynchronous job.

   `pick` pulls the job object out, because upload and export wrap it under
   different keys, and every other line of the waiting is identical. */
async function waitForJob(
  token: string,
  path: string,
  step: string,
  pick: (data: Record<string, unknown>) => Record<string, unknown> | undefined,
): Promise<{ ok: true; job: Record<string, unknown> } | { ok: false; fail: CanvaFail }> {
  const until = Date.now() + POLL_CEILING_MS;

  while (Date.now() < until) {
    const result = await canva(token, path, { method: "GET" }, step);
    if (!result.ok) return result;

    const job = pick(result.data) ?? {};
    const status = String(job.status ?? "");

    if (status === "success") return { ok: true, job };

    if (status === "failed") {
      const reason = (job.error as Record<string, unknown>)?.message;
      console.error(`canva job failed at ${step}`, JSON.stringify(job.error ?? {}));
      return {
        ok: false,
        fail: { step, status: 422, detail: String(reason ?? "Canva could not finish that job.") },
      };
    }

    await sleep(POLL_EVERY_MS);
  }

  /* STILL RUNNING IS NOT FAILED, and the difference matters to whoever
     reads this. The design may well appear in their Canva a moment later,
     so telling them it failed would send them to make it again. */
  return { ok: false, fail: { step, status: 504, detail: "Canva is still working on it." } };
}

/* ==========================================================================
   3. THE REQUEST

   In:  { title, imageBase64, imageMime, designType }
   Out: { ok: true, designId, editUrl, viewUrl, exportUrl }
        { ok: false, reason, needsConnect? , step? }
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

  /* --- Who is asking ------------------------------------------------- */

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
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong." }, 400);
  }

  const title = String(body?.title ?? "Untitled design").trim().slice(0, 120) || "Untitled design";
  const imageBase64 = String(body?.imageBase64 ?? "");
  const designType = String(body?.designType ?? "presentation");

  if (!imageBase64) {
    return json({ ok: false, reason: "There was no picture to put in it." }, 400);
  }

  /* --- Their Canva token, refreshed if it has gone stale --------------- */

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = await canvaAccessToken(admin, staff.id);

  if (!token.ok) {
    /* THREE ANSWERS, NOT ONE. Never connected is a person who has not set
       it up, which is not a failure and is fixed by one press. Reconnect
       needed is a connection that has died. Failed is Canva having a bad
       day, and trying again later really does fix it. */
    if (token.reason === "not_connected") {
      return json({ ok: false, needsConnect: true, reason: "Connect your Canva first." }, 200);
    }
    if (token.reason === "reconnect_needed") {
      return json({ ok: false, needsConnect: true, reason: "Your Canva connection has expired. Connect it again." }, 200);
    }
    return json({ ok: false, reason: "Canva is not answering just now. Try again in a minute." }, 503);
  }

  /* --- STEP ONE: put the picture in their Canva ------------------------

     The body is the raw bytes and the name travels in a header, base64
     encoded, which is Canva's shape rather than a choice made here. The
     name is encoded from UTF-8 bytes rather than from characters, so a
     title with an accent in it does not break the header. */
  const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  const nameBase64 = btoa(String.fromCharCode(...new TextEncoder().encode(title)));

  const started = await canva(token.token, "/asset-uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: nameBase64 }),
    },
    body: bytes,
  }, "upload");

  if (!started.ok) {
    return json({ ok: false, step: started.fail.step, reason: "Canva would not take the picture." }, 502);
  }

  const uploadJobId = String((started.data.job as Record<string, unknown>)?.id ?? "");
  if (!uploadJobId) {
    console.error("canva started no upload job", Object.keys(started.data));
    return json({ ok: false, step: "upload", reason: "Canva would not take the picture." }, 502);
  }

  const uploaded = await waitForJob(
    token.token,
    `/asset-uploads/${uploadJobId}`,
    "upload",
    (d) => d.job as Record<string, unknown> | undefined,
  );
  if (!uploaded.ok) {
    return json({ ok: false, step: "upload", reason: uploaded.fail.detail }, uploaded.fail.status);
  }

  const assetId = String((uploaded.job.asset as Record<string, unknown>)?.id ?? "");
  if (!assetId) {
    console.error("canva finished the upload with no asset id", Object.keys(uploaded.job));
    return json({ ok: false, step: "upload", reason: "Canva did not give the picture back." }, 502);
  }

  /* --- STEP TWO: make the design -------------------------------------- */

  const made = await canva(token.token, "/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_type: { type: "preset", name: designType },
      asset_id: assetId,
      title,
    }),
  }, "design");

  if (!made.ok) {
    return json({ ok: false, step: "design", reason: "Canva would not make the design." }, 502);
  }

  const design = (made.data.design ?? {}) as Record<string, unknown>;
  const urls = (design.urls ?? {}) as Record<string, unknown>;
  const designId = String(design.id ?? "");
  const editUrl = String(urls.edit_url ?? "");

  if (!designId) {
    console.error("canva made no design id", Object.keys(made.data));
    return json({ ok: false, step: "design", reason: "Canva would not make the design." }, 502);
  }

  /* --- STEP THREE: export it, so it can be looked at ------------------

     The export is what makes the checking step possible. A design nobody
     has looked at is a design nobody knows is right, and the model cannot
     look at a Canva file. It can look at a PNG. */
  const exportStarted = await canva(token.token, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
  }, "export");

  /* AN EXPORT THAT FAILS IS NOT A DESIGN THAT FAILED. The design exists in
     their Canva either way, so the edit link is still worth having, and
     saying "could not build that" would send somebody to build a thing
     that is already sitting there. */
  let exportUrl = "";
  if (exportStarted.ok) {
    const exportJobId = String((exportStarted.data.job as Record<string, unknown>)?.id ?? "");
    if (exportJobId) {
      const exported = await waitForJob(
        token.token,
        `/exports/${exportJobId}`,
        "export",
        (d) => d.job as Record<string, unknown> | undefined,
      );
      if (exported.ok) {
        const urlList = (exported.job.urls ?? []) as unknown[];
        exportUrl = String(urlList[0] ?? "");
      }
    }
  }

  return json({
    ok: true,
    designId,
    editUrl,
    viewUrl: String(urls.view_url ?? ""),
    exportUrl,
  });
});
