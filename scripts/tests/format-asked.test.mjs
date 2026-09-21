/* Turning "make it a word document" into a button press.

   The whole value of this is that it is cautious. Saying no costs nothing,
   because the message falls through to what the app already did. Saying
   yes wrongly hands somebody a download when they asked for a report. So
   the no cases matter more than the yes cases and there are more of them. */

import { formatAsked } from "../../src/shared/formatAsked.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

/* The sentence Anthony actually used. */
check('"make it a word document"', formatAsked("make it a word document") === "docx");
check('"make it a PDF file"', formatAsked("make it a PDF file") === "pdf");

check('"can I get this as a pdf"', formatAsked("can I get this as a pdf") === "pdf");
check('"turn that into slides"', formatAsked("turn that into slides") === "pptx");
check('"give me the document in excel"', formatAsked("give me the document in excel") === "xlsx");
check('"pdf please"', formatAsked("pdf please") === "pdf");
check('"word"', formatAsked("word") === "docx");
check('"send it as a deck"', formatAsked("send it as a deck") === "pptx");
check('"I want the same thing as a spreadsheet"', formatAsked("I want the same thing as a spreadsheet") === "xlsx");
check("capitals do not matter", formatAsked("MAKE IT A WORD DOCUMENT") === "docx");

/* The ones it must refuse, because these are real work. */
check('"write me a report on Word processing software" is NOT a download',
  formatAsked("write me a report on Word processing software for the board") === null);
check('"draft a proposal about our excel training courses" is NOT a download',
  formatAsked("draft a proposal about our excel training courses for new staff") === null);
check('"prepare a presentation for the board next week about our results" is NOT a download',
  formatAsked("prepare a presentation for the board next week about our quarterly results") === null);
check("an ordinary question is not a download", formatAsked("what sources do you have?") === null);
check("an empty message is not a download", formatAsked("") === null);
check("nothing at all is not a download", formatAsked(null) === null);
check("a change request is not a download", formatAsked("add a section about refunds") === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
