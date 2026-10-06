import { describe, expect, it } from "vitest";
import {
  addDays,
  arabicDaysText,
  daysBetween,
  fuelLevelLabel,
  monthBounds,
  rentalDays,
  timelineBar,
  todayString,
  totalAmount,
} from "./bookingUtils";

describe("rentalDays", () => {
  it("is receipt date minus delivery date", () => {
    expect(rentalDays("2026-10-10", "2026-10-15")).toBe(5);
    expect(rentalDays("2026-10-10", "2026-10-11")).toBe(1);
  });

  it("is 0 for a reversed range or until both dates are set", () => {
    expect(rentalDays("2026-10-15", "2026-10-10")).toBe(0);
    expect(rentalDays("", "2026-10-10")).toBe(0);
    expect(rentalDays("2026-10-10", "")).toBe(0);
  });

  it("counts across month and year ends", () => {
    expect(rentalDays("2026-12-30", "2027-01-02")).toBe(3);
    expect(rentalDays("2028-02-28", "2028-03-01")).toBe(2); // leap year
  });
});

describe("arabicDaysText", () => {
  it("uses the correct Arabic form for each count", () => {
    expect(arabicDaysText(1)).toBe("يوم واحد");
    expect(arabicDaysText(2)).toBe("يومان");
    expect(arabicDaysText(3)).toBe("3 أيام");
    expect(arabicDaysText(10)).toBe("10 أيام");
    expect(arabicDaysText(11)).toBe("11 يومًا");
    expect(arabicDaysText(30)).toBe("30 يومًا");
  });

  it("is empty for zero, negative or non-numeric input", () => {
    expect(arabicDaysText(0)).toBe("");
    expect(arabicDaysText(-2)).toBe("");
    expect(arabicDaysText("abc")).toBe("");
    expect(arabicDaysText(null)).toBe("");
  });
});

describe("totalAmount", () => {
  it("is days x daily rate", () => {
    expect(totalAmount("2026-10-10", "2026-10-15", 1000)).toBe(5000);
    expect(totalAmount("2026-10-10", "2026-10-15", "1000")).toBe(5000);
    expect(totalAmount("2026-10-10", "2026-10-11", 1500.5)).toBe(1500.5);
  });

  it("is 0 without a usable rate or valid dates", () => {
    expect(totalAmount("2026-10-10", "2026-10-15", "")).toBe(0);
    expect(totalAmount("2026-10-10", "2026-10-15", "abc")).toBe(0);
    expect(totalAmount("2026-10-15", "2026-10-10", 1000)).toBe(0);
  });
});

describe("date helpers", () => {
  it("daysBetween is not shifted by daylight saving", () => {
    expect(daysBetween("2026-03-27", "2026-03-30")).toBe(3);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("addDays crosses month, year and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("monthBounds gives first and last day", () => {
    expect(monthBounds("2026-10")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthBounds("2026-02").end).toBe("2026-02-28");
    expect(monthBounds("2028-02").end).toBe("2028-02-29");
  });

  it("todayString is YYYY-MM-DD", () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("fuelLevelLabel maps stored values to Arabic", () => {
    expect(fuelLevelLabel("full")).toBe("ممتلئ");
    expect(fuelLevelLabel("three_quarters")).toBe("ثلاثة أرباع");
    expect(fuelLevelLabel(null)).toBe("");
  });
});

describe("timelineBar", () => {
  const oct = monthBounds("2026-10"); // 31 days
  const bar = (pickup, ret) => timelineBar({ pickup_date: pickup, return_date: ret }, oct, 31);

  it("spans delivery day to receipt day (column 1 is the car label)", () => {
    // 10th..15th = columns 11..16 -> end line 17
    expect(bar("2026-10-10", "2026-10-15")).toEqual({
      clippedStart: false,
      clippedEnd: false,
      column: "11 / 17",
    });
  });

  it("clips a booking that starts before the month", () => {
    expect(bar("2026-09-28", "2026-10-03")).toEqual({
      clippedStart: true,
      clippedEnd: false,
      column: "2 / 5",
    });
  });

  it("clips a booking that ends after the month", () => {
    expect(bar("2026-10-29", "2026-11-02")).toEqual({
      clippedStart: false,
      clippedEnd: true,
      column: "30 / 33",
    });
  });

  it("keeps a booking received on day 1 of the month", () => {
    expect(bar("2026-09-30", "2026-10-01").column).toBe("2 / 3");
  });

  it("same-day turnover: both bars cover the shared day's column, unclipped", () => {
    const first = bar("2026-10-10", "2026-10-15"); // ends in the 15th's column (16)
    const second = bar("2026-10-15", "2026-10-20"); // starts in the 15th's column (16)
    expect(first.column).toBe("11 / 17");
    expect(second.column).toBe("16 / 22");
    // Unclipped ends are the ones that get the half-cell inset.
    expect(first.clippedEnd).toBe(false);
    expect(second.clippedStart).toBe(false);
  });
});
