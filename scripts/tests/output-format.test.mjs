/* Reading which file the work should become off the read back.

   Getting this wrong is not fatal, because a wrong answer lands on a Word
   document and the person can convert it in one sentence. But getting it
   right is the difference between the file being correct first time and
   the person having to ask. */

import { formatFromReply, withoutFormatLine, DEFAULT_FORMAT, FORMAT_NAMES } from "../../src/shared/outputFormat.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

check("plain", formatFromReply("Here is the read back.\nFORMAT: docx\nREADBACK_COMPLETE") === "docx");
check("a PDF", formatFromReply("FORMAT: pdf") === "pdf");
check("slides", formatFromReply("FORMAT: pptx") === "pptx");
check("a spreadsheet", formatFromReply("FORMAT: xlsx") === "xlsx");

/* The model will not always use the extension. */
check('"FORMAT: word"', formatFromReply("FORMAT: word") === "docx");
check('"FORMAT: powerpoint"', formatFromReply("FORMAT: powerpoint") === "pptx");
check('"FORMAT: spreadsheet"', formatFromReply("FORMAT: spreadsheet") === "xlsx");
check("capitals do not matter", formatFromReply("FORMAT: PDF") === "pdf");
check("extra spacing does not matter", formatFromReply("FORMAT:    docx") === "docx");

/* Nothing said, or something it cannot build. */
check("no line at all is null", formatFromReply("Here is the read back.\nREADBACK_COMPLETE") === null);
check("something unbuildable is null", formatFromReply("FORMAT: hologram") === null);
check("empty is null", formatFromReply("") === null);
check("nothing is null", formatFromReply(null) === null);

/* It must never reach a person's eyes. */
const shown = withoutFormatLine("Here is what I understood.\nFORMAT: docx\nAnd that is it.");
check("the line is stripped before it is shown", !shown.includes("FORMAT"));
check("and the words around it survive", shown.includes("Here is what I understood") && shown.includes("And that is it"));

check("the default is a Word document", DEFAULT_FORMAT === "docx");
check("every format has a name a person would say", Object.keys(FORMAT_NAMES).length === 4);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
