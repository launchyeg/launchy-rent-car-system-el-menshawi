import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Unit tests only touch pure logic. The one database test reads its
// credentials from .env.test (gitignored; see .env.test.example) and
// skips itself when that file is missing. VITE_SUPABASE_URL is passed
// through only so that test can refuse to run against the real project.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    test: {
      environment: "node",
      include: ["src/**/*.test.js"],
      env: {
        TEST_SUPABASE_URL: env.TEST_SUPABASE_URL ?? "",
        TEST_SUPABASE_SERVICE_ROLE_KEY: env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? "",
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? "",
      },
    },
  };
});
