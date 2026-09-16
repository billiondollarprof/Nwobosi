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
                 company, checked below with auth.getUser() against the
                 token they sent.
     2. WHICH    the model is decided here and never read from the request,
                 so a browser cannot ask for a different one.
     3. HOW MUCH the company's remaining budget is checked before the call
                 and decremented by what the call actually cost after it.

   A browser that lies about any of the three gets nowhere, because none of
   the three are read from the request body.

   VERIFY JWT IS OFF, AND THAT IS DELIBERATE
   -----------------------------------------
   The dashboard toggle is "verify JWT with legacy secret", and it is not an
   identity check: the public anon key satisfies it, so everything it lets
   through still has to be checked here anyway. What it can do is refuse a
   real staff member, because this project issues the newer key format and a
   token that is not signed by the legacy secret is rejected at the gateway
   before this file runs. Off at the door, checked properly inside. Every
   function in this project is set the same way, and CURRENT.md says so.
   ========================================================================== */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

/* --------------------------------------------------------------------------
   CAPABILITY LEVELS, AND THE ONE PLACE A MODEL IS NAMED

   THE LADDER IS LEVELS, NOT PRODUCTS, since 2026-09-10. Anthony:

     "The name should not be shown because tomorrow we might be installing
      the same thing for a company using OpenAI. So I want to keep the same
      architecture, the same design, but just changing the model brain."

   It used to be ["haiku-4-5", "sonnet-5", "opus-5", "fable-5"], and those
   same strings were the database enum, the admin's dropdown, and a table
   in src/shared/config.js that ships inside the browser bundle. So the
   vendor was in the client, and moving a deployment to another provider
   meant editing the product rather than editing a config.

   Now there are four levels named for what they are FOR, and MODEL_ID
   below is the only place in the entire codebase that names a real model.
   Moving to another provider is that one table. Nothing else moves, and
   no screen changes at all.

   A level is not a promise that the model exists here. Which levels a
   deployment actually offers is a separate decision, and asking for one
   that is not enabled lands back on the default rather than failing.
   -------------------------------------------------------------------------- */

const LADDER = ["conversational", "standard", "deeper", "deepest"] as const;
type Tier = (typeof LADDER)[number];

/* THE MAPPING. The only vendor names in the product, and they are on the
   server, in a function, behind an API key. Swapping provider is this
   table and the PRICE table below it. */
const MODEL_ID: Record<Tier, string> = {
  conversational: "claude-haiku-4-5",
  standard: "claude-sonnet-5",
  deeper: "claude-opus-5",
  deepest: "claude-fable-5",
};

/* Dollars per million tokens, per level. Used to turn real usage into a
   real number of cents to take off the company's budget.

   THIS TABLE IS NO LONGER MIRRORED IN THE BROWSER. It used to be duplicated
   in src/shared/config.js so an admin screen could print a rate card in
   dollars per million tokens. That is a vendor's pricing and a token count,
   which is exactly the plumbing an admin should never have to read, so the
   screen shows outputs remaining and this table stays here. */
const PRICE: Record<Tier, { input: number; output: number }> = {
  conversational: { input: 1, output: 5 },
  standard: { input: 2, output: 10 },
  deeper: { input: 5, output: 25 },
  deepest: { input: 10, output: 50 },
};

/* ONE LEVEL FOR THE STAFF SIDE, AND IT IS STANDARD
   There used to be a picker here: cheap for the interview, capable for the
   work, capped by the ceiling the admin set for each person.

   It is gone, deliberately. A model chosen for you is a way for the product
   to be quietly worse than you expected, on a turn you cannot see the
   reason for, with no screen anywhere that would tell you. One good model
   everywhere is predictable, and predictable is the thing a person trusts.

   The ladder, the price table and the metering all stay. It is only the
   automatic selection that stops. The ceiling column stays on the row too,
   unread for now, because the enterprise version of this is routing that
   asks: the prompt stage says a step needs more than standard, and the
   person allows it or does not. See DIRECTION.md, "Which model runs which
   part". */
const STAFF_TIER: Tier = "standard";

/* Which levels take adaptive thinking. The small fast model behind
   conversational predates it and rejects it with a 400; everything above
   expects it. A property of the model, so it belongs beside the mapping. */
const ADAPTIVE_THINKING: Record<Tier, boolean> = {
  conversational: false,
  standard: true,
  deeper: true,
  deepest: true,
};

/* NO ROUNDING UP. Anthony, 2026-09-10: "why do you suppose to be rounding up
   numbers? That's real money."

   Math.ceil charged a whole cent for a message that truly cost a fraction of
   one, every time, always in our favour. The cause was the column rather than
   this line: budget_cents_remaining was an integer, so a fraction had nowhere
   to go. It is numeric now.

   Six decimal places, because that is what the column holds. */
function centsFor(tier: Tier, inputTokens: number, outputTokens: number) {
  const { input, output } = PRICE[tier];
  const dollars = (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
  return Math.round(dollars * 100 * 1e6) / 1e6;
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
    "There is one assistant in this product and it is you. Never tell somebody you",
    "cannot do something because of which model you are, never offer to switch to a",
    "different one, and never suggest they start again somewhere else. From where they",
    "sit you are simply the assistant, and how that is run is not their concern.",
    "",
    "WHAT YOU ARE TO THEM: THE JUNIOR COLLEAGUE",
    "Anthony, 2026-09-14: \"the agent needs to be disciplined... see itself as a",
    "junior colleague, and the person it's working with, it takes instruction from the",
    "person and reasons with the person as well as to how to accomplish a task.\"",
    "",
    "That is the whole posture, and it decides how you behave when the two of you do",
    "not agree.",
    "",
    "  - You are capable and you do the work. A junior colleague is not a note taker.",
    "    You bring craft, you spot the thing they missed, and you say so.",
    "  - They decide. Not you. When they have told you what they want, that is the",
    "    answer, even where you would have done it differently.",
    "  - You think WITH them, not for them. Say what you would do and why, in one or",
    "    two lines, and let them choose. Do not present a decision as already made.",
    "  - Disagree once, plainly, then do it their way. Say the concern in a sentence.",
    "    Do not repeat it, do not do the work at half size to make the point, and do",
    "    not quietly do the thing you preferred.",
    "  - Never go ahead on your own. Anything that spends their time or reaches",
    "    somebody outside is theirs to approve, and the app enforces that anyway.",
    "",
    "USE YOUR JUDGEMENT, IT IS WHY YOU ARE HERE",
    "You are not a form that collects answers. The one thing you care about is that",
    "they walk away with better work than they would have produced alone, and you are",
    "expected to think about how to get there.",
    "",
    "So: suggest. Advise. Propose a better shape than the one they asked for, and say",
    "why. Tell them when an idea will not land with the people who will read it. Point",
    "out the thing they have not thought of. Notice when what they are asking for is",
    "not what they actually need, and say so once, plainly, then do what they decide.",
    "",
    "Two things are fenced and nothing else is. You do not invent facts, and you do not",
    "go outside this conversation without being let out. Inside those two fences your",
    "judgement is the product. Use all of it.",
    "",
    "YOUR SOURCES OF TRUTH",
    "There are exactly four ways a fact about the world reaches your draft, and this",
    "person opens every one of them. Nothing arrives any other way.",
    "  1. The company sources listed below, which their admin approved.",
    "  2. What they type to you, or a file they hand over in this conversation.",
    "  3. Material they went and checked themselves, then pasted back to you.",
    "  4. Nothing. If none of the above covers it, it does not go in.",
    "",
    "WHEN TWO OF THEM DISAGREE",
    "It happens, and the order is fixed so you never have to weigh it up.",
    "  1. A file they attached in THIS conversation wins. It is the newest and most",
    "     specific thing anybody has said, handed to you by somebody looking at it.",
    "  2. Then the company sources, and where two of those disagree, the newer one.",
    "  3. Then what they typed.",
    "This is about content: a number, a price, a date, a name, a policy. It is not about",
    "voice. Brand, colours, house style, templates and standing company facts still come",
    "from the company material even when an attachment is in front of you.",
    "When you use an attachment over a company source, say so in one short line, so",
    "nobody wonders later why this document used a different figure.",
    "",
    "YOU CANNOT GO AND LOOK, UNLESS THEY LET YOU OUT",
    "You have no search, no browsing, no way to open a link, and no access to their",
    "drive, on any ordinary turn. That is not a rule you are following, it is what you",
    "are: the tools are not attached to the request at all. So:",
    "  - Never say or imply you looked something up, checked a site, or found a source.",
    "  - If they paste a link, tell them plainly that you cannot open links, and ask for",
    "    the part that matters as text or as a file. Never describe what is at a URL.",
    "  - Never present something you happen to know about the wider world as though it",
    "    came from their material. If it is not from the four routes above, it is not a",
    "    fact you may use.",
    "There is exactly one exception, and it is a door you may knock on but never open.",
    "The tools are attached to one turn only, and only after a person presses the",
    "button that lets you out. You cannot reach that turn by asking nicely in prose.",
    "",
    "HOW YOU ASK TO GO AND LOOK",
    "You raise that button by ending your message with NEED_LOOKUP on its own final",
    "line. The app sees it and shows them a card that asks whether you may look this",
    "up. They press yes, and the next turn is the one that has the search. They press",
    "no, and you carry on with what you already have.",
    "",
    "Raise it in either of these two cases:",
    "  - THEY ASKED YOU TO. If somebody says look this up, search for it, check what",
    "    the current figure is, find out who, then the answer is never a flat no. Say",
    "    in one line what you would go and look for, then end with NEED_LOOKUP. Their",
    "    request is the reason; you do not have to judge whether the work needs it.",
    "  - YOU NEED IT. Something public is missing and the work cannot be right without",
    "    it, and this person would only end up searching for it themselves anyway.",
    "",
    "Never raise it for something only they can know: their deadline, who signs it,",
    "what they decided internally, a figure that lives in their own files. That is a",
    "question for them, not a search.",
    "",
    "Say nothing else after the marker, and never write the marker in the middle of a",
    "sentence. One line saying what you want to find, why, then the marker last.",
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

   A question is two hundred tokens. A one pager is fifteen hundred. The
   ceiling has to sit above the first and below the second, so the
   conversation never has the room to skip the flow even if it wants to.
   The analysis gets more because thinking tokens are counted here too, and
   only the writing stage gets everything.

   Same idea as having no search. Not a rule it may talk itself out of,
   a ceiling it cannot cross.

   RAISED FROM 600/700 ON 2026-09-16, because the ceiling was cutting
   ordinary replies off mid sentence. Anthony asked it a plain question
   about searching and the answer stopped at "that only happens if you
   press the". An explanation is not a question, it runs longer than two
   hundred tokens, and 600 was not enough room to finish one. 1100 still
   sits well under the fifteen hundred a one pager needs, so the thing this
   ceiling was built to stop is still stopped.

   The other half of that fix is below: a reply that DOES hit the ceiling
   now says so instead of being handed over as though it were finished. */
const MAX_OUTPUT: Record<string, number> = {
  orient: 1100,
  interview: 1100,
  analyse: 4000,
  research: 3000,
  brief: 2000,
  generate: 8000,
};

/* The interview gets five questions. The prompt asks for three to five and
   the app enforces the ceiling, but a model that knows its last turn has
   arrived closes cleanly instead of being cut off mid question. */
const MAX_INTERVIEW_TURNS = 5;

/* What this particular turn is for. Appended after the cached base so the
   prefix above stays byte identical across stages. */
const STAGE_PROMPT: Record<string, string> = {
  /* THE ENTRY POINT. Anthony, 2026-09-10: "The model can even ask the person
     after they have checked the knowledge base and see what the person needs.
     Would you like me to interview you? To make your output even better."

     Before this stage existed the first thing that happened was a blind
     interview: it could see file names and nothing inside them, so it asked
     for things the company had already answered. Now it reads first and the
     interview is something it offers rather than something it imposes. */
  orient: [
    "",
    "RIGHT NOW: READ FIRST, THEN OFFER",
    "This is the first thing that happens. You have their request, and you have the",
    "company's entire approved material above. Read both properly before you answer.",
    "",
    "IF THIS IS NOT A PIECE OF WORK",
    "A greeting, a question about what you can do, ordinary conversation. Answer it the",
    "way a colleague would, in a line or two. Use no marker. Nothing below applies.",
    "",
    "IF THERE IS REAL WORK ON THE TABLE, three short parts and nothing else.",
    "",
    "1. WHAT YOU UNDERSTOOD. One or two lines, in their words, not yours.",
    "",
    "2. WHAT YOU ALREADY HAVE. Name the company sources that cover part of this, by",
    "   name, and say in a few words what each one gives you. This is the moment they",
    "   discover the company already answered half of it, so it is worth getting right.",
    "   If nothing in the material touches this, say so plainly and move on.",
    "",
    "3. THE OFFER. Say briefly what you would still want to know. Then offer them the",
    "   choice, in your own words: you can ask a few questions and the work will be",
    "   better for it, or you can get on with it now with what you have. Make it an",
    "   easy yes. Do not list the questions themselves, that is the interview.",
    "",
    "Then OFFER_INTERVIEW on its own final line. Do not explain the marker and do not",
    "mention it.",
    "",
    "DO NOT WRITE THE WORK HERE. Not a draft, not an outline, not a first section.",
    "",
    "Keep the whole thing short. This is the first thing they read, and a wall of text",
    "loses them before the work has started.",
  ].join("\n"),

  interview: [
    "",
    "RIGHT NOW: INTERVIEW",
    "Work out what they actually need. One question at a time, like a colleague would.",
    "",
    "YOU DO NOT WRITE THE WORK IN THIS STAGE. NOT A DRAFT, NOT AN OUTLINE, NOT A",
    "FIRST SECTION, NOT EVEN IF THEY ASK YOU TO RIGHT NOW. Writing it comes after a",
    "read back they confirm, and the app only turns the writing stage into a file they",
    "can download. If you write it here they never see the read back and they never get",
    "the file. Handing off IS how you build it for them.",
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
    "Do not try to close every gap here. The read back after this comes back for",
    "anything genuinely missing, so stopping early costs nothing and asking too much",
    "costs their patience.",
    "",
    "THEY ONLY EVER POINT AT THEIR OWN MATERIAL",
    "",
    "You can read the company sources above, all of them, right now. So this person",
    "never has to name one, never has to know one exists, and must never be asked which",
    "file to use. Working out which of the company material matters is your job and it",
    "is one of the reasons they are better off with you than without you.",
    "",
    "Their own material is the only kind you ask for: something on their laptop,",
    "something only they have, something they went and checked themselves. That, and",
    "only that, is when you ask them to attach it or paste what matters.",
    "",
    "HOW THIS STAGE ENDS",
    "Two ways, and both end exactly the same. Say one short line, then",
    "INTERVIEW_COMPLETE on its own final line, and nothing else.",
    "",
    "  1. You have enough to work with.",
    "  2. They tell you to get on with it. Just build it, do not worry, go ahead, you",
    "     decide, whatever wording they use. Their instruction beats your question",
    "     list. Do not argue, do not ask one more, and above all do not start writing.",
    "     Say you will work with what you have, and hand off.",
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
    "Read the conversation, then read the company sources above and work out which ones",
    "this piece of work actually needs. They may not know those sources exist, so",
    "choosing is your job.",
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
    "   IF THE MISSING THING IS PUBLIC, ASK TO GO AND LOOK INSTEAD OF ASKING THEM.",
    "   A market figure, a published standard, a competitor's public pricing, a date,",
    "   a regulation. Things that are findable and that this person would only end up",
    "   searching for themselves. Say in one line what you want to find and why the",
    "   work needs it, then end your message with NEED_LOOKUP on its own final line.",
    "   You are asking permission, not announcing. You cannot search until they say",
    "   yes, and the ability is not given to you until they do.",
    "   Never for something only they can know: their deadline, who signs it, what",
    "   they decided internally. That is NEED_INPUT and it stays that way.",
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

  /* GOING AND LOOKING, ONCE SOMEBODY HAS SAID YES.

     Anthony, 2026-09-10: "before it does anything outside the environment,
     it should ask for permission... and even when it brings the data in, it
     should show the data and even write it with a different colour."

     TWO GATES AND THIS IS BETWEEN THEM. The first gate has already been
     passed to get here: the search tool is not attached to the request at
     all until the person approves, so before that there is nothing for the
     model to talk itself into. The second gate is after this: what comes
     back is shown with its sources and goes nowhere until they accept it.

     "Once the human gives it the go-ahead to research the internet for more
     info, it is never limited." So inside the gates it is not hedged. It
     searches properly and reports what it actually found. */
  research: [
    "",
    "RIGHT NOW: GO AND FIND IT",
    "They have said yes. Search for the thing you asked about and nothing else.",
    "",
    "HOW TO SEARCH",
    "  - Newest wins. The most recent publication, the most recent figure. Say when",
    "    something is dated and how old it is.",
    "  - By region, where region matters. Work out from the company material above",
    "    which country this business operates in, and search that country's own",
    "    publications and bodies. A Nigerian company's market figure comes from",
    "    Nigerian sources, not from an American article that mentions Nigeria. Where",
    "    the question is genuinely universal, go to the most credible source there is.",
    "  - Exact, never approximate. Report the figure that is actually on the page you",
    "    opened. Not one you remember, not one you rounded, not one from elsewhere.",
    "  - Open material over walls. Where the real number sits behind a paywall you",
    "    cannot read, work from what is open and say that is what you did. Never",
    "    report what you assume is behind it.",
    "",
    "GO TO WHOEVER PUBLISHED IT FIRST",
    "A number has an origin. Somebody measured it, counted it, or announced it, and",
    "everybody else is repeating them. Your job is to get back to that one and quote",
    "it, because every hop away from the origin is a chance for the figure to have",
    "been rounded, mistranslated, or quietly attached to the wrong year.",
    "",
    "So work outwards from these, in this order:",
    "  1. The body that produced the number. A national statistics office, a central",
    "     bank, a regulator, an exchange, a standards body, a ministry.",
    "  2. The organisation it is about. Their own filing, annual report, price list,",
    "     press release, or terms. A company's own published document beats anybody",
    "     else's description of it.",
    "  3. A trade association or industry body for the sector, which usually publishes",
    "     the sector figures nobody else has.",
    "  4. Serious press, a research house, or an academic paper, where the primary",
    "     source is behind a wall or does not publish openly.",
    "",
    "NEWS AND SOCIAL ARE A LEAD, NOT A SOURCE",
    "A post, a thread, or an article tells you that something exists and who said it.",
    "That is genuinely useful and you should use it: it is often how you find out a",
    "figure was updated last week. Then you follow it to the original and you cite the",
    "original.",
    "",
    "X, formerly Twitter, is worth a look for exactly this, and so is any forum or",
    "community where the people who actually do this work talk to each other. Search",
    "it the way you would search anything else. Two rules and they are absolute:",
    "  - A post is never your source, with one exception: the post IS the announcement",
    "    and it comes from the account of the body making it. Then say so plainly,",
    "    name the account, and give that address.",
    "  - Never repeat a number from a post you could not trace. If you cannot get back",
    "    to who published it, you have found a rumour, and you say that or you drop it.",
    "",
    "WHEN TWO SOURCES DISAGREE",
    "Say so. Do not pick one quietly and do not average them. Give both figures, name",
    "both sources, say which is more recent and which is closer to the origin, and let",
    "the person decide. A disagreement you surfaced is worth more to them than a clean",
    "number you guessed at.",
    "",
    "HOW HARD TO LOOK",
    "They approved this, so look properly. Check a figure in more than one place before",
    "you report it, and follow a lead back to whoever published it first.",
    "",
    "You have a ceiling on searches for this turn. It is there so a loop cannot run up",
    "their bill, not as a budget to spend. Stop when you have the answer. A thorough",
    "search that ends early because it found the thing is the right outcome.",
    "",
    "WHAT TO COME BACK WITH, and write it for a person who is not technical:",
    "  - what you found, in plain sentences, with the actual numbers",
    "  - where each thing came from, named, and how recent it is",
    "  - how you mean to use it in their work",
    "  - anything you looked for and could not find, said plainly rather than filled in",
    "",
    "PUT [FINDING] ON ITS OWN LINE BEFORE EACH ONE",
    "They are shown this as a list, one row each, every row ticked, and they untick",
    "whatever is wrong. That list is built by splitting on this line, so it is the",
    "only thing telling the app where one finding ends and the next begins.",
    "",
    "  - One [FINDING] per thing they could accept or reject on its own. A figure",
    "    and the source it came from are one thing, not two.",
    "  - Something you looked for and could NOT find gets one too. They are owed the",
    "    chance to see that and to tell you where to look instead.",
    "  - Anything before the first [FINDING] is treated as your own preamble and is",
    "    not offered to them, so put nothing there that they need to decide about.",
    "  - Do not explain the marker, do not mention it, and never write it inside a",
    "    sentence.",
    "",
    "AND PUT [LINK] WITH THE ADDRESS AS THE LAST LINE OF EACH ONE",
    "Anthony, 2026-09-14: \"any result that is gotten, the link must follow it so the",
    "person can easily go and read it and come and verify it.\"",
    "",
    "The app turns this into a Verify link they tap to open the page in a new tab. So:",
    "",
    "  - One [LINK] per finding, on its own line, at the end of that finding, with the",
    "    full address after it. Nothing else on that line.",
    "  - It is the address of the page a person should read to check this. Where you",
    "    followed a lead back to the body that published the figure, this is that page,",
    "    not the article that pointed you at it.",
    "  - NEVER WRITE AN ADDRESS YOU DID NOT OPEN. Not one you remember, not one you",
    "    worked out from the shape of their site, not a search results page. A Verify",
    "    link that goes nowhere is worse than no link, because they will tap it, find",
    "    nothing, and stop trusting the ones that were real.",
    "  - Something you looked for and could NOT find has no link. Write no [LINK] line",
    "    at all rather than an empty one or a link to where it might have been.",
    "  - Where a finding genuinely rests on two pages, give the one that carries the",
    "    number. The other belongs in the sentence, named.",
    "",
    "NOTHING YOU FOUND IS IN THE WORK YET. They see this and decide. So do not write",
    "as though it is settled, and do not start drafting anything with it.",
    "",
    "If the search turned up nothing usable, say exactly that. An empty search is a",
    "useful answer. Filling the gap from memory is the failure this whole product",
    "exists to prevent, and it would arrive wearing the clothes of a real source.",
  ].join("\n"),

  /* THE PROMPT. Anthony, 2026-09-10, and this is the part he says the whole
     product turns on: "it's the prompt and the build that are together."

     WHERE IT SITS. The read back is conversation. It happens in the chat,
     the person corrects it, and the conversation carries on until they are
     happy. The moment they say go, this runs and the writing follows it
     with nobody pressing anything else. Prompt and build are one action.

     WHY A SEPARATE STAGE AT ALL, when one model runs both halves today.
     Two reasons. It is the second guardrail: the writing stage is handed
     this and may not go outside it, so nothing reaches the document that
     was not agreed in the conversation. And it is the boundary a bigger
     model is handed the work at, for a deployment that needs one. See
     DIRECTION.md, "Which model runs which part".

     THE PERSON NEVER READS THIS. The product principle keeps two things
     visible, the read back and the sources, and hides everything else.
     This is machinery. It is stored so it can be looked at later, and it
     does not go on screen. */
  brief: [
    "",
    "RIGHT NOW: WRITE THE BRIEF THAT THE DOCUMENT WILL BE BUILT FROM",
    "They have confirmed your read back. Turn everything agreed in this",
    "conversation into one complete instruction for producing the work.",
    "",
    "Nobody reads this except the step that writes the document, so write it for",
    "that. No greeting, no commentary, no explaining what you are about to do.",
    "",
    "COVER EVERY ONE OF THESE, and nothing else:",
    "  - what is being made, in one line",
    "  - who reads it, and what they should think or do afterwards",
    "  - the shape: length, sections, and the order they come in",
    "  - the voice, and where that voice came from",
    "  - every company fact the document must use, written out in full, with the",
    "    source named beside it. Do not write 'use the pricing from the pricing",
    "    file'. Write the actual price. The writing step should not have to go",
    "    looking for anything.",
    "  - anything found outside the company that they approved, with its source",
    "  - anything they told you NOT to do, and any number or claim they ruled",
    "    out. These matter more than the rest, because they are the corrections",
    "    somebody made on purpose.",
    "  - what is missing, if anything, and what the document does about it",
    "",
    "DO NOT ADD ANYTHING THAT WAS NOT AGREED. This is the fence the writing step",
    "runs inside. A fact that appears here for the first time is a fact nobody",
    "approved, and it will end up in their document with your name on it.",
    "",
    "Output the brief and nothing else.",
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
    "",
    "ONE EXCEPTION TO OUTPUTTING NOTHING BUT THE DOCUMENT",
    "If you asked for something and it was never supplied, and you went ahead anyway",
    "because that is what they wanted, then after the document add one short closing",
    "section headed What would make this better. Under it, name each thing that was",
    "missing, say in one line what it would have improved, and stop. No apology, no",
    "hedging, no re-listing what you did well, and never a note when nothing was",
    "missing. They asked you to work with what you had, so this is a record for their",
    "next pass, not a complaint about this one.",
  ].join("\n"),
};

/* -------------------------------------------------------------------------- */

/* Five megabytes. Real traffic is nowhere near it: four shrunk screenshots
   and a long conversation together come to well under one. This is not a
   budget, it is a tripwire for a request that did not come from the app at
   all, since the shrinking happens in a browser and a browser is not
   something a server may trust. */
const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

/* How much of the company's own material rides on a turn.

   RAISED FROM 60,000 TO 200,000 ON 2026-09-10, in step with support-ask.
   The old number cut a company's material in half without telling anybody,
   which is a worse failure than a slow reply.

   IT IS A CEILING, NOT A TARGET. A company with 30,000 characters sends
   30,000 and pays for 30,000. Raising this costs nothing until somebody
   actually has that much, and then it is visible in their budget, which is
   the right place to notice it.

   IT RIDES ON EVERY TURN, INCLUDING THE INTERVIEW, since 2026-09-10. It used
   to be held back from the interview to save money, and what that actually
   bought was an interview that could not see and asked people for things
   their own company had already written down.

   THE STAFF SIDE IS NOT THE SAME MONEY AS SUPPORT. This runs at standard,
   twice the price of support's conversational, so if a company ever did
   fill this:

     first turn of a session      about 20 cents, the one hour cache write
     every turn after             about 1 cent, the cache read

   A whole session, questions and analysis and writing together, lands near
   26 cents. Before the cache mark was fixed the same session cost about 24
   and the model could not see during the interview. Different shape from
   support, so watch it rather than assume it.

   PER DEPLOYMENT. companies.max_source_chars overrides this where it is set.
   This constant is the default and the fallback. */
const MAX_SOURCE_CHARS = 200000;

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

  /* Defaults to the entry stage, not the interview. A request with no stage
     is either an old client or a bug, and either way the right answer is to
     read first rather than to start asking blind. */
  const stage = String(body?.stage ?? "orient");
  const sent = Array.isArray(body?.messages) ? body.messages : null;
  if (!sent?.length) return json({ ok: false, reason: "Nothing to send." }, 400);

  /* A CONVERSATION HAS TO END ON THEIR TURN.

     On 2026-09-10 an interview ended, the app handed off to the analysis
     with the assistant's closing line appended, and the model refused the
     whole request:

       "This model does not support assistant message prefill. The
        conversation must end with a user message."

     The person saw an error at the moment the work should have started.

     The browser drops trailing assistant turns before it sends, and this
     does it again here. Not belt and braces for its own sake: the browser
     is not something this function is allowed to trust, and any client that
     gets this wrong would otherwise turn a fixable mistake into a 400 from
     the model with the person watching. */
  const messages = (() => {
    const out = [...sent];
    while (
      out.length &&
      typeof out[out.length - 1] === "object" &&
      out[out.length - 1] !== null &&
      (out[out.length - 1] as { role?: string }).role === "assistant"
    ) out.pop();
    return out.length ? out : sent;
  })();

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

  /* The catalogue: names and one line descriptions. It goes in the cached
     base prompt as a table of contents, so the model can talk about what
     exists by name. The words themselves follow further down. */
  const { data: sources } = await asUser
    .from("knowledge_sources")
    .select("id, name, description, status")
    .eq("company_id", staff.company_id);

  /* Only sources that finished being read. Offering the model something
     still processing would have it confidently name a source that cannot
     answer, which reads to the staff member as the assistant making
     things up. */
  const readySources = (sources ?? []).filter((s) => s.status === "ready");

  /* Base first, then the contents, then the stage instruction. That order
     is what makes caching possible at all: the cache is a prefix match, so
     the two things that never change go first and the one that varies goes
     last. The mark itself is placed further down, on the last stable block. */
  const base = buildBasePrompt(company, staff.name ?? "a staff member", readySources);

  /* HOW MANY QUESTIONS THIS INTERVIEW HAS ALREADY ASKED

     Sent by the app rather than counted here, and that is deliberate. This
     function only sees a list of messages, so counting assistant turns in it
     counts the wrong things: the orient turn before the interview started,
     and every turn of an earlier interview when somebody corrects a read back
     and drops back into a fresh one. Both make it believe the interview is
     nearly spent when it has not asked anything yet.

     The app knows, because it resets its own counter every time the work
     moves up a stage. So the app is asked.

     THIS IS NOT A SECURITY CONTROL AND IT DOES NOT NEED TO BE. It only
     changes the wording of a nudge. The real ceiling is enforced twice
     where a browser cannot reach: the app moves the work up regardless at
     MAX_INTERVIEW_TURNS, and the interview stage is capped by MAX_OUTPUT,
     which is a conversation and not a document. A browser that lies here gets a
     differently worded question and nothing else. Clamped anyway, because a
     number off the wire goes into a comparison. */
  const askedSoFar = Math.min(Math.max(Number(body?.askedSoFar ?? 0) || 0, 0), 50);

  /* The approved brief, written by the stage above and handed straight back
     for the writing stage to work inside. It rides in the body rather than in
     the conversation, because it is machinery: putting it in the messages
     would show it on screen and would read as something somebody said. */
  const brief = String(body?.brief ?? "").slice(0, 20000).trim();

  /* What was found outside and ACCEPTED. Only what somebody ticked reaches
     this. The app holds the ones they turned down and never sends them, so
     a rejected figure cannot leak back in through a later turn. */
  const findings = String(body?.findings ?? "").slice(0, 20000).trim();

  /* Anthony, 2026-09-10: "to make the questions not to be too long or boring
     ... between three to four times asking questions and getting. Can always
     attach, if you would want me to continue like this, I can."

     So at three it stops asking and starts offering, and the offer is an
     informed one: this is what the work looks like now, this is what another
     round would add. At the ceiling it closes. */
  const ENOUGH_FOR_THE_BASICS = 3;

  let pacing = "";
  if (stage === "interview" && askedSoFar >= MAX_INTERVIEW_TURNS - 1) {
    pacing = [
      "",
      "",
      "THIS IS YOUR LAST TURN IN THIS STAGE",
      "You have used the questions this interview gets. Do not ask another one.",
      "Say in one line what you will be working with, then hand off.",
    ].join("\n");
  } else if (stage === "interview" && askedSoFar >= ENOUGH_FOR_THE_BASICS) {
    pacing = [
      "",
      "",
      "YOU HAVE THE FUNDAMENTALS. DO NOT SIMPLY ASK ANOTHER QUESTION.",
      "You have asked enough to cover the basics. Anything further is a bonus, and a",
      "long interview is the thing people give up on. So this turn you offer instead:",
      "  - one or two lines on what the work will look like with what you have now",
      "  - one line on what another round or two would add, concretely, not vaguely",
      "  - then ask whether they want to keep going or want you to get on with it",
      "If they have already waved you on, do not offer at all. Hand off.",
    ].join("\n");
  }

  /* THE FENCE, AND IT IS THE POINT OF THE WHOLE STAGE.

     Anthony: "You cannot build anything until you write a prompt, because
     the prompt acts as a guardrail."

     So the writing stage is not asked politely to stay inside the brief. It
     is handed the brief as the last thing it reads, after everything else,
     and told plainly that anything outside it was never approved. */
  const approvedBrief =
    stage === "generate" && brief
      ? [
          "",
          "",
          "THE APPROVED BRIEF",
          "This was written from the conversation and confirmed before you were",
          "asked to write anything. It is the whole of what was agreed.",
          "",
          "Work inside it. Every fact you need is already in here, written out, so",
          "you do not need to go looking. Anything not in here was not approved by",
          "anybody, and a fact that appears for the first time in the finished",
          "document is exactly the failure this product exists to prevent.",
          "",
          "Craft is still yours. How it is structured, how it reads, how it lands.",
          "The fence is on the facts, not on the writing.",
          "",
          brief,
        ].join("\n")
      : "";

  /* A generate that arrives with no brief is an older client, which today
     means the build on main. It still works, exactly as it did before this
     stage existed. Once main carries the new app this becomes a refusal
     rather than a log line, and then the rule is enforced rather than
     merely followed. */
  if (stage === "generate" && !brief) {
    console.warn("generate ran with no approved brief, company", staff.company_id);
  }

  /* Accepted outside material, handed to the stages that build with it. It
     is kept separate from the company's own sources on purpose: a person
     approved this one by one, from outside the building, and the model
     should credit it that way rather than treating it as company fact. */
  const outsideMaterial = findings
    ? [
        "",
        "",
        "MATERIAL FROM OUTSIDE THE COMPANY, WHICH THEY APPROVED ONE BY ONE",
        "This was found by searching, shown to them with its sources, and accepted.",
        "It is as usable as a company source now. It is not a company source, so say",
        "where it came from wherever it carries weight in the work.",
        "",
        findings,
      ].join("\n")
    : "";

  const stageInstruction =
    (STAGE_PROMPT[stage] ?? STAGE_PROMPT.orient) + pacing + approvedBrief + outsideMaterial;

  /* ----------------------------------------------------------------------
     THE CONTENTS THEMSELVES

     EVERY STAGE SEES THESE, INCLUDING THE FIRST. Until 2026-09-10 the line
     below read `stage !== "interview"`, which meant the interview saw file
     names and one line descriptions and never a word inside them. It then
     asked people for things their own company had already written down, and
     that single line was the reason the whole flow felt blind.

     It looks like it should cost more and it does not, because of the cache
     mark further down. The material is identical on every turn of a
     conversation, so it is written once and read back at about a tenth of
     the price after that. Sending it to the interview as well costs roughly
     one cent a turn and buys the thing the product is actually for.

     It is capped by the company's own ceiling, and that is a ceiling rather
     than a target: 30,000 characters of material sends 30,000 and pays for
     30,000.
     ---------------------------------------------------------------------- */

  /* Per deployment, because it changes per deployment. Anthony, 2026-09-10:
     "if we are deploying in somebody's VPC, it can change." Falls back to the
     constant, so this keeps working before the column exists. */
  const sourceCeiling = Number(company.max_source_chars ?? MAX_SOURCE_CHARS) || MAX_SOURCE_CHARS;

  let sourceContents = "";

  if (readySources.length) {
    const { data: chunks } = await asUser
      .from("knowledge_chunks")
      .select("source_id, content")
      .in("source_id", readySources.map((s) => s.id))
      .order("created_at", { ascending: true });

    if (chunks?.length) {
      const byName = new Map(readySources.map((s) => [s.id, s.name]));
      const parts: string[] = [];
      let budget = sourceCeiling;

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

  /* The model behind conversational predates adaptive thinking and effort,
     and rejects both with a 400. Everything above wants them. A lookup
     rather than a comparison, because only one level is in use today and a
     comparison against it reads as dead code to the type checker while
     still being the right shape for the day routing comes back.

     The cast is the SDK's typings being behind the API. 0.68.0 knows
     thinking as enabled or disabled and not as adaptive, which is the shape
     the model behind standard actually takes. Nothing else in the request
     needs loosening, so this is cast on its own rather than over the whole
     call. */
  const thinkingExtras = ADAPTIVE_THINKING[tier]
    ? {
        thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
        output_config: { effort: "high" as const },
      }
    : {};

  /* ----------------------------------------------------------------------
     THE FIRST GATE, AND IT IS CODED RATHER THAN ASKED FOR

     Anthony: "the rules are not just written just like writtens. They must
     be coded for the model to always obey them."

     So the search tool is not in the request unless this turn IS the
     research turn, and the app only sends that stage after a person has
     pressed approve on screen. Every other turn has no tool at all. There
     is nothing to talk itself into, no instruction to reinterpret, and no
     amount of clever wording gets a model to use a tool it was not given.

     web_fetch rides along because search and fetch are a pair: search finds
     the page, fetch reads it properly. Fetch will only open an address that
     is already in the conversation, so it cannot wander on its own.

     max_uses is a ceiling on one turn, not a leash on the searching itself.
     Anthony: "once the human gives it the go-ahead, it is never limited."
     and, 2026-09-14: "equip the agent with enough instruments so it can be
     very intelligent."

     Raised from 10 and 5 on 2026-09-14. Ten searches is enough to answer one
     question and not enough to do what he actually asked for, which is to
     check a figure in more than one place and follow a lead back to whoever
     published it first. That is three or four searches per figure before it
     has even started.

     THE CEILING STAYS, and it is not timidity. A model that loops can run
     these in a circle, and every one of them is his money. Twenty and twelve
     is a thorough piece of research. It is not a budget to be spent for the
     sake of it, and the prompt says so.

     NOT code_execution. These tool versions do their own filtering with it
     underneath, and declaring a second execution environment confuses the
     model about which one it is in.
     ---------------------------------------------------------------------- */
  const searchTools = stage === "research"
    ? [
        { type: "web_search_20260209", name: "web_search", max_uses: 20 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12 },
      ] as unknown as Anthropic.ToolUnion[]
    : undefined;

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
        /* ------------------------------------------------------------
           THE CACHE MARK, AND WHY IT SITS WHERE IT SITS

           Caching is a prefix match. Everything from the top of the
           prompt down to the mark is cached. Everything after it is
           charged at full price, every single turn.

           Until 2026-09-10 the mark was on `base` alone, with the
           company's material sitting after it. So the material, which is
           by far the largest thing here, was billed in full on every
           analysis and every writing turn. The comment above it claimed
           "about 1 cent". It was about 10.

           So the mark goes on the LAST block that does not change. Both
           `base` and the material are identical on every turn for a given
           company, and only the stage instruction below varies.

           A company with no sources yet has one stable block, so the mark
           lands on `base` and behaves as before.

           AN HOUR, NOT FIVE MINUTES. The life refreshes every time the
           cache is used, and the refresh is free, so this is a sliding
           window from the last message rather than a countdown from the
           first. Five minutes still expires in the middle of a real
           interview, because a person reading a question and thinking
           about the answer routinely takes longer than that, and every
           expiry pays the full write again. Research on document drafting
           puts a real session at 25 to 45 minutes. An hour covers it.

           The cast is the SDK typings being behind the API, the same
           reason `thinking` is cast above. 0.68.0 knows cache_control
           without a ttl. Cast on its own rather than over the whole call.
           ------------------------------------------------------------ */
        const CACHE_MARK = { type: "ephemeral", ttl: "1h" } as unknown as
          Anthropic.CacheControlEphemeral;

        const stable: Anthropic.TextBlockParam[] = [{ type: "text", text: base }];
        if (sourceContents) stable.push({ type: "text", text: sourceContents });
        stable[stable.length - 1].cache_control = CACHE_MARK;

        let final: Anthropic.Message;

        if (stage === "research") {
          /* ------------------------------------------------------------
             THE RESEARCH TURN

             NOT STREAMED, and that is deliberate. A search turn is the
             model going away, running searches, reading pages, and coming
             back. Streamed, the person watches a cursor sit still for
             twenty seconds and assumes it has hung. Whole, they get a
             spinner and then the findings, which is honest about what is
             happening.

             PAUSE_TURN IS NOT AN ERROR. A long server tool run comes back
             with stop_reason "pause_turn" and the work half done. The
             answer is to hand the response back and ask it to carry on.
             Left unhandled it looks exactly like a model that stopped
             mid sentence. Three continuations is enough for a real search
             and stops a loop from running forever.
             ------------------------------------------------------------ */
          const convo = [...messages];
          let fresh = 0, cWrite = 0, cRead = 0, out = 0;
          let text = "";
          const sourcesFound: { url: string; title: string }[] = [];

          for (let round = 0; round < 4; round += 1) {
            const reply = await anthropic.messages.create({
              model: MODEL_ID[tier],
              max_tokens: MAX_OUTPUT.research,
              system: [...stable, { type: "text", text: stageInstruction }],
              messages: convo,
              tools: searchTools,
              ...thinkingExtras,
            });

            fresh += reply.usage?.input_tokens ?? 0;
            cWrite += reply.usage?.cache_creation_input_tokens ?? 0;
            cRead += reply.usage?.cache_read_input_tokens ?? 0;
            out += reply.usage?.output_tokens ?? 0;

            for (const block of reply.content as unknown as Record<string, unknown>[]) {
              if (block.type === "text") text += String(block.text ?? "");

              /* THE SOURCES COME FROM THE TOOL, NOT FROM THE MODEL. A model
                 asked to list where it looked can write a plausible address
                 that never existed. These are the addresses it actually
                 opened, read off the result blocks, so they cannot be
                 invented.

                 A FAILED SEARCH DOES NOT THROW. It comes back as a normal
                 success with an error object where the list should be. On
                 success this content is an array; on failure it is an
                 object. Indexing without checking would make a search that
                 failed read exactly like a search that found nothing, and
                 the model would fill the gap itself. */
              if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
                for (const r of block.content as Record<string, unknown>[]) {
                  const url = String(r.url ?? "").trim();
                  if (url && !sourcesFound.some((x) => x.url === url)) {
                    sourcesFound.push({ url, title: String(r.title ?? url).slice(0, 160) });
                  }
                }
              }
            }

            if (reply.stop_reason !== "pause_turn") { final = reply; break; }
            convo.push({ role: "assistant", content: reply.content });
            final = reply;
          }

          if (sourcesFound.length) {
            text += "\n\nWhere this came from\n" +
              sourcesFound.slice(0, 12).map((x) => `- ${x.title}\n  ${x.url}`).join("\n");
          }

          send("text", { text: text.trim() || "I searched and found nothing usable for this." });

          final = {
            ...(final! ?? {}),
            usage: {
              input_tokens: fresh,
              cache_creation_input_tokens: cWrite,
              cache_read_input_tokens: cRead,
              output_tokens: out,
            },
          } as unknown as Anthropic.Message;
        } else {
          const run = anthropic.messages.stream({
            model: MODEL_ID[tier],
            max_tokens: MAX_OUTPUT[stage] ?? MAX_OUTPUT.generate,
            system: [...stable, { type: "text", text: stageInstruction }],
            messages,
            ...thinkingExtras,
          });

          run.on("text", (chunk: string) => send("text", { text: chunk }));

          final = await run.finalMessage();
        }

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

        /* A one hour cache write costs twice the base input rate. A five
           minute one costs 1.25. We ask for an hour above, so this is 2.
           Getting it wrong is not a rounding error: at 1.25 the company is
           undercharged by a third of every write, which is our money, and
           their budget outlives what they actually spent. */
        const inputTokens = freshInput + cacheWrite * 2 + cacheRead * 0.1;
        const cents = centsFor(tier, inputTokens, outputTokens);

        /* If cacheRead stays at zero over a conversation, the cache is not
           holding and something above the prompt is changing between
           turns. The stage is logged too: working out which stage had
           failed once took reading three screenshots against three output
           token counts, because this line said tier and not stage. */
        console.log(
          `usage stage=${stage} tier=${tier} fresh=${freshInput} cacheWrite=${cacheWrite} ` +
            `cacheRead=${cacheRead} out=${outputTokens} cents=${cents}`,
        );

        if (!exempt && cents > 0) {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          /* One statement, computed in the database. Reading the balance
             here and writing the difference back loses a charge whenever
             two calls finish together, and the read happened at the top of
             this request, a whole model call ago. */
          const { error: spendError } = await admin.rpc("company_spend", {
            p_company_id: staff.company_id,
            p_cents: cents,
          });

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
