// Generalizes the label+icon+input wrapper already used on the public
// site's booking form (see Booking.jsx's local Field component), adding
// inline validation error text for reuse across every dashboard form.
export default function FormField({ icon: Icon, label, required, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && " *"}
      </span>
      <span
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 transition-colors focus-within:border-primary ${
          error ? "border-red-400" : "border-border"
        }`}
      >
        {Icon && <Icon className="shrink-0 text-ink-faint" aria-hidden="true" />}
        {children}
      </span>
      {error && (
        <span className="mt-1 block text-xs font-semibold text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
