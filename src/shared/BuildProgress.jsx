/* ==========================================================================
   BUILD PROGRESS
   The lines a person watches while their document is made, and the plan it
   is being built from.

   Why it exists: Anthony, 2026-11-10: "show the plan while it builds... like
   the way Claude used to show it. It will say what it's doing at every
   interval of time... working on the first draft, checking it... it is not
   just one color... if it's something that is error, you use red... so that
   the person will be feeling it that the work is ongoing." And, after the
   discovery call: "The fact that they'll be able to see the plan line, a
   written brief, is quite impressive."

   What it shows:
     1. One line per step, each with its own colour:
          done    green tick       the step has finished
          active  blue pulse       the step running right now
          info    grey dot         a detail, such as the section being written
          error   red cross        something went wrong
     2. "See the plan": the written brief the document is built from, folded
        away by default and filling in live as it is written.

   What it must never do:
     - Invent progress. Every line is added by Chat.jsx when the thing it
       describes actually happens.
     - Use a technical word. "Plan", not "brief" or "prompt".
   ========================================================================== */

import { useState } from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { BRAND } from "./tokens";
import { WorkingMark } from "./ui.jsx";

/* --------------------------------------------------------------------------
   1. The colour and mark for each kind of line
   -------------------------------------------------------------------------- */

const TONE = {
  done: { color: BRAND.green, mark: "tick" },
  active: { color: BRAND.accentSoft, mark: "pulse" },
  info: { color: "var(--text-3)", mark: "dot" },
  error: { color: BRAND.red, mark: "cross" },
};

function Mark({ tone }) {
  const { color, mark } = TONE[tone] ?? TONE.info;
  if (mark === "tick") return <Check size={13} strokeWidth={3} style={{ color }} />;
  if (mark === "cross") return <X size={13} strokeWidth={3} style={{ color }} />;
  /* The line running now carries the platform's own mark, breathing, the
     same as the chat's working line (Anthony, 2026-11-11). */
  if (mark === "pulse") return <WorkingMark size={16} />;
  return (
    <span
      className={mark === "pulse" ? "sx-progress-pulse" : ""}
      style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: color, display: "inline-block" }}
    />
  );
}

/* --------------------------------------------------------------------------
   2. The component
   -------------------------------------------------------------------------- */

export default function BuildProgress({ steps = [], plan = "", working = false }) {
  const [open, setOpen] = useState(false);
  const planText = String(plan ?? "").trim();

  return (
    <div>
      {/* 2a. The lines, oldest first, so it reads like a log of real work. */}
      <ul className="space-y-1.5" aria-live="polite">
        {steps.map((step, i) => {
          const tone = TONE[step.tone] ? step.tone : "info";
          return (
            <li key={`${i}-${step.text}`} className="flex items-start gap-2.5">
              <span className="shrink-0 w-[18px] h-[20px] flex items-center justify-center">
                <Mark tone={tone} />
              </span>
              {/* Bolder and at chat size, so it reads as the assistant
                  telling them what it is doing (Anthony, 2026-11-11). */}
              <span
                className={`text-[14.5px] leading-[20px] ${tone === "active" ? "sx-working-word font-semibold" : ""}`}
                style={{
                  color: tone === "info" ? "var(--text-2)" : tone === "error" ? BRAND.red : "var(--text-1)",
                  fontWeight: tone === "active" ? 600 : 500,
                }}
              >
                {step.text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* 2b. The plan, folded. It appears as soon as the first words of it
          exist, and keeps filling while it is open. */}
      {planText && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:opacity-80"
            style={{ color: BRAND.accentSoft }}
          >
            <ChevronDown
              size={14}
              style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            />
            {open ? "Hide the plan" : working ? "See the plan as it is written" : "See the plan it was built from"}
          </button>
          {open && (
            <pre
              className="mt-2 max-h-[280px] overflow-auto rounded-[12px] border px-3.5 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                color: "var(--text-2)",
                fontFamily: "inherit",
              }}
            >
              {planText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   3. Helpers Chat.jsx uses to add lines as things happen
   -------------------------------------------------------------------------- */

/* Marks every running line as done, then adds the new one. */
export function advance(steps, text, tone = "active") {
  const settled = (steps ?? []).map((s) => (s.tone === "active" ? { ...s, tone: "done" } : s));
  return [...settled, { text, tone }];
}

/* Adds a detail line once, never twice. */
export function note(steps, text) {
  if ((steps ?? []).some((s) => s.text === text)) return steps ?? [];
  return [...(steps ?? []), { text, tone: "info" }];
}

/* The section headings in a document written so far, in order. */
export function sectionsSoFar(markdown) {
  return [...String(markdown ?? "").matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].replace(/[*_`]/g, ""));
}
