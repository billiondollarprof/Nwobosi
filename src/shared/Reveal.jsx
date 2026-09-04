/* ==========================================================================
   REVEAL
   Sections settle in as they arrive rather than being there all at once.

   The resting state is visible. Arming happens in JavaScript, before
   paint, and only when the browser can actually observe and the reader has
   not asked for calmer motion. So if the script never runs, or the
   observer is missing, or someone has reduced motion turned on, every
   section is simply visible. A page whose content is parked at zero
   opacity waiting on an observer is one failed script away from blank.

   It fires once. Content that fades out again when you scroll back up
   reads as a page that cannot make up its mind.
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
    el.classList.add("sx-reveal-armed");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.classList.contains("sx-reveal-armed")) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.style.transitionDelay = `${delay}ms`;
          el.classList.remove("sx-reveal-armed");
          observer.disconnect();
        }
      },
      /* A little before the edge, so a section has finished arriving by the
         time it is properly in view rather than animating under the reader. */
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
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
