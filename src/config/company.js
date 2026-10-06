// The rental company's details, as printed on contracts. This is the only
// place client-specific company data lives for the dashboard, so another
// client reuses the system by editing this file (and
// src/content/contractTemplate.js for the wording).
//
// commercialRegister, taxNumber and representative are optional: leave
// them as "" (or "لا يوجد") and the matching contract header lines are
// simply not printed.
export const company = {
  name: "المنشاوي لإيجار السيارات",
  address: "شارع البنوك، خلف هاني مكس، الغردقة",
  phone: "01229082268 - 01090881078",
  commercialRegister: "",
  taxNumber: "",
  representative: "",
};
