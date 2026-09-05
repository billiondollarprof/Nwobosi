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
import Photo from "../shared/Photo.jsx";

/* --------------------------------------------------------------------------
   Page content
   -------------------------------------------------------------------------- */

const BACKGROUND = [
  "StellaXafe started with a friend uploading his company's documents into a public chatbot. Not carelessly. He did it because it produced better work, and better work was the job. That is the whole problem in one picture: the leak is not caused by people being reckless, it is caused by the good version of the work needing context the tool does not have.",
  "Anthony ships platforms end to end. Architecture, authentication, data models, and the unglamorous plumbing that decides whether a product is trustworthy on a Tuesday afternoon. Amara is live and a business runs on it. XALOM is in build. Both were taken from nothing to production, which is the part most AI safety writing has never had to do.",
  "That discipline is the whole approach here. Every private prompt engine, every zero retention environment, every human in the loop checkpoint is designed the way production infrastructure is designed. Assume failure, assume misuse, and build the guardrail before the feature ships. The guardrail is not a feature you add later, it is the thing the feature is built inside.",
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
          {/* Tall enough on a phone to hold a whole head. The portrait is
              3:4, so a short landscape box crops it at the mouth. */}
          <div className="relative min-h-[400px] md:min-h-[420px]" style={{ backgroundColor: "#05060C" }}>
            {/* Absolutely positioned, so the column's own height decides the
                crop and the reserved ratio never applies. The source is
                1086px wide, so the pipeline wrote 640 and 1024 and no
                more. */}
            <Photo
              name="anthony-nwobosi"
              alt="Anthony Nwobosi"
              widths={[640, 1024]}
              sizes="(max-width: 768px) 100vw, 45vw"
              priority
              fill
              imgClassName="object-top"
            />
            {/* The picture should sit in the card, not on top of it. On a
                phone the column is above the text and the fade runs down
                into it; side by side it runs across. Both fade to the
                card's own surface, so there is no seam to see. */}
            <div
              className="md:hidden absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, var(--surface-solid))" }}
            />
            <div
              className="hidden md:block absolute inset-y-0 right-0 w-28 pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent, var(--surface-solid))" }}
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
              Full stack engineer. Built and shipped Amara, which runs a live business today,
              and XALOM, a digital trust and identity protocol. StellaXafe is where the enterprise
              workflow tools and the AI safety architecture meet.
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
