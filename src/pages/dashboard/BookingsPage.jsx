import { useCallback, useEffect, useState } from "react";
import { FiCalendar, FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import BookingForm from "../../dashboard/features/bookings/BookingForm";
import {
  createBooking,
  deleteBooking,
  listBookings,
  updateBooking,
} from "../../dashboard/features/bookings/bookingsApi";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { daysUntil, getBookingFlags } from "../../dashboard/lib/alerts";
import { formatDate } from "../../dashboard/lib/format";

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

function dayCount(days) {
  return `${days} ${days === 1 ? "يوم" : "أيام"}`;
}

// Bookings aren't an expiry concept, so this maps the booking-date flags
// from alerts.js to a single display badge, most-urgent first.
//
// تسليم (delivery) = handing the car OVER TO the client = pickup_date.
// استلام (receipt) = getting the car BACK FROM the client = return_date.
//
// - Before pickup: always shows days remaining until تسليم (delivery).
// - Once delivered (today is between pickup and return): stays a plain
//   "محجوزة حاليًا" until 3 days before استلام (receipt), then switches to
//   a day-count for that — the receipt countdown is deliberately withheld
//   until it's actually close, so every open booking doesn't show a
//   number for weeks at a time.
const RETURN_COUNTDOWN_WINDOW_DAYS = 3;

function bookingStatus(pickupDate, returnDate) {
  const { isPickupToday, isReturnToday, isCurrentlyBooked } = getBookingFlags(
    pickupDate,
    returnDate,
  );
  if (isPickupToday) return { label: "تسليم اليوم", tone: "primary" };
  if (isReturnToday) return { label: "استلام اليوم", tone: "orange" };
  if (isCurrentlyBooked) {
    const daysToReturn = daysUntil(returnDate);
    if (daysToReturn <= RETURN_COUNTDOWN_WINDOW_DAYS) {
      return {
        label: `يتبقى ${dayCount(daysToReturn)} للاستلام من العميل`,
        tone: "yellow",
      };
    }
    return { label: "محجوزة حاليًا", tone: "primary" };
  }

  const daysToPickup = daysUntil(pickupDate);
  if (daysToPickup > 0) {
    return { label: `يتبقى ${dayCount(daysToPickup)} للتسليم`, tone: "yellow" };
  }
  return { label: "منتهية", tone: "gray" };
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, carsData] = await Promise.all([
        listBookings(),
        listCars(),
      ]);
      setRecords(recordsData);
      setCars(carsData);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات الحجوزات", {
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddForm = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingRecord) {
        await updateBooking(editingRecord.id, payload);
        showToast("تم تحديث الحجز");
      } else {
        await createBooking(payload);
        showToast("تمت إضافة الحجز");
      }
      setFormOpen(false);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "حدث خطأ أثناء الحفظ", { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setDeleting(true);
    try {
      await deleteBooking(deletingRecord.id);
      showToast("تم حذف الحجز");
      setDeletingRecord(null);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "تعذّر حذف الحجز", { tone: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "index", header: "#", render: (_record, index) => index + 1 },
    { key: "car", header: "السيارة", render: (record) => carLabel(record.cars) },
    { key: "customer_name", header: "اسم العميل", render: (record) => record.customer_name },
    { key: "customer_phone", header: "رقم الهاتف", render: (record) => record.customer_phone },
    {
      key: "pickup",
      header: "تاريخ التسليم",
      render: (record) => formatDate(record.pickup_date),
    },
    {
      key: "return",
      header: "تاريخ الاستلام",
      render: (record) => formatDate(record.return_date),
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const status = bookingStatus(record.pickup_date, record.return_date);
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">الحجوزات</h1>
        <button
          type="button"
          onClick={openAddForm}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة حجز
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FiCalendar}
          title="أضف سيارة أولاً"
          description="لا يمكن تسجيل حجز قبل إضافة سيارة واحدة على الأقل في الأسطول."
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={FiCalendar}
          title="لا توجد حجوزات بعد"
          description="ابدأ بإضافة أول حجز لإحدى السيارات."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="btn btn-primary mt-2"
            >
              <FiPlus aria-hidden="true" />
              إضافة حجز
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={records}
          renderActions={(record) => (
            <>
              <button
                type="button"
                onClick={() => openEditForm(record)}
                aria-label="تعديل"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <FiEdit2 aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingRecord(record)}
                aria-label="حذف"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-red-500 hover:text-red-600"
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </>
          )}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRecord ? "تعديل الحجز" : "إضافة حجز"}
      >
        <BookingForm
          key={editingRecord?.id ?? "new"}
          record={editingRecord}
          cars={cars}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="سيتم حذف هذا الحجز نهائيًا. لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
