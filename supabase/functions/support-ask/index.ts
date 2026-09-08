/* ==========================================================================
   SUPPORT

   The second environment. A person outside the company messages the
   company's WhatsApp number, and this answers them.

   It is not a smaller assistant. It is a different job with a different
   boundary, and the boundary is the product:

     READS   only what an admin published. One function, customer_knowledge,
             which hard codes customer_visible = true. Never staff material.
     WRITES  nothing into what the company knows. A customer cannot teach
             this anything.
     REACHES nothing. No connectors, no browsing, no tools. Stored text is
             the whole world.
     COSTS   one model, Haiku, no routing. This inbox is open to the street,
             so the per message cost is set by strangers, not by the company.

   WHY THE RULES ARE NOT IN THE PROMPT
   -----------------------------------
   Because a prompt is a request and a permission is a fact. Everything
   above is enforced by what this function can call, not by what it is told.
   The system prompt below is short on purpose: piling rules onto a model
   makes it worse at answering, not safer.

   THE TWO DOORS
   -------------
   POST /support-ask            a customer said something
   POST /support-ask/support    a support person said something

   The path decides author_role. Nothing is inferred from the text and
   nothing is taken from the body, so a caller cannot claim to be a human by
   asking nicely.

   verify_jwt is OFF. There is no signed in user on this path, there is a
   shared secret between Amara and this function. Every read runs as the
   service role, which is exactly why every read goes through a security
   definer function rather than touching a table.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

/* --------------------------------------------------------------------------
   SECTION: Constants
   -------------------------------------------------------------------------- */

const MODEL = "claude-haiku-4-5";

/* Dollars per million tokens, for turning real usage into cents off the
   company's budget. Same table as assistant/index.ts and src/shared/config.js.
   Only the one rung, because support never leaves it. */
const PRICE = { input: 1, output: 5 };

/* A conversation's worth of history, not a lifetime's. Long enough that
   somebody can say "the second one" and be understood. */
const HISTORY_LIMIT = 20;

/* Published material is usually a handful of documents. This is the ceiling
   that stops one enormous upload from making every reply slow and expensive. */
const MAX_SOURCE_CHARS = 40000;

/* What the customer is told when their question goes to a person. Fixed
   here rather than written by the model, because it is a promise about how
   the company behaves and a model must not invent one of those.

   The second sentence was added 2026-09-08, after a test where the handover
   was correct and the conversation still died on the spot. Somebody who has
   just been told to wait has nothing to do next, and a support desk that
   goes quiet reads as one that has stopped listening. Offering the next
   question costs nothing and keeps the thread alive while the colleague
   gets to it. It is fixed here for the same reason as the first sentence:
   it is the company's manner, not the model's. */
const HANDOVER_LINE =
  "Let me get someone to answer that properly. They will reply right here. " +
  "Is there anything else I can help you with in the meantime?";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-support-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* --------------------------------------------------------------------------
   SECTION: The gate
   One shared secret. Compared in constant time, because a comparison that
   returns early on the first wrong character leaks the secret one character
   at a time to anyone patient enough to measure.
   -------------------------------------------------------------------------- */

function secretMatches(given: string | null) {
  const expected = Deno.env.get("SUPPORT_SHARED_SECRET") ?? "";
  if (!expected || !given) return false;

  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* --------------------------------------------------------------------------
   SECTION: What the model is told
   Short. It gets who it is, what the company does, what it can see, and the
   one decision it has to make. Nothing else.
   -------------------------------------------------------------------------- */

type Source = { name: string; description: string | null; content: string[] };

function buildSystem(
  companyName: string,
  whatWeDo: string | null,
  sources: Source[],
  routeLabels: string[],
  openQuestions: string[],
) {
  const lines: string[] = [];

  lines.push(`You are the support assistant for ${companyName}.`);
  lines.push(
    "You answer people who contact them from outside: customers, guests, members, whoever gets in touch.",
  );
  if (whatWeDo) lines.push(`\nWhat ${companyName} does: ${whatWeDo}`);

  lines.push(
    "\nBelow is what " + companyName + " has published for people outside the company. " +
      "It is everything you know. You cannot look anything up, open a link, or reach any system.",
  );
  lines.push(
    "\nAnswer from it. Be short, warm and plain, the way a good person on a support desk answers. " +
      "Do not mention documents, sources, or how you work.",
  );
  lines.push(
    "\nIf the answer is not there, or it needs somebody who can act on this person's account or money, " +
      "hand it to a person. Handing over is the right answer, not a failure. Never guess.",
  );

  if (routeLabels.length) {
    lines.push(`\nWhen you hand over, say who it should reach: ${routeLabels.join(", ")}.`);
  }

  if (openQuestions.length) {
    lines.push(
      "\nThese questions from this person are already with a colleague. " +
        "If they ask again, tell them it is still with somebody, and do not hand it over a second time:\n" +
        openQuestions.map((q) => `- ${q}`).join("\n"),
    );
  }

  lines.push("\n----- PUBLISHED MATERIAL -----");
  if (!sources.length) {
    lines.push("(nothing published yet, so hand every question to a person)");
  } else {
    for (const source of sources) {
      lines.push(`\n## ${source.name}`);
      if (source.description) lines.push(source.description);
      lines.push(source.content.join("\n"));
    }
  }

  return lines.join("\n");
}

/* One tool, forced. Two fields decide everything: what to say, and whether
   this one is beyond it. A forced tool is how the answer comes back in a
   shape the code can act on without parsing prose for intent. */
const REPLY_TOOL: Anthropic.Tool = {
  name: "reply",
  description: "Reply to the person who messaged.",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description:
          "What to say. Leave empty only when you have nothing at all to answer and are handing over.",
      },
      needs_person: {
        type: "boolean",
        description: "True when this question needs a human colleague.",
      },
      question: {
        type: "string",
        description: "When handing over, the question in one line, for the colleague.",
      },
      route: {
        type: "string",
        description: "When handing over, which of the offered names it should reach.",
      },
    },
    required: ["text", "needs_person"],
  },
};

/* --------------------------------------------------------------------------
   SECTION: Telling a colleague
   Plain email, because it reaches somebody who has not installed anything.
   A failure here never fails the customer's reply: they have been told a
   person is coming, and the escalation row is already written.
   -------------------------------------------------------------------------- */

async function notify(
  to: string,
  companyName: string,
  who: string,
  question: string,
  conversation: string,
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("RESEND_API_KEY is not set, escalation email skipped");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "StellaXafe <support@stellaxafe.com>",
      to: [to],
      subject: `${companyName}: a question needs you`,
      text:
        `${who} asked something the assistant could not answer.\n\n` +
        `THE QUESTION\n${question}\n\n` +
        `THE CONVERSATION SO FAR\n${conversation}\n\n` +
        `Reply where you normally reply. The assistant stays out of the way once you do.`,
    }),
  });

  if (!response.ok) {
    console.error("resend rejected the escalation", response.status, await response.text());
    return false;
  }
  return true;
}

/* --------------------------------------------------------------------------
   SECTION: The handler
   -------------------------------------------------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "POST only" }, 405);

  if (!secretMatches(req.headers.get("x-support-secret"))) {
    return json({ ok: false, reason: "no" }, 401);
  }

  /* The door. /support-ask is the customer, /support-ask/support is a
     colleague. Anything else is a typo in the caller and must not be
     guessed at. */
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const isSupportDoor = path.endsWith("/support");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "bad body" }, 400);
  }

  const companyRef = String(body.company ?? "").trim();
  const channel = String(body.channel ?? "whatsapp").trim();
  const customerRef = String(body.from ?? "").trim();
  const customerName = String(body.name ?? "").trim() || null;
  const text = String(body.message ?? "").trim();
  const externalId = String(body.externalId ?? "").trim() || null;
  const images = Array.isArray(body.images) ? body.images : [];

  if (!companyRef || !customerRef || (!text && !images.length)) {
    return json({ ok: false, reason: "company, from and message are required" }, 400);
  }
  if (!["whatsapp", "web", "email"].includes(channel)) {
    return json({ ok: false, reason: "unknown channel" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* ------------------------------------------------------------------
     Which company answers. A slug or an id, because the caller is Amara's
     webhook and a readable slug in their config is easier to get right
     than a uuid.
     ------------------------------------------------------------------ */

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyRef);
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, what_we_do, is_exempt, budget_cents_remaining")
    .eq(isUuid ? "id" : "slug", companyRef)
    .maybeSingle();

  if (companyError || !company) {
    console.error("unknown company for support", companyRef, companyError);
    return json({ ok: false, reason: "unknown company" }, 404);
  }

  /* ------------------------------------------------------------------
     The thread, and the message going into it.
     ------------------------------------------------------------------ */

  const { data: threadId, error: threadError } = await admin.rpc("support_thread_upsert", {
    p_company_id: company.id,
    p_channel: channel,
    p_customer_ref: customerRef,
    p_customer_name: customerName,
  });

  if (threadError || !threadId) {
    console.error("could not open thread", threadError);
    return json({ ok: false, reason: "could not open the conversation" }, 500);
  }

  const { data: written, error: writeError } = await admin.rpc("support_message_add", {
    p_thread_id: threadId,
    p_company_id: company.id,
    p_author_role: isSupportDoor ? "support" : "customer",
    p_body: text || "(sent an image)",
    p_external_id: externalId,
  });

  if (writeError) {
    console.error("could not record message", writeError);
    return json({ ok: false, reason: "could not record that" }, 500);
  }

  /* Meta redelivers until it gets a 200. A repeat is recorded once and
     answered never, or the customer gets the same reply three times. */
  const isNew = Array.isArray(written) ? written[0]?.is_new !== false : true;
  if (!isNew) {
    return json({ ok: true, threadId, reply: null, duplicate: true });
  }

  /* A colleague speaking is the whole point of the second door. It starts
     the quiet window and nothing else happens. The assistant does not
     comment on a human's message. */
  if (isSupportDoor) {
    return json({ ok: true, threadId, reply: null, held: true });
  }

  /* ------------------------------------------------------------------
     Is a person already in this conversation? Derived from when support
     last spoke, so it lapses on its own and nobody has to hand the
     conversation back.
     ------------------------------------------------------------------ */

  const { data: stateRows } = await admin.rpc("support_state", { p_thread_id: threadId });
  const state = Array.isArray(stateRows) ? stateRows[0] : stateRows;
  const openQuestions: string[] = state?.open_questions ?? [];

  if (state?.support_active) {
    return json({ ok: true, threadId, reply: null, held: true });
  }

  /* Budget. Checked before spending, same rule as the staff side. A silent
     stop would be worse than saying nothing, so the caller is told. */
  const exempt = company.is_exempt === true;
  if (!exempt && Number(company.budget_cents_remaining ?? 0) <= 0) {
    return json({ ok: true, threadId, reply: null, out_of_budget: true });
  }

  /* ------------------------------------------------------------------
     What it is allowed to know.
     ------------------------------------------------------------------ */

  const { data: knowledge, error: knowledgeError } = await admin.rpc("customer_knowledge", {
    p_company_id: company.id,
  });

  if (knowledgeError) {
    console.error("could not read published material", knowledgeError);
    return json({ ok: false, reason: "could not read the material" }, 500);
  }

  const sources: Source[] = [];
  let budget = MAX_SOURCE_CHARS;
  for (const row of knowledge ?? []) {
    if (budget <= 0) break;
    const slice = String(row.content ?? "").slice(0, budget);
    budget -= slice.length;

    const last = sources[sources.length - 1];
    if (last && last.name === row.source_name) {
      last.content.push(slice);
    } else {
      sources.push({
        name: String(row.source_name ?? "Untitled"),
        description: row.source_description ?? null,
        content: [slice],
      });
    }
  }

  const { data: routeLabels } = await admin.rpc("support_route_labels", {
    p_company_id: company.id,
  });

  /* ------------------------------------------------------------------
     The conversation so far. Read newest first with a limit, then turned
     back the right way round, so a long thread does not have to be pulled
     out of the database in full to show the last twenty lines.
     ------------------------------------------------------------------ */

  const { data: recent } = await admin
    .from("support_messages")
    .select("author_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const history = (recent ?? []).slice().reverse();

  const messages: Anthropic.MessageParam[] = [];
  for (const row of history) {
    /* A colleague's message and the assistant's own both come back as the
       assistant, because to the customer they are one voice. */
    const role = row.author_role === "customer" ? "user" : "assistant";
    const previous = messages[messages.length - 1];
    if (previous && previous.role === role) {
      previous.content = `${previous.content}\n${row.body}`;
    } else {
      messages.push({ role, content: String(row.body ?? "") });
    }
  }

  /* An image the person sent, attached to their latest turn. Haiku reads
     pictures, which is the difference between "send me the receipt" and a
     customer typing out a receipt. It is read in this conversation and
     never stored as company knowledge. */
  if (images.length) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    for (const image of images.slice(0, 3)) {
      const mediaType = String((image as Record<string, unknown>).media_type ?? "");
      const data = String((image as Record<string, unknown>).data ?? "");
      if (!data || !mediaType.startsWith("image/")) continue;
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType as never, data },
      });
    }
    if (blocks.length) {
      if (text) blocks.push({ type: "text", text });
      const last = messages[messages.length - 1];
      if (last && last.role === "user") last.content = blocks;
      else messages.push({ role: "user", content: blocks });
    }
  }

  if (!messages.length) messages.push({ role: "user", content: text || "(sent an image)" });
  if (messages[0].role !== "user") messages.unshift({ role: "user", content: "Hello" });

  /* ------------------------------------------------------------------
     Ask.

     The system prompt is cached. It is the same for every customer of this
     company and changes only when the admin publishes something, so the
     second message onwards reads it at about a tenth of the price. The
     conversation comes after it, because a cache is a prefix match and
     anything that varies has to sit behind everything that does not.
     ------------------------------------------------------------------ */

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  let reply: string | null = null;
  let needsPerson = false;
  let question = text;
  let route: string | null = null;
  let usage: Anthropic.Usage | null = null;

  try {
    const result = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: [
        {
          type: "text",
          text: buildSystem(
            company.name,
            company.what_we_do,
            sources,
            routeLabels ?? [],
            openQuestions,
          ),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [REPLY_TOOL],
      tool_choice: { type: "tool", name: "reply" },
      messages,
    });

    usage = result.usage;
    const call = result.content.find((block) => block.type === "tool_use");
    const input = (call?.type === "tool_use" ? call.input : {}) as Record<string, unknown>;

    reply = String(input.text ?? "").trim() || null;
    needsPerson = input.needs_person === true;
    question = String(input.question ?? "").trim() || text;
    route = String(input.route ?? "").trim() || null;
  } catch (err) {
    console.error("haiku call failed", err);
    return json({ ok: false, reason: "could not answer" }, 502);
  }

  /* ------------------------------------------------------------------
     Hand over, if it asked to.

     The record is written first and the email second. An email that fails
     is a colleague who has not been told yet, and notified_at being null is
     exactly how anything later finds them. A question that was never
     recorded is gone.
     ------------------------------------------------------------------ */

  if (needsPerson) {
    const alreadyOpen = openQuestions.some(
      (q) => q.trim().toLowerCase() === question.trim().toLowerCase(),
    );

    if (!alreadyOpen) {
      const { data: escRows, error: escError } = await admin.rpc("support_escalate", {
        p_thread_id: threadId,
        p_company_id: company.id,
        p_question: question,
        p_route_label: route,
      });

      const escalation = Array.isArray(escRows) ? escRows[0] : escRows;
      if (escError || !escalation) {
        console.error("could not record the escalation", escError);
      } else if (escalation.route_email) {
        const who = customerName ? `${customerName} (${customerRef})` : customerRef;
        const transcript = history
          .map((row) => `${row.author_role}: ${row.body}`)
          .join("\n");

        const sent = await notify(
          escalation.route_email,
          company.name,
          who,
          question,
          transcript,
        );
        if (sent) {
          await admin.rpc("support_escalation_notified", {
            p_escalation_id: escalation.escalation_id,
          });
        }
      } else {
        console.error("no route configured for company, nobody was emailed", company.id);
      }
    }

    reply = reply ? `${reply}\n\n${HANDOVER_LINE}` : HANDOVER_LINE;
  }

  if (!reply) reply = HANDOVER_LINE;

  await admin.rpc("support_message_add", {
    p_thread_id: threadId,
    p_company_id: company.id,
    p_author_role: "ai",
    p_body: reply,
    p_external_id: null,
  });

  /* ------------------------------------------------------------------
     Meter it. A cache read costs about a tenth and a cache write a little
     over full price, so counting either at face value would take the wrong
     amount off a real budget.
     ------------------------------------------------------------------ */

  if (!exempt && usage) {
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const fresh = usage.input_tokens ?? 0;
    const out = usage.output_tokens ?? 0;

    const inputTokens = fresh + cacheWrite * 1.25 + cacheRead * 0.1;
    const cents = Math.ceil(
      ((inputTokens / 1_000_000) * PRICE.input + (out / 1_000_000) * PRICE.output) * 100,
    );

    console.log(
      `support usage fresh=${fresh} cacheWrite=${cacheWrite} cacheRead=${cacheRead} out=${out} cents=${cents}`,
    );

    if (cents > 0) {
      const { error: spendError } = await admin.rpc("company_spend", {
        p_company_id: company.id,
        p_cents: cents,
      });
      if (spendError) console.error("could not record support spend", spendError);
    }
  }

  return json({ ok: true, threadId, reply, escalated: needsPerson });
});
