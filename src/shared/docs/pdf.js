/* ==========================================================================
   THE PDF

   WHY THIS WAS REWRITTEN, 2026-09-23
   The old writer drew every word by hand with jsPDF's built in Helvetica.
   Helvetica in a PDF only knows Western European letters, so the first real
   document out of the flow, Amara's pricing FAQ, printed every "₦" as "¦"
   and pulled the rest of each price line apart letter by letter. The same
   hand drawing lost the space in "You don't" and added one in "Essential ,".
   And the title was printed twice.

   Now the page is laid out by pdfmake, a real page layout library, with
   Roboto carried inside the file. Roboto has the naira sign, curly quotes,
   and every other character a business document in this region needs, and
   because the font travels inside the PDF it looks the same on every phone
   and computer that opens it.

   WHAT IT MUST NEVER DO
   - Never print the notes to the person. documentModel.js takes them out.
   - Never leave a heading alone at the bottom of a page with its text on
     the next one. See pageBreakBefore below.

   READ TOP TO BOTTOM
     1. Turning runs and blocks into pdfmake's shapes
     2. The page: title, header, footer
     3. Writing the file
   ========================================================================== */

import { THEME, hex } from "./documentTheme.js";
import { plainText } from "./documentModel.js";

/* --------------------------------------------------------------------------
   SECTION 1: Runs and blocks
   -------------------------------------------------------------------------- */

/* One run of words. A line break is its own "\n" piece, which pdfmake
   treats as a new line inside the same paragraph. */
function textOf(runs, extra = {}) {
  return (runs ?? []).map((run) =>
    run.br ? "\n" : { text: run.text, bold: run.bold || undefined, italics: run.italic || undefined, ...extra },
  );
}

/* A cell that is a price, a number or a percentage lines up on the right,
   so the digits of a column sit under each other the way an accountant
   would expect. */
const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

function tableBlock(block) {
  const columns = block.header.length;
  const longest = block.header.map((cell, i) =>
    Math.max(plainText(cell).length, ...block.rows.map((row) => plainText(row[i] ?? []).length)),
  );
  /* Each column gets a share of the page in proportion to its longest
     cell, with a floor so a short column is never cramped. The first try
     gave all the spare room to one column and left "Yearly" a third of a
     page wide with its numbers pushed to the far edge. */
  /* pdfmake adds each cell's left and right padding (8 + 8) ON TOP of
     these widths, so the padding comes off first. Without that the last
     column ran off the right edge of the page. */
  const PAGE_WIDTH = 595.28 - 56 * 2;
  const room = PAGE_WIDTH - columns * 16 - 2;
  const weight = longest.map((len) => Math.max(len, 8));
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => (w / total) * room);

  const numericColumn = block.header.map((_, i) =>
    block.rows.length > 0 && block.rows.every((row) => NUMERIC.test(plainText(row[i] ?? []).trim())),
  );

  const head = block.header.map((cell, i) => ({
    text: textOf(cell, { bold: true }),
    color: "#FFFFFF",
    fillColor: hex(THEME.accent),
    alignment: numericColumn[i] ? "right" : "left",
  }));
  const body = block.rows.map((row, r) =>
    row.map((cell, i) => ({
      text: textOf(cell),
      fillColor: r % 2 === 1 ? hex(THEME.zebra) : undefined,
      alignment: numericColumn[i] ? "right" : "left",
    })),
  );

  return {
    table: { headerRows: 1, keepWithHeaderRows: 1, widths: widths.slice(0, columns), body: [head, ...body], dontBreakRows: true },
    /* A short table moves to the next page whole, rather than leaving its
       header alone at the bottom of this one. A long one still breaks, and
       repeats its header on every page. */
    unbreakable: block.rows.length <= 18,
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => hex(THEME.rule),
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    fontSize: THEME.size.body - 0.5,
    margin: [0, 6, 0, 14],
  };
}

function quoteBlock(block) {
  return {
    table: { widths: ["*"], body: [[{ text: textOf(block.runs), italics: true, color: hex(THEME.body) }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i) => (i === 0 ? 3 : 0),
      vLineColor: () => hex(THEME.accent),
      fillColor: () => hex(THEME.accentTint),
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 4, 0, 12],
  };
}

const HEADING = {
  1: { fontSize: THEME.size.h1, color: hex(THEME.accent), margin: [0, 18, 0, 6] },
  2: { fontSize: THEME.size.h2, color: hex(THEME.ink), margin: [0, 14, 0, 5] },
  3: { fontSize: THEME.size.h3, color: hex(THEME.ink), margin: [0, 10, 0, 4] },
  4: { fontSize: THEME.size.body, color: hex(THEME.ink), margin: [0, 8, 0, 3] },
};

export function blocksToPdf(blocks) {
  /* The model writes "##" for its top sections, because "#" was the title.
     So the shallowest heading used in the body is treated as level 1 and
     gets the accent colour, whatever number of hashes it had. */
  const levels = blocks.filter((b) => b.type === "h").map((b) => b.level);
  const shift = levels.length ? Math.min(...levels) - 1 : 0;

  return blocks.map((block) => {
    if (block.type === "h") {
      const level = Math.max(1, Math.min(4, block.level - shift));
      return { text: textOf(block.runs), bold: true, headlineLevel: level, ...HEADING[level] };
    }
    if (block.type === "list") {
      const items = block.items.map((item) => ({ text: textOf(item.runs), margin: [0, 0, 0, 3] }));
      return block.ordered
        ? { ol: items, start: block.start, markerColor: hex(THEME.accent), margin: [4, 0, 0, 10] }
        : { ul: items, markerColor: hex(THEME.accent), margin: [4, 0, 0, 10] };
    }
    if (block.type === "quote") return quoteBlock(block);
    if (block.type === "table") return tableBlock(block);
    return { text: textOf(block.runs), margin: [0, 0, 0, 9] };
  });
}

/* --------------------------------------------------------------------------
   SECTION 2: The page
   -------------------------------------------------------------------------- */

export function pdfDefinition(doc) {
  const titleBlock = [
    { text: doc.title, fontSize: THEME.size.title, bold: true, color: hex(THEME.ink), lineHeight: 1.15 },
    ...(doc.subtitle
      ? [{ text: doc.subtitle, fontSize: THEME.size.subtitle, color: hex(THEME.muted), margin: [0, 6, 0, 0] }]
      : []),
    /* A short accent bar under the title. The one decoration on the page. */
    { canvas: [{ type: "rect", x: 0, y: 0, w: 44, h: 3, color: hex(THEME.accent) }], margin: [0, 14, 0, 18] },
  ];

  return {
    pageSize: "A4",
    pageMargins: [56, 64, 56, 64],
    info: { title: doc.title },
    defaultStyle: { font: "Roboto", fontSize: THEME.size.body, color: hex(THEME.body), lineHeight: 1.35 },

    /* The title again, small, from page two on, so a printed page that gets
       separated from the rest still says what it belongs to. */
    header: (page) =>
      page > 1
        ? { text: doc.title, alignment: "right", fontSize: THEME.size.small, color: hex(THEME.muted), margin: [56, 30, 56, 0] }
        : null,
    footer: (page, count) => ({
      text: `${page} of ${count}`,
      alignment: "center",
      fontSize: THEME.size.small,
      color: hex(THEME.muted),
      margin: [0, 26, 0, 0],
    }),

    content: [...titleBlock, ...blocksToPdf(doc.blocks)],

    /* A HEADING NEVER ENDS A PAGE. If nothing that follows a heading fits
       on the same page, the heading moves to the next page with it. */
    pageBreakBefore: (node, page) =>
      Boolean(node.headlineLevel) &&
      /* pdfmake 0.3 hands a helper object rather than the list itself. */
      page.getFollowingNodesOnPage().filter((n) => !n.headlineLevel).length === 0,
  };
}

/* --------------------------------------------------------------------------
   SECTION 3: Writing the file

   pdfmake and its font are about a megabyte, so they load only when
   somebody actually asks for a PDF.
   -------------------------------------------------------------------------- */

export async function pdfBlob(doc) {
  const [{ default: pdfMake }, fonts] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  pdfMake.addVirtualFileSystem(fonts.default ?? fonts);
  return pdfMake.createPdf(pdfDefinition(doc)).getBlob();
}
