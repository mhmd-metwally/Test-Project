'use strict';

const path = require('path');
const { DATA_DIR } = require('./db');

// A single Tesseract worker is created lazily and reused across requests.
// The English language data is downloaded once and cached under DATA_DIR so
// subsequent OCR runs are fast and work offline afterwards.
let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    const { createWorker } = require('tesseract.js');
    const cachePath = path.join(DATA_DIR, 'tessdata');
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, { cachePath });
      // PSM 6: assume a single uniform block of text (works well for tables).
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      return worker;
    })();
  }
  return workerPromise;
}

/** OCR an image buffer (png/jpg/…) into text. */
async function ocrImageBuffer(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return (data && data.text) || '';
}

/**
 * OCR a (usually scanned) PDF: render each page to a bitmap and OCR it.
 * Capped at 10 pages to bound work.
 */
async function ocrPdfBuffer(buffer) {
  const { createCanvas } = require('@napi-rs/canvas');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const stdFonts =
    path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    standardFontDataUrl: stdFonts,
  }).promise;

  let text = '';
  const maxPages = Math.min(doc.numPages, 10);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 }); // upscale for better OCR
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const png = canvas.toBuffer('image/png');
    text += (await ocrImageBuffer(png)) + '\n';
    page.cleanup();
  }
  await doc.destroy();
  return text;
}

module.exports = { ocrImageBuffer, ocrPdfBuffer };
