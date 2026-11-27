/* ==========================================================================
   RECEIPTS, INVOICES AND STATEMENTS ON THE PRINTED PAGE

   What this is: the parts of a money document, drawn the way Anthony's
   RHEMA receipts are (2026-11-27):
     the page head     a colour stripe across the top, the brand on the
                       left, the kind, the number and the date on the right
     amount            a deep panel with the big figure, the figure in
                       words and a status badge ("Payment confirmed")
     details           labels in small coloured capitals over their
                       values, in two columns
     progress          a card with a big percentage and a bar
     summary           label and amount rows, the lit row (the balance)
                       on a warm tint
     signature         a line, the name, and who they sign for
   and in any table, a cell that says a status ("Paid in full", "Part
   paid", "Pending", "Overdue") becomes a coloured badge.

   What it must never do: change a figure. Every value is printed exactly
   as the document wrote it.
   ========================================================================== */

import { esc, runsHtml } from "./htmlDiagrams.js";

/* --------------------------------------------------------------------------
   1. The parts
   -------------------------------------------------------------------------- */

export function amountHtml(block) {
  return `<div class="amount">
  <div>
    ${block.label ? `<div class="amount-label">${esc(block.label)}</div>` : ""}
    <div class="amount-value">${esc(block.value)}</div>
    ${block.words ? `<div class="amount-words">${esc(block.words)}</div>` : ""}
  </div>
  ${block.status ? `<div class="amount-status"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(block.status)}</div>` : ""}
</div>`;
}

export function detailsHtml(block) {
  return `<div class="details">${block.rows.map((r) => `<div class="detail${plainLength(r) > 60 ? " wide" : ""}">
    ${r.label ? `<div class="detail-label">${esc(r.label)}</div>` : ""}
    <div class="detail-value">${runsHtml(r.runs)}</div>
  </div>`).join("")}</div>`;
}

function plainLength(row) {
  return (row.runs ?? []).reduce((n, r) => n + (r.text?.length ?? 0), 0);
}

export function progressHtml(block) {
  return `<div class="progress">
  <div class="progress-head"><span class="progress-value">${block.percent}%</span> <span class="progress-label">${esc(block.label)}</span></div>
  <div class="progress-bar"><div style="width:${block.percent}%"></div></div>
  ${block.note ? `<div class="progress-note">${esc(block.note)}</div>` : ""}
</div>`;
}

export function summaryHtml(block) {
  return `<div class="summary">${block.rows.map((r) => `<div class="summary-row${r.lit ? " lit" : ""}"><span>${esc(r.label)}</span><span>${runsHtml(r.runs)}</span></div>`).join("")}</div>`;
}

export function signatureHtml(block) {
  return `<div class="signature"><div class="signature-line"></div><div class="signature-name">${esc(block.name)}</div>${block.role ? `<div class="signature-role">${esc(block.role)}</div>` : ""}</div>`;
}

/* A progress card and a summary written one after the other sit side by
   side, as on the receipt. */
export function pairHtml(left, right) {
  return `<div class="pair">${left}${right}</div>`;
}

/* --------------------------------------------------------------------------
   2. Status badges in tables
   -------------------------------------------------------------------------- */

const STATUS = [
  [/^(paid( in full)?|complete[d]?|done|received|approved|confirmed)$/i, "good"],
  [/^(part[ -]?paid|partly paid|in progress|partial|due soon)$/i, "warn"],
  [/^(pending|not started|due|scheduled|awaiting)$/i, "quiet"],
  [/^(overdue|failed|unpaid|declined|cancelled)$/i, "bad"],
];

export function statusBadge(text) {
  const t = String(text ?? "").trim();
  const hit = STATUS.find(([re]) => re.test(t));
  return hit ? `<span class="badge ${hit[1]}">${esc(t)}</span>` : null;
}

/* --------------------------------------------------------------------------
   3. The page head
   -------------------------------------------------------------------------- */

export function formHeadHtml(doc, t, brand, kind, dateText, brandMark) {
  const stripe = t.palette.slice(0, 6).map((c) => `<span style="flex:1;background:#${c}"></span>`).join("");
  return `<div class="form-stripe">${stripe}</div>
<div class="form-head">
  <div>${brandMark}</div>
  <div class="form-head-right">
    ${kind ? `<div class="kicker">${esc(kind)}</div>` : ""}
    <div class="form-title">${esc(doc.title)}</div>
    <div class="form-date">Issued: <strong>${esc(dateText)}</strong></div>
  </div>
</div>`;
}

/* --------------------------------------------------------------------------
   4. The styling these need
   -------------------------------------------------------------------------- */

export function formCss(t) {
  const c = (hex) => `#${hex}`;
  return `
.form-block { margin-bottom: 4pt; }
.form-section { margin: 6pt 0 6pt; }
.form-stripe { display: flex; height: 5pt; margin: 0 -16mm 14pt; }
.form-head { padding-top: 2mm; }
.form-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14pt; }
.form-head-right { text-align: right; }
.form-title { font-size: 17pt; font-weight: 700; color: ${c(t.deep)}; line-height: 1.15; }
.form-date { font-size: 8.4pt; color: ${c(t.muted)}; margin-top: 2pt; }
.form-date strong { color: ${c(t.ink)}; }

.amount { display: flex; justify-content: space-between; align-items: center; gap: 12pt; background: ${c(t.deep)}; color: #fff; border-radius: 8pt; padding: 14pt 18pt; margin: 0 0 14pt; break-inside: avoid; }
.amount-label { font-size: 7.4pt; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.8; }
.amount-value { font-size: 24pt; font-weight: 700; line-height: 1.15; margin: 2pt 0; }
.amount-words { font-size: 8.6pt; opacity: 0.85; }
.amount-status { flex: none; display: flex; align-items: center; gap: 5pt; background: #12B886; color: #fff; border-radius: 20pt; padding: 5pt 12pt; font-size: 7.6pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.amount-status svg { width: 10pt; height: 10pt; }

.details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18pt; row-gap: 6pt; margin: 2pt 0 12pt; }
.detail.wide { grid-column: 1 / -1; }
.detail-label { font-size: 7pt; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: ${c(t.kicker)}; }
.detail-value { font-size: 9.6pt; color: ${c(t.ink)}; word-break: break-word; }

.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin: 2pt 0 14pt; break-inside: avoid; }
.pair > * { margin: 0 !important; }
.progress { border: 0.8pt solid ${c(t.tintLine)}; background: ${c(t.tint)}; border-radius: 8pt; padding: 12pt 14pt; break-inside: avoid; margin: 0 0 14pt; }
.progress-value { font-size: 22pt; font-weight: 700; color: ${c(t.accent)}; }
.progress-label { font-size: 9pt; color: ${c(t.body)}; }
.progress-bar { height: 6pt; border-radius: 4pt; background: ${c(t.tintLine)}; margin: 6pt 0 6pt; overflow: hidden; }
.progress-bar div { height: 100%; border-radius: 4pt; background: linear-gradient(90deg, ${c(t.accent)}, ${c(t.palette[1] ?? t.accent)}); }
.progress-note { font-size: 8pt; color: ${c(t.muted)}; }

.summary { border: 0.8pt solid ${c(t.rule)}; border-radius: 8pt; overflow: hidden; break-inside: avoid; margin: 0 0 14pt; }
.summary-row { display: flex; justify-content: space-between; gap: 10pt; padding: 6pt 12pt; border-bottom: 0.6pt solid ${c(t.rule)}; font-size: 9pt; }
.summary-row:last-child { border-bottom: none; }
.summary-row span:last-child { font-weight: 600; color: ${c(t.ink)}; text-align: right; font-variant-numeric: tabular-nums; }
.summary-row.lit { background: #FFF6E5; font-weight: 700; color: ${c(t.ink)}; font-size: 10pt; }

.badge { display: inline-block; border-radius: 10pt; padding: 1.5pt 8pt; font-size: 7.4pt; font-weight: 700; }
.badge.good { background: #DDF5EA; color: #0B7A4B; }
.badge.warn { background: #FFF0CC; color: #9A6200; }
.badge.quiet { background: #EDEFF3; color: #5B6272; }
.badge.bad { background: #FDE2E2; color: #B42318; }

.signature { width: 48%; margin-top: 18pt; break-inside: avoid; }
.signature-line { border-top: 0.9pt solid ${c(t.ink)}; margin-bottom: 5pt; }
.signature-name { font-weight: 700; color: ${c(t.ink)}; }
.signature-role { font-size: 8.4pt; color: ${c(t.muted)}; }
`;
}
