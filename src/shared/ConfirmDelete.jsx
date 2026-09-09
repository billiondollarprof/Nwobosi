/* ==========================================================================
   CONFIRM DELETE
   Stands in front of anything that removes something for good.

   WHY THIS EXISTS
   The bin on a knowledge row deleted the file and its text on one tap, with
   no question and no way back. Anthony found it by looking: "somebody can
   easily tap delete and they will not know that they deleted something."

   On a phone that is not a hypothetical. The bin sits a few millimetres from
   the file name in a list people scroll with a thumb, and there is no undo
   anywhere in this product. A file removed by accident is retyped or
   re-uploaded from wherever it came from, if anybody even notices.

   HOW IT DIFFERS FROM PublishGate, AND WHY THEY ARE NOT ONE COMPONENT
   PublishGate asks about sending something out of the building. It has two
   moods, it waits on a model reading the file, and its quiet setting is the
   common one. This asks about destroying something. It has one mood, it
   waits on nothing, and it is red every time, because there is no version of
   deleting a company's material that deserves a soft touch.

   Forcing both jobs through one component would mean a pile of props
   deciding which half is running. Two small files that each do one thing
   read better and cannot break each other.

   WHAT IT MUST NEVER DO
     - Never confirm by default. Cancel holds the focus, Escape and the
       backdrop both cancel, and the only way through is a press on the one
       red button.
     - Never be the only thing standing between a person and losing work.
       It is a speed bump, not a backup. Anything that genuinely cannot be
       lost needs to be recoverable, not merely confirmed.
   ========================================================================== */

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

import { PrimaryButton, Spinner } from "./ui.jsx";

export default function ConfirmDelete({ name, note, busy = false, onCancel, onConfirm }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(4,5,12,0.62)", backdropFilter: "blur(6px)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="w-full max-w-[420px] rounded-[20px] border p-5 sm:p-6 max-h-[86vh] overflow-y-auto"
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
            style={{ backgroundColor: "rgba(229,62,62,0.14)" }}
          >
            <Trash2 size={17} style={{ color: "var(--danger)" }} />
          </span>

          <div className="min-w-0">
            <h2
              id="confirm-delete-title"
              className="text-[16px] font-semibold leading-snug"
              style={{ color: "var(--text-1)" }}
            >
              Remove this for good?
            </h2>
            <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-2)" }}>
              <span style={{ color: "var(--text-1)" }}>{name}</span> and everything in it will be
              gone, and your assistant will stop using it. There is no way to get it back.
            </p>
            {note ? (
              <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--text-3)" }}>
                {note}
              </p>
            ) : null}
          </div>
        </div>

        {/* Cancel is the filled button and Remove is a quiet red outline. The
            reflex press has to land on the half that keeps the file. */}
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
            style={{
              borderColor: "var(--danger)",
              color: "var(--danger)",
              backgroundColor: "rgba(229,62,62,0.08)",
            }}
          >
            {busy && <Spinner size={13} color="var(--danger)" />}
            {busy ? "Removing" : "Remove it"}
          </button>
        </div>
      </div>
    </div>
  );
}
