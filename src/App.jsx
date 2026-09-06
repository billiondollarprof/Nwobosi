/* ==========================================================================
   APP
   Every page lives in its own file for reading and working on. They build
   into one app here, so moving between them is instant with no page
   reload.

   Two groups of pages, one app:

     The product   setup, auth, chat, admin. Bare screens, no marketing
                   chrome, nothing to click that is not the job at hand.
     The public    landing, services, founder, insights, form builder,
                   contact. These carry the nav and the footer.
   ========================================================================== */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./shared/theme.jsx";

import Landing from "./pages/Landing.jsx";
import Setup from "./pages/Setup.jsx";
import Join from "./pages/Join.jsx";
import Workspace from "./pages/Workspace.jsx";
import Auth from "./pages/Auth.jsx";
import Services from "./pages/Services.jsx";
import Contact from "./pages/Contact.jsx";
import Founder from "./pages/Founder.jsx";
import Insights from "./pages/Insights.jsx";

/* Every page opens at its top.

   Without this, moving between pages keeps whatever scroll position the
   last one had, so someone arriving at the admin page lands halfway down
   it and never sees the heading that tells them what the page is for.
   The browser does this on purpose for back and forward, which is right,
   but a router does not distinguish the two, so it has to be handled here.

   A hash is the one exception. /#products means "put me at that section",
   so scrolling to the top would undo the only instruction in the URL. The
   page that owns the section handles it instead. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<Setup />} />
          {/* An invitation link. Above the /:slug routes on purpose, or
              "join" would be read as a company slug. */}
          <Route path="/join/:token" element={<Join />} />

          {/* Retired. It was a public page for months, so it is in search
              results and in links. Without this it falls through to the
              /:slug route below, gets read as a company name, and sends
              somebody to a sign in screen for a workspace that was never
              theirs. Home is the honest answer.

              Worth knowing: every unknown single segment path does that,
              not just this one. Fixing it properly means knowing which
              slugs are real, which is a database call this router does not
              make. */}
          <Route path="/form-builder" element={<Navigate to="/" replace />} />
          <Route path="/auth" element={<Auth />} />

          {/* The public pages. Static paths, so they are matched ahead of
              the company slug pattern below and a company can never be
              shadowed by one of them, or shadow one. */}
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/founder" element={<Founder />} />
          <Route path="/insights" element={<Insights />} />

          {/* One address for the product. What it renders depends on who is
              signed in, not on what is in the path. See Workspace.jsx for
              why the slug went: it was decorative, it leaked which companies
              exist, and it made every mistyped path look like one. */}
          <Route path="/demo" element={<Workspace />} />

          {/* Where the old addresses went. These were public and are in
              bookmarks, so they move rather than break. The slug is dropped
              on the way through because the session already knows which
              workspace the person belongs to. */}
          <Route path="/chat" element={<Navigate to="/demo?view=assistant" replace />} />
          <Route path="/admin" element={<Navigate to="/demo" replace />} />
          <Route path="/:slug/admin" element={<Navigate to="/demo" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
