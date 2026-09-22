/* Stands in for src/shared/session.js in the harness. Answers as a signed
   in staff member and stores nothing, so the chat's own flow can be walked
   without a workspace. Harness only. */

export async function loadMe() {
  /* `user` matters as much as `staff`. The chat reads who.user.id to list
     recent conversations, so leaving it out threw on mount and every check
     after it was running against a half dead page. */
  return {
    user: { id: "s1", email: "anthony@example.com" },
    company: { id: "c1", name: "Greenwich Hospitals" },
    staff: { id: "s1", name: "Anthony Nwobosi", role: "Operations", access_level: "admin", can_support: true },
  };
}

export async function listWork() { return []; }
export async function saveWork() { return null; }
/* --------------------------------------------------------------------------
   ONE OLD CONVERSATION, WITH ITS AGE SET BY THE TEST

   Added 2026-09-22 for the resume window. The rule is "comes back inside
   an hour, and never once the file was downloaded", and neither half can
   be checked by hand without sitting and waiting, or without downloading
   something and coming back tomorrow.

   So the test sets window.__RESUME before the page loads and says how old
   the conversation is and whether it was delivered. With nothing set these
   answer empty, exactly as they did before, so the flow walk is untouched.
   -------------------------------------------------------------------------- */

export const RESUMED_LINE = "This is the board report you were working on.";

function staged() {
  const set = globalThis.__RESUME;
  if (!set || !set.updatedAt) return null;
  return {
    id: "conv-old",
    title: set.title ?? "Board report",
    stage: set.stage ?? "analyse",
    updated_at: set.updatedAt,
    state: set.state ?? {},
    brief: "",
    messages: [
      { role: "user", type: "text", content: "Write me a board report" },
      { role: "assistant", type: "text", content: RESUMED_LINE },
    ],
  };
}

export async function listConversations() {
  const row = staged();
  if (!row) return [];
  const { id, title, stage, updated_at, state } = row;
  return [{ id, title, stage, updated_at, state }];
}

export async function loadConversation(id) {
  const row = staged();
  return row && row.id === id ? row : null;
}
export async function saveConversation() { return "conv-1"; }
export async function signOutCompletely() {}

/* --------------------------------------------------------------------------
   THE PEOPLE SECTION OF THE ADMIN SCREEN

   Added 2026-09-21, when the capability ladder came down from four rungs to
   two and the per person level picker was taken off this screen. That
   change could not be looked at, because the admin page needs a signed in
   workspace and the harness only knew how to render support and the chat.

   These answer as a small real company. Three members of staff, one of them
   still holding a retired ceiling, because a row written before the ladder
   changed is exactly the case the screen has to read properly.
   -------------------------------------------------------------------------- */

export async function listStaff() {
  return [
    {
      id: "s1", name: "Anthony Nwobosi", role: "Operations",
      access_level: "admin", model_ceiling: "standard",
      daily_limit: 20, can_support: true,
    },
    {
      id: "s2", name: "Chidera Okonkwo", role: "Client services",
      access_level: "staff", model_ceiling: "deeper",
      daily_limit: 5, can_support: false,
    },
    {
      id: "s3", name: "Bolanle Adeyemi-Fashola", role: "Finance associate",
      access_level: "staff", model_ceiling: null,
      daily_limit: 10, can_support: false,
    },
  ];
}

export async function setSupportAccess() { return { ok: true }; }

/* THE KNOWLEDGE SECTION, WHICH THIS PREVIEW DOES NOT RENDER.

   Admin.jsx pulls every one of these out of session.js in a single import,
   so a name missing here is not a quiet undefined. The whole module fails
   to load and the page never mounts, which is what happened the first time
   the People preview was opened. They answer empty and do nothing.

   The real removeSource is not among them on purpose. The harness hands
   the tests the genuine module through window.__session, and the delete
   check in scripts/__harness/sources.cjs drives that one. */
export async function listSources() { return []; }
export async function addTextSource() { return { ok: false, reason: "Not in the preview." }; }
export async function addImageSource() { return { ok: false, reason: "Not in the preview." }; }
export async function removeSource() { return { ok: false, reason: "Not in the preview." }; }
export async function groupImages() { return { ok: true, groups: [] }; }
export async function setSourceVisibility() { return { ok: true }; }
export async function listContradictions() { return []; }
export async function resolveContradiction() { return { ok: true }; }
