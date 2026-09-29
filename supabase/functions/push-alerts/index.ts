// Runs every 15 minutes (see supabase/migrations/0002_push_notifications_schedule.sql).
// Checks the database for anything that has newly crossed into an alert
// state since the last check (not the moment a record is edited — see
// notification_log below), and sends a real Web Push notification for
// just the new ones to every subscribed device.
//
// Required secrets (set via `supabase secrets set`, never committed):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected automatically
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY     — generated once, no external account
//   VAPID_SUBJECT                            — optional, e.g. "mailto:you@example.com"

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

// ---------------------------------------------------------------------
// Ported from src/dashboard/lib/alerts.js — same duplication rationale as
// whatsapp-digest had: this runs in Deno, not the Vite/browser bundle.
// ---------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dateString: string, today: Date = new Date()): number {
  const target = new Date(`${dateString}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

const INSURANCE_DUE_DAYS = 7;
const INSURANCE_APPROACHING_DAYS = 30;
const OIL_DUE_KM = 1000;
const BOOKING_ALERT_WINDOW_DAYS = 3;

interface Status {
  level: string;
  label: string;
}

function statusFromDays(
  days: number,
  opts: {
    dueDays: number;
    approachingDays: number;
    expiredLabel: string;
    dueLabel: string;
    approachingLabel: string;
    okLabel: string;
  },
): Status {
  if (days < 0) return { level: "expired", label: opts.expiredLabel };
  if (days <= opts.dueDays) return { level: "due", label: opts.dueLabel };
  if (days <= opts.approachingDays) return { level: "approaching", label: opts.approachingLabel };
  return { level: "ok", label: opts.okLabel };
}

function getInsuranceStatus(expiryDate: string): Status {
  const days = daysUntil(expiryDate);
  return statusFromDays(days, {
    dueDays: INSURANCE_DUE_DAYS,
    approachingDays: INSURANCE_APPROACHING_DAYS,
    expiredLabel: "منتهي",
    dueLabel: `ينتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
    approachingLabel: `يقترب من الانتهاء (${days} يوم)`,
    okLabel: "ساري",
  });
}

function getLicenseStatus(expiryDate: string): Status {
  const days = daysUntil(expiryDate);
  return statusFromDays(days, {
    dueDays: INSURANCE_DUE_DAYS,
    approachingDays: INSURANCE_APPROACHING_DAYS,
    expiredLabel: "منتهية",
    dueLabel: `تنتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
    approachingLabel: `تقترب من الانتهاء (${days} يوم)`,
    okLabel: "سارية",
  });
}

function getOilStatus(
  odometerKm: number | null,
  nextChangeOdometerKm: number | null,
): Status {
  if (odometerKm == null || nextChangeOdometerKm == null) {
    return { level: "none", label: "لا يوجد سجل" };
  }
  const remainingKm = nextChangeOdometerKm - odometerKm;
  if (remainingKm <= 0) return { level: "overdue", label: "متأخر" };
  if (remainingKm <= OIL_DUE_KM) return { level: "due", label: `باقي ${remainingKm} كم` };
  return { level: "ok", label: "جيد" };
}

function getBookingFlags(pickupDate: string, returnDate: string) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const pickup = new Date(`${pickupDate}T00:00:00`).getTime();
  const dropoff = new Date(`${returnDate}T00:00:00`).getTime();
  return {
    isPickupToday: pickup === startOfToday,
    isReturnToday: dropoff === startOfToday,
    isCurrentlyBooked: pickup <= startOfToday && startOfToday <= dropoff,
  };
}

function getBookingAlert(
  pickupDate: string,
  returnDate: string,
): { type: "pickup" | "return"; label: string } | null {
  const { isPickupToday, isReturnToday, isCurrentlyBooked } = getBookingFlags(
    pickupDate,
    returnDate,
  );

  if (isReturnToday) return { type: "return", label: "استلام اليوم" };
  if (isPickupToday) return { type: "pickup", label: "تسليم اليوم" };

  if (isCurrentlyBooked) {
    const daysToReturn = daysUntil(returnDate);
    if (daysToReturn > 0 && daysToReturn <= BOOKING_ALERT_WINDOW_DAYS) {
      return {
        type: "return",
        label: `يتبقى ${daysToReturn} ${daysToReturn === 1 ? "يوم" : "أيام"} للاستلام من العميل`,
      };
    }
    return null;
  }

  const daysToPickup = daysUntil(pickupDate);
  if (daysToPickup > 0 && daysToPickup <= BOOKING_ALERT_WINDOW_DAYS) {
    return {
      type: "pickup",
      label: `يتبقى ${daysToPickup} ${daysToPickup === 1 ? "يوم" : "أيام"} للتسليم`,
    };
  }

  return null;
}

function carLabel(car: { make?: string; model?: string; year?: number } | undefined): string {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

function latestPerCarBy<T extends { car_id: string }>(
  records: T[],
  keyFn: (record: T) => string | number,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const record of records) {
    const existing = map.get(record.car_id);
    if (!existing || keyFn(record) > keyFn(existing)) {
      map.set(record.car_id, record);
    }
  }
  return map;
}

// ---------------------------------------------------------------------
// Compute every currently-active alert, keyed the same way the in-app
// bell keys them (src/dashboard/alerts/AlertsProvider.jsx) — stable per
// car/booking-event, independent of the day-count in its text.
// ---------------------------------------------------------------------

async function computeActiveAlerts(
  supabase: ReturnType<typeof createClient>,
): Promise<Map<string, string>> {
  const [
    { data: cars },
    { data: insuranceRecords },
    { data: licenseRecords },
    { data: oilRecords },
    { data: bookings },
  ] = await Promise.all([
    supabase.from("cars").select("id, make, model, year"),
    supabase.from("insurance_records").select("car_id, expiry_date"),
    supabase.from("license_renewals").select("car_id, expiry_date"),
    supabase.from("oil_changes").select("car_id, odometer_km, next_change_odometer_km"),
    supabase
      .from("bookings")
      .select("id, car_id, pickup_date, return_date, customer_name"),
  ]);

  const carsById = new Map((cars ?? []).map((car) => [car.id, car]));
  const latestInsurance = latestPerCarBy(insuranceRecords ?? [], (r) => r.expiry_date);
  const latestLicenses = latestPerCarBy(licenseRecords ?? [], (r) => r.expiry_date);
  const latestOil = latestPerCarBy(oilRecords ?? [], (r) => r.odometer_km ?? 0);

  const active = new Map<string, string>();

  for (const [carId, record] of latestInsurance) {
    const status = getInsuranceStatus(record.expiry_date);
    if (status.level !== "ok") {
      active.set(
        `insurance:${carId}`,
        `🛡️ التأمين — ${carLabel(carsById.get(carId))} — ${status.label}`,
      );
    }
  }
  for (const [carId, record] of latestLicenses) {
    const status = getLicenseStatus(record.expiry_date);
    if (status.level !== "ok") {
      active.set(
        `license:${carId}`,
        `📄 رخصة السيارة — ${carLabel(carsById.get(carId))} — ${status.label}`,
      );
    }
  }
  for (const [carId, record] of latestOil) {
    const status = getOilStatus(record.odometer_km, record.next_change_odometer_km);
    if (status.level !== "ok" && status.level !== "none") {
      active.set(
        `oil:${carId}`,
        `🛠️ تغيير الزيت — ${carLabel(carsById.get(carId))} — ${status.label}`,
      );
    }
  }
  for (const booking of bookings ?? []) {
    const alert = getBookingAlert(booking.pickup_date, booking.return_date);
    if (!alert) continue;
    active.set(
      `booking:${booking.id}:${alert.type}`,
      `📅 ${alert.label} — ${carLabel(carsById.get(booking.car_id))} — ${booking.customer_name}`,
    );
  }

  return active;
}

Deno.serve(async () => {
  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const activeAlerts = await computeActiveAlerts(supabase);

    const { data: loggedRows } = await supabase
      .from("notification_log")
      .select("alert_key");
    const loggedKeys = new Set((loggedRows ?? []).map((row) => row.alert_key));

    // Newly active since the last check — these get pushed.
    const newKeys = [...activeAlerts.keys()].filter((key) => !loggedKeys.has(key));
    // No longer active — clear so a future re-occurrence pushes again
    // instead of staying silenced forever.
    const staleKeys = [...loggedKeys].filter((key) => !activeAlerts.has(key));

    if (staleKeys.length > 0) {
      await supabase.from("notification_log").delete().in("alert_key", staleKeys);
    }

    if (newKeys.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");

    if (!subscriptions || subscriptions.length === 0) {
      // Nothing to deliver to yet — don't mark these as notified. Once a
      // device actually subscribes, these same keys should still count as
      // new and get pushed then, not stay silenced because a run happened
      // to check the database before anyone had opted in.
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const title = newKeys.length === 1 ? "تنبيه جديد" : `${newKeys.length} تنبيهات جديدة`;
    const body = newKeys.map((key) => activeAlerts.get(key)).join("\n");
    const payload = JSON.stringify({ title, body });

    const sendResults = await Promise.allSettled(
      (subscriptions ?? []).map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        ),
      ),
    );

    // A subscription that's gone (uninstalled, permission revoked) comes
    // back as a 404/410 — clean those up so future runs don't keep trying.
    const deadEndpoints = (subscriptions ?? [])
      .filter((_subscription, index) => {
        const result = sendResults[index];
        return (
          result.status === "rejected" &&
          (result.reason?.statusCode === 404 || result.reason?.statusCode === 410)
        );
      })
      .map((subscription) => subscription.endpoint);

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    await supabase
      .from("notification_log")
      .insert(newKeys.map((key) => ({ alert_key: key })));

    const delivered = sendResults.filter((result) => result.status === "fulfilled").length;

    return new Response(
      JSON.stringify({ ok: true, newAlerts: newKeys.length, delivered }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("push-alerts failed:", error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
