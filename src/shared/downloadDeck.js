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

   READ TOP TO BOTTOM
     1. The look
     2. Writing the file
   ========================================================================== */

import { toSlides } from "./structure.js";
import { slugForFile } from "./download.js";

/* --------------------------------------------------------------------------
   SECTION 1: The look

   Deliberately quiet. This is somebody's work going in front of their own
   client, not a place for the product to show off, and a deck that arrives
   covered in a vendor's colours is a deck they have to undo before they can
   use it.

   Inches, because that is what the library measures in. 13.33 by 7.5 is
   widescreen, which is what every projector and every laptop made this
   decade expects.
   -------------------------------------------------------------------------- */

const SLIDE = { w: 13.33, h: 7.5 };
const INK = { title: "111827", body: "374151", rule: "D1D5DB" };
const MARGIN = 0.9;

/* --------------------------------------------------------------------------
   SECTION 2: Writing the file
   -------------------------------------------------------------------------- */

export async function downloadPptx(title, markdown) {
  const slides = toSlides(markdown);
  if (!slides.length) throw new Error("nothing to put on a slide");

  const { default: PptxGenJS } = await import("pptxgenjs");
  const deck = new PptxGenJS();

  deck.defineLayout({ name: "SX", width: SLIDE.w, height: SLIDE.h });
  deck.layout = "SX";

  slides.forEach((slide, index) => {
    const page = deck.addSlide();

    /* THE OPENING SLIDE, only when the document actually had a title of its
       own. structure.js decides that, not this file, so a document without
       one does not get an invented one. */
    if (slide.lead && index === 0) {
      page.addText(slide.title || title, {
        x: MARGIN, y: SLIDE.h / 2 - 1, w: SLIDE.w - MARGIN * 2, h: 1.4,
        fontSize: 40, bold: true, color: INK.title, valign: "middle",
      });
      if (slide.bullets.length) {
        page.addText(slide.bullets.join("\n"), {
          x: MARGIN, y: SLIDE.h / 2 + 0.5, w: SLIDE.w - MARGIN * 2, h: 1.2,
          fontSize: 16, color: INK.body,
        });
      }
      return;
    }

    let y = MARGIN;

    if (slide.title) {
      page.addText(slide.title, {
        x: MARGIN, y, w: SLIDE.w - MARGIN * 2, h: 0.8,
        fontSize: 28, bold: true, color: INK.title,
      });
      y += 0.95;

      /* A hairline under the title. One line, the width of the text block,
         so every slide lines up with every other one. */
      page.addShape("line", {
        x: MARGIN, y: y - 0.12, w: SLIDE.w - MARGIN * 2, h: 0,
        line: { color: INK.rule, width: 1 },
      });
    }

    if (slide.bullets.length) {
      page.addText(
        slide.bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        {
          x: MARGIN, y, w: SLIDE.w - MARGIN * 2,
          h: slide.table ? 2.2 : SLIDE.h - y - MARGIN,
          fontSize: 18, color: INK.body, lineSpacingMultiple: 1.3, valign: "top",
        },
      );
      if (slide.table) y += 2.4;
    }

    if (slide.table) {
      /* The header row is told apart by weight and a light fill rather than
         a colour, so it still reads on a projector that washes colour out,
         and on a print in black and white. */
      const rows = [
        slide.table.header.map((text) => ({
          text,
          options: { bold: true, color: INK.title, fill: { color: "F3F4F6" } },
        })),
        ...slide.table.rows.map((row) => row.map((text) => ({ text, options: { color: INK.body } }))),
      ];

      page.addTable(rows, {
        x: MARGIN, y, w: SLIDE.w - MARGIN * 2,
        fontSize: 14, border: { type: "solid", color: INK.rule, pt: 1 },
        autoPage: false,
      });
    }
  });

  /* writeFile does the saving itself in a browser, so there is no blob to
     hand to the shared saver. */
  await deck.writeFile({ fileName: `${slugForFile(title)}.pptx` });
}
