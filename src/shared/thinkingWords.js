/* ==========================================================================
   WHAT IT SAYS WHILE IT IS WORKING

   Anthony, 2026-09-10: "if it's still thinking or analyzing, there's no way
   a person knows, it should be showing analyzing..., getting ready... etc
   even cooking... and all that just like you do in this chat. so a person
   can know it's still working and wait for it."

   Before this there were three grey dots. A dot cannot tell you whether it
   has been reading your files for two seconds or has been dead for two
   minutes, so the only honest reading of a dot is "something might be
   happening", and people do not wait for that. They press the button again.

   THE ONE RULE HERE: NEVER SAY ANYTHING THAT IS NOT TRUE.

   This is a progress line, not a progress bar. A bar has to claim it is 60%
   done, and nothing in this product knows that, so it would be inventing a
   number in a product whose whole argument is that it does not invent. What
   IS known is which stage is running and how long it has been running, and
   both of those are worth saying out loud.

   So the words come from the stage, and they advance with time. Nothing
   here counts anything down, and nothing promises it is nearly finished.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: The words, per stage

   WRITTEN AS THE ASSISTANT TALKING. Anthony, 2026-11-11: the line should
   read "as if it's in the chat", not like a status log. So each one is a
   sentence it would say, first person where it fits, ending in "…".

   "RESPONDING IN A BIT" COMES FIRST. Anthony, 2026-11-10: something has to
   be on screen within about two seconds, so a person is never left
   wondering whether it heard them. "It doesn't leave somebody hanging."
   The three stages a person talks to open with it, then say what they are
   actually doing.

   Three lines each, shown in order. The last one repeats for as long as the
   turn runs, so it never runs out of things to say and never starts lying.

   Written in the same plain English as every other screen. No "analysing
   embeddings", no "querying the vector store", no stage name leaking out.
   A person reading these should learn what it is doing, not what it is
   built from.
   -------------------------------------------------------------------------- */

const WORDS = {
  /* Reading the request against everything the company has. */
  orient: ["Responding in a bit…", "Reading through your files…", "Looking at what you already have…", "Still reading…"],
  /* Working out the few questions worth asking. */
  interview: ["Responding in a bit…", "Thinking about what to ask you…", "Still thinking…"],
  /* Checking what it has and what is missing, then reading back. */
  analyse: ["Responding in a bit…", "Checking what I have against your files…", "Working out what is missing…", "Still checking…"],
  /* The only stage that goes outside. Says so, because a person who
     approved a search should see it happening. */
  research: ["Searching online…", "Reading what I found…", "Still looking…"],
  /* Writing the plan the document is built from. */
  brief: ["Writing the plan…", "Getting the plan right…", "Still writing the plan…"],
  /* The document itself. */
  generate: ["Writing your document…", "Putting it together…", "Still writing…"],
};

/* Anything unrecognised. Never left to crash, and never left blank: a blank
   line here is the three dots again. */
const FALLBACK = ["Working on it…", "Still working…", "Still working…"];

/* How long each line holds before the next one. Long enough to read, short
   enough that the screen never looks frozen. */
export const WORD_HOLD_MS = 7000;

/* --------------------------------------------------------------------------
   SECTION 2: Picking the line

   Pure, and takes the elapsed time as an argument rather than reading a
   clock. That is what makes it testable: the same milliseconds always give
   the same words, with no waiting around in a test for seven seconds to
   find out.
   -------------------------------------------------------------------------- */

export function thinkingWord(stage, elapsedMs = 0, { stalled = false, retrying = false } = {}) {
  /* The first try failed before a word came back and it is asking again,
     once, on its own. Said plainly so nobody presses send a second time. */
  if (retrying) return "That did not come back, so I am trying again…";
  /* Said only after the request has gone quiet for a long time, and it is
     the one line that is about the connection rather than the work. It
     stops short of claiming anything has failed, because at this point
     nothing has: the turn is still running and still worth waiting for. */
  if (stalled) return "This is taking longer than usual…";

  const list = WORDS[stage] ?? FALLBACK;
  const step = Math.floor(Math.max(0, elapsedMs) / WORD_HOLD_MS);
  return list[Math.min(step, list.length - 1)];
}

/* Every line this can ever show, so a test can check the whole surface
   rather than the handful somebody thought of. */
export function everyThinkingWord() {
  return [...new Set([...Object.values(WORDS).flat(), ...FALLBACK, "This is taking longer than usual…", "That did not come back, so I am trying again…"])];
}
