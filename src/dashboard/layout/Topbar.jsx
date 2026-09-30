import { FiLogOut, FiMenu } from "react-icons/fi";

export default function Topbar({ onMenuClick, userEmail, onSignOut }) {
  return (
    <header className="flex h-19 items-center justify-between border-b border-border-soft bg-white px-5">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="فتح القائمة"
        className="inline-flex h-10.5 w-10.5 items-center justify-center rounded-full border border-border-soft text-lg text-ink transition-colors hover:border-ink lg:hidden"
      >
        <FiMenu aria-hidden="true" />
      </button>

      <span className="hidden text-sm font-semibold text-ink-faint lg:block">
        {userEmail}
      </span>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-primary"
      >
        تسجيل الخروج
        <FiLogOut aria-hidden="true" />
      </button>
    </header>
  );
}
