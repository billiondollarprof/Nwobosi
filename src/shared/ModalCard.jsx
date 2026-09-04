/* ==========================================================================
   MODAL CARD
   Services, Founder, and Contact read as modals: a card lifted off the
   page with a close button that takes you home. They are still real routes
   with real, shareable URLs.

   The difference from the old static site is that arriving at one is now
   instant. Nothing reloads, so it behaves like a panel opening inside an
   app rather than a new document being fetched.

   `padded` is off for pages whose content runs to the edge of the card,
   like the founder photograph. Those pages space themselves.
   ========================================================================== */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export default function ModalCard({ children, padded = true, label }) {
  const navigate = useNavigate();

  /* Escape closes it, the way it would anywhere else. A card that looks
     like a modal but ignores the key everyone presses feels broken. */
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") navigate("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <section className="relative z-10 px-4 sm:px-8 pt-4 pb-16 flex justify-center">
      <div
        className="relative w-full max-w-3xl rounded-[22px] border backdrop-blur-xl"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border-2)",
          boxShadow: "0 40px 90px -40px rgba(0,0,0,0.55)",
        }}
        role="dialog"
        aria-modal="false"
        aria-label={label}
      >
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl transition-colors hover:opacity-70"
          style={{
            backgroundColor: "var(--surface-solid)",
            borderColor: "var(--border-2)",
            color: "var(--text-2)",
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className={padded ? "p-7 sm:p-11" : ""}>{children}</div>
      </div>
    </section>
  );
}
