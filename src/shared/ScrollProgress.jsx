/* ==========================================================================
   SCROLL PROGRESS
   A thin bar across the very top of the window that fills as you scroll.

   WHY IT EXISTS. Taken from Anthony's portfolio (anthony.stellaxafe.com),
   2026-11-10, so the StellaXafe landing page moves the way his page does.
   It tells a reader how much page is left without a word of copy.

   HOW IT WORKS. One scroll listener, throttled to one update per frame, sets
   a scaleX transform. A transform never forces the browser to lay the page
   out again, so it costs nothing while scrolling.

   WHAT IT MUST NEVER DO
   - Take a click. It sits above everything, so it ignores the pointer.
   - Be read out by a screen reader. It is decoration; aria-hidden.
   ========================================================================== */

import { useEffect, useRef } from "react";
import { BRAND } from "./tokens";

export default function ScrollProgress() {
  const bar = useRef(null);

  useEffect(() => {
    let frame = 0;

    /* Reads where the page is, writes one transform. */
    function update() {
      frame = 0;
      const el = bar.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const share = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${share})`;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
      style={{
        height: 3,
        background: `linear-gradient(90deg, ${BRAND.navyLift}, ${BRAND.purple}, ${BRAND.accentSoft})`,
        transform: "scaleX(0)",
        transformOrigin: "0 50%",
      }}
    />
  );
}
