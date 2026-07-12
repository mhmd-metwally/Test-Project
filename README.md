# 🩺 My Medical Assistant

A small, **private** web app to import your periodic lab-result PDFs, store them in
a database, and see your health **trends over time** — with a clean dashboard and
per-test charts. Bilingual interface (**العربية / English**) with full RTL support.

> ⚠️ This tool only organizes and visualizes your own data. It is **not** medical
> advice. Always consult your doctor.

---

## Features

- **Import PDF lab reports** — upload a PDF and the app auto-extracts test names,
  values, units and reference ranges. You **review and fix** everything before it
  is saved (nothing is trusted blindly), and you can also add rows manually.
- **Database storage** — every report and result is stored in a local SQLite
  database on the server.
- **Dashboard** — your latest value for each test, grouped by category (CBC,
  Lipids, Kidney, Liver, Thyroid, …), with automatic **High / Low / Normal**
  flags and an up/down trend arrow vs. the previous measurement.
- **Trends & analysis** — click any test to see how it changed over time on a
  chart, with the healthy reference range shaded in.
- **Private, single-user login** — protected by a password you choose. Access it
  from your computer or phone; no one else can get in.
- **Bilingual** — switch between Arabic (RTL) and English at any time.

## Tech

- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- PDF text extraction: `pdfjs-dist` with a custom column-aware line reconstructor
- Frontend: dependency-free vanilla JS SPA + custom SVG charts (works offline)
- Auth: password (bcrypt) + signed session cookie (JWT)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure — copy and edit environment variables
cp .env.example .env

# 3. Start the server
npm start
```

Then open **http://localhost:3000**. On first launch you'll be asked to create a
password — that's it. Upload a lab-report PDF from the **Import** tab, review the
extracted values, and save.

### Configuration (`.env`)

| Variable      | Default | Description                            |
| ------------- | ------- | -------------------------------------- |
| `PORT`        | `3000`  | Port the server listens on             |
| `JWT_SECRET`  | random  | Secret used to sign login sessions     |
| `SESSION_TTL` | `30d`   | How long a login session stays valid   |

## Accessing it from your phone

The app is a normal web server, so to reach it from other devices you can:

- Run it on the same Wi-Fi and open `http://<your-computer-ip>:3000`, or
- Deploy it to any Node host (Render, Railway, Fly.io, a small VPS, …).

Because it's password-protected and stores data in its own database, only you
can see your results. **Deploy behind HTTPS** when exposing it to the internet
(set `NODE_ENV=production` so the session cookie is marked `Secure`).

## Data & privacy

- All data lives in `data/medical.sqlite` on the server (the `data/` folder is
  git-ignored, so your medical data is never committed).
- To back up, copy the `data/` folder. To reset, delete it.

## Supported tests (auto-recognized)

CBC (Hemoglobin, WBC, Platelets, …), Diabetes (Fasting Glucose, HbA1c),
Lipid profile, Kidney (Creatinine, Urea, Uric Acid, eGFR), Liver (ALT, AST,
Bilirubin, Albumin, …), Thyroid (TSH, T3, T4, Free T3/T4), Vitamins & minerals
(Vitamin D, B12, Ferritin, Iron, Calcium, …), and inflammation markers (CRP, ESR).

Any test the app doesn't recognize is still imported — it just won't have a
default reference range, so add the range in the review step if the PDF didn't
include one.

## Project structure

```
server/
  server.js        Express app + REST API
  db.js            SQLite schema and queries
  auth.js          Password + session handling
  pdfParser.js     PDF text extraction + result parsing
  labDictionary.js Known tests, aliases, default ranges
  analysis.js      Dashboard snapshot + status/trend logic
public/
  index.html       SPA shell
  app.js           Views, routing, API client
  i18n.js          Arabic / English strings
  chart.js         Dependency-free SVG line chart
  styles.css       Styling (light/dark, RTL)
```
