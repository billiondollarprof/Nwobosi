/* ==========================================================================
   MARKETING PRIMITIVES
   The small shared pieces every public page is built from: the page shell
   with its nav and footer, the eyebrow label above a heading, the gradient
   run of words inside a heading, and the standard section head.

   They live here so the pages themselves stay short enough to read top to
   bottom, and so a change to the look of a heading moves every page at
   once instead of six files drifting apart.
   ========================================================================== */

import { useNavigate } from "react-router-dom";

import { BRAND, FONTS } from "./tokens";
import { PageShell } from "./ui.jsx";
import MarketingNav from "./MarketingNav.jsx";
import MarketingFooter from "./MarketingFooter.jsx";

/* --------------------------------------------------------------------------
   SECTION: Page shell
   Nav on top, footer at the bottom, page in between. Every public page
   uses this, which is what stops one of them quietly losing its footer.
   -------------------------------------------------------------------------- */

export function MarketingPage({ children }) {
  return (
    <PageShell scroll>
      <MarketingNav />
      {children}
      <MarketingFooter />
    </PageShell>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Text
   -------------------------------------------------------------------------- */

/* The brand gradient, used on the few words in a heading that carry the
   point. Both ends sit mid tone, so it holds up on the true black and on
   the light background without a second version. */
export const GRADIENT_TEXT = {
  background: `linear-gradient(100deg, ${BRAND.accentSoft} 10%, ${BRAND.purple} 90%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export function GradientText({ children }) {
  return <span style={GRADIENT_TEXT}>{children}</span>;
}

/* The small label above a heading. The dot is what makes it read as a
   marker rather than as a line of shouted text. */
export function Eyebrow({ children }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: BRAND.accentSoft }}
    >
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ backgroundColor: BRAND.purple, boxShadow: `0 0 10px 2px ${BRAND.purple}66` }}
      />
      {children}
    </span>
  );
}

export function SectionHead({ eyebrow, title, sub, center = false }) {
  return (
    <div className={`max-w-2xl mb-11 ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-3.5"
        style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[15px] leading-relaxed mt-3.5" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Page hero
   The top of a standalone page. Modal styled pages do not use it, their
   heading sits inside the card.
   -------------------------------------------------------------------------- */

export function PageHero({ eyebrow, title, lead, children }) {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 px-5 sm:px-8 pt-6 pb-14">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="text-[12.5px] mb-5 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-3)" }}
        >
          Home
        </button>
        <div>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1
            className="text-[30px] sm:text-[44px] font-bold leading-[1.12] tracking-tight mt-4 max-w-3xl"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            {title}
          </h1>
          {lead && (
            <p
              className="text-[16px] sm:text-[17px] leading-relaxed mt-5 max-w-2xl"
              style={{ color: "var(--text-2)" }}
            >
              {lead}
            </p>
          )}
          {children}
        </div>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------------------
   SECTION: Divider
   The hairline between sections, faded at both ends so it never reads as
   a hard rule across the page.
   -------------------------------------------------------------------------- */

export function Divider() {
  return (
    <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8">
      <div
        className="h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--border-2), transparent)" }}
      />
    </div>
  );
}
