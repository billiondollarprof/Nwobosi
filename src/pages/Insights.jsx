/* ==========================================================================
   INSIGHTS PAGE
   The governance research, and the writing that comes out of it. A full
   standalone page at /insights, not a modal. Read top to bottom:

     1. Hero
     2. The framework
     3. Open collaboration
     4. Writing
   ========================================================================== */

import { useNavigate } from "react-router-dom";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton, StatusPill } from "../shared/ui.jsx";
import {
  MarketingPage,
  PageHero,
  SectionHead,
  GradientText,
  Eyebrow,
  Divider,
} from "../shared/marketing.jsx";

/* --------------------------------------------------------------------------
   Page content
   -------------------------------------------------------------------------- */

const FRAMEWORK_STEPS = [
  {
    stage: "Detect",
    title: "Unauthorized proxy actions",
    body: "Identify when an agent attempts to act outside its declared scope.",
  },
  {
    stage: "Alert",
    title: "Real time human notification",
    body: "Route the flagged action to a human before it executes.",
  },
  {
    stage: "Evolve",
    title: "A guardrail that updates with the system",
    body: "The model of expected behavior updates as agent code and permissions change.",
  },
];

/* The illustrative monitor output. Kept as data so the panel below stays
   readable, and so the colour of a line is decided once, here. */
const MONITOR_LINES = [
  { text: "// agent_action_monitor.log", color: "var(--text-3)" },
  { label: "agent.scope", value: "[read orders, write tickets]" },
  { label: "action.requested", value: "write payments", color: BRAND.red },
  { label: "scope.match", value: "false", color: BRAND.red },
  { label: "status", value: "BLOCKED. pending review", color: BRAND.amber },
  { label: "alert.sent_to", value: "ops oncall" },
];

const WRITING = [
  {
    title: "Why zero retention is not the same as private",
    body: "A closer look at the difference between a no training data clause and true infrastructure isolation.",
  },
  {
    title: "Designing approval checkpoints people actually use",
    body: "Notes from deploying human in the loop workflows inside real teams.",
  },
  {
    title: "What shadow AI usage looks like from the inside",
    body: "Patterns we have seen across client audits before a private system goes in.",
  },
];

export default function Insights() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. HERO
          ==================================================================== */}

      <PageHero
        eyebrow="Forward research"
        title={
          <>
            Pioneering next gen <GradientText>AI governance architecture</GradientText>
          </>
        }
        lead="As autonomous agents take on more consequential work, the gap between the agent acting and a human knowing is where the real risk lives. We are building the architecture to close it, and writing about what we learn along the way."
      />

      {/* ====================================================================
          2. THE FRAMEWORK
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <h2
              className="text-[22px] sm:text-[26px] font-bold tracking-tight"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              A dynamic AI governance framework
            </h2>
            <p className="text-[15px] leading-relaxed mt-4" style={{ color: "var(--text-2)" }}>
              Internally, the team likes to call it the AI Police. The formal name is a dynamic,
              evolving AI governance framework, conceptualized to sit alongside autonomous agent
              code. Not a static filter, but a watching process that learns what normal looks like
              for a given workflow and flags what is not.
            </p>

            <div className="flex flex-col gap-3.5 mt-7">
              {FRAMEWORK_STEPS.map((step) => (
                <GlassPanel key={step.stage} className="p-5">
                  <div
                    className="text-[11.5px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: BRAND.accentSoft }}
                  >
                    {step.stage}
                  </div>
                  <h3
                    className="text-[15.5px] font-bold mt-2"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-3)" }}>
                    {step.body}
                  </p>
                </GlassPanel>
              ))}
            </div>
          </div>

          {/* The monitor readout. One of the two places on the whole site
              where machine output is shown as machine output, because
              here the mechanism is the point being made. */}
          <GlassPanel className="p-6 lg:sticky lg:top-24">
            <div
              className="rounded-[12px] border p-4 font-mono text-[11.5px] leading-[2] overflow-x-auto"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              {MONITOR_LINES.map((line) => (
                <div key={line.text || line.label} className="whitespace-nowrap">
                  {line.text ? (
                    <span style={{ color: line.color }}>{line.text}</span>
                  ) : (
                    <>
                      <span style={{ color: "var(--text-2)" }}>{line.label}</span>
                      <span style={{ color: "var(--text-3)" }}> &rarr; </span>
                      <span style={{ color: line.color || "var(--text-2)" }}>{line.value}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[12px] mt-3.5" style={{ color: "var(--text-3)" }}>
              Illustrative example. Proposed monitoring flow under active research.
            </p>
          </GlassPanel>
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          3. OPEN COLLABORATION
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <GlassPanel
            className="p-9 sm:p-12 text-center"
            style={{
              borderColor: "var(--border-2)",
              background: `linear-gradient(155deg, ${BRAND.purple}14, var(--surface))`,
            }}
          >
            <div className="flex justify-center">
              <Eyebrow>Open collaboration</Eyebrow>
            </div>
            <h2
              className="text-[24px] sm:text-[28px] font-bold tracking-tight mt-4"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              Actively seeking research partners
            </h2>
            <p
              className="text-[15px] leading-relaxed mt-4 max-w-lg mx-auto"
              style={{ color: "var(--text-2)" }}
            >
              Looking for research partners, institutions, and investors to co develop this
              governance framework from concept into a deployable standard.
            </p>
            <PrimaryButton
              onClick={() => navigate("/contact")}
              className="px-7 py-3.5 text-[15px] mx-auto mt-7"
            >
              Propose a partnership
            </PrimaryButton>
          </GlassPanel>
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          4. WRITING
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="From the blog"
            title="Notes on building private AI infrastructure"
            sub="Writing from the team as we build. New posts added regularly."
          />
          <div className="grid gap-5 sm:grid-cols-3">
            {WRITING.map((post) => (
              <GlassPanel key={post.title} className="p-6">
                <StatusPill tone="neutral">Coming soon</StatusPill>
                <h3
                  className="text-[16px] font-bold mt-3.5 mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {post.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {post.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
