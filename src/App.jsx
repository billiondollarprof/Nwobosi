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
import Auth from "./pages/Auth.jsx";
import Chat from "./pages/Chat.jsx";
import Admin from "./pages/Admin.jsx";
import Services from "./pages/Services.jsx";
import Contact from "./pages/Contact.jsx";
import Founder from "./pages/Founder.jsx";
import Insights from "./pages/Insights.jsx";
import FormBuilder from "./pages/FormBuilder.jsx";

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
          <Route path="/auth" element={<Auth />} />

          {/* The public pages. Static paths, so they are matched ahead of
              the company slug pattern below and a company can never be
              shadowed by one of them, or shadow one. */}
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/founder" element={<Founder />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/form-builder" element={<FormBuilder />} />

          {/* The plain paths are the demo shortcuts. Real companies live at
              their own slug, which is what setup sends people to. Static
              paths above win over the slug pattern below, so /setup stays
              /setup and never gets read as a company called "setup". */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/:slug" element={<Chat />} />
          <Route path="/:slug/admin" element={<Admin />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
