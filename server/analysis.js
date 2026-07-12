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

  const insights = buildInsights(byTest, tests);

  return { counters, categories, tests, insights };
}

/**
 * How far outside its range a value sits, as a fraction of the range width.
 * Used to flag values that are markedly out of range ("danger").
 */
function severity(value, refLow, refHigh) {
  if (refLow == null || refHigh == null || refHigh <= refLow) return 0;
  const width = refHigh - refLow;
  if (value > refHigh) return (value - refHigh) / width;
  if (value < refLow) return (refLow - value) / width;
  return 0;
}

// Distance from the middle of the healthy range (lower = closer to ideal).
function distanceFromIdeal(value, refLow, refHigh) {
  if (refLow == null || refHigh == null) return null;
  const mid = (refLow + refHigh) / 2;
  const width = refHigh - refLow || 1;
  return Math.abs(value - mid) / width;
}

/**
 * Turn the history into human-friendly insights:
 *  - attention: tests whose latest value is out of range
 *  - danger:    tests markedly out of range
 *  - improved:  moved back toward the healthy range vs. the previous test
 *  - worsened:  moved further from the healthy range vs. the previous test
 */
function buildInsights(byTest, tests) {
  const attention = [];
  const danger = [];
  const improved = [];
  const worsened = [];

  for (const t of tests) {
    if (t.status === 'high' || t.status === 'low') {
      attention.push(pick(t));
      if (severity(t.value, t.ref_low, t.ref_high) >= 1) danger.push(pick(t));
    }
    const series = byTest.get(t.id);
    if (series && series.length > 1) {
      const latest = series[series.length - 1];
      const prev = series[series.length - 2];
      const dNow = distanceFromIdeal(latest.value, latest.ref_low, latest.ref_high);
      const dPrev = distanceFromIdeal(prev.value, prev.ref_low, prev.ref_high);
      if (dNow != null && dPrev != null) {
        const changed = Math.abs(dNow - dPrev) > 0.02;
        if (changed && dNow < dPrev) improved.push(pick(t));
        else if (changed && dNow > dPrev) worsened.push(pick(t));
      }
    }
  }

  danger.sort((a, b) => severity(b.value, b.ref_low, b.ref_high) - severity(a.value, a.ref_low, a.ref_high));
  return { attention, danger, improved, worsened };
}

function pick(t) {
  return {
    id: t.id, test_key: t.test_key, test_name: t.test_name, category: t.category,
    value: t.value, unit: t.unit, ref_low: t.ref_low, ref_high: t.ref_high,
    ref_text: t.ref_text, status: t.status, trend: t.trend, delta: t.delta, date: t.date,
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

module.exports = { statusOf, severity, buildDashboard };
