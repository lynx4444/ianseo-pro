/**
 * Ianseo Pro - Frontend Controller
 */

// Application State
const state = {
  year: '2026',
  countryid: '',
  comptime: '', // '' = all, '1' = today, '2' = completed, '3' = upcoming
  searchQuery: '',
  viewMode: 'grid', // 'grid' | 'table'
  tournaments: [],
  countries: [],
  years: [],
  currentPage: 1,
  pageSize: 150,
  activeTournament: null,
  activeTournamentDetails: null,
  autoRefreshInterval: null,
  isAutoRefreshActive: false,
  simArrows: [],
  simMaxArrows: 6
};

// DOM Elements
const elements = {
  brandHomeBtn: document.getElementById('brandHomeBtn'),
  globalSearchInput: document.getElementById('globalSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  liveFilterBtn: document.getElementById('liveFilterBtn'),
  liveCountBadge: document.getElementById('liveCountBadge'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  targetSimBtn: document.getElementById('targetSimBtn'),
  
  // Hero stats
  statTotalTournaments: document.getElementById('statTotalTournaments'),
  statLiveCount: document.getElementById('statLiveCount'),
  statCountriesCount: document.getElementById('statCountriesCount'),
  
  // Filters
  statusTabs: document.getElementById('statusTabs'),
  yearSelect: document.getElementById('yearSelect'),
  countrySelect: document.getElementById('countrySelect'),
  viewGridBtn: document.getElementById('viewGridBtn'),
  viewTableBtn: document.getElementById('viewTableBtn'),
  autoRefreshBtn: document.getElementById('autoRefreshBtn'),
  activeFiltersBar: document.getElementById('activeFiltersBar'),
  filterChips: document.getElementById('filterChips'),
  resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),
  resetEmptyFiltersBtn: document.getElementById('resetEmptyFiltersBtn'),
  
  // Results
  tournamentsHeading: document.getElementById('tournamentsHeading'),
  sectionLiveBadge: document.getElementById('sectionLiveBadge'),
  sectionLiveCount: document.getElementById('sectionLiveCount'),
  resultsCount: document.getElementById('resultsCount'),
  mainLoader: document.getElementById('mainLoader'),
  tournamentsGrid: document.getElementById('tournamentsGrid'),
  tournamentsTableWrapper: document.getElementById('tournamentsTableWrapper'),
  tournamentsTableBody: document.getElementById('tournamentsTableBody'),
  paginationContainer: document.getElementById('paginationContainer'),
  emptyState: document.getElementById('emptyState'),
  
  // Tournament Hub Modal
  tournamentModal: document.getElementById('tournamentModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalTournamentCode: document.getElementById('modalTournamentCode'),
  modalTournamentTitle: document.getElementById('modalTournamentTitle'),
  modalTournamentMeta: document.getElementById('modalTournamentMeta'),
  modalLiveBadge: document.getElementById('modalLiveBadge'),
  modalDateChip: document.getElementById('modalDateChip'),
  modalLocationChip: document.getElementById('modalLocationChip'),
  modalDocsGrid: document.getElementById('modalDocsGrid'),
  modalSectionsAccordion: document.getElementById('modalSectionsAccordion'),
  modalTabs: document.getElementById('modalTabs'),
  
  // Qual Tab
  qualCategorySelect: document.getElementById('qualCategorySelect'),
  qualSearchInput: document.getElementById('qualSearchInput'),
  qualLoader: document.getElementById('qualLoader'),
  qualTableHead: document.getElementById('qualTableHead'),
  qualTableBody: document.getElementById('qualTableBody'),
  
  // Entries Tab
  entriesCategorySelect: document.getElementById('entriesCategorySelect'),
  entriesSearchInput: document.getElementById('entriesSearchInput'),
  entriesLoader: document.getElementById('entriesLoader'),
  entriesTableHead: document.getElementById('entriesTableHead'),
  entriesTableBody: document.getElementById('entriesTableBody'),
  
  // Export Tab
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  downloadCsvBtn: document.getElementById('downloadCsvBtn'),
  copyCliCommandBtn: document.getElementById('copyCliCommandBtn'),
  
  // PDF Modal
  pdfModal: document.getElementById('pdfModal'),
  pdfModalTitle: document.getElementById('pdfModalTitle'),
  pdfIframe: document.getElementById('pdfIframe'),
  pdfDownloadDirectBtn: document.getElementById('pdfDownloadDirectBtn'),
  closePdfModalBtn: document.getElementById('closePdfModalBtn'),
  
  // Simulator Modal
  targetSimModal: document.getElementById('targetSimModal'),
  closeSimModalBtn: document.getElementById('closeSimModalBtn'),
  targetSvg: document.getElementById('targetSvg'),
  simArrowsRow: document.getElementById('simArrowsRow'),
  simEndTotal: document.getElementById('simEndTotal'),
  simTensCount: document.getElementById('simTensCount'),
  resetSimArrowsBtn: document.getElementById('resetSimArrowsBtn'),
  
  toast: document.getElementById('toast')
};

/**
 * Initialize Application
 */
async function init() {
  setupTheme();
  setupEventListeners();
  await loadTournaments();
}

/**
 * Setup Theme (Dark / Light)
 */
function setupTheme() {
  const savedTheme = localStorage.getItem('ianseo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggleBtn.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-moon';
  } else {
    icon.className = 'fa-solid fa-sun';
  }
}

/**
 * Toast Notifications
 */
function showToast(message, duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.style.display = 'block';
  setTimeout(() => {
    elements.toast.style.display = 'none';
  }, duration);
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Brand click
  elements.brandHomeBtn.addEventListener('click', () => {
    resetFilters();
  });

  // Global search input with debounce
  let searchTimeout = null;
  elements.globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.clearSearchBtn.style.display = val ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val;
      state.currentPage = 1;
      renderTournaments();
      updateFilterChips();
    }, 200);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    state.searchQuery = '';
    state.currentPage = 1;
    renderTournaments();
    updateFilterChips();
  });

  // Keyboard shortcut '/' to search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== elements.globalSearchInput) {
      e.preventDefault();
      elements.globalSearchInput.focus();
    }
  });

  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ianseo_theme', next);
    updateThemeIcon(next);
  });

  // Live filter pill
  elements.liveFilterBtn.addEventListener('click', () => {
    setActiveStatusTab('1');
  });

  // Status tabs
  elements.statusTabs.querySelectorAll('.status-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const timeVal = btn.getAttribute('data-time');
      state.currentPage = 1;
      setActiveStatusTab(timeVal);
    });
  });

  // Year select
  elements.yearSelect.addEventListener('change', async (e) => {
    state.year = e.target.value;
    state.currentPage = 1;
    await loadTournaments();
  });

  // Country select
  elements.countrySelect.addEventListener('change', async (e) => {
    state.countryid = e.target.value;
    state.currentPage = 1;
    await loadTournaments();
  });

  // View switchers
  elements.viewGridBtn.addEventListener('click', () => setViewMode('grid'));
  elements.viewTableBtn.addEventListener('click', () => setViewMode('table'));

  // Auto-refresh toggle
  elements.autoRefreshBtn.addEventListener('click', toggleAutoRefresh);

  // Filter Reset buttons
  elements.resetAllFiltersBtn.addEventListener('click', resetFilters);
  elements.resetEmptyFiltersBtn.addEventListener('click', resetFilters);

  // Modal controls
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.tournamentModal.addEventListener('click', (e) => {
    if (e.target === elements.tournamentModal) closeModal();
  });

  // Modal tabs
  elements.modalTabs.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchModalTab(tabName);
    });
  });

  // Qualifications Category change
  elements.qualCategorySelect.addEventListener('change', (e) => {
    loadQualificationCategoryData(e.target.value);
  });

  // Qual archer search
  elements.qualSearchInput.addEventListener('input', filterQualRows);

  // Entries View change
  elements.entriesCategorySelect.addEventListener('change', (e) => {
    loadEntriesCategoryData(e.target.value);
  });

  // Entries search
  elements.entriesSearchInput.addEventListener('input', filterEntriesRows);

  // Export buttons
  elements.downloadJsonBtn.addEventListener('click', exportActiveTournamentJson);
  elements.downloadCsvBtn.addEventListener('click', exportActiveTournamentCsv);
  elements.copyCliCommandBtn.addEventListener('click', copyCliCommand);

  // PDF modal
  elements.closePdfModalBtn.addEventListener('click', closePdfModal);
  elements.pdfModal.addEventListener('click', (e) => {
    if (e.target === elements.pdfModal) closePdfModal();
  });

  // Simulator modal (if present)
  if (elements.targetSimBtn) elements.targetSimBtn.addEventListener('click', openSimModal);
  if (elements.closeSimModalBtn) elements.closeSimModalBtn.addEventListener('click', closeSimModal);
  if (elements.targetSimModal) {
    elements.targetSimModal.addEventListener('click', (e) => {
      if (e.target === elements.targetSimModal) closeSimModal();
    });
  }

  // SVG Target ring clicks (if present)
  if (elements.targetSvg) elements.targetSvg.addEventListener('click', handleTargetClick);
  if (elements.resetSimArrowsBtn) elements.resetSimArrowsBtn.addEventListener('click', resetSimEnd);
}

/**
 * Fetch Tournaments from API
 */
async function loadTournaments() {
  showLoader(true);
  try {
    const params = new URLSearchParams({
      year: state.year,
      countryid: state.countryid,
      comptime: state.comptime,
      limit: '5000'
    });

    const res = await fetch(`/api/tournaments?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText})`);
    }
    const data = await res.json();

    if (data.success) {
      state.tournaments = data.tournaments || [];
      state.countries = data.countries || [];
      state.years = data.years || [];

      populateCountryOptions();
      populateYearOptions();
      updateHeroStats(data);
      renderTournaments();
      updateFilterChips();
    } else {
      showToast('Error loading competitions: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Failed to load tournaments:', err);
    showToast(`Connection failed: ${err.message}. Check if backend API is deployed & running.`);
  } finally {
    showLoader(false);
  }
}

/**
 * Update Hero Stats
 */
function updateHeroStats(data) {
  const liveTournaments = state.tournaments.filter(t => t.isLiveToday);
  const liveCount = liveTournaments.length;

  if (elements.liveCountBadge) elements.liveCountBadge.textContent = liveCount;
  if (elements.statLiveCount) elements.statLiveCount.textContent = liveCount > 0 ? `${liveCount} Active` : '0 Active';
  if (elements.statTotalTournaments) elements.statTotalTournaments.textContent = `${data.totalCount || state.tournaments.length}`;
  if (elements.statCountriesCount && state.countries.length > 0) {
    elements.statCountriesCount.textContent = `${state.countries.length} Countries`;
  }
}

/**
 * Populate Country Dropdown
 */
function populateCountryOptions() {
  const currentVal = state.countryid;
  elements.countrySelect.innerHTML = '<option value="">All Countries</option>';

  state.countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code})`;
    if (c.code === currentVal) opt.selected = true;
    elements.countrySelect.appendChild(opt);
  });
}

/**
 * Populate Year Dropdown
 */
function populateYearOptions() {
  const currentYear = state.year;
  if (state.years.length > 0) {
    elements.yearSelect.innerHTML = '';
    state.years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      elements.yearSelect.appendChild(opt);
    });
  }
}

/**
 * Render Tournaments according to current filter & viewMode
 */
function renderTournaments() {
  let list = state.tournaments;

  // Filter by search keyword
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(t => 
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.organizer && t.organizer.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      (t.country && t.country.toLowerCase().includes(q))
    );
  }

  const totalCount = list.length;
  const totalPages = Math.ceil(totalCount / state.pageSize);

  if (state.currentPage > totalPages && totalPages > 0) {
    state.currentPage = totalPages;
  }
  if (state.currentPage < 1) {
    state.currentPage = 1;
  }

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const endIndex = Math.min(startIndex + state.pageSize, totalCount);
  const pagedList = list.slice(startIndex, endIndex);

  // Update live count indicator on top left
  const liveCount = state.comptime === '1'
    ? list.length
    : list.filter(t => t.isLiveToday).length;

  if (elements.sectionLiveBadge && elements.sectionLiveCount) {
    elements.sectionLiveCount.textContent = liveCount;
    elements.sectionLiveBadge.style.display = liveCount > 0 ? 'inline-flex' : 'none';
  }

  if (elements.liveCountBadge) {
    elements.liveCountBadge.textContent = liveCount;
  }

  // Update count & page indicator
  if (totalCount > state.pageSize) {
    elements.resultsCount.textContent = `Page ${state.currentPage} of ${totalPages} (${startIndex + 1}–${endIndex} of ${totalCount})`;
  } else {
    elements.resultsCount.textContent = `${totalCount} / ${state.tournaments.length}`;
  }

  if (totalCount === 0) {
    elements.tournamentsGrid.style.display = 'none';
    elements.tournamentsTableWrapper.style.display = 'none';
    if (elements.paginationContainer) elements.paginationContainer.style.display = 'none';
    elements.emptyState.style.display = 'block';
    return;
  }

  elements.emptyState.style.display = 'none';

  if (state.viewMode === 'grid') {
    elements.tournamentsTableWrapper.style.display = 'none';
    elements.tournamentsGrid.style.display = 'grid';
    renderGridView(pagedList);
  } else {
    elements.tournamentsGrid.style.display = 'none';
    elements.tournamentsTableWrapper.style.display = 'block';
    renderTableView(pagedList);
  }

  renderPagination(totalCount, totalPages);
}

/**
 * Render Pagination Controls
 */
function renderPagination(totalCount, totalPages) {
  if (!elements.paginationContainer) return;

  if (totalPages <= 1) {
    elements.paginationContainer.style.display = 'none';
    return;
  }

  elements.paginationContainer.style.display = 'flex';
  elements.paginationContainer.innerHTML = '';

  const info = document.createElement('div');
  info.className = 'pagination-info';
  info.innerHTML = `Page <span>${state.currentPage}</span> of <span>${totalPages}</span> (<span>150</span> / page)`;

  const controls = document.createElement('div');
  controls.className = 'pagination-controls';

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Prev';
  prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      goToPage(state.currentPage - 1);
    }
  });
  controls.appendChild(prevBtn);

  // Page Numbers
  const pageNumbers = getPaginationPages(state.currentPage, totalPages);
  pageNumbers.forEach(p => {
    if (p === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '...';
      controls.appendChild(ellipsis);
    } else {
      const numBtn = document.createElement('button');
      numBtn.className = `page-num-btn ${p === state.currentPage ? 'active' : ''}`;
      numBtn.textContent = p;
      numBtn.addEventListener('click', () => {
        if (p !== state.currentPage) {
          goToPage(p);
        }
      });
      controls.appendChild(numBtn);
    }
  });

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.innerHTML = 'Next <i class="fa-solid fa-chevron-right"></i>';
  nextBtn.addEventListener('click', () => {
    if (state.currentPage < totalPages) {
      goToPage(state.currentPage + 1);
    }
  });
  controls.appendChild(nextBtn);

  elements.paginationContainer.appendChild(info);
  elements.paginationContainer.appendChild(controls);
}

function goToPage(page) {
  state.currentPage = page;
  renderTournaments();
  const heading = document.getElementById('tournamentsHeading');
  if (heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function getPaginationPages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * Render Grid Cards View
 */
function renderGridView(list) {
  elements.tournamentsGrid.innerHTML = '';

  list.forEach(t => {
    const card = document.createElement('div');
    card.className = `tournament-card ${t.isLiveToday ? 'live-card' : ''}`;

    const flagHtml = t.flagSrc 
      ? `<img class="flag-img" src="${t.flagSrc}" alt="${t.country}" title="${t.country}" onerror="this.style.display='none'">`
      : `<i class="fa-solid fa-flag" style="color:var(--text-muted)"></i>`;

    const liveBadgeHtml = t.isLiveToday
      ? `<span class="live-badge"><span class="pulse-dot"></span> LIVE</span>`
      : '';

    card.innerHTML = `
      <div>
        <div class="card-top">
          <div class="flag-badge-group">
            ${flagHtml}
            <span class="tour-code">${t.code || 'WA'}</span>
          </div>
          ${liveBadgeHtml}
        </div>
        <h3 class="tour-title" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</h3>
        <div class="tour-meta-list">
          <div class="tour-meta-item">
            <i class="fa-solid fa-building"></i>
            <span>${escapeHtml(t.organizer || 'Official Ianseo Event')}</span>
          </div>
          <div class="tour-meta-item">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeHtml(t.location || t.country || 'International')}</span>
          </div>
          <div class="tour-meta-item">
            <i class="fa-solid fa-calendar"></i>
            <span>${escapeHtml(t.dates || 'Dates not set')}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="updated-text">
          <i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(t.updated || 'Recent')}
        </div>
        <div class="card-action-btn">
          <span>View</span>
          <i class="fa-solid fa-arrow-right"></i>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openTournamentHub(t);
    });

    elements.tournamentsGrid.appendChild(card);
  });
}

/**
 * Render Table View
 */
function renderTableView(list) {
  elements.tournamentsTableBody.innerHTML = '';

  list.forEach(t => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    const liveBadge = t.isLiveToday
      ? `<span class="live-badge"><span class="pulse-dot"></span> Live</span>`
      : `<span style="color:var(--text-muted);font-size:0.75rem;">Normal</span>`;

    const flagHtml = t.flagSrc
      ? `<img class="flag-img" src="${t.flagSrc}" alt="${t.country}" style="vertical-align:middle;margin-right:6px;">`
      : '';

    tr.innerHTML = `
      <td>${liveBadge}</td>
      <td><span class="tour-code">${t.code || 'WA'}</span></td>
      <td><strong style="color:var(--text-primary);">${escapeHtml(t.name)}</strong></td>
      <td><span style="color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(t.organizer)}</span></td>
      <td>${flagHtml} <span style="font-size:0.85rem;">${escapeHtml(t.location || t.country)}</span></td>
      <td><span style="font-family:var(--font-mono);font-size:0.82rem;">${escapeHtml(t.dates)}</span></td>
      <td><span style="color:var(--text-muted);font-size:0.78rem;">${escapeHtml(t.updated)}</span></td>
      <td><button class="btn-primary" style="padding:0.3rem 0.75rem;font-size:0.78rem;">View <i class="fa-solid fa-chevron-right"></i></button></td>
    `;

    tr.addEventListener('click', () => {
      openTournamentHub(t);
    });

    elements.tournamentsTableBody.appendChild(tr);
  });
}

/**
 * Open Tournament Hub Modal
 */
async function openTournamentHub(tournament) {
  state.activeTournament = tournament;
  elements.modalTournamentCode.textContent = tournament.code || 'IANSEO';
  elements.modalTournamentTitle.textContent = tournament.name;
  elements.modalTournamentMeta.textContent = `${tournament.organizer} • ${tournament.location || tournament.country} • ${tournament.dates}`;

  if (tournament.isLiveToday) {
    elements.modalLiveBadge.style.display = 'inline-flex';
  } else {
    elements.modalLiveBadge.style.display = 'none';
  }

  elements.modalDateChip.innerHTML = `<i class="fa-solid fa-calendar"></i> ${tournament.dates || 'Active'}`;
  elements.modalLocationChip.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${tournament.location || tournament.country || 'Location'}`;

  // Reset tabs
  switchModalTab('overview');
  elements.tournamentModal.style.display = 'flex';

  // Load details from API
  try {
    elements.modalDocsGrid.innerHTML = '<div class="loader-container mini"><div class="ring-spinner"></div><p>Fetching official documents & classifications...</p></div>';
    elements.modalSectionsAccordion.innerHTML = '';

    const res = await fetch(`/api/tournaments/${tournament.toId}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    if (data.success) {
      state.activeTournamentDetails = data.details;
      renderTournamentDetails(data.details);
    } else {
      showToast('Could not load tournament details: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error loading tournament details:', err);
    showToast('Failed to load tournament details: ' + err.message);
  }
}

/**
 * Render Tournament Details & Tabs
 */
function renderTournamentDetails(details) {
  // 1. Documents & Schedules
  elements.modalDocsGrid.innerHTML = '';
  const documents = [];
  const qualifications = [];
  const entries = [];
  const otherSections = [];

  details.sections.forEach(sec => {
    sec.items.forEach(item => {
      if (item.category === 'document' || (item.pdfUrl && !item.webUrl)) {
        documents.push(item);
      } else if (item.category === 'qualification') {
        qualifications.push(item);
      } else if (item.category === 'entries') {
        entries.push(item);
      } else {
        otherSections.push(item);
      }
    });
  });

  if (documents.length === 0) {
    elements.modalDocsGrid.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem 0;">No standalone PDF notices or schedules posted yet for this event.</p>`;
  } else {
    documents.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.innerHTML = `
        <div class="doc-top">
          <div class="doc-icon"><i class="fa-solid fa-file-pdf"></i></div>
          <div>
            <div class="doc-title">${escapeHtml(doc.text)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${doc.updated || 'Official Document'}</div>
          </div>
        </div>
        <div class="doc-actions">
          <button class="btn-primary" style="padding:0.4rem 0.8rem;font-size:0.78rem;flex:1;" onclick="openPdfViewer('${doc.pdfUrl || doc.webUrl}', '${escapeHtml(doc.text)}')">
            <i class="fa-solid fa-eye"></i> View (No Ads)
          </button>
          <a href="${doc.pdfUrl || doc.webUrl}" target="_blank" download class="btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.78rem;">
            <i class="fa-solid fa-download"></i>
          </a>
        </div>
      `;
      elements.modalDocsGrid.appendChild(card);
    });
  }

  // 2. Sections Accordion
  elements.modalSectionsAccordion.innerHTML = '';
  details.sections.forEach(sec => {
    const group = document.createElement('div');
    group.className = 'accordion-group';

    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `<span><i class="fa-solid fa-layer-group" style="color:var(--target-blue);margin-right:6px;"></i> ${escapeHtml(sec.title)}</span> <span style="font-size:0.75rem;color:var(--text-muted);">${sec.items.length}</span>`;

    const body = document.createElement('div');
    body.className = 'accordion-body';

    sec.items.forEach(item => {
      const pill = document.createElement('div');
      pill.className = 'accordion-link-pill';
      const icon = item.pdfUrl ? 'fa-file-pdf' : 'fa-arrow-up-right-from-square';
      pill.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(item.text)}`;

      pill.addEventListener('click', () => {
        if (item.category === 'qualification') {
          switchModalTab('qualifications');
          selectQualificationCategory(item.path || item.webUrl);
        } else if (item.category === 'entries') {
          switchModalTab('entries');
          selectEntriesCategory(item.path || item.webUrl);
        } else if (item.pdfUrl) {
          openPdfViewer(item.pdfUrl, item.text);
        } else {
          switchModalTab('qualifications');
          selectQualificationCategory(item.path || item.webUrl);
        }
      });

      body.appendChild(pill);
    });

    group.appendChild(header);
    group.appendChild(body);
    elements.modalSectionsAccordion.appendChild(group);
  });

  // Populate Qualifications Select
  elements.qualCategorySelect.innerHTML = '';
  if (qualifications.length > 0) {
    qualifications.forEach((q, idx) => {
      const opt = document.createElement('option');
      opt.value = q.path || q.webUrl;
      opt.textContent = q.text;
      if (idx === 0) opt.selected = true;
      elements.qualCategorySelect.appendChild(opt);
    });
    // Auto load first qualification category
    loadQualificationCategoryData(qualifications[0].path || qualifications[0].webUrl);
  } else {
    elements.qualCategorySelect.innerHTML = '<option value="">No Qualification tables found</option>';
    elements.qualTableHead.innerHTML = '';
    elements.qualTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No qualification rounds published yet for this event.</td></tr>';
  }

  // Populate Entries Select
  elements.entriesCategorySelect.innerHTML = '';
  if (entries.length > 0) {
    entries.forEach((e, idx) => {
      const opt = document.createElement('option');
      opt.value = e.path || e.webUrl;
      opt.textContent = e.text;
      if (idx === 0) opt.selected = true;
      elements.entriesCategorySelect.appendChild(opt);
    });
    loadEntriesCategoryData(entries[0].path || entries[0].webUrl);
  } else {
    elements.entriesCategorySelect.innerHTML = '<option value="">No Entry lists found</option>';
    elements.entriesTableHead.innerHTML = '';
    elements.entriesTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No participant entries published yet for this event.</td></tr>';
  }
}

/**
 * Load Qualification Table Data
 */
async function loadQualificationCategoryData(path) {
  if (!path || !state.activeTournament) return;
  elements.qualLoader.style.display = 'flex';
  elements.qualTableHead.innerHTML = '';
  elements.qualTableBody.innerHTML = '';

  try {
    const res = await fetch(`/api/tournaments/${state.activeTournament.toId}/data?path=${encodeURIComponent(path)}`);
    const json = await res.json();

    if (json.success && json.data.tables.length > 0) {
      renderQualTable(json.data.tables[0]);
    } else {
      elements.qualTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No scores recorded yet in this category.</td></tr>';
    }
  } catch (err) {
    console.error('Error loading qual table:', err);
    elements.qualTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--target-red);">Failed to parse qualification table.</td></tr>';
  } finally {
    elements.qualLoader.style.display = 'none';
  }
}

function selectQualificationCategory(path) {
  for (let i = 0; i < elements.qualCategorySelect.options.length; i++) {
    if (elements.qualCategorySelect.options[i].value === path) {
      elements.qualCategorySelect.selectedIndex = i;
      loadQualificationCategoryData(path);
      break;
    }
  }
}

/**
 * Render Qualification Table
 */
function renderQualTable(tableData) {
  // Render headers
  let ths = '<tr>';
  if (tableData.headers.length > 0) {
    tableData.headers.forEach(h => {
      ths += `<th>${escapeHtml(h)}</th>`;
    });
  } else {
    ths += '<th>Rank</th><th>Athlete</th><th>Country / Club</th><th>Distance 1</th><th>Distance 2</th><th>Total</th><th>10s</th><th>Xs</th>';
  }
  ths += '</tr>';
  elements.qualTableHead.innerHTML = ths;

  // Render rows
  elements.qualTableBody.innerHTML = '';
  tableData.rows.forEach(row => {
    const tr = document.createElement('tr');
    
    // Check if category header
    if (row.category && row.cells.length <= 1) {
      tr.className = 'category-header-row';
      tr.innerHTML = `<td colspan="${Math.max(tableData.headers.length, 6)}">${escapeHtml(row.category)}</td>`;
      elements.qualTableBody.appendChild(tr);
      return;
    }

    let tds = '';
    row.cells.forEach((c, idx) => {
      if (idx === 0) {
        // Rank column
        const rankNum = parseInt(c, 10);
        let badgeClass = 'plain';
        if (rankNum === 1) badgeClass = 'gold';
        else if (rankNum === 2) badgeClass = 'silver';
        else if (rankNum === 3) badgeClass = 'bronze';
        tds += `<td><span class="rank-badge ${badgeClass}">${c || '-'}</span></td>`;
      } else if (idx === 1) {
        // Athlete name
        tds += `<td><strong style="color:var(--text-primary);">${escapeHtml(c)}</strong></td>`;
      } else if (idx === row.cells.length - 3 || (idx === row.cells.length - 1 && !isNaN(parseInt(c, 10)) && parseInt(c, 10) > 100)) {
        // Total score
        tds += `<td><span class="score-total-pill">${escapeHtml(c)}</span></td>`;
      } else {
        tds += `<td>${escapeHtml(c)}</td>`;
      }
    });

    tr.innerHTML = tds;
    elements.qualTableBody.appendChild(tr);
  });
}

function filterQualRows() {
  const q = elements.qualSearchInput.value.toLowerCase().trim();
  const rows = elements.qualTableBody.querySelectorAll('tr:not(.category-header-row)');
  rows.forEach(tr => {
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(q) ? '' : 'none';
  });
}

/**
 * Load Entries Table Data
 */
async function loadEntriesCategoryData(path) {
  if (!path || !state.activeTournament) return;
  elements.entriesLoader.style.display = 'flex';
  elements.entriesTableHead.innerHTML = '';
  elements.entriesTableBody.innerHTML = '';

  try {
    const res = await fetch(`/api/tournaments/${state.activeTournament.toId}/data?path=${encodeURIComponent(path)}`);
    const json = await res.json();

    if (json.success && json.data.tables.length > 0) {
      renderEntriesTable(json.data.tables[0]);
    } else {
      elements.entriesTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No entries found in this view.</td></tr>';
    }
  } catch (err) {
    console.error('Error loading entries table:', err);
    elements.entriesTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--target-red);">Failed to parse entries list.</td></tr>';
  } finally {
    elements.entriesLoader.style.display = 'none';
  }
}

function selectEntriesCategory(path) {
  for (let i = 0; i < elements.entriesCategorySelect.options.length; i++) {
    if (elements.entriesCategorySelect.options[i].value === path) {
      elements.entriesCategorySelect.selectedIndex = i;
      loadEntriesCategoryData(path);
      break;
    }
  }
}

function renderEntriesTable(tableData) {
  let ths = '<tr>';
  if (tableData.headers.length > 0) {
    tableData.headers.forEach(h => {
      ths += `<th>${escapeHtml(h)}</th>`;
    });
  } else {
    ths += '<th>Athlete</th><th>Target</th><th>Category</th><th>Session</th>';
  }
  ths += '</tr>';
  elements.entriesTableHead.innerHTML = ths;

  elements.entriesTableBody.innerHTML = '';
  tableData.rows.forEach(row => {
    const tr = document.createElement('tr');
    if (row.category && row.cells.length <= 1) {
      tr.className = 'category-header-row';
      tr.innerHTML = `<td colspan="${Math.max(tableData.headers.length, 4)}">${escapeHtml(row.category)}</td>`;
      elements.entriesTableBody.appendChild(tr);
      return;
    }

    let tds = '';
    row.cells.forEach((c, idx) => {
      if (idx === 0) {
        tds += `<td><strong>${escapeHtml(c)}</strong></td>`;
      } else if (idx === 1 && c.length <= 4) {
        tds += `<td><span class="tour-code">${escapeHtml(c)}</span></td>`;
      } else {
        tds += `<td>${escapeHtml(c)}</td>`;
      }
    });

    tr.innerHTML = tds;
    elements.entriesTableBody.appendChild(tr);
  });
}

function filterEntriesRows() {
  const q = elements.entriesSearchInput.value.toLowerCase().trim();
  const rows = elements.entriesTableBody.querySelectorAll('tr:not(.category-header-row)');
  rows.forEach(tr => {
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(q) ? '' : 'none';
  });
}

/**
 * Modal Tab Switcher
 */
function switchModalTab(tabName) {
  elements.modalTabs.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });

  const activePane = document.getElementById(`tab${capitalize(tabName)}`);
  if (activePane) activePane.classList.add('active');
}

function closeModal() {
  elements.tournamentModal.style.display = 'none';
  state.activeTournament = null;
  state.activeTournamentDetails = null;
}

/**
 * PDF Viewer Modal
 */
window.openPdfViewer = function(pdfUrl, title) {
  elements.pdfModalTitle.textContent = title || 'Official Tournament Document';
  // Use proxy endpoint for clean stream
  const cleanProxyUrl = `/api/proxy/pdf?url=${encodeURIComponent(pdfUrl)}`;
  elements.pdfIframe.src = cleanProxyUrl;
  elements.pdfDownloadDirectBtn.href = pdfUrl;
  elements.pdfModal.style.display = 'flex';
};

function closePdfModal() {
  elements.pdfModal.style.display = 'none';
  elements.pdfIframe.src = '';
}

/**
 * Export Functions
 */
function exportActiveTournamentJson() {
  if (!state.activeTournament) return;
  window.open(`/api/tournaments/${state.activeTournament.toId}/export?format=json`, '_blank');
  showToast('Exporting tournament JSON...');
}

function exportActiveTournamentCsv() {
  if (!state.activeTournament) return;
  const currentPath = elements.qualCategorySelect.value || elements.entriesCategorySelect.value;
  if (!currentPath) {
    showToast('No active data table selected to export');
    return;
  }
  window.open(`/api/tournaments/${state.activeTournament.toId}/export?format=csv&path=${encodeURIComponent(currentPath)}`, '_blank');
  showToast('Exporting table CSV...');
}

function copyCliCommand() {
  if (!state.activeTournament) return;
  const cmd = `node server/cli.js --id ${state.activeTournament.toId} --details`;
  navigator.clipboard.writeText(cmd);
  showToast('Copied CLI command to clipboard!');
}

/**
 * Target Simulator Logic
 */
function openSimModal() {
  elements.targetSimModal.style.display = 'flex';
}

function closeSimModal() {
  elements.targetSimModal.style.display = 'none';
}

function handleTargetClick(e) {
  const circle = e.target.closest('circle');
  if (!circle) return;

  const val = circle.getAttribute('data-val');
  if (!val) return;

  if (state.simArrows.length >= state.simMaxArrows) {
    state.simArrows = [];
  }

  state.simArrows.push(val);
  renderSimScorecard();
}

function resetSimEnd() {
  state.simArrows = [];
  renderSimScorecard();
}

function renderSimScorecard() {
  const slots = elements.simArrowsRow.querySelectorAll('.arrow-slot');
  let total = 0;
  let tensCount = 0;

  slots.forEach((slot, idx) => {
    const arrowVal = state.simArrows[idx];
    if (arrowVal) {
      slot.textContent = arrowVal;
      slot.className = 'arrow-slot';

      if (arrowVal === 'X') {
        slot.classList.add('gold');
        total += 10;
        tensCount++;
      } else if (arrowVal === '10') {
        slot.classList.add('gold');
        total += 10;
        tensCount++;
      } else if (arrowVal === '9') {
        slot.classList.add('gold');
        total += 9;
      } else if (arrowVal === '8' || arrowVal === '7') {
        slot.classList.add('red');
        total += parseInt(arrowVal, 10);
      } else if (arrowVal === '6' || arrowVal === '5') {
        slot.classList.add('blue');
        total += parseInt(arrowVal, 10);
      } else if (arrowVal === '4' || arrowVal === '3') {
        slot.classList.add('black');
        total += parseInt(arrowVal, 10);
      } else {
        slot.classList.add('white');
        total += parseInt(arrowVal, 10);
      }
    } else {
      slot.textContent = '-';
      slot.className = 'arrow-slot empty';
    }
  });

  elements.simEndTotal.textContent = `${total} / 60`;
  elements.simTensCount.textContent = `${tensCount}`;
}

/**
 * Filter Management
 */
function setActiveStatusTab(timeVal) {
  state.comptime = timeVal;
  elements.statusTabs.querySelectorAll('.status-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-time') === timeVal);
  });
  loadTournaments();
}

function setViewMode(mode) {
  state.viewMode = mode;
  elements.viewGridBtn.classList.toggle('active', mode === 'grid');
  elements.viewTableBtn.classList.toggle('active', mode === 'table');
  renderTournaments();
}

function resetFilters() {
  state.year = '2026';
  state.countryid = '';
  state.comptime = '';
  state.searchQuery = '';
  elements.globalSearchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.yearSelect.value = '2026';
  elements.countrySelect.value = '';
  setActiveStatusTab('');
}

function updateFilterChips() {
  const chips = [];
  if (state.searchQuery) {
    chips.push({ label: `Search: "${state.searchQuery}"`, onRemove: () => {
      state.searchQuery = '';
      elements.globalSearchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      renderTournaments();
      updateFilterChips();
    }});
  }
  if (state.year && state.year !== '2026') {
    chips.push({ label: `Year: ${state.year}`, onRemove: () => {
      state.year = '2026';
      elements.yearSelect.value = '2026';
      loadTournaments();
    }});
  }
  if (state.countryid) {
    const cObj = state.countries.find(c => c.code === state.countryid);
    chips.push({ label: `Country: ${cObj ? cObj.name : state.countryid}`, onRemove: () => {
      state.countryid = '';
      elements.countrySelect.value = '';
      loadTournaments();
    }});
  }
  if (state.comptime) {
    const timeLabels = { '1': 'Live Today', '2': 'Completed', '3': 'Upcoming' };
    chips.push({ label: `Status: ${timeLabels[state.comptime] || 'Custom'}`, onRemove: () => {
      setActiveStatusTab('');
    }});
  }

  if (chips.length > 0) {
    elements.activeFiltersBar.style.display = 'flex';
    elements.filterChips.innerHTML = '';
    chips.forEach(c => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `<span>${escapeHtml(c.label)}</span> <i class="fa-solid fa-xmark"></i>`;
      chip.querySelector('i').addEventListener('click', c.onRemove);
      elements.filterChips.appendChild(chip);
    });
  } else {
    elements.activeFiltersBar.style.display = 'none';
  }
}

function toggleAutoRefresh() {
  state.isAutoRefreshActive = !state.isAutoRefreshActive;
  elements.autoRefreshBtn.classList.toggle('active', state.isAutoRefreshActive);

  if (state.isAutoRefreshActive) {
    showToast('Auto-sync enabled (refreshes every 30s)');
    state.autoRefreshInterval = setInterval(() => {
      loadTournaments();
    }, 30000);
  } else {
    showToast('Auto-sync disabled');
    clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = null;
  }
}

function showLoader(show) {
  elements.mainLoader.style.display = show ? 'flex' : 'none';
  if (show) {
    elements.tournamentsGrid.style.display = 'none';
    elements.tournamentsTableWrapper.style.display = 'none';
    elements.emptyState.style.display = 'none';
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
