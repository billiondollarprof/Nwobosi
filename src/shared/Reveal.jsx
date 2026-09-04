/* ==========================================================================
   REVEAL
   Sections come forward as they arrive and settle back as they leave.

   It used to fire once and stop. That was the safe choice and it was the
   wrong one: a page where everything is equally present is a page with no
   focus, and the section you are actually reading should be the brightest
   thing on the screen. So this now runs both ways. The band it watches is
   inset from the top and bottom of the window, which means a section is
   still "away" while it sits in the outer edge of the viewport and comes
   forward as it moves into the middle. That is the part a reader feels:
   the copy sharpening as they scroll toward it.

   The resting state is visible. Arming happens in JavaScript, before
   paint, and only when the browser can actually observe and the reader has
   not asked for calmer motion. So if the script never runs, or the
   observer is missing, or someone has reduced motion turned on, every
   section is simply visible. A page whose content is parked at zero
   opacity waiting on an observer is one failed script away from blank.

   Nothing here depends on scroll position at load. Land halfway down the
   page on a refresh and the sections in view come forward on the first
   frame, exactly as they would have if you had scrolled to them.
   ========================================================================== */

import { useEffect, useLayoutEffect, useRef } from "react";

export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);

  /* Before paint, so nothing is ever seen in its resting state and then
     hidden. useEffect would run after the browser has already drawn it. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("sx-reveal-live", "sx-reveal-away");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.classList.contains("sx-reveal-live")) return;

    el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          el.classList.toggle("sx-reveal-away", !entry.isIntersecting);
        }
      },
      /* Inset top and bottom. A section counts as arrived once it has
         reached the middle band of the window, not the instant one pixel
         of it clears the edge. threshold 0 so a section taller than the
         band still counts as arrived while it is passing through. */
      { rootMargin: "-14% 0px -14% 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={`sx-reveal ${className}`}>
      {children}
    </Tag>
  );
}
