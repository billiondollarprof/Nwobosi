/* ==========================================================================
   TURNING THE WORK INTO A FILE

   For most of this build the finished document downloaded as Markdown,
   which is a text file with stars and hashes in it. On a laptop that is
   mildly annoying. On a phone it is useless: nothing opens it, so the work
   the assistant just did cannot be read, shown or sent to anybody.

   A document nobody can open is not a document. So this writes the two
   formats a person can actually use, PDF and Word, in the browser, with no
   server and nothing uploaded.

   Both writers are loaded on demand. Somebody who never generates anything
   should not pay for them on first paint.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION: Reading the Markdown

   Moved on 2026-09-23 to src/shared/docs/documentModel.js, which every
   format and the preview now share. See that file's header for why.
   -------------------------------------------------------------------------- */

import { readDocument } from "./docs/documentModel.js";
import { pdfBlob } from "./docs/pdf.js";
import { wordBlob } from "./docs/word.js";

export function slugForFile(title) {
  return (
    String(title ?? "document")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document"
  );
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Given a moment before the URL is released. Revoking it in the same
     tick cancels the download on some mobile browsers. */
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* --------------------------------------------------------------------------
   SECTION: PDF and Word

   Both are laid out in src/shared/docs/, from the one reading of the
   document. The PDF is pdfmake with its own font inside the file; the Word
   file is real Word styles, numbering and tables. The notes to the person
   are never in either. See those files for the detail.
   -------------------------------------------------------------------------- */

export async function downloadPdf(title, markdown) {
  const blob = await pdfBlob(readDocument(markdown, title));
  saveBlob(blob, `${slugForFile(title)}.pdf`);
}

export async function downloadDocx(title, markdown) {
  const blob = await wordBlob(readDocument(markdown, title));
  saveBlob(blob, `${slugForFile(title)}.docx`);
}

/* --------------------------------------------------------------------------
   SECTION: Any format, built and not saved

   The same file the Download buttons give, handed back instead of saved,
   so it can be put in Google Drive. One builder for both means what lands
   in Drive is byte for byte what the person would have downloaded.
   -------------------------------------------------------------------------- */

export const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function buildFile(format, title, markdown) {
  const doc = readDocument(markdown, title);
  let blob;
  if (format === "pdf") blob = await pdfBlob(doc);
  else if (format === "pptx") {
    const { deckBlob } = await import("./docs/deck.js");
    blob = await deckBlob(doc);
  } else if (format === "xlsx") {
    const { sheetBlob } = await import("./downloadSheet.js");
    blob = await sheetBlob(title, markdown);
  } else {
    format = "docx";
    blob = await wordBlob(doc);
  }
  return { blob, filename: `${slugForFile(title)}.${format}`, mimeType: MIME[format] };
}

/* Kept because it costs nothing and somebody working in a text editor may
   still want it. It is no longer what the button does. */
export function downloadMarkdown(title, markdown) {
  saveBlob(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    `${slugForFile(title)}.md`
  );
}
