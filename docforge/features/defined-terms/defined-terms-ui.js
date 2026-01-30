/**
 * Defined Terms Guardian - Panel UI
 * 
 * Task pane UI for displaying and interacting with defined terms.
 * Shows terms list, issues, and navigation controls.
 * 
 * @version 1.0.0
 */

import { definedTermsScanner } from './defined-terms.js';

// ============================================================================
// UI State
// ============================================================================

const UIState = {
    currentView: 'terms', // 'terms', 'issues', 'undefined'
    selectedTermId: null,
    isScanning: false,
    filterText: '',
    sortBy: 'alpha', // 'alpha', 'usages', 'definition'
    showUsages: new Set() // Term IDs with expanded usage list
};

// ============================================================================
// UI Components
// ============================================================================

/**
 * Create the main defined terms panel HTML
 * @returns {string}
 */
function createPanelHtml() {
    return `
        <div class="defined-terms-panel" id="definedTermsPanel">
            <!-- Header with tabs -->
            <div class="dt-header">
                <div class="dt-tabs">
                    <button class="dt-tab active" data-view="terms">
                        <span class="dt-tab-icon">📚</span>
                        Terms
                        <span class="dt-badge" id="termsCount">0</span>
                    </button>
                    <button class="dt-tab" data-view="issues">
                        <span class="dt-tab-icon">⚠️</span>
                        Issues
                        <span class="dt-badge dt-badge-warning" id="issuesCount">0</span>
                    </button>
                    <button class="dt-tab" data-view="undefined">
                        <span class="dt-tab-icon">❓</span>
                        Undefined
                        <span class="dt-badge dt-badge-error" id="undefinedCount">0</span>
                    </button>
                </div>
                <div class="dt-actions">
                    <button class="dt-btn dt-btn-icon" id="dtScanBtn" title="Scan document">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                    </button>
                    <button class="dt-btn dt-btn-icon" id="dtHighlightBtn" title="Highlight issues">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                        </svg>
                    </button>
                    <button class="dt-btn dt-btn-icon" id="dtClearBtn" title="Clear highlights">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Search and filter -->
            <div class="dt-filter">
                <div class="dt-search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" id="dtSearchInput" placeholder="Filter terms..." class="dt-search-input">
                </div>
                <select id="dtSortSelect" class="dt-sort-select">
                    <option value="alpha">A-Z</option>
                    <option value="usages">Most Used</option>
                    <option value="definition">By Definition</option>
                </select>
            </div>

            <!-- Stats bar -->
            <div class="dt-stats" id="dtStats">
                <div class="dt-stat">
                    <span class="dt-stat-value" id="statDefined">0</span>
                    <span class="dt-stat-label">Defined</span>
                </div>
                <div class="dt-stat">
                    <span class="dt-stat-value" id="statUsages">0</span>
                    <span class="dt-stat-label">Usages</span>
                </div>
                <div class="dt-stat dt-stat-warning">
                    <span class="dt-stat-value" id="statIssues">0</span>
                    <span class="dt-stat-label">Issues</span>
                </div>
            </div>

            <!-- Content area -->
            <div class="dt-content" id="dtContent">
                <!-- Terms list view -->
                <div class="dt-view dt-view-terms" id="dtViewTerms">
                    <div class="dt-list" id="dtTermsList"></div>
                </div>

                <!-- Issues view -->
                <div class="dt-view dt-view-issues hidden" id="dtViewIssues">
                    <div class="dt-list" id="dtIssuesList"></div>
                </div>

                <!-- Undefined terms view -->
                <div class="dt-view dt-view-undefined hidden" id="dtViewUndefined">
                    <div class="dt-list" id="dtUndefinedList"></div>
                </div>

                <!-- Empty state -->
                <div class="dt-empty hidden" id="dtEmpty">
                    <div class="dt-empty-icon">📄</div>
                    <div class="dt-empty-text">No terms found</div>
                    <div class="dt-empty-hint">Click Scan to analyze the document</div>
                </div>

                <!-- Scanning state -->
                <div class="dt-scanning hidden" id="dtScanning">
                    <div class="dt-spinner"></div>
                    <div class="dt-scanning-text">Scanning document...</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render a single term item
 * @param {Object} term 
 * @returns {string}
 */
function renderTermItem(term) {
    const isExpanded = UIState.showUsages.has(term.id);
    const usageCount = term.usages.length;
    const hasIssues = term.usages.some(u => u.capitalizationMismatch || u.beforeDefinition);
    
    let usagesHtml = '';
    if (isExpanded && usageCount > 0) {
        usagesHtml = `
            <div class="dt-term-usages">
                ${term.usages.slice(0, 10).map((usage, idx) => `
                    <div class="dt-usage-item ${usage.capitalizationMismatch ? 'dt-usage-warning' : ''} ${usage.beforeDefinition ? 'dt-usage-error' : ''}" 
                         data-term-id="${term.id}" 
                         data-usage-idx="${idx}">
                        <span class="dt-usage-text">"${escapeHtml(usage.text)}"</span>
                        ${usage.capitalizationMismatch ? '<span class="dt-usage-tag">caps</span>' : ''}
                        ${usage.beforeDefinition ? '<span class="dt-usage-tag dt-tag-error">before def</span>' : ''}
                    </div>
                `).join('')}
                ${usageCount > 10 ? `<div class="dt-usage-more">+${usageCount - 10} more</div>` : ''}
            </div>
        `;
    }
    
    return `
        <div class="dt-term-item ${hasIssues ? 'dt-term-has-issues' : ''}" data-term-id="${term.id}">
            <div class="dt-term-header">
                <div class="dt-term-name" title="Click to go to definition">
                    <span class="dt-term-text">${escapeHtml(term.term)}</span>
                    <span class="dt-term-type">${term.definitionType}</span>
                </div>
                <div class="dt-term-meta">
                    <span class="dt-term-count ${usageCount === 0 ? 'dt-count-zero' : ''}" 
                          title="${usageCount} usage${usageCount !== 1 ? 's' : ''}">
                        ${usageCount}
                    </span>
                    <button class="dt-term-expand ${isExpanded ? 'expanded' : ''}" 
                            data-term-id="${term.id}" 
                            title="Show usages"
                            ${usageCount === 0 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="dt-term-context">${escapeHtml(truncate(term.definitionContext, 80))}</div>
            ${usagesHtml}
        </div>
    `;
}

/**
 * Render an issue item
 * @param {Object} issue 
 * @param {string} type 
 * @returns {string}
 */
function renderIssueItem(issue, type) {
    let icon, label, description;
    
    switch (type) {
        case 'unused':
            icon = '🔇';
            label = 'Unused Term';
            description = `"${issue.term}" is defined but never used`;
            break;
        case 'capitalization':
            icon = 'Aa';
            label = 'Capitalization';
            description = `"${issue.usage.text}" should be "${issue.term.term}"`;
            break;
        case 'before-definition':
            icon = '⏪';
            label = 'Before Definition';
            description = `"${issue.term.term}" used before it's defined`;
            break;
    }
    
    return `
        <div class="dt-issue-item dt-issue-${type}" data-term-id="${issue.term?.id || issue.id}">
            <div class="dt-issue-icon">${icon}</div>
            <div class="dt-issue-content">
                <div class="dt-issue-label">${label}</div>
                <div class="dt-issue-description">${escapeHtml(description)}</div>
            </div>
            <button class="dt-issue-goto" title="Go to location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14"/>
                    <path d="M12 5l7 7-7 7"/>
                </svg>
            </button>
        </div>
    `;
}

/**
 * Render an undefined term item
 * @param {Object} undefinedTerm 
 * @returns {string}
 */
function renderUndefinedItem(undefinedTerm) {
    return `
        <div class="dt-undefined-item" data-term="${escapeHtml(undefinedTerm.term)}">
            <div class="dt-undefined-header">
                <span class="dt-undefined-text">${escapeHtml(undefinedTerm.term)}</span>
                <span class="dt-undefined-count">${undefinedTerm.occurrences.length}×</span>
            </div>
            <div class="dt-undefined-actions">
                <button class="dt-btn dt-btn-sm" data-action="goto-first" title="Go to first occurrence">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14"/>
                        <path d="M12 5l7 7-7 7"/>
                    </svg>
                    Go to
                </button>
                <button class="dt-btn dt-btn-sm" data-action="highlight-all" title="Highlight all occurrences">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    </svg>
                    Highlight
                </button>
            </div>
        </div>
    `;
}

// ============================================================================
// UI Controller
// ============================================================================

/**
 * Initialize the defined terms UI
 * @param {HTMLElement} container - Container to render into
 */
async function initializeUI(container) {
    // Insert HTML
    container.innerHTML = createPanelHtml();
    
    // Bind events
    bindEvents();
    
    // Initialize scanner
    await definedTermsScanner.initialize();
    
    // Initial scan
    await performScan();
}

/**
 * Bind all event handlers
 */
function bindEvents() {
    // Tab switching
    document.querySelectorAll('.dt-tab').forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });
    
    // Scan button
    document.getElementById('dtScanBtn')?.addEventListener('click', performScan);
    
    // Highlight button
    document.getElementById('dtHighlightBtn')?.addEventListener('click', async () => {
        await definedTermsScanner.highlightIssues();
    });
    
    // Clear highlights button
    document.getElementById('dtClearBtn')?.addEventListener('click', async () => {
        await definedTermsScanner.clearHighlights();
    });
    
    // Search input
    document.getElementById('dtSearchInput')?.addEventListener('input', (e) => {
        UIState.filterText = e.target.value.toLowerCase();
        renderCurrentView();
    });
    
    // Sort select
    document.getElementById('dtSortSelect')?.addEventListener('change', (e) => {
        UIState.sortBy = e.target.value;
        renderCurrentView();
    });
    
    // Delegate clicks on term items
    document.getElementById('dtContent')?.addEventListener('click', handleContentClick);
}

/**
 * Handle clicks within the content area
 * @param {Event} e 
 */
async function handleContentClick(e) {
    const target = e.target;
    
    // Term name click - go to definition
    const termName = target.closest('.dt-term-name');
    if (termName) {
        const termItem = termName.closest('.dt-term-item');
        if (termItem) {
            await definedTermsScanner.navigateToDefinition(termItem.dataset.termId);
        }
        return;
    }
    
    // Expand button click
    const expandBtn = target.closest('.dt-term-expand');
    if (expandBtn && !expandBtn.disabled) {
        const termId = expandBtn.dataset.termId;
        if (UIState.showUsages.has(termId)) {
            UIState.showUsages.delete(termId);
        } else {
            UIState.showUsages.add(termId);
        }
        renderCurrentView();
        return;
    }
    
    // Usage item click
    const usageItem = target.closest('.dt-usage-item');
    if (usageItem) {
        const termId = usageItem.dataset.termId;
        const usageIdx = parseInt(usageItem.dataset.usageIdx, 10);
        await definedTermsScanner.navigateToUsage(termId, usageIdx);
        return;
    }
    
    // Issue goto click
    const issueGoto = target.closest('.dt-issue-goto');
    if (issueGoto) {
        const issueItem = issueGoto.closest('.dt-issue-item');
        if (issueItem) {
            await definedTermsScanner.navigateToDefinition(issueItem.dataset.termId);
        }
        return;
    }
    
    // Undefined term actions
    const undefinedItem = target.closest('.dt-undefined-item');
    if (undefinedItem) {
        const action = target.closest('[data-action]')?.dataset.action;
        const term = undefinedItem.dataset.term;
        
        if (action === 'goto-first') {
            await navigateToUndefinedTerm(term);
        } else if (action === 'highlight-all') {
            await highlightUndefinedTerm(term);
        }
    }
}

/**
 * Navigate to first occurrence of an undefined term
 * @param {string} term 
 */
async function navigateToUndefinedTerm(term) {
    await Word.run(async (context) => {
        const body = context.document.body;
        const searchResults = body.search(term, {
            matchCase: true,
            matchWholeWord: true
        });
        searchResults.load('items');
        await context.sync();
        
        if (searchResults.items.length > 0) {
            searchResults.items[0].select();
            await context.sync();
        }
    });
}

/**
 * Highlight all occurrences of an undefined term
 * @param {string} term 
 */
async function highlightUndefinedTerm(term) {
    await Word.run(async (context) => {
        const body = context.document.body;
        const searchResults = body.search(term, {
            matchCase: true,
            matchWholeWord: true
        });
        searchResults.load('items');
        await context.sync();
        
        for (const range of searchResults.items) {
            range.font.highlightColor = 'Yellow';
        }
        
        await context.sync();
    });
}

/**
 * Switch between views
 * @param {string} view 
 */
function switchView(view) {
    UIState.currentView = view;
    
    // Update tabs
    document.querySelectorAll('.dt-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === view);
    });
    
    // Update views
    document.querySelectorAll('.dt-view').forEach(v => {
        v.classList.add('hidden');
    });
    
    const viewId = `dtView${view.charAt(0).toUpperCase() + view.slice(1)}`;
    document.getElementById(viewId)?.classList.remove('hidden');
    
    renderCurrentView();
}

/**
 * Perform a document scan
 */
async function performScan() {
    UIState.isScanning = true;
    showScanningState();
    
    try {
        await definedTermsScanner.scan();
        updateStats();
        renderCurrentView();
    } catch (error) {
        console.warn('[DefinedTerms] Scan failed:', error);
        showError("Couldn't scan document — try refreshing or reopening it");
    } finally {
        UIState.isScanning = false;
        hideScanningState();
    }
}

/**
 * Show scanning indicator
 */
function showScanningState() {
    document.getElementById('dtScanning')?.classList.remove('hidden');
    document.getElementById('dtEmpty')?.classList.add('hidden');
    document.querySelectorAll('.dt-view').forEach(v => v.classList.add('hidden'));
}

/**
 * Hide scanning indicator
 */
function hideScanningState() {
    document.getElementById('dtScanning')?.classList.add('hidden');
}

/**
 * Show error message
 * @param {string} message 
 */
function showError(message) {
    const empty = document.getElementById('dtEmpty');
    if (empty) {
        empty.querySelector('.dt-empty-text').textContent = message;
        empty.classList.remove('hidden');
    }
}

/**
 * Update statistics display
 */
function updateStats() {
    const stats = definedTermsScanner.getStats();
    const result = definedTermsScanner.getLastScanResult();
    
    // Update badge counts
    document.getElementById('termsCount').textContent = stats.defined;
    document.getElementById('undefinedCount').textContent = stats.undefined;
    
    const issueCount = stats.unused + stats.capitalizationIssues + stats.usedBeforeDefinition;
    document.getElementById('issuesCount').textContent = issueCount;
    
    // Update stats bar
    document.getElementById('statDefined').textContent = stats.defined;
    document.getElementById('statUsages').textContent = stats.totalUsages;
    document.getElementById('statIssues').textContent = issueCount;
}

/**
 * Render the current view based on state
 */
function renderCurrentView() {
    const result = definedTermsScanner.getLastScanResult();
    
    if (!result || result.definedTerms.size === 0) {
        document.getElementById('dtEmpty')?.classList.remove('hidden');
        return;
    }
    
    document.getElementById('dtEmpty')?.classList.add('hidden');
    
    switch (UIState.currentView) {
        case 'terms':
            renderTermsView(result);
            break;
        case 'issues':
            renderIssuesView(result);
            break;
        case 'undefined':
            renderUndefinedView(result);
            break;
    }
}

/**
 * Render the terms list view
 * @param {Object} result 
 */
function renderTermsView(result) {
    let terms = definedTermsScanner.getAllTerms();
    
    // Filter
    if (UIState.filterText) {
        terms = terms.filter(t => 
            t.term.toLowerCase().includes(UIState.filterText) ||
            t.definitionContext.toLowerCase().includes(UIState.filterText)
        );
    }
    
    // Sort
    switch (UIState.sortBy) {
        case 'usages':
            terms.sort((a, b) => b.usages.length - a.usages.length);
            break;
        case 'definition':
            terms.sort((a, b) => a.definitionStart - b.definitionStart);
            break;
        // 'alpha' is default (already sorted)
    }
    
    const container = document.getElementById('dtTermsList');
    if (container) {
        if (terms.length === 0) {
            container.innerHTML = '<div class="dt-no-results">No terms match your filter</div>';
        } else {
            container.innerHTML = terms.map(renderTermItem).join('');
        }
    }
}

/**
 * Render the issues view
 * @param {Object} result 
 */
function renderIssuesView(result) {
    const issues = [];
    
    // Unused terms
    for (const term of result.unusedTerms) {
        issues.push({ type: 'unused', term, priority: 1 });
    }
    
    // Used before definition
    for (const issue of result.usedBeforeDefinition) {
        issues.push({ type: 'before-definition', ...issue, priority: 2 });
    }
    
    // Capitalization issues
    for (const issue of result.capitalizationIssues) {
        issues.push({ type: 'capitalization', ...issue, priority: 3 });
    }
    
    // Sort by priority
    issues.sort((a, b) => a.priority - b.priority);
    
    const container = document.getElementById('dtIssuesList');
    if (container) {
        if (issues.length === 0) {
            container.innerHTML = `
                <div class="dt-no-issues">
                    <div class="dt-no-issues-icon">✅</div>
                    <div class="dt-no-issues-text">No issues found</div>
                </div>
            `;
        } else {
            container.innerHTML = issues.map(i => renderIssueItem(i, i.type)).join('');
        }
    }
}

/**
 * Render the undefined terms view
 * @param {Object} result 
 */
function renderUndefinedView(result) {
    let terms = result.undefinedTerms;
    
    // Filter
    if (UIState.filterText) {
        terms = terms.filter(t => 
            t.term.toLowerCase().includes(UIState.filterText)
        );
    }
    
    const container = document.getElementById('dtUndefinedList');
    if (container) {
        if (terms.length === 0) {
            container.innerHTML = `
                <div class="dt-no-results">
                    ${UIState.filterText ? 'No terms match your filter' : 'No undefined terms detected'}
                </div>
            `;
        } else {
            container.innerHTML = terms.map(renderUndefinedItem).join('');
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape HTML special characters
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Truncate string with ellipsis
 * @param {string} str 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Public API
// ============================================================================

const DefinedTermsUI = {
    initialize: initializeUI,
    refresh: performScan,
    switchView,
    getState: () => ({ ...UIState }),
    createPanelHtml
};

// ES modules
export default DefinedTermsUI;
export { DefinedTermsUI, initializeUI, performScan };

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DefinedTermsUI, initializeUI, performScan };
}

// Global
if (typeof window !== 'undefined') {
    window.DefinedTermsUI = DefinedTermsUI;
}
