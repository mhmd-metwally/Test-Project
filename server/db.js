'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// DATA_DIR can point to a mounted persistent volume in production so the
// SQLite database survives restarts/redeploys. Defaults to ./data locally.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'medical.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date  TEXT NOT NULL,
    lab_name     TEXT,
    filename     TEXT,
    note         TEXT,
    raw_text     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS results (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id     INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    test_key      TEXT,
    test_name     TEXT NOT NULL,
    category      TEXT,
    value         REAL NOT NULL,
    unit          TEXT,
    ref_low       REAL,
    ref_high      REAL,
    ref_text      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_results_report ON results(report_id);
  CREATE INDEX IF NOT EXISTS idx_results_key ON results(test_key);
  CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);
`);

/* ----------------------------- settings ---------------------------------- */

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
);

function getSetting(key) {
  const row = getSettingStmt.get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  setSettingStmt.run(key, value);
}

/* ------------------------------ reports ---------------------------------- */

const insertReportStmt = db.prepare(`
  INSERT INTO reports (report_date, lab_name, filename, note, raw_text)
  VALUES (@report_date, @lab_name, @filename, @note, @raw_text)
`);

const insertResultStmt = db.prepare(`
  INSERT INTO results (report_id, test_key, test_name, category, value, unit, ref_low, ref_high, ref_text)
  VALUES (@report_id, @test_key, @test_name, @category, @value, @unit, @ref_low, @ref_high, @ref_text)
`);

const saveReport = db.transaction((report, results) => {
  const info = insertReportStmt.run({
    report_date: report.report_date,
    lab_name: report.lab_name || null,
    filename: report.filename || null,
    note: report.note || null,
    raw_text: report.raw_text || null,
  });
  const reportId = info.lastInsertRowid;
  for (const r of results) {
    insertResultStmt.run({
      report_id: reportId,
      test_key: r.test_key || null,
      test_name: r.test_name,
      category: r.category || 'Other',
      value: r.value,
      unit: r.unit || null,
      ref_low: r.ref_low === undefined ? null : r.ref_low,
      ref_high: r.ref_high === undefined ? null : r.ref_high,
      ref_text: r.ref_text || null,
    });
  }
  return reportId;
});

function listReports() {
  return db
    .prepare(
      `SELECT r.id, r.report_date, r.lab_name, r.filename, r.note, r.created_at,
              COUNT(res.id) AS result_count
       FROM reports r
       LEFT JOIN results res ON res.report_id = r.id
       GROUP BY r.id
       ORDER BY r.report_date DESC, r.id DESC`,
    )
    .all();
}

function getReport(id) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!report) return null;
  report.results = db
    .prepare('SELECT * FROM results WHERE report_id = ? ORDER BY category, test_name')
    .all(id);
  return report;
}

function deleteReport(id) {
  return db.prepare('DELETE FROM reports WHERE id = ?').run(id).changes;
}

/* -------------------------- analysis queries ----------------------------- */

// One row per (test, report) with the report date, ordered chronologically.
function getSeriesForTest(keyOrName, byKey = true) {
  const col = byKey ? 'res.test_key' : 'res.test_name';
  return db
    .prepare(
      `SELECT r.id AS report_id, r.report_date, res.value, res.unit,
              res.ref_low, res.ref_high, res.ref_text, res.test_name, res.test_key, res.category
       FROM results res
       JOIN reports r ON r.id = res.report_id
       WHERE ${col} = ?
       ORDER BY r.report_date ASC, r.id ASC`,
    )
    .all(keyOrName);
}

// Distinct tests we have data for, with count and latest value.
function listTests() {
  return db
    .prepare(
      `SELECT
         COALESCE(res.test_key, 'name:' || res.test_name) AS group_id,
         res.test_key,
         res.test_name,
         res.category,
         COUNT(*) AS n,
         MAX(r.report_date) AS latest_date
       FROM results res
       JOIN reports r ON r.id = res.report_id
       GROUP BY group_id
       ORDER BY res.category, res.test_name`,
    )
    .all();
}

// Full latest snapshot: for each test, the most recent value + previous value.
function getAllResultsChrono() {
  return db
    .prepare(
      `SELECT r.report_date, r.id AS report_id,
              res.test_key, res.test_name, res.category,
              res.value, res.unit, res.ref_low, res.ref_high, res.ref_text
       FROM results res
       JOIN reports r ON r.id = res.report_id
       ORDER BY r.report_date ASC, r.id ASC`,
    )
    .all();
}

module.exports = {
  db,
  DATA_DIR,
  getSetting,
  setSetting,
  saveReport,
  listReports,
  getReport,
  deleteReport,
  getSeriesForTest,
  listTests,
  getAllResultsChrono,
};
