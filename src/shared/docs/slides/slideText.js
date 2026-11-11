/* ==========================================================================
   SLIDE TEXT: MEASURING IT AND TURNING IT INTO SLIDE RUNS

   What this is: the two small jobs every slide drawing needs. How tall a
   piece of text will be, before it is placed. And the document's text runs
   (bold, italic, line breaks) as PowerPoint text runs.

   Why measuring comes first: everything on a slide is measured before
   anything is placed, so nothing is ever drawn over anything else. The
   estimate is deliberately a little generous: a box that ends early looks
   fine, a box that overflows does not. The look step (look/drawSlides.js)
   measures for real afterwards and reports anything that still spills.

   What it must never do: lose a word. Every run in comes out.
   ========================================================================== */

import { plainText, blockText } from "../documentModel.js";

/* --------------------------------------------------------------------------
   1. Measuring
   Calibri averages about half its point size per character.
   -------------------------------------------------------------------------- */

export function textHeight(chars, fontSize, width) {
  const perLine = Math.max(6, Math.floor((width * 72) / (fontSize * 0.52)));
  const lines = Math.max(1, Math.ceil(chars / perLine));
  return (lines * fontSize * 1.3 + fontSize * 0.5) / 72;
}

/* Several lines of text, each measured on its own (a line break starts a
   new line however short the line before it was). */
export function linesHeight(text, fontSize, width) {
  return String(text ?? "").split("\n").reduce((sum, line) => sum + textHeight(line.length + 2, fontSize, width), 0);
}

export function blocksHeight(blocks, fontSize, width) {
  return (blocks ?? []).reduce((sum, b) => sum + linesHeight(blockText(b), fontSize, width), 0);
}

/* How many lines a headline takes at a size. Bold capitals in Calibri
   measured about 0.46 of the point size per character on a render
   (2026-11-11); 0.52 leaves room for wider fonts copied from a company's
   own deck. A headline that still wraps further is reported by the look
   step (look/drawSlides.js), which measures the real text. */
export function headlineLines(text, size, width) {
  const perLine = Math.max(6, Math.floor((width * 72) / (size * 0.52)));
  return Math.max(1, Math.ceil(String(text ?? "").length / perLine));
}

/* --------------------------------------------------------------------------
   2. Runs
   `lit` is the colour bold words take. On a headline, a statement or a
   takeaway, the words the writer put in **bold** are the ones that light
   up in the brand colour, the way the second half of a headline does in a
   designed deck.
   -------------------------------------------------------------------------- */

export function slideRuns(runs, base, { lit = null, upper = false } = {}) {
  const out = [];
  for (const run of runs ?? []) {
    if (run.br) {
      if (out.length) out[out.length - 1].options.breakLine = true;
      continue;
    }
    const text = upper ? run.text.toUpperCase() : run.text;
    const options = { ...base, bold: run.bold || base.bold, italic: run.italic || base.italic };
    if (lit && run.bold) options.color = lit;
    out.push({ text, options });
  }
  return out;
}

/* A plain string as one run. */
export function oneRun(text, options) {
  return [{ text: String(text ?? ""), options }];
}

export { plainText, blockText };
