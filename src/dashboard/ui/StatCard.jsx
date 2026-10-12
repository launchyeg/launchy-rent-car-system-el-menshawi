// Compact on phones (two cards per row on DashboardHome), roomier from `sm` up.
export default function StatCard({ label, value, icon: Icon, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-3.5 shadow-card sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
        <span className="text-xs leading-snug font-semibold text-ink-soft sm:text-sm">
          {label}
        </span>
        {Icon && (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tag-bg text-sm text-primary sm:h-9 sm:w-9 sm:text-base">
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-1.5 font-heading text-xl font-bold text-ink sm:mt-3 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
