/* ==========================================================================
   ASSISTANT

   The brain. Every Claude call in the product goes through here and only
   here.

   WHY THIS IS A SERVER FUNCTION AND NOT A FETCH IN THE BROWSER
   ------------------------------------------------------------
   The API key. A VITE_ variable is inlined into the JavaScript bundle at
   build time, which means anyone who opens dev tools can read it and spend
   the account's money. There is no clever way around that. The key lives
   in Supabase's secret store, the browser never sees it, and the browser
   cannot ask for a model it has not been granted.

   That last part is the whole point. This function is where three rules
   are actually enforced rather than merely displayed:

     1. WHO      the caller must be a signed in staff member of a real
                 company. verify_jwt is ON here, unlike the setup
                 functions, because by now they do have an account.
     2. WHICH    a staff member cannot use a model above the ceiling their
                 admin set for them, no matter what the browser asks for.
     3. HOW MUCH the company's remaining budget is checked before the call
                 and decremented by what the call actually cost after it.

   A browser that lies about any of the three gets nowhere, because none of
   the three are read from the request body.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

/* --------------------------------------------------------------------------
   MODEL ROUTING
   The interview is conversation, so it runs cheap. Anything that reads
   company material or produces real work runs on a capable model. The
   ladder exists so a ceiling can be compared as a number rather than a
   pile of string comparisons.
   -------------------------------------------------------------------------- */

const LADDER = ["haiku-4-5", "sonnet-5", "opus-5", "fable-5"] as const;
type Tier = (typeof LADDER)[number];

const MODEL_ID: Record<Tier, string> = {
  "haiku-4-5": "claude-haiku-4-5",
  "sonnet-5": "claude-sonnet-5",
  "opus-5": "claude-opus-5",
  "fable-5": "claude-fable-5",
};

/* Dollars per million tokens. Used to turn real usage into a real number
   of cents to take off the company's budget. Keep in step with
   src/shared/config.js, these two are the same table twice. */
const PRICE: Record<Tier, { input: number; output: number }> = {
  "haiku-4-5": { input: 1, output: 5 },
  "sonnet-5": { input: 2, output: 10 },
  "opus-5": { input: 5, output: 25 },
  "fable-5": { input: 10, output: 50 },
};

/* What each stage of the flow wants, before the staff member's ceiling is
   applied. The ceiling can only ever pull these down, never push them up. */
const STAGE_TIER: Record<string, Tier> = {
  interview: "haiku-4-5",
  analyse: "sonnet-5",
  generate: "sonnet-5",
};

function tierIndex(tier: string) {
  const i = LADDER.indexOf(tier as Tier);
  return i === -1 ? 0 : i;
}

/* The heart of rule 2. Whatever the stage wants, capped by what this
   person is allowed. Ask for Opus on a Sonnet ceiling and you get Sonnet. */
function resolveTier(stage: string, ceiling: string | null): Tier {
  const wanted = STAGE_TIER[stage] ?? "haiku-4-5";
  const cap = ceiling ?? "sonnet-5";
  return LADDER[Math.min(tierIndex(wanted), tierIndex(cap))];
}

function centsFor(tier: Tier, inputTokens: number, outputTokens: number) {
  const { input, output } = PRICE[tier];
  const dollars = (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
  return Math.ceil(dollars * 100);
}

/* --------------------------------------------------------------------------
   THE COMPANY'S VOICE
   This is what makes the assistant sound like it works there rather than
   like a general chatbot. It is built from the admin's own answers, which
   is exactly what that section of the product is for: not a document
   store, an identity.
   -------------------------------------------------------------------------- */

/* The part that never changes, for any stage. Kept first and kept stable
   because it is the cached prefix: anything varying goes after it. */
function buildBasePrompt(
  company: Record<string, unknown>,
  staffName: string,
  sources: { name: string; description: string }[],
) {
  const lines = [
    `You are the private AI assistant for ${company.name}, working for their staff.`,
    `You are talking to ${staffName}.`,
    "",
    `What ${company.name} does: ${company.what_we_do}`,
    `Industry: ${company.industry}`,
    "",
    "HOW YOU WRITE",
    "Conversational by default. Short, simple sentences, plain language, no jargon,",
    "no em dashes. Write the way a sharp colleague talks, not the way a manual reads.",
    "",
    "That is a starting point, not a rule. If this person writes formally, match them.",
    "If the company's own material uses longer sentences, professional terms, or a",
    "particular house style, match that instead. Their voice beats the default every",
    "time you can actually see what their voice is. When you genuinely cannot tell and",
    "it matters, ask which they want rather than guessing.",
    "",
    "WHAT YOU MAY STATE AS FACT",
    "Anything specific to this company, a number, a client name, a policy, a date, a",
    "product detail, must come from the sources below or from what this person tells",
    "you. If you do not have it, you never invent it and you never approximate it.",
    "",
    "General craft is different and you should use it freely: how a good deck is",
    "structured, how a report reads, what makes copy land. That craft is why the output",
    "is good. The rule above is about facts, not about skill.",
    "",
    "YOU CANNOT GO AND LOOK",
    "You have no search, no browsing, no access to the internet or to their drive. The",
    "only things you can read are the company sources listed below and whatever this",
    "person puts in front of you. If they hand you a link, you may work from that link",
    "and nothing else. Never imply you looked something up.",
    "",
    "WHEN SOMETHING IS MISSING, BE USEFUL ABOUT IT",
    "Refusing is not enough. Say what is missing, then give a real route to it. Pick",
    "whichever fits:",
    "  - Point at a person. If this is the kind of thing a colleague holds, say which",
    "    role to ask and what exactly to ask them for.",
    "  - Point at a source. Name where to look, the search terms to use, and what to",
    "    bring back. Tell them what a useful screenshot or file would contain.",
    "  - Ask for a link. If outside material would answer it, say so and ask them to",
    "    paste the link or the text. You work from what they hand over, never from",
    "    memory of the wider world dressed up as their fact.",
    "",
    "VERIFY BEFORE IT COUNTS",
    "If you propose a number, a statistic, or a factual claim that did not come from a",
    "source or from this person, mark it clearly and ask them to confirm it before it",
    "goes into anything. Nothing unverified reaches a draft on your say so alone.",
  ];

  if (sources.length) {
    lines.push(
      "",
      "COMPANY SOURCES",
      "The company's approved material. Name, then what it holds. This person may not",
      "know these exist, so it is your job to work out which are relevant, not theirs.",
      ...sources.map((s) => `- ${s.name}: ${s.description}`),
    );
  } else {
    lines.push(
      "",
      "COMPANY SOURCES",
      "None have been added yet. Say so plainly if asked for a company specific fact,",
      "and work from what this person gives you.",
    );
  }

  return lines.join("\n");
}

/* What this particular turn is for. Appended after the cached base so the
   prefix above stays byte identical across stages. */
const STAGE_PROMPT: Record<string, string> = {
  interview: [
    "",
    "RIGHT NOW: INTERVIEW",
    "Work out what they actually need. One question at a time, like a colleague would.",
    "Do not produce the work yet.",
    "",
    "Keep it to three to five questions in total, and fewer if their first message",
    "already answered some of them. This is a short conversation, not an interrogation.",
    "Spend those questions on what would change the shape of the work: what it is for,",
    "who reads it, and the one or two decisions only they can make. Never ask something",
    "they already told you, and never ask something you could reasonably decide yourself.",
    "",
    "Do not try to close every gap here. A stronger model reads the company material",
    "after you and will come back for anything genuinely missing, so stopping early",
    "costs nothing and asking too much costs their patience.",
    "",
    "If material would help, ask them to name a file or paste what matters. Company",
    "sources listed above are yours to choose from without asking.",
    "",
    "Once you have enough to hand over, stop asking and end your message with",
    "INTERVIEW_COMPLETE on its own final line. Do not explain the marker, do not mention",
    "it, do not use it while a real question is still open.",
  ].join("\n"),

  analyse: [
    "",
    "RIGHT NOW: CHECK, THEN READ BACK",
    "The interview is done and you are the stronger model. Read the conversation, then",
    "read the company sources listed above and work out which ones this piece of work",
    "actually needs. They may not know those sources exist, so choosing is your job.",
    "",
    "You now do one of two things, and only one.",
    "",
    "1. SOMETHING REAL IS MISSING",
    "   If you cannot produce good work without something only they can supply, ask for",
    "   it now rather than guessing. Ask at most two questions, together, in one short",
    "   message. Give the route to each as described above: who holds it, or where to",
    "   look and what to bring back, or a link to paste. Do not end with the marker.",
    "   Only do this for something that would change the work. A detail you can sensibly",
    "   decide yourself is not missing, it is yours to decide.",
    "",
    "2. YOU HAVE ENOUGH",
    "   Say back what you understood, so they can catch a misunderstanding before it",
    "   costs them a draft. Short and easy to scan. Cover only:",
    "     - what you are making, and who it is for",
    "     - the few decisions that shape it",
    "     - which company sources you will draw on, by name",
    "     - anything you are assuming that they should correct if it is wrong",
    "   No preamble, no replaying the conversation back at them, no filler. Do not",
    "   invent a gap to look thorough. Then end your message with READBACK_COMPLETE on",
    "   its own final line. Do not explain the marker and do not mention it.",
  ].join("\n"),

  generate: [
    "",
    "RIGHT NOW: WRITE IT",
    "They confirmed the read back. Produce the finished piece in full.",
    "",
    "Output the document and nothing else. No preamble, no notes about what you did, no",
    "closing commentary. Markdown headings and lists. Anything unverified must still be",
    "marked as needing their confirmation, even here.",
  ].join("\n"),
};

/* -------------------------------------------------------------------------- */

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Method not allowed." }, 405);

  /* ----------------------------------------------------------------------
     RULE 1: WHO
     The caller's own token, not anything they typed. This client acts as
     them, so row level security applies to every read below and they
     physically cannot see another company's rows.
     ---------------------------------------------------------------------- */

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) {
    return json({ ok: false, reason: "Sign in to keep going." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const stage = String(body?.stage ?? "interview");
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages?.length) return json({ ok: false, reason: "Nothing to send." }, 400);

  /* Who they are and what they are allowed. Read from the database under
     their own identity, never from the request. */
  const { data: staff, error: staffError } = await asUser
    .from("staff_effective_limits")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    console.error("could not load staff row", staffError);
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }

  const { data: company, error: companyError } = await asUser
    .from("companies")
    .select("*")
    .eq("id", staff.company_id)
    .maybeSingle();

  if (companyError || !company) {
    console.error("could not load company", companyError);
    return json({ ok: false, reason: "Could not load your company." }, 403);
  }

  /* ----------------------------------------------------------------------
     RULE 3: HOW MUCH, checked before spending anything
     Shown to people as outputs remaining. Never as cents, never as tokens.
     ---------------------------------------------------------------------- */

  const exempt = company.is_exempt === true;
  const remaining = Number(company.budget_cents_remaining ?? 0);

  if (!exempt && remaining <= 0) {
    return json({
      ok: false,
      reason: "out_of_budget",
      message:
        "This workspace has used up its included outputs. This was a temporary build, " +
        "talk to StellaXafe about running it inside your own systems.",
    }, 402);
  }

  /* ----------------------------------------------------------------------
     RULE 2: WHICH MODEL
     ---------------------------------------------------------------------- */

  const tier = resolveTier(stage, staff.model_ceiling ?? null);

  /* The source catalogue: names and one line descriptions only, never the
     contents. The whole catalogue is small by design, because the admin
     section holds a company's identity rather than its filing cabinet. */
  const { data: sources } = await asUser
    .from("knowledge_sources")
    .select("name, description, status")
    .eq("company_id", staff.company_id);

  /* Only sources that finished processing. Offering the model something
     still being read would have it confidently ask for a source that
     cannot answer, which reads to the staff member as the assistant
     making things up. */
  const readySources = (sources ?? []).filter((s) => s.status === "ready");

  /* Base first and unchanging, stage instruction after. That order is
     what lets the base be cached: the cache is a prefix match, so
     anything that varies by stage has to come last or it would break the
     prefix on every switch. */
  const base = buildBasePrompt(company, staff.name ?? "a staff member", readySources);
  const stageInstruction = STAGE_PROMPT[stage] ?? STAGE_PROMPT.interview;

  /* ----------------------------------------------------------------------
     THE CALL
     Streamed, so a long generation cannot die on an HTTP timeout and so
     the chat can show words arriving rather than a spinner.
     ---------------------------------------------------------------------- */

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  /* Haiku 4.5 predates adaptive thinking and effort, and rejects both.
     Sonnet 5 and above want them. Same request either way, different
     knobs, so build the extras rather than branching the whole call. */
  const thinkingExtras =
    tier === "haiku-4-5"
      ? {}
      : { thinking: { type: "adaptive" as const }, output_config: { effort: "high" as const } };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      /* Tell the client which model is actually running before any text
         arrives. The tier ladder is a real feature of the product, not a
         detail to hide, and the staff member sees it as a plain label. */
      send("meta", { tier, stage });

      try {
        /* The system prompt is byte for byte identical on every turn for a
           given company, which makes it the one thing worth caching. Marked
           cacheable, it is charged at roughly a tenth on every turn after
           the first, and an interview is many turns over the same prompt.

           Caching is a prefix match, so this only holds while nothing above
           it changes. Nothing is above it here, and the prompt itself is
           built from company data that changes rarely, which is exactly the
           shape caching rewards. A short prompt silently will not cache,
           there is a minimum length, so a company with no sources yet gets
           no benefit and no harm either. */
        const run = anthropic.messages.stream({
          model: MODEL_ID[tier],
          max_tokens: 8000,
          system: [
            { type: "text", text: base, cache_control: { type: "ephemeral" } },
            { type: "text", text: stageInstruction },
          ],
          messages,
          ...thinkingExtras,
        });

        run.on("text", (chunk: string) => send("text", { text: chunk }));

        const final = await run.finalMessage();

        /* ------------------------------------------------------------
           METER IT
           What the call actually cost, not an estimate. Service role,
           because a staff member must not be able to write to their own
           company's budget, only spend against it.
           ------------------------------------------------------------ */
        /* Cached input is billed at about a tenth, and cache writes at a
           little over full price. Counting a cache read as full price
           would take roughly ten times too much off the company's budget,
           which on a five dollar account is the difference between a
           demo finishing and a demo stopping mid sentence. */
        const cacheRead = final.usage?.cache_read_input_tokens ?? 0;
        const cacheWrite = final.usage?.cache_creation_input_tokens ?? 0;
        const freshInput = final.usage?.input_tokens ?? 0;
        const outputTokens = final.usage?.output_tokens ?? 0;

        const inputTokens = freshInput + cacheWrite * 1.25 + cacheRead * 0.1;
        const cents = centsFor(tier, inputTokens, outputTokens);

        /* If this stays at zero over a conversation, the cache is not
           holding and something above the prompt is changing between
           turns. Cheap to log, and the only way to notice. */
        console.log(
          `usage tier=${tier} fresh=${freshInput} cacheWrite=${cacheWrite} cacheRead=${cacheRead} out=${outputTokens} cents=${cents}`,
        );

        if (!exempt && cents > 0) {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          const { error: spendError } = await admin
            .from("companies")
            .update({ budget_cents_remaining: Math.max(0, remaining - cents) })
            .eq("id", staff.company_id);

          if (spendError) {
            /* The work was done and the user has it. Losing the meter
               reading is a bookkeeping problem, not a reason to throw
               away a finished answer. */
            console.error("could not record spend for company", staff.company_id, spendError);
          }
        }

        send("done", { stopReason: final.stop_reason });
      } catch (err) {
        console.error("anthropic call failed", err);
        send("error", { reason: "The assistant could not finish that. Try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
