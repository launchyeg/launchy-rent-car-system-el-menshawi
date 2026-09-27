import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import DashboardLayout from "./layout/DashboardLayout";
import { ToastProvider } from "./ui/Toast";
import LoginPage from "../pages/LoginPage";
import CarsPage from "../pages/dashboard/CarsPage";
import Placeholder from "../pages/dashboard/Placeholder";

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
            <Route index element={<Placeholder title="لوحة التحكم" />} />
            <Route path="cars" element={<CarsPage />} />
            <Route
              path="insurance"
              element={<Placeholder title="التأمينات" />}
            />
            <Route
              path="licenses"
              element={<Placeholder title="تجديد الرخص" />}
            />
            <Route
              path="maintenance"
              element={<Placeholder title="الصيانة" />}
            />
            <Route
              path="bookings"
              element={<Placeholder title="الحجوزات" />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
