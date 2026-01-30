/**
 * DraftBridge Compare Changes - UI Component
 * 
 * Visual comparison panel that shows changes before they're applied.
 * Split-pane view with highlighted additions, deletions, and modifications.
 */

const DiffPreview = (function() {
    'use strict';

    let previewPanel = null;
    let isVisible = false;
    let currentDiff = null;
    let onApplyCallback = null;

    /**
     * Initialize the diff preview component
     */
    function init() {
        createPreviewPanel();
        attachKeyboardShortcuts();
    }

    /**
     * Create the preview panel DOM structure
     */
    function createPreviewPanel() {
        // Remove existing panel if any
        const existing = document.getElementById('diffPreviewPanel');
        if (existing) existing.remove();

        previewPanel = document.createElement('div');
        previewPanel.id = 'diffPreviewPanel';
        previewPanel.className = 'diff-preview-panel hidden';
        previewPanel.setAttribute('role', 'dialog');
        previewPanel.setAttribute('aria-modal', 'true');
        previewPanel.setAttribute('aria-labelledby', 'diffPreviewTitle');

        previewPanel.innerHTML = `
            <div class="diff-preview-backdrop"></div>
            <div class="diff-preview-content">
                <div class="diff-preview-header">
                    <h2 id="diffPreviewTitle" class="diff-preview-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z"/>
                            <path d="M15 3v6h6"/>
                        </svg>
                        Preview Changes
                    </h2>
                    <button class="diff-preview-close" id="closeDiffPreview" aria-label="Close preview">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="diff-summary" id="diffSummary">
                    <!-- Summary stats rendered here -->
                </div>
                
                <div class="diff-view-container">
                    <div class="diff-view-tabs">
                        <button class="diff-tab active" data-view="unified">Unified</button>
                        <button class="diff-tab" data-view="split">Split View</button>
                        <button class="diff-tab" data-view="list">Field List</button>
                    </div>
                    
                    <div class="diff-view-content" id="diffViewContent">
                        <!-- Diff content rendered here -->
                    </div>
                </div>
                
                <div class="diff-preview-footer">
                    <div class="diff-legend">
                        <span class="legend-item"><span class="legend-color add"></span> Added</span>
                        <span class="legend-item"><span class="legend-color delete"></span> Deleted</span>
                        <span class="legend-item"><span class="legend-color modify"></span> Modified</span>
                    </div>
                    <div class="diff-actions">
                        <button class="btn btn-secondary" id="cancelDiffBtn">Cancel</button>
                        <button class="btn btn-primary" id="applyDiffBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(previewPanel);
        attachEventListeners();
    }

    /**
     * Attach event listeners to panel elements
     */
    function attachEventListeners() {
        // Close button
        document.getElementById('closeDiffPreview')?.addEventListener('click', hide);
        document.getElementById('cancelDiffBtn')?.addEventListener('click', hide);
        
        // Apply button
        document.getElementById('applyDiffBtn')?.addEventListener('click', () => {
            if (onApplyCallback) {
                onApplyCallback(currentDiff);
            }
            hide();
        });
        
        // Backdrop click to close
        previewPanel.querySelector('.diff-preview-backdrop')?.addEventListener('click', hide);
        
        // Tab switching
        previewPanel.querySelectorAll('.diff-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                switchView(view);
            });
        });
    }

    /**
     * Attach keyboard shortcuts
     */
    function attachKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + D to toggle diff preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
                e.preventDefault();
                if (isVisible) {
                    hide();
                } else if (window.DraftBridge?.getCurrentFields) {
                    showForCurrentChanges();
                }
            }
            
            // Escape to close
            if (e.key === 'Escape' && isVisible) {
                hide();
            }
            
            // Enter to apply when preview is visible
            if (e.key === 'Enter' && isVisible && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                document.getElementById('applyDiffBtn')?.click();
            }
        });
    }

    /**
     * Show the diff preview with given changes
     * @param {Object} diffResult - Result from DiffEngine.diffAgainstLastSnapshot
     * @param {Function} onApply - Callback when user clicks Apply
     */
    function show(diffResult, onApply) {
        if (!previewPanel) init();
        
        currentDiff = diffResult;
        onApplyCallback = onApply;
        
        renderSummary(diffResult.summary);
        renderDiff(diffResult, 'unified');
        
        previewPanel.classList.remove('hidden');
        isVisible = true;
        
        // Focus the apply button for keyboard users
        setTimeout(() => {
            document.getElementById('applyDiffBtn')?.focus();
        }, 100);
    }

    /**
     * Hide the diff preview
     */
    function hide() {
        if (previewPanel) {
            previewPanel.classList.add('hidden');
        }
        isVisible = false;
        currentDiff = null;
    }

    /**
     * Render the summary section
     */
    function renderSummary(summary) {
        const summaryEl = document.getElementById('diffSummary');
        if (!summaryEl || !summary) return;

        if (summary.total === 0) {
            summaryEl.innerHTML = `
                <div class="summary-empty">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    No changes detected
                </div>
            `;
            return;
        }

        summaryEl.innerHTML = `
            <div class="summary-stats">
                <div class="stat-item total">
                    <span class="stat-value">${summary.total}</span>
                    <span class="stat-label">changes</span>
                </div>
                ${summary.additions > 0 ? `
                    <div class="stat-item additions">
                        <span class="stat-value">+${summary.additions}</span>
                        <span class="stat-label">added</span>
                    </div>
                ` : ''}
                ${summary.deletions > 0 ? `
                    <div class="stat-item deletions">
                        <span class="stat-value">-${summary.deletions}</span>
                        <span class="stat-label">removed</span>
                    </div>
                ` : ''}
                ${summary.modifications > 0 ? `
                    <div class="stat-item modifications">
                        <span class="stat-value">~${summary.modifications}</span>
                        <span class="stat-label">modified</span>
                    </div>
                ` : ''}
            </div>
            <div class="summary-detail">
                ${summary.wordsAdded > 0 ? `<span class="word-stat add">+${summary.wordsAdded} words</span>` : ''}
                ${summary.wordsDeleted > 0 ? `<span class="word-stat delete">-${summary.wordsDeleted} words</span>` : ''}
            </div>
        `;
    }

    /**
     * Switch between view modes
     */
    function switchView(viewType) {
        // Update tab states
        previewPanel.querySelectorAll('.diff-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewType);
        });
        
        // Re-render content
        if (currentDiff) {
            renderDiff(currentDiff, viewType);
        }
    }

    /**
     * Render the diff content
     */
    function renderDiff(diffResult, viewType) {
        const contentEl = document.getElementById('diffViewContent');
        if (!contentEl) return;

        const { changes, diffHTML } = diffResult;

        switch (viewType) {
            case 'unified':
                contentEl.innerHTML = renderUnifiedView(changes, diffHTML);
                break;
            case 'split':
                contentEl.innerHTML = renderSplitView(changes, diffHTML);
                break;
            case 'list':
                contentEl.innerHTML = renderListView(changes);
                break;
        }
    }

    /**
     * Render unified diff view (like git diff)
     */
    function renderUnifiedView(changes, diffHTML) {
        if (changes.length === 0) {
            return '<div class="diff-empty">No changes to display</div>';
        }

        return `
            <div class="diff-unified">
                ${changes.map(change => `
                    <div class="diff-block ${change.type}">
                        <div class="diff-field-header">
                            <span class="diff-field-name">${escapeHTML(change.field)}</span>
                            <span class="diff-type-badge ${change.type}">${change.type}</span>
                        </div>
                        <div class="diff-field-content">
                            ${change.type === 'modify' && diffHTML[change.field] 
                                ? diffHTML[change.field]
                                : change.type === 'add' 
                                    ? `<ins class="diff-add">${escapeHTML(change.newValue || '')}</ins>`
                                    : `<del class="diff-delete">${escapeHTML(change.oldValue || '')}</del>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render split view (side-by-side comparison)
     */
    function renderSplitView(changes, diffHTML) {
        if (changes.length === 0) {
            return '<div class="diff-empty">No changes to display</div>';
        }

        return `
            <div class="diff-split">
                <div class="diff-split-header">
                    <div class="diff-split-col">Before</div>
                    <div class="diff-split-col">After</div>
                </div>
                ${changes.map(change => `
                    <div class="diff-split-row ${change.type}">
                        <div class="diff-field-label">${escapeHTML(change.field)}</div>
                        <div class="diff-split-col old">
                            ${change.oldValue 
                                ? `<span class="${change.type === 'delete' || change.type === 'modify' ? 'diff-delete' : ''}">${escapeHTML(change.oldValue)}</span>`
                                : '<span class="diff-empty-cell">—</span>'
                            }
                        </div>
                        <div class="diff-split-col new">
                            ${change.newValue 
                                ? `<span class="${change.type === 'add' || change.type === 'modify' ? 'diff-add' : ''}">${escapeHTML(change.newValue)}</span>`
                                : '<span class="diff-empty-cell">—</span>'
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render simple list view
     */
    function renderListView(changes) {
        if (changes.length === 0) {
            return '<div class="diff-empty">No changes to display</div>';
        }

        return `
            <div class="diff-list">
                ${changes.map(change => `
                    <div class="diff-list-item ${change.type}">
                        <div class="diff-list-icon">
                            ${change.type === 'add' ? '+' : change.type === 'delete' ? '−' : '~'}
                        </div>
                        <div class="diff-list-content">
                            <strong>${escapeHTML(change.field)}</strong>
                            ${change.type === 'modify' 
                                ? `: "${escapeHTML(change.oldValue || '')}" → "${escapeHTML(change.newValue || '')}"`
                                : change.type === 'add'
                                    ? `: "${escapeHTML(change.newValue || '')}"`
                                    : `: "${escapeHTML(change.oldValue || '')}" (removed)`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Escape HTML characters
     */
    function escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show diff for current field changes
     * Integrates with DraftBridge's field system
     */
    function showForCurrentChanges() {
        if (typeof DiffEngine === 'undefined') {
            return;
        }

        // Get current field values from DraftBridge
        const currentFields = window.DraftBridge?.getCurrentFields?.() || [];
        const diffResult = DiffEngine.diffAgainstLastSnapshot(currentFields);
        
        show(diffResult, (diff) => {
            // Apply changes callback - DraftBridge will handle actual document update
            window.DraftBridge?.applyFields?.(currentFields);
        });
    }

    /**
     * Check if preview is currently visible
     */
    function isPreviewVisible() {
        return isVisible;
    }

    // Public API
    return {
        init,
        show,
        hide,
        showForCurrentChanges,
        isPreviewVisible
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', DiffPreview.init);
} else {
    DiffPreview.init();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffPreview;
}
