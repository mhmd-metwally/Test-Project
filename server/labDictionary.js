'use strict';

/**
 * Dictionary of common lab tests.
 *
 * Each entry maps a canonical test to:
 *  - key       : stable identifier used for grouping across reports
 *  - name      : display name (English)
 *  - category  : grouping used in the dashboard
 *  - unit      : typical unit (used only as a fallback when the PDF omits it)
 *  - ref       : { low, high } default reference range (fallback only)
 *  - aliases   : lowercase strings that may appear in a PDF for this test
 *
 * Reference ranges are GENERIC adult ranges meant only as a sensible default
 * when a report does not print its own range. The range printed on the report
 * always wins. These are NOT medical advice.
 */

const TESTS = [
  // ---- Complete Blood Count (CBC) ----
  { key: 'hemoglobin', name: 'Hemoglobin', category: 'CBC', unit: 'g/dL', ref: { low: 13, high: 17 },
    aliases: ['hemoglobin', 'haemoglobin', 'hgb', 'hb'] },
  { key: 'hematocrit', name: 'Hematocrit', category: 'CBC', unit: '%', ref: { low: 40, high: 50 },
    aliases: ['hematocrit', 'haematocrit', 'hct', 'pcv'] },
  { key: 'wbc', name: 'WBC (White Blood Cells)', category: 'CBC', unit: '10^3/uL', ref: { low: 4, high: 11 },
    aliases: ['wbc', 'white blood cells', 'white blood cell', 'leucocytes', 'leukocytes', 'total leucocytic count', 'tlc'] },
  { key: 'rbc', name: 'RBC (Red Blood Cells)', category: 'CBC', unit: '10^6/uL', ref: { low: 4.5, high: 5.9 },
    aliases: ['rbc', 'red blood cells', 'red blood cell', 'erythrocytes'] },
  { key: 'platelets', name: 'Platelets', category: 'CBC', unit: '10^3/uL', ref: { low: 150, high: 450 },
    aliases: ['platelets', 'platelet count', 'plt'] },
  { key: 'mcv', name: 'MCV', category: 'CBC', unit: 'fL', ref: { low: 80, high: 100 }, aliases: ['mcv'] },
  { key: 'mch', name: 'MCH', category: 'CBC', unit: 'pg', ref: { low: 27, high: 33 }, aliases: ['mch'] },
  { key: 'mchc', name: 'MCHC', category: 'CBC', unit: 'g/dL', ref: { low: 32, high: 36 }, aliases: ['mchc'] },

  // ---- Diabetes / Glucose ----
  { key: 'glucose_fasting', name: 'Glucose (Fasting)', category: 'Diabetes', unit: 'mg/dL', ref: { low: 70, high: 100 },
    aliases: ['fasting blood glucose', 'fasting blood sugar', 'glucose fasting', 'fasting glucose', 'fbs', 'fbg', 'glucose, fasting'] },
  { key: 'glucose_pp', name: 'Glucose (Post Prandial)', category: 'Diabetes', unit: 'mg/dL', ref: { low: 70, high: 140 },
    aliases: ['post prandial', 'postprandial', 'pp glucose', '2 hour glucose', 'random blood sugar', 'rbs'] },
  { key: 'hba1c', name: 'HbA1c', category: 'Diabetes', unit: '%', ref: { low: 4, high: 5.7 },
    aliases: ['hba1c', 'hb a1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c'] },

  // ---- Lipid Profile ----
  { key: 'cholesterol_total', name: 'Total Cholesterol', category: 'Lipids', unit: 'mg/dL', ref: { low: 0, high: 200 },
    aliases: ['total cholesterol', 'cholesterol total', 'cholesterol, total', 'serum cholesterol', 'cholesterol'] },
  { key: 'hdl', name: 'HDL Cholesterol', category: 'Lipids', unit: 'mg/dL', ref: { low: 40, high: 200 },
    aliases: ['hdl', 'hdl cholesterol', 'hdl-c', 'high density lipoprotein'] },
  { key: 'ldl', name: 'LDL Cholesterol', category: 'Lipids', unit: 'mg/dL', ref: { low: 0, high: 130 },
    aliases: ['ldl', 'ldl cholesterol', 'ldl-c', 'low density lipoprotein'] },
  { key: 'triglycerides', name: 'Triglycerides', category: 'Lipids', unit: 'mg/dL', ref: { low: 0, high: 150 },
    aliases: ['triglycerides', 'triglyceride', 'tg'] },
  { key: 'vldl', name: 'VLDL Cholesterol', category: 'Lipids', unit: 'mg/dL', ref: { low: 0, high: 30 },
    aliases: ['vldl', 'vldl cholesterol'] },

  // ---- Kidney ----
  { key: 'creatinine', name: 'Creatinine', category: 'Kidney', unit: 'mg/dL', ref: { low: 0.7, high: 1.3 },
    aliases: ['creatinine', 'serum creatinine', 'creatinine, serum'] },
  { key: 'urea', name: 'Urea', category: 'Kidney', unit: 'mg/dL', ref: { low: 15, high: 45 },
    aliases: ['urea', 'blood urea', 'serum urea'] },
  { key: 'bun', name: 'BUN', category: 'Kidney', unit: 'mg/dL', ref: { low: 7, high: 20 },
    aliases: ['bun', 'blood urea nitrogen'] },
  { key: 'uric_acid', name: 'Uric Acid', category: 'Kidney', unit: 'mg/dL', ref: { low: 3.5, high: 7.2 },
    aliases: ['uric acid', 'serum uric acid'] },
  { key: 'egfr', name: 'eGFR', category: 'Kidney', unit: 'mL/min', ref: { low: 90, high: 200 },
    aliases: ['egfr', 'gfr', 'estimated gfr'] },

  // ---- Liver ----
  { key: 'alt', name: 'ALT (SGPT)', category: 'Liver', unit: 'U/L', ref: { low: 0, high: 41 },
    aliases: ['alt', 'sgpt', 'alanine aminotransferase', 'alt (sgpt)', 'alt/sgpt'] },
  { key: 'ast', name: 'AST (SGOT)', category: 'Liver', unit: 'U/L', ref: { low: 0, high: 40 },
    aliases: ['ast', 'sgot', 'aspartate aminotransferase', 'ast (sgot)', 'ast/sgot'] },
  { key: 'alp', name: 'ALP (Alkaline Phosphatase)', category: 'Liver', unit: 'U/L', ref: { low: 40, high: 129 },
    aliases: ['alp', 'alkaline phosphatase'] },
  { key: 'bilirubin_total', name: 'Total Bilirubin', category: 'Liver', unit: 'mg/dL', ref: { low: 0.1, high: 1.2 },
    aliases: ['total bilirubin', 'bilirubin total', 'bilirubin, total', 't. bilirubin'] },
  { key: 'bilirubin_direct', name: 'Direct Bilirubin', category: 'Liver', unit: 'mg/dL', ref: { low: 0, high: 0.3 },
    aliases: ['direct bilirubin', 'bilirubin direct', 'd. bilirubin'] },
  { key: 'albumin', name: 'Albumin', category: 'Liver', unit: 'g/dL', ref: { low: 3.5, high: 5.2 },
    aliases: ['albumin', 'serum albumin'] },
  { key: 'total_protein', name: 'Total Protein', category: 'Liver', unit: 'g/dL', ref: { low: 6.4, high: 8.3 },
    aliases: ['total protein', 'total proteins', 'serum protein'] },
  { key: 'ggt', name: 'GGT', category: 'Liver', unit: 'U/L', ref: { low: 0, high: 55 },
    aliases: ['ggt', 'gamma gt', 'gamma-glutamyl transferase'] },

  // ---- Thyroid ----
  { key: 'tsh', name: 'TSH', category: 'Thyroid', unit: 'uIU/mL', ref: { low: 0.4, high: 4.0 },
    aliases: ['tsh', 'thyroid stimulating hormone'] },
  { key: 't3', name: 'T3', category: 'Thyroid', unit: 'ng/dL', ref: { low: 80, high: 200 },
    aliases: ['t3', 'triiodothyronine', 'total t3'] },
  { key: 't4', name: 'T4', category: 'Thyroid', unit: 'ug/dL', ref: { low: 5, high: 12 },
    aliases: ['t4', 'thyroxine', 'total t4'] },
  { key: 'ft3', name: 'Free T3', category: 'Thyroid', unit: 'pg/mL', ref: { low: 2.3, high: 4.2 },
    aliases: ['free t3', 'ft3'] },
  { key: 'ft4', name: 'Free T4', category: 'Thyroid', unit: 'ng/dL', ref: { low: 0.8, high: 1.8 },
    aliases: ['free t4', 'ft4'] },

  // ---- Vitamins & Minerals ----
  { key: 'vitamin_d', name: 'Vitamin D (25-OH)', category: 'Vitamins', unit: 'ng/mL', ref: { low: 30, high: 100 },
    aliases: ['vitamin d', '25-oh vitamin d', '25 hydroxy vitamin d', 'vit d', '25-hydroxyvitamin d'] },
  { key: 'vitamin_b12', name: 'Vitamin B12', category: 'Vitamins', unit: 'pg/mL', ref: { low: 200, high: 900 },
    aliases: ['vitamin b12', 'b12', 'cobalamin', 'vit b12'] },
  { key: 'ferritin', name: 'Ferritin', category: 'Vitamins', unit: 'ng/mL', ref: { low: 30, high: 400 },
    aliases: ['ferritin', 'serum ferritin'] },
  { key: 'iron', name: 'Iron', category: 'Vitamins', unit: 'ug/dL', ref: { low: 60, high: 170 },
    aliases: ['iron', 'serum iron'] },
  { key: 'calcium', name: 'Calcium', category: 'Electrolytes', unit: 'mg/dL', ref: { low: 8.5, high: 10.5 },
    aliases: ['calcium', 'serum calcium', 'total calcium'] },
  { key: 'sodium', name: 'Sodium', category: 'Electrolytes', unit: 'mmol/L', ref: { low: 135, high: 145 },
    aliases: ['sodium', 'na', 'serum sodium'] },
  { key: 'potassium', name: 'Potassium', category: 'Electrolytes', unit: 'mmol/L', ref: { low: 3.5, high: 5.1 },
    aliases: ['potassium', 'k', 'serum potassium'] },
  { key: 'chloride', name: 'Chloride', category: 'Electrolytes', unit: 'mmol/L', ref: { low: 98, high: 107 },
    aliases: ['chloride', 'cl', 'serum chloride'] },
  { key: 'magnesium', name: 'Magnesium', category: 'Electrolytes', unit: 'mg/dL', ref: { low: 1.7, high: 2.2 },
    aliases: ['magnesium', 'serum magnesium', 'mg'] },
  { key: 'phosphorus', name: 'Phosphorus', category: 'Electrolytes', unit: 'mg/dL', ref: { low: 2.5, high: 4.5 },
    aliases: ['phosphorus', 'phosphate', 'serum phosphorus'] },

  // ---- Inflammation / Other ----
  { key: 'crp', name: 'CRP', category: 'Inflammation', unit: 'mg/L', ref: { low: 0, high: 5 },
    aliases: ['crp', 'c-reactive protein', 'c reactive protein', 'hs-crp'] },
  { key: 'esr', name: 'ESR', category: 'Inflammation', unit: 'mm/hr', ref: { low: 0, high: 20 },
    aliases: ['esr', 'erythrocyte sedimentation rate', 'sed rate'] },
];

// Build a fast alias -> test lookup. Longer aliases are matched first so that
// e.g. "total cholesterol" wins over "cholesterol".
const ALIAS_INDEX = [];
for (const test of TESTS) {
  for (const alias of test.aliases) {
    ALIAS_INDEX.push({ alias: alias.toLowerCase(), test });
  }
}
ALIAS_INDEX.sort((a, b) => b.alias.length - a.alias.length);

const BY_KEY = new Map(TESTS.map((t) => [t.key, t]));

/**
 * Try to match a raw test-name string coming from a PDF to a canonical test.
 * Returns the canonical test object or null.
 */
function matchTest(rawName) {
  if (!rawName) return null;
  const norm = rawName.toLowerCase().replace(/\s+/g, ' ').trim();
  // 1) exact alias match
  for (const { alias, test } of ALIAS_INDEX) {
    if (norm === alias) return test;
  }
  // 2) whole-word contained alias (guard short aliases against false hits)
  for (const { alias, test } of ALIAS_INDEX) {
    if (alias.length < 3) continue;
    const re = new RegExp(`(^|[^a-z])${escapeRegExp(alias)}([^a-z]|$)`, 'i');
    if (re.test(norm)) return test;
  }
  return null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getByKey(key) {
  return BY_KEY.get(key) || null;
}

// Plain-language explanation for each test, shown on the detail screen.
// Keep these short, general, and non-diagnostic.
const DESCRIPTIONS = {
  hemoglobin: { en: 'The protein in red blood cells that carries oxygen. Low levels can mean anemia; very high can mean dehydration or other conditions.', ar: 'البروتين اللي في كرات الدم الحمرا وبينقل الأكسجين. نقصه ممكن يعني أنيميا، وارتفاعه الشديد ممكن يكون جفاف أو أسباب تانية.' },
  hematocrit: { en: 'The percentage of your blood made up of red blood cells. Tracks closely with hemoglobin.', ar: 'نسبة كرات الدم الحمرا في الدم. بتتغير مع الهيموجلوبين.' },
  wbc: { en: 'White blood cells fight infection. High can signal infection or inflammation; low can mean a weakened immune response.', ar: 'كرات الدم البيضا بتحارب العدوى. ارتفاعها ممكن يعني عدوى أو التهاب، ونقصها ممكن يعني مناعة ضعيفة.' },
  rbc: { en: 'The number of red blood cells that carry oxygen around the body.', ar: 'عدد كرات الدم الحمرا اللي بتنقل الأكسجين في الجسم.' },
  platelets: { en: 'Cell fragments that help blood clot. Low levels raise bleeding risk; high levels can raise clotting risk.', ar: 'أجزاء خلايا بتساعد الدم يتجلط. نقصها بيزود خطر النزيف، وزيادتها ممكن تزود خطر الجلطات.' },
  mcv: { en: 'Average size of your red blood cells. Helps classify the type of anemia.', ar: 'متوسط حجم كرات الدم الحمرا. بيساعد في تحديد نوع الأنيميا.' },
  mch: { en: 'Average amount of hemoglobin per red blood cell.', ar: 'متوسط كمية الهيموجلوبين في كل كرة دم حمرا.' },
  mchc: { en: 'Concentration of hemoglobin inside red blood cells.', ar: 'تركيز الهيموجلوبين جوه كرات الدم الحمرا.' },
  glucose_fasting: { en: 'Blood sugar after not eating for 8+ hours. A key screen for diabetes and prediabetes.', ar: 'مستوى السكر في الدم بعد صيام 8 ساعات أو أكتر. من أهم فحوصات السكري وما قبل السكري.' },
  glucose_pp: { en: 'Blood sugar measured about 2 hours after a meal.', ar: 'مستوى السكر بعد الأكل بساعتين تقريبًا.' },
  hba1c: { en: 'Your average blood sugar over the past ~3 months. The main test for long-term diabetes control.', ar: 'متوسط السكر خلال آخر ٣ شهور تقريبًا. الفحص الأساسي لمتابعة التحكم في السكري على المدى الطويل.' },
  cholesterol_total: { en: 'Total cholesterol in your blood. Part of assessing heart-disease risk.', ar: 'إجمالي الكوليسترول في الدم. جزء من تقييم خطر أمراض القلب.' },
  hdl: { en: '“Good” cholesterol — higher is generally better; it helps remove other cholesterol.', ar: 'الكوليسترول «النافع» — كل ما زاد كل ما كان أحسن؛ بيساعد في التخلص من الكوليسترول الضار.' },
  ldl: { en: '“Bad” cholesterol — high levels can build up in arteries and raise heart risk.', ar: 'الكوليسترول «الضار» — ارتفاعه ممكن يترسب في الشرايين ويزود خطر القلب.' },
  triglycerides: { en: 'A type of fat in the blood. High levels are linked to heart risk.', ar: 'نوع من الدهون في الدم. ارتفاعه مرتبط بخطر أمراض القلب.' },
  vldl: { en: 'A cholesterol type that mostly carries triglycerides.', ar: 'نوع من الكوليسترول بينقل الدهون الثلاثية غالبًا.' },
  creatinine: { en: 'A waste product filtered by the kidneys. High levels can indicate reduced kidney function.', ar: 'فضلات بتتخلص منها الكلى. ارتفاعه ممكن يدل على ضعف وظائف الكلى.' },
  urea: { en: 'A waste product from protein breakdown, cleared by the kidneys.', ar: 'فضلات ناتجة من تكسير البروتين، الكلى بتتخلص منها.' },
  bun: { en: 'Blood urea nitrogen — another marker of kidney function and hydration.', ar: 'نيتروجين اليوريا في الدم — مؤشر تاني لوظائف الكلى والترطيب.' },
  uric_acid: { en: 'A waste product; high levels can cause gout or kidney stones.', ar: 'فضلات؛ ارتفاعها ممكن يسبب النقرس أو حصوات الكلى.' },
  egfr: { en: 'An estimate of how well your kidneys filter blood. Lower means reduced function.', ar: 'تقدير لكفاءة الكلى في تنقية الدم. القيمة الأقل تعني وظيفة أضعف.' },
  alt: { en: 'A liver enzyme. High levels can indicate liver stress or damage.', ar: 'إنزيم من الكبد. ارتفاعه ممكن يدل على إجهاد أو ضرر في الكبد.' },
  ast: { en: 'A liver (and muscle) enzyme; often checked alongside ALT.', ar: 'إنزيم من الكبد (والعضلات)؛ بيتقاس غالبًا مع ALT.' },
  alp: { en: 'An enzyme related to the liver and bones.', ar: 'إنزيم مرتبط بالكبد والعظام.' },
  bilirubin_total: { en: 'A yellow pigment from red-cell breakdown; high levels can cause jaundice.', ar: 'صبغة صفرا ناتجة من تكسير كرات الدم؛ ارتفاعها ممكن يسبب الصفرا (اليرقان).' },
  bilirubin_direct: { en: 'The processed form of bilirubin handled by the liver.', ar: 'الصورة المعالَجة من البيليروبين اللي بيتعامل معاها الكبد.' },
  albumin: { en: 'The main protein made by the liver; reflects liver and nutrition status.', ar: 'البروتين الأساسي اللي بيصنعه الكبد؛ بيعكس حالة الكبد والتغذية.' },
  total_protein: { en: 'The total of all proteins in your blood.', ar: 'إجمالي البروتينات في الدم.' },
  ggt: { en: 'A liver enzyme sensitive to bile-duct issues and alcohol.', ar: 'إنزيم من الكبد حساس لمشاكل القنوات المرارية والكحول.' },
  tsh: { en: 'The hormone that controls your thyroid. High can mean an underactive thyroid; low an overactive one.', ar: 'الهرمون اللي بيتحكم في الغدة الدرقية. ارتفاعه ممكن يعني خمول، ونقصه نشاط زائد.' },
  t3: { en: 'A thyroid hormone that regulates metabolism.', ar: 'هرمون درقي بينظم التمثيل الغذائي.' },
  t4: { en: 'The main thyroid hormone; works with TSH and T3.', ar: 'الهرمون الدرقي الأساسي؛ بيشتغل مع TSH و T3.' },
  ft3: { en: 'The free, active form of T3.', ar: 'الصورة الحرة النشطة من T3.' },
  ft4: { en: 'The free, active form of T4.', ar: 'الصورة الحرة النشطة من T4.' },
  vitamin_d: { en: 'Supports bones and immunity. Deficiency is very common.', ar: 'بيدعم العظام والمناعة. نقصه شائع جدًا.' },
  vitamin_b12: { en: 'Needed for nerves and red blood cells. Low levels can cause fatigue and anemia.', ar: 'مهم للأعصاب وكرات الدم الحمرا. نقصه ممكن يسبب إرهاق وأنيميا.' },
  ferritin: { en: 'Reflects your body’s iron stores. Low means iron deficiency.', ar: 'بيعكس مخزون الحديد في الجسم. نقصه يعني نقص حديد.' },
  iron: { en: 'The amount of iron circulating in your blood.', ar: 'كمية الحديد الموجودة في الدم.' },
  calcium: { en: 'Important for bones, muscles, and nerves.', ar: 'مهم للعظام والعضلات والأعصاب.' },
  sodium: { en: 'An electrolyte that controls fluid balance.', ar: 'من الأملاح اللي بتتحكم في توازن السوائل.' },
  potassium: { en: 'An electrolyte important for the heart and muscles.', ar: 'من الأملاح المهمة للقلب والعضلات.' },
  chloride: { en: 'An electrolyte that helps maintain fluid and acid balance.', ar: 'من الأملاح اللي بتساعد في توازن السوائل والحموضة.' },
  magnesium: { en: 'A mineral important for muscles, nerves, and energy.', ar: 'معدن مهم للعضلات والأعصاب والطاقة.' },
  phosphorus: { en: 'A mineral that works with calcium for bone health.', ar: 'معدن بيشتغل مع الكالسيوم لصحة العظام.' },
  crp: { en: 'A marker of inflammation in the body. High levels can signal infection or inflammation.', ar: 'مؤشر للالتهاب في الجسم. ارتفاعه ممكن يدل على عدوى أو التهاب.' },
  esr: { en: 'Another general marker of inflammation.', ar: 'مؤشر عام تاني للالتهاب.' },
};

function getDescription(key, lang) {
  const d = DESCRIPTIONS[key];
  if (!d) return null;
  return lang === 'en' ? d.en : d.ar;
}

module.exports = { TESTS, matchTest, getByKey, getDescription, DESCRIPTIONS };
