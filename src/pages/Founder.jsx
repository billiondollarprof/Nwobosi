/* ==========================================================================
   FOUNDER PAGE
   Anthony Nwobosi, presented on his own page rather than folded into the
   landing page as a bio card. Reads as a modal, with a real URL at
   /founder. Read top to bottom:

     1. Hero, photograph and title
     2. Background
     3. Platforms and research
   ========================================================================== */

import { useNavigate } from "react-router-dom";

import { BRAND, FONTS } from "../shared/tokens";
import { AmaraWordmark } from "../shared/icons.jsx";
import { GlassPanel, PrimaryButton, StatusPill } from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import ModalCard from "../shared/ModalCard.jsx";

/* --------------------------------------------------------------------------
   Page content
   -------------------------------------------------------------------------- */

const BACKGROUND = [
  "Anthony's work sits at the intersection of two disciplines that rarely share a desk. Production software engineering, and the emerging field of applied AI safety. As a full stack engineer, he has shipped and maintained platforms end to end: architecture, authentication, data models, and the unglamorous plumbing that makes a product trustworthy in daily use.",
  "That engineering discipline carries directly into StellaXafe's approach. Every private prompt engine, every zero retention environment, and every human in the loop checkpoint is designed the way production infrastructure is designed. Assume failure, assume misuse, and build the guardrail before the feature ships.",
];

const WORK = [
  {
    name: <AmaraWordmark />,
    note: "Production platform. amara.ng",
    pill: { tone: "ok", label: "Live" },
  },
  {
    name: "XALOM",
    note: "Digital trust identity infrastructure",
    pill: { tone: "accent", label: "In development" },
  },
  {
    name: "AI governance research",
    note: "Dynamic guardrail architecture for autonomous agents",
    pill: { tone: "neutral", label: "Research" },
  },
];

export default function Founder() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      <ModalCard padded={false} label="Anthony Nwobosi">
        {/* ==================================================================
            1. HERO
            The photograph runs to the edge of the card, so this section
            owns its own corner rounding rather than sitting inside the
            card's padding.
            ================================================================== */}

        <div className="grid md:grid-cols-[0.9fr_1.1fr] rounded-t-[22px] overflow-hidden">
          <div className="relative min-h-[280px] md:min-h-[420px]" style={{ backgroundColor: "#05060C" }}>
            <img
              src="/anthony-nwobosi.webp"
              alt="Anthony Nwobosi"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(0deg, rgba(5,6,12,0.55), transparent 40%)" }}
            />
          </div>

          <div className="p-7 sm:p-10 flex flex-col justify-center">
            <Eyebrow>Founder</Eyebrow>
            <h1
              className="text-[28px] sm:text-[36px] font-bold tracking-tight mt-3.5"
              style={{ fontFamily: FONTS.display }}
            >
              <GradientText>Anthony Nwobosi</GradientText>
            </h1>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.1em] mt-3"
              style={{ color: BRAND.accentSoft }}
            >
              Principal architect and AI systems strategist
            </p>
            <p className="text-[15px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
              Full stack software engineer and creator of Amara and XALOM digital trust
              infrastructure. Anthony bridges practical enterprise workflow tools with cutting edge
              AI safety concepts.
            </p>
            <PrimaryButton
              onClick={() => navigate("/contact")}
              className="px-6 py-3 text-[14px] mt-7 w-fit"
            >
              Book a live call
            </PrimaryButton>
          </div>
        </div>

        {/* ==================================================================
            2. BACKGROUND
            ================================================================== */}

        <div className="p-7 sm:p-11">
          <div className="flex flex-col gap-4">
            {BACKGROUND.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* ================================================================
              3. PLATFORMS AND RESEARCH
              ================================================================ */}

          <h2
            className="text-[18px] font-bold mt-9 mb-4"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Platforms and research
          </h2>

          <div className="flex flex-col gap-3">
            {WORK.map((item) => (
              <GlassPanel
                key={item.note}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div
                    className="text-[15.5px] font-semibold"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    {item.name}
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                    {item.note}
                  </div>
                </div>
                <StatusPill tone={item.pill.tone}>{item.pill.label}</StatusPill>
              </GlassPanel>
            ))}
          </div>
        </div>
      </ModalCard>
    </MarketingPage>
  );
}
