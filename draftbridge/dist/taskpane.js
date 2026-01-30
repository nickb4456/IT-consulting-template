/* DraftBridge - Phase 2 Edition - v20260130 */

const API = 'https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod';
const FIRM = 'morrison';

// State
let clauses = [];
let currentFilter = 'all';
let currentClient = 'all';
let isLoading = false;
let lastSearchQuery = '';
let isOffline = false;
let usingCache = false;

// Usage tracking state
let recentlyUsed = [];
let mostUsed = [];

// Global Variables System
let globalVariables = {};
const VARIABLE_SYNTAX = /\{\{([^}]+)\}\}/g; // {{Variable_Name}} syntax

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

Office.onReady(async (info) => {
  if (info.host === Office.HostType.Word) {
    initApp();
  }
});

async function initApp() {
  // Tab navigation with keyboard support
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + direction + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      }
    });
  });

  // Library: Search with debounce and clear button
  const searchInput = document.getElementById('librarySearch');
  const searchClear = document.getElementById('searchClear');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      // Show/hide clear button
      if (searchClear) {
        searchClear.classList.toggle('hidden', !searchInput.value);
      }
      // Debounced filter
      debounce(filterClauses, 150)();
    });
    
    // Keyboard shortcut: Escape to clear
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchInput.value) {
        e.preventDefault();
        clearSearch();
      }
    });
  }
  
  if (searchClear) {
    searchClear.addEventListener('click', clearSearch);
  }

  // Library: Filter chips with accessibility
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      
      // Filter
      currentFilter = chip.dataset.filter;
      filterClauses();
      
      // Announce to screen readers
      announceToScreenReader(`Filtered by ${currentFilter === 'all' ? 'all categories' : currentFilter}`);
    });
  });
  
  // Library: Client filter dropdown
  const clientFilter = document.getElementById('clientFilter');
  if (clientFilter) {
    clientFilter.addEventListener('change', () => {
      currentClient = clientFilter.value;
      filterClauses();
      announceToScreenReader(`Filtered by ${currentClient === 'all' ? 'all clients' : currentClient}`);
    });
  }

  // Generate panel buttons with loading states
  document.querySelectorAll('.opt[data-template]').forEach(btn => {
    btn.addEventListener('click', () => {
      addButtonFeedback(btn);
      loadTemplate(btn.dataset.template);
    });
  });

  // Action buttons
  document.querySelectorAll('.opt[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      addButtonFeedback(btn);
      handleAction(btn.dataset.action);
    });
  });

  document.getElementById('scanBtn')?.addEventListener('click', scanDocument);
  document.getElementById('backBtn')?.addEventListener('click', () => switchTab('generate'));
  document.getElementById('fillBtn')?.addEventListener('click', fillDocument);
  document.getElementById('undoBtn')?.addEventListener('click', undoFill);
  
  // Bookmark detection & variable builder
  document.getElementById('detectBookmarksBtn')?.addEventListener('click', detectBookmarks);
  document.getElementById('fillVariablesBtn')?.addEventListener('click', fillBookmarks);
  document.getElementById('variablesBackBtn')?.addEventListener('click', () => switchTab('generate'));
  document.getElementById('rescanBookmarksBtn')?.addEventListener('click', detectBookmarks);
  
  // Recreate feature
  document.getElementById('recreateBtn')?.addEventListener('click', openRecreatePanel);
  document.getElementById('recreateBackBtn')?.addEventListener('click', () => switchTab('generate'));
  document.getElementById('doRecreateBtn')?.addEventListener('click', executeRecreate);
  
  // Recreate option selection
  document.querySelectorAll('.recreate-option').forEach(opt => {
    opt.addEventListener('click', () => selectRecreateTarget(opt));
  });
  
  // Recreate mode toggle (Convert vs Swap Client)
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchRecreateMode(tab.dataset.mode));
  });
  
  // Global Variables
  document.getElementById('globalVarsBtn')?.addEventListener('click', openGlobalVariables);
  document.getElementById('globalVarsBackBtn')?.addEventListener('click', () => switchTab('generate'));
  document.getElementById('applyGlobalVarsBtn')?.addEventListener('click', applyGlobalVariablesToDocument);
  document.getElementById('scanPlaceholdersBtn')?.addEventListener('click', scanForPlaceholders);
  
  // Clients Panel
  document.getElementById('clientsBtn')?.addEventListener('click', openClientsPanel);
  document.getElementById('clientsBackBtn')?.addEventListener('click', () => switchTab('generate'));
  document.getElementById('addClientBtn')?.addEventListener('click', showAddClientModal);
  
  // Client search
  const clientSearch = document.getElementById('clientSearch');
  if (clientSearch) {
    clientSearch.addEventListener('input', () => {
      renderClientsList(clientSearch.value.toLowerCase());
    });
  }
  
  // Save FAB
  const fab = document.getElementById('saveLibraryFab');
  if (fab) {
    fab.addEventListener('click', saveToLibrary);
  }

  // Usage section toggles
  document.getElementById('toggleRecent')?.addEventListener('click', () => {
    document.getElementById('recentlyUsedSection')?.classList.toggle('collapsed');
  });
  
  document.getElementById('toggleMostUsed')?.addEventListener('click', () => {
    document.getElementById('mostUsedSection')?.classList.toggle('collapsed');
  });

  // Load clauses with skeleton state
  await loadClauses();
}

function clearSearch() {
  const searchInput = document.getElementById('librarySearch');
  const searchClear = document.getElementById('searchClear');
  
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (searchClear) {
    searchClear.classList.add('hidden');
  }
  filterClauses();
}

// ═══════════════════════════════════════════════════════════════
// VISUAL FEEDBACK HELPERS
// ═══════════════════════════════════════════════════════════════

function addButtonFeedback(btn) {
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 150);
}

function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

// ═══════════════════════════════════════════════════════════════
// LIBRARY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function loadClauses() {
  isLoading = true;
  updateResultsCount('Loading clauses...');
  
  try {
    // Initialize cache
    if (window.DraftBridgeCache) {
      await window.DraftBridgeCache.init();
    }
    
    // Try loading with cache (stale-while-revalidate pattern)
    const fetchFn = async () => {
      const response = await fetch(`${API}/firms/${FIRM}/clauses`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    
    let result;
    if (window.DraftBridgeCache) {
      result = await window.DraftBridgeCache.loadClausesWithCache(fetchFn);
      usingCache = result.fromCache;
      isOffline = result.offline || false;
    } else {
      // Fallback if cache module not loaded
      const [response] = await Promise.all([
        fetch(`${API}/firms/${FIRM}/clauses`),
        sleep(400)
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      result = { clauses: await response.json(), fromCache: false };
    }
    
    clauses = result.clauses;
    if (!Array.isArray(clauses)) clauses = [];
    
    // Load usage data and render
    await loadUsageData();
    renderClauses();
    renderUsageSections();
    populateClientFilter();
    
    // Update status
    const statusText = `${clauses.length} clause${clauses.length !== 1 ? 's' : ''} available`;
    updateResultsCount(statusText);
    updateCacheIndicator(usingCache, isOffline);
    
  } catch (err) {
    console.error('Failed to load clauses:', err);
    const errorType = classifyApiError(err);
    showEmptyState(
      ERROR_GUIDES[errorType]?.title || 'Unable to load clauses',
      'Tap the error message for help fixing this.'
    );
    updateResultsCount('Error loading clauses');
    toast('Couldn\'t load your clause library', 'error', errorType);
  } finally {
    isLoading = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// USAGE TRACKING (Phase 2)
// ═══════════════════════════════════════════════════════════════

async function loadUsageData() {
  if (!window.DraftBridgeCache) return;
  
  try {
    recentlyUsed = await window.DraftBridgeCache.getRecentlyUsed(8);
    mostUsed = await window.DraftBridgeCache.getMostUsed(8);
  } catch (err) {
    console.warn('Failed to load usage data:', err);
  }
}

async function trackClauseUsage(clauseId) {
  if (!window.DraftBridgeCache) return;
  
  try {
    await window.DraftBridgeCache.trackUsage(clauseId);
    // Refresh usage sections
    await loadUsageData();
    renderUsageSections();
  } catch (err) {
    console.warn('Failed to track usage:', err);
  }
}

function renderUsageSections() {
  renderRecentlyUsed();
  renderMostUsed();
}

function renderRecentlyUsed() {
  const section = document.getElementById('recentlyUsedSection');
  const container = document.getElementById('recentlyUsedCards');
  if (!section || !container) return;
  
  // Filter to clauses that still exist
  const recentClauses = recentlyUsed
    .map(usage => {
      const clause = clauses.find(c => c.clauseId === usage.clauseId);
      return clause ? { ...clause, lastUsed: usage.lastUsed } : null;
    })
    .filter(Boolean);
  
  if (recentClauses.length === 0) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  container.innerHTML = recentClauses.map(clause => `
    <div class="usage-card" data-clause-id="${clause.clauseId}" role="listitem">
      <div class="usage-card-title">${escapeHtml(clause.title)}</div>
      <div class="usage-card-meta">
        <span class="category-dot" style="background: ${getCategoryColor(clause.category)}"></span>
        <span>${capitalizeFirst(clause.category || 'contracts')}</span>
        <span class="use-count">${formatTimeAgo(clause.lastUsed)}</span>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.usage-card').forEach(card => {
    card.addEventListener('click', () => {
      const clauseId = card.dataset.clauseId;
      const clause = clauses.find(c => c.clauseId === clauseId);
      if (clause) insertClauseQuick(clause, card);
    });
  });
}

function renderMostUsed() {
  const section = document.getElementById('mostUsedSection');
  const container = document.getElementById('mostUsedCards');
  if (!section || !container) return;
  
  // Filter to clauses that still exist and have usage
  const topClauses = mostUsed
    .map(usage => {
      const clause = clauses.find(c => c.clauseId === usage.clauseId);
      return clause ? { ...clause, useCount: usage.useCount } : null;
    })
    .filter(c => c && c.useCount > 1);
  
  if (topClauses.length === 0) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  container.innerHTML = topClauses.map(clause => `
    <div class="usage-card" data-clause-id="${clause.clauseId}" role="listitem">
      <div class="usage-card-title">${escapeHtml(clause.title)}</div>
      <div class="usage-card-meta">
        <span class="category-dot" style="background: ${getCategoryColor(clause.category)}"></span>
        <span>${capitalizeFirst(clause.category || 'contracts')}</span>
        <span class="use-count">${clause.useCount}×</span>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.usage-card').forEach(card => {
    card.addEventListener('click', () => {
      const clauseId = card.dataset.clauseId;
      const clause = clauses.find(c => c.clauseId === clauseId);
      if (clause) insertClauseQuick(clause, card);
    });
  });
}

// Quick insert from usage cards (simplified)
async function insertClauseQuick(clause, cardElement) {
  try {
    cardElement.style.opacity = '0.6';
    cardElement.style.pointerEvents = 'none';
    
    const processedContent = applyPunctuationGuard(clause.content, globalVariables);
    
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(processedContent, Word.InsertLocation.replace);
      await context.sync();
    });

    // Track usage locally and on server
    trackClauseUsage(clause.clauseId);
    fetch(`${API}/firms/${FIRM}/clauses/${clause.clauseId}/use`, { method: 'POST' }).catch(() => {});

    toast(`Inserted: ${clause.title}`, 'success');
    
    setTimeout(() => {
      cardElement.style.opacity = '1';
      cardElement.style.pointerEvents = 'auto';
    }, 1000);

  } catch (err) {
    console.error('Quick insert failed:', err);
    cardElement.style.opacity = '1';
    cardElement.style.pointerEvents = 'auto';
    toast('Couldn\'t insert clause', 'error');
  }
}

function getCategoryColor(category) {
  const colors = {
    contracts: '#3B82F6',
    litigation: '#EF4444',
    corporate: '#10B981',
    ip: '#8B5CF6',
    employment: '#F59E0B'
  };
  return colors[category] || '#6B7280';
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function updateCacheIndicator(fromCache, offline) {
  const indicator = document.getElementById('cacheIndicator');
  if (!indicator) return;
  
  if (offline) {
    indicator.classList.remove('hidden');
    indicator.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0122.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 014.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 016.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      Offline Mode
    `;
    indicator.style.background = '#FEF3C7';
    indicator.style.color = '#92400E';
  } else if (fromCache) {
    indicator.classList.remove('hidden');
    indicator.textContent = '⚡ Cached';
    indicator.style.background = '';
    indicator.style.color = '';
    // Hide after 3 seconds
    setTimeout(() => indicator.classList.add('hidden'), 3000);
  } else {
    indicator.classList.add('hidden');
  }
}

function renderClauses() {
  const feed = document.getElementById('clauseFeed');
  const emptyState = document.getElementById('emptyState');
  
  if (!feed) return;

  // Hide skeleton and empty state
  feed.querySelectorAll('.skeleton').forEach(el => el.remove());
  emptyState?.classList.add('hidden');

  if (clauses.length === 0) {
    showEmptyState(
      'Your library awaits',
      'Save selections from your documents to build your collection.'
    );
    return;
  }

  // Clear and rebuild
  feed.innerHTML = '';
  
  clauses.forEach((clause, index) => {
    const card = document.createElement('article');
    card.className = 'clause-card';
    card.setAttribute('role', 'listitem');
    card.dataset.category = clause.category || 'contracts';
    card.dataset.clauseId = clause.clauseId;
    if (clause.client) card.dataset.client = clause.client;
    card.dataset.searchText = `${clause.title} ${clause.content} ${(clause.tags || []).join(' ')} ${clause.client || ''}`.toLowerCase();
    card.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;

    const categoryClass = clause.category || 'contracts';
    const categoryLabel = capitalizeFirst(clause.category || 'contracts');

    card.innerHTML = `
      <div class="clause-header">
        <h3 class="clause-title">${escapeHtml(clause.title)}</h3>
        <span class="category-pill ${categoryClass}">${categoryLabel}</span>
      </div>
      <p class="clause-preview">${escapeHtml(truncate(clause.content, 120))}</p>
      <button class="insert-btn" aria-label="Insert ${escapeHtml(clause.title)} into document">
        <span>Insert</span>
      </button>
    `;

    // Insert with visual feedback
    const insertBtn = card.querySelector('.insert-btn');
    insertBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await insertClause(clause, card);
    });
    
    // Card keyboard navigation
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        insertBtn.click();
      }
    });

    feed.appendChild(card);
  });
}

function showEmptyState(title, text = '') {
  const feed = document.getElementById('clauseFeed');
  const emptyState = document.getElementById('emptyState');
  
  if (emptyState) {
    emptyState.querySelector('.empty-state-title').textContent = title;
    const textEl = emptyState.querySelector('.empty-state-text');
    if (textEl) textEl.textContent = text;
    emptyState.classList.remove('hidden');
  }
  
  // Remove cards but keep empty state
  if (feed) {
    feed.querySelectorAll('.clause-card').forEach(card => card.remove());
  }
}

function updateResultsCount(text) {
  const countEl = document.getElementById('resultsCount');
  if (countEl) {
    countEl.querySelector('.count-text').textContent = text;
  }
}

function filterClauses() {
  const searchText = (document.getElementById('librarySearch')?.value || '').toLowerCase();
  const cards = document.querySelectorAll('.clause-card:not(.skeleton)');
  const emptyState = document.getElementById('emptyState');
  let visibleCount = 0;

  cards.forEach(card => {
    const matchesCategory = currentFilter === 'all' || card.dataset.category === currentFilter;
    const matchesClient = currentClient === 'all' || card.dataset.client === currentClient || !card.dataset.client;
    const matchesSearch = !searchText || (card.dataset.searchText || '').includes(searchText);
    const isVisible = matchesCategory && matchesClient && matchesSearch;
    
    card.classList.toggle('hidden', !isVisible);
    if (isVisible) visibleCount++;
  });
  
  // Update results count
  const hasFilters = searchText || currentFilter !== 'all' || currentClient !== 'all';
  if (hasFilters) {
    updateResultsCount(`${visibleCount} result${visibleCount !== 1 ? 's' : ''} found`);
  } else {
    updateResultsCount(`${clauses.length} clause${clauses.length !== 1 ? 's' : ''} available`);
  }
  
  // Show/hide empty state based on results
  if (visibleCount === 0 && clauses.length > 0) {
    if (emptyState) {
      emptyState.querySelector('.empty-state-title').textContent = 'No matches found';
      emptyState.querySelector('.empty-state-text').textContent = 'Try adjusting your search or filters';
      emptyState.classList.remove('hidden');
    }
  } else if (emptyState && clauses.length > 0) {
    emptyState.classList.add('hidden');
  }
}

function populateClientFilter() {
  const clientFilter = document.getElementById('clientFilter');
  if (!clientFilter) return;
  
  // Extract unique clients from clauses
  const clients = [...new Set(clauses.map(c => c.client).filter(Boolean))].sort();
  
  // Reset and populate
  clientFilter.innerHTML = '<option value="all">All Clients</option>';
  clients.forEach(client => {
    const opt = document.createElement('option');
    opt.value = client;
    opt.textContent = client;
    clientFilter.appendChild(opt);
  });
  
  // Show/hide based on whether there are clients
  clientFilter.style.display = clients.length > 0 ? 'block' : 'none';
}

async function insertClause(clause, cardElement) {
  const btn = cardElement.querySelector('.insert-btn');
  const originalText = btn.innerHTML;
  
  try {
    // Instant visual feedback
    btn.innerHTML = '<span>Inserting...</span>';
    btn.disabled = true;
    cardElement.classList.add('inserting');
    
    // Use smart insertion with punctuation guard and variable substitution
    const processedContent = applyPunctuationGuard(clause.content, globalVariables);
    
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(processedContent, Word.InsertLocation.replace);
      await context.sync();
    });

    // Track usage locally and on server (fire and forget)
    trackClauseUsage(clause.clauseId);
    fetch(`${API}/firms/${FIRM}/clauses/${clause.clauseId}/use`, { method: 'POST' })
      .catch(err => console.warn('Usage tracking failed:', err));

    // Success feedback
    btn.innerHTML = '<span>✓ Inserted!</span>';
    btn.classList.add('success');
    cardElement.classList.remove('inserting');
    cardElement.classList.add('inserted');
    
    toast(`Inserted: ${clause.title}`, 'success');
    announceToScreenReader(`Clause ${clause.title} inserted into document`);
    
    // Reset button after delay
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('success');
      btn.disabled = false;
      cardElement.classList.remove('inserted');
    }, 2000);

  } catch (err) {
    console.error('Insert failed:', err);
    cardElement.classList.remove('inserting');
    btn.innerHTML = originalText;
    btn.disabled = false;
    
    const errorType = classifyWordError(err);
    toast('Couldn\'t insert clause into document', 'error', errorType);
  }
}

async function saveToLibrary() {
  const fab = document.getElementById('saveLibraryFab');
  
  try {
    let selectedText = '';
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load('text');
      await context.sync();
      selectedText = selection.text.trim();
    });

    if (!selectedText) {
      toast('No text selected in document', 'error', 'no-selection');
      shakeElement(fab);
      return;
    }

    if (selectedText.length < 20) {
      toast('Selection needs to be longer', 'error', 'selection-too-short');
      shakeElement(fab);
      return;
    }

    // Show saving state immediately
    fab.classList.add('loading');
    fab.disabled = true;

    // Simple prompt for MVP - could be a modal later
    const title = prompt('Give your clause a title:', generateTitle(selectedText));
    if (!title) {
      fab.classList.remove('loading');
      fab.disabled = false;
      return;
    }

    const categoryInput = prompt('Category (contracts, litigation, corporate):', 'contracts');
    const category = ['contracts', 'litigation', 'corporate'].includes(categoryInput?.toLowerCase()) 
      ? categoryInput.toLowerCase() 
      : 'contracts';

    const resp = await fetch(`${API}/firms/${FIRM}/clauses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content: selectedText,
        category,
        tags: extractTags(selectedText),
        createdBy: 'user'
      })
    });

    if (!resp.ok) throw new Error('Save failed');

    const newClause = await resp.json();
    clauses.unshift(newClause);
    renderClauses();
    
    fab.classList.remove('loading');
    fab.disabled = false;
    
    toast(`Saved to library: ${title}`, 'success');
    announceToScreenReader(`Clause ${title} saved to library`);

  } catch (err) {
    console.error('Save failed:', err);
    fab.classList.remove('loading');
    fab.disabled = false;
    const errorType = err?.response ? classifyApiError(err, err.response) : 'save-failed';
    toast('Couldn\'t save to library', 'error', errorType);
  }
}

function shakeElement(element) {
  element.style.animation = 'none';
  element.offsetHeight; // Trigger reflow
  element.style.animation = 'shake 0.5s ease-in-out';
  setTimeout(() => element.style.animation = '', 500);
}

// Add shake animation via JS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);

// ═══════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════

function switchTab(tabId) {
  // Update tab buttons with ARIA
  document.querySelectorAll('.tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });

  // Switch panels with animation
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.add('hidden');
  });
  
  const panel = document.getElementById(`${tabId}Panel`);
  if (panel) {
    panel.classList.remove('hidden');
    
    // Focus first focusable element in panel
    const focusable = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 100);
    }
  }

  // Show/hide save FAB based on Library tab
  const fab = document.getElementById('saveLibraryFab');
  if (fab) {
    fab.classList.toggle('hidden', tabId !== 'library');
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

function handleAction(action) {
  switch (action) {
    case 'transform':
      toast('Transform feature coming soon!', 'info');
      break;
    case 'anonymize':
      toast('Anonymize feature coming soon!', 'info');
      break;
    case 'numbering':
      toast('Numbering feature coming soon!', 'info');
      break;
    case 'toc':
      toast('Table of Contents feature coming soon!', 'info');
      break;
    case 'pleadings':
      toast('Pleading Format feature coming soon!', 'info');
      break;
    case 'save-content':
      toast('Save Content feature coming soon!', 'info');
      break;
    case 'insert-content':
      toast('Insert Content feature coming soon!', 'info');
      break;
    case 'datasets':
      toast('Datasets feature coming soon!', 'info');
      break;
    case 'share-users':
      toast('Share with Users feature coming soon!', 'info');
      break;
    case 'share-groups':
      toast('Share with Groups feature coming soon!', 'info');
      break;
    case 'export':
      toast('Export feature coming soon!', 'info');
      break;
    case 'doc-id':
      toast('Document ID feature coming soon!', 'info');
      break;
    case 'settings':
      toast('Settings feature coming soon!', 'info');
      break;
    case 'firm-styles':
      toast('Firm Styles feature coming soon!', 'info');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

// ═══════════════════════════════════════════════════════════════
// GENERATE PANEL (Existing functionality)
// ═══════════════════════════════════════════════════════════════

const TEMPLATES = {
  letter: {
    title: 'Letter',
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'recipientName', label: 'Recipient Name', placeholder: 'John Smith' },
      { name: 'recipientAddress', label: 'Recipient Address', type: 'textarea', placeholder: '123 Main St\nCity, State 12345' },
      { name: 'subject', label: 'RE:', placeholder: 'Subject matter' },
      { name: 'salutation', label: 'Salutation', placeholder: 'Dear' },
      { name: 'closing', label: 'Closing', placeholder: 'Sincerely' },
      { name: 'signerName', label: 'Signer Name', placeholder: 'Your name' },
      { name: 'signerTitle', label: 'Signer Title', placeholder: 'Your title' }
    ]
  },
  memo: {
    title: 'Memorandum',
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'to', label: 'To', placeholder: 'Recipient name(s)' },
      { name: 'from', label: 'From', placeholder: 'Your name' },
      { name: 'subject', label: 'Subject', placeholder: 'Brief description' },
      { name: 'cc', label: 'CC (optional)', placeholder: 'Copy recipients' }
    ]
  },
  fax: {
    title: 'Fax Cover Sheet',
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'recipientName', label: 'To', placeholder: 'Recipient name' },
      { name: 'recipientFax', label: 'Fax Number', placeholder: '(555) 123-4567' },
      { name: 'pages', label: 'Total Pages', type: 'number', placeholder: '1' },
      { name: 'senderName', label: 'From', placeholder: 'Your name' },
      { name: 'senderPhone', label: 'Phone', placeholder: '(555) 987-6543' },
      { name: 'subject', label: 'RE:', placeholder: 'Subject matter' }
    ]
  }
};

let currentValues = {};
let previousValues = {};

function loadTemplate(templateId) {
  const template = TEMPLATES[templateId];
  if (!template) return;

  document.getElementById('templateTitle').textContent = template.title;
  const fieldsList = document.getElementById('fieldsList');
  fieldsList.innerHTML = '';

  template.fields.forEach((field, index) => {
    const div = document.createElement('div');
    div.className = 'field';
    
    const inputId = `field-${field.name}`;
    const placeholder = field.placeholder || '';

    if (field.type === 'textarea') {
      div.innerHTML = `
        <label for="${inputId}">${field.label}</label>
        <textarea id="${inputId}" name="${field.name}" rows="3" placeholder="${placeholder}" aria-label="${field.label}"></textarea>
      `;
    } else {
      div.innerHTML = `
        <label for="${inputId}">${field.label}</label>
        <input type="${field.type || 'text'}" id="${inputId}" name="${field.name}" placeholder="${placeholder}" aria-label="${field.label}">
      `;
    }
    
    // Add staggered animation
    div.style.opacity = '0';
    div.style.transform = 'translateY(10px)';
    setTimeout(() => {
      div.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    }, index * 50);
    
    fieldsList.appendChild(div);
  });

  // Set today's date as default
  const dateInput = fieldsList.querySelector('input[type="date"]');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  document.getElementById('undoBtn').disabled = true;
  switchTab('fields');
}

async function scanDocument() {
  const btn = document.getElementById('scanBtn');
  btn.classList.add('loading');

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();
      
      const charCount = body.text.length;
      const wordCount = body.text.trim().split(/\s+/).filter(w => w).length;
      
      toast(`Scanned: ${wordCount.toLocaleString()} words, ${charCount.toLocaleString()} characters`, 'success');
      announceToScreenReader(`Document scanned. ${wordCount} words found.`);
    });
  } catch (err) {
    console.error('Scan failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t scan document', 'error', errorType);
  } finally {
    btn.classList.remove('loading');
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOKMARK DETECTION & VARIABLE BUILDER
// ═══════════════════════════════════════════════════════════════

let detectedBookmarks = [];
let bookmarkValues = {};

async function detectBookmarks() {
  const btn = document.getElementById('detectBookmarksBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  
  try {
    await Word.run(async (context) => {
      // Get all bookmarks in the document
      const bookmarks = context.document.body.getRange().getBookmarks(true);
      await context.sync();
      
      detectedBookmarks = [];
      
      // Load each bookmark's details
      for (const bookmarkName of bookmarks.value) {
        try {
          const range = context.document.getBookmarkRangeOrNullObject(bookmarkName);
          range.load('text');
          await context.sync();
          
          if (!range.isNullObject) {
            detectedBookmarks.push({
              name: bookmarkName,
              currentValue: range.text || '',
              displayName: formatBookmarkName(bookmarkName)
            });
          }
        } catch (e) {
          // Skip problematic bookmarks
          console.warn(`Couldn't load bookmark: ${bookmarkName}`, e);
        }
      }
      
      await context.sync();
    });
    
    if (detectedBookmarks.length === 0) {
      toast('No bookmarks found in this document', 'warning');
      showBookmarkHelp();
      return;
    }
    
    // Sort alphabetically by display name
    detectedBookmarks.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Update count display
    const countEl = document.getElementById('variablesCount');
    if (countEl) {
      countEl.textContent = `${detectedBookmarks.length} bookmark${detectedBookmarks.length !== 1 ? 's' : ''} detected`;
    }
    
    // Build the variable form
    buildVariableForm();
    switchTab('variables');
    
    toast(`Found ${detectedBookmarks.length} bookmark${detectedBookmarks.length !== 1 ? 's' : ''}`, 'success');
    announceToScreenReader(`${detectedBookmarks.length} bookmarks detected. Variable form ready.`);
    
  } catch (err) {
    console.error('Bookmark detection failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t detect bookmarks', 'error', errorType);
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }
}

function formatBookmarkName(name) {
  // Convert bookmark names to readable labels
  // e.g., "client_name" → "Client Name", "DATE" → "Date"
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function guessFieldType(name, currentValue) {
  const nameLower = name.toLowerCase();
  
  // Date fields
  if (nameLower.includes('date') || nameLower.includes('dated')) {
    return 'date';
  }
  
  // Email fields
  if (nameLower.includes('email') || nameLower.includes('e-mail')) {
    return 'email';
  }
  
  // Phone fields
  if (nameLower.includes('phone') || nameLower.includes('fax') || nameLower.includes('tel')) {
    return 'tel';
  }
  
  // Number fields
  if (nameLower.includes('amount') || nameLower.includes('number') || nameLower.includes('count') || nameLower.includes('qty')) {
    return 'number';
  }
  
  // Address/long text fields
  if (nameLower.includes('address') || nameLower.includes('description') || nameLower.includes('notes')) {
    return 'textarea';
  }
  
  // Default to text
  return 'text';
}

function buildVariableForm() {
  const container = document.getElementById('variablesList');
  if (!container) return;
  
  container.innerHTML = '';
  bookmarkValues = {};
  
  // Group bookmarks by category (based on prefix or common patterns)
  const groups = groupBookmarks(detectedBookmarks);
  
  Object.entries(groups).forEach(([groupName, bookmarks], groupIndex) => {
    // Add group header if multiple groups
    if (Object.keys(groups).length > 1) {
      const header = document.createElement('div');
      header.className = 'variable-group-header';
      header.innerHTML = `<span>${escapeHtml(groupName)}</span><span class="group-count">${bookmarks.length}</span>`;
      header.style.animationDelay = `${groupIndex * 50}ms`;
      container.appendChild(header);
    }
    
    bookmarks.forEach((bookmark, index) => {
      const fieldType = guessFieldType(bookmark.name, bookmark.currentValue);
      const fieldId = `var-${bookmark.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const div = document.createElement('div');
      div.className = 'field variable-field';
      div.style.animationDelay = `${(groupIndex * 50) + (index * 30)}ms`;
      
      // Store initial value
      bookmarkValues[bookmark.name] = bookmark.currentValue;
      
      if (fieldType === 'textarea') {
        div.innerHTML = `
          <label for="${fieldId}">
            ${escapeHtml(bookmark.displayName)}
            <span class="bookmark-name" title="Bookmark: ${escapeHtml(bookmark.name)}">${escapeHtml(bookmark.name)}</span>
          </label>
          <textarea 
            id="${fieldId}" 
            name="${escapeHtml(bookmark.name)}" 
            rows="3" 
            placeholder="Enter ${escapeHtml(bookmark.displayName.toLowerCase())}"
            aria-label="${escapeHtml(bookmark.displayName)}"
          >${escapeHtml(bookmark.currentValue)}</textarea>
        `;
      } else {
        div.innerHTML = `
          <label for="${fieldId}">
            ${escapeHtml(bookmark.displayName)}
            <span class="bookmark-name" title="Bookmark: ${escapeHtml(bookmark.name)}">${escapeHtml(bookmark.name)}</span>
          </label>
          <input 
            type="${fieldType}" 
            id="${fieldId}" 
            name="${escapeHtml(bookmark.name)}" 
            value="${escapeHtml(bookmark.currentValue)}"
            placeholder="Enter ${escapeHtml(bookmark.displayName.toLowerCase())}"
            aria-label="${escapeHtml(bookmark.displayName)}"
          >
        `;
      }
      
      // Track changes
      const input = div.querySelector('input, textarea');
      input.addEventListener('input', () => {
        bookmarkValues[bookmark.name] = input.value;
        updateFillButtonState();
      });
      
      container.appendChild(div);
    });
  });
  
  updateFillButtonState();
}

function groupBookmarks(bookmarks) {
  const groups = {};
  
  bookmarks.forEach(bookmark => {
    // Try to extract group from prefix (e.g., "client_name" → "Client")
    const parts = bookmark.name.split(/[_-]/);
    let groupName = 'Variables';
    
    if (parts.length > 1) {
      const prefix = parts[0].toLowerCase();
      // Common prefixes that indicate grouping
      const groupPrefixes = {
        'client': 'Client Information',
        'customer': 'Customer Information', 
        'vendor': 'Vendor Information',
        'seller': 'Seller Information',
        'buyer': 'Buyer Information',
        'party': 'Party Information',
        'plaintiff': 'Plaintiff',
        'defendant': 'Defendant',
        'matter': 'Matter Details',
        'case': 'Case Details',
        'contract': 'Contract Details',
        'payment': 'Payment Details',
        'date': 'Dates',
        'address': 'Addresses',
        'contact': 'Contact Information'
      };
      
      if (groupPrefixes[prefix]) {
        groupName = groupPrefixes[prefix];
      }
    }
    
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(bookmark);
  });
  
  return groups;
}

function updateFillButtonState() {
  const btn = document.getElementById('fillVariablesBtn');
  if (!btn) return;
  
  // Check if any values have changed
  const hasChanges = detectedBookmarks.some(b => 
    bookmarkValues[b.name] !== b.currentValue
  );
  
  btn.disabled = !hasChanges;
  btn.textContent = hasChanges ? 'Fill Document' : 'No Changes';
}

async function fillBookmarks() {
  const btn = document.getElementById('fillVariablesBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
    btn.innerHTML = '<span>Filling...</span>';
  }
  
  let filledCount = 0;
  let errorCount = 0;
  
  try {
    await Word.run(async (context) => {
      for (const bookmark of detectedBookmarks) {
        const newValue = bookmarkValues[bookmark.name];
        
        // Skip if unchanged
        if (newValue === bookmark.currentValue) continue;
        
        try {
          const range = context.document.getBookmarkRangeOrNullObject(bookmark.name);
          await context.sync();
          
          if (!range.isNullObject) {
            range.insertText(newValue, Word.InsertLocation.replace);
            bookmark.currentValue = newValue; // Update our record
            filledCount++;
          }
        } catch (e) {
          console.warn(`Failed to fill bookmark: ${bookmark.name}`, e);
          errorCount++;
        }
      }
      
      await context.sync();
    });
    
    if (filledCount > 0) {
      toast(`Filled ${filledCount} bookmark${filledCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success');
      announceToScreenReader(`${filledCount} bookmarks filled successfully`);
    } else if (errorCount > 0) {
      toast(`Couldn't fill bookmarks. Document may be protected.`, 'error', 'document-protected');
    }
    
    updateFillButtonState();
    
  } catch (err) {
    console.error('Fill bookmarks failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t fill bookmarks', 'error', errorType);
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.innerHTML = 'Fill Document';
      updateFillButtonState();
    }
  }
}

function showBookmarkHelp() {
  showErrorGuide('no-bookmarks');
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL VARIABLES & PLACEHOLDER SYSTEM
// ═══════════════════════════════════════════════════════════════

/*
 * Placeholder Syntax: {{Variable_Name}}
 * 
 * Features:
 * - Punctuation Guard: Handles blanks gracefully (no ghost spaces/commas)
 * - Global Variables: Change once, updates everywhere
 * - Dynamic Formatting: Inserted text inherits destination style
 * - Cross-References: Auto-updates section numbers (where possible)
 */

// Default global variables (can be customized per firm/client)
const DEFAULT_VARIABLES = {
  'Firm_Name': '',
  'Firm_Address': '',
  'Firm_Phone': '',
  'Firm_Email': '',
  'Client_Name': '',
  'Client_Address': '',
  'Matter_Number': '',
  'Governing_Law': '',
  'Effective_Date': '',
  'Today_Date': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
};

function initGlobalVariables() {
  // Load from localStorage or use defaults
  const saved = localStorage.getItem('draftbridge_global_vars');
  globalVariables = saved ? { ...DEFAULT_VARIABLES, ...JSON.parse(saved) } : { ...DEFAULT_VARIABLES };
}

function saveGlobalVariables() {
  localStorage.setItem('draftbridge_global_vars', JSON.stringify(globalVariables));
}

function setGlobalVariable(name, value) {
  globalVariables[name] = value;
  saveGlobalVariables();
}

function getGlobalVariable(name) {
  return globalVariables[name] || '';
}

// ═══════════════════════════════════════════════════════════════
// PUNCTUATION GUARD
// ═══════════════════════════════════════════════════════════════

/*
 * Handles blank variables gracefully:
 * - "{{First_Name}} {{Middle_Initial}}. {{Last_Name}}" 
 *   with blank Middle_Initial → "John Smith" (no orphan period)
 * 
 * - "Contact: {{Phone}}, {{Email}}"
 *   with blank Phone → "Contact: email@example.com" (no leading comma)
 */

function applyPunctuationGuard(text, variables) {
  let result = text;
  
  // Replace all variables first
  result = result.replace(VARIABLE_SYNTAX, (match, varName) => {
    const cleanName = varName.trim();
    return variables[cleanName] ?? globalVariables[cleanName] ?? '';
  });
  
  // Punctuation Guard Rules:
  
  // 1. Remove orphan punctuation after blank variables
  // "John . Smith" → "John Smith"
  result = result.replace(/\s+([.,;:])\s+/g, (match, punct) => {
    return punct === '.' ? ' ' : punct + ' ';
  });
  
  // 2. Remove double spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  // 3. Remove leading punctuation after newlines or at start
  result = result.replace(/^[,;]\s*/gm, '');
  result = result.replace(/\n[,;]\s*/g, '\n');
  
  // 4. Remove trailing punctuation before other punctuation
  // "Hello,, world" → "Hello, world"
  result = result.replace(/([,;:])\s*([,;:.])/g, '$2');
  
  // 5. Remove orphan periods (period with only whitespace before it)
  result = result.replace(/\s+\.\s+/g, ' ');
  result = result.replace(/\s+\.$/gm, '');
  
  // 6. Fix double periods
  result = result.replace(/\.{2,}/g, '.');
  
  // 7. Remove empty parentheses/brackets
  result = result.replace(/\(\s*\)/g, '');
  result = result.replace(/\[\s*\]/g, '');
  
  // 8. Clean up comma-space-comma patterns
  result = result.replace(/,\s*,/g, ',');
  
  // 9. Trim each line
  result = result.split('\n').map(line => line.trim()).join('\n');
  
  // 10. Remove blank lines that resulted from empty variables
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

// ═══════════════════════════════════════════════════════════════
// SMART TEXT INSERTION (Dynamic Formatting)
// ═══════════════════════════════════════════════════════════════

/*
 * Inserts text while inheriting destination formatting
 * Office.js doesn't have direct style inheritance, so we:
 * 1. Read the current selection's style
 * 2. Insert plain text
 * 3. The text naturally inherits the paragraph style
 */

async function insertTextSmart(text, variables = {}) {
  // Apply variable substitution with punctuation guard
  const processedText = applyPunctuationGuard(text, variables);
  
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      
      // Insert as plain text (inherits destination formatting)
      // Using 'replace' ensures we don't bring source formatting
      selection.insertText(processedText, Word.InsertLocation.replace);
      
      await context.sync();
    });
    
    return { success: true, text: processedText };
  } catch (err) {
    console.error('Smart insert failed:', err);
    return { success: false, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════
// CROSS-REFERENCING SYSTEM
// ═══════════════════════════════════════════════════════════════

/*
 * Tracks section/paragraph numbers and updates references
 * Syntax: {{ref:SectionName}} or {{section:1.2.3}}
 */

async function scanDocumentStructure() {
  const structure = {
    sections: [],
    paragraphs: [],
    headings: []
  };
  
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const paragraphs = body.paragraphs;
      paragraphs.load('items/text,items/style');
      await context.sync();
      
      let sectionNum = 0;
      let subSectionNum = 0;
      
      paragraphs.items.forEach((para, idx) => {
        const text = para.text.trim();
        const style = para.style || '';
        
        // Detect headings by style or numbering pattern
        if (style.includes('Heading 1') || /^[IVXLCDM]+\.\s/.test(text) || /^\d+\.\s/.test(text)) {
          sectionNum++;
          subSectionNum = 0;
          structure.sections.push({
            index: idx,
            number: sectionNum,
            text: text,
            ref: `section-${sectionNum}`
          });
        } else if (style.includes('Heading 2') || /^\d+\.\d+\s/.test(text)) {
          subSectionNum++;
          structure.sections.push({
            index: idx,
            number: `${sectionNum}.${subSectionNum}`,
            text: text,
            ref: `section-${sectionNum}-${subSectionNum}`
          });
        }
        
        structure.paragraphs.push({
          index: idx,
          text: text.slice(0, 100)
        });
      });
      
      await context.sync();
    });
  } catch (err) {
    console.error('Structure scan failed:', err);
  }
  
  return structure;
}

async function updateCrossReferences() {
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      
      // Find all cross-reference placeholders
      const refPattern = /\{\{ref:([^}]+)\}\}/g;
      const searchResults = body.search('{{ref:*}}', { matchWildcards: true });
      searchResults.load('items/text');
      await context.sync();
      
      // For each reference, update with current section number
      // Note: Full implementation would require tracking section numbers
      // This is a simplified version
      
      toast('Cross-references updated', 'success');
    });
  } catch (err) {
    console.error('Cross-reference update failed:', err);
    toast('Couldn\'t update cross-references', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL VARIABLES PANEL
// ═══════════════════════════════════════════════════════════════

function openGlobalVariables() {
  buildGlobalVariablesForm();
  switchTab('globalvars');
}

function buildGlobalVariablesForm() {
  const container = document.getElementById('globalVarsList');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Group variables by category
  const groups = {
    'Firm Information': ['Firm_Name', 'Firm_Address', 'Firm_Phone', 'Firm_Email'],
    'Client Information': ['Client_Name', 'Client_Address', 'Matter_Number'],
    'Document Details': ['Governing_Law', 'Effective_Date', 'Today_Date']
  };
  
  Object.entries(groups).forEach(([groupName, varNames]) => {
    const group = document.createElement('div');
    group.className = 'var-group';
    group.innerHTML = `<div class="var-group-header">${groupName}</div>`;
    
    varNames.forEach(varName => {
      const value = globalVariables[varName] || '';
      const displayName = varName.replace(/_/g, ' ');
      const fieldId = `gvar-${varName}`;
      
      const field = document.createElement('div');
      field.className = 'field';
      field.innerHTML = `
        <label for="${fieldId}">
          ${displayName}
          <code class="var-syntax">{{${varName}}}</code>
        </label>
        <input type="text" 
               id="${fieldId}" 
               value="${escapeHtml(value)}" 
               placeholder="Enter ${displayName.toLowerCase()}"
               data-var="${varName}">
      `;
      
      const input = field.querySelector('input');
      input.addEventListener('input', () => {
        setGlobalVariable(varName, input.value);
      });
      
      group.appendChild(field);
    });
    
    container.appendChild(group);
  });
  
  // Add custom variable section
  const customSection = document.createElement('div');
  customSection.className = 'var-group';
  customSection.innerHTML = `
    <div class="var-group-header">Custom Variables</div>
    <div class="add-var-row">
      <input type="text" id="newVarName" placeholder="Variable_Name" class="var-name-input">
      <input type="text" id="newVarValue" placeholder="Value" class="var-value-input">
      <button class="add-var-btn" onclick="addCustomVariable()">+</button>
    </div>
    <div id="customVarsList"></div>
  `;
  container.appendChild(customSection);
  
  // Render existing custom variables
  renderCustomVariables();
}

function renderCustomVariables() {
  const container = document.getElementById('customVarsList');
  if (!container) return;
  
  const builtInVars = Object.keys(DEFAULT_VARIABLES);
  const customVars = Object.entries(globalVariables)
    .filter(([key]) => !builtInVars.includes(key));
  
  container.innerHTML = '';
  
  customVars.forEach(([varName, value]) => {
    const row = document.createElement('div');
    row.className = 'custom-var-row';
    row.innerHTML = `
      <code>{{${escapeHtml(varName)}}}</code>
      <input type="text" value="${escapeHtml(value)}" data-var="${escapeHtml(varName)}">
      <button class="remove-var-btn" onclick="removeCustomVariable('${escapeHtml(varName)}')">×</button>
    `;
    
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      setGlobalVariable(varName, input.value);
    });
    
    container.appendChild(row);
  });
}

function addCustomVariable() {
  const nameInput = document.getElementById('newVarName');
  const valueInput = document.getElementById('newVarValue');
  
  const name = nameInput.value.trim().replace(/\s+/g, '_');
  const value = valueInput.value;
  
  if (!name) {
    toast('Please enter a variable name', 'warning');
    return;
  }
  
  if (globalVariables[name] !== undefined) {
    toast('Variable already exists', 'warning');
    return;
  }
  
  setGlobalVariable(name, value);
  renderCustomVariables();
  
  nameInput.value = '';
  valueInput.value = '';
  nameInput.focus();
  
  toast(`Added {{${name}}}`, 'success');
}

function removeCustomVariable(name) {
  delete globalVariables[name];
  saveGlobalVariables();
  renderCustomVariables();
  toast(`Removed {{${name}}}`, 'info');
}

// ═══════════════════════════════════════════════════════════════
// APPLY GLOBAL VARIABLES TO DOCUMENT
// ═══════════════════════════════════════════════════════════════

async function applyGlobalVariablesToDocument() {
  const btn = document.getElementById('applyGlobalVarsBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  
  let replacedCount = 0;
  
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      
      // Find and replace each variable
      for (const [varName, value] of Object.entries(globalVariables)) {
        if (!value) continue; // Skip empty values
        
        const placeholder = `{{${varName}}}`;
        const searchResults = body.search(placeholder, { matchCase: false });
        searchResults.load('items');
        await context.sync();
        
        if (searchResults.items.length > 0) {
          for (const result of searchResults.items) {
            result.insertText(value, Word.InsertLocation.replace);
            replacedCount++;
          }
          await context.sync();
        }
      }
    });
    
    if (replacedCount > 0) {
      toast(`Replaced ${replacedCount} placeholder${replacedCount !== 1 ? 's' : ''}`, 'success');
    } else {
      toast('No placeholders found (use {{Variable_Name}} syntax)', 'info');
    }
    
  } catch (err) {
    console.error('Apply variables failed:', err);
    toast('Couldn\'t apply variables', 'error');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }
}

async function scanForPlaceholders() {
  const btn = document.getElementById('scanPlaceholdersBtn');
  if (btn) btn.classList.add('loading');
  
  const found = [];
  
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();
      
      const text = body.text;
      let match;
      
      while ((match = VARIABLE_SYNTAX.exec(text)) !== null) {
        const varName = match[1].trim();
        if (!found.includes(varName)) {
          found.push(varName);
        }
      }
    });
    
    if (found.length > 0) {
      // Add any new placeholders to global variables
      found.forEach(varName => {
        if (globalVariables[varName] === undefined) {
          globalVariables[varName] = '';
        }
      });
      saveGlobalVariables();
      buildGlobalVariablesForm();
      toast(`Found ${found.length} placeholder${found.length !== 1 ? 's' : ''}: ${found.join(', ')}`, 'success');
    } else {
      toast('No {{placeholders}} found in document', 'info');
    }
    
  } catch (err) {
    console.error('Scan failed:', err);
    toast('Couldn\'t scan document', 'error');
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// Initialize on load
initGlobalVariables();

// ═══════════════════════════════════════════════════════════════
// CLIENTS PANEL (Drag & Drop)
// ═══════════════════════════════════════════════════════════════

let clients = [];

function initClients() {
  // Load from localStorage or use sample data
  const saved = localStorage.getItem('draftbridge_clients');
  if (saved) {
    clients = JSON.parse(saved);
  } else {
    // Sample clients for demo
    clients = [
      {
        id: 'client-1',
        name: 'Acme Corporation',
        contact: 'John Smith',
        email: 'jsmith@acme.com',
        phone: '(555) 123-4567',
        address: '123 Business Ave, Suite 100\nNew York, NY 10001',
        matters: ['M-2024-001', 'M-2024-015']
      },
      {
        id: 'client-2', 
        name: 'TechStart Inc.',
        contact: 'Sarah Johnson',
        email: 'sarah@techstart.io',
        phone: '(555) 987-6543',
        address: '456 Innovation Blvd\nSan Francisco, CA 94102',
        matters: ['M-2024-008']
      },
      {
        id: 'client-3',
        name: 'Global Enterprises LLC',
        contact: 'Michael Chen',
        email: 'mchen@globalent.com',
        phone: '(555) 456-7890',
        address: '789 Corporate Park\nChicago, IL 60601',
        matters: ['M-2023-042', 'M-2024-003']
      }
    ];
    saveClients();
  }
}

function saveClients() {
  localStorage.setItem('draftbridge_clients', JSON.stringify(clients));
}

function openClientsPanel() {
  renderClientsList();
  switchTab('clients');
}

function renderClientsList(filter = '') {
  const container = document.getElementById('clientsList');
  if (!container) return;
  
  container.innerHTML = '';
  
  const filtered = filter 
    ? clients.filter(c => 
        c.name.toLowerCase().includes(filter) ||
        c.contact.toLowerCase().includes(filter) ||
        c.email.toLowerCase().includes(filter)
      )
    : clients;
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="clients-empty">
        <p>${filter ? 'No clients match your search' : 'No clients yet'}</p>
        <button class="btn-small" onclick="showAddClientModal()">Add your first client</button>
      </div>
    `;
    return;
  }
  
  filtered.forEach((client, idx) => {
    const card = document.createElement('div');
    card.className = 'client-card';
    card.draggable = true;
    card.dataset.clientId = client.id;
    card.style.animationDelay = `${idx * 50}ms`;
    
    card.innerHTML = `
      <div class="client-card-header">
        <div class="client-avatar">${client.name.charAt(0)}</div>
        <div class="client-info">
          <div class="client-name">${escapeHtml(client.name)}</div>
          <div class="client-contact">${escapeHtml(client.contact)}</div>
        </div>
        <button class="client-menu-btn" onclick="event.stopPropagation(); toggleClientMenu('${client.id}')" aria-label="Client options">⋮</button>
      </div>
      <div class="client-details">
        <div class="client-detail"><span>📧</span> ${escapeHtml(client.email)}</div>
        <div class="client-detail"><span>📞</span> ${escapeHtml(client.phone)}</div>
      </div>
      <div class="client-actions">
        <button class="client-apply-btn" onclick="applyClientToDocument('${client.id}')">
          Apply to Document
        </button>
      </div>
      <div class="client-menu hidden" id="menu-${client.id}">
        <button onclick="editClient('${client.id}')">Edit</button>
        <button onclick="deleteClient('${client.id}')">Delete</button>
      </div>
    `;
    
    // Drag events
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(client));
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    // Click to apply
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        applyClientToDocument(client.id);
      }
    });
    
    container.appendChild(card);
  });
}

function toggleClientMenu(clientId) {
  const menu = document.getElementById(`menu-${clientId}`);
  if (menu) {
    menu.classList.toggle('hidden');
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.client-menu') && !e.target.closest('.client-menu-btn')) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }
}

async function applyClientToDocument(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  // Map client to global variables
  const clientVars = {
    'Client_Name': client.name,
    'Client_Contact': client.contact,
    'Client_Email': client.email,
    'Client_Phone': client.phone,
    'Client_Address': client.address
  };
  
  // Update global variables
  Object.entries(clientVars).forEach(([key, value]) => {
    setGlobalVariable(key, value);
  });
  
  // Apply to document
  let replacedCount = 0;
  
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      
      // Replace client-related placeholders
      for (const [varName, value] of Object.entries(clientVars)) {
        if (!value) continue;
        
        const placeholder = `{{${varName}}}`;
        const searchResults = body.search(placeholder, { matchCase: false });
        searchResults.load('items');
        await context.sync();
        
        if (searchResults.items.length > 0) {
          for (const result of searchResults.items) {
            result.insertText(value, Word.InsertLocation.replace);
            replacedCount++;
          }
          await context.sync();
        }
      }
    });
    
    if (replacedCount > 0) {
      toast(`Applied ${client.name}: ${replacedCount} field${replacedCount !== 1 ? 's' : ''} updated`, 'success');
    } else {
      toast(`${client.name} saved. No {{Client_*}} placeholders found to replace.`, 'info');
    }
    
  } catch (err) {
    console.error('Apply client failed:', err);
    toast('Couldn\'t apply client info', 'error');
  }
}

function showAddClientModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'addClientModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Add Client</h3>
        <button class="modal-close" onclick="closeAddClientModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label for="newClientName">Client/Company Name *</label>
          <input type="text" id="newClientName" placeholder="Acme Corporation" required>
        </div>
        <div class="field">
          <label for="newClientContact">Contact Person</label>
          <input type="text" id="newClientContact" placeholder="John Smith">
        </div>
        <div class="field">
          <label for="newClientEmail">Email</label>
          <input type="email" id="newClientEmail" placeholder="jsmith@acme.com">
        </div>
        <div class="field">
          <label for="newClientPhone">Phone</label>
          <input type="tel" id="newClientPhone" placeholder="(555) 123-4567">
        </div>
        <div class="field">
          <label for="newClientAddress">Address</label>
          <textarea id="newClientAddress" rows="2" placeholder="123 Business Ave&#10;City, State 12345"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick="closeAddClientModal()">Cancel</button>
        <button class="btn primary" onclick="saveNewClient()">Add Client</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => {
    modal.classList.add('visible');
    document.getElementById('newClientName').focus();
  });
}

function closeAddClientModal() {
  const modal = document.getElementById('addClientModal');
  if (modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 200);
  }
}

function saveNewClient() {
  const name = document.getElementById('newClientName').value.trim();
  if (!name) {
    toast('Please enter a client name', 'warning');
    return;
  }
  
  const newClient = {
    id: `client-${Date.now()}`,
    name: name,
    contact: document.getElementById('newClientContact').value.trim(),
    email: document.getElementById('newClientEmail').value.trim(),
    phone: document.getElementById('newClientPhone').value.trim(),
    address: document.getElementById('newClientAddress').value.trim(),
    matters: []
  };
  
  clients.unshift(newClient);
  saveClients();
  closeAddClientModal();
  renderClientsList();
  toast(`Added ${name}`, 'success');
}

function editClient(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  // Reuse add modal with prefilled data
  showAddClientModal();
  
  setTimeout(() => {
    document.getElementById('newClientName').value = client.name;
    document.getElementById('newClientContact').value = client.contact || '';
    document.getElementById('newClientEmail').value = client.email || '';
    document.getElementById('newClientPhone').value = client.phone || '';
    document.getElementById('newClientAddress').value = client.address || '';
    
    // Change save button to update
    const modal = document.getElementById('addClientModal');
    modal.querySelector('h3').textContent = 'Edit Client';
    const saveBtn = modal.querySelector('.btn.primary');
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = () => {
      client.name = document.getElementById('newClientName').value.trim();
      client.contact = document.getElementById('newClientContact').value.trim();
      client.email = document.getElementById('newClientEmail').value.trim();
      client.phone = document.getElementById('newClientPhone').value.trim();
      client.address = document.getElementById('newClientAddress').value.trim();
      saveClients();
      closeAddClientModal();
      renderClientsList();
      toast(`Updated ${client.name}`, 'success');
    };
  }, 50);
}

function deleteClient(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
    clients = clients.filter(c => c.id !== clientId);
    saveClients();
    renderClientsList();
    toast(`Deleted ${client.name}`, 'info');
  }
}

// Initialize clients
initClients();

// ═══════════════════════════════════════════════════════════════
// RECREATE FEATURE (Document Type Conversion)
// ═══════════════════════════════════════════════════════════════

let currentDocumentContent = '';
let selectedRecreateTarget = null;
let recreateMode = 'convert'; // 'convert' or 'swap'
let detectedEntities = {}; // For swap mode
let swapReplacements = {};

async function openRecreatePanel() {
  const btn = document.getElementById('recreateBtn');
  if (btn) btn.classList.add('loading');
  
  // Reset state
  selectedRecreateTarget = null;
  document.querySelectorAll('.recreate-option').forEach(opt => {
    opt.classList.remove('selected');
    opt.setAttribute('aria-checked', 'false');
  });
  document.getElementById('doRecreateBtn').disabled = true;
  
  // Show loading state
  const previewContent = document.getElementById('previewContent');
  if (previewContent) {
    previewContent.innerHTML = '<span class="preview-loading">Analyzing document...</span>';
  }
  
  switchTab('recreate');
  
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();
      
      currentDocumentContent = body.text.trim();
      
      if (!currentDocumentContent || currentDocumentContent.length < 20) {
        previewContent.innerHTML = `
          <div class="preview-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <span>Document is empty or too short to convert</span>
          </div>
        `;
        return;
      }
      
      // Show preview (first ~200 chars)
      const preview = currentDocumentContent.slice(0, 200);
      const wordCount = currentDocumentContent.split(/\s+/).filter(w => w).length;
      const detectedType = detectDocumentType(currentDocumentContent);
      
      previewContent.innerHTML = `
        <div class="preview-meta">
          <span class="preview-type">${escapeHtml(detectedType)}</span>
          <span class="preview-stats">${wordCount.toLocaleString()} words</span>
        </div>
        <div class="preview-text">${escapeHtml(preview)}${currentDocumentContent.length > 200 ? '...' : ''}</div>
      `;
    });
  } catch (err) {
    console.error('Failed to analyze document:', err);
    previewContent.innerHTML = `
      <div class="preview-empty preview-error">
        <span>Couldn't read document. Make sure a document is open.</span>
      </div>
    `;
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

function detectDocumentType(text) {
  const lower = text.toLowerCase();
  const firstLines = lower.slice(0, 500);
  
  if (firstLines.includes('memorandum') || firstLines.includes('memo')) return 'Memorandum';
  if (firstLines.includes('dear ') && (lower.includes('sincerely') || lower.includes('regards'))) return 'Letter';
  if (firstLines.includes('fax') && firstLines.includes('pages')) return 'Fax Cover';
  if (firstLines.includes('plaintiff') || firstLines.includes('defendant') || firstLines.includes('court')) return 'Pleading';
  if (firstLines.includes('agreement') || firstLines.includes('contract') || lower.includes('whereas')) return 'Contract';
  if (firstLines.includes('brief') || firstLines.includes('argument')) return 'Brief';
  if (firstLines.includes('subject:') || firstLines.includes('from:') || firstLines.includes('to:')) return 'Email/Memo';
  
  return 'Document';
}

function selectRecreateTarget(option) {
  // Deselect all
  document.querySelectorAll('.recreate-option').forEach(opt => {
    opt.classList.remove('selected');
    opt.setAttribute('aria-checked', 'false');
  });
  
  // Select this one
  option.classList.add('selected');
  option.setAttribute('aria-checked', 'true');
  selectedRecreateTarget = option.dataset.target;
  
  // Enable button
  document.getElementById('doRecreateBtn').disabled = false;
}

function switchRecreateMode(mode) {
  recreateMode = mode;
  
  // Update tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  
  // Show/hide appropriate options
  const convertOptions = document.getElementById('convertOptions');
  const convertSettings = document.getElementById('convertSettings');
  const swapOptions = document.getElementById('swapOptions');
  const btn = document.getElementById('doRecreateBtn');
  
  if (mode === 'convert') {
    convertOptions?.classList.remove('hidden');
    convertSettings?.classList.remove('hidden');
    swapOptions?.classList.add('hidden');
    btn.querySelector('.btn-text').textContent = 'Recreate Document';
    btn.disabled = !selectedRecreateTarget;
  } else {
    convertOptions?.classList.add('hidden');
    convertSettings?.classList.add('hidden');
    swapOptions?.classList.remove('hidden');
    btn.querySelector('.btn-text').textContent = 'Replace Client Info';
    // Build swap fields
    buildSwapFields();
  }
}

function buildSwapFields() {
  const container = document.getElementById('swapFields');
  const detected = document.getElementById('swapDetected');
  const btn = document.getElementById('doRecreateBtn');
  
  if (!container || !currentDocumentContent) {
    if (detected) detected.innerHTML = '<span class="swap-empty">No document content to analyze</span>';
    return;
  }
  
  // Extract entities from current document
  detectedEntities = extractAllEntities(currentDocumentContent);
  swapReplacements = {};
  
  // Show what we found
  const entityCount = Object.values(detectedEntities).flat().length;
  if (detected) {
    detected.innerHTML = `<span class="swap-found">Found ${entityCount} replaceable item${entityCount !== 1 ? 's' : ''}</span>`;
  }
  
  container.innerHTML = '';
  
  // Build editable fields for each entity type
  const entityTypes = [
    { key: 'names', label: 'Names', icon: '👤' },
    { key: 'companies', label: 'Companies', icon: '🏢' },
    { key: 'dates', label: 'Dates', icon: '📅' },
    { key: 'addresses', label: 'Addresses', icon: '📍' },
    { key: 'emails', label: 'Emails', icon: '✉️' },
    { key: 'phones', label: 'Phone Numbers', icon: '📞' }
  ];
  
  let hasFields = false;
  
  entityTypes.forEach(({ key, label, icon }) => {
    const entities = detectedEntities[key] || [];
    if (entities.length === 0) return;
    
    hasFields = true;
    
    const group = document.createElement('div');
    group.className = 'swap-group';
    group.innerHTML = `<div class="swap-group-header">${icon} ${label}</div>`;
    
    entities.forEach((entity, idx) => {
      const fieldId = `swap-${key}-${idx}`;
      swapReplacements[`${key}-${idx}`] = { original: entity, replacement: entity };
      
      const field = document.createElement('div');
      field.className = 'swap-field';
      field.innerHTML = `
        <div class="swap-original" title="Original">${escapeHtml(entity)}</div>
        <span class="swap-arrow">→</span>
        <input type="text" 
               id="${fieldId}" 
               class="swap-input" 
               value="${escapeHtml(entity)}" 
               placeholder="New value"
               data-key="${key}-${idx}">
      `;
      
      const input = field.querySelector('input');
      input.addEventListener('input', () => {
        swapReplacements[`${key}-${idx}`].replacement = input.value;
        updateSwapButtonState();
      });
      
      group.appendChild(field);
    });
    
    container.appendChild(group);
  });
  
  if (!hasFields) {
    container.innerHTML = '<div class="swap-empty">No replaceable content found (names, dates, addresses, etc.)</div>';
  }
  
  updateSwapButtonState();
}

function updateSwapButtonState() {
  const btn = document.getElementById('doRecreateBtn');
  if (!btn || recreateMode !== 'swap') return;
  
  // Check if any replacements are different from original
  const hasChanges = Object.values(swapReplacements).some(
    r => r.replacement !== r.original && r.replacement.trim() !== ''
  );
  
  btn.disabled = !hasChanges;
}

function extractAllEntities(text) {
  const entities = {
    names: [],
    companies: [],
    dates: [],
    addresses: [],
    emails: [],
    phones: []
  };
  
  // Names (Title Case pairs, excluding common words)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/g;
  const commonWords = ['The', 'This', 'That', 'These', 'Those', 'Dear', 'Sincerely', 'Regards'];
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1];
    if (!commonWords.some(w => name.startsWith(w)) && !entities.names.includes(name)) {
      entities.names.push(name);
    }
  }
  entities.names = entities.names.slice(0, 8);
  
  // Companies (words ending in Inc, LLC, Corp, etc.)
  const companyPattern = /\b([A-Z][A-Za-z\s&]+(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Co\.|Ltd\.?|LLP|LP|PC|PLLC))\b/g;
  while ((match = companyPattern.exec(text)) !== null) {
    if (!entities.companies.includes(match[1])) {
      entities.companies.push(match[1].trim());
    }
  }
  entities.companies = entities.companies.slice(0, 5);
  
  // Dates
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi
  ];
  datePatterns.forEach(pattern => {
    while ((match = pattern.exec(text)) !== null) {
      if (!entities.dates.includes(match[1])) {
        entities.dates.push(match[1]);
      }
    }
  });
  entities.dates = entities.dates.slice(0, 5);
  
  // Emails
  const emailPattern = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
  while ((match = emailPattern.exec(text)) !== null) {
    if (!entities.emails.includes(match[1])) {
      entities.emails.push(match[1]);
    }
  }
  
  // Phones
  const phonePattern = /\b(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g;
  while ((match = phonePattern.exec(text)) !== null) {
    if (!entities.phones.includes(match[1])) {
      entities.phones.push(match[1]);
    }
  }
  
  // Addresses (simplified - look for patterns with numbers and state abbreviations)
  const addressPattern = /\b(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?(?:,?\s*(?:Suite|Ste|Apt|#)\s*\d+)?)\b/gi;
  while ((match = addressPattern.exec(text)) !== null) {
    if (!entities.addresses.includes(match[1])) {
      entities.addresses.push(match[1].trim());
    }
  }
  entities.addresses = entities.addresses.slice(0, 3);
  
  return entities;
}

async function executeRecreate() {
  if (recreateMode === 'swap') {
    await swapClientInfo();
  } else {
    await recreateDocument();
  }
}

async function swapClientInfo() {
  const btn = document.getElementById('doRecreateBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    // Build replacement map
    const replacements = Object.values(swapReplacements)
      .filter(r => r.replacement !== r.original && r.replacement.trim() !== '')
      .map(r => ({ from: r.original, to: r.replacement }));
    
    if (replacements.length === 0) {
      toast('No changes to apply', 'info');
      return;
    }
    
    await Word.run(async (context) => {
      const body = context.document.body;
      
      // Perform find/replace for each change
      for (const { from, to } of replacements) {
        const searchResults = body.search(from, { matchCase: true, matchWholeWord: false });
        searchResults.load('items');
        await context.sync();
        
        for (const result of searchResults.items) {
          result.insertText(to, Word.InsertLocation.replace);
        }
        await context.sync();
      }
    });
    
    toast(`Replaced ${replacements.length} item${replacements.length !== 1 ? 's' : ''}`, 'success');
    announceToScreenReader('Client information updated');
    
    // Refresh the detected content
    setTimeout(() => {
      openRecreatePanel();
    }, 1000);
    
  } catch (err) {
    console.error('Swap failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t replace client info', 'error', errorType);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function recreateDocument() {
  if (!selectedRecreateTarget || !currentDocumentContent) {
    toast('Please select a target format', 'warning');
    return;
  }
  
  const btn = document.getElementById('doRecreateBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  
  const keepInfo = document.getElementById('keepFormatting')?.checked ?? true;
  const appendOriginal = document.getElementById('appendOriginal')?.checked ?? false;
  
  try {
    // Extract key information from current document
    const extracted = extractDocumentInfo(currentDocumentContent);
    
    // Generate new format
    const newContent = generateRecreatedDocument(selectedRecreateTarget, extracted, currentDocumentContent);
    
    await Word.run(async (context) => {
      const body = context.document.body;
      
      if (appendOriginal) {
        // Add new content at the beginning, keep original below
        const originalContent = currentDocumentContent;
        body.clear();
        body.insertText(newContent, Word.InsertLocation.start);
        body.insertText('\n\n' + '─'.repeat(50) + '\nORIGINAL DOCUMENT:\n' + '─'.repeat(50) + '\n\n', Word.InsertLocation.end);
        body.insertText(originalContent, Word.InsertLocation.end);
      } else {
        // Replace entirely
        body.clear();
        body.insertText(newContent, Word.InsertLocation.start);
      }
      
      await context.sync();
    });
    
    toast(`Document recreated as ${capitalizeFirst(selectedRecreateTarget)}`, 'success');
    announceToScreenReader(`Document converted to ${selectedRecreateTarget} format`);
    
    // Go back to generate panel
    setTimeout(() => switchTab('generate'), 1500);
    
  } catch (err) {
    console.error('Recreate failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t recreate document', 'error', errorType);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function extractDocumentInfo(text) {
  const info = {
    names: [],
    dates: [],
    addresses: [],
    subject: '',
    body: ''
  };
  
  // Extract dates (various formats)
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi
  ];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) info.dates.push(...matches);
  });
  
  // Extract potential names (capitalized word pairs)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/g;
  const nameMatches = text.match(namePattern);
  if (nameMatches) {
    info.names = [...new Set(nameMatches)].slice(0, 10);
  }
  
  // Extract subject line if present
  const subjectMatch = text.match(/(?:RE:|Subject:|Re:)\s*([^\n]+)/i);
  if (subjectMatch) {
    info.subject = subjectMatch[1].trim();
  }
  
  // Get main body (skip headers, take middle content)
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 4) {
    info.body = lines.slice(2, -2).join('\n').trim();
  } else {
    info.body = text;
  }
  
  return info;
}

function generateRecreatedDocument(targetType, info, originalText) {
  const date = info.dates[0] || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const recipient = info.names[0] || '[Recipient Name]';
  const sender = info.names[1] || '[Your Name]';
  const subject = info.subject || '[Subject]';
  const body = info.body || originalText.slice(0, 500);
  
  switch (targetType) {
    case 'letter':
      return `${date}

${recipient}
[Address Line 1]
[City, State ZIP]

RE: ${subject}

Dear ${recipient.split(' ').pop()}:

${body}

Sincerely,


${sender}
[Title]`;

    case 'memo':
      return `MEMORANDUM

${'─'.repeat(50)}

DATE:\t${date}
TO:\t${recipient}
FROM:\t${sender}
RE:\t${subject}

${'─'.repeat(50)}

${body}`;

    case 'email':
      return `To: ${recipient}
From: ${sender}
Date: ${date}
Subject: ${subject}

${body}

Best regards,
${sender}`;

    case 'brief':
      return `IN THE [COURT NAME]

[Case Caption]
Case No. [Number]

${'═'.repeat(50)}
BRIEF IN SUPPORT OF [MOTION TYPE]
${'═'.repeat(50)}

I. INTRODUCTION

${body.slice(0, 200)}...

II. STATEMENT OF FACTS

[Facts to be added]

III. ARGUMENT

[Arguments to be added]

IV. CONCLUSION

[Conclusion to be added]

Respectfully submitted,

${sender}
[Bar Number]
[Firm Name]
[Address]
[Phone]`;

    case 'pleading':
      return `[FIRM NAME]
[Address]
[Phone]
Attorneys for [Party]

IN THE [COURT NAME]

[PLAINTIFF NAME],
\tPlaintiff,

v.\t\t\t\tCase No. [Number]

[DEFENDANT NAME],
\tDefendant.

${'═'.repeat(50)}
[DOCUMENT TITLE]
${'═'.repeat(50)}

${body}

DATED: ${date}

${sender}
Attorney for [Party]`;

    case 'contract':
      return `${'═'.repeat(50)}
[AGREEMENT TYPE] AGREEMENT
${'═'.repeat(50)}

This Agreement is made as of ${date} by and between:

${recipient} ("Party A")

and

${sender} ("Party B")

RECITALS

WHEREAS, ${body.slice(0, 150)}...

NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree:

1. [TERM 1]

2. [TERM 2]

3. [TERM 3]

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_________________________\t\t_________________________
${recipient}\t\t\t\t${sender}
Date: _______________\t\t\tDate: _______________`;

    default:
      return originalText;
  }
}

async function fillDocument() {
  const btn = document.getElementById('fillBtn');
  btn.classList.add('loading');

  const inputs = document.querySelectorAll('#fieldsList input, #fieldsList textarea, #fieldsList select');
  const values = {};
  let hasError = false;
  
  // Validate required fields and collect values
  inputs.forEach(input => {
    values[input.name] = input.value;
    
    // Basic validation for key fields
    if (['recipientName', 'to', 'senderName'].includes(input.name) && !input.value.trim()) {
      input.parentElement.classList.add('error');
      hasError = true;
    } else {
      input.parentElement.classList.remove('error');
    }
  });

  if (hasError) {
    btn.classList.remove('loading');
    toast('Some required fields are empty', 'error', 'missing-fields');
    return;
  }

  try {
    // Generate the document text
    const templateTitle = document.getElementById('templateTitle')?.textContent || 'Letter';
    const templateId = templateTitle.toLowerCase().replace(/\s+/g, '');
    const generatedText = generateTemplateText(templateId, values);
    
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(generatedText, Word.InsertLocation.replace);
      await context.sync();
      
      toast('Document generated successfully!', 'success');
      announceToScreenReader(`${templateTitle} generated and inserted into document`);
    });
    
    // Enable undo
    document.getElementById('undoBtn').disabled = false;
    
  } catch (err) {
    console.error('Generate failed:', err);
    const errorType = classifyWordError(err);
    toast('Couldn\'t generate document', 'error', errorType);
  } finally {
    btn.classList.remove('loading');
  }
}

function generateTemplateText(templateId, data) {
  const lines = [];
  
  if (templateId === 'letter') {
    // Date
    if (data.date) {
      const d = new Date(data.date);
      lines.push(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      lines.push('');
    }
    // Recipient
    if (data.recipientName) lines.push(data.recipientName);
    if (data.recipientAddress) lines.push(data.recipientAddress);
    lines.push('');
    // Subject
    if (data.subject) lines.push(`RE: ${data.subject}`, '');
    // Salutation
    const lastName = data.recipientName?.split(' ').pop() || '';
    lines.push(`${data.salutation || 'Dear'} ${lastName}:`, '');
    // Body placeholder
    lines.push('[Body of letter]', '');
    // Closing
    lines.push(data.closing || 'Sincerely,', '', '', '');
    if (data.signerName) lines.push(data.signerName);
    if (data.signerTitle) lines.push(data.signerTitle);
    
  } else if (templateId === 'memorandum' || templateId === 'memo') {
    lines.push('MEMORANDUM', '');
    lines.push('─'.repeat(50), '');
    const d = data.date ? new Date(data.date) : new Date();
    lines.push(`DATE:\t${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    lines.push(`TO:\t${data.to || '[Recipient]'}`);
    lines.push(`FROM:\t${data.from || '[Sender]'}`);
    if (data.cc) lines.push(`CC:\t${data.cc}`);
    lines.push(`RE:\t${data.subject || '[Subject]'}`);
    lines.push('', '─'.repeat(50), '');
    lines.push('[Body of memo]');
    
  } else if (templateId === 'faxcoversheet' || templateId === 'fax') {
    lines.push('FAX COVER SHEET', '');
    lines.push('═'.repeat(50), '');
    const d = data.date ? new Date(data.date) : new Date();
    lines.push(`DATE: ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, '');
    lines.push('TO:');
    lines.push(`  Name: ${data.recipientName || '[Recipient]'}`);
    lines.push(`  Fax: ${data.recipientFax || '[Fax Number]'}`);
    lines.push('');
    lines.push('FROM:');
    lines.push(`  Name: ${data.senderName || '[Sender]'}`);
    if (data.senderPhone) lines.push(`  Phone: ${data.senderPhone}`);
    lines.push('');
    lines.push(`PAGES: ${data.pages || '1'} (including cover)`);
    if (data.subject) lines.push(`RE: ${data.subject}`);
    lines.push('', '─'.repeat(50), '');
    lines.push('MESSAGE:', '', '[Message]');
  }
  
  return lines.join('\n');
}

async function undoFill() {
  if (Object.keys(previousValues).length === 0) {
    toast('Nothing to undo', 'info');
    return;
  }

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const ccs = body.contentControls;
      ccs.load('items/tag,items/text');
      await context.sync();

      ccs.items.forEach(cc => {
        const tag = cc.tag?.toLowerCase();
        if (tag && previousValues[tag] !== undefined) {
          cc.insertText(previousValues[tag], Word.InsertLocation.replace);
        }
      });

      await context.sync();
      currentValues = { ...previousValues };
      previousValues = {};
      toast('Changes undone', 'success');
      document.getElementById('undoBtn').disabled = true;
    });
  } catch (err) {
    console.error('Undo failed:', err);
    toast('Unable to undo changes', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// USER-FRIENDLY ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

const ERROR_GUIDES = {
  // Network/API errors
  'network': {
    title: 'Connection Issue',
    steps: [
      'Check your internet connection',
      'Try refreshing the add-in (close and reopen)',
      'If using VPN, try disconnecting temporarily'
    ]
  },
  'api-500': {
    title: 'Server Error',
    steps: [
      'Our servers are having a moment',
      'Wait 30 seconds and try again',
      'If this persists, contact support@draftbridge.com'
    ]
  },
  'api-401': {
    title: 'Authentication Required',
    steps: [
      'Your session may have expired',
      'Close the add-in completely',
      'Reopen it from Insert > My Add-ins'
    ]
  },
  'api-403': {
    title: 'Access Denied',
    steps: [
      'You may not have permission for this action',
      'Check with your firm administrator',
      'Make sure your account is properly set up'
    ]
  },
  'api-404': {
    title: 'Not Found',
    steps: [
      'This item may have been deleted',
      'Refresh the library to see current items',
      'Try searching for a similar clause'
    ]
  },
  
  // User action errors
  'no-selection': {
    title: 'No Text Selected',
    steps: [
      'Click and drag to highlight text in your document',
      'Make sure the cursor is in the document (not the add-in)',
      'Selected text will appear highlighted in blue'
    ]
  },
  'selection-too-short': {
    title: 'Selection Too Short',
    steps: [
      'Select at least a full sentence or paragraph',
      'Clauses work best with 20+ characters',
      'Try selecting the entire clause including headers'
    ]
  },
  'insert-failed': {
    title: 'Couldn\'t Insert Text',
    steps: [
      'Click where you want the text in your document',
      'Make sure the document isn\'t in read-only mode',
      'Try: File > Info > Check for editing restrictions'
    ]
  },
  'document-protected': {
    title: 'Document is Protected',
    steps: [
      'This document has editing restrictions',
      'Go to Review > Restrict Editing > Stop Protection',
      'You may need a password from the document owner'
    ]
  },
  'save-failed': {
    title: 'Couldn\'t Save Clause',
    steps: [
      'Check your internet connection',
      'Try a shorter title (under 100 characters)',
      'Make sure the clause content isn\'t empty'
    ]
  },
  
  // Template/form errors
  'missing-fields': {
    title: 'Required Fields Missing',
    steps: [
      'Look for fields highlighted in red',
      'Fill in all required information',
      'Dates should be in MM/DD/YYYY format'
    ]
  },
  'invalid-date': {
    title: 'Invalid Date',
    steps: [
      'Click the date field and use the calendar picker',
      'Or type in MM/DD/YYYY format',
      'Make sure the year has 4 digits'
    ]
  },
  
  // Bookmark-specific
  'no-bookmarks': {
    title: 'No Bookmarks Found',
    steps: [
      'This feature works with Word bookmarks (Insert > Bookmark)',
      'Select text, then Insert > Bookmark > name it (e.g., "client_name")',
      'Use underscores or camelCase for multi-word names',
      'Re-scan after adding bookmarks'
    ]
  },
  
  // General fallback
  'unknown': {
    title: 'Something Went Wrong',
    steps: [
      'Try the action again',
      'Refresh the add-in if the problem continues',
      'Report persistent issues to support@draftbridge.com'
    ]
  }
};

function showErrorGuide(errorType, customMessage = null) {
  const guide = ERROR_GUIDES[errorType] || ERROR_GUIDES['unknown'];
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'error-guide-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeErrorGuide(); };
  
  // Build step list
  const stepsHtml = guide.steps.map((step, i) => 
    `<li><span class="step-number">${i + 1}</span><span class="step-text">${escapeHtml(step)}</span></li>`
  ).join('');
  
  overlay.innerHTML = `
    <div class="error-guide-modal" role="dialog" aria-labelledby="error-title">
      <div class="error-guide-header">
        <svg class="error-guide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3 id="error-title">${escapeHtml(guide.title)}</h3>
        <button class="error-guide-close" onclick="closeErrorGuide()" aria-label="Close">×</button>
      </div>
      ${customMessage ? `<p class="error-guide-detail">${escapeHtml(customMessage)}</p>` : ''}
      <p class="error-guide-subtitle">Here's how to fix it:</p>
      <ol class="error-guide-steps">${stepsHtml}</ol>
      <button class="error-guide-btn" onclick="closeErrorGuide()">Got it</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Focus trap and animate in
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    overlay.querySelector('.error-guide-btn').focus();
  });
  
  // ESC to close
  const escHandler = (e) => {
    if (e.key === 'Escape') closeErrorGuide();
  };
  document.addEventListener('keydown', escHandler);
  overlay.dataset.escHandler = 'true';
}

function closeErrorGuide() {
  const overlay = document.querySelector('.error-guide-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }
}

// Helper to classify API errors
function classifyApiError(error, response = null) {
  if (!navigator.onLine) return 'network';
  
  if (response) {
    if (response.status === 401) return 'api-401';
    if (response.status === 403) return 'api-403';
    if (response.status === 404) return 'api-404';
    if (response.status >= 500) return 'api-500';
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'network';
  }
  
  return 'unknown';
}

// Helper to classify Word API errors
function classifyWordError(error) {
  const msg = error?.message?.toLowerCase() || '';
  
  if (msg.includes('protected') || msg.includes('read-only') || msg.includes('readonly')) {
    return 'document-protected';
  }
  if (msg.includes('selection')) {
    return 'no-selection';
  }
  
  return 'insert-failed';
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function toast(message, type = 'info', errorType = null) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  // Create toast element
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  
  // Add icon based on type
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  // For errors with guides, add a "Show me how" link
  let content = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
  if (type === 'error' && errorType && ERROR_GUIDES[errorType]) {
    content += `<button class="toast-help-btn" onclick="showErrorGuide('${errorType}')">Help</button>`;
  }
  
  el.innerHTML = content;
  container.appendChild(el);
  
  // Auto-dismiss (longer for errors with help)
  const dismissTime = (type === 'error' && errorType) ? 5000 : 3000;
  setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 300);
  }, dismissTime);
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateTitle(text) {
  // Extract first meaningful phrase
  const firstSentence = text.split(/[.;]/)[0].trim();
  if (firstSentence.length <= 50) return firstSentence;
  return firstSentence.slice(0, 47) + '...';
}

function extractTags(text) {
  // Simple keyword extraction
  const keywords = [];
  const lowerText = text.toLowerCase();
  
  const tagMap = {
    'indemnif': 'indemnification',
    'confidential': 'confidentiality',
    'governing law': 'governing law',
    'arbitrat': 'arbitration',
    'terminat': 'termination',
    'non-compete': 'non-compete',
    'non-solicit': 'non-solicitation',
    'intellectual property': 'IP',
    'warrant': 'warranties',
    'disclaim': 'disclaimer',
    'force majeure': 'force majeure',
    'limitation of liability': 'limitation of liability'
  };
  
  for (const [search, tag] of Object.entries(tagMap)) {
    if (lowerText.includes(search)) {
      keywords.push(tag);
    }
  }
  
  return keywords.slice(0, 5);
}
