/* ==========================================================================
   LANDING PAGE
   The public entry point. There is no sign in here on purpose. This is not
   a sign up product. A company arrives with an access code and builds their
   own workspace. Read top to bottom:

      1. Nav
      2. Hero
      3. Works with
      4. The problem
      5. The reality check
      6. How it works
      7. Where we deploy
      8. Services
      9. Products
     10. Security
     11. Insights
     12. Call to action
     13. Footer
   ========================================================================== */

import { useEffect } from "react";
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

import { AmaraWordmark } from "../shared/icons.jsx";
import LogoAnimated from "../shared/LogoAnimated.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import { useTheme } from "../shared/theme.jsx";
import { PageShell, GlassPanel, PrimaryButton, GhostButton, StatusPill } from "../shared/ui.jsx";
import MarketingNav from "../shared/MarketingNav.jsx";
import MarketingFooter from "../shared/MarketingFooter.jsx";
import { SectionHead, GradientText, Eyebrow, Divider } from "../shared/marketing.jsx";
import { PRODUCT, WORKFLOW_TOOLS } from "../shared/config.js";

/* --------------------------------------------------------------------------
   Page content
   Kept as data so the sections below stay readable.
   -------------------------------------------------------------------------- */

/* The three objections an enterprise buyer raises before they will try it. */
const TRUST_POINTS = ["Nothing leaves your walls", "No setup team", "Live in 10 minutes"];

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

/* The second line of the headline. Same gradient as the logo, so the mark
   and the words read as one system. Tuned to stay legible on true black
   and on the light background. A light band is woven into the gradient
   and slowly swept across with the existing sx-shimmer keyframe, so the
   line catches light rather than just sitting there as a flat colour. */
const HEADLINE_ACCENT = {
  background:
    "linear-gradient(90deg, #5870F8 0%, #9F5AF5 40%, #E4E9FF 50%, #9F5AF5 60%, #5870F8 100%)",
  backgroundSize: "220% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "sx-shimmer 6s linear infinite",
};

/* --------------------------------------------------------------------------
   SECTION: Hero cloud
   The hero read as too quiet on its own. This is a soft wash of colour
   sitting above the mark, not behind it and not wrapped around it, three
   blurred blobs traced along a shallow arc so the shape reads as a C
   hovering overhead, plus a wider faint wash so it spreads out past its
   own edges instead of stopping at a hard circle. Each blob drifts on its
   own timing so it reads as smoke moving, not one shape breathing in sync.
   -------------------------------------------------------------------------- */

function HeroCloud() {
  return (
    <div
      className="absolute inset-x-0 -top-16 sm:-top-24 h-[380px] sm:h-[460px] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Wide faint wash first, everything else drifts on top of it */}
      <div
        className="absolute left-1/2 top-[8%] w-[92%] max-w-[760px] h-[260px] rounded-full"
        style={{
          background: `radial-gradient(ellipse, ${BRAND.navy}26 0%, transparent 72%)`,
          filter: "blur(70px)",
          animation: "sx-cloud-drift-b 26s ease-in-out infinite",
        }}
      />
      {/* Left of the arc */}
      <div
        className="absolute left-[10%] sm:left-[18%] top-[40%] w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${BRAND.purple}59 0%, transparent 70%)`,
          filter: "blur(50px)",
          animation: "sx-cloud-drift-a 17s ease-in-out infinite",
        }}
      />
      {/* Top of the arc, the highest point of the C */}
      <div
        className="absolute left-1/2 top-0 w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${BRAND.accentSoft}4D 0%, transparent 70%)`,
          filter: "blur(55px)",
          animation: "sx-cloud-drift-b 20s ease-in-out infinite",
        }}
      />
      {/* Right of the arc, mirrors the left */}
      <div
        className="absolute right-[10%] sm:right-[18%] top-[40%] w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${BRAND.purpleDeep}59 0%, transparent 70%)`,
          filter: "blur(50px)",
          animation: "sx-cloud-drift-c 22s ease-in-out infinite",
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

      <section className="relative z-10 px-5 sm:px-8">
        <div className="relative max-w-3xl mx-auto text-center pt-10 pb-24 sm:pt-16 sm:pb-32">
          <HeroCloud />

          <div className="flex justify-center mb-12 sm:mb-16">
            <StatusPill tone="accent">Private AI, by invitation</StatusPill>
          </div>

          <div className="flex justify-center mb-12 sm:mb-16">
            <LogoAnimated size={280} />
          </div>

          <h1
            className="text-[34px] sm:text-[52px] font-bold leading-[1.1] tracking-tight mb-7"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Your staff are using AI right now.
            <br />
            <span style={HEADLINE_ACCENT}>You don't know what they've told it.</span>
          </h1>

          {/* Two lengths, not one squeezed down. Mobile gets the promise,
              desktop and tablet get the scene that earns it, plus the one
              technical term (row-level security) doing real work here:
              StellaXafe, and the landing page, are allowed to sound like
              they know what they are talking about. */}
          <p
            className="sm:hidden text-[16px] leading-relaxed max-w-[420px] mx-auto mb-11"
            style={{ color: "var(--text-2)" }}
          >
            {PRODUCT.name} gives your staff an AI that reads only what your admin approves, and never lets
            it leave your walls.
          </p>
          <p
            className="hidden sm:block text-[18px] leading-relaxed max-w-[560px] mx-auto mb-11"
            style={{ color: "var(--text-2)" }}
          >
            Every day your people paste company numbers, client names, and contracts into tools you do not
            control. {PRODUCT.name} reads only the sources your admin approves, keeps every company isolated
            with row-level security, and never lets any of it leave your walls.
          </p>

          {/* One button only. Setting up your own company's AI is the demo,
              there is nothing else to send someone to see. */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-9">
            <PrimaryButton
              onClick={() => navigate("/setup")}
              className="flex items-center gap-2 px-6 py-3.5 text-[15px]"
            >
              Build your company's AI
              <ArrowRight size={16} />
            </PrimaryButton>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12.5px]"
            style={{ color: "var(--text-3)" }}
          >
            {TRUST_POINTS.map((point, i) => (
              <span key={point} className="flex items-center gap-3">
                {i > 0 && <span style={{ opacity: 0.4 }}>|</span>}
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. WORKS WITH
          Moved out of the hero. It is reassurance, not the headline.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-5"
            style={{ color: "var(--text-3)" }}
          >
            Works with what you already use
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {WORKFLOW_TOOLS.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-xl"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              >
                <tool.icon size={16} />
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
                  {tool.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. THE PROBLEM
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[26px] sm:text-[32px] font-bold text-center mb-3 tracking-tight"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            Three problems, solved at once
          </h2>
          <p className="text-[15px] text-center mb-11 max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Most teams have all three. Fixing one without the others does not hold.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border p-6 backdrop-blur-xl"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
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
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. THE REALITY CHECK
          The evidence for the section above it, in somebody else's numbers.
          A buyer who is not sure this is a real problem yet is not going to
          take our word for it, and should not have to.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="The enterprise AI reality check"
            title="Unmanaged AI adoption is already a live risk"
            sub="Independent research on generative AI in the enterprise, cited directly rather than paraphrased into house statistics."
            center
          />

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
        </div>
      </section>

      {/* ====================================================================
          6. HOW IT WORKS
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-[26px] sm:text-[32px] font-bold text-center mb-3 tracking-tight"
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
        </div>
      </section>

      {/* ====================================================================
          7. WHERE WE DEPLOY
          The same private core, configured for how each industry runs.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="Where we deploy"
            title="Built for industries that cannot afford a leak"
            sub="The same private core, configured for how each industry actually operates."
            center
          />

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
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          8. SERVICES
          The four pillars in one line each. The full architecture is its
          own page, so this section stays a summary and links on.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
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
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          9. PRODUCTS
          The anchor the nav and the footer point at. Three things built and
          maintained end to end, not three things advised on.
          ==================================================================== */}

      <section id="products" className="relative z-10 px-5 sm:px-8 py-20 sm:py-28 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
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
                  <AmaraWordmark size="1.5rem" />
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
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          10. SECURITY
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-[20px] border p-8 sm:p-10 backdrop-blur-xl text-center"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex justify-center mb-5">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
              >
                <Lock size={22} style={{ color: BRAND.green }} />
              </div>
            </div>

            <h2
              className="text-[22px] sm:text-[26px] font-bold mb-3 tracking-tight"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              It only knows what you tell it
            </h2>
            <p className="text-[15px] leading-relaxed mb-7 max-w-xl mx-auto" style={{ color: "var(--text-3)" }}>
              Your admin decides what goes into the knowledge base. Every company fact in an output traces
              back to a source you approved. If something is missing, the assistant says so rather than
              making it up. Zero trust at the runtime layer, and your data never leaves boundaries you
              control.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
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
      </section>

      {/* ====================================================================
          11. INSIGHTS
          The research, kept to a teaser. It earns a mention here because it
          says what kind of company this is, and its own page for anyone
          that answer interests.
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center">
            <Eyebrow>Insights</Eyebrow>
          </div>
          <h2
            className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-4"
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
        </div>
      </section>

      {/* ====================================================================
          12. CALL TO ACTION
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[26px] sm:text-[34px] font-bold mb-4 tracking-tight"
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
        </div>
      </section>

      {/* ====================================================================
          13. FOOTER
          ==================================================================== */}

      <MarketingFooter />
    </PageShell>
  );
}
