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

   TWO LEVELS, AND THEY DO NOT LOOK THE SAME
   The point of a warning is that it still means something the tenth time.
   A dialog that shouts every time gets clicked through every time, so this
   one has a quiet setting and a loud one.

     SOFT is the default, and it is most of the time. One short line
     confirming what is about to happen, the plain button, no colour. The
     same weight as a tool asking "are you sure" before something ordinary.
     It is a reminder, not a lecture, and it does not tell an admin to go
     and read their own file. They know what is in it.

     FIRM is only when the reading came back with something. Then the
     dialog turns amber, the reading is the thing you look at, and the safe
     button becomes the loud one so getting through takes a deliberate
     press rather than the same reflex as every other time.

   THE READING IS THE SPECIFIC HALF, NOT THIS
   This file never lists what to look for. A model opens the file and says
   what it actually found, which beats any checklist written in advance.
   This file's job is to make sure the question gets asked at all, every
   file, every time, including when the reading is slow, failed, or absent.

   WHAT IT MUST NEVER DO
     - Never ask when something is being taken back. Turning a file off is
       always safe, so it happens instantly.
     - Never confirm by default. Escape and the backdrop both cancel.
     - Never let the reading hold the door shut. If the model has not
       answered, the admin still decides. They are the authority, not it.

   SECTIONS
     1. The reading strip, which shows what the model found
     2. The dialog itself
   ========================================================================== */

import { useEffect, useRef } from "react";
import { AlertTriangle, Check, Eye, Globe } from "lucide-react";

import { PrimaryButton, Spinner } from "./ui.jsx";

/* ==========================================================================
   1. THE READING STRIP

   `review` is whatever the checker gave back, and every shape has to render
   as something an admin can act on:

     null                      nothing asked for yet, or no checker wired in
     { state: "reading" }      the model has the file and is working
     { state: "clear",   note} it read the file and found nothing private
     { state: "warn",    note} it read the file and found something
     { state: "unknown", note} it could not read it, so nobody knows

   "unknown" is deliberately not styled as reassurance. A checker that
   failed is not a file that passed, and the two must never look alike.
   ========================================================================== */

function ReadingStrip({ review }) {
  if (!review) return null;

  if (review.state === "reading") {
    return (
      <div
        className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[13px] mt-3"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
      >
        <Spinner size={13} />
        Reading the file
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
      className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed mt-3"
      style={{ backgroundColor: tone.background, color: tone.color }}
    >
      <Icon size={14} className="shrink-0 mt-0.5" />
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
  const firstRef = useRef(null);

  /* Firm only when the reading found something. Everything else, including
     a reading that failed, stays soft: a checker that could not open the
     file is not evidence against the file, and dressing it up as one would
     spend the loud setting on nothing and leave nothing for the real
     thing. */
  const firm = review?.state === "warn";

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

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

  const accent = firm ? "var(--caution)" : "var(--audience-open)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(4,5,12,0.62)", backdropFilter: "blur(6px)" }}
      onMouseDown={(event) => {
        /* Only a press that starts and ends on the backdrop closes it. A
           drag that began inside the card and finished outside is somebody
           selecting text, not somebody cancelling. */
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-gate-title"
        className="w-full sm:max-w-[420px] rounded-t-[22px] sm:rounded-[22px] border p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--surface-solid)",
          borderColor: "var(--border-2)",
          boxShadow: "0 40px 90px -30px rgba(0,0,0,0.7)",
          animation: "sx-rise 0.22s ease",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: firm ? "rgba(232,152,10,0.14)" : "var(--chip)" }}
          >
            {firm ? (
              <AlertTriangle size={17} style={{ color: accent }} />
            ) : (
              <Globe size={17} style={{ color: accent }} />
            )}
          </span>

          <div className="min-w-0">
            <h2
              id="publish-gate-title"
              className="text-[16px] font-semibold leading-snug"
              style={{ color: "var(--text-1)" }}
            >
              Turn this on for customers?
            </h2>
            {/* One line, and it says what changes. Not a list of things to
                go and check, which is the model's job and is what the
                strip below carries when it has something to say. */}
            <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-2)" }}>
              People outside your company can then be told what is in{" "}
              <span style={{ color: "var(--text-1)" }}>{name}</span>.
            </p>
          </div>
        </div>

        <ReadingStrip review={review} />

        {/* Soft: the plain button gets on with it, because most of the time
            this is somebody publishing exactly what they meant to.
            Firm: Cancel becomes the filled one and going ahead becomes a
            quiet amber outline, so the reflex press lands on the safe half.
            On a phone the filled button sits at the bottom either way,
            where the thumb already is. */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          {firm ? (
            <>
              <PrimaryButton
                ref={firstRef}
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
                style={{ borderColor: accent, color: accent, backgroundColor: "rgba(232,152,10,0.08)" }}
              >
                {busy && <Spinner size={13} color="var(--caution)" />}
                {busy ? "Saving" : "Turn it on anyway"}
              </button>
            </>
          ) : (
            <>
              <button
                ref={firstRef}
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] border text-[13.5px] transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={onConfirm}
                disabled={busy}
                className="w-full sm:w-auto flex items-center gap-2 justify-center"
              >
                {busy && <Spinner size={13} color="#fff" />}
                {busy ? "Saving" : "Turn it on"}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
