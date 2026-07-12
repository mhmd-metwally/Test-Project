'use strict';

const { getAllResultsChrono } = require('./db');

/**
 * Decide whether a value is inside/above/below its reference range.
 * Returns 'high' | 'low' | 'normal' | 'unknown'.
 */
function statusOf(value, refLow, refHigh) {
  if (value === null || value === undefined) return 'unknown';
  const hasLow = refLow !== null && refLow !== undefined;
  const hasHigh = refHigh !== null && refHigh !== undefined;
  if (!hasLow && !hasHigh) return 'unknown';
  if (hasHigh && value > refHigh) return 'high';
  if (hasLow && value < refLow) return 'low';
  return 'normal';
}

/**
 * Build the dashboard snapshot: for every test we track, the latest value,
 * its status, and the trend vs. the previous measurement.
 */
function buildDashboard() {
  const rows = getAllResultsChrono();

  // group chronologically by test
  const byTest = new Map();
  for (const row of rows) {
    const id = row.test_key || `name:${row.test_name}`;
    if (!byTest.has(id)) byTest.set(id, []);
    byTest.get(id).push(row);
  }

  const tests = [];
  const counters = { total: 0, high: 0, low: 0, normal: 0, unknown: 0 };

  for (const [id, series] of byTest.entries()) {
    const latest = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : null;
    const status = statusOf(latest.value, latest.ref_low, latest.ref_high);

    let trend = 'flat';
    let delta = null;
    if (prev) {
      delta = round(latest.value - prev.value);
      if (delta > 0) trend = 'up';
      else if (delta < 0) trend = 'down';
    }

    counters.total += 1;
    counters[status] = (counters[status] || 0) + 1;

    tests.push({
      id,
      test_key: latest.test_key,
      test_name: latest.test_name,
      category: latest.category || 'Other',
      value: latest.value,
      unit: latest.unit,
      ref_low: latest.ref_low,
      ref_high: latest.ref_high,
      ref_text: latest.ref_text,
      status,
      trend,
      delta,
      date: latest.report_date,
      count: series.length,
    });
  }

  // group by category for presentation
  const categories = {};
  for (const t of tests) {
    (categories[t.category] = categories[t.category] || []).push(t);
  }
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => a.test_name.localeCompare(b.test_name));
  }

  return { counters, categories, tests };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

module.exports = { statusOf, buildDashboard };
