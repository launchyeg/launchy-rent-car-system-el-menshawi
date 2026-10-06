// The one place a car's display name is built. Every selector, table,
// dialog, alert and timeline row imports this, so the format can't drift.
// Format: "make model year - owner name"; no dash when there's no owner.
// The plate is deliberately not part of the label (it has its own column
// in the cars table and its own row in booking details).
export function carLabel(car) {
  if (!car) return "—";
  const name = [car.make, car.model, car.year].filter(Boolean).join(" ");
  return car.owner_name ? `${name} - ${car.owner_name}` : name;
}
