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
