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

/* --------------------------------------------------------------------------
   THE COMPANY'S OWN COLOUR, 2026-09-23

   companies.brand_color already exists. When it is set, it becomes the
   accent in every file, so a deck for Amara is in Amara's colour and a
   deck for the next company is in theirs. Everything else is worked out
   from that one colour, so nobody has to choose five.

   TWO GUARDS, because a brand colour is chosen for a logo, not for text:
     1. The accent carries white text (bands, table heads, the big figure).
        A light brand colour (a yellow, a pale blue) is darkened until white
        on it is readable.
     2. Anything that is not a real six digit colour is ignored, and the
        quiet navy default is used instead.
   -------------------------------------------------------------------------- */

function channels(color) {
  return [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/* Towards white (amount 1 is white) or black (negative). */
function mix(color, amount) {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(channels(color).map((v) => v + (target - v) * t));
}

/* How light a colour looks, 0 dark to 1 light, the way the eye weighs it. */
function lightness(color) {
  const [r, g, b] = channels(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function themeFor(brandColor) {
  const raw = String(brandColor ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return { ...THEME, highlight: mix(THEME.accent, 0.85), onAccentSoft: mix(THEME.accent, 0.92), kicker: mix(THEME.accent, -0.1) };
  }

  /* Darkened in small steps until white text on it passes a 4.5 to 1
     contrast, which is the usual bar for readable text. */
  let accent = raw.toUpperCase();
  for (let i = 0; i < 12 && (1.05 / (lightness(accent) + 0.05)) < 4.5; i += 1) accent = mix(accent, -0.12);

  return {
    ...THEME,
    accent,
    accentTint: mix(accent, 0.9),
    /* The label sitting on the dark band. Nearly white, with a breath of the
       brand in it. It was 62% of the way to white and read as grey on the
       band; Anthony, 2026-09-23: "even if a texts is supposed to be sub it
       should be readable too while maintaining its sub position." */
    highlight: mix(accent, 0.85),
    /* Secondary text on the accent (a figure's caption). Smaller than the
       main text, never faint. */
    onAccentSoft: mix(accent, 0.92),
    /* A slightly deeper version, for the small word under a card title. */
    kicker: mix(accent, -0.1),
  };
}
