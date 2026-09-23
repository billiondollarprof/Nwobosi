/* ==========================================================================
   WHAT A REOPENED CONVERSATION LOOKS LIKE, AND WHICH STEP IT IS ON

   WHY THIS EXISTS
   Anthony, 2026-09-23, after reopening a chat that had stopped at a read
   back: "asking it to continue couldn't do anything... I open an old chat.
   It can still read the old chat and still know where to begin from."

   The words of a conversation always came back. What did not come back was
   the thing to PRESS. The build card was never saved, so a chat reopened
   after a read back showed the read back and no button, and the only thing
   left to do was type. That is exactly what he did.

   So this decides two things when a conversation is opened again:

     1. Which step it is on. Some steps must never be entered by typing,
        because they either spend money writing a document or go outside
        the company. Those are brought back to the read back step, which is
        the one that can always move the work forward safely.

     2. Which card goes at the bottom. If the conversation stopped at a
        point where a button should be waiting, the button is put back.

   WHAT IT MUST NEVER DO
   - Never put a build button under something that was not a read back
     step. Building without a read back is the one thing the guardrails
     exist to stop.
   - Never leave a reopened chat on "research", "brief" or "generate".
     Typing into research would search the web without asking. Typing into
     brief or generate would write a whole document into a chat bubble.

   Pure functions only. Nothing here touches the page, the database or the
   model, so the test in scripts/tests/resume-cards.test.mjs can check every
   rule without a browser.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: The cards that are buttons, not words

   These are the messages that wait for a press. If the conversation already
   ends on one of them, it was saved with its button and nothing is added.
   -------------------------------------------------------------------------- */

export const ACTION_CARDS = ["build", "offer", "lookup", "useFinding"];

/* --------------------------------------------------------------------------
   SECTION 2: Steps that typing may never land on

   "research" goes and searches, and only a press of "Yes, go and look" may
   start that. "brief" and "generate" write the document, and only the build
   button may start those. A row can still be saved on one of them: a page
   closed halfway through a build, or halfway through a search.

   Each one comes back as "analyse", the read back step. It re-reads the
   conversation and ends in a question, a search request, or a read back
   with a build button, so there is always a safe way forward.
   -------------------------------------------------------------------------- */

const NEVER_TYPED_INTO = ["research", "brief", "generate"];

export function restingStage(stage) {
  if (!stage) return "interview";
  return NEVER_TYPED_INTO.includes(stage) ? "analyse" : stage;
}

/* --------------------------------------------------------------------------
   SECTION 3: Putting the right button back

   Takes the saved messages and the saved step. Hands back the messages to
   show, the step to carry on from, and the file type that was agreed.
   -------------------------------------------------------------------------- */

export function settleForResume(saved, stage) {
  /* A spinner saved by accident would spin forever on reopen, because the
     turn that owned it is long gone. */
  const messages = (Array.isArray(saved) ? saved : []).filter(
    (m) => m && m.type !== "generating",
  );

  const last = messages[messages.length - 1];
  const format = lastFormat(messages);
  const next = restingStage(stage);

  const endsOnCard = last && ACTION_CARDS.includes(last.type);
  const endsOnResult = last && last.type === "result";

  let addBuild = false;

  /* A BUILD THAT NEVER FINISHED. The page was closed, or the connection
     dropped, after the build button was pressed and before the document
     arrived. The read back was already agreed, so the button goes back. */
  if ((stage === "brief" || stage === "generate") && !endsOnResult && !endsOnCard) {
    addBuild = true;
  }

  /* STOPPED AT THE READ BACK STEP WITH NO BUTTON. The read back step always
     ends in one of three ways: a read back (build button), a question
     (which is saved as "interview", not here), or a request to search
     (which carries its own card). So a conversation saved on "analyse"
     whose last word is the assistant's is a read back whose button was
     never saved. Every conversation before 2026-09-23 looks like this. */
  if (
    stage === "analyse" &&
    last &&
    last.role === "assistant" &&
    /* Words, not an error note. A turn that failed after they asked for a
       change has not read that change back, so it must not get a button. */
    (last.type === "text" || !last.type) &&
    !endsOnCard &&
    !endsOnResult
  ) {
    addBuild = true;
  }

  return {
    messages: addBuild
      ? [...messages, { role: "assistant", type: "build", format }]
      : messages,
    stage: next,
    format,
  };
}

/* --------------------------------------------------------------------------
   SECTION 4: The file type that was agreed

   Read from the newest build card or finished document that carries one.
   Null when none does, and the page then uses its own default.
   -------------------------------------------------------------------------- */

export function lastFormat(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m && (m.type === "build" || m.type === "result") && typeof m.format === "string") {
      return m.format;
    }
  }
  return null;
}
