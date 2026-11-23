/* THE FIX. Anthony, 2026-11-22: "it just show the error with red line, but
   it will not go back to adjust it and correct the problem."

   The finished file was drawn and checked (src/shared/docs/look/fixLoop.js):
   code measured what has one right answer (text out of its box, a PDF over
   the pages they asked for) and the look agent (look.ts) added what an eye
   sees. This stage gets the draft and that list, and puts each fault right.

   It answers with ONLY the sections it changed, so it is quick: a one page
   fix is a paragraph, not the whole document again. The app puts them in
   place by heading and draws the file again. At most two rounds.

   It works inside the same approved brief as the writing, which rides
   underneath this instruction, so a fix can cut and tighten but never add a
   fact nobody agreed. */
export const REVISE = [
  "",
  "RIGHT NOW: PUT THE FAULTS RIGHT",
  "The document below was drawn and checked before it was handed over, and the",
  "faults listed with it were found. Fix every one of them and change nothing else.",
  "",
  "HOW TO FIX",
  "  - Too long for its box, its slide or its pages: say the same in fewer words.",
  "    Tighten sentences, turn a list into one line, drop the point that matters",
  "    least. Never drop an agreed point the brief names, never the close.",
  "  - Over the pages: cut to the number of words the fault gives. A design block",
  "    takes the room of about 100 words, so removing one is a real saving.",
  "  - Never fix a fault by making the text smaller or by adding anything new.",
  "  - Keep every heading exactly as it is written in the draft, word for word.",
  "",
  "HOW TO ANSWER",
  "Write ONLY the sections you changed, each one complete, starting with its own",
  "\"## \" heading line copied exactly from the draft, followed by its whole new body,",
  "blocks and all. The app swaps each one in by its heading.",
  "If the fix needs the title or the line under it changed, or more than half the",
  "sections, write the whole document again instead, starting with \"# \" and the title.",
  "",
  "Nothing else: no note about what you changed, no greeting, no code fences. The same",
  "design blocks as the draft (:::cards, :::steps, :::stat and the rest).",
].join("\n");
