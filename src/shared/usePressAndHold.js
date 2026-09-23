/* ==========================================================================
   PRESS AND HOLD

   WHY THIS EXISTS
   Anthony, 2026-09-23: "you can delete a chat at a time by pressing and
   holding it in the side bar and you can also select multiple chats and
   delete at the same time."

   Holding a chat in the sidebar starts selecting, the way a phone's own
   apps do. A plain tap still opens the chat. This file is the one piece
   that tells a hold from a tap.

   HOW IT TELLS THEM APART
   The press starts a timer. If the finger or mouse is still down when the
   timer runs out, it was a hold, and `onHold` runs. If it lifts, moves away,
   or the page starts scrolling first, it was not, and nothing happens here.
   The tap then reaches the button's own onClick as normal.

   One catch, and it is why `wasHeld` exists. Lifting after a hold still
   fires a click. Without a check, holding a chat would select it and then
   immediately open it. So after a hold the next click is swallowed.

   WHAT IT MUST NEVER DO
   Never stop an ordinary tap from working. Every path that is not a
   completed hold leaves the click alone.
   ========================================================================== */

import { useRef } from "react";

/* Long enough that a normal tap never trips it, short enough not to feel
   slow. The same ballpark phones use for their own long press. */
export const HOLD_MS = 500;

/* A finger drifting further than this is a scroll, not a hold. */
const MOVE_TOLERANCE = 10;

export function usePressAndHold() {
  const timer = useRef(null);
  const start = useRef(null);
  const held = useRef(false);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  /* Spread onto the element: {...bind(() => startSelecting(chat.id))}. */
  function bind(onHold) {
    return {
      onPointerDown: (event) => {
        held.current = false;
        start.current = { x: event.clientX, y: event.clientY };
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          timer.current = null;
          /* A small buzz on phones that allow it, so the hold is felt. */
          try { navigator.vibrate?.(12); } catch { /* not every browser */ }
          onHold();
        }, HOLD_MS);
      },
      onPointerMove: (event) => {
        if (!start.current || !timer.current) return;
        const dx = Math.abs(event.clientX - start.current.x);
        const dy = Math.abs(event.clientY - start.current.y);
        if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clear();
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      /* A phone's own long press menu would open over the top otherwise. */
      onContextMenu: (event) => {
        if (held.current || timer.current) event.preventDefault();
      },
    };
  }

  /* Call at the top of the element's onClick. True means this click is the
     tail end of a hold and should do nothing. It resets itself. */
  function wasHeld() {
    if (!held.current) return false;
    held.current = false;
    return true;
  }

  return { bind, wasHeld };
}
