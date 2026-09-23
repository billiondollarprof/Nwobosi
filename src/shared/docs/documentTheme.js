/* ==========================================================================
   HOW EVERY FILE LOOKS

   One set of colours, sizes and spacing for the PDF, the Word file, the
   slides and the spreadsheet, so a company that downloads the same work in
   two formats gets two files that obviously belong together.

   WHY IT IS QUIET
   These files go out under the COMPANY's name, to the company's own
   clients. They are not a place for StellaXafe to show its own colours. So
   the look is a calm business document: dark ink, one accent colour for
   headings and table heads, generous white space, nothing decorative.

   THE ACCENT IS ONE VALUE ON PURPOSE
   When a company's brand colour is stored, it goes in `accent` and every
   format picks it up. Until then it is a deep navy that sits well next to
   any brand. Colours are six hex digits with no "#", because that is what
   Word, PowerPoint and Excel all take. The PDF writer adds the "#" itself.
   ========================================================================== */

export const THEME = {
  ink: "111827",       // headings and titles
  body: "374151",      // running text
  muted: "6B7280",     // subtitles, captions, page numbers
  accent: "1E3A8A",    // heading colour, rules, table heads
  accentTint: "EEF2FF",// the soft fill behind a table head or a quote
  rule: "E5E7EB",      // hairlines between table rows
  zebra: "F9FAFB",     // every other table row

  /* Word, Slides and the Spreadsheet name a font the reader's computer
     already has. Calibri is on every Office install and has the naira sign.
     The PDF carries its own font inside the file, see pdf.js. */
  officeFont: "Calibri",

  /* Sizes in points, for print. The slides use their own, larger set. */
  size: { title: 24, subtitle: 12, h1: 16, h2: 13.5, h3: 12, body: 10.5, small: 8.5 },
};

/* "1E3A8A" to "#1E3A8A", for the writers that want CSS style colours. */
export function hex(color) {
  return `#${color}`;
}
