import { formatAmount } from "../../lib/format";
import {
  arabicDaysText,
  fuelLevelLabel,
  rentalDays,
  totalAmount,
} from "../bookings/bookingUtils";

// Pure logic that turns a booking + company + the template text into a
// printable structure. No React, no Supabase — so it's unit-tested and the
// wording itself stays in src/content/contractTemplate.js.

// Every {{placeholder}} the template may use. A typo in the template is
// caught by a unit test against this list.
export const PLACEHOLDER_KEYS = [
  "contract_number",
  "contract_date",
  "company_name",
  "company_address",
  "company_phone",
  "company_commercial_register",
  "company_tax_number",
  "company_representative",
  "customer_name",
  "customer_id_number",
  "customer_phone",
  "customer_address",
  "customer_license_number",
  "car_name",
  "car_model",
  "car_year",
  "car_color",
  "car_plate",
  "pickup_date",
  "return_date",
  "rental_days",
  "rental_days_text",
  "daily_rate",
  "total_amount",
  "deposit_amount",
  "odometer_out",
  "fuel_level_out",
  "notes",
];

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const NO_VALUE = "لا يوجد";

const str = (value) => (value == null ? "" : String(value).trim());

// True when a value should be printed: not empty, and not the "none"
// wording someone may type into the company config.
export function hasValue(value) {
  const text = str(value);
  return text !== "" && text !== NO_VALUE;
}

// "2026-10-10" -> "10/10/2026" (Western digits, full year).
export function formatContractDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

// One string per placeholder; "" means "not available" and prints as a
// blank line. Owner name is deliberately not here — it never goes in the
// contract. contract_date is the booking's delivery date.
export function buildContractData({ booking, company }) {
  const car = booking.cars ?? {};
  const days = rentalDays(booking.pickup_date, booking.return_date);
  const hasRate = booking.daily_rate != null && booking.daily_rate !== "";
  const companyValue = (value) => (hasValue(value) ? str(value) : "");

  return {
    contract_number: str(booking.contract_number),
    contract_date: formatContractDate(booking.pickup_date),
    company_name: companyValue(company.name),
    company_address: companyValue(company.address),
    company_phone: companyValue(company.phone),
    company_commercial_register: companyValue(company.commercialRegister),
    company_tax_number: companyValue(company.taxNumber),
    company_representative: companyValue(company.representative),
    customer_name: str(booking.customer_name),
    customer_id_number: str(booking.customer_id_number),
    customer_phone: str(booking.customer_phone),
    customer_address: str(booking.customer_address),
    customer_license_number: str(booking.customer_license_number),
    car_name: str(car.make),
    car_model: str(car.model),
    car_year: str(car.year),
    car_color: str(car.color),
    car_plate: str(car.plate_number),
    pickup_date: formatContractDate(booking.pickup_date),
    return_date: formatContractDate(booking.return_date),
    rental_days: days > 0 ? String(days) : "",
    rental_days_text: arabicDaysText(days),
    daily_rate: hasRate ? formatAmount(booking.daily_rate) : "",
    total_amount:
      hasRate && days > 0
        ? formatAmount(totalAmount(booking.pickup_date, booking.return_date, booking.daily_rate))
        : "",
    deposit_amount: booking.deposit_amount == null ? "" : formatAmount(booking.deposit_amount),
    odometer_out: booking.odometer_out == null ? "" : formatAmount(booking.odometer_out),
    fuel_level_out: fuelLevelLabel(booking.fuel_level_out),
    notes: str(booking.notes),
  };
}

// Replaces {{placeholders}} and returns segments: { type: "text", value }
// or { type: "blank" } (a line to fill in by hand). A placeholder with a
// missing, empty or unknown key becomes a blank, so "undefined" and raw
// {{...}} can never reach the page. Only the data's own keys count, so
// something like {{constructor}} is just a blank.
export function renderTemplate(text, data) {
  const source = str(text);
  const segments = [];
  const pushText = (value) => {
    const clean = value.replace(/\{\{|\}\}/g, "");
    if (clean) segments.push({ type: "text", value: clean });
  };

  let last = 0;
  for (const match of source.matchAll(PLACEHOLDER)) {
    pushText(source.slice(last, match.index));
    const value = Object.hasOwn(data, match[1]) ? str(data[match[1]]) : "";
    segments.push(value ? { type: "text", value } : { type: "blank" });
    last = match.index + match[0].length;
  }
  pushText(source.slice(last));
  return segments;
}

// Applies the template to the data. Items written as { text, onlyIf } are
// dropped when that placeholder has no value; articles are numbered after
// that filtering, so removing one never leaves a gap.
export function buildContract(template, data) {
  const textOf = (item) => (typeof item === "string" ? item : item.text);
  const visible = (item) =>
    typeof item === "string" || !item.onlyIf || hasValue(data[item.onlyIf]);
  const lines = (items = []) =>
    items.filter(visible).map((item) => renderTemplate(textOf(item), data));

  return {
    title: template.title,
    headerLines: lines(template.headerLines),
    opening: renderTemplate(template.opening, data),
    parties: lines(template.parties),
    carHeading: template.car?.heading ?? "",
    carLines: lines(template.car?.lines),
    articles: (template.articles ?? []).filter(visible).map((item, index) => {
      const number = index + 1;
      return {
        number,
        heading: renderTemplate(template.articleHeading, { article_number: number }),
        segments: renderTemplate(textOf(item), data),
      };
    }),
    signatures: template.signatures,
  };
}
