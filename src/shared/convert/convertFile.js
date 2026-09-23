/* ==========================================================================
   CONVERTING A FILE, AND PROVING NOTHING WENT MISSING

   Anthony, 2026-09-23: "it's a conversion, meaning nothing inside the
   original document is missing and no new thing is added. why A when we
   can have both already? remember, flexibility and dependability."
   (DOCUMENT-HARNESS.md, sections 8.2 to 8.4.)

   HOW IT WORKS, IN ORDER
     1. The exact way first: the converter service, through our own
        Supabase function (converterApi.js). A Word file printed to PDF by
        LibreOffice keeps its letterhead, fonts and margins.
     2. If that is not set up or does not answer, the browser does it
        (readOriginal.js and the same writers every file uses, in plain
        mode). Every word, heading, list, table and picture is kept; the
        look is not the original's, and the result says so.
     3. Whichever way made it, the words of the new file are compared with
        the words of the original, and the pictures are counted in and out.
        That comparison is the answer to "is anything missing", said as a
        fact rather than a hope.

   WHAT IT RETURNS
     { blob, filename, mimeType, way: "exact" | "browser",
       words: { complete, missing, lines, added },
       pictures: { before, after } }

   WHAT IT MUST NEVER DO
   Claim a conversion is complete without having compared it.
   ========================================================================== */

import { kindOfFile } from "./convertAsked.js";
import { askConverter } from "./converterApi.js";
import { docxToDocument, pdfToDocument, plainTextOf, picturesIn } from "./readOriginal.js";
import { themeFor, THEME } from "../docs/documentTheme.js";
import { compareWords } from "./convertReport.js";

export { conversionReport } from "./convertReport.js";

const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/* --------------------------------------------------------------------------
   The browser way
   -------------------------------------------------------------------------- */

/* The house style, made quiet: dark headings rather than the accent, since
   this is somebody else's document being carried across, not ours. */
const PLAIN_THEME = themeFor(THEME.ink);

async function inTheBrowser(file, from, to) {
  if (from === "docx") {
    const { doc, images } = await docxToDocument(file);
    const { pdfBlob } = await import("../docs/pdf.js");
    return pdfBlob(doc, PLAIN_THEME, null, images, { plain: true });
  }
  const { doc, images } = await pdfToDocument(file);
  const { wordBlob } = await import("../docs/word.js");
  return wordBlob(doc, PLAIN_THEME, images, null, { plain: true });
}

/* --------------------------------------------------------------------------
   The one entry point
   -------------------------------------------------------------------------- */

export async function convertFile(file, to) {
  const from = kindOfFile(file.name);
  if (!from || !MIME[to] || from === to) throw new Error("nothing to convert");

  let blob;
  let way = "exact";
  const exact = await askConverter(file, to);
  if (exact.ok) {
    blob = exact.blob;
  } else {
    way = "browser";
    blob = await inTheBrowser(file, from, to);
  }

  /* The proof. A failure to read either side is said plainly as "could not
     check", never as "complete". */
  let words = { complete: false, missing: [], lines: [], added: [], unchecked: true };
  let pictures = { before: null, after: null };
  try {
    const [before, after] = await Promise.all([plainTextOf(file, from), plainTextOf(blob, to)]);
    words = compareWords(before, after);
    pictures = { before: await picturesIn(file, from), after: await picturesIn(blob, to) };
  } catch (error) {
    console.warn("could not compare the conversion", error);
  }

  const base = file.name.replace(/\.[^.]+$/, "");
  return { blob, filename: `${base}.${to}`, mimeType: MIME[to], way, words, pictures };
}
