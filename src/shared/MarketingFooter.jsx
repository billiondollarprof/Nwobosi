/* ==========================================================================
   MARKETING FOOTER
   Shared by every public page. Three things it has to do: say what the
   company is in one line, give a way into the pages that are not in the
   nav, and name the legal entity.

   Links that go nowhere are deliberately not here. A privacy policy link
   that opens nothing costs more trust with an enterprise buyer than not
   having the link at all. When the policies are written they get real
   pages and a column here.
   ========================================================================== */

import { useNavigate } from "react-router-dom";

import { LogoMark } from "./icons.jsx";
import { FONTS } from "./tokens";
import { PRODUCT } from "./config.js";

const COLUMNS = [
  {
    heading: "Company",
    links: [
      { label: "Services", to: "/services" },
      { label: "Founder", to: "/founder" },
      { label: "Insights", to: "/insights" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Products",
    links: [
      { label: "Demo", to: "/setup" },
      { label: "Amara", to: "/#products" },
      { label: "XALOM", to: "/#products" },
      { label: "Form Builder & Automation", to: "/form-builder" },
    ],
  },
];

export default function MarketingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="relative z-10 border-t mt-auto" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-12 pb-8">
        <div className="flex flex-wrap justify-between gap-10 mb-10">
          {/* ----------------------------------------------------------------
              Brand
              ---------------------------------------------------------------- */}
          <div className="max-w-[300px]">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5"
              aria-label={`${PRODUCT.name} home`}
            >
              <LogoMark size={22} />
              <span
                className="font-bold text-[15px] tracking-tight"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                {PRODUCT.name}
              </span>
            </button>
            <p className="text-[13.5px] leading-relaxed mt-3.5" style={{ color: "var(--text-3)" }}>
              Private AI systems and workflow automation for organizations that need to keep what
              they know to themselves.
            </p>
          </div>

          {/* ----------------------------------------------------------------
              Link columns
              ---------------------------------------------------------------- */}
          <div className="flex gap-12 sm:gap-16 flex-wrap">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h4
                  className="text-[12px] font-semibold uppercase tracking-wide mb-4"
                  style={{ color: "var(--text-3)" }}
                >
                  {column.heading}
                </h4>
                {column.links.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.to)}
                    className="block text-[13.5px] mb-2.5 text-left transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-2)" }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Legal line
            The year is read at render rather than typed in, so the footer
            cannot quietly go stale on the 1st of January.
            ------------------------------------------------------------------ */}
        <div
          className="pt-6 border-t text-[12.5px]"
          style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
        >
          &copy; {new Date().getFullYear()} StellaXafe Technologies Limited. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
