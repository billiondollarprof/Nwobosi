/* ==========================================================================
   SPLITTING WHAT THE SEARCH FOUND INTO THINGS THAT CAN BE PICKED

   Anthony, 2026-09-14: "the permission to use the data is supposed to offer
   a third option should the person agrees with some of the search results
   but not all, so they get to say which."

   Yes and no were the only two answers, and a search usually comes back with
   more than one thing. Two right figures and one wrong one meant throwing
   away all three, or taking the wrong one with the others.

   To pick one, the app has to know where one ends and the next begins. The
   research stage writes prose, so this file decides.

   TWO WAYS, IN ORDER, AND THE SECOND ALWAYS WORKS
   -----------------------------------------------
     1. A line reading [FINDING] starts a new one. This is what the research
        prompt asks for, and it is exact.
     2. Failing that, a blank line starts a new one. Prose written for a
        person naturally puts one idea per paragraph, so this is close
        enough to be useful, and it is never worse than the single block
        that was there before.

   The second one is not a stopgap waiting to be deleted. The model can miss
   an instruction on any turn, and the day it does, a person must still get
   a list they can tick rather than a broken screen.

   WHAT IS NEVER A FINDING
   -----------------------
   The "Where this came from" block at the end. The edge function appends
   that itself, from the search results, after the model has finished. It is
   a list of links, not a claim, and offering somebody a tick box against it
   would be asking them to approve a bibliography.

   NOTHING HERE DECIDES ANYTHING
   -----------------------------
   This file splits text. It does not judge, score, rank, or drop a finding
   for being weak. What the search found is what the person sees, in the
   order it was written. Quietly hiding one would be this product doing the
   exact thing it exists to stop.
   ========================================================================== */

/* The line the research prompt is asked to put before each finding. Kept
   here rather than in the prompt file so that the two can never drift: this
   is the one definition, and the edge function's copy is checked against it
   by hand when either changes. */
export const FINDING_MARK = "[FINDING]";

/* The heading the edge function writes above the link list it appends. If
   that string ever changes there, it changes here, and the test in
   findings.test.mjs fails loudly rather than the block quietly becoming a
   tickable finding. */
const SOURCES_HEADING = "Where this came from";

/* A floor, and it applies ONLY when there is no mark to go on.

   THE BUG THIS NUMBER CAUSED, 2026-09-14. It was 25 and it applied to
   everything, including findings the model had explicitly marked. So
   "Deadline 31 March." (18 characters) was thrown away without a word. A
   file whose header says "never hide a finding" was hiding them, and only a
   test with short findings in it caught that.

   Where the model marked its own findings, its judgement is the answer and
   nothing here second guesses it: anything non empty is a finding, however
   short. This floor exists only for the fallback, where paragraphs are
   being guessed at and a stray "Sources:" left on its own line would
   otherwise become a row somebody has to tick. */
const MIN_FALLBACK_CHARS = 12;

/* --------------------------------------------------------------------------
   SECTION 1: Splitting

   Returns a list of { id, text }. The id is the index, which is stable for
   as long as the card is on screen and is never stored anywhere, because
   what gets kept is the text itself.
   -------------------------------------------------------------------------- */

export function splitFindings(raw) {
  const body = withoutSourceList(typeof raw === "string" ? raw : "");
  if (!body.trim()) return [];

  const marked = body.includes(FINDING_MARK);
  const parts = marked ? byMark(body) : byBlankLine(body);

  /* Marked: the model said where the boundaries are, so the only thing
     dropped is genuinely empty. Unmarked: the boundaries are a guess, so a
     scrap too short to be a claim is dropped rather than offered. */
  const floor = marked ? 1 : MIN_FALLBACK_CHARS;

  return parts
    .map((text) => text.trim())
    .filter((text) => text.length >= floor)
    .map((text, id) => ({ id, text }));
}

function byMark(body) {
  return body
    .split(FINDING_MARK)
    /* Anything before the first mark is the model's own preamble, not a
       finding, so it goes. */
    .slice(1);
}

function byBlankLine(body) {
  return body.split(/\n\s*\n/);
}

/* --------------------------------------------------------------------------
   SECTION 2: Keeping the link list out of it

   Cuts from the heading to the end. Matched at the start of a line so the
   same words inside a sentence cannot truncate a real finding.
   -------------------------------------------------------------------------- */

function withoutSourceList(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.trim() === SOURCES_HEADING);
  return at === -1 ? text : lines.slice(0, at).join("\n");
}

/* --------------------------------------------------------------------------
   SECTION 3: What gets kept

   Takes the whole list and the ids that are ticked, and returns the text of
   the ticked ones only. Nothing else is carried: an unticked finding leaves
   no trace, which is Anthony's rule from the day the gate was built.
   -------------------------------------------------------------------------- */

export function chosenText(findings, chosenIds) {
  const wanted = new Set(chosenIds);
  return findings.filter((f) => wanted.has(f.id)).map((f) => f.text);
}

/* --------------------------------------------------------------------------
   SECTION 4: Keeping the mark off the screen

   The mark is plumbing. It tells the app where one finding ends, and a
   person reading what the search found should never see it. Anything that
   renders the research text raw has to go through this first.

   Blank the line rather than deleting it, then collapse the run of blank
   lines it leaves, so two findings do not end up jammed together.
   -------------------------------------------------------------------------- */

export function withoutMarks(text) {
  return String(text ?? "")
    .split("\n")
    /* A line that is ONLY the mark goes entirely, so the gap between two
       findings stays one blank line rather than becoming two. */
    .filter((line) => line.trim() !== FINDING_MARK)
    /* A mark with the finding on the same line keeps the line and loses the
       mark. The prompt asks for it on its own line; this is what happens on
       the turn the model puts it inline instead, and it must not leave the
       plumbing showing. */
    .map((line) => (line.includes(FINDING_MARK) ? line.split(FINDING_MARK).join("").trimStart() : line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* --------------------------------------------------------------------------
   SECTION 5: A short label for a long finding

   The tick list shows the whole finding, because a person cannot approve
   what they cannot read. This is only for the places a single line is all
   there is room for.
   -------------------------------------------------------------------------- */

export function shortLabel(text, max = 90) {
  const oneLine = String(text ?? "").replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  /* max means max. Cutting at max and then adding three dots produces
     something three characters longer than the caller asked for, which is
     how a label overflows the box it was measured for. */
  return `${oneLine.slice(0, max - 3).trimEnd()}...`;
}
