/* ==========================================================================
   CONNECTING CANVA, THE ADMIN'S HALF

   One panel in the Connectors tab. It says whether Canva is connected, and
   it has the button that starts connecting it.

   WHY THIS IS A PANEL AND NOT A TOGGLE
   ------------------------------------
   A toggle implies the app can turn it on. It cannot. Connecting means
   leaving this page, approving on Canva's own screen, and coming back. That
   is a journey, not a switch, and a switch that starts a journey is a switch
   that lies about what it does.

   The panel it replaces said "Canva is connected per person" and that the
   assistant would ask each staff member to connect at the moment they
   needed it. That was written before any of this existed and it is not what
   was built. One account backs the whole deployment and an admin connects
   it. A screen that describes a product nobody built is worse than a blank
   one, because the admin plans around it.

   WHAT IT NEVER SHOWS
   -------------------
   Any part of a token. The status it reads back carries whether a
   connection exists, when it was made, and what it may do. The function on
   the other end does not select the token columns at all, so there is
   nothing here to leak even by accident.

   CONNECTED IS NOT A ONE WAY DOOR
   -------------------------------
   Anthony connected the wrong Canva account on 2026-09-15 and then found
   there was nothing here that could undo it. Canva offered him its own
   account switcher, the switcher would not take, and the only other
   control on this panel was Check again, which just re-reads what is
   already there.

   So the main button flips. Not connected, it says Connect Canva.
   Connected, it says Disconnect. Pressing Disconnect does not disconnect
   straight away: it asks first, in the panel, and the confirm is the one
   that acts. That is the whole of the warning, because throwing away a
   connection is easy to do by accident and tedious to put back, but it is
   not dangerous enough to deserve a dialog over the top of the screen.

   READ TOP TO BOTTOM
     1. Talking to the function
     2. The panel
   ========================================================================== */

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Unplug } from "lucide-react";
import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";
import { CanvaIconGlyph } from "./icons.jsx";
import { PrimaryButton, Spinner, StatusPill } from "./ui.jsx";
import { BRAND } from "./tokens";

/* --------------------------------------------------------------------------
   SECTION 1: Talking to the function

   `intent` is what picks the job. Status is the default at the other end
   too, so a request that loses its body reads the state rather than
   starting a handshake nobody asked for.
   -------------------------------------------------------------------------- */

async function askCanva(intent) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.canvaConnect, {
    body: {
      intent,
      /* WHERE TO COME BACK TO.

         Sent on the way out so the callback can bring the person straight
         back to the screen they left, rather than to a page that says
         "you can close this tab now".

         The server does not trust it. It is checked against a list of
         addresses this product is actually served from, and anything else
         is ignored. An address that comes from a browser and is then
         redirected to without checking is an open redirect, which is how
         a convincing phishing link gets built out of somebody's own
         domain. */
      returnTo: intent === "start" ? window.location.href : undefined,
    },
  });

  if (error) {
    /* invoke reports a non 200 as an error and throws the useful part away,
       so the body is read back off the response when there is one. Without
       this an admin sees "Edge Function returned a non-2xx status code",
       which tells them nothing they can act on. */
    let reason = "Could not reach Canva just now. Try again.";
    const status = error.context?.status ?? 0;
    try {
      const body = await error.context?.json?.();
      if (body?.reason) reason = body.reason;
    } catch {
      /* keep the plain message */
    }
    /* 403 is "you are not allowed", which is a completely different thing
       from "it broke". The panel hides its buttons for the first and keeps
       them for the second, so nobody is offered a control that cannot work
       for them. */
    return { ok: false, reason, denied: status === 403 };
  }

  return data ?? { ok: false, reason: "Nothing came back. Try again." };
}

/* --------------------------------------------------------------------------
   SECTION 2: The panel

   Four states and each one says something different, because "loading",
   "not connected" and "we could not check" are three genuinely different
   situations and showing the same thing for all three is how an admin ends
   up reconnecting something that was already fine.
   -------------------------------------------------------------------------- */

export default function CanvaConnect() {
  const [status, setStatus] = useState({ state: "loading" });
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState("");

  /* Two flags, not one. `asking` is the warning being shown, `dropping` is
     the request being made. Rolled into one they cannot be told apart, and
     the button spends the request looking like it is still asking. */
  const [asking, setAsking] = useState(false);
  const [dropping, setDropping] = useState(false);

  async function refresh() {
    setStatus({ state: "loading" });
    setProblem("");
    const result = await askCanva("status");
    if (!result.ok) {
      setStatus({ state: result.denied ? "denied" : "unknown" });
      setProblem(result.reason);
      return;
    }
    setStatus({
      state: result.connected ? "connected" : "off",
      connectedAt: result.connectedAt,
    });
  }

  /* COMING BACK FROM CANVA.

     The callback redirects here with ?connected=canva on a success, or
     ?connected=failed. Read once, said once, then taken out of the address
     bar so a refresh or a shared link does not replay a message about
     something that happened a while ago.

     replaceState rather than pushState, so Back goes where it went before
     rather than to a copy of this page carrying the marker. */
  const [justBack] = useState(() => {
    if (typeof window === "undefined") return "";
    const marker = new URLSearchParams(window.location.search).get("connected");
    return marker === "canva" || marker === "failed" ? marker : "";
  });

  useEffect(() => {
    if (!justBack || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("connected");
    window.history.replaceState({}, "", url.toString());
  }, [justBack]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await askCanva("status");
      if (!alive) return;
      if (!result.ok) {
        setStatus({ state: result.denied ? "denied" : "unknown" });
        setProblem(result.reason);
        return;
      }
      setStatus({
        state: result.connected ? "connected" : "off",
        connectedAt: result.connectedAt,
      });
    })();
    return () => { alive = false; };
  }, []);

  /* --------------------------------------------------------------------------
     CONNECTING, IN THIS TAB, AND BACK AGAIN

     THIS USED TO OPEN A NEW TAB AND IT WAS WRONG TWICE OVER.

     Wrong the first time because window.open sat after an await, so the
     click was over and Safari on an iPad blocked it without a word. Anthony
     pressed Connect four times; the logs show four handshakes started and
     one reaching Canva.

     Wrong the second time in a way no popup trick fixes. Anthony,
     2026-09-14: "It opened a different browser, but did not automatically
     lead me to that browser... the best thing could have even been that it
     doesn't open a different tab, but rather preserves the page. When the
     person clicks to connect, as it connects, it returns back, like a
     callback. It returns back to where the person was, exactly."

     He is right, and it is the shape the whole handshake was designed for.
     A new tab is correct for a source somebody wants to read alongside
     their work, because they go back and forth. Connecting is not that. It
     is one errand: leave, approve, come back. Sending them somewhere and
     leaving them to find their own way home is the software making its
     plumbing their problem.

     So this navigates THIS page. Nothing to block, nothing to close, no
     orphan tab. The address they were on travels with the request, and the
     callback redirects them back to it.
     -------------------------------------------------------------------------- */

  async function connect() {
    if (starting) return;
    setStarting(true);
    setProblem("");

    const result = await askCanva("start");

    if (!result.ok || !result.url) {
      setStarting(false);
      if (result.denied) setStatus({ state: "denied" });
      setProblem(result.reason ?? "Could not start that. Try again.");
      return;
    }

    /* starting stays true on purpose. The page is about to be replaced, and
       putting the button back to normal for the half second in between
       reads as nothing having happened. */
    window.location.assign(result.url);
  }

  /* Deleting the token row here, and nothing on Canva's side. See the note
     in the function: we cannot revoke their grant, so the panel says so
     rather than letting somebody believe we did more than we did. */
  async function disconnect() {
    if (dropping) return;
    setDropping(true);
    setProblem("");

    const result = await askCanva("disconnect");

    setDropping(false);
    setAsking(false);

    if (!result.ok) {
      if (result.denied) setStatus({ state: "denied" });
      setProblem(result.reason ?? "Could not disconnect that. Try again.");
      return;
    }

    setStatus({ state: "off" });
  }

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--chip)" }}
        >
          <CanvaIconGlyph size={18} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
              Canva
            </p>
            {status.state === "connected" && <StatusPill tone="ok">Connected</StatusPill>}
            {status.state === "off" && <StatusPill tone="pending">Not connected</StatusPill>}
            {status.state === "unknown" && <StatusPill tone="neutral">Unknown</StatusPill>}
            {status.state === "denied" && <StatusPill tone="neutral">Admin only</StatusPill>}
          </div>

          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            {status.state === "connected"
              ? "One Canva account serves everybody here. Nobody signs in themselves."
              : "Connect one Canva account and it serves everybody here. Nobody else has to sign in."}
          </p>

          {status.state === "connected" && status.connectedAt && (
            <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
              Connected {whenReadable(status.connectedAt)}
            </p>
          )}
        </div>
      </div>

      {status.state === "denied" ? (
        /* NO BUTTONS AT ALL. A person who cannot do this must not be shown
           the control, greyed out or otherwise. An admin reads this panel to
           find out whether Canva is connected; anybody else reads it to find
           out who to ask. */
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Only an admin can connect Canva. Ask whoever set this workspace up.
        </p>
      ) : status.state === "loading" ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-3)" }}>
          <Spinner size={14} />
          Checking
        </div>
      ) : (
        /* flex-1 with a floor on both, so they share the row evenly on a
           desktop and stack to the same width on a phone. Left to their own
           content widths they came out ragged, which reads as two unrelated
           controls rather than a choice between two.

           A plain comment, not a JSX one. This sits inside a ternary branch,
           where a braced JSX comment would be a second expression and the
           build refuses it. That is what broke it the first time. */
        <div className="flex flex-wrap gap-2">
          {asking ? (
            /* The warning, and it is the whole warning. Two buttons that
               say what they do, with the safe one first so the thumb
               nearest the edge is not the one that throws the connection
               away. No dialog over the screen: this is reversible in about
               fifteen seconds and a modal for it would be theatre. */
            <>
              <button
                onClick={() => setAsking(false)}
                disabled={dropping}
                className="flex-1 min-w-[130px] rounded-[12px] border px-4 py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
              >
                Keep it connected
              </button>
              <button
                onClick={disconnect}
                disabled={dropping}
                className="flex-1 min-w-[150px] rounded-[12px] border px-4 py-2.5 text-[13.5px] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--caution)", color: "var(--caution)" }}
              >
                {dropping ? <Spinner size={14} /> : <Unplug size={14} />}
                {dropping ? "Disconnecting" : "Yes, disconnect"}
              </button>
            </>
          ) : (
            <>
              <PrimaryButton
                onClick={status.state === "connected" ? () => setAsking(true) : connect}
                disabled={starting}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2"
              >
                {starting ? (
                  <Spinner size={14} />
                ) : status.state === "connected" ? (
                  <Unplug size={14} />
                ) : (
                  <ExternalLink size={14} />
                )}
                {starting
                  ? "Taking you to Canva"
                  : status.state === "connected"
                  ? "Disconnect"
                  : "Connect Canva"}
              </PrimaryButton>

              <button
                onClick={refresh}
                className="flex-1 min-w-[130px] rounded-[12px] border px-4 py-2.5 text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
              >
                <RefreshCw size={13} />
                Check again
              </button>
            </>
          )}
        </div>
      )}

      {/* Says what actually happens now, which is that they leave and are
          brought back. The old line told them to come back themselves and
          press Check again, which was the software handing them its own
          job. */}
      {starting === false && status.state !== "loading" && status.state !== "denied" && (
        <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-3)" }}>
          {asking
            ? "Disconnecting forgets the account here. It does not sign you out of Canva, so remove StellaXafe in your Canva settings too if you want the access gone from their side as well."
            : status.state === "connected"
            ? "To use a different Canva account, disconnect first, then connect again and pick that account on Canva."
            : "You will approve on Canva and land back on this screen."}
        </p>
      )}

      {/* Said after coming back, and only until they do something else.
          Without it the page looks identical to the one they left, and the
          only way to tell whether approving worked is to read the pill and
          guess. */}
      {justBack === "canva" && status.state === "connected" && (
        <p className="text-[12.5px] mt-3 leading-relaxed" style={{ color: BRAND.green }}>
          Canva is connected. Nothing else to do.
        </p>
      )}
      {justBack === "failed" && (
        <p className="text-[12.5px] mt-3 leading-relaxed" style={{ color: "var(--caution)" }}>
          Canva did not finish that, so nothing was connected. Try again.
        </p>
      )}

      {problem && status.state !== "denied" && (
        <p className="text-[12.5px] mt-3 leading-relaxed" style={{ color: "var(--caution)" }}>
          {problem}
        </p>
      )}
    </div>
  );
}

/* Plain words, not a timestamp. "Connected 2026-09-14T14:22:10.442Z" is a
   log line, and an admin reading their own screen is not reading a log. */
function whenReadable(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
