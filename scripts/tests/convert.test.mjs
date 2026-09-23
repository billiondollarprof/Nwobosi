/* CONVERSION (DOCUMENT-HARNESS.md, section 8): the CONVERT line, and the
   word by word comparison that says whether anything went missing. */

import { convertFromReply, withoutConvertLine, kindOfFile } from "../../src/shared/convert/convertAsked.js";
import { compareWords, conversionReport } from "../../src/shared/convert/convertReport.js";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name}`); }
}

/* THE LINE */
check("CONVERT: pdf is read", convertFromReply("Converting it now.\nCONVERT: pdf") === "pdf");
check("CONVERT: word means docx", convertFromReply("CONVERT: Word.") === "docx");
check("anything else is not a conversion", convertFromReply("CONVERT: slides") === null && convertFromReply("Here you go") === null);
check("the line never shows", withoutConvertLine("Converting it now.\nCONVERT: docx").trim() === "Converting it now.");
check("only PDF and Word files convert", kindOfFile("a.PDF") === "pdf" && kindOfFile("b.docx") === "docx" && kindOfFile("c.pptx") === null);

/* THE COMPARISON */
const same = compareWords("Dear Mrs Okafor,\nthank you.", "Dear  Mrs Okafor, thank you.");
check("the same words in a different layout are complete", same.complete && same.missing.length === 0);
check("a word split by a hyphen at a line end still counts", compareWords("well-known hotel", "well\nknown hotel").complete);
const lost = compareWords("Rooms ₦12,400,000\nMeals ₦3,150,000\nThe river terrace", "Rooms ₦12,400,000\nThe river terrace");
check("a missing line is caught", !lost.complete && lost.missing.includes("meals"));
check("and shown from the original", lost.lines.length === 1 && lost.lines[0].startsWith("Meals"));
check("added words are noticed too", compareWords("one two", "one two three").added.includes("three"));
check("a repeated word lost once is caught", !compareWords("no no no", "no no").complete);

/* WHAT THE PERSON IS TOLD */
const told = conversionReport({ way: "browser", words: same, pictures: { before: 1, after: 0 } }, "docx");
check("complete is said as a fact", told[0] === "Every word came across.");
check("a lost picture is said", told.includes("The picture did not come across."));
check("the browser way says what it cannot keep", told.some((l) => /tables and columns/.test(l)));
const unchecked = conversionReport({ way: "exact", words: { unchecked: true }, pictures: { before: null, after: null } }, "pdf");
check("a check that could not run never claims complete", !unchecked.some((l) => /Every word came across/.test(l)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
