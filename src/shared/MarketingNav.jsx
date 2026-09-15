/* ==========================================================================
   MARKETING NAV
   The nav bar for the public surface: landing, services, founder, insights,
   form builder, and contact. The app itself (chat, admin, auth, setup) does
   not use this. Those screens stay bare on purpose.

   Every link here is a client side route, so moving between pages is
   instant and nothing reloads. That is the whole reason these pages were
   brought into the app rather than left as separate HTML files.

   THE DOOR INTO THE APP IS HERE, AND IT IS ONE DOOR
   -------------------------------------------------
   My Workspace points at /workspace, and that is the only way in for
   everybody. A staff member, an admin, and a person who has not signed in
   yet all use it. /workspace works knowing nothing about you: it sends a
   stranger to sign in, and the moment it learns who somebody is it sends
   them to their own company and shows the panel or the assistant depending
   on what they are. So there is no staff door and no separate admin door
   to keep in step, and no list of company addresses on a public page.

   It is kept apart from NAV_LINKS on purpose. Those are pages to read.
   This is the way in, and it is the one link on the bar that somebody
   arrives already looking for, so it gets its own place at both sizes
   rather than being fifth in a list of marketing pages.
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

/* Not in NAV_LINKS, because it is not a page to read. See the header. */
const WORKSPACE = { label: "My Workspace", to: "/workspace" };

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
        {/* The way in, on a wide screen. It sits here rather than at the end
            of the links on the left, because it is not one of them: those
            are pages about the product, this is the product. Quiet text
            rather than a second button, so it does not compete with the
            one thing this page is actually asking a visitor to do. */}
        <button
          onClick={() => go(WORKSPACE.to)}
          className="hidden lg:block px-2.5 py-1.5 rounded-full text-[13.5px] transition-colors hover:opacity-70 whitespace-nowrap"
          style={{ color: "var(--text-2)" }}
        >
          {WORKSPACE.label}
        </button>
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

          {/* Last, and behind a rule, because it is a different kind of
              thing from the six above it. Those open a page. This one asks
              who you are. The rule is what stops a thumb reading it as the
              seventh marketing page and scrolling past the only link that
              matters to somebody who already works at a customer. */}
          <div className="h-px mx-5" style={{ backgroundColor: "var(--border-2)" }} />
          <button
            onClick={() => go(WORKSPACE.to)}
            className="w-full text-left px-5 py-3 text-[14.5px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-1)" }}
          >
            {WORKSPACE.label}
          </button>
        </div>
      )}
    </FloatingNav>
  );
}
