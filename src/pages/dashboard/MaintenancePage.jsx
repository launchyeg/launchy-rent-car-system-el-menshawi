import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTool, FiTrash2 } from "react-icons/fi";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import AlertLegend from "../../dashboard/ui/AlertLegend";
import SearchInput from "../../dashboard/ui/SearchInput";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import OilChangeForm from "../../dashboard/features/maintenance/OilChangeForm";
import {
  createOilChange,
  deleteOilChange,
  listOilChanges,
  updateOilChange,
} from "../../dashboard/features/maintenance/maintenanceApi";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { getOilStatus } from "../../dashboard/lib/alerts";

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

const LEGEND_ITEMS = [
  { tone: "red", label: "متأخر", condition: "تجاوزت السيارة المسافة المحددة لتغيير الزيت" },
  { tone: "orange", label: "باقي N كم", condition: "متبقٍ 1000 كم أو أقل على التغيير القادم" },
  { tone: "green", label: "جيد", condition: "متبقٍ أكثر من 1000 كم" },
  { tone: "gray", label: "لا يوجد سجل", condition: "لم يُسجَّل تغيير زيت لهذه السيارة بعد" },
];

function oilSearchText(record) {
  return carLabel(record.cars).toLowerCase();
}

export default function MaintenancePage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
        listOilChanges(),
        listCars(),
      ]);
      setRecords(recordsData);
      setCars(carsData);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات الصيانة", {
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
        await updateOilChange(editingRecord.id, payload);
        showToast("تم تحديث سجل تغيير الزيت");
      } else {
        await createOilChange(payload);
        showToast("تمت إضافة سجل تغيير الزيت");
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
      await deleteOilChange(deletingRecord.id);
      showToast("تم حذف سجل تغيير الزيت");
      setDeletingRecord(null);
      await loadData();
    } catch (error) {
      showToast(error.message ?? "تعذّر حذف السجل", { tone: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "index", header: "#", render: (_record, index) => index + 1 },
    {
      key: "car",
      header: "السيارة",
      render: (record) => carLabel(record.cars),
    },
    {
      key: "odometer",
      header: "قراءة العداد الحالية",
      render: (record) => `${record.odometer_km} كم`,
    },
    {
      key: "next_change",
      header: "العداد المستهدف",
      render: (record) => `${record.next_change_odometer_km} كم`,
    },
    {
      key: "cost",
      header: "التكلفة",
      render: (record) => (record.cost != null ? `${record.cost} ج.م` : "—"),
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const status = getOilStatus(
          record.odometer_km,
          record.next_change_odometer_km,
        );
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
  ];

  const term = searchTerm.trim().toLowerCase();
  const filteredRecords = term
    ? records.filter((record) => oilSearchText(record).includes(term))
    : records;

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">الصيانة</h1>
        <button
          type="button"
          onClick={openAddForm}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة صيانة
        </button>
      </div>

      <AlertLegend items={LEGEND_ITEMS} />

      {records.length > 0 && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ابحث بالسيارة…"
        />
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FiTool}
          title="أضف سيارة أولاً"
          description="لا يمكن تسجيل تغيير زيت قبل إضافة سيارة واحدة على الأقل في الأسطول."
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={FiTool}
          title="لا توجد سجلات صيانة بعد"
          description="ابدأ بإضافة أول سجل تغيير زيت لإحدى السيارات."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="btn btn-primary mt-2"
            >
              <FiPlus aria-hidden="true" />
              إضافة صيانة
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filteredRecords}
          emptyMessage="لا توجد نتائج مطابقة للبحث."
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
        title={editingRecord ? "تعديل سجل صيانة السيارة" : "إضافة صيانة"}
      >
        <OilChangeForm
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
        message="سيتم حذف سجل تغيير الزيت هذا نهائيًا. لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
