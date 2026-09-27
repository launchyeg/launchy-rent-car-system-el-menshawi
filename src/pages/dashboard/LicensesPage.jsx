import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import DataTable from "../../dashboard/ui/DataTable";
import StatusBadge from "../../dashboard/ui/StatusBadge";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import LicenseForm from "../../dashboard/features/licenses/LicenseForm";
import {
  createLicenseRenewal,
  deleteLicenseRenewal,
  listLicenseRenewals,
  updateLicenseRenewal,
} from "../../dashboard/features/licenses/licensesApi";
import { listCars } from "../../dashboard/features/cars/carsApi";
import { durationLabel } from "../../dashboard/features/licenses/licenseConstants";
import { getLicenseStatus } from "../../dashboard/lib/alerts";
import { formatDate } from "../../dashboard/lib/format";

function carLabel(car) {
  if (!car) return "—";
  return [car.make, car.model, car.year].filter(Boolean).join(" ");
}

export default function LicensesPage() {
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
        listLicenseRenewals(),
        listCars(),
      ]);
      setRecords(recordsData);
      setCars(carsData);
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل بيانات الرخص", {
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
        await updateLicenseRenewal(editingRecord.id, payload);
        showToast("تم تحديث سجل الرخصة");
      } else {
        await createLicenseRenewal(payload);
        showToast("تمت إضافة سجل الرخصة");
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
      await deleteLicenseRenewal(deletingRecord.id);
      showToast("تم حذف سجل الرخصة");
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
    { key: "car", header: "السيارة", render: (record) => carLabel(record.cars) },
    {
      key: "renewal",
      header: "تاريخ التجديد",
      render: (record) => formatDate(record.renewal_date),
    },
    {
      key: "duration",
      header: "المدة",
      render: (record) => durationLabel(record.duration_years),
    },
    {
      key: "expiry",
      header: "تاريخ الانتهاء",
      render: (record) => formatDate(record.expiry_date),
    },
    { key: "cost", header: "التكلفة", render: (record) => `${record.cost} ج.م` },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const status = getLicenseStatus(record.expiry_date);
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">تجديد الرخص</h1>
        <button
          type="button"
          onClick={openAddForm}
          disabled={cars.length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPlus aria-hidden="true" />
          إضافة تجديد
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title="أضف سيارة أولاً"
          description="لا يمكن تسجيل تجديد رخصة قبل إضافة سيارة واحدة على الأقل في الأسطول."
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title="لا توجد سجلات تجديد بعد"
          description="ابدأ بإضافة أول سجل تجديد رخصة لإحدى السيارات."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="btn btn-primary mt-2"
            >
              <FiPlus aria-hidden="true" />
              إضافة تجديد
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
        title={editingRecord ? "تعديل سجل الرخصة" : "إضافة تجديد رخصة"}
      >
        <LicenseForm
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
        message="سيتم حذف سجل التجديد هذا نهائيًا. لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
