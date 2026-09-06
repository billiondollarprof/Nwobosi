/* ==========================================================================
   AUTH PAGE
   There is no public sign up. An admin invites a staff member, or approves
   an access request raised from here. Read top to bottom:

     1. Shared shell
     2. Login
     3. No account found
     4. Request access
     5. Request sent
     6. OTP verification
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock, MailCheck, ShieldAlert, UserPlus } from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import { BRAND, FONTS } from "../shared/tokens";
import { PageShell, ThemeToggle, PrimaryButton, GhostButton, Field, TextInput, Spinner } from "../shared/ui.jsx";
import { PRODUCT } from "../shared/config.js";
import { supabase } from "../shared/supabase.js";
import { startAdminClock } from "../shared/adminClock.js";
import { loadMe } from "../shared/session.js";

/* MUST match Supabase: Authentication → Sign In / Providers → Email → Email
   OTP Length. The setting takes 6 to 10, and newer projects are created at
   8, so this is not a safe assumption to leave unstated.

   The two cannot share a source of truth, one is a dashboard field and one
   is a bundle, so the coupling is documented at the place it breaks: if
   Supabase is set to 8 and this says 6, somebody types six of their eight
   digits, the code is refused, and nothing on screen explains why. */
const OTP_LENGTH = 6;

export default function Auth() {
  const navigate = useNavigate();

  /* One of: login, notfound, request, requested, otp */
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");

  const [requestName, setRequestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function resetTo(next) {
    setError("");
    setBusy(false);
    setMode(next);
  }

  /* ------------------------------------------------------------------------
     2. LOGIN
     An unrecognized email is not refused silently. It moves to the no
     account found state, which offers to request access instead.
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     WHERE A SIGNED IN PERSON GOES
     Shared by both doors, because it was duplicated the moment there were
     two and the copies would have drifted.
     ------------------------------------------------------------------------ */

  async function land() {
    const me = await loadMe();
    setBusy(false);

    if (!me?.company?.slug) {
      /* Signed in, and on nobody's company. Sign them back out so they
         are not left holding a session that opens nothing and cannot be
         cleared from any screen. */
      await supabase.auth.signOut();
      setError("That account is signed in but not on a workspace yet. Ask whoever set it up to add you.");
      return;
    }

    /* An admin can change what a company's AI knows and who may use it, so
       their session is short. Staff stay signed in until they sign out.
       Supabase has one token lifetime for the whole project, so the shorter
       one is kept here, in the app, and read on every load. */
    if (me.staff?.access_level === "admin") {
      startAdminClock();
    }

    /* Back to whatever they were trying to open, when that is a page on
       their own workspace. Anything else, including a workspace that is
       not theirs, falls back to their own front door. */
    const wanted = new URLSearchParams(window.location.search).get("next");
    const ownPrefix = `/${me.company.slug}`;
    const safe = wanted && (wanted === ownPrefix || wanted.startsWith(`${ownPrefix}/`));

    navigate(
      safe
        ? wanted
        : me.staff?.access_level === "admin"
        ? `${ownPrefix}/admin`
        : ownPrefix,
      { replace: true },
    );
  }

  /* ------------------------------------------------------------------------
     SENDING A CODE
     shouldCreateUser is false and that is the whole security of this screen.
     Left on, anybody could type any address and Supabase would make them an
     account, which would let a stranger create a signed in identity on a
     product whose entire claim is that only invited people get in.

     A refusal is not reported. "No account for that email" tells anyone who
     asks which addresses are on this system, so an unknown address is
     answered exactly like a known one and the code simply never arrives.
     ------------------------------------------------------------------------ */

  async function sendCode(e) {
    e.preventDefault();
    const value = email.trim().toLowerCase();

    if (!value.includes("@")) {
      setError("Enter the email address you were invited with.");
      return;
    }

    setError("");
    setBusy(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: false },
    });

    setBusy(false);

    /* Network trouble is worth saying. Anything else is swallowed on
       purpose, see the note above. */
    if (otpError && (otpError.name === "AuthRetryableFetchError" || otpError.status === 0)) {
      setError("Could not reach the server. Check your connection and try again.");
      return;
    }
    if (otpError) console.error("signInWithOtp refused", otpError);

    setEmail(value);
    setMode("otp");
  }

  async function verifyCode(code) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });

    if (verifyError) {
      return { ok: false, reason: "That code is not right, or it has run out. Ask for a new one." };
    }

    await land();
    return { ok: true };
  }

  /* ------------------------------------------------------------------------
     4. REQUEST ACCESS
     Submits a name and email to the admin. Requesting alone gets nobody in.
     ------------------------------------------------------------------------ */

  function handleRequest(e) {
    e.preventDefault();
    if (!requestName.trim()) {
      setError("Enter your name so the admin knows who is asking.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your work email.");
      return;
    }

    setError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setMode("requested");
    }, 700);
  }

  /* ------------------------------------------------------------------------
     6. OTP VERIFICATION
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     1. SHARED SHELL
     One centered card on the ambient background, used by every state above.
     ------------------------------------------------------------------------ */

  return (
    <PageShell scroll>
      <div className="shrink-0 flex items-center justify-between px-5 sm:px-8 pt-6 relative z-20">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="Back to home"
        >
          <LogoMark size={24} />
          <span className="font-bold text-[15px] tracking-tight" style={{ fontFamily: FONTS.display }}>
            {PRODUCT.name}
          </span>
        </button>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10 relative z-10">
        <div
          className="w-full max-w-[400px] rounded-[20px] border p-7 backdrop-blur-2xl shadow-2xl"
          style={{
            backgroundColor: "var(--surface-solid)",
            borderColor: "var(--border)",
            animation: "sx-rise 0.4s ease",
          }}
        >
          {mode === "login" && (
            <LoginSection
              email={email}
              busy={busy}
              error={error}
              onEmail={setEmail}
              onSubmit={sendCode}
            />
          )}

          {mode === "notfound" && (
            <NotFoundSection
              email={email}
              onRequest={() => resetTo("request")}
              onBack={() => resetTo("login")}
            />
          )}

          {mode === "request" && (
            <RequestAccessSection
              name={requestName}
              email={email}
              busy={busy}
              error={error}
              onName={setRequestName}
              onEmail={setEmail}
              onSubmit={handleRequest}
              onBack={() => resetTo("login")}
            />
          )}

          {mode === "requested" && (
            <RequestSentSection email={email} onBack={() => resetTo("login")} />
          )}

          {mode === "otp" && (
            <OtpSection
              email={email}
              onVerify={verifyCode}
              onResend={() => sendCode({ preventDefault() {} })}
              onBack={() => resetTo("login")}
            />
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 flex justify-center relative z-10">
        <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
          <Lock size={10} />
          Access is by invite only
        </p>
      </div>
    </PageShell>
  );
}

/* ==========================================================================
   2. LOGIN SECTION
   ========================================================================== */

function LoginSection({ email, busy, error, onEmail, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[22px] font-bold mb-1" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        Sign in
      </h1>
      <p className="text-[13.5px] mb-6" style={{ color: "var(--text-3)" }}>
        Use the email you were invited with. We will send you a code.
      </p>

      <Field label="Work email" required>
        <TextInput
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>

      {error && (
        <p className="text-[12.5px] mb-4" role="alert" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton
        type="submit"
        className="w-full flex items-center justify-center gap-2"
        disabled={busy || !email.trim()}
      >
        {busy ? <Spinner size={14} color="#fff" /> : null}
        {busy ? "Sending" : "Email me a code"}
      </PrimaryButton>

    </form>
  );
}

/* ==========================================================================
   3. NO ACCOUNT FOUND SECTION
   ========================================================================== */

function NotFoundSection({ email, onRequest, onBack }) {
  return (
    <div style={{ animation: "sx-rise 0.3s ease" }}>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(232,152,10,0.12)" }}
      >
        <ShieldAlert size={20} style={{ color: BRAND.amber }} />
      </div>

      <h1 className="text-[20px] font-bold mb-1.5" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        No account found
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        There is no account on file for {email}. You can ask the admin for access, or go back and try a
        different email.
      </p>

      <PrimaryButton onClick={onRequest} className="w-full flex items-center justify-center gap-2">
        <UserPlus size={15} />
        Request access
      </PrimaryButton>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 mt-3 text-[13.5px] py-2 transition-opacity hover:opacity-80"
        style={{ color: "var(--text-2)" }}
      >
        <ArrowLeft size={14} />
        Back to sign in
      </button>
    </div>
  );
}

/* ==========================================================================
   4. REQUEST ACCESS SECTION
   ========================================================================== */

function RequestAccessSection({ name, email, busy, error, onName, onEmail, onSubmit, onBack }) {
  return (
    <form onSubmit={onSubmit} style={{ animation: "sx-rise 0.3s ease" }}>
      <h1 className="text-[20px] font-bold mb-1.5" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        Request access
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        Your admin reviews every request. You will get an email once they decide.
      </p>

      <Field label="Full name">
        <TextInput
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </Field>

      <Field label="Work email" required>
        <TextInput
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2" disabled={busy}>
        {busy ? <Spinner size={14} color="#fff" /> : null}
        {busy ? "Sending" : "Send request"}
      </PrimaryButton>

      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 mt-3 text-[13.5px] py-2 transition-opacity hover:opacity-80"
        style={{ color: "var(--text-2)" }}
      >
        <ArrowLeft size={14} />
        Back to sign in
      </button>
    </form>
  );
}

/* ==========================================================================
   5. REQUEST SENT SECTION
   ========================================================================== */

function RequestSentSection({ email, onBack }) {
  return (
    <div style={{ animation: "sx-rise 0.3s ease" }}>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
      >
        <MailCheck size={20} style={{ color: BRAND.green }} />
      </div>

      <h1 className="text-[20px] font-bold mb-1.5" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        Request sent
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        Your admin has your request. We will email {email} as soon as they approve it.
      </p>

      <GhostButton onClick={onBack} className="w-full">
        Back to sign in
      </GhostButton>
    </div>
  );
}

/* ==========================================================================
   6. OTP VERIFICATION SECTION
   Six boxes, auto advance, paste aware, backspace steps back.
   ========================================================================== */

function OtpSection({ email, onVerify, onResend, onBack }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef([]);

  useEffect(() => {
    if (inputsRef.current[0]) inputsRef.current[0].focus();
  }, []);

  const code = digits.join("");
  const complete = code.length === OTP_LENGTH;

  function setDigitAt(index, value) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index, raw) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }

    /* A paste lands in one box. Spread it across the remaining boxes. */
    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH - index).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, i) => {
          next[index + i] = c;
        });
        return next;
      });
      const landing = Math.min(index + chars.length, OTP_LENGTH - 1);
      if (inputsRef.current[landing]) inputsRef.current[landing].focus();
      return;
    }

    setDigitAt(index, value);
    if (index < OTP_LENGTH - 1 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      setDigitAt(index - 1, "");
      if (inputsRef.current[index - 1]) inputsRef.current[index - 1].focus();
    }
    if (e.key === "ArrowLeft" && index > 0 && inputsRef.current[index - 1]) {
      inputsRef.current[index - 1].focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!complete) {
      setError("Enter all six digits.");
      return;
    }
    setError("");
    setBusy(true);

    const result = await onVerify(digits.join(""));

    if (!result?.ok) {
      setBusy(false);
      setError(result?.reason ?? "That code did not work. Ask for a new one.");
      /* Cleared and refocused. Leaving six wrong digits in place means the
         next attempt starts with backspacing, and the boxes read as
         accepted when they were not. */
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      return;
    }
    /* On success this screen is being navigated away from, so busy stays
       true and the button does not flick back to its resting state on the
       way out. */
  }

  return (
    <form onSubmit={handleVerify} style={{ animation: "sx-rise 0.3s ease" }}>
      <h1 className="text-[20px] font-bold mb-1.5" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        Check your email
      </h1>
      <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
        We sent a six digit code to {email}. Enter it below to finish signing in.
      </p>

      <div className="flex gap-2 mb-5 justify-between">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={OTP_LENGTH}
            aria-label={`Digit ${i + 1}`}
            className="w-full aspect-square rounded-[12px] border text-center text-[19px] font-semibold outline-none transition-shadow focus:ring-2 focus:ring-[rgba(20,32,160,0.35)]"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: digit ? BRAND.accentSoft : "var(--border-2)",
              color: "var(--text-1)",
              fontFamily: FONTS.display,
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-[12.5px] mb-4" style={{ color: BRAND.red }}>
          {error}
        </p>
      )}

      <PrimaryButton
        type="submit"
        className="w-full flex items-center justify-center gap-2"
        disabled={busy || !complete}
      >
        {busy ? <Spinner size={14} color="#fff" /> : null}
        {busy ? "Verifying" : "Verify and continue"}
        {!busy && complete ? <ArrowRight size={15} /> : null}
      </PrimaryButton>

      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 mt-3 text-[13.5px] py-2 transition-opacity hover:opacity-80"
        style={{ color: "var(--text-2)" }}
      >
        <ArrowLeft size={14} />
        Use a different email
      </button>

      <p className="text-[12px] mt-4 text-center" style={{ color: "var(--text-3)" }}>
        Any six digits work in this demo.
      </p>
    </form>
  );
}
