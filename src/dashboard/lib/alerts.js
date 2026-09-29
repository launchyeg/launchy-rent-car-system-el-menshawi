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

// تسليم (delivery to the client) = pickup_date. استلام (receipt from the
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
    return { type: "return", tone: "orange", days: 0, label: "استلام اليوم" };
  }
  if (isPickupToday) {
    return { type: "pickup", tone: "primary", days: 0, label: "تسليم اليوم" };
  }

  if (isCurrentlyBooked) {
    const daysToReturn = daysUntil(returnDate, today);
    if (daysToReturn > 0 && daysToReturn <= BOOKING_ALERT_WINDOW_DAYS) {
      return {
        type: "return",
        tone: "yellow",
        days: daysToReturn,
        label: `يتبقى ${daysToReturn} ${daysToReturn === 1 ? "يوم" : "أيام"} للاستلام من العميل`,
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
      label: `يتبقى ${daysToPickup} ${daysToPickup === 1 ? "يوم" : "أيام"} للتسليم`,
    };
  }

  return null;
}
