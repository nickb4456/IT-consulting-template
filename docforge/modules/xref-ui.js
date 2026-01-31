/**
 * DocForge - Cross-Reference Manager UI v1.0
 * 
 * Taskpane UI controller for the cross-reference manager.
 * Provides scanning, validation, fixing, and insertion of cross-references.
 * 
 * This file should be loaded after xref.js in the HTML.
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// UI STATE
// ============================================================================

const XRefUI = {
    // Current scan results
    currentReferences: [],
    
    // Current validation results
    currentValidation: null,
    
    // Available sections for insertion
    availableSections: [],
    
    // Current stats
    currentStats: null,
    
    // Processing state
    isProcessing: false,
    
    // Selected insert format
    insertFormat: 'standard',
    
    // Selected insert target
    insertTarget: null,
    
    /**
     * Set processing state and update UI
     */
    setProcessing(value) {
        this.isProcessing = value;
        const overlay = document.getElementById('xref-loading');
        if (overlay) {
            overlay.style.display = value ? 'flex' : 'none';
        }
    }
};

// ============================================================================
// UI CONTROLLER
// ============================================================================

const XREF_UI = {
    // State reference
    state: XRefUI,
    
    // Current options
    currentOptions: {
        showOrphaned: false,
        autoNavigate: true
    },
    
    /**
     * Initialize the XRef UI section
     */
    init() {
        this.createXRefSection();
        this.attachEventListeners();
    },
    
    /**
     * Create the XRef section HTML
     */
    createXRefSection() {
        const section = document.createElement('div');
        section.className = 'section';
        section.id = 'xrefSection';
        section.innerHTML = `
            <div class="section-title">Cross-Reference Manager</div>
            
            <div id="xref-loading" class="loading-overlay" style="display:none">
                <span>Processing...</span>
            </div>
            
            <div class="xref-stats" id="xref-stats" style="display:none">
                <div class="stat success" id="valid-stat">
                    <span class="stat-value" id="valid-count">0</span>
                    <span class="stat-label">Valid</span>
                </div>
                <div class="stat error" id="broken-stat">
                    <span class="stat-value" id="broken-count">0</span>
                    <span class="stat-label">Broken</span>
                </div>
                <div class="stat info" id="sections-stat">
                    <span class="stat-value" id="sections-count">0</span>
                    <span class="stat-label">Sections</span>
                </div>
            </div>
            
            <div class="xref-actions">
                <button id="xrefScanBtn" class="action-btn">
                    Scan References
                </button>
                <button id="xrefFixAllBtn" class="action-btn primary" disabled>
                    Fix All
                </button>
            </div>
            
            <div id="xrefResultsContainer" class="results-container" style="display:none">
                <div class="results-header">
                    <span class="results-title">Broken References</span>
                    <span id="xrefBrokenCount" class="results-count"></span>
                </div>
                <div id="xrefResultsList" class="results-list"></div>
            </div>
            
            <div class="xref-insert-section">
                <div class="section-subtitle">Insert Reference</div>
                
                <div class="insert-row">
                    <label for="xrefTargetSelect">Target:</label>
                    <select id="xrefTargetSelect" class="target-select">
                        <option value="">-- Scan first --</option>
                    </select>
                </div>
                
                <div class="insert-row">
                    <label for="xrefFormatSelect">Format:</label>
                    <select id="xrefFormatSelect">
                        <option value="standard">Section 1.1</option>
                        <option value="lowercase">section 1.1</option>
                        <option value="withTitle">Section 1.1 (Title)</option>
                        <option value="parenthetical">(Section 1.1)</option>
                    </select>
                </div>
                
                <button id="xrefInsertBtn" class="action-btn insert-btn" disabled>
                    Insert at Cursor
                </button>
            </div>
            
            <div class="xref-options">
                <div class="option-row checkbox-row">
                    <label>
                        <input type="checkbox" id="xrefAutoNavigate" checked>
                        Navigate to reference on click
                    </label>
                </div>
                <div class="option-row checkbox-row">
                    <label>
                        <input type="checkbox" id="xrefShowOrphaned">
                        Show unreferenced sections
                    </label>
                </div>
            </div>
            
            <div class="xref-secondary-actions">
                <button id="xrefBookmarksBtn" class="secondary-btn" title="Create section bookmarks">
                    Bookmarks
                </button>
                <button id="xrefStatsBtn" class="secondary-btn" title="View detailed statistics">
                    Stats
                </button>
                <button id="xrefRefreshBtn" class="secondary-btn" title="Refresh sections list">
                    Refresh
                </button>
            </div>
            
            <div id="xrefStatus" class="xref-status"></div>
        `;
        
        // Find insertion point (after TOC section if exists)
        const insertionPoint = document.querySelector('#tocSection')?.nextSibling 
            || document.querySelector('#numberingSection')?.nextSibling
            || document.querySelector('.section:last-of-type');
        
        if (insertionPoint) {
            insertionPoint.parentNode.insertBefore(section, insertionPoint.nextSibling);
        } else {
            document.body.appendChild(section);
        }
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Scan button
        document.getElementById('xrefScanBtn')?.addEventListener('click', () => {
            this.handleScan();
        });
        
        // Fix All button
        document.getElementById('xrefFixAllBtn')?.addEventListener('click', () => {
            this.handleFixAll();
        });
        
        // Insert button
        document.getElementById('xrefInsertBtn')?.addEventListener('click', () => {
            this.handleInsert();
        });
        
        // Bookmarks button
        document.getElementById('xrefBookmarksBtn')?.addEventListener('click', () => {
            this.handleCreateBookmarks();
        });
        
        // Stats button
        document.getElementById('xrefStatsBtn')?.addEventListener('click', () => {
            this.handleShowStats();
        });
        
        // Refresh button
        document.getElementById('xrefRefreshBtn')?.addEventListener('click', () => {
            this.handleRefresh();
        });
        
        // Target select change
        document.getElementById('xrefTargetSelect')?.addEventListener('change', (e) => {
            XRefUI.insertTarget = e.target.value;
            this.updateInsertButton();
        });
        
        // Format select change
        document.getElementById('xrefFormatSelect')?.addEventListener('change', (e) => {
            XRefUI.insertFormat = e.target.value;
        });
        
        // Option changes
        document.getElementById('xrefAutoNavigate')?.addEventListener('change', (e) => {
            this.currentOptions.autoNavigate = e.target.checked;
        });
        
        document.getElementById('xrefShowOrphaned')?.addEventListener('change', (e) => {
            this.currentOptions.showOrphaned = e.target.checked;
            this.renderOrphanedSections();
        });
    },
    
    /**
     * Handle scan action
     */
    async handleScan() {
        this.showStatus('info', 'Scanning document for cross-references...');
        XRefUI.setProcessing(true);
        this.setButtonLoading('xrefScanBtn', true);
        
        try {
            await Word.run(async (context) => {
                // Get validation results
                const validation = await window.DocForge.XRef.validateCrossReferences(context);
                XRefUI.currentValidation = validation;
                
                // Get stats
                const stats = await window.DocForge.XRef.getReferenceStats(context);
                XRefUI.currentStats = stats;
                
                // Get sections for dropdown
                const sections = await window.DocForge.XRef.getDocumentSections(context);
                XRefUI.availableSections = sections;
                
                // Update UI
                this.renderStats(stats);
                this.renderBrokenReferences(validation.invalid);
                this.populateTargetDropdown(sections);
                
                // Enable/disable fix button
                const fixBtn = document.getElementById('xrefFixAllBtn');
                if (fixBtn) {
                    fixBtn.disabled = validation.invalid.length === 0;
                }
                
                this.showStatus('success', 
                    `Found ${stats.totalReferences} references (${stats.validReferences} valid, ${stats.invalidReferences} broken)`
                );
            });
        } catch (error) {
            console.error('Scan error:', error);
            this.showStatus('error', `Scan failed: ${error.message}`);
        } finally {
            XRefUI.setProcessing(false);
            this.setButtonLoading('xrefScanBtn', false);
        }
    },
    
    /**
     * Handle fix all action
     */
    async handleFixAll() {
        if (!XRefUI.currentValidation || XRefUI.currentValidation.invalid.length === 0) {
            this.showStatus('warning', 'No broken references to fix. Run scan first.');
            return;
        }
        
        // Confirm action
        const brokenCount = XRefUI.currentValidation.invalid.length;
        const withSuggestions = XRefUI.currentValidation.suggestions.length;
        
        if (!confirm(`Fix ${withSuggestions} reference(s) with auto-detected corrections?\n\n${brokenCount - withSuggestions} reference(s) have no clear fix and will be skipped.`)) {
            return;
        }
        
        this.showStatus('info', 'Fixing cross-references...');
        XRefUI.setProcessing(true);
        this.setButtonLoading('xrefFixAllBtn', true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.XRef.fixAllCrossReferences(context);
                
                // Re-scan to update UI
                const validation = await window.DocForge.XRef.validateCrossReferences(context);
                XRefUI.currentValidation = validation;
                
                const stats = await window.DocForge.XRef.getReferenceStats(context);
                XRefUI.currentStats = stats;
                
                this.renderStats(stats);
                this.renderBrokenReferences(validation.invalid);
                
                // Update fix button
                const fixBtn = document.getElementById('xrefFixAllBtn');
                if (fixBtn) {
                    fixBtn.disabled = validation.invalid.length === 0;
                }
                
                this.showStatus('success', result.message);
            });
        } catch (error) {
            console.error('Fix error:', error);
            this.showStatus('error', `Fix failed: ${error.message}`);
        } finally {
            XRefUI.setProcessing(false);
            this.setButtonLoading('xrefFixAllBtn', false);
        }
    },
    
    /**
     * Handle fix single reference
     */
    async handleFixSingle(refIndex, newTarget) {
        const validation = XRefUI.currentValidation;
        if (!validation || !validation.invalid[refIndex]) return;
        
        const oldRef = validation.invalid[refIndex];
        
        this.showStatus('info', `Fixing reference to ${oldRef.target}...`);
        XRefUI.setProcessing(true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.XRef.fixCrossReference(
                    context, 
                    oldRef.target, 
                    newTarget
                );
                
                // Re-scan to update UI
                await this.handleScan();
                
                this.showStatus('success', result.message);
            });
        } catch (error) {
            console.error('Fix single error:', error);
            this.showStatus('error', `Fix failed: ${error.message}`);
        } finally {
            XRefUI.setProcessing(false);
        }
    },
    
    /**
     * Handle insert reference
     */
    async handleInsert() {
        const target = XRefUI.insertTarget;
        const format = XRefUI.insertFormat;
        
        if (!target) {
            this.showStatus('warning', 'Please select a target section.');
            return;
        }
        
        this.showStatus('info', 'Inserting reference...');
        XRefUI.setProcessing(true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.XRef.insertSmartReference(
                    context, 
                    target, 
                    format
                );
                
                if (result.success) {
                    this.showStatus('success', `Inserted: ${result.text}`);
                } else {
                    this.showStatus('warning', 'Could not insert reference.');
                }
            });
        } catch (error) {
            console.error('Insert error:', error);
            this.showStatus('error', `Insert failed: ${error.message}`);
        } finally {
            XRefUI.setProcessing(false);
        }
    },
    
    /**
     * Handle create bookmarks
     */
    async handleCreateBookmarks() {
        this.showStatus('info', 'Creating section bookmarks...');
        XRefUI.setProcessing(true);
        
        try {
            await Word.run(async (context) => {
                const bookmarks = await window.DocForge.XRef.createSectionBookmarks(context);
                this.showStatus('success', `Created ${bookmarks.length} bookmark(s) for sections.`);
            });
        } catch (error) {
            console.error('Bookmark error:', error);
            this.showStatus('error', `Bookmark creation failed: ${error.message}`);
        } finally {
            XRefUI.setProcessing(false);
        }
    },
    
    /**
     * Handle show stats
     */
    async handleShowStats() {
        if (!XRefUI.currentStats) {
            this.showStatus('warning', 'Run scan first to see statistics.');
            return;
        }
        
        const stats = XRefUI.currentStats;
        const byType = Object.entries(stats.byType || {})
            .map(([type, count]) => `${type}: ${count}`)
            .join('\n  ');
        
        const message = `
Cross-Reference Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Total References: ${stats.totalReferences}
  Valid: ${stats.validReferences}
  Invalid: ${stats.invalidReferences}
  
Total Sections: ${stats.totalSections}
  Unreferenced: ${stats.orphanedSections}

By Type:
  ${byType || 'None'}
        `.trim();
        
        alert(message);
    },
    
    /**
     * Handle refresh sections
     */
    async handleRefresh() {
        this.showStatus('info', 'Refreshing sections list...');
        
        try {
            await Word.run(async (context) => {
                const sections = await window.DocForge.XRef.getDocumentSections(context);
                XRefUI.availableSections = sections;
                this.populateTargetDropdown(sections);
                this.showStatus('success', `Found ${sections.length} sections.`);
            });
        } catch (error) {
            console.error('Refresh error:', error);
            this.showStatus('error', `Refresh failed: ${error.message}`);
        }
    },
    
    /**
     * Handle navigate to section
     */
    async handleNavigate(sectionNumber) {
        if (!this.currentOptions.autoNavigate) return;
        
        try {
            await Word.run(async (context) => {
                await window.DocForge.XRef.navigateToSection(context, sectionNumber);
            });
        } catch (error) {
            console.error('Navigate error:', error);
        }
    },
    
    /**
     * Render stats display
     */
    renderStats(stats) {
        const statsContainer = document.getElementById('xref-stats');
        if (!statsContainer) return;
        
        document.getElementById('valid-count').textContent = stats.validReferences || 0;
        document.getElementById('broken-count').textContent = stats.invalidReferences || 0;
        document.getElementById('sections-count').textContent = stats.totalSections || 0;
        
        statsContainer.style.display = 'flex';
        
        // Update stat styling based on values
        const brokenStat = document.getElementById('broken-stat');
        if (brokenStat) {
            brokenStat.className = stats.invalidReferences > 0 ? 'stat error' : 'stat success';
        }
    },
    
    /**
     * Render broken references list
     */
    renderBrokenReferences(brokenRefs) {
        const container = document.getElementById('xrefResultsContainer');
        const list = document.getElementById('xrefResultsList');
        const count = document.getElementById('xrefBrokenCount');
        
        if (!container || !list) return;
        
        if (brokenRefs.length === 0) {
            container.style.display = 'block';
            list.innerHTML = `
                <div class="result-item success">
                    All cross-references are valid.
                </div>
            `;
            if (count) count.textContent = '';
            return;
        }
        
        container.style.display = 'block';
        if (count) count.textContent = `${brokenRefs.length} issue${brokenRefs.length !== 1 ? 's' : ''}`;
        
        list.innerHTML = brokenRefs.map((ref, idx) => {
            const suggestionHTML = ref.suggestions && ref.suggestions.length > 0
                ? `<div class="suggestion-row">
                    <span class="suggestion-label">Did you mean:</span>
                    ${ref.suggestions.slice(0, 3).map(s => 
                        `<button class="suggestion-btn" data-idx="${idx}" data-target="${this.escapeHtml(s.number)}" title="${this.escapeHtml(s.text)}">
                            ${this.escapeHtml(s.number)} (${s.similarity}%)
                        </button>`
                    ).join('')}
                   </div>`
                : `<div class="no-suggestion">No similar sections found</div>`;
            
            return `
                <div class="result-item broken-ref" data-idx="${idx}" data-target="${this.escapeHtml(ref.target)}">
                    <div class="ref-main">
                        <span class="ref-text">${this.escapeHtml(ref.text)}</span>
                        <span class="ref-line">(line ${ref.lineNumber})</span>
                    </div>
                    <div class="ref-target">
                        <span class="target-label">Target:</span>
                        <span class="target-value missing">${this.escapeHtml(ref.target)}</span>
                        <span class="target-status">Not found</span>
                    </div>
                    ${suggestionHTML}
                </div>
            `;
        }).join('');
        
        // Attach click handlers to suggestion buttons
        list.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                const target = btn.dataset.target;
                this.handleFixSingle(idx, target);
            });
        });
        
        // Attach click handlers to result items for navigation
        list.querySelectorAll('.broken-ref').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.target;
                // Navigate to the reference location
                this.handleNavigateToReference(parseInt(item.dataset.idx));
            });
        });
    },
    
    /**
     * Navigate to reference in document
     */
    async handleNavigateToReference(refIndex) {
        if (!this.currentOptions.autoNavigate) return;
        if (!XRefUI.currentValidation || !XRefUI.currentValidation.invalid[refIndex]) return;
        
        const ref = XRefUI.currentValidation.invalid[refIndex];
        
        try {
            await Word.run(async (context) => {
                // Search for the reference text and select it
                const results = context.document.body.search(ref.text);
                results.load('items');
                await context.sync();
                
                if (results.items.length > 0) {
                    results.items[0].select();
                    await context.sync();
                }
            });
        } catch (error) {
            console.error('Navigate to reference error:', error);
        }
    },
    
    /**
     * Render orphaned sections (if enabled)
     */
    renderOrphanedSections() {
        if (!this.currentOptions.showOrphaned || !XRefUI.currentStats) return;
        
        // This would require additional tracking - for now just show count
        const orphaned = XRefUI.currentStats.orphanedSections || 0;
        if (orphaned > 0) {
            this.showStatus('info', `${orphaned} section(s) are not referenced in the document.`);
        }
    },
    
    /**
     * Populate target dropdown with sections
     */
    populateTargetDropdown(sections) {
        const select = document.getElementById('xrefTargetSelect');
        if (!select) return;
        
        if (sections.length === 0) {
            select.innerHTML = '<option value="">-- No sections found --</option>';
            return;
        }
        
        // Group by type
        const grouped = {};
        sections.forEach(s => {
            const type = s.type || 'section';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(s);
        });
        
        let html = '<option value="">-- Select section --</option>';
        
        for (const [type, items] of Object.entries(grouped)) {
            const typeName = this.formatTypeName(type);
            html += `<optgroup label="${typeName}">`;
            
            for (const section of items) {
                const label = this.truncate(section.text, 40);
                html += `<option value="${this.escapeHtml(section.number)}" title="${this.escapeHtml(section.text)}">
                    ${this.escapeHtml(section.number)} - ${this.escapeHtml(label)}
                </option>`;
            }
            
            html += '</optgroup>';
        }
        
        select.innerHTML = html;
        this.updateInsertButton();
    },
    
    /**
     * Update insert button state
     */
    updateInsertButton() {
        const btn = document.getElementById('xrefInsertBtn');
        const select = document.getElementById('xrefTargetSelect');
        
        if (btn && select) {
            btn.disabled = !select.value;
        }
    },
    
    /**
     * Format type name for display
     */
    formatTypeName(type) {
        const names = {
            'article-roman': 'Articles',
            'article-num': 'Articles',
            'section': 'Sections',
            'subsection': 'Subsections',
            'sub-subsection': 'Sub-subsections'
        };
        return names[type] || 'Sections';
    },
    
    /**
     * Show status message
     */
    showStatus(type, message) {
        const status = document.getElementById('xrefStatus');
        if (!status) return;
        
        status.className = `xref-status status-${type}`;
        status.textContent = message;
        status.style.display = 'block';
        
        // Auto-hide after delay (except errors)
        if (type !== 'error') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 4000);
        }
    },
    
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = 'Working...';
        } else if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    },
    
    /**
     * Escape HTML to prevent XSS - delegates to shared utility
     */
    escapeHtml(text) {
        return window.DocForge?.Utils?.escapeHtml?.(text) || (text || '');
    },
    
    /**
     * Truncate text - delegates to shared utility
     */
    truncate(text, maxLen) {
        return window.DocForge?.Utils?.truncate?.(text, maxLen) || (text || '');
    }
};

// ============================================================================
// WRAPPER FUNCTIONS FOR EXTERNAL USE
// ============================================================================

/**
 * Scan cross-references (wrapper for UI-less calls)
 */
async function scanCrossReferences() {
    return await XREF_UI.handleScan();
}

/**
 * Fix all cross-references
 */
async function fixAllCrossReferences() {
    return await XREF_UI.handleFixAll();
}

/**
 * Insert a reference at cursor
 */
async function insertReference(target, format) {
    XRefUI.insertTarget = target;
    XRefUI.insertFormat = format || 'standard';
    return await XREF_UI.handleInsert();
}

/**
 * Navigate to a section
 */
async function navigateToSection(sectionNumber) {
    return await XREF_UI.handleNavigate(sectionNumber);
}

/**
 * Get available sections
 */
function getAvailableSections() {
    return XRefUI.availableSections;
}

/**
 * Get current validation results
 */
function getValidationResults() {
    return XRefUI.currentValidation;
}

/**
 * Get current statistics
 */
function getStats() {
    return XRefUI.currentStats;
}

/**
 * Clear current state
 */
function clearState() {
    XRefUI.currentReferences = [];
    XRefUI.currentValidation = null;
    XRefUI.availableSections = [];
    XRefUI.currentStats = null;
    
    // Clear UI
    const list = document.getElementById('xrefResultsList');
    if (list) list.innerHTML = '';
    
    const container = document.getElementById('xrefResultsContainer');
    if (container) container.style.display = 'none';
    
    const stats = document.getElementById('xref-stats');
    if (stats) stats.style.display = 'none';
}

// ============================================================================
// HTML GENERATION HELPERS
// ============================================================================

/**
 * Generate HTML for broken references list
 * @param {Array} brokenRefs
 * @returns {string}
 */
function generateBrokenRefsHTML(brokenRefs) {
    if (!brokenRefs || brokenRefs.length === 0) {
        return '<div class="result-item success">All cross-references are valid.</div>';
    }
    
    return brokenRefs.map((ref, idx) => {
        const suggestions = ref.suggestions || [];
        const suggestionHTML = suggestions.length > 0
            ? suggestions.slice(0, 3).map(s => 
                `<span class="suggestion">${_escapeHtml(s.number)} (${s.similarity}%)</span>`
            ).join(', ')
            : 'No suggestions';
        
        return `
            <div class="result-item broken" data-idx="${idx}">
                <div class="ref-text">${_escapeHtml(ref.text)}</div>
                <div class="ref-line">Line ${ref.lineNumber}</div>
                <div class="ref-suggestions">${suggestionHTML}</div>
            </div>
        `;
    }).join('');
}

/**
 * Generate HTML for sections dropdown
 * @param {Array} sections
 * @returns {string}
 */
function generateSectionsDropdownHTML(sections) {
    if (!sections || sections.length === 0) {
        return '<option value="">-- No sections found --</option>';
    }
    
    return '<option value="">-- Select section --</option>' +
        sections.map(s => 
            `<option value="${_escapeHtml(s.number)}">${_escapeHtml(s.number)} - ${_escapeHtml(_truncate(s.text, 30))}</option>`
        ).join('');
}

/**
 * Generate HTML for stats display
 * @param {Object} stats
 * @returns {string}
 */
function generateStatsHTML(stats) {
    if (!stats) return '';
    
    return `
        <div class="stat-row">
            <span class="stat-label">Total References:</span>
            <span class="stat-value">${stats.totalReferences}</span>
        </div>
        <div class="stat-row success">
            <span class="stat-label">Valid:</span>
            <span class="stat-value">${stats.validReferences}</span>
        </div>
        <div class="stat-row ${stats.invalidReferences > 0 ? 'error' : 'success'}">
            <span class="stat-label">Invalid:</span>
            <span class="stat-value">${stats.invalidReferences}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Sections:</span>
            <span class="stat-value">${stats.totalSections}</span>
        </div>
    `;
}

// Standalone helpers removed - use DocForge.Utils.escapeHtml and DocForge.Utils.truncate directly
// (EDGE-005 fix: removed duplicate escapeHtml function, using class method and Utils instead)
const _escapeHtml = (text) => window.DocForge?.Utils?.escapeHtml?.(text) ?? (text || '');
const _truncate = (text, maxLen) => window.DocForge?.Utils?.truncate?.(text, maxLen) ?? (text || '');

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize XRef UI when DOM is ready
 * Note: Styles are now loaded from modules/docforge.css
 */
function initXRefUI() {
    // Initialize UI (styles loaded externally)
    XREF_UI.init();
}

// Auto-initialize if Office.js is ready
if (typeof Office !== 'undefined') {
    Office.onReady((info) => {
        if (info.host === Office.HostType.Word) {
            initXRefUI();
        }
    });
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXRefUI);
} else {
    initXRefUI();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export to DocForge namespace
window.DocForge = window.DocForge || {};
window.DocForge.XRef = {
    // Inherit from core module
    ...(window.DocForge?.XRef || {}),
    
    // UI Controller
    UI: XREF_UI,
    
    // UI Functions
    scanCrossReferences,
    fixAllCrossReferences,
    insertReference,
    navigateToSection,
    getAvailableSections,
    getValidationResults,
    getStats,
    clearState,
    
    // HTML Helpers
    generateBrokenRefsHTML,
    generateSectionsDropdownHTML,
    generateStatsHTML,
    
    // Init function
    initXRefUI,
    
    // Internal state (for debugging)
    _ui: XRefUI
};

// Also export global functions for onclick handlers
window.scanCrossReferences = scanCrossReferences;
window.fixAllCrossReferences = fixAllCrossReferences;
window.insertReference = insertReference;
window.navigateToSection = navigateToSection;

// Module export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        XREF_UI,
        XRefUI,
        scanCrossReferences,
        fixAllCrossReferences,
        insertReference,
        navigateToSection,
        getAvailableSections,
        getValidationResults,
        getStats,
        clearState,
        generateBrokenRefsHTML,
        generateSectionsDropdownHTML,
        generateStatsHTML,
        initXRefUI
    };
}
