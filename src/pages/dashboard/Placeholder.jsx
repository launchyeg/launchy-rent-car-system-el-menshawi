// Temporary stand-in for each dashboard section until its real page is
// built (Cars, Insurance, Licenses, Maintenance, Bookings, Home). Only
// used to make the routing + auth flow testable before that work lands.
export default function Placeholder({ title }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-card">
      <h1 className="font-heading text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        هذا القسم قيد الإنشاء — سيتم بناؤه في خطوة لاحقة.
      </p>
    </div>
  );
}
