// THE CONTRACT TEXT — edit the wording here, nothing else needs to change.
//
// • {{placeholders}} are filled from the booking, the car and
//   src/config/company.js. A placeholder whose value is empty (or that
//   doesn't exist) prints as a blank line to fill in by hand — never as
//   "undefined" and never as raw {{...}}.
// • Articles are numbered automatically ("بند (1):" …). Add, remove or
//   reorder strings in `articles` and the numbers follow.
// • An item written as { text, onlyIf: "key" } is printed only when that
//   placeholder has a value (used for the optional company header lines).
// • Terminology: التسليم = pickup_date, الاستلام = return_date; the
//   customer giving the car back is "رد السيارة".
//
// Available placeholders:
//   contract_number, contract_date (= delivery date),
//   company_name, company_address, company_phone,
//   company_commercial_register, company_tax_number, company_representative,
//   customer_name, customer_id_number, customer_phone, customer_address,
//   customer_license_number,
//   car_name (make), car_model, car_year, car_color, car_plate,
//   pickup_date (تاريخ التسليم), return_date (تاريخ الاستلام),
//   rental_days (number), rental_days_text ("يوم واحد" / "يومان" / "5 أيام" / "12 يومًا"), daily_rate, total_amount, deposit_amount,
//   odometer_out, fuel_level_out, notes
//
// This is a first draft; have a lawyer review the final wording.
export const contractTemplate = {
  title: "عقد إيجار سيارة",

  headerLines: [
    "رقم العقد: {{contract_number}}",
    { text: "السجل التجاري: {{company_commercial_register}}", onlyIf: "company_commercial_register" },
    { text: "الرقم الضريبي: {{company_tax_number}}", onlyIf: "company_tax_number" },
    { text: "يمثله: {{company_representative}}", onlyIf: "company_representative" },
  ],

  opening: "تحرر هذا العقد في {{contract_date}} بين كل من:",

  parties: [
    "الطرف الأول (المؤجر): {{company_name}}، وعنوانه: {{company_address}}، تليفون: {{company_phone}}.",
    "الطرف الثاني (المستأجر): السيد/ {{customer_name}}، رقم البطاقة أو جواز السفر: {{customer_id_number}}، رقم رخصة القيادة: {{customer_license_number}}، تليفون: {{customer_phone}}، العنوان: {{customer_address}}.",
  ],

  car: {
    heading: "بيانات السيارة المؤجرة:",
    lines: [
      "السيارة: {{car_name}} {{car_model}} - سنة الصنع: {{car_year}} - اللون: {{car_color}} - رقم اللوحة: {{car_plate}}",
      "قراءة العداد عند التسليم: {{odometer_out}} كم - مستوى الوقود عند التسليم: {{fuel_level_out}}",
    ],
  },

  // Printed as "بند (1):", "بند (2):" … in order.
  articleHeading: "بند ({{article_number}}):",
  articles: [
    "يؤجر الطرف الأول للطرف الثاني السيارة الموضحة بياناتها أعلاه، ويقر الطرف الثاني بأنه تم تسليم السيارة إليه بحالة جيدة وصالحة للاستخدام بعد معاينتها المعاينة التامة النافية للجهالة.",
    "مدة الإيجار {{rental_days_text}}، تبدأ من {{pickup_date}} (تاريخ التسليم) وتنتهي في {{return_date}} (تاريخ الاستلام)، ويلتزم الطرف الثاني برد السيارة للطرف الأول في تاريخ الاستلام المحدد وفي نفس المكان الذي تم تسليمها منه ما لم يتفق على غير ذلك كتابة.",
    "القيمة الإيجارية اليومية {{daily_rate}} جنيه مصري، وإجمالي قيمة الإيجار {{total_amount}} جنيه مصري.",
    "سدد الطرف الثاني مبلغ {{deposit_amount}} جنيه مصري كتأمين، ويُرد له عند استلام الطرف الأول للسيارة بحالتها بعد خصم أي مستحقات أو مخالفات أو أضرار تكون قد لحقت بالسيارة.",
    "في حالة تأخر الطرف الثاني عن رد السيارة في تاريخ الاستلام المحدد، يلتزم بسداد قيمة إيجار اليوم عن كل يوم تأخير، ويجوز للطرف الأول اتخاذ ما يراه من إجراءات لاسترداد السيارة.",
    "يلتزم الطرف الثاني بالمحافظة على السيارة واستعمالها الاستعمال الشخصي العادي، ولا يجوز له تأجيرها من الباطن أو إعارتها أو السماح لغيره بقيادتها دون موافقة كتابية من الطرف الأول، كما لا يجوز استخدامها في السباقات أو نقل البضائع الممنوعة أو أي نشاط مخالف للقانون.",
    "يلتزم الطرف الثاني برد السيارة بنفس مستوى الوقود المسجل عند التسليم، ويتحمل تكلفة الوقود طوال مدة الإيجار.",
    "يتحمل الطرف الثاني قيمة جميع المخالفات المرورية والغرامات التي تقع على السيارة خلال مدة الإيجار، وجميع الأضرار أو الفقد أو التلفيات التي تلحق بالسيارة بسبب سوء الاستخدام أو الإهمال، ويتحمل تكلفة الإصلاح كاملة في حالة الحوادث التي يكون هو المتسبب فيها.",
    "في حالة حدوث عطل أو حادث، يلتزم الطرف الثاني بإخطار الطرف الأول فورًا، ولا يجوز له إصلاح السيارة إلا بموافقة الطرف الأول.",
    "ملاحظات إضافية: {{notes}}",
    "تختص المحاكم المختصة بنظر أي نزاع ينشأ عن هذا العقد، وقد تحرر هذا العقد من نسختين بيد كل طرف نسخة للعمل بموجبها.",
  ],

  // Left blank on purpose: both parties fill these in by hand.
  signatures: {
    heading: "التوقيعات:",
    columns: [
      {
        title: "الطرف الأول (المؤجر)",
        lines: ["الاسم / ....................", "التوقيع / .................."],
      },
      {
        title: "الطرف الثاني (المستأجر)",
        lines: ["الاسم / ....................", "التوقيع / .................."],
      },
    ],
  },
};
