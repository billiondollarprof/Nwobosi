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
     5. Admin account
     6. Company details
     7. The read back, and build

   The logic is unchanged from the first version and deliberately so: three
   forms that hold everything locally, and one call at the very end that
   either does the whole thing or none of it.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
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
import { supabase } from "../shared/supabase.js";
import {
  checkAccessCode,
  createWorkspace,
  normaliseCode,
  emailProblem,
  passwordProblem,
  companyNameProblem,
  companyAboutProblem,
  industryProblem,
  slugify,
  INDUSTRIES,
} from "../shared/setupApi.js";

/* Four screens, not three. The old progress bar counted the read back as
   part of "Your company", so it said "Step 3 of 3" on a screen that still
   had a step left in it. */
const STEPS = [
  { label: "Access code", note: "Checked now, spent at the end" },
  { label: "Your account", note: "How you get back in" },
  { label: "Your company", note: "Three questions" },
  { label: "Build", note: "Your workspace goes live" },
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
  if (raw === null || !Number.isInteger(n) || n < 0 || n > 3) return null;

  return {
    step: n,
    admin: {
      name: "Anthony Nwobosi",
      email: "anthony@acmelogistics.com",
      password: "",
      confirm: "",
    },
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

  /* 0 = code, 1 = account, 2 = company. The read back is step 2 with
     companyReady set, because nothing new is collected on it. */
  const [step, setStep] = useState(DEV ? Math.min(DEV.step, 2) : 0);

  const [code, setCode] = useState("");
  const [admin, setAdmin] = useState(
    DEV && DEV.step > 0 ? DEV.admin : { name: "", email: "", password: "", confirm: "" },
  );
  const [company, setCompany] = useState(
    DEV && DEV.step > 1 ? DEV.company : { name: "", about: "", industry: "" },
  );
  const [companyReady, setCompanyReady] = useState(DEV?.step === 3);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* What the rail draws. Display only, so the flow below is untouched. */
  const stage = companyReady ? 3 : step;

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
     Checked, not redeemed. The code is only burned at the very end when the
     workspace is really created, so abandoning setup halfway does not cost
     someone their code.
     ------------------------------------------------------------------------ */

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const result = await checkAccessCode(code);

    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setCode(result.code);
    setStep(1);
  }

  /* ------------------------------------------------------------------------
     5. ADMIN ACCOUNT
     Nothing is created yet. These details are held until the end and sent
     in one go, so a half finished setup leaves nothing behind.
     ------------------------------------------------------------------------ */

  function submitAccount(e) {
    e.preventDefault();

    if (!admin.name.trim()) return setError("Enter your name.");
    const emailIssue = emailProblem(admin.email);
    if (emailIssue) return setError(emailIssue);
    const passwordIssue = passwordProblem(admin.password);
    if (passwordIssue) return setError(passwordIssue);

    /* Typed twice, because this password is the only way back into the
       workspace afterwards. There is no reset email yet, so a typo here
       is a workspace nobody can open again. */
    if (admin.password !== admin.confirm) {
      return setError("The two passwords do not match.");
    }

    setError("");
    setStep(2);
  }

  /* ------------------------------------------------------------------------
     6. COMPANY DETAILS
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
     7. BUILD IT
     The first and only call that changes anything. Everything typed across
     all three steps is sent in one go, and the server does the whole thing
     or none of it.
     ------------------------------------------------------------------------ */

  async function submitBuild() {
    setError("");
    setBusy(true);

    const result = await createWorkspace({ code, admin, company });

    if (!result.ok) {
      setBusy(false);
      setError(result.reason);
      return;
    }

    /* The account was just created with these exact details, so sign in
       with them and land the admin inside their own dashboard rather than
       at a login screen asking for something they typed two minutes ago. */
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: admin.email.trim(),
      password: admin.password,
    });

    if (signInError) {
      /* The workspace is real either way. Send them on, the dashboard will
         ask them to sign in and that is a recoverable place to be. */
      console.error("workspace created but sign in failed", signInError);
    }

    setBusy(false);
    navigate(`/${result.slug}/admin`);
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
                  />
                )}

                {step === 1 && (
                  <AccountStep
                    admin={admin}
                    error={error}
                    onChange={(patch) => setAdmin((a) => ({ ...a, ...patch }))}
                    onSubmit={submitAccount}
                  />
                )}

                {step === 2 && !companyReady && (
                  <CompanyStep
                    company={company}
                    error={error}
                    onChange={(patch) => setCompany((c) => ({ ...c, ...patch }))}
                    onSubmit={submitCompany}
                  />
                )}

                {step === 2 && companyReady && (
                  <ReviewStep
                    admin={admin}
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

   The four steps carry a line each rather than a label alone. The two
   questions this page gets asked are "how much of this is left" and "what
   is this going to do to my access code", and both are answered here
   instead of in a tooltip nobody opens.
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
          Four steps, and the last one is the only one that creates anything. When it is done your
          workspace is live and your staff can use it.
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
        Nothing is created until the last step
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

function AccessCodeStep({ code, busy, error, onChange, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={onSubmit}>
      <StepHeading icon={KeyRound} title="Enter your access code">
        {PRODUCT.name} is by invitation. Your code was sent to you directly, and it works once.
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

      <p className="text-[12.5px] mt-5 text-center leading-relaxed" style={{ color: "var(--text-3)" }}>
        No code? Ask whoever sent you the proposal, codes are handed out one at a time. Or{" "}
        <a
          href={`mailto:${PRODUCT.supportEmail}?subject=Access%20code%20request`}
          className="underline underline-offset-2 hover:opacity-80"
          style={{ color: "var(--text-2)" }}
        >
          request one from {PRODUCT.name}
        </a>
        .
      </p>
    </form>
  );
}

/* ==========================================================================
   5. ADMIN ACCOUNT STEP
   ========================================================================== */

function AccountStep({ admin, error, onChange, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordIssue = admin.password ? passwordProblem(admin.password) : null;

  return (
    <form onSubmit={onSubmit}>
      <StepHeading icon={ShieldCheck} title="Your admin account">
        This is how you get back into your dashboard. You are the only admin until you invite
        someone else.
      </StepHeading>

      <Field label="Your name" required>
        <TextInput
          value={admin.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Your full name"
          autoComplete="name"
        />
      </Field>

      <Field label="Work email" required>
        <TextInput
          type="email"
          value={admin.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Password" required hint={passwordIssue || "At least 10 characters."}>
        <div className="relative">
          <TextInput
            type={showPassword ? "text" : "password"}
            value={admin.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Choose a password"
            autoComplete="new-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={16} style={{ color: "var(--text-3)" }} />
            ) : (
              <Eye size={16} style={{ color: "var(--text-3)" }} />
            )}
          </button>
        </div>
      </Field>

      <Field
        label="Type it again"
        required
        hint={
          admin.confirm && admin.confirm !== admin.password
            ? "These do not match yet."
            : "There is no reset email yet, so this is worth checking."
        }
      >
        <TextInput
          type={showPassword ? "text" : "password"}
          value={admin.confirm}
          onChange={(e) => onChange({ confirm: e.target.value })}
          placeholder="Same password again"
          autoComplete="new-password"
        />
      </Field>

      <ErrorLine>{error}</ErrorLine>

      <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2">
        Continue
        <ArrowRight size={15} />
      </PrimaryButton>
    </form>
  );
}

/* ==========================================================================
   6. COMPANY DETAILS STEP
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
      <StepHeading icon={Building2} title="About your company">
        Three questions. That is all {PRODUCT.name} needs to start sounding like you. Your logo,
        brand colours and documents are added later, from your dashboard.
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
   7. THE READ BACK
   Nothing has been created yet anywhere. This is the last look before the
   workspace and the admin account are actually made, which is why it reads
   everything back rather than just saying done.

   It is also the product's own habit, applied to itself: the assistant
   reads a brief back before it spends anyone's time on it, and setup does
   the same before it spends an access code.
   ========================================================================== */

function ReviewStep({ admin, company, busy, error, onBuild }) {
  const slug = slugify(company.name);

  const rows = [
    ["Admin", `${admin.name}, ${admin.email}`],
    ["Company", company.name],
    ["Industry", company.industry],
    ["Workspace", `/${slug}`],
  ];

  return (
    <div style={{ animation: "sx-rise 0.3s ease" }}>
      <StepHeading icon={Check} tone="ok" title="Read this back">
        Check it over. Your access code is spent the moment you continue from here.
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
