/* ==========================================================================
   SHARED UI
   Primitives every page builds from. Keeping them here is what makes the
   chat, admin, landing, and auth surfaces feel like one product.
   ========================================================================== */

import { forwardRef, useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme.jsx";
import { BRAND, GRADIENTS, FONTS } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION: Ambient glow
   The slow blue to purple wash that sits behind every page. Purely
   decorative, so it never takes pointer events.
   -------------------------------------------------------------------------- */

export function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute top-[-10%] left-[10%] w-[60vw] h-[60vw] max-w-[560px] max-h-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(66,90,240,0.5) 0%, rgba(66,90,240,0) 70%)",
          filter: "blur(60px)",
          animation: "sx-glow-a 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[5%] w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(180,70,220,0.4) 0%, rgba(180,70,220,0) 70%)",
          filter: "blur(60px)",
          animation: "sx-glow-b 11s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Page shell
   Applies the theme variables and the ambient background. Every page
   renders inside one of these.
   -------------------------------------------------------------------------- */

/* `scroll` pages flow down the document like a normal page. Pages without
   it are pinned to the viewport, so an inner area does the scrolling and
   the composer or footer stays put. That is what makes chat feel like an
   app rather than a document.

   dvh, not vh. On a phone, 100vh is the height of the screen with the
   browser's address bar collapsed, which is taller than what is actually
   on screen when it is not. Anything centered against vh sits low, and on
   a fixed h-screen page the bottom can end up clipped under the address
   bar. dvh tracks the real visible area as it changes. */
export function PageShell({ children, scroll = false, className = "" }) {
  const { vars } = useTheme();
  return (
    <div
      /* overflow-x-clip, not overflow-x-hidden. Both stop the page sliding
         sideways when a decorative glow spills a couple of pixels past the
         edge, but hidden makes this a scroll container, which silently
         kills `position: sticky` on everything inside it, including the
         landing page's floating nav. clip does not. */
      className={`sx-grain w-full flex flex-col relative isolate overflow-x-clip transition-colors duration-300 ${
        scroll ? "min-h-dvh" : "h-dvh overflow-hidden"
      } ${className}`}
      style={{
        ...vars,
        backgroundColor: "var(--bg)",
        color: "var(--text-1)",
        fontFamily: FONTS.body,
      }}
    >
      <AmbientGlow />
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Surfaces
   -------------------------------------------------------------------------- */

export function GlassPanel({ children, className = "", style = {}, ...rest }) {
  return (
    <div
      className={`rounded-[18px] border backdrop-blur-xl ${className}`}
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeading({ children, hint }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold" style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}>
        {children}
      </h2>
      {hint && (
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Buttons
   -------------------------------------------------------------------------- */

export function PrimaryButton({ children, className = "", style = {}, ...rest }) {
  return (
    <button
      className={`px-5 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${className}`}
      style={{ background: GRADIENTS.action, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", style = {}, ...rest }) {
  return (
    <button
      className={`px-4 py-2.5 rounded-[12px] border text-[13.5px] transition-colors hover:opacity-80 ${className}`}
      style={{ borderColor: "var(--border-2)", color: "var(--text-2)", ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconBtn({ children, onClick, active, activeColor = BRAND.navy, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
      style={{ color: active ? activeColor : "var(--text-3)" }}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Form fields
   -------------------------------------------------------------------------- */

/* `required` puts a red asterisk on the label. It is the one mark
   everybody already reads as "you cannot skip this", and pairing it with
   a button that stays dim until the form is complete means nobody has to
   press something to find out what is missing. */
export function Field({ label, hint, required = false, children }) {
  return (
    <label className="block mb-4">
      <span
        className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: "var(--text-3)" }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: BRAND.red }} aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="block text-[12px] mt-1.5" style={{ color: "var(--text-3)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/* Forwards its ref so callers can focus it. The setup flow puts the cursor
   straight in the access code field. */
export const TextInput = forwardRef(function TextInput({ className = "", style = {}, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-[12px] border px-3.5 py-2.5 text-[14.5px] outline-none transition-shadow focus:ring-2 focus:ring-[rgba(20,32,160,0.35)] ${className}`}
      style={{
        backgroundColor: "var(--surface-solid)",
        borderColor: "var(--border-2)",
        color: "var(--text-1)",
        ...style,
      }}
      {...rest}
    />
  );
});

export const TextArea = forwardRef(function TextArea({ className = "", style = {}, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-[12px] border px-3.5 py-2.5 text-[14.5px] outline-none resize-none transition-shadow focus:ring-2 focus:ring-[rgba(20,32,160,0.35)] ${className}`}
      style={{
        backgroundColor: "var(--surface-solid)",
        borderColor: "var(--border-2)",
        color: "var(--text-1)",
        ...style,
      }}
      {...rest}
    />
  );
});

export function SelectInput({ className = "", style = {}, children, ...rest }) {
  return (
    <select
      className={`w-full rounded-[12px] border px-3.5 py-2.5 text-[14.5px] outline-none transition-shadow focus:ring-2 focus:ring-[rgba(20,32,160,0.35)] ${className}`}
      style={{
        backgroundColor: "var(--surface-solid)",
        borderColor: "var(--border-2)",
        color: "var(--text-1)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Status
   -------------------------------------------------------------------------- */

export function Spinner({ size = 14, color = BRAND.amber }) {
  return (
    <span
      className="rounded-full border-2 shrink-0 inline-block"
      style={{
        width: size,
        height: size,
        borderColor: color,
        borderTopColor: "transparent",
        animation: "sx-spin 0.8s linear infinite",
      }}
    />
  );
}

export function StatusPill({ tone = "neutral", children }) {
  const tones = {
    ok: { backgroundColor: "rgba(22,176,74,0.12)", color: BRAND.green },
    pending: { backgroundColor: "rgba(232,152,10,0.12)", color: BRAND.amber },
    error: { backgroundColor: "rgba(229,62,62,0.12)", color: BRAND.red },
    accent: { backgroundColor: "rgba(20,32,160,0.12)", color: BRAND.accentSoft },
    neutral: { backgroundColor: "var(--chip)", color: "var(--text-3)" },
  };
  return (
    <span
      className="text-[10.5px] font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={tones[tone] || tones.neutral}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Motion
   -------------------------------------------------------------------------- */

export function TypewriterText({ text, speed = 18 }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <>
      {shown}
      {!done && <span style={{ animation: "sx-blink 0.9s step-start infinite" }}>|</span>}
    </>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" style={{ animation: "sx-rise 0.35s ease" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: "var(--text-3)",
            animation: "sx-dot 1.1s ease infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Theme toggle
   Two states, so it is a switch rather than a menu. Dark is where everyone
   starts. There is no "follow my device": the page picking its own look
   from a system setting is the page deciding, and this is the one visual
   decision worth handing over outright.
   -------------------------------------------------------------------------- */

export function ThemeToggle() {
  const { toggleTheme, effectiveTheme } = useTheme();
  const dark = effectiveTheme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:opacity-80"
      style={{ borderColor: "var(--border-2)" }}
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      {dark ? (
        <Moon size={15} style={{ color: "var(--text-2)" }} />
      ) : (
        <Sun size={15} style={{ color: "var(--text-2)" }} />
      )}
    </button>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Floating nav
   The glassy pill with the halo behind it. Shared by chat and admin.
   -------------------------------------------------------------------------- */

export function FloatingNav({ children, maxWidth = "max-w-3xl", sticky = false }) {
  /* Purple and navy each take half the ring, and the seam between them
     travels round the pill. See .sx-ring in index.css for how the band is
     cut out of the gradient. */
  const ringColours = { "--ring-a": BRAND.purple, "--ring-b": BRAND.navyLift };

  return (
    <div
      className={`shrink-0 px-3 sm:px-5 pt-5 pb-3 relative z-20 ${sticky ? "sticky top-0" : ""}`}
    >
      <div className={`relative ${maxWidth} mx-auto`}>
        {/* The glow is the same ring, wider and thrown out of focus, so the
            colour under the pill is always the colour on it. It is a lift
            off the page, not the cloud it used to be. */}
        <div
          className="sx-ring absolute -inset-[3px] rounded-full pointer-events-none"
          style={{ ...ringColours, "--ring-w": "5px", filter: "blur(9px)", opacity: 0.55 }}
        />
        <header
          className="relative h-14 flex items-center justify-between px-4 sm:px-5 rounded-full backdrop-blur-2xl transition-colors duration-300"
          style={{ backgroundColor: "var(--nav-surface)" }}
        >
          {children}
          <div
            className="sx-ring absolute inset-0 rounded-full pointer-events-none"
            style={ringColours}
          />
        </header>
      </div>
    </div>
  );
}
