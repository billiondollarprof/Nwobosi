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
import { ArrowRight } from "lucide-react";

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
  "Anthony builds systems that take work off people. Automating a process a team repeats by hand, putting a company's own knowledge where its staff can actually reach it, and connecting AI into the tools a business already runs on. Every one of them taken the whole way, from the first conversation through to production. All of it inside a year.",
  "StellaXafe started with a friend uploading his company's documents into a public chatbot. Not carelessly. He did it because it produced better work, and better work was the job. Every company bans that. Nobody had given their staff another way.",
  "The discipline behind all of it is the same. Assume failure, assume misuse, and build the guardrail before the feature ships. A guardrail is not something added later, it is the thing the feature gets built inside.",
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
            {/* There were two fades here, painting the card's own surface
                over the edges of the photograph so it would dissolve into
                the card rather than sit on top of it. That works on the dark
                theme and fails badly on the light one, for the reason
                index.css already gives about the security section: paint a
                light colour over a dark photograph and the result is fog,
                not a dissolve. On white it read as a grey smear down the side
                of the portrait, as though the picture had been buried in the
                page.

                A dark panel meeting a light one on a clean edge is a
                deliberate looking composition in either theme, and it needs
                no gradient at all. The column keeps its own near black
                ground, so the seam is between two intentional surfaces
                rather than between a photograph and a wash. */}
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
              AI automation and workflow systems
            </p>
            <p className="text-[15px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
              Builds AI automation: the workflows, agents and internal systems a company runs on.
              StellaXafe is where that work meets enterprise data protection.
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

          {/* The way through to anthony.stellaxafe.com, his own profile
              since 2026-11-10 (the old /anthony page is stale). It is the
              page that actually sells him. This one answers "who is behind StellaXafe" for a
              buyer already reading about StellaXafe. That one answers "what
              can this person do for us" for somebody who has never heard of
              either, and nothing in the nav points at it, so without this
              a reader who gets interested here has nowhere to go. Placed
              after the cards on purpose: by this point they have read the
              bio, and this is the moment they want more. */}
          <a
            href="https://anthony.stellaxafe.com"
            target="_blank"
            rel="noreferrer"
            className="w-full text-left mt-6 rounded-[14px] border px-5 py-4 flex items-center justify-between gap-4 transition-all hover:gap-3"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)" }}
          >
            <span>
              <span
                className="block text-[15px] font-semibold"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                More about Anthony
              </span>
              <span className="block text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                What he builds for companies, and how the work goes.
              </span>
            </span>
            <ArrowRight size={17} style={{ color: BRAND.accentSoft }} className="shrink-0" />
          </a>
        </div>
      </ModalCard>
    </MarketingPage>
  );
}
