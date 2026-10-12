import Modal from "./Modal";

// Built on Modal — used before every delete (cars, insurance, licenses,
// oil changes, bookings) so nothing is ever removed without an explicit
// confirm, especially given cars cascade-delete their related records.
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message,
  confirmLabel = "حذف",
  cancelLabel = "إلغاء",
  danger = true,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-sm">
      <p className="text-sm text-ink-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="btn btn-outline disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`btn text-white disabled:opacity-60 ${
            danger ? "bg-red-600 hover:bg-red-700" : "btn-primary"
          }`}
        >
          {loading ? "جارٍ الحذف…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
