/* ==========================================================================
   SLIDE DIAGRAMS

   What this is: every designed shape a slide can carry, each drawn from
   real PowerPoint shapes, so a person can click any box, arrow or word and
   change it. Nothing here is a picture of a diagram.

   Why it exists. Anthony, 2026-11-11, sending a deck he made in Canva as
   the standard: "use boxes, diagrams, whatever it is, icons, SVG... premium
   charts, premium designs", and "any design, any PowerPoint has to be
   editable". His deck carried exactly these: a row of boxes joined by
   arrows, phase rows, a hub fanning out to a list, an org chart, cards with
   icons, a closing statement. The writing step marks which one a slide
   uses (documentModel.js, section 3), and deck.js gives each one its box.

   Every diagram has two functions:
     xxxHeight(piece, width)        how tall it needs to be, before placing
     drawXxx(page, piece, box, s)   draws it inside box {x, y, w, h}
   `s` is the deck theme (slideTheme.js).

   What it must never do:
     - Draw outside its box. A diagram that needs more room than it was
       given shrinks its type to the 11 point floor, never spills.
     - Put text under 11 point anywhere a person reads.

   READ TOP TO BOTTOM
     1. Shared pieces: a panel, an arrow, a line, an icon badge
     2. Cards and steps
     3. Phases
     4. Flow
     5. Hub
     6. Tree (org chart)
     7. Big figure, statement, takeaway
   ========================================================================== */

import { TYPE, mix } from "./slideTheme.js";
import { iconData } from "./slideIcons.js";
import { textHeight, blocksHeight, linesHeight, slideRuns, oneRun, plainText, blockText } from "./slideText.js";

const F = TYPE.font;
const GAP = 0.3;

/* --------------------------------------------------------------------------
   1. Shared pieces
   -------------------------------------------------------------------------- */

export function panel(page, x, y, w, h, s, { lit = false, outline = null, radius = 0.1 } = {}) {
  page.addShape("roundRect", {
    x, y, w, h, rectRadius: radius,
    fill: { color: lit ? s.litFill : s.panel },
    line: { color: outline ?? (lit ? s.litFill : s.panelLine), width: 1 },
  });
}

/* A straight line between two points, with or without an arrow head. A
   line in PowerPoint is a box with a diagonal, so going up or left is the
   same box flipped. */
export function line(page, x1, y1, x2, y2, color, { arrow = false, width = 1.25 } = {}) {
  const w = x2 - x1;
  const h = y2 - y1;
  page.addShape("line", {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(w), 0.001), h: Math.max(Math.abs(h), 0.001),
    flipH: w < 0, flipV: h < 0,
    line: { color, width, ...(arrow ? { endArrowType: "triangle" } : {}) },
  });
}

/* An icon in a filled circle. Nothing is drawn for a name not on the list. */
export function iconBadge(page, name, x, y, size, s) {
  const data = name ? iconData(name, s.onLit) : null;
  if (!data) return false;
  page.addShape("ellipse", { x, y, w: size, h: size, fill: { color: s.litFill }, line: { color: s.litFill } });
  const inner = size * 0.56;
  page.addImage({ data, x: x + (size - inner) / 2, y: y + (size - inner) / 2, w: inner, h: inner });
  return true;
}

/* The text of an item's own blocks: lists as one line each, paragraphs as
   they are. `skip` drops a line (a phase's "Outcome:" is drawn apart). */
function itemLines(blocks, skip = null) {
  const out = [];
  for (const b of blocks ?? []) {
    if (b.type === "list") b.items.forEach((it) => out.push({ runs: it.runs, bullet: true }));
    else if (b.runs && !(skip && skip(b))) out.push({ runs: b.runs, bullet: false });
    else if (!b.runs && b.type !== "list") {
      const t = blockText(b);
      if (t) out.push({ runs: [{ text: t }], bullet: false });
    }
  }
  return out;
}

function linesToRuns(lines, base, s) {
  const out = [];
  lines.forEach((ln, i) => {
    const runs = slideRuns(ln.runs, { ...base, ...(ln.bullet ? { bullet: { indent: 14 } } : {}), paraSpaceAfter: 4 }, { lit: s.lit });
    if (!runs.length) return;
    if (i < lines.length - 1) runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  });
  return out;
}

function linesTextHeight(lines, size, width) {
  return lines.reduce((sum, ln) => sum + textHeight(plainText(ln.runs).length + (ln.bullet ? 3 : 0), size, width - (ln.bullet ? 0.2 : 0)), 0);
}

/* --------------------------------------------------------------------------
   2. Cards and steps
   Two to four boxes side by side. Cards can carry an icon; steps carry a
   number and an arrow to the next.
   -------------------------------------------------------------------------- */

const ICON = 0.62;

function cardInner(item, width) {
  return (item.icon ? ICON + 0.2 : 0)
    + textHeight(plainText(item.title).length, TYPE.cardTitle, width)
    + (item.kicker ? 0.34 : 0)
    + blocksHeight(item.blocks, TYPE.card, width);
}

export function cardsHeight(piece, width) {
  const count = piece.items.length;
  const gap = piece.kind === "steps" ? 0.45 : GAP;
  const cw = (width - gap * (count - 1)) / count;
  const tallest = Math.max(...piece.items.map((item) => cardInner(item, cw - 0.56)));
  return Math.max(2.0, tallest + 0.6);
}

export function drawCards(page, piece, box, s) {
  const count = piece.items.length;
  const steps = piece.kind === "steps";
  const gap = steps ? 0.45 : GAP;
  const cw = (box.w - gap * (count - 1)) / count;
  piece.items.forEach((item, i) => {
    const x = box.x + i * (cw + gap);
    panel(page, x, box.y, cw, box.h, s);
    let y = box.y + 0.28;
    const tx = x + 0.28;
    const tw = cw - 0.56;
    if (steps) {
      page.addShape("ellipse", { x: tx, y, w: 0.5, h: 0.5, fill: { color: s.litFill }, line: { color: s.litFill } });
      page.addText(String((piece.start ?? 0) + i + 1), {
        x: tx, y, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: s.onLit, align: "center", valign: "middle", fontFace: F, margin: 0,
      });
      y += 0.7;
      if (i < count - 1) line(page, x + cw + 0.08, box.y + box.h / 2, x + cw + gap - 0.08, box.y + box.h / 2, s.line, { arrow: true, width: 1.75 });
    } else if (iconBadge(page, item.icon, tx, y, ICON, s)) {
      y += ICON + 0.2;
    }
    const titleH = textHeight(plainText(item.title).length, TYPE.cardTitle, tw);
    page.addText(slideRuns(item.title, { fontSize: TYPE.cardTitle, bold: true, color: s.ink, fontFace: F }), {
      x: tx, y, w: tw, h: titleH, valign: "top", margin: 0,
    });
    y += titleH;
    if (item.kicker) {
      page.addText(item.kicker.toUpperCase(), {
        x: tx, y, w: tw, h: 0.3, fontSize: TYPE.small, bold: true, color: s.lit, charSpacing: 1, fontFace: F, margin: 0,
      });
      y += 0.36;
    }
    const lines = itemLines(item.blocks);
    if (lines.length) {
      page.addText(linesToRuns(lines, { fontSize: TYPE.card, color: s.body, fontFace: F }, s), {
        x: tx, y: y + 0.04, w: tw, h: Math.max(0.3, box.y + box.h - y - 0.22), valign: "top", margin: 0,
      });
    }
  });
}

/* --------------------------------------------------------------------------
   3. Phases
   One row per phase: a numbered tag on the left, then the phase's name and
   time, its points, and its outcome on the right. Arrows join the tags.
   -------------------------------------------------------------------------- */

const TAG_W = 1.2;
const NAME_W = 2.5;
const OUTCOME_W = 2.6;
const isOutcome = (b) => b.type === "p" && /^outcome\s*:/i.test(plainText(b.runs).trim());

function phaseParts(item, width) {
  const lines = itemLines(item.blocks, isOutcome);
  const pointsW = width - TAG_W - 0.25 - NAME_W - (item.outcome ? OUTCOME_W : 0) - 0.6;
  const twoCols = lines.length > 3 && pointsW > 4;
  const colW = twoCols ? (pointsW - 0.3) / 2 : pointsW;
  const half = twoCols ? Math.ceil(lines.length / 2) : lines.length;
  const cols = twoCols ? [lines.slice(0, half), lines.slice(half)] : [lines];
  return { cols, colW, pointsW };
}

function phaseRowHeight(item, width, size) {
  const { cols, colW } = phaseParts(item, width);
  const points = Math.max(...cols.map((c) => linesTextHeight(c, size, colW)));
  const name = textHeight(plainText(item.title).length, 17, NAME_W - 0.3) + (item.kicker ? 0.34 : 0);
  const outcome = item.outcome ? 0.32 + textHeight(item.outcome.length, size, OUTCOME_W - 0.3) : 0;
  return Math.max(1.05, points + 0.3, name + 0.3, outcome + 0.3);
}

export function phasesHeight(piece, width) {
  return piece.items.reduce((sum, item) => sum + phaseRowHeight(item, width, 13), 0) + 0.22 * (piece.items.length - 1);
}

export function drawPhases(page, piece, box, s) {
  /* The type steps down if the rows need more room than the box has. */
  let size = 13;
  const need = (sz) => piece.items.reduce((sum, item) => sum + phaseRowHeight(item, box.w, sz), 0) + 0.22 * (piece.items.length - 1);
  while (size > 11 && need(size) > box.h) size -= 0.5;

  let y = box.y;
  piece.items.forEach((item, i) => {
    const h = phaseRowHeight(item, box.w, size);
    const number = String((piece.start ?? 0) + i + 1).padStart(2, "0");

    /* The tag. */
    panel(page, box.x, y, TAG_W, h, s, { outline: s.line });
    page.addText([
      { text: "PHASE", options: { fontSize: 11, bold: true, color: s.lit, charSpacing: 2, breakLine: true } },
      { text: number, options: { fontSize: 30, bold: true, color: s.litLarge } },
    ], { x: box.x, y, w: TAG_W, h, align: "center", valign: "middle", fontFace: F, margin: 0 });
    if (i < piece.items.length - 1) line(page, box.x + TAG_W / 2, y + h + 0.02, box.x + TAG_W / 2, y + h + 0.2, s.line, { arrow: true });

    /* The row. */
    const rx = box.x + TAG_W + 0.25;
    const rw = box.w - TAG_W - 0.25;
    panel(page, rx, y, rw, h, s);
    const name = slideRuns(item.title, { fontSize: 17, bold: true, color: s.ink, fontFace: F }, { upper: true });
    if (item.kicker) {
      name[name.length - 1].options.breakLine = true;
      name.push({ text: item.kicker, options: { fontSize: 13, bold: true, color: s.lit, fontFace: F } });
    }
    page.addText(name, { x: rx + 0.3, y, w: NAME_W - 0.3, h, valign: "middle", margin: 0 });

    const { cols, colW } = phaseParts(item, box.w);
    cols.forEach((col, c) => {
      if (!col.length) return;
      page.addText(linesToRuns(col, { fontSize: size, color: s.body, fontFace: F }, s), {
        x: rx + NAME_W + 0.1 + c * (colW + 0.3), y, w: colW, h, valign: "middle", margin: 0,
      });
    });

    if (item.outcome) {
      const ox = rx + rw - OUTCOME_W;
      page.addText([
        { text: "OUTCOME", options: { fontSize: 11, bold: true, color: s.lit, charSpacing: 2, breakLine: true } },
        { text: item.outcome, options: { fontSize: size, color: s.body } },
      ], { x: ox, y, w: OUTCOME_W - 0.3, h, valign: "middle", fontFace: F, margin: 0 });
    }
    y += h + 0.22;
  });
}

/* --------------------------------------------------------------------------
   4. Flow
   Boxes in a row joined by arrows. The lit step is filled with the brand.
   -------------------------------------------------------------------------- */

export function flowHeight() {
  return 1.15;
}

export function drawFlow(page, piece, box, s) {
  const n = piece.steps.length;
  const gap = n > 5 ? 0.42 : 0.55;
  const bw = (box.w - gap * (n - 1)) / n;
  const bh = Math.min(1.5, box.h);
  const y = box.y + (box.h - bh) / 2;
  const longest = Math.max(...piece.steps.map((st) => plainText(st.runs).length));
  /* Two lines of capitals fit the box; the type steps down to 12. */
  let size = 16;
  while (size > 12 && Math.ceil((longest * size * 0.62) / 72 / (bw - 0.3)) > 2) size -= 1;
  piece.steps.forEach((step, i) => {
    const x = box.x + i * (bw + gap);
    panel(page, x, y, bw, bh, s, { lit: step.lit, outline: step.lit ? null : s.line });
    page.addText(slideRuns(step.runs, { fontSize: size, bold: true, color: step.lit ? s.onLit : s.ink, fontFace: F }, { upper: true }), {
      x: x + 0.12, y, w: bw - 0.24, h: bh, align: "center", valign: "middle", margin: 0,
    });
    if (i < n - 1) line(page, x + bw + 0.06, y + bh / 2, x + bw + gap - 0.06, y + bh / 2, s.line, { arrow: true, width: 1.75 });
  });
}

/* --------------------------------------------------------------------------
   5. Hub
   One box, lit, with a line fanning out to each thing it does.
   -------------------------------------------------------------------------- */

function hubLayout(piece, width) {
  const centreW = Math.min(3.1, width * 0.3);
  const listX = centreW + 1.5;
  const listW = width - listX;
  const size = piece.items.length > 7 ? 13 : 15;
  const rows = piece.items.map((it) => textHeight(plainText(it.runs).length, size, listW - 0.35) + 0.04);
  return { centreW, listX, listW, size, rows };
}

export function hubHeight(piece, width) {
  const { rows } = hubLayout(piece, width);
  return Math.max(1.8, rows.reduce((a, b) => a + b, 0) + 0.2);
}

export function drawHub(page, piece, box, s) {
  const { centreW, listX, listW, size, rows } = hubLayout(piece, box.w);
  const total = rows.reduce((a, b) => a + b, 0);
  const scale = total > box.h ? box.h / total : 1;
  const centreH = Math.min(1.5, box.h);
  const cy = box.y + box.h / 2;
  panel(page, box.x, cy - centreH / 2, centreW, centreH, s, { lit: true });
  const centre = slideRuns(piece.centre, { fontSize: 24, bold: true, color: s.onLit, fontFace: F }, { upper: true });
  if (piece.caption) {
    centre[centre.length - 1].options.breakLine = true;
    centre.push({ text: piece.caption, options: { fontSize: 12, color: s.onLit, fontFace: F } });
  }
  page.addText(centre, { x: box.x + 0.15, y: cy - centreH / 2, w: centreW - 0.3, h: centreH, align: "center", valign: "middle", margin: 0 });

  let y = box.y + Math.max(0, (box.h - total * scale) / 2);
  const fromX = box.x + centreW;
  piece.items.forEach((item, i) => {
    const h = rows[i] * scale;
    const dotY = y + h / 2;
    line(page, fromX, cy, box.x + listX - 0.12, dotY, s.line, { width: 1 });
    page.addShape("ellipse", { x: box.x + listX - 0.12, y: dotY - 0.06, w: 0.12, h: 0.12, fill: { color: s.lit }, line: { color: s.lit } });
    page.addText(slideRuns(item.runs, { fontSize: size, color: s.body, fontFace: F }, { lit: s.lit }), {
      x: box.x + listX + 0.15, y, w: listW - 0.2, h, valign: "middle", margin: 0,
    });
    y += h;
  });
}

/* --------------------------------------------------------------------------
   6. Tree (org chart)
   A top box, a line down to a rail, and a box for each child under it.
   -------------------------------------------------------------------------- */

function treeChildWidth(count, width) {
  return Math.min(3.2, (width - GAP * (count - 1)) / count);
}

function treeChildHeight(item, cw) {
  return Math.max(1.0, 0.3 + textHeight(plainText(item.title).length, 15, cw - 0.3)
    + (item.kicker ? 0.32 : 0) + blocksHeight(item.blocks, 12.5, cw - 0.4) + 0.15);
}

export function treeHeight(piece, width) {
  const cw = treeChildWidth(piece.items.length, width);
  return 0.9 + 0.7 + Math.max(...piece.items.map((it) => treeChildHeight(it, cw)));
}

export function drawTree(page, piece, box, s) {
  const n = piece.items.length;
  const cw = treeChildWidth(n, box.w);
  const rowW = cw * n + GAP * (n - 1);
  const rowX = box.x + (box.w - rowW) / 2;
  const topW = Math.min(4, box.w * 0.4);
  const topH = 0.9;
  const topX = box.x + (box.w - topW) / 2;
  panel(page, topX, box.y, topW, topH, s, { lit: true });
  const top = slideRuns(piece.top, { fontSize: 18, bold: true, color: s.onLit, fontFace: F }, { upper: true });
  if (piece.topCaption) {
    top[top.length - 1].options.breakLine = true;
    top.push({ text: piece.topCaption, options: { fontSize: 12, color: s.onLit } });
  }
  page.addText(top, { x: topX + 0.1, y: box.y, w: topW - 0.2, h: topH, align: "center", valign: "middle", fontFace: F, margin: 0 });

  const railY = box.y + topH + 0.35;
  const childY = railY + 0.35;
  const childH = Math.max(0.9, box.y + box.h - childY);
  line(page, box.x + box.w / 2, box.y + topH, box.x + box.w / 2, railY, s.line);
  if (n > 1) line(page, rowX + cw / 2, railY, rowX + rowW - cw / 2, railY, s.line);
  piece.items.forEach((item, i) => {
    const x = rowX + i * (cw + GAP);
    line(page, x + cw / 2, railY, x + cw / 2, childY - 0.03, s.line, { arrow: true });
    panel(page, x, childY, cw, childH, s, { outline: s.line });
    const head = slideRuns(item.title, { fontSize: 15, bold: true, color: s.lit, fontFace: F }, { upper: true });
    if (item.kicker) {
      head[head.length - 1].options.breakLine = true;
      head.push({ text: item.kicker, options: { fontSize: 12, color: s.body } });
    }
    const headH = textHeight(plainText(item.title).length, 15, cw - 0.3) + (item.kicker ? 0.32 : 0);
    const lines = itemLines(item.blocks);
    page.addText(head, {
      x: x + 0.15, y: childY + 0.15, w: cw - 0.3, h: lines.length ? headH : childH - 0.3,
      align: "center", valign: lines.length ? "top" : "middle", fontFace: F, margin: 0,
    });
    if (lines.length) {
      page.addText(linesToRuns(lines, { fontSize: 12.5, color: s.body, fontFace: F }, s), {
        x: x + 0.2, y: childY + 0.2 + headH, w: cw - 0.4, h: Math.max(0.3, childH - headH - 0.35), valign: "top", margin: 0,
      });
    }
  });
}

/* --------------------------------------------------------------------------
   7. Big figure, statement, takeaway
   -------------------------------------------------------------------------- */

const STAT_W = 3.9;

export function statHeight(piece, width) {
  return Math.max(2.5, blocksHeight(piece.block.blocks, TYPE.lead, width - STAT_W - 0.45) + 0.3);
}

export function drawStat(page, piece, box, s) {
  panel(page, box.x, box.y, STAT_W, box.h, s, { lit: true, radius: 0.12 });
  page.addText(piece.block.value, {
    x: box.x + 0.15, y: box.y + 0.2, w: STAT_W - 0.3, h: box.h * 0.55, fontSize: 56, bold: true, color: s.onLit, align: "center", valign: "middle", fontFace: F, fit: "shrink",
  });
  if (piece.block.caption) {
    page.addText(piece.block.caption, {
      x: box.x + 0.25, y: box.y + box.h * 0.62, w: STAT_W - 0.5, h: box.h * 0.33, fontSize: 14, color: s.onLit, align: "center", valign: "top", fontFace: F,
    });
  }
  const lines = itemLines(piece.block.blocks);
  if (lines.length) {
    page.addText(linesToRuns(lines, { fontSize: TYPE.lead, color: s.body, fontFace: F }, s), {
      x: box.x + STAT_W + 0.45, y: box.y, w: box.w - STAT_W - 0.45, h: box.h, valign: "middle", margin: 0,
    });
  }
}

export function statementHeight(piece, width) {
  return Math.max(1.5, linesHeight(plainText(piece.runs).toUpperCase(), 34, width - 1.2) * 1.08 + 0.6);
}

export function drawStatement(page, piece, box, s) {
  panel(page, box.x, box.y, box.w, box.h, s, { outline: s.line, radius: 0.14 });
  page.addText(slideRuns(piece.runs, { fontSize: 34, bold: true, color: s.ink, fontFace: F }, { lit: s.litLarge, upper: true }), {
    x: box.x + 0.6, y: box.y + 0.2, w: box.w - 1.2, h: box.h - 0.4, align: "center", valign: "middle", margin: 0,
  });
}

export const TAKEAWAY_H = 0.7;

export function drawTakeaway(page, runs, box, s) {
  panel(page, box.x, box.y, box.w, box.h, s, { outline: s.line, radius: 0.08 });
  page.addShape("ellipse", { x: box.x + 0.3, y: box.y + box.h / 2 - 0.08, w: 0.16, h: 0.16, fill: { color: s.lit }, line: { color: s.lit } });
  page.addText(slideRuns(runs, { fontSize: 15, bold: true, color: s.ink, fontFace: F }, { lit: s.lit }), {
    x: box.x + 0.65, y: box.y, w: box.w - 0.95, h: box.h, valign: "middle", margin: 0, fit: "shrink",
  });
}

/* A soft glow in a corner, for depth, made of two see-through circles. Not
   a stripe, not a bar: the open skills both warn against those. */
export function drawGlow(page, s, { x, y, size }) {
  const strong = s.mode === "dark" ? 88 : 80;
  page.addShape("ellipse", { x, y, w: size, h: size, fill: { color: s.glow, transparency: strong + 8 }, line: { color: s.glow, transparency: 100 } });
  page.addShape("ellipse", { x: x + size * 0.2, y: y + size * 0.2, w: size * 0.6, h: size * 0.6, fill: { color: s.glow, transparency: strong }, line: { color: s.glow, transparency: 100 } });
}

export { mix, oneRun };
