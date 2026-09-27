import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../auth/AuthProvider";
import "../dashboard.css";

// The real dashboard shell: a static sidebar rail on desktop, an
// off-canvas drawer on mobile (same Sidebar component in both, so nav
// only exists once), Arabic RTL throughout. Everything inside <Outlet/>
// is a feature page (Cars, Insurance, ...).
export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="font-arabic flex min-h-screen bg-surface-alt text-ink"
    >
      <aside className="hidden w-64 shrink-0 border-e border-border-soft bg-white lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          userEmail={user?.email}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-110 bg-ink/50 lg:hidden"
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="fixed inset-y-0 start-0 z-120 w-4/5 max-w-xs border-e border-border-soft bg-white lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
