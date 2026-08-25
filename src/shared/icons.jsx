/* ==========================================================================
   ICONS
   The product mark plus the connector glyphs. Connector glyphs are drawn
   inline rather than pulled from a sprite so they keep their brand colors
   in both themes.
   ========================================================================== */

import { useId } from "react";
import { BRAND } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION: Product mark
   The small still version of the hero mark, same interlocked rings, same
   zero gap fuse at the crossing, just square and frozen. Used everywhere
   the wordmark needs an icon beside it: nav bars, the chat sidebar, the
   footer. It used to be two blend mode discs that only vaguely gestured at
   the real logo, this is the actual thing at a small size, not a stand in.

   IDs are namespaced with useId because this renders more than once on the
   same page (nav and footer both show it), and SVG gradient/mask ids have
   to be unique per document or the second copy can point at the wrong def.
   -------------------------------------------------------------------------- */

export function LogoMark({ size = 26 }) {
  const uid = useId();
  const left = `${uid}-left`;
  const right = `${uid}-right`;
  const mask = `${uid}-mask`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="StellaXafe">
      <defs>
        <linearGradient id={left} x1="9" y1="50" x2="59" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={BRAND.navy} />
          <stop offset="50%" stopColor={BRAND.purple} />
          <stop offset="100%" stopColor={BRAND.navy} />
        </linearGradient>
        <linearGradient id={right} x1="41" y1="50" x2="91" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={BRAND.navy} />
          <stop offset="50%" stopColor={BRAND.purple} />
          <stop offset="100%" stopColor={BRAND.navy} />
        </linearGradient>
        {/* Same fuse as the hero mark and the favicon: the cutout is a short
            arc of the left ring's own stroke, same centre and radius, not a
            round hole clipped to size, so nothing can render it a pixel off. */}
        <mask id={mask}>
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <path
            d="M 37.6 25.261 A 25 25 0 0 1 57.681 41.987"
            stroke="black"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </mask>
      </defs>
      <circle cx="34" cy="50" r="25" fill="none" stroke={`url(#${left})`} strokeWidth="8.5" />
      <g mask={`url(#${mask})`}>
        <circle cx="66" cy="50" r="25" fill="none" stroke={`url(#${right})`} strokeWidth="8.5" />
      </g>
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
