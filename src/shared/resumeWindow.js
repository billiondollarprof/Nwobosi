/* ==========================================================================
   DOES THE LAST CHAT COME BACK, OR DO YOU GET A NEW ONE

   Anthony, 2026-09-22: "if I was working on this particular chat and I
   leave it, it should persist for like maybe 30 minutes... even if I
   refresh it, it stays in that chat, maybe for like one hour. Then but if
   I come back the next day, that particular chat, it should just show me a
   new chat."

   WHAT IT WAS DOING BEFORE
   Opening the most recently updated conversation, always, however old it
   was. So a chat last touched three weeks ago came straight back when
   somebody opened the app, and the first thing they had to do every
   morning was press New chat.

   THE TWO RULES, AND THE SECOND ONE BEATS THE FIRST
   ------------------------------------------------
   1. Under an hour since the last message, it comes back. Past that, a new
      chat opens instead.
   2. If the document was built AND downloaded, a new chat opens whatever
      the clock says. Anthony, same day: "when a piece work is already done,
      and downloaded keep at recent and always open a new chat." That job is
      finished, so the next thing somebody asks for is a different job.

   WHAT THIS NEVER DOES
   Delete anything, or hide anything. Every conversation stays in Recent
   with its title, and clicking one opens it however old it is and whether
   or not it was downloaded. This decides only what opens BY ITSELF when
   the app loads.

   WHY IT IS ITS OWN FILE
   So it can be tested without a browser, a database or React. The page
   asks it a question and does what it says. Nothing here reads state,
   fetches anything, or knows what a conversation is beyond the three
   values below.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: The window

   ONE NAMED PLACE, so changing it later is this line and nothing else.

   AN HOUR, NOT THIRTY MINUTES. It has to survive a lunch, a meeting, or a
   phone that died, because losing your thread for stepping away for forty
   minutes is the version people complain about. It also happens to match
   the model's own memory window, so coming back inside the hour is cheap
   as well as convenient.
   -------------------------------------------------------------------------- */

export const RESUME_WINDOW_MINUTES = 60;

const WINDOW_MS = RESUME_WINDOW_MINUTES * 60 * 1000;

/* --------------------------------------------------------------------------
   SECTION 2: The decision

   Answers with a reason as well as a yes or no, because the page uses the
   reason and so does the test. A boolean on its own tells you what happened
   and never why, and "why" is the thing somebody debugging this at 2am
   actually needs.

     fresh      recent enough, and not finished. Open it.
     delivered  the file was built and downloaded. Start fresh.
     stale      past the window. Start fresh.
     unknown    no usable timestamp. Start fresh, because guessing at a
                date and getting it wrong reopens something from last month.

   `now` is passed in rather than read here, so a test can move the clock
   instead of waiting an hour.
   -------------------------------------------------------------------------- */

export function shouldReopen({ updatedAt, delivered = false, now = Date.now() } = {}) {
  const at = new Date(updatedAt ?? "").getTime();
  if (!Number.isFinite(at)) return { reopen: false, why: "unknown" };

  /* CHECKED BEFORE THE CLOCK, DELIBERATELY. A document downloaded two
     minutes ago is still a finished job, and reopening it would put
     somebody back on work they have already filed. */
  if (delivered === true) return { reopen: false, why: "delivered" };

  /* A negative age means the row is stamped in the future, which happens
     when a laptop's clock is a few seconds off the server's. That is not a
     reason to throw somebody's conversation away, so it counts as fresh. */
  const age = now - at;
  if (age > WINDOW_MS) return { reopen: false, why: "stale" };

  return { reopen: true, why: "fresh" };
}
