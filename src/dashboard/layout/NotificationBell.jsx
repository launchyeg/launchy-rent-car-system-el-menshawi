import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useAlerts } from "../alerts/AlertsProvider";

const SEEN_STORAGE_KEY = "launchy-dashboard-seen-alerts";

function loadSeenKeys() {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenKeys(keys) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // localStorage can throw in private browsing or when storage is full —
    // the bell still works, it just won't remember "seen" across reloads.
  }
}

const dotToneClasses = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-400",
  gray: "bg-border",
  primary: "bg-primary",
};

// Alert identity is stable per car/booking-event (see AlertsProvider's
// `key`), independent of the day-count in its label — so an alert is only
// "new" once, not re-flagged every day its countdown ticks down, but
// reappears if it fully resolves and later re-triggers. "Seen" state is
// per-device (localStorage), not the database — see the plan notes for
// the tradeoff.
export default function NotificationBell() {
  const { alerts, bookingAlerts } = useAlerts();
  const [open, setOpen] = useState(false);
  const [seenKeys, setSeenKeys] = useState(() => loadSeenKeys());
  const containerRef = useRef(null);

  const items = useMemo(
    () => [
      ...alerts.map((alert) => ({ key: alert.key, tone: alert.tone, text: alert.text })),
      ...bookingAlerts.map((booking) => ({
        key: booking.key,
        tone: booking.tone,
        text: `${booking.label} — ${booking.car} — ${booking.customer_name}`,
      })),
    ],
    [alerts, bookingAlerts],
  );

  const unseenCount = items.filter((item) => !seenKeys.has(item.key)).length;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((current) => {
      const next = !current;
      if (!next && items.length > 0) {
        // Closing — mark everything currently shown as seen.
        const updated = new Set(seenKeys);
        items.forEach((item) => updated.add(item.key));
        setSeenKeys(updated);
        saveSeenKeys(updated);
      }
      return next;
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="الإشعارات"
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft text-ink transition-colors hover:border-ink"
      >
        <FiBell aria-hidden="true" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -end-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-border-soft bg-white shadow-card-hover">
          <div className="border-b border-border-soft px-4 py-3">
            <span className="font-heading text-sm font-bold text-ink">الإشعارات</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-soft">
                لا توجد تنبيهات حاليًا.
              </p>
            ) : (
              <ul className="divide-y divide-border-soft">
                {items.map((item) => (
                  <li key={item.key} className="flex items-start gap-2.5 px-4 py-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        dotToneClasses[item.tone] ?? dotToneClasses.gray
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-ink">{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
