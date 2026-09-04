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
  /* The halo that sits behind the floating nav */
  navHalo: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDeep}, #0B1149, ${BRAND.purpleDeep}, ${BRAND.purple})`,
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
    "--seal-outer-hi": "rgba(255, 255, 255, 0.85)",
    "--seal-in-a": "#2E42E0",
    "--seal-in-mid": "#7C8CF5",
    "--seal-in-b": "#E8EBFF",
    /* The hero aura. One dominant hue with one orbiting at half its
       weight. Three colours at equal weight is the recipe for mud, which
       is exactly what the old four blob version produced. */
    "--aura-1": "rgba(88, 112, 248, 0.46)",
    "--aura-2": "rgba(124, 58, 237, 0.28)",
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
