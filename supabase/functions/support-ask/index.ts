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
import { centsExact, clientFor, modelFor, vendorForCompany, type Tier } from "../_shared/brain.ts";

/* --------------------------------------------------------------------------
   SECTION: Constants
   -------------------------------------------------------------------------- */

/* SUPPORT RUNS AT THE CONVERSATIONAL LEVEL, AND NEVER LEAVES IT.

   "Conversational" is the level. The model string below is what currently
   sits behind that level, and it is the only place this function names a
   real model. Anthony, 2026-09-10: "instead of calling it Haiku at the back
   end, you call it Conversational."

   The reason is that the brain is meant to be swappable. A deployment on
   another provider changes this one line and this function's own name for
   what it is doing does not move. See DIRECTION.md, "Which model runs which
   part", and the matching table in assistant/index.ts.

   Support stays at this level on purpose. It answers a customer's question
   from material an admin approved. It does not reason its way anywhere, so
   paying for a model that can is paying for nothing. */
const LEVEL: Tier = "conversational";

/* ⚠️ The model now comes from _shared/brain.ts, which is the ONE place in
   the server that names a real model. Everything the comment above says
   about support staying at this level still holds: the level decides, and
   the brain decides what sits behind it.
   ⚠️ The vendor is resolved inside the request handler below, never at module
   level: one isolate serves several companies at once. */

/* ⚠️ The rate for this level now comes from _shared/brain.ts, which holds
   one rate per vendor per level, so a company moving vendor reprices with
   it. Still not mirrored in the browser bundle: src/shared/config.js used to
   carry a copy so an admin screen could print a rate card, and both the
   vendor names and the token prices have been taken off that screen. */

/* A conversation's worth of history, not a lifetime's. Long enough that
   somebody can say "the second one" and be understood. */
const HISTORY_LIMIT = 20;

/* How much of the company's published material is sent to the model.

   RAISED FROM 40,000 TO 200,000 ON 2026-09-10, and the old number was not
   worked out by anybody. It was a round guess to stop one enormous upload
   making every reply slow. It cost more than it saved: Amara's landing page
   alone is 59,837 characters, so a third of it was thrown away on every
   message, taking their whole partner programme with it, and nothing on any
   screen said so.

   WHAT IT COSTS TO SEND MORE, MEASURED RATHER THAN GUESSED. Every message
   sends the whole thing. There is no memory between messages: the cache is a
   discount, not a store. But the discount is large, so size mostly costs on
   the first message of a burst.

     40,000 chars   first message 1.35c   every one after 0.20c
     200,000 chars  first message 6.35c   every one after 0.60c

   The five minute cache means a real conversation pays the first number once
   and the second number for the rest of it.

   200,000 characters is about 50,000 tokens, which is well inside the range
   where sending everything beats searching for the relevant part. See
   DIRECTION.md. */
const MAX_SOURCE_CHARS = 200000;

/* What the customer is told when their question goes to a person. Fixed
   here rather than written by the model, because it is a promise about how
   the company behaves and a model must not invent one of those.

   Built up over 2026-09-08, one observed gap at a time:

   The offer of another question, because without it the handover was
   correct and the conversation still died on the spot, which reads like a
   desk that has stopped listening.

   Asking for the email moved OUT of here on 2026-09-09. Anthony took the
   earlier version apart and he was right: the escalation email to the
   colleague is sent at this exact moment, so an address given now arrives
   one step too late to be in it. It is asked for at the start of the
   conversation instead, and by the time anything escalates it is already on
   file and travels with the question. */
const HANDOVER_OPEN =
  "Let me get someone from the team to look at this properly. They will " +
  "reply right here.";

/* THE EMAIL IS ASKED FOR HERE, NOT ON THE FIRST MESSAGE. Changed 2026-09-22.

   Anthony: "somebody is just coming for the first time to message. You're
   asking them for their email... the moment it escalates, after escalating,
   within that message of escalation, the model can ask them to drop their
   email."

   He is right and the old shape was backwards. Somebody arrives with a
   question and the first thing the desk does is ask for their address,
   which reads like a form standing between them and an answer. Nobody has
   to hand over an address to ask a question.

   The moment it actually matters is the moment a person is coming, because
   that is the first point where somebody might genuinely need to reach them
   off the thread. So it is asked then, as a by the way, and never before.

   Nothing else had to change for it: the model already hands back an
   address it spots in any message, and it is stored the moment it sees one.
   So a person who drops it three messages later is still on file, and
   support sees it exactly as before. */
const HANDOVER_ASK_EMAIL =
  "You can drop your email as well, just in case they need to reach you " +
  "directly.";

/* Added only when an address is actually on file. No address, no line,
   because promising somebody an inbox we cannot reach is worse than saying
   nothing. */
const HANDOVER_INBOX_LINE =
  "If it is something private they may send it to your inbox instead, so " +
  "keep an eye there as well.";

/* THE LAST PARAGRAPH, ALWAYS, AND ON ITS OWN LINE.

   Anthony: "Anything else I can help with in the meantime is supposed to be
   the last paragraph in that message."

   It used to be glued to the end of the handover sentence, so the message
   read as one long block where a promise, an ask and a question all ran
   together. Three short paragraphs are read. One long one is skimmed. */
const HANDOVER_CLOSE = "Anything else I can help with in the meantime?";

/* ==========================================================================
   TAKING THE APP'S OWN WORDS BACK OUT OF THE MODEL'S REPLY

   THE BUG, seen on WhatsApp 2026-09-22. A customer asked about company
   finances, it handed over, and the answer read:

     Let me get someone to answer that properly. They will reply right here.

     Let me get someone to answer that properly. They will reply right here.
     Anything else I can help with in the meantime? ...

   Said twice, which makes a careful product look careless in the one
   screenshot somebody would put in a demo.

   WHY IT HAPPENS, AND IT IS A LOOP RATHER THAN A TYPO. The whole reply,
   INCLUDING the handover this file appends, is written into the thread by
   support_message_add. That thread is the history handed to the model on
   the next turn. So the model reads its own past message, sees the company
   promise sitting there in what looks like its own voice, learns the
   pattern, and writes it itself next time. Then this file appends it again.

   The prompt now tells it not to, which is the real fix. This is the guard
   underneath, because a prompt is a request and a model will drift back.

   THE SAME APPLIES TO THE CLOSING QUESTION. The prompt asks it to end every
   reply with an offer of more help, and the handover asks that too. On an
   escalation turn that is two of them in three lines.

   CONSERVATIVE ON PURPOSE. It removes only sentences this file itself
   wrote. It never touches an answer the model composed, because a support
   answer with a hole cut in it is worse than one that repeats itself. */
function withoutOurLines(text: string | null): string {
  if (!text) return "";

  /* Each one is matched on its own so a model that reproduces half the
     handover, or reworded the second half, still loses the half it copied.

     THE RETIRED WORDINGS STAY ON THIS LIST, and that is the important part.
     Every conversation already on the database carries the old sentences in
     its history, and that history is what the model reads and copies from.
     Taking a retired line off this list would bring the duplicate straight
     back on any thread that existed before the wording changed. */
  const ours = [
    /* Live, as of 2026-09-22. */
    HANDOVER_OPEN,
    HANDOVER_ASK_EMAIL,
    HANDOVER_INBOX_LINE,
    HANDOVER_CLOSE,
    /* Retired, and still sitting in old threads. */
    "Let me get someone to answer that properly. They will reply right here.",
    "If it is something private they may send it to your email instead, so keep an eye on your inbox as well.",
    EMAIL_INVITE,
  ];

  let out = text;
  for (const line of ours) {
    /* Escaped, because these sentences carry full stops and question marks
       and a bare string in a regular expression would match far too much. */
    const pattern = new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(pattern, "");
  }

  /* Tidy up after the cuts: runs of spaces, a space before punctuation, and
     the blank paragraphs left where a whole sentence used to be. */
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

/* RETIRED 2026-09-22, AND KEPT ON PURPOSE.

   This used to be appended to the first message of every new conversation.
   It is not appended anywhere any more, because asking a stranger for their
   address before answering their question is a form standing in the way.
   The ask moved into the handover. See HANDOVER_ASK_EMAIL.

   The string stays because it is still sitting in the history of every
   conversation that existed before today, and withoutOurLines has to be
   able to recognise it there. Delete this and the model starts repeating it
   back on old threads. */
const EMAIL_INVITE =
  "You may share your email address here, as we may prefer to send any " +
  "sensitive information directly to your inbox.";

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

   IT COMES IN TWO PIECES, AND THE SPLIT IS THE WHOLE POINT
   A cache only works on text that never changes, and it matches from the
   start, so one changed character throws away everything after it. So the
   part that is the same for every customer of this company is built here
   and cached, and the part that differs from one conversation to the next
   is built separately and sent after the cache mark.

   Before this split the list of questions already with a colleague sat
   inside the cached piece. It changes the moment an escalation opens, and
   it is different for every person who writes in, so the published
   material was being re-read from scratch on almost every message and
   every customer had their own copy of the cache instead of sharing one.
   Measured 2026-09-08: two messages 49 seconds apart, both cache misses,
   because an escalation had opened between them.
   -------------------------------------------------------------------------- */

type Source = { name: string; description: string | null; content: string[] };

function buildSystem(
  companyName: string,
  whatWeDo: string | null,
  sources: Source[],
  routeLabels: string[],
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
  /* Two lines, and no more. The material carries the company's own email
     and phone number, so left alone the model offers those as a way out of
     a question it cannot answer. That reads helpful and is not: it pushes
     the person into a second queue where the reply we just promised does
     not exist. A colleague answers in this same conversation, so there is
     nowhere else to send anybody. */
  lines.push(
    "\nNever send them to another email address or phone number to get an answer. " +
      "A colleague replies in this same conversation, so hand over instead.",
  );
  lines.push(
    "\nEnd every reply by asking whether there is anything else you can help with.",
  );
  /* ADDED 2026-09-22, after it was seen saying the handover twice on
     WhatsApp. The model had read its own earlier message, where this app had
     appended the company's promise, and copied it as though it were its own
     phrasing. Naming the sentence is the only wording that reliably stops
     it, because "do not promise a colleague" is advice and this is a fact
     about who writes what. */
  lines.push(
    "\nWhen you hand over, say only that you cannot answer it yourself. " +
      "NEVER write \"Let me get someone to answer that properly\" or \"They will " +
      "reply right here\" or anything close to them, and never promise a reply, " +
      "a colleague, or an email. The app adds that promise itself, in the " +
      "company's own words, immediately after your reply. Write it too and the " +
      "person is told the same thing twice.",
  );

  /* ADDED 2026-09-09. HOW IT WRITES, WHICH IS NOT THE SAME AS WHAT IT KNOWS.

     Anthony, looking at real replies on his own phone: "the way the model
     types, it doesn't really write clean... because it's a WhatsApp message,
     it should keep the message simple, straightforward, and short."

     He is right and it was worse than untidy. A support desk that answers a
     one line question with six paragraphs reads as a machine, which is the
     one thing this is not supposed to feel like. Long replies also arrive on
     a phone as a single grey wall nobody finishes.

     Four rules, and each is here because something real went wrong:
       length, because it wrote essays
       blank lines, because it ran everything together
       punctuation, because it leaned on dashes instead of full stops
       stopping, because it explained itself before answering

     None of this touches what it is allowed to say. It is about the shape of
     the words only, which is why it sits here at the end of the instructions
     rather than anywhere near the boundary rules above. */
  lines.push(
    "\nHOW TO WRITE. This is a WhatsApp message, not a document. Keep it short. " +
      "Most questions are answered properly in two or three sentences, and almost " +
      "nothing needs more than four short paragraphs.",
  );
  lines.push(
    "Leave a blank line between paragraphs so it does not arrive as one block of " +
      "text on a phone.",
  );
  lines.push(
    "Use ordinary punctuation. Full stops and commas. No dashes standing in for a " +
      "pause, no bullet symbols, no bold, no headings, no emoji.",
  );
  /* ADDED 2026-09-09, a day after the line above, because the line above did
     not hold. The reply still read "completely free right now - no card
     needed", with an en dash. "No dashes standing in for a pause" describes a
     class of character and hopes the model shares the definition. Naming the
     three characters is an instruction. */
  lines.push(
    "Never put a dash between words, of any kind. Not - and not \u2013 and not \u2014. " +
      "Use a full stop, a comma, or start a new sentence instead.",
  );
  lines.push(
    "When somebody has to do something in a certain order, number the steps, one " +
      "per line, and name the exact thing to tap or type. Otherwise write in plain " +
      "sentences.",
  );
  lines.push(
    "Answer what was asked and stop. Do not add background nobody asked for, and " +
      "do not explain what you are about to say before you say it.",
  );

  if (routeLabels.length) {
    lines.push(`\nWhen you hand over, say who it should reach: ${routeLabels.join(", ")}.`);
  }

  /* ADDED 2026-09-09, and it is only true because of a migration applied the
     same day. customer_knowledge used to return oldest first, which is the
     worst possible order: it put the stale copy in front, and when the
     40,000 character ceiling ran out it was always the newest material that
     got dropped. It now returns newest first.

     If that ordering is ever reverted, this line becomes a lie and has to go
     with it. */
  lines.push(
    "\nThe material below is listed newest first. Where two parts of it disagree, " +
      "the one nearer the top is the company's current position and anything lower " +
      "down is out of date. Answer from the newer one, and do not tell the person " +
      "that your material disagreed with itself.",
  );
  /* ADDED 2026-09-09. The customer never hears about this. It goes to the
     company, so that a wrong answer can be traced to two files that disagreed
     rather than filed under "the AI made something up". */
  lines.push(
    "When you do find two parts of the material disagreeing about something you " +
      "actually used in this answer, fill in the disagreement fields on the reply " +
      "tool. Name both sources, say what each of them claims, and keep answering " +
      "normally. Only for a real conflict of fact, never for two documents that " +
      "simply cover different ground.",
  );

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

/* The part that changes. This is per conversation, so it must never sit in
   front of the cache mark. Returns null when there is nothing to say, and
   then no second block is sent at all. */
function buildOpenQuestions(openQuestions: string[]) {
  if (!openQuestions.length) return null;
  return (
    "These questions from this person are already with a colleague. " +
    "If they ask again, tell them it is still with somebody, and do not hand it over a second time:\n" +
    openQuestions.map((q) => `- ${q}`).join("\n")
  );
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
      customer_email: {
        type: "string",
        description:
          "Set this only when the person has just given their own email address so we can " +
          "reach them there. Leave it out otherwise, including when they mention somebody " +
          "else's address or an address they are asking a question about.",
      },
      /* ADDED 2026-09-09. All five or none. The customer never sees any of
         it; it goes to the company so a wrong answer can be traced to the
         material rather than to the model. */
      disagreement_topic: {
        type: "string",
        description:
          "Only when two parts of the published material contradicted each other about " +
          "something you used in this answer. What they disagreed about, in a few plain " +
          "words, such as 'the price of the Essential plan'. Leave out entirely if there " +
          "was no conflict.",
      },
      disagreement_source_a: {
        type: "string",
        description: "The name of the first source, exactly as it appears above the material.",
      },
      disagreement_said_a: {
        type: "string",
        description: "In one short line, what that first source claims.",
      },
      disagreement_source_b: {
        type: "string",
        description: "The name of the second source, exactly as it appears above the material.",
      },
      disagreement_said_b: {
        type: "string",
        description: "In one short line, what that second source claims.",
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
  customerEmail: string | null,
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
        (customerEmail
          ? `THEIR EMAIL\n${customerEmail}\n` +
            `They gave this so anything sensitive can go to their inbox instead of the chat.\n\n`
          : `THEIR EMAIL\nNot given. Answer them in the chat.\n\n`) +
        `THE CONVERSATION SO FAR\n${conversation}\n\n` +
        `DO NOT REPLY TO THIS EMAIL. Nobody reads this address, so a reply here reaches ` +
        `no one. Answer them where you already answer them, which for a WhatsApp ` +
        `conversation is your own admin inbox. The assistant stays out of the way once ` +
        `you do.`,
    }),
  });

  if (!response.ok) {
    console.error("resend rejected the escalation", response.status, await response.text());
    return false;
  }
  return true;
}

/* Told once, when the question is raised. This tells them the rest.

   Separate from notify() rather than a flag on it, because the two say
   different things and a subject line that lies about which one this is
   would get it filed as a duplicate and ignored. */
async function notifyMore(
  to: string,
  companyName: string,
  who: string,
  openQuestion: string,
  saidNow: string,
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "StellaXafe <support@stellaxafe.com>",
      to: [to],
      subject: `${companyName}: they said more while waiting`,
      text:
        `${who} has added to a question that is still open with you.\n\n` +
        `THE OPEN QUESTION\n${openQuestion}\n\n` +
        `WHAT THEY JUST SAID\n${saidNow}\n\n` +
        `If that is an email address, it is because they were asked for one ` +
        `and would rather have the answer there.`,
    }),
  });

  if (!response.ok) {
    console.error("resend rejected the follow up", response.status, await response.text());
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

  /* WHICH BRAIN, READ PER REQUEST. Never cached, because one isolate serves
     several companies at once. Falls back to Anthropic on any error, including
     the table not being there, so this can ship before the migration does. */
  const vendor = await vendorForCompany(company.id);

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

  /* The address, if this person has already given one. Read here rather than
     returned by support_thread_upsert, because changing that function's
     return type would mean dropping and recreating a function that is in use
     for the sake of one column. */
  const { data: threadRow } = await admin
    .from("support_threads")
    .select("customer_email")
    .eq("id", threadId)
    .maybeSingle();

  let customerEmail: string | null = threadRow?.customer_email ?? null;

  const { data: stateRows } = await admin.rpc("support_state", { p_thread_id: threadId });
  const state = Array.isArray(stateRows) ? stateRows[0] : stateRows;
  const openQuestions: string[] = state?.open_questions ?? [];

  if (state?.support_active) {
    return json({ ok: true, threadId, reply: null, held: true });
  }

  /* ------------------------------------------------------------------
     Keep the colleague in the loop.

     No screen anywhere shows this conversation. The escalation email is
     the only window a colleague has into it, and it is sent once, at the
     moment the question is raised. So everything the person says
     afterwards, including the email address the handover line now asks
     them for, would reach nobody.

     While a question is open on this thread, each further message from the
     person is forwarded to whoever it was routed to. It stops on its own
     when the escalation is closed, so there is nothing to switch off.

     Before the budget check on purpose. A workspace out of credit still
     has a colleague on the hook for an answer, and an email costs nothing.
     ------------------------------------------------------------------ */

  if (openQuestions.length && text) {
    const { data: openEsc } = await admin
      .from("escalations")
      .select("question, support_routes ( email )")
      .eq("thread_id", threadId)
      .is("closed_at", null)
      .not("notified_at", "is", null)
      .order("raised_at", { ascending: false })
      .limit(1);

    const row = openEsc?.[0] as
      | { question?: string; support_routes?: { email?: string } | null }
      | undefined;
    const routeEmail = row?.support_routes?.email;

    if (routeEmail) {
      const who = customerName ? `${customerName} (${customerRef})` : customerRef;
      await notifyMore(routeEmail, company.name, who, row?.question ?? "", text);
    } else {
      console.error("open question with no reachable route, nobody was told", threadId);
    }
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

     Two system blocks, in this order, and the order is load bearing.

     The first is the same for every customer of this company and changes
     only when the admin publishes something. It carries the cache mark, so
     from the second message onwards it is read at about a tenth of the
     price instead of being processed again.

     The second is the open questions for this one conversation. It sits
     after the mark, so when it changes it costs a few hundred tokens
     rather than throwing away the whole ten thousand. The conversation
     itself comes after both, for the same reason.
     ------------------------------------------------------------------ */

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystem(company.name, company.what_we_do, sources, routeLabels ?? []),
      cache_control: { type: "ephemeral" },
    },
  ];

  const openQuestionsBlock = buildOpenQuestions(openQuestions);
  if (openQuestionsBlock) {
    systemBlocks.push({ type: "text", text: openQuestionsBlock });
  }

  const anthropic = clientFor(vendor);

  let reply: string | null = null;
  let needsPerson = false;
  let question = text;
  let route: string | null = null;
  let usage: Anthropic.Usage | null = null;
  /* Declared out here, alongside the others, because it is written inside
     the try below and read a long way after it. An earlier version of this
     change lost this line to a failed edit and left the reader in place,
     which took support down: every reply was composed and saved and then the
     function threw on the way out, so the customer got silence. */
  let disagreement: {
    topic: string;
    sourceA: string;
    saidA: string;
    sourceB: string;
    saidB: string;
  } | null = null;

  try {
    const result = await anthropic.messages.create({
      model: modelFor(vendor, LEVEL),
      max_tokens: 700,
      system: systemBlocks,
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

    /* Collected here and written much later, after the reply is already
       composed, because a bookkeeping row must never be the reason a
       customer waits or gets nothing. */
    disagreement = {
      topic: String(input.disagreement_topic ?? "").trim(),
      sourceA: String(input.disagreement_source_a ?? "").trim(),
      saidA: String(input.disagreement_said_a ?? "").trim(),
      sourceB: String(input.disagreement_source_b ?? "").trim(),
      saidB: String(input.disagreement_said_b ?? "").trim(),
    };

    /* Saved before anything below reads it, so an address given in this very
       message is already on file when the escalation is written. That is the
       whole point of asking early. The function returns null and stores
       nothing when what came back is not shaped like an address. */
    const offered = String(input.customer_email ?? "").trim();
    if (offered && offered.toLowerCase() !== (customerEmail ?? "")) {
      const { data: saved } = await admin.rpc("support_thread_email_set", {
        p_thread_id: threadId,
        p_email: offered,
      });
      if (saved) {
        customerEmail = String(saved);
        console.log("support: email stored for thread", threadId);
      }
    }
  } catch (err) {
    console.error("support model call failed", err);
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
          customerEmail,
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

    /* THREE PARAGRAPHS, IN THIS ORDER, ALWAYS.

         1. Somebody is coming.
         2. Either ask for their email, or say their inbox may be used.
         3. Anything else in the meantime?

       The middle one flips on whether an address is already on file. No
       address means ask for it. An address on file means say plainly that
       it might get used, rather than asking for something we already have. */
    const middle = customerEmail ? HANDOVER_INBOX_LINE : HANDOVER_ASK_EMAIL;
    const handover = `${HANDOVER_OPEN}\n\n${middle}\n\n${HANDOVER_CLOSE}`;

    /* STRIPPED BEFORE IT IS ADDED, never after. Taking our words out of the
       model's half leaves its actual answer whole, and then exactly one
       handover goes on the end. See withoutOurLines for why the model keeps
       writing this sentence by itself. */
    const answerOnly = withoutOurLines(reply);
    reply = answerOnly ? `${answerOnly}\n\n${handover}` : handover;
  }

  if (!reply) reply = HANDOVER_OPEN;

  /* THE FIRST MESSAGE NO LONGER ASKS FOR AN EMAIL. Removed 2026-09-22.

     It used to append EMAIL_INVITE here, on message one of every new
     conversation. Anthony took it apart: "somebody is just coming for the
     first time to message. You're asking them for their email."

     He is right. Nobody should have to hand over an address to ask a
     question, and a desk that opens with a form reads as one that wants
     your details more than your problem.

     The ask moved into the handover, which is the first moment it is
     actually true that somebody might need to reach them. See
     HANDOVER_ASK_EMAIL above. */

  await admin.rpc("support_message_add", {
    p_thread_id: threadId,
    p_company_id: company.id,
    p_author_role: "ai",
    p_body: reply,
    p_external_id: null,
  });

  /* ------------------------------------------------------------------
     ADDED 2026-09-09. The company's own material disagreeing with itself.

     Anthony asked for this so that a wrong answer can be traced to two
     files that disagreed rather than filed under "the AI made something
     up". The customer is never told any of it.

     All the fields or nothing. A half filled report names one source and is
     worse than silence, because somebody would go looking for a second file
     that was never identified.

     It runs after the reply is already written and after the person has
     been answered, and a failure only ever reaches the log. A bookkeeping
     row is not worth a customer waiting for.

     WRAPPED IN ITS OWN TRY. The first version of this took support down.
     Nothing about recording a disagreement is worth a customer getting
     silence, so from here to the end of the handler, anything that throws
     is caught and the reply still goes back.
     ------------------------------------------------------------------ */

  try {
    if (
      disagreement &&
      disagreement.topic &&
      disagreement.sourceA &&
      disagreement.sourceB &&
      disagreement.sourceA.toLowerCase() !== disagreement.sourceB.toLowerCase()
    ) {
      const { error: logError } = await admin.rpc("knowledge_contradiction_log", {
        p_company_id: company.id,
        p_topic: disagreement.topic,
        p_source_a: disagreement.sourceA,
        p_said_a: disagreement.saidA,
        p_source_b: disagreement.sourceB,
        p_said_b: disagreement.saidB,
        /* Newest wins and the material is ordered newest first, so the one it
           answered from is the one listed higher up, which is A. Recorded
           rather than left to be inferred, because that ordering has already
           changed once. */
        p_answered_with: disagreement.sourceA,
      });
      if (logError) {
        console.error("could not record the disagreement", logError);
      } else {
        console.log(
          `support: material disagreed company=${company.id} topic=${JSON.stringify(disagreement.topic)}`,
        );
      }
    }
  } catch (err) {
    console.error("recording the disagreement threw, reply is unaffected", err);
  }

  /* ------------------------------------------------------------------
     Meter it. A cache read costs about a tenth and a cache write a little
     over full price, so counting either at face value would take the wrong
     amount off a real budget.

     Also wrapped, for the same reason as above. Bookkeeping must never be
     the reason somebody gets no answer.
     ------------------------------------------------------------------ */

  try {
    if (!exempt && usage) {
      const cacheRead = usage.cache_read_input_tokens ?? 0;
      const cacheWrite = usage.cache_creation_input_tokens ?? 0;
      const fresh = usage.input_tokens ?? 0;
      const out = usage.output_tokens ?? 0;

      const cents = centsExact(vendor, LEVEL, {
        fresh, cacheWrite, cacheRead, output: out,
      }, "short");

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
  } catch (err) {
    console.error("metering threw, reply is unaffected", err);
  }

  return json({ ok: true, threadId, reply, escalated: needsPerson });
});
