'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const db = require('./db');
const auth = require('./auth');
const { parsePdf } = require('./pdfParser');
const { buildDashboard, statusOf } = require('./analysis');
const { getDescription } = require('./labDictionary');
const { getSeriesForTest, listTests } = db;

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a hosting platform's HTTPS proxy (Render/Railway/Fly), trust it so
// secure session cookies are handled correctly.
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/* ------------------------------- auth API -------------------------------- */

app.get('/api/status', (req, res) => {
  const token = req.cookies && req.cookies[auth.COOKIE_NAME];
  res.json({
    configured: auth.isConfigured(),
    authenticated: !!token && auth.isValidToken(token),
  });
});

// First-run: create the password. Only allowed while not yet configured.
app.post('/api/setup', (req, res) => {
  if (auth.isConfigured()) return res.status(400).json({ error: 'already_configured' });
  try {
    auth.setPassword((req.body || {}).password);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  res
    .cookie(auth.COOKIE_NAME, auth.issueToken(), auth.cookieOptions())
    .json({ ok: true });
});

app.post('/api/login', (req, res) => {
  if (!auth.isConfigured()) return res.status(400).json({ error: 'not_configured' });
  if (!auth.verifyPassword((req.body || {}).password)) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  res
    .cookie(auth.COOKIE_NAME, auth.issueToken(), auth.cookieOptions())
    .json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(auth.COOKIE_NAME).json({ ok: true });
});

/* ----------------------------- protected API ----------------------------- */

const api = express.Router();
api.use(auth.requireAuth);

// Upload + parse a PDF, return extracted results for review (does NOT save).
api.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  try {
    const parsed = await parsePdf(req.file.buffer);
    res.json({
      filename: req.file.originalname,
      reportDate: parsed.reportDate,
      labName: parsed.labName || '',
      results: parsed.results,
      rawText: parsed.text,
    });
  } catch (e) {
    res.status(500).json({ error: 'parse_failed', detail: e.message });
  }
});

// Save a reviewed report + its results.
api.post('/reports', (req, res) => {
  const body = req.body || {};
  if (!body.report_date) return res.status(400).json({ error: 'missing_date' });
  const results = Array.isArray(body.results) ? body.results : [];
  const clean = results
    .filter((r) => r && r.test_name && r.value !== '' && r.value !== null && !Number.isNaN(Number(r.value)))
    .map((r) => ({
      test_key: r.test_key || null,
      test_name: String(r.test_name).trim(),
      category: r.category || 'Other',
      value: Number(r.value),
      unit: r.unit || null,
      ref_low: numOrNull(r.ref_low),
      ref_high: numOrNull(r.ref_high),
      ref_text: r.ref_text || null,
    }));
  if (clean.length === 0) return res.status(400).json({ error: 'no_results' });

  const id = db.saveReport(
    {
      report_date: body.report_date,
      lab_name: body.lab_name,
      filename: body.filename,
      note: body.note,
      raw_text: body.raw_text,
    },
    clean,
  );
  res.json({ ok: true, id });
});

api.get('/reports', (req, res) => res.json(db.listReports()));

api.get('/reports/:id', (req, res) => {
  const report = db.getReport(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'not_found' });
  res.json(report);
});

api.delete('/reports/:id', (req, res) => {
  const changes = db.deleteReport(Number(req.params.id));
  res.json({ ok: changes > 0 });
});

// Dashboard snapshot (latest values, status, trend, grouped by category).
api.get('/dashboard', (req, res) => res.json(buildDashboard()));

// List of distinct tests we have data for.
api.get('/tests', (req, res) => res.json(listTests()));

// Time series for a single test (by key, or by name when key is absent).
api.get('/series', (req, res) => {
  const { key, name } = req.query;
  if (!key && !name) return res.status(400).json({ error: 'missing_test' });
  const rows = key ? getSeriesForTest(key, true) : getSeriesForTest(name, false);
  const points = rows.map((r) => ({
    date: r.report_date,
    value: r.value,
    unit: r.unit,
    ref_low: r.ref_low,
    ref_high: r.ref_high,
    ref_text: r.ref_text,
    status: statusOf(r.value, r.ref_low, r.ref_high),
    report_id: r.report_id,
  }));
  const lang = req.query.lang === 'en' ? 'en' : 'ar';
  const meta = rows[0]
    ? {
        test_name: rows[0].test_name,
        test_key: rows[0].test_key,
        category: rows[0].category,
        unit: rows[0].unit,
        description: getDescription(rows[0].test_key, lang),
      }
    : null;
  res.json({ meta, points });
});

app.use('/api', api);

/* ------------------------------ static site ------------------------------ */

app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

app.listen(PORT, () => {
  console.log(`My Medical Assistant running at http://localhost:${PORT}`);
});
