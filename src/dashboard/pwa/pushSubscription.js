import { supabase } from "../../lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// pushManager.subscribe() needs the VAPID public key as a raw byte array,
// not the base64url string form it's distributed/stored as.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

// Requests permission, subscribes via the browser's push service, and
// stores the subscription in Supabase so push-alerts (the Edge Function)
// knows where to send to. Safe to call again if already subscribed —
// just returns the existing subscription instead of creating a new one.
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error("هذا المتصفح لا يدعم الإشعارات.");
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("لم يتم إعداد مفتاح الإشعارات (VITE_VAPID_PUBLIC_KEY).");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("تم رفض إذن الإشعارات.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;

  return subscription;
}
