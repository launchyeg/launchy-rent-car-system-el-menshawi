export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        {Icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tag-bg text-primary">
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
