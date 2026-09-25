/* ==========================================================================
   GROUP IMAGES

   Looks at everything somebody just picked, all at once, and says which of
   them are pages of the same thing.

   WHY
   ---
   Anthony, 2026-09-21: "if the images are uploaded in group or at once it
   means they have the same message so the system should treat it as one
   file", and then, when asked how to tell that from a batch of logos:
   "let the model decide, build it, so even if it's ten images and only 7
   is one file while others have different contents so it's able to tell
   them apart."

   So this is not a rule about how files were selected. Picking ten at once
   is how somebody adds a ten page price list AND how they add ten logos,
   and those are opposite things. The only thing that can tell them apart
   is what is actually in the pictures, so it looks.

   WHY ALL OF THEM IN ONE CALL
   Because the question is about the relationship BETWEEN them. Asked one
   at a time, nothing can say "this is page 3 of the thing in the last
   picture", which is exactly the judgement being asked for. One call, one
   look, one answer. It also costs less than naming each one separately,
   which is what it replaces.

   WHAT IT NEVER DOES
   It never invents a page that was not handed to it, and every picture
   comes back in exactly one group. The app checks that rather than
   trusting it, because a picture quietly dropped here is a file somebody
   uploaded and never got.

   VERIFY JWT IS OFF, the same as every other function here, and the caller
   is checked below instead.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { clientFor, modelFor, vendorForUser } from "../_shared/brain.ts";

/* The capable one. Telling seven pages of a price list from three
   unrelated logos is a judgement, and the cheap model is for naming a
   thing, not for weighing up how ten things relate to each other.

   IT READS THEM OUT TOO, in the same call. It is already looking at every
   picture, so asking it to group them and then asking something else to
   read them would be paying twice to look at the same thing. That also
   means a grouped document is read as one piece rather than as pages
   stitched together afterwards, which is how a table that runs across a
   page break survives.
   ⚠️ The model now comes from _shared/brain.ts, the one place in the server
   that names a real model. The vendor is resolved inside the request handler
   below, never at module level: one isolate serves several companies at once.
   This is also the one function that never looked a company up, so it resolves
   it from the caller's own staff row. */

/* Matches the cap the admin screen enforces. Beyond this the request gets
   large and the judgement gets no better. */
const MAX_IMAGES = 10;

const ALLOWED = ["image/webp", "image/png", "image/jpeg", "image/gif"];

const TOOL = {
  name: "group",
  description: "Report which of the pictures belong together as one thing.",
  input_schema: {
    type: "object" as const,
    properties: {
      groups: {
        type: "array",
        description:
          "One entry per separate thing. A ten page document is ONE entry with ten members. Ten unrelated logos are TEN entries with one member each.",
        items: {
          type: "object",
          properties: {
            members: {
              type: "array",
              description:
                "The positions of the pictures in this thing, counting from 0, in the order they should be read.",
              items: { type: "integer" },
            },
            title: {
              type: "string",
              description: "A short name for it, the way a person would file it. No file extension.",
            },
            description: {
              type: "string",
              description: "One line saying what it holds, for somebody deciding whether to open it.",
            },
            reading: {
              type: "string",
              description:
                "Everything the pictures in this group say, written out in reading order. Where there are no words at all, the line 'No text found.' and then one or two short lines describing what the picture is.",
            },
          },
          required: ["members", "title", "description", "reading"],
        },
      },
    },
    required: ["groups"],
  },
};

const INSTRUCTIONS = [
  "Somebody at a company has just picked several pictures to add to their knowledge base.",
  "Your one job is to say which of them are parts of the same thing.",
  "",
  "WHY IT MATTERS. Pictures that belong together should be filed as one item, so the",
  "assistant reads them as one document and the person sees one entry rather than ten.",
  "Pictures that do not belong together must stay separate, or a logo somebody needs",
  "for a design disappears inside a pile of unrelated things.",
  "",
  "WHAT COUNTS AS ONE THING",
  "  - Pages of one document. A contract, a price list, a policy, a form. Page numbers,",
  "    a running header, a sentence that carries on from the last picture, a table",
  "    continuing across them.",
  "  - Screenshots of one continuous screen or one conversation, taken in sequence.",
  "  - One photograph split across several shots of the same sheet of paper.",
  "",
  "WHAT DOES NOT",
  "  - Logos, marks, product shots and headshots. Each is its own thing even when",
  "    there are ten of them and they share a style. Being from the same brand is not",
  "    the same as being the same document.",
  "  - Different documents that happen to look alike, such as two invoices for two",
  "    customers. Same layout, different content, two things.",
  "  - Anything where you are unsure. SPLIT THEM. A person can merge two entries in",
  "    seconds. Finding out that page four of their contract is buried inside another",
  "    entry takes them an afternoon, and they only find out when an answer is wrong.",
  "",
  "A BATCH CAN BE BOTH, AND USUALLY IS",
  "Ten pictures may be seven pages of one report and three separate logos. That is",
  "four groups: one with seven members and three with one each. Do not force them",
  "into one group, and do not split the seven just because the others were split.",
  "",
  "ORDER MATTERS INSIDE A GROUP. Put the members in reading order, page one first,",
  "using the page numbers or the sense of the text rather than the order they were",
  "handed to you. People pick files in whatever order the folder showed them.",
  "",
  "EVERY PICTURE GOES IN EXACTLY ONE GROUP. Never leave one out, never put one in two,",
  "and never refer to a position you were not given.",
  "",
  "NAMING. Name the THING, not the file. Seven pages of a 2026 price list is",
  "\"2026 price list\", not \"Screenshot 4 of 7\". For a single picture, say what it is.",
  "The description is one line for somebody deciding whether to open it.",
  "",
  "Never invent a detail you cannot see in the pictures. The name and the line go in",
  "front of the people who work there, and an assistant will use them to decide which",
  "source answers a question.",
  "",
  "AND READ EACH GROUP OUT, because the reading is what the assistant actually works",
  "from. For every group, write out every word in its pictures, in reading order,",
  "running the pages together as one piece of text. Keep the structure: headings stay",
  "headings, a table stays rows and columns, a list stays a list.",
  "",
  "EXACT, NEVER APPROXIMATE. Copy every figure, price, date, code and name exactly as",
  "printed. Never tidy a number, never convert a currency, never correct a spelling,",
  "and never finish a word cut off at the edge. Where something is too blurred to read,",
  "write [unreadable] where it sits. A gap somebody can see beats a guess they cannot.",
  "",
  "WHERE A GROUP HAS NO WORDS IN IT AT ALL, which is most logos, say exactly this on",
  "its own line:",
  "No text found.",
  "Then describe what the picture is, in one or two short lines. What it shows, and",
  "what a colleague would need to know to use it: a logo and its colours, a product",
  "and what it looks like, a chart and the shape of what it plots. Short. It is a",
  "label, not an essay.",
].join("\n");

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

/* EVERY PICTURE IN EXACTLY ONE GROUP, CHECKED RATHER THAN TRUSTED.

   Exported for its test. A model that drops a picture has silently thrown
   away a file somebody uploaded, and they would only notice weeks later
   when an answer was missing a page. So anything that does not add up is
   not repaired and guessed at, it is refused, and the app falls back to
   one entry per picture, which is what it did before any of this and is
   never wrong, only tedious. */
export function groupsAreSound(groups: unknown, count: number) {
  if (!Array.isArray(groups) || groups.length === 0) return false;

  const seen = new Set<number>();
  for (const group of groups) {
    const members = (group as { members?: unknown })?.members;
    if (!Array.isArray(members) || members.length === 0) return false;

    for (const raw of members) {
      const index = Number(raw);
      if (!Number.isInteger(index) || index < 0 || index >= count) return false;
      if (seen.has(index)) return false;
      seen.add(index);
    }
  }

  return seen.size === count;
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

  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in to keep going." }, 401);

  /* WHICH BRAIN, READ PER REQUEST. Never cached, because one isolate serves
     several companies at once. Falls back to Anthropic on any error, including
     the table not being there, so this can ship before the migration does. */
  const vendor = await vendorForUser(user.id);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const images = Array.isArray(body?.images) ? body.images : [];
  if (!images.length) return json({ ok: false, reason: "Nothing to group." }, 400);
  if (images.length > MAX_IMAGES) {
    return json({ ok: false, reason: `That is more than ${MAX_IMAGES} pictures at once.` }, 400);
  }

  const content: Anthropic.MessageParam["content"] = [];
  images.forEach((raw, index) => {
    const image = raw as Record<string, unknown>;
    const mediaType = String(image?.media_type ?? "");
    const data = String(image?.data ?? "");
    if (!ALLOWED.includes(mediaType) || !data) return;

    /* Numbered out loud, because the answer refers to these positions and
       a model counting them itself is one more thing to get wrong. */
    content.push({ type: "text", text: `Picture ${index}, file name: ${String(image?.name ?? "")}` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType as "image/png", data },
    });
  });

  if (!content.length) return json({ ok: false, reason: "None of those can be read as pictures." }, 400);

  try {
    const anthropic = clientFor(vendor);
    const reply = await anthropic.messages.create({
      model: modelFor(vendor, "standard"),
      /* Room for ten pages of dense text plus the grouping around it. */
      max_tokens: 16000,
      system: INSTRUCTIONS,
      tools: [TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "group" },
      messages: [{ role: "user", content }],
    });

    const call = reply.content.find((block) => block.type === "tool_use");
    if (call?.type !== "tool_use") return json({ ok: true, groups: null });

    const groups = (call.input as Record<string, unknown>)?.groups;

    if (!groupsAreSound(groups, images.length)) {
      console.error("the grouping did not account for every picture, falling back", JSON.stringify(groups));
      return json({ ok: true, groups: null });
    }

    return json({ ok: true, groups });
  } catch (err) {
    /* Never fails the upload. No answer means one entry per picture, which
       is what happened before any of this existed. */
    console.error("could not group the pictures", err);
    return json({ ok: true, groups: null });
  }
});
