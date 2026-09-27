// Pure date/status helpers for the dashboard's alert system. No Supabase
// or React here — just date math — so every threshold used across the
// dashboard lives in exactly one place.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dateString, today = new Date()) {
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

export const OIL_DUE_DAYS = 7;
export const OIL_APPROACHING_DAYS = 21;

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

// Date-only by design: nothing in the system captures a car's *current*
// odometer reading yet (no telematics, no check-in/out mileage capture),
// so a mileage-based status can't be evaluated automatically. odometer
// fields are still recorded on the record for history/reference.
export function getOilStatus(nextChangeDate, today) {
  if (!nextChangeDate) {
    return { level: "none", tone: "gray", days: null, label: "لا يوجد سجل" };
  }
  const days = daysUntil(nextChangeDate, today);
  return statusFromDays(days, {
    dueDays: OIL_DUE_DAYS,
    approachingDays: OIL_APPROACHING_DAYS,
    expiredLabel: "متأخر",
    dueLabel: `مستحق خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
    approachingLabel: `يقترب الاستحقاق (${days} يوم)`,
    okLabel: "جيد",
  });
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
