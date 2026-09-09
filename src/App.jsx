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
import Anthony from "./pages/Anthony.jsx";
import CV from "./pages/CV.jsx";
import RouteMeta from "./shared/meta.jsx";
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
        {/* Writes title, description and canonical per route. See meta.jsx:
              index.html shipped one canonical pointing at the home page, which
              told crawlers every other page was a duplicate of it. */}
        <RouteMeta />
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

          {/* The page that goes on a LinkedIn profile and in a job
              application. Its own address rather than /founder, because the
              two answer different questions: /founder is who is behind
              StellaXafe, this is what this person builds and can they do it
              for us.

              A path rather than a subdomain on purpose, for now. It works
              the moment this deploys, where anthony.stellaxafe.com needs DNS
              and a certificate first. When that lands it points here and the
              address on a profile does not have to change again. */}
          <Route path="/anthony" element={<Anthony />} />

          {/* The CV, on the same path as the page it belongs to. One source
              for the live document and for the PDF that comes out of it, so
              the two can never drift apart. See CV.jsx for why it prints
              rather than being generated. */}
          <Route path="/anthony/cv" element={<CV />} />
          <Route path="/insights" element={<Insights />} />

          {/* THE WORKSPACE, AND THE COMPANY ADDRESS

              /workspace is the address that always works and never needs to
              know who you are. It sends a signed in person straight on to
              their own company, so the bar reads /amara rather than
              something generic.

              /:slug is that company address. It is a LABEL AND NOTHING MORE.
              It grants nothing, because the company a person belongs to is
              read from their staff row and enforced by RLS. Typing another
              company's name gets you your own workspace, not theirs.

              This reverses an earlier decision, and the two reasons that
              decision was made are handled rather than ignored. It used to
              be that a stranger typing a company name got a sign in screen
              for it, which confirmed the company existed, and that every
              mistyped path looked like a company. Now every unknown path and
              every real company look exactly alike to somebody not signed
              in, so guessing tells them nothing. Workspace.jsx does that
              part. */}
          <Route path="/workspace" element={<Workspace />} />

          {/* Where the old addresses went. These were public and are in
              bookmarks, so they move rather than break. */}
          <Route path="/demo" element={<Navigate to="/workspace" replace />} />
          <Route path="/chat" element={<Navigate to="/workspace?view=assistant" replace />} />
          <Route path="/admin" element={<Navigate to="/workspace" replace />} />
          <Route path="/:slug/admin" element={<Navigate to="/workspace" replace />} />

          {/* Last, and deliberately so. Every static route above wins over
              this one, so no company slug can ever take /services or
              /anthony off the site. React Router ranks a fixed segment above
              a dynamic one on its own, and the order here says the same
              thing to anybody reading it. */}
          <Route path="/:slug" element={<Workspace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
