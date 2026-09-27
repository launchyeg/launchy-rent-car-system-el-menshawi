import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

// Generic dialog shell — the same overlay/panel pattern as the public
// site's TermsModal, generalized so every add/edit form and confirmation
// in the dashboard shares one implementation.
export default function Modal({ open, onClose, title, children, maxWidthClass = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-110 flex items-center justify-center bg-ink/50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-modal-title"
            onClick={(event) => event.stopPropagation()}
            className={`flex max-h-[85vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl bg-white shadow-card-hover`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
              <h2
                id="dashboard-modal-title"
                className="font-heading text-lg font-bold text-ink"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-ink"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
