/* ==========================================================================
   "JUST CONVERT IT": THE LINE THE FIRST TURN WRITES

   Anthony, 2026-09-23: "the assistant listens to know when interview is
   needed and when the staff just wants a conversion."
   (DOCUMENT-HARNESS.md, section 8.1.)

   When somebody attaches a PDF or a Word file and only wants it in the
   other format, the first turn answers in a line and ends with
   `CONVERT: pdf` or `CONVERT: docx`. This reads that line and takes it out
   of what the person sees, the same way FORMAT is (outputFormat.js).

   The line alone never converts anything. Chat.jsx only acts on it when a
   PDF or Word file really was attached in that same turn.
   ========================================================================== */

const LINE = /CONVERT:\s*([A-Za-z]+)\.?/;

const WORDS = { pdf: ["pdf"], docx: ["docx", "word", "doc"] };

export function convertFromReply(raw) {
  const found = String(raw ?? "").match(LINE);
  if (!found) return null;
  const said = found[1].toLowerCase();
  for (const [to, words] of Object.entries(WORDS)) {
    if (words.includes(said)) return to;
  }
  return null;
}

export function withoutConvertLine(text) {
  return String(text ?? "").replace(new RegExp(LINE.source, "g"), "").replace(/\n{3,}/g, "\n\n");
}

/* Which way a file can go. A Word file becomes a PDF and a PDF becomes a
   Word file; asking for the format it already is means nothing to do. */
export function kindOfFile(name) {
  const ext = String(name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  return null;
}
