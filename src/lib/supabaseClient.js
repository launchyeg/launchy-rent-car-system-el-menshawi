import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the whole app (auth + all dashboard
// queries go through this). Credentials come from Vite env vars set in
// .env (see .env.example) and must never be hard-coded — the anon key is
// safe to ship to the browser only because every table's Row Level
// Security policy requires an authenticated session (see supabase/schema.sql).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
