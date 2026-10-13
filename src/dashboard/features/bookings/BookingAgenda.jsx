import { FiArrowDownLeft, FiArrowUpRight, FiEdit2, FiPhone, FiTrash2 } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa6";
import StatusBadge from "../../ui/StatusBadge";
import { carLabel } from "../../lib/carLabel";
import { formatDate } from "../../lib/format";
import { whatsappLink } from "../../lib/phone";
import { groupByDate, rentalDays, toISODate } from "./bookingSearch";

const typeStyles = {
  out: {
    label: "تسليم",
    icon: FiArrowUpRight,
    badge: "bg-tag-bg text-primary",
    bar: "border-s-primary",
  },
  in: {
    label: "استلام",
    icon: FiArrowDownLeft,
    badge: "bg-orange-50 text-orange-700",
    bar: "border-s-orange-500",
  },
};

function dayHeading(date, todayISO, tomorrowISO) {
  if (date === todayISO) return "النهارده";
  if (date === tomorrowISO) return "بكرة";
  return new Date(`${date}T00:00:00`).toLocaleDateString("ar-EG", { weekday: "long" });
}

// Day-by-day view of car movements: every delivery (طالعة) and receipt
// (داخلة) in the filtered period, grouped under its date. Receipts are
// listed before deliveries within a day, since a car received in the
// morning can go out again the same day. onEdit/onDelete are optional —
// without them (e.g. on DashboardHome) the list is read-only.
export default function BookingAgenda({
  events,
  getStatus,
  onEdit,
  onDelete,
  emptyMessage = "لا توجد حركة سيارات في الفترة دي.",
}) {
  if (!events.length) {
    return (
      <div className="rounded-2xl border border-border-soft bg-white py-14 text-center text-sm text-ink-soft">
        {emptyMessage}
      </div>
    );
  }

  const today = new Date();
  const todayISO = toISODate(today);
  const tomorrowISO = toISODate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  );

  return (
    <div className="grid gap-5">
      {groupByDate(events).map(({ date, items }) => {
        const outCount = items.filter((item) => item.type === "out").length;
        const inCount = items.length - outCount;
        const isPast = date < todayISO;

        return (
          <section key={date} className={isPast ? "opacity-70" : undefined}>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-ink">
                {dayHeading(date, todayISO, tomorrowISO)}
                <span className="ms-2 font-sans text-xs font-semibold text-ink-faint">
                  {formatDate(date)}
                </span>
              </h3>
              <div className="flex gap-2 text-xs font-bold">
                {outCount > 0 && (
                  <span className="rounded-full bg-tag-bg px-2.5 py-1 text-primary">
                    طالعة {outCount}
                  </span>
                )}
                {inCount > 0 && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
                    داخلة {inCount}
                  </span>
                )}
              </div>
            </div>

            <ul className="grid gap-2.5">
              {items.map(({ type, record }) => {
                const style = typeStyles[type];
                const Icon = style.icon;
                const days = rentalDays(record);
                const status = getStatus(record);

                return (
                  <li
                    key={`${record.id}-${type}`}
                    className={`flex items-start gap-3 rounded-2xl border-s-4 bg-white p-4 shadow-card ${style.bar}`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.badge}`}
                    >
                      <Icon aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                        <p className="font-semibold text-ink">{carLabel(record.cars)}</p>
                        <StatusBadge label={status.label} tone={status.tone} />
                      </div>

                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                        <span className="font-semibold text-ink">{record.customer_name}</span>
                        {record.customer_phone && (
                          <a
                            href={`tel:${record.customer_phone}`}
                            dir="ltr"
                            className="inline-flex items-center gap-1 hover:text-primary"
                          >
                            <FiPhone aria-hidden="true" />
                            {record.customer_phone}
                          </a>
                        )}
                        {whatsappLink(record.customer_phone) && (
                          <a
                            href={whatsappLink(record.customer_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`واتساب ${record.customer_name}`}
                            title="فتح محادثة واتساب"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-base text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
                          >
                            <FaWhatsapp aria-hidden="true" />
                          </a>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-ink-faint">
                        من {formatDate(record.pickup_date)} إلى {formatDate(record.return_date)}
                        {" · "}
                        {days} {days >= 3 && days <= 10 ? "أيام" : "يوم"}
                      </p>

                      {record.notes && (
                        <p className="mt-1.5 text-xs text-ink-soft">{record.notes}</p>
                      )}
                    </div>

                    {(onEdit || onDelete) && (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            aria-label="تعديل"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-primary hover:text-primary"
                          >
                            <FiEdit2 aria-hidden="true" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(record)}
                            aria-label="حذف"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-red-500 hover:text-red-600"
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
