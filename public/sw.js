// Service worker for the dashboard PWA. Only ever registered on
// /dashboard routes (see DashboardLayout.jsx) — the public marketing site
// never registers this.

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

// Sent by supabase/functions/push-alerts as JSON: { title, body }. This
// is what actually makes the phone show/ring a notification even when
// the dashboard isn't open.
self.addEventListener("push", (event) => {
  let title = "تنبيه جديد";
  let body = "";

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title ?? title;
      body = data.body ?? "";
    } catch {
      body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      dir: "rtl",
      lang: "ar",
    }),
  );
});

// Tapping the notification focuses an already-open dashboard tab, or
// opens a new one if none is open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/dashboard");
      }
      return undefined;
    }),
  );
});
