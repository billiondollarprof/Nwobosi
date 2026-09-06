/* ==========================================================================
   ANTHONY
   The page that goes on a LinkedIn profile and in a job application.

   It is not the founder bio card. That page answers "who is behind
   StellaXafe" for somebody already reading about StellaXafe. This one
   answers a different question, asked by somebody who has never heard of
   either: what does this person build, and can they do it for us.

   WHO IT IS WRITTEN FOR
   Two readers, and they want the same evidence:

     A company hiring for AI orchestration, AI automation, agentic systems
     or forward deployed work. They are looking for somebody who can design
     the control layer and ship it, not somebody who can name models.
     A company that wants a private AI built for them.

   HOW IT IS WRITTEN
   In the language those roles are advertised in, because a recruiter scans
   for it: orchestration, control layer, connectors, human in the loop,
   webhooks. Not "uses AI to write code", which invites the reader to price
   the work as typing.

   Every claim on it is something that exists. Amara is live and a business
   runs on it. The loop below is designed and partly built, and the page
   says which is which rather than implying all of it ships today.

   Read top to bottom:

     1. Who and what
     2. The mechanism
     3. What is shipped
     4. How the work goes
     5. Get in touch
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton, StatusPill } from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import Photo from "../shared/Photo.jsx";

/* --------------------------------------------------------------------------
   The mechanism, in the order it happens. This is the differentiator and it
   is the thing worth reading twice, so it is a numbered list rather than a
   paragraph: a person scanning the page can take it in without reading it.
   -------------------------------------------------------------------------- */

const LOOP = [
  {
    step: "01",
    title: "It reads the company first",
    body: "Everything the organisation connected, plus whatever that person connected themselves. Before a word is generated.",
  },
  {
    step: "02",
    title: "It finds what is missing",
    body: "The request is compared against what actually exists. The gaps are the point, not the matches.",
  },
  {
    step: "03",
    title: "It interviews the person",
    body: "Questions, not a form. The person knows things the documents do not, and this is where that comes out.",
  },
  {
    step: "04",
    title: "It fetches, and makes them confirm",
    body: "It can search, follow a link, pull data. Nothing it found enters the work until a human has looked at it and said yes.",
  },
  {
    step: "05",
    title: "It reads the plan back",
    body: "This is what I am about to do. They approve it or correct it, and a correction goes round the loop again.",
  },
  {
    step: "06",
    title: "Only then does it build",
    body: "One long constrained prompt, then real tools producing real files. Word, Excel, a deck, an email that sends.",
  },
];

const WORK = [
  {
    name: "Amara",
    href: "https://amara.ng",
    status: { tone: "ok", label: "Live" },
    line: "Guest intelligence and automated CRM for hospitality.",
    body: "A business runs on it. Feedback capture through to WhatsApp alerts, booking follow up and engagement analytics, on an isolated workspace per property. Taken from nothing to production, including the parts nobody sees.",
  },
  {
    name: "StellaXafe",
    href: null,
    status: { tone: "accent", label: "In build" },
    line: "Private, company scoped AI for organisations that cannot leak.",
    body: "The system described above. Multi tenant isolation enforced in the database rather than in the application, connectors at both organisation and staff level, and no document ever stored on our side: work goes back to the customer's own storage.",
  },
  {
    name: "XALOM",
    href: null,
    status: { tone: "neutral", label: "In build" },
    line: "Digital trust and identity infrastructure.",
    body: "Its own codebase and its own deployment, sharing a domain by DNS only.",
  },
];

const HOW = [
  {
    title: "I design the control layer",
    body: "The interview, the gap analysis, the confirmation gate, the constrained prompt. That is where the quality and the safety live. The model underneath is a commodity everybody has.",
  },
  {
    title: "I ship the whole thing",
    body: "Architecture, auth, data model, row level security, the connectors, the interface, the deployment. Not a prototype handed to somebody else to finish.",
  },
  {
    title: "I build for the non technical user",
    body: "The person using it should not have to learn prompting, and should not be shown a single setting. If they need training, the design failed.",
  },
  {
    title: "Delivery is measured in weeks",
    body: "The architecture, the guardrails and the isolation model already exist and already run, so a deployment is configuration and integration rather than a twelve month project.",
  },
];

export default function Anthony() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. WHO AND WHAT
          The first screen has to answer "what does he build" in one
          sentence, because a recruiter gives it about four seconds.
          ==================================================================== */}
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
        <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-12 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Anthony Nwobosi</Eyebrow>

            <h1
              className="text-[30px] sm:text-[40px] lg:text-[46px] font-medium leading-[1.1] tracking-tight mt-5 mb-6"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
            >
              I design and ship private AI systems that{" "}
              <GradientText>make non technical staff productive</GradientText> without their
              company's data going anywhere.
            </h1>

            <p className="text-[16.5px] leading-[1.65] mb-5" style={{ color: "var(--text-2)" }}>
              Not chat with your documents. An orchestration layer that interviews the person,
              works out what is missing against the company's own material, makes them confirm
              anything it fetched, reads the plan back, and only then builds the work with real
              tools.
            </p>

            <p className="text-[15px] leading-[1.65] mb-8" style={{ color: "var(--text-3)" }}>
              Connectors at organisation and staff level. Isolation enforced in the database.
              Nothing retained on my side. I take these from nothing to production, which is a
              different job from writing about them.
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
                See something live
                <ArrowUpRight size={16} />
              </a>
            </div>
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
          2. THE MECHANISM
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>The mechanism</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-4 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            Most company AI answers immediately. This one refuses to.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-2xl mb-10" style={{ color: "var(--text-3)" }}>
            The common failure is not a model inventing a sentence. It is somebody typing a vague
            request into a tool that knows nothing about their company, and accepting whatever
            comes back. Six steps remove that, and none of them is a model setting.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LOOP.map((item) => (
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
          3. WHAT IS SHIPPED
          Status pills are honest on purpose. One live thing that a stranger
          can open beats three described ones.
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>Built</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-10"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Taken from nothing to production.
          </h2>

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
        </div>
      </section>

      {/* ====================================================================
          4. HOW THE WORK GOES
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>How I work</Eyebrow>
          <h2
            className="text-[26px] sm:text-[32px] font-medium leading-[1.15] tracking-tight mt-4 mb-10 max-w-2xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            The model is the commodity. The system around it is the work.
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {HOW.map((item) => (
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
          5. GET IN TOUCH
          One action. Two readers arrive on this page, a company hiring and a
          company buying, and both of them do the same next thing.
          ==================================================================== */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-[26px] sm:text-[34px] font-medium leading-[1.15] tracking-tight mb-4"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            Hiring, or want one built?
          </h2>
          <p className="text-[15.5px] leading-relaxed mb-8" style={{ color: "var(--text-3)" }}>
            Tell me what your team is doing by hand, or what the role needs. I will tell you
            plainly whether this is the right thing for it.
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
