// Registers the dashboard's service worker (public/sw.js) — required for
// PWA installability and, later, Web Push (Part C). Only ever called from
// DashboardLayout, so the public marketing site never registers it, and
// the registration is scoped to /dashboard to match manifest.webmanifest.
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/dashboard" });
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}
