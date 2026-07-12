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

module.exports = { TESTS, matchTest, getByKey };
