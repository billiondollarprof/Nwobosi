/* ==========================================================================
   THE ADMIN CLOCK
   An admin session lasts 24 hours. Staff stay signed in until they sign out.

   Why this is here and not in Supabase: a project has one token lifetime for
   everybody. Two different lifetimes for two kinds of person cannot come
   from that setting, so the shorter one is kept in the app and checked on
   every load.

   Be honest about what that is worth. This is a convenience, not a boundary.
   Somebody who edits their own browser storage can clear the timestamp, and
   the Supabase session underneath is still valid until it expires on its
   own. What actually stops an admin doing admin things is RLS reading their
   staff row, and that does not care what this file says.

   What it does buy: a laptop left open in an office, or a shared machine,
   stops being an admin console the next morning. That is the case it is for.
   ========================================================================== */

import { supabase } from "./supabase.js";

const KEY = "stellaxafe.admin.since";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/* Storage throws rather than returning null in a few settings, private
   windows and blocked site data among them, so every touch is guarded. An
   admin whose browser refuses to remember this is simply never signed out
   early, which is the old behaviour and not a new failure. */
function read() {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

function write(value) {
  try {
    if (value === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, String(value));
  } catch {
    /* nothing to do, see above */
  }
}

/* Called when an admin signs in, from either door. */
export function startAdminClock() {
  write(Date.now());
}

export function clearAdminClock() {
  write(null);
}

/* Called on load, before anything reads their workspace. Returns true if the
   session was ended, so the caller can send them to sign in again rather
   than rendering a dashboard that is about to empty itself. */
export async function adminSessionExpired(isAdmin) {
  if (!isAdmin) {
    /* Staff carry no clock. Clear a stale one so somebody who was an admin
       and is now not does not get signed out on somebody else's timer. */
    clearAdminClock();
    return false;
  }

  const since = read();

  /* No stamp and a live admin session means they signed in before this
     existed, or storage was cleared under them. Start the clock now rather
     than signing them out on the spot for something they did not do. */
  if (!since) {
    startAdminClock();
    return false;
  }

  if (Date.now() - since < MAX_AGE_MS) return false;

  clearAdminClock();
  await supabase.auth.signOut();
  return true;
}
