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

/* ONE MODEL FOR THE STAFF SIDE, AND IT IS SONNET
   There used to be a picker here: cheap for the interview, capable for the
   work, capped by the ceiling the admin set for each person.

   It is gone, deliberately. A model chosen for you is a way for the product
   to be quietly worse than you expected, on a turn you cannot see the
   reason for, with no screen anywhere that would tell you. One good model
   everywhere is predictable, and predictable is the thing a person trusts.

   The ladder, the price table and the metering all stay. It is only the
   automatic selection that stops. The ceiling column stays on the row too,
   unread for now, because the enterprise version of this is routing that
   asks: the assistant says a step needs more than Sonnet, and the person
   allows it or does not. See SUPPORT.md. */
const STAFF_TIER: Tier = "sonnet-5";

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
    "Conversational by default. Short, simple sentences, plain language, no jargon.",
    "Write the way a sharp colleague talks, not the way a manual reads.",
    "",
    "Never use an em dash or an en dash. Not one, anywhere, in a chat message or in a",
    "finished document. Where you would reach for one, use a full stop and start a new",
    "sentence, or a comma, or a colon. A hyphen inside a word that genuinely needs one",
    "is fine. This is not a preference to weigh against the house style below. It holds",
    "even when the company's own material is full of them.",
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
    "WHAT HAPPENS TO WHAT YOU WRITE",
    "The app turns your finished document into a PDF and a Word file, and the person",
    "downloads it with a button under it. You do not need to do anything for that to",
    "happen, and you must never do it by hand: no writing out HTML for them to copy,",
    "no telling them to paste something into a blank file and save it, no explaining",
    "how to export a PDF. That is the app's job and it already works. Write the",
    "document in Markdown and stop.",
    "",
    "The app also decides which model runs each part of this, and moves the work up to",
    "a stronger one when the time comes. You do not control that and you must never",
    "tell somebody you cannot switch models or that they should start again elsewhere.",
    "From where they sit there is one assistant, and it is you.",
    "",
    "YOUR SOURCES OF TRUTH",
    "There are exactly four ways a fact about the world reaches your draft, and this",
    "person opens every one of them. Nothing arrives any other way.",
    "  1. The company sources listed below, which their admin approved.",
    "  2. What they type to you, or a file they hand over in this conversation.",
    "  3. Material they went and checked themselves, then pasted back to you.",
    "  4. Nothing. If none of the above covers it, it does not go in.",
    "",
    "YOU CANNOT GO AND LOOK",
    "You have no search, no browsing, no way to open a link, and no access to their",
    "drive. This is not a rule you are following, it is what you are. So:",
    "  - Never say or imply you looked something up, checked a site, or found a source.",
    "  - If they paste a link, tell them plainly that you cannot open links, and ask for",
    "    the part that matters as text or as a file. Never describe what is at a URL.",
    "  - Never present something you happen to know about the wider world as though it",
    "    came from their material. If it is not from the four routes above, it is not a",
    "    fact you may use.",
    "",
    "WHEN SOMETHING IS MISSING, BE USEFUL ABOUT IT",
    "Refusing is not enough, and neither is guessing. Say what is missing, then give a",
    "real route to it. Pick whichever fits:",
    "  - Point at a person. If a colleague holds this, say which role to ask and what",
    "    exactly to ask them for.",
    "  - Point them at where to look. Name the actual platform or body worth checking,",
    "    the exact search terms to try, and what a useful answer looks like when they",
    "    find it: a figure with its date, a page, a screenshot of the part that shows it.",
    "    You may give a web address if you know one, but say in the same breath that it",
    "    is from memory and may have moved, and never describe what is on the page. If",
    "    you are not sure of an address, name the platform and the search terms instead",
    "    of guessing at a link. A wrong link sends someone on a walk for nothing.",
    "    If they do not know their way around that place, walk them through it step by",
    "    step and keep going until they have it. You are handing them a route, not",
    "    taking it yourself. They go, they judge whether it is sound, and they bring it",
    "    back. Only then does it exist for you.",
    "  - Ask for the material itself. Text pasted in, or a file, or a company source",
    "    their admin can add. That is what turns something outside into something usable.",
    "",
    "VERIFY BEFORE IT COUNTS",
    "If you propose a number, a statistic, or a factual claim that did not come from a",
    "source or from this person, mark it clearly and ask them to confirm it before it",
    "goes into anything. Nothing unverified reaches a draft on your say so alone.",
    "",
    "CREDITING OUTSIDE MATERIAL",
    "If any of the work leans on something from outside the company, material they",
    "brought back and handed you, ask before writing whether they want it referenced,",
    "and in which style. Name the common ones so they can just pick: APA, Harvard, MLA,",
    "Chicago, or plain links. Ask once, as part of your questions, not as an extra",
    "round. If nothing came from outside, do not raise it at all.",
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

/* How much room each stage gets to answer in.

   This is the line that stops the cheap conversation writing the document.
   The interview used to be told not to produce the work and given eight
   thousand tokens to disobey in, and when somebody said "just build it" it
   wrote the whole one pager on the spot: no read back, no confirmation, no
   file to download, because the app never learned the interview had ended.

   A question is two hundred tokens. A one pager is fifteen hundred. Seven
   hundred is generous for the first and impossible for the second, so the
   interview no longer has the room to skip the flow even if it wants to.
   The analysis gets more because thinking tokens are counted here too, and
   only the writing stage gets everything.

   Same idea as having no search. Not a rule it may talk itself out of,
   a ceiling it cannot cross. */
const MAX_OUTPUT: Record<string, number> = {
  interview: 700,
  analyse: 4000,
  generate: 8000,
};

/* The interview gets five questions. The prompt asks for three to five and
   the app enforces the ceiling, but a model that knows its last turn has
   arrived closes cleanly instead of being cut off mid question. */
const MAX_INTERVIEW_TURNS = 5;

/* What this particular turn is for. Appended after the cached base so the
   prefix above stays byte identical across stages. */
const STAGE_PROMPT: Record<string, string> = {
  interview: [
    "",
    "RIGHT NOW: INTERVIEW",
    "Work out what they actually need. One question at a time, like a colleague would.",
    "",
    "YOU DO NOT WRITE THE WORK IN THIS STAGE. NOT A DRAFT, NOT AN OUTLINE, NOT A",
    "FIRST SECTION, NOT EVEN IF THEY ASK YOU TO RIGHT NOW. Writing it is a separate",
    "stage that runs on a stronger model, after a check you cannot do and a read back",
    "they have to confirm. If you write it here they never see the read back, they",
    "never get a file to download, and the work never reaches the model that can read",
    "the company sources. Handing off IS how you build it for them.",
    "",
    "Keep it to three to five questions in total, and fewer if their first message",
    "already answered some of them. This is a short conversation, not an interrogation.",
    "Spend those questions on what would change the shape of the work: what it is for,",
    "who reads it, and the one or two decisions only they can make. Never ask something",
    "they already told you, and never ask something you could reasonably decide yourself.",
    "",
    "If you asked more than one thing and they answered only some of it, do not move",
    "on and do not treat silence as an answer. Name the ones still open and ask again,",
    "once, plainly. If they skip them a second time, that is their answer: let it go",
    "and hand off.",
    "",
    "Do not try to close every gap here. A stronger model reads the company material",
    "after you and comes back for anything genuinely missing, so stopping early costs",
    "nothing and asking too much costs their patience.",
    "",
    "TWO DIFFERENT KINDS OF MATERIAL, AND YOU MUST NOT CONFUSE THEM",
    "",
    "The company sources listed above belong to the company, and this person should",
    "never have to know a single file name in there. If they point you at them in any",
    "words at all, the knowledge base, the admin files, our documents, our brand guide,",
    "the stuff you already have, that is not a request you refuse and it is not a file",
    "name to ask for. You cannot read those contents yourself. The stronger model can,",
    "and it chooses which ones matter. So that is a handoff, immediately.",
    "",
    "Their own material is the other kind: something on their laptop, something only",
    "they have, something they went and checked. That, and only that, is when you ask",
    "them to attach it or paste what matters.",
    "",
    "HOW THIS STAGE ENDS",
    "Three ways, and all three end exactly the same. Say one short line, then",
    "INTERVIEW_COMPLETE on its own final line, and nothing else.",
    "",
    "  1. You have enough to hand over.",
    "  2. They tell you to get on with it. Just build it, do not worry, go ahead, you",
    "     decide, whatever wording they use. Their instruction beats your question",
    "     list. Do not argue, do not ask one more, and above all do not start writing.",
    "     Say you will work with what you have, and hand off.",
    "  3. They point you at the company sources, as described above.",
    "",
    "YOU MAY HAVE BEEN HANDED SOMETHING SPECIFIC",
    "Read back up the conversation first. If a message above already says what is",
    "missing, or the person asked to change something after seeing a read back, that is",
    "your whole job this time. Do not start a fresh interview and do not re-ask what was",
    "already settled. Collect exactly what was asked for, help them get it if they do",
    "not know where to look, and hand off the moment you have it.",
    "",
    "Do not explain the marker, do not mention it, and do not use it while a real",
    "question of yours is still open and they have not waved you on.",
  ].join("\n"),

  analyse: [
    "",
    "RIGHT NOW: CHECK, THEN EITHER ASK OR READ BACK",
    "You are the stronger model. Read the conversation, then read the company sources",
    "listed above and work out which ones this piece of work actually needs. They may",
    "not know those sources exist, so choosing is your job.",
    "",
    "If you have already done this earlier in the same conversation, do not start over.",
    "The sources you picked then still stand. Fold in whatever is new and move on.",
    "",
    "FIRST, CHECK THE THINGS A DOCUMENT CANNOT EXIST WITHOUT",
    "The interview before you is short on purpose and it routinely misses these:",
    "  - whose name goes on this, and their title",
    "  - who it is addressed to, by name where a name matters",
    "  - which company it is for, and which company it is from",
    "  - a date or a deadline, where the document carries one",
    "A missing name is not a detail you may decide yourself. If the company sources",
    "answer it, use them and say which. If nothing answers it, it is missing.",
    "",
    "You now do one of two things, and only one.",
    "",
    "1. SOMETHING IS STILL MISSING",
    "   If you cannot produce good work without something only they can supply, do not",
    "   read anything back yet. A read back that ends in a request is not a read back.",
    "   Say what you still need and why it matters, in a couple of lines. Give the route",
    "   to each thing as described above. Then end your message with NEED_INPUT on its",
    "   own final line.",
    "   Only for something that would change the work. A detail you can sensibly decide",
    "   yourself is not missing, it is yours to decide.",
    "",
    "2. YOU HAVE EVERYTHING",
    "   Say back what you understood, so they can catch a misunderstanding before it",
    "   costs them a draft. This is the moment that proves you understood, so it has to",
    "   be short, exact, and free of padding. Cover only:",
    "     - what you are making, and who it is for",
    "     - the few decisions that shape it",
    "     - which company sources you will draw on, by name",
    "     - anything you are assuming that they should correct if it is wrong",
    "   No preamble, no replaying the conversation, no filler, and no questions. Do not",
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
    "",
    "Every fact in this document comes from the four routes above and nowhere else. If",
    "outside material was brought back and a referencing style was agreed, include the",
    "references in that style. If no style was agreed, do not invent citations.",
  ].join("\n"),
};

/* -------------------------------------------------------------------------- */

/* Five megabytes. Real traffic is nowhere near it: four shrunk screenshots
   and a long conversation together come to well under one. This is not a
   budget, it is a tripwire for a request that did not come from the app at
   all, since the shrinking happens in a browser and a browser is not
   something a server may trust. */
const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

/* Sixty thousand characters of company material, about fifteen thousand
   tokens, roughly thirty pages. Enough to carry a brand guide, a template
   and a company profile at once. It rides on the analysis and the writing
   only, never the interview, so a conversation pays for it twice rather
   than on every question. */
const MAX_SOURCE_CHARS = 60000;

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

Deno.serve(async (req: Request) => {
  /* The preflight. A browser asks before it will send a request carrying
     an Authorization or apikey header, and if this answer is not exactly
     right it refuses to send anything at all, which looks from inside the
     app like the network is down. Echoing back whatever headers it asked
     about means a header added later cannot quietly break it again. */
  if (req.method === "OPTIONS") {
    const asked = req.headers.get("access-control-request-headers");
    return new Response(null, {
      status: 204,
      headers: asked ? { ...CORS, "Access-Control-Allow-Headers": asked } : CORS,
    });
  }
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

  /* The browser shrinks images before sending and caps how many files ride
     on one turn, but the browser is not something this function is allowed
     to trust. A request this large is either a bug or someone poking at it
     directly, and either way the answer is no. */
  const declaredSize = Number(req.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_REQUEST_BYTES) {
    return json({ ok: false, reason: "That is too much to send at once. Fewer files, or smaller ones." }, 413);
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

  const tier = STAFF_TIER;

  /* The catalogue: names and one line descriptions. This is what the
     interview sees, and it is enough to talk about what exists without
     paying to carry any of it. */
  const { data: sources } = await asUser
    .from("knowledge_sources")
    .select("id, name, description, status")
    .eq("company_id", staff.company_id);

  /* Only sources that finished being read. Offering the model something
     still processing would have it confidently name a source that cannot
     answer, which reads to the staff member as the assistant making
     things up. */
  const readySources = (sources ?? []).filter((s) => s.status === "ready");

  /* Base first and unchanging, then contents, then the stage
     instruction. That order is what lets the base be cached: the cache is
     a prefix match, so anything that varies has to come after it. */
  const base = buildBasePrompt(company, staff.name ?? "a staff member", readySources);

  /* On the last question the interview is allowed, tell it so. The app
     moves the work up whether it agrees or not, and a model that knows the
     turn is its last closes cleanly rather than being cut off partway
     through asking something nobody will get to answer. */
  const assistantTurns = messages.filter((m: unknown) =>
    typeof m === "object" && m !== null && (m as { role?: string }).role === "assistant"
  ).length;

  const lastQuestion =
    stage === "interview" && assistantTurns >= MAX_INTERVIEW_TURNS - 1
      ? [
          "",
          "",
          "THIS IS YOUR LAST TURN IN THIS STAGE",
          "You have used the questions this interview gets. Do not ask another one.",
          "Say in one line what you will be working with, then hand off.",
        ].join("\n")
      : "";

  const stageInstruction = (STAGE_PROMPT[stage] ?? STAGE_PROMPT.interview) + lastQuestion;

  /* ----------------------------------------------------------------------
     THE CONTENTS THEMSELVES
     The interview never sees these. It is a conversation about what the
     person wants, and carrying a company's entire brand guide through
     every question would cost real money to answer "who is this for".

     From the analysis onward it does see them, because that is the whole
     promise: the output already knows the company's templates and numbers
     without the staff member supplying any of it. A name and a
     description cannot deliver that. Only the words can.
     ---------------------------------------------------------------------- */

  let sourceContents = "";

  if (stage !== "interview" && readySources.length) {
    const { data: chunks } = await asUser
      .from("knowledge_chunks")
      .select("source_id, content")
      .in("source_id", readySources.map((s) => s.id))
      .order("created_at", { ascending: true });

    if (chunks?.length) {
      const byName = new Map(readySources.map((s) => [s.id, s.name]));
      const parts: string[] = [];
      let budget = MAX_SOURCE_CHARS;

      for (const chunk of chunks) {
        if (budget <= 0) break;
        const slice = String(chunk.content ?? "").slice(0, budget);
        if (!slice.trim()) continue;
        budget -= slice.length;
        parts.push(`--- FROM: ${byName.get(chunk.source_id) ?? "a company source"} ---\n${slice}`);
      }

      if (parts.length) {
        sourceContents = [
          "",
          "WHAT THOSE SOURCES ACTUALLY SAY",
          "The text of the company material listed above. This is theirs, it is",
          "approved, and you may use it as fact and match its voice. Say which source",
          "something came from when it matters. If what you need is not in here, it is",
          "missing, and missing is handled the way the rules above describe.",
          "",
          ...parts,
        ].join("\n");
      }
    }
  }

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
          max_tokens: MAX_OUTPUT[stage] ?? MAX_OUTPUT.generate,
          system: [
            { type: "text", text: base, cache_control: { type: "ephemeral" } },
            ...(sourceContents ? [{ type: "text" as const, text: sourceContents }] : []),
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
