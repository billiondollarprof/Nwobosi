/* ==========================================================================
   THE CONTAINMENT SEAL
   The product mark, at the size where it can carry its own idea.

   Two rings, one inside the other, with a bead of light running the
   channel between them. The bead never gets out. The outer ring is the
   company boundary, the inner ring is the model gateway, the bead is the
   company's data.

   MARK.md is the spec and this file follows it. Read that before changing
   anything here, because the mark has already drifted once: the concept
   lived in one repo, the code in another, and what shipped was two rings
   side by side, which is a silhouette somebody else owns.

   Only the idle state is built. MARK.md also specifies a verified pulse
   and a blocked bounce, and both wait on a real event to fire them. The
   same rule that governs the figures under the mark governs its motion:
   a mark that reports things that did not happen is worse than a mark
   that reports nothing.
   ========================================================================== */

import { useId } from "react";

import { BRAND } from "./tokens";

/* Geometry, on a 100 by 100 grid. Straight out of the spec. */
const OUTER_R = 44;
const INNER_R = 30;
const CHANNEL_R = 37;
const BEAD_R = 3.4;

/* The bead sits at the top of the channel and is carried round from
   there, so its resting position is one full radius above centre. */
const BEAD_Y = 50 - CHANNEL_R;

/* The specular: a short arc inset on the upper left shoulder of the inner
   ring, where a fixed light would catch a tube. Drawn at a slightly
   smaller radius than the ring so it sits on the inner edge. */
const SHEEN = "M 22.9 45.2 A 27.5 27.5 0 0 1 47.6 22.6";

export default function ContainmentSeal({ size = 280, className = "" }) {
  /* This renders more than once per page, and SVG gradient and filter ids
     are document wide. Without namespacing, the second copy silently
     picks up the first one's definitions. */
  const uid = useId();
  const inner = `${uid}-inner`;
  const bloom = `${uid}-bloom`;
  const soft = `${uid}-soft`;
  const beadGlow = `${uid}-bead`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="StellaXafe"
    >
      <defs>
        {/* Lower left to upper right, and it has to carry all the way to
            near white. Stopping it at navy is what makes the ring read as
            a progress meter instead of light moving through a channel. */}
        <linearGradient id={inner} x1="18" y1="82" x2="82" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--seal-in-a)" />
          <stop offset="52%" stopColor="var(--seal-in-mid)" />
          <stop offset="100%" stopColor="var(--seal-in-b)" />
        </linearGradient>

        <filter id={bloom} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.2" />
        </filter>
        <filter id={soft} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id={beadGlow} x="-160%" y="-160%" width="420%" height="420%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* ------------------------------------------------------------------
          The boundary
          A thin cool hairline that stays visible. Earlier drafts had it at
          22% and it disappeared, which takes the whole idea with it: one
          visible ring is not a channel and cannot contain anything.
          ------------------------------------------------------------------ */}
      <circle cx="50" cy="50" r={OUTER_R} stroke="var(--seal-outer)" strokeWidth="1.6" />
      <circle
        cx="50"
        cy="50"
        r={OUTER_R}
        stroke="var(--seal-outer-hi)"
        strokeWidth="1.6"
        strokeDasharray="26 250"
        strokeLinecap="round"
        style={{ animation: "sx-seal-drift 60s linear infinite" }}
      />

      {/* ------------------------------------------------------------------
          The gateway
          Built as a lit tube in three layers, not as a stroke. The bloom
          underneath is what makes the light look like it comes out of the
          ring rather than being painted on it.
          ------------------------------------------------------------------ */}
      <circle
        cx="50"
        cy="50"
        r={INNER_R}
        stroke={`url(#${inner})`}
        strokeWidth="15"
        opacity="0.3"
        filter={`url(#${bloom})`}
      />
      <circle cx="50" cy="50" r={INNER_R} stroke={`url(#${inner})`} strokeWidth="7" />
      <path
        d={SHEEN}
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        filter={`url(#${soft})`}
        style={{ animation: "sx-seal-sheen 7s ease-in-out infinite" }}
      />

      {/* ------------------------------------------------------------------
          The data
          One lap every ten seconds. Slow enough to be calm, fast enough
          that you know it is alive. The group rotates, the bead does not,
          so the bead itself never appears to spin on its own axis.
          ------------------------------------------------------------------ */}
      <g
        style={{
          transformOrigin: "50px 50px",
          animation: "sx-seal-orbit 10s linear infinite",
        }}
      >
        <circle
          cx="50"
          cy={BEAD_Y}
          r="5.4"
          fill={BRAND.gold}
          filter={`url(#${beadGlow})`}
          style={{
            transformOrigin: `50px ${BEAD_Y}px`,
            animation: "sx-seal-breathe 4s ease-in-out infinite",
          }}
        />
        <circle cx="50" cy={BEAD_Y} r={BEAD_R} fill={BRAND.goldCore} />
      </g>
    </svg>
  );
}
