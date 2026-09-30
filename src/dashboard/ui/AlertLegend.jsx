const dotToneClasses = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
  gray: "bg-border",
  primary: "bg-primary",
};

// Always-visible legend explaining what each status-badge color on this
// page means — placed on each feature page with its own `items`, since
// the thresholds/labels differ per page (see src/dashboard/lib/alerts.js).
export default function AlertLegend({ title = "دليل الألوان", items }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-white shadow-card">
      <div className="px-4 py-3 text-sm font-bold text-ink">{title}</div>
      <ul className="grid gap-2.5 border-t border-border-soft px-4 py-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                dotToneClasses[item.tone] ?? dotToneClasses.gray
              }`}
              aria-hidden="true"
            />
            <span>
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="text-ink-soft"> — {item.condition}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
