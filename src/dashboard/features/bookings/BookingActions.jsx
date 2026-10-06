import {
  FiCheckCircle,
  FiEdit2,
  FiEye,
  FiPrinter,
  FiRefreshCw,
  FiRotateCcw,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import { getBookingStatus } from "../../lib/alerts";

const hoverByTone = {
  default: "hover:border-primary hover:text-primary",
  danger: "hover:border-red-500 hover:text-red-600",
};

// The action set for one booking, shared by the list rows (variant
// "icons") and the details modal (variant "buttons") so both always offer
// the same things. Which status actions appear depends on the booking:
//   تم الاستلام / التراجع عن الاستلام — only once the car has been delivered
//   إلغاء الحجز / استعادة الحجز        — cancel, or restore a cancelled one
// `handlers` is { onView, onEdit, onPrint, onCancel, onRestore, onMarkReturned,
// onUnmarkReturned, onDelete }; anything not provided is simply hidden.
// طباعة العقد opens the printable contract page (not for cancelled bookings).
export default function BookingActions({
  booking,
  handlers,
  variant = "icons",
  busy = false,
}) {
  const status = getBookingStatus(booking);
  const cancelled = status.key === "cancelled";
  const canMarkReturned = status.key === "active" || status.key === "overdue";
  const canUndoReturned = Boolean(booking.returned_on) && !cancelled;

  const actions = [
    { key: "view", label: "عرض", icon: FiEye, onClick: handlers.onView },
    { key: "edit", label: "تعديل", icon: FiEdit2, onClick: handlers.onEdit },
    {
      key: "print",
      label: "طباعة العقد",
      icon: FiPrinter,
      onClick: handlers.onPrint,
      disabled: cancelled,
      title: cancelled ? "لا يمكن طباعة عقد حجز ملغي" : "طباعة العقد",
    },
    canMarkReturned && {
      key: "returned",
      label: "تم الاستلام",
      icon: FiCheckCircle,
      onClick: handlers.onMarkReturned,
    },
    canUndoReturned && {
      key: "unreturned",
      label: "التراجع عن الاستلام",
      icon: FiRotateCcw,
      onClick: handlers.onUnmarkReturned,
    },
    !cancelled && {
      key: "cancel",
      label: "إلغاء الحجز",
      icon: FiXCircle,
      onClick: handlers.onCancel,
      tone: "danger",
    },
    cancelled && {
      key: "restore",
      label: "استعادة الحجز",
      icon: FiRefreshCw,
      onClick: handlers.onRestore,
    },
    { key: "delete", label: "حذف", icon: FiTrash2, onClick: handlers.onDelete, tone: "danger" },
  ].filter((action) => action && (action.onClick || action.disabled));

  const iconOnly = variant === "icons";

  return (
    <div className={`flex flex-wrap gap-2 ${iconOnly ? "justify-end" : ""}`}>
      {actions.map(({ key, label, icon: Icon, onClick, disabled, title, tone = "default" }) => (
        <button
          key={key}
          type="button"
          onClick={() => onClick?.(booking)}
          disabled={disabled || busy}
          title={title ?? label}
          aria-label={label}
          className={
            iconOnly
              ? `inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${hoverByTone[tone]}`
              : `inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${hoverByTone[tone]}`
          }
        >
          <Icon aria-hidden="true" />
          {!iconOnly && label}
        </button>
      ))}
    </div>
  );
}
