import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiShield, FiTrash2 } from "react-icons/fi";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import InsuranceForm from "../../dashboard/features/insurance/InsuranceForm";
import {
  createInsuranceRecord,
  deleteInsuranceRecord,
  listInsuranceRecords,
  updateInsuranceRecord,
} from "../../dashboard/features/insurance/insuranceApi";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { getInsuranceStatus } from "../../dashboard/lib/alerts";
import { formatDate } from "../../dashboard/lib/format";

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

export default function InsurancePage() {
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
        listInsuranceRecords(),
        listCars(),
      ]);
      setRecords(recordsData);
      setCars(carsData);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات التأمين", {
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
        await updateInsuranceRecord(editingRecord.id, payload);
        showToast("تم تحديث سجل التأمين");
      } else {
        await createInsuranceRecord(payload);
        showToast("تمت إضافة سجل التأمين");
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
      await deleteInsuranceRecord(deletingRecord.id);
      showToast("تم حذف سجل التأمين");
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
      key: "provider",
      header: "شركة التأمين",
      render: (record) => record.provider || "—",
    },
    {
      key: "price",
      header: "القيمة",
      render: (record) => `${record.price} ج.م`,
    },
    {
      key: "expiry",
      header: "تاريخ الانتهاء",
      render: (record) => formatDate(record.expiry_date),
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const status = getInsuranceStatus(record.expiry_date);
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">التأمينات</h1>
        <button
          type="button"
          onClick={openAddForm}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة تأمين
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FiShield}
          title="أضف سيارة أولاً"
          description="لا يمكن تسجيل تأمين قبل إضافة سيارة واحدة على الأقل في الأسطول."
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={FiShield}
          title="لا توجد سجلات تأمين بعد"
          description="ابدأ بإضافة أول سجل تأمين لإحدى السيارات."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="btn btn-primary mt-2"
            >
              <FiPlus aria-hidden="true" />
              إضافة تأمين
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
        title={editingRecord ? "تعديل سجل التأمين" : "إضافة تأمين"}
      >
        <InsuranceForm
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
        message="سيتم حذف سجل التأمين هذا نهائيًا. لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
