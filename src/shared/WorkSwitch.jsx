/* ==========================================================================
   SWITCHING BETWEEN YOUR OWN WORK AND THE SUPPORT QUEUE

   WHY IT LOOKS LIKE THIS
   ----------------------
   It only appears for somebody who has both, which is a staff member an
   admin has given support access to. Everybody else sees nothing at all,
   because a switch with one side is not a switch, it is a label that
   confuses people.

   TWO WORDS EACH, AND BOTH SIDES ALWAYS SHOWN. A single button that says
   "Go to support" tells you where you would land but never where you are.
   Somebody working a queue for an hour needs to be able to glance and know
   which half they are in, so both halves sit there and the one you are on
   is filled in.

   Anthony's design, 2026-09-15: one door at /workspace for everybody, and
   the person switches. No second sign in, no second address.
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { MessageSquare, LifeBuoy } from "lucide-react";

import { BRAND } from "./tokens";

export default function WorkSwitch({ me, current }) {
  const navigate = useNavigate();

  /* Nothing to switch between, so nothing is drawn. */
  if (me?.staff?.can_support !== true) return null;

  const sides = [
    { id: "work", label: "My work", icon: MessageSquare, to: "/workspace?view=assistant" },
    { id: "support", label: "Support", icon: LifeBuoy, to: "/workspace?view=support" },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border p-1 mb-5"
      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
      role="group"
      aria-label="Your work or the support queue"
    >
      {sides.map((side) => {
        const on = current === side.id;
        return (
          <button
            key={side.id}
            onClick={() => !on && navigate(side.to)}
            aria-current={on ? "page" : undefined}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
            style={
              on
                ? { backgroundColor: BRAND.accent, color: "#fff" }
                : { color: "var(--text-3)" }
            }
          >
            <side.icon size={14} />
            {side.label}
          </button>
        );
      })}
    </div>
  );
}
