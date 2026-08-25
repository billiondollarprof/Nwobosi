/* ==========================================================================
   ANIMATED LOGO
   The hero artifact. Two rings drawn as thick tubes, interlocked so one
   visibly passes through the other. They cannot be pulled apart.

   The colour does not sit still. Each ring carries a navy half and a purple
   half, and the boundary walks slowly around the circular path, so given
   time the navy arrives where the purple was and the purple where the navy
   was. It is done by rotating a gradient rather than by cutting the stroke
   into segments, which keeps the tube unbroken and the colour change soft.

   Read together: a closed loop with something circulating inside it that
   has no way out. Which is the product in one picture.
   ========================================================================== */

import { BRAND } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION: Geometry
   -------------------------------------------------------------------------- */

const R = 38;
const STROKE = 13;

const LEFT = { cx: 76, cy: 65 };
const RIGHT = { cx: 124, cy: 65 };

/* Where the circles cross. The top crossing is where the right ring dives
   under the left one, and that single moment is what sells the interlock. */
const CROSS_X = (LEFT.cx + RIGHT.cx) / 2;
const CROSS_Y = LEFT.cy - Math.sqrt(R * R - Math.pow((RIGHT.cx - LEFT.cx) / 2, 2));

/* How far the notch cutout reaches from the top crossing. Generous enough to
   cover the full width of the stroke overlap there, nowhere close to
   reaching the bottom crossing, which sits about 59 units further down. */
const NOTCH_REACH = STROKE * 1.6;

const SPIN = 7; // seconds for the colour to travel one full lap

/* --------------------------------------------------------------------------
   SECTION: Travelling gradient
   Navy at both ends and purple in the middle means the seam where the two
   meet is soft rather than a hard edge, and it stays seamless as it turns.
   -------------------------------------------------------------------------- */

function TravellingGradient({ id, cx, cy, from = 0 }) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={cx - R}
      y1={cy}
      x2={cx + R}
      y2={cy}
    >
      <stop offset="0%" stopColor={BRAND.navy} />
      <stop offset="50%" stopColor={BRAND.purple} />
      <stop offset="100%" stopColor={BRAND.navy} />
      <animateTransform
        attributeName="gradientTransform"
        type="rotate"
        from={`${from} ${cx} ${cy}`}
        to={`${from + 360} ${cx} ${cy}`}
        dur={`${SPIN}s`}
        repeatCount="indefinite"
      />
    </linearGradient>
  );
}

/* --------------------------------------------------------------------------
   SECTION: The mark
   -------------------------------------------------------------------------- */

export default function LogoAnimated({ size = 260, className = "" }) {
  const height = (size / 200) * 130;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height }}>
      {/* Ambient bloom behind the rings, on its own layer so it can breathe
          at a different pace to the colour travel. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${BRAND.purple}4D 0%, ${BRAND.navy}2E 40%, transparent 70%)`,
          filter: "blur(38px)",
          animation: "sx-ring-breathe 7s ease-in-out infinite",
        }}
      />

      <svg
        viewBox="0 0 200 130"
        width={size}
        height={height}
        fill="none"
        role="img"
        aria-label="StellaXafe"
        className="relative"
      >
        <defs>
          <TravellingGradient id="sx-grad-left" cx={LEFT.cx} cy={LEFT.cy} from={0} />
          <TravellingGradient id="sx-grad-right" cx={RIGHT.cx} cy={RIGHT.cy} from={140} />

          {/* The hole in the right ring has to be shaped exactly like the
              left ring's own stroke, or the seam between them shows as a
              dent or a sliver of gap. A plain round hole never fits a
              curved stroke edge cleanly. So the cutout is a copy of the
              left ring itself, clipped down to a small patch around the
              top crossing so it does not also blank out the bottom one. */}
          <clipPath id="sx-notch-clip">
            <circle cx={CROSS_X} cy={CROSS_Y} r={NOTCH_REACH} />
          </clipPath>

          <mask id="sx-interlock">
            <rect x="0" y="0" width="200" height="130" fill="white" />
            <g clipPath="url(#sx-notch-clip)">
              <circle
                cx={LEFT.cx}
                cy={LEFT.cy}
                r={R}
                stroke="black"
                strokeWidth={STROKE + 1.5}
                fill="none"
              />
            </g>
          </mask>

          <filter id="sx-logo-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Everything below moves as one piece, so the crossing stays
            fused through the stretch. Scaling the rings separately would
            let the hole above drift out of place mid animation. */}
        <g className="sx-mark-stretch" style={{ transformOrigin: `${CROSS_X}px ${LEFT.cy}px` }}>
          {/* Soft duplicate underneath, purely for glow */}
          <g filter="url(#sx-logo-glow)" opacity="0.45">
            <circle
              cx={LEFT.cx}
              cy={LEFT.cy}
              r={R}
              stroke="url(#sx-grad-left)"
              strokeWidth={STROKE}
              fill="none"
            />
            <circle
              cx={RIGHT.cx}
              cy={RIGHT.cy}
              r={R}
              stroke="url(#sx-grad-right)"
              strokeWidth={STROKE}
              fill="none"
            />
          </g>

          {/* Order is what creates the interlock. Left goes down first. Right
              goes on top, so it wins the bottom crossing. The mask punches a
              hole in the right ring at the top crossing, letting the left one
              show through. Over at one crossing, under at the other. */}
          <circle
            cx={LEFT.cx}
            cy={LEFT.cy}
            r={R}
            stroke="url(#sx-grad-left)"
            strokeWidth={STROKE}
            fill="none"
          />
          <g mask="url(#sx-interlock)">
            <circle
              cx={RIGHT.cx}
              cy={RIGHT.cy}
              r={R}
              stroke="url(#sx-grad-right)"
              strokeWidth={STROKE}
              fill="none"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
