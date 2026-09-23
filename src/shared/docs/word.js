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

import { THEME } from "./documentTheme.js";
import { plainText } from "./documentModel.js";

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

function blocksToWord(docx, doc) {
  const { Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } = docx;
  const out = [];

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
      out.push(new Paragraph({ heading: HEADINGS[level - 1], children: runsOf(docx, block.runs) }));
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
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: THEME.accent, space: 10 } },
          shading: { type: ShadingType.CLEAR, fill: THEME.accentTint, color: "auto" },
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
            ? { type: ShadingType.CLEAR, fill: THEME.accent, color: "auto" }
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

export async function wordBlob(doc) {
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
          paragraph: { spacing: { after: 140, line: 300 } },
        },
      },
      paragraphStyles: [
        { id: "DocTitle", name: "Document title", basedOn: "Normal", next: "Normal",
          run: { size: half(THEME.size.title + 2), bold: true, color: THEME.ink, font: THEME.officeFont },
          paragraph: { spacing: { after: 80 } } },
        { id: "DocSubtitle", name: "Document subtitle", basedOn: "Normal", next: "Normal",
          run: { size: half(THEME.size.subtitle + 1), color: THEME.muted, font: THEME.officeFont },
          paragraph: { spacing: { after: 320 } } },
        heading("Heading1", "Heading 1", THEME.size.h1 + 1, THEME.accent, 360, 120),
        heading("Heading2", "Heading 2", THEME.size.h2 + 0.5, THEME.ink, 280, 100),
        heading("Heading3", "Heading 3", THEME.size.h3 + 0.5, THEME.ink, 220, 80),
        heading("Heading4", "Heading 4", THEME.size.body + 1, THEME.ink, 180, 60),
      ],
    },
    numbering: {
      config: [
        { reference: "points", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } }, run: { color: THEME.accent } } }] },
        { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 320 } }, run: { color: THEME.accent, bold: true } } }] },
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
        children: blocksToWord(docx, doc),
      },
    ],
  });

  return Packer.toBlob(document);
}
