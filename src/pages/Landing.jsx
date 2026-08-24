/* ==========================================================================
   LANDING PAGE
   The public entry point. Read top to bottom:

     1. Nav
     2. Hero
     3. The problem
     4. How it works
     5. Security
     6. Call to action
     7. Footer
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Timer,
  Sparkles,
  MessagesSquare,
  Database,
  FileSignature,
  FileCheck2,
  Lock,
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import { PageShell, ThemeToggle, PrimaryButton, GhostButton, StatusPill } from "../shared/ui.jsx";
import { PRODUCT, WORKFLOW_TOOLS } from "../shared/config.js";

/* --------------------------------------------------------------------------
   Page content
   Kept as data so the sections below stay readable.
   -------------------------------------------------------------------------- */

const PROBLEMS = [
  {
    icon: ShieldCheck,
    title: "Data stays yours",
    body: "Staff stop pasting company data into public AI tools. Everything runs inside one isolated tenant, and it can be deployed inside your own environment.",
  },
  {
    icon: Timer,
    title: "No more retry loops",
    body: "The assistant interviews first and confirms what it heard. The back and forth happens in cheap conversation, before anything is generated.",
  },
  {
    icon: Sparkles,
    title: "Every output on brand",
    body: "Work is built from your own brand kit, templates, and terminology. Two people asking for the same thing get the same standard.",
  },
];

const STEPS = [
  {
    icon: MessagesSquare,
    title: "It asks",
    body: "A short interview works out what you need, who it is for, and which files to read.",
  },
  {
    icon: Database,
    title: "It reads",
    body: "It pulls only the company material this task needs, nothing more.",
  },
  {
    icon: FileSignature,
    title: "It writes the prompt",
    body: "One complete prompt, with every fact carrying its source, so nothing drifts and nothing is invented.",
  },
  {
    icon: FileCheck2,
    title: "It builds",
    body: "The file is generated and written straight to your Drive, with a download link in the chat.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <PageShell scroll>
      {/* ====================================================================
          1. NAV
          ==================================================================== */}

      <header className="shrink-0 relative z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-bold text-[17px] tracking-tight" style={{ fontFamily: FONTS.display }}>
              {PRODUCT.name}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <PrimaryButton onClick={() => navigate("/auth")} className="text-[13.5px] px-4 py-2">
              Sign in
            </PrimaryButton>
          </div>
        </div>
      </header>

      {/* ====================================================================
          2. HERO
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto text-center pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex justify-center mb-6">
            <StatusPill tone="accent">Private AI for enterprises</StatusPill>
          </div>

          <h1
            className="text-[36px] sm:text-[52px] font-bold leading-[1.08] tracking-tight mb-5"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Say what you need.
            <br />
            Get the finished file.
          </h1>

          <p
            className="text-[16px] sm:text-[18px] leading-relaxed max-w-xl mx-auto mb-9"
            style={{ color: "var(--text-2)" }}
          >
            {PRODUCT.name} interviews your staff, reads only your company's own material, writes the prompt,
            and builds the deck, report, or document. Nothing leaves your walls.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 px-6 py-3 text-[15px]"
            >
              Sign in
              <ArrowRight size={16} />
            </PrimaryButton>
            <GhostButton onClick={() => navigate("/chat")} className="px-6 py-3 text-[15px]">
              See the demo
            </GhostButton>
          </div>

          {/* Workflow tools it plugs into */}
          <div className="mt-14">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-4"
              style={{ color: "var(--text-3)" }}
            >
              Works with what you already use
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {WORKFLOW_TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-xl"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <tool.icon size={16} />
                  <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
                    {tool.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. THE PROBLEM
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[26px] sm:text-[32px] font-bold text-center mb-3 tracking-tight"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Three problems, solved at once
          </h2>
          <p className="text-[15px] text-center mb-11 max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Most teams have all three. Fixing one without the others does not hold.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border p-6 backdrop-blur-xl"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
                >
                  <item.icon size={19} style={{ color: BRAND.accentSoft }} />
                </div>
                <h3
                  className="text-[16px] font-bold mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {item.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. HOW IT WORKS
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-[26px] sm:text-[32px] font-bold text-center mb-3 tracking-tight"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            How it works
          </h2>
          <p className="text-[15px] text-center mb-11 max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Four steps. The staff member only takes part in the first one.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-[18px] border p-6 backdrop-blur-xl flex gap-4"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                    style={{ background: GRADIENTS.brand, fontFamily: FONTS.display }}
                  >
                    {i + 1}
                  </div>
                </div>
                <div>
                  <h3
                    className="text-[16px] font-bold mb-1.5 flex items-center gap-2"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    <step.icon size={16} style={{ color: BRAND.accentSoft }} />
                    {step.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. SECURITY
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-[20px] border p-8 sm:p-10 backdrop-blur-xl text-center"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex justify-center mb-5">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
              >
                <Lock size={22} style={{ color: BRAND.green }} />
              </div>
            </div>

            <h2
              className="text-[22px] sm:text-[26px] font-bold mb-3 tracking-tight"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              It only knows what you tell it
            </h2>
            <p className="text-[15px] leading-relaxed mb-7 max-w-xl mx-auto" style={{ color: "var(--text-3)" }}>
              Your admin decides what goes into the knowledge base. Every company fact in an output traces
              back to a source you approved. If something is missing, the assistant says so rather than
              making it up.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {[
                "No public sign up",
                "Invite or approval only",
                "Per person connectors",
                "Nothing stored in chat",
              ].map((claim) => (
                <StatusPill key={claim} tone="ok">
                  {claim}
                </StatusPill>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. CALL TO ACTION
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[26px] sm:text-[34px] font-bold mb-4 tracking-tight"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Ready when your team is
          </h2>
          <p className="text-[15px] mb-8" style={{ color: "var(--text-3)" }}>
            Your admin sends the invite. You sign in and start building.
          </p>
          <PrimaryButton
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2 px-7 py-3 text-[15px] mx-auto"
          >
            Sign in
            <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </section>

      {/* ====================================================================
          7. FOOTER
          ==================================================================== */}

      <footer className="relative z-10 border-t mt-auto" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-2)" }}>
              {PRODUCT.name}
            </span>
          </div>
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
            Built for the 10Alytics Business AI BuildFest
          </p>
        </div>
      </footer>
    </PageShell>
  );
}
