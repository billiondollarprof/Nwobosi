/* Stands in for src/shared/inviteApi.js in the harness. Both calls reach an
   edge function through raw fetch, which needs a project URL and a real
   session, so neither can run here. Harness only.

   revokeStaff matters most: the confirmation dialog, the busy state and the
   row leaving the list only after the server says yes are all things that
   have to be walked, and revoke is the control that shipped doing nothing
   at all. */

export async function inviteStaff({ name, email }) {
  return {
    ok: true,
    name,
    email,
    emailed: true,
    token: "49347fa077314bc793234c9acfd8bf56cb9c4da290f3401ba6f23af8dc079acb",
    link: `${window.location.origin}/join/49347fa077314bc793234c9acfd8bf56cb9c4da290f3401ba6f23af8dc079acb`,
    expiresAt: new Date(Date.now() + 72 * 3600_000).toISOString(),
  };
}

/* A short pause on purpose, so the dialog's busy state is real enough to
   be looked at rather than a frame nobody sees. */
export async function revokeStaff() {
  await new Promise((r) => setTimeout(r, 250));
  return { ok: true, accountRemains: false };
}

export function inviteLink(token) {
  return `${window.location.origin}/join/${token}`;
}

export { timeLeft, acceptInvite } from "../../src/shared/inviteApi.js";
