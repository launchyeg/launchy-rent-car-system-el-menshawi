import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import DashboardLayout from "./layout/DashboardLayout";
import { ToastProvider } from "./ui/Toast";
import LoginPage from "../pages/LoginPage";
import DashboardHome from "../pages/dashboard/DashboardHome";
import CarsPage from "../pages/dashboard/CarsPage";
import InsurancePage from "../pages/dashboard/InsurancePage";
import LicensesPage from "../pages/dashboard/LicensesPage";
import MaintenancePage from "../pages/dashboard/MaintenancePage";
import BookingsPage from "../pages/dashboard/BookingsPage";

// Everything that needs Supabase (auth + all dashboard data) lives behind
// this one lazy-loaded boundary (see App.jsx), so a visitor to the public
// landing page never downloads Supabase's client or any dashboard code.
// This nested <Routes> re-matches against the full URL since its paths
// are absolute, which is what lets App.jsx mount it at a single "/*".
export default function AdminArea() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="cars" element={<CarsPage />} />
            <Route path="insurance" element={<InsurancePage />} />
            <Route path="licenses" element={<LicensesPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="bookings" element={<BookingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
