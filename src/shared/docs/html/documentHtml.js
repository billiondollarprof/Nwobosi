/* ==========================================================================
   THE DOCUMENT AS A PRINTED WEB PAGE (THE HTML ENGINE)

   What this is: turns the one reading of a document (documentModel.js) into
   the HTML (web page code) that Chromium prints to PDF: a cover page, the
   body pages, and the running header and footer Chromium prints on each
   body page.

   Why. Anthony, 2026-11-27: the documents he makes with Claude are HTML
   printed by Chromium, and they are clean, well aligned and designed. The
   old PDF writer (pdf.js, pdfmake) cannot lay a page out like that. This
   engine makes the same kind of page, in the company's colours, from the
   same document every other writer reads. pdf.js stays as the fallback
   when the printer is not there (printPdf.js).

   THE TWO SHAPES
     long   a proposal, a report, a plan: a cover page, then the body pages
            with "Page x of y" counted from the first body page, as in his
            RHEMA and DREEF proposals. Main sections start on a new page
            when the one before filled most of a page.
     short  a one or two pager, or anything short: no cover. The title sits
            in a band at the top of page one.

   What it must never do:
     - Print the notes to the person. documentModel.js already took them out.
     - Invent a fact for the cover. "Prepared for" and "Contact" show only
       when the document or the company gave them.
     - Lose a word: every block of the document reaches the page.

   READ TOP TO BOTTOM
     1. Measuring and choosing the shape
     2. One block as HTML
     3. The sections, numbering and contents
     4. The cover, the title band, the running header and footer
     5. The whole thing
   ========================================================================== */

import { plainText, plainForm, blockText, figureCaption } from "../documentModel.js";
import { imageKey } from "../imageKey.js";
import { chartSvg } from "../charts/chartSvg.js";
import { qrCardText, shortLinkText } from "../references.js";
import { styleTokens, documentCss } from "./documentStyle.js";
import { esc, runsHtml, iconHtml, flowHtml, hubHtml, treeHtml, phasesHtml, diagramCss } from "./htmlDiagrams.js";

/* --------------------------------------------------------------------------
   1. Measuring and choosing the shape
   -------------------------------------------------------------------------- */

const WORDS_PER_PAGE = 420;

function wordsIn(blocks) {
  return blocks.reduce((n, b) => n + blockText(b).split(/\s+/).filter(Boolean).length, 0);
}

/* A block that takes the room of many words on a page. */
function weightOf(block) {
  if (["cards", "steps", "stat", "table", "chart", "image", "flow", "hub"].includes(block.type)) return 110;
  return 0;
}

export function shapeOf(doc, { pages = 0 } = {}) {
  const sections = doc.blocks.filter((b) => b.type === "h").length;
  const words = wordsIn(doc.blocks) + doc.blocks.reduce((n, b) => n + weightOf(b), 0);
  if (pages >= 1 && pages <= 2) return "short";
  return words > WORDS_PER_PAGE * 2.2 || sections >= 5 ? "long" : "short";
}

/* What kind of document the title says it is, for the small label on the
   cover. Only words the title itself uses. */
function kindLabel(title) {
  const t = String(title ?? "").toLowerCase();
  for (const [word, label] of [["proposal", "Proposal"], ["quotation", "Quotation"], ["quote", "Quotation"], ["report", "Report"], ["plan", "Plan"], ["strategy", "Strategy"], ["policy", "Policy"], ["guide", "Guide"], ["handbook", "Handbook"], ["summary", "Summary"], ["brief", "Brief"], ["agreement", "Agreement"], ["invoice", "Invoice"], ["receipt", "Receipt"]]) {
    if (new RegExp(`\\b${word}`).test(t)) return label;
  }
  return "";
}

/* --------------------------------------------------------------------------
   2. One block as HTML
   -------------------------------------------------------------------------- */

const NUMERIC = /^[₦$€£¥]?\s?-?[\d,]+(\.\d+)?\s?%?$/;

function tableHtml(block) {
  const isNum = block.header.map((_, i) => block.rows.length > 0 &&
    block.rows.every((r) => NUMERIC.test(plainText(r[i] ?? []).trim()) || !plainText(r[i] ?? []).trim()));
  const head = block.header.map((cell, i) => `<th${isNum[i] ? ' class="num"' : ""}>${runsHtml(cell)}</th>`).join("");
  const rows = block.rows.map((row) => {
    const total = /^total/i.test(plainText(row[0] ?? []).trim());
    return `<tr${total ? ' class="total"' : ""}>${row.map((cell, i) => `<td${isNum[i] ? ' class="num"' : ""}>${runsHtml(cell)}</td>`).join("")}</tr>`;
  }).join("");
  return `<table class="data"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function innerHtml(blocks, t) {
  return blocks.map((b) => blockHtml(b, t)).join("");
}

/* A card whose title is a figure ("13 modules", "20%", "₦5,000") shows it
   big and in its colour, as the stat cards in his RHEMA proposal do. */
const FIGURE = /^[₦$€£¥]?\s?[\d][\d,.]*\s?(%|[A-Za-z]{1,10})?(\s[A-Za-z]{1,10})?$/;

function cardsHtml(block, t, numbered) {
  const n = block.items.length;
  const cols = n === 4 ? 4 : n % 3 === 0 || n > 4 ? 3 : n;
  const cards = block.items.map((item, i) => {
    const colour = t.palette[i % t.palette.length];
    const icon = item.icon ? iconHtml(item.icon, colour) : "";
    return `<div class="card" style="border-top-color:#${colour}">
      ${icon ? `<div class="icon" style="background:#${colour}1F">${icon}</div>` : ""}
      <div class="card-title${FIGURE.test(plainText(item.title).trim()) ? " card-figure" : ""}"${FIGURE.test(plainText(item.title).trim()) ? ` style="color:#${colour}"` : ""}>${numbered ? `${(block.start ?? 0) + i + 1}. ` : ""}${runsHtml(item.title)}</div>
      ${item.kicker ? `<div class="card-kicker" style="color:#${colour}">${esc(item.kicker)}</div>` : ""}
      <div class="card-body">${innerHtml(item.blocks, t)}</div>
    </div>`;
  }).join("");
  return `<div class="cards" style="grid-template-columns: repeat(${cols}, 1fr)">${cards}</div>`;
}

function stepsHtml(block, t) {
  return `<div class="steps">${block.items.map((item, i) => `
    <div class="step">
      <div class="rail"><div class="dot">${i + 1}</div>${i < block.items.length - 1 ? '<div class="line"></div>' : ""}</div>
      <div class="content"><span class="step-title">${runsHtml(item.title)}</span>${item.kicker ? `<span class="step-kicker">${esc(item.kicker)}</span>` : ""}
      ${innerHtml(item.blocks, t)}</div>
    </div>`).join("")}</div>`;
}

function figureHtml(block, inner) {
  const caption = figureCaption(block);
  const under = caption || block.source
    ? `<figcaption>${esc(caption)}${block.source ? `<span class="source">${esc(block.source)}</span>` : ""}</figcaption>`
    : "";
  return `<figure>${inner}${under}</figure>`;
}

function blockHtml(block, t, ctx = {}) {
  switch (block.type) {
    /* The org chart draws its own top box; that line is for the PDF. */
    case "p": return block.treeTop ? "" : `<p>${runsHtml(block.runs)}</p>`;
    case "h": return block.level <= 3 ? `<h3>${runsHtml(block.runs)}</h3>` : `<h4>${runsHtml(block.runs)}</h4>`;
    case "label": return `<div class="kicker">${esc(block.text)}</div>`;
    case "list":
      return block.ordered
        ? `<ol class="numbered" start="${block.start ?? 1}">${block.items.map((i) => `<li>${runsHtml(i.runs)}</li>`).join("")}</ol>`
        : `<ul class="dots">${block.items.map((i) => `<li>${runsHtml(i.runs)}</li>`).join("")}</ul>`;
    case "quote": return `<blockquote>${runsHtml(block.runs)}</blockquote>`;
    case "table": return tableHtml(block);
    case "cards": return block.variant === "tree" ? treeHtml(block) : cardsHtml(block, t, false);
    case "steps": return block.variant === "phases" ? phasesHtml(block, t.palette) : stepsHtml(block, t);
    case "stat":
      return `<div class="stat"><div class="figure"><div class="value">${esc(block.value)}</div>${block.caption ? `<div class="caption">${esc(block.caption)}</div>` : ""}</div><div class="story">${innerHtml(block.blocks, t)}</div></div>`;
    case "takeaway":
      return block.variant === "statement"
        ? `<div class="statement">${runsHtml(block.runs)}</div>`
        : `<div class="note"><p>${runsHtml(block.runs)}</p></div>`;
    case "flow": return flowHtml(block);
    case "hub": return hubHtml(block);
    case "image": {
      const found = ctx.images?.get(imageKey(block.name));
      const inner = found
        ? `<img src="${found.dataUrl}" alt="${esc(block.caption || block.name)}">`
        : `<div class="note"><p>Picture to add here: ${esc(block.name)}</p></div>`;
      return figureHtml(block, inner);
    }
    case "chart": {
      const svg = block.data && !block.data.problem ? chartSvg(block.data, ctx.theme, { font: `${t.font}, Arial, sans-serif` }) : "";
      if (!svg) return block.table ? tableHtml(block.table) : "";
      return figureHtml(block, svg);
    }
    case "references":
      return `<h3>References</h3><ol class="refs">${block.items.map((r) => `<li>${r.url ? `<a href="${esc(r.url)}">${esc(r.text)}</a>` : esc(r.text)}</li>`).join("")}</ol>`;
    case "sourcesqr": {
      const words = qrCardText(block.count);
      return `<div class="qr-card">${ctx.qr?.get(block.url) ?? ""}<div><strong>${esc(words.title)}</strong><br>${esc(words.line)}<br><a href="${esc(block.url)}">${esc(shortLinkText(block.url))}</a></div></div>`;
    }
    default:
      return block.runs ? `<p>${runsHtml(block.runs)}</p>` : "";
  }
}

/* --------------------------------------------------------------------------
   3. The sections, numbering and contents
   -------------------------------------------------------------------------- */

const OPENING = /\b(glance|summary|overview|introduction|at a glance|about this)\b/i;

function sectionsOf(blocks) {
  const levels = blocks.filter((b) => b.type === "h").map((b) => b.level);
  const top = levels.length ? Math.min(...levels) : null;
  const sections = [];
  let current = { heading: null, blocks: [] };
  for (const b of blocks) {
    if (b.type === "h" && b.level === top) {
      if (current.heading || current.blocks.length) sections.push(current);
      current = { heading: b, blocks: [] };
    } else current.blocks.push(b);
  }
  if (current.heading || current.blocks.length) sections.push(current);
  return sections;
}

function sectionWords(section) {
  return wordsIn(section.blocks) + section.blocks.reduce((n, b) => n + weightOf(b), 0);
}

function bodyHtml(doc, t, ctx, shape) {
  const sections = sectionsOf(doc.blocks.flatMap((b) => (["flow", "hub"].includes(b.type) ? [b] : plainForm(b))));
  const titled = sections.filter((s) => s.heading);
  /* Numbered as in his proposals ("1. Project blueprint") when it is a long
     document with four or more sections; an opening overview is not
     numbered. */
  const numbered = shape === "long" && titled.length >= 4;
  let n = 0;
  const numbers = new Map();
  titled.forEach((s, i) => {
    if (numbered && !(i === 0 && OPENING.test(plainText(s.heading.runs)))) numbers.set(s, ++n);
  });

  /* A contents list in a long document, after the opening section. */
  const contents = shape === "long" && titled.length >= 4
    ? `<h3>What this document contains</h3><div class="contents">${titled.filter((s) => numbers.has(s)).map((s) => `<div class="row"><span class="n">${numbers.get(s)}</span><span>${esc(plainText(s.heading.runs))}</span></div>`).join("")}</div>`
    : "";

  /* The contents go after an opening overview, or at the very start. */
  const openingFirst = sections[0] && (!sections[0].heading || OPENING.test(plainText(sections[0].heading.runs)));
  let previousWords = 0;
  return (contents && !openingFirst ? `<section class="section">${contents}</section>` : "") + sections.map((s, i) => {
    const newPage = shape === "long" && i > 0 && previousWords > WORDS_PER_PAGE * 0.55;
    previousWords = sectionWords(s);
    const head = s.heading
      ? `${s.heading.label ? `<div class="kicker">${esc(s.heading.label)}</div>` : ""}<h2>${numbers.has(s) ? `${numbers.get(s)}. ` : ""}${runsHtml(s.heading.runs)}</h2><div class="title-rule"></div>`
      : "";
    const body = s.blocks.map((b) => blockHtml(b, t, ctx)).join("");
    const withContents = contents && openingFirst && i === 0 ? body + contents : body;
    return `<section class="section${newPage ? " new-page" : ""}">${head}${withContents}</section>`;
  }).join("");
}

/* --------------------------------------------------------------------------
   4. The cover, the title band, the running header and footer
   -------------------------------------------------------------------------- */

function brandMark(brand, t, size = 26) {
  if (brand?.logoData) return `<img src="${brand.logoData}" style="height:${size}pt;max-width:${size * 5}pt;object-fit:contain" alt="">`;
  const name = esc(brand?.name ?? "");
  return `<div style="display:flex;align-items:center;gap:7pt"><div style="width:${size * 0.8}pt;height:${size * 0.8}pt;border-radius:50%;border:${size * 0.12}pt solid #${t.accent};box-sizing:border-box"></div><div style="font-weight:700;letter-spacing:0.18em;font-size:${size * 0.42}pt;color:#${t.deep};text-transform:uppercase">${name}</div></div>`;
}

function stripe(t, width = "64pt") {
  const parts = t.palette.slice(0, 4).map((c) => `<span style="flex:1;background:#${c}"></span>`).join("");
  return `<div style="display:flex;width:${width};height:3pt;border-radius:2pt;overflow:hidden;margin:12pt 0 14pt">${parts}</div>`;
}

function dateText(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function coverHtml(doc, t, brand, date) {
  const kind = kindLabel(doc.title);
  const meta = [
    doc.meta?.for ? ["Prepared for", doc.meta.for] : null,
    brand?.name ? ["Prepared by", brand.name] : null,
    ["Date", dateText(date)],
    brand?.contact ? ["Contact", brand.contact] : null,
  ].filter(Boolean);
  return `<div class="cover" style="width:210mm;height:296mm;position:relative;overflow:hidden;background:radial-gradient(120% 70% at 0% 0%, #${t.tint} 0%, #FFFFFF 60%);">
  <div style="position:absolute;left:18mm;top:20mm">${brandMark(brand, t, 30)}</div>
  <div style="position:absolute;left:18mm;right:24mm;top:78mm">
    ${kind ? `<div class="kicker" style="font-size:8.5pt">${esc(kind)}</div>` : ""}
    <h1 style="font-size:34pt;font-weight:700;line-height:1.08;color:#${t.deep};max-width:150mm">${esc(doc.title)}</h1>
    ${stripe(t, "90pt")}
    ${doc.subtitle ? `<p style="font-size:11.5pt;max-width:140mm;color:#${t.body}">${esc(doc.subtitle)}</p>` : ""}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:46mm;border-top:2pt solid #${t.kicker};background:#FFFFFF">
    <div style="display:grid;grid-template-columns:repeat(${meta.length},1fr);gap:10pt;padding:9mm 18mm 0">
      ${meta.map(([k, v]) => `<div><div class="kicker" style="font-size:7pt">${esc(k)}</div><div style="font-weight:600;color:#${t.ink};font-size:9.5pt">${esc(v)}</div></div>`).join("")}
    </div>
  </div>
</div>`;
}

function titleBandHtml(doc, t, brand) {
  const kind = kindLabel(doc.title);
  return `<div style="margin:0 0 14pt">
  ${kind ? `<div class="kicker">${esc(kind)}</div>` : ""}
  <h1 style="font-size:22pt;font-weight:700;color:#${t.deep};line-height:1.15">${esc(doc.title)}</h1>
  ${stripe(t)}
  ${doc.subtitle ? `<p class="lead" style="margin-top:-4pt">${esc(doc.subtitle)}</p>` : ""}
</div>`;
}

/* Chromium prints these in the top and bottom margin of every body page.
   They cannot use the page's own styles, so everything is inline, and the
   page number goes in the elements Chromium fills (pageNumber, totalPages). */
export function headerHtml(doc, t, brand) {
  const mark = brand?.logoData
    ? `<img src="${brand.logoData}" style="height:14px;max-width:90px;object-fit:contain">`
    : `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;border:2px solid #${t.accent};box-sizing:border-box;vertical-align:-2px"></span>`;
  return `<div style="width:100%;margin:0 16mm;padding-bottom:5px;border-bottom:0.6px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;font-family:Poppins,Arial,sans-serif;font-size:7.5px;color:#6B7280;-webkit-print-color-adjust:exact">
  <span style="display:flex;align-items:center;gap:6px">${mark}<span style="font-weight:700;letter-spacing:2px;color:#${t.deep};text-transform:uppercase">${esc(brand?.name ?? "")}</span></span>
  <span>${esc(doc.title)}</span>
</div>`;
}

export function footerHtml(doc, t, brand) {
  return `<div style="width:100%;margin:0 16mm;padding-top:5px;border-top:0.6px solid #E5E7EB;display:flex;justify-content:space-between;font-family:Poppins,Arial,sans-serif;font-size:7.5px;color:#6B7280">
  <span>${esc([brand?.name, brand?.contact].filter(Boolean).join("  |  "))}</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;
}

/* --------------------------------------------------------------------------
   5. The whole thing
   Returns { shape, cover, body, header, footer }. cover is null for a
   short document. Each is a complete HTML page except header and footer,
   which are the fragments Chromium wants for its print templates.
   -------------------------------------------------------------------------- */

function pageHtml(title, css, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${inner}</body></html>`;
}

/* The cover runs to the edge of the paper, so its page has no margin. */
function coverPageHtml(title, css, inner) {
  return pageHtml(title, `${css}\n@page { size: A4; margin: 0; }`, inner);
}

export async function documentHtml(doc, theme, brand = null, images = null, { fontCss = "", date = new Date(), pages = 0, compact = false } = {}) {
  const t = styleTokens(theme);
  const css = documentCss(t, fontCss) + diagramCss(t);
  /* COMPACT: the second try at a page limit they named (printPdf.js).
     No cover, tighter spacing; the text size barely moves. */
  const shape = compact ? "short" : shapeOf(doc, { pages });

  /* QR codes are drawn before the page, as SVG. */
  const qr = new Map();
  for (const b of doc.blocks.filter((x) => x.type === "sourcesqr")) {
    try {
      const QRCode = (await import("qrcode")).default;
      qr.set(b.url, await QRCode.toString(b.url, { type: "svg", margin: 0, color: { dark: `#${t.ink}`, light: "#FFFFFF" } }));
    } catch {
      /* Without a drawing the card still carries the link. */
    }
  }
  const ctx = { images, theme, qr };

  const body = bodyHtml(doc, t, ctx, shape);
  const bodyPage = pageHtml(doc.title, css,
    `<div class="page-body${compact ? " compact" : ""}">${shape === "short" ? titleBandHtml(doc, t, brand) : ""}${body}</div>`);
  const cover = shape === "long" ? coverPageHtml(doc.title, css, coverHtml(doc, t, brand, date)) : null;
  return { shape, cover, body: bodyPage, header: headerHtml(doc, t, brand), footer: footerHtml(doc, t, brand) };
}
