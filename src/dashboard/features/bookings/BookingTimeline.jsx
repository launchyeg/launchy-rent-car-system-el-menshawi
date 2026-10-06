import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import EmptyState from "../../ui/EmptyState";
import { useToast } from "../../ui/Toast";
import { carLabel } from "../../lib/carLabel";
import { getBookingDisplayStatus } from "../../lib/alerts";
import { formatDate } from "../../lib/format";
import { listBookingsInRange } from "./bookingsApi";
import { dayOf, monthBounds, timelineBar, todayString } from "./bookingUtils";

// First letter of each weekday, Sunday first (index = Date#getUTCDay()).
const WEEKDAY_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const FRIDAY = 5;
const SATURDAY = 6;

const monthFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Bar color follows the same tone the status badge uses (see
// getBookingDisplayStatus), so the timeline and the list always agree.
const BAR_CLASSES = {
  primary: "bg-primary text-white",
  green: "bg-emerald-500 text-white",
  yellow: "bg-amber-400 text-ink",
  orange: "bg-orange-500 text-white",
  red: "bg-red-600 text-white",
  gray: "bg-border text-ink-soft",
};

const LEGEND = [
  { tone: "primary", label: "قادم" },
  { tone: "green", label: "جاري" },
  { tone: "yellow", label: "تسليم أو استلام قريب" },
  { tone: "red", label: "متأخر" },
  { tone: "gray", label: "منتهي" },
];

const dotClasses = {
  primary: "bg-primary",
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-600",
  gray: "bg-border",
};

// Stable empty list, so memoized values below don't recompute every render.
const NO_BOOKINGS = [];

const pad = (number) => String(number).padStart(2, "0");
const monthKey = ({ year, month }) => `${year}-${pad(month + 1)}`;

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function shiftMonth({ year, month }, delta) {
  const shifted = new Date(Date.UTC(year, month + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

// Month view of every car's bookings: cars are rows, days are columns.
// Under the dashboard's dir="rtl" the grid flows right to left on its own
// (day 1 on the right, the sticky car column at the right edge), so no
// left/right math is needed anywhere. `refreshKey` changes whenever the
// page reloads its data, which makes the month's bookings refetch.
export default function BookingTimeline({
  cars,
  refreshKey,
  onBookingClick,
  onEmptyCellClick,
}) {
  const { showToast } = useToast();
  const [shown, setShown] = useState(currentMonth);
  const [loaded, setLoaded] = useState({ month: null, key: null, bookings: [] });

  const monthStr = monthKey(shown);
  const bounds = monthBounds(monthStr);
  const daysInMonth = dayOf(bounds.end);
  const fetchKey = `${monthStr}|${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    listBookingsInRange(bounds.start, bounds.end)
      .then((bookings) => {
        if (!cancelled) setLoaded({ month: monthStr, key: fetchKey, bookings });
      })
      .catch((error) => {
        if (cancelled) return;
        showToast(error.message ?? "تعذّر تحميل حجوزات هذا الشهر", { tone: "error" });
        setLoaded({ month: monthStr, key: fetchKey, bookings: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [bounds.start, bounds.end, monthStr, fetchKey, showToast]);

  // Keep showing the previous result while a refresh is in flight, but
  // never another month's bookings on this month's grid.
  const bookings = loaded.month === monthStr ? loaded.bookings : NO_BOOKINGS;
  const loading = loaded.key !== fetchKey;

  const bookingsByCar = useMemo(() => {
    const map = new Map();
    for (const booking of bookings) {
      if (!map.has(booking.car_id)) map.set(booking.car_id, []);
      map.get(booking.car_id).push(booking);
    }
    return map;
  }, [bookings]);

  const today = todayString();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${monthStr}-${pad(day)}`;
    const weekday = new Date(Date.UTC(shown.year, shown.month, day)).getUTCDay();
    return {
      day,
      date,
      weekday,
      isToday: date === today,
      isWeekend: weekday === FRIDAY || weekday === SATURDAY,
    };
  });

  const gridStyle = { gridTemplateColumns: `var(--label) repeat(${daysInMonth}, var(--cell))` };
  const isCurrentMonth = monthStr === monthKey(currentMonth());

  if (cars.length === 0) {
    return (
      <EmptyState
        title="لا توجد سيارات"
        description="أضف سيارة واحدة على الأقل لتظهر في الجدول الزمني."
      />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShown((current) => shiftMonth(current, -1))}
            aria-label="الشهر السابق"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
          <h2 className="min-w-36 text-center font-heading text-base font-bold text-ink">
            {monthFormatter.format(new Date(Date.UTC(shown.year, shown.month, 1)))}
          </h2>
          <button
            type="button"
            onClick={() => setShown((current) => shiftMonth(current, 1))}
            aria-label="الشهر التالي"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShown(currentMonth())}
          disabled={isCurrentMonth}
          className="btn btn-outline disabled:opacity-50"
        >
          اليوم
        </button>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
        {LEGEND.map((item) => (
          <li key={item.tone} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${dotClasses[item.tone]}`}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>

      {!loading && bookings.length === 0 && (
        <p className="text-sm text-ink-soft">
          لا توجد حجوزات في هذا الشهر. اضغط على أي يوم لإضافة حجز.
        </p>
      )}

      <div
        className={`overflow-x-auto rounded-2xl bg-white shadow-card transition-opacity ${
          loading ? "opacity-60" : ""
        }`}
        style={{ "--cell": "2.75rem", "--label": "13rem" }}
      >
        <div className="w-max min-w-full">
          <div className="grid border-b border-border-soft" style={gridStyle}>
            <div className="sticky start-0 z-20 border-e border-border-soft bg-white px-3 py-2 text-xs font-bold text-ink-faint">
              السيارة
            </div>
            {days.map((day) => (
              <div
                key={day.day}
                className={`flex flex-col items-center justify-center py-1.5 text-xs ${
                  day.isToday
                    ? "bg-primary font-bold text-white"
                    : day.isWeekend
                      ? "bg-surface-alt text-ink-soft"
                      : "text-ink-soft"
                }`}
              >
                <span className="text-[10px] opacity-80">{WEEKDAY_LETTERS[day.weekday]}</span>
                <span className="font-semibold">{day.day}</span>
              </div>
            ))}
          </div>

          {cars.map((car) => (
            <div
              key={car.id}
              className="grid h-12 border-b border-border-soft last:border-0"
              style={gridStyle}
            >
              <div
                className="sticky start-0 z-20 flex items-center border-e border-border-soft bg-white px-3 text-xs font-semibold text-ink"
                style={{ gridColumn: 1, gridRow: 1 }}
              >
                <span className="line-clamp-2" title={carLabel(car)}>
                  {carLabel(car)}
                </span>
              </div>

              {days.map((day) => (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => onEmptyCellClick(car, day.date)}
                  aria-label={`إضافة حجز لـ ${carLabel(car)} بتاريخ ${formatDate(day.date)}`}
                  className={`border-e border-border-soft/60 transition-colors hover:bg-tag-bg ${
                    day.isToday
                      ? "bg-tag-bg/70"
                      : day.isWeekend
                        ? "bg-surface-alt/70"
                        : ""
                  }`}
                  style={{ gridColumn: day.day + 1, gridRow: 1 }}
                />
              ))}

              {(bookingsByCar.get(car.id) ?? []).map((booking) => {
                const status = getBookingDisplayStatus(booking);
                const { clippedStart, clippedEnd, column } = timelineBar(
                  booking,
                  bounds,
                  daysInMonth,
                );
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => onBookingClick(booking)}
                    title={`${booking.customer_name} — ${formatDate(booking.pickup_date)} ← ${formatDate(booking.return_date)} — ${status.label}`}
                    className={`z-10 my-2 truncate px-2 text-start text-xs font-semibold shadow-sm transition-opacity hover:opacity-85 ${
                      BAR_CLASSES[status.tone] ?? BAR_CLASSES.gray
                    } ${clippedStart ? "" : "rounded-s-md"} ${clippedEnd ? "" : "rounded-e-md"}`}
                    style={{
                      gridColumn: column,
                      gridRow: 1,
                      marginInlineStart: clippedStart ? undefined : "calc(var(--cell) / 2)",
                      marginInlineEnd: clippedEnd ? undefined : "calc(var(--cell) / 2)",
                    }}
                  >
                    {booking.customer_name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
