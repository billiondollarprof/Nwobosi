/* ==========================================================================
   SETUP PAGE
   Where a company builds its own workspace. There is no sign up anywhere
   in this product. You arrive with a code or you do not get in.

   This is also the page every "Demo" link on the site lands on, which is
   why it carries the marketing shell rather than the bare app chrome: for
   most people arriving here it is the first screen of the product they
   have ever seen, and it should not feel like they left the site.

   Read top to bottom:

     1. Dev entry points
     2. Shell and layout
     3. The rail
     4. Access code
     5. Company details
     6. The read back, and build

   Nobody types an email or a password here. The access code is the
   identity: it builds the workspace the first time and opens the same one
   every time after. See the note on the derived identity in setupApi.js for
   why that is a real account underneath and not a shortcut.

   One form holds everything locally and one call at the very end either
   does the whole thing or none of it.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  KeyRound,
  Lock,
} from "lucide-react";

import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import { BRAND, FONTS } from "../shared/tokens";
import {
  PrimaryButton,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Spinner,
} from "../shared/ui.jsx";
import { MarketingPage, Eyebrow } from "../shared/marketing.jsx";
import { PRODUCT } from "../shared/config.js";
import {
  checkAccessCode,
  createWorkspace,
  openDemo,
  normaliseCode,
  companyNameProblem,
  companyAboutProblem,
  industryProblem,
  slugify,
  INDUSTRIES,
} from "../shared/setupApi.js";

/* Three, and they are the three things that actually happen. There is no
   account step any more: see the note on the derived identity in
   setupApi.js. Nobody types an email or a password to try this.

   The wording is the step, not an explanation of the step. Someone landing
   here wants to know what they are about to do, not to read a paragraph
   about what the product is. */
const STEPS = [
  { label: "Enter your code", note: "It is also how you get back in later" },
  { label: "Tell it about your company", note: "Name, what you do, industry" },
  { label: "Start using it", note: "Ask for work in plain language" },
];

/* ==========================================================================
   1. DEV ENTRY POINTS
   Three of the four screens sit behind a real access code and a real
   Supabase, so in an ordinary environment they cannot be opened to be
   looked at. That is most of the reason this page went so long without a
   design pass: it could not be screenshotted.

   `/setup?step=2` opens any of them with stand in values.

   import.meta.env.DEV is replaced by a literal at build time, so the whole
   block below is removed from a production bundle rather than shipped and
   guarded.
   ========================================================================== */

/* One gate, one function, and the stand in values live inside it. Written
   this way on purpose: with the values as separate module constants they
   stayed referenced from a live branch, so the bundler could not drop them
   and they shipped. Verified by grepping dist for them after a build. */
function devEntry() {
  const raw = new URLSearchParams(window.location.search).get("step");
  const n = Number(raw);
  if (raw === null || !Number.isInteger(n) || n < 0 || n > 2) return null;

  return {
    step: n,
    company: {
      name: "Acme Logistics",
      about:
        "We move freight across West Africa for mid sized retailers, and we run our own fleet of 40 trucks out of Lagos and Accra.",
      industry: "Manufacturing",
    },
  };
}

const DEV = import.meta.env.DEV ? devEntry() : null;

export default function Setup() {
  const navigate = useNavigate();

  /* 0 = code, 1 = company. The read back is step 1 with companyReady set,
     because nothing new is collected on it: it is the last look before the
     workspace is really built. */
  const [step, setStep] = useState(DEV ? Math.min(DEV.step, 1) : 0);

  const [code, setCode] = useState("");
  const [company, setCompany] = useState(
    DEV && DEV.step > 0 ? DEV.company : { name: "", about: "", industry: "" },
  );
  const [companyReady, setCompanyReady] = useState(DEV?.step === 2);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* What the rail draws. Display only, so the flow below is untouched.
     Building is step three arriving, which is why busy counts as it. */
  const stage = busy && companyReady ? 2 : step;

  function goBack() {
    setError("");
    if (companyReady) {
      setCompanyReady(false);
      return;
    }
    if (step === 0) navigate("/");
    else setStep((s) => s - 1);
  }

  /* ------------------------------------------------------------------------
     4. ACCESS CODE
     Checked, not redeemed. The code is only spent at the very end when the
     workspace is really created, so abandoning setup halfway does not cost
     someone their code.

     It forks here. A code that has never been used carries on into setup. A
     code that already built a workspace opens it instead, which is the
     whole reason someone can come back a week later with nothing but the
     code they were given.
     ------------------------------------------------------------------------ */

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const result = await checkAccessCode(code);

    if (!result.ok) {
      setBusy(false);
      setError(result.reason);
      return;
    }

    if (result.mode === "resume") {
      /* Stays busy across both calls. Two spinners in a row on one button
         press reads as something having gone wrong and been retried. */
      const opened = await openDemo(result.code);
      setBusy(false);
      if (!opened.ok) {
        setError(opened.reason);
        return;
      }
      navigate("/workspace");
      return;
    }

    setBusy(false);
    setCode(result.code);
    setStep(1);
  }

  /* ------------------------------------------------------------------------
     5. COMPANY DETAILS
     Three questions. This is the entire interview. Nothing here is sent
     anywhere yet, it just moves to the read back.
     ------------------------------------------------------------------------ */

  function submitCompany(e) {
    e.preventDefault();

    const nameIssue = companyNameProblem(company.name);
    if (nameIssue) return setError(nameIssue);
    const aboutIssue = companyAboutProblem(company.about);
    if (aboutIssue) return setError(aboutIssue);
    const industryIssue = industryProblem(company.industry);
    if (industryIssue) return setError(industryIssue);

    setError("");
    setCompanyReady(true);
  }

  /* ------------------------------------------------------------------------
     6. BUILD IT
     The first and only call that changes anything. Everything typed across
     all three steps is sent in one go, and the server does the whole thing
     or none of it.
     ------------------------------------------------------------------------ */

  async function submitBuild() {
    setError("");
    setBusy(true);

    const result = await createWorkspace({ code, company });

    if (!result.ok) {
      setBusy(false);
      setError(result.reason);
      return;
    }

    setBusy(false);
    navigate("/workspace");
  }

  /* ========================================================================
     2. SHELL AND LAYOUT
     Two columns from lg up: the rail explains where you are, the card is
     the only thing to act on. Below lg the rail folds into a short header,
     because on a phone a list of steps above a form is a wall between the
     person and the first field.
     ======================================================================== */

  return (
    <MarketingPage>
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-12 lg:gap-14 xl:gap-20">
          {/* ----------------------------------------------------------------
              The rail
              Sticky, so on a long screen it stays beside the form instead of
              scrolling away and leaving the card unexplained.
              ---------------------------------------------------------------- */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <StepRail stage={stage} />
            </div>
          </div>

          {/* ----------------------------------------------------------------
              The card
              ---------------------------------------------------------------- */}
          <div className="lg:col-span-7 mt-9 lg:mt-0">
            <div className="lg:max-w-[480px]">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-2 text-[13.5px] mb-4 transition-opacity hover:opacity-80"
                style={{ color: "var(--text-3)" }}
              >
                <ArrowLeft size={15} />
                {stage === 0 ? "Back to the site" : "Back a step"}
              </button>

              <div
                className="sx-card sx-card-lit rounded-[20px] border p-6 sm:p-8 backdrop-blur-xl"
                style={{
                  backgroundColor: "var(--surface-solid)",
                  animation: "sx-rise 0.35s ease",
                }}
              >
                {step === 0 && (
                  <AccessCodeStep
                    code={code}
                    busy={busy}
                    error={error}
                    onChange={(v) => setCode(normaliseCode(v))}
                    onSubmit={submitCode}
                    onRequestCode={() => navigate("/contact")}
                  />
                )}

                {step === 1 && !companyReady && (
                  <CompanyStep
                    company={company}
                    error={error}
                    onChange={(patch) => setCompany((c) => ({ ...c, ...patch }))}
                    onSubmit={submitCompany}
                  />
                )}

                {step === 1 && companyReady && (
                  <ReviewStep
                    company={company}
                    busy={busy}
                    error={error}
                    onBuild={submitBuild}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}

/* ==========================================================================
   3. THE RAIL
   What is being built, and where you are in building it.

   The steps say what happens, in the order it happens. They used to carry
   explanation instead: what the product is, what a deployment does, what
   the code costs. That is the wrong thing to put here. Somebody on this
   screen has decided to try it and wants to know what they are about to
   do, and three plain lines answer that better than three paragraphs.
   ========================================================================== */

function StepRail({ stage }) {
  return (
    <div>
      {/* The mark, at a size that reads as the product rather than as a
          favicon. It is the first screen of the app most people ever see. */}
      <div className="hidden lg:block -ml-3 mb-7">
        <ContainmentSeal size={132} />
      </div>

      {/* On a wide screen this sits beside the form and costs nothing. On a
          phone it sits on top of it, so after the first screen it is 340
          pixels of preamble between someone and the field they came back to
          fill in. Kept where it earns its place, dropped where it does not. */}
      <div className={stage === 0 ? "" : "hidden lg:block"}>
        <Eyebrow>Set up</Eyebrow>

        <h1
          className="text-[27px] sm:text-[32px] lg:text-[34px] font-medium leading-[1.12] tracking-tight mt-4 mb-3"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)", textWrap: "balance" }}
        >
          Build your company&rsquo;s AI.
        </h1>

        <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Three steps, about two minutes. Keep your code: it is what opens this again.
        </p>
      </div>

      {/* ------------------------------------------------------------------
          The steps
          A real list on a wide screen. On a phone it collapses to the row
          of pips below, because four rows of explanation above a form is a
          wall rather than a guide.
          ------------------------------------------------------------------ */}
      <ol className="hidden lg:block mt-9 space-y-0">
        {STEPS.map((item, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <li key={item.label} className="flex gap-4 pb-6 last:pb-0 relative">
              {/* The line joining one step to the next, drawn behind the
                  markers and stopped short of the last one. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[13px] top-[26px] bottom-0 w-px"
                  style={{ backgroundColor: done ? BRAND.accentSoft : "var(--border)", opacity: done ? 0.5 : 1 }}
                />
              )}

              <span
                className="w-[27px] h-[27px] rounded-full shrink-0 flex items-center justify-center text-[11.5px] font-semibold transition-colors duration-300"
                style={
                  done
                    ? { backgroundColor: BRAND.accentSoft, color: "#fff" }
                    : current
                      ? {
                          backgroundColor: "var(--surface-solid)",
                          color: "var(--text-1)",
                          border: `1px solid ${BRAND.accentSoft}`,
                          boxShadow: `0 0 0 4px ${BRAND.accentSoft}22`,
                        }
                      : { backgroundColor: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }
                }
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>

              <span className="pt-[3px]">
                <span
                  className="block text-[14px] font-semibold transition-colors duration-300"
                  style={{ color: current || done ? "var(--text-1)" : "var(--text-3)" }}
                >
                  {item.label}
                </span>
                <span className="block text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {item.note}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* The phone version of the same thing. */}
      <div className={`lg:hidden ${stage === 0 ? "mt-7" : "mt-1"}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          {STEPS.map((item, i) => (
            <span
              key={item.label}
              className="h-[3px] flex-1 rounded-full transition-colors duration-300"
              style={{
                background:
                  i <= stage ? `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.purple})` : "var(--border)",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--text-3)" }}>
          <span>
            Step {stage + 1} of {STEPS.length}
          </span>
          <span style={{ color: "var(--text-2)" }}>{STEPS[stage].label}</span>
        </div>
      </div>

      <p
        className="hidden lg:flex items-center gap-2 text-[12.5px] mt-9"
        style={{ color: "var(--text-3)" }}
      >
        <Lock size={11} />
        No email, no password. Your code is the key.
      </p>
    </div>
  );
}

/* ==========================================================================
   STEP HEADING
   The same three parts on every screen: a marker, the question, and one
   line saying why it is being asked. Written once so the four screens
   cannot drift apart in size or spacing.
   ========================================================================== */

function StepHeading({ icon: Icon, tone = "brand", title, children }) {
  const brand = tone === "brand";
  return (
    <>
      <span
        className="w-11 h-11 rounded-[13px] flex items-center justify-center mb-4"
        style={{
          backgroundColor: brand ? `${BRAND.accentSoft}1F` : `${BRAND.green}1F`,
          border: `1px solid ${brand ? BRAND.accentSoft : BRAND.green}2E`,
        }}
      >
        <Icon size={19} style={{ color: brand ? BRAND.accentSoft : BRAND.green }} />
      </span>

      <h2
        className="text-[21px] sm:text-[22px] font-semibold tracking-tight mb-2"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        {title}
      </h2>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-2)" }}>
        {children}
      </p>
    </>
  );
}

/* One place for the error line, so it looks the same on all four screens
   and cannot be forgotten on one of them. */
function ErrorLine({ children }) {
  if (!children) return null;
  return (
    <p className="text-[12.5px] mb-4" role="alert" style={{ color: BRAND.red }}>
      {children}
    </p>
  );
}

/* ==========================================================================
   4. ACCESS CODE STEP
   ========================================================================== */

function AccessCodeStep({ code, busy, error, onChange, onSubmit, onRequestCode }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={onSubmit}>
      <StepHeading icon={KeyRound} title="Enter your access code">
        {PRODUCT.name} is by invitation. Your code was sent to you directly. It is the only thing
        you need, now and every time after.
      </StepHeading>

      <Field label="Access code" required>
        <TextInput
          ref={inputRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="SX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={13}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            letterSpacing: "0.12em",
            fontSize: "17px",
            textAlign: "center",
          }}
        />
      </Field>

      <ErrorLine>{error}</ErrorLine>

      <PrimaryButton
        type="submit"
        className="w-full flex items-center justify-center gap-2"
        disabled={busy || !code}
      >
        {busy && <Spinner size={14} color="#fff" />}
        {busy ? "Checking" : "Continue"}
        {!busy && <ArrowRight size={15} />}
      </PrimaryButton>

      {/* The way out for someone who does not have a code.

          The hero's second button says "Demo it live" and it lands here, on
          a locked door. That is fine as long as the door has a bell. It
          used to have a mailto, which is not one: on a phone it opens a mail
          app that may not be set up, and on a desktop it hands someone a
          blank message to compose. This goes to the contact form instead,
          which is the same form the hero's first button goes to, and it is
          the one place that reliably reaches us.

          Drawn as a real second action rather than a link inside a
          sentence, because for a share of the people who arrive here it is
          the only thing on the screen they can actually do. */}
      <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-[12.5px] text-center leading-relaxed" style={{ color: "var(--text-3)" }}>
          No code yet? They are handed out one at a time, so ask whoever sent you the proposal.
        </p>
        <button
          type="button"
          onClick={onRequestCode}
          className="w-full mt-3 rounded-[11px] border py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
        >
          Ask {PRODUCT.name} for one
        </button>
      </div>
    </form>
  );
}

/* ==========================================================================
   5. COMPANY DETAILS STEP
   The whole interview. Three questions, and only these three are required.
   Logo, colours, and documents come later inside the admin dashboard, not
   here, so this never becomes the reason someone abandons setup.
   ========================================================================== */

function CompanyStep({ company, error, onChange, onSubmit }) {
  const nameRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, []);

  const slug = slugify(company.name);

  return (
    <form onSubmit={onSubmit}>
      <StepHeading icon={Building2} title="Tell it about your company">
        Three questions, and it starts sounding like you. Your logo, brand colours and documents
        are added later, from your dashboard.
      </StepHeading>

      <Field
        label="Company name"
        required
        hint={slug ? `Your workspace will live at /${slug}` : undefined}
      >
        <TextInput
          ref={nameRef}
          value={company.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Acme Logistics"
        />
      </Field>

      <Field label="What does your company do?" hint="A sentence or two is enough.">
        <TextArea
          value={company.about}
          onChange={(e) => onChange({ about: e.target.value })}
          placeholder="We move freight across West Africa for mid sized retailers, and we run our own fleet."
          rows={3}
        />
      </Field>

      <Field label="Industry" required>
        <SelectInput value={company.industry} onChange={(e) => onChange({ industry: e.target.value })}>
          <option value="">Choose the closest fit</option>
          {INDUSTRIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectInput>
      </Field>

      <ErrorLine>{error}</ErrorLine>

      <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2">
        Read it back
        <ArrowRight size={15} />
      </PrimaryButton>
    </form>
  );
}

/* ==========================================================================
   6. THE READ BACK
   Nothing has been created yet anywhere. This is the last look before the
   workspace and the admin account are actually made, which is why it reads
   everything back rather than just saying done.

   It is also the product's own habit, applied to itself: the assistant
   reads a brief back before it spends anyone's time on it, and setup does
   the same before it spends an access code.
   ========================================================================== */

function ReviewStep({ company, busy, error, onBuild }) {
  const slug = slugify(company.name);

  const rows = [
    ["Company", company.name],
    ["Industry", company.industry],
    ["Workspace", `/${slug}`],
  ];

  return (
    <div style={{ animation: "sx-rise 0.3s ease" }}>
      <StepHeading icon={Check} tone="ok" title="Read this back">
        Check it over, then it gets built. Your code stays yours: entering it again opens this same
        workspace.
      </StepHeading>

      <dl className="mb-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <dt
              className="w-[86px] shrink-0 text-[11px] font-semibold uppercase tracking-wide pt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {label}
            </dt>
            <dd className="text-[14px] break-words" style={{ color: "var(--text-1)" }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Labelled, because unlabelled grey text in a box under a list of
          labelled rows reads as a note from us rather than as the sentence
          the person just wrote about their own company. */}
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
        In your words
      </p>
      <p
        className="rounded-[12px] px-4 py-3.5 text-[13.5px] leading-relaxed mb-6 border"
        style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-2)" }}
      >
        {company.about}
      </p>

      <ErrorLine>{error}</ErrorLine>

      <PrimaryButton
        onClick={onBuild}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 mb-3"
      >
        {busy && <Spinner size={14} color="#fff" />}
        {busy ? "Building your workspace" : "Build my company's AI"}
        {!busy && <ArrowRight size={15} />}
      </PrimaryButton>
      <p className="text-[12.5px] text-center" style={{ color: "var(--text-3)" }}>
        {busy
          ? "This takes a few seconds. Do not close this tab."
          : `Your workspace will be live at /${slug}`}
      </p>
    </div>
  );
}
