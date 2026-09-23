/* ==========================================================================
   READING A FILE
   One place that turns whatever somebody hands over into text.

   This exists because "paste it in instead" is a bad answer. The formats
   a company's material actually lives in are PDF and Word, and a product
   that asks you to convert your own document before it will look at it
   has pushed its problem onto the person using it.

   Everything here runs in the browser. Nothing is uploaded to be parsed,
   which matters for a product whose argument is that company data stays
   in company hands: the file never leaves the device as a file, only the
   text it holds travels, and only to the model.
   ========================================================================== */

/* Loaded on demand rather than at startup. Together these are a few
   hundred kilobytes, and most people open the app without ever touching
   a PDF, so making everyone pay for them on first paint would be a tax on
   the common case. */

const PLAIN = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "rtf", "xml", "html", "htm"];
const IMAGE = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "heic", "heif"];

export function extensionOf(name) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/* What this can do with a given file, decided by name alone so the answer
   arrives before anything is read. */
export function fileKind(name) {
  const ext = extensionOf(name);
  if (PLAIN.includes(ext)) return "text";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (IMAGE.includes(ext)) return "image";
  return "unreadable";
}

export function canBecomeText(name) {
  return ["text", "pdf", "docx"].includes(fileKind(name));
}

/* --------------------------------------------------------------------------
   SECTION: PDF
   Page by page, joined with blank lines between pages so the chunker has
   real boundaries to cut on later.

   A PDF that holds only scanned pictures of text returns almost nothing,
   because there is no text in it to find. That is worth saying out loud
   to whoever uploaded it rather than storing an empty source that looks
   fine in a list and answers nothing.
   -------------------------------------------------------------------------- */

async function readPdf(file) {
  /* THE LEGACY BUILD, 2026-09-23. The modern build of pdfjs-dist 6 uses
     JavaScript features so new that many browsers do not have them, in its
     worker as well as here. Some PDFs (ones made by Word or LibreOffice)
     then failed with "UnknownErrorException" and the upload was dropped.
     The legacy build is the same reader with those features filled in. */
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  /* The worker has to be told where it lives, and the bundler needs to
     see the URL to include it. Without this line pdf.js silently falls
     back to running on the main thread or fails outright. */
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (text) pages.push(text);
  }

  /* Let go of the worker's copy of the file. The method has moved around
     between pdf.js versions, so ask before calling rather than throwing
     away a document that was read perfectly well. */
  if (typeof doc.cleanup === "function") await doc.cleanup();
  if (typeof doc.destroy === "function") await doc.destroy();

  return pages.join("\n\n");
}

/* --------------------------------------------------------------------------
   SECTION: Word
   mammoth pulls the document's prose out of the XML and leaves the
   formatting behind, which is exactly what is wanted: the model needs the
   words, not the margins.
   -------------------------------------------------------------------------- */

async function readDocx(file) {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return String(result?.value ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/* --------------------------------------------------------------------------
   SECTION: The one entry point
   Returns { ok, text } or { ok: false, reason } with a reason written for
   a person, never a parser error.
   -------------------------------------------------------------------------- */

export async function readFileAsText(file, { maxChars = 40000 } = {}) {
  const kind = fileKind(file.name);

  try {
    let text = "";

    if (kind === "text") {
      text = await file.text();
    } else if (kind === "pdf") {
      text = await readPdf(file);
      if (text.trim().length < 40) {
        return {
          ok: false,
          reason:
            `${file.name} has no text in it that can be read. It is most likely scanned pages, ` +
            `which are pictures rather than words. Paste the part that matters instead.`,
        };
      }
    } else if (kind === "docx") {
      text = await readDocx(file);
      if (!text.trim()) {
        return { ok: false, reason: `${file.name} came back empty. Paste what matters instead.` };
      }
    } else {
      return {
        ok: false,
        reason: `${file.name} is not a kind of file this can read. Plain text, PDF, Word, CSV or JSON.`,
      };
    }

    const truncated = text.length > maxChars;
    return { ok: true, text: text.slice(0, maxChars), truncated };
  } catch (err) {
    console.error("could not read file", file.name, err);
    return {
      ok: false,
      reason: `Could not read ${file.name}. It may be password protected or damaged.`,
    };
  }
}
