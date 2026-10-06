import { describe, expect, it } from "vitest";
import { carSearchFields, carStrictFields, matchesQuery, normalizeText } from "./searchText";

describe("normalizeText", () => {
  it("treats Arabic letter variants as equal", () => {
    expect(normalizeText("هيونداى")).toBe(normalizeText("هيونداي"));
    expect(normalizeText("إبراهيم أحمد آمنة")).toBe("ابراهيم احمد امنه");
    expect(normalizeText("مدرسة")).toBe("مدرسه");
  });

  it("ignores diacritics and tatweel", () => {
    expect(normalizeText("مُحَمَّد")).toBe("محمد");
    expect(normalizeText("مـحـمد")).toBe("محمد");
  });

  it("lowercases, trims, collapses spaces and converts Arabic digits", () => {
    expect(normalizeText("  Hyundai   AD ")).toBe("hyundai ad");
    expect(normalizeText("١٢٣٤")).toBe("1234");
  });

  it("handles empty values", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("matchesQuery", () => {
  const car = {
    make: "هيونداي",
    model: "Ad",
    year: 2027,
    owner_name: "إبراهيم محمد",
    plate_number: "أ ب ج 1234",
    color: "أبيض",
  };
  const matches = (query) => matchesQuery(carSearchFields(car), query, carStrictFields(car));

  it("matches every word, in any order", () => {
    expect(matches("هيونداي Ad")).toBe(true);
    expect(matches("Ad هيونداي")).toBe(true);
    expect(matches("محمد ابراهيم 2027")).toBe(true);
  });

  it("fails when any word is missing", () => {
    expect(matches("هيونداي تويوتا")).toBe(false);
  });

  it("matches the plate as a whole string, ignoring spaces and dashes", () => {
    expect(matches("أبج1234")).toBe(true);
    expect(matches("ا ب ج-1234")).toBe(true);
    expect(matches("1234")).toBe(true);
  });

  it("keeps plate matching strict: another car's plate does not match", () => {
    const other = {
      make: "كيا",
      model: "سبورتاج",
      owner_name: "سمير",
      plate_number: "س ص ع 9876",
    };
    expect(matchesQuery(carSearchFields(other), "ا ب ج 1234", carStrictFields(other))).toBe(false);
  });

  it("matches a phone typed with different spacing via strict fields", () => {
    expect(matchesQuery([], "010 1234", ["01012345678"])).toBe(true);
    expect(matchesQuery([], "01012345678", ["010 1234 5678"])).toBe(true);
  });

  it("matches everything for an empty query", () => {
    expect(matches("")).toBe(true);
    expect(matches("   ")).toBe(true);
  });
});
