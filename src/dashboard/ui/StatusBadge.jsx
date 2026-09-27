// Presentational only — the alert level → tone mapping lives in
// src/dashboard/lib/alerts.js (getInsuranceStatus/getLicenseStatus/
// getOilStatus already return a `tone`); feature pages map their own
// fields (e.g. cars.status) to a tone locally.
const toneClasses = {
  gray: "bg-surface-alt-2 text-ink-soft",
  green: "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-50 text-amber-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  primary: "bg-tag-bg text-primary",
};

export default function StatusBadge({ label, tone = "gray" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
        toneClasses[tone] ?? toneClasses.gray
      }`}
    >
      {label}
    </span>
  );
}
