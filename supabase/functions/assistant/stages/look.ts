/* THE LOOK. Anthony, 2026-11-10: "The system should look at what it made
   (screenshot) before handing it over, especially slides."

   The app draws the finished file as pictures, the slides exactly as they
   are placed in the .pptx, the pages of the real PDF, and sends them here
   with anything its own measuring already found. This agent looks the way a
   person opening the file would, and reports only what that person would
   notice. It never rewrites anything itself.

   2026-11-22, Anthony: "it just show the error with red line, but it will
   not go back to adjust it". Now each line is graded MAJOR or MINOR, the way
   PPTAgent's reviewer grades its findings, and carries how to fix it. The
   app sends every MAJOR line and everything code measured to the fix stage
   (revise.ts), draws the file again and looks again, at most twice
   (src/shared/docs/look/fixLoop.js). MINOR lines are never acted on or
   shown, which is where the false alarms were. */
export const LOOK = [
  "",
  "RIGHT NOW: LOOK AT THE FINISHED FILE BEFORE IT IS HANDED OVER",
  "The pictures in this message are the file this person is about to receive, page",
  "by page or slide by slide, in order. Look at them the way they will when they",
  "open it, and report only what they would notice and mind:",
  "  - text cut off, running out of its box, or sitting on top of something else",
  "  - a slide or page that is empty, or nearly empty, where it should not be",
  "  - text too small or too faint to read",
  "  - something clearly out of place: a stray symbol, a heading with nothing under",
  "    it, the same line twice",
  "",
  "A grey box that says it is a chart drawn by PowerPoint is a placeholder in this",
  "picture only; the real file has the chart. Never report it.",
  "Do not judge the wording, the content or the design choices. Only what is broken",
  "or would look wrong to someone who opened it.",
  "",
  "If the message lists problems the app already measured, do not repeat them: the",
  "app is fixing those already. Report only what you see that is not on that list.",
  "",
  "ONLY WHAT YOU CAN SEE. Report a problem only when it is plainly there in the",
  "picture. If you are not sure, it is not a problem. A page with nothing wrong is",
  "the normal result, so saying ALL CLEAR is never a failure.",
  "",
  "HOW TO ANSWER. If nothing is wrong, answer with exactly: ALL CLEAR",
  "If you cannot see any pictures in this message, answer with exactly: UNSEEN",
  "Otherwise one line per problem, four parts split by a bar:",
  "  MAJOR | Slide 3 | the second card's text runs past the bottom of the card | cut it to two lines",
  "MAJOR is something a reader would mind: cut off, overlapping, unreadable, empty,",
  "the same line twice. MINOR is anything smaller. Where is \"Slide 3\" or \"Page 2\".",
  "The fix is a few words the writer can act on: cut, shorten, split, move.",
  "At most five lines. Nothing else: no greeting, no summary.",
].join("\n");
