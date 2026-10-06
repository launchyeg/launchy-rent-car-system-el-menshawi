import { useCallback, useEffect, useState } from "react";
import { FiCalendar, FiList, FiPlus } from "react-icons/fi";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import AlertLegend from "../../dashboard/ui/AlertLegend";
import SearchInput from "../../dashboard/ui/SearchInput";
import FormField from "../../dashboard/ui/FormField";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import BookingForm from "../../dashboard/features/bookings/BookingForm";
import BookingDetails from "../../dashboard/features/bookings/BookingDetails";
import BookingActions from "../../dashboard/features/bookings/BookingActions";
import BookingTimeline from "../../dashboard/features/bookings/BookingTimeline";
import {
  cancelBooking,
  createBooking,
  deleteBooking,
  listBookings,
  markReturned,
  restoreBooking,
  unmarkReturned,
  updateBooking,
} from "../../dashboard/features/bookings/bookingsApi";
import {
  monthBounds,
  rentalDays,
  todayString,
  totalAmount,
} from "../../dashboard/features/bookings/bookingUtils";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { carLabel } from "../../dashboard/lib/carLabel";
import { getBookingDisplayStatus } from "../../dashboard/lib/alerts";
import { formatAmount, formatDate } from "../../dashboard/lib/format";
import {
  carSearchFields,
  carStrictFields,
  matchesQuery,
} from "../../dashboard/lib/searchText";

const LEGEND_ITEMS = [
  { tone: "primary", label: "تسليم سيارة اليوم", condition: "موعد تسليم السيارة للعميل هو اليوم" },
  { tone: "orange", label: "استلام سيارة اليوم", condition: "موعد استلام السيارة من العميل هو اليوم" },
  {
    tone: "yellow",
    label: "يتبقى N يوم على الاستلام",
    condition: "الحجز جاري، وباقي 3 أيام أو أقل على الاستلام",
  },
  { tone: "green", label: "جاري", condition: "السيارة مع العميل، وباقٍ أكثر من 3 أيام على الاستلام" },
  {
    tone: "yellow",
    label: "يتبقى N يوم على التسليم",
    condition: "لم يتم التسليم بعد، وباقي 3 أيام أو أقل",
  },
  { tone: "primary", label: "قادم", condition: "لم يتم التسليم بعد، وباقٍ أكثر من 3 أيام" },
  { tone: "red", label: "متأخر N يوم عن الاستلام", condition: "مر تاريخ الاستلام ولم يتم تسجيل الاستلام" },
  { tone: "gray", label: "منتهي", condition: "تم استلام السيارة من العميل" },
  { tone: "gray", label: "ملغي", condition: "تم إلغاء الحجز ولا يمنع حجز السيارة" },
];

// Filter options use the derived status key from getBookingStatus, not
// the alert wording shown in the badge, so "جاري" also lists a booking
// whose badge currently says "استلام سيارة اليوم".
const STATUS_FILTERS = [
  { value: "", label: "كل الحالات" },
  { value: "upcoming", label: "قادم" },
  { value: "active", label: "جاري" },
  { value: "overdue", label: "متأخر" },
  { value: "completed", label: "منتهي" },
  { value: "cancelled", label: "ملغي" },
];

// Word search (any order): contract number, customer name, and the car's
// make + model, year, owner and color. Phone, ID number and plate are
// matched strictly as whole strings (spaces/dashes ignored) — see
// matchesQuery in lib/searchText.js for the normalization rules.
function searchFields(record) {
  return [
    record.contract_number,
    record.customer_name,
    ...carSearchFields(record.cars),
  ];
}

function strictFields(record) {
  return [
    record.customer_phone,
    record.customer_id_number,
    ...carStrictFields(record.cars),
  ];
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [carFilter, setCarFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [cancellingRecord, setCancellingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState("timeline");
  const [formDefaults, setFormDefaults] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, carsData] = await Promise.all([listBookings(), listCars()]);
      // Newest contract first: the latest booking is always the top row.
      setRecords([...recordsData].sort((a, b) => b.contract_number - a.contract_number));
      setCars(carsData);
      setDataVersion((version) => version + 1);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات الحجوزات", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const viewingRecord = records.find((record) => record.id === viewingId) ?? null;

  // `defaults` ({ car_id, pickup_date }) pre-fills the form when it's
  // opened from an empty timeline cell.
  const openAddForm = (defaults = null) => {
    setEditingRecord(null);
    setFormDefaults(defaults);
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setFormDefaults(null);
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

  // Runs one status action (returned / undo / restore) with a per-row busy
  // flag so a double click can't fire it twice, then refreshes the list.
  const runAction = async (record, action, successMessage) => {
    setBusyId(record.id);
    try {
      await action();
      showToast(successMessage);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "تعذّر تنفيذ العملية", { tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRecord) return;
    setConfirmBusy(true);
    try {
      await cancelBooking(cancellingRecord.id);
      showToast("تم إلغاء الحجز");
      setCancellingRecord(null);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "تعذّر إلغاء الحجز", { tone: "error" });
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setConfirmBusy(true);
    try {
      await deleteBooking(deletingRecord.id);
      showToast("تم حذف الحجز");
      if (deletingRecord.id === viewingId) setViewingId(null);
      setDeletingRecord(null);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "تعذّر حذف الحجز", { tone: "error" });
    } finally {
      setConfirmBusy(false);
    }
  };

  const handlers = {
    onView: (record) => setViewingId(record.id),
    // Opens the printable contract in its own tab, so this list keeps its
    // filters and scroll position.
    onPrint: (record) =>
      window.open(`/dashboard/bookings/${record.id}/contract`, "_blank", "noopener"),
    onEdit: (record) => {
      setViewingId(null);
      openEditForm(record);
    },
    onCancel: (record) => setCancellingRecord(record),
    onRestore: (record) =>
      runAction(record, () => restoreBooking(record.id), "تمت استعادة الحجز"),
    onMarkReturned: (record) =>
      runAction(
        record,
        () => markReturned(record.id, todayString()),
        "تم تسجيل استلام السيارة",
      ),
    onUnmarkReturned: (record) =>
      runAction(
        record,
        () => unmarkReturned(record.id),
        "تم التراجع عن تسجيل الاستلام",
      ),
    onDelete: (record) => setDeletingRecord(record),
  };

  const columns = [
    {
      key: "contract_number",
      header: "رقم العقد",
      render: (record) => <span className="font-semibold">{record.contract_number}</span>,
    },
    { key: "car", header: "السيارة", render: (record) => carLabel(record.cars) },
    { key: "customer_name", header: "اسم العميل", render: (record) => record.customer_name },
    {
      key: "customer_phone",
      header: "رقم الهاتف",
      render: (record) => <span dir="ltr">{record.customer_phone}</span>,
    },
    { key: "pickup", header: "تاريخ التسليم", render: (record) => formatDate(record.pickup_date) },
    { key: "return", header: "تاريخ الاستلام", render: (record) => formatDate(record.return_date) },
    {
      key: "days",
      header: "عدد الأيام",
      render: (record) => rentalDays(record.pickup_date, record.return_date),
    },
    {
      key: "total",
      header: "الإجمالي",
      render: (record) =>
        record.daily_rate == null
          ? "—"
          : `${formatAmount(
              totalAmount(record.pickup_date, record.return_date, record.daily_rate),
            )} جنيه مصري`,
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const status = getBookingDisplayStatus(record);
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
  ];

  const term = searchTerm.trim();
  const month = monthFilter ? monthBounds(monthFilter) : null;
  const filteredRecords = records.filter((record) => {
    if (term && !matchesQuery(searchFields(record), term, strictFields(record))) return false;
    if (statusFilter && getBookingDisplayStatus(record).key !== statusFilter) return false;
    if (carFilter && record.car_id !== carFilter) return false;
    // "Touches the month": delivered on or before its last day, received
    // on or after its first day.
    if (month && !(record.pickup_date <= month.end && record.return_date >= month.start)) {
      return false;
    }
    return true;
  });

  const hasFilters = Boolean(term || statusFilter || carFilter || monthFilter);
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCarFilter("");
    setMonthFilter("");
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">الحجوزات</h1>
        <div
          role="group"
          aria-label="طريقة العرض"
          className="inline-flex overflow-hidden rounded-lg border border-border bg-white text-sm font-semibold"
        >
          {[
            { value: "timeline", label: "الجدول الزمني", icon: FiCalendar },
            { value: "list", label: "القائمة", icon: FiList },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={`inline-flex items-center gap-2 px-4 py-2 transition-colors ${
                view === value ? "bg-primary text-white" : "text-ink hover:bg-surface-alt"
              }`}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openAddForm()}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة حجز
        </button>
      </div>

      {loading && records.length === 0 ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FiCalendar}
          title="أضف سيارة أولاً"
          description="لا يمكن تسجيل حجز قبل إضافة سيارة واحدة على الأقل في الأسطول."
        />
      ) : view === "timeline" ? (
        <BookingTimeline
          cars={cars}
          refreshKey={dataVersion}
          onBookingClick={(booking) => setViewingId(booking.id)}
          onEmptyCellClick={(car, date) =>
            openAddForm({ car_id: car.id, pickup_date: date })
          }
        />
      ) : (
        <>
          <AlertLegend items={LEGEND_ITEMS} />

          {records.length > 0 && (
            <div className="grid gap-3">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="ابحث باسم العميل، الهاتف، رقم البطاقة، السيارة، المالك، رقم اللوحة، رقم العقد…"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="الحالة">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full bg-transparent text-sm text-ink outline-none"
                  >
                    {STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="السيارة">
                  <select
                    value={carFilter}
                    onChange={(event) => setCarFilter(event.target.value)}
                    className="w-full bg-transparent text-sm text-ink outline-none"
                  >
                    <option value="">كل السيارات</option>
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {carLabel(car)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="الشهر">
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(event) => setMonthFilter(event.target.value)}
                    className="w-full text-sm outline-none"
                  />
                </FormField>
              </div>
              {hasFilters && (
                <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                  <span>
                    عرض {filteredRecords.length} من {records.length}
                  </span>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-semibold text-primary hover:underline"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}
            </div>
          )}

          {records.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="لا توجد حجوزات بعد"
              description="ابدأ بإضافة أول حجز لإحدى السيارات."
              action={
                <button type="button" onClick={() => openAddForm()} className="btn btn-primary mt-2">
                  <FiPlus aria-hidden="true" />
                  إضافة حجز
                </button>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredRecords}
              emptyMessage="لا توجد نتائج مطابقة للبحث."
              renderActions={(record) => (
                <BookingActions
                  booking={record}
                  handlers={handlers}
                  busy={busyId === record.id}
                />
              )}
            />
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRecord ? "تعديل الحجز" : "إضافة حجز"}
        maxWidthClass="max-w-2xl"
      >
        <BookingForm
          key={editingRecord?.id ?? `new-${formDefaults?.car_id}-${formDefaults?.pickup_date}`}
          record={editingRecord}
          defaults={formDefaults}
          cars={cars}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(viewingRecord)}
        onClose={() => setViewingId(null)}
        title="تفاصيل الحجز"
        maxWidthClass="max-w-2xl"
      >
        {viewingRecord && (
          <BookingDetails
            booking={viewingRecord}
            handlers={handlers}
            busy={busyId === viewingRecord.id}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancellingRecord)}
        onClose={() => setCancellingRecord(null)}
        onConfirm={handleConfirmCancel}
        loading={confirmBusy}
        loadingLabel="جارٍ الإلغاء…"
        title="تأكيد إلغاء الحجز"
        message={
          cancellingRecord
            ? `سيتم إلغاء حجز "${cancellingRecord.customer_name}" للسيارة "${carLabel(cancellingRecord.cars)}" وتصبح السيارة متاحة في هذه الفترة. يمكنك استعادته لاحقًا إذا كانت الفترة ما زالت متاحة.`
            : ""
        }
        confirmLabel="إلغاء الحجز"
        cancelLabel="إبقاء الحجز"
      />

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDelete}
        loading={confirmBusy}
        message={
          deletingRecord
            ? `سيتم حذف حجز "${deletingRecord.customer_name}" للسيارة "${carLabel(deletingRecord.cars)}" نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
      />
    </div>
  );
}
