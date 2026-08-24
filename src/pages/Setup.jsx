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
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";

import LogoAnimated from "../shared/LogoAnimated.jsx";
import { BRAND, FONTS } from "../shared/tokens";
import { PageShell, ThemeToggle, PrimaryButton, Field, TextInput, Spinner } from "../shared/ui.jsx";
import { PRODUCT } from "../shared/config.js";
import { checkAccessCode, normaliseCode, emailProblem, passwordProblem } from "../shared/setupApi.js";

const STEPS = ["Access code", "Your account", "Your company"];

export default function Setup() {
  const navigate = useNavigate();

  /* 0 = code, 1 = account, 2 = company */
  const [step, setStep] = useState(0);

  const [code, setCode] = useState("");
  const [admin, setAdmin] = useState({ name: "", email: "", password: "" });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function goBack() {
    setError("");
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

    setError("");
    setStep(2);
  }

  return (
    <PageShell scroll>
      {/* ====================================================================
          1. SHELL AND PROGRESS
          ==================================================================== */}

      <header className="shrink-0 relative z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-[14px] transition-opacity hover:opacity-80"
            style={{ color: "var(--text-2)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-10 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <LogoAnimated size={150} />
          </div>

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

            {step === 2 && <HoldingStep admin={admin} />}
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

      <Field label="Access code">
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
        No code? Ask whoever sent you the proposal. Codes are handed out one at a time.
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

      <Field label="Your name">
        <TextInput
          value={admin.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Your full name"
          autoComplete="name"
        />
      </Field>

      <Field label="Work email">
        <TextInput
          type="email"
          value={admin.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Password" hint={passwordIssue || "At least 10 characters."}>
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
   4. HOLDING STEP
   Company details go here next, then the workspace is created and deployed.
   ========================================================================== */

function HoldingStep({ admin }) {
  return (
    <div style={{ animation: "sx-rise 0.3s ease" }}>
      <h1
        className="text-[21px] font-bold mb-1.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        Tell us about your company
      </h1>
      <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "var(--text-3)" }}>
        Three questions: your company name, what it does, and the industry it is in. That is all
        {" "}{PRODUCT.name} needs to start sounding like you.
      </p>

      <div
        className="rounded-[12px] px-4 py-3.5 text-[13px] leading-relaxed"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
      >
        Holding your details for {admin.email}. This step is being built next, along with creating
        your workspace and putting it live.
      </div>
    </div>
  );
}
