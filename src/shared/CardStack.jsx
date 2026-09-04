/* ==========================================================================
   CARD STACK
   Cards that anchor as you reach them, let the next one slide over the
   top, and sink back as it does. The pile builds, then the whole thing
   releases and the page moves on.

   The first attempt at this was wrong in three ways, and it is worth
   writing them down because they are the three things that make the
   difference between a pile and a list that happens to stick:

     1. Every card must share the same `top`. Ramping the offsets so each
        one parks lower than the last gives you a staircase, not a stack.
     2. Every card must be the same height. Cards sized by their own
        content leave ragged slivers showing and the pile reads as an
        accident. Heights are measured here and levelled.
     3. The card underneath must recede. Scaling it down a little and
        dimming it as the next one covers it is the entire illusion of
        depth. Without it the cards look pasted flat on top of each other.

   Progress is measured from the next card's distance rather than driven
   by a transition, so the movement tracks the finger exactly. Scroll
   handling is throttled to a frame, and it reads geometry in one pass
   before writing styles in another, so it never forces a synchronous
   layout mid scroll.
   ========================================================================== */

import { Children, useEffect, useLayoutEffect, useRef, useState } from "react";

/* How far the buried card shrinks and darkens at full cover. Small
   numbers. The effect should register as depth, not as the card running
   away.

   Darkening is done with brightness rather than opacity, and that is not a
   style preference. A card faded with opacity is see through, so the card
   buried under it shows its text straight through the one on top, and the
   pile turns into two sets of words on top of each other. Brightness
   leaves the card opaque and simply sends it back into the dark. */
const SCALE_DROP = 0.055;
const DARKEN = 0.42;

export default function CardStack({
  children,
  top = 92,
  dwell = "26vh",
  /* Above this width the caller's own layout takes over. Three cards side
     by side on a wide screen are already read in one glance, and stacking
     them there would make the reader scroll for something they can
     already see. */
  stackBelow = 1024,
  className = "",
}) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const items = Children.toArray(children);

  /* Off for reduced motion, off on wide screens, off with nothing to
     stack. Re-checked on rotation and resize. */
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (items.length < 2) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia(`(max-width: ${stackBelow - 1}px)`);
    const decide = () => setEnabled(!calm.matches && narrow.matches);

    decide();
    calm.addEventListener("change", decide);
    narrow.addEventListener("change", decide);
    return () => {
      calm.removeEventListener("change", decide);
      narrow.removeEventListener("change", decide);
    };
  }, [items.length, stackBelow]);

  /* Level the heights. A stack of different sized cards shows the edges of
     the ones underneath at different depths, which reads as a mistake
     rather than as a pile. */
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const cards = [...ref.current.querySelectorAll("[data-stack-card]")];
    if (!cards.length) return;

    function level() {
      cards.forEach((c) => (c.style.minHeight = ""));
      const tallest = Math.max(...cards.map((c) => c.offsetHeight));
      cards.forEach((c) => (c.style.minHeight = `${tallest}px`));
    }

    level();
    const observer = new ResizeObserver(level);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled, items.length]);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const slots = [...ref.current.querySelectorAll("[data-stack-slot]")];
    if (slots.length < 2) return;

    let frame = 0;

    function apply() {
      frame = 0;
      const viewport = window.innerHeight;

      /* Read everything first, then write. Interleaving the two makes the
         browser recompute layout on every card, every frame. */
      const tops = slots.map((s) => s.getBoundingClientRect().top);

      slots.forEach((slot, i) => {
        const card = slot.querySelector("[data-stack-card]");
        if (!card) return;

        /* The last card is never covered, so it never recedes. */
        if (i === slots.length - 1) {
          card.style.transform = "";
          card.style.filter = "";
          return;
        }

        /* Zero when the next card is still a viewport away, one when it has
           arrived at the shared anchor and is sitting right on top. */
        const travel = viewport - top;
        const progress = travel <= 0 ? 0 : Math.min(1, Math.max(0, 1 - (tops[i + 1] - top) / travel));

        card.style.transform = `scale(${1 - progress * SCALE_DROP})`;
        card.style.filter = `brightness(${1 - progress * DARKEN})`;
      });
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, top, items.length]);

  if (!enabled) {
    return <div className={className}>{items}</div>;
  }

  return (
    <div ref={ref} className={`sx-stack ${className}`}>
      {items.map((child, i) => (
        <div
          key={i}
          data-stack-slot
          className="sx-stack-slot"
          /* Same anchor for every card. The dwell below it is what gives
             each card its turn before the next one arrives. */
          style={{ top: `${top}px`, marginBottom: i === items.length - 1 ? 0 : dwell }}
        >
          <div data-stack-card className="sx-stack-card">
            {child}
          </div>
        </div>
      ))}
    </div>
  );
}
