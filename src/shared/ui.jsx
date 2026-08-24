/* ==========================================================================
   SHARED UI
   Primitives every page builds from. Keeping them here is what makes the
   chat, admin, landing, and auth surfaces feel like one product.
   ========================================================================== */

import { forwardRef, useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
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
   app rather than a document. */
export function PageShell({ children, scroll = false, className = "" }) {
  const { vars } = useTheme();
  return (
    <div
      className={`w-full flex flex-col relative isolate transition-colors duration-300 ${
        scroll ? "min-h-screen" : "h-screen overflow-hidden"
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

export function Field({ label, hint, children }) {
  return (
    <label className="block mb-4">
      <span
        className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: "var(--text-3)" }}
      >
        {label}
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
   Light, dark, or follow the device.
   -------------------------------------------------------------------------- */

export function ThemeToggle() {
  const { themeChoice, setThemeChoice, effectiveTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Device", icon: Monitor },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:opacity-80"
        style={{ borderColor: "var(--border-2)" }}
        aria-label="Change theme"
      >
        {effectiveTheme === "dark" ? (
          <Moon size={15} style={{ color: "var(--text-2)" }} />
        ) : (
          <Sun size={15} style={{ color: "var(--text-2)" }} />
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-11 rounded-2xl border shadow-2xl overflow-hidden z-50 w-40 backdrop-blur-2xl"
          style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setThemeChoice(opt.id);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[13.5px] hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-1)" }}
            >
              <span className="flex items-center gap-2.5">
                <opt.icon size={14} style={{ color: "var(--text-3)" }} />
                {opt.label}
              </span>
              {themeChoice === opt.id && <Check size={13} style={{ color: BRAND.navy }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Floating nav
   The glassy pill with the halo behind it. Shared by chat and admin.
   -------------------------------------------------------------------------- */

export function FloatingNav({ children, maxWidth = "max-w-3xl" }) {
  return (
    <div className="shrink-0 px-3 sm:px-5 pt-5 pb-3 relative z-20">
      <div className={`relative ${maxWidth} mx-auto`}>
        <div
          className="absolute -inset-[14px] rounded-full pointer-events-none"
          style={{
            background: GRADIENTS.navHalo,
            backgroundSize: "300% 100%",
            filter: "blur(16px)",
            opacity: 1,
            animation: "sx-nav-glow 5s ease-in-out infinite",
          }}
        />
        <header
          className="relative h-14 flex items-center justify-between px-4 sm:px-5 rounded-full border backdrop-blur-2xl transition-colors duration-300"
          style={{ backgroundColor: "var(--nav-surface)", borderColor: "var(--border-2)" }}
        >
          {children}
        </header>
      </div>
    </div>
  );
}
