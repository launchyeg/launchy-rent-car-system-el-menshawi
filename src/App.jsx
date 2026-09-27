import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PublicSite from "./pages/PublicSite";

// AdminArea (login + dashboard + Supabase client) is code-split behind a
// dynamic import so visitors to the public landing page never download
// Supabase or any dashboard code — only "/login" and "/dashboard/*" ever
// trigger this chunk to load.
const AdminArea = lazy(() => import("./dashboard/AdminArea"));

function AdminAreaFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-ink-soft">
      Loading…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={<AdminAreaFallback />}>
              <AdminArea />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
