/* ==========================================================================
   THE SLIDES

   WHY IT LOOKS THE WAY IT DOES, 2026-09-23
   Anthony: "even a slide must have some slide deck design... I don't want
   it to be doing basic output but top tier formatted documents that the
   staff won't have any need to edit." He sent a deck as the standard, and
   this draws the same building blocks:

     - a band across the top of every content slide, in the company's own
       colour, with a small label above the slide's title
     - cards: two to four tinted boxes side by side, each with a title, a
       small kicker word and its text
     - steps: the same cards, numbered, for a sequence
     - a big figure on a coloured panel, its caption under it, the story
       beside it
     - a takeaway strip across the bottom that says what the slide means
     - a cover with the company's logo on a coloured panel

   Which of those a slide uses was decided by the writing step, from the
   brief, and marked with ":::" blocks. See documentModel.js.

   HOW A SLIDE IS FILLED
   Everything is measured before anything is placed. A slide holds some
   text, then at most one feature (cards, steps, a figure or a table) below
   it, and an optional takeaway strip at the bottom. If the feature does not
   fit under the text, it starts the next slide. Nothing is ever drawn over
   anything else. That was the first fault found in this writer.

   WHAT IT NEVER ADDS
   Nothing that is not in the document. No agenda, no "Thank you" slide.

   READ TOP TO BOTTOM
     1. Measurements
     2. Cutting the document into slides
     3. Drawing each piece
     4. Writing the file
   ========================================================================== */

import { THEME } from "./documentTheme.js";
import { plainText, blockText, figureCaption, runningLine } from "./documentModel.js";
import { imageKey } from "./imageKey.js";
import { chartPalette } from "./charts/chartSvg.js";

/* --------------------------------------------------------------------------
   SECTION 1: Measurements, in inches, widescreen 13.33 by 7.5
   -------------------------------------------------------------------------- */

const W = 13.333;
const H = 7.5;
const X = 0.75;
const BODY_W = W - X * 2;
const BAND_Y = 0.45;
const BAND_H = 1.35;
const BODY_TOP = BAND_Y + BAND_H + 0.35;
const FOOT_Y = H - 0.55;
const TAKEAWAY_H = 0.62;
const GAP = 0.3;

const FONT = { body: 16, card: 13.5, cardTitle: 17, kicker: 12, table: 13, title: 28, label: 12 };

/* Roughly how tall some text will be. Calibri averages about half its
   point size per character. Deliberately a little generous: a slide that
   ends early looks fine and a slide that overflows does not. */
function textHeight(chars, fontSize, width = BODY_W) {
  const perLine = Math.max(8, Math.floor((width * 72) / (fontSize * 0.52)));
  const lines = Math.max(1, Math.ceil(chars / perLine));
  return (lines * fontSize * 1.3 + fontSize * 0.5) / 72;
}

function blocksHeight(blocks, fontSize, width) {
  return blocks.reduce((sum, b) => {
    const text = blockText(b);
    return sum + text.split("\n").reduce((s, line) => s + textHeight(line.length + 3, fontSize, width), 0);
  }, 0);
}

/* A short table gets roomier rows and a bigger type, so four rows do not
   sit in a thin strip at the top of the slide. */
function rowHeight(block) {
  return block.rows.length <= 6 ? 0.52 : 0.42;
}

function cardsHeight(items, count) {
  const width = (BODY_W - GAP * (count - 1)) / count - 0.5;
  const tallest = Math.max(
    ...items.map((item) => blocksHeight(item.blocks, FONT.card, width) + (item.kicker ? 0.34 : 0)
      + textHeight(plainText(item.title).length, FONT.cardTitle, width)),
  );
  /* A floor, so three short cards still read as a designed row rather than
     three small boxes floating at the top of an empty slide. */
  return Math.max(2.6, tallest + 0.5);
}

/* --------------------------------------------------------------------------
   SECTION 2: Cutting the document into slides
   -------------------------------------------------------------------------- */

function piecesOf(blocks) {
  const pieces = [];
  for (const block of blocks) {
    if (block.type === "label") {
      pieces.push({ kind: "label", text: block.text });
    } else if (block.type === "takeaway") {
      pieces.push({ kind: "takeaway", runs: block.runs });
    } else if (block.type === "cards" || block.type === "steps") {
      /* Four side by side at most. More than that is split into rows of
         three, each on its own slide, rather than squeezed. */
      const per = block.items.length > 4 ? 3 : block.items.length;
      for (let i = 0; i < block.items.length; i += per) {
        const items = block.items.slice(i, i + per);
        pieces.push({ kind: block.type, items, start: i, h: cardsHeight(items, items.length) });
      }
    } else if (block.type === "stat") {
      pieces.push({ kind: "stat", block, h: Math.max(2.7, blocksHeight(block.blocks, FONT.body + 1, BODY_W - 4.4) + 0.3) });
    } else if (block.type === "table") {
      pieces.push({ kind: "table", block, h: (block.rows.length + 1) * rowHeight(block) + 0.1 });
    } else if (block.type === "image") {
      pieces.push({ kind: "image", block, h: 3.4 });
    } else if (block.type === "chart") {
      /* A chart that could not be drawn is its table, like everywhere else. */
      if (!block.data.problem) pieces.push({ kind: "chart", block, h: 3.6 });
      else if (block.table) pieces.push({ kind: "table", block: block.table, h: (block.table.rows.length + 1) * rowHeight(block.table) + 0.1 });
    } else if (block.type === "h") {
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
    } else if (block.runs) {
      const h = plainText(block.runs).split("\n").reduce((sum, line) => sum + textHeight(line.length, FONT.body), 0);
      pieces.push({ kind: "text", runs: block.runs, style: "para", h });
    }
  }
  return pieces;
}

const FEATURES = new Set(["cards", "steps", "stat", "table", "image", "chart"]);

/* Pictures and charts sit beside the text; the rest go under it. */
const BESIDE = new Set(["image", "chart"]);

/* A picture shares its slide with the text, side by side: the text takes
   this share of the width and the picture the rest. */
const TEXT_SHARE = 0.54;

export function toDeck(doc) {
  const levels = doc.blocks.filter((b) => b.type === "h").map((b) => b.level);
  const top = levels.length ? Math.min(...levels) : null;

  const sections = [];
  let current = { title: "", label: "", blocks: [] };
  for (const block of doc.blocks) {
    if (block.type === "h" && block.level === top) {
      if (current.title || current.blocks.length) sections.push(current);
      current = { title: plainText(block.runs), label: block.label ?? "", blocks: [] };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.title || current.blocks.length) sections.push(current);

  const slides = [{ kind: "cover", title: doc.title, subtitle: doc.subtitle }];

  for (const section of sections) {
    const title = section.title || doc.title;
    const fresh = (continued) => ({
      kind: "content", title: continued ? `${title} (continued)` : title, label: section.label,
      text: [], feature: null, takeaway: null, used: 0,
    });
    let slide = fresh(false);
    /* The height left for text and a feature: from under the band to above
       the footer, less the takeaway strip if this slide has one. */
    const room = () => FOOT_Y - 0.25 - BODY_TOP - (slide.takeaway ? TAKEAWAY_H + 0.25 : 0);
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
        /* It belongs to the slide it follows. If that slide is too full to
           take the strip too, or already has one, it moves on. */
        if (slide.takeaway || slide.used > room() - TAKEAWAY_H - 0.25) next();
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
      /* Plain text never goes under a feature or a takeaway. */
      if (slide.feature || slide.takeaway || (slide.used + piece.h > room() && slide.text.length)) next();
      slide.text.push(piece);
      slide.used += piece.h;
    }
    if (slide.text.length || slide.feature || slide.takeaway) slides.push(slide);
  }

  return slides;
}

/* --------------------------------------------------------------------------
   SECTION 3: Drawing each piece
   -------------------------------------------------------------------------- */

function runsToPptx(runs, base) {
  const out = [];
  for (const run of runs ?? []) {
    if (run.br) {
      if (out.length) out[out.length - 1].options.breakLine = true;
      continue;
    }
    out.push({ text: run.text, options: { ...base, bold: run.bold || base.bold, italic: run.italic || base.italic } });
  }
  return out;
}

function textBody(pieces, theme, size = FONT.body) {
  const out = [];
  for (const piece of pieces) {
    const base = { fontSize: size, color: theme.body, paraSpaceAfter: 6 };
    let opts = piece.style === "para" ? { ...base, paraSpaceBefore: 8 } : base;
    if (piece.style === "sub") opts = { ...base, bold: true, color: theme.ink, fontSize: size + 1, paraSpaceBefore: 6 };
    if (piece.style === "bullet") opts = { ...base, bullet: { indent: 16 }, paraSpaceAfter: 4 };
    if (piece.style === "number") opts = { ...base, bullet: { type: "number", numberStartAt: piece.number, indent: 20 }, paraSpaceAfter: 4 };
    if (piece.style === "quote") opts = { ...base, italic: true, color: theme.accent };
    const runs = runsToPptx(piece.runs, opts);
    if (!runs.length) continue;
    runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  }
  return out;
}

/* A card's own blocks as slide text, at card size. */
function cardBody(blocks, theme) {
  return textBody(piecesOf(blocks).filter((p) => p.kind === "text"), theme, FONT.card);
}

function drawHeader(page, slide, theme) {
  page.addShape("rect", { x: 0, y: BAND_Y, w: W, h: BAND_H, fill: { color: theme.accent }, line: { color: theme.accent } });
  if (slide.label) {
    page.addText(slide.label.toUpperCase(), {
      x: X, y: BAND_Y + 0.14, w: BODY_W, h: 0.34, fontSize: FONT.label, bold: true, charSpacing: 2,
      color: theme.highlight, fontFace: THEME.officeFont, valign: "middle", margin: 0,
    });
  }
  page.addText(slide.title, {
    x: X, y: slide.label ? BAND_Y + 0.46 : BAND_Y + 0.1, w: BODY_W, h: slide.label ? 0.78 : BAND_H - 0.2,
    fontSize: FONT.title, bold: true, color: "FFFFFF", fontFace: THEME.officeFont, valign: "middle", margin: 0, fit: "shrink",
  });
}

function drawCards(page, piece, y, h, theme) {
  const count = piece.items.length;
  const cw = (BODY_W - GAP * (count - 1)) / count;
  piece.items.forEach((item, i) => {
    const x = X + i * (cw + GAP);
    page.addShape("roundRect", { x, y, w: cw, h, fill: { color: theme.accentTint }, line: { color: theme.accentTint }, rectRadius: 0.12 });
    let ty = y + 0.22;
    let tx = x + 0.25;
    if (piece.kind === "steps") {
      page.addShape("ellipse", { x: tx, y: ty, w: 0.46, h: 0.46, fill: { color: theme.accent }, line: { color: theme.accent } });
      page.addText(String(piece.start + i + 1), {
        x: tx, y: ty, w: 0.46, h: 0.46, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: THEME.officeFont, margin: 0,
      });
      tx += 0.6;
    }
    const titleW = cw - (tx - x) - 0.25;
    const titleH = Math.max(0.46, textHeight(plainText(item.title).length, FONT.cardTitle, titleW));
    page.addText(runsToPptx(item.title, { fontSize: FONT.cardTitle, bold: true, color: theme.accent, fontFace: THEME.officeFont }), {
      x: tx, y: ty, w: titleW, h: titleH, valign: "middle", margin: 0,
    });
    ty += titleH + 0.06;
    if (item.kicker) {
      page.addText(item.kicker, {
        x: x + 0.25, y: ty, w: cw - 0.5, h: 0.3, fontSize: FONT.kicker, bold: true, color: theme.kicker, fontFace: THEME.officeFont, margin: 0,
      });
      ty += 0.36;
    }
    const body = cardBody(item.blocks, theme);
    if (body.length) {
      page.addText(body, { x: x + 0.25, y: ty, w: cw - 0.5, h: Math.max(0.3, y + h - ty - 0.15), valign: "top", fontFace: THEME.officeFont, margin: 0 });
    }
  });
}

function drawStat(page, piece, y, h, theme) {
  const panelW = 3.9;
  page.addShape("roundRect", { x: X, y, w: panelW, h, fill: { color: theme.accent }, line: { color: theme.accent }, rectRadius: 0.12 });
  page.addText(piece.block.value, {
    x: X, y: y + 0.2, w: panelW, h: h * 0.55, fontSize: 60, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: THEME.officeFont, fit: "shrink",
  });
  if (piece.block.caption) {
    page.addText(piece.block.caption, {
      x: X + 0.25, y: y + h * 0.6, w: panelW - 0.5, h: h * 0.35, fontSize: 15, color: theme.onAccentSoft ?? "FFFFFF", align: "center", valign: "top", fontFace: THEME.officeFont,
    });
  }
  const story = textBody(piecesOf(piece.block.blocks).filter((p) => p.kind === "text"), theme, FONT.body + 1);
  if (story.length) {
    page.addText(story, { x: X + panelW + 0.45, y, w: BODY_W - panelW - 0.45, h, valign: "middle", fontFace: THEME.officeFont, margin: 0 });
  }
}

const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

function drawTable(page, block, y, theme) {
  const isNum = block.header.map((_, i) => block.rows.length > 0 && block.rows.every((r) => NUMERIC.test(plainText(r[i] ?? []).trim()) || !plainText(r[i] ?? []).trim()));
  const head = block.header.map((cell, i) => ({
    text: plainText(cell),
    options: { bold: true, color: "FFFFFF", fill: { color: theme.accent }, align: isNum[i] ? "right" : "left" },
  }));
  const rows = block.rows.map((row, r) => {
    /* A row whose first cell says "Total" reads as the total. */
    const total = /^total/i.test(plainText(row[0] ?? []).trim());
    return row.map((cell, i) => ({
      text: plainText(cell),
      options: {
        color: theme.body, bold: total, align: isNum[i] ? "right" : "left",
        fill: { color: total ? theme.accentTint : r % 2 ? THEME.zebra : "FFFFFF" },
      },
    }));
  });
  page.addTable([head, ...rows], {
    x: X, y, w: BODY_W, fontSize: block.rows.length <= 6 ? FONT.table + 2 : FONT.table, fontFace: THEME.officeFont,
    border: { type: "solid", color: THEME.rule, pt: 0.75 }, rowH: rowHeight(block), valign: "middle", margin: [0.06, 0.12, 0.06, 0.12],
  });
}

/* The largest box of the picture's own shape that fits in the space. */
function fitInto(found, w, h) {
  const scale = Math.min(w / found.width, h / found.height);
  return { w: found.width * scale, h: found.height * scale };
}

/* The caption and its source under a figure on a slide. "Figure 2" shows
   only when the document numbers its figures, which is when the text points
   at one or there are two or more (documentModel.js, section 5). A slide
   that says "as Figure 1 shows" has to have a Figure 1 on it. Charts use
   this too. Returns the height it takes, so the figure can make room. */
function captionHeight(block) {
  return (block.caption || block.figure ? 0.42 : 0) + (block.source ? 0.3 : 0);
}

function drawCaption(page, block, box) {
  const h = captionHeight(block);
  if (!h) return;
  const runs = [];
  const line = figureCaption(block);
  if (line) runs.push({ text: line, options: { fontSize: 12, italic: true, color: THEME.muted, breakLine: Boolean(block.source) } });
  if (block.source) runs.push({ text: block.source, options: { fontSize: 11, color: THEME.muted } });
  page.addText(runs, {
    x: box.x, y: box.y + box.h - h + 0.05, w: box.w, h: h - 0.05, align: "center", valign: "top", fontFace: THEME.officeFont, margin: 0,
  });
}

function drawImage(page, piece, box, theme, images) {
  const found = images?.get(imageKey(piece.block.name));
  const captionH = captionHeight(piece.block);
  if (!found) {
    /* Never an empty hole: a marked space saying which picture goes here. */
    page.addShape("roundRect", { x: box.x, y: box.y, w: box.w, h: box.h - captionH, fill: { color: theme.accentTint }, line: { color: theme.accentTint }, rectRadius: 0.1 });
    page.addText(`Picture to add here: ${piece.block.name}`, {
      x: box.x, y: box.y, w: box.w, h: box.h - captionH, fontSize: 14, color: THEME.muted, align: "center", valign: "middle", fontFace: THEME.officeFont,
    });
  } else {
    const fit = fitInto(found, box.w, box.h - captionH);
    page.addImage({ data: found.dataUrl, x: box.x + (box.w - fit.w) / 2, y: box.y + (box.h - captionH - fit.h) / 2, w: fit.w, h: fit.h });
  }
  drawCaption(page, piece.block, box);
}

/* A REAL POWERPOINT CHART, 2026-09-23. Not a picture: the staff can click
   it in PowerPoint and change a number, and the chart moves with it. The
   numbers come from charts/chartData.js, already checked, so histogram
   buckets and all are exactly what the PDF and Word files show. Colours
   are the same palette as the drawing (charts/chartSvg.js). */
/* Big numbers are shortened the way the drawing shortens them: 20000000
   shows as ₦20M. In an Office number format each "," at the end divides by
   a thousand, so ",," is millions. The cell keeps the full number. */
function numberFormat(data) {
  const all = data.series.flatMap((s) => s.values);
  const biggest = Math.max(...all.map((v) => Math.abs(v)));
  const [divide, suffix, scale] = biggest >= 1e9 ? [",,,", "B", 1e9] : biggest >= 1e6 ? [",,", "M", 1e6] : biggest >= 1e4 ? [",", "k", 1e3] : ["", "", 1];
  const whole = all.every((v) => Number.isInteger(v / scale));
  const base = `${whole ? "#,##0" : "#,##0.0"}${divide}${suffix ? `"${suffix}"` : ""}`;
  if (data.unit?.percent) return `${whole ? "0" : "0.0"}"%"`;
  if (data.unit?.currency) return `"${data.unit.currency}"${base}`;
  return base;
}

function drawChart(deck, page, piece, box, theme) {
  const { block } = piece;
  const data = block.data;
  const captionH = captionHeight(block);
  const area = { x: box.x, y: box.y, w: box.w, h: box.h - captionH };
  const palette = chartPalette(theme);
  const format = numberFormat(data);
  const few = data.categories.length * data.series.length <= 16;
  const common = {
    ...area,
    fontFace: THEME.officeFont,
    /* One set of numbers is one colour. PowerPoint otherwise gives each
       bar of a single series its own colour, which reads as a key that is
       not there. Pies are the exception: each slice needs its own. */
    chartColors: data.series.length > 1 || data.kind === "pie" || data.kind === "doughnut" ? palette : [palette[0]],
    catAxisLabelColor: THEME.muted,
    valAxisLabelColor: THEME.muted,
    catAxisLabelFontSize: 11,
    valAxisLabelFontSize: 11,
    catAxisLineShow: true,
    valAxisLineShow: false,
    valGridLine: { color: THEME.rule, size: 0.75 },
    catGridLine: { style: "none" },
    valAxisLabelFormatCode: format,
    dataLabelFormatCode: format,
    dataLabelColor: THEME.body,
    dataLabelFontSize: 10,
    showLegend: data.series.length > 1,
    legendPos: "t",
    legendFontSize: 11,
    legendColor: THEME.body,
  };
  const series = data.series.map((s) => ({ name: s.name || block.caption || "Values", labels: data.categories.map(String), values: s.values }));

  if (data.kind === "pie" || data.kind === "doughnut") {
    page.addChart(data.kind, series.slice(0, 1), {
      ...common,
      showLegend: true,
      legendPos: "r",
      showPercent: true,
      showValue: false,
      /* The share is a fraction, so it needs a per cent format, not the
         value's format, or every slice reads "0". */
      dataLabelFormatCode: "0%",
      dataLabelColor: "FFFFFF",
      dataLabelFontSize: 12,
      dataBorder: { pt: 1.5, color: "FFFFFF" },
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
      catAxisTitleFontSize: 11,
      valAxisTitleFontSize: 11,
    });
  } else if (data.kind === "line" || data.kind === "area") {
    page.addChart(data.kind, series, {
      ...common,
      lineSize: 2.5,
      lineDataSymbol: data.categories.length <= 24 ? "circle" : "none",
      lineDataSymbolSize: 7,
    });
  } else {
    page.addChart("bar", series, {
      ...common,
      barDir: data.kind === "bar" ? "bar" : "col",
      barGrouping: data.kind === "stacked" ? "stacked" : "clustered",
      barGapWidthPct: data.kind === "histogram" ? 3 : 60,
      showValue: few && data.kind !== "stacked",
    });
  }
  drawCaption(page, block, box);
}

function drawTakeaway(page, runs, theme) {
  const y = FOOT_Y - 0.2 - TAKEAWAY_H;
  page.addShape("roundRect", { x: X, y, w: BODY_W, h: TAKEAWAY_H, fill: { color: theme.accent }, line: { color: theme.accent }, rectRadius: 0.08 });
  page.addText(runsToPptx(runs, { fontSize: 15, color: "FFFFFF", fontFace: THEME.officeFont, bold: true }), {
    x: X + 0.3, y, w: BODY_W - 0.6, h: TAKEAWAY_H, valign: "middle", margin: 0, fit: "shrink",
  });
}

function drawCover(deck, slide, theme, brand) {
  const page = deck.addSlide();
  page.background = { color: "FFFFFF" };
  const panelW = 4.4;
  page.addShape("rect", { x: 0, y: 0, w: panelW, h: H, fill: { color: theme.accent }, line: { color: theme.accent } });
  if (brand?.logoData) {
    /* On a white tile, so any logo, dark or light, reads on the panel. */
    page.addShape("roundRect", { x: 0.9, y: H / 2 - 1.3, w: panelW - 1.8, h: 2.6, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" }, rectRadius: 0.15 });
    page.addImage({ data: brand.logoData, x: 1.15, y: H / 2 - 1.05, w: panelW - 2.3, h: 2.1, sizing: { type: "contain", w: panelW - 2.3, h: 2.1 } });
  } else if (brand?.name) {
    page.addText(brand.name, {
      x: 0.5, y: H / 2 - 0.8, w: panelW - 1, h: 1.6, fontSize: 26, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: THEME.officeFont, fit: "shrink",
    });
  }
  page.addText(slide.title, {
    x: panelW + 0.8, y: 1.9, w: W - panelW - 1.6, h: 2.0, fontSize: 40, bold: true, color: THEME.ink, fontFace: THEME.officeFont, valign: "bottom", fit: "shrink",
  });
  page.addShape("rect", { x: panelW + 0.85, y: 4.1, w: 1.0, h: 0.07, fill: { color: theme.accent }, line: { color: theme.accent } });
  if (slide.subtitle) {
    page.addText(slide.subtitle, {
      x: panelW + 0.8, y: 4.35, w: W - panelW - 1.6, h: 1.1, fontSize: 19, color: THEME.muted, fontFace: THEME.officeFont, valign: "top",
    });
  }
  if (brand?.name) {
    page.addText(brand.name, {
      x: panelW + 0.8, y: H - 1.1, w: W - panelW - 1.6, h: 0.4, fontSize: 12, color: THEME.muted, fontFace: THEME.officeFont,
    });
  }
}

/* --------------------------------------------------------------------------
   SECTION 4: Writing the file

   `theme` comes from themeFor(company brand colour). `brand` is
   { name, logoData } with the logo already read into a data address, or
   nothing, and the cover then carries the company name instead.
   -------------------------------------------------------------------------- */

export async function deckBlob(doc, theme = { ...THEME, highlight: "DDE2EE", onAccentSoft: "EEF0F6", kicker: "1B347C" }, brand = null, images = null) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.title = doc.title;

  deck.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: X, y: FOOT_Y, w: BODY_W, h: 0.012, fill: { color: THEME.rule } } },
      { text: { text: runningLine(brand?.name, doc.title), options: { x: X, y: FOOT_Y + 0.05, w: BODY_W - 1, h: 0.35, fontSize: 11, color: THEME.muted, fontFace: THEME.officeFont } } },
    ],
    slideNumber: { x: W - X - 0.6, y: FOOT_Y + 0.05, w: 0.6, h: 0.35, fontSize: 10, color: THEME.muted, align: "right", fontFace: THEME.officeFont },
  });

  for (const slide of toDeck(doc)) {
    if (slide.kind === "cover") {
      drawCover(deck, slide, theme, brand);
      continue;
    }

    const page = deck.addSlide({ masterName: "CONTENT" });
    drawHeader(page, slide, theme);

    const bottom = FOOT_Y - 0.25 - (slide.takeaway ? TAKEAWAY_H + 0.25 : 0);

    /* TEXT BESIDE A PICTURE. The text on the left, the picture on the
       right, both from under the band to the bottom of the space. */
    if (BESIDE.has(slide.feature?.kind) && slide.text.length) {
      const textW = BODY_W * TEXT_SHARE;
      page.addText(textBody(slide.text, theme), { x: X, y: BODY_TOP, w: textW, h: bottom - BODY_TOP, valign: "middle", fontFace: THEME.officeFont, margin: 0 });
      const side = { x: X + textW + 0.4, y: BODY_TOP, w: BODY_W - textW - 0.4, h: bottom - BODY_TOP };
      if (slide.feature.kind === "chart") drawChart(deck, page, slide.feature, side, theme);
      else drawImage(page, slide.feature, side, theme, images);
      if (slide.takeaway) drawTakeaway(page, slide.takeaway, theme);
      continue;
    }

    let y = BODY_TOP;
    if (slide.text.length) {
      const h = slide.text.reduce((s, p) => s + p.h, 0) + 0.05;
      page.addText(textBody(slide.text, theme), { x: X, y, w: BODY_W, h, valign: "top", fontFace: THEME.officeFont, margin: 0 });
      y += h + 0.2;
    }
    if (slide.feature?.kind === "image") {
      /* A picture on its own takes the whole space. */
      drawImage(page, slide.feature, { x: X, y, w: BODY_W, h: bottom - y }, theme, images);
    } else if (slide.feature?.kind === "chart") {
      drawChart(deck, page, slide.feature, { x: X, y, w: BODY_W, h: bottom - y }, theme);
    } else if (slide.feature) {
      const h = Math.min(slide.feature.h, bottom - y);
      if (slide.feature.kind === "cards" || slide.feature.kind === "steps") drawCards(page, slide.feature, y, Math.max(h, 1.5), theme);
      else if (slide.feature.kind === "stat") drawStat(page, slide.feature, y, Math.max(h, 2.4), theme);
      else drawTable(page, slide.feature.block, y, theme);
    }
    if (slide.takeaway) drawTakeaway(page, slide.takeaway, theme);
  }

  return deck.write({ outputType: "blob" });
}
