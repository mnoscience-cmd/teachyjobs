/* =============================================
   TeachyJobs — Main Application Logic
   ============================================= */

'use strict';

// ── State ─────────────────────────────────────
const STATE = {
  data: [],
  filtered: [],
  duplicates: [],
  page: 1,
  dupPage: 1,
  perPage: 18,
  lang: 'en',
  theme: 'light',
  charts: {},
};

// ── i18n ──────────────────────────────────────
const T = {
  en: {
    searchPlaceholder: 'Search school name, subject, area, or contact...',
    noResults: 'No vacancies found',
    noResultsSub: 'Try adjusting your filters or search terms',
    loading: 'Loading TeachyJobs...',
    of: 'of',
    showing: 'Showing',
    results: 'results',
    prev: '← Prev',
    next: 'Next →',
    contact: 'Contact',
    subjects: 'Subjects',
    area: 'Area',
    year: 'Year',
    date: 'Date',
    duplicate: 'Duplicate',
    rawAd: 'Original Ad Text',
    yes: 'Yes',
    no: 'No',
    unknown: 'Unknown',
    close: 'Close',
    allAreas: 'All Areas',
    allSubjects: 'All Subjects',
    allYears: 'All Years',
    allRecords: 'All Records',
    uniqueOnly: 'Unique Only',
    duplicatesOnly: 'Duplicates Only',
    newestFirst: 'Newest First',
    oldestFirst: 'Oldest First',
    schoolAZ: 'School A→Z',
    areaAZ: 'Area A→Z',
    page: 'Page',
  },
  ar: {
    searchPlaceholder: 'ابحث بالمدرسة أو المادة أو المنطقة أو الاتصال...',
    noResults: 'لم يتم العثور على وظائف',
    noResultsSub: 'حاول تعديل الفلاتر أو مصطلحات البحث',
    loading: 'جارٍ تحميل TeachyJobs...',
    of: 'من',
    showing: 'عرض',
    results: 'نتيجة',
    prev: 'السابق ←',
    next: '→ التالي',
    contact: 'التواصل',
    subjects: 'المواد',
    area: 'المنطقة',
    year: 'السنة',
    date: 'التاريخ',
    duplicate: 'مكرر',
    rawAd: 'نص الإعلان الأصلي',
    yes: 'نعم',
    no: 'لا',
    unknown: 'غير معروف',
    close: 'إغلاق',
    allAreas: 'جميع المناطق',
    allSubjects: 'جميع المواد',
    allYears: 'جميع السنوات',
    allRecords: 'جميع السجلات',
    uniqueOnly: 'الفريدة فقط',
    duplicatesOnly: 'المكررات فقط',
    newestFirst: 'الأحدث أولاً',
    oldestFirst: 'الأقدم أولاً',
    schoolAZ: 'المدرسة أ→ي',
    areaAZ: 'المنطقة أ→ي',
    page: 'صفحة',
  }
};
const t = (key) => T[STATE.lang][key] || key;

// ── Theme ──────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('tj-theme') || 'light';
  setTheme(saved, false);
}
function setTheme(theme, animate = true) {
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('tj-theme', theme);
  if (animate && STATE.charts) {
    setTimeout(rebuildCharts, 300);
  }
}
document.getElementById('themeToggle').addEventListener('click', () => {
  setTheme(STATE.theme === 'dark' ? 'light' : 'dark');
});

// ── Language ───────────────────────────────────
function setLang(lang) {
  STATE.lang = lang;
  const isAr = lang === 'ar';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.getElementById('langLabel').textContent = isAr ? 'EN' : 'AR';
  document.getElementById('searchInput').placeholder = t('searchPlaceholder');

  // Update all data-en / data-ar elements
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
  });
  // Update select options
  updateSelectOptions();
  renderJobs();
}
document.getElementById('langToggle').addEventListener('click', () => {
  setLang(STATE.lang === 'en' ? 'ar' : 'en');
});

function updateSelectOptions() {
  const lang = STATE.lang;
  document.querySelectorAll('.filter-select option[data-en]').forEach(opt => {
    opt.textContent = opt.getAttribute(`data-${lang}`) || opt.getAttribute('data-en');
  });
}

// ── Data Loading ───────────────────────────────
async function loadData() {
  // Try fetch first (works on any server / GitHub Pages)
  try {
    const res = await fetch('Data.json');
    if (!res.ok) throw new Error('fetch failed');
    const raw = await res.json();
    initApp(raw);
    return;
  } catch (_) {}

  // Fallback: show a file picker so it works when opened locally (file://)
  showFilePicker();
}

function showFilePicker() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.innerHTML = `
    <div class="loading-card" style="max-width:420px;text-align:center;padding:32px">
      <div style="font-size:48px;margin-bottom:16px">📂</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--text);margin-bottom:10px">
        Load Data.json
      </div>
      <p style="font-size:14px;color:var(--text2);margin-bottom:24px;line-height:1.6">
        Browsers block direct file access for security.<br>
        Please select your <strong>Data.json</strong> file to continue.
      </p>
      <label class="cta-btn primary" style="cursor:pointer;display:inline-block;padding:14px 28px;border-radius:14px;font-size:15px;font-weight:600;background:linear-gradient(135deg,#6366f1,#06b6d4);color:white;box-shadow:0 8px 24px rgba(99,102,241,0.35)">
        📁 Choose Data.json
        <input type="file" accept=".json" id="jsonFileInput" style="display:none" />
      </label>
      <p style="font-size:12px;color:var(--text3);margin-top:16px">
        💡 Tip: For one-click launch, use <strong>VS Code Live Server</strong> or run:<br>
        <code style="background:var(--kbd-bg);padding:3px 8px;border-radius:5px;font-size:11px">python -m http.server</code>
      </p>
    </div>
  `;

  document.getElementById('jsonFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    overlay.innerHTML = `<div class="loading-card"><div class="spinner"></div><p class="loading-text">Loading ${file.name}…</p></div>`;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      initApp(raw);
    } catch (err) {
      overlay.innerHTML = `<div class="loading-card"><p class="loading-text" style="color:#ef4444">⚠️ Invalid JSON file. Please select the correct Data.json.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;border-radius:10px;border:none;background:var(--accent);color:white;cursor:pointer;font-family:inherit;font-weight:600">Try Again</button></div>`;
    }
  });
}

function initApp(raw) {
  STATE.data = raw;
  STATE.filtered = [...raw];
  STATE.duplicates = raw.filter(r => r.Duplicate);
  populateFilters();
  renderJobs();
  buildCharts();
  buildQualityData();
  animateCounters();
  document.getElementById('loadingOverlay').classList.add('done');
}

// ── Filters Population ─────────────────────────
function populateFilters() {
  const areas = [...new Set(STATE.data.map(r => r.Area).filter(Boolean))].sort();
  const areaEl = document.getElementById('filterArea');
  areas.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    areaEl.appendChild(opt);
  });

  const subjects = new Set();
  STATE.data.forEach(r => {
    if (r['Subjects/Jobs']) {
      r['Subjects/Jobs'].split('/').forEach(s => subjects.add(s.trim()));
    }
  });
  const subjEl = document.getElementById('filterSubject');
  [...subjects].sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    subjEl.appendChild(opt);
  });
}

// ── Filter & Sort ──────────────────────────────
function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const area = document.getElementById('filterArea').value;
  const subject = document.getElementById('filterSubject').value;
  const year = document.getElementById('filterYear').value;
  const dups = document.getElementById('filterDuplicates').value;
  const sort = document.getElementById('sortSelect').value;

  let results = STATE.data.filter(r => {
    if (q) {
      const haystack = [r['School Name'], r['Subjects/Jobs'], r.Area, r.Contact, r['Raw Ad Text']].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (area && r.Area !== area) return false;
    if (subject && !(r['Subjects/Jobs'] || '').split('/').map(s => s.trim()).includes(subject)) return false;
    if (year && String(r.Year) !== year) return false;
    if (dups === 'no' && r.Duplicate) return false;
    if (dups === 'yes' && !r.Duplicate) return false;
    return true;
  });

  // Sort
  results.sort((a, b) => {
    if (sort === 'date-desc') return (b.Date || '').localeCompare(a.Date || '');
    if (sort === 'date-asc') return (a.Date || '').localeCompare(b.Date || '');
    if (sort === 'school-az') return (a['School Name'] || '').localeCompare(b['School Name'] || '');
    if (sort === 'area-az') return (a.Area || '').localeCompare(b.Area || '');
    return 0;
  });

  STATE.filtered = results;
  STATE.page = 1;
  renderJobs();
}

// ── Job Rendering ──────────────────────────────
function renderJobs() {
  const grid = document.getElementById('jobsGrid');
  const { filtered, page, perPage } = STATE;
  const total = filtered.length;
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, total);
  const pageData = filtered.slice(start, end);

  // Meta
  document.getElementById('resultsCount').textContent =
    total === 0 ? '0 results' :
    `${t('showing')} ${start + 1}–${end} ${t('of')} ${total.toLocaleString()} ${t('results')}`;

  if (pageData.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <span class="no-results-icon">🔍</span>
      <div class="no-results-title">${t('noResults')}</div>
      <p style="font-size:13px;color:var(--text3);margin-top:8px;">${t('noResultsSub')}</p>
    </div>`;
    renderPagination('pagination', total, page, () => {});
    return;
  }

  grid.innerHTML = '';
  pageData.forEach((r, i) => {
    const card = createJobCard(r, i);
    grid.appendChild(card);
  });

  renderPagination('pagination', total, page, (p) => {
    STATE.page = p;
    renderJobs();
    document.getElementById('browseSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function createJobCard(r, i) {
  const card = document.createElement('div');
  card.className = 'job-card' + (r.Duplicate ? ' is-duplicate' : '');
  card.style.animationDelay = `${i * 0.03}s`;

  const subjects = (r['Subjects/Jobs'] || '').split('/').map(s => s.trim()).filter(Boolean).slice(0, 4);
  const subjectTags = subjects.map(s => `<span class="subject-tag">${s}</span>`).join('');
  const dupBadge = r.Duplicate ? `<span class="dup-badge">DUP</span>` : '';
  const contactShort = (r.Contact || '').substring(0, 35);

  card.innerHTML = `
    <div class="job-card-header">
      <div class="job-school">${escHtml(r['School Name'] || t('unknown'))}</div>
      ${dupBadge}
    </div>
    <div class="job-area">
      <div class="job-area-dot"></div>
      ${escHtml(r.Area || t('unknown'))}
    </div>
    <div class="job-subjects">${subjectTags || `<span class="subject-tag">${t('unknown')}</span>`}</div>
    <div class="job-footer">
      <span class="job-year">📅 ${r.Year || '—'}</span>
      ${contactShort ? `<span class="job-contact">📞 ${escHtml(contactShort)}</span>` : ''}
    </div>
  `;
  card.addEventListener('click', () => openModal(r));
  return card;
}

// ── Duplicate Grid ─────────────────────────────
function renderDuplicates() {
  const grid = document.getElementById('duplicatesGrid');
  const { dupPage, perPage } = STATE;
  const data = STATE.duplicates;
  const total = data.length;
  const start = (dupPage - 1) * perPage;
  const end = Math.min(start + perPage, total);
  const pageData = data.slice(start, end);

  document.getElementById('dupCount').textContent = `${total.toLocaleString()} records`;

  grid.innerHTML = '';
  pageData.forEach((r, i) => grid.appendChild(createJobCard(r, i)));

  renderPagination('dupPagination', total, dupPage, (p) => {
    STATE.dupPage = p;
    renderDuplicates();
  });
}

// ── Pagination ─────────────────────────────────
function renderPagination(containerId, total, currentPage, onPage) {
  const container = document.getElementById(containerId);
  const totalPages = Math.ceil(total / STATE.perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const maxButtons = 7;
  let pages = [];
  if (totalPages <= maxButtons) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    pages = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  container.innerHTML = '';

  const prevBtn = btn(t('prev'), () => onPage(currentPage - 1), currentPage === 1);
  container.appendChild(prevBtn);

  pages.forEach(p => {
    if (p === '...') {
      const el = document.createElement('span');
      el.textContent = '…'; el.style.color = 'var(--text3)'; el.style.padding = '0 4px';
      container.appendChild(el);
    } else {
      const b = btn(p, () => onPage(p), false, p === currentPage);
      container.appendChild(b);
    }
  });

  const nextBtn = btn(t('next'), () => onPage(currentPage + 1), currentPage === totalPages);
  container.appendChild(nextBtn);
}

function btn(label, onClick, disabled, active = false) {
  const b = document.createElement('button');
  b.className = 'page-btn' + (active ? ' active' : '');
  b.textContent = label;
  b.disabled = disabled;
  if (!disabled) b.addEventListener('click', onClick);
  return b;
}

// ── Modal ──────────────────────────────────────
function openModal(r) {
  const body = document.getElementById('modalBody');
  const subjects = (r['Subjects/Jobs'] || '—').split('/').map(s => `<span class="subject-tag">${escHtml(s.trim())}</span>`).join(' ');

  body.innerHTML = `
    <div class="modal-school">${escHtml(r['School Name'] || t('unknown'))}</div>
    ${r.Duplicate ? `<span class="dup-badge" style="margin-bottom:16px;display:inline-block;">Duplicate Record</span>` : ''}
    <div class="modal-row"><span class="modal-label">📍 ${t('area')}</span><span>${escHtml(r.Area || t('unknown'))}</span></div>
    <div class="modal-row"><span class="modal-label">📚 ${t('subjects')}</span><div style="display:flex;flex-wrap:wrap;gap:6px">${subjects}</div></div>
    <div class="modal-row"><span class="modal-label">📅 ${t('year')}</span><span>${r.Year || '—'}</span></div>
    <div class="modal-row"><span class="modal-label">🗓️ ${t('date')}</span><span>${r.Date || '—'}</span></div>
    ${r.Contact ? `<div class="modal-row"><span class="modal-label">📞 ${t('contact')}</span><span style="word-break:break-all">${escHtml(r.Contact)}</span></div>` : ''}
    <div class="modal-row"><span class="modal-label">🔁 ${t('duplicate')}</span><span>${r.Duplicate ? t('yes') : t('no')}</span></div>
    ${r['Raw Ad Text'] ? `
      <div class="modal-ad">
        <div class="modal-ad-label">📝 ${t('rawAd')}</div>
        ${escHtml(r['Raw Ad Text'])}
      </div>` : ''}
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ── Instructions ───────────────────────────────
document.getElementById('instructionsBtn').addEventListener('click', () => {
  document.getElementById('instructionsOverlay').classList.add('open');
});
document.getElementById('instructionsClose').addEventListener('click', () => {
  document.getElementById('instructionsOverlay').classList.remove('open');
});
document.getElementById('instructionsOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('instructionsOverlay').classList.remove('open');
});

// ── Tab Navigation ─────────────────────────────
function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const indicator = document.querySelector('.tab-indicator');

  function moveIndicator(btn) {
    const nav = document.querySelector('.tab-nav');
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    indicator.style.width = btnRect.width + 'px';
    indicator.style.transform = `translateX(${btnRect.left - navRect.left - 6}px)`;
  }

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      moveIndicator(btn);

      const tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab-content]').forEach(s => {
        s.classList.toggle('hidden', s.dataset.tabContent !== tab);
      });
      if (tab === 'duplicates') renderDuplicates();
    });
  });

  // Init indicator position
  setTimeout(() => moveIndicator(document.querySelector('.tab-btn.active')), 100);
  window.addEventListener('resize', () => moveIndicator(document.querySelector('.tab-btn.active')));
}

// ── Charts ─────────────────────────────────────
function getChartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: dark ? '#94a3b8' : '#475569',
    grid: dark ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.15)',
    accent1: '#6366f1', accent2: '#06b6d4', accent3: '#a855f7',
    accent4: '#ec4899', accent5: '#f59e0b', accent6: '#10b981',
  };
}

function destroyCharts() {
  Object.values(STATE.charts).forEach(c => { try { c.destroy(); } catch(_) {} });
  STATE.charts = {};
}

function rebuildCharts() { destroyCharts(); buildCharts(); buildQualityData(); }

function buildCharts() {
  const c = getChartColors();
  const defaults = {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { labels: { color: c.text, font: { family: 'Outfit', size: 12 } } } },
    scales: {
      x: { ticks: { color: c.text }, grid: { color: c.grid } },
      y: { ticks: { color: c.text }, grid: { color: c.grid } },
    }
  };

  // Year bar chart
  const yearData = { '2020':2343,'2021':5086,'2022':5530,'2023':3588,'2024':3057 };
  STATE.charts.year = new Chart(document.getElementById('chartYear'), {
    type: 'bar',
    data: {
      labels: Object.keys(yearData),
      datasets: [{
        label: 'Vacancies',
        data: Object.values(yearData),
        backgroundColor: ['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b'].map(c => c + 'cc'),
        borderColor: ['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b'],
        borderWidth: 2, borderRadius: 8,
      }]
    },
    options: { ...defaults, plugins: { ...defaults.plugins, legend: { display: false } } }
  });

  // Area horizontal bar
  const areaLabels = ['New Cairo','6th of October','Nasr City','Maadi','El Moqattam','El Haram','Marrioutia','Giza','Sheikh Zayed','El Manial'];
  const areaData = [1646,1568,1204,1067,1046,859,508,465,445,395];
  STATE.charts.area = new Chart(document.getElementById('chartArea'), {
    type: 'bar',
    data: {
      labels: areaLabels,
      datasets: [{
        label: 'Vacancies',
        data: areaData,
        backgroundColor: '#06b6d4cc',
        borderColor: '#06b6d4', borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      ...defaults, indexAxis: 'y',
      plugins: { ...defaults.plugins, legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } }
      }
    }
  });

  // Subject bar chart
  const subjLabels = ['English','Computer Sci','Teacher','Phys. Ed','Mathematics','Arabic','Science','Art Ed','French','Social Studies','KG Teacher','German','Co-Teacher','Music','Homeroom'];
  const subjData = [10214,9286,7621,7018,4877,4389,3643,2743,2113,2014,1843,1706,1276,1228,986];
  const colors = ['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b','#10b981','#f97316','#8b5cf6','#0ea5e9','#14b8a6','#d946ef','#6366f1','#06b6d4','#a855f7','#ec4899'];
  STATE.charts.subject = new Chart(document.getElementById('chartSubject'), {
    type: 'bar',
    data: {
      labels: subjLabels,
      datasets: [{
        label: 'Mentions',
        data: subjData,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors, borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      ...defaults, indexAxis: 'y',
      plugins: { ...defaults.plugins, legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 10 } }, grid: { color: c.grid } }
      }
    }
  });

  // Monthly trend (approximate distribution)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = [1200,980,1450,1600,1300,800,600,2100,2800,2400,2100,1274];
  STATE.charts.monthly = new Chart(document.getElementById('chartMonthly'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Vacancies',
        data: monthlyData,
        borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#6366f1',
        borderWidth: 3,
      }]
    },
    options: defaults
  });
}

// ── Data Quality ───────────────────────────────
function buildQualityData() {
  const c = getChartColors();
  const total = STATE.data.length;
  const dups = STATE.duplicates.length;
  const unique = total - dups;

  // Donut
  if (STATE.charts.donut) STATE.charts.donut.destroy();
  STATE.charts.donut = new Chart(document.getElementById('donutDuplicates'), {
    type: 'doughnut',
    data: {
      labels: ['Unique','Duplicates'],
      datasets: [{
        data: [unique, dups],
        backgroundColor: ['rgba(99,102,241,0.8)','rgba(236,72,153,0.8)'],
        borderColor: ['#6366f1','#ec4899'], borderWidth: 2,
      }]
    },
    options: {
      responsive: true, cutout: '70%',
      plugins: { legend: { labels: { color: c.text, font: { family: 'Outfit', size: 12 } } } }
    }
  });

  // Missing data
  const fields = ['School Name','Area','Contact','Raw Ad Text','Subjects/Jobs'];
  const missing = fields.map(f => STATE.data.filter(r => !r[f] || r[f] === '(Unknown)' || r[f] === '(See ad text)').length);

  if (STATE.charts.missing) STATE.charts.missing.destroy();
  STATE.charts.missing = new Chart(document.getElementById('chartMissing'), {
    type: 'bar',
    data: {
      labels: ['School Name','Area','Contact','Raw Ad','Subjects'],
      datasets: [{
        label: 'Missing / Unknown',
        data: missing,
        backgroundColor: ['#f59e0bcc','#f97316cc','#ef4444cc','#a855f7cc','#06b6d4cc'],
        borderColor: ['#f59e0b','#f97316','#ef4444','#a855f7','#06b6d4'],
        borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { color: c.grid } }
      }
    }
  });

  // Quality stats
  const withContact = STATE.data.filter(r => r.Contact).length;
  const withRaw = STATE.data.filter(r => r['Raw Ad Text']).length;
  const unknown = STATE.data.filter(r => !r.Area || r.Area === '(Unknown)').length;
  const named = total - unknown;

  document.getElementById('unknownCount').textContent = unknown.toLocaleString();
  document.getElementById('namedCount').textContent = named.toLocaleString();
  document.getElementById('contactCount').textContent = withContact.toLocaleString();
  document.getElementById('rawCount').textContent = withRaw.toLocaleString();
  document.getElementById('donutPct').textContent = Math.round((dups / total) * 100) + '%';
}

// ── Counter Animation ──────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let start = 0;
    const dur = 1500;
    const step = target / (dur / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = Math.round(start).toLocaleString();
      if (start >= target) clearInterval(timer);
    }, 16);
  });
}

// ── Keyboard Shortcuts ─────────────────────────
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

  if (e.key === 'Escape') {
    closeModal();
    document.getElementById('instructionsOverlay').classList.remove('open');
  }
  if (!typing) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
    if (e.key === '?' || e.key === '/') {
      e.preventDefault();
      document.getElementById('instructionsOverlay').classList.add('open');
    }
    if (e.key === 't' || e.key === 'T') {
      setTheme(STATE.theme === 'dark' ? 'light' : 'dark');
    }
    if (e.key === 'l' || e.key === 'L') {
      setLang(STATE.lang === 'en' ? 'ar' : 'en');
    }
  }
});

// ── Event Listeners ────────────────────────────
let searchTimer;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 300);
});
document.getElementById('filterArea').addEventListener('change', applyFilters);
document.getElementById('filterSubject').addEventListener('change', applyFilters);
document.getElementById('filterYear').addEventListener('change', applyFilters);
document.getElementById('filterDuplicates').addEventListener('change', applyFilters);
document.getElementById('sortSelect').addEventListener('change', applyFilters);
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterArea').value = '';
  document.getElementById('filterSubject').value = '';
  document.getElementById('filterYear').value = '';
  document.getElementById('filterDuplicates').value = '';
  document.getElementById('sortSelect').value = 'date-desc';
  applyFilters();
});

// ── Helpers ────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────
initTheme();
initTabs();
loadData();
