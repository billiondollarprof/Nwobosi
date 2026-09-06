/* ==========================================================================
   WORKSPACE
   One address for the whole product: /demo.

   There used to be two, /{slug} for the assistant and /{slug}/admin for the
   panel, and the slug was decorative in both. Chat never read it at all and
   Admin only used it to build links. The workspace a person belongs to has
   always come from their session, because that is the only source that
   cannot be edited in the address bar: their staff row names their company
   and RLS enforces it.

   So the slug bought nothing and cost two things. It let somebody type a
   company name that was not theirs and get a sign in screen for it, which
   is a way of finding out which companies exist. And it made every unknown
   path look like a company, so a typo landed on sign in rather than home.

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
import { useNavigate, useSearchParams } from "react-router-dom";

import Admin from "./Admin.jsx";
import Chat from "./Chat.jsx";
import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import { PageShell, Spinner } from "../shared/ui.jsx";
import { loadMe } from "../shared/session.js";

export default function Workspace() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [me, setMe] = useState(undefined);

  /* ------------------------------------------------------------------------
     1. WHO IS HERE
     ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;
    (async () => {
      const who = await loadMe();
      if (!alive) return;

      /* Nobody signed in on this browser. Sign in knows where to send them
         afterwards, so hand it the path rather than dropping them home. */
      if (!who) {
        navigate(`/auth?next=${encodeURIComponent("/demo")}`, { replace: true });
        return;
      }

      setMe(who);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

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
