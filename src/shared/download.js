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

   The model writes Markdown, so this has to understand it well enough to
   lay it out. Not a full parser, which would be a library on its own. Just
   the shapes the model actually produces: headings, bullets, numbered
   lists, bold runs, and rules.
   -------------------------------------------------------------------------- */

/* Bold is the only inline mark that survives into the file. Everything
   else is stripped rather than printed raw, because **like this** on a
   printed page is worse than the emphasis being lost. */
function splitBold(text) {
  const parts = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  let m;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1] ?? m[2] ?? "", bold: true });
    last = pattern.lastIndex;
  }

  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts.filter((p) => p.text).map((p) => ({ ...p, text: cleanInline(p.text) }));
}

function cleanInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/[–—]/g, ", ");
}

export function parseMarkdown(markdown) {
  const blocks = [];
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");

  let paragraph = [];

  function flush() {
    if (!paragraph.length) return;
    blocks.push({ type: "p", runs: splitBold(paragraph.join(" ")) });
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    /* A horizontal rule is a break in thought, not something to draw on
       the page. It reads as a stray line in a printed document. */
    if (/^([-*_])\1{2,}$/.test(line)) {
      flush();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ type: "h", level: heading[1].length, runs: splitBold(heading[2]) });
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flush();
      blocks.push({ type: "li", runs: splitBold(bullet[1]) });
      continue;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      flush();
      blocks.push({ type: "li", ordered: true, number: Number(numbered[1]), runs: splitBold(numbered[2]) });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flush();
      blocks.push({ type: "quote", runs: splitBold(quote[1]) });
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
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

function saveBlob(blob, filename) {
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
   SECTION: PDF

   Laid out by hand rather than by converting HTML, because HTML to PDF in
   a browser means either a print dialog the person has to drive or a
   library the size of the app. This draws the page: margins, a measured
   line height, and a page break when the cursor runs off the bottom.
   -------------------------------------------------------------------------- */

const PAGE = {
  marginX: 56,
  marginTop: 64,
  marginBottom: 64,
  body: 11,
  lineGap: 1.45,
};

export async function downloadPdf(title, markdown) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - PAGE.marginX * 2;

  let y = PAGE.marginTop;

  function room(height) {
    if (y + height <= pageHeight - PAGE.marginBottom) return;
    doc.addPage();
    y = PAGE.marginTop;
  }

  /* One run of text, wrapped, with bold segments kept bold. Drawn word by
     word so a bold phrase in the middle of a sentence stays in line rather
     than starting a new one. */
  function drawRuns(runs, { size, bold, indent = 0, gapAfter }) {
    const lineHeight = size * PAGE.lineGap;
    const available = width - indent;
    let x = PAGE.marginX + indent;
    let lineStarted = false;

    for (const run of runs) {
      doc.setFont("helvetica", bold || run.bold ? "bold" : "normal");
      doc.setFontSize(size);

      for (const word of run.text.split(/\s+/).filter(Boolean)) {
        const piece = lineStarted ? ` ${word}` : word;
        const pieceWidth = doc.getTextWidth(piece);

        if (lineStarted && x + pieceWidth > PAGE.marginX + indent + available) {
          y += lineHeight;
          room(lineHeight);
          x = PAGE.marginX + indent;
          lineStarted = false;
          doc.text(word, x, y);
          x += doc.getTextWidth(word);
        } else {
          room(lineHeight);
          doc.text(piece, x, y);
          x += pieceWidth;
        }
        lineStarted = true;
      }
    }

    y += lineHeight + gapAfter;
  }

  /* The title, once, at the top */
  room(30);
  drawRuns([{ text: title, bold: true }], { size: 19, bold: true, gapAfter: 6 });

  doc.setDrawColor(210);
  doc.line(PAGE.marginX, y - 4, pageWidth - PAGE.marginX, y - 4);
  y += 16;

  for (const block of parseMarkdown(markdown)) {
    if (block.type === "h") {
      const size = block.level <= 1 ? 15 : block.level === 2 ? 13 : 11.5;
      y += 8;
      room(size * 2);
      drawRuns(block.runs, { size, bold: true, gapAfter: 4 });
      continue;
    }

    if (block.type === "li") {
      const marker = block.ordered ? `${block.number}.` : "•";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(PAGE.body);
      room(PAGE.body * PAGE.lineGap);
      doc.text(marker, PAGE.marginX + 6, y);
      drawRuns(block.runs, { size: PAGE.body, bold: false, indent: 26, gapAfter: 3 });
      continue;
    }

    if (block.type === "quote") {
      drawRuns(block.runs, { size: PAGE.body, bold: false, indent: 18, gapAfter: 6 });
      continue;
    }

    drawRuns(block.runs, { size: PAGE.body, bold: false, gapAfter: 7 });
  }

  /* Page numbers last, once the page count is known */
  const total = doc.getNumberOfPages();
  for (let n = 1; n <= total; n += 1) {
    doc.setPage(n);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140);
    doc.text(`${n} of ${total}`, pageWidth / 2, pageHeight - 30, { align: "center" });
    doc.setTextColor(0);
  }

  saveBlob(doc.output("blob"), `${slugForFile(title)}.pdf`);
}

/* --------------------------------------------------------------------------
   SECTION: Word

   The same blocks, handed to a real .docx writer. This is the one people
   actually edit afterwards, which is most of them.
   -------------------------------------------------------------------------- */

export async function downloadDocx(title, markdown) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const runs = (list) =>
    list.map((r) => new TextRun({ text: r.text, bold: r.bold }));

  const children = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 38 })],
      spacing: { after: 240 },
    }),
  ];

  for (const block of parseMarkdown(markdown)) {
    if (block.type === "h") {
      children.push(
        new Paragraph({
          children: runs(block.runs.map((r) => ({ ...r, bold: true }))),
          heading:
            block.level <= 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (block.type === "li") {
      children.push(
        new Paragraph({
          children: runs(block.runs),
          bullet: block.ordered ? undefined : { level: 0 },
          numbering: undefined,
          indent: block.ordered ? { left: 480 } : undefined,
          spacing: { after: 80 },
          ...(block.ordered
            ? { children: runs([{ text: `${block.number}. `, bold: false }, ...block.runs]) }
            : {}),
        })
      );
      continue;
    }

    if (block.type === "quote") {
      children.push(
        new Paragraph({
          children: runs(block.runs),
          indent: { left: 480 },
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
        })
      );
      continue;
    }

    children.push(new Paragraph({ children: runs(block.runs), spacing: { after: 160 } }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `${slugForFile(title)}.docx`);
}

/* Kept because it costs nothing and somebody working in a text editor may
   still want it. It is no longer what the button does. */
export function downloadMarkdown(title, markdown) {
  saveBlob(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    `${slugForFile(title)}.md`
  );
}
