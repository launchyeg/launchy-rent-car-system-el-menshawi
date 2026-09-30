import { useCallback, useEffect, useState } from "react";
import { FiBell, FiBellOff } from "react-icons/fi";
import { useToast } from "../ui/Toast";
import { enablePushNotifications, getPushSubscriptionStatus } from "../pwa/pushSubscription";

// Deliberately minimal — just a way to (re)enable push notifications for
// this device. No alert list/badge here; the owner relies entirely on the
// phone's own push notifications, not an in-app panel (see the daily
// alerts computed in AlertsProvider/DashboardHome, which stay separate).
export default function PushNotificationButton() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("checking");
  const [enabling, setEnabling] = useState(false);

  const refreshStatus = useCallback(() => {
    getPushSubscriptionStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleClick = async () => {
    if (status === "subscribed" || status === "unsupported" || enabling) return;
    setEnabling(true);
    try {
      await enablePushNotifications();
      setStatus("subscribed");
      showToast("تم تفعيل إشعارات الهاتف على هذا الجهاز");
    } catch (error) {
      showToast(error.message ?? "تعذّر تفعيل الإشعارات", { tone: "error" });
    } finally {
      setEnabling(false);
    }
  };

  const label =
    status === "subscribed"
      ? "إشعارات الهاتف مفعّلة على هذا الجهاز"
      : status === "unsupported"
        ? "هذا المتصفح لا يدعم إشعارات الهاتف"
        : "تفعيل إشعارات الهاتف";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={enabling || status === "subscribed" || status === "unsupported"}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-default ${
        status === "subscribed"
          ? "border-primary text-primary"
          : "border-border-soft text-ink hover:border-ink disabled:opacity-60"
      }`}
    >
      {status === "unsupported" ? (
        <FiBellOff aria-hidden="true" />
      ) : (
        <FiBell aria-hidden="true" />
      )}
    </button>
  );
}
