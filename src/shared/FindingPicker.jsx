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
import { Check, ExternalLink } from "lucide-react";
import { PrimaryButton } from "./ui.jsx";
import { BRAND } from "./tokens";
import { splitFindings, chosenText, linkHost, withoutMarks } from "./findings.js";

/* HOW MANY ROWS BEFORE IT FOLDS.

   Anthony, 2026-09-14: "What if the results are many, does it collapse it
   under more and possibly show 3 at a time?"

   Three. A search that comes back with eight things should not be a wall
   somebody has to scroll past to reach the button, and a card taller than
   the phone reads as work rather than a question.

   The hidden ones are still ticked and still going in. The button counts all
   of them, not just the visible ones, so the number on it is always the
   truth about what will be used. */
const SHOW_AT_FIRST = 3;

export default function FindingPicker({ content, onUse, onDrop }) {
  /* THE YES BUTTON THAT DID THE OPPOSITE, fixed 2026-09-14.

     splitFindings can legitimately come back with nothing. A search that
     found only a source list, a reply too short to be a claim, a turn where
     the model wrote something the splitter cannot cut up. That is not an
     error, it just means there is nothing to make a list out of.

     What happened then was worse than nothing. findings[0] was undefined,
     so the yes button sent an empty list, and Chat.jsx treats an empty list
     as a refusal and DROPPED it. The button said "Yes, use it" and threw it
     away.

     So when nothing parses, the whole reply is treated as one finding. The
     marks come off, because those are plumbing. The person sees the same
     text they were already reading above, and yes means yes. */
  const parsed = splitFindings(content);
  const findings = parsed.length
    ? parsed
    : [{ id: 0, text: withoutMarks(content), link: "" }];

  /* Which findings are still in. Ids, not text, because the text is long and
     comparing it would break the moment a stray space differed. Everything
     starts in. */
  const [kept, setKept] = useState(() => findings.map((f) => f.id));
  const [expanded, setExpanded] = useState(false);

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
    /* The one finding still carries its address, so the Verify link belongs
       here too. Forgetting it here would mean a search that came back with
       one thing was the only case somebody could not check. */
    const only = findings[0];
    return (
      <Card>
        <Heading>Use this in the work?</Heading>
        <Sub>Check the number and the source first. Nothing goes into your work until you say so.</Sub>

        {only?.link && (
          <div className="-ml-7 mb-4">
            <VerifyLink href={only.link} />
          </div>
        )}

        {/* chosenText, NOT the raw content. The raw content still carries the
            [LINK] marker, and that is plumbing: it must never reach the brief
            and from there the finished document. */}
        <PrimaryButton
          onClick={() => onUse(chosenText(findings, [only?.id ?? 0]), 0)}
          className="w-full flex items-center justify-center gap-2"
        >
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
  const shown = expanded ? findings : findings.slice(0, SHOW_AT_FIRST);
  const hidden = findings.length - shown.length;

  return (
    <Card>
      <Heading>Use this in the work?</Heading>
      <Sub>Untick anything that is wrong. Everything still ticked is what I use.</Sub>

      <ul className="space-y-2 mb-3">
        {shown.map((f) => {
          const on = kept.includes(f.id);
          return (
            <li
              key={f.id}
              className="rounded-[12px] border p-3"
              style={{
                backgroundColor: on ? "var(--surface-2)" : "transparent",
                borderColor: on ? "var(--border-2)" : "var(--border)",
                opacity: on ? 1 : 0.5,
              }}
            >
              {/* A label wrapping the input and the text, so the whole of
                  both is the hit target. A 16px tick box on a phone is not
                  one. The Verify link is deliberately OUTSIDE this label:
                  inside it, tapping the link would follow it and toggle the
                  tick box on the way past. */}
              <label className="flex gap-3 items-start cursor-pointer">
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

              {f.link && <VerifyLink href={f.link} />}
            </li>
          );
        })}
      </ul>

      {/* Anthony: "does it collapse it under more and possibly show 3 at a
          time?" The count is on the button so nobody has to open it to find
          out how much is under there. */}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mb-4 rounded-[12px] border py-2 text-[13px] transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          Show the other {hidden}
        </button>
      )}
      {expanded && findings.length > SHOW_AT_FIRST && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full mb-4 rounded-[12px] border py-2 text-[13px] transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          Show fewer
        </button>
      )}

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

/* --------------------------------------------------------------------------
   GO AND CHECK IT YOURSELF

   Anthony, 2026-09-14: "each of the results will have a verify link... a text
   link... so you click on it, it opens a new tab and take you direct to that
   page where the result was gotten from... so we know that it's accurate."

   Three decisions in here and all three are his:

     - It LOOKS like a link. Underlined, in the caution amber, with the
       arrow that means "leaves this page". A link somebody cannot tell is a
       link is a link nobody taps.
     - It opens a NEW TAB. Taking somebody out of a half finished document to
       read a statistics page is how the half finished document gets lost.
     - The host is shown next to it. Knowing you are about to land on
       ukhospitality.org.uk rather than somewhere unnamed is the difference
       between a link you trust enough to tap and one you do not.

   rel="noopener noreferrer" is not decoration. Without noopener the page
   that opens can reach back through window.opener and navigate this tab
   somewhere else, and these addresses come from pages the model just read,
   written by anybody. The scheme is already checked in findings.js.
   -------------------------------------------------------------------------- */

function VerifyLink({ href }) {
  const host = linkHost(href);
  return (
    <div className="pl-7 mt-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12.5px] underline underline-offset-2 hover:opacity-80"
        style={{ color: "var(--caution)" }}
      >
        Verify
        <ExternalLink size={11} />
      </a>
      {host && (
        <span className="text-[12px] ml-2" style={{ color: "var(--text-3)" }}>
          {host}
        </span>
      )}
    </div>
  );
}

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
