// Fixed option sets and pure math for bookings. Dates are always
// "YYYY-MM-DD" strings (Supabase `date` columns); day arithmetic goes
// through Date.UTC so timezones and DST can never shift a result.

// Must match the bookings_fuel_valid check in supabase/schema.sql.
export const FUEL_LEVELS = [
  { value: "full", label: "ممتلئ" },
  { value: "three_quarters", label: "ثلاثة أرباع" },
  { value: "half", label: "نصف" },
  { value: "quarter", label: "ربع" },
  { value: "empty", label: "فارغ" },
];

export function fuelLevelLabel(value) {
  return FUEL_LEVELS.find((level) => level.value === value)?.label ?? "";
}

function toUtcDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

// Whole days from `fromDate` to `toDate` (negative if toDate is earlier).
export function daysBetween(fromDate, toDate) {
  return toUtcDay(toDate) - toUtcDay(fromDate);
}

// Rental days = receipt_date - delivery_date (10th -> 15th = 5 days,
// 10th -> 11th = 1 day). Returns 0 until both dates are valid.
export function rentalDays(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) return 0;
  return Math.max(0, daysBetween(pickupDate, returnDate));
}

// The day count as a correct Arabic phrase: 1 -> "يوم واحد",
// 2 -> "يومان", 3-10 -> "N أيام", 11 and above -> "N يومًا". Returns ""
// for 0 or a non-number, so a contract can print a blank line instead.
export function arabicDaysText(days) {
  const count = Number(days);
  if (!Number.isInteger(count) || count < 1) return "";
  if (count === 1) return "يوم واحد";
  if (count === 2) return "يومان";
  if (count <= 10) return `${count} أيام`;
  return `${count} يومًا`;
}

export function totalAmount(pickupDate, returnDate, dailyRate) {
  const rate = Number(dailyRate);
  if (!Number.isFinite(rate)) return 0;
  return rentalDays(pickupDate, returnDate) * rate;
}

// "YYYY-MM-DD" plus `days` (may be negative), same format back.
export function addDays(dateString, days) {
  return new Date((toUtcDay(dateString) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
}

// Today's local date as "YYYY-MM-DD" (what a `date` column expects).
export function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// "2026-10" -> { start: "2026-10-01", end: "2026-10-31" }.
export function monthBounds(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthString}-01`,
    end: `${monthString}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Day of month (1-31) of a "YYYY-MM-DD" string.
export const dayOf = (dateString) => Number(dateString.slice(8, 10));

// Where a booking's bar sits on its car's row. Column 1 of the row grid is
// the car label, so day N is column N + 1; a grid-column end line is one
// past the last column it covers. Ends that fall outside the month are
// "clipped": the bar runs to the edge of the month and is drawn square.
// Unclipped ends are inset by half a day cell, so a car received back and
// delivered again on the same day shows as two bars meeting in the middle
// of that day.
export function timelineBar(booking, bounds, daysInMonth) {
  const clippedStart = booking.pickup_date < bounds.start;
  const clippedEnd = booking.return_date > bounds.end;
  const startDay = clippedStart ? 1 : dayOf(booking.pickup_date);
  const endDay = clippedEnd ? daysInMonth : dayOf(booking.return_date);
  return { clippedStart, clippedEnd, column: `${startDay + 1} / ${endDay + 2}` };
}
