/* ==========================================================================
   THE SLIDES

   WHY IT LOOKS THE WAY IT DOES
   2026-11-11. Anthony sent a deck he designed in Canva as the standard and
   said ours read like a document cut into slides. The deck is now built
   the way a designer builds one:
     - a dark background tinted with the company's colour (or white, for a
       company whose own decks are light), a soft glow in one corner
     - a big headline in capitals, its **bold** words lit in the brand
     - very few words, and a diagram on almost every slide: cards with
       icons, steps, phases, a flow of boxes with arrows, a hub fanning out
       to a list, an org chart, a big figure, a closing statement, a chart
     - every one of them real PowerPoint shapes, so all of it is editable
   The diagrams themselves live in slides/slideDiagrams.js, the colours in
   slides/slideTheme.js, the icons in slides/slideIcons.js. Which diagram a
   slide uses is decided by the writing step with ":::" blocks
   (documentModel.js).
   (The first design, 2026-09-23, was a white slide with a colour band
   across the top. It is replaced at his request.)

   HOW A SLIDE IS FILLED
   Every "##" section is one slide. Everything is measured before anything
   is placed. A slide holds some text, then at most one diagram below it (a
   picture or chart sits beside the text instead), and an optional takeaway
   at the bottom. If the diagram does not fit under the text, it starts the
   next slide. Nothing is ever drawn over anything else.

   WHAT IT NEVER ADDS
   Nothing that is not in the document. No agenda, no "Thank you" slide.

   READ TOP TO BOTTOM
     1. Measurements
     2. Cutting the document into slides
     3. Drawing text, tables, pictures and charts
     4. The cover and the page
     5. Writing the file
   ========================================================================== */

import { THEME } from "./documentTheme.js";
import { plainText, figureCaption, runningLine } from "./documentModel.js";
import { imageKey } from "./imageKey.js";
import { chartPalette } from "./charts/chartSvg.js";
import { PAGE, TYPE, slideThemeFor } from "./slides/slideTheme.js";
import { textHeight, headlineLines, slideRuns } from "./slides/slideText.js";
import * as D from "./slides/slideDiagrams.js";

/* --------------------------------------------------------------------------
   SECTION 1: Measurements, in inches, widescreen 13.333 by 7.5
   -------------------------------------------------------------------------- */

const { W, H, X, BODY_W, FOOT } = PAGE;
const TAKEAWAY_H = D.TAKEAWAY_H;

/* Where the headline starts: under the brand chip, with room for a small
   label above it when the slide has one. */
const CHIP_Y = 0.32;
const HEAD_Y = 0.95;

/* The headline's size: big when it is short, a step down when it is long,
   never more than two lines. */
function headlineSize(title) {
  for (const size of [TYPE.headline, 34, 30, TYPE.headlineMin]) {
    if (headlineLines(title, size, BODY_W) <= 2) return size;
  }
  return TYPE.headlineMin;
}

function headlineBox(title, label) {
  const size = headlineSize(title);
  const lines = Math.min(2, headlineLines(title, size, BODY_W));
  const y = HEAD_Y + (label ? 0.36 : 0);
  const h = (lines * size * 1.12) / 72 + 0.08;
  return { size, y, h, bodyTop: y + h + 0.32 };
}

const BODY_SIZE = 16;

/* How tall a diagram grows to when the slide has the room, in inches. */
const GROW_TO = { cards: 3.0, steps: 2.8, flow: 1.5, hub: 3.4, stat: 3.0, statement: 2.6, tree: 3.4, phases: 1.5, table: 0 };

function rowHeight(block) {
  return block.rows.length <= 6 ? 0.5 : 0.4;
}

/* --------------------------------------------------------------------------
   SECTION 2: Cutting the document into slides
   -------------------------------------------------------------------------- */

function textPiece(runs, style, extra = {}) {
  const width = style === "bullet" || style === "number" ? BODY_W - 0.4 : BODY_W;
  const chars = plainText(runs).length + (style === "bullet" || style === "number" ? 4 : 0);
  const size = style === "sub" ? BODY_SIZE + 1 : BODY_SIZE;
  const h = plainText(runs).split("\n").reduce((sum, line, i) => sum + textHeight(i ? line.length : chars, size, width), 0);
  return { kind: "text", runs, style, h, ...extra };
}

function piecesOf(blocks) {
  const pieces = [];
  for (const block of blocks) {
    if (block.type === "label") {
      pieces.push({ kind: "label", text: block.text });
    } else if (block.type === "takeaway" && block.variant === "statement") {
      const piece = { kind: "statement", runs: block.runs };
      pieces.push({ ...piece, h: D.statementHeight(piece, BODY_W) });
    } else if (block.type === "takeaway") {
      pieces.push({ kind: "takeaway", runs: block.runs });
    } else if (block.type === "steps" && block.variant === "phases") {
      /* Four phases to a slide at most. */
      for (let i = 0; i < block.items.length; i += 4) {
        const piece = { kind: "phases", items: block.items.slice(i, i + 4), start: i };
        pieces.push({ ...piece, h: D.phasesHeight(piece, BODY_W) });
      }
    } else if (block.type === "cards" && block.variant === "tree") {
      const piece = { kind: "tree", top: block.top, topCaption: block.topCaption, items: block.items.slice(0, 5) };
      pieces.push({ ...piece, h: D.treeHeight(piece, BODY_W) });
    } else if (block.type === "cards" || block.type === "steps") {
      /* Four side by side at most. More than that is split into rows of
         three, each on its own slide, rather than squeezed. */
      const per = block.items.length > 4 ? 3 : block.items.length;
      for (let i = 0; i < block.items.length; i += per) {
        const piece = { kind: block.type, items: block.items.slice(i, i + per), start: i };
        pieces.push({ ...piece, h: D.cardsHeight(piece, BODY_W) });
      }
    } else if (block.type === "flow") {
      pieces.push({ kind: "flow", steps: block.steps, h: D.flowHeight() });
    } else if (block.type === "hub") {
      for (const p of block.intro) pieces.push(textPiece(p.runs, "para"));
      const piece = { kind: "hub", centre: block.centre, caption: block.caption, items: block.items };
      pieces.push({ ...piece, h: D.hubHeight(piece, BODY_W) });
    } else if (block.type === "stat") {
      const piece = { kind: "stat", block };
      pieces.push({ ...piece, h: D.statHeight(piece, BODY_W) });
    } else if (block.type === "table") {
      pieces.push({ kind: "table", block, h: (block.rows.length + 1) * rowHeight(block) + 0.1 });
    } else if (block.type === "image") {
      pieces.push({ kind: "image", block, h: 3.4 });
    } else if (block.type === "chart") {
      /* A chart that could not be drawn is its table, like everywhere else. */
      if (!block.data.problem) pieces.push({ kind: "chart", block, h: 3.6 });
      else if (block.table) pieces.push({ kind: "table", block: block.table, h: (block.table.rows.length + 1) * rowHeight(block.table) + 0.1 });
    } else if (block.type === "h") {
      pieces.push(textPiece(block.runs, "sub"));
    } else if (block.type === "list") {
      block.items.forEach((item, i) => pieces.push(textPiece(item.runs, block.ordered ? "number" : "bullet", { number: block.ordered ? block.start + i : null })));
    } else if (block.type === "quote") {
      pieces.push(textPiece(block.runs, "quote"));
    } else if (block.type === "p" && block.treeTop) {
      /* The org chart draws its own top box; this line is for the PDF. */
      continue;
    } else if (block.runs) {
      pieces.push(textPiece(block.runs, "para"));
    }
  }
  return pieces;
}

const FEATURES = new Set(["cards", "steps", "phases", "flow", "hub", "tree", "stat", "statement", "table", "image", "chart"]);

/* Pictures and charts sit beside the text; the rest go under it. */
const BESIDE = new Set(["image", "chart"]);

/* A picture shares its slide with the text, side by side: the text takes
   this share of the width and the picture the rest. */
const TEXT_SHARE = 0.5;

export function toDeck(doc) {
  const levels = doc.blocks.filter((b) => b.type === "h").map((b) => b.level);
  const top = levels.length ? Math.min(...levels) : null;

  const sections = [];
  let current = { title: "", titleRuns: [], label: "", blocks: [] };
  for (const block of doc.blocks) {
    if (block.type === "h" && block.level === top) {
      if (current.title || current.blocks.length) sections.push(current);
      current = { title: plainText(block.runs), titleRuns: block.runs, label: block.label ?? "", blocks: [] };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.title || current.blocks.length) sections.push(current);

  const slides = [{ kind: "cover", title: doc.title, subtitle: doc.subtitle }];

  for (const section of sections) {
    const title = section.title || doc.title;
    const titleRuns = section.title ? section.titleRuns : [{ text: doc.title }];
    const fresh = (continued) => ({
      kind: "content",
      title: continued ? `${title} (continued)` : title,
      titleRuns: continued ? [...titleRuns, { text: " (continued)" }] : titleRuns,
      label: section.label,
      text: [], feature: null, takeaway: null, used: 0,
    });
    let slide = fresh(false);
    /* The height left for text and a diagram: from under the headline to
       above the footer, less the takeaway if this slide has one. */
    const room = () => FOOT - 0.2 - headlineBox(slide.title, slide.label).bodyTop - (slide.takeaway ? TAKEAWAY_H + 0.25 : 0);
    const next = () => {
      slides.push(slide);
      slide = fresh(true);
    };

    for (const piece of piecesOf(section.blocks)) {
      if (piece.kind === "label") {
        slide.label = piece.text;
        continue;
      }
      if (piece.kind === "takeaway") {
        /* It belongs to the slide it follows. A slide with a diagram keeps
           it: the diagram is drawn to the space left, so it shrinks to make
           room. Seen 2026-11-11: the strip moved on alone and left a
           "(continued)" slide holding nothing else. Only a slide already
           full of plain text, or one that already has a strip, passes it on. */
        const fits = slide.feature && !BESIDE.has(slide.feature.kind)
          ? true
          : slide.used <= room() - TAKEAWAY_H - 0.25;
        if (slide.takeaway || !fits) next();
        slide.takeaway = piece.runs;
        continue;
      }
      if (FEATURES.has(piece.kind)) {
        /* A picture goes BESIDE the text, so what has to fit is the text at
           its narrower width, not the text plus the picture stacked. */
        const besideText = BESIDE.has(piece.kind) && slide.text.length;
        const needed = besideText ? slide.used / TEXT_SHARE : slide.used + piece.h + 0.2;
        const crowded = slide.feature || slide.takeaway || needed > room();
        if (crowded && (slide.text.length || slide.feature || slide.takeaway)) next();
        slide.feature = piece;
        slide.used += piece.h + 0.2;
        continue;
      }
      /* Plain text after a diagram joins the slide's text, above the
         diagram, when there is room for both: a line on a slide of its own
         reads as a mistake (seen 2026-11-11). Otherwise it starts the next
         slide, and it never goes under a takeaway. */
      const joinsAbove = slide.feature && !BESIDE.has(slide.feature.kind) && !slide.takeaway &&
        slide.used + piece.h <= room();
      if (!joinsAbove && (slide.feature || slide.takeaway || (slide.used + piece.h > room() && slide.text.length))) next();
      slide.text.push(piece);
      slide.used += piece.h;
    }
    if (slide.text.length || slide.feature || slide.takeaway) slides.push(slide);
  }

  return foldThinSlides(slides);
}

/* A "(continued)" slide holding only a strip, or one short line and nothing
   else, goes back onto the slide before it when that slide can take it.
   The look agent found three of these in one deck on 2026-11-11. */
function foldThinSlides(slides) {
  const out = [];
  for (const slide of slides) {
    const prev = out[out.length - 1];
    const thin = slide.kind === "content" && /\(continued\)$/.test(slide.title) && !slide.feature &&
      slide.text.length <= 1 && slide.text.reduce((n, p) => n + p.h, 0) < 0.8;
    if (thin && prev && prev.kind === "content" && !(slide.takeaway && prev.takeaway)) {
      if (slide.takeaway) prev.takeaway = slide.takeaway;
      if (slide.text.length) {
        const room = FOOT - 0.2 - headlineBox(prev.title, prev.label).bodyTop - (prev.takeaway ? TAKEAWAY_H + 0.25 : 0);
        if (room - prev.used < slide.text[0].h && !prev.feature) {
          out.push(slide);
          continue;
        }
        prev.text.push(...slide.text);
        prev.used += slide.text[0].h;
      }
      continue;
    }
    out.push(slide);
  }
  return out;
}

/* --------------------------------------------------------------------------
   SECTION 3: Drawing text, tables, pictures and charts
   -------------------------------------------------------------------------- */

function textBody(pieces, s) {
  const out = [];
  for (const piece of pieces) {
    const base = { fontSize: BODY_SIZE, color: s.body, fontFace: s.font, paraSpaceAfter: 6 };
    let opts = piece.style === "para" ? { ...base, paraSpaceBefore: 6 } : base;
    if (piece.style === "sub") opts = { ...base, bold: true, color: s.ink, fontSize: BODY_SIZE + 1, paraSpaceBefore: 6 };
    if (piece.style === "bullet") opts = { ...base, bullet: { indent: 18 }, paraSpaceAfter: 5 };
    if (piece.style === "number") opts = { ...base, bullet: { type: "number", numberStartAt: piece.number, indent: 22 }, paraSpaceAfter: 5 };
    if (piece.style === "quote") opts = { ...base, italic: true, color: s.lit };
    const runs = slideRuns(piece.runs, opts, { lit: piece.style === "para" || piece.style === "bullet" ? s.lit : null });
    if (!runs.length) continue;
    runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  }
  return out;
}

const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

function drawTable(page, block, y, s) {
  const isNum = block.header.map((_, i) => block.rows.length > 0 && block.rows.every((r) => NUMERIC.test(plainText(r[i] ?? []).trim()) || !plainText(r[i] ?? []).trim()));
  const head = block.header.map((cell, i) => ({
    text: plainText(cell),
    options: { bold: true, color: s.onLit, fill: { color: s.litFill }, align: isNum[i] ? "right" : "left" },
  }));
  const zebra = s.mode === "dark" ? D.mix(s.panel, 0.04) : THEME.zebra;
  const plain = s.mode === "dark" ? s.panel : "FFFFFF";
  const rows = block.rows.map((row, r) => {
    /* A row whose first cell says "Total" reads as the total. */
    const total = /^total/i.test(plainText(row[0] ?? []).trim());
    return row.map((cell, i) => ({
      text: plainText(cell),
      options: {
        color: total ? s.ink : s.body, bold: total, align: isNum[i] ? "right" : "left",
        fill: { color: r % 2 ? zebra : plain },
      },
    }));
  });
  page.addTable([head, ...rows], {
    x: X, y, w: BODY_W, fontSize: block.rows.length <= 6 ? 15 : 13, fontFace: s.font,
    border: { type: "solid", color: s.panelLine, pt: 0.75 }, rowH: rowHeight(block), valign: "middle", margin: [0.06, 0.14, 0.06, 0.14],
  });
}

/* The largest box of the picture's own shape that fits in the space. */
function fitInto(found, w, h) {
  const scale = Math.min(w / found.width, h / found.height);
  return { w: found.width * scale, h: found.height * scale };
}

/* The caption and its source under a figure. "Figure 2" shows only when
   the document numbers its figures (documentModel.js, section 5). Returns
   the height it takes, so the figure can make room. */
function captionHeight(block) {
  return (block.caption || block.figure ? 0.42 : 0) + (block.source ? 0.3 : 0);
}

function drawCaption(page, block, box, s) {
  const h = captionHeight(block);
  if (!h) return;
  const runs = [];
  const text = figureCaption(block);
  if (text) runs.push({ text, options: { fontSize: 12, italic: true, color: s.muted, breakLine: Boolean(block.source) } });
  if (block.source) runs.push({ text: block.source, options: { fontSize: 11, color: s.muted } });
  page.addText(runs, {
    x: box.x, y: box.y + box.h - h + 0.05, w: box.w, h: h - 0.05, align: "center", valign: "top", fontFace: s.font, margin: 0,
  });
}

function drawImage(page, piece, box, s, images) {
  const found = images?.get(imageKey(piece.block.name));
  const captionH = captionHeight(piece.block);
  if (!found) {
    /* Never an empty hole: a marked space saying which picture goes here. */
    D.panel(page, box.x, box.y, box.w, box.h - captionH, s);
    page.addText(`Picture to add here: ${piece.block.name}`, {
      x: box.x, y: box.y, w: box.w, h: box.h - captionH, fontSize: 14, color: s.muted, align: "center", valign: "middle", fontFace: s.font,
    });
  } else {
    const fit = fitInto(found, box.w, box.h - captionH);
    page.addImage({ data: found.dataUrl, x: box.x + (box.w - fit.w) / 2, y: box.y + (box.h - captionH - fit.h) / 2, w: fit.w, h: fit.h, rounding: false });
  }
  drawCaption(page, piece.block, box, s);
}

/* A REAL POWERPOINT CHART. Not a picture: the staff can click it in
   PowerPoint and change a number, and the chart moves with it. The numbers
   come from charts/chartData.js, already checked. Big numbers are
   shortened the way the drawing shortens them: 20000000 shows as ₦20M. In
   an Office number format each "," at the end divides by a thousand. */
function numberFormat(data) {
  const all = data.series.flatMap((ser) => ser.values);
  const biggest = Math.max(...all.map((v) => Math.abs(v)));
  const [divide, suffix, scale] = biggest >= 1e9 ? [",,,", "B", 1e9] : biggest >= 1e6 ? [",,", "M", 1e6] : biggest >= 1e4 ? [",", "k", 1e3] : ["", "", 1];
  const whole = all.every((v) => Number.isInteger(v / scale));
  const base = `${whole ? "#,##0" : "#,##0.0"}${divide}${suffix ? `"${suffix}"` : ""}`;
  if (data.unit?.percent) return `${whole ? "0" : "0.0"}"%"`;
  if (data.unit?.currency) return `"${data.unit.currency}"${base}`;
  return base;
}

function drawChart(page, piece, box, s, docTheme) {
  const { block } = piece;
  const data = block.data;
  const captionH = captionHeight(block);
  const area = { x: box.x, y: box.y, w: box.w, h: box.h - captionH };
  /* The brand first, as bright as it reads on this background. */
  const palette = [s.litLarge, ...chartPalette(docTheme).slice(1)];
  const format = numberFormat(data);
  const few = data.categories.length * data.series.length <= 16;
  const common = {
    ...area,
    fontFace: s.font,
    /* One set of numbers is one colour. Pies are the exception. */
    chartColors: data.series.length > 1 || data.kind === "pie" || data.kind === "doughnut" ? palette : [palette[0]],
    catAxisLabelColor: s.muted,
    valAxisLabelColor: s.muted,
    catAxisLabelFontSize: 12,
    valAxisLabelFontSize: 12,
    catAxisLineShow: true,
    catAxisLineColor: s.chartGrid,
    valAxisLineShow: false,
    valGridLine: { color: s.chartGrid, size: 0.75 },
    catGridLine: { style: "none" },
    valAxisLabelFormatCode: format,
    dataLabelFormatCode: format,
    dataLabelColor: s.body,
    dataLabelFontSize: 12,
    showLegend: data.series.length > 1,
    legendPos: "t",
    legendFontSize: 12,
    legendColor: s.body,
  };
  const series = data.series.map((ser) => ({ name: ser.name || block.caption || "Values", labels: data.categories.map(String), values: ser.values }));

  if (data.kind === "pie" || data.kind === "doughnut") {
    page.addChart(data.kind, series.slice(0, 1), {
      ...common,
      showLegend: true,
      legendPos: "r",
      showPercent: true,
      showValue: false,
      /* The share is a fraction, so it needs a per cent format. */
      dataLabelFormatCode: "0%",
      dataLabelColor: "FFFFFF",
      dataLabelFontSize: 13,
      dataBorder: { pt: 1.5, color: s.bg },
      ...(data.kind === "doughnut" ? { holeSize: 58 } : {}),
    });
  } else if (data.kind === "scatter") {
    page.addChart("scatter", [{ name: data.xName || "X", values: data.categories }, { name: data.series[0].name || "Y", values: data.series[0].values }], {
      ...common,
      showLegend: false,
      lineSize: 0,
      lineDataSymbol: "circle",
      lineDataSymbolSize: 8,
      showCatAxisTitle: Boolean(data.xName),
      catAxisTitle: data.xName,
      showValAxisTitle: Boolean(data.series[0].name),
      valAxisTitle: data.series[0].name,
      catAxisTitleColor: s.muted,
      valAxisTitleColor: s.muted,
      catAxisTitleFontSize: 12,
      valAxisTitleFontSize: 12,
    });
  } else if (data.kind === "line" || data.kind === "area") {
    page.addChart(data.kind, series, {
      ...common,
      lineSize: 3,
      lineDataSymbol: data.categories.length <= 24 ? "circle" : "none",
      lineDataSymbolSize: 8,
    });
  } else {
    page.addChart("bar", series, {
      ...common,
      barDir: data.kind === "bar" ? "bar" : "col",
      barGrouping: data.kind === "stacked" ? "stacked" : "clustered",
      barGapWidthPct: data.kind === "histogram" ? 3 : 55,
      showValue: few && data.kind !== "stacked",
      dataLabelPosition: "outEnd",
    });
  }
  drawCaption(page, block, box, s);
}

/* --------------------------------------------------------------------------
   SECTION 4: The cover and the page
   -------------------------------------------------------------------------- */

/* The company's mark, top left: its logo on a white chip so any logo reads,
   or its name in small capitals. */
function drawBrandChip(page, brand, s, { big = false } = {}) {
  const h = big ? 0.62 : 0.46;
  if (brand?.logoData) {
    const w = big ? 2.4 : 1.8;
    page.addShape("roundRect", { x: X, y: CHIP_Y, w, h, rectRadius: h / 2, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" } });
    page.addImage({ data: brand.logoData, x: X + 0.2, y: CHIP_Y + 0.06, w: w - 0.4, h: h - 0.12, sizing: { type: "contain", w: w - 0.4, h: h - 0.12 } });
  } else if (brand?.name) {
    page.addText(brand.name.toUpperCase(), {
      x: X, y: CHIP_Y, w: 6, h, fontSize: big ? 14 : 12, bold: true, charSpacing: 2, color: s.muted, fontFace: s.font, valign: "middle", margin: 0,
    });
  }
}

/* A cover title lights the part after a colon, like "Amara for hotels:
   **three plans**", unless the writer lit words themselves. */
function coverRuns(title) {
  const text = String(title ?? "");
  const at = text.indexOf(":");
  if (at > 3 && at < text.length - 3) return [{ text: `${text.slice(0, at + 1)} ` }, { text: text.slice(at + 1).trim(), bold: true }];
  return [{ text }];
}

function drawCover(deck, slide, s, brand) {
  const page = deck.addSlide();
  page.background = { color: s.bg };
  D.drawGlow(page, s, { x: W - 5.6, y: -2.2, size: 8 });
  drawBrandChip(page, brand, s, { big: true });

  const size = headlineLines(slide.title, 54, W - 2 * X - 2) <= 3 ? 54 : 44;
  const lines = Math.min(3, headlineLines(slide.title, size, W - 2 * X - 2));
  const titleH = (lines * size * 1.08) / 72 + 0.1;
  const titleY = 3.9 - titleH;
  page.addText(slideRuns(coverRuns(slide.title), { fontSize: size, bold: true, color: s.ink, fontFace: s.headFont }, { lit: s.litLarge, upper: true }), {
    x: X, y: titleY, w: W - 2 * X - 2, h: titleH, valign: "bottom", margin: 0, fit: "shrink",
  });
  if (slide.subtitle) {
    page.addText(slide.subtitle, {
      x: X, y: 4.15, w: W * 0.55, h: 1.2, fontSize: 19, color: s.body, fontFace: s.font, valign: "top", margin: 0,
    });
  }
  if (brand?.name) {
    page.addText(brand.name, { x: X, y: H - 0.8, w: 6, h: 0.35, fontSize: 12, color: s.muted, fontFace: s.font, margin: 0 });
  }
}

function drawHeadline(page, slide, s) {
  const box = headlineBox(slide.title, slide.label);
  if (slide.label) {
    page.addText(slide.label.toUpperCase(), {
      x: X, y: HEAD_Y, w: BODY_W, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: s.lit, fontFace: s.font, valign: "middle", margin: 0,
    });
  }
  page.addText(slideRuns(slide.titleRuns, { fontSize: box.size, bold: true, color: s.ink, fontFace: s.headFont }, { lit: s.litLarge, upper: true }), {
    x: X, y: box.y, w: BODY_W, h: box.h, valign: "top", margin: 0, fit: "shrink",
  });
  return box.bodyTop;
}

/* --------------------------------------------------------------------------
   SECTION 5: Writing the file

   `theme` comes from themeFor(company brand colour). `brand` is
   { name, logoData } with the logo already read into a data address, or
   nothing. `engine` stands in for PptxGenJS when the slides are only to be
   drawn and looked at (look/drawSlides.js): the same code places
   everything, so the pictures are the file's own layout. `mode` is "dark"
   (the default) or "light".
   -------------------------------------------------------------------------- */

export async function deckBlob(doc, theme = { ...THEME }, brand = null, images = null, engine = null, mode = "dark") {
  const deck = engine ?? new (await import("pptxgenjs")).default();
  deck.layout = "LAYOUT_WIDE";
  deck.title = doc.title;
  /* Dark or light: what they asked for, or the PowerPoint they showed
     (theme.slideMode), else the default. */
  const s = slideThemeFor(theme, theme.slideMode ?? mode);

  deck.defineSlideMaster({
    title: "CONTENT",
    background: { color: s.bg },
    objects: [
      { text: { text: runningLine(brand?.name, doc.title), options: { x: X, y: FOOT + 0.05, w: BODY_W - 1, h: 0.3, fontSize: 11, color: s.muted, fontFace: s.font } } },
    ],
    slideNumber: { x: W - X - 0.6, y: FOOT + 0.05, w: 0.6, h: 0.3, fontSize: 11, color: s.muted, align: "right", fontFace: s.font },
  });

  for (const slide of toDeck(doc)) {
    if (slide.kind === "cover") {
      drawCover(deck, slide, s, brand);
      continue;
    }

    const page = deck.addSlide({ masterName: "CONTENT" });
    D.drawGlow(page, s, { x: W - 3.2, y: -3.4, size: 6 });
    drawBrandChip(page, brand, s);
    const bodyTop = drawHeadline(page, slide, s);
    const bottom = FOOT - 0.2 - (slide.takeaway ? TAKEAWAY_H + 0.25 : 0);
    const takeawayBox = { x: X, y: FOOT - 0.2 - TAKEAWAY_H, w: BODY_W, h: TAKEAWAY_H };

    /* TEXT BESIDE A PICTURE OR CHART. The text on the left, the figure on
       the right, both from under the headline to the bottom of the space. */
    if (BESIDE.has(slide.feature?.kind) && slide.text.length) {
      const textW = BODY_W * TEXT_SHARE;
      page.addText(textBody(slide.text, s), { x: X, y: bodyTop, w: textW, h: bottom - bodyTop, valign: "middle", margin: 0 });
      const side = { x: X + textW + 0.4, y: bodyTop, w: BODY_W - textW - 0.4, h: bottom - bodyTop };
      if (slide.feature.kind === "chart") drawChart(page, slide.feature, side, s, theme);
      else drawImage(page, slide.feature, side, s, images);
      if (slide.takeaway) D.drawTakeaway(page, slide.takeaway, takeawayBox, s);
      continue;
    }

    let y = bodyTop;
    if (slide.text.length) {
      const h = slide.text.reduce((sum, p) => sum + p.h, 0) + 0.05;
      page.addText(textBody(slide.text, s), { x: X, y, w: BODY_W, h, valign: "top", margin: 0 });
      y += h + 0.2;
    }
    const f = slide.feature;
    if (f) {
      const space = bottom - y;
      /* A diagram takes the height it needs, grows to a comfortable size
         when the slide has room (GROW_TO), never more than is left, and sits
         in the middle of the space left, so a short diagram does not hang
         under the headline with the slide empty below (seen 2026-11-11). */
      const h = ["image", "chart"].includes(f.kind) ? space : Math.min(Math.max(f.h, GROW_TO[f.kind] ?? 1.5), space);
      const lift = Math.max(0, (space - h) / 2) * (slide.text.length ? 0.5 : 0.85);
      const box = { x: X, y: y + lift, w: BODY_W, h };
      if (f.kind === "image") drawImage(page, f, box, s, images);
      else if (f.kind === "chart") drawChart(page, f, box, s, theme);
      else if (f.kind === "cards" || f.kind === "steps") D.drawCards(page, f, box, s);
      else if (f.kind === "phases") D.drawPhases(page, f, box, s);
      else if (f.kind === "flow") D.drawFlow(page, f, box, s);
      else if (f.kind === "hub") D.drawHub(page, f, box, s);
      else if (f.kind === "tree") D.drawTree(page, f, box, s);
      else if (f.kind === "stat") D.drawStat(page, f, box, s);
      else if (f.kind === "statement") D.drawStatement(page, f, box, s);
      else drawTable(page, f.block, box.y, s);
    }
    if (slide.takeaway) D.drawTakeaway(page, slide.takeaway, takeawayBox, s);
  }

  return deck.write({ outputType: "blob" });
}
