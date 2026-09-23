/* Stands in for src/shared/driveApi.js in the harness.

   window.__DRIVE = { connected: true|false, fails: "reason" }
   Every upload is recorded on window.__FILED with its name, type and size,
   so a walk can check the right file was sent, not just that a message
   appeared. Harness only. */

export async function askDrive(intent) {
  const set = window.__DRIVE || {};
  if (intent === "status") return { ok: true, connected: Boolean(set.connected) };
  if (intent === "disconnect") return { ok: true, connected: false };
  return { ok: true, url: "about:blank" };
}

export async function fileInDrive({ blob, filename, mimeType }) {
  const set = window.__DRIVE || {};
  window.__FILED = window.__FILED || [];
  window.__FILED.push({ filename, mimeType, size: blob?.size ?? 0 });
  if (set.fails) return { ok: false, reason: set.fails, state: "unreachable" };
  return { ok: true, name: filename, folder: "Amara documents", link: "https://drive.google.com/file/d/fake/view" };
}
