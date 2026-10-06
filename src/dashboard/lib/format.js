// Shared display formatting for the dashboard. Supabase's `date` columns
// come back as "YYYY-MM-DD" strings — this renders them as dd/mm/yy for
// every feature table (Insurance, Licenses, Maintenance, Bookings).
export function formatDate(dateString) {
  if (!dateString) return "—";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year.slice(-2)}`;
}

// Amounts in EGP use Western digits with thousands separators (e.g.
// 4,500), the convention in Egyptian contracts and invoices.
export function formatAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
