/* ==========================================================================
   GATE TWO: WHAT FROM OUTSIDE ACTUALLY GETS USED

   The second of the two human checkpoints around searching. Gate one asked
   whether it could go and look. This one asks what, if anything, comes back
   into the work.

   WHY THIS FILE EXISTS AT ALL
   ---------------------------
   Anthony, 2026-09-14: "the permission to use the data is supposed to offer
   a third option should the person agrees with some of the search results
   but not all, so they get to say which."

   Yes and no were the only two answers, and a search usually brings back
   more than one thing. Two right figures and one wrong one meant either
   throwing away all three or taking the wrong one along with the others.

   THE DEFAULT IS EVERYTHING IN, NOT EVERYTHING OUT
   ------------------------------------------------
   Anthony, the same day: "Or is it better to say which not to use? Since
   most of the data might always be accurate, so the person has less things
   to type."

   He is right, and it decides the whole design. The list opens with every
   finding already ticked and the person unticks what is wrong. The common
   case, where the search got it right, is one tap. The work only grows when
   there is genuinely something to reject.

   The opposite, an empty list you have to fill in, punishes the normal case
   and it quietly encourages taking everything without reading, because
   ticking five boxes is a chore and "Yes, use it all" is right there.

   WHAT IT MUST NEVER DO
   ---------------------
     - Never keep something that was unticked. Not greyed out, not held back
       in case they change their mind. Gone. Anthony's rule from the day the
       gate was built: "if there is no go-ahead, it should not add it."
     - Never hide a finding because it looks weak. Deciding which of the
       search results are worth showing is exactly the judgement this
       checkpoint exists to hand to a person.
     - Never let the list be the only thing on screen. The full text of each
       finding is shown, with its source, because nobody can approve what
       they cannot read.
   ========================================================================== */

import { useState } from "react";
import { Check } from "lucide-react";
import { PrimaryButton } from "./ui.jsx";
import { BRAND } from "./tokens";
import { splitFindings, chosenText } from "./findings.js";

export default function FindingPicker({ content, onUse, onDrop }) {
  const findings = splitFindings(content);

  /* Which findings are still in. Ids, not text, because the text is long and
     comparing it would break the moment a stray space differed. Everything
     starts in. */
  const [kept, setKept] = useState(() => findings.map((f) => f.id));

  /* ONE FINDING IS NOT A LIST. A tick box against a single item is a form
     where a question would do, so this falls back to plain yes and no. */
  const isList = findings.length > 1;

  function toggle(id) {
    setKept((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /* --------------------------------------------------------------------------
     SECTION 1: One finding, so one question
     -------------------------------------------------------------------------- */

  if (!isList) {
    return (
      <Card>
        <Heading>Use this in the work?</Heading>
        <Sub>Check the number and the source first. Nothing goes into your work until you say so.</Sub>

        <PrimaryButton onClick={() => onUse([content], 0)} className="w-full flex items-center justify-center gap-2">
          <Check size={15} />
          Yes, use it
        </PrimaryButton>
        <SecondaryButton onClick={onDrop}>No, do not use it</SecondaryButton>
      </Card>
    );
  }

  /* --------------------------------------------------------------------------
     SECTION 2: Several findings, listed, all in

     ONE SCREEN, NO MIDDLE STEP. An earlier version put a "Let me choose"
     button in front of this list. Anthony cut it: "it will list the search
     results as selected, then you unselect the wrong ones and click
     continue". He is right. A button whose only job is to reveal the thing
     the person came to look at is a tap that buys nothing.

     Everything starts ticked because the search is usually right, and the
     work should grow only when there is something to reject. The wording
     says removal, not selection, because that is what the person is doing.
     -------------------------------------------------------------------------- */

  const keptCount = kept.length;

  return (
    <Card>
      <Heading>Use this in the work?</Heading>
      <Sub>Untick anything that is wrong. Everything still ticked is what I use.</Sub>

      <ul className="space-y-2 mb-4">
        {findings.map((f) => {
          const on = kept.includes(f.id);
          return (
            <li key={f.id}>
              {/* A label wrapping the input, so the whole row is the hit
                  target. A 16px tick box on a phone is not one. */}
              <label
                className="flex gap-3 items-start rounded-[12px] border p-3 cursor-pointer"
                style={{
                  backgroundColor: on ? "var(--surface-2)" : "transparent",
                  borderColor: on ? "var(--border-2)" : "var(--border)",
                  opacity: on ? 1 : 0.5,
                }}
              >
                {/* accentColor, so the tick is the brand rather than the
                    browser's own blue. One line, and it works in both
                    themes because the box behind it is the theme's. */}
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(f.id)}
                  className="mt-[3px] shrink-0 w-4 h-4 cursor-pointer"
                  style={{ accentColor: BRAND.accentSoft }}
                />
                {/* The whole finding, not a summary. Somebody approving a
                    figure has to be able to see the figure and its source. */}
                <span
                  className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: on ? "var(--text-1)" : "var(--text-3)",
                    textDecoration: on ? "none" : "line-through",
                  }}
                >
                  {f.text}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Unticking everything IS saying no, so the button says so and does
          so. A disabled button at the bottom of a list somebody has just
          emptied is a dead end they have to find their own way out of. */}
      {keptCount === 0 ? (
        <PrimaryButton onClick={onDrop} className="w-full">
          Use none of it
        </PrimaryButton>
      ) : (
        <PrimaryButton
          /* The dropped count goes with it. The resume log keeps a count of
             what somebody turned down, never the text, so a note written
             tomorrow can say two were rejected without storing either. */
          onClick={() => onUse(chosenText(findings, kept), findings.length - keptCount)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Check size={15} />
          {keptCount === findings.length ? "Use all of it" : `Use these ${keptCount}`}
        </PrimaryButton>
      )}

      <SecondaryButton onClick={onDrop}>No, do not use any of it</SecondaryButton>
    </Card>
  );
}

/* --------------------------------------------------------------------------
   SECTION 3: The small shapes the card is made of

   Kept here rather than imported so this file renders the same whichever
   screen puts it on the page, and so changing the card does not reach into
   anything else.
   -------------------------------------------------------------------------- */

function Heading({ children }) {
  return (
    <p className="text-[15.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
      {children}
    </p>
  );
}

function Sub({ children }) {
  return (
    <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
      {children}
    </p>
  );
}

function Card({ children }) {
  return (
    <div style={{ animation: "sx-rise 0.35s ease" }}>
      <div
        className="rounded-[18px] border p-5 backdrop-blur-xl"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {children}
      </div>
    </div>
  );
}

function SecondaryButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
      style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
    >
      {children}
    </button>
  );
}
