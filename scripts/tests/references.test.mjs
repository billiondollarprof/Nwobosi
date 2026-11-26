/* References, and moving them behind a QR code on a one pager
   (src/shared/docs/references.js). Anthony, 2026-11-22: a one pager stays
   one page; its references go to their own page, reached by a QR code. */
import assert from "node:assert/strict";
import {
  readReference, findReferences, withQrCard, referencesLink, shortLinkText, qrCardText,
} from "../../src/shared/docs/references.js";
import { readDocument } from "../../src/shared/docs/documentModel.js";
import * as REF from "../../src/shared/docs/references.js";
import { pdfDefinition } from "../../src/shared/docs/pdf.js";
import { toDeck } from "../../src/shared/docs/deck.js";

let n = 0;
const t = (name, fn) => { fn(); n += 1; };

const CODE = "0123456789abcdef0123456789abcdef";
const MD = [
  "# Hotel plan",
  "",
  "What it is.",
  "",
  "## Why",
  "Because.",
  "",
  ":::references",
  "- Rural Electrification Agency, Mini grid report, 2025. https://rea.example.org/report.",
  "- Company price list, 2026.",
  ":::",
].join("\n");

t("a reference line keeps its text and finds its address", () => {
  assert.deepEqual(readReference("- REA report, 2025. https://rea.example.org/a."), { text: "REA report, 2025. https://rea.example.org/a.", url: "https://rea.example.org/a" });
  assert.deepEqual(readReference("2. Price list"), { text: "Price list", url: "" });
});
t("the block is found with every item", () => {
  const f = findReferences(MD);
  assert.equal(f.items.length, 2);
  assert.equal(f.items[1].url, "");
});
t("no block, nothing found", () => assert.equal(findReferences("# T\n\nText."), null));
t("an unclosed block ends at the next heading", () => {
  const f = findReferences("# T\n:::references\n- A\n- B\n## Next\nText");
  assert.equal(f.items.length, 2);
});
t("the swap puts the QR card where the list was, and keeps the rest", () => {
  const out = withQrCard(MD, referencesLink(CODE), 2);
  assert.match(out, /:::sourcesqr https:\/\/stellaxafe\.com\/r\/0123456789abcdef0123456789abcdef \| 2$/);
  assert.ok(!out.includes(":::references"));
  assert.ok(out.includes("## Why\nBecause."));
});
t("the number checker never sees the references or the card", () => {
  const { withoutReferences } = REF;
  assert.ok(!withoutReferences(MD).includes("2025"));
  assert.ok(withoutReferences(MD).includes("Because."));
  assert.ok(!withoutReferences(withQrCard(MD, referencesLink(CODE), 2)).includes("sourcesqr"));
});
t("only a proper code makes a link", () => {
  assert.equal(referencesLink(CODE), `https://stellaxafe.com/r/${CODE}`);
  assert.equal(referencesLink("abc"), "");
  assert.equal(referencesLink(null), "");
});
t("the printed link is short", () => assert.equal(shortLinkText(`https://stellaxafe.com/r/${CODE}`), "stellaxafe.com/r/01234567…"));
t("the card counts its references", () => {
  assert.match(qrCardText(2).line, /the 2 references/);
  assert.match(qrCardText(1).line, /the reference behind/);
  assert.match(qrCardText(0).line, /the references behind/);
});
t("the reader turns the block into references", () => {
  const doc = readDocument(MD, "x");
  const refs = doc.blocks.find((b) => b.type === "references");
  assert.equal(refs.items.length, 2);
});
t("the reader turns the card into a QR block", () => {
  const doc = readDocument(withQrCard(MD, referencesLink(CODE), 2), "x");
  const qr = doc.blocks.find((b) => b.type === "sourcesqr");
  assert.equal(qr.count, 2);
  assert.ok(qr.url.endsWith(CODE));
});
t("the PDF draws a numbered list with links", () => {
  const def = JSON.stringify(pdfDefinition(readDocument(MD, "x")));
  assert.ok(def.includes("\"References\""));
  assert.ok(def.includes("\"link\":\"https://rea.example.org/report\""));
});
t("the PDF draws the QR code and the short link", () => {
  const def = JSON.stringify(pdfDefinition(readDocument(withQrCard(MD, referencesLink(CODE), 2), "x")));
  assert.ok(def.includes(`"qr":"https://stellaxafe.com/r/${CODE}"`));
  assert.ok(def.includes("stellaxafe.com/r/01234567…"));
  assert.ok(!def.includes("Mini grid report"), "the list itself is off the page");
});
t("slides keep the references and the link as text", () => {
  const deck = JSON.stringify(toDeck(readDocument(withQrCard(MD, referencesLink(CODE), 2), "x")));
  assert.ok(deck.includes(`https://stellaxafe.com/r/${CODE}`));
});

/* Word draws the QR picture before it builds the file. */
const { wordBlob } = await import("../../src/shared/docs/word.js");
const blob = await wordBlob(readDocument(withQrCard(MD, referencesLink(CODE), 2), "x"));
const zip = Buffer.from(await blob.arrayBuffer());
assert.ok(zip.length > 1000);
assert.ok(zip.includes(Buffer.from("word/media/")), "the QR picture is in the Word file");
n += 1;

console.log(`references: ${n} passed`);
