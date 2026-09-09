/* ==========================================================================
   AUDIENCE CONTROL
   Who is allowed to read one thing in the knowledge base.

   WHY THIS REPLACED A SWITCH
   The old control was a single toggle that read "Staff only" when it was
   off. Looking at it told you the current state and nothing else. It did
   not say there was a choice, it did not say what the other choice was,
   and it did not say that the choice mattered. An admin had to be told
   what it did before they could use it, and a control that has to be
   taught is a broken control, not an untrained person.

   A pair of options fixes that by showing both at once. You can see there
   are two, you can read what each one means, and the filled one is the one
   in force. Nothing has to be explained and nothing has to be clicked to
   find out.

   THE WORDS
   "Staff only" and "Staff and customers". Not visible, not published, not
   scope, not private. An admin should get this right by reading it once.
   "Staff and customers" rather than just "customers", because staff never
   lose access when a file is opened up, and a label reading "Customers"
   makes it look like a swap.

   WHAT IT DOES NOT DO
   It does not write anything. Both options call `onPick` and the page
   decides what happens, because opening a file up has to go through the
   publish gate and closing it must not. Putting that decision in here
   would bury it somewhere nobody would look for it.
   ========================================================================== */

import { Lock, Globe } from "lucide-react";

/* "Customers too", not "Staff and customers". The longer wording was
   clearer to read and 285px wide, which does not fit on the narrow half of
   a phone next to a lock icon, so the second option was cut in half by the
   scroller and the control stopped explaining itself, which is the only
   reason it exists. "too" carries the fact that mattered in the long
   version: staff do not lose the file when customers gain it. */
const OPTIONS = [
  { value: false, label: "Staff only", Icon: Lock },
  { value: true, label: "Customers too", Icon: Globe },
];

export default function AudienceControl({ on, label, onPick, busy = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={`Who can read ${label}`}
      className="inline-flex items-center rounded-full border p-[3px] max-w-full"
      style={{ borderColor: "var(--border-2)", backgroundColor: "var(--chip)" }}
    >
      {OPTIONS.map(({ value, label: text, Icon }) => {
        const picked = on === value;

        /* The open option is the only one that gets colour. Staff only is
           the resting state of everything in here, so when it is picked it
           reads as a plain solid chip rather than a second highlight
           competing with it down a list of twenty files. */
        const background = picked
          ? value
            ? "var(--audience-open)"
            : "var(--surface-solid)"
          : "transparent";

        const color = picked
          ? value
            ? "#fff"
            : "var(--text-1)"
          : "var(--text-3)";

        return (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={picked}
            aria-label={text}
            disabled={busy}
            onClick={() => {
              if (!picked && !busy) onPick(value);
            }}
            /* Padding and gap are as tight as they can be while still
               reading as two pressable halves. Both options together come
               to about 195px, and the narrowest phone this has to work on
               leaves 212px inside the row. That margin is small on purpose:
               anything wider and the second option starts hiding, which is
               the one thing this control must never do. */
            className="inline-flex items-center gap-1 rounded-full px-2 py-[5px] text-[12px] font-medium transition-colors disabled:cursor-not-allowed"
            style={{ backgroundColor: background, color }}
          >
            <Icon size={12} className="shrink-0" />
            <span className="whitespace-nowrap">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
