import { carLabel } from "./carLabel";

// Pure date/status helpers for the dashboard's alert system. No Supabase
// or React here — just date math — so every threshold used across the
// dashboard lives in exactly one place.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(dateString, today = new Date()) {
  const target = new Date(`${dateString}T00:00:00`);
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((target.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

// Insurance & license renewals need paperwork/appointments to resolve, so
// they get a longer warning window than a same-day oil change does.
export const INSURANCE_DUE_DAYS = 7;
export const INSURANCE_APPROACHING_DAYS = 30;

function statusFromDays(
  days,
  { dueDays, approachingDays, expiredLabel, dueLabel, approachingLabel, okLabel },
) {
  if (days < 0) {
    return { level: "expired", tone: "red", days, label: expiredLabel };
  }
  if (days <= dueDays) {
    return { level: "due", tone: "orange", days, label: dueLabel };
  }
  if (days <= approachingDays) {
    return { level: "approaching", tone: "yellow", days, label: approachingLabel };
  }
  return { level: "ok", tone: "green", days, label: okLabel };
}

export function getInsuranceStatus(expiryDate, today) {
  const days = daysUntil(expiryDate, today);
  return statusFromDays(days, {
    dueDays: INSURANCE_DUE_DAYS,
    approachingDays: INSURANCE_APPROACHING_DAYS,
    expiredLabel: "منتهي",
    dueLabel: `ينتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
    approachingLabel: `يقترب من الانتهاء (${days} يوم)`,
    okLabel: "ساري",
  });
}

export function getLicenseStatus(expiryDate, today) {
  const days = daysUntil(expiryDate, today);
  return statusFromDays(days, {
    dueDays: INSURANCE_DUE_DAYS,
    approachingDays: INSURANCE_APPROACHING_DAYS,
    expiredLabel: "منتهية",
    dueLabel: `تنتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
    approachingLabel: `تقترب من الانتهاء (${days} يوم)`,
    okLabel: "سارية",
  });
}

// Mileage-based by design: the owner records the odometer reading at each
// visit and a target for the next change; the badge is only as fresh as
// that reading — it doesn't move on its own between visits the way a
// date-based status would, so re-editing the record with the current
// reading is what keeps this accurate.
export const OIL_DUE_KM = 1000;

export function getOilStatus(odometerKm, nextChangeOdometerKm) {
  if (odometerKm == null || nextChangeOdometerKm == null) {
    return { level: "none", tone: "gray", remainingKm: null, label: "لا يوجد سجل" };
  }
  const remainingKm = nextChangeOdometerKm - odometerKm;
  if (remainingKm <= 0) {
    return { level: "overdue", tone: "red", remainingKm, label: "متأخر" };
  }
  if (remainingKm <= OIL_DUE_KM) {
    return {
      level: "due",
      tone: "orange",
      remainingKm,
      label: `باقي ${remainingKm} كم`,
    };
  }
  return { level: "ok", tone: "green", remainingKm, label: "جيد" };
}

// Bookings aren't an expiry concept — just facts about today, computed
// straight from a car's already-fetched booking rows. Deliberately
// separate from cars.status (which the owner sets by hand).
export function getBookingFlags(pickupDate, returnDate, today = new Date()) {
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

// Single derived display status for a booking row, shared by the list,
// the timeline and (later) the alerts so they can never disagree.
//   cancelled — cancelled_at is set (never blocks the car)
//   completed — the owner marked it returned (returned_on)
//   upcoming  — pickup is still in the future
//   active    — pickup reached, return date not yet passed (the return
//               day itself still counts as active until marked returned)
//   overdue   — return date passed and the car was never marked returned
// `days` is only set for overdue: how many days late.
export function getBookingStatus(booking, today = new Date()) {
  if (booking.cancelled_at) {
    return { key: "cancelled", tone: "gray", label: "ملغي" };
  }
  if (booking.returned_on) {
    return { key: "completed", tone: "gray", label: "منتهي" };
  }
  if (daysUntil(booking.pickup_date, today) > 0) {
    return { key: "upcoming", tone: "primary", label: "قادم" };
  }
  const daysToReturn = daysUntil(booking.return_date, today);
  if (daysToReturn >= 0) {
    return { key: "active", tone: "green", label: "جاري" };
  }
  return {
    key: "overdue",
    tone: "red",
    days: -daysToReturn,
    label: `متأخر ${-daysToReturn} ${-daysToReturn === 1 ? "يوم" : "أيام"} عن الاستلام`,
  };
}

// تسليم (company hands the car to the client) = pickup_date. استلام (company receives it back from the
// client) = return_date. Single source of truth for the booking alert
// window, reused by BookingsPage, DashboardHome, and the WhatsApp digest
// (ported there since it runs in a separate Deno runtime) so all three
// stay consistent. Symmetric on both sides: an alert fires on the day of
// either event, or once BOOKING_ALERT_WINDOW_DAYS or fewer days remain —
// never earlier, and never for a booking outside its active window.
export const BOOKING_ALERT_WINDOW_DAYS = 3;

export function getBookingAlert(pickupDate, returnDate, today = new Date()) {
  const { isPickupToday, isReturnToday, isCurrentlyBooked } = getBookingFlags(
    pickupDate,
    returnDate,
    today,
  );

  if (isReturnToday) {
    return { type: "return", tone: "orange", days: 0, label: "استلام سيارة اليوم" };
  }
  if (isPickupToday) {
    return { type: "pickup", tone: "primary", days: 0, label: "تسليم سيارة اليوم" };
  }

  if (isCurrentlyBooked) {
    const daysToReturn = daysUntil(returnDate, today);
    if (daysToReturn > 0 && daysToReturn <= BOOKING_ALERT_WINDOW_DAYS) {
      return {
        type: "return",
        tone: "yellow",
        days: daysToReturn,
        label: `يتبقى ${daysToReturn} ${daysToReturn === 1 ? "يوم" : "أيام"} على الاستلام`,
      };
    }
    return null;
  }

  const daysToPickup = daysUntil(pickupDate, today);
  if (daysToPickup > 0 && daysToPickup <= BOOKING_ALERT_WINDOW_DAYS) {
    return {
      type: "pickup",
      tone: "yellow",
      days: daysToPickup,
      label: `يتبقى ${daysToPickup} ${daysToPickup === 1 ? "يوم" : "أيام"} على التسليم`,
    };
  }

  return null;
}

// What a booking row/bar/modal shows as its badge: the derived status
// (getBookingStatus), but while a pickup/return alert applies (today, or
// within BOOKING_ALERT_WINDOW_DAYS) that alert's wording and tone win.
// `key` is always the derived status key, so filters stay stable.
export function getBookingDisplayStatus(booking, today = new Date()) {
  const status = getBookingStatus(booking, today);
  if (status.key === "upcoming" || status.key === "active") {
    const alert = getBookingAlert(booking.pickup_date, booking.return_date, today);
    if (alert) return { ...status, label: alert.label, tone: alert.tone };
  }
  return status;
}

// The single alert (if any) a booking raises on the dashboard and in push
// notifications. Cancelled bookings and bookings already marked received
// never alert. Overdue (today is after the receipt date and the car was
// never marked received) comes first; otherwise the delivery/receipt
// rules from getBookingAlert apply. `rank` sorts the dashboard list:
// overdue, then today's events, then soonest first.
export function getBookingNotice(booking, today = new Date()) {
  const status = getBookingStatus(booking, today);
  if (status.key === "cancelled" || status.key === "completed") return null;

  if (status.key === "overdue") {
    return { type: "overdue", tone: "red", days: status.days, label: status.label, rank: 0 };
  }

  const alert = getBookingAlert(booking.pickup_date, booking.return_date, today);
  if (!alert) return null;
  return { ...alert, rank: 1 + alert.days + (alert.type === "pickup" ? 0.5 : 0) };
}

// Rows for the dashboard's booking-alerts table, most urgent first.
// Cancelled bookings are dropped here (and never alert anyway).
export function buildBookingAlerts(bookings, today = new Date()) {
  const rows = [];
  for (const booking of bookings) {
    const notice = getBookingNotice(booking, today);
    if (!notice) continue;
    rows.push({
      key: `booking:${booking.id}:${notice.type}`,
      type: notice.type,
      rank: notice.rank,
      tone: notice.tone,
      label: notice.label,
      car: carLabel(booking.cars),
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
    });
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

// Bookings whose car is out with a customer right now: delivered, not yet
// received (overdue ones included), never cancelled.
export function countCurrentBookings(bookings, today = new Date()) {
  return bookings.filter((booking) => {
    const { key } = getBookingStatus(booking, today);
    return key === "active" || key === "overdue";
  }).length;
}
