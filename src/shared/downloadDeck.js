/* ==========================================================================
   THE DECK

   Turns the finished work into a real PowerPoint file, in the browser, with
   nothing uploaded anywhere.

   WHY A REAL .pptx AND NOT A PDF OF SLIDES
   ----------------------------------------
   Somebody who asks for a deck is going to present it, and before they
   present it they are going to change a word, move a slide, or drop one.
   A PDF cannot be edited, so a PDF of slides is a picture of work rather
   than work. The point of this product is that the output is finished, and
   finished means they can take it from here.

   WHAT IT NEVER ADDS
   ------------------
   Nothing that is not in the document. No cover slide it invented, no
   "Thank you" at the end, no agenda it assembled. If the model wrote four
   sections there are four slides. A slide nobody wrote is the same failure
   as a fact nobody gave it, and it is the kind of thing a person only
   notices while presenting.

   WHY THE LIBRARY IS LOADED ON DEMAND
   -----------------------------------
   It is megabytes. Somebody who never makes a deck should not download it
   to open the chat, so the import sits inside the function.

   ========================================================================== */

import { slugForFile, saveBlob } from "./download.js";
import { readDocument } from "./docs/documentModel.js";
import { deckBlob } from "./docs/deck.js";

/* The layout itself lives in src/shared/docs/deck.js since 2026-09-23, when
   a table was found drawn on top of the bullets above it. See that file. */
export async function downloadPptx(title, markdown) {
  const doc = readDocument(markdown, title);
  if (!doc.blocks.length) throw new Error("nothing to put on a slide");
  const blob = await deckBlob(doc);
  saveBlob(blob, `${slugForFile(title)}.pptx`);
}
