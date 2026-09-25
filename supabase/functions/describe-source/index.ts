/* ==========================================================================
   DESCRIBE SOURCE
   Reads one piece of company material and writes its title and the one line
   that says what it holds.

   WHY THIS EXISTS
   ---------------
   Until now the admin typed both. Anthony, 2026-09-15: "is it not better
   that when admin is uploading the work, admin doesn't need to write the
   title or description? They can just change the title if they want."

   He is right, and the reason goes past saving typing.

   THE ADMIN IS THE WRONG AUTHOR FOR THAT SECOND FIELD. It is not a label
   for a person to read. It is what the assistant uses to decide which
   source to open for a job. So when an admin types "Q2 report" they have
   written something for themselves, and the thing that has to use it gets
   almost nothing. A line written by the model that will later read it is
   written for the job it has to do.

   THE SECOND REASON IS THE EMPTY BOX. A blank field with a cursor in it is
   where setup stops. Somebody uploads four files, writes two descriptions,
   gets bored, and the other two go in blank and never get used properly.
   Fill it in and there is nothing to abandon.

   IT SUGGESTS, IT DOES NOT DECIDE
   -------------------------------
   Both fields come back as text the admin can change before anything is
   saved, and the screen says so. The admin knows things the document does
   not say. A price list might be the old one, kept for reference, and
   nothing inside it admits that.

   TEXT OR AN IMAGE, ONE FUNCTION
   ------------------------------
   A logo has no text to read, so it is sent as an image and the model
   looks at it. That is the same job with a different input, so it is the
   same function. Two functions would be two prompts drifting apart, and
   the answer has to read the same either way or the list looks like it was
   written by two people.

   WHAT IT NEVER DOES
   ------------------
   It never writes to the database. It reads what the browser hands it and
   returns two strings. There is no path from here to knowledge_sources,
   the same rule read-before-publish follows and for the same reason.

   READ TOP TO BOTTOM
     1. Plumbing
     2. The model and what it is asked for
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { clientFor, hasKeyFor, keyNameFor, specialFor, vendorForCompany, type Vendor } from "../_shared/brain.ts";

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

/* ==========================================================================
   2. THE MODEL AND WHAT IT IS ASKED FOR

   Haiku, not Sonnet, and that is a different judgement from the one
   read-before-publish made. That function decides whether a stranger may
   read a document, so being wrong is expensive and it pays for Sonnet.
   This one writes a label the admin can see and correct in the same
   breath, so being slightly worse costs one edit. It also runs while
   somebody is watching an empty field, and waiting is the thing that
   makes this feel worse than typing it themselves.
   ========================================================================== */

/* ⚠️ THIS ONE DOES NOT RUN AT A LEVEL, AND THAT IS DELIBERATE.
   It asks the SMALL model to describe a document, because that is a short
   job, and it PINS the dated snapshot rather than floating on the bare name.
   A pinned snapshot and a floating name are different request strings, so
   deriving this from a level would quietly change which model answers.
   The name now lives in _shared/brain.ts, per vendor, so the exception
   survives a company changing vendor. Anthony's call whether this job
   should move onto a level like the rest.
   ⚠️ The vendor is resolved inside the request handler below, never at module
   level: one isolate serves several companies at once. */

/* Enough to know what a document is and what it is called. A document
   announces itself in the first page or two: a title, a header, a purpose
   line. Reading forty pages to write one sentence costs on every upload
   and buys almost nothing. */
const READ_CHARS = 12000;

const DESCRIBE_TOOL: Anthropic.Tool = {
  name: "describe",
  description: "Give this piece of company material a title and one line saying what it holds.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "What this material should be called in a list. If the document names itself, use that name, tidied. Otherwise write one. Plain words a colleague would use, no file extension, no date unless the date is the point. Under 60 characters.",
      },
      description: {
        type: "string",
        description:
          "One short line saying what is inside, written so that a colleague deciding whether to open this for a piece of work can tell at a glance. Name the actual contents: which numbers, which period, which product, which policy. Not what kind of document it is. Under 120 characters, and shorter is better.",
      },
    },
    required: ["title", "description"],
  },
};

const INSTRUCTIONS = `You are labelling one piece of material a company has just put into the knowledge base for their AI assistant.

Two fields, and they do different jobs.

THE TITLE is what a person scans in a list. If the document names itself, use that name. A brand guidelines PDF called "Amara_Brand_Guidelines_v4_FINAL.pdf" is "Amara brand guidelines", not the filename. If nothing names it, write the plainest true name you can.

THE DESCRIPTION is not for a person. It is what the assistant reads to decide whether to open this source for a job somebody asked for. So name what is actually inside it. "Colours, type, tone of voice and the logo rules" is useful. "A document about branding" is not, because every branding document matches that and the assistant learns nothing.

Say what is in it, not what kind of thing it is. Nobody needs to be told a PDF is a PDF.

SHORT. One line. If it runs past about fifteen words, cut it.

WRITE IN BRITISH ENGLISH. Colour, organisation, recognise.

NEVER PUT A NUMBER, A NAME OR A PRICE IN THE DESCRIPTION THAT IS ITSELF THE PRIVATE THING. Say "last quarter's revenue and the commentary", never the revenue. Say "the salary bands", never a salary. This line is shown on a screen and may be read by somebody who should not see the contents.

FOR AN IMAGE: say what it shows and what it would be used for. A logo is "the company logo, full colour on a transparent background". A product photo is "a photo of the X in use". If it is a screenshot of a document, read the document and describe that instead.

Judge what is actually in front of you, not what the file name suggests.`;

type Described = { title: string; description: string };

async function describe(
  vendor: Vendor,
  content: Anthropic.MessageParam["content"],
): Promise<Described | null> {
  if (!hasKeyFor(vendor)) {
    console.error(`${keyNameFor(vendor)} is not set, nothing described`);
    return null;
  }

  const anthropic = clientFor(vendor);
  const result = await anthropic.messages.create({
    model: specialFor(vendor, "describeSource"),
    max_tokens: 300,
    system: INSTRUCTIONS,
    tools: [DESCRIBE_TOOL],
    tool_choice: { type: "tool", name: "describe" },
    messages: [{ role: "user", content }],
  });

  const call = result.content.find((block) => block.type === "tool_use");
  if (call?.type !== "tool_use") return null;

  const input = call.input as Record<string, unknown>;
  const title = String(input.title ?? "").trim().slice(0, 80);
  const description = String(input.description ?? "").trim().slice(0, 160);

  /* Half an answer is not an answer. The screen falls back to the file
     name, which is always better than a title that says nothing. */
  if (!title || !description) return null;

  return { title, description };
}

/* ==========================================================================
   3. THE REQUEST

   In:  { text, name }                     a document
        { image: { media_type, data }, name }   a picture, data is base64
   Out: { ok: true, title, description }
        { ok: true, title: null, description: null }   nothing could be read

   A failure here is never an error on the screen. The admin types the two
   lines themselves, which is exactly what they did last week, so the worst
   case is the product they already had.
   ========================================================================== */

const ALLOWED_IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const asked = req.headers.get("access-control-request-headers");
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
    .select("id, company_id, access_level")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }
  if (staff.access_level !== "admin") {
    return json({ ok: false, reason: "Only an admin can do this." }, 403);
  }

  /* WHICH BRAIN, READ PER REQUEST. Never cached, because one isolate serves
     several companies at once. Falls back to Anthropic on any error, including
     the table not being there, so this can ship before the migration does. */
  const vendor = await vendorForCompany(staff.company_id);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong." }, 400);
  }

  const name = String(body?.name ?? "").trim().slice(0, 200);
  const text = String(body?.text ?? "");
  const image = body?.image as Record<string, unknown> | undefined;

  /* What gets sent to the model, built once so the two paths cannot drift
     in how they introduce the material. */
  let content: Anthropic.MessageParam["content"];

  if (image && typeof image === "object") {
    const mediaType = String(image.media_type ?? "");
    const data = String(image.data ?? "");

    /* Checked here rather than trusted, because this string goes straight
       into a request we pay for. An unknown type is refused rather than
       guessed at. */
    if (!ALLOWED_IMAGE_TYPES.includes(mediaType) || !data) {
      return json({ ok: true, title: null, description: null });
    }

    content = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType as "image/webp", data },
      },
      { type: "text", text: `File name: ${name || "untitled"}` },
    ];
  } else {
    const trimmed = text.slice(0, READ_CHARS);
    /* An empty document has nothing to name. The screen keeps the file
       name, which is what it always had. */
    if (!trimmed.trim()) return json({ ok: true, title: null, description: null });

    content =
      `File name: ${name || "untitled"}\n` +
      (text.length > READ_CHARS ? "Note: this is the first part of a longer document.\n" : "") +
      `\n---\n${trimmed}`;
  }

  try {
    const described = await describe(vendor, content);
    if (!described) return json({ ok: true, title: null, description: null });
    return json({ ok: true, title: described.title, description: described.description });
  } catch (err) {
    /* THIS NEVER BECOMES AN ERROR ON THE SCREEN. A failure here means the
       admin types the two lines themselves, which is what they did before
       this function existed. Turning a convenience that did not work into
       a red message would make the product worse than not having it. */
    console.error("could not describe the source", err);
    return json({ ok: true, title: null, description: null });
  }
});
