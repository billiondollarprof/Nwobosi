/* ==========================================================================
   DRAWING THE SLIDES AS THEY WILL LOOK

   What this is: a stand in for the PowerPoint library that records every
   box, text and picture the slide writer (deck.js) places, exactly where it
   places them, and then draws them on a canvas.

   Why it exists. Anthony, 2026-11-10: "The system should look at what it
   made (screenshot) before handing it over, especially slides." A .pptx
   cannot be opened in a browser, but the slide writer can be run a second
   time against this recorder. Same code, same measurements, same words, so
   the picture shows what the file holds.

   What it finds on its own, before any model looks:
     - TEXT THAT SPILLS out of its box, measured with the canvas's own text
       measuring rather than estimated.
     - TEXT SMALLER THAN 11 POINT anywhere a reader is meant to read.

   What it must never do:
     - Change the file. It only records and draws.
     - Pretend a chart is drawn. Charts are drawn by PowerPoint itself, so
       here they are a grey box saying so, and the look agent is told that.
   ========================================================================== */

/* Pixels per inch on the canvas. The slide is 13.333 by 7.5 inches. */
const PPI = 80;
const W_IN = 13.333;
const H_IN = 7.5;

/* --------------------------------------------------------------------------
   1. The recorder: the same calls deck.js makes on PptxGenJS
   -------------------------------------------------------------------------- */

export class SlideRecorder {
  constructor() {
    this.slides = [];
    this.masters = {};
    this.layout = "LAYOUT_WIDE";
    this.title = "";
  }

  defineSlideMaster(master) {
    this.masters[master.title] = master;
  }

  addSlide(options = {}) {
    const slide = { master: options.masterName ? this.masters[options.masterName] : null, items: [], background: null };
    this.slides.push(slide);
    return {
      /* deck.js sets a slide's own background with "page.background = ". */
      set background(value) { slide.background = value; },
      get background() { return slide.background; },
      addText: (text, o = {}) => slide.items.push({ kind: "text", text, o }),
      addShape: (shape, o = {}) => slide.items.push({ kind: "shape", shape, o }),
      addImage: (o = {}) => slide.items.push({ kind: "image", o }),
      addTable: (rows, o = {}) => slide.items.push({ kind: "table", rows, o }),
      addChart: (type, data, o = {}) => slide.items.push({ kind: "chart", type, o }),
    };
  }

  /* deck.js ends with write(); here that hands back what was recorded. */
  write() {
    return Promise.resolve(this.slides);
  }
}

/* --------------------------------------------------------------------------
   2. Text: turning a box's text into lines, the way PowerPoint wraps it
   -------------------------------------------------------------------------- */

function fontFor(size, bold, italic) {
  return `${italic ? "italic " : ""}${bold ? "bold " : ""}${(size / 72) * PPI}px Calibri, Carlito, Arial, sans-serif`;
}

/* A box's text as paragraphs of runs. A string is one paragraph; an array
   of runs breaks where a run says breakLine. */
function paragraphsOf(text, o) {
  const base = { fontSize: o.fontSize ?? 18, bold: o.bold, italic: o.italic, color: o.color };
  if (typeof text === "string") return [[{ text, opt: base }]];
  const paras = [[]];
  for (const run of text ?? []) {
    const opt = { ...base, ...(run.options ?? {}) };
    paras[paras.length - 1].push({ text: String(run.text ?? ""), opt });
    if (run.options?.breakLine) paras.push([]);
  }
  return paras.filter((p) => p.length);
}

/* Lays a box's paragraphs out into lines of words, measured on the canvas.
   Returns the lines and the height they need, in pixels. */
function layOut(ctx, paras, widthPx) {
  const lines = [];
  let height = 0;
  for (const para of paras) {
    const first = para[0].opt;
    const size = first.fontSize ?? 18;
    const indent = first.bullet ? (size / 72) * PPI * 1.2 : 0;
    const before = ((first.paraSpaceBefore ?? 0) / 72) * PPI;
    const after = ((first.paraSpaceAfter ?? 0) / 72) * PPI;
    height += before;
    let line = { words: [], width: indent, size, bullet: Boolean(first.bullet), indent };
    for (const run of para) {
      ctx.font = fontFor(run.opt.fontSize ?? size, run.opt.bold, run.opt.italic);
      for (const word of run.text.split(/(\s+)/)) {
        if (!word) continue;
        const w = ctx.measureText(word).width;
        if (line.width + w > widthPx && line.words.length && word.trim()) {
          lines.push(line);
          height += line.size / 72 * PPI * 1.2;
          line = { words: [], width: indent, size, bullet: false, indent };
        }
        if (!line.words.length && !word.trim()) continue;
        line.words.push({ word, w, opt: run.opt });
        line.width += w;
        line.size = Math.max(line.size, run.opt.fontSize ?? size);
      }
    }
    if (line.words.length) {
      lines.push(line);
      height += (line.size / 72) * PPI * 1.2;
    }
    height += after;
  }
  return { lines, height };
}

function hex(color, fallback = "#000000") {
  const c = String(color ?? "").replace("#", "");
  return /^[0-9a-f]{6}$/i.test(c) ? `#${c}` : fallback;
}

/* Draws one text box and reports whether its text spills past the box. */
function drawText(ctx, item, problems, slideNo) {
  const o = item.o;
  const margin = Array.isArray(o.margin) ? o.margin[1] ?? 0 : Number(o.margin ?? 0.08);
  const x = (o.x ?? 0) * PPI;
  const y = (o.y ?? 0) * PPI;
  const w = (o.w ?? 1) * PPI;
  const h = (o.h ?? 0.5) * PPI;
  const inner = Math.max(10, w - margin * PPI * 2);
  const paras = paragraphsOf(item.text, o);
  const { lines, height } = layOut(ctx, paras, inner);

  /* Spills out: more than a tenth of an inch past the bottom of its box. */
  if (height > h + 0.1 * PPI) {
    const words = paras.flat().map((r) => r.text).join(" ").trim().slice(0, 60);
    problems.push(`Slide ${slideNo}: the text "${words}…" runs past the bottom of its box.`);
  }
  for (const para of paras) {
    for (const run of para) {
      if (run.text.trim() && (run.opt.fontSize ?? 18) < 11) {
        problems.push(`Slide ${slideNo}: text at ${run.opt.fontSize} point is smaller than 11.`);
        break;
      }
    }
  }

  let ty = y;
  if (o.valign === "middle") ty = y + Math.max(0, (h - height) / 2);
  else if (o.valign === "bottom") ty = y + Math.max(0, h - height);
  for (const line of lines) {
    const lh = (line.size / 72) * PPI * 1.2;
    let tx = x + margin * PPI + line.indent;
    if (o.align === "center") tx = x + (w - line.width) / 2 + line.indent;
    else if (o.align === "right") tx = x + w - margin * PPI - line.width;
    if (line.bullet) {
      ctx.fillStyle = hex(line.words[0]?.opt.color, "#333333");
      ctx.font = fontFor(line.size);
      ctx.fillText("•", tx - line.indent * 0.8, ty + lh * 0.8);
    }
    for (const piece of line.words) {
      ctx.font = fontFor(piece.opt.fontSize ?? line.size, piece.opt.bold, piece.opt.italic);
      ctx.fillStyle = hex(piece.opt.color, "#333333");
      ctx.fillText(piece.word, tx, ty + lh * 0.8);
      tx += piece.w;
    }
    ty += lh;
  }
}

/* --------------------------------------------------------------------------
   3. Shapes, pictures, tables and charts
   -------------------------------------------------------------------------- */

/* Shapes: boxes, rounded boxes, circles and lines, with their fill, their
   see-through amount (PowerPoint's "transparency", 0 to 100) and their
   outline. A line is a box with a diagonal, flipped to go up or left. */
function drawShape(ctx, item) {
  const o = item.o;
  const x = (o.x ?? 0) * PPI;
  const y = (o.y ?? 0) * PPI;
  const w = (o.w ?? 0) * PPI;
  const h = (o.h ?? 0) * PPI;
  ctx.save();
  if (item.shape === "line") {
    const x1 = o.flipH ? x + w : x;
    const x2 = o.flipH ? x : x + w;
    const y1 = o.flipV ? y + h : y;
    const y2 = o.flipV ? y : y + h;
    ctx.strokeStyle = hex(o.line?.color, "#888888");
    ctx.lineWidth = Math.max(1, ((o.line?.width ?? 1) / 72) * PPI);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (o.line?.endArrowType) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 0.09 * PPI;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45));
      ctx.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45));
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.beginPath();
  if (item.shape === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (item.shape === "roundRect" && ctx.roundRect) ctx.roundRect(x, y, w, h, (o.rectRadius ?? 0.1) * PPI);
  else ctx.rect(x, y, w, h);
  ctx.globalAlpha = 1 - (o.fill?.transparency ?? 0) / 100;
  ctx.fillStyle = hex(o.fill?.color, "#DDDDDD");
  ctx.fill();
  const outline = o.line?.color && (o.line?.transparency ?? 0) < 100 && o.line.color !== o.fill?.color;
  if (outline) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hex(o.line.color, "#888888");
    ctx.lineWidth = Math.max(1, ((o.line.width ?? 1) / 72) * PPI);
    ctx.stroke();
  }
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawPicture(ctx, item) {
  const o = item.o;
  const img = o.data ? await loadImage(o.data) : null;
  const x = (o.x ?? 0) * PPI;
  const y = (o.y ?? 0) * PPI;
  const w = (o.w ?? 1) * PPI;
  const h = (o.h ?? 1) * PPI;
  if (!img) {
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawTable(ctx, item, problems, slideNo) {
  const o = item.o;
  const rows = item.rows ?? [];
  if (!rows.length) return;
  const cols = rows[0].length || 1;
  const x = (o.x ?? 0) * PPI;
  const w = (o.w ?? 10) * PPI;
  const cw = w / cols;
  const rh = (Array.isArray(o.rowH) ? o.rowH[0] : o.rowH ?? 0.4) * PPI;
  let y = (o.y ?? 0) * PPI;
  const size = o.fontSize ?? 13;
  for (const row of rows) {
    row.forEach((cell, c) => {
      const opt = cell.options ?? {};
      ctx.fillStyle = hex(opt.fill?.color, "#FFFFFF");
      ctx.fillRect(x + c * cw, y, cw, rh);
      ctx.strokeStyle = hex(o.border?.color, "#CCCCCC");
      ctx.strokeRect(x + c * cw, y, cw, rh);
      ctx.font = fontFor(size, opt.bold);
      ctx.fillStyle = hex(opt.color, "#333333");
      const text = String(cell.text ?? "");
      const tw = ctx.measureText(text).width;
      if (tw > cw - 0.24 * PPI && !text.includes(" ")) {
        problems.push(`Slide ${slideNo}: "${text.slice(0, 30)}" is too wide for its table cell.`);
      }
      const tx = opt.align === "right" ? x + (c + 1) * cw - 0.12 * PPI - tw : x + c * cw + 0.12 * PPI;
      ctx.fillText(text, tx, y + rh / 2 + (size / 72) * PPI * 0.35, cw - 0.24 * PPI);
    });
    y += rh;
  }
  if (y > H_IN * PPI) problems.push(`Slide ${slideNo}: the table runs off the bottom of the slide.`);
}

function drawChartBox(ctx, item) {
  const o = item.o;
  const x = (o.x ?? 0) * PPI;
  const y = (o.y ?? 0) * PPI;
  const w = (o.w ?? 4) * PPI;
  const h = (o.h ?? 3) * PPI;
  ctx.fillStyle = "#3A3F4A";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#E5E7EB";
  ctx.font = fontFor(14, true);
  ctx.fillText(`${item.type} chart, drawn by PowerPoint`, x + 12, y + 28);
}

/* --------------------------------------------------------------------------
   4. One slide, then all of them
   -------------------------------------------------------------------------- */

async function drawSlide(slide, slideNo, problems) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W_IN * PPI);
  canvas.height = Math.round(H_IN * PPI);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = hex(slide.background?.color ?? slide.master?.background?.color, "#FFFFFF");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const obj of slide.master?.objects ?? []) {
    if (obj.rect) drawShape(ctx, { shape: "rect", o: obj.rect });
    if (obj.text) drawText(ctx, { text: obj.text.text, o: obj.text.options ?? {} }, [], slideNo);
  }
  for (const item of slide.items) {
    if (item.kind === "shape") drawShape(ctx, item);
    else if (item.kind === "text") drawText(ctx, item, problems, slideNo);
    else if (item.kind === "image") await drawPicture(ctx, item);
    else if (item.kind === "table") drawTable(ctx, item, problems, slideNo);
    else if (item.kind === "chart") drawChartBox(ctx, item);
  }
  return canvas.toDataURL("image/jpeg", 0.72);
}

/* Every slide as a picture, and what the measuring found. */
export async function drawSlides(slides) {
  const problems = [];
  const pictures = [];
  for (let i = 0; i < slides.length; i += 1) pictures.push(await drawSlide(slides[i], i + 1, problems));
  return { pictures, problems: [...new Set(problems)] };
}
