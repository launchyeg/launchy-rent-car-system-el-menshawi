import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

const ToastContext = createContext(undefined);
let idCounter = 0;

// Lightweight toast queue for confirming saves/deletes/errors across every
// dashboard form. Hand-rolled rather than a dependency, matching the rest
// of the dashboard's approach of reusing what's already installed.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, { tone = "success" } = {}) => {
      const id = ++idCounter;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 left-1/2 z-200 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-card-hover ${
                toast.tone === "error" ? "bg-red-600" : "bg-dark"
              }`}
            >
              {toast.tone === "error" ? (
                <FiAlertCircle aria-hidden="true" />
              ) : (
                <FiCheckCircle aria-hidden="true" />
              )}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
