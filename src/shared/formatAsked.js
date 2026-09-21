/* ==========================================================================
   "MAKE IT A WORD DOCUMENT"

   Works out whether somebody is asking for the document they already have
   in a different format, and which one.

   WHY THIS IS NOT A MODEL CALL
   Anthony, 2026-09-21: "even as it gave me this output, I can decide and
   say make it a word document or PDF file. that flexibility."

   The file is already made the moment they say it: the result card has
   carried Word, PDF, Slides and Spreadsheet buttons all along, and
   handleDownload does the work. Nothing has to be generated, so nothing
   should be sent anywhere. A sentence turns into a button press, and the
   answer arrives instantly and cannot be wrong about the contents,
   because no model touched it.

   WHY IT IS DELIBERATELY CAUTIOUS
   Saying no here costs nothing: the message falls through to what the app
   did before, which is to treat it as a change to the work. Saying yes
   wrongly is worse, because "write me a report on Word processing" would
   hand somebody a download instead of a report.

   So a format word on its own is never enough. It has to either point at
   the thing that already exists ("make IT a pdf", "THIS as a word doc") or
   be short enough that it cannot be anything else ("pdf please").

   It only ever runs when a finished document is already on screen. Before
   that there is nothing to convert and the question cannot arise.
   ========================================================================== */

/* The words people actually use, mapped to what the app calls them. Order
   matters where one word contains another, so the longer ones are checked
   first. */
const FORMATS = [
  ["docx", ["word document", "word doc", "microsoft word", "docx", ".doc", "word"]],
  ["pdf", ["pdf", "acrobat"]],
  ["pptx", ["powerpoint", "power point", "slide deck", "slides", "deck", "pptx", "presentation"]],
  ["xlsx", ["spreadsheet", "excel", "xlsx", "csv", "sheet"]],
];

/* Words that mean "the thing we already have" rather than something new. */
const POINTS_AT_IT = [
  " it ", " it.", " it,", " it?", " it!", "it as", "this", "that", "the document",
  "the doc", "the file", "the report", "the same", "above", "again",
];

export function formatAsked(text) {
  const said = ` ${String(text ?? "").toLowerCase().trim()} `;
  if (!said.trim()) return null;

  let found = null;
  for (const [format, words] of FORMATS) {
    if (words.some((word) => said.includes(word))) { found = format; break; }
  }
  if (!found) return null;

  /* Pointing at what is already there. "Make it a word document." */
  if (POINTS_AT_IT.some((word) => said.includes(word))) return found;

  /* Or short enough that it cannot be a new piece of work. "PDF please." */
  const words = said.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 5) return found;

  return null;
}
