import { useState } from "react";
import { FiCalendar, FiFileText, FiPlus, FiShield, FiTool } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";
import StatCard from "../../dashboard/ui/StatCard";
import Modal from "../../dashboard/ui/Modal";
import { useToast } from "../../dashboard/ui/Toast";
import BookingAgenda from "../../dashboard/features/bookings/BookingAgenda";
import BookingForm from "../../dashboard/features/bookings/BookingForm";
import { createBooking } from "../../dashboard/features/bookings/bookingsApi";
import { useAlerts } from "../../dashboard/alerts/AlertsProvider";
import { getBookingAlert, getBookingFlags } from "../../dashboard/lib/alerts";

const toneBorderClasses = {
  red: "border-red-400",
  orange: "border-orange-400",
  yellow: "border-amber-400",
  gray: "border-border",
  primary: "border-primary",
};

const alertIcons = {
  insurance: FiShield,
  license: FiFileText,
  oil: FiTool,
};

// All the data-fetching and alert computation lives in AlertsProvider
// (mounted in DashboardLayout) — this page just renders it.
export default function DashboardHome() {
  const { cars, bookings, alerts, loading, refresh } = useAlerts();
  const { showToast } = useToast();
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick booking straight from the home page — same form and API as
  // BookingsPage; the alerts reload afterwards so the new booking shows up.
  const handleCreateBooking = async (payload) => {
    setSubmitting(true);
    try {
      await createBooking(payload);
      showToast("تمت إضافة الحجز");
      setBookingFormOpen(false);
      await refresh();
    } catch (error) {
      showToast(error.message ?? "حدث خطأ أثناء الحفظ", { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Same day-by-day view as BookingsPage, limited to bookings inside the
  // alert window: a pickup alert becomes a طالعة event on pickup_date, a
  // return alert a داخلة event on return_date.
  const bookingEvents = bookings
    .map((record) => {
      const alert = getBookingAlert(record.pickup_date, record.return_date);
      if (!alert) return null;
      const isOut = alert.type === "pickup";
      return {
        type: isOut ? "out" : "in",
        date: isOut ? record.pickup_date : record.return_date,
        record,
        status: { label: alert.label, tone: alert.tone },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "in" ? -1 : 1));
  const statusByBooking = new Map(bookingEvents.map((event) => [event.record.id, event.status]));

  const currentBookingsCount = bookings.filter(
    (b) => getBookingFlags(b.pickup_date, b.return_date).isCurrentlyBooked,
  ).length;

  const insuranceAlertCount = alerts.filter((a) => a.type === "insurance").length;
  const licenseAlertCount = alerts.filter((a) => a.type === "license").length;
  const oilAlertCount = alerts.filter((a) => a.type === "oil").length;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">لوحة التحكم</h1>
        <button
          type="button"
          onClick={() => setBookingFormOpen(true)}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة حجز
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            <StatCard
              label="إجمالي السيارات"
              value={cars.length}
              icon={FaCar}
              className="col-span-2 sm:col-span-1"
            />
            <StatCard
              label="الحجوزات الحالية"
              value={currentBookingsCount}
              icon={FiCalendar}
            />
            <StatCard
              label="تأمينات تحتاج متابعة"
              value={insuranceAlertCount}
              icon={FiShield}
            />
            <StatCard
              label="رخص تحتاج متابعة"
              value={licenseAlertCount}
              icon={FiFileText}
            />
            <StatCard
              label="تغييرات زيت مستحقة"
              value={oilAlertCount}
              icon={FiTool}
            />
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-bold text-ink">
              تنبيهات الحجوزات
            </h2>
            <BookingAgenda
              events={bookingEvents}
              getStatus={(record) => statusByBooking.get(record.id)}
              emptyMessage="لا توجد حجوزات تحتاج متابعة الآن."
            />
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-bold text-ink">
              تنبيهات مهمة
            </h2>
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-ink-soft">
                لا توجد تنبيهات حاليًا — كل شيء على ما يرام.
              </div>
            ) : (
              <div className="grid gap-2.5">
                {alerts.map((alert) => {
                  const Icon = alertIcons[alert.type];
                  return (
                    <div
                      key={alert.key}
                      className={`flex items-center gap-3 rounded-xl border-s-4 bg-white px-4 py-3 shadow-card ${
                        toneBorderClasses[alert.tone] ?? toneBorderClasses.gray
                      }`}
                    >
                      <Icon className="shrink-0 text-ink-faint" aria-hidden="true" />
                      <span className="text-sm font-semibold text-ink">
                        {alert.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={bookingFormOpen}
        onClose={() => setBookingFormOpen(false)}
        title="إضافة حجز"
      >
        <BookingForm
          key={bookingFormOpen ? "open" : "closed"}
          record={null}
          cars={cars}
          onSubmit={handleCreateBooking}
          onCancel={() => setBookingFormOpen(false)}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}
