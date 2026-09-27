import { useState } from "react";
import FormField from "../../ui/FormField";

const emptyValues = {
  car_id: "",
  customer_name: "",
  customer_phone: "",
  pickup_date: "",
  return_date: "",
  notes: "",
};

function toFormValues(record) {
  if (!record) return emptyValues;
  return {
    car_id: record.car_id ?? "",
    customer_name: record.customer_name ?? "",
    customer_phone: record.customer_phone ?? "",
    pickup_date: record.pickup_date ?? "",
    return_date: record.return_date ?? "",
    notes: record.notes ?? "",
  };
}

function toPayload(values) {
  return {
    car_id: values.car_id,
    customer_name: values.customer_name.trim(),
    customer_phone: values.customer_phone.trim(),
    pickup_date: values.pickup_date,
    return_date: values.return_date,
    notes: values.notes.trim() || null,
  };
}

function carLabel(car) {
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

// `cars` is the fleet list, passed down from BookingsPage. Rendered fresh
// per open (keyed by record?.id ?? "new"), so local state below only
// needs to initialize once per mount.
export default function BookingForm({
  record,
  cars,
  onSubmit,
  onCancel,
  submitting,
}) {
  const [values, setValues] = useState(() => toFormValues(record));
  const [error, setError] = useState("");

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (values.return_date < values.pickup_date) {
      setError("تاريخ الاستلام لا يمكن أن يكون قبل تاريخ التسليم.");
      return;
    }
    setError("");
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
        <FormField label="اسم العميل" required>
          <input
            type="text"
            required
            value={values.customer_name}
            placeholder="مثال: احمد محمد "
            onChange={handleChange("customer_name")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="رقم هاتف العميل" required>
          <input
            type="tel"
            required
            value={values.customer_phone}
            onChange={handleChange("customer_phone")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="تاريخ التسليم" required>
          <input
            type="date"
            required
            value={values.pickup_date}
            onChange={handleChange("pickup_date")}
            className="w-full text-sm outline-none placeholder:text-ink-faint"
          />
        </FormField>
        <FormField label="تاريخ الاستلام" required>
          <input
            type="date"
            required
            value={values.return_date}
            onChange={handleChange("return_date")}
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

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

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
