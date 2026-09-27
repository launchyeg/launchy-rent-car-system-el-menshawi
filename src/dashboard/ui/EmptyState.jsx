export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
      {Icon && (
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-xl text-ink-faint">
          <Icon aria-hidden="true" />
        </span>
      )}
      <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}
