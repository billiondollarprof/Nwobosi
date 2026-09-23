/* ==========================================================================
   A CHART, READ AND CHECKED BEFORE ANYTHING DRAWS IT

   Anthony, 2026-09-23: "the assistant is capable of drawing any kind of
   chart, be it bar chat, line, histogram etc anyone required." And: "the
   most dependable workflow product. So staffs are confident they can rely
   on the assistant." (DOCUMENT-HARNESS.md, section 4.)

   WHAT THE MODEL WRITES
       :::chart bar #revenue | Room revenue, ₦ millions | Source: Q3 report
       | Quarter | 2025 | 2026 |
       | --- | --- | --- |
       | Q1 | 12.4 | 14.1 |
       :::
   A type, an optional tag, a caption, a source, and a plain table.

   WHAT THIS FILE DOES
   Turns that table into numbers every writer can draw from, and checks it.
   The model never draws, never counts and never picks histogram buckets.
   Code does, here, the same way every time.

   WHAT IT MUST NEVER DO
   Guess. A cell that is not a number is not quietly read as zero. The chart
   is marked with a plain problem instead, the writers show its table, and
   the staff is told. A chart that is wrong is worse than no chart.

   READ TOP TO BOTTOM
     1. The kinds of chart
     2. Reading a number out of a cell
     3. Histogram buckets
     4. The one entry point: chartData
     5. Nice axis steps, and how a number is written
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: The kinds of chart
   -------------------------------------------------------------------------- */

export const CHART_KINDS = {
  bar: "bars across",
  column: "bars up",
  stacked: "stacked bars up",
  line: "a line",
  area: "a filled line",
  pie: "a pie",
  doughnut: "a ring",
  scatter: "dots, one number against another",
  histogram: "how raw values spread across ranges",
};

/* A few words the model might reach for, mapped to what is built. */
const SAME_AS = { columns: "column", bars: "bar", "stacked-column": "stacked", donut: "doughnut", ring: "doughnut", lines: "line", dots: "scatter", distribution: "histogram" };

export function chartKind(word) {
  const w = String(word ?? "").trim().toLowerCase();
  if (CHART_KINDS[w]) return w;
  return SAME_AS[w] ?? null;
}

/* --------------------------------------------------------------------------
   SECTION 2: Reading a number out of a cell

   "₦85,000" is 85000 in naira. "12.5%" is 12.5 per cent. "(1,200)" is the
   accountant's way of writing minus 1200. "₦12.4m", "3.5bn" and "40k" are
   read as the full number. Anything else that is not a number returns
   NaN, never zero.
   -------------------------------------------------------------------------- */

const CURRENCY = /[₦$£€¥]/;

export function readNumber(cell) {
  const raw = String(cell ?? "").trim();
  if (!raw) return { value: NaN };
  const negative = /^\(.*\)$/.test(raw) || /^[-−–]/.test(raw);
  const currency = raw.match(CURRENCY)?.[0] ?? "";
  const percent = raw.includes("%");
  const stripped = raw.replace(/[(),\s₦$£€¥%]/g, "").replace(/^[-−–]/, "");
  const scaled = stripped.match(/^(\d*\.?\d+)(k|m|mn|bn|b|million|billion|thousand)?$/i);
  if (!scaled) return { value: NaN };
  const times = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 }[String(scaled[2] ?? "").toLowerCase()] ?? 1;
  const value = Number(scaled[1]) * times * (negative ? -1 : 1);
  return { value, currency, percent };
}

/* --------------------------------------------------------------------------
   SECTION 3: Histogram buckets

   The model gives raw values. Code chooses the buckets: about the square
   root of how many values there are, between 5 and 12, on round edges
   (10, 20, 30 rather than 13.7, 27.4). Each value lands in exactly one
   bucket; the last bucket includes its top edge.
   -------------------------------------------------------------------------- */

export function histogramBins(values) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return [];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  if (min === max) return [{ from: min, to: max, count: clean.length }];

  const target = Math.max(5, Math.min(12, Math.round(Math.sqrt(clean.length))));
  const width = niceStep((max - min) / target);
  const start = Math.floor(min / width) * width;
  const bins = [];
  for (let from = start; from <= max; from += width) {
    bins.push({ from: round(from), to: round(from + width), count: 0 });
    if (bins.length > 40) break;
  }
  for (const v of clean) {
    let i = Math.floor((v - start) / width);
    if (i >= bins.length) i = bins.length - 1;
    bins[i].count += 1;
  }
  return bins;
}

function round(n) {
  return Math.round(n * 1e9) / 1e9;
}

/* --------------------------------------------------------------------------
   SECTION 4: The one entry point

   chartData(kind, header, rows) takes the table as plain text cells and
   returns what every writer draws from:
     { kind, categories, series: [{ name, values }], unit, problem }
   `problem` is a sentence for the staff, or "" when the chart is sound.
   -------------------------------------------------------------------------- */

export function chartData(kindWord, header, rows) {
  const kind = chartKind(kindWord);
  const out = { kind, categories: [], series: [], unit: { currency: "", percent: false }, problem: "" };
  const fail = (problem) => ({ ...out, problem });

  if (!kind) return fail(`"${kindWord}" is not a kind of chart this can draw.`);
  if (!header?.length || !rows?.length) return fail("The chart has no numbers under it.");

  const width = header.length;
  if (rows.some((row) => row.filter((c) => String(c).trim()).length > width)) {
    return fail("A row of the chart has more cells than its heading.");
  }

  /* HISTOGRAM: the raw values are the last column (or the only one). */
  if (kind === "histogram") {
    const col = width - 1;
    const read = rows.map((row) => readNumber(row[col]));
    const bad = read.findIndex((r) => Number.isNaN(r.value));
    if (bad >= 0) return fail(`"${rows[bad][col]}" in the chart is not a number.`);
    const bins = histogramBins(read.map((r) => r.value));
    const unit = unitOf(read);
    return {
      ...out,
      unit,
      categories: bins.map((b) => (b.from === b.to ? formatNumber(b.from, unit) : `${formatNumber(b.from, unit)}–${formatNumber(b.to, unit)}`)),
      series: [{ name: String(header[col] || "Count"), values: bins.map((b) => b.count) }],
      counted: true,
    };
  }

  /* SCATTER: the first two number columns are x and y. */
  if (kind === "scatter") {
    if (width < 2) return fail("A scatter chart needs two columns of numbers.");
    const xs = rows.map((row) => readNumber(row[0]));
    const ys = rows.map((row) => readNumber(row[1]));
    const bad = [...xs, ...ys].findIndex((r) => Number.isNaN(r.value));
    if (bad >= 0) return fail("Every cell of a scatter chart has to be a number.");
    return {
      ...out,
      unit: unitOf(ys),
      xUnit: unitOf(xs),
      xName: String(header[0] ?? ""),
      categories: xs.map((r) => r.value),
      series: [{ name: String(header[1] ?? ""), values: ys.map((r) => r.value) }],
    };
  }

  /* EVERY OTHER KIND: first column names the things, the rest are series. */
  if (width < 2) return fail("The chart needs a column of names and at least one column of numbers.");
  const categories = rows.map((row) => String(row[0] ?? "").trim());
  const series = [];
  const all = [];
  for (let c = 1; c < width; c += 1) {
    const read = rows.map((row) => readNumber(row[c]));
    const bad = read.findIndex((r) => Number.isNaN(r.value));
    if (bad >= 0) return fail(`"${rows[bad][c] || "an empty cell"}" in the chart is not a number.`);
    series.push({ name: String(header[c] ?? "").trim(), values: read.map((r) => r.value) });
    all.push(...read);
  }

  if (kind === "pie" || kind === "doughnut") {
    if (series.length > 1) return fail("A pie shows one set of numbers. This one has several; bars would show it better.");
    if (series[0].values.some((v) => v < 0)) return fail("A pie cannot show a number below zero.");
    if (series[0].values.every((v) => v === 0)) return fail("Every slice of the pie is zero.");
  }

  return { ...out, categories, series, unit: unitOf(all) };
}

/* The currency or per cent sign the numbers were written with, if they all
   agree. Mixed signs mean no sign is shown rather than a wrong one. */
function unitOf(read) {
  const currencies = new Set(read.map((r) => r.currency).filter(Boolean));
  return {
    currency: currencies.size === 1 ? [...currencies][0] : "",
    percent: read.length > 0 && read.every((r) => r.percent),
  };
}

/* --------------------------------------------------------------------------
   SECTION 5: Nice axis steps, and how a number is written
   -------------------------------------------------------------------------- */

/* The step of an axis: 1, 2, 2.5 or 5 times a power of ten. */
export function niceStep(rough) {
  if (!(rough > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/* The ticks of a value axis from its lowest to its highest value. Bars
   always start at zero, because a bar that starts anywhere else lies about
   how big it is. */
export function niceTicks(min, max, count = 5) {
  const lo = Math.min(0, min);
  const hi = max > lo ? max : lo + 1;
  const step = niceStep((hi - lo) / count);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + step * 0.5 && ticks.length < 20; v += step) ticks.push(round(v));
  if (ticks[ticks.length - 1] < hi) ticks.push(round(ticks[ticks.length - 1] + step));
  return ticks;
}

/* 1234567 is "1.2M" on an axis and "1,234,567" in a label. */
export function formatNumber(value, unit = {}, { short = false } = {}) {
  const sign = value < 0 ? "-" : "";
  const n = Math.abs(value);
  let text;
  if (short && n >= 1e9) text = `${trim(n / 1e9)}B`;
  else if (short && n >= 1e6) text = `${trim(n / 1e6)}M`;
  else if (short && n >= 1e4) text = `${trim(n / 1e3)}k`;
  else text = n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return `${sign}${unit.currency ?? ""}${text}${unit.percent ? "%" : ""}`;
}

function trim(n) {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}
