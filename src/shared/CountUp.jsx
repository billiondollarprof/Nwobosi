/* ==========================================================================
   COUNT UP
   A number that runs up to its value when the reader reaches it.

   Two rules it has to keep.

   The number on the page is the number in the data. The easing is on the
   way there, never on the destination, and it always finishes on the exact
   value including its suffix. A statistic that lands on 68% because a
   frame was dropped is worse than no animation at all.

   It is readable without JavaScript and without motion. The value is in
   the markup from the first render, and if the observer is missing or the
   reader has asked for calmer motion, it simply sits there.

   Give it the whole string. "69%", "40%", "10 min" all work: the leading
   number is what counts, everything after it is carried along.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";

const DURATION = 1100;

/* Out cubic. Fast at the start, easing into the final value, which is what
   makes a counter look like it is arriving rather than stopping. */
const ease = (t) => 1 - Math.pow(1 - t, 3);

function parse(value) {
  const match = String(value).match(/^(\D*)(\d[\d,.]*)(.*)$/s);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  const dot = digits.indexOf(".");
  return { prefix, suffix, target, decimals: dot === -1 ? 0 : digits.length - dot - 1 };
}

export default function CountUp({ value, className = "", style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);
  const parsed = parse(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let running = false;
    let played = false;

    function run() {
      running = true;
      const start = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - start) / DURATION);
        const n = parsed.target * ease(t);
        setShown(`${parsed.prefix}${n.toFixed(parsed.decimals)}${parsed.suffix}`);
        if (t < 1) {
          frame = requestAnimationFrame(step);
        } else {
          /* Land on the string that was passed in, not on a rounded
             reconstruction of it. */
          setShown(value);
          running = false;
        }
      };

      frame = requestAnimationFrame(step);
    }

    /* The resting value is always the real one. An earlier version parked
       it at zero whenever the observer said "out of view", which was wrong
       twice over. The observer says "out" long before a card leaves the
       screen, so a fully visible statistic sat there reading 0%. And 0%
       under "Projected shadow AI incidents" is not a missing number, it is
       a different and false claim, on the one page that must never carry
       one. Zero now exists only inside the animation. */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          /* Re-arms on the way out, so coming back to it plays again
             rather than showing a number that already happened. */
          if (entry.isIntersecting) {
            if (!running && !played) {
              played = true;
              run();
            }
          } else if (!running) {
            played = false;
          }
        }
      },
      /* Generous. A tall card inside a sticky stack may never expose 40%
         of itself inside a shrunk root, and the old threshold meant it
         simply never fired. */
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    /* value is the whole input; parsed is derived from it every render, so
       comparing the string is what actually decides whether to restart. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className} style={style}>
      {shown}
    </span>
  );
}
