/* WHAT A REOPENED CONVERSATION LOOKS LIKE.

   Anthony, 2026-09-23: "asking it to continue couldn't do anything... I
   open an old chat. It can still read the old chat and still know where to
   begin from."

   Every rule in src/shared/resumeCards.js, checked without a browser. */

import { settleForResume, restingStage, lastFormat } from "../../src/shared/resumeCards.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const ask = { role: "user", type: "text", content: "Make me a pricing FAQ" };
const readBack = { role: "assistant", type: "text", content: "A one page FAQ. I'm thinking PDF." };
const pressed = { role: "user", type: "text", content: "Go ahead, build it as a PDF." };
const result = { role: "assistant", type: "result", content: "# Pricing FAQ", format: "pdf" };
const question = { role: "assistant", type: "text", content: "Who signs this?" };
const failNote = { role: "assistant", type: "error", content: "The assistant could not finish that." };

/* --------------------------------------------------------------------------
   1. THE CHAT ANTHONY OPENED: a read back, saved before the button was
   -------------------------------------------------------------------------- */
{
  const r = settleForResume([ask, readBack], "analyse");
  const last = r.messages[r.messages.length - 1];
  check("A READ BACK WITH NO BUTTON GETS ITS BUTTON BACK", last.type === "build");
  check("it stays on the read back step", r.stage === "analyse");
  check("the words are all still there", r.messages[1].content === readBack.content);
}

/* --------------------------------------------------------------------------
   2. A BUTTON THAT WAS SAVED IS NOT ADDED TWICE, and its file type comes back
   -------------------------------------------------------------------------- */
{
  const r = settleForResume([ask, readBack, { role: "assistant", type: "build", format: "pdf" }], "analyse");
  check("one build card, not two", r.messages.filter((m) => m.type === "build").length === 1);
  check("THE FILE TYPE COMES BACK AS PDF", r.format === "pdf");
}

/* --------------------------------------------------------------------------
   3. A BUILD THAT NEVER FINISHED
   -------------------------------------------------------------------------- */
{
  const r = settleForResume([ask, readBack, pressed], "generate");
  check("a build cut short gets its button back", r.messages[r.messages.length - 1].type === "build");
  check("AND IT IS NOT LEFT ON generate, so typing cannot dump a document into chat", r.stage === "analyse");
  const b = settleForResume([ask, readBack, pressed], "brief");
  check("the same when it stopped at the brief", b.stage === "analyse" && b.messages.at(-1).type === "build");
  const spinner = settleForResume([ask, readBack, pressed, { role: "assistant", type: "generating" }], "generate");
  check("a saved spinner is dropped, it would spin forever", !spinner.messages.some((m) => m.type === "generating"));
}

/* --------------------------------------------------------------------------
   4. A FINISHED DOCUMENT IS LEFT ALONE
   -------------------------------------------------------------------------- */
{
  const r = settleForResume([ask, readBack, pressed, result], "analyse");
  check("no build button under a finished document", r.messages.at(-1).type === "result");
  check("the finished document's file type comes back", r.format === "pdf");
  const g = settleForResume([ask, readBack, pressed, result], "generate");
  check("an old row saved on generate with its document is left alone too", g.messages.at(-1).type === "result");
}

/* --------------------------------------------------------------------------
   5. NEVER A BUTTON WITHOUT A READ BACK
   -------------------------------------------------------------------------- */
{
  check("a question in the interview gets no build button",
    settleForResume([ask, question], "interview").messages.at(-1).type === "text");
  check("an error note on the read back step gets no build button",
    settleForResume([ask, readBack, { role: "user", type: "text", content: "change the title" }, failNote], "analyse")
      .messages.at(-1).type === "error");
  check("their own message last gets no build button",
    settleForResume([ask, readBack, { role: "user", type: "text", content: "change it" }], "analyse")
      .messages.at(-1).role === "user");
  check("the opening offer is left as it was",
    settleForResume([ask, { role: "assistant", type: "offer" }], "offered").messages.at(-1).type === "offer");
}

/* --------------------------------------------------------------------------
   6. STEPS TYPING MAY NEVER LAND ON
   -------------------------------------------------------------------------- */
check("RESEARCH COMES BACK AS THE READ BACK STEP, so typing cannot search unasked",
  restingStage("research") === "analyse");
check("brief comes back as the read back step", restingStage("brief") === "analyse");
check("generate comes back as the read back step", restingStage("generate") === "analyse");
check("the interview stays the interview", restingStage("interview") === "interview");
check("the offer stays the offer", restingStage("offered") === "offered");
check("no step at all starts at the interview", restingStage(undefined) === "interview");

/* --------------------------------------------------------------------------
   7. ODD ROWS DO NOT BREAK OPENING
   -------------------------------------------------------------------------- */
check("no messages at all is fine", settleForResume(null, "analyse").messages.length === 0);
check("no file type anywhere is null, and the page uses its default", lastFormat([ask, readBack]) === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
