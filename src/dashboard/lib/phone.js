// wa.me needs the full international number as digits only (no "+",
// spaces or leading zeros). Customers' numbers are typed by hand, so:
//   "+48 602 359 939" -> "48602359939"   (already international)
//   "0048602359939"   -> "48602359939"   (00 international prefix)
//   "01004090013"     -> "201004090013"  (Egyptian local mobile -> +20)
// Arabic-Indic digits are converted too. Returns null when there's
// nothing usable to link to.
export function whatsappNumber(phone) {
  if (!phone) return null;
  const digits = String(phone)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) return digits.slice(2);
  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(phone) {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}
