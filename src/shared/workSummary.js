/* ==========================================================================
   THE SHORT SUMMARY AN ADMIN SEES

   Anthony, 2026-09-23: "admin can see, just the short summery not the
   entire work."

   WHAT THIS IS
   When a piece of work is saved, this turns the whole document into a few
   lines: what it is for, and the names of its sections. That short line is
   what goes in work_history.summary, which an admin can read. The whole
   document goes in work_content, which only the person who made it can read.

   HOW IT IS MADE
   In the browser, from the Markdown, with no model call. So it costs
   nothing and it can never invent anything: every word in it is a word that
   is already in the document.

   WHAT IT MUST NEVER DO
   Carry the body of the work. Figures, names and paragraphs stay with the
   person who made it. A section heading and the first sentence are the most
   it takes, and the whole thing is capped at SUMMARY_LIMIT characters.
   ========================================================================== */

export const SUMMARY_LIMIT = 280;

/* Markdown marks taken off, so the summary reads as plain words. */
function plain(line) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*|__|\*|_|`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/* The first sentence of the first real paragraph: what the work is for. */
function firstSentence(lines) {
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(":::") || line.startsWith("|")) continue;
    if (/^([-*+]|\d+\.)\s/.test(line) || line.startsWith(">")) continue;
    const text = plain(line);
    if (!text) continue;
    const end = text.search(/[.!?](\s|$)/);
    return end === -1 ? text : text.slice(0, end + 1);
  }
  return "";
}

/* "Opening, Prices, Next steps": the second level headings, in order. */
function sectionNames(lines) {
  return lines
    .filter((line) => /^##\s+/.test(line.trim()))
    .map((line) => plain(line.trim()))
    .filter(Boolean);
}

/* Cut on a word, never in the middle of one, and say it was cut. */
function cap(text) {
  if (text.length <= SUMMARY_LIMIT) return text;
  const cut = text.slice(0, SUMMARY_LIMIT - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

export function summaryOf(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const purpose = firstSentence(lines);
  const sections = sectionNames(lines);

  const parts = [];
  if (purpose) parts.push(purpose);
  if (sections.length) parts.push(`Sections: ${sections.join(", ")}.`);
  return cap(parts.join(" ")) || "A finished piece of work.";
}
