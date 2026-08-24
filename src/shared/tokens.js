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

export const THEME_VARS = {
  dark: {
    "--bg": "#000000",
    "--surface": "rgba(255, 255, 255, 0.05)",
    "--surface-solid": "#0A0A0A",
    "--surface-2": "rgba(255, 255, 255, 0.035)",
    "--nav-surface": "rgba(0, 0, 0, 0.62)",
    "--chip": "#1C1C1E",
    "--border": "rgba(255, 255, 255, 0.1)",
    "--border-2": "rgba(255, 255, 255, 0.18)",
    "--text-1": "#F5F5F7",
    "--text-2": "#9A9AA5",
    "--text-3": "#6E6E76",
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
  },
};

/* --------------------------------------------------------------------------
   SECTION: Type
   -------------------------------------------------------------------------- */

export const FONTS = {
  display: "'Sora', sans-serif",
  body: "'DM Sans', sans-serif",
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
