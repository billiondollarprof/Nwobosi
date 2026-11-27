/* ==========================================================================
   DIAGRAMS ON THE PRINTED PAGE

   What this is: the designed shapes a document can carry, as HTML and SVG
   (web page shapes and vector drawings that stay sharp at any size), in
   the company's colours:
     flow     boxes in a row joined by arrows, one lit
     hub      one box with everything it does fanned out beside it
     tree     an org chart: a top box, a rail, a box for each child
     phases   a timeline in weeks (a Gantt chart) with a table of what each
              phase delivers, or numbered phase rows when no weeks are given

   Why. Anthony, 2026-11-27: "when it needs diagrams, charts, it can easily
   sketch good charts, slick and modern diagrams, use SVG icons to depict
   things, arrange things properly, boxes properly." The RHEMA proposal's
   system map and its implementation timeline are the standard.

   What it must never do: lose a word. Every item in the block appears in
   the drawing, or beside it.

   READ TOP TO BOTTOM
     1. Small helpers
     2. Flow
     3. Hub
     4. Tree
     5. Phases: the Gantt timeline, or phase rows
     6. The styling these need
   ========================================================================== */

import { iconSvg } from "../slides/slideIcons.js";

/* --------------------------------------------------------------------------
   1. Small helpers
   -------------------------------------------------------------------------- */

export function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Text runs (bold, italic, line breaks) as HTML. */
export function runsHtml(runs) {
  return (runs ?? []).map((r) => {
    if (r.br) return "<br>";
    let s = esc(r.text);
    if (r.italic) s = `<em>${s}</em>`;
    if (r.bold) s = `<strong>${s}</strong>`;
    return s;
  }).join("");
}

function plain(runs) {
  return (runs ?? []).map((r) => (r.br ? " " : r.text)).join("").trim();
}

/* An item's own text: list items as one line each, paragraphs as they are. */
function itemLines(blocks) {
  const out = [];
  for (const b of blocks ?? []) {
    if (b.type === "list") b.items.forEach((it) => out.push(it.runs));
    else if (b.runs) out.push(b.runs);
  }
  return out;
}

export function iconHtml(name, color) {
  const svg = name ? iconSvg(name, color) : null;
  return svg ?? "";
}

/* --------------------------------------------------------------------------
   2. Flow
   -------------------------------------------------------------------------- */

export function flowHtml(block) {
  const parts = [];
  block.steps.forEach((step, i) => {
    if (i) parts.push('<div class="flow-arrow"><svg viewBox="0 0 24 12"><path d="M0 6h20M15 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></div>');
    parts.push(`<div class="flow-box${step.lit ? " lit" : ""}">${runsHtml(step.runs)}</div>`);
  });
  return `<div class="flow">${parts.join("")}</div>`;
}

/* --------------------------------------------------------------------------
   3. Hub
   -------------------------------------------------------------------------- */

export function hubHtml(block) {
  const items = block.items.map((it) => `<li>${runsHtml(it.runs)}</li>`).join("");
  return `<div class="hub">
  <div class="hub-centre"><div class="hub-name">${runsHtml(block.centre)}</div>${block.caption ? `<div class="hub-caption">${esc(block.caption)}</div>` : ""}</div>
  <div class="hub-fan"><svg viewBox="0 0 40 100" preserveAspectRatio="none">${block.items.map((_, i, all) => {
    const y = ((i + 0.5) / all.length) * 100;
    return `<path d="M0 50 C 22 50, 18 ${y}, 40 ${y}" fill="none" stroke="currentColor" stroke-width="0.9" vector-effect="non-scaling-stroke"/>`;
  }).join("")}</svg></div>
  <ul class="hub-list">${items}</ul>
</div>`;
}

/* --------------------------------------------------------------------------
   4. Tree
   -------------------------------------------------------------------------- */

export function treeHtml(block) {
  const children = block.items.map((item) => {
    const lines = itemLines(item.blocks);
    return `<div class="tree-child">
    <div class="tree-name">${runsHtml(item.title)}</div>
    ${item.kicker ? `<div class="tree-role">${esc(item.kicker)}</div>` : ""}
    ${lines.length ? `<ul>${lines.map((l) => `<li>${runsHtml(l)}</li>`).join("")}</ul>` : ""}
  </div>`;
  }).join("");
  return `<div class="tree">
  <div class="tree-top"><div class="tree-name">${runsHtml(block.top)}</div>${block.topCaption ? `<div class="tree-role">${esc(block.topCaption)}</div>` : ""}</div>
  <div class="tree-stem"></div>
  <div class="tree-row" style="--n:${block.items.length}">${children}</div>
</div>`;
}

/* --------------------------------------------------------------------------
   5. Phases
   A phase's kicker says its time: "Week 1", "Weeks 2 to 3", "3 to 4 weeks",
   "2 weeks". When every phase has one, they are laid on a week grid.
   -------------------------------------------------------------------------- */

const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const num = (w) => (/^\d+$/.test(w) ? Number(w) : NUM[String(w).toLowerCase()] ?? null);

/* Weeks for one phase: { from, to } on the grid, or { span } to follow on. */
export function phaseWeeks(kicker) {
  const k = String(kicker ?? "").toLowerCase().replace(/[–-]/g, " to ");
  let m = k.match(/weeks?\s+(\w+)(?:\s+(?:to|and)\s+(\w+))?/);
  if (m && num(m[1])) return { from: num(m[1]), to: num(m[2] ?? m[1]) ?? num(m[1]) };
  m = k.match(/(\w+)(?:\s+to\s+(\w+))?\s+weeks?/);
  if (m && num(m[1])) return { span: num(m[2] ?? m[1]) ?? num(m[1]) };
  m = k.match(/months?\s+(\w+)/);
  if (m && num(m[1])) return { from: (num(m[1]) - 1) * 4 + 1, to: num(m[1]) * 4 };
  return null;
}

function ganttBars(items) {
  let end = 0;
  const bars = [];
  for (const item of items) {
    const w = phaseWeeks(item.kicker);
    if (!w) return null;
    const from = w.from ?? end + 1;
    const to = w.to ?? from + w.span - 1;
    bars.push({ from, to });
    end = Math.max(end, to);
  }
  return end >= 2 && end <= 52 ? { bars, weeks: end } : null;
}

export function phasesHtml(block, palette) {
  const gantt = ganttBars(block.items);
  const rows = block.items.map((item, i) => {
    const lines = itemLines(item.blocks.filter((b) => !(b.type === "p" && /^outcome\s*:/i.test(plain(b.runs)))));
    return `<tr>
      <td><div class="phase-name">${i + 1}. ${runsHtml(item.title)}</div>${item.kicker ? `<div class="phase-time">${esc(item.kicker)}</div>` : ""}</td>
      <td>${lines.map((l) => runsHtml(l)).join("<br>")}</td>
      ${block.items.some((it) => it.outcome) ? `<td class="phase-outcome">${esc(item.outcome ?? "")}</td>` : ""}
    </tr>`;
  }).join("");
  const hasOutcome = block.items.some((it) => it.outcome);
  const table = `<table class="data phase-table"><thead><tr><th>Phase</th><th>What is delivered</th>${hasOutcome ? "<th>Milestone</th>" : ""}</tr></thead><tbody>${rows}</tbody></table>`;
  if (!gantt) return table;

  /* The grid: one column per week, a bar per phase in its own colour. */
  const cols = gantt.weeks;
  const header = Array.from({ length: cols }, (_, i) => `<div class="g-week">W${i + 1}</div>`).join("");
  const lines = block.items.map((item, i) => {
    const { from, to } = gantt.bars[i];
    const colour = `#${palette[i % palette.length]}`;
    return `<div class="g-label">${i + 1}. ${esc(plain(item.title))}</div>
    <div class="g-track" style="grid-template-columns: repeat(${cols}, 1fr)"><div class="g-bar" style="grid-column: ${from} / ${to + 1}; background:${colour}">${esc(item.kicker ?? "")}</div></div>`;
  }).join("");
  return `<div class="gantt" style="--cols:${cols}">
    <div class="g-label"></div><div class="g-head" style="grid-template-columns: repeat(${cols}, 1fr)">${header}</div>
    ${lines}
  </div>${table}`;
}

/* --------------------------------------------------------------------------
   6. The styling these need
   -------------------------------------------------------------------------- */

export function diagramCss(t) {
  const c = (hex) => `#${hex}`;
  return `
.flow { display: flex; align-items: stretch; margin: 8pt 0 14pt; break-inside: avoid; }
.flow-box { flex: 1; border: 0.8pt solid ${c(t.tintLine)}; border-radius: 6pt; padding: 9pt 6pt; text-align: center; font-size: 8.4pt; font-weight: 600; color: ${c(t.deep)}; background: #fff; display: flex; align-items: center; justify-content: center; line-height: 1.3; }
.flow-box.lit { background: ${c(t.accent)}; border-color: ${c(t.accent)}; color: #fff; }
.flow-box.lit strong { color: #fff; }
.flow-arrow { flex: none; width: 18pt; display: flex; align-items: center; justify-content: center; color: ${c(t.tintLine)}; }
.flow-arrow svg { width: 14pt; height: 8pt; }

.hub { display: flex; align-items: center; margin: 8pt 0 14pt; break-inside: avoid; }
.hub-centre { flex: none; width: 34%; background: ${c(t.deep)}; color: #fff; border-radius: 8pt; padding: 14pt 12pt; text-align: center; }
.hub-name { font-size: 13pt; font-weight: 700; letter-spacing: 0.02em; }
.hub-name strong { color: #fff; }
.hub-caption { font-size: 8pt; opacity: 0.85; margin-top: 3pt; }
.hub-fan { flex: none; width: 34pt; align-self: stretch; color: ${c(t.tintLine)}; }
.hub-fan svg { width: 100%; height: 100%; display: block; }
.hub-list { flex: 1; list-style: none; margin: 0; padding: 4pt 0; border: 0.8pt solid ${c(t.tintLine)}; border-radius: 8pt; background: ${c(t.tint)}; }
.hub-list li { padding: 3.4pt 11pt; font-size: 8.8pt; border-bottom: 0.5pt solid ${c(t.tintLine)}; }
.hub-list li:last-child { border-bottom: none; }

.tree { margin: 8pt 0 14pt; break-inside: avoid; text-align: center; }
.tree-top { display: inline-block; min-width: 40%; background: ${c(t.deep)}; color: #fff; border-radius: 7pt; padding: 9pt 16pt; }
.tree-top .tree-name { color: #fff; }
.tree-top .tree-role { color: #fff; opacity: 0.85; }
.tree-stem { width: 1pt; height: 12pt; background: ${c(t.tintLine)}; margin: 0 auto; }
.tree-row { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 8pt; position: relative; padding-top: 12pt; text-align: left; }
.tree-row::before { content: ""; position: absolute; top: 0; left: calc(50% / var(--n)); right: calc(50% / var(--n)); height: 1pt; background: ${c(t.tintLine)}; }
.tree-child { position: relative; border: 0.8pt solid ${c(t.tintLine)}; border-top: 2.4pt solid ${c(t.accent)}; border-radius: 6pt; padding: 8pt 10pt; background: #fff; }
.tree-child::before { content: ""; position: absolute; top: -13pt; left: 50%; width: 1pt; height: 11pt; background: ${c(t.tintLine)}; }
.tree-name { font-weight: 700; font-size: 9.6pt; color: ${c(t.deep)}; text-align: center; }
.tree-role { font-size: 7.8pt; color: ${c(t.muted)}; text-align: center; }
.tree-child ul { margin: 6pt 0 0; padding-left: 12pt; font-size: 8.4pt; }

.gantt { display: grid; grid-template-columns: 30% 1fr; row-gap: 5pt; column-gap: 8pt; margin: 8pt 0 10pt; align-items: center; break-inside: avoid; font-size: 8pt; }
.g-head, .g-track { display: grid; }
.g-week { text-align: center; color: ${c(t.muted)}; font-size: 7pt; font-weight: 600; border-left: 0.5pt dashed ${c(t.rule)}; }
.g-track { background: repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / var(--cols) - 0.5pt), ${c(t.rule)} calc(100% / var(--cols) - 0.5pt), ${c(t.rule)} calc(100% / var(--cols))); border-radius: 4pt; height: 16pt; }
.g-bar { border-radius: 4pt; color: #fff; font-size: 7pt; font-weight: 600; display: flex; align-items: center; padding: 0 6pt; white-space: nowrap; overflow: hidden; }
.g-label { font-weight: 600; color: ${c(t.ink)}; }
.phase-name { font-weight: 600; color: ${c(t.ink)}; }
.phase-time { font-size: 7.6pt; color: ${c(t.accent)}; font-weight: 600; }
.phase-table td:first-child { width: 28%; }
.phase-outcome { width: 24%; font-weight: 600; color: ${c(t.deep)}; }
`;
}
