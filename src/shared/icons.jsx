/* ==========================================================================
   ICONS
   The product mark plus the connector glyphs. Connector glyphs are drawn
   inline rather than pulled from a sprite so they keep their brand colors
   in both themes.
   ========================================================================== */

import { useId } from "react";
import { BRAND, FONTS } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION: Product mark
   The Containment Seal, still and small. Used everywhere the wordmark
   needs an icon beside it: nav bars, the chat sidebar, the footer.

   Same geometry as the full mark in ContainmentSeal.jsx, with the bloom
   and the specular dropped, because both are invisible at this size and
   only cost paint. The bead freezes at one o'clock in the channel, and it
   is drawn larger than the spec radius: at 26 pixels a true 3.5 bead is
   under a pixel across and simply disappears, and the bead is a third of
   the silhouette.

   Below 24 pixels the strokes change so both rings still read as two
   rings. If a size cannot hold two rings and a bead it is too small for
   the mark, and the wordmark should carry it alone. See MARK.md.

   IDs are namespaced with useId because this renders more than once on the
   same page (nav and footer both show it), and SVG gradient ids have to be
   unique per document or the second copy can point at the wrong def.
   -------------------------------------------------------------------------- */

export function LogoMark({ size = 26 }) {
  const uid = useId();
  const inner = `${uid}-inner`;
  const tiny = size < 24;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="StellaXafe">
      <defs>
        <linearGradient id={inner} x1="18" y1="82" x2="82" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--seal-in-a)" />
          <stop offset="52%" stopColor="var(--seal-in-mid)" />
          <stop offset="100%" stopColor="var(--seal-in-b)" />
        </linearGradient>
      </defs>

      {/* The boundary */}
      <circle cx="50" cy="50" r="44" stroke="var(--seal-outer)" strokeWidth={tiny ? 3 : 2} />

      {/* The gateway */}
      <circle cx="50" cy="50" r="30" stroke={`url(#${inner})`} strokeWidth={tiny ? 5 : 6.5} />

      {/* The data, held at one o'clock in the channel */}
      <circle cx="76.2" cy="23.8" r={tiny ? 5.5 : 5} fill={BRAND.gold} />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Lockup
   The mark and the name together, with one rule about how they sit.

   Anchored to a corner, they run side by side, mark first, the way the eye
   reads a line. Centred, they stack, mark above the name. A centred
   side-by-side pair has two competing middles, the middle of the pair and
   the middle of the name, and neither lands where the eye expects. Stacking
   gives the whole thing one shared centre line.

   So: side by side in a corner, stacked in the middle. That is the whole
   rule, and keeping it in one component is what stops it drifting.
   -------------------------------------------------------------------------- */

export function LogoLockup({ stacked = false, size = 26, textClass = "text-[16px]" }) {
  const name = (
    <span className={`font-bold tracking-tight ${textClass}`} style={{ fontFamily: FONTS.display }}>
      StellaXafe
    </span>
  );

  if (stacked) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <LogoMark size={size} />
        {name}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {name}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Sister product marks
   Amara and XALOM are their own products under the same umbrella, so they
   keep their own marks rather than being restyled into this one's.

   Amara's wordmark is set rather than pictured: a serif face, with the
   second half in its gold. Drawn as type it stays sharp at any size and
   flips theme with everything else, which a flattened screenshot of a
   logo cannot do.
   -------------------------------------------------------------------------- */

export function AmaraWordmark({ size = "1.15rem" }) {
  return (
    <span
      style={{ fontFamily: FONTS.serif, fontWeight: 600, fontSize: size, letterSpacing: "-0.01em" }}
    >
      <span style={{ color: "var(--text-1)" }}>Am</span>
      <span style={{ color: "#D4A017" }}>ara</span>
    </span>
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

/* Notion's mark is a page with a hard edged N whose diagonal is drawn as a
   solid wedge rather than a stroke. Keeping the white page behind it is
   what makes it read as Notion on a dark background instead of a generic
   letter in a box. */
export function NotionIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#FFFFFF" stroke="#E3E3E1" />
      <path d="M7.6 7.2v9.6h1.9V11l4.6 5.8h2.3V7.2h-1.9v5.6L9.9 7.2z" fill="#0F0F0F" />
    </svg>
  );
}

/* Canva's app mark: the script C in white on their teal to purple
   gradient, in a rounded square. The wordmark version of their logo is
   unreadable at 18px, so this is the right one of the two to use here.

   The C is drawn as a round capped arc opening to the right rather than
   a filled letterform. Canva's real C tapers at both terminals, which a
   single stroke cannot do, but at this size the round caps read the same
   and the shape stays unmistakably theirs. */
export function CanvaIconGlyph({ size = 18 }) {
  const uid = useId();
  const grad = `${uid}-canva`;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Canva">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00C4CC" />
          <stop offset="100%" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="11" fill={`url(#${grad})`} />
      <path
        d="M31.5 13.4 A 13 13 0 1 0 31.5 34.6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
