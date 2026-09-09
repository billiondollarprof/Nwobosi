/* ==========================================================================
   PUBLISH GATE
   The one screen that stands between a company's own material and a
   stranger reading it.

   WHY THIS EXISTS
   Knowledge in this product has two audiences. Staff read all of it.
   Customers, meaning anyone outside the company who talks to the support
   assistant, read only what an admin switched on. Switching one on is the
   only action in the whole admin that can send private information out of
   the building, and until this file existed it took one tap with nothing
   in the way. A payment receipt was switched on in testing and nothing
   said a word.

   THE RULE IT ENFORCES
   Every file gets asked about. Not only the ones that look risky, not only
   the ones a model flagged. Every single one, every time. A warning that
   only appears sometimes trains people to trust the silence, and the
   silence is exactly what fails on the file nobody thought to check.

   TWO LAYERS, AND THE FIRST NEVER DEPENDS ON THE SECOND
     Layer one is this dialog. It is written into the app, it needs no
     network, and it fires even if everything else is down.
     Layer two is the reading, which is a model that opens the file and
     says what it actually found. It makes the warning specific. When it
     is slow, or fails, or has nothing to say, layer one still stands
     alone and the admin still has to answer.

   WHAT IT MUST NEVER DO
     - Never ask when something is being taken back. Turning a file off
       is always safe, so it happens instantly. A confirmation on a safe
       action is noise, and noise is what makes people stop reading.
     - Never confirm by default. Cancel holds the focus, Escape and the
       backdrop both cancel, and the only way through is a deliberate
       press on the one button that says yes.
     - Never let the reading hold the door shut. If the model has not
       answered, the admin can still decide. They are the authority here,
       not the model.

   SECTIONS
     1. The reading strip, which shows what the model found
     2. The dialog itself
   ========================================================================== */

import { useEffect, useRef } from "react";
import { AlertTriangle, Check, Eye, ShieldAlert } from "lucide-react";

import { PrimaryButton, Spinner } from "./ui.jsx";

/* ==========================================================================
   1. THE READING STRIP

   `review` is whatever the checker gave back, and every one of its shapes
   has to render as something an admin can act on:

     null                     nothing asked for yet
     { state: "reading" }     the model has the file and is working
     { state: "clear",  note} it read the file and found nothing private
     { state: "warn",   note} it read the file and found something
     { state: "unknown", note} it could not read it, so nobody knows

   "unknown" is deliberately not styled as reassurance. A checker that
   failed is not a file that passed, and the two must never look alike.
   ========================================================================== */

function ReadingStrip({ review }) {
  if (!review) return null;

  if (review.state === "reading") {
    return (
      <div
        className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-3 text-[13px]"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
      >
        <Spinner size={14} />
        Reading the file to see what is in it
      </div>
    );
  }

  const tone =
    review.state === "warn"
      ? { color: "var(--caution)", background: "rgba(232,152,10,0.12)", Icon: AlertTriangle }
      : review.state === "clear"
        ? { color: "var(--all-clear)", background: "rgba(22,176,74,0.12)", Icon: Check }
        : { color: "var(--text-3)", background: "var(--surface-2)", Icon: Eye };

  const { Icon } = tone;

  return (
    <div
      className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-3 text-[13px] leading-relaxed"
      style={{ backgroundColor: tone.background, color: tone.color }}
    >
      <Icon size={15} className="shrink-0 mt-0.5" />
      <span>{review.note}</span>
    </div>
  );
}

/* ==========================================================================
   2. THE DIALOG

   Props:
     name     the file being opened up, shown so nobody confirms the wrong row
     review   see the shapes above, or null if no checker is wired in
     busy     the write is in flight, so the buttons lock
     onCancel closes with nothing changed
     onConfirm turns the file on
   ========================================================================== */

export default function PublishGate({ name, review, busy = false, onCancel, onConfirm }) {
  const cancelRef = useRef(null);

  /* Cancel takes the focus, not confirm. Somebody who opens this with a
     finger already moving, or who hits space out of habit, lands on the
     safe half. */
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  /* Escape closes it, the way it would anywhere else. */
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  /* The page behind must not scroll while this is open. On a phone a
     dialog over a scrolling page reads as a page that lost control. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(4,5,12,0.62)", backdropFilter: "blur(6px)" }}
      onMouseDown={(event) => {
        /* Only a press that starts and ends on the backdrop closes it.
           A drag that began inside the card and finished outside is
           somebody selecting text, not somebody cancelling. */
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-gate-title"
        className="w-full sm:max-w-[460px] rounded-t-[22px] sm:rounded-[22px] border p-6 max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--surface-solid)",
          borderColor: "var(--border-2)",
          boxShadow: "0 40px 90px -30px rgba(0,0,0,0.7)",
          animation: "sx-rise 0.22s ease",
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(232,152,10,0.14)" }}
          >
            <ShieldAlert size={19} style={{ color: "var(--caution)" }} />
          </span>
          <div className="min-w-0">
            <h2
              id="publish-gate-title"
              className="text-[17px] font-semibold leading-snug"
              style={{ color: "var(--text-1)" }}
            >
              Let people outside your company read this?
            </h2>
            <p className="text-[13px] mt-1 break-words" style={{ color: "var(--text-3)" }}>
              {name}
            </p>
          </div>
        </div>

        {/* The warning itself. Plain words, and concrete about what to look
            for, because "is it sensitive" is a question people answer yes
            to without checking. A list of the actual things is a question
            they can answer. */}
        <p className="text-[14px] leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
          Anyone who asks your support assistant a question can be told what is in this
          file. Open it and check first.
        </p>

        {/* A box, not four sentences. Prose gets skimmed. A bordered list
            with a rule between each line reads as things to check off, and
            that is the difference between somebody glancing at this and
            somebody actually opening the file. */}
        <ul
          className="text-[13.5px] leading-relaxed mb-4 rounded-[12px] border overflow-hidden"
          style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
        >
          {[
            "No bank details, invoices, receipts or card numbers.",
            "No prices, margins or terms you have not published.",
            "Nothing about your staff, and nothing about one customer that another should not read.",
            "No passwords, keys or logins.",
          ].map((line, index) => (
            <li
              key={line}
              className="px-3.5 py-2.5"
              style={{
                borderTop: index === 0 ? "none" : "1px solid var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {line}
            </li>
          ))}
        </ul>

        <ReadingStrip review={review} />

        {/* THE SAFE BUTTON IS THE LOUD ONE, AND THAT IS DELIBERATE

            The first build had "Yes" as the filled brand button, which made
            the riskiest action in the entire admin the most attractive thing
            on the screen. A dialog whose whole job is to slow somebody down
            cannot draw them straight to the exit.

            So Cancel is filled and Yes is a quiet amber outline. Yes is
            still one press away, nothing is hidden, but it takes reading
            rather than reflex.

            On a phone Cancel sits at the bottom, where the thumb already
            is. On a desktop the order is the usual Cancel then confirm,
            left to right. */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <PrimaryButton
            ref={cancelRef}
            onClick={onCancel}
            disabled={busy}
            className="w-full sm:w-auto justify-center"
          >
            Cancel
          </PrimaryButton>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] border text-[14px] font-semibold flex items-center gap-2 justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--caution)", color: "var(--caution)", backgroundColor: "rgba(232,152,10,0.08)" }}
          >
            {busy ? <Spinner size={13} color="var(--caution)" /> : <Check size={15} />}
            {busy ? "Saving" : "Yes, customers can read it"}
          </button>
        </div>
      </div>
    </div>
  );
}
