import { describe, expect, it } from "vitest";
import {
  buildBookingAlerts,
  countCurrentBookings,
  getBookingAlert,
  getBookingDisplayStatus,
  getBookingNotice,
  getBookingStatus,
} from "./alerts";

// Fixed "today" (10 Oct 2026, local) so results never depend on the clock.
const today = new Date(2026, 9, 10);
const booking = (pickup, ret, extra = {}) => ({
  pickup_date: pickup,
  return_date: ret,
  ...extra,
});

describe("getBookingStatus", () => {
  it("is upcoming before the delivery day", () => {
    expect(getBookingStatus(booking("2026-10-12", "2026-10-14"), today).key).toBe("upcoming");
  });

  it("is active from the delivery day, including the receipt day", () => {
    expect(getBookingStatus(booking("2026-10-10", "2026-10-15"), today).key).toBe("active");
    expect(getBookingStatus(booking("2026-10-08", "2026-10-10"), today).key).toBe("active");
  });

  it("is overdue the day after the receipt date if not marked received", () => {
    const status = getBookingStatus(booking("2026-10-05", "2026-10-09"), today);
    expect(status.key).toBe("overdue");
    expect(status.days).toBe(1);
    expect(status.label).toBe("متأخر 1 يوم عن الاستلام");
    expect(getBookingStatus(booking("2026-10-05", "2026-10-08"), today).label).toBe(
      "متأخر 2 أيام عن الاستلام",
    );
  });

  it("is completed once marked received, even if past due", () => {
    const done = booking("2026-10-05", "2026-10-09", { returned_on: "2026-10-09" });
    expect(getBookingStatus(done, today).key).toBe("completed");
  });

  it("cancelled wins over everything", () => {
    const cancelled = booking("2026-10-05", "2026-10-09", {
      cancelled_at: "2026-10-01T10:00:00Z",
      returned_on: "2026-10-09",
    });
    expect(getBookingStatus(cancelled, today).key).toBe("cancelled");
  });
});

describe("getBookingAlert / getBookingDisplayStatus", () => {
  it("announces delivery and receipt today", () => {
    expect(getBookingDisplayStatus(booking("2026-10-10", "2026-10-15"), today).label).toBe(
      "تسليم سيارة اليوم",
    );
    expect(getBookingDisplayStatus(booking("2026-10-01", "2026-10-10"), today).label).toBe(
      "استلام سيارة اليوم",
    );
  });

  it("counts days left within the 3-day window", () => {
    expect(getBookingDisplayStatus(booking("2026-10-12", "2026-10-20"), today).label).toBe(
      "يتبقى 2 أيام على التسليم",
    );
    expect(getBookingDisplayStatus(booking("2026-10-05", "2026-10-11"), today).label).toBe(
      "يتبقى 1 يوم على الاستلام",
    );
  });

  it("keeps the derived status key while using the alert wording", () => {
    const status = getBookingDisplayStatus(booking("2026-10-10", "2026-10-15"), today);
    expect(status.key).toBe("active");
  });

  it("shows plain status outside the alert window and for finished bookings", () => {
    expect(getBookingDisplayStatus(booking("2026-10-20", "2026-10-25"), today).label).toBe("قادم");
    const done = booking("2026-10-01", "2026-10-10", { returned_on: "2026-10-10" });
    expect(getBookingDisplayStatus(done, today).label).toBe("منتهي");
  });

  it("raises no alert for a booking far in the future or past", () => {
    expect(getBookingAlert("2026-11-01", "2026-11-05", today)).toBeNull();
    expect(getBookingAlert("2026-09-01", "2026-09-05", today)).toBeNull();
  });
});

describe("getBookingNotice", () => {
  it("flags an overdue receipt in red, ranked first", () => {
    const notice = getBookingNotice(booking("2026-10-05", "2026-10-08"), today);
    expect(notice).toMatchObject({
      type: "overdue",
      tone: "red",
      days: 2,
      label: "متأخر 2 أيام عن الاستلام",
      rank: 0,
    });
  });

  it("starts being overdue the day after the receipt date, not on it", () => {
    expect(getBookingNotice(booking("2026-10-05", "2026-10-10"), today).type).toBe("return");
    expect(getBookingNotice(booking("2026-10-05", "2026-10-09"), today).type).toBe("overdue");
  });

  it("raises no alert once the car is marked received, even if past due", () => {
    const received = booking("2026-10-05", "2026-10-08", { returned_on: "2026-10-09" });
    expect(getBookingNotice(received, today)).toBeNull();
  });

  it("raises no alert for a cancelled booking, whatever its dates", () => {
    const cancelled = { cancelled_at: "2026-10-01T10:00:00Z" };
    expect(getBookingNotice(booking("2026-10-05", "2026-10-08", cancelled), today)).toBeNull();
    expect(getBookingNotice(booking("2026-10-10", "2026-10-15", cancelled), today)).toBeNull();
    expect(getBookingNotice(booking("2026-10-01", "2026-10-10", cancelled), today)).toBeNull();
  });

  it("keeps the delivery and receipt rules for live bookings", () => {
    expect(getBookingNotice(booking("2026-10-10", "2026-10-15"), today).label).toBe(
      "تسليم سيارة اليوم",
    );
    expect(getBookingNotice(booking("2026-10-01", "2026-10-10"), today).label).toBe(
      "استلام سيارة اليوم",
    );
    expect(getBookingNotice(booking("2026-10-11", "2026-10-20"), today).label).toBe(
      "يتبقى 1 يوم على التسليم",
    );
    expect(getBookingNotice(booking("2026-10-20", "2026-10-25"), today)).toBeNull();
  });
});

describe("buildBookingAlerts", () => {
  const car = { make: "هيونداي", model: "Ad", year: 2027, owner_name: "المالك" };
  const row = (id, pickup, ret, extra = {}) => ({
    id,
    cars: car,
    customer_name: `عميل ${id}`,
    customer_phone: "01000000000",
    ...booking(pickup, ret, extra),
  });

  it("lists overdue first, then today, then soonest, and drops cancelled", () => {
    const rows = buildBookingAlerts(
      [
        row("soon", "2026-10-12", "2026-10-20"), // delivery in 2 days
        row("today", "2026-10-01", "2026-10-10"), // receipt today
        row("late", "2026-10-01", "2026-10-07"), // overdue 3 days
        row("gone", "2026-10-01", "2026-10-07", { cancelled_at: "2026-10-02T00:00:00Z" }),
        row("done", "2026-10-01", "2026-10-07", { returned_on: "2026-10-07" }),
        row("far", "2026-12-01", "2026-12-05"),
      ],
      today,
    );
    expect(rows.map((r) => r.key)).toEqual([
      "booking:late:overdue",
      "booking:today:return",
      "booking:soon:pickup",
    ]);
    expect(rows[0]).toMatchObject({
      tone: "red",
      label: "متأخر 3 أيام عن الاستلام",
      car: "هيونداي Ad 2027 - المالك",
      customer_name: "عميل late",
    });
  });

  it("puts a receipt before a delivery on the same day", () => {
    const rows = buildBookingAlerts(
      [row("out", "2026-10-10", "2026-10-15"), row("back", "2026-10-05", "2026-10-10")],
      today,
    );
    expect(rows.map((r) => r.type)).toEqual(["return", "pickup"]);
  });
});

describe("countCurrentBookings", () => {
  it("counts cars out with a customer, overdue included, cancelled and received excluded", () => {
    const rows = [
      booking("2026-10-08", "2026-10-12"), // active
      booking("2026-10-01", "2026-10-07"), // overdue
      booking("2026-10-01", "2026-10-07", { returned_on: "2026-10-07" }), // received
      booking("2026-10-08", "2026-10-12", { cancelled_at: "2026-10-01T00:00:00Z" }), // cancelled
      booking("2026-10-20", "2026-10-25"), // upcoming
    ];
    expect(countCurrentBookings(rows, today)).toBe(2);
  });
});
