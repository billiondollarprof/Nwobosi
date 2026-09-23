/* WHAT A FINISHED DOCUMENT IS CALLED, WHEN IT IS SAVED.

   It used to land as make-me-a-one-page-pricing-faq.docx, named after the
   request, because the card was created before the document arrived. It is
   named after the document's own first heading now, read at download time.

   Imports nothing, so it is read straight in. */

import { headingOf, titleOf } from "../../src/shared/documentTitle.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

check("the document's own heading is used", titleOf("# Pricing FAQ\n\nBody", "make me a faq") === "Pricing FAQ");
check("not the request it was asked for with", titleOf("# Pricing FAQ", "make me a faq") !== "make me a faq");
check("a section heading is not mistaken for the title", headingOf("## Section one\n\nText") === "");
check("the first top level heading wins", headingOf("Intro\n\n# Real Title\n\n# Later") === "Real Title");
check("bold marks do not end up in a filename", headingOf("# **Pricing** FAQ") === "Pricing FAQ");
check("spaces inside are tidied", headingOf("#   Board   Report  ") === "Board Report");
check("a very long heading is kept to a sensible length", headingOf("# " + "x".repeat(200)).length === 80);

check("no heading falls back to what the card was called", titleOf("Just text", "Board report") === "Board report");
check("no heading and no name still gives a name, never an empty one", titleOf("Just text", "") === "Your document");
check("nothing at all still gives a name", titleOf(undefined, undefined) === "Your document");
check("a hash with no space is not a heading", headingOf("#hashtag") === "");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
