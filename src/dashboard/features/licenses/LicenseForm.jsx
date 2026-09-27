import { useState } from "react";
import FormField from "../../ui/FormField";
import { LICENSE_DURATIONS } from "./licenseConstants";

const emptyValues = {
  car_id: "",
  renewal_date: "",
  duration_years: "1",
  cost: "",
  notes: "",
};

function toFormValues(record) {
  if (!record) return emptyValues;
  return {
    car_id: record.car_id ?? "",
    renewal_date: record.renewal_date ?? "",
    duration_years: record.duration_years ? String(record.duration_years) : "1",
    cost: record.cost ?? "",
    notes: record.notes ?? "",
  };
}

// Local-date arithmetic (no UTC conversion, unlike Date#toISOString) so a
// renewal near midnight never silently shifts a day in either direction.
function addYears(dateString, years) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setFullYear(date.getFullYear() + years);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toPayload(values) {
  const durationYears = Number(values.duration_years);
  return {
    car_id: values.car_id,
    renewal_date: values.renewal_date,
    duration_years: durationYears,
    expiry_date: addYears(values.renewal_date, durationYears),
    cost: values.cost === "" ? null : Number(values.cost),
    notes: values.notes.trim() || null,
  };
}

function carLabel(car) {
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

// `cars` is the fleet list, passed down from LicensesPage. Rendered fresh
// per open (keyed by record?.id ?? "new"), so local state below only
// needs to initialize once per mount.
export default function LicenseForm({
  record,
  cars,
  onSubmit,
  onCancel,
  submitting,
}) {
  const [values, setValues] = useState(() => toFormValues(record));

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(values));
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <FormField label="السيارة" required>
        <select
          required
          value={values.car_id}
          onChange={handleChange("car_id")}
          className="w-full bg-transparent text-sm text-ink outline-none"
        >
          <option value="" disabled>
            اختر السيارة
          </option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {carLabel(car)}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="تاريخ التجديد" required>
          <input
            type="date"
            required
            value={values.renewal_date}
            onChange={handleChange("renewal_date")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="المدة" required>
          <select
            required
            value={values.duration_years}
            onChange={handleChange("duration_years")}
            className="w-full bg-transparent text-sm text-ink outline-none"
          >
            {LICENSE_DURATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="التكلفة (ج.م)" required>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={values.cost}
          placeholder="اختياري"
          onChange={handleChange("cost")}
          className="w-full text-sm outline-none placeholder:text-ink-faint"
        />
      </FormField>

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
