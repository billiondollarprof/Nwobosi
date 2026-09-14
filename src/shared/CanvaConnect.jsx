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

   READ TOP TO BOTTOM
     1. Talking to the function
     2. The panel
   ========================================================================== */

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";
import { CanvaIconGlyph } from "./icons.jsx";
import { PrimaryButton, Spinner, StatusPill } from "./ui.jsx";

/* --------------------------------------------------------------------------
   SECTION 1: Talking to the function

   `intent` is what picks the job. Status is the default at the other end
   too, so a request that loses its body reads the state rather than
   starting a handshake nobody asked for.
   -------------------------------------------------------------------------- */

async function askCanva(intent) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.canvaConnect, {
    body: { intent },
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

  async function connect() {
    if (starting) return;
    setStarting(true);
    setProblem("");

    const result = await askCanva("start");
    setStarting(false);

    if (!result.ok || !result.url) {
      if (result.denied) setStatus({ state: "denied" });
      setProblem(result.reason ?? "Could not start that. Try again.");
      return;
    }

    /* A NEW TAB, not this one.

       The admin may be halfway through something here. Sending them to
       Canva in this tab and back again reloads the whole app and loses it.
       They approve over there, close that tab, and press Check again. */
    window.open(result.url, "_blank", "noopener,noreferrer");
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
          <PrimaryButton
            onClick={connect}
            disabled={starting}
            className="flex-1 min-w-[150px] flex items-center justify-center gap-2"
          >
            {starting ? <Spinner size={14} /> : <ExternalLink size={14} />}
            {status.state === "connected" ? "Connect a different account" : "Connect Canva"}
          </PrimaryButton>

          <button
            onClick={refresh}
            className="flex-1 min-w-[130px] rounded-[12px] border px-4 py-2.5 text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            <RefreshCw size={13} />
            Check again
          </button>
        </div>
      )}

      {/* The new tab is worth saying, because leaving the page is a surprise
          otherwise. Not shown while checking, and not shown to somebody who
          has no button to press. */}
      {starting === false && status.state !== "loading" && status.state !== "denied" && (
        <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-3)" }}>
          Approving opens in a new tab. Come back here and press Check again when you are done.
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
