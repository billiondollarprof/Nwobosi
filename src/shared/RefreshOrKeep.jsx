/* ==========================================================================
   THE SAME PAGE, READ AGAIN

   WHY THIS IS NOT THE DUPLICATE WARNING
   A file is a thing a company has. A link is not: it is a photograph of a
   page taken at one moment. add-link fetches the page once, when an admin
   vouches for it, and stores what it said then. Nothing ever fetches it
   again, not the assistant, not this screen, not anything.

   Anthony: "the information is actually harvested during the time the person
   adds the link, and after that, it doesn't harvest information anymore...
   sometimes, at the time the link was added, the information had changed."

   So adding the same address a second time is almost never a mistake. It is
   somebody refreshing a page they have since edited. The first build put a
   red warning there and told them off for doing the right thing.

   WHAT THIS DOES INSTEAD
   Asks the one question that actually matters: what happens to the old
   photograph.

     Replace   the usual answer. The new reading goes in, the old one goes.
     Keep both an old copy and a new copy of the same page, on purpose.
     Cancel    changes nothing at all.

   THE ORDER MATTERS AND IS NOT AN IMPLEMENTATION DETAIL
   Replace adds the new copy first and only deletes the old one once that has
   worked. Backwards, a page that fails to fetch would take the working copy
   with it and leave the company with nothing.

   KEEPING BOTH IS A REAL CHOICE, NOT A POLITENESS
   Two readings of one page weeks apart are how a knowledge base ends up
   telling a customer last month's price. Somebody may still want both, to
   compare. They get told what it means rather than being stopped.
   ========================================================================== */

import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

import { PrimaryButton, Spinner } from "./ui.jsx";

export default function RefreshOrKeep({ address, addedWhen, busy = false, onCancel, onReplace, onKeepBoth }) {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-title"
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
            style={{ backgroundColor: "var(--chip)" }}
          >
            <RefreshCw size={17} style={{ color: "var(--audience-open)" }} />
          </span>

          <div className="min-w-0">
            <h2
              id="refresh-title"
              className="text-[16px] font-semibold leading-snug"
              style={{ color: "var(--text-1)" }}
            >
              You already have this page
            </h2>
            <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-2)" }}>
              <span className="break-words" style={{ color: "var(--text-1)" }}>{address}</span> was
              read {addedWhen ? `on ${addedWhen}` : "before"}, and what it said then is what your
              assistant knows. Reading it again picks up anything that has changed since.
            </p>
            <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--text-3)" }}>
              Keeping both leaves two readings of the same page in the knowledge base, which is
              how a customer ends up being told last month's answer.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-5">
          <PrimaryButton
            onClick={onReplace}
            disabled={busy}
            className="w-full flex items-center gap-2 justify-center"
          >
            {busy && <Spinner size={13} color="#fff" />}
            {busy ? "Reading it" : "Read it again and replace the old one"}
          </PrimaryButton>

          <button
            type="button"
            onClick={onKeepBoth}
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-[12px] border text-[13.5px] transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            Keep both
          </button>

          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full px-4 py-2 rounded-[12px] text-[13.5px] transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--text-3)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
