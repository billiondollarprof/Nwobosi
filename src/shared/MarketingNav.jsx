/* ==========================================================================
   MARKETING NAV
   The nav bar for the public surface: landing, services, founder, insights,
   form builder, and contact. The app itself (chat, admin, auth, setup) does
   not use this. Those screens stay bare on purpose.

   Every link here is a client side route, so moving between pages is
   instant and nothing reloads. That is the whole reason these pages were
   brought into the app rather than left as separate HTML files.
   ========================================================================== */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { LogoMark } from "./icons.jsx";
import { FONTS } from "./tokens";
import { FloatingNav, ThemeToggle, PrimaryButton } from "./ui.jsx";
import { PRODUCT } from "./config.js";

/* Demo points at /setup, not at a preview page. Setting up your own
   company's AI is the demo, and it is the real thing rather than a
   picture of one, so there is nothing else to send someone to see. */
export const NAV_LINKS = [
  { label: "Services", to: "/services" },
  { label: "Products", to: "/#products" },
  { label: "Demo", to: "/setup" },
  { label: "Insights", to: "/insights" },
  { label: "Founder", to: "/founder" },
  { label: "Contact", to: "/contact" },
];

export default function MarketingNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  /* The menu is a page level thing, so it closes when the page changes.
     Without this it stays open over the page it just sent you to. */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function go(to) {
    navigate(to);
  }

  return (
    <FloatingNav maxWidth="max-w-5xl" sticky>
      {/* ------------------------------------------------------------------
          Brand
          ------------------------------------------------------------------ */}
      <button
        onClick={() => go("/")}
        className="flex items-center gap-2.5 shrink-0"
        aria-label={`${PRODUCT.name} home`}
      >
        <LogoMark size={26} />
        <span
          className="font-bold text-[16px] tracking-tight"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
        >
          {PRODUCT.name}
        </span>
      </button>

      {/* ------------------------------------------------------------------
          Links, desktop
          ------------------------------------------------------------------ */}
      <div className="hidden lg:flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.to;
          return (
            <button
              key={link.label}
              onClick={() => go(link.to)}
              className="px-2.5 py-1.5 rounded-full text-[13.5px] transition-colors hover:opacity-70"
              style={{ color: active ? "var(--text-1)" : "var(--text-2)" }}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------
          Right side
          ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <PrimaryButton
          onClick={() => go("/contact")}
          className="hidden sm:block px-4 py-2 text-[13px] whitespace-nowrap"
        >
          Book a live call
        </PrimaryButton>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--border-2)" }}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <X size={16} style={{ color: "var(--text-2)" }} />
          ) : (
            <Menu size={16} style={{ color: "var(--text-2)" }} />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------
          Links, mobile
          Hangs under the pill rather than taking over the screen. Same
          glass surface as the pill itself so it reads as one control.
          ------------------------------------------------------------------ */}
      {menuOpen && (
        <div
          className="lg:hidden absolute left-0 right-0 top-16 rounded-[20px] border backdrop-blur-2xl overflow-hidden shadow-2xl z-50"
          style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border-2)" }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => go(link.to)}
              className="w-full text-left px-5 py-3 text-[14.5px] transition-opacity hover:opacity-70"
              style={{
                color: pathname === link.to ? "var(--text-1)" : "var(--text-2)",
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </FloatingNav>
  );
}
