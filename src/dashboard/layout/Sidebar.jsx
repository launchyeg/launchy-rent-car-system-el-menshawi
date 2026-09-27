import { NavLink } from "react-router-dom";
import { FiCalendar, FiFileText, FiHome, FiShield, FiTool } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";
import Brand from "../../components/layout/Brand";
import { brand, footer } from "../../content/content";

const navItems = [
  { to: "/dashboard", label: "لوحة التحكم", icon: FiHome, end: true },
  { to: "/dashboard/cars", label: "السيارات", icon: FaCar },
  { to: "/dashboard/insurance", label: "التأمينات", icon: FiShield },
  { to: "/dashboard/licenses", label: "تجديد الرخص", icon: FiFileText },
  { to: "/dashboard/maintenance", label: "الصيانة", icon: FiTool },
  { to: "/dashboard/bookings", label: "الحجوزات", icon: FiCalendar },
];

// Shared between the static desktop rail and the mobile off-canvas drawer
// in DashboardLayout, so the nav structure is only ever defined once.
// Reuses the real "Built by Launchy" link from the public footer instead
// of inventing a new one.
export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-19 items-center border-b border-border-soft px-5">
        <Brand {...brand} href="/" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="التنقل الرئيسي">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:bg-surface-alt hover:text-ink"
              }`
            }
          >
            <Icon aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-border-soft px-5 py-4 text-xs text-ink-faint">
        <span>
          Developed by{" "}
          <a
            href={footer.development}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink-soft transition-colors hover:text-primary"
          >
            Launchy
          </a>
        </span>
        <span className="rounded-full bg-surface-alt-2 px-2 py-0.5 font-semibold text-ink-faint">
          v 1.0.0
        </span>
      </div>
    </div>
  );
}
