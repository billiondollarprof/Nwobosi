/* WHEN THE LAST CHAT COMES BACK, AND WHEN IT DOES NOT.

   THE BEHAVIOUR THIS LOCKS DOWN. Anthony, 2026-09-22: "if I was working on
   this particular chat and I leave it, it should persist for like maybe
   one hour... but if I come back the next day, that particular chat, it
   should just show me a new chat." And: "when a piece work is already
   done, and downloaded keep at recent and always open a new chat."

   Before this, Chat.jsx opened the most recently updated conversation
   however old it was, so a chat from three weeks ago came straight back.

   WHY IT IS WORTH A TEST. The failure is invisible and slow. An hour is
   not something anybody sits and waits for, so the only way this ever gets
   checked by hand is by accident, tomorrow, by somebody who has forgotten
   what the rule was meant to be. Here the clock is just a number.

   Both files import nothing at all, which is why they can be read straight
   in. Keep them that way.  */

import { shouldReopen, RESUME_WINDOW_MINUTES } from "../../src/shared/resumeWindow.js";
import { buildResumeLog, readResumeLog, emptyResumeLog } from "../../src/shared/resumeLog.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const NOW = new Date("2026-09-22T14:00:00Z").getTime();
const ago = (minutes) => new Date(NOW - minutes * 60_000).toISOString();

/* --------------------------------------------------------------------------
   1. THE HOUR
   -------------------------------------------------------------------------- */

check("the window is one hour", RESUME_WINDOW_MINUTES === 60);

check("a chat from a minute ago comes back",
  shouldReopen({ updatedAt: ago(1), now: NOW }).reopen === true);
check("so does one from 59 minutes ago",
  shouldReopen({ updatedAt: ago(59), now: NOW }).reopen === true);
check("60 minutes exactly still comes back, the boundary is inclusive",
  shouldReopen({ updatedAt: ago(60), now: NOW }).reopen === true);
check("61 minutes does not",
  shouldReopen({ updatedAt: ago(61), now: NOW }).reopen === false);
check("and it says why: stale",
  shouldReopen({ updatedAt: ago(61), now: NOW }).why === "stale");

check("THE ONE HE ASKED FOR: yesterday opens a new chat",
  shouldReopen({ updatedAt: ago(60 * 24), now: NOW }).reopen === false);
check("and so does three weeks ago, which is what it used to reopen",
  shouldReopen({ updatedAt: ago(60 * 24 * 21), now: NOW }).reopen === false);

/* --------------------------------------------------------------------------
   2. A FINISHED JOB NEVER REOPENS, WHATEVER THE CLOCK SAYS

   This rule has to beat the hour, or downloading a file and coming back
   two minutes later puts somebody on work they have already filed.
   -------------------------------------------------------------------------- */

check("downloaded two minutes ago still opens a new chat",
  shouldReopen({ updatedAt: ago(2), delivered: true, now: NOW }).reopen === false);
check("and it says why: delivered",
  shouldReopen({ updatedAt: ago(2), delivered: true, now: NOW }).why === "delivered");
check("built but NOT downloaded still comes back, which is the difference",
  shouldReopen({ updatedAt: ago(2), delivered: false, now: NOW }).reopen === true);
check("delivered beats the clock even on a fresh chat",
  shouldReopen({ updatedAt: ago(0), delivered: true, now: NOW }).reopen === false);

/* --------------------------------------------------------------------------
   3. NOTHING ODD OPENS SOMETHING FROM LAST MONTH

   Every bad value has to fall the safe way, which is a new chat. Guessing
   at a date and getting it wrong is how you reopen a stranger's work.
   -------------------------------------------------------------------------- */

for (const [label, value] of [
  ["nothing at all", undefined],
  ["null", null],
  ["an empty string", ""],
  ["nonsense", "not a date"],
  ["a number", 12345],
]) {
  check(`${label} opens a new chat`,
    shouldReopen({ updatedAt: value, now: NOW }).reopen === false);
}
check("no arguments at all does not throw", shouldReopen().reopen === false);

/* A clock a few seconds ahead of the server must not throw somebody's
   conversation away. */
check("a timestamp slightly in the future is treated as fresh",
  shouldReopen({ updatedAt: ago(-1), now: NOW }).reopen === true);

/* --------------------------------------------------------------------------
   4. THE FLAG SURVIVES THE ROUND TRIP

   shouldReopen is only correct if `delivered` actually comes back out of
   the database the way it went in. That is the resume log's job.
   -------------------------------------------------------------------------- */

check("a new log starts undelivered", emptyResumeLog().delivered === false);
check("writing true reads back true",
  readResumeLog(buildResumeLog({ delivered: true })).delivered === true);
check("writing false reads back false",
  readResumeLog(buildResumeLog({ delivered: false })).delivered === false);
check("not saying anything reads back false",
  readResumeLog(buildResumeLog({})).delivered === false);

/* The ref this comes from could hold anything, so only a real true counts. */
check('the string "false" does not read as delivered',
  readResumeLog(buildResumeLog({ delivered: "false" })).delivered === false);
check("the number 1 does not read as delivered",
  readResumeLog(buildResumeLog({ delivered: 1 })).delivered === false);

/* A conversation written before this field existed. Its log has no
   `delivered` key, and it has to read as false rather than undefined, or
   shouldReopen would be comparing against nothing. */
const old = { v: 1, making: "", asked: 2, findings: ["a figure"], declined: 0, missing: "", at: null };
check("a log from before today reads as not delivered",
  readResumeLog(old).delivered === false);
check("and it does NOT lose what it was already holding",
  readResumeLog(old).findings.length === 1 && readResumeLog(old).asked === 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
