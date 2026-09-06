/* ==========================================================================
   JOIN
   What an invitation link opens.

   Somebody's admin added them and they clicked the link in the email. This
   page has one job: spend the token, sign them in, and get out of the way.
   There is nothing to fill in, because everything it needs is in the URL.

   The only two things on screen are a spinner and, if it does not work, a
   plain sentence saying why and what to do about it. Each refusal needs a
   different next step, which is the whole reason they are told apart:

     used     they already clicked it, so sign in normally
     expired  ask whoever invited them for another
     wrong    the link is not one of ours

   Read top to bottom:

     1. The exchange
     2. Waiting
     3. When it does not work
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound, ArrowRight } from "lucide-react";

import ContainmentSeal from "../shared/ContainmentSeal.jsx";
import { FONTS } from "../shared/tokens";
import { PageShell, PrimaryButton, Spinner, ThemeToggle } from "../shared/ui.jsx";
import { LogoLockup } from "../shared/icons.jsx";
import { acceptInvite } from "../shared/inviteApi.js";

export default function Join() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  /* React runs effects twice in development, and this one spends a single
     use token. Without the guard the second run redeems the invitation the
     first run just used, and a perfectly good link reports itself as
     already used.

     This is the ONLY guard, deliberately. The first version also carried an
     `alive` flag cleared on cleanup, which is the usual pattern and is
     exactly wrong here: the second mount's cleanup runs before the first
     mount's request comes back, so the answer arrived and was thrown away
     and the page sat on its spinner forever. One run means there is nothing
     to cancel. */
  const started = useRef(false);

  /* ------------------------------------------------------------------------
     1. THE EXCHANGE
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const result = await acceptInvite(token);

      if (!result.ok) {
        setError(result.reason);
        return;
      }

      /* Straight into their own workspace, on the chat side. They are staff,
         not an admin, and the chat is the whole product for them. replace,
         not push, so Back does not land them on a spent link. */
      navigate(result.slug ? `/${result.slug}` : "/", { replace: true });
    })();
  }, [token, navigate]);

  return (
    <PageShell>
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <LogoLockup stacked size={20} textClass="text-[13px]" />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 relative z-10">
        <div className="w-full max-w-[420px] text-center">
          {!error ? (
            /* --------------------------------------------------------------
               2. WAITING
               The mark rather than a bare spinner. This takes a second or
               two and it is the first screen of the product this person has
               ever seen.
               -------------------------------------------------------------- */
            <>
              <div className="flex justify-center mb-8">
                <ContainmentSeal size={120} />
              </div>
              <p
                className="flex items-center justify-center gap-2.5 text-[15px]"
                style={{ color: "var(--text-2)" }}
              >
                <Spinner size={15} />
                Opening your workspace
              </p>
            </>
          ) : (
            /* --------------------------------------------------------------
               3. WHEN IT DOES NOT WORK
               -------------------------------------------------------------- */
            <div style={{ animation: "sx-rise 0.3s ease" }}>
              <span
                className="w-11 h-11 rounded-[13px] flex items-center justify-center mx-auto mb-5"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <KeyRound size={19} style={{ color: "var(--text-3)" }} />
              </span>

              <h1
                className="text-[21px] font-semibold tracking-tight mb-2"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                This link did not open
              </h1>
              <p className="text-[14px] leading-relaxed mb-7" style={{ color: "var(--text-2)" }}>
                {error}
              </p>

              <PrimaryButton
                onClick={() => navigate("/auth")}
                className="flex items-center justify-center gap-2 px-6 py-3 mx-auto"
              >
                Sign in instead
                <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
