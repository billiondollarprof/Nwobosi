/* ==========================================================================
   LANDING PAGE
   The public entry point. There is no sign in here on purpose, and there is
   no plan, seat or free tier either. Nothing about this is self serve.

   StellaXafe is built to order. A company comes with requirements and the
   deployment is built into their systems. What runs behind this page is
   the blueprint: it proves the architecture and shows the shape, and a
   buyer drives it with an access code. See DIRECTION.md before changing
   any copy here, and in particular before adding anything that reads as
   "switch it on yourself".

   Read top to bottom:

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
  MessagesSquare,
  Database,
  FileSignature,
  FileCheck2,
  ListChecks,
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
  Play,
} from "lucide-react";

import { AmaraLockup } from "../shared/icons.jsx";
import Photo from "../shared/Photo.jsx";
import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import Reveal from "../shared/Reveal.jsx";
import Typewriter from "../shared/Typewriter.jsx";
import CardStack from "../shared/CardStack.jsx";
import CountUp from "../shared/CountUp.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import { useTheme } from "../shared/theme.jsx";
import { PageShell, GlassPanel, PrimaryButton, GhostButton, GlassButton, StatusPill } from "../shared/ui.jsx";
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
   which left a separator stranded at the start of the second line.

   Two of these used to be "No setup team" and "Live in 10 minutes". Both
   are self serve claims, and this is not a self serve product. They told a
   buyer they could switch this on themselves, which is the opposite of
   what it is, and an enterprise reader who meets "live in 10 minutes" on a
   deployment page discounts everything above it. Seeing it in ten minutes
   is true, and it is what the button below actually offers. */
const TRUST_POINTS = [
  { full: "Nothing leaves your walls", short: "Nothing leaves" },
  /* "Day one" alone was the short form, and shortening it deleted the word
     carrying the claim. On a phone it read as a fragment: day one of what.
     The verb stays in at every width. */
  { full: "Useful on day one", short: "Useful day one" },
  { full: "See it in 10 minutes", short: "See it in 10 min" },
];

/* What the product hands back. These rotate in the subtext, so a reader
   watching for a few seconds learns the range of work it does without
   another sentence being written. Every one is a document this really
   produces: Word and PDF are real, decks are not.

   Each one names the company's own material, and that is the point of the
   line rather than decoration on it. The list used to read "a project
   brief", "a board update", "a client one pager". The sentence above
   promises that everything the company runs on is already inside it, and
   then paid it off with documents any chatbot writes. The promise and the
   proof have to be the same size. What no general tool can do is put this
   quarter's numbers or last year's contract into the first draft, so that
   is what the line says now. */
const OUTPUTS = [
  "a board update with this quarter's numbers",
  "a renewal notice priced off the contract",
  "a client one pager in your own template",
  "a bid that reuses your own pricing",
  "a policy summary that cites the policy",
];

/* ==========================================================================
   HERO LINE
   The sentence that ends on the rotating phrase, with its height reserved.

   The phrase changes length, that changes how many lines the paragraph
   takes, and that moves the buttons underneath it. A button that walks out
   from under a thumb every few seconds is worse than no animation at all.

   The earlier fix was a measured min-height in ems. That was fragile in two
   ways: it only held at one breakpoint, and it was measured with whatever
   font happened to be loaded, so a webfont arriving late could make the
   longest phrase wrap onto a line the reservation did not allow for.

   This reserves the space from the content instead. Every phrase is
   rendered once, invisibly, stacked in the same grid cell as the live one,
   so the block is always as tall as the tallest phrase makes it, in
   whatever font is actually being used, at whatever width. Add a phrase to
   OUTPUTS and nothing needs re-measuring.
   ========================================================================== */

/* wrapperClass has to keep this a grid at every width it is visible at.
   Tailwind's `hidden` beats the base `grid`, which is what makes the two
   variants below hide correctly, but a breakpoint that sets `block` beats
   it too and silently unstacks the reservation. */
function HeroLine({ wrapperClass = "", textClass = "", lead, tail = null }) {
  return (
    <div className={`grid ${wrapperClass}`}>
      {OUTPUTS.map((phrase) => (
        <p
          key={phrase}
          aria-hidden="true"
          className={`invisible col-start-1 row-start-1 pointer-events-none ${textClass}`}
          style={{ color: "var(--text-2)" }}
        >
          {lead}
          {/* The weight and the cursor are both here, because both take
              width and the reservation has to match what is drawn. */}
          <span style={{ fontWeight: 500 }}>{phrase}|</span>
          {tail}
        </p>
      ))}

      <p className={`col-start-1 row-start-1 ${textClass}`} style={{ color: "var(--text-2)" }}>
        {lead}
        <Typewriter phrases={OUTPUTS} style={{ color: "var(--h-a)", fontWeight: 500 }} />
        {tail}
      </p>
    </div>
  );
}

/* The three cards under the problem heading. The first one is the whole
   thesis and has to stay first: the leak is not carelessness, it is that
   the good version of the work needs context the tool does not have. Lead
   with recklessness instead and this is a policy product. */
/* What actually gets said in a company, in the words people use. This is
   the section that was doing the least work and it was because it was
   explaining a problem the reader already lives instead of showing it to
   them. A sentence about staff behaviour is an essay. The sentence itself
   is a scene. */
const OVERHEARD = [
  "Just paste the brief in, it is quicker.",
  "Upload the contract, it writes better when it can see it.",
  "It is fine, I deleted the chat after.",
  "Do not tell compliance.",
];

const PROBLEMS = [
  {
    icon: ShieldCheck,
    title: "Nothing to paste",
    body: "Everything it needs is already there. Nothing to upload, nothing to paste, and nowhere for it to go.",
  },
  {
    icon: Timer,
    title: "No thirty day ramp",
    body: "No prompt course. No power user. Your newest staff member gets the same standard of work as your best one, on their first afternoon.",
  },
  {
    icon: FileCheck2,
    title: "It cannot invent your numbers",
    body: "Every figure comes from a source your admin approved. When it does not have something, it says so. That gap is where hallucination gets in, and it is closed.",
  },
];

const STEPS = [
  {
    icon: MessagesSquare,
    title: "You ask",
    body: "In plain language. Point at the documents that matter. There is no prompt to write and nothing to learn.",
  },
  {
    icon: Database,
    title: "It reads your side first",
    body: "It goes through your company's own material for the context this task sits on, before it asks you for anything.",
  },
  {
    icon: ListChecks,
    title: "It interviews you for the rest",
    body: "It works out what is still missing and asks for that, and nothing else. This replaces prompt engineering outright.",
  },
  {
    icon: FileCheck2,
    title: "It reads the brief back",
    body: "What it is making, who it is for, which of your sources it will use, what it is assuming. You confirm, correct, or add.",
  },
  {
    icon: FileSignature,
    title: "It writes the prompt, then builds",
    body: "One prompt, written from the brief you approved, and that prompt is the second guardrail: nothing reaches the document that you did not confirm. The finished file comes back two ways at once: a download in the chat, and a draft saved into your own storage, wherever your files already live.",
    wide: true,
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
    source: "Gartner survey of 302 cybersecurity leaders, 2025",
  },
  {
    figure: "57%",
    title: "Leaked data in AI code",
    body: "Of developers worry that AI generated code will expose sensitive company or customer data.",
    source: "Sonar, State of Code developer survey, 2026",
  },
  {
    figure: "40%",
    title: "Projected shadow AI incidents",
    body: "Of enterprises are predicted to face a security or compliance incident tied to unauthorized shadow AI by 2030.",
    source: "Gartner, 2025",
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
    body: "Preloaded with your brand voice and your schemas.",
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
    body: "Not prompt courses. How to judge AI output, and where it belongs in your operation.",
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

/* The sweep needs its own mask, anchored where the light comes from. Run
   through the mask above it would be cut off at the left edge, which is
   exactly the hard edge that version was written to get rid of. */
const SWEEP_MASK =
  "radial-gradient(125% 115% at 6% 0%, #000 0%, rgba(0,0,0,0.55) 46%, transparent 82%)";

/* Sits on the section, not inside the centred column. An absolutely
   positioned child measures against its ancestor's padding box, so
   inset-x-0 here is the full width of the window. Nested in the column it
   was 768px wide with a hard vertical edge down each side, which is the
   one thing a light source must never have. */
function HeroSweep() {
  return (
    <div
      className="absolute inset-x-0 -top-40 h-[620px] sm:h-[820px] pointer-events-none"
      style={{ WebkitMaskImage: SWEEP_MASK, maskImage: SWEEP_MASK }}
      aria-hidden="true"
    >
      <div
        className="absolute -left-[15%] -top-[35%] w-[92%] h-[180%]"
        style={{
          background:
            "linear-gradient(118deg, var(--sweep-a) 0%, var(--sweep-b) 44%, transparent 74%)",
          filter: "blur(64px)",
          animation: "sx-cloud-drift-a 34s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* The horizon the hero closes on. Stripe's signature is not the gradient,
   it is that a plain rectangle sits inside a skewed, clipped container,
   which is what produces a hard diagonal edge rather than a soft fade into
   nothing. Same trick, no WebGL: the band is skewed, the parent clips it,
   and the parent is what keeps the skew from pushing the page sideways.

   Wide screens only. On a phone the hero is already tight and a horizon
   would land on top of the trust row. */
function HeroFloor() {
  return (
    <div
      className="hidden sm:block absolute inset-x-0 bottom-0 h-[110px] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* The clip is what keeps a skewed band from widening the page, and
          it is also what decides where the line lands: the band's own top
          edge sits 36px above the bottom of the hero at the centre, well
          clear of the trust row above it. */}
      <div className="sx-floor-band absolute -inset-x-[8%] top-[74px] h-[240px]" />
    </div>
  );
}

function HeroAura() {
  return (
    <div
      className="sx-hero-aura absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* The dominant one, sitting over the mark. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[40%] sm:top-[2%] w-[86%] max-w-[680px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, var(--aura-1) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "sx-swap-blue 26s ease-in-out infinite",
        }}
      />
      {/* The orbiting one, offset so the light has a direction rather than
          being a symmetrical halo. Half the weight of the first. */}
      <div
        className="absolute left-[58%] top-[56%] sm:top-[18%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--aura-2) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "sx-swap-violet 31s ease-in-out infinite",
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
        <HeroSweep />
        <HeroFloor />
        <div className="relative max-w-3xl lg:max-w-6xl mx-auto flex flex-col justify-center min-h-[calc(100svh-88px)] pt-4 pb-10 sm:pb-16">
          <HeroAura />

          {/* One column up to a laptop, two above it. The second column is
              proof rather than decoration, so it only appears where there
              is room for it to be read. Below that width the hero is
              exactly what it was, because it already worked. */}
          {/* One column up to a laptop, two above it, and the mark is the
              second column rather than a line above the headline. It is
              first in the source because a phone reads top to bottom and
              the mark belongs above the sentence there; order swaps it
              across on a wide screen, where there is no reading order to
              protect, only a composition. */}
          <div className="grid lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">
            <div className="sx-seal-slot order-1 lg:order-2 flex justify-center mb-7 sm:mb-11 lg:mb-0 relative">
              <div
                className="sx-field absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: "calc(var(--seal) * 4.2)", height: "calc(var(--seal) * 4.2)" }}
                aria-hidden="true"
              >
                {[1.9, 2.85, 4.1].map((scale, i) => (
                  <div
                    key={scale}
                    className="sx-field-ring"
                    style={{
                      width: `calc(var(--seal) * ${scale})`,
                      height: `calc(var(--seal) * ${scale})`,
                      /* Offset so the three never breathe in unison, which
                         would read as one pulsing object. */
                      animationDelay: `${i * -4.6}s`,
                    }}
                  />
                ))}
              </div>
              <ContainmentSeal size="var(--seal)" />
            </div>

            <div className="order-2 lg:order-1 text-center lg:text-left">

          {/* One moving object and one sentence. Everything that used to
              sit above the mark has gone: a badge over the top of it is
              one more thing competing with the only thing worth looking
              at. The mark carries the idea on its own. */}
          {/* The mark is in a different place at each size, and that is a
              decision rather than a compromise.

              On a phone you arrive at the top and scroll, so order is real:
              the claim should be the first thing read, and an object above
              it is something to get past. It sits below the sentence
              instead, where it becomes the pause before the button.

              On a wide screen the whole hero arrives at once. There is no
              reading order to protect, only a composition, and the mark
              belongs at the top of it. Placed mid section there it floats
              between two blocks of text with air on both sides and reads
              as an orphan rather than a crown.

              Both terms in the size matter. vh keeps it from pushing the
              button off a short laptop window, vw keeps it from crowding a
              narrow phone, and min() takes the tighter of the two. */}
          {/* Weight 500, not 700. At this size bold is shouting, and the
              restraint is most of what separates a page that looks
              expensive from one that looks loud.

              The claim is the capability, and the containment is what makes
              the capability allowable. That order matters: led with the
              risk instead, this is a compliance tool, and every vendor in
              the category can run the same line. */}
          {/* The mark, and the field it sits in. Both are sized off one
              variable so the rings stay in proportion to it at every
              width, and the rings are behind and non interactive. */}
          <h1
            className="text-[28px] sm:text-[42px] lg:text-[46px] xl:text-[52px] font-medium leading-[1.08] tracking-[-0.03em] mb-5 sm:mb-6 max-w-4xl mx-auto lg:mx-0"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            {/* Each sentence is its own block rather than two lines split by
                a <br>, so balance applies to each one on its own and neither
                can drop a single word onto a line by itself. This holds
                whatever the font measures, which matters because the display
                face loads from the network and the fallback is a different
                width. */}
            {/* The accent is on a phrase, not on a line, and it took three
                goes to land there.

                On the closing line it was twenty characters, too short a
                run for a sweep, so it read as a colour sitting on the
                words rather than light moving over them. Moved to the
                whole opening sentence it had room to travel, but colour is
                where the eye goes first, so the setup outshouted the
                payoff and "Nothing ever leaves." arrived as an
                afterthought.

                On the phrase it does both jobs. It marks the thing no
                competitor can claim, it has a long enough run to move, and
                the closing sentence stays flat, which is what makes it
                land. */}
            <span className="block">Private AI that already knows your company.</span>
            {/* This line never wraps. It is the shortest sentence on the
                page and breaking it in two is the one thing that would make
                it look accidental. Held to one line two ways: nowrap, and a
                size that shrinks only if a screen is narrow enough to need
                it, which stops nowrap from pushing the page sideways on a
                small phone. 10.6em is the measured width of the sentence in
                the display face. */}
            <span
              className="block"
              style={{
                ...HEADLINE_ACCENT,
                whiteSpace: "nowrap",
                fontSize: "min(1em, calc((100vw - 2.75rem) / 10.6))",
              }}
            >
              Nothing ever leaves.
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
          <HeroLine
            wrapperClass="sm:hidden mb-7"
            textClass="text-[15.5px] leading-[1.6] max-w-[330px] mx-auto"
            lead="Everything your company runs on is already inside it. Your staff ask in plain language and get back "
          />
          <HeroLine
            /* sm:grid, not sm:block. The reservation below is a grid
               stack, and a display utility at a breakpoint overrides the
               base one, so sm:block quietly turned the stack back into six
               paragraphs in a column. */
            wrapperClass="hidden sm:grid mb-9 lg:mb-8"
            textClass="text-[17.5px] leading-[1.6] max-w-[620px] mx-auto lg:mx-0"
            lead="Every document, template and number your company runs on is already inside it. Your staff ask in plain language and get back "
            tail={
              <span className="block mt-3" style={{ color: "var(--text-3)" }}>
                No prompt course. No power user. Their first afternoon.
              </span>
            }
          />

          {/* Two actions, and the order matters.

              This page used to offer one button, into /setup, on the
              reasoning that building your own workspace is the demo. That
              is true, and it was still the wrong primary. Nothing here is
              bought by clicking. It is built to order, so the first thing
              a reader who wants it should be able to do is tell us what
              they need, and that is a form, not a wizard.

              The demo does not disappear, it moves to second place, where
              it belongs: it is what someone does when they want to see the
              thing before they talk to anyone. Drawn as a real button
              rather than a link, because half the audience arrives wanting
              to look before they speak, and a page that only draws one of
              its two doors loses them. */}
          {/* items-stretch, so the two buttons are the same height because they
              are in the same row rather than because two paddings were tuned
              to agree. Change either one and they still match. */}
          <div className="flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-3 mb-5 sm:mb-7">
            <PrimaryButton
              onClick={() => navigate("/contact")}
              className="flex items-center justify-center gap-2 px-6 py-3.5 text-[15px]"
            >
              Build your company's AI
              <ArrowRight size={16} />
            </PrimaryButton>
            <GlassButton
              icon={Play}
              onClick={() => navigate("/setup")}
              className="justify-center sm:justify-start"
            >
              Demo it live
            </GlassButton>
          </div>

          {/* One line, always. The separators are their own children rather
              than living inside each item, and nothing wraps, so a divider
              can never end up stranded at the start of a second row. */}
          <div
            className="flex items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-[11.5px] sm:text-[12.5px]"
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

      <section className="relative z-10 pt-10 sm:pt-4 pb-20 sm:pb-28">
        <div className="px-5 sm:px-8">
          <div className="max-w-3xl mx-auto text-center mb-7">
            <Eyebrow>Integrations</Eyebrow>
            <p className="text-[15px] leading-relaxed mt-3.5" style={{ color: "var(--text-3)" }}>
              Your deployment connects to the systems your organization already runs on. Scoped to
              exactly what your team approves, and nothing beyond it.
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
              It tells you what it understood <GradientText>before it builds anything</GradientText>
            </h2>
            <p className="text-[16px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
              Every brief comes back to you first: what it is making, who it is for, which of your
              own sources it will use, and what it is assuming. You confirm, or you say what is
              wrong.
            </p>
            <p className="text-[16px] leading-relaxed mt-4" style={{ color: "var(--text-2)" }}>
              The back and forth happens here, in conversation, instead of after somebody has read a
              finished document that was never going to be right. What you confirm becomes the
              brief. Nothing outside it reaches the finished file.
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
                  ["Sources", "Brand Guide, Q2 Renewals Summary"],
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
              An example brief. This is the screen your staff see.
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
            className="text-[30px] sm:text-[42px] font-medium text-center mb-4 tracking-[-0.03em] max-w-3xl mx-auto"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
          >
            Right now, your best people are pasting your company into someone else&apos;s chatbot.
          </h2>
          <p
            className="text-[16px] text-center mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            Not because they are careless. Because it is the only way to get work that is any good.
          </p>

          {/* The scene, in the words people actually use. Set as quotes on
              their own so they read as things overheard rather than as
              copy. This is the part the section was missing: a reader
              recognises their own week here before a single claim is made
              about the product. */}
          <div className="max-w-2xl mx-auto mb-10 grid gap-2.5 sm:gap-3">
            {OVERHEARD.map((line, i) => (
              <p
                key={line}
                className={`text-[15px] sm:text-[16.5px] leading-snug px-4 py-3 rounded-[14px] border w-fit ${
                  i % 2 ? "ml-auto text-right" : ""
                }`}
                style={{
                  fontFamily: FONTS.display,
                  color: "var(--text-2)",
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                }}
              >
                &ldquo;{line}&rdquo;
              </p>
            ))}
          </div>

          <p
            className="text-[18px] sm:text-[22px] text-center mb-11 font-medium tracking-[-0.02em]"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Every company bans it. Nobody gave their staff another way.
            <br className="hidden sm:block" />{" "}
            <GradientText>StellaXafe is the other way.</GradientText>
          </p>

          {/* Below a laptop these stack: each card anchors, the next slides
              over it, and the one underneath sinks back. Above it, the
              three sit side by side and are read in one glance, so
              CardStack hands the layout back to this grid. */}
          {/* The anchor clears the floating nav. Parked any higher, a stuck
              card sits behind that glass pill and its text shows through
              it, which looks like a rendering fault rather than a stack. */}
          <CardStack className="grid gap-4 lg:grid-cols-3" top={116}>
            {PROBLEMS.map((item) => (
              <div
                key={item.title}
                className="sx-card sx-card-lit rounded-[18px] border p-6 sm:p-7 backdrop-blur-xl h-full"
                style={{ backgroundColor: "var(--surface)" }}
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

          <CardStack className="grid gap-4 sm:grid-cols-3" top={116} stackBelow={640}>
            {RESEARCH.map((item) => (
              <GlassPanel key={item.figure} className="p-7 h-full">
                {/* The figure runs up when the reader reaches it, and lands
                    on the published number exactly. A cited statistic that
                    settles on the wrong value is worse than a still one. */}
                <div
                  className="text-[40px] font-bold leading-none"
                  style={{ fontFamily: FONTS.display, color: BRAND.accentSoft }}
                >
                  <CountUp value={item.figure} />
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
          </CardStack>

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
Five steps. All your staff ever do is talk.
          </p>

          {/* Five steps into a two column grid leaves one on its own, so the
              last one takes the full width. It is the step that carries the
              guardrail, which is the point of the whole section, so the
              extra room is where it should have gone anyway.

              This is the one card section that is not stacked on a phone.
              A stack levels every card to the tallest, which is right when
              the cards are peers and wrong here: these are steps of very
              different lengths, and levelling left two hundred pixels of
              empty card under the short ones. They are also a sequence,
              and a numbered list read straight down is the clearest way to
              show an order. */}
          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`sx-card rounded-[18px] border p-6 backdrop-blur-xl flex gap-4 h-full ${
                  step.wide ? "sm:col-span-2" : ""
                }`}
                style={{ backgroundColor: "var(--surface)" }}
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
            sub="The same private core, configured for how each industry runs."
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
          <Photo
            name="ops-room"
            alt="An operations floor at dusk, screens lit, people at work"
            ratio="16 / 9"
            narrowRatio="4 / 3"
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="sx-photo-fade-y rounded-[28px] mb-10"
            imgClassName="opacity-[0.92]"
          />

          <CardStack className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" top={116} stackBelow={640}>
            {INDUSTRIES.map((industry) => (
              <GlassPanel key={industry.title} className="p-6 h-full">
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
          </CardStack>
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
            sub="From private prompt infrastructure to the people who approve what it does, every layer is built to keep proprietary data inside your walls."
            center
          />

          <CardStack className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" top={116} stackBelow={640}>
            {SERVICES.map((service) => (
              <GlassPanel key={service.title} className="p-6 h-full">
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
          </CardStack>

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
            sub="Three products, engineered and maintained end to end."
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
                  Guest intelligence and automated CRM for hospitality, on one isolated workspace
                  per property. Guest messaging, booking follow up, and engagement analytics in one
                  system.
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
            className="sx-card rounded-[28px] border overflow-hidden backdrop-blur-xl grid lg:grid-cols-[0.85fr_1.15fr]"
            style={{ backgroundColor: "var(--surface)" }}
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
                /* Fades by mask rather than by a painted overlay, for the
                   reason in index.css: paint the page colour over a dark
                   photograph on a light theme and you get fog, not a
                   dissolve. Downward on a phone where the copy is below
                   it, across on a wide screen where the copy is beside
                   it. */
                className="sx-photo-fade-b lg:sx-photo-fade-r lg:absolute lg:inset-0 sx-photo-fill-lg"
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
              <p className="text-[15px] leading-relaxed mb-4" style={{ color: "var(--text-3)" }}>
                Your admin decides what goes into the knowledge base. Every company fact in an
                output traces back to a source you approved. When something is missing it says so.
                Zero trust at the runtime layer, and your data never leaves boundaries you control.
              </p>
              {/* The storage boundary is the part a technical reviewer will
                  look for, and it is the strongest thing on this section:
                  we do not become another place their data is kept. It says
                  "your own storage" rather than naming a vendor, because
                  which one it is belongs to the requirements conversation
                  with each organization. */}
              <p className="text-[15px] leading-relaxed mb-7" style={{ color: "var(--text-3)" }}>
                Your files stay in your own storage, not inside ours. What each person works
                on is remembered for them and for nobody else, so the assistant keeps its context
                between conversations without one person's work ever reaching another's.
              </p>

              <div className="flex flex-wrap gap-2.5">
                {[
                  "No public sign up",
                  "Invite or approval only",
                  "Per person connectors",
                  "Memory is per person",
                  "Your storage, not ours",
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
            The next problem is <GradientText>tools by proxy</GradientText>
          </h2>
          <p className="text-[15px] leading-relaxed mt-5" style={{ color: "var(--text-2)" }}>
            Agents are given tools, and agents can extend themselves. So one can reach a tool it was
            never granted, not by breaking in, but because the tool was reachable. Blocking every
            call is not an option, because running unattended is the whole value. Written rules miss
            the case nobody thought of. What is needed is a checkpoint that carries its own rules
            inside it and adapts: two factor authentication for AI.
          </p>
          {/* Said plainly, because it is a thesis and the page should not
              read as though the product already does it. */}
          <p className="text-[13.5px] leading-relaxed mt-3.5" style={{ color: "var(--text-3)" }}>
            Open research by our founder. It is an argument, not something StellaXafe ships today.
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
          {/* The one place the page says what it is, plainly, because
              everything above could still be read as a product you sign up
              for. It is not. The blueprint is the honest word for what a
              reader can drive, and saying so is stronger than implying
              otherwise: an architecture that already runs is the reason a
              deployment is fast. */}
          <p className="text-[15px] leading-relaxed mb-3" style={{ color: "var(--text-3)" }}>
            Bring your access code. Name your company, answer three questions, and watch it build
            something that already sounds like you.
          </p>
          <p className="text-[14px] leading-relaxed mb-8 max-w-lg mx-auto" style={{ color: "var(--text-3)", opacity: 0.85 }}>
            This is not software you subscribe to. What you drive here is the blueprint. Your
            deployment is built into your own systems, and it is fast because the architecture, the
            guardrails and the isolation already exist and already work.
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
