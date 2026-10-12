// The one place a car's display name is built. Every selector, table,
// dialog and alert imports this, so the format can't drift.
// Format: "make model year - owner name"; no dash when there's no owner.
export function carLabel(car) {
  if (!car) return "—";
  const name = [car.make, car.model, car.year].filter(Boolean).join(" ");
  return car.owner_name ? `${name} - ${car.owner_name}` : name;
}
