/* ==========================================================================
   SERVICES PAGE
   What StellaXafe sells, as four pillars. Reads as a modal over the site,
   with a real URL at /services. Read top to bottom:

     1. Heading
     2. The four pillars
     3. Call to action
   ========================================================================== */

import { useNavigate } from "react-router-dom";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton } from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import ModalCard from "../shared/ModalCard.jsx";

/* --------------------------------------------------------------------------
   Page content
   -------------------------------------------------------------------------- */

const PILLARS = [
  {
    number: "01",
    stage: "Infrastructure",
    title: "Custom internal prompt engines",
    body: "Preloaded with your brand voice, your tone and your data schemas, so the first draft already sounds like your company wrote it.",
  },
  {
    number: "02",
    stage: "Privacy",
    title: "Zero data retention environments",
    body: "Prompts and responses stay inside your perimeter. Nothing is retained, and nothing is trained on.",
  },
  {
    number: "03",
    stage: "Oversight",
    title: "Human in the loop workflows",
    body: "Approval checkpoints on any action with consequences. The system proposes. A person decides. Nothing in between.",
  },
  {
    number: "04",
    stage: "Adoption",
    title: "Executive and staff AI training",
    body: "Not prompt courses. How to read AI output, where to trust it, and where it belongs in your operation.",
  },
];

export default function Services() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      <ModalCard label="Services">
        {/* ==================================================================
            1. HEADING
            ================================================================== */}

        <Eyebrow>Core services</Eyebrow>
        <h1
          className="text-[27px] sm:text-[34px] font-bold leading-[1.15] tracking-tight mt-4"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
        >
          Four pillars of a <GradientText>secure AI deployment</GradientText>
        </h1>
        <p className="text-[15.5px] leading-relaxed mt-4 max-w-xl" style={{ color: "var(--text-2)" }}>
          Each one stands alone. Together they are a deployment. Most companies need the first
          two before they need the rest, and there is no order you have to buy them in.
        </p>

        {/* ==================================================================
            2. THE FOUR PILLARS
            ================================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 mt-9">
          {PILLARS.map((pillar) => (
            <GlassPanel key={pillar.number} className="p-6">
              <div
                className="text-[12px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: BRAND.accentSoft }}
              >
                {pillar.number}. {pillar.stage}
              </div>
              <h3
                className="text-[16.5px] font-bold mt-3 mb-2"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                {pillar.title}
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                {pillar.body}
              </p>
            </GlassPanel>
          ))}
        </div>

        {/* ==================================================================
            3. CALL TO ACTION
            ================================================================== */}

        <GlassPanel className="p-7 mt-4 flex flex-wrap items-center justify-between gap-5">
          <div>
            <h3
              className="text-[16.5px] font-bold"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              Not sure which pillar you need first?
            </h3>
            <p className="text-[14px] mt-1.5" style={{ color: "var(--text-3)" }}>
              Start with a 45 minute live call.
            </p>
          </div>
          <PrimaryButton onClick={() => navigate("/contact")} className="px-6 py-3 text-[14px]">
            Book a live call
          </PrimaryButton>
        </GlassPanel>
      </ModalCard>
    </MarketingPage>
  );
}
