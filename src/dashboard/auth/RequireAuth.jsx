import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

// Route guard for everything under /dashboard. Unauthenticated visitors
// are sent to /login, remembering where they were trying to go so
// LoginPage can send them back after a successful sign-in.
export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
