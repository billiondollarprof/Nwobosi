/* ==========================================================================
   LANDING PAGE
   The public entry point. There is no sign in here on purpose. This is not
   a sign up product. A company arrives with an access code and builds their
   own workspace. Read top to bottom:

      1. Nav
      2. Hero
      3. Integrations
      4. The read back
      5. The problem, and the research behind it
      6. How it works
      7. Where we deploy
      8. Services
      9. Products
     10. Security
     11. Insights
     12. Call to action
     13. Footer
   ========================================================================== */

import { Fragment, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Hotel,
  HeartPulse,
  Landmark,
  Church,
  Building2,
  Factory,
  Terminal,
  Users,
  GraduationCap,
} from "lucide-react";

import { AmaraLockup } from "../shared/icons.jsx";
import Photo from "../shared/Photo.jsx";
import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import Reveal from "../shared/Reveal.jsx";
import Typewriter from "../shared/Typewriter.jsx";
import CardStack from "../shared/CardStack.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import { useTheme } from "../shared/theme.jsx";
import { PageShell, GlassPanel, PrimaryButton, GhostButton, StatusPill } from "../shared/ui.jsx";
import MarketingNav from "../shared/MarketingNav.jsx";
import MarketingFooter from "../shared/MarketingFooter.jsx";
import IntegrationStrip from "../shared/IntegrationStrip.jsx";
import { SectionHead, GradientText, Eyebrow, Divider } from "../shared/marketing.jsx";

/* --------------------------------------------------------------------------
   Page content
   Kept as data so the sections below stay readable.
   -------------------------------------------------------------------------- */

/* The three objections an enterprise buyer raises before they will try it.
   Short forms for the phone, so the row holds one line. It used to wrap,
   which left a separator stranded at the start of the second line. */
const TRUST_POINTS = [
  { full: "Nothing leaves your walls", short: "Nothing leaves" },
  { full: "No setup team", short: "No setup team" },
  { full: "Live in 10 minutes", short: "Live in 10 min" },
];

/* What the product hands back. These rotate in the subtext, so a reader
   watching for a few seconds learns the range of work it does without
   another sentence being written. Every one is a document this really
   produces: Word and PDF are real, decks are not. */
const OUTPUTS = [
  "a client one pager",
  "a board update",
  "a renewal notice",
  "a project brief",
  "a policy summary",
];

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

/* Published research, cited rather than rewritten into house numbers. A
   figure with somebody else's name on it is worth more here than a
   rounder one with ours. */
const RESEARCH = [
  {
    figure: "69%",
    title: "Suspected shadow AI use",
    body: "Of organizations suspect or have evidence that employees are using prohibited public AI tools at work.",
    source: "Gartner survey of cybersecurity leaders, 2025",
  },
  {
    figure: "57%",
    title: "Leaked secrets concern",
    body: "Of respondents are concerned about leaked secrets appearing inside AI generated code.",
    source: "Gartner, 2023",
  },
  {
    figure: "40%",
    title: "Projected shadow AI incidents",
    body: "Of enterprises are predicted to face a security or compliance incident tied to unauthorized shadow AI by 2030.",
    source: "Gartner",
  },
];

const INDUSTRIES = [
  {
    icon: Hotel,
    title: "Hospitality",
    body: "Guest messaging, booking follow up, and concierge automation.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare",
    body: "Clinics, hospitals, and patient intake with appointment reminders.",
  },
  {
    icon: Landmark,
    title: "Financial services",
    body: "Client communication and reporting with a strict data perimeter.",
  },
  {
    icon: Church,
    title: "Faith based organizations",
    body: "Visitor follow up, event registration, and congregation care.",
  },
  {
    icon: Building2,
    title: "Enterprise and corporate",
    body: "Internal tooling and workflow automation across departments.",
  },
  {
    icon: Factory,
    title: "Engineering and manufacturing",
    body: "Technical documentation and workflow automation on private infrastructure.",
  },
];

/* The short version. The full architecture is its own page. */
const SERVICES = [
  {
    icon: Terminal,
    title: "Custom internal prompt engines",
    body: "Pre loaded with your brand voice and schemas.",
  },
  {
    icon: ShieldCheck,
    title: "Zero data retention environments",
    body: "Private APIs that never train a public model.",
  },
  {
    icon: Users,
    title: "Human in the loop workflows",
    body: "Approval checkpoints on critical actions.",
  },
  {
    icon: GraduationCap,
    title: "Executive and staff AI training",
    body: "Turning nontechnical teams into power users.",
  },
];

/* The second line of the headline. Same gradient family as the mark, so
   the logo and the words read as one system. A brighter band is woven
   into the gradient and swept slowly across with the sx-shimmer keyframe,
   so the line catches light rather than sitting flat.

   Every stop is a theme token. The band used to be a hard coded near
   white, which reads as light catching the words on a black ground and as
   nothing at all on a white one: the last word of the line washed out
   completely as the sweep passed over it. On light the band darkens
   instead of lightening. */
const HEADLINE_ACCENT = {
  background:
    "linear-gradient(90deg, var(--h-a) 0%, var(--h-b) 40%, var(--h-sheen) 50%, var(--h-b) 60%, var(--h-a) 100%)",
  backgroundSize: "220% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "sx-shimmer 6s linear infinite",
};

/* --------------------------------------------------------------------------
   SECTION: Hero aura
   The light the mark sits in.

   This replaced a four blob version that put navy, indigo, violet and deep
   purple at roughly equal weight inside a box with overflow hidden. Two
   things were wrong with it. Three hues at equal weight average out to
   grey, which is fine on black where it reads as haze and obvious on a
   light ground where it reads as a stain. And clipping a blurred shape
   with overflow hidden puts a hard straight edge across the bottom of
   something whose whole job is to have no edge.

   So: one dominant hue with one orbiting at roughly half its weight, both
   from theme tokens because a light page needs about a third of the alpha
   a black one does, and a radial mask instead of a clip, so the whole
   thing dissolves rather than stopping.
   -------------------------------------------------------------------------- */

const AURA_MASK = "radial-gradient(60% 60% at 50% 38%, #000 0%, transparent 78%)";

function HeroAura() {
  return (
    <div
      className="absolute inset-x-0 -top-24 h-[520px] sm:h-[620px] pointer-events-none"
      style={{ WebkitMaskImage: AURA_MASK, maskImage: AURA_MASK }}
      aria-hidden="true"
    >
      {/* The dominant one, sitting over the mark. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[4%] w-[86%] max-w-[680px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, var(--aura-1) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "sx-cloud-drift-a 24s ease-in-out infinite",
        }}
      />
      {/* The orbiting one, offset so the light has a direction rather than
          being a symmetrical halo. Half the weight of the first. */}
      <div
        className="absolute left-[58%] top-[26%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--aura-2) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "sx-cloud-drift-c 31s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { effectiveTheme } = useTheme();

  /* This page owns the one anchor on the site, #products, which the nav
     and the footer both point at from other pages. Arriving with it in
     the URL means "put me at that section", so it is honoured here rather
     than by the router, which sends every other arrival to the top. */
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <PageShell scroll>
      {/* ====================================================================
          1. NAV
          No sign in. The only way in is an access code, so the nav sells
          rather than signs anybody in. Shared with the other public pages,
          which is what keeps the whole public surface feeling like one
          site rather than six.
          ==================================================================== */}

      <MarketingNav />

      {/* ====================================================================
          2. HERO
          The animated mark is the centrepiece. Everything else here earns
          its place or it does not appear.
          ==================================================================== */}

      {/* The hero is sized against the window, not against a fixed stack of
          margins. Every piece below the mark is fixed height, so the mark
          is the one thing that gives: it answers to viewport height, which
          is what keeps the button above the fold on a laptop, a tablet in
          landscape, and a phone. svh, not vh, because on a phone vh is the
          height of the screen with the address bar collapsed, and a hero
          measured against that runs off the bottom of the real one. */}
      <section className="relative z-10 px-5 sm:px-8">
        <div className="relative max-w-3xl mx-auto text-center flex flex-col justify-center min-h-[calc(100svh-120px)] pt-4 pb-16 sm:pb-20">
          <HeroAura />

          {/* One moving object and one sentence. Everything that used to
              sit above the mark has gone: a badge over the top of it is
              one more thing competing with the only thing worth looking
              at. The mark carries the idea on its own. */}
          {/* Both terms matter. vh keeps the mark from pushing the button off
              a short laptop window, vw keeps it from crowding a narrow
              phone, and min() takes whichever is the tighter constraint. */}
          <div className="flex justify-center mb-6 sm:mb-11">
            <ContainmentSeal size="clamp(108px, min(21vh, 44vw), 260px)" />
          </div>

          {/* Weight 500, not 700. At this size bold is shouting, and the
              restraint is most of what separates a page that looks
              expensive from one that looks loud.

              The claim is the capability, and the containment is what makes
              the capability allowable. That order matters: led with the
              risk instead, this is a compliance tool, and every vendor in
              the category can run the same line. */}
          <h1
            className="text-[28px] sm:text-[42px] lg:text-[54px] font-medium leading-[1.08] tracking-[-0.03em] mb-5 sm:mb-6 max-w-4xl mx-auto"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            {/* Each sentence is its own block rather than two lines split by
                a <br>, so balance applies to each one on its own and neither
                can drop a single word onto a line by itself. This holds
                whatever the font measures, which matters because the display
                face loads from the network and the fallback is a different
                width. */}
            <span className="block">Private AI that already knows your company.</span>
            <span className="block" style={HEADLINE_ACCENT}>
              And never lets a word of it out.
            </span>
          </h1>

          {/* The subtext carries the third thing the headline could not: that
              this is easier than the AI they are using now, not just safer.
              One paragraph at both sizes. The old page ran two versions and
              the short one gave a phone reader the promise without the part
              that earns it. */}
          {/* Two lengths, not one paragraph squeezed down. Most people meet
              this page on a phone, and five lines of grey text there is
              five lines nobody reads. The phone gets the one sentence that
              matters. Everything above tablet gets the sentence that earns
              it as well. Both end on the same rotating phrase. */}
          <p
            className="sm:hidden text-[15.5px] leading-[1.6] max-w-[320px] mx-auto mb-7"
            style={{ color: "var(--text-2)" }}
          >
            A private repository for everything your company knows. Ask in plain language, and get
            back <Typewriter phrases={OUTPUTS} style={{ color: "var(--h-a)", fontWeight: 500 }} />
          </p>
          <p
            className="hidden sm:block text-[18px] leading-[1.6] max-w-[620px] mx-auto mb-9"
            style={{ color: "var(--text-2)" }}
          >
            A private repository for everything your company knows, in your own templates, numbers
            and voice. Nothing is trained on, and nothing crosses your boundary. Ask in plain
            language, and get back{" "}
            <Typewriter phrases={OUTPUTS} style={{ color: "var(--h-a)", fontWeight: 500 }} />
          </p>

          {/* One button only. Setting up your own company's AI is the demo,
              there is nothing else to send someone to see. */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5 sm:mb-7">
            <PrimaryButton
              onClick={() => navigate("/setup")}
              className="flex items-center gap-2 px-6 py-3.5 text-[15px]"
            >
              Build your company's AI
              <ArrowRight size={16} />
            </PrimaryButton>
          </div>

          {/* One line, always. The separators are their own children rather
              than living inside each item, and nothing wraps, so a divider
              can never end up stranded at the start of a second row. */}
          <div
            className="flex items-center justify-center gap-2.5 sm:gap-3 text-[11.5px] sm:text-[12.5px]"
            style={{ color: "var(--text-3)" }}
          >
            {TRUST_POINTS.map((point, i) => (
              <Fragment key={point.full}>
                {i > 0 && (
                  <span aria-hidden="true" style={{ opacity: 0.35 }}>
                    |
                  </span>
                )}
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">{point.short}</span>
                  <span className="hidden sm:inline">{point.full}</span>
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. INTEGRATIONS
          Two rows of connectors, moving in opposite directions. A static
          row of five reads as a short list. A moving strip reads as a
          surface things plug into.

          The line under it is deliberate. None of these are wired in the
          demo, and claiming otherwise is the fastest way to lose the
          technical reader who reviews this page before a deal moves. What
          is true is that a deployment connects the systems an organization
          already runs on, and that sentence is the more confident one
          anyway.
          ==================================================================== */}

      <section className="relative z-10 pb-20 sm:pb-28">
        <div className="px-5 sm:px-8">
          <div className="max-w-3xl mx-auto text-center mb-7">
            <Eyebrow>Integrations</Eyebrow>
            <p className="text-[15px] leading-relaxed mt-3.5" style={{ color: "var(--text-3)" }}>
              Your deployment connects the systems your organization already runs on, scoped to
              exactly what your team approves.
            </p>
          </div>
        </div>
        <IntegrationStrip />
      </section>

      {/* ====================================================================
          4. THE READ BACK
          The one thing worth showing rather than describing, and the
          reason the product can be trusted with somebody's afternoon. The
          panel on the right is the real component from the chat screen,
          same rows, same words, not a drawing of one.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal>
            <Eyebrow>Before it spends your time</Eyebrow>
            <h2
              className="text-[28px] sm:text-[38px] font-medium leading-[1.12] tracking-[-0.025em] mt-4"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              It tells you what it understood, <GradientText>before it builds anything</GradientText>
            </h2>
            <p className="text-[16px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
              Every brief comes back to you first: what it is making, who it is for, which of your
              own sources it will use, and what it is assuming. You confirm, or you say what is
              wrong and it goes round again.
            </p>
            <p className="text-[16px] leading-relaxed mt-4" style={{ color: "var(--text-2)" }}>
              The back and forth happens here, in cheap conversation, instead of after somebody has
              read a finished document that was never going to be right.
            </p>
          </Reveal>

          <Reveal delay={90}>
            <GlassPanel className="p-5 sm:p-6">
              <p className="text-[15.5px] mb-4" style={{ color: "var(--text-1)" }}>
                Here is what I have got. Let me know if anything needs to change.
              </p>
              <div className="mb-5">
                {[
                  ["Project", "Renewal one pager for Meridian Health"],
                  ["Template", "Client One Pager"],
                  ["Audience", "Their operations director"],
                  ["Source", "Brand Guide, Q2 Renewals Summary"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex gap-4 py-2 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide pt-0.5"
                      style={{ color: "var(--text-3)" }}
                    >
                      {label}
                    </span>
                    <span className="text-[14.5px]" style={{ color: "var(--text-1)" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {/* Presentational. The real one spends money, and a button on
                  a landing page that looks like it does and does not is
                  worse than no button. */}
              <div
                aria-hidden="true"
                className="px-5 py-2.5 rounded-[12px] text-[14px] font-semibold text-white w-fit"
                style={{ background: GRADIENTS.action }}
              >
                Generate
              </div>
            </GlassPanel>
            <p className="text-[12.5px] mt-3" style={{ color: "var(--text-3)" }}>
              An example brief. The screen itself is the one your staff use.
            </p>
          </Reveal>
        </Reveal>
      </section>

      {/* ====================================================================
          5. THE PROBLEM
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-10">
        <Reveal className="max-w-5xl mx-auto">
          <h2
            className="text-[28px] sm:text-[38px] font-medium text-center mb-3 tracking-[-0.025em]"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Three problems, solved at once
          </h2>
          <p className="text-[15px] text-center mb-11 max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Most teams have all three. Fixing one without the others does not hold.
          </p>

          {/* Below a laptop these stack: each card anchors, the next slides
              over it, and the one underneath sinks back. Above it, the
              three sit side by side and are read in one glance, so
              CardStack hands the layout back to this grid. */}
          {/* The anchor clears the floating nav. Parked any higher, a stuck
              card sits behind that glass pill and its text shows through
              it, which looks like a rendering fault rather than a stack. */}
          <CardStack className="grid gap-4 lg:grid-cols-3" top={116} dwell="24vh">
            {PROBLEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border p-6 backdrop-blur-xl h-full"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
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
          </CardStack>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------------
          The evidence, attached to the claim above rather than given its own
          heading. A buyer who is not yet sure this is a real problem will
          not take our word for it, and should not have to.
          -------------------------------------------------------------------- */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal className="max-w-5xl mx-auto">
          <p
            className="text-[14px] text-center mb-8 max-w-xl mx-auto"
            style={{ color: "var(--text-3)" }}
          >
            Independent research on AI in the enterprise, cited directly rather than paraphrased
            into house statistics.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {RESEARCH.map((item) => (
              <GlassPanel key={item.figure} className="p-7">
                <div
                  className="text-[40px] font-bold leading-none"
                  style={{ fontFamily: FONTS.display, color: BRAND.accentSoft }}
                >
                  {item.figure}
                </div>
                <h3
                  className="text-[16px] font-bold mt-3.5 mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {item.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {item.body}
                </p>
                <p className="text-[11.5px] mt-4" style={{ color: "var(--text-3)", opacity: 0.8 }}>
                  Source: {item.source}
                </p>
              </GlassPanel>
            ))}
          </div>

          <GlassPanel
            className="mt-4 p-7 border-l-[3px]"
            style={{ borderLeftColor: BRAND.purple }}
          >
            <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text-1)" }}>Case in point.</strong> In 2023, Samsung
              banned internal AI tool use after employees shared proprietary source code with a
              public chatbot. It is a policy response many enterprises are still repeating rather
              than solving with private infrastructure.
            </p>
          </GlassPanel>
        </Reveal>
      </section>

      {/* ====================================================================
          6. HOW IT WORKS
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal className="max-w-4xl mx-auto">
          <h2
            className="text-[28px] sm:text-[38px] font-medium text-center mb-3 tracking-[-0.025em]"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            How it works
          </h2>
          <p className="text-[15px] text-center mb-11 max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Four steps. Your staff member only takes part in the first one.
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
        </Reveal>
      </section>

      {/* ====================================================================
          7. WHERE WE DEPLOY
          The same private core, configured for how each industry runs.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="Where we deploy"
            title="Built for industries that cannot afford a leak"
            sub="The same private core, configured for how each industry actually operates."
            center
          />

          {/* The one wide photograph on the page, and it earns its place by
              showing the environment this runs in rather than decorating
              the section. It removes itself if the file is not there, so
              the grid below reads the same either way.

              The top and bottom edges dissolve into the page. A hard
              rectangle here reads as a stock photo dropped on the design;
              letting the ground come up over it makes it part of the
              section. */}
          <div className="relative mb-10">
            <Photo
              name="ops-room"
              alt="An operations floor at dusk, screens lit, people at work"
              ratio="16 / 9"
              narrowRatio="4 / 3"
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="rounded-[28px]"
              imgClassName="opacity-[0.92]"
            />
            <div
              className="absolute inset-0 rounded-[28px] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, var(--bg) 0%, transparent 20%, transparent 74%, var(--bg) 100%)",
              }}
            />
            <div
              className="absolute inset-0 rounded-[28px] pointer-events-none"
              style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((industry) => (
              <GlassPanel key={industry.title} className="p-6">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${BRAND.purple}1F` }}
                >
                  <industry.icon size={19} style={{ color: BRAND.accentSoft }} />
                </div>
                <h3
                  className="text-[16px] font-bold mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {industry.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {industry.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </Reveal>
      </section>

      <Divider />

      {/* ====================================================================
          8. SERVICES
          The four pillars in one line each. The full architecture is its
          own page, so this section stays a summary and links on.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="Core services"
            title="Four pillars of a secure AI deployment"
            sub="From private prompt infrastructure to the people who approve what it does, every layer built to keep proprietary data inside your walls."
            center
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <GlassPanel key={service.title} className="p-6">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
                >
                  <service.icon size={19} style={{ color: BRAND.accentSoft }} />
                </div>
                <h3
                  className="text-[15.5px] font-bold mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {service.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {service.body}
                </p>
              </GlassPanel>
            ))}
          </div>

          <div className="mt-8 text-center">
            <GhostButton
              onClick={() => navigate("/services")}
              className="inline-flex items-center gap-2 px-5 py-3 text-[14px]"
            >
              See the full service architecture
              <ArrowRight size={15} />
            </GhostButton>
          </div>
        </Reveal>
      </section>

      <Divider />

      {/* ====================================================================
          9. PRODUCTS
          The anchor the nav and the footer point at. Three things built and
          maintained end to end, not three things advised on.
          ==================================================================== */}

      <section id="products" className="relative z-10 px-5 sm:px-8 py-20 sm:py-28 scroll-mt-24">
        <Reveal className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="In house products"
            title="We do not just advise. We build."
            sub="Three products engineered and maintained end to end, offered under the StellaXafe umbrella."
            center
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Amara */}
            <GlassPanel className="p-0 overflow-hidden" style={{ borderTop: `3px solid ${BRAND.purple}` }}>
              <div className="p-7 pb-0">
                <div className="flex items-center justify-between gap-3">
                  <AmaraLockup size="1.5rem" glyph={26} />
                  <StatusPill tone="ok">Deployed</StatusPill>
                </div>
                <p className="text-[14px] leading-relaxed mt-4" style={{ color: "var(--text-3)" }}>
                  Multi tenant guest intelligence and automated CRM platform for hospitality. Guest
                  messaging, booking follow up, and engagement analytics in one system.
                </p>
              </div>
              <div
                className="m-7 mt-5 rounded-[12px] border px-4 py-3.5"
                style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <div className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                  Live at
                </div>
                <a
                  href="https://amara.ng"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13.5px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-2)" }}
                >
                  amara.ng
                </a>
              </div>
            </GlassPanel>

            {/* XALOM */}
            <GlassPanel
              className="p-0 overflow-hidden"
              style={{ borderTop: `3px solid ${BRAND.accentSoft}` }}
            >
              <div className="p-7 pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="font-bold text-[17px] tracking-tight"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    XALOM
                  </span>
                  <StatusPill tone="accent">Identity protocol</StatusPill>
                </div>
                <p className="text-[14px] leading-relaxed mt-4" style={{ color: "var(--text-3)" }}>
                  Digital trust, reputation, and identity infrastructure. Verifiable digital identity
                  built for secure fintech and digital ecosystems.
                </p>
              </div>
              <div
                className="m-7 mt-5 rounded-[12px] border px-4 py-3.5 flex items-center gap-3"
                style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                {/* Two files, one per background. Picking here rather than
                    hiding one with CSS means only the one being shown is
                    ever fetched. */}
                <img
                  src={effectiveTheme === "dark" ? "/xalom-dark.webp" : "/xalom-light.webp"}
                  alt=""
                  className="w-8 h-auto shrink-0"
                />
                <div>
                  <div
                    className="text-[10.5px] uppercase tracking-wide"
                    style={{ color: "var(--text-3)" }}
                  >
                    Status
                  </div>
                  <div className="text-[13.5px]" style={{ color: "var(--text-2)" }}>
                    In development
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Form Builder and Automation */}
            <GlassPanel className="p-0 overflow-hidden" style={{ borderTop: `3px solid ${BRAND.green}` }}>
              <div className="p-7 pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className="font-bold text-[16px] tracking-tight"
                    style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                  >
                    Form Builder &amp; Automation
                  </span>
                  <StatusPill tone="ok">Managed setup</StatusPill>
                </div>
                <p className="text-[14px] leading-relaxed mt-4" style={{ color: "var(--text-3)" }}>
                  Custom intake forms, appointment scheduling, and automated WhatsApp reminders for
                  churches, hospitals, and businesses of any size, with full guest and client CSV
                  export.
                </p>
              </div>
              <div className="m-7 mt-5">
                <button
                  onClick={() => navigate("/form-builder")}
                  className="inline-flex items-center gap-2 text-[14px] font-semibold transition-all hover:gap-3"
                  style={{ color: BRAND.accentSoft }}
                >
                  Explore the product
                  <ArrowRight size={15} />
                </button>
              </div>
            </GlassPanel>
          </div>
        </Reveal>
      </section>

      <Divider />

      {/* ====================================================================
          10. SECURITY
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="max-w-5xl mx-auto">
          <div
            className="rounded-[28px] border overflow-hidden backdrop-blur-xl grid lg:grid-cols-[0.85fr_1.15fr]"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Two people going through a document line by line before it
                counts. That is the read back, and it is what this section
                is claiming, so the picture is the argument rather than
                decoration. A phone gets the upright crop, because the
                landscape one puts both faces too small to read.
                The pipeline wrote 640 and 1024 for the wide file and 640
                only for the upright one, so the widths say so. */}
            <div className="relative">
              <Photo
                name="review-wide"
                alt="Two colleagues reading through a document together at a boardroom table"
                ratio="3 / 2"
                widths={[640, 1024]}
                narrow="review-portrait"
                narrowRatio="2 / 3"
                narrowWidths={[640]}
                sizes="(max-width: 1023px) 100vw, 440px"
                /* Absolute with a real height on the wide layout, so the
                   column fills whatever height the text next to it sets
                   and the reserved ratio stops applying. Below lg it goes
                   back in flow and the ratio holds the space again. */
                className="lg:absolute lg:inset-0 sx-photo-fill-lg"
              />
              {/* Same idea as the wide photograph above: the picture fades
                  into the card rather than butting up against the copy. */}
              <div
                className="lg:hidden absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, var(--surface-solid))" }}
              />
              <div
                className="hidden lg:block absolute inset-y-0 right-0 w-28 pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent, var(--surface-solid))" }}
              />
            </div>

            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-5"
                style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
              >
                <Lock size={22} style={{ color: BRAND.green }} />
              </div>

              <h2
                className="text-[24px] sm:text-[30px] font-medium mb-3 tracking-[-0.025em]"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                It only knows what you tell it
              </h2>
              <p className="text-[15px] leading-relaxed mb-7" style={{ color: "var(--text-3)" }}>
                Your admin decides what goes into the knowledge base. Every company fact in an output
                traces back to a source you approved. If something is missing, the assistant says so
                rather than making it up. Zero trust at the runtime layer, and your data never leaves
                boundaries you control.
              </p>

              <div className="flex flex-wrap gap-2.5">
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
        </Reveal>
      </section>

      {/* ====================================================================
          11. INSIGHTS
          The research, kept to a teaser. It earns a mention here because it
          says what kind of company this is, and its own page for anyone
          that answer interests.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <Reveal className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center">
            <Eyebrow>Insights</Eyebrow>
          </div>
          <h2
            className="text-[28px] sm:text-[38px] font-medium tracking-[-0.025em] mt-4"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Pioneering next gen <GradientText>AI governance architecture</GradientText>
          </h2>
          <p className="text-[15px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
            We are conceptualizing a dynamic, evolving AI governance framework designed to detect
            unauthorized proxy actions in autonomous agent code. Plus ongoing notes from the team.
          </p>
          <div className="flex justify-center mt-5">
            <StatusPill tone="accent">Actively seeking research partners and funding</StatusPill>
          </div>
          <PrimaryButton
            onClick={() => navigate("/insights")}
            className="px-7 py-3.5 text-[15px] mx-auto mt-7"
          >
            Read insights
          </PrimaryButton>
        </Reveal>
      </section>

      {/* ====================================================================
          12. CALL TO ACTION
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-24">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[30px] sm:text-[42px] font-medium mb-4 tracking-[-0.03em]"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            See it running on your own company
          </h2>
          <p className="text-[15px] mb-8" style={{ color: "var(--text-3)" }}>
            Bring your access code. Name your company, answer three questions, and watch it build something
            that already sounds like you.
          </p>
          <PrimaryButton
            onClick={() => navigate("/setup")}
            className="flex items-center gap-2 px-7 py-3.5 text-[15px] mx-auto"
          >
            Build your company's AI
            <ArrowRight size={16} />
          </PrimaryButton>
        </Reveal>
      </section>

      {/* ====================================================================
          13. FOOTER
          ==================================================================== */}

      <MarketingFooter />
    </PageShell>
  );
}
