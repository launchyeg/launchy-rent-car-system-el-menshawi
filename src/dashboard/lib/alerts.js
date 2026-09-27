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
