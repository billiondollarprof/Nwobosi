/* ==========================================================================
   WHICH FILE THE WORK BECOMES, DECIDED BEFORE A WORD IS WRITTEN

   WHY BEFOREHAND AND NOT AFTER
   Anthony, 2026-09-21: "the first thing the agent should do is to produce
   it in a file that the agent thinks is the best for that kind of work.
   Except it interviewed you and asks you what type of file output would
   you want."

   So the format is a decision made during the conversation, not a row of
   buttons offered afterwards. Either it asks while it still matters, or it
   picks the one that fits and says which. Either way the file that lands
   is the right kind, first time.

   Changing your mind afterwards still works and always will, because
   converting a finished document invents nothing. That is formatAsked.js,
   and it is the other half of this.

   HOW IT TRAVELS
   The read back ends with a line saying which file it will make, and the
   app reads it off. Same mechanism as every other handshake in this flow:
   the model says, the app decides what to do about it.

   THE DEFAULT IS A WORD DOCUMENT, and that is not arbitrary. This is built
   for offices, legal firms and banks, and Anthony's own words: "what
   offices use the most are usually Word document or PDF documents." Of
   those two, Word is the one you can still edit, so it is the safer thing
   to land on when nothing was said.
   ========================================================================== */

/* The four the app can actually build. Anything else the model might say
   lands on the nearest of these rather than failing. */
const KNOWN = {
  docx: ["docx", "word", "doc"],
  pdf: ["pdf"],
  pptx: ["pptx", "ppt", "powerpoint", "slides", "deck", "presentation"],
  xlsx: ["xlsx", "xls", "excel", "spreadsheet", "sheet", "csv"],
};

export const DEFAULT_FORMAT = "docx";

/* What to call each one to a person. "docx" is a file extension and nobody
   says it out loud. */
export const FORMAT_NAMES = {
  docx: "a Word document",
  pdf: "a PDF",
  pptx: "slides",
  xlsx: "a spreadsheet",
};

/* Short, for a button. "Build it as Word" reads better than "Build it as a
   Word document" on a phone. */
export const FORMAT_SHORT = {
  docx: "Word",
  pdf: "PDF",
  pptx: "Slides",
  xlsx: "Spreadsheet",
};

/* THE LINE IN THE REPLY. `FORMAT: docx` on its own, anywhere in the turn.
   Tolerant on purpose: spacing, capitals and a trailing full stop all
   vary, and none of them should cost somebody the right file. */
const LINE = /FORMAT:\s*([A-Za-z]+)/;

export function formatFromReply(raw) {
  const found = String(raw ?? "").match(LINE);
  if (!found) return null;

  const said = found[1].toLowerCase();
  for (const [format, words] of Object.entries(KNOWN)) {
    if (words.includes(said)) return format;
  }
  return null;
}

/* Taken out before anything reaches a person's eyes. It is plumbing, and
   the product principle says plumbing never shows. */
export function withoutFormatLine(text) {
  return String(text ?? "").replace(new RegExp(LINE.source, "g"), "").replace(/\n{3,}/g, "\n\n");
}
