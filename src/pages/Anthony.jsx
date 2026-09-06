/* ==========================================================================
   ANTHONY
   The page that goes on a LinkedIn profile and in a job application.

   It is not the founder bio card. That page answers "who is behind
   StellaXafe" for somebody already reading about StellaXafe. This one
   answers a different question, asked by somebody who has never heard of
   either: what can this person do for us.

   THE ONE RULE THIS PAGE IS WRITTEN UNDER
   A recruiter is not hiring somebody who owns a business. They are hiring
   somebody who can do the job in front of them. So nothing here is framed
   as ownership, funding, traction or a founder story. Amara and StellaXafe
   appear only as evidence of a capability, never as assets.

   That also decides what is left out. There are no user counts and no
   revenue figures, because the question is not how the business is doing,
   it is whether the person can deliver. And there is no repository link,
   because the repositories are private and a link to one shows a stranger
   nothing at all. Access is offered on request instead, which is the
   honest version of the same thing.

   THE HONESTY THIS PAGE HOLDS
   He is not a software engineer and the page says so outright. He does not
   write the code by hand, he directs AI to write it, and the judgement
   around that is the actual skill being sold. Claiming otherwise would
   fall apart in a technical interview, and the true version is the
   stronger claim in 2026 anyway.

   Read top to bottom:

     1. Who and what
     2. What I can do for a company
     3. Where I have done it
     4. How I work
     5. Get in touch
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton, StatusPill } from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import Photo from "../shared/Photo.jsx";

/* --------------------------------------------------------------------------
   What a company gets, written as deliverables rather than as skills. A
   skills list asks the reader to work out what it would mean for them. This
   names the thing they would actually receive.
   -------------------------------------------------------------------------- */

const DELIVERS = [
  {
    title: "Turn a manual process into a system that runs",
    body: "Point me at what your team does by hand every week. I map the workflow, work out where AI belongs and where a person has to stay, and build it into something that runs on its own. First conversation to production, without it being handed off halfway.",
  },
  {
    title: "Give your staff answers from your own material",
    body: "A knowledge system scoped to what your organization has approved, so somebody in their first week gets the same standard of answer as the person who has been there nine years. No prompt course and no power user in the middle.",
  },
  {
    title: "Put an assistant in front of your customers",
    body: "On the channels they already use, answering from material you approved, and handing over to a person the moment it should. It steps back while a human is in the conversation and picks up again when the room goes quiet.",
  },
  {
    title: "Connect AI to the systems you already run",
    body: "I work inside your stack rather than around it. APIs, webhooks, databases, serverless functions, messaging platforms, whatever you are already paying for. Nobody has to rebuild what works in order to get AI into it.",
  },
  {
    title: "Design the guardrails before the feature ships",
    body: "Approved sources only, isolation enforced at the data layer, and a human checkpoint before anything is sent or spent. Where something is missing the system says so rather than filling the gap with something that reads well.",
  },
  {
    title: "Train your people to get real output",
    body: "Most teams with AI are getting very little back from it, and the gap is almost always the approach rather than the tool. I teach them how to work with it, so the capability stays in the building after I leave.",
  },
];

/* Evidence, not a portfolio of assets. Each entry says what was delivered
   and what state it is in, and nothing about who owns it. */

const WORK = [
  {
    name: "Amara",
    href: "https://amara.ng",
    status: { tone: "ok", label: "Live" },
    line: "Guest experience and automated CRM for hospitality.",
    body: "A guest scans a code and rates their stay privately, so a complaint reaches the manager while the guest is still on the property instead of appearing on Google a week later. Around that sits a returning guest record, an authenticated check-in webhook a property system can call, and automated arrival and departure messages on WhatsApp. Live, with businesses running on it. Idea to production, mine the whole way.",
  },
  {
    name: "StellaXafe",
    href: null,
    status: { tone: "accent", label: "In build" },
    line: "Private, company-scoped AI for organizations that cannot afford to leak.",
    body: "The architecture this page is running on. Multi-tenant isolation enforced in the database rather than in the application, connectors at both the organization level and the staff level, and no document stored on our side: finished work is written back into the customer's own storage.",
  },
  {
    name: "XALOM",
    href: null,
    status: { tone: "neutral", label: "Designed, wiring left" },
    line: "Digital trust and identity infrastructure.",
    body: "Architecture and interface are done and the remaining work is wiring. Built as its own codebase and its own deployment, sharing a root domain by DNS only, so an identity layer never inherits the blast radius of whatever sits next to it.",
  },
];

/* The method, in the order it happens. This is the same shape whatever is
   being built, which is the point of showing it: it is a way of working,
   not one product's internals. */

const METHOD = [
  {
    step: "01",
    title: "Understand the process before touching a tool",
    body: "What the team actually does, where the time goes, and which step everybody quietly dreads. Most failed AI projects were pointed at the wrong step.",
  },
  {
    step: "02",
    title: "Decide where a person has to stay",
    body: "Some steps must keep a human on them, because of judgement, money, or risk. Choosing those first is what stops the system from being switched off in month two.",
  },
  {
    step: "03",
    title: "Design the system around approved material",
    body: "It reads what the organization has approved and works out what is missing before it produces anything. The gaps matter more than the matches.",
  },
  {
    step: "04",
    title: "Make it confirm before it commits",
    body: "It reads back what it understood and what it is about to do. The person approves it or corrects it, and a correction goes around again in cheap conversation instead of an expensive rewrite.",
  },
  {
    step: "05",
    title: "Build it, with AI as the accelerator",
    body: "This is where the work compresses. What used to be quoted in quarters lands in weeks, because the building is directed rather than typed.",
  },
  {
    step: "06",
    title: "Ship it, then keep it honest",
    body: "Deployed, documented, and handed over so somebody else can maintain it. A system nobody but me can run is not finished, it is a dependency.",
  },
];

export default function Anthony() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. WHO AND WHAT
          The first screen has to answer "what can this person do for us" in
          one sentence, because a recruiter gives it about four seconds. Not
          "what has he built", which is the founder version of the question
          and the wrong one to be answering here.
          ==================================================================== */}
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
        <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-12 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Anthony Nwobosi</Eyebrow>

            <p
              className="text-[12px] font-semibold uppercase tracking-[0.12em] mt-4"
              style={{ color: BRAND.accentSoft }}
            >
              AI Automation &amp; Systems Builder | Workflows, Agents &amp; Business Automation
            </p>

            <h1
              className="text-[30px] sm:text-[40px] lg:text-[46px] font-medium leading-[1.1] tracking-tight mt-4 mb-6"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
            >
              I take a business problem from{" "}
              <GradientText>product thinking to production</GradientText>.
            </h1>

            <p className="text-[16.5px] leading-[1.65] mb-5" style={{ color: "var(--text-2)" }}>
              I work out what a company actually needs, break it into a workflow, decide where AI
              belongs and where a person has to stay, and then build the thing and put it in
              front of real users. Not a strategy deck, and not a prototype for somebody else to
              finish. The working system.
            </p>

            {/* The transparency paragraph, and it is deliberately in the
                hero rather than buried. Claiming to be a software engineer
                would not survive a technical interview, and the true
                version is the stronger position in 2026: the scarce skill
                is the judgement around the build, not the typing. */}
            <p className="text-[15px] leading-[1.65] mb-5" style={{ color: "var(--text-2)" }}>
              I am not a software engineer and I am precise about that. I do not write the code by
              hand. I direct AI to write it, and I own every decision that determines whether what
              comes out is any good: what gets built, how the parts fit, where a human signs off,
              what the system must refuse to do, and when it is genuinely finished. AI is the
              accelerator. The judgement is the job.
            </p>

            <p className="text-[13.5px] leading-[1.6] mb-8" style={{ color: "var(--text-3)" }}>
              Working across AI orchestration and agents, workflow automation, integrations and
              APIs, internal tools, and company knowledge systems.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <PrimaryButton
                onClick={() => navigate("/contact")}
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-[15px]"
              >
                Work with me
                <ArrowRight size={16} />
              </PrimaryButton>
              <a
                href="https://amara.ng"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border py-3.5 px-6 text-[15px] font-medium backdrop-blur-xl transition-transform hover:scale-[1.02]"
                style={{
                  borderColor: "var(--border-2)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-1)",
                }}
              >
                Open Amara, live in production
                <ArrowUpRight size={16} />
              </a>
            </div>

            {/* A recruiter who wants to reach him should not have to find a
                contact form on a company site and fill it in. The address
                is already the published one in config.js, so this exposes
                nothing new, and it is the single highest value thing on the
                page for the reader who has decided in four seconds. */}
            <p className="text-[13.5px] mt-6" style={{ color: "var(--text-3)" }}>
              <a
                href="mailto:anthony@stellaxafe.com"
                className="font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
                style={{ color: BRAND.accentSoft, textDecorationColor: "var(--border-2)" }}
              >
                anthony@stellaxafe.com
              </a>
              <span className="mx-2.5" style={{ opacity: 0.35 }}>
                |
              </span>
              Open to remote roles and contract work
            </p>
          </div>

          {/* The photograph. Second in source order so a screen reader and a
              phone both meet the sentence before the portrait. */}
          <div className="lg:col-span-5 mt-10 lg:mt-0">
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
        </div>
      </section>

      {/* ====================================================================
          2. WHAT I CAN DO FOR A COMPANY
          The section that has to come second, because it is the answer to
          the only question the reader is actually asking.
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>What I can do for you</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            The work your team is doing by hand is the work I automate.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            Every one of these is something I have built and put in front of real users, not a
            service line written to fill a grid.
          </p>

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
          Evidence for the section above it. Status pills are honest on
          purpose: one thing a stranger can open right now beats three
          described ones.
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
            Product thinking, architecture, interface, deployment. Same person on every layer, on
            all three.
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

          {/* Said plainly rather than left as a gap. A private repository
              link shows a stranger nothing, so offering the walkthrough is
              the honest version of "here is my code". */}
          <p className="text-[14px] leading-relaxed mt-6" style={{ color: "var(--text-3)" }}>
            The repositories are private. I will walk anyone through the architecture, the code, or
            the decisions behind any of it on request.
          </p>
        </div>
      </section>

      {/* ====================================================================
          4. HOW I WORK
          The method, shown as a method rather than as one product's
          internals, because it is what transfers to the reader's company.
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
            The same six steps whatever is being built, which is why a deployment takes weeks
            rather than quarters. The thinking is already done and only the fitting is new.
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
          One action. Every reader who arrives here, hiring or buying or
          looking for training, does the same next thing.
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
            A role you are hiring for, a process your team is still doing by hand, or a system you
            already run that should have AI inside it. I will tell you plainly whether I am the
            right person for it, and what I would do first.
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
