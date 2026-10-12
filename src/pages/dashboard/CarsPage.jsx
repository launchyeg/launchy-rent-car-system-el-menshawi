import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";
import DataTable from "../../dashboard/ui/DataTable";
import SearchInput from "../../dashboard/ui/SearchInput";
import Modal from "../../dashboard/ui/Modal";
import ConfirmDialog from "../../dashboard/ui/ConfirmDialog";
import EmptyState from "../../dashboard/ui/EmptyState";
import { useToast } from "../../dashboard/ui/Toast";
import CarForm from "../../dashboard/features/cars/CarForm";
import {
  createCar,
  deleteCar,
  listCars,
  updateCar,
} from "../../dashboard/features/cars/carsApi";
import {
  categoryLabel,
  fuelTypeLabel,
  transmissionLabel,
} from "../../dashboard/features/cars/carConstants";

function carSearchText(car) {
  return [
    car.make,
    car.model,
    car.year,
    categoryLabel(car.category),
    transmissionLabel(car.transmission),
    fuelTypeLabel(car.fuel_type),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function CarsPage() {
  const { showToast } = useToast();
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCar, setDeletingCar] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCars = useCallback(async () => {
    setLoading(true);
    try {
      setCars(await listCars());
    } catch (error) {
      showToast(error.message ?? "تعذّر تحميل السيارات", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const openAddForm = () => {
    setEditingCar(null);
    setFormOpen(true);
  };

  const openEditForm = (car) => {
    setEditingCar(car);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingCar) {
        await updateCar(editingCar.id, payload);
        showToast("تم تحديث بيانات السيارة");
      } else {
        await createCar(payload);
        showToast("تمت إضافة السيارة");
      }
      setFormOpen(false);
      await loadCars();
    } catch (error) {
      showToast(error.message ?? "حدث خطأ أثناء الحفظ", { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCar) return;
    setDeleting(true);
    try {
      await deleteCar(deletingCar.id);
      showToast("تم حذف السيارة وكل سجلاتها المرتبطة بها");
      setDeletingCar(null);
      await loadCars();
    } catch (error) {
      showToast(error.message ?? "تعذّر حذف السيارة", { tone: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "index", header: "#", render: (car, index) => index + 1 },
    {
      key: "name",
      header: "السيارة",
      render: (car) => (
        <p className="font-semibold text-ink">
          {[car.make, car.model].filter(Boolean).join(" ")}
          {car.year ? ` ${car.year}` : ""}
        </p>
      ),
    },
    {
      key: "category",
      header: "التصنيف",
      render: (car) => categoryLabel(car.category),
    },
    {
      key: "transmission",
      header: "ناقل الحركة",
      render: (car) => transmissionLabel(car.transmission),
    },
    {
      key: "fuel",
      header: "الوقود",
      render: (car) => fuelTypeLabel(car.fuel_type),
    },
    { key: "seats", header: "عدد الركاب", render: (car) => car.seats },
    { key: "bags", header: "عدد الحقائب", render: (car) => car.bags },
  ];

  const term = searchTerm.trim().toLowerCase();
  const filteredCars = term
    ? cars.filter((car) => carSearchText(car).includes(term))
    : cars;

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-ink">السيارات</h1>
        <button type="button" onClick={openAddForm} className="btn btn-primary">
          <FiPlus aria-hidden="true" />
          إضافة سيارة
        </button>
      </div>

      {cars.length > 0 && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ابحث بالماركة، الموديل، التصنيف…"
        />
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={FaCar}
          title="لا توجد سيارات بعد"
          description="ابدأ بإضافة أول سيارة في الأسطول."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="btn btn-primary mt-2"
            >
              <FiPlus aria-hidden="true" />
              إضافة سيارة
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filteredCars}
          emptyMessage="لا توجد نتائج مطابقة للبحث."
          renderActions={(car) => (
            <>
              <button
                type="button"
                onClick={() => openEditForm(car)}
                aria-label="تعديل"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <FiEdit2 aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingCar(car)}
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
        title={editingCar ? "تعديل السيارة" : "إضافة سيارة"}
      >
        <CarForm
          key={editingCar?.id ?? "new"}
          car={editingCar}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingCar)}
        onClose={() => setDeletingCar(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={
          deletingCar
            ? `سيتم حذف "${[deletingCar.make, deletingCar.model].filter(Boolean).join(" ")}" وكل سجلات التأمين والرخصة والصيانة والحجوزات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
      />
    </div>
  );
}
