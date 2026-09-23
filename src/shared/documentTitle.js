/* ==========================================================================
   WHAT A FINISHED DOCUMENT IS CALLED

   Anthony asked for the flow to take him "from interview to build and
   download". Walking it on 2026-09-23 turned up the file landing as:

     make-me-a-one-page-pricing-faq.docx

   Named after what the person TYPED, not what the document IS. The document
   itself opened with "# Pricing FAQ", so the file should have been
   pricing-faq.docx. In a demo that is the one filename on screen, and it
   reads like a machine that saved your sentence rather than a colleague who
   handed you a document.

   WHY IT HAPPENED. The result card is created the moment the writing starts,
   before a single word of the document has arrived, so the only thing it
   could be named after at that point was the request. This is read at the
   moment of download instead, when the document is complete and its own
   heading is there to use.

   It imports nothing, so it can be tested without a browser.
   ========================================================================== */

/* The first top level heading, if the document has one. A "## " or deeper
   heading is a section, not the title of the whole thing, so it is not used.
   Formatting marks are taken off, because "**Pricing** FAQ" as a filename
   would carry the asterisks. */
export function headingOf(content) {
  if (typeof content !== "string") return "";
  const line = content.split("\n").find((l) => /^#\s+\S/.test(l.trim()));
  if (!line) return "";
  return line
    .trim()
    .replace(/^#\s+/, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/* The name to give the file: the document's own heading, then whatever the
   card was already called, then a plain word. Never empty, because a file
   with no name is saved as "download" and nobody can find it again. */
export function titleOf(content, fallback) {
  const heading = headingOf(content);
  if (heading) return heading;
  const kept = typeof fallback === "string" ? fallback.trim() : "";
  return kept || "Your document";
}
