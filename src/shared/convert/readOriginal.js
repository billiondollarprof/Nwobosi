/* ==========================================================================
   READING A FILE TO CONVERT IT, KEEPING ITS SHAPE

   The chat reads an upload for its words only (readFile.js), which is right
   for the model. A conversion needs more: the headings, lists, tables and
   pictures, in order, so the new file carries all of them. This reads a
   Word file or a PDF into the same document shape every writer already
   takes (docs/documentModel.js), without going through Markdown, so a star
   or a hash in somebody's text stays a star or a hash.

   This is the IN-BROWSER way, used when the exact converter is not set up
   or cannot be reached (convertFile.js). The exact way keeps the original
   look; this way keeps every word, and the reply says the look changed.

   WHAT IT MUST NEVER DO
   - Add words. No title is made up, no page numbers are printed that the
     original did not have.
   - Drop words quietly. Whatever cannot be carried (a picture in a format
     a PDF cannot hold, say) is counted and reported, never skipped silently.

   READ TOP TO BOTTOM
     1. Word files
     2. PDFs
     3. The plain words of a file, for the comparison
   ========================================================================== */

import { imageKey } from "../docs/imageKey.js";

/* --------------------------------------------------------------------------
   SECTION 1: Word files

   mammoth turns the Word file into simple HTML: headings, paragraphs with
   bold and italic, lists, tables and pictures. That HTML is walked once
   into blocks. Pictures come out as data addresses and go in the same
   images Map the writers already look pictures up in.
   -------------------------------------------------------------------------- */

function runsOf(node, style = {}) {
  const runs = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      if (child.textContent) runs.push({ text: child.textContent, ...style });
    } else if (child.nodeType === 1) {
      const tag = child.tagName.toLowerCase();
      if (tag === "br") runs.push({ br: true });
      else if (tag === "img") continue;
      else runs.push(...runsOf(child, {
        ...style,
        ...(tag === "strong" || tag === "b" ? { bold: true } : {}),
        ...(tag === "em" || tag === "i" ? { italic: true } : {}),
      }));
    }
  }
  return runs;
}

async function pictureSize(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return { width: img.naturalWidth || 400, height: img.naturalHeight || 300 };
}

/* The size each picture is SHOWN at in the Word file, in points, in the
   order the pictures appear. mammoth gives the picture but not its size,
   so it is read from the file's own XML (wp:extent, in EMU, 12700 to a
   point). Without it a small logo came out the full width of the page. */
async function pictureSizesIn(buffer) {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    return [...String(xml ?? "").matchAll(/<w:drawing>[\s\S]*?<wp:extent cx="(\d+)" cy="(\d+)"/g)]
      .map((m) => ({ width: Number(m[1]) / 12700, height: Number(m[2]) / 12700 }));
  } catch {
    return [];
  }
}

export async function docxToDocument(file) {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buffer = await file.arrayBuffer();
  const shownAt = await pictureSizesIn(buffer.slice(0));
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    },
  );

  const html = new DOMParser().parseFromString(`<body>${result.value}</body>`, "text/html");
  const blocks = [];
  const images = new Map();
  const report = { picturesIn: 0, picturesOut: 0, picturesLost: 0 };

  const addPicture = async (img) => {
    report.picturesIn += 1;
    const src = img.getAttribute("src") ?? "";
    const mime = src.slice(5, src.indexOf(";"));
    /* A PDF can hold PNG and JPEG pictures. Anything else (an old Windows
       drawing, say) is counted as not carried, never dropped silently. */
    if (!/^image\/(png|jpe?g)$/.test(mime)) {
      report.picturesLost += 1;
      return;
    }
    const name = `picture-${report.picturesIn}.${mime.endsWith("png") ? "png" : "jpg"}`;
    try {
      const size = await pictureSize(src);
      const shown = shownAt[report.picturesIn - 1];
      images.set(imageKey(name), { dataUrl: src, ...size, mime, ...(shown ? { shownWidth: shown.width, shownHeight: shown.height } : {}) });
      blocks.push({ type: "image", name, tag: "", caption: "", source: "", figure: null });
      report.picturesOut += 1;
    } catch {
      report.picturesLost += 1;
    }
  };

  for (const node of html.body.children) {
    const tag = node.tagName.toLowerCase();
    const heading = tag.match(/^h([1-6])$/);
    if (heading) {
      blocks.push({ type: "h", level: Math.min(Number(heading[1]), 4), runs: runsOf(node) });
    } else if (tag === "ul" || tag === "ol") {
      const items = [...node.querySelectorAll(":scope > li")].map((li) => ({ runs: runsOf(li) }));
      if (items.length) blocks.push({ type: "list", ordered: tag === "ol", start: 1, items });
    } else if (tag === "table") {
      const rows = [...node.querySelectorAll("tr")].map((tr) => [...tr.children].map((cell) => runsOf(cell)));
      if (rows.length) {
        const width = Math.max(...rows.map((r) => r.length));
        const pad = (row) => [...row, ...Array.from({ length: width - row.length }, () => [])];
        blocks.push({ type: "table", header: pad(rows[0]), rows: rows.slice(1).map(pad) });
      }
    } else {
      const runs = runsOf(node);
      if (runs.some((r) => r.br || String(r.text ?? "").trim())) blocks.push({ type: "p", runs });
    }
    for (const img of node.querySelectorAll("img")) await addPicture(img);
  }

  return { doc: { title: "", subtitle: "", blocks, notes: [], findings: [] }, images, report };
}

/* --------------------------------------------------------------------------
   SECTION 2: PDFs

   A PDF has no paragraphs, only pieces of text placed on a page. So they
   are put back together: pieces at the same height are one line, lines
   close together at the same size are one paragraph, a line clearly bigger
   than the body text is a heading, and a line starting with a bullet or a
   number is a list item. Tables and columns do not survive this well,
   which is why the exact converter is the main way.
   -------------------------------------------------------------------------- */

/* The legacy build of the PDF reader, for the same reason as readFile.js:
   the modern build needs JavaScript features many browsers do not have. */
async function openPdf(data) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs.getDocument({ data }).promise;
}

function linesOf(items) {
  const pieces = items
    .filter((item) => "str" in item && item.str !== "")
    .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5], size: Math.abs(item.height || item.transform[3]) || 10, width: item.width }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  /* A gap far wider than a space, on one line, is a column: the cells of
     a table row sit like that. Each line keeps its cells as well as its
     text, so a row of a table can be put back as a row. */
  const lines = [];
  for (const piece of pieces) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - piece.y) < Math.max(line.size, piece.size) * 0.5) {
      const gap = piece.x - line.end;
      const wide = Math.max(line.size, piece.size) * 2.5;
      /* pdf.js fills the gap between two columns with one wide space
         piece. That space is the column break, not a word. */
      if (!piece.text.trim() && piece.width > wide) {
        line.breakNext = true;
        line.end = piece.x + piece.width;
        continue;
      }
      if (gap > wide || line.breakNext) {
        line.breakNext = false;
        line.cells.push(piece.text);
      } else {
        const joiner = gap > piece.size * 0.15 && !line.text.endsWith(" ") && !piece.text.startsWith(" ") ? " " : "";
        line.cells[line.cells.length - 1] += joiner + piece.text;
      }
      line.text = line.cells.join(" ");
      line.end = piece.x + piece.width;
      line.size = Math.max(line.size, piece.size);
    } else {
      lines.push({ text: piece.text, cells: [piece.text], y: piece.y, x: piece.x, end: piece.x + piece.width, size: piece.size });
    }
  }
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim(), cells: l.cells.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean) }))
    .filter((l) => l.text);
}

async function countPdfPictures(page, pdfjs) {
  const ops = await page.getOperatorList();
  const paint = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintJpegXObject].filter(Boolean));
  return ops.fnArray.filter((fn) => paint.has(fn)).length;
}

/* Bullets, including the ones Word draws with its Symbol font, which reach
   a PDF as characters in the private area of Unicode (U+F0B7 and friends). */
const BULLET = /^([•▪◦●‣∙·*\-–]|[\uF000-\uF8FF])\s*/;
const NUMBERED = /^(\d{1,3})[.)]\s+/;

export async function pdfToDocument(file) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await openPdf(await file.arrayBuffer());
  const pages = [];
  let picturesIn = 0;
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    pages.push(linesOf((await page.getTextContent()).items));
    picturesIn += await countPdfPictures(page, pdfjs);
  }
  if (typeof pdf.destroy === "function") await pdf.destroy();

  /* The body text size is the size most of the characters are set in. */
  const weight = new Map();
  for (const line of pages.flat()) {
    const key = Math.round(line.size * 2) / 2;
    weight.set(key, (weight.get(key) ?? 0) + line.text.length);
  }
  const body = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;

  const blocks = [];
  let paragraph = null;
  let list = null;
  let table = null;
  const flush = () => {
    if (paragraph) blocks.push({ type: "p", runs: [{ text: paragraph.text }] });
    if (list) blocks.push(list);
    if (table) blocks.push(table);
    paragraph = null;
    list = null;
    table = null;
  };

  for (const lines of pages) {
    let previous = null;
    for (const line of lines) {
      /* A ROW OF A TABLE: two or more cells on one line. Rows with the
         same number of cells, one after another, are one table. */
      if (line.cells.length >= 2 && !BULLET.test(line.text)) {
        if (paragraph || list) {
          const keep = table;
          table = null;
          flush();
          table = keep;
        }
        const cells = line.cells.map((c) => [{ text: c }]);
        if (table && table.header.length === cells.length) table.rows.push(cells);
        else {
          if (table) blocks.push(table);
          table = { type: "table", header: cells, rows: [] };
        }
        previous = line;
        continue;
      }
      if (table) {
        blocks.push(table);
        table = null;
      }

      /* A HEADING: a short line set clearly bigger than the body, that does
         not read like a sentence ending. */
      const ratio = line.size / body;
      if (ratio >= 1.1 && line.text.length <= 90 && !/[.,;:]$/.test(line.text)) {
        flush();
        blocks.push({ type: "h", level: ratio >= 1.5 ? 1 : ratio >= 1.22 ? 2 : 3, runs: [{ text: line.text }] });
        previous = line;
        continue;
      }
      const bullet = line.text.match(BULLET);
      const numbered = line.text.match(NUMBERED);
      if (bullet || numbered) {
        if (paragraph) { blocks.push({ type: "p", runs: [{ text: paragraph.text }] }); paragraph = null; }
        const ordered = Boolean(numbered);
        if (list && list.ordered !== ordered) { blocks.push(list); list = null; }
        /* indent: where this bullet sits. A line that follows it and starts
           further right is the same item running onto a second line. */
        if (!list) list = { type: "list", ordered, start: ordered ? Number(numbered[1]) : 1, items: [], indent: line.x + 2 };
        list.items.push({ runs: [{ text: line.text.replace(ordered ? NUMBERED : BULLET, "") }] });
        previous = line;
        continue;
      }
      const close = previous && previous.y - line.y <= Math.max(previous.size, line.size) * 1.7 && Math.abs(previous.size - line.size) < body * 0.15;
      if (list && close && line.x > list.indent) {
        /* A list item that runs onto a second line. */
        const last = list.items[list.items.length - 1];
        last.runs[0].text += ` ${line.text}`;
      } else if (paragraph && close) {
        paragraph.text += paragraph.text.endsWith("-") ? line.text : ` ${line.text}`;
      } else {
        flush();
        paragraph = { text: line.text };
      }
      previous = line;
    }
    /* A new page ends whatever was being put together. */
    flush();
  }
  flush();

  return {
    doc: { title: "", subtitle: "", blocks, notes: [], findings: [] },
    images: new Map(),
    report: { picturesIn, picturesOut: 0, picturesLost: picturesIn },
  };
}

/* --------------------------------------------------------------------------
   SECTION 3: The plain words of a file, for the comparison
   -------------------------------------------------------------------------- */

export async function plainTextOf(blobOrFile, kind) {
  if (kind === "docx") {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const result = await mammoth.extractRawText({ arrayBuffer: await blobOrFile.arrayBuffer() });
    return String(result?.value ?? "");
  }
  const pdf = await openPdf(await blobOrFile.arrayBuffer());
  const out = [];
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    out.push(linesOf((await page.getTextContent()).items).map((l) => l.text).join("\n"));
  }
  if (typeof pdf.destroy === "function") await pdf.destroy();
  return out.join("\n");
}

/* Pictures inside a finished file: a Word file's media folder, or the
   picture drawing steps in a PDF. */
export async function picturesIn(blobOrFile, kind) {
  if (kind === "docx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blobOrFile.arrayBuffer());
    return Object.keys(zip.files).filter((name) => /^word\/media\/[^/]+$/.test(name)).length;
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await openPdf(await blobOrFile.arrayBuffer());
  let count = 0;
  for (let n = 1; n <= pdf.numPages; n += 1) count += await countPdfPictures(await pdf.getPage(n), pdfjs);
  if (typeof pdf.destroy === "function") await pdf.destroy();
  return count;
}
