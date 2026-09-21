/* ==========================================================================
   READ IMAGE

   Turns a picture in the knowledge base into words the assistant can use.

   WHY THIS EXISTS
   ---------------
   Anthony, 2026-09-21: "the knowledge base still can't read
   images/screenshots."

   He was right. Images were built as a carrier for designs, logos and
   brand pictures headed for Canva, so addImageSource uploaded the file,
   wrote a row, and handed back zero chunks. The assistant builds its
   prompt from chunks, so a screenshot gave it the NAME and the one line
   description and not a word of what was in the picture. Upload a
   screenshot of a price table and it knew there was a thing called "Price
   table" and nothing about the prices.

   READ ONCE, AT UPLOAD, EXACTLY LIKE A LINK
   -----------------------------------------
   add-link fetches a page once when an admin vouches for it and stores
   what it said then. This does the same for a picture. The reading is
   stored as ordinary chunks, so from every other part of the product an
   image is a source like any other: quoted, named, and listed in "which
   sources it used". No second system and no new screen.

   WHAT IT NEVER DOES
   ------------------
   It never guesses at a word it cannot see. A number read wrong off a
   screenshot is exactly the failure this whole product exists to prevent,
   and it would arrive wearing the clothes of a company fact.

   It also never leaves a source stuck on "being read". Every path out of
   here sets the row to ready, because the picture is still usable in a
   design even when the reading failed. A row that says it is still being
   read an hour later is worse than one with no text.

   VERIFY JWT IS OFF, the same as every other function in this project,
   and the caller is checked properly below instead.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

import { toBase64 } from "../_shared/base64.ts";

/* --------------------------------------------------------------------------
   1. WHAT READS THE PICTURE

   THE CAPABLE MODEL, NOT THE CHEAP ONE, and that is Anthony's call on
   2026-09-21. describe-source uses the fast one and should, because
   naming a logo is not a judgement. Transcribing a table of prices is,
   and getting a digit wrong there is the worst thing this product can do.

   This is the only place in this file that names a model, the same rule
   the assistant function follows, so moving a deployment to another
   provider is this one line.
   -------------------------------------------------------------------------- */
const READING_MODEL = "claude-sonnet-5";

/* Enough for a dense screenshot of a full page of text. A picture that
   genuinely holds more than this is a document, and a document should be
   uploaded as one. */
const MAX_OUTPUT = 4000;

/* What Supabase will serve back to a model. Matches describe-source, and
   anything else is refused rather than sent and charged for. */
const ALLOWED = ["image/webp", "image/png", "image/jpeg", "image/gif"];

/* --------------------------------------------------------------------------
   2. THE INSTRUCTION

   TWO JOBS, AND THE SECOND ONE IS ANTHONY'S IMPROVEMENT.

   He asked for it on 2026-09-21: "instead of nothing to read, it should
   say no texts found and then if it's an image of something, it should
   try and describe it in a very short format. That's the intelligence."

   He is right, and the reason is worth saying. "Nothing to read" is the
   system talking about itself, and it hands the assistant a dead row. A
   line saying what the picture IS gives it something true to work with,
   so a logo stops being an empty entry and becomes a fact about the
   company.
   -------------------------------------------------------------------------- */
const INSTRUCTIONS = [
  "You are reading one picture from a company's own knowledge base, so that their",
  "assistant can use what is in it. Somebody on that company's staff uploaded it.",
  "",
  "YOUR FIRST JOB IS THE WORDS, AND IT IS THE IMPORTANT ONE",
  "Write out every word you can actually see, in the order a person reads them.",
  "Keep the structure: headings stay headings, a table stays rows and columns, a",
  "list stays a list, a form keeps its labels next to its values.",
  "",
  "EXACT, NEVER APPROXIMATE. Copy each figure, price, date, code and name exactly",
  "as it is printed. Never tidy a number, never convert a currency, never correct a",
  "spelling, and never finish a word that is cut off at the edge.",
  "",
  "If part of it is too blurred or too small to read, say so in square brackets",
  "where it sits, like [unreadable]. A gap somebody can see is worth more to them",
  "than a guess they cannot.",
  "",
  "SECOND, AND ONLY IF THERE ARE NO WORDS IN IT AT ALL",
  "Say exactly this on its own line:",
  "No text found.",
  "Then, underneath, describe what the picture actually is, in one or two short",
  "lines. What it shows, and anything a colleague would need to know to use it:",
  "a logo and its colours, a product and what it looks like, a photograph and what",
  "is happening in it, a chart and the shape of what it plots.",
  "",
  "Short. Two lines at the most. This is a label, not an essay.",
  "",
  "WHERE THERE ARE BOTH, WORDS WIN. Transcribe them, and add one closing line about",
  "what the picture is only when that tells somebody something the words do not.",
  "",
  "NEVER INVENT ANYTHING. Not a figure, not a company name, not a date, and not a",
  "detail you expect to be there because pictures like this usually have one. If it",
  "is not visible, it does not go in. Everything you write here becomes something",
  "the assistant is allowed to state as this company's own fact.",
  "",
  "Write the reading and nothing else. No preamble, no explaining what you are",
  "doing, and no note about being a model.",
].join("\n");

/* -------------------------------------------------------------------------- */

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const asked = req.headers.get("access-control-request-headers");
    return new Response(null, {
      status: 204,
      headers: asked ? { ...CORS, "Access-Control-Allow-Headers": asked } : CORS,
    });
  }
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const sourceId = String(body?.sourceId ?? "").trim();
  if (!sourceId) return json({ ok: false, reason: "Nothing to read." }, 400);

  /* ----------------------------------------------------------------------
     3. WHO IS ASKING

     Read under the caller's own token, so row level security decides what
     they can see. A staff member of another company asking for this id
     gets nothing back, and the answer is the same 404 as an id that does
     not exist, so this cannot be used to find out whether a row exists.
     ---------------------------------------------------------------------- */
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in to keep going." }, 401);

  const { data: source } = await asUser
    .from("knowledge_sources")
    .select("id, company_id, kind, asset_path, asset_mime")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) return json({ ok: false, reason: "Could not find that." }, 404);
  if (source.kind !== "image" || !source.asset_path) {
    return json({ ok: false, reason: "That one is not a picture." }, 400);
  }

  /* The service role from here on. It writes the chunks and the status,
     which a browser must never be able to do for itself. */
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* EVERY WAY OUT OF HERE LEAVES THE ROW READY. The picture still works in
     a design even when the reading failed, so leaving it on "being read"
     would hide a usable asset behind a status that never changes. */
  async function settle(result: Record<string, unknown>, status = 200) {
    try {
      await admin.from("knowledge_sources").update({ status: "ready" }).eq("id", sourceId);
    } catch (err) {
      console.error("could not set the source back to ready", err);
    }
    return json(result, status);
  }

  const mediaType = String(source.asset_mime ?? "");
  if (!ALLOWED.includes(mediaType)) {
    console.error("refusing to read", mediaType, "for source", sourceId);
    return settle({ ok: true, chunks: 0, reason: "That kind of picture cannot be read." });
  }

  /* ----------------------------------------------------------------------
     4. FETCH IT, READ IT, STORE IT
     ---------------------------------------------------------------------- */
  const bucket = Deno.env.get("BRAND_ASSETS_BUCKET") ?? "brand-assets";

  const { data: file, error: downloadError } = await admin.storage
    .from(bucket)
    .download(source.asset_path);

  if (downloadError || !file) {
    console.error("could not download", source.asset_path, downloadError);
    return settle({ ok: true, chunks: 0, reason: "Could not open that picture." });
  }

  let text = "";
  try {
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const bytes = new Uint8Array(await file.arrayBuffer());

    const reply = await anthropic.messages.create({
      model: READING_MODEL,
      max_tokens: MAX_OUTPUT,
      system: INSTRUCTIONS,
      messages: [{
        role: "user",
        content: [{
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/png", data: toBase64(bytes) },
        }],
      }],
    });

    for (const block of reply.content) {
      if (block.type === "text") text += block.text;
    }
    text = text.trim();
  } catch (err) {
    console.error("could not read the picture", err);
    return settle({ ok: true, chunks: 0, reason: "Could not read that picture." });
  }

  if (!text) return settle({ ok: true, chunks: 0 });

  /* One chunk. A picture is one thing somebody looked at, and splitting a
     transcription in half would cut a table down the middle. */
  const { error: chunkError } = await admin.from("knowledge_chunks").insert({
    source_id: sourceId,
    company_id: source.company_id,
    content: text,
  });

  if (chunkError) {
    console.error("could not store the reading", chunkError);
    return settle({ ok: true, chunks: 0, reason: "Read it, but could not save what it said." });
  }

  return settle({ ok: true, chunks: 1, characters: text.length });
});
