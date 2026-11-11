/* ==========================================================================
   LOOKING AT THE FILE BEFORE IT IS HANDED OVER

   What this is: the file a person is about to get, drawn as pictures, plus
   what code can find wrong with it by measuring.

   Why it exists. Anthony, 2026-11-10: "The system should look at what it
   made (screenshot) before handing it over, especially slides."

     Slides   the slide writer is run once more against a recorder and drawn
              on a canvas (drawSlides.js), so the pictures are the file's
              own layout. Code measures text that spills out of its box and
              text under 11 point.
     PDF      the real file is drawn page by page with pdf.js, the same
              reader the app already uses for uploads.
     Word and Excel are not drawn here: a browser cannot lay out a .docx
              the way Word does, and a spreadsheet is a table, not a page.
              Their sizes are already checked when they are written.

   The pictures then go to the look agent (stages/look.ts), which says what a
   person would notice. This file only makes the pictures and the
   measurements; it never changes the file.

   What it must never do:
     - Fail the build. Any error here means "not looked at", never "broken".
   ========================================================================== */

import { SlideRecorder, drawSlides } from "./drawSlides.js";

/* At most this many pictures go to the look agent. A long deck is looked
   at in its first pages, where a fault is most likely to be seen first. */
export const MAX_PICTURES = 12;

/* The PDF, page by page, as pictures about 900 pixels wide. */
async function drawPdfPages(blob) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
  const pictures = [];
  for (let n = 1; n <= Math.min(doc.numPages, MAX_PICTURES); n += 1) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 900 / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    pictures.push(canvas.toDataURL("image/jpeg", 0.72));
  }
  return { pictures, problems: [], pages: doc.numPages };
}

/* The pictures of the file and what measuring found, or null when this
   format is not looked at or anything went wrong. */
export async function lookAtFile(format, title, markdown, company, messages = []) {
  try {
    const { buildFile } = await import("../../download.js");
    if (format === "pptx") {
      const recorder = new SlideRecorder();
      const { blob: slides } = await buildFile("pptx", title, markdown, company, messages, { deckEngine: recorder });
      const out = await drawSlides(slides);
      return { kind: "slides", pictures: out.pictures.slice(0, MAX_PICTURES), problems: out.problems, pages: slides.length };
    }
    if (format === "pdf") {
      const { blob } = await buildFile("pdf", title, markdown, company, messages);
      const out = await drawPdfPages(blob);
      return { kind: "pages", ...out };
    }
    return null;
  } catch (err) {
    console.warn("could not look at the file", err);
    return null;
  }
}

/* A picture as the image block the assistant takes. */
export function asImageBlock(dataUrl) {
  const [head, data] = String(dataUrl).split(",");
  const media = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  return { type: "image", source: { type: "base64", media_type: media, data } };
}
