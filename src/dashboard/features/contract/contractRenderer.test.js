import { describe, expect, it } from "vitest";
import { contractTemplate } from "../../../content/contractTemplate";
import { company } from "../../../config/company";
import {
  PLACEHOLDER_KEYS,
  buildContract,
  buildContractData,
  formatContractDate,
  hasValue,
  renderTemplate,
} from "./contractRenderer";

// Flattens segments to plain text; a blank line shows as "____".
const flat = (segments) =>
  segments.map((segment) => (segment.type === "blank" ? "____" : segment.value)).join("");

function documentText(contract) {
  return [
    contract.title,
    ...contract.headerLines.map(flat),
    flat(contract.opening),
    ...contract.parties.map(flat),
    contract.carHeading,
    ...contract.carLines.map(flat),
    ...contract.articles.map((a) => `${flat(a.heading)} ${flat(a.segments)}`),
  ].join("\n");
}

const fullBooking = {
  contract_number: 1005,
  customer_name: "أحمد محمد",
  customer_id_number: "29001011234567",
  customer_phone: "01012345678",
  customer_address: "الغردقة",
  customer_license_number: "L-998877",
  pickup_date: "2026-10-10",
  return_date: "2026-10-15",
  daily_rate: 1000,
  deposit_amount: 2000,
  odometer_out: 45210,
  fuel_level_out: "three_quarters",
  notes: "سيارة نظيفة",
  cars: {
    make: "هيونداي",
    model: "Ad",
    year: 2027,
    color: "أبيض",
    plate_number: "أ ب ج 1234",
    owner_name: "اسم المالك",
  },
};

// A legacy booking: only what the old form stored.
const legacyBooking = {
  contract_number: 1001,
  customer_name: "عميل قديم",
  customer_phone: "01099999999",
  pickup_date: "2026-09-01",
  return_date: "2026-09-04",
  cars: { model: "Ad" },
};

describe("renderTemplate", () => {
  it("fills placeholders, including ones with inner spaces and repeats", () => {
    const segments = renderTemplate("أ {{a}} ب {{ b }} ج {{a}}", { a: "1", b: "2" });
    expect(flat(segments)).toBe("أ 1 ب 2 ج 1");
  });

  it("turns missing, empty, null and unknown values into blanks", () => {
    const segments = renderTemplate("{{empty}}|{{nothing}}|{{spaces}}|{{unknown}}", {
      empty: "",
      nothing: null,
      spaces: "   ",
    });
    expect(segments.filter((s) => s.type === "blank")).toHaveLength(4);
    expect(flat(segments)).toBe("____|____|____|____");
  });

  it("never prints 'undefined', 'null', or raw braces", () => {
    const out = flat(renderTemplate("x {{a}} y {{broken z {{ }} w", { a: undefined }));
    expect(out).not.toMatch(/undefined|null|\{\{|\}\}/);
  });

  it("ignores inherited keys like {{constructor}}", () => {
    expect(flat(renderTemplate("{{constructor}}", {}))).toBe("____");
  });

  it("keeps plain text without placeholders unchanged", () => {
    expect(flat(renderTemplate("نص عادي", {}))).toBe("نص عادي");
  });
});

describe("buildContractData", () => {
  const data = buildContractData({ booking: fullBooking, company });

  it("formats dates as DD/MM/YYYY and uses the delivery date as the contract date", () => {
    expect(data.pickup_date).toBe("10/10/2026");
    expect(data.return_date).toBe("15/10/2026");
    expect(data.contract_date).toBe("10/10/2026");
    expect(formatContractDate("2026-01-05")).toBe("05/01/2026");
  });

  it("computes days as receipt minus delivery, and the total from them", () => {
    expect(data.rental_days).toBe("5");
    expect(data.rental_days_text).toBe("5 أيام");
    expect(data.daily_rate).toBe("1,000");
    expect(data.total_amount).toBe("5,000");
    expect(data.deposit_amount).toBe("2,000");
  });

  it("maps car, fuel and meter fields, with plate but without trim or owner", () => {
    expect(data.car_name).toBe("هيونداي");
    expect(data.car_model).toBe("Ad");
    expect(data.car_plate).toBe("أ ب ج 1234");
    expect(data.fuel_level_out).toBe("ثلاثة أرباع");
    expect(data.odometer_out).toBe("45,210");
    expect(Object.keys(data)).not.toContain("car_trim");
    expect(JSON.stringify(data)).not.toContain("اسم المالك");
  });

  it("leaves optional and unpriced values empty for a legacy booking", () => {
    const legacy = buildContractData({ booking: legacyBooking, company });
    expect(legacy.customer_id_number).toBe("");
    expect(legacy.customer_address).toBe("");
    expect(legacy.customer_license_number).toBe("");
    expect(legacy.daily_rate).toBe("");
    expect(legacy.total_amount).toBe("");
    expect(legacy.odometer_out).toBe("");
    expect(legacy.fuel_level_out).toBe("");
    expect(legacy.notes).toBe("");
    expect(legacy.car_plate).toBe("");
    expect(legacy.rental_days).toBe("3");
    expect(legacy.rental_days_text).toBe("3 أيام");
  });

  it("treats 'لا يوجد' and empty company values as not provided", () => {
    const blank = buildContractData({
      booking: fullBooking,
      company: { ...company, commercialRegister: "لا يوجد", taxNumber: "", representative: " " },
    });
    expect(blank.company_commercial_register).toBe("");
    expect(blank.company_tax_number).toBe("");
    expect(blank.company_representative).toBe("");
    expect(hasValue("لا يوجد")).toBe(false);
    expect(hasValue("123")).toBe(true);
  });

  it("returns every known placeholder key", () => {
    expect(Object.keys(data).sort()).toEqual([...PLACEHOLDER_KEYS].sort());
  });
});

describe("buildContract with the real template", () => {
  it("uses only known placeholders (catches typos when the wording is edited)", () => {
    const used = new Set();
    const collect = (value) => {
      if (typeof value === "string") {
        for (const match of value.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) used.add(match[1]);
      } else if (Array.isArray(value)) {
        value.forEach(collect);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(collect);
      }
    };
    collect(contractTemplate);
    used.delete("article_number"); // supplied by the renderer itself
    const unknown = [...used].filter((key) => !PLACEHOLDER_KEYS.includes(key));
    expect(unknown).toEqual([]);
  });

  it("renders a complete booking with the agreed wording and no gaps", () => {
    const text = documentText(
      buildContract(contractTemplate, buildContractData({ booking: fullBooking, company })),
    );
    expect(text).toContain("رقم العقد: 1005");
    expect(text).toContain("تحرر هذا العقد في 10/10/2026");
    expect(text).toContain("المنشاوي لإيجار السيارات");
    expect(text).toContain("رقم اللوحة: أ ب ج 1234");
    expect(text).toContain("مدة الإيجار 5 أيام، تبدأ من 10/10/2026 (تاريخ التسليم)");
    expect(text).toContain("وتنتهي في 15/10/2026 (تاريخ الاستلام)");
    expect(text).toContain("إجمالي قيمة الإيجار 5,000 جنيه مصري");
    expect(text).toContain("برد السيارة للطرف الأول في تاريخ الاستلام المحدد");
    expect(text).not.toContain("____"); // nothing left blank
    expect(text).not.toContain("اسم المالك"); // owner never printed
    expect(text).not.toMatch(/trim/i);
  });

  it("renders a legacy booking with blanks instead of undefined or raw braces", () => {
    const text = documentText(
      buildContract(contractTemplate, buildContractData({ booking: legacyBooking, company })),
    );
    expect(text).toContain("____"); // fields to fill in by hand
    expect(text).not.toMatch(/undefined|null|NaN|\{\{|\}\}/);
    expect(text).toContain("القيمة الإيجارية اليومية ____ جنيه مصري");
  });

  it("omits the optional company header lines when no value is given", () => {
    const contract = buildContract(
      contractTemplate,
      buildContractData({ booking: fullBooking, company }),
    );
    expect(contract.headerLines).toHaveLength(1); // only the contract number
    const text = documentText(contract);
    expect(text).not.toContain("السجل التجاري");
    expect(text).not.toContain("الرقم الضريبي");
    expect(text).not.toContain("يمثله");
  });

  it("prints those header lines when values are provided", () => {
    const data = buildContractData({
      booking: fullBooking,
      company: { ...company, commercialRegister: "12345", taxNumber: "678-90", representative: "محمود علي" },
    });
    const text = documentText(buildContract(contractTemplate, data));
    expect(text).toContain("السجل التجاري: 12345");
    expect(text).toContain("الرقم الضريبي: 678-90");
    expect(text).toContain("يمثله: محمود علي");
  });

  it("numbers articles in order and renumbers when one is removed", () => {
    const data = buildContractData({ booking: fullBooking, company });
    const full = buildContract(contractTemplate, data);
    expect(full.articles.map((a) => a.number)).toEqual(
      full.articles.map((_, index) => index + 1),
    );
    expect(flat(full.articles[0].heading)).toBe("بند (1):");

    const shorter = buildContract(
      { ...contractTemplate, articles: contractTemplate.articles.slice(1) },
      data,
    );
    expect(shorter.articles).toHaveLength(full.articles.length - 1);
    expect(flat(shorter.articles[0].heading)).toBe("بند (1):");
  });

  it("leaves the signature lines blank for handwriting", () => {
    const contract = buildContract(
      contractTemplate,
      buildContractData({ booking: fullBooking, company }),
    );
    const [first, second] = contract.signatures.columns;
    expect(first.lines.join(" ")).toMatch(/الاسم \/ \.+/);
    expect(first.lines.join(" ")).not.toContain(company.name);
    expect(second.title).toBe("الطرف الثاني (المستأجر)");
  });
});
