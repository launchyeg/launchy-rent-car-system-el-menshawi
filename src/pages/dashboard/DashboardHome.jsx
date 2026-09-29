import { FiCalendar, FiFileText, FiShield, FiTool } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";
import StatCard from "../../dashboard/ui/StatCard";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import { useAlerts } from "../../dashboard/alerts/AlertsProvider";
import { getBookingFlags } from "../../dashboard/lib/alerts";

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

// All the data-fetching and alert computation now lives in AlertsProvider
// (mounted in DashboardLayout, so the Topbar's NotificationBell reads the
// exact same data) — this page just renders it.
export default function DashboardHome() {
  const { cars, bookings, alerts, bookingAlerts, loading } = useAlerts();

  const currentBookingsCount = bookings.filter(
    (b) => getBookingFlags(b.pickup_date, b.return_date).isCurrentlyBooked,
  ).length;

  const insuranceAlertCount = alerts.filter((a) => a.type === "insurance").length;
  const licenseAlertCount = alerts.filter((a) => a.type === "license").length;
  const oilAlertCount = alerts.filter((a) => a.type === "oil").length;

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-xl font-bold text-ink">لوحة التحكم</h1>

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="إجمالي السيارات" value={cars.length} icon={FaCar} />
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
            {bookingAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-ink-soft">
                لا توجد حجوزات تحتاج متابعة الآن.
              </div>
            ) : (
              <DataTable
                keyField="key"
                rows={bookingAlerts}
                columns={[
                  { key: "index", header: "#", render: (_r, i) => i + 1 },
                  {
                    key: "event",
                    header: "الحالة",
                    render: (r) => <StatusBadge label={r.label} tone={r.tone} />,
                  },
                  { key: "car", header: "السيارة", render: (r) => r.car },
                  {
                    key: "customer_name",
                    header: "اسم العميل",
                    render: (r) => r.customer_name,
                  },
                  {
                    key: "customer_phone",
                    header: "رقم الهاتف",
                    render: (r) => r.customer_phone,
                  },
                ]}
              />
            )}
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
    </div>
  );
}
