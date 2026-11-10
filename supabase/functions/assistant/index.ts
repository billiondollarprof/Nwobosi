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
import { centsExact, clientFor, modelFor, supportsAdaptiveThinking, vendorForCompany, type Vendor } from "../_shared/brain.ts";
import { readPage, SEARCH_TOOL_SCHEMAS, webSearch, MAX_FETCHES, MAX_SEARCHES } from "../_shared/search.ts";
import { knowledgeMap } from "../_shared/knowledgeMap.ts";
/* Each stage's instruction lives in its own file, so one stage can be read
   and changed without scrolling past the others. Anthony, 2026-11-10: each
   stage its own skill. */
import { ORIENT } from "./stages/orient.ts";
import { INTERVIEW } from "./stages/interview.ts";
import { ANALYSE } from "./stages/analyse.ts";
import { RESEARCH } from "./stages/research.ts";
import { BRIEF } from "./stages/brief.ts";
import { GENERATE } from "./stages/generate.ts";

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

   Now the levels are named for what they are FOR, and the mapping from level
   to a real model lives in `_shared/brain.ts`, which is the only place in the
   server that names one. Moving a deployment to another provider is that one
   table plus the company's row in `company_brain`. Nothing else moves, and no
   screen changes at all.

   THE LADDER CAME DOWN FROM FOUR RUNGS TO TWO ON 2026-09-21. Anthony:

     "that place that we did deeper and whatever, we don't even need it,
      because this is for offices. We just need the conversational model,
      and we should call it standard model, or you call it working model,
      or whatever."

   There used to be deeper and deepest above standard. They are gone,
   because an office writes proposals, reports, emails and decks, and
   standard does that work well. A rung above it cost real money per turn
   and changed nothing anybody would notice on the page.

   A COMPANY THAT NEEDS A HEAVIER BRAIN STILL GETS ONE, and this is where
   it is given. Anthony, same day: "those ones are defined during when we
   are deploying it for the company. If we are using Claude, we know that
   the standard model is usually Sonnet. But if we are deploying it for the
   company and I say, oh, they should be able to use even one more higher
   model, like Opus. No problem."

   So it is one row in `company_brain`, set when that company is deployed, and
   it lifts everybody in the company at once. It is never a per person setting
   and never a screen, because the right answer is the same for all of them
   on every job they do.

   WHAT DID NOT CHANGE. The database enum still carries the two retired
   labels. Dropping a value from a Postgres enum means rebuilding the type
   and rewriting two tables, which is a real risk to take for a label
   nothing reads. A row still holding deeper reads as standard through
   levelOf in src/shared/config.js, and this function never reads the
   column at all. See STAFF_TIER below.
   -------------------------------------------------------------------------- */

const LADDER = ["conversational", "standard"] as const;
type Tier = (typeof LADDER)[number];

/* THE MAPPING. The only vendor names in the product, and they are on the
   server, in a function, behind an API key. Swapping provider is now the
   table in `_shared/brain.ts` plus the company's own row. */
/* ⚠️ THE ONE PLACE A MODEL IS NAMED IS NOW _shared/brain.ts, NOT THIS FILE.
   Anthony's design was that moving a deployment to another provider is one
   table. That table is now shared by all eight functions instead of living
   here, and it carries the price beside the model.

   ⚠️ THE VENDOR IS RESOLVED PER REQUEST, further down, and never here. One
   isolate serves several companies at once, so a module level vendor would be
   shared between them and one company's turn could be answered by another
   company's brain. */

/* Dollars per million tokens, per level, held per VENDOR in
   _shared/brain.ts and applied by `centsExact` from there. Used to turn real
   usage into a real number of cents to take off the company's budget.

   ⚠️ THE ARITHMETIC IS NOT DONE IN THIS FILE, AND THAT IS DELIBERATE. It used
   to be, with Anthropic's cache multipliers hardcoded, which quietly overpriced
   every DeepSeek turn. One place applies the rates so one place can be wrong.

   THE RATES ARE STILL NOT MIRRORED IN THE BROWSER. They used to be duplicated
   in src/shared/config.js so an admin screen could print a rate card in
   dollars per million tokens. That is a vendor's pricing and a token count,
   which is exactly the plumbing an admin should never have to read, so the
   screen shows outputs remaining and this stays on the server. */

/* ONE LEVEL FOR THE STAFF SIDE, AND IT IS STANDARD
   There used to be a picker here: cheap for the interview, capable for the
   work, capped by the ceiling the admin set for each person.

   It is gone, deliberately. A model chosen for you is a way for the product
   to be quietly worse than you expected, on a turn you cannot see the
   reason for, with no screen anywhere that would tell you. One good model
   everywhere is predictable, and predictable is the thing a person trusts.

   Since the ladder came down to two rungs this is also the only staff level
   there is, so the line below is now a statement of fact rather than a
   choice being declined. The price table and the metering both stay, and
   they stay per level, because support really does run at a different one
   and its cost has to come off the same budget correctly.

   The ceiling column stays on the row, unread by this function, because
   the enterprise version of this is routing that asks: the prompt stage
   says a step needs more than standard, and the person allows it or does
   not. See DIRECTION.md, "Which model runs which part". */
const STAFF_TIER: Tier = "standard";

/* Which levels take adaptive thinking. The small fast model behind
   conversational predates it and rejects it with a 400; everything above
   expects it. A property of the MODEL, so it lives beside the mapping in
   _shared/brain.ts and is asked for per request below, for whichever vendor
   this company actually runs on. */

/* REVERTED 2026-09-23, LATER THE SAME DAY, AND THE REASON IS THE POINT.

   An agent working in this repository turned thinking off for orient and
   interview on its own. It had found that the interview stage can spend its
   whole 1100 token ceiling thinking and write nothing, and it decided that
   was a fault to fix.

   Anthony did not ask for it, and he was right to be angry about it. The
   interview REASONS. It has to weigh the answers it has just been given and
   work out what is still missing or wrong before it asks the next question.
   Removing that to buy back tokens was a design decision, and design
   decisions here are his.

   So the code is back exactly as he built it. If the ceiling ever does need
   changing, it is asked for first, explained in plain words, and left alone
   until he answers. See CLAUDE.md, "Never change what Anthony designed
   without asking first". */



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
    "THE STEPS ARE A PATH, NOT A SCRIPT",
    "Anthony, 2026-09-23: \"I wanted a system that is just as intelligent as normal",
    "chat, but the only thing is that we now do it guardrails and automated the",
    "prompt.\"",
    "",
    "So the steps below (offer, interview, read back, build) only decide WHEN work gets",
    "made. They never make you less of a conversation. Inside every step:",
    "  - If they ask you something, answer it properly first, the way you would in any",
    "    good conversation. Then carry on with the step you are on.",
    "  - Read the whole conversation above, including your own last message, before you",
    "    answer. The conversation may have been left and opened again hours later. You",
    "    are picking it up, not starting it.",
    "  - \"Continue\", \"carry on\", \"go on\" mean pick up exactly where the conversation",
    "    stopped. Look at what you said last and what was waiting, and do the next",
    "    thing. Never ask them what they mean by it.",
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
    "  - THEY ASKED YOU TO, AND THIS ONE IS NOT YOURS TO WEIGH UP. If somebody says",
    "    look this up, search for it, check what the current figure is, find out who,",
    "    go and research that, then the answer is never no and never later. Say in one",
    "    line what you would go and look for, and raise the marker on that same turn.",
    "    Their request is the whole reason. You do not decide whether the work needs",
    "    it, you do not ask them to confirm they meant it, and you do not tell them",
    "    you cannot. The button is how you say yes.",
    "  - YOU NEED IT. Something public is missing and the work cannot be right without",
    "    it, and this person would only end up searching for it themselves anyway.",
    "",
    "ANY STAGE, ANY MOMENT. Before they have even said what they want made, in the",
    "middle of the questions, on the read back, and after it. There is no point in a",
    "conversation where asking is out of order.",
    "",
    "THEIR OWN FILES FIRST, THE WEB SECOND, AND SAY WHICH.",
    "Everything the company has approved is already in front of you, in full, on every",
    "single turn. So before you ask to go outside, read it. If the answer is in there,",
    "you already have it: say so, name the source it came from, and do not raise the",
    "marker at all. Going to the web for something sitting in their own material wastes",
    "their time and makes the answer worse, because their figure is the one that",
    "applies to them.",
    "Only when you have looked and it genuinely is not there do you ask. And when you",
    "ask, say that in the same line: you checked their material, it is not in there,",
    "here is what you would go and find.",
    "",
    "YOU NEVER SPEND A HANDSHAKE TURN ON IT. YOU RIDE ALONGSIDE ONE.",
    "This is the part that matters most, so read it twice. When a turn is due to end",
    "with OFFER_INTERVIEW, INTERVIEW_COMPLETE, READBACK_COMPLETE or NEED_INPUT, that",
    "marker still goes on the final line. It is what moves the work forward, and a",
    "turn that drops it leaves this person stuck with no way to a document.",
    "",
    "So when you want to search on such a turn, you do BOTH. Put NEED_LOOKUP on its",
    "own line first, then the handshake marker on the final line. They get the offer",
    "or the read back AND a button to send you looking, and they choose which.",
    "",
    "The one exception is INTERVIEW_COMPLETE. Use that on its own, because the very",
    "next thing that runs is the reading stage and it can ask to search itself.",
    "",
    "Never raise it for something only they can know: their deadline, who signs it,",
    "what they decided internally, a figure that lives in their own files. That is a",
    "question for them, not a search.",
    "",
    "Never write a marker in the middle of a sentence, and put nothing after the last",
    "one. One line saying what you want to find and why, then the markers.",
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
/* THE BUILD STAGES WERE RAISED ON 2026-09-23, because the brief was
   failing every single time. Anthony pressed "Go ahead, build it" three
   times and got "The plan for this ran out of room" three times.

   The logs showed why: `usage stage=brief ... out=2000`, twice, exactly on
   the ceiling. On the standard level the model thinks before it writes,
   and the thinking is counted inside max_tokens. At 2000 it spent the whole
   allowance thinking and was cut off before writing one word of the brief.
   The same input gives the same result, so pressing build again could
   never work, it was a loop.

   A ceiling is not a charge. The company pays for what gets written, not
   for the room it was given, so a bigger ceiling on these stages costs
   nothing unless it is used. Orient and interview stay low on purpose, see
   above. research stays under the size the SDK allows without streaming.

   And if a turn still spends everything thinking and writes nothing, see
   streamWithRoomToWrite below. */
const MAX_OUTPUT: Record<string, number> = {
  orient: 1100,
  interview: 1100,
  analyse: 8000,
  research: 8000,
  brief: 8000,
  generate: 16000,
};

/* --------------------------------------------------------------------------
   A TURN THAT ONLY THOUGHT GETS ONE MORE GO, WITHOUT THINKING

   The thinking is counted inside max_tokens. So a model can use its whole
   allowance thinking and stop before it writes anything. The person then
   sees "ran out of room", presses the button again, and gets the same
   thing, because the same input gives the same result. That is exactly
   the loop Anthony hit on the brief, 2026-09-23.

   So when a turn ends on the ceiling having written NOTHING, it is asked
   once more with thinking switched off, and the whole allowance goes to
   the writing. Nothing had reached the screen, so the person never sees
   the first attempt. They just get the answer.

   It does NOT retry when some text was already written. That text is on
   the screen already, and a second answer would land underneath it. A
   reply that stops halfway is handled by the chat, which says so.

   Both calls are paid for, so the usage of both is added together. The
   meter below reads it from here, and charging only the second call would
   let the first one go free.
   -------------------------------------------------------------------------- */
async function streamWithRoomToWrite(
  anthropic: Anthropic,
  request: Anthropic.MessageCreateParamsNonStreaming,
  thinkingExtras: Record<string, unknown>,
  stage: string,
  onText: (chunk: string) => void,
): Promise<Anthropic.Message> {
  let wroteSomething = false;

  const once = async (extras: Record<string, unknown>) => {
    const run = anthropic.messages.stream({ ...request, ...extras });
    run.on("text", (chunk: string) => {
      if (chunk) wroteSomething = true;
      onText(chunk);
    });
    return await run.finalMessage();
  };

  const first = await once(thinkingExtras);

  const thoughtOnly =
    first.stop_reason === "max_tokens" && !wroteSomething && "thinking" in thinkingExtras;
  if (!thoughtOnly) return first;

  console.warn(
    `stage=${stage} spent its whole ceiling thinking and wrote nothing, asking again without thinking`,
  );

  /* SAID OUT LOUD RATHER THAN LEFT OUT. Anthony, 2026-09-23, choosing this
     from four options: "you can do D."

     This line used to pass an empty object, which only OMITS the thinking
     setting and hopes the model reads that as off. It does not. His own logs
     proved it: the retry fired four times and failed twice, and a failed
     retry is billed at exactly twice the stage's ceiling, so the second go
     spent its whole allowance thinking too and wrote nothing either. The
     person then got "ran out of room" after being charged for two attempts.

     disabled is the shape 0.68.0 knows, so the intent written above is now
     what is actually sent, and the whole ceiling goes to the words.

     WHAT DID NOT CHANGE, on purpose: thinking is still ON for the first
     attempt on every stage, including the interview. The interview reasons,
     which is what makes it able to weigh the answers it has just been given
     and work out what is still missing. This is the rescue, not the rule. It
     fires only when a turn spent everything thinking and wrote nothing, and
     nothing had reached the screen, so the person never sees the first
     attempt and never has to type anything. They just get their answer. */
  const second = await once({ thinking: { type: "disabled" } });
  const a = first.usage ?? ({} as Anthropic.Usage);
  const b = second.usage ?? ({} as Anthropic.Usage);
  return {
    ...second,
    usage: {
      ...b,
      input_tokens: (a.input_tokens ?? 0) + (b.input_tokens ?? 0),
      cache_creation_input_tokens:
        (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
      cache_read_input_tokens:
        (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
      output_tokens: (a.output_tokens ?? 0) + (b.output_tokens ?? 0),
    },
  } as Anthropic.Message;
}

/* The interview gets five questions. The prompt asks for three to five and
   the app enforces the ceiling, but a model that knows its last turn has
   arrived closes cleanly instead of being cut off mid question. */
const MAX_INTERVIEW_TURNS = 5;


/* What this particular turn is for. Appended after the cached base so the
   prefix above stays byte identical across stages. */
const STAGE_PROMPT: Record<string, string> = {
  orient: ORIENT,
  interview: INTERVIEW,
  analyse: ANALYSE,
  research: RESEARCH,
  brief: BRIEF,
  generate: GENERATE,
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

/* --------------------------------------------------------------------------
   THE KNOWLEDGE MAP DECIDES WHAT A TURN READS

   Anthony, 2026-11-10: "A turn needs the knowledge map, not everything. So
   the knowledge map tells the turn what to look at... if it needs
   everything, then it reads everything. Depends on the context."

   HOW. Under SELECT_ABOVE_CHARS of company text, every turn reads all of
   it: small, and the cache makes it nearly free. Above it, one quick call
   to the small model reads the map and the conversation and names the
   sources the work needs, or answers ALL. Only those are read in full; the
   map still lists everything, so nothing is hidden from view.

   WHEN IT CHOOSES. On the first stage and at the read back, the two points
   where the direction is set or settled. Every other turn reuses the last
   choice, which the app sends back (body.sources). Reusing it keeps the
   prompt identical from turn to turn, so the cache keeps holding.

   ⚠️ IT FAILS OPEN, TO EVERYTHING. A slow call, an error, an answer naming
   nothing it recognises: all of them read every source, which is exactly
   what happened before this existed. Choosing can save money; it must never
   cost an answer.
   -------------------------------------------------------------------------- */
const SELECT_ABOVE_CHARS = 20000;
const SELECT_TIMEOUT_MS = 8000;

async function chooseSources(
  vendor: Vendor,
  map: string,
  names: string[],
  conversation: unknown[],
): Promise<{ chosen: string[] | null; cents: number }> {
  try {
    const recent = conversation.slice(-8).map((m) => {
      const msg = m as { role?: string; content?: unknown };
      const text = typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
        ? msg.content.map((b) => (b as { text?: string }).text ?? "").join(" ")
        : "";
      return `${msg.role === "assistant" ? "ASSISTANT" : "PERSON"}: ${text.slice(0, 1500)}`;
    }).join("\n\n").slice(-8000);

    const call = clientFor(vendor).messages.create({
      model: modelFor(vendor, "conversational"),
      max_tokens: 300,
      thinking: { type: "disabled" },
      system: "You choose which of a company's sources a piece of work needs. Reply with the exact source names, one per line, and nothing else. If the work needs most of them, or you cannot tell, reply with the single word ALL.",
      messages: [{
        role: "user",
        content: `${map}\n\nTHE CONVERSATION SO FAR, latest last:\n${recent}\n\nWhich sources must be read in full for the next reply and the work it leads to?`,
      }],
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SELECT_TIMEOUT_MS));
    const result = await Promise.race([call, timeout]);
    if (!result) return { chosen: null, cents: 0 };

    const usage = (result as Anthropic.Message).usage;
    const cents = centsExact(vendor, "conversational", {
      fresh: usage?.input_tokens ?? 0,
      output: usage?.output_tokens ?? 0,
    });
    const text = (result as Anthropic.Message).content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    if (/^\s*ALL\s*$/im.test(text)) return { chosen: null, cents };

    const lower = new Map<string, string>(names.map((n) => [n.trim().toLowerCase(), n] as [string, string]));
    const found: string[] = [];
    for (const line of text.split("\n")) {
      const key = line.replace(/^[\s*\-\d.)]+/, "").replace(/[*_`"]/g, "").trim().toLowerCase();
      const name = lower.get(key);
      if (name && !found.includes(name)) found.push(name);
    }
    const chosen: string[] = found;
    return { chosen: chosen.length ? chosen : null, cents };
  } catch (err) {
    console.warn("could not choose sources, reading all", err instanceof Error ? err.message : err);
    return { chosen: null, cents: 0 };
  }
}

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

  /* ----------------------------------------------------------------------
     THE SEARCH GATE, ENFORCED HERE AND NOT ONLY IN THE CHAT

     Anthony, 2026-09-23: "intelligent assistant and the check points are
     hard wired, must take permission before searching the Internet."

     The search tools are only attached on the research stage, and the chat
     only asks for that stage after the person presses "Yes, go and look."
     But that was the browser's word for it, and this function does not
     trust a browser. So the research stage is refused unless the person's
     own last message IS that yes. A request that skips the button, from a
     bug, an old tab or somebody poking at the API, never reaches the web.
     ---------------------------------------------------------------------- */
  if (stage === "research") {
    const last = messages[messages.length - 1] as { role?: string; content?: unknown } | undefined;
    const saidYes = last?.role === "user" && typeof last.content === "string" &&
      last.content.trim() === "Yes, go and look.";
    if (!saidYes) {
      console.warn("research asked for without the person's yes; refused");
      return json({ ok: false, reason: "Searching needs your yes first. Press Yes, go and look." }, 403);
    }
  }

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

  /* WHICH BRAIN, READ PER REQUEST. Never cached, because one isolate serves
     several companies at once. Falls back to Anthropic on any error, including
     the table not being there, so this can ship before the migration does. */
  const vendor = await vendorForCompany(staff.company_id);

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
     RULE 3B: THE ADMIN'S OWN LIMITS, ENFORCED HERE AND NOT ONLY ON SCREEN

     Anthony, 2026-11-10: admin control, a weekly limit as well as daily,
     pause and resume a person, and who is active. Until today the daily
     limit was only counted in the browser, so nothing actually stopped
     anybody. Now it is checked here, where a browser cannot reach.

       PAUSED      every turn is refused, in plain words.
       DAILY       documents made today (UTC) against staff.daily_limit.
       WEEKLY      documents made in the last seven days against
                   staff.weekly_limit, when the admin set one.
     A document counts when it is finished (one work_history row), and the
     check runs where a build starts, the brief stage, so a conversation is
     never cut off halfway through a question.

     ALL OF IT IS TOLERANT OF THE COLUMNS NOT EXISTING YET (migration
     20261110130000_admin_control.sql). A missing column reads as no
     pause and no weekly limit, which is exactly how it behaved before.

     And the person is marked as seen just now, for "active now" on the
     admin's People screen. Fire and forget: it never holds up a turn.
     ---------------------------------------------------------------------- */
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: myRow } = await serviceClient.from("staff").select("*").eq("id", user.id).maybeSingle();
  const mine = (myRow ?? {}) as Record<string, unknown>;

  serviceClient.from("staff").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id)
    .then(({ error }: { error: { code?: string; message?: string } | null }) => { if (error && error.code !== "42703" && error.code !== "PGRST204") console.warn("could not mark seen", error.message); });

  if (mine.paused_at) {
    return json({
      ok: false,
      reason: "paused",
      message: "Your access is paused for now. Ask your admin to turn it back on.",
    }, 403);
  }

  /* Anthony, 2026-11-10: "let admin not get any limits. The cap is just
     the $2." Staff: every document built counts, new or changed. */
  const isAdmin = staff.access_level === "admin";

  if (stage === "brief" && !isAdmin) {
    const dailyLimit = Number(staff.daily_limit ?? mine.daily_limit ?? 0) || 0;
    const weeklyLimit = Number(mine.weekly_limit ?? 0) || 0;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const { data: made } = await serviceClient
      .from("work_history")
      .select("created_at")
      .eq("staff_id", user.id)
      .gte("created_at", weekAgo.toISOString());
    /* ONE COUNT. Anthony, 2026-11-10, his final word: "to keep it simple,
       the edit should count as part of it... whether it is an edit or new,
       all of them count towards that 20 limit for the staff." */
    const isToday = (r: { created_at?: unknown }) => new Date(r.created_at as string) >= startOfToday;
    const thisWeek = (made ?? []).length;
    const today = (made ?? []).filter(isToday).length;

    if (dailyLimit > 0 && today >= dailyLimit) {
      return json({
        ok: false,
        reason: "daily_limit",
        message: `You have made ${today} ${today === 1 ? "document" : "documents"} today, which is your daily limit. ` +
          "It starts again tomorrow, or ask your admin for more.",
      }, 429);
    }
    if (weeklyLimit > 0 && thisWeek >= weeklyLimit) {
      return json({
        ok: false,
        reason: "weekly_limit",
        message: `You have made ${thisWeek} documents this week, which is your weekly limit. ` +
          "Ask your admin if you need more.",
      }, 429);
    }
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
    .select("id, name, description, status, kind, location")
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

  /* Which sources this turn reads in full: null means all of them. Sent to
     the app with meta so the next turn can reuse the choice. */
  let chosenSources: string[] | null = null;
  let selectionCents = 0;

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

      /* THE KNOWLEDGE MAP goes first, so the model can find the right
         source by name before it reads the text. Built from every word each
         source holds, before the ceiling above trims anything, so it is
         honest about what exists even when not all of it is sent. */
      const fullText = new Map<string, string>();
      for (const chunk of chunks) {
        fullText.set(chunk.source_id, (fullText.get(chunk.source_id) ?? "") + "\n" + String(chunk.content ?? ""));
      }
      const map = knowledgeMap(
        readySources.map((s) => ({ name: s.name, description: s.description, kind: s.kind, location: s.location, text: fullText.get(s.id) ?? "" })),
        { colour: company.brand_color as string | null, from: (company as Record<string, unknown>).brand_color_source as string | null },
      );

      /* WHICH SOURCES THIS TURN READS IN FULL. See chooseSources. */
      const allNames = readySources.map((s) => s.name as string);
      const totalChars = [...fullText.values()].reduce((n, t) => n + t.length, 0);
      const askedFor = Array.isArray(body?.sources)
        ? (body.sources as unknown[]).filter((n): n is string => typeof n === "string" && allNames.includes(n))
        : [];
      if (totalChars > SELECT_ABOVE_CHARS) {
        if (stage === "orient" || stage === "analyse" || askedFor.length === 0) {
          const picked = await chooseSources(vendor, map, allNames, messages as unknown[]);
          chosenSources = picked.chosen;
          selectionCents = picked.cents;
        } else {
          chosenSources = askedFor;
        }
      }
      if (chosenSources) {
        const keep = new Set(readySources.filter((s) => chosenSources!.includes(s.name)).map((s) => s.id));
        parts.length = 0;
        let left = sourceCeiling;
        for (const chunk of chunks) {
          if (left <= 0 || !keep.has(chunk.source_id)) continue;
          const slice = String(chunk.content ?? "").slice(0, left);
          if (!slice.trim()) continue;
          left -= slice.length;
          parts.push(`--- FROM: ${byName.get(chunk.source_id) ?? "a company source"} ---\n${slice}`);
        }
      }

      if (parts.length) {
        sourceContents = [
          "",
          map,
          "Use the map to find the right source, then read that source below. Do not",
          "read the map out to people; name a source only when it matters.",
          ...(chosenSources
            ? [
                `Only these are below in full, chosen for this work: ${chosenSources.join(", ")}.`,
                "The others are in the map only. If the work turns out to need one of them,",
                "say which by its exact name in one line, and it will be read next turn.",
              ]
            : []),
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

  const anthropic = clientFor(vendor);

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
  /* ⚠️ THESE TWO STAGES DO NOT ASK FOR THINKING, AND HERE IS WHY. 2026-09-25.

     Anthony's walkthrough died at the first interview question. His logs:

       stage=orient spent its whole ceiling thinking and wrote nothing,
       asking again without thinking

     `orient` and `interview` are capped at 1100 tokens on purpose, so the
     model cannot write the document instead of asking a question. Thinking is
     counted INSIDE that same 1100. DeepSeek's documentation says thinking is
     ON by default with effort high, so the reasoning took the whole allowance
     and there was nothing left to write a question with, on EVERY turn. The
     rescue below caught it and asked again with thinking off, which worked.
     But it meant every orient and interview turn was two model calls, the
     first one paid for in full and thrown away. The reasoning was never used.
     It was only ever bought and discarded.

     ⚠️ ASKING FOR LOW EFFORT WAS TRIED FIRST AND IT DID NOT WORK. Deployed at
     13:36 on 2026-09-25 and the rescue fired again eleven seconds later,
     proven from the log rather than assumed. DeepSeek's "low" is still more
     thinking than a 1100 token cap can hold.

     ⚠️ THINKING IS TURNED OFF HERE ON ANTHONY'S INSTRUCTION, not an agent's
     judgement. 2026-09-25: "maybe turning off thinking for those stages is
     best. but if it doesn't lead to producing good work, then I will ask you
     to turn it on." An earlier agent made this same change unasked on
     2026-09-23 and he refused it, correctly, because the interview reasons.
     THE REASON IT IS RIGHT NOW AND WAS NOT THEN: on a vendor whose thinking is
     on by default, the reasoning never survives these two stages anyway. It is
     bought and thrown away on every single turn, so nothing is lost by not
     buying it. It is one line to put back.

     ⚠️ AND THE RESCUE BELOW STAYS, for every other stage and for any vendor
     where a small-cap stage still starves. It is the net, not the rule. */
  const TIGHT_STAGES = ["orient", "interview"];
  const thinkingForStage = TIGHT_STAGES.includes(stage)
    ? { thinking: { type: "disabled" } as unknown as Anthropic.ThinkingConfigParam }
    : {
        thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
        output_config: { effort: "high" as const },
      };

  const thinkingExtras = supportsAdaptiveThinking(vendor, tier) ? thinkingForStage : {};

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

     THE CEILINGS ARE ENFORCED BY THIS FUNCTION NOW. They used to be passed
     to Anthropic as `max_uses` on its hosted tools, and Anthropic counted
     them. The tools are ours as of 2026-09-25, so the counting is ours too:
     `MAX_SEARCHES` and `MAX_FETCHES` in `_shared/search.ts`, applied in the
     research loop below. A ceiling that is only a sentence in a prompt is a
     suggestion, and the whole reason these tools are declared here rather
     than in `_shared` is that this stage is the only place allowed to have
     them.

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
     ---------------------------------------------------------------------- */
  const searchTools = stage === "research"
    ? (SEARCH_TOOL_SCHEMAS as unknown as Anthropic.ToolUnion[])
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
      send("meta", { tier, stage, sources: chosenSources });

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

             THE TOOLS ARE OURS NOW, AND THAT IS THE WHOLE POINT. Until
             2026-09-25 `web_search` and `web_fetch` were Anthropic's hosted
             tools, so Anthropic ran them on its side and handed back
             `web_search_tool_result` blocks. That worked on Anthropic and did
             NOTHING AT ALL on DeepSeek, silently: the stop reason was never
             `pause_turn`, so the loop below gave up on its first round and no
             result block ever arrived. Anthony's instruction: "can't there be
             a search tool usable for any model not just anthropic or
             DeepSeek". Now the model asks, `_shared/search.ts` runs it, and
             the answer goes back as an ordinary tool result. One path, every
             vendor, and the search cannot work on one company's brain and
             quietly fail on the next one's.

             A FAILED SEARCH IS NOT AN EMPTY ONE. "That search failed" and
             "nothing is published on this" are different facts. Reporting the
             first as the second is how a document ends up carrying a number
             nobody published, so the reason is passed through in words and
             the model is told which of the two it is holding.
             ------------------------------------------------------------ */
          const convo = [...messages];
          let fresh = 0, cWrite = 0, cRead = 0, out = 0;
          let text = "";
          let searches = 0, fetches = 0;
          const sourcesFound: { url: string; title: string }[] = [];

          /* THE ROUND CAP IS A BACKSTOP, NOT THE BUDGET. The budget is the
             search and fetch ceilings below, because those are the numbers
             the prompt promises the person and the numbers that cost money.
             Rounds exist only so a model that keeps asking forever cannot
             hold the request open past the plan's time limit. */
          for (let round = 0; round < 12; round += 1) {
            const reply = await anthropic.messages.create({
              model: modelFor(vendor, tier),
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
            final = reply;

            const blocks = reply.content as unknown as Record<string, unknown>[];
            const asked: Record<string, unknown>[] = [];

            for (const block of blocks) {
              if (block.type === "text") text += String(block.text ?? "");
              if (block.type === "tool_use") asked.push(block);
            }

            /* Nothing asked for means it has finished looking and is writing
               up. The stop reason is deliberately not consulted: it differs
               by vendor, and the presence of a tool call does not. */
            if (!asked.length) break;

            convo.push({ role: "assistant", content: reply.content });

            /* EVERY CALL GETS AN ANSWER, INCLUDING THE REFUSED ONES. A vendor
               speaking OpenAI's format rejects the NEXT request outright if an
               assistant turn carries tool calls with no tool results after
               them, so one skipped answer breaks the whole turn rather than
               the one call. */
            const results: Record<string, unknown>[] = [];

            for (const call of asked) {
              const id = String(call.id ?? "");
              const name = String(call.name ?? "");
              const input = (call.input ?? {}) as Record<string, unknown>;
              let content: string;

              if (name === "web_search") {
                if (searches >= MAX_SEARCHES) {
                  content =
                    "The ceiling on searches for this turn has been reached. Use web_fetch on an address you already have, or write up what you have found.";
                } else {
                  searches += 1;
                  const found = await webSearch(String(input.query ?? ""));
                  console.log(
                    `research search=${searches} fetches=${fetches} provider=${found.provider} ` +
                      `ok=${found.ok} hits=${found.hits.length}${found.reason ? ` reason=${found.reason}` : ""}`,
                  );

                  if (!found.ok) {
                    content = `That search failed (${found.reason}). This is a failure, not an absence of information: do not treat the subject as having nothing published on it, and do not fill the gap from memory.`;
                  } else if (!found.hits.length) {
                    content = "That search found nothing at all. Try different words, or a different angle on it.";
                  } else {
                    for (const hit of found.hits) {
                      if (!sourcesFound.some((x) => x.url === hit.url)) {
                        sourcesFound.push({ url: hit.url, title: hit.title.slice(0, 160) });
                      }
                    }
                    content = found.hits
                      .map((hit, i) =>
                        `${i + 1}. ${hit.title}\n   ${hit.url}${hit.snippet ? `\n   ${hit.snippet}` : ""}`)
                      .join("\n\n");
                  }
                }
              } else if (name === "web_fetch") {
                if (fetches >= MAX_FETCHES) {
                  content =
                    "The ceiling on opening pages for this turn has been reached. Write up what you have.";
                } else {
                  fetches += 1;
                  const page = await readPage(String(input.url ?? ""));
                  console.log(
                    `research fetch=${fetches} ok=${page.ok}${page.ok ? ` chars=${page.text.length}` : ` reason=${page.reason}`}`,
                  );

                  if (!page.ok) {
                    content = `That page could not be read (${page.reason}). That is the page failing to load, not the page disagreeing with you.`;
                  } else {
                    if (!sourcesFound.some((x) => x.url === page.url)) {
                      sourcesFound.push({ url: page.url, title: page.title });
                    }
                    content = `${page.title}\n${page.url}\n\n${page.text}`;
                  }
                }
              } else {
                content = `There is no tool called ${name}. The only two are web_search and web_fetch.`;
              }

              results.push({ type: "tool_result", tool_use_id: id, content });
            }

            convo.push({ role: "user", content: results });
          }

          /* THE SOURCES COME FROM WHAT THIS FUNCTION RECEIVED, NOT FROM THE
             MODEL. A model asked to list where it looked can write a
             plausible address that never existed. These are the addresses it
             actually searched and actually opened, read off the results
             above, so they cannot be invented. */
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
          final = await streamWithRoomToWrite(
            anthropic,
            {
              model: modelFor(vendor, tier),
              max_tokens: MAX_OUTPUT[stage] ?? MAX_OUTPUT.generate,
              system: [...stable, { type: "text", text: stageInstruction }],
              messages,
            },
            thinkingExtras,
            stage,
            (chunk: string) => send("text", { text: chunk }),
          );
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

        /* ⚠️ THE RATE TABLE WAS MADE PER VENDOR AND THIS LINE KEPT ANTHROPIC'S
           NUMBERS HARDCODED. It read `fresh + cacheWrite * 2 + cacheRead * 0.1`
           whatever vendor was answering. Two is Anthropic's one hour cache
           write, and a tenth is Anthropic's cache read. DeepSeek charges ONE
           for a write and a FIFTIETH for a read, and `_shared/brain.ts` has
           held both of those since the table was built, with
           `billableDollars` applying them.

           So the arithmetic is no longer done here at all. `centsExact` takes
           the four counts and applies the right vendor's numbers, which is
           also what `support-ask` has always done, so the two now agree.

           `long` because the assistant is the one stage that asks for a one
           hour cache. It is ignored by vendors that bill a write as a miss. */
        const cents = centsExact(vendor, tier, {
          fresh: freshInput,
          cacheWrite,
          cacheRead,
          output: outputTokens,
        }, "long");

        /* If cacheRead stays at zero over a conversation, the cache is not
           holding and something above the prompt is changing between
           turns. The stage is logged too: working out which stage had
           failed once took reading three screenshots against three output
           token counts, because this line said tier and not stage. */
        console.log(
          `usage stage=${stage} tier=${tier} fresh=${freshInput} cacheWrite=${cacheWrite} ` +
            `cacheRead=${cacheRead} out=${outputTokens} cents=${cents} ` +
            `chose=${chosenSources ? chosenSources.length : "all"} chooseCents=${selectionCents}`,
        );

        /* The small call that chose the sources is charged too. */
        const charge = cents + selectionCents;

        if (!exempt && charge > 0) {
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
            p_cents: charge,
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
