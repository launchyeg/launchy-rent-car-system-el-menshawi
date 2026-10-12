import { carLabel } from "../../lib/carLabel";
import { formatDate } from "../../lib/format";
import { BOOKING_ALERT_WINDOW_DAYS } from "../../lib/alerts";

// Pure search/filter logic for the bookings page — no React, no Supabase.
// Dates are compared as "YYYY-MM-DD" strings, which sort correctly.
//
// Vocabulary (from the company's point of view):
//   طالعة  (out) = the car leaves to the customer on pickup_date (التسليم)
//   داخلة  (in)  = the car comes back on return_date (الاستلام)
//   عند العملاء  = the car is with a customer at some point in the period

export const MOVEMENTS = [
  { value: "all", label: "كل الحجوزات" },
  { value: "out", label: "طالعة (تسليم)" },
  { value: "in", label: "داخلة (استلام)" },
  { value: "with_customers", label: "عند العملاء" },
];

export const PERIODS = [
  { value: "any", label: "أي وقت" },
  { value: "today", label: "النهارده" },
  { value: "alert_window", label: `الـ ${BOOKING_ALERT_WINDOW_DAYS} أيام الجاية` },
  { value: "week", label: "الـ 7 أيام الجاية" },
  { value: "month", label: "الشهر ده" },
  { value: "custom", label: "فترة محددة" },
];

export function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Returns { from, to } (inclusive, either may be null = open-ended), or
// null for "any" (no date restriction at all).
export function periodRange(period, custom = {}, today = new Date()) {
  switch (period) {
    case "today":
      return { from: toISODate(today), to: toISODate(today) };
    // Same window as the booking alerts (today + BOOKING_ALERT_WINDOW_DAYS),
    // so this filter and the dashboard alerts always list the same moves.
    case "alert_window":
      return {
        from: toISODate(today),
        to: toISODate(addDays(today, BOOKING_ALERT_WINDOW_DAYS)),
      };
    case "week":
      return { from: toISODate(today), to: toISODate(addDays(today, 6)) };
    case "month":
      return {
        from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case "custom":
      if (!custom.from && !custom.to) return null;
      return { from: custom.from || null, to: custom.to || null };
    default:
      return null;
  }
}

function inRange(date, range) {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

// Booking [pickup, return] touches the range at any point.
function overlapsRange(record, range) {
  if (!range) return true;
  if (range.to && record.pickup_date > range.to) return false;
  if (range.from && record.return_date < range.from) return false;
  return true;
}

// With no period chosen ("any"), the movement cards look forward from
// today instead of over all history:
//   out  = not delivered yet (delivery today or later)
//   in   = with a customer now and still to be received (today or later)
//   with_customers = with a customer today
export function matchesMovement(record, movement, range, today = new Date()) {
  const todayISO = toISODate(today);
  switch (movement) {
    case "out":
      return range
        ? inRange(record.pickup_date, range)
        : record.pickup_date >= todayISO;
    case "in":
      return range
        ? inRange(record.return_date, range)
        : record.pickup_date <= todayISO && record.return_date >= todayISO;
    case "with_customers":
      return overlapsRange(record, range ?? { from: todayISO, to: todayISO });
    default:
      return overlapsRange(record, range);
  }
}

// Lowercases and folds the Arabic spelling variants people type
// interchangeably (أ/إ/آ → ا, ة → ه, ى → ي, …), strips diacritics and
// tatweel, and turns Arabic-Indic digits into Western ones.
export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value) {
  return normalizeText(value).replace(/\D/g, "");
}

function searchableText(record) {
  return normalizeText(
    [
      carLabel(record.cars),
      record.cars?.owner_name,
      record.customer_name,
      record.customer_phone,
      record.notes,
      formatDate(record.pickup_date),
      formatDate(record.return_date),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

// Every word of the query must match somewhere (AND). A word made only of
// digits also matches the phone number ignoring spaces/dashes, so
// "0100 123" and "0100123" both find "0100-123-4567".
export function matchesQuery(record, query) {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (!words.length) return true;

  const text = searchableText(record);
  const phone = digitsOnly(record.customer_phone);
  const isPhoneQuery = /^[\d\s+-]+$/.test(normalizeText(query));
  if (isPhoneQuery && phone.includes(digitsOnly(query))) return true;

  return words.every((word) => {
    if (text.includes(word)) return true;
    return /^\d+$/.test(word) && phone.includes(word);
  });
}

export function rentalDays(record) {
  const start = new Date(`${record.pickup_date}T00:00:00`);
  const end = new Date(`${record.return_date}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

// Flattens bookings into dated movement events for the day-by-day view:
// one "out" event on pickup_date and one "in" event on return_date, kept
// only when they fall inside the period and match the chosen movement.
export function movementEvents(records, movement, range) {
  const events = [];
  for (const record of records) {
    if (movement !== "in" && inRange(record.pickup_date, range)) {
      events.push({ type: "out", date: record.pickup_date, record });
    }
    if (movement !== "out" && inRange(record.return_date, range)) {
      events.push({ type: "in", date: record.return_date, record });
    }
  }
  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.type === "in" ? -1 : 1),
  );
}

export function groupByDate(events) {
  const groups = new Map();
  for (const event of events) {
    if (!groups.has(event.date)) groups.set(event.date, []);
    groups.get(event.date).push(event);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}
