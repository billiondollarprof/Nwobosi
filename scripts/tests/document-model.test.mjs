/* THE ONE READING OF A DOCUMENT.

   Anthony, 2026-09-23: "look at the document. the formatting is not very
   clean." Each check below is a fault from that PDF, or from the Word,
   Slides and Spreadsheet versions of the same document. */

import { readFileSync } from "node:fs";
import { readDocument, readInline, plainText, notesAsText, figureCaption, saysTheSame, runningLine } from "../../src/shared/docs/documentModel.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

/* 1. SPACES ARE KEPT EXACTLY ---------------------------------------------- */
const priced = readInline("**Essential**, ₦52,200/month (₦563,760/year)");
check('no space is added before the comma after a bold word ("Essential ,")',
  plainText(priced) === "Essential, ₦52,200/month (₦563,760/year)");
check("the bold word is bold and only that", priced[0].bold === true && priced[0].text === "Essential" && !priced[1].bold);
check('"You don’t" keeps its space (was "Youdon\'t")', plainText(readInline("No. You don’t need a card.")) === "No. You don’t need a card.");
check("the naira sign survives", plainText(readInline("₦1,341,360")) === "₦1,341,360");

const middle = readInline("Three plans: **Essential**, **Premier**, and **Signature**.");
check('BOLD IN THE MIDDLE OF A SENTENCE IS BOLD, with no stars left ("*Essential*")',
  plainText(middle) === "Three plans: Essential, Premier, and Signature." &&
  middle.filter((r) => r.bold).map((r) => r.text).join("|") === "Essential|Premier|Signature" &&
  !middle.some((r) => r.italic));

/* 2. ITALIC, AND WHAT IS NOT ITALIC -------------------------------------- */
const it = readInline("This is *really* it, and snake_case_name stays.");
check("*really* is italic", it.some((r) => r.italic && r.text === "really"));
check("snake_case_name is left alone", plainText(it).includes("snake_case_name"));
check("links keep their words", plainText(readInline("See [the site](https://x.com) now")) === "See the site now");
check("a spaced dash becomes a comma", plainText(readInline("fast — and cheap")) === "fast, and cheap");
check("a range keeps its dash", plainText(readInline("9–5 daily")) === "9–5 daily");

/* 3. THE REAL DOCUMENT ---------------------------------------------------- */
const md = readFileSync("scripts/__harness/fixtures/amara-pricing-faq.md", "utf8");
const doc = readDocument(md, "fallback");
check("THE TITLE IS READ ONCE, from the heading", doc.title === "Amara Pricing FAQ");
check("and is not left in the body to print twice", !doc.blocks.some((b) => b.type === "h" && plainText(b.runs) === "Amara Pricing FAQ"));
check("the short line under it is the subtitle", doc.subtitle === "Everything you need to know before you sign up.");

const essential = doc.blocks.find((b) => b.type === "p" && plainText(b.runs).startsWith("Essential"));
check("A LINE BREAK INSIDE A PARAGRAPH IS KEPT", !!essential && essential.runs.some((r) => r.br));

const lists = doc.blocks.filter((b) => b.type === "list");
check("bullets are grouped into lists", lists.length >= 4 && lists[0].items.length === 3);
check("the numbered steps are one numbered list of three", lists.some((l) => l.ordered && l.items.length === 3));
const quote = doc.blocks.find((b) => b.type === "quote");
check('the quote has no ">" in it', !!quote && !plainText(quote.runs).includes(">"));
const table = doc.blocks.find((b) => b.type === "table");
check("the table is read, 3 rows of 4", !!table && table.rows.length === 3 && table.header.length === 4);

/* 4. THE NOTES TO THE PERSON NEVER GO IN THE FILE ------------------------ */
check("THE NOTES ARE TAKEN OUT OF THE DOCUMENT",
  !doc.blocks.some((b) => plainText(b.runs ?? []).includes("drop it in")) &&
  !doc.blocks.some((b) => b.type === "list" && b.items.some((i) => plainText(i.runs).includes("drop it in"))));
const notes = notesAsText(doc.notes);
check("and kept, as two lines for the chat", notes.length === 2 && notes[1].includes("support email"));

/* 5. THE DESIGN BLOCKS ------------------------------------------------- */
const designed = readDocument(`# Deck

## Problem Triggers
:::label Problem

:::cards
### Blister Packs | Misplacement
One medication per pack.
### Pouches | Sorting
Several medications.
- Sorted by time
:::

:::stat 20% | targeted reduction in errors
Measured after 30 days.
:::

:::steps
### The Checklist | Reminds
At the cart.
### Verify and Mark | Reinforces
On the pack.
:::

:::takeaway Every pill goes into one cup.

After it.`, "x");
const db = designed.blocks;
const head = db.find((b) => b.type === "h");
check("a label sits on the heading above it", head.label === "Problem");
const cards = db.find((b) => b.type === "cards");
check("cards: two, with titles and kickers",
  !!cards && cards.items.length === 2 && plainText(cards.items[0].title) === "Blister Packs" && cards.items[0].kicker === "Misplacement");
check("a card can hold a list", cards.items[1].blocks.some((b) => b.type === "list"));
const stat = db.find((b) => b.type === "stat");
check("stat: the figure, its caption and its story",
  !!stat && stat.value === "20%" && stat.caption === "targeted reduction in errors" && stat.blocks.length === 1);
check("steps are read like cards", db.find((b) => b.type === "steps")?.items.length === 2);
check("the takeaway is one line", plainText(db.find((b) => b.type === "takeaway")?.runs) === "Every pill goes into one cup.");
check("text after the blocks is ordinary text again", db[db.length - 1].type === "p" && plainText(db[db.length - 1].runs) === "After it.");
check("no ::: is left anywhere", !JSON.stringify(db).includes(":::"));
const unclosed = readDocument("## A\n:::cards\n### One\nText\n## B\nNext.", "x").blocks;
check("a block never closed ends at the next heading, and the rest survives",
  unclosed.some((b) => b.type === "cards") && unclosed.some((b) => b.type === "p" && plainText(b.runs) === "Next."));
check("an unknown block keeps its words",
  readDocument("## A\n:::mystery\nKeep me.\n:::", "x").blocks.some((b) => b.type === "p" && plainText(b.runs) === "Keep me."));

/* 5b. FIGURES: credits, tags and numbers (DOCUMENT-HARNESS 2 and 3) ------- */
const figs = readDocument(`# T

## Tour

As [[fig:team]] shows, and [[fig:lobby]] too. Not [[fig:ghost]].

:::image lobby.jpg | The front desk | Photo: Chidi Okafor

:::image team photo.jpg #team | The team

:::image rooftop.jpg`, "x");
const pics = figs.blocks.filter((b) => b.type === "image");
check("figures: a credit is kept whole", pics[0].source === "Photo: Chidi Okafor");
check("figures: a name with a space and a tag", pics[1].name === "team photo.jpg" && pics[1].tag === "team");
check("figures: with no tag, the file name is the tag", pics[0].tag === "lobby");
check("figures: CODE numbers them in order", pics.map((p) => p.figure).join() === "1,2,3");
const figText = plainText(figs.blocks.find((b) => b.type === "p").runs);
check("figures: [[fig:tag]] becomes its number", figText.startsWith("As Figure 2 shows, and Figure 1 too."));
check("figures: a tag that does not exist says 'the figure', never a broken tag", figText.endsWith("Not the figure.") && !figText.includes("[["));
check("figures: and the staff is told", figs.findings.length === 1 && /ghost/.test(figs.findings[0]));
check("figures: 'Figure 1. caption' for documents", figureCaption(pics[0]) === "Figure 1. The front desk");
check("figures: the number can be left out when asked", figureCaption(pics[0], false) === "The front desk");
const lone = readDocument("## A\n\n:::image one.jpg | Only one", "x").blocks.find((b) => b.type === "image");
check("figures: a single picture nobody points at gets no number", lone.figure === null);
const pointed = readDocument("## A\n\nSee [[fig:one]].\n\n:::image one.jpg | Only one", "x").blocks.find((b) => b.type === "image");
check("figures: a single picture the text points at IS numbered", pointed.figure === 1);

/* 5b. SAYING THE SAME THING TWICE, 2026-11-10 ----------------------------- */
const labelled = readDocument("# Doc\n\n## The problem\n:::label Problem\n\nText.", "x").blocks;
check("a label after a heading that says the same thing is dropped", !labelled.some((b) => b.label || b.type === "label"));
const before = readDocument("# Doc\n\n:::label The evidence\n## Evidence\n\nText.", "x").blocks;
check("a label before a heading that says the same thing is dropped", !before.some((b) => b.type === "label"));
const kept = readDocument("# Doc\n\n## What you earn\n:::label Money\n\nText.", "x").blocks.find((b) => b.type === "h" && b.level === 2);
check("a label that says something different is kept", kept && kept.label === "Money");
const steps = readDocument("# Doc\n\n:::steps\n### Sign up free | 01\nA line.\n### Share your code | Step 2\nA line.\n:::", "x").blocks.find((b) => b.type === "steps" || b.type === "cards");
check("a step whose kicker is only a number loses it (no '1' and '01')", steps && steps.items.every((i) => i.kicker === ""));
check("the running line says the company once when the title is the company", runningLine("Volt Test Engineering", "Volt Test Engineering") === "Volt Test Engineering");
check("the running line still says both when they differ", runningLine("Amara", "Partner Programme") === "Amara  ·  Partner Programme");
check("same words ignores case, punctuation and a leading 'the'", saysTheSame("THE PROBLEM.", "Problem") && !saysTheSame("Problem", "Problems"));

/* 6. ODD INPUT ----------------------------------------------------------- */
check("no heading means the fallback title", readDocument("Just words.", "Fallback").title === "Fallback");
check("empty input is empty, not a crash", readDocument("", "X").blocks.length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
