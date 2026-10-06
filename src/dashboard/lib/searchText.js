// Shared text normalization for every dashboard search box, so the Cars
// and Bookings pages (and anything later) match the same way.

// Every combining mark (Arabic tashkeel, hamza marks left by NFKD, Latin
// accents) plus tatweel.
const MARKS = /[\p{M}\u0640]/gu;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Lowercase, strip diacritics, treat Arabic letter variants as equal
// (أ إ آ ٱ → ا, ى → ي, ة → ه), turn Arabic-Indic digits into Western
// ones, and collapse runs of whitespace. NFKD first, so letters carrying
// a separate hamza/diacritic are reduced to their base letter.
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const stripSpacesAndDashes = (text) => text.replace(/[\s-]/g, "");

// Two ways to match, either is enough:
//
// 1. Words: the query is split on spaces and EVERY word must appear
//    somewhere in `fields` (joined with spaces), in any order — so
//    "هيونداي Ad", "Ad هيونداي" and "ابراهيم 2027" all work.
// 2. Strict fields (plate, phone, ID number…): the whole query with spaces
//    and dashes removed must appear inside ONE of `strictFields`, also
//    with spaces and dashes removed. So "أبج1234" finds a plate saved as
//    "أ ب ج 1234" and "010 1234" finds "01012345678", without the
//    single letters of a plate query matching loosely across other
//    fields. Strict fields are not part of the word search.
//
// An empty query matches everything.
export function matchesQuery(fields, query, strictFields = []) {
  const needle = normalizeText(query);
  if (!needle) return true;

  const haystack = normalizeText(
    fields.filter((value) => value != null && value !== "").join(" "),
  );
  if (needle.split(" ").every((word) => haystack.includes(word))) return true;

  const compactNeedle = stripSpacesAndDashes(needle);
  return (
    compactNeedle !== "" &&
    strictFields.some(
      (value) =>
        value != null &&
        value !== "" &&
        stripSpacesAndDashes(normalizeText(value)).includes(compactNeedle),
    )
  );
}

// Car fields for the word search: "make model" together, year, owner and
// color. The plate is separate (see carStrictFields).
export function carSearchFields(car) {
  if (!car) return [];
  return [
    [car.make, car.model].filter(Boolean).join(" "),
    car.year,
    car.owner_name,
    car.color,
  ];
}

// Car fields that are matched strictly as a whole string.
export function carStrictFields(car) {
  return car ? [car.plate_number] : [];
}
