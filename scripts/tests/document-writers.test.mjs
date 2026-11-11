/* THE FILE WRITERS, CHECKED ON THE REAL DOCUMENT.

   Anthony, 2026-09-23, on the first real PDF: "the formatting is not very
   clean". These run the PDF layout and the slide cutting on that same
   document, without a browser, and check the faults found in it. */

import { readFileSync } from "node:fs";
import { readDocument, plainText } from "../../src/shared/docs/documentModel.js";
import { pdfDefinition } from "../../src/shared/docs/pdf.js";
import { toDeck } from "../../src/shared/docs/deck.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const md = readFileSync("scripts/__harness/fixtures/amara-pricing-faq.md", "utf8");
const doc = readDocument(md, "fallback");
const words = (x) => JSON.stringify(x);

/* 1. THE PDF -------------------------------------------------------------- */
const def = pdfDefinition(doc);
const all = words(def.content);
check("THE PDF USES A FONT THAT HAS THE NAIRA SIGN (Roboto, carried in the file)", def.defaultStyle.font === "Roboto");
check("the title appears once in the page content",
  (all.match(/"Amara Pricing FAQ"/g) ?? []).length === 1);
check("THE NOTES TO THE PERSON ARE NOT IN THE PDF", !all.includes("drop it in") && !all.includes("What would make this better"));
check("the prices are in it, with their sign", all.includes("₦563,760"));
check("no stars are left in it", !/\*[A-Za-z]/.test(all));
const table = def.content.find((c) => c.table && c.table.headerRows === 1);
check("a short table moves whole rather than leaving its header behind", !!table && table.unbreakable === true);
const widths = table?.table.widths ?? [];
check(`no column takes most of the page (${widths.map((w) => Math.round(w)).join(", ")})`,
  widths.length === 4 && Math.max(...widths) < 0.45 * widths.reduce((a, b) => a + b, 0));
check(`THE TABLE FITS THE PAGE, padding included (${Math.round(widths.reduce((a, b) => a + b, 0) + widths.length * 16)} of 483)`,
  widths.reduce((a, b) => a + b, 0) + widths.length * 16 <= 595.28 - 112);
check("numbers in the table sit on the right", table.table.body[1][1].alignment === "right");
check("the numbered steps are a real numbered list", def.content.some((c) => c.ol && c.ol.length === 3));

/* 2. THE SLIDES ----------------------------------------------------------- */
const slides = toDeck(doc);
check("the first slide is the cover, with the document's own title", slides[0].kind === "cover" && slides[0].title === "Amara Pricing FAQ");
check("THE COVER CARRIES THE SUBTITLE", slides[0].subtitle.startsWith("Everything you need"));
check("NOTHING IS PLACED OVER A TABLE: no slide has text after its table",
  slides.every((s) => s.kind === "cover" || !s.table || s.text.every((p) => p.kind === "text")));
check("no slide is filled past its room", slides.every((s) => s.kind === "cover" || s.used <= 4.95 || s.text.length === 1));
check("the notes to the person are not on any slide", !words(slides).includes("drop it in"));
check("bold survives onto the slides",
  slides.some((s) => (s.text ?? []).some((p) => (p.runs ?? []).some((r) => r.bold && r.text === "Essential"))));
check("numbered steps stay numbered", slides.some((s) => (s.text ?? []).some((p) => p.style === "number" && p.number === 3)));
check('the quote has no ">"', !slides.some((s) => (s.text ?? []).some((p) => plainText(p.runs).startsWith(">"))));

/* 3. THE DESIGNED DOCUMENT, 2026-09-23 ---------------------------------- */
{
  const { themeFor } = await import("../../src/shared/docs/documentTheme.js");
  const designed = readDocument(readFileSync("scripts/__harness/fixtures/designed.md", "utf8"), "x");
  const deck = toDeck(designed);
  const content = deck.filter((s) => s.kind === "content");
  check(`one slide per section, no spill (${content.map((s) => s.title).join(" / ")})`, content.length === 4);
  check("every slide carries its label", content.every((s) => s.label));
  check("the cards slide has three cards", content[0].feature?.kind === "cards" && content[0].feature.items.length === 3);
  check("and its takeaway", Boolean(content[0].takeaway));
  check("the stat slide has the figure", content[2].feature?.kind === "stat" && content[2].feature.block.value === "30 days");
  check("the steps slide has three steps", content[3].feature?.kind === "steps" && content[3].feature.items.length === 3);
  check("NOTHING GOES UNDER A FEATURE: no slide has text placed after its feature",
    content.every((s) => !s.feature || s.text.every((p) => p.kind === "text")));

  const pdf = JSON.stringify(pdfDefinition(designed, themeFor("#0B6E4F"), { name: "Amara" }));
  check("the PDF draws in the company colour", pdf.includes("#0B6E4F"));
  check("the PDF carries the label, the figure and the takeaway",
    pdf.includes("THE PROBLEM") && pdf.includes("30 days") && pdf.includes("the same day they speak"));
  check("no ::: reaches the PDF", !pdf.includes(":::"));

  const pale = themeFor("#FFE600");
  const lum = (h) => { const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  check(`A PALE BRAND COLOUR IS DARKENED so white text on it reads (${pale.accent})`, 1.05 / (lum(pale.accent) + 0.05) >= 4.5);
  check("a broken colour falls back to the default", themeFor("not a colour").accent === "1E3A8A");
}

/* 4. PICTURES, 2026-09-23 ------------------------------------------------ */
{
  const { themeFor } = await import("../../src/shared/docs/documentTheme.js");
  /* A real 2 by 1 PNG, red then blue. */
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAEUlEQVR4nGP4z8DwnwEIGRgAMe8D/Q4RwRsAAAAASUVORK5CYII=";
  const images = new Map([["lobby", { name: "lobby.png", dataUrl: PNG, mime: "image/png", width: 800, height: 400 }]]);
  const pictured = readDocument("# Deck\n\n## Our lobby\n:::label Place\n\nWhere guests arrive.\n\n:::image lobby.png | The front desk\n\n## Later\n\n:::image missing.jpg | To come", "x");
  const pics = pictured.blocks.filter((b) => b.type === "image");
  check("the reader finds both pictures, with names and captions", pics.length === 2 && pics[0].name === "lobby.png" && pics[0].caption === "The front desk");

  const def = JSON.stringify(pdfDefinition(pictured, themeFor(), null, images));
  check("THE PDF CARRIES THE PICTURE ITSELF", def.includes(PNG));
  check("its caption is under it", def.includes("The front desk"));
  check("a picture nobody gave is a marked space, never something else", def.includes("Picture to add here: missing.jpg"));

  const deck = toDeck(pictured);
  const lobby = deck.find((s) => s.title === "Our lobby");
  check("on a slide the picture sits with the text, not after it", lobby?.feature?.kind === "image" && lobby.text.length === 1);
}

/* 5. SLIDE DIAGRAMS, 2026-11-11 ------------------------------------------- */
{
  const { themeFor } = await import("../../src/shared/docs/documentTheme.js");
  const { iconSvg } = await import("../../src/shared/docs/slides/slideIcons.js");
  const { slideThemeFor, contrast } = await import("../../src/shared/docs/slides/slideTheme.js");
  const md = readFileSync("scripts/__harness/fixtures/diagrams.md", "utf8");
  const doc = readDocument(md, "x");
  const types = doc.blocks.map((b) => b.variant ?? b.type);
  check(`the reader finds every diagram (${types.join(", ")})`,
    ["flow", "hub", "phases", "tree", "statement"].every((t) => types.includes(t)));
  const flow = doc.blocks.find((b) => b.type === "flow");
  check("a flow keeps its steps and lights the bold one", flow.steps.length === 4 && flow.steps[2].lit && !flow.steps[0].lit);
  const phases = doc.blocks.find((b) => b.variant === "phases");
  check("a phase keeps its time and its outcome", phases.items[0].kicker === "3 to 4 weeks" && phases.items[0].outcome.startsWith("a working"));
  const cards = doc.blocks.find((b) => b.type === "cards" && !b.variant);
  check("a card's icon is read and kept out of its title", cards.items[0].icon === "church" && plainText(cards.items[0].title) === "Our church");

  const deck = toDeck(doc);
  const kinds = deck.filter((s) => s.kind === "content").map((s) => s.feature?.kind);
  check(`each diagram gets its own slide (${kinds.join(", ")})`,
    ["flow", "hub", "phases", "tree", "statement", "cards"].every((k) => kinds.includes(k)));

  const pdf = JSON.stringify(pdfDefinition(doc, themeFor("#C8102E"), { name: "Church" }));
  check("THE PDF KEEPS EVERY WORD of the diagrams",
    ["Member", "Knowledge base", "Answers questions", "a working", "Leadership", "Digital team", "One connected church"].every((w) => pdf.includes(w)));
  check("no icon name reaches the PDF", !pdf.includes("[church]"));

  check("an icon on the list is drawn, one off it is not", Boolean(iconSvg("church", "FFFFFF")) && iconSvg("no-such-icon", "FFFFFF") === null);
  for (const colour of ["1A7F3C", "C8102E", "1E3A8A", "F5C400"]) {
    const s = slideThemeFor(themeFor(colour));
    check(`dark slides in ${colour}: text and lit words read on the panels`,
      contrast(s.body, s.panel) >= 4.5 && contrast(s.lit, s.panel) >= 4.5 && contrast(s.onLit, s.litFill) >= 4.5);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
