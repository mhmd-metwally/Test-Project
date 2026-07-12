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

## Deploying (access from computer + phone)

> **GitHub Pages will not work** for this app — it only serves static files and
> can't run a Node server or database. Use a host that runs Node/Docker.

The app ships with a **Dockerfile**, so any Docker-capable host works the same
way. The one thing to get right is a **persistent volume** for the database,
mounted at the path in `DATA_DIR` (default `/data` in the container) — otherwise
your data is wiped on every restart/redeploy.

Set these environment variables on the host:

| Variable     | Value                | Why                                   |
| ------------ | -------------------- | ------------------------------------- |
| `DATA_DIR`   | volume mount path    | keep the SQLite DB on the volume      |
| `JWT_SECRET` | long random string   | stable login sessions across restarts |
| `NODE_ENV`   | `production`         | marks the session cookie `Secure`     |

`PORT` is injected by the platform automatically — no need to set it.

### Railway (free volume — recommended)

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
   Railway detects the `Dockerfile` and builds it.
3. **Add a Volume** and set its mount path to `/data`.
4. Under **Variables**, add `DATA_DIR=/data`, `NODE_ENV=production`, and a
   `JWT_SECRET` (any long random string).
5. Open the generated URL, create your password, and start importing.

### Render

This repo includes a `render.yaml` blueprint. On [render.com](https://render.com):
**New → Blueprint → connect this repo**. It provisions the web service plus a 1 GB
disk at `/data` and generates `JWT_SECRET` for you.

> Note: Render's persistent disk requires a **paid** plan. Without a disk the app
> still runs but the database is not persisted — prefer Railway/Fly for a free
> option with persistent storage.

### Fly.io

`fly launch` (it detects the Dockerfile), then `fly volumes create medical_data
--size 1` and mount it at `/data` in `fly.toml`, and set the env vars above with
`fly secrets set JWT_SECRET=... DATA_DIR=/data NODE_ENV=production`.

Because it's password-protected and stores data in its own database, only you can
see your results — and all these platforms serve it over **HTTPS** automatically.

## Run locally / on your Wi-Fi

`npm start` and open `http://<your-computer-ip>:3000` from your phone on the same
network. (Locally, leave `NODE_ENV` unset so the cookie isn't marked `Secure`
over plain HTTP.)

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
