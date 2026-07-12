'use strict';

const { matchTest } = require('./labDictionary');

/**
 * Parse a lab-report PDF buffer into structured results.
 *
 * Lab PDFs vary a lot, so this is a best-effort heuristic extractor. The API
 * returns everything it finds and the UI lets the user review/fix the values
 * before saving — nothing is trusted blindly.
 *
 * @returns {Promise<{ text: string, reportDate: string|null, results: Array }>}
 */
async function parsePdf(buffer) {
  const text = await extractPdfText(buffer);
  return parseText(text);
}

/**
 * Extract text from a PDF, reconstructing each visual line from the positioned
 * text items so that column gaps survive as multiple spaces (the columnar
 * layout is what the line parser relies on).
 */
async function extractPdfText(buffer) {
  // pdfjs-dist is ESM; import it dynamically from CommonJS.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;

  const outLines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    outLines.push(...reconstructLines(content.items));
  }
  await doc.destroy();
  return outLines.join('\n');
}

// Group positioned text items into lines and re-insert spacing from x gaps.
function reconstructLines(items) {
  // Drop whitespace-only items: pdfjs collapses a run of spaces into a single
  // wide " " item, which would otherwise hide column gaps. We rebuild all
  // spacing from x positions instead.
  const glyphs = items
    .filter((it) => it.str !== undefined)
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
    }))
    .filter((g) => g.str.trim().length > 0);

  if (glyphs.length === 0) return [];

  // Estimate an average character width (exact for monosp, approximate else).
  const widths = glyphs
    .filter((g) => g.str.trim().length > 0)
    .map((g) => g.w / g.str.length)
    .filter((w) => w > 0)
    .sort((a, b) => a - b);
  const charW = widths.length ? widths[Math.floor(widths.length / 2)] : 5;

  // Bucket by y (rounded) into visual rows.
  const rows = new Map();
  for (const g of glyphs) {
    const key = Math.round(g.y);
    let bucket = null;
    for (const k of rows.keys()) {
      if (Math.abs(k - key) <= 2) { bucket = k; break; }
    }
    const useKey = bucket === null ? key : bucket;
    if (!rows.has(useKey)) rows.set(useKey, []);
    rows.get(useKey).push(g);
  }

  // Sort rows top-to-bottom (higher y first) and glyphs left-to-right.
  const orderedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
  const lines = [];
  for (const [, rowGlyphs] of orderedRows) {
    rowGlyphs.sort((a, b) => a.x - b.x);
    let line = '';
    let cursorX = null;
    for (const g of rowGlyphs) {
      if (cursorX !== null) {
        const gap = g.x - cursorX;
        if (gap > charW * 0.3) {
          const spaces = Math.max(1, Math.round(gap / charW));
          line += ' '.repeat(Math.min(spaces, 40));
        }
      }
      line += g.str;
      cursorX = g.x + g.w;
    }
    if (line.trim().length > 0) lines.push(line);
  }
  return lines;
}

/**
 * Parse already-extracted report text into structured results.
 * Split out from parsePdf so it can be tested without a real PDF.
 */
function parseText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, ' ').trim())
    .filter((l) => l.length > 0);

  const reportDate = findReportDate(lines);
  const labName = findLabName(lines);
  // Blank out dates/times before extracting results so a date can never be
  // mistaken for a test value. Length-preserving so column alignment survives.
  const scrubbed = lines.map(stripDatesAndTimes);
  const results = extractResults(scrubbed);

  return { text, reportDate, labName, results };
}

// Replace any date/time substring with an equal-length run of spaces.
function stripDatesAndTimes(line) {
  const blank = (m) => ' '.repeat(m.length);
  return line
    .replace(/\b\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g, blank)
    .replace(/\b\d{1,2}\s*[-\s]\s*[A-Za-z]{3,9}\s*[-\s,]?\s*\d{4}\b/g, blank)
    .replace(/\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/g, blank)
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, blank);
}

// Words that identify a laboratory/clinic name.
const LAB_KEYWORDS = /(laborator|\blabs?\b|diagnostic|clinic|hospital|medical|healthcare|health care|pathology|centre|center|معمل|مختبر|مستشفى|مركز|معامل)/i;
// Field labels that appear near the top but are NOT the lab name.
const FIELD_LABEL = /^(patient|name|age|sex|gender|dob|date|id|mr no|mrn|ref|referred|doctor|phone|tel|fax|email|address|sample|specimen|report|page|www|http)/i;

function findLabName(lines) {
  const top = lines.slice(0, 12);
  // 1) a line that clearly names a lab/clinic
  for (const line of top) {
    if (FIELD_LABEL.test(line)) continue;
    if (LAB_KEYWORDS.test(line) && line.length <= 70) return cleanLabName(line);
  }
  // 2) otherwise the first non-field, mostly-text line near the top
  for (const line of top) {
    if (FIELD_LABEL.test(line)) continue;
    const letters = (line.match(/[A-Za-z؀-ۿ]/g) || []).length;
    if (letters >= 3 && line.length <= 60 && !/\d{2,}/.test(line)) return cleanLabName(line);
  }
  return null;
}

function cleanLabName(s) {
  return s.replace(/[|•*_]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/[\s:,-]+$/, '').trim();
}

/* -------------------------------------------------------------------------- */
/* Date detection                                                             */
/* -------------------------------------------------------------------------- */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Prefer lines that look like a collection/report date.
const DATE_LABEL_RE = /(collect|sampl|report|received|drawn|date|تاريخ)/i;

function findReportDate(lines) {
  const candidates = [];
  lines.forEach((line, idx) => {
    for (const iso of extractDatesFromLine(line)) {
      let score = 0;
      if (DATE_LABEL_RE.test(line)) score += 10;
      score += Math.max(0, 20 - idx); // earlier lines slightly preferred
      candidates.push({ iso, score });
    }
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].iso;
}

function extractDatesFromLine(line) {
  const out = [];

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy (also yyyy first)
  const numeric = line.matchAll(/\b(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g);
  for (const m of numeric) {
    const iso = normalizeNumericDate(m[1], m[2], m[3]);
    if (iso) out.push(iso);
  }

  // dd Mon yyyy  /  Mon dd, yyyy
  const named = line.matchAll(
    /\b(\d{1,2})\s*[-\s]\s*([A-Za-z]{3,9})\s*[-\s,]?\s*(\d{4})\b|\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/g,
  );
  for (const m of named) {
    let day, monName, year;
    if (m[2]) { day = m[1]; monName = m[2]; year = m[3]; }
    else { day = m[5]; monName = m[4]; year = m[6]; }
    const mon = MONTHS[monName.slice(0, 3).toLowerCase()];
    if (mon) {
      const iso = buildIso(+year, mon, +day);
      if (iso) out.push(iso);
    }
  }
  return out;
}

function normalizeNumericDate(a, b, c) {
  let year, month, day;
  if (a.length === 4) {
    // yyyy/mm/dd
    year = +a; month = +b; day = +c;
  } else {
    // dd/mm/yyyy (assume day-first, common outside the US)
    day = +a; month = +b; year = +c;
    if (year < 100) year += year < 50 ? 2000 : 1900;
    // if "day" is clearly a month and "month" clearly a day, swap
    if (day <= 12 && month > 12) { const t = day; day = month; month = t; }
  }
  return buildIso(year, month, day);
}

function buildIso(year, month, day) {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1990 || year > 2100) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/* -------------------------------------------------------------------------- */
/* Result extraction                                                          */
/* -------------------------------------------------------------------------- */

// A reference range like "13.0 - 17.0" or "13-17" or "< 200" or "up to 40"
const RANGE_RE =
  /((?:<|>|≤|≥|up to|less than|more than)\s*\d+(?:\.\d+)?)|(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)/i;

// A number that could be a result value
const NUMBER_RE = /-?\d+(?:\.\d+)?/g;

// Common units (case-insensitive). Used to help isolate the value.
const UNIT_RE =
  /\b(mg\/dl|g\/dl|g\/l|mg\/l|ng\/ml|pg\/ml|ng\/dl|ug\/dl|µg\/dl|mcg\/dl|u\/l|iu\/l|uiu\/ml|µiu\/ml|miu\/l|mmol\/l|umol\/l|µmol\/l|mmol|mm\/hr|ml\/min(?:\/1\.73)?|10\^?[0-9]+\/ul|10\^?[0-9]+\/l|cells\/ul|fl|pg|%|mIU\/mL)\b/i;

function extractResults(lines) {
  const results = [];
  const seen = new Set();

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (seen.has(parsed.key || parsed.name.toLowerCase())) continue;
    seen.add(parsed.key || parsed.name.toLowerCase());
    results.push(parsed);
  }
  return results;
}

// Lines that are metadata, not results.
const SKIP_RE =
  /^(page|patient|name|age|sex|gender|dob|doctor|ref\.?\s*by|referred|lab\s*no|report|address|phone|tel|fax|email|www|collect|collected|sampl|received|drawn|printed|reported|comment|remark|method|note|result|test\b|investigation)\b/i;

// A line that is essentially just a date (with optional label).
const DATE_ONLY_RE = /^[a-z .:_\/-]*\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{2,4}[a-z0-9: ]*$/i;

function parseLine(line) {
  // Skip obvious header/footer/noise/date lines
  if (line.length > 140) return null;
  if (SKIP_RE.test(line)) return null;
  if (DATE_ONLY_RE.test(line) && /(date|collect|sampl|received|drawn)/i.test(line)) return null;

  // Lab reports are columnar. Prefer splitting on runs of 2+ spaces so that a
  // test name containing digits (HbA1c, T3, B12) stays intact.
  const cells = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (cells.length >= 2) {
    const fromCells = parseCells(cells);
    if (fromCells) return fromCells;
  }
  return parseInline(line);
}

// Column-aware parse: first cell = test name, then locate value / unit / range.
function parseCells(cells) {
  let name = cells[0].replace(/[:\.\-–\s]+$/, '').trim();
  name = name.replace(/^[\d.)\-•*\s]+/, '').trim();
  if (name.length < 2 || !/[a-zA-Z؀-ۿ]/.test(name)) return null;

  const rest = cells.slice(1);
  let value = null;
  let rangeStr = null;
  let unit = null;

  for (const cell of rest) {
    if (!rangeStr && RANGE_RE.test(cell) && /[-–]|<|>|≤|≥|up to|less than|more than/i.test(cell)) {
      rangeStr = cell.match(RANGE_RE)[0];
      continue;
    }
    if (value === null) {
      const m = cell.match(/^(-?\d+(?:\.\d+)?)\s*([a-zµ%\/^0-9.]*)$/i);
      if (m) {
        value = parseFloat(m[1]);
        if (m[2] && UNIT_RE.test(m[2])) unit = m[2];
        continue;
      }
    }
    if (!unit && UNIT_RE.test(cell)) unit = cell.match(UNIT_RE)[0];
  }

  if (value === null || Number.isNaN(value)) return null;
  return finishResult(name, value, rangeStr, unit);
}

// Fallback for single-spaced lines: split at the first number.
function parseInline(line) {
  const rangeMatch = line.match(RANGE_RE);
  const unitMatch = line.match(UNIT_RE);

  const firstNumIdx = line.search(/-?\d/);
  if (firstNumIdx <= 0) return null;
  let name = line.slice(0, firstNumIdx).replace(/[:\.\-–]+$/, '').trim();
  name = name.replace(/^[\d.)\-•*\s]+/, '').trim();
  if (name.length < 2 || !/[a-zA-Z؀-ۿ]/.test(name)) return null;

  const rangeStr = rangeMatch ? rangeMatch[0] : null;
  let searchable = line.slice(firstNumIdx);
  if (rangeStr) searchable = searchable.replace(rangeStr, ' ');
  const nums = searchable.match(NUMBER_RE);
  if (!nums || nums.length === 0) return null;
  const value = parseFloat(nums[0]);
  if (Number.isNaN(value)) return null;

  return finishResult(name, value, rangeStr, unitMatch ? unitMatch[0] : null);
}

function finishResult(name, value, rangeStr, unit) {
  const canonical = matchTest(name);

  // Reference range numbers
  let refLow = null;
  let refHigh = null;
  let refText = rangeStr ? rangeStr.trim() : null;
  if (rangeStr) {
    const dash = rangeStr.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (dash) {
      refLow = parseFloat(dash[1]);
      refHigh = parseFloat(dash[2]);
    } else {
      const lt = rangeStr.match(/(?:<|≤|up to|less than)\s*(\d+(?:\.\d+)?)/i);
      const gt = rangeStr.match(/(?:>|≥|more than)\s*(\d+(?:\.\d+)?)/i);
      if (lt) refHigh = parseFloat(lt[1]);
      if (gt) refLow = parseFloat(gt[1]);
    }
  }
  if ((refLow === null || refHigh === null) && canonical) {
    if (refLow === null) refLow = canonical.ref.low;
    if (refHigh === null) refHigh = canonical.ref.high;
    if (!refText) refText = `${canonical.ref.low} - ${canonical.ref.high}`;
  }

  const finalUnit = unit || (canonical ? canonical.unit : '');

  return {
    key: canonical ? canonical.key : null,
    name: canonical ? canonical.name : name,
    rawName: name,
    category: canonical ? canonical.category : 'Other',
    value,
    unit: finalUnit,
    refLow,
    refHigh,
    refText,
    matched: !!canonical,
  };
}

module.exports = { parsePdf, parseText };
