// Fixed option sets for `cars` (must match the check constraints in
// supabase/schema.sql). Options are in English by design — these are
// industry-standard spec terms always written in Latin script in the
// rental car trade, even inside an otherwise-Arabic UI.
export const CAR_CATEGORIES = [
  { value: "luxury", label: "Luxury" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "economy", label: "Economy" },
];

export const CAR_TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

export const CAR_FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
];

function labelFrom(list, value) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function categoryLabel(value) {
  return labelFrom(CAR_CATEGORIES, value);
}

export function transmissionLabel(value) {
  return labelFrom(CAR_TRANSMISSIONS, value);
}

export function fuelTypeLabel(value) {
  return labelFrom(CAR_FUEL_TYPES, value);
}
