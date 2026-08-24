/* ==========================================================================
   ICONS
   The product mark plus the connector glyphs. Connector glyphs are drawn
   inline rather than pulled from a sprite so they keep their brand colors
   in both themes.
   ========================================================================== */

import { BRAND } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION: Product mark
   Two overlapping discs. Screen blend keeps the overlap bright on dark.
   -------------------------------------------------------------------------- */

export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={(size / 40) * 28} viewBox="0 0 40 28" fill="none">
      <circle cx="15" cy="14" r="12" fill={BRAND.navy} fillOpacity="0.85" />
      <circle
        cx="25"
        cy="14"
        r="12"
        fill={BRAND.purple}
        fillOpacity="0.85"
        style={{ mixBlendMode: "screen" }}
      />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Connector glyphs
   -------------------------------------------------------------------------- */

export function GmailIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#FFFFFF" stroke="#E0E0E0" />
      <path
        d="M2 6l10 7 10-7"
        fill="none"
        stroke="#EA4335"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DriveIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points="8.5,3 15.5,3 22,14 15,14" fill="#FFC107" />
      <polygon points="8.5,3 15,14 8,21 1.5,14" fill="#4285F4" />
      <polygon points="1.5,14 8,21 19,21 15,14" fill="#34A853" />
    </svg>
  );
}

export function SlackIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="9" y="2" width="4" height="9" rx="2" fill="#36C5F0" />
      <rect x="13" y="13" width="4" height="9" rx="2" fill="#2EB67D" />
      <rect x="13" y="2" width="9" height="4" rx="2" fill="#ECB22E" />
      <rect x="2" y="13" width="9" height="4" rx="2" fill="#E01E5A" />
    </svg>
  );
}

export function CanvaIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="sx-canva-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#8B3EFF" />
          <stop offset="100%" stopColor="#00C4CC" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#sx-canva-grad)" />
      <path
        d="M7 13.2c0 2.1 1.6 3.4 3.6 3.4 1.1 0 2-.4 2.6-1v.7h1.9V9.6h-1.9v4.6c-.4.6-1.1 1-1.9 1-1 0-1.7-.6-1.7-1.9V9.6H7.6z"
        fill="#fff"
      />
    </svg>
  );
}
