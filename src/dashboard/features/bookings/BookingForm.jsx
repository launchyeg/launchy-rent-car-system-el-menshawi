import { useEffect, useState } from "react";
import FormField from "../../ui/FormField";
import { formatAmount } from "../../lib/format";
import { listBookedCarIds } from "./bookingsApi";
import { carLabel } from "../../lib/carLabel";
import {
  FUEL_LEVELS,
  addDays,
  rentalDays,
  totalAmount,
} from "./bookingUtils";

const OVERLAP_MESSAGE = "هذه السيارة محجوزة في هذه الفترة";
const NO_BOOKED_CARS = new Set();

const inputClass = "w-full text-sm outline-none placeholder:text-ink-faint";

const emptyValues = {
  car_id: "",
  pickup_date: "",
  return_date: "",
  customer_name: "",
  customer_id_number: "",
  customer_phone: "",
  customer_address: "",
  customer_license_number: "",
  daily_rate: "",
  deposit_amount: "0",
  odometer_out: "",
  fuel_level_out: "",
  notes: "",
};

// `defaults` pre-fills a new booking (e.g. the timeline passes the
// clicked car and day). Editing uses `record` instead.
function toFormValues(record, defaults) {
  if (!record) return { ...emptyValues, ...defaults };
  return {
    car_id: record.car_id ?? "",
    pickup_date: record.pickup_date ?? "",
    return_date: record.return_date ?? "",
    customer_name: record.customer_name ?? "",
    customer_id_number: record.customer_id_number ?? "",
    customer_phone: record.customer_phone ?? "",
    customer_address: record.customer_address ?? "",
    customer_license_number: record.customer_license_number ?? "",
    daily_rate: record.daily_rate ?? "",
    deposit_amount: record.deposit_amount ?? "0",
    odometer_out: record.odometer_out ?? "",
    fuel_level_out: record.fuel_level_out ?? "",
    notes: record.notes ?? "",
  };
}

// Empty optional fields become null; ID number is kept as text (leading
// zeros, passport letters).
function toPayload(values) {
  return {
    car_id: values.car_id,
    pickup_date: values.pickup_date,
    return_date: values.return_date,
    customer_name: values.customer_name.trim(),
    customer_id_number: values.customer_id_number.trim(),
    customer_phone: values.customer_phone.trim(),
    customer_address: values.customer_address.trim() || null,
    customer_license_number: values.customer_license_number.trim() || null,
    daily_rate: Number(values.daily_rate),
    deposit_amount:
      values.deposit_amount === "" ? 0 : Number(values.deposit_amount),
    odometer_out:
      values.odometer_out === "" ? null : parseInt(values.odometer_out, 10),
    fuel_level_out: values.fuel_level_out || null,
    notes: values.notes.trim() || null,
  };
}

// Light checks, no strict Egyptian-format rule (foreign customers rent
// too). Name and phone are only checked when new or changed, so a legacy
// booking saved before these rules can still be edited without touching
// them; the ID number is required on every save (it's new for all rows).
const PHONE_CHARS = /^[0-9٠-٩+\-\s]+$/;

function validateFields(values, record) {
  const errors = {};
  const changed = (field) =>
    !record || values[field].trim() !== (record[field] ?? "").trim();

  if (changed("customer_name") && values.customer_name.trim().length < 3) {
    errors.customer_name = "اسم العميل يجب ألا يقل عن 3 أحرف";
  }
  if (changed("customer_phone")) {
    const phone = values.customer_phone.trim();
    if (!PHONE_CHARS.test(phone)) {
      errors.customer_phone = "رقم الهاتف يقبل أرقامًا ومسافات و + و - فقط";
    } else if (phone.replace(/[^0-9٠-٩]/g, "").length < 8) {
      errors.customer_phone = "رقم الهاتف يجب ألا يقل عن 8 أرقام";
    }
  }
  if (values.customer_id_number.trim().length < 5) {
    errors.customer_id_number = "رقم البطاقة أو جواز السفر يجب ألا يقل عن 5 أحرف";
  }
  return errors;
}

function Section({ title, children }) {
  return (
    <fieldset className="grid gap-5 rounded-xl border border-border-soft p-4">
      <legend className="px-2 text-sm font-bold text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

// `cars` is the fleet list, passed down from BookingsPage. Rendered fresh
// per open (keyed by record?.id ?? "new"), so local state below only
// needs to initialize once per mount.
export default function BookingForm({
  record,
  defaults,
  cars,
  onSubmit,
  onCancel,
  submitting,
}) {
  const [values, setValues] = useState(() => toFormValues(record, defaults));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [availability, setAvailability] = useState({
    key: null,
    ids: NO_BOOKED_CARS,
  });

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const datesValid =
    Boolean(values.pickup_date) &&
    Boolean(values.return_date) &&
    values.return_date > values.pickup_date;

  // Which cars are already booked for the chosen dates. Only a hint for
  // the owner — the database constraint is the real enforcement. Results
  // are keyed by the dates they were fetched for, so a stale or missing
  // answer is simply ignored instead of needing a state reset.
  const availabilityKey = datesValid
    ? `${values.pickup_date}|${values.return_date}`
    : null;

  useEffect(() => {
    if (!availabilityKey) return;
    const [pickup, dropoff] = availabilityKey.split("|");
    let cancelled = false;
    listBookedCarIds(pickup, dropoff, record?.id)
      .then((ids) => {
        if (!cancelled) setAvailability({ key: availabilityKey, ids });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [availabilityKey, record?.id]);

  const bookedCarIds =
    availability.key === availabilityKey ? availability.ids : NO_BOOKED_CARS;
  const carUnavailable =
    Boolean(values.car_id) && bookedCarIds.has(values.car_id);

  const days = rentalDays(values.pickup_date, values.return_date);
  const total = totalAmount(
    values.pickup_date,
    values.return_date,
    values.daily_rate,
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = validateFields(values, record);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("راجع الحقول المحددة بالأحمر");
      return;
    }
    if (!datesValid) {
      setError("تاريخ الاستلام يجب أن يكون بعد تاريخ التسليم");
      return;
    }
    if (carUnavailable) {
      setError(OVERLAP_MESSAGE);
      return;
    }
    setError("");
    onSubmit(toPayload(values));
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Section title="السيارة والتواريخ">
        <FormField
          label="السيارة"
          required
          error={carUnavailable ? OVERLAP_MESSAGE : ""}
        >
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
                {bookedCarIds.has(car.id) ? " (محجوزة في هذه الفترة)" : ""}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="تاريخ التسليم" required>
            <input
              type="date"
              required
              value={values.pickup_date}
              onChange={handleChange("pickup_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label="تاريخ الاستلام" required>
            <input
              type="date"
              required
              min={
                values.pickup_date ? addDays(values.pickup_date, 1) : undefined
              }
              value={values.return_date}
              onChange={handleChange("return_date")}
              className={inputClass}
            />
          </FormField>
        </div>
      </Section>

      <Section title="بيانات العميل">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="اسم العميل" required error={fieldErrors.customer_name}>
            <input
              type="text"
              required
              value={values.customer_name}
              placeholder="مثال: أحمد محمد"
              onChange={handleChange("customer_name")}
              className={inputClass}
            />
          </FormField>
          <FormField
            label="رقم البطاقة أو جواز السفر"
            required
            error={fieldErrors.customer_id_number}
          >
            <input
              type="text"
              required
              value={values.customer_id_number}
              onChange={handleChange("customer_id_number")}
              className={inputClass}
            />
          </FormField>
          <FormField label="رقم هاتف العميل" required error={fieldErrors.customer_phone}>
            <input
              type="tel"
              required
              value={values.customer_phone}
              onChange={handleChange("customer_phone")}
              className={inputClass}
            />
          </FormField>
          <FormField label="رقم رخصة القيادة">
            <input
              type="text"
              value={values.customer_license_number}
              onChange={handleChange("customer_license_number")}
              className={inputClass}
            />
          </FormField>
        </div>
        <FormField label="العنوان">
          <input
            type="text"
            value={values.customer_address}
            onChange={handleChange("customer_address")}
            className={inputClass}
          />
        </FormField>
      </Section>

      <Section title="السعر">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="الإيجار اليومي (جنيه مصري)" required>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={values.daily_rate}
              onChange={handleChange("daily_rate")}
              className={inputClass}
            />
          </FormField>
          <FormField label="مبلغ التأمين (جنيه مصري)">
            <input
              type="number"
              min="0"
              step="any"
              value={values.deposit_amount}
              onChange={handleChange("deposit_amount")}
              className={inputClass}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-alt px-4 py-3 text-sm">
          <p>
            <span className="text-ink-soft">عدد الأيام: </span>
            <span className="font-bold text-ink">{days}</span>
          </p>
          <p>
            <span className="text-ink-soft">الإجمالي: </span>
            <span className="font-bold text-ink">
              {formatAmount(total)} جنيه مصري
            </span>
          </p>
        </div>
      </Section>

      <Section title="حالة السيارة عند التسليم">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="قراءة العداد (كم)">
            <input
              type="number"
              min="0"
              step="1"
              value={values.odometer_out}
              onChange={handleChange("odometer_out")}
              className={inputClass}
            />
          </FormField>
          <FormField label="مستوى الوقود">
            <select
              value={values.fuel_level_out}
              onChange={handleChange("fuel_level_out")}
              className="w-full bg-transparent text-sm text-ink outline-none"
            >
              <option value="">غير محدد</option>
              {FUEL_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </Section>

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
