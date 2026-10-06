import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Database rules, checked against a SEPARATE test Supabase project (never
// the real one): overlap, same-day turnover, strict dates, cancellation,
// contract numbers. Needs .env.test (see .env.test.example); without it
// the whole file skips. It creates its own car and deletes it at the end
// (bookings cascade). Run supabase/schema.sql on the test project first.
const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const realUrl = process.env.VITE_SUPABASE_URL;
const normalize = (value) => (value ?? "").replace(/\/+$/, "");

if (!url || !key) {
  describe("bookings database rules", () => {
    it.skip("SKIPPED - create .env.test from .env.test.example (separate test project) to run", () => {});
  });
} else if (realUrl && normalize(url) === normalize(realUrl)) {
  describe("bookings database rules", () => {
    it("refuses to run against the real project", () => {
      throw new Error(
        "TEST_SUPABASE_URL equals VITE_SUPABASE_URL. Point .env.test at a separate test project.",
      );
    });
  });
} else {
  describe("bookings database rules", () => {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    let carId;

    const book = (pickup, ret, extra = {}) =>
      supabase
        .from("bookings")
        .insert({
          car_id: carId,
          customer_name: "Test Customer",
          customer_phone: "01000000000",
          pickup_date: pickup,
          return_date: ret,
          ...extra,
        })
        .select()
        .single();

    beforeAll(async () => {
      const { data, error } = await supabase
        .from("cars")
        .insert({
          model: "Rules Test",
          category: "sedan",
          transmission: "automatic",
          fuel_type: "petrol",
        })
        .select()
        .single();
      if (error) throw error;
      carId = data.id;
    });

    afterAll(async () => {
      if (carId) await supabase.from("cars").delete().eq("id", carId);
    });

    it("accepts a booking and numbers contracts upward", async () => {
      const first = await book("2099-01-10", "2099-01-15");
      expect(first.error).toBeNull();
      const second = await book("2099-01-15", "2099-01-20"); // same-day turnover
      expect(second.error).toBeNull();
      expect(second.data.contract_number).toBeGreaterThan(first.data.contract_number);
    });

    it("rejects an overlapping booking for the same car", async () => {
      const { error } = await book("2099-01-14", "2099-01-16");
      expect(error?.code).toBe("23P01");
    });

    it("allows back-to-back bookings (receipt day = next delivery day)", async () => {
      const { error } = await book("2099-01-20", "2099-01-22");
      expect(error).toBeNull();
    });

    it("rejects a receipt date on or before the delivery date", async () => {
      expect((await book("2099-03-05", "2099-03-05")).error?.code).toBe("23514");
      expect((await book("2099-03-05", "2099-03-01")).error?.code).toBe("23514");
    });

    it("lets a cancelled booking stop blocking the car, and blocks restoring into a clash", async () => {
      const original = await book("2099-05-01", "2099-05-05");
      expect(original.error).toBeNull();
      await supabase
        .from("bookings")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", original.data.id);

      const replacement = await book("2099-05-02", "2099-05-04");
      expect(replacement.error).toBeNull();

      const restore = await supabase
        .from("bookings")
        .update({ cancelled_at: null })
        .eq("id", original.data.id);
      expect(restore.error?.code).toBe("23P01");
    });

    it("never changes a contract number after insert", async () => {
      const { data } = await book("2099-07-01", "2099-07-03");
      await supabase.from("bookings").update({ contract_number: 999999 }).eq("id", data.id);
      const { data: after } = await supabase
        .from("bookings")
        .select("contract_number")
        .eq("id", data.id)
        .single();
      expect(after.contract_number).toBe(data.contract_number);
    });
  });
}
