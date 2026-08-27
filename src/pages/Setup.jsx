/* ==========================================================================
   SETUP PAGE
   Where a company builds its own workspace. There is no sign up anywhere
   in this product. You arrive with a code or you do not get in.

   Read top to bottom:

     1. Shell and progress
     2. Access code
     3. Admin account
     4. Holding step

   Still to build: company details, then create the workspace and deploy it
   at /your-company.
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

import { LogoLockup } from "../shared/icons.jsx";
import { BRAND, FONTS } from "../shared/tokens";
import {
  PageShell,
  ThemeToggle,
  PrimaryButton,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Spinner,
} from "../shared/ui.jsx";
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

const STEPS = ["Access code", "Your account", "Your company"];

export default function Setup() {
  const navigate = useNavigate();

  /* 0 = code, 1 = account, 2 = company */
  const [step, setStep] = useState(0);

  const [code, setCode] = useState("");
  const [admin, setAdmin] = useState({ name: "", email: "", password: "", confirm: "" });
  const [company, setCompany] = useState({ name: "", about: "", industry: "" });
  const [companyReady, setCompanyReady] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
     2. ACCESS CODE
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
     3. ADMIN ACCOUNT
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
     4. COMPANY DETAILS
     Three questions. This is the entire interview. Nothing here is sent
     anywhere yet, it just moves to the review card.
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
     5. BUILD IT
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

  return (
    <PageShell scroll>
      {/* ====================================================================
          1. SHELL AND PROGRESS
          ==================================================================== */}

      {/* Floating, not in the document flow. A header that takes up its own
          row pushes everything below it down, so even a block that centers
          itself in "the rest of the page" is really centering in the rest
          of the page after the header's height is subtracted, which sits
          below the true middle of the screen. Floating it removes that tax
          entirely: the block below now has the whole viewport to center
          against, header included, not just what is left after it. */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-[14px] transition-opacity hover:opacity-80"
            style={{ color: "var(--text-2)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <LogoLockup stacked size={20} textClass="text-[13px]" />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-6 relative z-10">
        <div className="w-full max-w-[420px]">
          <StepBar step={step} />

          <div
            className="rounded-[20px] border p-7 backdrop-blur-2xl shadow-2xl"
            style={{
              backgroundColor: "var(--surface-solid)",
              borderColor: "var(--border)",
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

          <p
            className="flex items-center justify-center gap-1.5 text-[11.5px] mt-6"
            style={{ color: "var(--text-3)" }}
          >
            <Lock size={10} />
            Nothing is created until the last step
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/* ==========================================================================
   PROGRESS BAR
   Three steps, always visible, so nobody wonders how much is left.
   ========================================================================== */

function StepBar({ step }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="h-[3px] flex-1 rounded-full transition-colors duration-300"
            style={{
              background:
                i <= step ? `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.purple})` : "var(--border)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11.5px]" style={{ color: "var(--text-3)" }}>
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        <span>{STEPS[step]}</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. ACCESS CODE STEP
   ========================================================================== */

function AccessCodeStep({ code, busy, error, onChange, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={onSubmit}>
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
      >
        <KeyRound size={20} style={{ color: BRAND.accentSoft }} />
      </div>

      <h1
        className="text-[21px] font-bold mb-1.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        Enter your access code
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        {PRODUCT.name} is by invitation. Your code was sent to you directly, and it works once.
      </p>

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

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton
        type="submit"
        className="w-full flex items-center justify-center gap-2"
        disabled={busy || !code}
      >
        {busy && <Spinner size={14} color="#fff" />}
        {busy ? "Checking" : "Continue"}
        {!busy && <ArrowRight size={15} />}
      </PrimaryButton>

      <p className="text-[12px] mt-5 text-center leading-relaxed" style={{ color: "var(--text-3)" }}>
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
   3. ADMIN ACCOUNT STEP
   ========================================================================== */

function AccountStep({ admin, error, onChange, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordIssue = admin.password ? passwordProblem(admin.password) : null;

  return (
    <form onSubmit={onSubmit}>
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
      >
        <ShieldCheck size={20} style={{ color: BRAND.accentSoft }} />
      </div>

      <h1
        className="text-[21px] font-bold mb-1.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        Your admin account
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        This is how you get back into your dashboard. You will be the only admin until you invite
        someone else.
      </p>

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
        hint={
          admin.confirm && admin.confirm !== admin.password
            ? "These do not match yet."
            : "This password is the only way back in, so it is worth checking."
        }
      >
        <div className="relative">
          <TextInput
            type={showPassword ? "text" : "password"}
            value={admin.confirm}
            onChange={(e) => onChange({ confirm: e.target.value })}
            placeholder="Same password again"
            autoComplete="new-password"
            className="pr-11"
          />
        </div>
      </Field>

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2">
        Continue
        <ArrowRight size={15} />
      </PrimaryButton>
    </form>
  );
}

/* ==========================================================================
   4. COMPANY DETAILS STEP
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
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
      >
        <Building2 size={20} style={{ color: BRAND.accentSoft }} />
      </div>

      <h1
        className="text-[21px] font-bold mb-1.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        Tell us about your company
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        Three questions. That is all {PRODUCT.name} needs to start sounding like you. Everything
        else, logo, brand colours, documents, gets added later from the admin dashboard.
      </p>

      <Field label="Company name" required hint={slug ? `Your workspace will live at /${slug}` : undefined}>
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

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2">
        Review
        <ArrowRight size={15} />
      </PrimaryButton>
    </form>
  );
}

/* ==========================================================================
   5. REVIEW STEP
   Nothing has been created yet anywhere. This is the last look before the
   workspace and the admin account are actually made, which is why it reads
   everything back rather than just saying done.
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
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
      >
        <Check size={20} style={{ color: BRAND.green }} />
      </div>

      <h1
        className="text-[21px] font-bold mb-1.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        Ready to build
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        Check this over. Your access code is spent the moment you continue from here.
      </p>

      <div className="space-y-0 mb-6">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span
              className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide pt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {label}
            </span>
            <span className="text-[14px] break-words" style={{ color: "var(--text-1)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <p
        className="rounded-[12px] px-4 py-3.5 text-[13px] leading-relaxed mb-5"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
      >
        {company.about}
      </p>

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton
        onClick={onBuild}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 mb-3"
      >
        {busy && <Spinner size={14} color="#fff" />}
        {busy ? "Building your workspace" : "Build my company's AI"}
        {!busy && <ArrowRight size={15} />}
      </PrimaryButton>
      <p className="text-[12px] text-center" style={{ color: "var(--text-3)" }}>
        {busy ? "This takes a few seconds. Do not close this tab." : `Your workspace will be live at /${slug}`}
      </p>
    </div>
  );
}
