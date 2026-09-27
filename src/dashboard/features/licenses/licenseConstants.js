// License renewals in Egypt run in fixed 1/2/3-year terms — so instead of
// picking an arbitrary expiry date, the owner picks a term and the expiry
// date is computed from renewal_date + duration_years (see LicenseForm.jsx).
export const LICENSE_DURATIONS = [
  { value: "1", label: "سنة واحدة" },
  { value: "2", label: "سنتان" },
  { value: "3", label: "ثلاث سنوات" },
];

export function durationLabel(value) {
  return (
    LICENSE_DURATIONS.find((option) => option.value === String(value))?.label ??
    `${value} سنة`
  );
}
