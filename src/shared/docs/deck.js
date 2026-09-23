/* ==========================================================================
   THE SLIDES

   WHY THIS WAS REWRITTEN, 2026-09-23
   The first real deck out of the flow, Amara's pricing FAQ, had its price
   table drawn ON TOP of the bullets above it. The table was put at a fixed
   height whatever the bullets needed. It also printed a quote's ">" as
   text, turned numbered steps into bullets, and lost every bold word.

   HOW IT LAYS A SLIDE OUT NOW
   Everything under a section heading is measured BEFORE anything is
   placed. Text fills the slide from the top. When the next piece would not
   fit, a new slide starts with the same heading and "continued". A table
   goes under the text only if it fits in the room that is left, otherwise
   it gets a slide of its own. Nothing is ever placed over anything else.

   WHAT IT NEVER ADDS
   Nothing that is not in the document. The cover is the document's own
   title and subtitle. No agenda, no "Thank you" slide.

   READ TOP TO BOTTOM
     1. Measurements
     2. Cutting a document into slides
     3. Drawing one slide
     4. Writing the file
   ========================================================================== */

import { THEME } from "./documentTheme.js";
import { plainText } from "./documentModel.js";

/* --------------------------------------------------------------------------
   SECTION 1: Measurements, in inches, widescreen 13.33 by 7.5
   -------------------------------------------------------------------------- */

const W = 13.333;
const H = 7.5;
const X = 0.75;                 // left and right margin
const BODY_W = W - X * 2;
const TITLE_Y = 0.55;
const BODY_TOP = 1.65;
const BODY_BOTTOM = H - 0.75;   // leaves room for the footer line
const BODY_H = BODY_BOTTOM - BODY_TOP;

const FONT = { body: 17, table: 13, title: 28 };

/* Roughly how tall some text will be. Calibri averages about half its point
   size per character. Deliberately a little generous, because a slide that
   ends early looks fine and a slide that overflows does not. */
function textHeight(chars, fontSize, width = BODY_W) {
  const perLine = Math.max(10, Math.floor((width * 72) / (fontSize * 0.52)));
  const lines = Math.max(1, Math.ceil(chars / perLine));
  return (lines * fontSize * 1.32 + fontSize * 0.55) / 72;
}

function tableHeight(block) {
  return (block.rows.length + 1) * 0.42 + 0.1;
}

/* --------------------------------------------------------------------------
   SECTION 2: Cutting a document into slides

   Each top level section is one slide, or several if it does not fit. A
   deeper heading inside a section is a bold line on the slide, not a slide
   of its own, so a section with three small sub parts reads as one idea.
   -------------------------------------------------------------------------- */

function piecesOf(blocks) {
  const pieces = [];
  for (const block of blocks) {
    if (block.type === "h") {
      pieces.push({ kind: "text", runs: block.runs, style: "sub", h: textHeight(plainText(block.runs).length, FONT.body + 1) });
    } else if (block.type === "list") {
      block.items.forEach((item, i) =>
        pieces.push({
          kind: "text", runs: item.runs, style: block.ordered ? "number" : "bullet",
          number: block.ordered ? block.start + i : null,
          h: textHeight(plainText(item.runs).length + 4, FONT.body, BODY_W - 0.4),
        }),
      );
    } else if (block.type === "quote") {
      pieces.push({ kind: "text", runs: block.runs, style: "quote", h: textHeight(plainText(block.runs).length, FONT.body, BODY_W - 0.6) + 0.1 });
    } else if (block.type === "table") {
      pieces.push({ kind: "table", block, h: tableHeight(block) });
    } else {
      const lines = plainText(block.runs).split("\n");
      const h = lines.reduce((sum, line) => sum + textHeight(line.length, FONT.body), 0);
      pieces.push({ kind: "text", runs: block.runs, style: "para", h });
    }
  }
  return pieces;
}

export function toDeck(doc) {
  const levels = doc.blocks.filter((b) => b.type === "h").map((b) => b.level);
  const top = levels.length ? Math.min(...levels) : null;

  /* Sections: a heading at the top level and everything until the next. */
  const sections = [];
  let current = { title: "", blocks: [] };
  for (const block of doc.blocks) {
    if (block.type === "h" && block.level === top) {
      if (current.title || current.blocks.length) sections.push(current);
      current = { title: plainText(block.runs), blocks: [] };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.title || current.blocks.length) sections.push(current);

  const slides = [{ kind: "cover", title: doc.title, subtitle: doc.subtitle }];

  for (const section of sections) {
    const pieces = piecesOf(section.blocks);
    let slide = { kind: "content", title: section.title || doc.title, text: [], table: null, used: 0 };
    const next = () => {
      slides.push(slide);
      slide = { kind: "content", title: `${section.title || doc.title} (continued)`, text: [], table: null, used: 0 };
    };

    for (const piece of pieces) {
      if (piece.kind === "table") {
        /* A slide holds text and then at most one table, below it. */
        if (slide.table || slide.used + piece.h + 0.2 > BODY_H) next();
        slide.table = piece.block;
        slide.used += piece.h + 0.2;
        continue;
      }
      /* Nothing goes under a table on the same slide. */
      if (slide.table || (slide.used + piece.h > BODY_H && slide.text.length)) next();
      slide.text.push(piece);
      slide.used += piece.h;
    }
    if (slide.text.length || slide.table) slides.push(slide);
  }

  return slides;
}

/* --------------------------------------------------------------------------
   SECTION 3: Drawing one slide
   -------------------------------------------------------------------------- */

function runsToPptx(runs, base) {
  const out = [];
  (runs ?? []).forEach((run) => {
    if (run.br) {
      if (out.length) out[out.length - 1].options.breakLine = true;
      return;
    }
    out.push({ text: run.text, options: { ...base, bold: run.bold || base.bold, italic: run.italic || base.italic } });
  });
  return out;
}

function textBody(pieces) {
  const out = [];
  for (const piece of pieces) {
    const base = { fontSize: FONT.body, color: THEME.body, paraSpaceAfter: 7 };
    /* A paragraph after a list starts a new idea, like the next plan in a
       price list, so it gets air above it. */
    let opts = piece.style === "para" ? { ...base, paraSpaceBefore: 10 } : base;
    if (piece.style === "sub") opts = { ...base, bold: true, color: THEME.ink, fontSize: FONT.body + 1, paraSpaceBefore: 6 };
    if (piece.style === "bullet") opts = { ...base, bullet: { indent: 18 }, paraSpaceAfter: 4 };
    if (piece.style === "number") opts = { ...base, bullet: { type: "number", numberStartAt: piece.number, indent: 22 }, paraSpaceAfter: 4 };
    if (piece.style === "quote") opts = { ...base, italic: true, color: THEME.accent, indentLevel: 1 };

    const runs = runsToPptx(piece.runs, opts);
    if (!runs.length) continue;
    /* The paragraph's own settings (bullet, spacing) ride on its first run;
       the last run ends the paragraph. */
    runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  }
  return out;
}

function tableRows(block) {
  const numeric = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;
  const isNum = block.header.map((_, i) => block.rows.length > 0 && block.rows.every((r) => numeric.test(plainText(r[i] ?? []).trim())));
  const head = block.header.map((cell, i) => ({
    text: plainText(cell),
    options: { bold: true, color: "FFFFFF", fill: { color: THEME.accent }, align: isNum[i] ? "right" : "left" },
  }));
  const rows = block.rows.map((row, r) =>
    row.map((cell, i) => ({
      text: plainText(cell),
      options: { color: THEME.body, fill: { color: r % 2 ? THEME.zebra : "FFFFFF" }, align: isNum[i] ? "right" : "left" },
    })),
  );
  return [head, ...rows];
}

/* --------------------------------------------------------------------------
   SECTION 4: Writing the file
   -------------------------------------------------------------------------- */

export async function deckBlob(doc) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.title = doc.title;

  /* Every content slide shares the same frame: a thin accent line and the
     slide number at the bottom, the document's name on the left. */
  deck.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: X, y: H - 0.55, w: BODY_W, h: 0.012, fill: { color: THEME.rule } } },
      { text: { text: doc.title, options: { x: X, y: H - 0.5, w: BODY_W - 1, h: 0.35, fontSize: 10, color: THEME.muted, fontFace: THEME.officeFont } } },
    ],
    slideNumber: { x: W - X - 0.6, y: H - 0.5, w: 0.6, h: 0.35, fontSize: 10, color: THEME.muted, align: "right", fontFace: THEME.officeFont },
  });

  for (const slide of toDeck(doc)) {
    if (slide.kind === "cover") {
      const page = deck.addSlide();
      page.background = { color: "FFFFFF" };
      page.addShape("rect", { x: 0, y: 0, w: 0.28, h: H, fill: { color: THEME.accent }, line: { color: THEME.accent } });
      page.addText(slide.title, {
        x: 1.1, y: 2.3, w: W - 2.2, h: 1.5, fontSize: 44, bold: true, color: THEME.ink,
        fontFace: THEME.officeFont, valign: "bottom",
      });
      page.addShape("rect", { x: 1.15, y: 4.0, w: 0.9, h: 0.07, fill: { color: THEME.accent }, line: { color: THEME.accent } });
      if (slide.subtitle) {
        page.addText(slide.subtitle, {
          x: 1.1, y: 4.25, w: W - 2.2, h: 0.9, fontSize: 20, color: THEME.muted, fontFace: THEME.officeFont, valign: "top",
        });
      }
      continue;
    }

    const page = deck.addSlide({ masterName: "CONTENT" });
    page.addText(slide.title, {
      x: X, y: TITLE_Y, w: BODY_W, h: 0.8, fontSize: FONT.title, bold: true, color: THEME.ink,
      fontFace: THEME.officeFont, valign: "middle", fit: "shrink",
    });
    page.addShape("rect", { x: X, y: TITLE_Y + 0.85, w: 0.7, h: 0.05, fill: { color: THEME.accent }, line: { color: THEME.accent } });

    let y = BODY_TOP;
    if (slide.text.length) {
      const h = Math.min(BODY_H, slide.text.reduce((s, p) => s + p.h, 0) + 0.1);
      page.addText(textBody(slide.text), {
        x: X, y, w: BODY_W, h, valign: "top", fontFace: THEME.officeFont, margin: 0,
      });
      y += h + 0.2;
    }
    if (slide.table) {
      page.addTable(tableRows(slide.table), {
        x: X, y, w: BODY_W, fontSize: FONT.table, fontFace: THEME.officeFont,
        border: { type: "solid", color: THEME.rule, pt: 0.75 }, rowH: 0.42, valign: "middle",
        margin: [0.06, 0.12, 0.06, 0.12],
      });
    }
  }

  return deck.write({ outputType: "blob" });
}
