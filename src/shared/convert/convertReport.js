/* ==========================================================================
   DID ANYTHING GO MISSING: THE COMPARISON, AND WHAT THE PERSON IS TOLD

   Pure code with no imports, so it can be tested on its own and cannot
   reach anything. convertFile.js makes the file; this says, as facts,
   whether every word and picture came across. (DOCUMENT-HARNESS.md 8.4.1.)
   ========================================================================== */

/* --------------------------------------------------------------------------
   The comparison
   Words are compared as a count of each word, ignoring case, punctuation
   and hyphens, because a PDF can split "well-known" across a line and
   LibreOffice can join ligatures. What is left over is real.
   -------------------------------------------------------------------------- */

/* A word is a run of letters; a number is kept whole, so ₦12,400,000 is
   one token "12400000" and not "12", "400" and "000" (which would match
   the "000" of any other amount and hide a lost line). */
function wordsOf(text) {
  return (String(text ?? "").normalize("NFKC").toLowerCase().match(/\p{N}+(?:[.,]\p{N}+)*|\p{L}+/gu) ?? [])
    .map((token) => (/^\p{N}/u.test(token) ? token.replace(/,/g, "") : token));
}

function counts(words) {
  const map = new Map();
  for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
  return map;
}

export function compareWords(before, after) {
  const was = counts(wordsOf(before));
  const now = counts(wordsOf(after));
  const missing = [];
  const added = [];
  for (const [word, n] of was) if ((now.get(word) ?? 0) < n) missing.push(word);
  for (const [word, n] of now) if ((was.get(word) ?? 0) < n) added.push(word);

  /* The lines of the original that hold a missing word, so the person can
     see exactly what did not come across. */
  const gone = new Set(missing);
  const lines = String(before ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && wordsOf(line).some((w) => gone.has(w)))
    .slice(0, 3);

  return { complete: missing.length === 0, missing, lines, added };
}

/* --------------------------------------------------------------------------
   What the person is told, as plain lines, from the facts above.
   -------------------------------------------------------------------------- */

export function conversionReport({ way, words, pictures }, to) {
  const lines = [];
  if (words.unchecked) {
    lines.push("It could not be checked word for word this time, so give it a read before it goes out.");
  } else if (words.complete) {
    lines.push("Every word came across.");
  } else {
    lines.push(`${words.missing.length} word${words.missing.length === 1 ? "" : "s"} did not come across. From the original:`);
    lines.push(...words.lines.map((line) => `"${line.length > 140 ? `${line.slice(0, 139)}…` : line}"`));
  }
  if (pictures.before !== null && pictures.after !== null && pictures.before !== pictures.after) {
    const lost = pictures.before - pictures.after;
    lines.push(
      lost > 0
        ? pictures.before === 1
          ? "The picture did not come across."
          : pictures.after === 0
          ? `None of the ${pictures.before} pictures came across.`
          : `${lost} of the ${pictures.before} pictures did not come across.`
        : `It has ${pictures.after} pictures where the original had ${pictures.before}.`,
    );
  }
  if (way === "browser") {
    lines.push(to === "pdf"
      ? "It was made here in the browser, so it keeps every word but not the original look, like a letterhead or its fonts."
      : "It was made here in the browser from the PDF's text, so tables and columns may have come across as plain lines.");
  } else if (to === "docx") {
    lines.push("A PDF turned into Word can shift in layout, so check tables and columns.");
  }
  return lines;
}
