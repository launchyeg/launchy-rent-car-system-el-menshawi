// Shared display formatting for the dashboard. Supabase's `date` columns
// come back as "YYYY-MM-DD" strings — this renders them as dd/mm/yy for
// every feature table (Insurance, Licenses, Maintenance, Bookings).
export function formatDate(dateString) {
  if (!dateString) return "—";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year.slice(-2)}`;
}
