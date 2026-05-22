/* =============================================
   TeachyJobs — Full App with All 14 Features
   ============================================= */
'use strict';

// ── State ──────────────────────────────────────
const STATE = {
  data: [], filtered: [], duplicates: [],
  bookmarks: new Set(),
  page: 1, dupPage: 1, perPage: 20,
  lang: 'en', theme: 'light',
  charts: {}, activeChip: null,
};

// ── Theme ───────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('tj-theme') || 'light';
  setTheme(saved, false);
}
function setTheme(theme, redraw = true) {
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('tj-theme', theme);
  if (redraw && STATE.data.length) setTimeout(rebuildCharts, 350);
}
document.getElementById('themeToggle').addEventListener('click', () => setTheme(STATE.theme === 'dark' ? 'light' : 'dark'));

// ── Language ────────────────────────────────────
function setLang(lang) {
  STATE.lang = lang;
  const isAr = lang === 'ar';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.getElementById('langLabel').textContent = isAr ? 'EN' : 'AR';
  document.getElementById('searchInput').placeholder = isAr
    ? 'ابحث بالمدرسة أو المادة أو المنطقة...'
    : 'Search school, subject, area, contact...';
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
  });
}
document.getElementById('langToggle').addEventListener('click', () => setLang(STATE.lang === 'en' ? 'ar' : 'en'));

// ── Bookmarks ────────────────────────────────────
function loadBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem('tj-bookmarks') || '[]');
    STATE.bookmarks = new Set(saved);
  } catch (_) { STATE.bookmarks = new Set(); }
  updateBookmarkBadge();
}
function saveBookmarks() {
  localStorage.setItem('tj-bookmarks', JSON.stringify([...STATE.bookmarks]));
  updateBookmarkBadge();
}
function toggleBookmark(id) {
  if (STATE.bookmarks.has(id)) STATE.bookmarks.delete(id);
  else STATE.bookmarks.add(id);
  saveBookmarks();
  const isNow = STATE.bookmarks.has(id);
  document.querySelectorAll(`.star-btn[data-id="${CSS.escape(id)}"]`).forEach(btn => {
    btn.textContent = isNow ? '⭐' : '☆';
    btn.classList.toggle('starred', isNow);
  });
  if (document.querySelector('.tab-btn[data-tab="bookmarks"]')?.classList.contains('active')) {
    renderBookmarks();
  }
}
function updateBookmarkBadge() {
  const n = STATE.bookmarks.size;
  document.getElementById('bookmarkBadge').textContent = n;
  document.getElementById('tabCountBookmarks').textContent = n;
}
document.getElementById('bookmarksNavBtn').addEventListener('click', () => switchTab('bookmarks'));
document.getElementById('clearBookmarks').addEventListener('click', () => {
  if (!STATE.bookmarks.size) return;
  if (confirm('Clear all saved vacancies?')) {
    STATE.bookmarks.clear(); saveBookmarks(); renderBookmarks();
  }
});

function renderBookmarks() {
  const grid = document.getElementById('bookmarksGrid');
  const empty = document.getElementById('bookmarksEmpty');
  const records = STATE.data.filter((r, i) => STATE.bookmarks.has(makeId(r, i)));
  if (!records.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  _renderQ = '';
  const bkFrag = document.createDocumentFragment();
  records.forEach(r => bkFrag.appendChild(createJobRow(r, STATE._indexMap?.get(r) ?? 0)));
  grid.innerHTML = '';
  grid.appendChild(bkFrag);
}
function makeId(r, fallback) {
  return `${r.n||''}|${r.d||''}|${r.a||''}|${r.s||''}`;
}
function findIdx(r) {
  return STATE.data.indexOf(r);
}

// ── Data Loading ────────────────────────────────
async function loadData() {
  // Build candidate URLs automatically — works on ANY repo, no hardcoding needed
  const candidates = [];

  // 1. Same folder as the HTML file (relative — always works on any server)
  candidates.push('./Data.json');
  candidates.push('./Data');

  // 2. If on GitHub Pages (username.github.io/repo), build raw.githubusercontent.com URL
  if (location.hostname.endsWith('github.io')) {
    const user = location.hostname.split('.')[0];
    const repo = location.pathname.split('/').filter(Boolean)[0] || '';
    const base = `https://raw.githubusercontent.com/${user}/${repo}`;
    candidates.unshift(`${base}/main/Data.json`);
    candidates.unshift(`${base}/main/Data`);
    candidates.unshift(`${base}/master/Data.json`);
    candidates.unshift(`${base}/master/Data`);
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) continue;
      const parsed = JSON.parse(trimmed);
      const raw = Array.isArray(parsed) ? parsed : (parsed.records || parsed);
      if (!raw || !raw.length) continue;
      console.log('[TeachyJobs] Loaded from:', url);
      initApp(raw, parsed); return;
    } catch (e) { console.warn('[TeachyJobs] Skipped:', url, e.message); continue; }
  }

  // Nothing worked — show file picker as last resort
  showFilePicker();
}

function showFilePicker() {
  document.getElementById('loadingOverlay').innerHTML = `
    <div class="loading-card" style="max-width:400px;text-align:center;padding:32px">
      <div style="font-size:48px;margin-bottom:14px">📂</div>
      <div style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:10px">Load Data.json</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.6">Browsers block direct file access.<br>Select your <strong>Data.json</strong> file to continue.</p>
      <label class="cta-btn primary" style="cursor:pointer;display:inline-block">
        📁 Choose Data.json
        <input type="file" accept=".json" id="jsonFileInput" style="display:none"/>
      </label>
      <p style="font-size:11px;color:var(--text3);margin-top:14px">Tip: Use VS Code Live Server or <code>python -m http.server</code> to skip this step.</p>
    </div>`;
  document.getElementById('jsonFileInput').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('loadingOverlay').innerHTML = `<div class="loading-card"><div class="spinner"></div><p class="loading-text">Loading…</p></div>`;
    try {
      const parsed = JSON.parse(await file.text());
      const raw = Array.isArray(parsed) ? parsed : (parsed.records || parsed);
      initApp(raw, parsed);
    }
    catch (_) { document.querySelector('.loading-text').textContent = '⚠️ Invalid JSON. Please select the correct Data.json.'; }
  });
}

function initApp(raw, meta) {
  // raw is flat array with short keys {i,n,s,a,c,y,d,dup}
  STATE.data = raw;
  STATE.meta = meta || {};
  STATE.filtered = [...raw];
  STATE.duplicates = raw.filter(r => r.dup);
  STATE._indexMapStale = true;
  loadBookmarks();
  populateFilters(meta);
  setupGridDelegation();
  switchTab('browse', false);
  renderJobs();
  buildCharts();
  buildQualityData();
  animateCounters();
  document.getElementById('loadingOverlay').classList.add('done');
}

// Event delegation — one listener per grid, handles all row interactions
function setupGridDelegation() {
  ['jobsGrid','duplicatesGrid','bookmarksGrid'].forEach(gridId => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('click', e => {
      const row = e.target.closest('.job-card');
      if (!row) return;
      const idx = parseInt(row.dataset.idx);
      const r = STATE.data[idx];
      if (!r) return;

      // Star button
      if (e.target.closest('.star-btn')) {
        e.stopPropagation();
        toggleBookmark(row.dataset.id);
        const btn = e.target.closest('.star-btn');
        const isNow = STATE.bookmarks.has(row.dataset.id);
        btn.textContent = isNow ? '⭐' : '☆';
        btn.classList.toggle('starred', isNow);
        return;
      }

      // Copy contact button
      if (e.target.closest('.copy-contact-btn')) {
        e.stopPropagation();
        const contact = row.dataset.contact;
        const btn = e.target.closest('.copy-contact-btn');
        navigator.clipboard.writeText(contact).then(() => {
          btn.textContent = '✓'; btn.classList.add('copied');
          setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1500);
        });
        return;
      }

      // School name link
      if (e.target.closest('.job-school-link')) {
        e.stopPropagation();
        openSchoolModal(row.dataset.school);
        return;
      }

      // Row click → modal
      openModal(r);
    });
  });
}

// ── Populate Filters ─────────────────────────────
function populateFilters(meta) {
  const areas = [...new Set(STATE.data.map(r => r.a).filter(a => a && a !== '(Unknown)' && a !== ''))].sort();
  const areaEl = document.getElementById('filterArea');
  areas.forEach(a => { const o = document.createElement('option'); o.value = o.textContent = a; areaEl.appendChild(o); });

  const subjects = new Set();
  STATE.data.forEach(r => { if (r.s) r.s.split('/').forEach(s => { const t=s.trim(); if(t) subjects.add(t); }); });
  const subjEl = document.getElementById('filterSubject');
  [...subjects].sort().forEach(s => { const o = document.createElement('option'); o.value = o.textContent = s; subjEl.appendChild(o); });

  const years = [...new Set(STATE.data.map(r => r.y).filter(Boolean))].sort();
  const yearEl = document.getElementById('filterYear');
  while (yearEl.options.length > 1) yearEl.remove(1);
  years.forEach(y => { const o = document.createElement('option'); o.value = o.textContent = y; yearEl.appendChild(o); });

  // Hero badge — use meta.period if available, else derive from data
  const badge = document.getElementById('heroBadge');
  if (meta && meta.period) {
    // Extract years from period string "2020-01-01 to 2026-05-21"
    const parts = meta.period.match(/\d{4}/g);
    const from = parts ? parts[0] : years[0];
    const to   = parts ? parts[parts.length-1] : years[years.length-1];
    badge.textContent = `📋 School Vacancies · ${from} – ${to}`;
  } else if (years.length) {
    const range = years.length > 1 ? `${years[0]} – ${years[years.length-1]}` : years[0];
    badge.textContent = `📋 School Vacancies · ${range}`;
  }

  // Update hero stat counts — prefer meta totals if available
  const counters = document.querySelectorAll('.stat-num[data-count]');
  const totalCount = (meta && meta.total) ? meta.total : STATE.data.length;
  [totalCount, areas.length, subjects.size, years.length].forEach((v, i) => {
    if (counters[i]) counters[i].dataset.count = v;
  });
}

// ── Filters ──────────────────────────────────────
function applyFilters() {
  const q     = document.getElementById('searchInput').value.toLowerCase().trim();
  const area  = document.getElementById('filterArea').value;
  const subj  = document.getElementById('filterSubject').value;
  const year  = document.getElementById('filterYear').value;
  const dup   = document.getElementById('filterDuplicates').value;
  const sort  = document.getElementById('sortSelect').value;
  const ct    = document.getElementById('filterContact').value;
  const from  = document.getElementById('dateFrom').value;
  const to    = document.getElementById('dateTo').value;
  const useDR = from || to;

  // Mutual exclusivity
  document.getElementById('filterYear').classList.toggle('locked', !!useDR);
  document.getElementById('dateFrom').classList.toggle('locked', !!year && !useDR);
  document.getElementById('dateTo').classList.toggle('locked', !!year && !useDR);
  document.getElementById('mutexNote').style.display = useDR ? 'inline' : 'none';

  STATE._indexMapStale = false; // index map stays valid, data doesn't change
  STATE.filtered = STATE.data.filter(r => {
    if (q) {
      const hay = [r.n, r.s, r.a, r.c, r.rawAd].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (area && r.a !== area) return false;
    if (subj && !(r.s || '').split('/').map(s => s.trim()).includes(subj)) return false;
    if (!useDR && year && r.y !== year) return false;
    if (useDR) {
      const rd = (r.d||'').substring(0,10);
      if (from && rd < from) return false;
      if (to && rd > to) return false;
    }
    if (dup === 'no' && r.dup) return false;
    if (dup === 'yes' && !r.dup) return false;
    if (ct === 'email' && !(r.c && r.c.includes('@'))) return false;
    if (ct === 'phone' && !(r.c && !r.c.includes('@') && /\d/.test(r.c))) return false;
    if (ct==='has' && !r.c) return false;
    if (ct==='none' && r.c) return false;
    return true;
  });

  STATE.filtered.sort((a, b) => {
    if (sort === 'date-desc') return (b.Date || '').localeCompare(a.Date || '');
    if (sort === 'date-asc')  return (a.Date || '').localeCompare(b.Date || '');
    if (sort === 'school-az') return (a['School Name'] || '').localeCompare(b['School Name'] || '');
    if (sort === 'area-az')   return (a.Area || '').localeCompare(b.Area || '');
    return 0;
  });

  STATE.page = 1;
  renderJobs();
  updateTabCount('browse', STATE.filtered.length);
}

// ── Render Jobs ──────────────────────────────────
function renderJobs() {
  const grid = document.getElementById('jobsGrid');
  const { filtered, page, perPage } = STATE;
  const total = filtered.length;
  const start = (page - 1) * perPage;
  const end   = Math.min(start + perPage, total);
  const slice = filtered.slice(start, end);

  document.getElementById('resultsCount').textContent =
    total === 0 ? '0 results' : `Showing ${(start+1).toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} results`;

  if (!slice.length) {
    grid.innerHTML = '<div class="no-results"><span class="no-results-icon">🔍</span><div class="no-results-title">No vacancies found</div><p style="font-size:13px;color:var(--text3);margin-top:8px">Try adjusting your filters or search terms.</p></div>';
    renderPagination('pagination', total, page, p => { STATE.page = p; renderJobs(); scrollToGrid(); });
    return;
  }

  // Cache query once for entire batch
  _renderQ = document.getElementById('searchInput').value.toLowerCase().trim();

  // Build index map once — avoids O(n) indexOf per row
  if (!STATE._indexMap || STATE._indexMapStale) {
    STATE._indexMap = new Map(STATE.data.map((r, i) => [r, i]));
    STATE._indexMapStale = false;
  }

  const frag = document.createDocumentFragment();
  slice.forEach(r => frag.appendChild(createJobRow(r, STATE._indexMap.get(r) ?? 0)));
  grid.innerHTML = '';
  grid.appendChild(frag);

  renderPagination('pagination', total, page, p => { STATE.page = p; renderJobs(); scrollToGrid(); });
}

function scrollToGrid() {
  document.getElementById('jobsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Create Job Row ────────────────────────────────
// Cached query for current render batch
let _renderQ = '';

function createJobRow(r, dataIdx) {
  const id = makeId(r, dataIdx);
  const isBookmarked = STATE.bookmarks.has(id);
  const q = _renderQ;

  const subjects = r.s ? r.s.split('/').map(s => s.trim()).filter(Boolean).slice(0, 5) : [];
  const contactStr = r.c || '';

  const row = document.createElement('div');
  row.className = 'job-card' + (r.dup ? ' is-duplicate' : '');
  row.dataset.idx = dataIdx;
  row.dataset.id = id;
  row.dataset.contact = contactStr;
  row.dataset.school = r.n || '';

  // Build innerHTML as single string — fastest approach
  let html = '<div class="job-card-header"><div class="job-school"><button class="job-school-link">';
  html += highlight(r.n || 'Unknown', q);
  html += '</button></div>';
  if (r.dup) html += '<span class="dup-badge">DUP</span>';
  html += '</div>';

  html += '<div class="job-meta-row"><div class="job-area"><div class="job-area-dot"></div>';
  html += highlight(r.a || 'Unknown', q);
  html += '</div><div class="job-subjects">';
  if (subjects.length) {
    subjects.forEach(s => { html += '<span class="subject-tag">'; html += highlight(s, q); html += '</span>'; });
  } else { html += '<span class="subject-tag">—</span>'; }
  html += '</div></div>';

  html += '<div class="job-right-meta"><div class="row-actions">';
  html += `<button class="star-btn${isBookmarked?' starred':''}" title="Save">${isBookmarked?'⭐':'☆'}</button>`;
  html += `<span class="job-year">📅 ${r.y || '—'}</span>`;
  html += '</div>';
  if (contactStr) {
    html += `<div class="job-contact-wrap"><button class="copy-contact-btn" title="Copy">📋</button>`;
    html += `<span class="job-contact">${highlight(contactStr.substring(0, 38), q)}</span></div>`;
  }
  html += '</div>';

  row.innerHTML = html;
  return row;
}

// ── Keyword Highlight ─────────────────────────────
function highlight(text, q) {
  if (!q || !text) return escHtml(String(text || ''));
  const safe = escHtml(String(text));
  const safeQ = escHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark class="highlight">$1</mark>');
}

// ── Duplicate Grid ────────────────────────────────
function renderDuplicates() {
  const grid = document.getElementById('duplicatesGrid');
  const { dupPage, perPage } = STATE;
  const data = STATE.duplicates;
  const total = data.length;
  const start = (dupPage - 1) * perPage;
  const slice = data.slice(start, Math.min(start + perPage, total));
  document.getElementById('dupCount').textContent = `${total.toLocaleString()} records`;
  grid.innerHTML = '';
  _renderQ = '';
  const dupFrag = document.createDocumentFragment();
  slice.forEach(r => dupFrag.appendChild(createJobRow(r, STATE._indexMap?.get(r) ?? 0)));
  grid.innerHTML = '';
  grid.appendChild(dupFrag);
  renderPagination('dupPagination', total, dupPage, p => { STATE.dupPage = p; renderDuplicates(); });
}

// ── Pagination ────────────────────────────────────
function renderPagination(id, total, cur, onPage) {
  const cont = document.getElementById(id);
  const pages = Math.ceil(total / STATE.perPage);
  if (pages <= 1) { cont.innerHTML = ''; return; }
  const nums = [];
  if (pages <= 7) { for (let i=1;i<=pages;i++) nums.push(i); }
  else {
    nums.push(1);
    if (cur > 3) nums.push('…');
    for (let i=Math.max(2,cur-1);i<=Math.min(pages-1,cur+1);i++) nums.push(i);
    if (cur < pages-2) nums.push('…');
    nums.push(pages);
  }
  cont.innerHTML = '';
  const mk = (label, cb, dis, act) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (act ? ' active' : '');
    b.textContent = label; b.disabled = dis;
    if (!dis) b.addEventListener('click', cb);
    return b;
  };
  cont.appendChild(mk('← Prev', () => onPage(cur-1), cur===1));
  nums.forEach(p => {
    if (p === '…') { const s = document.createElement('span'); s.textContent='…'; s.style='color:var(--text3);padding:0 4px'; cont.appendChild(s); }
    else cont.appendChild(mk(p, () => onPage(p), false, p===cur));
  });
  cont.appendChild(mk('Next →', () => onPage(cur+1), cur===pages));
}

// ── Job Modal ─────────────────────────────────────
function openModal(r) {
  const body = document.getElementById('modalBody');
  const similar = document.getElementById('modalSimilar');
  const modalSubjects = r.s ? r.s.split('/').map(s => `<span class="subject-tag">${escHtml(s.trim())}</span>`).join(' ') : '—';
  body.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
      <div class="modal-school" style="flex:1">${escHtml(r.n || 'Unknown School')}</div>
      ${r.dup ? '<span class="dup-badge" style="margin-top:4px">Duplicate</span>' : ''}
    </div>
    <div class="modal-row"><span class="modal-label">📍 Area</span><span>${escHtml(r.a||'—')}</span></div>
    <div class="modal-row"><span class="modal-label">📚 Subjects</span><div style="display:flex;flex-wrap:wrap;gap:5px">${modalSubjects}</div></div>
    <div class="modal-row"><span class="modal-label">📅 Year</span><span>${r.y||'—'}</span></div>
    <div class="modal-row"><span class="modal-label">🗓️ Date</span><span>${r.d||'—'}</span></div>
    ${r.c ? `<div class="modal-row"><span class="modal-label">📞 Contact</span>
      <span style="word-break:break-all">${escHtml(r.c)}
        <button onclick="navigator.clipboard.writeText('${escHtml(r.c)}');this.textContent='✓ Copied!';setTimeout(()=>this.textContent='Copy',1500)" style="margin-left:8px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--accent);font-size:11px;cursor:pointer;font-family:inherit;font-weight:600">Copy</button>
      </span></div>` : ''}
    <div class="modal-row"><span class="modal-label">🔁 Duplicate</span><span>${r.dup ? 'Yes' : 'No'}</span></div>
    ${r.rawAd ? `<div class="modal-ad"><div class="modal-ad-label">📝 Original Ad</div>${escHtml(r.rawAd)}</div>` : '<div style="font-size:12px;color:var(--text3);margin-top:12px">No original ad text available.</div>'}
  `;

  // Similar vacancies (same school OR same area, different record)
  const sn = r.n || '';
  const an = r.a || '';
  const similars = STATE.data.filter(d =>
    d !== r &&
    (d['School Name'] === schoolName || (d.Area === areaName && areaName && areaName !== '(Unknown)'))
  ).slice(0, 5);

  if (similars.length) {
    similar.innerHTML = `<div class="modal-similar-title">Similar Vacancies</div>` +
      similars.map(s => `<div class="similar-row" data-idx="${STATE.data.indexOf(s)}">
        <span><strong>${escHtml(s['School Name']||'?')}</strong> · ${escHtml(s.Area||'—')}</span>
        <span style="color:var(--text3);font-size:11px">${s.Year||'—'}</span>
      </div>`).join('');
    similar.querySelectorAll('.similar-row').forEach(el => {
      el.addEventListener('click', () => openModal(STATE.data[+el.dataset.idx]));
    });
  } else { similar.innerHTML = ''; }

  document.getElementById('modalOverlay').classList.add('open');
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeModal(); });
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ── School Profile Modal ──────────────────────────
function openSchoolModal(name) {
  if (!name || name.startsWith('(Unknown')) return;
  const records = STATE.data.filter(r => r.n === name);
  const yrs = [...new Set(records.map(r => r.y))].sort().join(', ');
  const body = document.getElementById('schoolBody');
  body.innerHTML = `
    <div class="school-modal-title">🏫 ${escHtml(name)}</div>
    <div class="school-modal-meta">${records.length} postings · Years: ${yrs}</div>
    <div class="jobs-grid" id="schoolJobsGrid"></div>
  `;
  const grid = document.getElementById('schoolJobsGrid');
  _renderQ = '';
  const sFrag = document.createDocumentFragment();
  records.slice(0, 20).forEach(r => sFrag.appendChild(createJobRow(r, STATE._indexMap?.get(r) ?? 0)));
  grid.appendChild(sFrag);
  document.getElementById('schoolOverlay').classList.add('open');
}
document.getElementById('schoolClose').addEventListener('click', () => document.getElementById('schoolOverlay').classList.remove('open'));
document.getElementById('schoolOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) document.getElementById('schoolOverlay').classList.remove('open'); });

// ── Instructions ──────────────────────────────────
document.getElementById('instructionsBtn').addEventListener('click', () => document.getElementById('instructionsOverlay').classList.add('open'));
document.getElementById('instructionsClose').addEventListener('click', () => document.getElementById('instructionsOverlay').classList.remove('open'));
document.getElementById('instructionsOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) document.getElementById('instructionsOverlay').classList.remove('open'); });

// ── Tab Navigation ────────────────────────────────
function switchTab(tab, scroll=true) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.querySelectorAll('[data-tab-content]').forEach(s => s.classList.toggle('hidden', s.dataset.tabContent !== tab));
  moveIndicator();
  if (tab === 'duplicates') renderDuplicates();
  if (tab === 'bookmarks') renderBookmarks();
  if (scroll) document.getElementById('tabNav').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function moveIndicator() {
  const active = document.querySelector('.tab-btn.active');
  const nav = document.querySelector('.tab-nav');
  const ind = document.querySelector('.tab-indicator');
  if (!active || !nav || !ind) return;
  const nr = nav.getBoundingClientRect(), br = active.getBoundingClientRect();
  ind.style.width = br.width + 'px';
  ind.style.transform = `translateX(${br.left - nr.left - 5}px)`;
}
function updateTabCount(tab, count) {
  const el = document.getElementById(`tabCount${tab.charAt(0).toUpperCase()+tab.slice(1)}`);
  if (el) el.textContent = count.toLocaleString();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
window.addEventListener('resize', () => setTimeout(moveIndicator, 100));

// ── Quick Chips ───────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const wasActive = chip.classList.contains('active');
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (!wasActive) {
      chip.classList.add('active');
      if (chip.dataset.subject) document.getElementById('filterSubject').value = chip.dataset.subject;
      if (chip.dataset.area)    document.getElementById('filterArea').value    = chip.dataset.area;
      if (chip.dataset.year)    document.getElementById('filterYear').value    = chip.dataset.year;
      if (chip.dataset.contact) document.getElementById('filterContact').value = chip.dataset.contact;
    } else {
      if (chip.dataset.subject) document.getElementById('filterSubject').value = '';
      if (chip.dataset.area)    document.getElementById('filterArea').value    = '';
      if (chip.dataset.year)    document.getElementById('filterYear').value    = '';
      if (chip.dataset.contact) document.getElementById('filterContact').value = '';
    }
    applyFilters();
  });
});

// ── Filter Event Listeners ────────────────────────
let searchTimer;
document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 280); });
['filterArea','filterSubject','filterYear','filterDuplicates','sortSelect','filterContact','dateFrom','dateTo']
  .forEach(id => document.getElementById(id).addEventListener('change', applyFilters));

document.getElementById('clearFilters').addEventListener('click', () => {
  ['searchInput'].forEach(id => document.getElementById(id).value = '');
  ['filterArea','filterSubject','filterYear','filterDuplicates','filterContact','dateFrom','dateTo']
    .forEach(id => { document.getElementById(id).value = ''; document.getElementById(id).classList.remove('locked'); });
  document.getElementById('sortSelect').value = 'date-desc';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  applyFilters();
});

// ── Export ────────────────────────────────────────
function getExportData() {
  const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const { perPage } = STATE;

  if (tab === 'duplicates') {
    const start = (STATE.dupPage - 1) * perPage;
    return STATE.duplicates.slice(start, start + perPage);
  }
  if (tab === 'bookmarks') {
    const bkRecs = STATE.data.filter((r,i) => STATE.bookmarks.has(makeId(r,i)));
    return bkRecs; // bookmarks page is usually small, export all
  }
  // Browse tab: only current page
  const start = (STATE.page - 1) * perPage;
  return STATE.filtered.slice(start, start + perPage);
}
document.getElementById('exportExcel').addEventListener('click', () => {
  const data = getExportData();
  if (!data.length) return alert('No data to export on current page.');
  const headers = ['School Name','Subjects/Jobs','Area','Contact','Year','Date','Duplicate'];
  const bom = '\uFEFF';
  const rows = [headers.join(','), ...data.map(r => [
    r.n||'', r.s||'', r.a||'', r.c||'', r.y||'', r.d||'', r.dup?'Yes':'No'
  ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))];
  dlFile(bom + rows.join('\n'), 'TeachyJobs_Export.csv', 'text/csv;charset=utf-8;');
});
document.getElementById('exportTxt').addEventListener('click', () => {
  const data = getExportData();
  if (!data.length) return alert('No data to export.');
  const lines = data.map((r,i) => [
    `[${i+1}] ${r.n||'Unknown'}`,
    `    Area     : ${r.a||'—'}`,
    `    Subjects : ${r.s||'—'}`,
    `    Year     : ${r.y||'—'}  |  Date: ${r.d||'—'}`,
    `    Contact  : ${r.c||'—'}`,
    `    Duplicate: ${r.dup?'Yes':'No'}`,
    r.rawAd ? `    Ad Text  : ${String(r.rawAd).substring(0,120)}…` : '',
    ''
  ].filter(Boolean).join('\n')).join('\n');
  dlFile(`TeachyJobs Export\nTotal: ${data.length} records\nExported: ${new Date().toLocaleString()}\n${'─'.repeat(60)}\n\n${lines}`, 'TeachyJobs_Export.txt', 'text/plain;charset=utf-8;');
});
function dlFile(content, name, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Charts ────────────────────────────────────────
function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return { text: dark ? '#94a3b8':'#475569', grid: dark ? 'rgba(99,102,241,.1)':'rgba(148,163,184,.15)' };
}
function destroyCharts() { Object.values(STATE.charts).forEach(c => { try{c.destroy()}catch(_){} }); STATE.charts={}; }
function rebuildCharts() { destroyCharts(); buildCharts(); buildQualityData(); }

function buildCharts() {
  const cc = chartColors();
  const base = {
    responsive:true, maintainAspectRatio:true,
    plugins:{legend:{labels:{color:cc.text,font:{family:'Outfit',size:12}}}},
    scales:{x:{ticks:{color:cc.text},grid:{color:cc.grid}},y:{ticks:{color:cc.text},grid:{color:cc.grid}}}
  };
  const noLeg = {...base, plugins:{...base.plugins, legend:{display:false}}};

  // Year bar — use live data from meta or count from records
  const yrRaw = (STATE.meta && STATE.meta.years) ? STATE.meta.years : 
    STATE.data.reduce((acc,r)=>{ const y=String(r.y||''); if(y) acc[y]=(acc[y]||0)+1; return acc; },{});
  const yrData = Object.fromEntries(Object.entries(yrRaw).sort());
  const barColors = ['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b','#10b981','#f97316'];
  STATE.charts.year = new Chart(document.getElementById('chartYear'),{type:'bar',data:{
    labels:Object.keys(yrData),
    datasets:[{label:'Vacancies',data:Object.values(yrData),
      backgroundColor:['#6366f1cc','#06b6d4cc','#a855f7cc','#ec4899cc','#f59e0bcc'],
      borderColor:['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b'],borderWidth:2,borderRadius:8}]
  },options:{...noLeg}});

  // Area horizontal
  const aL=['New Cairo','6th of October','Nasr City','Maadi','El Moqattam','El Haram','Marrioutia','Giza','Sheikh Zayed','El Manial'];
  const aD=[1646,1568,1204,1067,1046,859,508,465,445,395];
  STATE.charts.area = new Chart(document.getElementById('chartArea'),{type:'bar',data:{
    labels:aL,datasets:[{label:'Vacancies',data:aD,backgroundColor:'#06b6d4cc',borderColor:'#06b6d4',borderWidth:2,borderRadius:6}]
  },options:{...noLeg,indexAxis:'y',scales:{x:{ticks:{color:cc.text},grid:{color:cc.grid}},y:{ticks:{color:cc.text,font:{size:10}},grid:{color:cc.grid}}}}});

  // Subjects
  const sL=['English','Computer','Teacher','Phys.Ed','Maths','Arabic','Science','Art Ed','French','Social St.','KG','German','Co-Teacher','Music','Homeroom'];
  const sD=[10214,9286,7621,7018,4877,4389,3643,2743,2113,2014,1843,1706,1276,1228,986];
  const pal=['#6366f1','#06b6d4','#a855f7','#ec4899','#f59e0b','#10b981','#f97316','#8b5cf6','#0ea5e9','#14b8a6','#d946ef','#6366f1','#06b6d4','#a855f7','#ec4899'];
  STATE.charts.subject = new Chart(document.getElementById('chartSubject'),{type:'bar',data:{
    labels:sL,datasets:[{label:'Mentions',data:sD,backgroundColor:pal.map(c=>c+'cc'),borderColor:pal,borderWidth:2,borderRadius:6}]
  },options:{...noLeg,indexAxis:'y',scales:{x:{ticks:{color:cc.text},grid:{color:cc.grid}},y:{ticks:{color:cc.text,font:{size:10}},grid:{color:cc.grid}}}}});

  // Monthly trend
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mD=[1200,980,1450,1600,1300,800,600,2100,2800,2400,2100,1274];
  STATE.charts.monthly = new Chart(document.getElementById('chartMonthly'),{type:'line',data:{
    labels:months,datasets:[{label:'Vacancies',data:mD,borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.1)',fill:true,tension:.4,pointRadius:5,pointBackgroundColor:'#6366f1',borderWidth:3}]
  },options:base});

  // Subject demand by year (feature #14)
  STATE.charts.subjectTrend = new Chart(document.getElementById('chartSubjectTrend'),{type:'bar',data:{
    labels:['2020','2021','2022','2023','2024'],
    datasets:[
      {label:'English',data:[1800,3100,3200,1500,1614],backgroundColor:'#6366f1cc',borderColor:'#6366f1',borderWidth:2,borderRadius:4},
      {label:'Maths',data:[720,1100,1380,920,757],backgroundColor:'#06b6d4cc',borderColor:'#06b6d4',borderWidth:2,borderRadius:4},
      {label:'Computer',data:[1600,2800,3000,1400,486],backgroundColor:'#a855f7cc',borderColor:'#a855f7',borderWidth:2,borderRadius:4},
      {label:'Arabic',data:[600,1200,1400,780,409],backgroundColor:'#ec4899cc',borderColor:'#ec4899',borderWidth:2,borderRadius:4},
    ]
  },options:{...base,plugins:{...base.plugins,legend:{labels:{color:cc.text,font:{family:'Outfit',size:12}}}}}});
}

// ── Data Quality ──────────────────────────────────
function buildQualityData() {
  const cc = chartColors();
  const total = STATE.data.length, dups = STATE.duplicates.length, unique = total - dups;
  if (STATE.charts.donut) STATE.charts.donut.destroy();
  STATE.charts.donut = new Chart(document.getElementById('donutDuplicates'),{type:'doughnut',data:{
    labels:['Unique','Duplicates'],
    datasets:[{data:[unique,dups],backgroundColor:['rgba(99,102,241,.8)','rgba(236,72,153,.8)'],borderColor:['#6366f1','#ec4899'],borderWidth:2}]
  },options:{responsive:true,cutout:'70%',plugins:{legend:{labels:{color:cc.text,font:{family:'Outfit',size:12}}}}}});

  const fields=['School Name','Area','Contact','Raw Ad Text','Subjects/Jobs'];
  const missing=fields.map(f=>STATE.data.filter(r=>!r[f]||r[f]==='(Unknown)'||r[f]==='(See ad text)').length);
  if (STATE.charts.missing) STATE.charts.missing.destroy();
  STATE.charts.missing = new Chart(document.getElementById('chartMissing'),{type:'bar',data:{
    labels:['School','Area','Contact','Raw Ad','Subjects'],
    datasets:[{label:'Missing',data:missing,backgroundColor:['#f59e0bcc','#f97316cc','#ef4444cc','#a855f7cc','#06b6d4cc'],borderColor:['#f59e0b','#f97316','#ef4444','#a855f7','#06b6d4'],borderWidth:2,borderRadius:6}]
  },options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:cc.text},grid:{color:cc.grid}},y:{ticks:{color:cc.text},grid:{color:cc.grid}}}}});

  const withContact=STATE.data.filter(r=>r.c).length;
  const withRaw=STATE.data.filter(r=>r.rawAd).length;
  const unknown=STATE.data.filter(r=>!r.a||r.a==='(Unknown)').length;
  document.getElementById('unknownCount').textContent = unknown.toLocaleString();
  document.getElementById('namedCount').textContent = (total-unknown).toLocaleString();
  document.getElementById('contactCount').textContent = withContact.toLocaleString();
  document.getElementById('rawCount').textContent = withRaw.toLocaleString();
  document.getElementById('donutPct').textContent = Math.round((dups/total)*100)+'%';
  // Update KPI cards dynamically
  const metaYears = STATE.meta && STATE.meta.years ? STATE.meta.years : {};
  const bestYear = Object.entries(metaYears).sort((a,b)=>b[1]-a[1])[0];
  if (bestYear) document.getElementById('kpiBestYear').textContent = bestYear[0];
  document.getElementById('kpiTotal').textContent = ((STATE.meta && STATE.meta.total) || total).toLocaleString();
  document.getElementById('kpiDuplicates').textContent = dups.toLocaleString();
  document.getElementById('kpiUnique').textContent = ((STATE.meta && STATE.meta.unique) || unique).toLocaleString();
}

// ── Counter Animation ─────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let cur = 0; const step = target / (1400/16);
    const t = setInterval(() => {
      cur = Math.min(cur+step, target);
      el.textContent = Math.round(cur).toLocaleString();
      if (cur >= target) clearInterval(t);
    }, 16);
  });
}

// ── Back to Top ───────────────────────────────────
const btt = document.getElementById('backToTop');
window.addEventListener('scroll', () => btt.classList.toggle('visible', window.scrollY > 400));
btt.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

// ── Keyboard Shortcuts ────────────────────────────
document.addEventListener('keydown', e => {
  const typing = ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === 'Escape') {
    closeModal();
    ['instructionsOverlay','schoolOverlay'].forEach(id => document.getElementById(id).classList.remove('open'));
  }
  if (!typing) {
    if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key==='?'||e.key==='/') { e.preventDefault(); document.getElementById('instructionsOverlay').classList.add('open'); }
    if (e.key==='t'||e.key==='T') setTheme(STATE.theme==='dark'?'light':'dark');
    if (e.key==='l'||e.key==='L') setLang(STATE.lang==='en'?'ar':'en');
    if (e.key==='b'||e.key==='B') switchTab('bookmarks');
  }
});

// ── Helpers ───────────────────────────────────────
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────
initTheme();
setTimeout(moveIndicator, 200);
loadData();
