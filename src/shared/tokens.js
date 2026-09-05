/* ==========================================================================
   DESIGN TOKENS
   Every surface in the app reads from here. Change a value once and the
   chat, admin, landing, and auth pages all move together.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION: Brand
   -------------------------------------------------------------------------- */

export const BRAND = {
  navy: "#1420A0",
  /* The navy the brand navy becomes when it has to hold its own next to
     the purple on a dark ground. #1420A0 reads as almost black there. */
  navyLift: "#2E42E0",
  navyDeep: "#08113A",
  purple: "#7C3AED",
  purpleDeep: "#4C1D95",
  cyan: "#00C4CC",
  green: "#16B04A",
  amber: "#E8980A",
  red: "#E53E3E",
  accentSoft: "#5870F8",
  /* The bead in the mark, and the only warm colour the brand owns. It is
     reserved for the thing being protected, so it never becomes a general
     purpose accent. See MARK.md. */
  gold: "#F5A820",
  goldCore: "#FFC24D",
};

export const GRADIENTS = {
  /* Primary action buttons */
  action: `linear-gradient(135deg, ${BRAND.navyDeep}, ${BRAND.navy})`,
  /* Avatars and brand marks */
  brand: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.purple})`,
  /* Usage meters and progress bars */
  meter: `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.purple})`,
  /* The rotating ring on the idle mic button */
  micRing: `conic-gradient(from 0deg, ${BRAND.navy}, ${BRAND.purple}, ${BRAND.cyan}, ${BRAND.navy})`,
};

/* --------------------------------------------------------------------------
   SECTION: Themes
   Dark is true black, not navy. Light stays bright and airy. Both are
   consumed as CSS custom properties so child components never branch on
   the active theme.
   -------------------------------------------------------------------------- */

/* Dark is a near black carrying a faint blue cast, not pure #000000. A
   pure black ground is the thing that makes a dark product look cheap:
   nothing sits on it, it just sits behind everything. A chosen dark reads
   as a surface. It stays cool, never warmed toward brown, because the gold
   bead in the mark is the only warm thing in the brand and warming the
   ground costs it the contrast that makes it the focal point. */
export const THEME_VARS = {
  dark: {
    "--bg": "#05060D",
    "--surface": "rgba(255, 255, 255, 0.05)",
    "--surface-solid": "#0B0D15",
    "--surface-2": "rgba(255, 255, 255, 0.035)",
    "--nav-surface": "rgba(5, 6, 13, 0.62)",
    "--chip": "#171922",
    "--border": "rgba(255, 255, 255, 0.1)",
    "--border-2": "rgba(255, 255, 255, 0.18)",
    "--text-1": "#F5F5F7",
    "--text-2": "#9A9AA5",
    "--text-3": "#6E6E76",
    /* The mark. Named here so it flips with the theme like everything
       else, rather than the component branching on which theme is on. */
    "--seal-outer": "rgba(255, 255, 255, 0.34)",
    /* A glint travelling the outer ring, not a second ring. At 0.85 over a
       0.34 base it read as the ring being broken open at that point. */
    "--seal-outer-hi": "rgba(255, 255, 255, 0.6)",
    "--seal-in-a": "#2E42E0",
    "--seal-in-mid": "#7C8CF5",
    "--seal-in-b": "#E8EBFF",
    /* The hero aura. One dominant hue with one orbiting at half its
       weight. Three colours at equal weight is the recipe for mud, which
       is exactly what the old four blob version produced. */
    "--aura-1": "rgba(88, 112, 248, 0.46)",
    "--aura-2": "rgba(124, 58, 237, 0.28)",
    /* The sweep: light entering from the top left and opening across the
       hero, rather than a symmetrical halo behind the mark. It is what
       gives the section a direction to be lit from. */
    "--sweep-a": "rgba(46, 66, 224, 0.42)",
    "--sweep-b": "rgba(124, 58, 237, 0.20)",
    /* Film grain over the whole page, and the lit horizon the hero closes
       on. See index.css for why both exist. */
    "--grain": "0.055",
    "--floor-fill": "rgba(46, 66, 224, 0.10)",
    "--floor-edge": "rgba(124, 140, 255, 0.22)",
    "--field-ring": "rgba(140, 160, 255, 0.10)",
    /* How far a buried card in a stack recedes, and the shadow the card
       above casts onto it. On a dark ground receding means going into
       shadow, so it can be heavy. See CardStack.jsx. */
    "--stack-darken": "0.42",
    "--stack-shadow": "0 -14px 44px -20px rgba(0, 0, 0, 0.75)",
    /* The raised surface: a light edge along the top, a gradient that is
       a touch brighter where the light hits, and two shadows. */
    "--card-sheen": "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0) 42%)",
    "--card-edge": "rgba(255, 255, 255, 0.14)",
    "--card-lift": "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 12px 28px -18px rgba(0,0,0,0.8), 0 2px 6px -4px rgba(0,0,0,0.6)",
    /* The hero panel sits closer to the viewer than any other surface, so
       it is lighter than the cards and throws a much longer shadow. On a
       near black ground a panel the same colour as its background is not a
       raised object, it is a slightly different rectangle. */
    "--panel-raised": "#13161F",
    "--panel-drop": "0 44px 90px -46px rgba(0,0,0,0.95), 0 12px 34px -20px rgba(0,0,0,0.7)",
    /* The sweep inside the second headline line. On dark it lifts toward
       white. */
    "--h-a": "#5870F8",
    "--h-b": "#9F5AF5",
    "--h-sheen": "#E4E9FF",
  },
  light: {
    "--bg": "#F6F7FC",
    "--surface": "rgba(255, 255, 255, 0.8)",
    "--surface-solid": "#FFFFFF",
    "--surface-2": "rgba(249, 250, 255, 0.75)",
    "--nav-surface": "rgba(255, 255, 255, 0.78)",
    "--chip": "#EEF0F8",
    "--border": "rgba(232, 234, 242, 0.9)",
    "--border-2": "rgba(208, 213, 232, 0.9)",
    "--text-1": "#0A0F2E",
    "--text-2": "#424668",
    "--text-3": "#7880A8",
    "--seal-outer": "rgba(8, 17, 58, 0.30)",
    "--seal-outer-hi": "rgba(8, 17, 58, 0.72)",
    "--seal-in-a": "#2030C8",
    "--seal-in-mid": "#17257A",
    "--seal-in-b": "#08113A",
    /* Roughly a third of the dark weight. A light ground shows every bit
       of dirt that black hides, so the same alphas that read as
       atmosphere on black read as a stain here. */
    "--aura-1": "rgba(88, 112, 248, 0.14)",
    "--aura-2": "rgba(124, 58, 237, 0.07)",
    "--sweep-a": "rgba(46, 66, 224, 0.13)",
    "--sweep-b": "rgba(124, 58, 237, 0.06)",
    /* A third of the weight. Noise on white reads as dirt long before it
       reads as texture. */
    "--grain": "0.02",
    "--floor-fill": "rgba(46, 66, 224, 0.05)",
    "--floor-edge": "rgba(46, 66, 224, 0.14)",
    "--field-ring": "rgba(46, 66, 224, 0.09)",
    /* Barely anything. Darkening a white card does not read as depth, it
       reads as a grey card, which is what the light stack looked like.
       On a light ground the shadow does the work instead. */
    "--stack-darken": "0.07",
    "--stack-shadow": "0 -16px 40px -22px rgba(20, 32, 90, 0.35)",
    "--card-sheen": "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0) 46%)",
    "--card-edge": "rgba(255, 255, 255, 0.95)",
    "--card-lift": "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 14px 30px -20px rgba(20,32,90,0.28), 0 2px 6px -4px rgba(20,32,90,0.14)",
    "--panel-raised": "#FFFFFF",
    "--panel-drop": "0 44px 90px -50px rgba(20,32,90,0.45), 0 12px 34px -22px rgba(20,32,90,0.22)",
    /* The sheen has to darken, not lighten. Sweeping toward near white on
       a white page made the last word of the headline disappear as the
       band passed over it. */
    "--h-a": "#3B4FD8",
    "--h-b": "#7C3AED",
    "--h-sheen": "#8B5CF6",
  },
};

/* --------------------------------------------------------------------------
   SECTION: Type
   -------------------------------------------------------------------------- */

export const FONTS = {
  display: "'Sora', sans-serif",
  body: "'DM Sans', sans-serif",
  /* Only the Amara wordmark uses this. It is a different product with its
     own identity, and setting it in the app's own face would quietly
     rebrand somebody else's logo. */
  serif: "'Fraunces', Georgia, serif",
};

/* --------------------------------------------------------------------------
   SECTION: Shape
   -------------------------------------------------------------------------- */

export const RADIUS = {
  chip: "10px",
  control: "12px",
  panel: "18px",
  menu: "20px",
  pill: "999px",
};

/* --------------------------------------------------------------------------
   SECTION: Status colors
   Used by sync states, upload states, and generation states.
   -------------------------------------------------------------------------- */

export const STATUS = {
  ok: BRAND.green,
  pending: BRAND.amber,
  error: BRAND.red,
};
