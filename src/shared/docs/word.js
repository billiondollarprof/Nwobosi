/* ==========================================================================
   THE WORD FILE

   The format most people edit afterwards, so it is built out of real Word
   parts rather than made to look right: real heading styles (so the
   navigation pane and a table of contents work), real numbered lists (so
   adding a step renumbers the rest), and real tables.

   WHAT CHANGED ON 2026-09-23
   - The title was printed twice, once by this writer and once as the
     document's own heading. It is printed once now, from the model.
   - The body fell back to Word's default font while the headings did not.
     One font throughout now, set in the document's own styles.
   - Numbered lists were typed-in numbers. They are real numbering now.
   - The notes to the person are no longer in the file. See
     documentModel.js.

   READ TOP TO BOTTOM
     1. Runs
     2. Blocks
     3. Styles, numbering, footer, and writing the file
   ========================================================================== */

import { THEME, themeFor } from "./documentTheme.js";
import { plainText } from "./documentModel.js";
import { imageKey } from "./imageKey.js";

/* Half points. Word measures font size in halves. */
const half = (pt) => Math.round(pt * 2);

/* --------------------------------------------------------------------------
   SECTION 1: Runs
   -------------------------------------------------------------------------- */

function runsOf(docx, runs, extra = {}) {
  const { TextRun } = docx;
  return (runs ?? []).map((run) =>
    run.br ? new TextRun({ break: 1 }) : new TextRun({ text: run.text, bold: run.bold, italics: run.italic, ...extra }),
  );
}

const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

/* --------------------------------------------------------------------------
   SECTION 2: Blocks
   -------------------------------------------------------------------------- */

/* The width between the margins, in twips (a twentieth of a point), which
   is what Word measures in. A4 is 11906 wide and each side margin is 1250.
   Design tables are given exact widths from this, not percentages: some
   programs that open .docx files ignore percentage widths and squeeze the
   cards to the width of their words. */
const CONTENT_TWIPS = 11906 - 1250 * 2;

/* A table with no lines: the shading does the work. Used for every design
   block below, because a Word table is the one thing that keeps boxes side
   by side and the same height on every copy of Word. */
function noBorders(docx) {
  const none = { style: docx.BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
}

/* The blocks inside a card or beside a figure, as plain paragraphs. A list
   becomes lines with a bullet character, which travels safely inside a
   table cell. */
function innerParagraphs(docx, blocks, runOptions = {}) {
  const { Paragraph, TextRun } = docx;
  const out = [];
  for (const block of blocks) {
    if (block.type === "list") {
      block.items.forEach((item, i) =>
        out.push(new Paragraph({
          children: [new TextRun({ text: block.ordered ? `${block.start + i}.  ` : "•  ", ...runOptions }), ...runsOf(docx, item.runs, runOptions)],
          spacing: { after: 60 },
        })),
      );
    } else if (block.runs) {
      out.push(new Paragraph({ children: runsOf(docx, block.runs, runOptions), spacing: { after: 100 } }));
    }
  }
  return out.length ? out : [new Paragraph({ children: [] })];
}

/* Cards (and numbered steps) as one row of shaded cells with thin empty
   cells between them. Four or more go two to a row. */
function cardsTable(docx, block, t, numbered) {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType } = docx;
  const per = block.items.length > 3 ? 2 : block.items.length;
  const GAP = 180;
  const cardW = Math.floor((CONTENT_TWIPS - GAP * (per - 1)) / per);
  const columnWidths = [];
  for (let c = 0; c < per; c += 1) {
    if (c) columnWidths.push(GAP);
    columnWidths.push(cardW);
  }
  const rows = [];
  for (let i = 0; i < block.items.length; i += per) {
    const cells = [];
    block.items.slice(i, i + per).forEach((item, c) => {
      if (c) cells.push(new TableCell({ children: [new Paragraph({ children: [] })], width: { size: GAP, type: WidthType.DXA } }));
      cells.push(new TableCell({
        width: { size: cardW, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: t.accentTint, color: "auto" },
        margins: { top: 160, bottom: 160, left: 180, right: 180 },
        children: [
          new Paragraph({
            children: [
              ...(numbered ? [new TextRun({ text: `${i + c + 1}  `, bold: true, color: t.accent })] : []),
              ...runsOf(docx, item.title, { bold: true, color: t.accent, size: half(12.5) }),
            ],
            spacing: { after: 40 },
          }),
          ...(item.kicker ? [new Paragraph({ children: [new TextRun({ text: item.kicker, bold: true, size: half(9), color: t.kicker })], spacing: { after: 100 } })] : []),
          ...innerParagraphs(docx, item.blocks, { size: half(10) }),
        ],
      }));
    });
    rows.push(new TableRow({ cantSplit: true, children: cells }));
    if (i + per < block.items.length) {
      rows.push(new TableRow({ children: [new TableCell({ columnSpan: cells.length, children: [new Paragraph({ children: [], spacing: { after: 0 } })] })] }));
    }
  }
  return new Table({ width: { size: CONTENT_TWIPS, type: WidthType.DXA }, columnWidths, borders: noBorders(docx), rows });
}

/* A short figure ("20%") can be huge; a longer one ("30 days",
   "₦1.3m") steps down so it stays on one line in the panel. */
function figureSize(value) {
  const n = String(value ?? "").length;
  return n <= 4 ? 32 : n <= 7 ? 26 : 20;
}

function statTable(docx, block, t) {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, VerticalAlign } = docx;
  const panel = Math.round(CONTENT_TWIPS * 0.38);
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [panel, CONTENT_TWIPS - panel],
    borders: noBorders(docx),
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: panel, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: t.accent, color: "auto" },
          margins: { top: 240, bottom: 240, left: 200, right: 200 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: block.value, bold: true, size: half(figureSize(block.value)), color: "FFFFFF" })] }),
            ...(block.caption ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: block.caption, size: half(10), color: t.onAccentSoft ?? "FFFFFF" })] })] : []),
          ],
        }),
        new TableCell({
          width: { size: CONTENT_TWIPS - panel, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 280, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: innerParagraphs(docx, block.blocks),
        }),
      ],
    })],
  });
}

function takeawayTable(docx, block, t) {
  const { Table, TableRow, TableCell, WidthType, ShadingType, Paragraph } = docx;
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [CONTENT_TWIPS],
    borders: noBorders(docx),
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        width: { size: CONTENT_TWIPS, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: t.accent, color: "auto" },
        margins: { top: 160, bottom: 160, left: 220, right: 220 },
        children: [new Paragraph({ children: runsOf(docx, block.runs, { bold: true, color: "FFFFFF" }) })],
      })],
    })],
  });
}

/* Under every figure: "Figure 2. The front desk", then its source,
   smaller. The number only shows when the document numbers its figures
   (documentModel.js, section 5). Charts use this too. */
function figureCaptionParagraphs(docx, block) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const out = [];
  const hasSource = Boolean(block.source);
  if (block.figure || block.caption) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: hasSource ? 20 : 200 },
      children: [
        ...(block.figure ? [new TextRun({ text: `Figure ${block.figure}.${block.caption ? " " : ""}`, size: half(9), color: THEME.muted, bold: true })] : []),
        ...(block.caption ? [new TextRun({ text: block.caption, size: half(9), color: THEME.muted, italics: true })] : []),
      ],
    }));
  }
  if (hasSource) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: block.source, size: half(8), color: THEME.muted })],
    }));
  }
  return out;
}

/* A picture, as wide as the text at most and never taller than half a
   page, centred, with its caption under it. A picture that could not be
   found is a shaded line naming it. Word wants the bytes, not an address. */
function imageParagraphs(docx, block, t, images) {
  const { Paragraph, TextRun, ImageRun, AlignmentType, ShadingType } = docx;
  const found = images?.get(imageKey(block.name));
  const caption = figureCaptionParagraphs(docx, block);
  if (!found) {
    return [new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: t.accentTint, color: "auto" },
      spacing: { before: 120, after: caption.length ? 60 : 200 },
      children: [new TextRun({ text: `Picture to add here: ${block.name}`, color: THEME.muted })],
    }), ...caption];
  }
  const binary = atob(found.dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  /* Pixels at 96 to the inch. The text is about 627 wide on A4 here. */
  const scale = Math.min(620 / found.width, 420 / found.height, 1);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: caption.length ? 60 : 200, line: 240, lineRule: "auto" },
      children: [new ImageRun({
        type: found.mime === "image/jpeg" ? "jpg" : "png",
        data: bytes,
        transformation: { width: Math.round(found.width * scale), height: Math.round(found.height * scale) },
      })],
    }),
    ...caption,
  ];
}

function labelParagraph(docx, text, t) {
  const { Paragraph, TextRun } = docx;
  return new Paragraph({
    keepNext: true,
    spacing: { before: 280, after: 0 },
    children: [new TextRun({ text: String(text).toUpperCase(), bold: true, size: half(8.5), color: t.accent, characterSpacing: 30 })],
  });
}

function blocksToWord(docx, doc, t, images) {
  const { Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } = docx;
  const out = [];
  /* After a design block, an empty paragraph: two tables touching are
     merged into one by Word. */
  const spacer = () => out.push(new Paragraph({ children: [], spacing: { after: 120 } }));

  out.push(new Paragraph({ style: "DocTitle", children: runsOf(docx, [{ text: doc.title }]) }));
  if (doc.subtitle) out.push(new Paragraph({ style: "DocSubtitle", children: runsOf(docx, [{ text: doc.subtitle }]) }));

  const levels = doc.blocks.filter((b) => b.type === "h").map((b) => b.level);
  const shift = levels.length ? Math.min(...levels) - 1 : 0;
  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

  /* Each numbered list gets its own numbering instance, so the second list
     in a document starts at 1 again rather than carrying on from the first. */
  let listCount = 0;

  for (const block of doc.blocks) {
    if (block.type === "h") {
      const level = Math.max(1, Math.min(4, block.level - shift));
      if (block.label) out.push(labelParagraph(docx, block.label, t));
      out.push(new Paragraph({
        heading: HEADINGS[level - 1],
        children: runsOf(docx, block.runs),
        /* The label above already made the gap. */
        ...(block.label ? { spacing: { before: 40 } } : {}),
      }));
      continue;
    }

    if (block.type === "cards" || block.type === "steps") {
      out.push(cardsTable(docx, block, t, block.type === "steps"));
      spacer();
      continue;
    }
    if (block.type === "stat") {
      out.push(statTable(docx, block, t));
      spacer();
      continue;
    }
    if (block.type === "takeaway") {
      out.push(takeawayTable(docx, block, t));
      spacer();
      continue;
    }
    if (block.type === "label") {
      out.push(labelParagraph(docx, block.text, t));
      continue;
    }
    if (block.type === "image") {
      out.push(...imageParagraphs(docx, block, t, images));
      continue;
    }

    if (block.type === "list") {
      listCount += 1;
      for (const item of block.items) {
        out.push(
          new Paragraph({
            children: runsOf(docx, item.runs),
            ...(block.ordered
              ? { numbering: { reference: "steps", level: 0, instance: listCount } }
              : { numbering: { reference: "points", level: 0 } }),
            spacing: { after: 60 },
          }),
        );
      }
      out.push(new Paragraph({ children: [], spacing: { after: 60 } }));
      continue;
    }

    if (block.type === "quote") {
      out.push(
        new Paragraph({
          children: runsOf(docx, block.runs, { italics: true }),
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: t.accent, space: 10 } },
          shading: { type: ShadingType.CLEAR, fill: t.accentTint, color: "auto" },
          spacing: { before: 120, after: 200 },
        }),
      );
      continue;
    }

    if (block.type === "table") {
      const numeric = block.header.map((_, i) =>
        block.rows.length > 0 && block.rows.every((row) => NUMERIC.test(plainText(row[i] ?? []).trim())),
      );
      const hair = { style: BorderStyle.SINGLE, size: 4, color: THEME.rule };
      const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const cell = (runs, i, { head = false, zebra = false } = {}) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: numeric[i] ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: runsOf(docx, runs, head ? { bold: true, color: "FFFFFF" } : {}),
            }),
          ],
          shading: head
            ? { type: ShadingType.CLEAR, fill: t.accent, color: "auto" }
            : zebra
            ? { type: ShadingType.CLEAR, fill: THEME.zebra, color: "auto" }
            : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: { top: none, left: none, right: none, bottom: hair },
        });

      out.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: block.header.map((c, i) => cell(c, i, { head: true })) }),
            ...block.rows.map((row, r) => new TableRow({ cantSplit: true, children: row.map((c, i) => cell(c, i, { zebra: r % 2 === 1 })) })),
          ],
        }),
      );
      /* Two tables touching are merged into one by Word. */
      out.push(new Paragraph({ children: [], spacing: { after: 120 } }));
      continue;
    }

    out.push(new Paragraph({ children: runsOf(docx, block.runs) }));
  }

  return out;
}

/* --------------------------------------------------------------------------
   SECTION 3: Styles, numbering, footer, and the file
   -------------------------------------------------------------------------- */

export async function wordBlob(doc, t = themeFor(), images = null) {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Footer, AlignmentType, PageNumber, LevelFormat } = docx;

  const heading = (id, name, size, color, before, after) => ({
    id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
    run: { size: half(size), bold: true, color, font: THEME.officeFont },
    paragraph: { spacing: { before, after }, keepNext: true },
  });

  const document = new Document({
    title: doc.title,
    styles: {
      default: {
        document: {
          run: { font: THEME.officeFont, size: half(THEME.size.body + 0.5), color: THEME.body },
          /* The rule is said out loud. Word reads a missing rule as "auto",
             LibreOffice reads it as an exact height, and an exact height
             cuts an inline picture down to one line of text. */
          paragraph: { spacing: { after: 140, line: 300, lineRule: "auto" } },
        },
      },
      paragraphStyles: [
        { id: "DocTitle", name: "Document title", basedOn: "Normal", next: "Normal",
          run: { size: half(THEME.size.title + 2), bold: true, color: THEME.ink, font: THEME.officeFont },
          paragraph: { spacing: { after: 80 } } },
        { id: "DocSubtitle", name: "Document subtitle", basedOn: "Normal", next: "Normal",
          run: { size: half(THEME.size.subtitle + 1), color: THEME.muted, font: THEME.officeFont },
          paragraph: { spacing: { after: 320 } } },
        heading("Heading1", "Heading 1", THEME.size.h1 + 1, t.accent, 360, 120),
        heading("Heading2", "Heading 2", THEME.size.h2 + 0.5, THEME.ink, 280, 100),
        heading("Heading3", "Heading 3", THEME.size.h3 + 0.5, THEME.ink, 220, 80),
        heading("Heading4", "Heading 4", THEME.size.body + 1, THEME.ink, 180, 60),
      ],
    },
    numbering: {
      config: [
        { reference: "points", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } }, run: { color: t.accent } } }] },
        { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 320 } }, run: { color: t.accent, bold: true } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1300, left: 1250, right: 1250 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: half(THEME.size.small), color: THEME.muted }),
                  new TextRun({ text: " of ", size: half(THEME.size.small), color: THEME.muted }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: half(THEME.size.small), color: THEME.muted }),
                ],
              }),
            ],
          }),
        },
        children: blocksToWord(docx, doc, t, images),
      },
    ],
  });

  return Packer.toBlob(document);
}
