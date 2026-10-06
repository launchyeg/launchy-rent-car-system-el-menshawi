import StatusBadge from "../../ui/StatusBadge";
import BookingActions from "./BookingActions";
import { formatAmount, formatDate } from "../../lib/format";
import { getBookingDisplayStatus } from "../../lib/alerts";
import { carLabel } from "../../lib/carLabel";
import { fuelLevelLabel, rentalDays, totalAmount } from "./bookingUtils";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 font-semibold text-ink-faint">{label}</dt>
      <dd className="text-end text-ink">{children || "—"}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="grid gap-2.5 rounded-xl border border-border-soft p-4">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      <dl className="grid gap-2.5">{children}</dl>
    </section>
  );
}

// Read-only view of one booking, opened from the list (and, in step 6,
// from the timeline). Shows every stored field plus the computed days and
// total, with the same action set as the list rows.
export default function BookingDetails({ booking, handlers, busy }) {
  const status = getBookingDisplayStatus(booking);
  const hasRate = booking.daily_rate != null;
  const days = rentalDays(booking.pickup_date, booking.return_date);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-heading text-base font-bold text-ink">
          عقد رقم {booking.contract_number}
        </p>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <Section title="السيارة والتواريخ">
        <Row label="السيارة">{carLabel(booking.cars)}</Row>
        <Row label="رقم اللوحة">{booking.cars?.plate_number}</Row>
        <Row label="تاريخ التسليم">{formatDate(booking.pickup_date)}</Row>
        <Row label="تاريخ الاستلام">{formatDate(booking.return_date)}</Row>
        <Row label="عدد الأيام">{days}</Row>
        {booking.returned_on && (
          <Row label="تم الاستلام بتاريخ">{formatDate(booking.returned_on)}</Row>
        )}
        {booking.cancelled_at && (
          <Row label="تم الإلغاء بتاريخ">
            {formatDate(booking.cancelled_at.slice(0, 10))}
          </Row>
        )}
      </Section>

      <Section title="بيانات العميل">
        <Row label="الاسم">{booking.customer_name}</Row>
        <Row label="رقم البطاقة أو جواز السفر">{booking.customer_id_number}</Row>
        <Row label="رقم الهاتف">
          <span dir="ltr">{booking.customer_phone}</span>
        </Row>
        <Row label="رقم رخصة القيادة">{booking.customer_license_number}</Row>
        <Row label="العنوان">{booking.customer_address}</Row>
      </Section>

      <Section title="السعر">
        <Row label="الإيجار اليومي">
          {hasRate && `${formatAmount(booking.daily_rate)} جنيه مصري`}
        </Row>
        <Row label="الإجمالي">
          {hasRate &&
            `${formatAmount(
              totalAmount(booking.pickup_date, booking.return_date, booking.daily_rate),
            )} جنيه مصري`}
        </Row>
        <Row label="مبلغ التأمين">{`${formatAmount(booking.deposit_amount ?? 0)} جنيه مصري`}</Row>
      </Section>

      <Section title="حالة السيارة عند التسليم">
        <Row label="قراءة العداد">
          {booking.odometer_out != null && `${formatAmount(booking.odometer_out)} كم`}
        </Row>
        <Row label="مستوى الوقود">{fuelLevelLabel(booking.fuel_level_out)}</Row>
      </Section>

      {booking.notes && (
        <Section title="ملاحظات">
          <p className="whitespace-pre-line text-sm text-ink">{booking.notes}</p>
        </Section>
      )}

      <div className="border-t border-border-soft pt-4">
        <BookingActions
          booking={booking}
          handlers={{ ...handlers, onView: undefined }}
          variant="buttons"
          busy={busy}
        />
      </div>
    </div>
  );
}
