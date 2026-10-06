import { describe, expect, it } from "vitest";
import { carLabel } from "./carLabel";

describe("carLabel", () => {
  it("is 'make model year - owner'", () => {
    const car = { make: "هيونداي", model: "Ad", year: 2027, owner_name: "اسم المالك" };
    expect(carLabel(car)).toBe("هيونداي Ad 2027 - اسم المالك");
  });

  it("has no dangling dash without an owner", () => {
    expect(carLabel({ make: "هيونداي", model: "Ad", year: 2027, owner_name: "" })).toBe(
      "هيونداي Ad 2027",
    );
    expect(carLabel({ make: "هيونداي", model: "Ad", year: 2027 })).toBe("هيونداي Ad 2027");
  });

  it("skips missing parts and never shows the plate", () => {
    expect(carLabel({ model: "Ad", plate_number: "أ ب ج 1234" })).toBe("Ad");
  });

  it("shows a dash for a missing car", () => {
    expect(carLabel(null)).toBe("—");
  });
});
