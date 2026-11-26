/* ==========================================================================
   REFERENCES, AND MOVING THEM BEHIND A QR CODE

   What this is: reading the :::references block the writer puts at the end
   of a document, and, on a one pager, swapping it for a small card with a
   QR code that opens the full list at stellaxafe.com/r/<code>.

   Why. Anthony, 2026-11-22: a one pager has to stay one page, and a list of
   references can push it onto a second. "The system can automatically
   create a different page for the reference... and then put the link and
   convert it to a QR code on the one pager." The list is kept in the
   database (supabase/migrations/20261125120000_document_references.sql)
   under a long random code; the link is private in the sense that nobody
   can find it without the code.

     :::references
     - Rural Electrification Agency, Mini grid report, 2025. https://rea.gov.ng/...
     - Company price list, 2026.
     :::

   becomes, once the list is saved,

     :::sourcesqr https://stellaxafe.com/r/<code> | 2

   What it must never do:
     - Lose a reference. If the list cannot be saved, the block stays as it
       was and the references print as a list.
   ========================================================================== */

export const REFERENCES_BASE = "https://stellaxafe.com/r/";

/* One reference line, its text and the first web address in it. */
export function readReference(line) {
  const text = String(line ?? "").replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
  const url = text.match(/https?:\/\/[^\s)>\]]+/i)?.[0]?.replace(/[.,;]+$/, "") ?? "";
  return { text, url };
}

/* Where the block is in the document, and what it holds. */
export function findReferences(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const start = lines.findIndex((l) => /^\s*:::\s*references\b/i.test(l));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && !/^\s*:::\s*$/.test(lines[end]) && !/^#{1,3}\s/.test(lines[end])) end += 1;
  const closed = end < lines.length && /^\s*:::\s*$/.test(lines[end]);
  const items = lines.slice(start + 1, end).map(readReference).filter((r) => r.text);
  return { start, end: closed ? end : end - 1, items };
}

/* The document with its references swapped for the QR card. */
export function withQrCard(markdown, url, count) {
  const found = findReferences(markdown);
  if (!found) return markdown;
  const lines = String(markdown).split("\n");
  lines.splice(found.start, found.end - found.start + 1, `:::sourcesqr ${url} | ${count}`);
  return lines.join("\n");
}

/* The link for a saved list. Only a code of the right shape makes one. */
export function referencesLink(code) {
  return /^[0-9a-f]{32}$/.test(String(code ?? "")) ? `${REFERENCES_BASE}${code}` : "";
}

/* "stellaxafe.com/r/1a2b3c…": short enough to print under the code. */
export function shortLinkText(url) {
  const m = String(url ?? "").match(/^https?:\/\/([^/]+\/r\/)([0-9a-f]{32})$/i);
  return m ? `${m[1]}${m[2].slice(0, 8)}…` : String(url ?? "").replace(/^https?:\/\//, "");
}

/* What the card says. */
export function qrCardText(count) {
  const n = Number(count) || 0;
  return {
    title: "Sources",
    line: n === 1
      ? "Scan to read the reference behind this page."
      : n > 1 ? `Scan to read the ${n} references behind this page.` : "Scan to read the references behind this page.",
  };
}

/* The document without its references or QR card, for the number checker
   (checkDocument.js): a reference's own year or page is not a claim in the
   document, and flagging it was a false alarm. */
export function withoutReferences(markdown) {
  const found = findReferences(markdown);
  let lines = String(markdown ?? "").split("\n");
  if (found) lines.splice(found.start, found.end - found.start + 1);
  return lines.filter((l) => !/^\s*:::\s*sourcesqr\b/i.test(l)).join("\n");
}
