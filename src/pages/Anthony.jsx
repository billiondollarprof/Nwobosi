/* ==========================================================================
   ANTHONY
   The page that goes on a LinkedIn profile and in a job application.

   It is not the founder bio card. That page answers "who is behind
   StellaXafe" for somebody already reading about StellaXafe. This one
   answers a different question, asked by somebody who has never heard of
   either: what can this person do for us.

   THE RULE THIS PAGE IS WRITTEN UNDER
   A recruiter is not hiring somebody who owns a business, they are hiring
   somebody who can do the job in front of them. Nothing here is framed as
   ownership, funding or traction. Amara, StellaXafe and XALOM appear as
   evidence of a capability, never as assets.

   See "Direction is not copy" in CLAUDE.md before editing any line of it.
   Short version: no internal status on a public surface, no disclaimers,
   no paragraph where two lines will do, and state a true claim flat rather
   than hedged.

   Read top to bottom:

     1. Who and what
     2. What I can do for a company
     3. Where I have done it
     4. How I work
     5. Get in touch
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Linkedin, Mail } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton, StatusPill } from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import Photo from "../shared/Photo.jsx";

/* The prefilled email. Written from the sender's side, because they are the
   one who has to send it: it opens on their situation, not on a greeting. */

const MAILTO =
  "mailto:anthony@stellaxafe.com" +
  "?subject=" +
  encodeURIComponent("Work with you") +
  "&body=" +
  encodeURIComponent(
    [
      "Hi Anthony,",
      "",
      "I found your page. Here is what we are looking at:",
      "",
      "What we need:",
      "Where it sits today:",
      "Timeline:",
      "",
      "Company:",
      "Name:",
    ].join("\n"),
  );

/* Deliverables, not skills. A skills list asks the reader to work out what
   it would mean for them. Two lines each, because a scanner reads titles
   and stops. */

const DELIVERS = [
  {
    title: "Automate what your team repeats",
    body: "Point me at the work that happens every week by hand. I map it, decide where a person still belongs, and ship it as a system that runs itself.",
  },
  {
    title: "Put your company's knowledge on tap",
    body: "Staff get answers out of your own approved material. Someone in their first week works to the standard of someone in their ninth year.",
  },
  {
    title: "Assistants your customers actually talk to",
    body: "On WhatsApp, or wherever they already are. It answers from your material and hands over to a person the moment it should.",
  },
  {
    title: "AI inside the stack you already run",
    body: "APIs, webhooks, databases, messaging platforms. I work inside what you have. Nothing gets rebuilt to make room for it.",
  },
  {
    title: "Guardrails built in, not bolted on",
    body: "Approved sources only, isolation at the data layer, and a human in the loop before anything sends or spends.",
  },
  {
    title: "Train your people to get real output",
    body: "Most teams get very little back out of Claude or ChatGPT, and the gap is approach rather than tools. I train them on how to work with it, and the capability stays after I leave.",
  },
];

/* Evidence. What was delivered and what it does, never who owns it and
   never how far along the build is. */

const WORK = [
  {
    name: "Amara",
    href: "https://amara.ng",
    status: { tone: "ok", label: "Live" },
    line: "Guest experience and automated CRM for hospitality.",
    body: "A guest rates their stay privately, so a complaint reaches the manager while they are still on the property instead of landing on Google a week later. Returning guest records, an authenticated check-in webhook, and automated WhatsApp messaging on arrival and departure.",
  },
  {
    name: "StellaXafe",
    href: null,
    status: { tone: "accent", label: "In build" },
    line: "Private, company-scoped AI for organizations that cannot afford a leak.",
    body: "Multi-tenant isolation enforced in the database, connectors at the organization and staff level, and deployment inside infrastructure the customer controls. Documents never rest on our side.",
  },
  {
    name: "XALOM",
    href: null,
    status: { tone: "neutral", label: "In development" },
    line: "Digital trust and identity infrastructure.",
    body: "Verifiable identity for fintech and digital ecosystems. Its own codebase and its own deployment, so the identity layer never inherits the blast radius of whatever sits beside it.",
  },
];

/* The method. The same shape whatever is being built, which is the point of
   showing it: it transfers to the reader's company. */

const METHOD = [
  {
    step: "01",
    title: "Understand the process",
    body: "What the team actually does, and which step everybody dreads. Most failed AI projects were aimed at the wrong one.",
  },
  {
    step: "02",
    title: "Decide where a person stays",
    body: "Judgement, money, risk. Settling this first is what stops a system being switched off in month two.",
  },
  {
    step: "03",
    title: "Design around approved material",
    body: "It reads what the organization approved, and works out what is missing before it produces anything.",
  },
  {
    step: "04",
    title: "Make it confirm before it commits",
    body: "It reads back what it understood. Corrections happen in conversation, not in an expensive rewrite.",
  },
  {
    step: "05",
    title: "Build it",
    body: "The architecture, the guardrails and the isolation model already exist, so most of the work is fitting rather than inventing. Quarters compress into weeks here.",
  },
  {
    step: "06",
    title: "Ship it and hand it over",
    body: "Deployed and documented. A system only I can run is a dependency, not a delivery.",
  },
];

export default function Anthony() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. WHO AND WHAT
          Four seconds. One claim, one sentence under it, and the row of
          terms a recruiter scans for. Nothing explaining itself.
          ==================================================================== */}
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
        {/* Flex column on a phone, explicit grid above it. The portrait is a
            sibling of the two text blocks rather than living inside one, so
            document order alone puts it between them on a phone and the grid
            placement below lifts it back into the right hand column on a wide
            screen. No duplicated image markup, which would cost a second
            fetch for something only one of the two ever shows. */}
        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-14 lg:items-center">
          <div className="lg:col-start-1 lg:col-span-7 lg:row-start-1">
            <Eyebrow>Anthony Nwobosi</Eyebrow>

            <p
              className="text-[12px] font-semibold uppercase tracking-[0.12em] mt-4"
              style={{ color: BRAND.accentSoft }}
            >
              AI Native Builder | AI Automation, Workflows, Agents &amp; Business Systems
            </p>

            <h1
              className="text-[30px] sm:text-[40px] lg:text-[46px] font-medium leading-[1.1] tracking-tight mt-4 mb-6"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
            >
              I take a business problem from{" "}
              <GradientText>product thinking to production</GradientText>.
            </h1>
          </div>

          {/* The portrait. On a phone it lands here, straight after the
              headline: the claim is read first, then the face, and neither
              waits behind three paragraphs of body copy. It used to sit
              815px down a phone screen, below both buttons. */}
          <div className="mt-8 mb-9 lg:mt-0 lg:mb-0 lg:col-start-8 lg:col-span-5 lg:row-start-1 lg:row-span-2">
            <div
              className="relative rounded-[20px] overflow-hidden border"
              style={{ borderColor: "var(--card-edge)", backgroundColor: "#05060C", aspectRatio: "4 / 5" }}
            >
              <Photo
                name="anthony-nwobosi"
                alt="Anthony Nwobosi"
                widths={[640, 1024]}
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
                fill
                imgClassName="object-top"
              />
            </div>
          </div>

          <div className="lg:col-start-1 lg:col-span-7 lg:row-start-2">
            <p className="text-[16.5px] leading-[1.65] mb-6" style={{ color: "var(--text-2)" }}>
              I design and ship AI automation: the workflows, agents and internal systems a company
              runs on. End to end, first conversation to production, in weeks.
            </p>

            <p className="text-[13.5px] leading-[1.6] mb-8" style={{ color: "var(--text-3)" }}>
              AI orchestration and agents, workflow automation, RAG and knowledge systems,
              integrations, APIs and webhooks, human-in-the-loop design, prompt engineering and
              LLM tooling.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <PrimaryButton
                onClick={() => navigate("/contact")}
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-[15px]"
              >
                Work with me
                <ArrowRight size={16} />
              </PrimaryButton>
            </div>

            {/* A recruiter who has decided in four seconds should not have to
                find a contact form on a company site. This address is
                already the published one in config.js.

                Subject and body are prefilled, so the mail app opens on a
                message that is already started. A blank compose window is
                where a warm lead goes cold: the reader has to work out how
                to open, and half of them close the tab instead. Everything
                prefilled is editable, and the lines are short enough to
                read at a glance before they send. */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              <a
                href={MAILTO}
                className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{
                  borderColor: "var(--border-2)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-1)",
                }}
              >
                <Mail size={15} style={{ color: BRAND.accentSoft }} />
                anthony@stellaxafe.com
              </a>
              <a
                href="https://www.linkedin.com/in/anthony-nwobosi-575b3717a"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{
                  borderColor: "var(--border-2)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-1)",
                }}
              >
                <Linkedin size={15} style={{ color: BRAND.accentSoft }} />
                LinkedIn
              </a>
            </div>

            <p className="text-[13.5px] mt-4" style={{ color: "var(--text-3)" }}>
              Open to remote roles and contract work.
            </p>
          </div>

        </div>
      </section>

      {/* ====================================================================
          2. WHAT I CAN DO FOR A COMPANY
          Second, because it is the only question the reader is asking.
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>What I can do for you</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-10 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            The work your team is doing by hand is the work I automate.
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {DELIVERS.map((item) => (
              <GlassPanel key={item.title} className="p-6">
                <div
                  className="text-[16px] font-semibold tracking-tight mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {item.title}
                </div>
                <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. WHERE I HAVE DONE IT
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>Where I have done it</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Three systems, taken the whole way.
          </h2>
          <p className="text-[15px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            Product thinking, architecture, interface, deployment. Same person on every layer.
          </p>

          <div className="space-y-4">
            {WORK.map((item) => (
              <GlassPanel key={item.name} className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className="text-[19px] font-semibold tracking-tight"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    {item.name}
                  </span>
                  <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>
                </div>
                <p className="text-[15px] mb-2" style={{ color: "var(--text-2)" }}>
                  {item.line}
                </p>
                <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-[14px] font-semibold transition-all hover:gap-3"
                    style={{ color: BRAND.accentSoft }}
                  >
                    Open {item.href.replace("https://", "")}
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </GlassPanel>
            ))}
          </div>

          {/* One line, and it is the only place on the page that names
              things rather than describing them. It is here because a
              recruiter filters on proper nouns before a human ever reads a
              sentence, and the rest of the page deliberately speaks in
              plain words. Every term is in the repositories behind the
              three systems above. Nothing aspirational goes in this line. */}
          <p className="text-[13px] leading-[1.7] mt-8" style={{ color: "var(--text-3)" }}>
            <span className="font-semibold" style={{ color: "var(--text-2)" }}>
              Built with
            </span>{" "}
            Claude API with stage-based model routing, retrieval over approved sources, Postgres
            with row-level security, edge functions, webhooks, WhatsApp Business API, OAuth
            connectors, transactional email, Cloudflare.
          </p>
          {/* Named because the outcome is the point and the tool is not. Most
              of what ships here is custom, and saying so is the honest order
              to put these in, but a filter still looks for the platform
              names and there is no reason to be invisible to it. */}
          <p className="text-[13px] leading-[1.7] mt-2" style={{ color: "var(--text-3)" }}>
            <span className="font-semibold" style={{ color: "var(--text-2)" }}>
              Platforms
            </span>{" "}
            n8n, Make and Zapier where one is the right answer. Most of what I ship is custom,
            because it fits exactly and costs less to run.
          </p>
        </div>
      </section>

      {/* ====================================================================
          4. HOW I WORK
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>How I work</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            The model is the commodity. The system around it is the work.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            The same six steps whatever is being built. It is why delivery is weeks, not quarters.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {METHOD.map((item) => (
              <GlassPanel key={item.step} className="p-6">
                <div
                  className="text-[12px] font-semibold tracking-[0.14em] mb-3"
                  style={{ color: BRAND.accentSoft }}
                >
                  {item.step}
                </div>
                <div
                  className="text-[16px] font-semibold tracking-tight mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {item.title}
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. GET IN TOUCH
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-[26px] sm:text-[34px] font-medium leading-[1.15] tracking-tight mb-4"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            Tell me what needs building.
          </h2>
          <p className="text-[15.5px] leading-relaxed mb-8" style={{ color: "var(--text-3)" }}>
            A role you are hiring for, a process still being done by hand, or a system that should
            have AI inside it. I will tell you what I would do first.
          </p>
          <PrimaryButton
            onClick={() => navigate("/contact")}
            className="flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] mx-auto"
          >
            Get in touch
            <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </section>
    </MarketingPage>
  );
}
