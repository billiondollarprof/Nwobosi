/* LAYOUT FROM AN UPLOAD (DOCUMENT-HARNESS.md, section 9). The shape of a
   file, its style from a real Word file, and the brief line that says to
   use them. */

import { readFileSync } from "node:fs";
import { outlineOf, styleOfDocx, layoutFromBrief } from "../../src/shared/convert/layoutOf.js";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name}`); }
}

const t = (text) => [{ text }];
const outline = outlineOf({ blocks: [
  { type: "h", level: 1, runs: t("Letter of engagement") },
  { type: "p", runs: t("Dear Mrs Okafor, the private words of the letter.") },
  { type: "p", runs: t("More words.") },
  { type: "h", level: 2, runs: t("What is included") },
  { type: "list", ordered: false, items: [{ runs: t("a") }, { runs: t("b") }, { runs: t("c") }] },
  { type: "table", header: [t("Item"), t("Cost")], rows: [[t("Rooms"), t("1")], [t("Total"), t("1")]] },
  { type: "image", name: "picture-1.png" },
] });
check("the outline has the sections in order, at their levels", /^# Letter of engagement\n/.test(outline) && outline.includes("## What is included"));
check("paragraphs in a row are counted, not repeated", outline.includes("  paragraph x2"));
check("a list says how many items", outline.includes("bullet list, 3 items"));
check("a table says its columns and its Total row", outline.includes("table, 2 columns (Item | Cost), 2 rows, ending in a Total row"));
check("a picture is where it sits", outline.includes("  picture"));
check("THE BODY WORDS ARE NOT IN IT", !outline.includes("Okafor") && !outline.includes("private"));

const style = await styleOfDocx(readFileSync("scripts/__harness/fixtures/engagement.docx"));
check("a Word file's body font is read", typeof style?.font === "string" && style.font.length > 0);
check("its heading colour is read", /^[0-9A-F]{6}$/.test(style?.accent ?? ""));
check("its margins are read, in twips", style?.margins && style.margins.left > 0 && style.margins.top > 0);
check("a file that is not a Word file gives no style, and does not throw", (await styleOfDocx(Buffer.from("not a zip"))) === null);

check("the brief line names the file", layoutFromBrief("Sections...\nLayout: like Q2 report.docx\nVoice...") === "Q2 report.docx");
check("no line, no layout", layoutFromBrief("Sections...\nPictures: none") === null);
console.log(`  (read from the fixture: ${JSON.stringify(style)})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
