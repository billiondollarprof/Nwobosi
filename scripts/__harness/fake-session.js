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
export async function listConversations() { return []; }
export async function loadConversation() { return null; }
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
