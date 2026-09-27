import { useState } from "react";
import FormField from "../../ui/FormField";
import {
  CAR_CATEGORIES,
  CAR_FUEL_TYPES,
  CAR_TRANSMISSIONS,
} from "./carConstants";

const emptyValues = {
  make: "",
  model: "",
  year: "",
  category: "sedan",
  transmission: "automatic",
  fuel_type: "petrol",
  seats: 5,
  bags: 2,
  notes: "",
};

function toFormValues(car) {
  if (!car) return emptyValues;
  return {
    make: car.make ?? "",
    model: car.model ?? "",
    year: car.year ?? "",
    category: car.category ?? "sedan",
    transmission: car.transmission ?? "automatic",
    fuel_type: car.fuel_type ?? "petrol",
    seats: car.seats ?? 5,
    bags: car.bags ?? 2,
    notes: car.notes ?? "",
  };
}

// Turns form strings back into the types the DB expects — empty optional
// fields become null rather than an empty string or NaN.
function toPayload(values) {
  const toIntOrNull = (value) => (value === "" ? null : parseInt(value, 10));

  return {
    make: values.make.trim() || null,
    model: values.model.trim(),
    year: toIntOrNull(values.year),
    category: values.category,
    transmission: values.transmission,
    fuel_type: values.fuel_type,
    seats: toIntOrNull(values.seats) ?? 5,
    bags: toIntOrNull(values.bags) ?? 2,
    notes: values.notes.trim() || null,
  };
}

// Rendered fresh for each open (CarsPage keys it by car?.id ?? "new"), so
// local state below only ever needs to be initialized once per mount.
export default function CarForm({ car, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(() => toFormValues(car));

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(values));
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="الماركة">
          <input
            type="text"
            value={values.make}
            onChange={handleChange("make")}
            placeholder="مثال: هيونداي"
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="الموديل" required>
          <input
            type="text"
            required
            value={values.model}
            onChange={handleChange("model")}
            placeholder="مثال: توسان"
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="سنة الصنع">
          <input
            type="number"
            min="1990"
            max="2100"
            placeholder="مثال: 2026"
            value={values.year}
            onChange={handleChange("year")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="التصنيف" required>
          <select
            required
            value={values.category}
            onChange={handleChange("category")}
            className="w-full bg-transparent text-sm text-ink outline-none"
          >
            {CAR_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="الانتقال" required>
          <select
            required
            value={values.transmission}
            onChange={handleChange("transmission")}
            className="w-full bg-transparent text-sm text-ink outline-none"
          >
            {CAR_TRANSMISSIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="نوع الوقود" required>
          <select
            required
            value={values.fuel_type}
            onChange={handleChange("fuel_type")}
            className="w-full bg-transparent text-sm text-ink outline-none"
          >
            {CAR_FUEL_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="عدد الركاب" required>
          <input
            type="number"
            required
            min="1"
            value={values.seats}
            onChange={handleChange("seats")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="عدد الحقائب" required>
          <input
            type="number"
            required
            min="0"
            value={values.bags}
            onChange={handleChange("bags")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          ملاحظات
        </span>
        <span className="flex items-start gap-2 rounded-lg border border-border px-3.5 py-2.5 transition-colors focus-within:border-primary">
          <textarea
            rows={3}
            value={values.notes}
            onChange={handleChange("notes")}
            className="w-full resize-none text-sm outline-none placeholder:text-ink-faint"
          />
        </span>
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="btn btn-outline disabled:opacity-60"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-60"
        >
          {submitting ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </div>
    </form>
  );
}
