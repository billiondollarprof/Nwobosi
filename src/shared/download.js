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
import { themeFor } from "./docs/documentTheme.js";

/* --------------------------------------------------------------------------
   SECTION: Whose document it is

   `brand` is { name, color, logoUrl } from the company's own row. The
   colour becomes the accent in every file (themeFor), the name goes on the
   cover and the running header, and the logo goes on the slide cover.

   The logo is fetched once and turned into a data address, because the
   slide writer needs the picture itself, not a link to it. If it cannot be
   fetched (no logo, a blocked address, offline), the cover carries the
   company name instead. A missing logo never stops a file being made.
   -------------------------------------------------------------------------- */

const logoCache = new Map();

async function logoData(url) {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url);
  let data = null;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type.startsWith("image/")) {
        data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch {
    data = null;
  }
  logoCache.set(url, data);
  return data;
}

async function brandFor(brand) {
  /* LAID OUT LIKE AN UPLOAD (DOCUMENT-HARNESS.md, section 9). When the
     agreed brief said so, the upload's own heading colour, fonts and page
     margins replace the house style for this one piece of work. */
  const layout = brand?.layoutStyle;
  if (layout) {
    const theme = themeFor(layout.accent ?? brand?.color);
    return {
      theme: {
        ...theme,
        ...(layout.font ? { officeFont: layout.font } : {}),
        ...(layout.headingFont ? { headingFont: layout.headingFont } : {}),
        ...(layout.margins ? { margins: layout.margins } : {}),
        /* From a PowerPoint they showed: its own dark or light look. */
        ...(layout.mode ? { slideMode: layout.mode } : {}),
      },
      brand: brand?.name ? { name: brand.name, logoData: await logoData(brand.logoUrl) } : null,
    };
  }
  return {
    theme: themeFor(brand?.color),
    brand: brand?.name ? { name: brand.name, logoData: await logoData(brand.logoUrl) } : null,
  };
}

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

export async function downloadPdf(title, markdown, company, messages) {
  const { blob, filename } = await buildFile("pdf", title, markdown, company, messages);
  saveBlob(blob, filename);
}

export async function downloadDocx(title, markdown, company, messages) {
  const { blob, filename } = await buildFile("docx", title, markdown, company, messages);
  saveBlob(blob, filename);
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

/* `messages` is the conversation, which is where pictures the person
   handed over live. Pictures the document names are found there or in the
   company's knowledge base, prepared once, and handed to every writer. See
   docs/images.js. */
/* True when the person asked for one page anywhere in the conversation
   ("one page", "one-pager", "a single page", "1 page"). */
export function askedForOnePage(messages = []) {
  return (messages ?? []).some(
    (m) => m?.role === "user" && /\b(one|1|single)[\s-]?page(r)?\b/i.test(String(m.content ?? "")),
  );
}

export async function buildFile(format, title, markdown, company, messages = [], { deckEngine = null } = {}) {
  const doc = readDocument(markdown, title);
  const found = await brandFor(company);
  const { brand } = found;
  let { theme } = found;
  /* THE LOOK THEY ASKED FOR in words (":::style dark | #1E3A8A",
     documentModel.js), on top of the company's own. A colour they named
     replaces the brand colour for this one piece of work. */
  if (doc.style?.accent) theme = { ...theme, ...themeFor(doc.style.accent), officeFont: theme.officeFont, headingFont: theme.headingFont, margins: theme.margins };
  if (doc.style?.mode) theme = { ...theme, slideMode: doc.style.mode };
  const { collectImages } = await import("./docs/images.js");
  const images = await collectImages(doc, messages, company?.id);
  /* Word and Excel need a picture copy of each chart; the PDF and Slides
     draw their own. Made only for the formats that use them. */
  let charts = null;
  if (format !== "pdf" && format !== "pptx") {
    const { chartPictures } = await import("./docs/charts/chartPictures.js");
    charts = await chartPictures(doc, theme);
  }
  let blob;
  if (format === "pdf") blob = await pdfBlob(doc, theme, brand, images, { pages: askedForOnePage(messages) ? 1 : 0 });
  else if (format === "pptx") {
    if (!doc.blocks.length) throw new Error("nothing to put on a slide");
    const { deckBlob } = await import("./docs/deck.js");
    blob = await deckBlob(doc, theme, brand, images, deckEngine);
  } else if (format === "xlsx") {
    const { sheetBlob } = await import("./downloadSheet.js");
    blob = await sheetBlob(title, markdown, theme, charts);
  } else {
    format = "docx";
    blob = await wordBlob(doc, theme, images, charts);
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
