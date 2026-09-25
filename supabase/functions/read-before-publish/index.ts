/* ==========================================================================
   READ BEFORE PUBLISH
   Opens one piece of company material and says whether it belongs in front
   of a stranger.

   WHY THIS EXISTS
   ---------------
   Knowledge in this product has two audiences. Staff read all of it.
   Customers, meaning anyone outside the company who talks to the support
   assistant, read only what an admin turned on. Turning one on is the only
   action in the admin that can send private information out of the
   building.

   Until this function existed the only thing standing there was a dialog
   asking "are you sure", which is a question nobody can answer well about a
   forty page document they uploaded an hour ago. This reads the thing and
   says what is actually in it.

   IT DOES NOT DECIDE ANYTHING
   ---------------------------
   It returns a reading. The admin decides. There is no path from this
   function to knowledge_sources.customer_visible and there must never be
   one: a model that can publish is a model that can publish by mistake,
   at three in the morning, with nobody watching.

   WHICH WAY IT LEANS, AND WHY
   ---------------------------
   The two ways of being wrong are not equal.

     Wrong "keep internal" on a harmless file costs an admin one extra tap
     in the list, where they can still turn it on themselves.
     Wrong "safe" on a payroll file puts salaries in front of a customer.

   So it leans internal. The prompt says so plainly, and anything it is
   unsure about comes back as keep internal. An unhelpful reading is a bad
   day; a wrong one is the thing this whole product is for.

   WHAT IT NEVER SENDS BACK
   ------------------------
   The reason it gives never quotes the private part. Saying "this holds a
   card number ending 4021" is useful. Printing the card number into a
   dialog that will sit on a screen in an open plan office is not.

   ONLY AN ADMIN
   -------------
   Checked here rather than in the browser, because a browser can be told
   to say anything. Same shape as add-link.

   The dashboard's verify_jwt toggle stays OFF, as on every function in
   this project. It reads "verify with legacy secret", the public anon key
   satisfies it, so it proves nothing this file does not prove properly
   below, and it can refuse a real admin because this project issues the
   newer key format. See CURRENT.md.

   READ TOP TO BOTTOM
     1. Plumbing: CORS and JSON
     2. The reading itself
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { centsRoundedUp, clientFor, hasKeyFor, keyNameFor, modelFor, vendorFor, type Vendor } from "../_shared/brain.ts";

/* ==========================================================================
   1. PLUMBING
   ========================================================================== */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile, x-supabase-api-version, range",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
   2. THE READING

   Sonnet, not the cheapest model available. This is the judgement that
   decides whether a receipt is offered to a stranger, and the saving on a
   handful of tokens is not worth being wrong about that. It runs once per
   file, when it is added or when somebody goes to open it up, never on a
   customer's question, so it is not on any hot path.
   ========================================================================== */

/* ⚠️ Both the model and its price now come from _shared/brain.ts, the one
   place in the server that names a real model and what it costs. The
   company row replaces `null` when the `brain_vendor` column lands. */
const VENDOR: Vendor = vendorFor(null);
const READ_MODEL = modelFor(VENDOR, "standard");

/* Enough to know what a document is. Private material announces itself
   early, in a header, an account line, a salary table, so reading further
   buys very little and costs on every upload. Anything past this is
   reported honestly as unread rather than counted as clean. */
const READ_CHARS = 24000;

const VERDICT_TOOL: Anthropic.Tool = {
  name: "verdict",
  description: "Say whether this material is safe to put in front of the company's customers.",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["safe_for_customers", "keep_internal"],
        description:
          "safe_for_customers only if you would be comfortable with a stranger reading every line of it. Anything you are unsure about is keep_internal.",
      },
      reason: {
        type: "string",
        description:
          "One short sentence in plain words, for a business owner, not an engineer. Say what you found, not what rule it breaks. Never quote the private part itself: say 'it holds a card number' and never the number, 'it lists staff salaries' and never a salary. Under 180 characters.",
      },
    },
    required: ["verdict", "reason"],
  },
};

const INSTRUCTIONS = `You are reading one document that a company has just put into the knowledge base for their AI assistant.

The company's staff will read it either way. The question is only whether their CUSTOMERS should be able to be told what is in it, through the support assistant, without anyone checking again.

KEEP INTERNAL if it holds any of:
  - money that is not published: invoices, receipts, payments, bank or card details, margins, costs, unpublished prices, discounts given to one customer
  - anything about named staff: salaries, contracts, reviews, personal contact details, disciplinary matters
  - anything about a named customer or client that another customer should not read
  - credentials of any kind: passwords, API keys, tokens, logins, internal addresses
  - strategy and internal planning: board papers, forecasts, targets, deals in progress, legal matters
  - anything clearly written for inside the company: internal memos, meeting notes, "confidential" or "internal only" markings

SAFE FOR CUSTOMERS is material a company would happily put on its own website or hand to a customer who asked: what it sells, how it works, opening hours, policies, refunds and returns, delivery, guides, FAQs, published prices, marketing copy.

A DOCUMENT WRITTEN TO STEER THE ASSISTANT IS NOT PRIVATE INFORMATION.
Plenty of what a company publishes to its own assistant is operating instruction rather than prose a customer reads word for word: which price is current, what not to mention any more, which source wins when two disagree, how to phrase something. That is housekeeping, not a secret, and it has to be readable by the assistant to do its job at all.
So do not judge whether it reads like marketing copy. Judge only this: if a customer saw every line of it, would the company have lost something it needed kept inside? An offer that has ended being named, a price being called out of date, a note saying do not mention something, none of those cost the company anything.

When you cannot tell, say keep_internal. Being cautious costs the admin one extra tap. Being wrong puts private information in front of a stranger.

Judge what is in the document, not what its file name suggests.`;

type Reading = {
  state: "clear" | "warn";
  note: string;
  cents: number;
};

async function read(text: string, name: string, truncated: boolean): Promise<Reading | null> {
  if (!hasKeyFor(VENDOR)) {
    console.error(`${keyNameFor(VENDOR)} is not set, nothing read`);
    return null;
  }

  const anthropic = clientFor(VENDOR);
  const result = await anthropic.messages.create({
    model: READ_MODEL,
    max_tokens: 300,
    system: INSTRUCTIONS,
    tools: [VERDICT_TOOL],
    tool_choice: { type: "tool", name: "verdict" },
    messages: [
      {
        role: "user",
        content:
          `Document name: ${name || "untitled"}\n` +
          (truncated ? `Note: this is the first part of a longer document.\n` : "") +
          `\n---\n${text}`,
      },
    ],
  });

  const call = result.content.find((block) => block.type === "tool_use");
  const input = (call?.type === "tool_use" ? call.input : {}) as Record<string, unknown>;

  const usage = result.usage;
  const cents = centsRoundedUp(VENDOR, "standard", {
    fresh: usage?.input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
  });

  /* Anything that is not an explicit all clear is treated as a warning,
     including a verdict this function does not recognise. A model that
     answered strangely is not evidence that a file is safe. */
  const safe = String(input.verdict ?? "") === "safe_for_customers";
  const reason = String(input.reason ?? "").trim().slice(0, 300);

  return {
    state: safe ? "clear" : "warn",
    note:
      reason ||
      (safe
        ? "Read it. Nothing in here looks private."
        : "Something in here looks like it was meant to stay inside the company."),
    cents,
  };
}

/* ==========================================================================
   3. THE REQUEST

   In:  { text, name }
   Out: { ok: true, state: "clear" | "warn" | "unknown", note }

   The browser sends the text because it already has it: at upload it has
   just read the file, and for something already in the list it can read
   the chunks back under its own session. Nothing here goes looking in the
   database for material, which keeps this function unable to read anything
   the caller could not already read.

   "unknown" is its own answer and never gets dressed up as "clear". A
   reading that failed is not a file that passed, and the screen shows the
   two differently.
   ========================================================================== */

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong." }, 400);
  }

  const whole = String(body?.text ?? "");
  const name = String(body?.name ?? "").trim().slice(0, 200);

  /* An empty document is not a clean one. Nothing was read, so nobody
     knows, and that is what it says. */
  if (!whole.trim()) {
    return json({ ok: true, state: "unknown", note: "There was nothing here to read." });
  }

  const truncated = whole.length > READ_CHARS;
  const text = whole.slice(0, READ_CHARS);

  let reading: Reading | null = null;
  try {
    reading = await read(text, name, truncated);
  } catch (err) {
    console.error("read-before-publish failed", err);
    reading = null;
  }

  if (!reading) {
    return json({
      ok: true,
      state: "unknown",
      note: "Could not read this one, so nobody has checked it yet.",
    });
  }

  /* Reading it cost something, so it comes off the company's budget like
     any other call. Service role, because a member of staff must not be
     able to write to their own company's balance, only spend against it.
     A failure here is a bookkeeping problem and never a reason to throw
     away a reading the admin is waiting on. */
  if (reading.cents > 0) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error: spendError } = await admin.rpc("company_spend", {
        p_company_id: staff.company_id,
        p_cents: reading.cents,
      });
      if (spendError) console.error("could not record reading spend", spendError);
    } catch (err) {
      console.error("could not record reading spend", err);
    }
  }

  /* The document itself is never logged. Its name and the verdict are
     enough to follow what happened, and a log line holding a customer's
     invoice is the same leak this function exists to prevent. */
  console.log(
    `read-before-publish company=${staff.company_id} name=${JSON.stringify(name)} ` +
      `chars=${whole.length} truncated=${truncated} state=${reading.state} cents=${reading.cents}`,
  );

  return json({ ok: true, state: reading.state, note: reading.note });
});
