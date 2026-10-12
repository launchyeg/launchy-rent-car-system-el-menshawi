import { useCallback, useEffect, useState } from "react";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCalendar,
  FiPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import AlertLegend from "../../dashboard/ui/AlertLegend";
import SearchInput from "../../dashboard/ui/SearchInput";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import BookingForm from "../../dashboard/features/bookings/BookingForm";
import BookingAgenda from "../../dashboard/features/bookings/BookingAgenda";
import {
  MOVEMENTS,
  PERIODS,
  matchesMovement,
  matchesQuery,
  movementEvents,
  periodRange,
  toISODate,
} from "../../dashboard/features/bookings/bookingSearch";
import {
  createBooking,
  deleteBooking,
  listBookings,
  updateBooking,
} from "../../dashboard/features/bookings/bookingsApi";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { getBookingAlert, getBookingFlags } from "../../dashboard/lib/alerts";

// Bookings aren't an expiry concept, so this maps to a single display
// badge, most-urgent first. Within the alert window (see getBookingAlert
// in alerts.js — today, or within a few days, on either the تسليم/pickup
// or استلام/return side) it shows that alert directly; outside the
// window it falls back to a plain non-alert state.
function bookingStatus(pickupDate, returnDate) {
  const alert = getBookingAlert(pickupDate, returnDate);
  if (alert) return { label: alert.label, tone: alert.tone };

  const { isCurrentlyBooked } = getBookingFlags(pickupDate, returnDate);
  if (isCurrentlyBooked) return { label: "محجوزة حاليًا", tone: "primary" };

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const pickup = new Date(`${pickupDate}T00:00:00`);
  if (pickup > startOfToday) return { label: "قادمة", tone: "gray" };
  return { label: "منتهية", tone: "gray" };
}

const LEGEND_ITEMS = [
  { tone: "primary", label: "تسليم اليوم", condition: "موعد تسليم السيارة للعميل هو اليوم" },
  { tone: "orange", label: "استلام اليوم", condition: "موعد استلام السيارة من العميل هو اليوم" },
  {
    tone: "yellow",
    label: "يتبقى N يوم للاستلام من العميل",
    condition: "الحجز شغّال حاليًا، وباقي 3 أيام أو أقل على الاستلام",
  },
  { tone: "primary", label: "محجوزة حاليًا", condition: "السيارة مع العميل، وباقٍ أكثر من 3 أيام على الاستلام" },
  {
    tone: "yellow",
    label: "يتبقى N يوم للتسليم",
    condition: "لم يتم التسليم بعد، وباقي 3 أيام أو أقل",
  },
  { tone: "gray", label: "قادمة", condition: "لم يتم التسليم بعد، وباقٍ أكثر من 3 أيام" },
  { tone: "gray", label: "منتهية", condition: "انتهى الحجز بالفعل (تاريخ الاستلام مضى)" },
];

const movementIcons = {
  all: FiCalendar,
  out: FiArrowUpRight,
  in: FiArrowDownLeft,
  with_customers: FiUsers,
};

function chipClass(active) {
  return `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-border bg-white text-ink-soft hover:border-primary hover:text-primary"
  }`;
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 transition-colors focus-within:border-primary">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full text-sm outline-none"
        />
      </span>
    </label>
  );
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [movement, setMovement] = useState("all");
  const [period, setPeriod] = useState("any");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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

  const resetFilters = () => {
    setSearchTerm("");
    setMovement("all");
    setPeriod("any");
    setCustomFrom("");
    setCustomTo("");
  };

  // With no period the page shows what's coming from today on — unless
  // something is typed in the search, then it searches all history too.
  // (out/in/with_customers already look forward from today on their own;
  // see matchesMovement.)
  const range = periodRange(period, { from: customFrom, to: customTo });
  const eventsRange =
    range ?? (searchTerm.trim() ? null : { from: toISODate(new Date()), to: null });
  const rangeFor = (value) => (value === "all" ? eventsRange : range);

  // The text search applies first, so each movement card's count reflects
  // it; then the chosen movement/period narrows the list.
  const baseRecords = records.filter((record) => matchesQuery(record, searchTerm));
  const movementCounts = Object.fromEntries(
    MOVEMENTS.map((option) => [
      option.value,
      baseRecords.filter((record) => matchesMovement(record, option.value, rangeFor(option.value)))
        .length,
    ]),
  );
  const filteredRecords = baseRecords.filter((record) =>
    matchesMovement(record, movement, rangeFor(movement)),
  );
  const events = movementEvents(
    filteredRecords,
    movement === "with_customers" ? "all" : movement,
    eventsRange,
  );
  const outEventCount = events.filter((event) => event.type === "out").length;

  const hasFilters = searchTerm.trim() || movement !== "all" || period !== "any";

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

      <AlertLegend items={LEGEND_ITEMS} />

      {records.length > 0 && (
        <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {MOVEMENTS.map((option) => {
              const Icon = movementIcons[option.value];
              const active = movement === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMovement(option.value)}
                  aria-pressed={active}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors ${
                    active ? "border-primary bg-tag-bg" : "border-border-soft hover:border-primary"
                  }`}
                >
                  <span className="grid gap-0.5">
                    <span
                      className={`text-xs font-semibold ${active ? "text-primary" : "text-ink-soft"}`}
                    >
                      {option.label}
                    </span>
                    <span className="font-heading text-2xl font-bold text-ink">
                      {movementCounts[option.value]}
                    </span>
                  </span>
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-primary text-white" : "bg-surface-alt text-ink-soft"
                    }`}
                  >
                    <Icon aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                aria-pressed={period === option.value}
                className={chipClass(period === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <DateInput label="من تاريخ" value={customFrom} onChange={setCustomFrom} />
              <DateInput label="إلى تاريخ" value={customTo} onChange={setCustomTo} />
            </div>
          )}

          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="ابحث بأي كلمة: العميل، التليفون، السيارة، المالك، ملاحظة، تاريخ…"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">{events.length}</span> حركة (
              {outEventCount} طالعة، {events.length - outEventCount} داخلة)
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={`inline-flex items-center gap-1.5 ${chipClass(false)}`}
              >
                <FiX aria-hidden="true" />
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      )}

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
        <BookingAgenda
          events={events}
          getStatus={(record) => bookingStatus(record.pickup_date, record.return_date)}
          onEdit={openEditForm}
          onDelete={setDeletingRecord}
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
