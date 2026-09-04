/* ==========================================================================
   TYPEWRITER
   One phrase in a line of copy that types itself, deletes, and types the
   next. Everything around it stays still.

   It carries a real argument rather than being decoration: the rotating
   phrases are the things the product actually returns, so a reader watching
   it for four seconds learns the range of work it does without another
   sentence being written.

   Two things it must not do. It must not shift the layout as the text
   grows and shrinks, so the longest phrase reserves the width up front and
   the typed text sits over that reservation. And it must not run for
   anyone who asked for calmer motion, or with no JavaScript, so the resting
   state is the first phrase, complete.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 1900;

export default function Typewriter({ phrases, className = "", style = {} }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(phrases[0]);
  const [deleting, setDeleting] = useState(false);
  const [running, setRunning] = useState(false);
  const timer = useRef(null);

  /* Nothing moves until we know motion is welcome. Until then the first
     phrase is simply there, which is also what a reader without
     JavaScript gets. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const full = phrases[index];

    if (!deleting && shown === full) {
      timer.current = setTimeout(() => setDeleting(true), HOLD_MS);
    } else if (deleting && shown === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
    } else {
      timer.current = setTimeout(
        () => setShown(deleting ? full.slice(0, shown.length - 1) : full.slice(0, shown.length + 1)),
        deleting ? DELETE_MS : TYPE_MS,
      );
    }

    return () => clearTimeout(timer.current);
  }, [running, shown, deleting, index, phrases]);

  /* No width is reserved for the longest phrase. Reserving it holds a gap
     open in the middle of the sentence while a shorter phrase is typing,
     and that gap reads as a layout bug rather than as typing. Instead the
     phrase always sits at the end of its sentence, so the only thing that
     moves as it grows is the tail of the last line, which is exactly what
     typing is supposed to look like. */
  return (
    <span className={className} style={style}>
      {/* Screen readers get the phrase whole rather than one letter at a
          time, which is what a live region would otherwise announce. */}
      <span aria-live="off">{shown}</span>
      {running && (
        <span aria-hidden="true" style={{ animation: "sx-blink 1s step-start infinite" }}>
          |
        </span>
      )}
    </span>
  );
}
