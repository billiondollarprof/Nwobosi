/* ==========================================================================
   WORKSPACE
   Two addresses, one screen: /workspace and /{company}.

   /workspace always works and needs to know nothing about you. The moment
   it learns who you are it sends you on to your own company, so the address
   bar ends up reading /amara rather than something generic.

   THE SLUG IS A LABEL AND GRANTS NOTHING
   This is the part to understand before changing anything here. The company
   a person belongs to is read from their staff row and enforced by RLS (a
   database rule that stops one company ever reading another's data). The
   path is never consulted for that. So typing another company's name in the
   bar does not get you their workspace, it gets you your own, and the bar is
   corrected to match.

   WHY THE SLUG CAME BACK, AND WHAT WAS FIXED ON THE WAY
   The slug was removed once, and for two fair reasons, both now handled:

     1. It confirmed which companies exist. A stranger typing a real company
        name saw a sign in screen; typing a made up one saw something else.
        Now both look identical, because nobody signed in is ever told
        whether the slug is real. The sign in it lands on says /workspace,
        never the slug, so even the address it is sent to gives nothing away.
     2. Every mistyped path looked like a company. It still does, to a
        stranger, and that is now the point: /amara and /asdfgh behave
        exactly the same until somebody proves who they are.

   A company address is the reason this exists. Amara is told their workspace
   is at /amara, and that link has to work for somebody who has not signed in
   yet, which is why an unknown slug leads to sign in rather than home.

   WHAT THIS RENDERS
   The panel if you run the place, the assistant if you use it. An admin can
   cross over with ?view=assistant, because an admin needs to see what their
   staff see. A staff member has no such switch, and it would not help them
   if they forged one: every table the panel touches is scoped by is_admin()
   in the database.

   Read top to bottom:

     1. Who is here
     2. What they get
   ========================================================================== */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import Admin from "./Admin.jsx";
import Chat from "./Chat.jsx";
import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import { PageShell, Spinner } from "../shared/ui.jsx";
import { loadMe } from "../shared/session.js";

export default function Workspace() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { slug } = useParams();
  const [me, setMe] = useState(undefined);

  /* ------------------------------------------------------------------------
     1. WHO IS HERE
     ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;
    (async () => {
      const who = await loadMe();
      if (!alive) return;

      /* Nobody signed in on this browser.

         It is sent to /workspace and never to the slug, on purpose. A
         stranger typing a real company name and a stranger typing nonsense
         both end up on exactly the same screen, at exactly the same
         address, so neither one learns whether the company exists. */
      if (!who) {
        navigate(`/auth?next=${encodeURIComponent("/workspace")}`, { replace: true });
        return;
      }

      /* The address bar is made to agree with the session, never the other
         way round. Somebody at /workspace is moved on to their own company,
         and somebody who typed a company that is not theirs is moved to the
         one that is. Nothing here decides what they can see: that was
         settled by their staff row before this ran. */
      const mine = who.company?.slug ?? null;
      if (mine && slug !== mine) {
        navigate({ pathname: `/${mine}`, search: window.location.search }, { replace: true });
        return;
      }

      setMe(who);
    })();
    return () => {
      alive = false;
    };
  }, [navigate, slug]);

  /* Both screens below load their own data and run their own guards, so
     this waits rather than rendering one and letting it flash the other. */
  if (me === undefined) {
    return (
      <PageShell>
        <div className="flex-1 flex items-center justify-center px-5 relative z-10">
          <div className="text-center">
            <div className="flex justify-center mb-7">
              <ContainmentSeal size={110} />
            </div>
            <p
              className="flex items-center justify-center gap-2.5 text-[15px]"
              style={{ color: "var(--text-2)" }}
            >
              <Spinner size={15} />
              Opening your workspace
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ------------------------------------------------------------------------
     2. WHAT THEY GET
     ------------------------------------------------------------------------ */

  const isAdmin = me?.staff?.access_level === "admin";
  const wantsAssistant = params.get("view") === "assistant";

  return isAdmin && !wantsAssistant ? <Admin /> : <Chat />;
}
