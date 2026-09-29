import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listCars } from "../features/cars/carsApi";
import { listInsuranceRecords } from "../features/insurance/insuranceApi";
import { listLicenseRenewals } from "../features/licenses/licensesApi";
import { listOilChanges } from "../features/maintenance/maintenanceApi";
import { listBookings } from "../features/bookings/bookingsApi";
import {
  getBookingAlert,
  getInsuranceStatus,
  getLicenseStatus,
  getOilStatus,
} from "../lib/alerts";
import { useToast } from "../ui/Toast";

const AlertsContext = createContext(undefined);

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

// Keeps, per car, only the one record whose keyFn value is highest — the
// "current" insurance/license/oil-change record for that car.
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

function rankFor(level) {
  if (level === "expired" || level === "overdue") return 0;
  if (level === "due") return 1;
  return 2; // approaching
}

// Fetches and computes every dashboard alert exactly once per refresh,
// shared by DashboardHome and the Topbar's NotificationBell (and anything
// else that needs it later) — instead of each consumer re-fetching all
// five tables independently on every page.
export function AlertsProvider({ children }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [bookingAlerts, setBookingAlerts] = useState([]);

  const refresh = useCallback(async () => {
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

      const latestInsurance = latestPerCarBy(insuranceData, (r) => r.expiry_date);
      const latestLicenses = latestPerCarBy(licenseData, (r) => r.expiry_date);
      const latestOil = latestPerCarBy(oilData, (r) => r.odometer_km);

      const nextAlerts = [];
      for (const car of carsData) {
        const insurance = latestInsurance.get(car.id);
        if (insurance) {
          const status = getInsuranceStatus(insurance.expiry_date);
          if (status.level !== "ok") {
            nextAlerts.push({
              key: `insurance:${car.id}`,
              type: "insurance",
              rank: rankFor(status.level),
              tone: status.tone,
              text: `التأمين — ${carLabel(car)} — ${status.label}`,
            });
          }
        }

        const license = latestLicenses.get(car.id);
        if (license) {
          const status = getLicenseStatus(license.expiry_date);
          if (status.level !== "ok") {
            nextAlerts.push({
              key: `license:${car.id}`,
              type: "license",
              rank: rankFor(status.level),
              tone: status.tone,
              text: `رخصة السيارة — ${carLabel(car)} — ${status.label}`,
            });
          }
        }

        const oil = latestOil.get(car.id);
        if (oil) {
          const status = getOilStatus(oil.odometer_km, oil.next_change_odometer_km);
          if (status.level !== "ok" && status.level !== "none") {
            nextAlerts.push({
              key: `oil:${car.id}`,
              type: "oil",
              rank: rankFor(status.level),
              tone: status.tone,
              text: `تغيير الزيت — ${carLabel(car)} — ${status.label}`,
            });
          }
        }
      }
      nextAlerts.sort((a, b) => a.rank - b.rank);

      const nextBookingAlerts = [];
      for (const booking of bookingsData) {
        const alert = getBookingAlert(booking.pickup_date, booking.return_date);
        if (!alert) continue;
        nextBookingAlerts.push({
          key: `booking:${booking.id}:${alert.type}`,
          tone: alert.tone,
          label: alert.label,
          car: carLabel(booking.cars),
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone,
        });
      }

      setCars(carsData);
      setBookings(bookingsData);
      setAlerts(nextAlerts);
      setBookingAlerts(nextBookingAlerts);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات التنبيهات", {
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = { cars, bookings, alerts, bookingAlerts, loading, refresh };

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return context;
}
