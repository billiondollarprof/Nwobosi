/* ==========================================================================
   ONE DRAWING OF A CHART, FOR EVERY FORMAT

   The PDF prints this drawing directly. Word gets it with a picture copy
   for older versions. The spreadsheet gets the picture copy. The preview in
   the chat shows it as it is. So a chart looks the same everywhere the
   staff sees it. (Slides are the one exception: they get a real PowerPoint
   chart, see deck.js, so the numbers can be edited in PowerPoint.)

   It is SVG (a drawing written as lines and shapes rather than pixels),
   built as a plain string, with no library and no browser needed. That
   keeps it the same in the browser, in tests and in the PDF.

   WHAT IT MUST NEVER DO
   - Start a bar anywhere but zero. A bar that starts at 50 makes 60 look
     like double 55.
   - Print text it has not escaped. Every word from the document goes
     through esc(), so a "<" in a caption cannot break the drawing.
   - Invent a colour scheme. The first colour is the company's own accent
     (documentTheme.js), and the rest are calm business colours that sit
     well beside any brand.

   READ TOP TO BOTTOM
     1. Size, colours, text
     2. The axes
     3. Bars, stacked bars and histograms
     4. Lines and areas
     5. Pies and rings
     6. Scatter
     7. The one entry point: chartSvg
   ========================================================================== */

import { THEME } from "../documentTheme.js";
import { formatNumber, niceStep, niceTicks } from "./chartData.js";

/* --------------------------------------------------------------------------
   SECTION 1: Size, colours, text
   -------------------------------------------------------------------------- */

export const CHART_W = 640;
export const CHART_H = 340;

/* After the company's accent: teal, amber, slate, rose, green, violet,
   cyan. Distinct from each other in print and for most colour blindness. */
const AFTER_ACCENT = ["0F766E", "D97706", "64748B", "BE185D", "65A30D", "7C3AED", "0891B2"];

export function chartPalette(theme) {
  return [theme?.accent ?? THEME.accent, ...AFTER_ACCENT];
}

function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Roughly how wide a line of text is, for fitting labels. */
function textWidth(text, size) {
  return String(text ?? "").length * size * 0.56;
}

/* Cut a label to fit, on a character, with an ellipsis. */
function fit(text, width, size) {
  const s = String(text ?? "");
  const max = Math.max(3, Math.floor(width / (size * 0.56)));
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function makeText(font) {
  return (x, y, words, { size = 11, color = THEME.muted, anchor = "middle", weight = "normal", baseline = "auto" } = {}) =>
    `<text x="${r(x)}" y="${r(y)}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="#${color}" text-anchor="${anchor}"${baseline !== "auto" ? ` dominant-baseline="${baseline}"` : ""}>${esc(words)}</text>`;
}

function r(n) {
  return Math.round(n * 10) / 10;
}

/* --------------------------------------------------------------------------
   SECTION 2: The axes

   The plot area leaves room on the left for the value labels, at the
   bottom for the category labels, and at the top for a legend when there
   is more than one series.
   -------------------------------------------------------------------------- */

function legend(series, palette, text, y, size) {
  if (series.length < 2) return "";
  const items = series.map((s, i) => ({ name: s.name || `Series ${i + 1}`, color: palette[i % palette.length] }));
  const widths = items.map((it) => 16 + textWidth(it.name, 11) + 18);
  let x = (size.w - widths.reduce((a, b) => a + b, 0)) / 2;
  return items
    .map((it, i) => {
      const out = `<rect x="${r(x)}" y="${r(y - 9)}" width="10" height="10" rx="2" fill="#${it.color}"/>${text(x + 15, y, it.name, { anchor: "start", color: THEME.body })}`;
      x += widths[i];
      return out;
    })
    .join("");
}

/* The value axis, drawn up the left, with light lines across. */
function valueAxis(ticks, box, unit, text) {
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const y = (v) => box.y + box.h - ((v - lo) / (hi - lo || 1)) * box.h;
  const lines = ticks
    .map((t) => `<line x1="${r(box.x)}" x2="${r(box.x + box.w)}" y1="${r(y(t))}" y2="${r(y(t))}" stroke="#${t === 0 ? "9CA3AF" : THEME.rule}" stroke-width="${t === 0 ? 1 : 0.8}"/>` +
      text(box.x - 8, y(t) + 4, formatNumber(t, unit, { short: true }), { anchor: "end", size: 10.5 }))
    .join("");
  return { svg: lines, y };
}

/* The same, across the bottom, for bars that run sideways. */
function valueAxisAcross(ticks, box, unit, text) {
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (v) => box.x + ((v - lo) / (hi - lo || 1)) * box.w;
  const lines = ticks
    .map((t) => `<line y1="${r(box.y)}" y2="${r(box.y + box.h)}" x1="${r(x(t))}" x2="${r(x(t))}" stroke="#${t === 0 ? "9CA3AF" : THEME.rule}" stroke-width="${t === 0 ? 1 : 0.8}"/>` +
      text(x(t), box.y + box.h + 16, formatNumber(t, unit, { short: true }), { size: 10.5 }))
    .join("");
  return { svg: lines, x };
}

/* Category names under the plot. When they would crowd, every second (or
   third) one is shown, and each is cut to fit its space. */
function categoryLabels(categories, box, text, { gapless = false } = {}) {
  const slot = box.w / Math.max(1, categories.length);
  const longest = Math.max(...categories.map((c) => textWidth(c, 10.5)), 1);
  const every = Math.max(1, Math.ceil(longest / (slot * (gapless ? 1.6 : 1.15))));
  return categories
    .map((c, i) => (i % every === 0 ? text(box.x + slot * i + slot / 2, box.y + box.h + 16, fit(c, slot * every - 4, 10.5), { size: 10.5 }) : ""))
    .join("");
}

function plotBox(size, hasLegend, leftRoom = 56) {
  const top = hasLegend ? 40 : 18;
  return { x: leftRoom, y: top, w: size.w - leftRoom - 16, h: size.h - top - 34 };
}

function leftRoomFor(ticks, unit) {
  const widest = Math.max(...ticks.map((t) => textWidth(formatNumber(t, unit, { short: true }), 10.5)));
  return Math.max(40, Math.min(90, widest + 16));
}

/* --------------------------------------------------------------------------
   SECTION 3: Bars, stacked bars and histograms
   -------------------------------------------------------------------------- */

function columns(data, palette, text, size, { stacked = false, gapless = false } = {}) {
  const { categories, series, unit } = data;
  const totals = categories.map((_, i) => series.reduce((sum, s) => sum + Math.max(0, s.values[i]), 0));
  const negatives = categories.map((_, i) => series.reduce((sum, s) => sum + Math.min(0, s.values[i]), 0));
  const all = series.flatMap((s) => s.values);
  const max = stacked ? Math.max(...totals) : Math.max(...all);
  const min = stacked ? Math.min(...negatives) : Math.min(...all);
  const ticks = niceTicks(min, max);
  const box = plotBox(size, series.length > 1, leftRoomFor(ticks, unit));
  const axis = valueAxis(ticks, box, unit, text);

  const slot = box.w / categories.length;
  const groupW = slot * (gapless ? 0.98 : 0.72);
  const barW = stacked || series.length === 1 ? groupW : groupW / series.length;
  /* A value is printed over its bar only when it fits there. On a narrow
     drawing the labels would run into each other, and the axis already
     says it. */
  const widestLabel = Math.max(...all.map((v) => textWidth(formatNumber(v, unit, { short: true }), 10)));
  const showValues = !stacked && categories.length * series.length <= 16 && widestLabel <= barW + 6;

  let bars = "";
  categories.forEach((_, i) => {
    const left = box.x + slot * i + (slot - groupW) / 2;
    let up = 0;
    let down = 0;
    series.forEach((s, j) => {
      const v = s.values[i];
      const color = palette[(series.length === 1 ? 0 : j) % palette.length];
      let y0;
      let y1;
      if (stacked) {
        const base = v >= 0 ? up : down;
        y0 = axis.y(base);
        y1 = axis.y(base + v);
        if (v >= 0) up += v;
        else down += v;
      } else {
        y0 = axis.y(0);
        y1 = axis.y(v);
      }
      const x = stacked || series.length === 1 ? left : left + barW * j;
      const top = Math.min(y0, y1);
      const h = Math.max(0.5, Math.abs(y1 - y0));
      bars += `<rect x="${r(x)}" y="${r(top)}" width="${r(Math.max(1, barW - (gapless ? 0.5 : 2)))}" height="${r(h)}" rx="${gapless ? 0 : 2}" fill="#${color}"/>`;
      if (showValues) {
        bars += text(x + barW / 2, v >= 0 ? top - 5 : top + h + 12, formatNumber(v, unit, { short: true }), { size: 10, color: THEME.body });
      }
    });
  });

  return axis.svg + bars + categoryLabels(categories, box, text, { gapless }) + legend(series, palette, text, 22, size);
}

function barsAcross(data, palette, text, size) {
  const { categories, series, unit } = data;
  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const labelRoom = Math.max(60, Math.min(size.w * 0.3, Math.max(...categories.map((c) => textWidth(c, 11))) + 14));
  const top = series.length > 1 ? 40 : 14;
  const box = { x: labelRoom, y: top, w: size.w - labelRoom - 40, h: size.h - top - 30 };
  const axis = valueAxisAcross(ticks, box, unit, text);

  const slot = box.h / categories.length;
  const groupH = slot * 0.72;
  const barH = groupH / series.length;
  const showValues = categories.length * series.length <= 16 && barH >= 11;

  let bars = "";
  categories.forEach((c, i) => {
    const topY = box.y + slot * i + (slot - groupH) / 2;
    bars += text(box.x - 8, topY + groupH / 2 + 4, fit(c, labelRoom - 14, 11), { anchor: "end", size: 11, color: THEME.body });
    series.forEach((s, j) => {
      const v = s.values[i];
      const x0 = axis.x(0);
      const x1 = axis.x(v);
      const y = topY + barH * j;
      bars += `<rect x="${r(Math.min(x0, x1))}" y="${r(y)}" width="${r(Math.max(0.5, Math.abs(x1 - x0)))}" height="${r(Math.max(1, barH - 2))}" rx="2" fill="#${palette[(series.length === 1 ? 0 : j) % palette.length]}"/>`;
      if (showValues) bars += text(Math.max(x0, x1) + 5, y + barH / 2 + 3.5, formatNumber(v, unit, { short: true }), { anchor: "start", size: 10, color: THEME.body });
    });
  });

  return axis.svg + bars + legend(series, palette, text, 22, size);
}

/* --------------------------------------------------------------------------
   SECTION 4: Lines and areas
   -------------------------------------------------------------------------- */

function lines(data, palette, text, size, { area = false } = {}) {
  const { categories, series, unit } = data;
  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const box = plotBox(size, series.length > 1, leftRoomFor(ticks, unit));
  const axis = valueAxis(ticks, box, unit, text);
  const step = categories.length > 1 ? box.w / (categories.length - 1) : 0;
  const x = (i) => (categories.length > 1 ? box.x + step * i : box.x + box.w / 2);
  const dots = categories.length <= 24;

  let drawn = "";
  series.forEach((s, j) => {
    const color = palette[j % palette.length];
    const points = s.values.map((v, i) => `${r(x(i))},${r(axis.y(v))}`);
    if (area) {
      const base = axis.y(Math.max(0, ticks[0]));
      drawn += `<polygon points="${r(x(0))},${r(base)} ${points.join(" ")} ${r(x(s.values.length - 1))},${r(base)}" fill="#${color}" fill-opacity="${series.length > 1 ? 0.18 : 0.22}"/>`;
    }
    drawn += `<polyline points="${points.join(" ")}" fill="none" stroke="#${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (dots) drawn += s.values.map((v, i) => `<circle cx="${r(x(i))}" cy="${r(axis.y(v))}" r="3.2" fill="#FFFFFF" stroke="#${color}" stroke-width="2"/>`).join("");
  });

  /* Line charts label a point, not a slot, so the labels sit under each point. */
  const slot = categories.length > 1 ? step : box.w;
  const longest = Math.max(...categories.map((c) => textWidth(c, 10.5)), 1);
  const every = Math.max(1, Math.ceil(longest / (slot * 1.1)));
  const labels = categories
    .map((c, i) => (i % every === 0 || i === categories.length - 1 ? text(x(i), box.y + box.h + 16, fit(c, slot * every, 10.5), { size: 10.5 }) : ""))
    .join("");

  return axis.svg + drawn + labels + legend(series, palette, text, 22, size);
}

/* --------------------------------------------------------------------------
   SECTION 5: Pies and rings

   Slices go clockwise from twelve o'clock, in the order written. The
   share is printed inside a slice big enough to hold it, and every slice
   is named in the key beside the pie with its value and share.
   -------------------------------------------------------------------------- */

function pie(data, palette, text, size, { ring = false } = {}) {
  const { categories, series, unit } = data;
  const values = series[0].values;
  const total = values.reduce((a, b) => a + b, 0);
  /* Wide: the pie on the left, the key on the right. Narrow (a phone):
     the pie on top and the key under it at full width, so names are
     never cut to a couple of letters. */
  const narrow = size.w < 480;
  const keyRowH = 20;
  const radius = narrow
    ? Math.max(40, Math.min(size.w / 2 - 20, (size.h - values.length * keyRowH - 34) / 2))
    : Math.min(size.h / 2 - 20, size.w * 0.22);
  const cx = narrow ? size.w / 2 : radius + 20;
  const cy = narrow ? radius + 12 : size.h / 2;
  const keyX = narrow ? 14 : cx + radius + 24;
  const inner = ring ? radius * 0.58 : 0;
  let angle = -Math.PI / 2;
  let drawn = "";
  let labels = "";

  values.forEach((v, i) => {
    const share = v / total;
    const sweep = share * Math.PI * 2;
    const color = palette[i % palette.length];
    if (share >= 0.9999) {
      drawn += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#${color}"/>`;
    } else if (share > 0) {
      const a0 = angle;
      const a1 = angle + sweep;
      const big = sweep > Math.PI ? 1 : 0;
      const p = (a, rad) => `${r(cx + Math.cos(a) * rad)},${r(cy + Math.sin(a) * rad)}`;
      drawn += `<path d="M ${p(a0, radius)} A ${radius} ${radius} 0 ${big} 1 ${p(a1, radius)} L ${cx},${cy} Z" fill="#${color}" stroke="#FFFFFF" stroke-width="1.5"/>`;
      if (share >= 0.06) {
        const mid = a0 + sweep / 2;
        const at = ring ? (radius + inner) / 2 : radius * 0.64;
        labels += text(cx + Math.cos(mid) * at, cy + Math.sin(mid) * at + 4, `${Math.round(share * 100)}%`, { size: 12, color: "FFFFFF", weight: "bold" });
      }
    }
    angle += sweep;
  });
  if (ring) drawn += `<circle cx="${cx}" cy="${cy}" r="${r(inner)}" fill="#FFFFFF"/>`;

  /* The key, beside the pie. */
  const rowH = narrow ? keyRowH : Math.min(26, (size.h - 30) / Math.max(1, values.length));
  const valueRoom = 86;
  const keyTop = narrow ? cy + radius + 26 : cy - (rowH * values.length) / 2 + rowH / 2;
  const key = values
    .map((v, i) => {
      const y = keyTop + rowH * i;
      return `<rect x="${r(keyX)}" y="${r(y - 9)}" width="11" height="11" rx="2" fill="#${palette[i % palette.length]}"/>` +
        text(keyX + 18, y + 1, fit(categories[i], size.w - keyX - 18 - valueRoom - 12, 11.5), { anchor: "start", size: 11.5, color: THEME.body }) +
        text(size.w - 12, y + 1, unit.percent ? formatNumber(v, unit) : `${formatNumber(v, unit, { short: true })}  ·  ${Math.round((v / total) * 100)}%`, { anchor: "end", size: 11, color: THEME.muted });
    })
    .join("");

  return drawn + labels + key;
}

/* --------------------------------------------------------------------------
   SECTION 6: Scatter
   Both axes fit the numbers rather than starting at zero, because a dot is
   a position, not a length.
   -------------------------------------------------------------------------- */

function range(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = niceStep((hi - lo || Math.abs(hi) || 1) / 5);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + step * 0.5 && ticks.length < 20; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
  if (ticks.length < 2) ticks.push(ticks[0] + step);
  return ticks;
}

function scatter(data, palette, text, size) {
  const xs = data.categories;
  const ys = data.series[0].values;
  const yTicks = range(ys);
  const xTicks = range(xs);
  const box = plotBox(size, false, leftRoomFor(yTicks, data.unit));
  box.h -= 12;
  const axis = valueAxis(yTicks, box, data.unit, text);
  const xAt = (v) => box.x + ((v - xTicks[0]) / (xTicks[xTicks.length - 1] - xTicks[0] || 1)) * box.w;
  const xLabels = xTicks.map((t) => text(xAt(t), box.y + box.h + 16, formatNumber(t, data.xUnit, { short: true }), { size: 10.5 })).join("");
  const dots = xs.map((x, i) => `<circle cx="${r(xAt(x))}" cy="${r(axis.y(ys[i]))}" r="4" fill="#${palette[0]}" fill-opacity="0.8"/>`).join("");
  const names = text(box.x + box.w / 2, size.h - 4, data.xName, { size: 10.5, color: THEME.body }) +
    text(box.x, 12, data.series[0].name, { anchor: "start", size: 10.5, color: THEME.body });
  return axis.svg + dots + xLabels + names;
}

/* --------------------------------------------------------------------------
   SECTION 7: The one entry point

   chartSvg(data, theme, { font, width, height }) returns the drawing as a
   string, or "" when the chart has a problem (the writers then show its
   table). The files use the full 640 by 340. The preview on a phone asks
   for a narrower drawing, so the text stays the same size in it instead of
   shrinking to nothing when the drawing is scaled down.
   `font` is the font the writer has: "Roboto" in the PDF, which carries it
   inside the file, and the Office font elsewhere.
   -------------------------------------------------------------------------- */

export function chartSvg(data, theme, { font = "Roboto, Calibri, Arial, sans-serif", width = CHART_W, height = CHART_H } = {}) {
  if (!data || data.problem || !data.series?.length) return "";
  const palette = chartPalette(theme);
  const text = makeText(font);
  const size = { w: width, h: height };
  const draw = {
    column: () => columns(data, palette, text, size),
    stacked: () => columns(data, palette, text, size, { stacked: true }),
    histogram: () => columns(data, palette, text, size, { gapless: true }),
    bar: () => barsAcross(data, palette, text, size),
    line: () => lines(data, palette, text, size),
    area: () => lines(data, palette, text, size, { area: true }),
    pie: () => pie(data, palette, text, size),
    doughnut: () => pie(data, palette, text, size, { ring: true }),
    scatter: () => scatter(data, palette, text, size),
  }[data.kind];
  if (!draw) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${draw()}</svg>`;
}
