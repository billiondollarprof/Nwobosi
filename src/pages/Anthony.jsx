/* ==========================================================================
   ANTHONY
   The page that goes on a LinkedIn profile and in a job application, for
   an AI Automation Specialist role.

   It is not the founder bio card. That page answers "who is behind
   StellaXafe" for somebody already reading about StellaXafe. This one
   answers a different question, asked by somebody who has never heard of
   either: what can this person do for us.

   THE ORDER IS THE ORDER A RECRUITER'S EYE MOVES IN (rearranged 2026-09-26)
   Anthony: "what recruiters would easily, their eyes would easily spot.
   Those comes first."
     1. Who and what: name, role, the one claim, the ways to reach him
     2. The walkthrough: StellaXafe working, on video, before any claim
        has to be taken on trust
     3. The work: four systems, each with its link
     4. What I can do for a company
     5. How I work, and why it is fast
     6. Get in touch

   THE MESSAGE, SET BY ANTHONY
   He solves business problems. He makes sophisticated tools easy for people
   to use. He takes it from product thinking to production, and he moves
   fast. Every section says one of those, in his voice: plain words, the
   question and then the answer, the "so" and "because" said out loud.

   THE RULE THIS PAGE IS WRITTEN UNDER
   A recruiter is hiring somebody who can do the job in front of them, not
   somebody who owns a business. So Amara, StellaXafe, XALOM and SHOMEA
   appear as evidence of a capability, never as assets. See "Direction is
   not copy" in CLAUDE.md before editing any line of it: no internal status
   on a public surface, no disclaimers, and a true claim stated flat.

   WHAT IT MUST NEVER DO
   - Link a stranger to a locked door. StellaXafe links to the site, not to
     the demo, which sits behind an access code.
   - Claim more than is built. XALOM says mobile first because it is, and
     SHOMEA says it was built for his church because that is where it runs.
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, FileText, Linkedin, Mail, PlayCircle } from "lucide-react";

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

/* The walkthrough. Loom's own player, so the preview frame shows before
   anybody presses play and the video streams from Loom, not from us. */

const WALKTHROUGH = {
  embed: "https://www.loom.com/embed/e8ed2275d90243318f498db728bfdbd8?hideEmbedTopBar=true",
  share: "https://www.loom.com/share/e8ed2275d90243318f498db728bfdbd8",
};

/* The work. What each one solves, then what it does, then what it is built
   on. Evidence, never ownership, and never how far along the build is. */

const WORK = [
  {
    name: "StellaXafe",
    /* The site, not the demo. The demo sits behind an access code, and
       sending a stranger to a locked door is worse than not linking at
       all: they cannot get in, and the last thing they saw was a refusal. */
    href: "https://stellaxafe.com",
    linkLabel: "Open stellaxafe.com",
    status: { tone: "ok", label: "Live" },
    line: "A private AI assistant that already knows the company it works for.",
    body: "A staff member asks for a report, a proposal or a deck. It works from the company's own approved files, asks only what it still needs, reads back what it understood, and then builds a finished file in Word, PDF, Slides or Excel, charts included. Each company's data is walled off from every other one in the database itself, and it can run on Claude or DeepSeek, chosen per company.",
    stack: "Claude API, DeepSeek, retrieval over approved sources, Postgres row-level security, edge functions, human in the loop",
  },
  {
    name: "Amara",
    href: "https://amara.ng",
    linkLabel: "Open amara.ng",
    status: { tone: "ok", label: "Live" },
    line: "Catch unhappy guests before they leave a one-star review.",
    body: "An unhappy guest scans a QR code and tells you privately what went wrong, while they are still on the property. An instant WhatsApp alert goes to the manager, so you fix it before it becomes a bad review or a lost guest. Returning guest records, a check-in webhook the hotel's own system can call, and WhatsApp messages on arrival and departure. First line to live production in under three months.",
    stack: "WhatsApp Business API, webhooks, isolated workspaces per property, automated CRM",
  },
  {
    name: "XALOM",
    href: "https://xalom.stellaxafe.com",
    linkLabel: "Open xalom.stellaxafe.com",
    status: { tone: "ok", label: "Mobile first" },
    line: "A trust passport for the digital market in Africa.",
    body: "When you buy from a stranger on Instagram or WhatsApp, it comes down to one question: can I trust this person? Today that question is answered with screenshots. XALOM answers it with a record. A seller verifies once and gets an XID, a trust passport that grows with every closed deal and every honest review, and a buyer checks it in ten seconds before they pay. Built mobile first, because that is where this market lives. The desktop version is on its way.",
    stack: "Identity verification, row-level security, its own codebase and deployment",
  },
  {
    name: "SHOMEA",
    href: "https://shomea.pages.dev/dev",
    linkLabel: "Try the listening test",
    status: { tone: "neutral", label: "Built for my church" },
    line: "The preacher speaks. The verse appears on the screen.",
    body: "It listens to the sermon, hears a Bible reference the moment it is spoken, and puts that verse on the screen in large text that reads from the back of the room. When the preacher says \"give me another version\", it switches without him naming the verse again. It runs offline on one laptop or phone, so nobody has to sit at the machine during the service.",
    stack: "On-device speech recognition (Whisper, Moonshine), offline first, web workers",
  },
];

/* Deliverables, not skills. A skills list asks the reader to work out what
   it would mean for them. Two lines each, because a scanner reads titles
   and stops. */

const DELIVERS = [
  {
    title: "Automate the work your team repeats",
    body: "Show me the work that happens every week by hand. I map it, decide where a person still belongs, and ship it as a system that runs on its own.",
  },
  {
    title: "Put your company's knowledge on tap",
    body: "Your staff get answers from your own approved material, so someone in their first week works to the standard of someone in their ninth year.",
  },
  {
    title: "Assistants your customers actually talk to",
    body: "On WhatsApp, or wherever your customers already are. It answers from your material and hands over to a person the moment it should.",
  },
  {
    title: "AI inside the stack you already run",
    body: "APIs, webhooks, databases, messaging. I work inside what you have, so nothing gets rebuilt to make room for it.",
  },
  {
    title: "Guardrails from the start",
    body: "It works from approved sources only, each company's data stays isolated, and a person approves anything before it sends or spends.",
  },
  {
    title: "Train your people to get real output",
    body: "Most teams get very little out of Claude or ChatGPT, and the gap is the approach rather than the tool. I train them on how to work with it, and the skill stays after I leave.",
  },
];

/* The method. The same shape whatever is being built, which is the point of
   showing it: it transfers to the reader's company. */

const METHOD = [
  {
    step: "01",
    title: "Understand the process",
    body: "What does the team actually do, and which step does everybody dread? Most failed AI projects were aimed at the wrong step.",
  },
  {
    step: "02",
    title: "Decide where a person stays",
    body: "Judgement, money and risk stay with a person. Settling that first is what stops a system being switched off in month two.",
  },
  {
    step: "03",
    title: "Make it easy to use",
    body: "The person using it should not need to know how it works. If a screen needs explaining, I change the screen.",
  },
  {
    step: "04",
    title: "Make it confirm before it commits",
    body: "It reads back what it understood, so a correction happens in the conversation rather than in an expensive rewrite.",
  },
  {
    step: "05",
    title: "Build it fast",
    body: "I build with AI coding agents, Claude Code and a DeepSeek harness, on patterns I have already proven. So the work is fitting rather than inventing, and quarters become weeks.",
  },
  {
    step: "06",
    title: "Ship it and hand it over",
    body: "Deployed, tested and documented, so your team can run it without me.",
  },
];

export default function Anthony() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. WHO AND WHAT
          Four seconds. The role, one claim, one line under it, the row of
          terms a recruiter scans for, and every way to reach him.
          ==================================================================== */}
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-12">
        {/* Flex column on a phone, explicit grid above it. The portrait is a
            sibling of the two text blocks rather than living inside one, so
            document order alone puts it between them on a phone and the grid
            placement below lifts it back into the right hand column on a wide
            screen. No duplicated image markup, which would cost a second
            fetch for something only one of the two ever shows. */}
        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-14 lg:items-center">
          <div className="lg:col-start-1 lg:col-span-7 lg:row-start-1">
            <Eyebrow>Anthony Nwobosi</Eyebrow>

            {/* The role the application is for, word for word, because the
                posting is called this and a screener matches on it. */}
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.12em] mt-4"
              style={{ color: BRAND.accentSoft }}
            >
              AI Automation Specialist | Agents, Workflows &amp; Custom Integrations
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
              headline: the claim is read first, then the face. */}
          <div className="mt-2 mb-9 lg:mt-0 lg:mb-0 lg:col-start-8 lg:col-span-5 lg:row-start-1 lg:row-span-2">
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
              I build AI systems that make sophisticated tools easy for people to use: the
              workflows, agents and internal tools a business runs on. I move fast, so it goes from
              the first conversation to live production in weeks.
            </p>

            {/* The scan row. Written for the eye that moves at speed, and for
                the filter a recruiter types into, so it is allowed to be dense
                in a way no other line on the page is. Strongest first. */}
            <p className="text-[13.5px] leading-[1.6] mb-8" style={{ color: "var(--text-3)" }}>
              AI agents and orchestration, workflow automation, RAG and knowledge systems, Claude
              Code, Claude API, DeepSeek, custom integrations, APIs and webhooks, WhatsApp Business
              API, edge functions, multi-tenant isolation, human-in-the-loop design.
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
                href="#walkthrough"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border px-6 py-3.5 text-[15px] font-medium transition-transform hover:scale-[1.02]"
                style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)", color: "var(--text-1)" }}
              >
                <PlayCircle size={16} style={{ color: BRAND.accentSoft }} />
                Watch the walkthrough
              </a>
            </div>

            {/* A recruiter who has decided in four seconds should not have to
                find a contact form. The mail opens already started, because a
                blank compose window is where a warm lead goes cold. */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              <a
                href={MAILTO}
                className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)", color: "var(--text-1)" }}
              >
                <Mail size={15} style={{ color: BRAND.accentSoft }} />
                anthony@stellaxafe.com
              </a>
              <a
                href="https://www.linkedin.com/in/anthony-nwobosi-575b3717a"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)", color: "var(--text-1)" }}
              >
                <Linkedin size={15} style={{ color: BRAND.accentSoft }} />
                LinkedIn
              </a>
              <button
                type="button"
                onClick={() => navigate("/anthony/cv")}
                className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)", color: "var(--text-1)" }}
              >
                <FileText size={15} style={{ color: BRAND.accentSoft }} />
                CV
              </button>
            </div>

            <p className="text-[13.5px] mt-4" style={{ color: "var(--text-3)" }}>
              Based in Nigeria (UTC+1). Open to remote roles and contract work.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. THE WALKTHROUGH
          Second, because showing beats claiming. A recruiter who presses
          play has seen the work before reading a single description of it.
          Loom's own player, so its preview frame shows before anyone
          presses play, at 16:9 on every screen width.
          ==================================================================== */}
      <section id="walkthrough" className="px-5 sm:px-8 py-12 sm:py-16 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>See it working</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-3 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            A walkthrough of StellaXafe.
          </h2>
          <p className="text-[15px] leading-relaxed max-w-2xl mb-7" style={{ color: "var(--text-3)" }}>
            You ask for a document. It reads the company's own files, asks what it still needs, reads
            back what it understood, and builds the finished file.
          </p>

          <div
            className="relative w-full overflow-hidden rounded-[18px] border"
            style={{ borderColor: "var(--card-edge)", backgroundColor: "#05060C", aspectRatio: "16 / 9" }}
          >
            <iframe
              src={WALKTHROUGH.embed}
              title="StellaXafe walkthrough"
              loading="lazy"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              style={{ border: 0 }}
            />
          </div>
          <a
            href={WALKTHROUGH.share}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-[14px] font-semibold transition-all hover:gap-3"
            style={{ color: BRAND.accentSoft }}
          >
            Open it on Loom
            <ArrowUpRight size={15} />
          </a>
        </div>
      </section>

      {/* ====================================================================
          3. THE WORK
          Four systems, each with its link. What it solves first, what it
          does next, what it is built on last, because that is the order a
          reader cares about them in.
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>The work</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            Four real problems, each one taken all the way to a working product.
          </h2>
          <p className="text-[15px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            I did the product thinking, the architecture, the interface and the deployment on every
            one of them.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {WORK.map((item) => (
              <GlassPanel key={item.name} className="p-6 sm:p-7 flex flex-col">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className="text-[19px] font-semibold tracking-tight"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    {item.name}
                  </span>
                  <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>
                </div>
                <p className="text-[15.5px] font-medium mb-2.5" style={{ color: "var(--text-1)" }}>
                  {item.line}
                </p>
                <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
                <p className="text-[12.5px] leading-[1.6] mt-4" style={{ color: "var(--text-3)" }}>
                  <span className="font-semibold" style={{ color: "var(--text-2)" }}>
                    Built on
                  </span>{" "}
                  {item.stack}
                </p>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-auto pt-5 text-[14px] font-semibold transition-all hover:gap-3"
                  style={{ color: BRAND.accentSoft }}
                >
                  {item.linkLabel}
                  <ArrowUpRight size={15} />
                </a>
              </GlassPanel>
            ))}
          </div>

          {/* The one place on the page that names tools rather than
              describing them, because a recruiter filters on proper nouns
              before a human reads a sentence. Nothing aspirational here:
              every term is in the repositories behind the work above. */}
          <p className="text-[13px] leading-[1.7] mt-8" style={{ color: "var(--text-3)" }}>
            <span className="font-semibold" style={{ color: "var(--text-2)" }}>
              How I build
            </span>{" "}
            Claude Code and a DeepSeek agent harness for the building, the Claude API and DeepSeek
            inside the products, Postgres with row-level security, edge functions, webhooks,
            WhatsApp Business API, OAuth connectors, Cloudflare. n8n, Make and Zapier where one of
            them is the right answer, though most of what I ship is custom, because it fits exactly
            and costs less to run.
          </p>
        </div>
      </section>

      {/* ====================================================================
          4. WHAT I CAN DO FOR A COMPANY
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-12 sm:py-16">
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
          5. HOW I WORK, AND WHY IT IS FAST
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>How I work</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            How do I move this fast? The same six steps, every time.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            The method does not change from one project to the next, so the delivery is measured in
            weeks, not quarters.
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
          6. GET IN TOUCH
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
            A role you are hiring for, a process your team still does by hand, or a system that
            should have AI inside it. Tell me, and I will tell you what I would do first.
          </p>
          {/* Two doors at the point a reader decides: talk, or read the
              formal document. */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/anthony/cv")}
              className="order-2 sm:order-1 inline-flex items-center justify-center gap-2.5 rounded-[12px] border px-6 py-3.5 text-[15px] font-medium transition-transform hover:scale-[1.02]"
              style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)", color: "var(--text-1)" }}
            >
              <FileText size={16} style={{ color: BRAND.accentSoft }} />
              Read the CV
            </button>
            <PrimaryButton
              onClick={() => navigate("/contact")}
              className="order-1 sm:order-2 flex items-center justify-center gap-2 px-7 py-3.5 text-[15px]"
            >
              Get in touch
              <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
