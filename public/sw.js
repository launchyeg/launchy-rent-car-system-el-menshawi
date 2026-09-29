// Minimal service worker for the dashboard PWA. Only ever registered on
// /dashboard routes (see DashboardLayout.jsx) — the public marketing site
// never registers this. A service worker is required both for
// installability and, later, for receiving Web Push events (Part C of
// the notifications feature — not implemented yet, this file will grow
// a "push" event listener then).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler is part of what some browsers require to consider a
// page installable. No caching/offline behavior in V1 — every request
// just passes straight through to the network.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
