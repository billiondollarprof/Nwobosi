/* ==========================================================================
   THE SERVICE WORKER: WHAT MAKES THE APP INSTALLABLE

   What this is: a small script the browser runs beside the app. Its being
   here, with manifest.webmanifest, is what lets a phone or computer install
   StellaXafe as an app with its own icon (Anthony, 2026-11-27).

   What it does: keeps the app's own built files (scripts, styles, fonts,
   icons) so the app opens fast, and always asks the network first for the
   page itself, so a new version is picked up straight away.

   What it must never do:
     - Keep anything a company owns. Answers from Supabase, the assistant,
       documents and uploads all go straight to the network, never stored.
     - Serve an old version of the app when the network is there.
   ========================================================================== */

const CACHE = "stellaxafe-app-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  /* Only the app's own address. Supabase and every other service go to the
     network untouched. */
  if (url.origin !== self.location.origin) return;

  /* The page: network first, the last copy only when offline. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  /* Built files have their content in their name, so a kept copy is never
     stale. Fonts and icons the same. */
  if (/^\/assets\/|\.(woff2|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
