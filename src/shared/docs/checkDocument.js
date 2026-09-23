/* ==========================================================================
   THE CHECKER: CODE READS EVERY DOCUMENT BEFORE THE STAFF DOES

   Anthony, 2026-09-23: "the most dependable workflow product. So staffs are
   confident they can rely on the assistant." (DOCUMENT-HARNESS.md, section 5.)

   WHAT THIS IS
   The model writes the document. Then, before anybody sees the finished
   thing, this reads it and checks the parts that have one right answer.
   It is code, not a model call, so it costs nothing and it does the same
   thing every time.

   WHAT IT DOES, IN ORDER
     1. Skip means skip. When the brief says "Pictures: none", any picture
        block that slipped through is taken out, so a file for a client
        never carries an empty "Picture to add here" box.
     2. Totals add up. A table's Total row is added up again by code. A
        wrong total is replaced by the right one, and the staff is told.
     3. Numbers come from somewhere. Every number in the document is looked
        for in what the writing was allowed to use: the approved brief, the
        conversation, the outside material they accepted, and the company's
        own sources. A number found in none of them is listed for the staff
        to check. It may be worked out from the sources (a difference, a
        share), so it is flagged, never removed.

   Chart problems and figures pointed at that do not exist are found by the
   document reader itself (documentModel.js), and join this list there.

   WHAT IT MUST NEVER DO
   - Change a word of the writing, other than a wrong total and a picture
     the staff said to skip.
   - Stop a document reaching the staff. Everything here is wrapped by the
     caller, and a check that fails simply finds nothing.

   READ TOP TO BOTTOM
     1. Skip means skip
     2. Totals
     3. Numbers against what was allowed
   ========================================================================== */

import { readNumber } from "./charts/chartData.js";
import { isTableLine, isDivider, rawCells } from "../structure.js";

/* --------------------------------------------------------------------------
   SECTION 1: Skip means skip
   -------------------------------------------------------------------------- */

export function briefSaysNoPictures(brief) {
  return /pictures\s*:\s*none\b/i.test(String(brief ?? ""));
}

export function stripPictures(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const kept = lines.filter((line) => !/^\s*:::\s*image\b/i.test(line));
  return { markdown: kept.join("\n"), removed: lines.length - kept.length };
}

/* --------------------------------------------------------------------------
   SECTION 2: Totals

   Only a column where every cell above the Total is a plain number or an
   amount of money is added up. A column of percentages or rates is left
   alone, because those do not add up to anything meaningful.
   -------------------------------------------------------------------------- */

/* How many decimals a cell was written with, and whether it used commas,
   so the corrected total is written the same way as its column. */
function styleOf(cell) {
  const text = String(cell ?? "");
  const scaled = text.match(/\d(k|m|mn|bn|b|million|billion|thousand)\b/i)?.[1] ?? "";
  const decimals = (text.replace(/[^\d.]/g, "").split(".")[1] ?? "").length;
  return { commas: text.includes(","), decimals, scaled };
}

const SCALE = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };

function writeLike(value, sample, currency) {
  const style = styleOf(sample);
  const scale = SCALE[style.scaled.toLowerCase()] ?? 1;
  const n = value / scale;
  const body = style.commas || n >= 10000
    ? n.toLocaleString("en-GB", { minimumFractionDigits: style.decimals, maximumFractionDigits: style.decimals })
    : n.toFixed(style.decimals);
  return `${value < 0 ? "-" : ""}${currency}${body.replace(/^-/, "")}${style.scaled}`;
}

export function fixTotals(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const findings = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!(isTableLine(lines[i].trim()) && isDivider(lines[i + 1]))) continue;
    const header = rawCells(lines[i].trim());
    let end = i + 2;
    while (end < lines.length && isTableLine(lines[end].trim())) end += 1;
    const bodyAt = i + 2;
    const totalAt = end - 1;
    const rows = lines.slice(bodyAt, end).map((l) => rawCells(l.trim()));
    i = end - 1;
    if (rows.length < 2 || !/^\**\s*total\b/i.test(String(rows[rows.length - 1][0] ?? "").trim())) continue;

    const total = rows[rows.length - 1];
    const above = rows.slice(0, -1);
    let changed = false;

    for (let c = 1; c < header.length; c += 1) {
      const written = readNumber(String(total[c] ?? "").replace(/\*/g, ""));
      if (Number.isNaN(written.value) || written.percent) continue;
      const cells = above.map((row) => readNumber(String(row[c] ?? "").replace(/\*/g, "")));
      if (cells.some((cell) => Number.isNaN(cell.value) || cell.percent)) continue;

      const sum = cells.reduce((acc, cell) => acc + cell.value, 0);
      /* Allowed to differ by rounding at the precision the TOTAL was
         written to: 1.25 + 2.26 written as a total of 3.5 is right. */
      const decimals = styleOf(total[c]).decimals;
      const scale = SCALE[styleOf(total[c]).scaled.toLowerCase()] ?? 1;
      const tolerance = (0.5 * scale) / 10 ** decimals + 1e-9;
      if (Math.abs(sum - written.value) <= tolerance) continue;

      const bold = /^\*\*.*\*\*$/.test(String(total[c]).trim());
      const fixed = writeLike(sum, String(total[c]).replace(/\*/g, ""), written.currency || cells.find((x) => x.currency)?.currency || "");
      findings.push(`The total for ${String(header[c]).trim() || "a column"} was written as ${String(total[c]).replace(/\*/g, "").trim()}. The rows above add up to ${fixed}, so ${fixed} is used.`);
      total[c] = bold ? `**${fixed}**` : fixed;
      changed = true;
    }

    if (changed) lines[totalAt] = `| ${total.join(" | ")} |`;
  }

  return { markdown: lines.join("\n"), findings };
}

/* --------------------------------------------------------------------------
   SECTION 3: Numbers against what was allowed

   A number is anything like 85,000, ₦85,000, 12.5%, ₦12.4m or 3.5bn. Small
   whole numbers under 10 with no sign on them ("3 steps", "2 floors") are
   left out: they are nearly always counts in the writing, and listing them
   would bury the numbers that matter. Figures in a Total row are left out
   too, because section 2 has already checked those by adding them up.
   -------------------------------------------------------------------------- */

/* Not the middle of a word or a date: the "23" of "2026-09-23" and the "3"
   of "Q3" are not claims. */
const NUMBER = /(?<![\w.,/-])(?:[₦$£€]\s?)?\(?-?\d[\d,]*(?:\.\d+)?\)?\s?(?:%|(?:k|m|mn|bn|million|billion|thousand)\b)?(?![\w-]*\d)/gi;

function numbersIn(text) {
  const out = [];
  for (const match of String(text ?? "").matchAll(NUMBER)) {
    const raw = match[0].trim().replace(/\s+/g, "");
    const read = readNumber(raw);
    if (Number.isNaN(read.value)) continue;
    out.push({ raw: match[0].trim(), value: read.value, percent: read.percent, currency: read.currency, at: match.index });
  }
  return out;
}

function worthChecking(n) {
  if (n.currency || n.percent) return true;
  return Math.abs(n.value) >= 10 || !Number.isInteger(n.value);
}

/* The sentence around a number, short, so the staff can find it. */
function near(text, at, length) {
  const start = Math.max(0, text.lastIndexOf("\n", at) + 1, at - 50);
  const endLine = text.indexOf("\n", at);
  const end = Math.min(endLine === -1 ? text.length : endLine, at + length + 40);
  return `${start > 0 && text[start - 1] !== "\n" ? "…" : ""}${text.slice(start, end).replace(/[|*#>]/g, " ").replace(/\s+/g, " ").trim()}${end < (endLine === -1 ? text.length : endLine) ? "…" : ""}`;
}

export function numbersNotInSources(markdown, allowedText, { limit = 10 } = {}) {
  /* Total rows and figure lines are not the model's claims to check. */
  const text = String(markdown ?? "")
    .split("\n")
    .map((line) => (/^\s*\|\s*\**\s*total\b/i.test(line) ? "" : line))
    .join("\n");

  const allowed = numbersIn(allowedText);
  const known = new Set();
  for (const n of allowed) {
    known.add(Math.round(n.value * 1e6) / 1e6);
    /* 12.5% is also written 0.125 somewhere, and 0.125 is also 12.5%. */
    if (n.percent) known.add(Math.round((n.value / 100) * 1e6) / 1e6);
    else known.add(Math.round(n.value * 100 * 1e6) / 1e6);
  }

  const seen = new Set();
  const unfound = [];
  for (const n of numbersIn(text)) {
    if (!worthChecking(n)) continue;
    const key = Math.round(n.value * 1e6) / 1e6;
    if (known.has(key) || seen.has(key)) continue;
    seen.add(key);
    unfound.push({ number: n.raw, near: near(text, n.at, n.raw.length) });
  }
  return { unfound: unfound.slice(0, limit), more: Math.max(0, unfound.length - limit) };
}

/* The lines the "Worth checking" card shows for the numbers. */
export function numberFindings({ unfound, more }) {
  if (!unfound.length) return [];
  const lines = unfound.map((u) => `${u.number} is not in your sources or this chat: "${u.near}"`);
  if (more) lines.push(`And ${more} more number${more === 1 ? "" : "s"} like these.`);
  return [
    "These numbers could not be found in what this was built from. They may be worked out from it; check them before it goes out.",
    ...lines,
  ];
}
