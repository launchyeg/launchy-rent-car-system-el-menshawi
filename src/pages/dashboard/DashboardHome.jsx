import { useCallback, useEffect, useState } from "react";
import { FiCalendar, FiFileText, FiShield, FiTool } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";
import StatCard from "../../dashboard/ui/StatCard";
import { useToast } from "../../dashboard/ui/Toast";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { listInsuranceRecords } from "../../dashboard/features/insurance/insuranceApi";
import { listLicenseRenewals } from "../../dashboard/features/licenses/licensesApi";
import { listOilChanges } from "../../dashboard/features/maintenance/maintenanceApi";
import { listBookings } from "../../dashboard/features/bookings/bookingsApi";
import {
  getBookingFlags,
  getInsuranceStatus,
  getLicenseStatus,
  getOilStatus,
} from "../../dashboard/lib/alerts";

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

// Keeps, per car, only the one record whose keyFn value is highest — the
// "current" insurance/license/oil-change record for that car, out of
// however many historical rows it has.
function latestPerCarBy(records, keyFn) {
  const map = new Map();
  for (const record of records) {
    const existing = map.get(record.car_id);
    if (!existing || keyFn(record) > keyFn(existing)) {
      map.set(record.car_id, record);
    }
  }
  return map;
}

// Sort order for the alerts panel: most urgent first.
function rankFor(level) {
  if (level === "expired" || level === "overdue") return 0;
  if (level === "due") return 1;
  return 2; // approaching
}

const toneBorderClasses = {
  red: "border-red-400",
  orange: "border-orange-400",
  yellow: "border-amber-400",
  gray: "border-border",
  primary: "border-primary",
};

export default function DashboardHome() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState([]);
  const [insuranceRecords, setInsuranceRecords] = useState([]);
  const [licenseRecords, setLicenseRecords] = useState([]);
  const [oilRecords, setOilRecords] = useState([]);
  const [bookings, setBookings] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [carsData, insuranceData, licenseData, oilData, bookingsData] =
        await Promise.all([
          listCars(),
          listInsuranceRecords(),
          listLicenseRenewals(),
          listOilChanges(),
          listBookings(),
        ]);
      setCars(carsData);
      setInsuranceRecords(insuranceData);
      setLicenseRecords(licenseData);
      setOilRecords(oilData);
      setBookings(bookingsData);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات لوحة التحكم", {
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestInsurance = latestPerCarBy(insuranceRecords, (r) => r.expiry_date);
  const latestLicenses = latestPerCarBy(licenseRecords, (r) => r.expiry_date);
  const latestOil = latestPerCarBy(oilRecords, (r) => r.odometer_km);

  const currentBookingsCount = bookings.filter(
    (b) => getBookingFlags(b.pickup_date, b.return_date).isCurrentlyBooked,
  ).length;

  const insuranceAlertCount = [...latestInsurance.values()].filter(
    (r) => getInsuranceStatus(r.expiry_date).level !== "ok",
  ).length;
  const licenseAlertCount = [...latestLicenses.values()].filter(
    (r) => getLicenseStatus(r.expiry_date).level !== "ok",
  ).length;
  const oilAlertCount = [...latestOil.values()].filter((r) => {
    const status = getOilStatus(r.odometer_km, r.next_change_odometer_km);
    return status.level !== "ok" && status.level !== "none";
  }).length;

  const alerts = [];

  for (const car of cars) {
    const insurance = latestInsurance.get(car.id);
    if (insurance) {
      const status = getInsuranceStatus(insurance.expiry_date);
      if (status.level !== "ok") {
        alerts.push({
          rank: rankFor(status.level),
          tone: status.tone,
          icon: FiShield,
          text: `التأمين — ${carLabel(car)} — ${status.label}`,
        });
      }
    }

    const license = latestLicenses.get(car.id);
    if (license) {
      const status = getLicenseStatus(license.expiry_date);
      if (status.level !== "ok") {
        alerts.push({
          rank: rankFor(status.level),
          tone: status.tone,
          icon: FiFileText,
          text: `رخصة السيارة — ${carLabel(car)} — ${status.label}`,
        });
      }
    }

    const oil = latestOil.get(car.id);
    if (oil) {
      const status = getOilStatus(oil.odometer_km, oil.next_change_odometer_km);
      if (status.level !== "ok" && status.level !== "none") {
        alerts.push({
          rank: rankFor(status.level),
          tone: status.tone,
          icon: FiTool,
          text: `تغيير الزيت — ${carLabel(car)} — ${status.label}`,
        });
      }
    }
  }

  for (const booking of bookings) {
    const { isPickupToday, isReturnToday } = getBookingFlags(
      booking.pickup_date,
      booking.return_date,
    );
    if (isPickupToday) {
      alerts.push({
        rank: 1,
        tone: "primary",
        icon: FiCalendar,
        text: `تسليم ${carLabel(booking.cars)} اليوم`,
      });
    }
    if (isReturnToday) {
      alerts.push({
        rank: 1,
        tone: "orange",
        icon: FiCalendar,
        text: `استلام ${carLabel(booking.cars)} من العميل اليوم`,
      });
    }
  }

  alerts.sort((a, b) => a.rank - b.rank);

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
              تنبيهات مهمة
            </h2>
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-ink-soft">
                لا توجد تنبيهات حاليًا — كل شيء على ما يرام.
              </div>
            ) : (
              <div className="grid gap-2.5">
                {alerts.map((alert, index) => {
                  const Icon = alert.icon;
                  return (
                    <div
                      key={index}
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
