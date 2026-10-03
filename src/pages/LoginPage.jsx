import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail } from "react-icons/fi";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../dashboard/auth/AuthProvider";
import Brand from "../components/layout/Brand";
import { brand } from "../content/content";

// Admin sign-in. Deliberately separate from the public site (no Navbar,
// no Footer) and kept in English per spec, unlike the Arabic dashboard it
// leads into. Email/password only — no registration, no social login, no
// password-reset UI; the one admin account is created directly in the
// Supabase dashboard.
export default function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form and go straight where they were headed.
  if (!authLoading && session) {
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    navigate(location.state?.from?.pathname || "/dashboard", {
      replace: true,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">
        <Brand {...brand} href="/" />

        <h1 className="mt-6 mb-6 font-heading text-2xl font-bold text-ink">
          Admin Login
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Email
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 transition-colors focus-within:border-primary">
              <FiMail className="shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full text-sm outline-none placeholder:text-ink-faint"
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 transition-colors focus-within:border-primary">
              <FiLock className="shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full text-sm outline-none placeholder:text-ink-faint"
                placeholder="••••••••"
              />
            </span>
          </label>

          {error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs font-semibold text-ink-faint">
          Launchy Rent Car System · v {__APP_VERSION__}
        </p>
      </div>
    </div>
  );
}
