/* ==========================================================================
   SETUP PAGE
   Where a company builds its own workspace. Placeholder for now so the
   landing page button leads somewhere real while the landing design is
   being reviewed.

   The full flow, built next:
     1. Access code        single use, dies the moment it is redeemed
     2. Admin account      email and password
     3. About your company name, what you do, industry
     4. Brand              logo and colours, optional
     5. Documents          optional
     6. Deploy             goes live at /your-company
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import LogoAnimated from "../shared/LogoAnimated.jsx";
import { FONTS } from "../shared/tokens";
import { PageShell, ThemeToggle, GhostButton, StatusPill } from "../shared/ui.jsx";
import { PRODUCT } from "../shared/config.js";

export default function Setup() {
  const navigate = useNavigate();

  return (
    <PageShell scroll>
      <header className="shrink-0 relative z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[14px] transition-opacity hover:opacity-80"
            style={{ color: "var(--text-2)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 relative z-10 text-center">
        <LogoAnimated size={200} />

        <div className="mt-10 mb-5">
          <StatusPill tone="accent">Next up</StatusPill>
        </div>

        <h1
          className="text-[26px] sm:text-[32px] font-bold tracking-tight mb-4"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
        >
          Build your company's AI
        </h1>

        <p className="text-[15px] leading-relaxed max-w-[440px] mb-9" style={{ color: "var(--text-3)" }}>
          This is where you enter your access code, name your company, and answer three short questions.
          {PRODUCT.name} builds the rest. Being wired up now.
        </p>

        <GhostButton onClick={() => navigate("/chat")} className="px-6 py-3 text-[15px]">
          See it working in the meantime
        </GhostButton>
      </div>
    </PageShell>
  );
}
