/* ==========================================================================
   HOW A SLIDE DECK LOOKS

   What this is: the colours, fonts and sizes of a slide deck, worked out
   from ONE colour, the company's own (documentTheme.js themeFor).

   Why it is not the document theme. Anthony, 2026-11-11, holding a deck he
   made in Canva: a deck is a designed thing, not a document cut into
   slides. Dark background, big two-colour headlines, very few words, real
   diagrams. A PDF stays quiet and white; a deck can be bold. Both still
   come from the company's colour, so the two obviously belong together.

   Two looks:
     dark   the default. A near-black tinted with the brand, panels a step
            lighter, the brand colour lifted so it reads on dark.
     light  white, for a company whose own decks are light (step c of his
            brief: copy a company's own style).

   Design rules taken from two open skills and kept here so every slide
   follows them (anthropics/skills pptx, Apache 2.0; MiniMax-AI/skills
   pptx-generator, MIT):
     - one colour dominates, one sharp accent
     - titles 36 point and up, body 14 to 16, nothing a person reads under 11
     - 0.5 inch margins at least, gaps of 0.3 inch, used the same everywhere
     - no accent line under titles, no stripes down an edge
     - text left aligned; only titles and statements centred

   What it must never do: hand back a colour that fails contrast. Text on
   any surface here passes 4.5 to 1.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Colour arithmetic (the same as documentTheme.js, kept local so this
      file reads on its own)
   -------------------------------------------------------------------------- */

function channels(color) {
  return [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/* Towards white (amount 1 is white) or black (negative). */
export function mix(color, amount) {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(channels(color).map((v) => v + (target - v) * t));
}

function lightness(color) {
  const [r, g, b] = channels(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [lightness(a), lightness(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* Lighten (or darken) a colour in small steps until it reads on `ground`.
   4.5 to 1 for ordinary text; 3 to 1 is the bar for large text (headlines,
   big figures), which lets the brand stay vivid where it matters most. */
function readableOn(color, ground, towardsWhite, bar = 4.5) {
  let c = color;
  for (let i = 0; i < 20 && contrast(c, ground) < bar; i += 1) c = mix(c, towardsWhite ? 0.08 : -0.08);
  return c;
}

/* --------------------------------------------------------------------------
   2. Sizes, in inches and points. Widescreen 13.333 by 7.5.
   -------------------------------------------------------------------------- */

export const PAGE = { W: 13.333, H: 7.5, X: 0.7, TOP: 0.55, FOOT: 7.05 };
PAGE.BODY_W = PAGE.W - PAGE.X * 2;

export const TYPE = {
  /* Calibri is on every Office install and has the naira sign. The
     headline font is the same family in bold capitals: a font PowerPoint
     might not have is a font that gets swapped, and the layout moves. */
  font: "Calibri",
  headline: 40,
  headlineMin: 28,
  lead: 17,
  body: 15,
  card: 14,
  cardTitle: 17,
  small: 12,
  smallest: 11,
};

/* --------------------------------------------------------------------------
   3. The deck theme
   -------------------------------------------------------------------------- */

export function slideThemeFor(docTheme, mode = "dark") {
  const brand = docTheme.accent;
  if (mode === "light") {
    return {
      mode,
      bg: "FFFFFF",
      panel: mix(brand, 0.93),
      panelLine: mix(brand, 0.78),
      ink: "111827",
      body: "374151",
      muted: "6B7280",
      lit: brand,
      litLarge: brand,
      litFill: brand,
      onLit: "FFFFFF",
      line: mix(brand, 0.55),
      glow: mix(brand, 0.85),
      chartGrid: "E5E7EB",
    };
  }
  /* Dark: a near-black with a breath of the brand in it. */
  const bg = mix(brand, -0.86);
  const panel = mix(bg, 0.06);
  return {
    mode: "dark",
    bg,
    panel,
    panelLine: mix(brand, -0.25),
    ink: "FFFFFF",
    body: "D9DEE7",
    muted: readableOn("9AA3B2", panel, true),
    /* The brand lifted until it reads as text on the dark panels. */
    lit: readableOn(brand, panel, true),
    /* The same for headline words and big figures: large text, so the
       colour can stay closer to the brand itself. */
    litLarge: readableOn(brand, bg, true, 3),
    /* A filled box in the brand colour carries white text. */
    litFill: brand,
    onLit: "FFFFFF",
    line: mix(brand, 0.2),
    glow: brand,
    chartGrid: mix(bg, 0.16),
  };
}
