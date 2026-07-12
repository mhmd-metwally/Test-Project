'use strict';

/* ------------------------------- state ----------------------------------- */

const State = {
  lang: localStorage.getItem('mma_lang') || 'ar',
  route: 'dashboard',
  parsed: null, // pending parsed report during import
};

function t(key) {
  return (window.I18N[State.lang] && window.I18N[State.lang][key]) || key;
}

function applyLang() {
  const cfg = window.I18N[State.lang];
  document.documentElement.lang = State.lang;
  document.documentElement.dir = cfg.dir;
  localStorage.setItem('mma_lang', State.lang);
}

function toggleLang() {
  State.lang = State.lang === 'ar' ? 'en' : 'ar';
  applyLang();
  render();
}

/* ------------------------------- api ------------------------------------- */

const api = {
  async status() { return fetch('/api/status').then((r) => r.json()); },
  async setup(password) { return post('/api/setup', { password }); },
  async login(password) { return post('/api/login', { password }); },
  async logout() { return post('/api/logout', {}); },
  async parse(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/parse', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('parse_failed');
    return r.json();
  },
  async saveReport(payload) { return post('/api/reports', payload); },
  async reports() { return getJSON('/api/reports'); },
  async report(id) { return getJSON('/api/reports/' + id); },
  async deleteReport(id) { return fetch('/api/reports/' + id, { method: 'DELETE' }).then((r) => r.json()); },
  async dashboard() { return getJSON('/api/dashboard'); },
  async tests() { return getJSON('/api/tests'); },
  async series(q) { return getJSON('/api/series?' + new URLSearchParams(q)); },
};

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
async function getJSON(url) {
  const r = await fetch(url);
  if (r.status === 401) { showAuth(); throw new Error('unauthorized'); }
  return r.json();
}

/* ----------------------------- helpers ----------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const app = () => document.getElementById('app');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function statusLabel(s) { return t(s === 'high' ? 'high' : s === 'low' ? 'low' : s === 'normal' ? 'normal' : 'unknown'); }
function statusClass(s) { return 'pill pill-' + (s || 'unknown'); }
function today() { return new Date().toISOString().slice(0, 10); }

/* ------------------------------ shell ------------------------------------ */

function renderShell() {
  document.getElementById('root').innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="logo">🩺</span>
        <div>
          <div class="brand-name">${esc(t('appName'))}</div>
          <div class="brand-tag">${esc(t('tagline'))}</div>
        </div>
      </div>
      <nav class="tabs">
        <button data-route="dashboard">${esc(t('nav_dashboard'))}</button>
        <button data-route="import">${esc(t('nav_import'))}</button>
        <button data-route="tests">${esc(t('nav_tests'))}</button>
        <button data-route="reports">${esc(t('nav_reports'))}</button>
      </nav>
      <div class="actions">
        <button class="ghost" id="langBtn">${esc(t('lang_btn'))}</button>
        <button class="ghost" id="logoutBtn">${esc(t('logout'))}</button>
      </div>
    </header>
    <main id="app"></main>
    <footer class="foot">${esc(t('disclaimer'))}</footer>
  `;
  $('#langBtn').onclick = toggleLang;
  $('#logoutBtn').onclick = async () => { await api.logout(); showAuth(); };
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.onclick = () => go(b.dataset.route);
    b.classList.toggle('active', b.dataset.route === State.route);
  });
}

function go(route) {
  State.route = route;
  render();
}

async function render() {
  renderShell();
  const view = app();
  view.innerHTML = `<div class="loading">${esc(t('loading'))}</div>`;
  try {
    if (State.route === 'dashboard') await viewDashboard(view);
    else if (State.route === 'import') await viewImport(view);
    else if (State.route === 'tests') await viewTests(view);
    else if (State.route === 'reports') await viewReports(view);
  } catch (e) {
    if (e.message !== 'unauthorized') view.innerHTML = `<div class="card">⚠️ ${esc(e.message)}</div>`;
  }
}

/* ---------------------------- dashboard ---------------------------------- */

async function viewDashboard(view) {
  const data = await api.dashboard();
  if (!data.counters.total) {
    view.innerHTML = emptyState();
    $('#emptyImport').onclick = () => go('import');
    return;
  }
  const c = data.counters;
  const outOfRange = (c.high || 0) + (c.low || 0);
  const abnormalOnly = State.abnormalOnly;

  let cats = '';
  const catNames = Object.keys(data.categories).sort();
  for (const cat of catNames) {
    let items = data.categories[cat];
    if (abnormalOnly) items = items.filter((x) => x.status === 'high' || x.status === 'low');
    if (items.length === 0) continue;
    cats += `<section class="cat"><h3>${esc(cat)}</h3><div class="grid">${items.map(cardForTest).join('')}</div></section>`;
  }
  if (abnormalOnly && cats === '') cats = `<div class="card muted">${esc(t('no_abnormal_now'))}</div>`;

  view.innerHTML = `
    <div class="page-head">
      <h2>${esc(t('dash_title'))}</h2>
    </div>
    <div class="stats">
      ${stat(t('total_tests'), c.total, 'accent')}
      ${stat(t('out_of_range'), outOfRange, outOfRange ? 'warn' : 'ok')}
      ${stat(t('high'), c.high || 0, 'high')}
      ${stat(t('low'), c.low || 0, 'low')}
    </div>
    ${renderInsights(data.insights)}
    <div class="dash-toolbar">
      <button class="ghost ${abnormalOnly ? 'active' : ''}" id="filterBtn">
        ${esc(abnormalOnly ? t('filter_all') : t('filter_abnormal'))}
      </button>
    </div>
    ${cats}
  `;
  $('#filterBtn').onclick = () => { State.abnormalOnly = !State.abnormalOnly; render(); };
  view.querySelectorAll('[data-test-card], .ins-chip').forEach((el) => {
    el.onclick = () => openTrend(el.dataset.key || null, el.dataset.name);
  });
}

function renderInsights(ins) {
  if (!ins) return '';
  const chip = (x) => `<button class="ins-chip ins-${x.status || 'flat'}" data-key="${esc(x.test_key || '')}" data-name="${esc(x.test_name)}">
      ${esc(x.test_name)} <b>${esc(x.value)}${x.unit ? ' ' + esc(x.unit) : ''}</b></button>`;
  const chipTrend = (x, cls) => `<button class="ins-chip ${cls}" data-key="${esc(x.test_key || '')}" data-name="${esc(x.test_name)}">
      ${esc(x.test_name)} <b>${x.delta > 0 ? '▲' : '▼'} ${esc(Math.abs(x.delta))}</b></button>`;
  const blocks = [];
  if (ins.danger && ins.danger.length) {
    blocks.push(`<div class="ins-block ins-danger-block"><div class="ins-title">🚨 ${esc(t('danger_alert'))}</div><div class="ins-row">${ins.danger.map(chip).join('')}</div></div>`);
  }
  if (ins.attention && ins.attention.length) {
    blocks.push(`<div class="ins-block"><div class="ins-title">⚠️ ${esc(t('needs_attention'))}</div><div class="ins-row">${ins.attention.map(chip).join('')}</div></div>`);
  }
  if (ins.improved && ins.improved.length) {
    blocks.push(`<div class="ins-block"><div class="ins-title">${esc(t('improved_list'))}</div><div class="ins-row">${ins.improved.map((x) => chipTrend(x, 'ins-improved')).join('')}</div></div>`);
  }
  if (ins.worsened && ins.worsened.length) {
    blocks.push(`<div class="ins-block"><div class="ins-title">${esc(t('worsened_list'))}</div><div class="ins-row">${ins.worsened.map((x) => chipTrend(x, 'ins-worsened')).join('')}</div></div>`);
  }
  const body = blocks.length ? blocks.join('') : `<div class="ins-allgood">${esc(t('all_normal'))}</div>`;
  return `<div class="card insights"><h3>💡 ${esc(t('insights_title'))}</h3>${body}</div>`;
}

function stat(label, value, tone) {
  return `<div class="stat stat-${tone}"><div class="stat-val">${value}</div><div class="stat-label">${esc(label)}</div></div>`;
}

function cardForTest(tst) {
  const arrow = tst.trend === 'up' ? '▲' : tst.trend === 'down' ? '▼' : '–';
  const deltaTxt = tst.delta != null && tst.delta !== 0 ? `${arrow} ${Math.abs(tst.delta)}` : '';
  const ref = (tst.ref_low != null || tst.ref_high != null)
    ? `${tst.ref_low != null ? tst.ref_low : ''} – ${tst.ref_high != null ? tst.ref_high : ''}`
    : (tst.ref_text || '—');
  return `
    <div class="test-card" data-test-card data-key="${esc(tst.test_key || '')}" data-name="${esc(tst.test_name)}">
      <div class="tc-top">
        <span class="tc-name">${esc(tst.test_name)}</span>
        <span class="${statusClass(tst.status)}">${esc(statusLabel(tst.status))}</span>
      </div>
      <div class="tc-value">${esc(tst.value)} <span class="tc-unit">${esc(tst.unit || '')}</span>
        <span class="tc-delta tc-${tst.trend}">${esc(deltaTxt)}</span>
      </div>
      <div class="tc-ref">${esc(t('ref_range'))}: ${esc(ref)}</div>
      <div class="tc-date">${esc(t('measured_on'))} ${esc(tst.date)} · ${tst.count} ${esc(t('measurements'))}</div>
    </div>`;
}

function emptyState() {
  return `
    <div class="empty card">
      <div class="empty-icon">📄</div>
      <h2>${esc(t('no_data_title'))}</h2>
      <p>${esc(t('no_data_desc'))}</p>
      <button class="primary" id="emptyImport">${esc(t('go_import'))}</button>
    </div>`;
}

/* ------------------------------ import ----------------------------------- */

async function viewImport(view) {
  view.innerHTML = `
    <div class="page-head">
      <h2>${esc(t('import_title'))}</h2>
      <p>${esc(t('import_desc'))}</p>
    </div>
    <div id="dropzone" class="dropzone">
      <div class="dz-icon">⬆️</div>
      <div>${esc(t('drop_here'))}</div>
      <input type="file" id="fileInput" accept="application/pdf" hidden>
    </div>
    <div id="reviewArea"></div>
  `;
  const dz = $('#dropzone');
  const input = $('#fileInput');
  dz.onclick = () => input.click();
  input.onchange = () => { if (input.files[0]) handleFile(input.files[0]); };
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => {
    e.preventDefault(); dz.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };
}

async function handleFile(file) {
  const dz = $('#dropzone');
  dz.innerHTML = `<div class="spinner"></div><div>${esc(t('parsing'))}</div>`;
  try {
    const res = await api.parse(file);
    State.parsed = res;
    renderReview();
  } catch (e) {
    dz.innerHTML = `<div class="dz-icon">⚠️</div><div>${esc(e.message)}</div>`;
  }
}

function renderReview() {
  const p = State.parsed;
  const area = $('#reviewArea');
  const included = p.results.filter((r) => !r.excluded).length;
  const rowsHtml = p.results.map((r, i) => reviewRow(r, i)).join('');
  area.innerHTML = `
    <div class="card review">
      <h3>${esc(t('review_title'))}</h3>
      <p class="muted">${esc(t('review_readonly'))}</p>
      ${p.results.length === 0 ? `<p class="muted">${esc(t('nothing_found'))}</p>` : ''}
      <div class="meta-grid">
        <label>${esc(t('report_date'))}<input type="date" id="reportDate" value="${esc(p.reportDate || today())}"></label>
        <label>${esc(t('detected_lab'))}<input type="text" id="labName" value="${esc(p.labName || '')}"></label>
        <label>${esc(t('note'))}<input type="text" id="note" value=""></label>
      </div>
      <div class="table-wrap">
        <table class="rev-table readonly">
          <thead><tr>
            <th>${esc(t('col_test'))}</th><th>${esc(t('col_value'))}</th><th>${esc(t('col_unit'))}</th>
            <th>${esc(t('col_ref'))}</th><th></th>
          </tr></thead>
          <tbody id="revBody">${rowsHtml}</tbody>
        </table>
      </div>
      <div class="review-actions">
        <span class="muted" id="incCount">${included} ${esc(t('included_count'))}</span>
        <button class="primary" id="saveReport">${esc(t('save_report'))}</button>
      </div>
      <div id="saveMsg"></div>
    </div>
  `;
  $('#saveReport').onclick = saveReport;
  bindRowEvents();
}

function refText(r) {
  if (r.refLow != null && r.refHigh != null) return `${r.refLow} – ${r.refHigh}`;
  if (r.refText) return r.refText;
  if (r.refHigh != null) return `≤ ${r.refHigh}`;
  if (r.refLow != null) return `≥ ${r.refLow}`;
  return '—';
}

function reviewRow(r, i) {
  const name = r.name || r.test_name || '';
  return `
    <tr data-row="${i}" class="${r.excluded ? 'row-excluded' : ''}">
      <td>${esc(name)}</td>
      <td class="rv-num">${esc(r.value)}</td>
      <td>${esc(r.unit || '')}</td>
      <td class="muted">${esc(refText(r))}</td>
      <td><button class="del-row" title="${esc(r.excluded ? t('restore') : t('exclude'))}">${r.excluded ? '↩' : '✕'}</button></td>
    </tr>`;
}

function bindRowEvents() {
  $('#revBody').querySelectorAll('.del-row').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.closest('tr').dataset.row);
      const row = State.parsed.results[idx];
      row.excluded = !row.excluded;
      renderReview();
    };
  });
}

async function saveReport() {
  const p = State.parsed;
  // Values are taken exactly as parsed (never edited); only excluded rows drop.
  const results = p.results
    .filter((r) => !r.excluded)
    .map((r) => ({
      test_key: r.key || r.test_key || null,
      test_name: (r.name || r.test_name || '').trim(),
      category: r.category || 'Other',
      value: r.value,
      unit: r.unit || '',
      ref_low: r.refLow != null ? r.refLow : null,
      ref_high: r.refHigh != null ? r.refHigh : null,
      ref_text: r.refText || null,
    }));
  const payload = {
    report_date: $('#reportDate').value,
    lab_name: $('#labName').value.trim(),
    note: $('#note').value.trim(),
    filename: p.filename,
    raw_text: p.rawText,
    results,
  };
  const res = await api.saveReport(payload);
  const msg = $('#saveMsg');
  if (res.ok) {
    msg.innerHTML = `<div class="ok-msg">${esc(t('saved_ok'))}</div>`;
    State.parsed = null;
    setTimeout(() => go('dashboard'), 900);
  } else {
    msg.innerHTML = `<div class="err-msg">⚠️ ${esc(res.data.error || 'error')}</div>`;
  }
}

/* ------------------------------- tests ----------------------------------- */

async function viewTests(view) {
  const tests = await api.tests();
  if (tests.length === 0) {
    view.innerHTML = emptyState();
    $('#emptyImport').onclick = () => go('import');
    return;
  }
  const byCat = {};
  tests.forEach((t2) => { (byCat[t2.category || 'Other'] = byCat[t2.category || 'Other'] || []).push(t2); });
  let html = `<div class="page-head"><h2>${esc(t('tests_title'))}</h2><p>${esc(t('tests_desc'))}</p></div>`;
  for (const cat of Object.keys(byCat).sort()) {
    const items = byCat[cat].map((x) => `
      <button class="test-row" data-key="${esc(x.test_key || '')}" data-name="${esc(x.test_name)}">
        <span>${esc(x.test_name)}</span>
        <span class="muted">${x.n} ${esc(t('measurements'))} ›</span>
      </button>`).join('');
    html += `<section class="cat"><h3>${esc(cat)}</h3><div class="list">${items}</div></section>`;
  }
  view.innerHTML = html;
  view.querySelectorAll('.test-row').forEach((el) => {
    el.onclick = () => openTrend(el.dataset.key || null, el.dataset.name);
  });
}

async function openTrend(key, name) {
  const view = app();
  view.innerHTML = `<div class="loading">${esc(t('loading'))}</div>`;
  const q = key ? { key, lang: State.lang } : { name, lang: State.lang };
  const data = await api.series(q);
  const meta = data.meta || { test_name: name, unit: '' };
  const pts = data.points;
  const first = pts[0], last = pts[pts.length - 1];
  const change = first && last ? Math.round((last.value - first.value) * 1000) / 1000 : 0;
  const refLow = last ? last.ref_low : null;
  const refHigh = last ? last.ref_high : null;

  const rowsHtml = pts.slice().reverse().map((p) => `
    <tr>
      <td>${esc(p.date)}</td>
      <td>${esc(p.value)} ${esc(p.unit || '')}</td>
      <td><span class="${statusClass(p.status)}">${esc(statusLabel(p.status))}</span></td>
    </tr>`).join('');

  const descHtml = meta.description
    ? `<div class="card about"><h3>ℹ️ ${esc(t('about_test'))}</h3><p>${esc(meta.description)}</p></div>`
    : '';

  view.innerHTML = `
    <div class="trend-head no-print">
      <button class="ghost back" id="backBtn">${esc(t('back'))}</button>
      <button class="ghost" id="printBtn">${esc(t('print'))}</button>
    </div>
    <div id="printArea">
      <div class="page-head">
        <h2>${esc(t('trend_of'))} ${esc(meta.test_name)}</h2>
        <p class="muted">${esc(meta.category || '')} · ${pts.length} ${esc(t('measurements'))}
          · ${esc(t('change_since_first'))}: <strong class="${change > 0 ? 'up' : change < 0 ? 'down' : ''}">${change > 0 ? '+' : ''}${change} ${esc(meta.unit || '')}</strong></p>
      </div>
      ${descHtml}
      <div class="card"><div id="chart" class="chart-box"></div></div>
      <div class="card table-wrap">
        <table class="data-table">
          <thead><tr><th>${esc(t('date'))}</th><th>${esc(t('value'))}</th><th>${esc(t('status'))}</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
  $('#backBtn').onclick = () => go(State.route === 'dashboard' ? 'dashboard' : 'tests');
  $('#printBtn').onclick = () => window.print();
  window.renderLineChart($('#chart'), { points: pts, refLow, refHigh, unit: meta.unit });
  window.addEventListener('resize', () => {
    if ($('#chart')) window.renderLineChart($('#chart'), { points: pts, refLow, refHigh, unit: meta.unit });
  }, { once: true });
}

/* ------------------------------ reports ---------------------------------- */

async function viewReports(view) {
  const reports = await api.reports();
  if (reports.length === 0) {
    view.innerHTML = `<div class="page-head"><h2>${esc(t('reports_title'))}</h2></div><div class="card muted">${esc(t('no_reports'))}</div>`;
    return;
  }
  const rows = reports.map((r) => `
    <div class="report-row">
      <div>
        <div class="rr-date">📅 ${esc(r.report_date)}</div>
        <div class="muted">${esc(r.lab_name || '')} ${r.filename ? '· ' + esc(r.filename) : ''}</div>
      </div>
      <div class="rr-count">${r.result_count} ${esc(t('results_count'))}</div>
      <button class="ghost del-report" data-id="${r.id}">${esc(t('delete'))}</button>
    </div>`).join('');
  view.innerHTML = `
    <div class="page-head"><h2>${esc(t('reports_title'))}</h2><p>${esc(t('reports_desc'))}</p></div>
    <div class="card list-flat">${rows}</div>`;
  view.querySelectorAll('.del-report').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm(t('confirm_delete'))) return;
      await api.deleteReport(btn.dataset.id);
      render();
    };
  });
}

/* ------------------------------- auth UI --------------------------------- */

function showAuth() {
  applyLang();
  api.status().then((s) => renderAuth(s.configured));
}

function renderAuth(configured) {
  document.getElementById('root').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">🩺</div>
        <h1>${esc(t('appName'))}</h1>
        <p class="muted">${esc(configured ? '' : t('setup_desc'))}</p>
        <h2>${esc(configured ? t('login_title') : t('setup_title'))}</h2>
        <div id="authErr" class="err-msg"></div>
        <label>${esc(t('password'))}<input type="password" id="pw"></label>
        ${configured ? '' : `<label>${esc(t('confirm_password'))}<input type="password" id="pw2"></label>`}
        <button class="primary block" id="authBtn">${esc(configured ? t('login') : t('create_account'))}</button>
        <button class="ghost block" id="authLang">${esc(t('lang_btn'))}</button>
      </div>
    </div>`;
  $('#authLang').onclick = () => { State.lang = State.lang === 'ar' ? 'en' : 'ar'; applyLang(); renderAuth(configured); };
  const submit = async () => {
    const pw = $('#pw').value;
    const err = $('#authErr');
    err.textContent = '';
    if (!configured) {
      if (pw.length < 6) { err.textContent = t('pw_short'); return; }
      if (pw !== $('#pw2').value) { err.textContent = t('pw_mismatch'); return; }
      const res = await api.setup(pw);
      if (res.ok) startApp(); else err.textContent = res.data.error || 'error';
    } else {
      const res = await api.login(pw);
      if (res.ok) startApp(); else err.textContent = t('wrong_pw');
    }
  };
  $('#authBtn').onclick = submit;
  $('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  const pw2 = $('#pw2');
  if (pw2) pw2.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

/* ------------------------------- boot ------------------------------------ */

function startApp() {
  State.route = 'dashboard';
  render();
}

async function boot() {
  applyLang();
  const s = await api.status();
  if (s.authenticated) startApp();
  else renderAuth(s.configured);
}

boot();
