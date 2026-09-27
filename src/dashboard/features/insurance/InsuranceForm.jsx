import { useState } from "react";
import FormField from "../../ui/FormField";

const emptyValues = {
  car_id: "",
  provider: "",
  policy_number: "",
  price: "",
  payment_date: "",
  start_date: "",
  expiry_date: "",
  notes: "",
};

function toFormValues(record) {
  if (!record) return emptyValues;
  return {
    car_id: record.car_id ?? "",
    provider: record.provider ?? "",
    policy_number: record.policy_number ?? "",
    price: record.price ?? "",
    payment_date: record.payment_date ?? "",
    start_date: record.start_date ?? "",
    expiry_date: record.expiry_date ?? "",
    notes: record.notes ?? "",
  };
}

function toPayload(values) {
  return {
    car_id: values.car_id,
    provider: values.provider.trim() || null,
    policy_number: values.policy_number.trim() || null,
    price: values.price === "" ? null : Number(values.price),
    payment_date: values.payment_date || null,
    start_date: values.start_date,
    expiry_date: values.expiry_date,
    notes: values.notes.trim() || null,
  };
}

function carLabel(car) {
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

// `cars` is the fleet list, passed down from InsurancePage so the car
// picker doesn't need its own fetch. Rendered fresh per open (keyed by
// record?.id ?? "new"), so local state only needs to initialize once.
export default function InsuranceForm({ record, cars, onSubmit, onCancel, submitting }) {
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
        <FormField label="شركة التأمين">
          <input
            type="text"
            value={values.provider}
            onChange={handleChange("provider")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="رقم البوليصة">
          <input
            type="text"
            value={values.policy_number}
            onChange={handleChange("policy_number")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="قيمة التأمين (ج.م)" required>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={values.price}
            onChange={handleChange("price")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="تاريخ الدفع">
          <input
            type="date"
            value={values.payment_date}
            onChange={handleChange("payment_date")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="تاريخ البداية" required>
          <input
            type="date"
            required
            value={values.start_date}
            onChange={handleChange("start_date")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="تاريخ الانتهاء" required>
          <input
            type="date"
            required
            value={values.expiry_date}
            onChange={handleChange("expiry_date")}
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
