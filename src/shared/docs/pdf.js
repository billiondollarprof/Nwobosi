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
   because the font travels inside the PDF it looks the same everywhere.

   DESIGNED, NOT JUST TYPED, later the same day. Anthony: "top tier
   formatted documents that the staff won't have any need to edit." So the
   design blocks the slides draw (cards, steps, a big figure, a takeaway, a
   section label; see documentModel.js) are drawn on the page too, in the
   company's own colour (themeFor in documentTheme.js).

   WHAT IT MUST NEVER DO
   - Never print the notes to the person. documentModel.js takes them out.
   - Never leave a heading alone at the bottom of a page with its text on
     the next one. See pageBreakBefore below.

   READ TOP TO BOTTOM
     1. Runs, and the small pieces
     2. The design blocks
     3. All blocks
     4. The page: title, header, footer
     5. Writing the file
   ========================================================================== */

import { THEME, themeFor, hex } from "./documentTheme.js";
import { plainText } from "./documentModel.js";

/* The usable width of an A4 page between the margins, in points. */
const PAGE_WIDTH = 595.28 - 56 * 2;

/* --------------------------------------------------------------------------
   SECTION 1: Runs, and the small pieces
   -------------------------------------------------------------------------- */

/* One run of words. A line break is its own "\n" piece, which pdfmake
   treats as a new line inside the same paragraph. */
function textOf(runs, extra = {}) {
  return (runs ?? []).map((run) =>
    run.br ? "\n" : { text: run.text, bold: run.bold || undefined, italics: run.italic || undefined, ...extra },
  );
}

/* A cell that is a price, a number or a percentage lines up on the right,
   so the digits of a column sit under each other. */
const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

/* A box with no lines round it: the fill does the work. */
function boxLayout(pad) {
  return {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => pad,
    paddingRight: () => pad,
    paddingTop: () => pad,
    paddingBottom: () => pad,
  };
}

function tableBlock(block, t) {
  const columns = block.header.length;
  const longest = block.header.map((cell, i) =>
    Math.max(plainText(cell).length, ...block.rows.map((row) => plainText(row[i] ?? []).length)),
  );
  /* Each column a share of the page in proportion to its longest cell,
     with a floor. pdfmake adds each cell's padding (8 + 8) ON TOP of these
     widths, so the padding comes off first, or the last column runs off
     the page. */
  const room = PAGE_WIDTH - columns * 16 - 2;
  const weight = longest.map((len) => Math.max(len, 8));
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => (w / total) * room);

  const numericColumn = block.header.map((_, i) =>
    block.rows.length > 0 && block.rows.every((row) => NUMERIC.test(plainText(row[i] ?? []).trim()) || !plainText(row[i] ?? []).trim()),
  );

  const head = block.header.map((cell, i) => ({
    text: textOf(cell, { bold: true }),
    color: "#FFFFFF",
    fillColor: hex(t.accent),
    alignment: numericColumn[i] ? "right" : "left",
  }));
  const body = block.rows.map((row, r) => {
    /* A row whose first cell says "Total" reads as the total. */
    const totalRow = /^total/i.test(plainText(row[0] ?? []).trim());
    return row.map((cell, i) => ({
      text: textOf(cell, totalRow ? { bold: true } : {}),
      fillColor: totalRow ? hex(t.accentTint) : r % 2 === 1 ? hex(THEME.zebra) : undefined,
      alignment: numericColumn[i] ? "right" : "left",
    }));
  });

  return {
    table: { headerRows: 1, keepWithHeaderRows: 1, widths, body: [head, ...body], dontBreakRows: true },
    /* A short table moves to the next page whole rather than leaving its
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

function quoteBlock(block, t) {
  return {
    table: { widths: ["*"], body: [[{ text: textOf(block.runs), italics: true, color: hex(THEME.body) }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i) => (i === 0 ? 3 : 0),
      vLineColor: () => hex(t.accent),
      fillColor: () => hex(t.accentTint),
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 4, 0, 12],
  };
}

/* --------------------------------------------------------------------------
   SECTION 2: The design blocks
   -------------------------------------------------------------------------- */

function labelText(text, t) {
  return { text: String(text).toUpperCase(), fontSize: 8, bold: true, color: hex(t.accent), characterSpacing: 1.2, margin: [0, 14, 0, 0] };
}

/* Cards side by side, each a tinted box. Steps are the same, numbered.
   Three across at most on a page; four or more go two by two.

   ONE TABLE ROW, WITH THIN EMPTY COLUMNS BETWEEN THE CARDS. Cells in the
   same row are always the same height, so the cards line up at the bottom
   even when one says less than the others. Separate columns did not: the
   shortest card stopped short on 2026-09-23. */
function cardsBlock(block, t, numbered) {
  const per = block.items.length > 3 ? 2 : block.items.length;
  const rows = [];
  for (let i = 0; i < block.items.length; i += per) rows.push(block.items.slice(i, i + per));

  const card = (item, n) => ({
    fillColor: hex(t.accentTint),
    stack: [
      { text: [...(numbered ? [{ text: `${n}  `, color: hex(t.accent), bold: true }] : []), ...textOf(item.title)], bold: true, color: hex(t.accent), fontSize: 11.5 },
      ...(item.kicker ? [{ text: item.kicker, bold: true, fontSize: 8.5, color: hex(t.kicker), margin: [0, 2, 0, 0] }] : []),
      { stack: blocksToPdf(item.blocks, t), fontSize: 9.5, margin: [0, 6, 0, 0] },
    ],
  });
  const gap = { text: "" };

  return {
    stack: rows.map((row, r) => {
      const cells = [];
      const widths = [];
      row.forEach((item, c) => {
        if (c) { cells.push(gap); widths.push(8); }
        cells.push(card(item, r * per + c + 1));
        widths.push("*");
      });
      return {
        table: { widths, body: [cells], dontBreakRows: true },
        layout: {
          ...boxLayout(12),
          paddingLeft: (i) => (i % 2 ? 0 : 12),
          paddingRight: (i) => (i % 2 ? 0 : 12),
        },
        margin: [0, r ? 8 : 4, 0, 0],
      };
    }),
    unbreakable: true,
    margin: [0, 2, 0, 14],
  };
}

/* One big figure on a coloured panel, its story beside it. */
function statBlock(block, t) {
  return {
    table: {
      widths: [170, "*"],
      body: [[
        {
          fillColor: hex(t.accent),
          stack: [
            { text: block.value, fontSize: String(block.value).length <= 4 ? 32 : String(block.value).length <= 7 ? 26 : 20, bold: true, color: "#FFFFFF", alignment: "center" },
            ...(block.caption ? [{ text: block.caption, fontSize: 9.5, color: hex(t.onAccentSoft ?? "FFFFFF"), alignment: "center", margin: [0, 4, 0, 0] }] : []),
          ],
        },
        { stack: blocksToPdf(block.blocks, t), margin: [8, 0, 0, 0] },
      ]],
    },
    layout: { ...boxLayout(14), paddingLeft: (i) => (i === 0 ? 14 : 6) },
    unbreakable: true,
    margin: [0, 4, 0, 14],
  };
}

function takeawayBlock(block, t) {
  return {
    table: { widths: ["*"], body: [[{ text: textOf(block.runs, { bold: true }), color: "#FFFFFF", fillColor: hex(t.accent) }]] },
    layout: boxLayout(11),
    unbreakable: true,
    margin: [0, 4, 0, 14],
  };
}

/* --------------------------------------------------------------------------
   SECTION 3: All blocks
   -------------------------------------------------------------------------- */

function headingStyle(level, t) {
  return {
    1: { fontSize: THEME.size.h1, color: hex(t.accent), margin: [0, 18, 0, 6] },
    2: { fontSize: THEME.size.h2, color: hex(THEME.ink), margin: [0, 14, 0, 5] },
    3: { fontSize: THEME.size.h3, color: hex(THEME.ink), margin: [0, 10, 0, 4] },
    4: { fontSize: THEME.size.body, color: hex(THEME.ink), margin: [0, 8, 0, 3] },
  }[level];
}

export function blocksToPdf(blocks, t = themeFor()) {
  /* The model writes "##" for its top sections, because "#" was the title.
     So the shallowest heading used is treated as level 1 and gets the
     accent colour, whatever number of hashes it had. */
  const levels = blocks.filter((b) => b.type === "h").map((b) => b.level);
  const shift = levels.length ? Math.min(...levels) - 1 : 0;

  const out = [];
  for (const block of blocks) {
    if (block.type === "h") {
      const level = Math.max(1, Math.min(4, block.level - shift));
      const style = headingStyle(level, t);
      if (block.label) {
        /* The label rides with its heading, so the two never split. */
        /* headlineLevel on the parts as well as the whole: the page break
           rule below counts what follows a heading, and without this it
           counted the heading's own title as "something that follows", so
           a labelled heading could be left alone at the foot of a page. */
        out.push({
          stack: [
            { ...labelText(block.label, t), headlineLevel: level },
            { text: textOf(block.runs), bold: true, ...style, margin: [0, 2, 0, style.margin[3]], headlineLevel: level },
          ],
          headlineLevel: level,
        });
      } else {
        out.push({ text: textOf(block.runs), bold: true, headlineLevel: level, ...style });
      }
    } else if (block.type === "list") {
      const items = block.items.map((item) => ({ text: textOf(item.runs), margin: [0, 0, 0, 3] }));
      out.push(block.ordered
        ? { ol: items, start: block.start, markerColor: hex(t.accent), margin: [4, 0, 0, 10] }
        : { ul: items, markerColor: hex(t.accent), margin: [4, 0, 0, 10] });
    } else if (block.type === "quote") out.push(quoteBlock(block, t));
    else if (block.type === "table") out.push(tableBlock(block, t));
    else if (block.type === "cards") out.push(cardsBlock(block, t, false));
    else if (block.type === "steps") out.push(cardsBlock(block, t, true));
    else if (block.type === "stat") out.push(statBlock(block, t));
    else if (block.type === "takeaway") out.push(takeawayBlock(block, t));
    else if (block.type === "label") out.push(labelText(block.text, t));
    else if (block.runs) out.push({ text: textOf(block.runs), margin: [0, 0, 0, 9] });
  }
  return out;
}

/* --------------------------------------------------------------------------
   SECTION 4: The page
   -------------------------------------------------------------------------- */

/* The page number and the running title are laid out with the page, so the
   page break rule sees them as "something after the heading" and never
   fired. They carry this id so the rule can skip them. */
const RUNNING = "running-header-or-footer";

export function pdfDefinition(doc, t = themeFor(), brand = null) {
  const titleBlock = [
    ...(brand?.name ? [{ text: brand.name.toUpperCase(), fontSize: 8.5, bold: true, color: hex(t.accent), characterSpacing: 1.2, margin: [0, 0, 0, 6] }] : []),
    { text: doc.title, fontSize: THEME.size.title, bold: true, color: hex(THEME.ink), lineHeight: 1.15 },
    ...(doc.subtitle
      ? [{ text: doc.subtitle, fontSize: THEME.size.subtitle, color: hex(THEME.muted), margin: [0, 6, 0, 0] }]
      : []),
    /* A short accent bar under the title. */
    { canvas: [{ type: "rect", x: 0, y: 0, w: 44, h: 3, color: hex(t.accent) }], margin: [0, 14, 0, 18] },
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
        ? { id: RUNNING, text: brand?.name ? `${brand.name}  ·  ${doc.title}` : doc.title, alignment: "right", fontSize: THEME.size.small, color: hex(THEME.muted), margin: [56, 30, 56, 0] }
        : null,
    footer: (page, count) => ({
      id: RUNNING,
      text: `${page} of ${count}`,
      alignment: "center",
      fontSize: THEME.size.small,
      color: hex(THEME.muted),
      margin: [0, 26, 0, 0],
    }),

    content: [...titleBlock, ...blocksToPdf(doc.blocks, t)],

    /* A HEADING NEVER ENDS A PAGE. If nothing that follows a heading fits
       on the same page, the heading moves to the next page with it. */
    pageBreakBefore: (node, page) =>
      Boolean(node.headlineLevel) &&
      /* pdfmake 0.3 hands a helper object rather than the list itself. */
      page.getFollowingNodesOnPage().filter((n) => !n.headlineLevel && n.id !== RUNNING).length === 0,
  };
}

/* --------------------------------------------------------------------------
   SECTION 5: Writing the file

   pdfmake and its font are about a megabyte, so they load only when
   somebody actually asks for a PDF.
   -------------------------------------------------------------------------- */

export async function pdfBlob(doc, t = themeFor(), brand = null) {
  const [{ default: pdfMake }, fonts] = await Promise.all([
    import("pdfmake/build/pdfmake.js"),
    import("pdfmake/build/vfs_fonts.js"),
  ]);
  pdfMake.addVirtualFileSystem(fonts.default ?? fonts);
  return pdfMake.createPdf(pdfDefinition(doc, t, brand)).getBlob();
}
