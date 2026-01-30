/**
 * DraftBridge Exhibit Sync UI
 * 
 * Task pane panel for managing exhibits and schedules.
 * Shows exhibit list, validation status, and provides quick actions.
 * 
 * @version 1.0.0
 */

/* global Word, Office, ExhibitSync */

const ExhibitSyncUI = (function() {
    'use strict';

    // ========================================================================
    // Constants
    // ========================================================================

    const PANEL_ID = 'exhibit-sync-panel';
    
    const ICONS = {
        exhibit: '📋',
        schedule: '📅',
        appendix: '📎',
        attachment: '🔗',
        annex: '📑',
        error: '❌',
        warning: '⚠️',
        ok: '✅',
        info: 'ℹ️',
        drag: '⋮⋮',
        add: '+',
        refresh: '↻',
        insert: '⤵'
    };

    // ========================================================================
    // State
    // ========================================================================

    let _container = null;
    let _state = {
        exhibits: [],
        references: [],
        issues: [],
        summary: null,
        selectedType: 'all',
        isScanning: false,
        dragSource: null
    };

    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize the UI panel
     * @param {HTMLElement|string} container - Container element or selector
     */
    function init(container) {
        _container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (!_container) {
            console.error('ExhibitSyncUI: Container not found');
            return;
        }

        render();
        attachEventListeners();
        
        // Initial scan
        refresh();

        // Register for document changes
        if (typeof ExhibitSync !== 'undefined') {
            ExhibitSync.registerChangeHandler(onDocumentChanged);
        }
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    /**
     * Main render function
     */
    function render() {
        if (!_container) return;

        _container.innerHTML = `
            <div id="${PANEL_ID}" class="exhibit-sync-panel">
                ${renderHeader()}
                ${renderStatusBar()}
                ${renderTypeFilter()}
                ${renderExhibitList()}
                ${renderIssuesList()}
                ${renderQuickActions()}
            </div>
        `;
    }

    /**
     * Render panel header
     */
    function renderHeader() {
        return `
            <div class="exhibit-header">
                <h2>
                    <span class="header-icon">${ICONS.exhibit}</span>
                    Exhibit Sync
                </h2>
                <button class="btn-icon refresh-btn" title="Refresh" aria-label="Refresh">
                    ${ICONS.refresh}
                </button>
            </div>
        `;
    }

    /**
     * Render status bar
     */
    function renderStatusBar() {
        const { summary, isScanning } = _state;

        if (isScanning) {
            return `
                <div class="status-bar status-scanning">
                    <span class="spinner"></span>
                    <span>Scanning document...</span>
                </div>
            `;
        }

        if (!summary) {
            return `
                <div class="status-bar status-idle">
                    <span>Click refresh to scan</span>
                </div>
            `;
        }

        const statusClass = `status-${summary.status}`;
        return `
            <div class="status-bar ${statusClass}">
                <span class="status-icon">${getStatusIcon(summary.status)}</span>
                <span class="status-text">${summary.message}</span>
                <span class="status-count">
                    ${summary.exhibitCount} exhibit${summary.exhibitCount !== 1 ? 's' : ''} · 
                    ${summary.referenceCount} ref${summary.referenceCount !== 1 ? 's' : ''}
                </span>
            </div>
        `;
    }

    /**
     * Render type filter tabs
     */
    function renderTypeFilter() {
        const types = ['all', 'exhibit', 'schedule', 'appendix', 'attachment', 'annex'];
        const counts = getTypeCounts();

        const tabs = types.map(type => {
            const count = type === 'all' ? _state.exhibits.length : (counts[type] || 0);
            const isActive = _state.selectedType === type;
            const label = type === 'all' ? 'All' : capitalize(type) + 's';
            
            return `
                <button 
                    class="filter-tab ${isActive ? 'active' : ''}"
                    data-type="${type}"
                    ${count === 0 && type !== 'all' ? 'disabled' : ''}
                >
                    ${label}
                    ${count > 0 ? `<span class="tab-count">${count}</span>` : ''}
                </button>
            `;
        }).join('');

        return `
            <div class="type-filter">
                ${tabs}
            </div>
        `;
    }

    /**
     * Render exhibit list
     */
    function renderExhibitList() {
        const filtered = getFilteredExhibits();

        if (filtered.length === 0) {
            return `
                <div class="exhibit-list empty">
                    <p class="empty-message">
                        ${_state.exhibits.length === 0 
                            ? 'No exhibits found in document' 
                            : 'No exhibits of this type'}
                    </p>
                </div>
            `;
        }

        const items = filtered.map((exhibit, idx) => renderExhibitItem(exhibit, idx)).join('');

        return `
            <div class="exhibit-list" role="list">
                ${items}
            </div>
        `;
    }

    /**
     * Render single exhibit item
     */
    function renderExhibitItem(exhibit, idx) {
        const refCount = getRefCountForExhibit(exhibit);
        const hasIssue = hasIssueForExhibit(exhibit);
        const issueClass = hasIssue ? 'has-issue' : '';

        return `
            <div class="exhibit-item ${issueClass}" 
                 data-type="${exhibit.type}" 
                 data-id="${exhibit.identifier}"
                 data-order="${exhibit.order}"
                 draggable="true"
                 role="listitem">
                <span class="drag-handle" title="Drag to reorder">${ICONS.drag}</span>
                <span class="exhibit-icon">${getTypeIcon(exhibit.type)}</span>
                <div class="exhibit-info">
                    <span class="exhibit-name">${exhibit.displayName}</span>
                    ${exhibit.title ? `<span class="exhibit-title">${truncate(exhibit.title, 30)}</span>` : ''}
                </div>
                <span class="ref-count" title="${refCount} reference(s)">
                    ${refCount} ref${refCount !== 1 ? 's' : ''}
                </span>
                <button class="btn-icon insert-ref-btn" 
                        title="Insert reference at cursor"
                        data-type="${exhibit.type}"
                        data-id="${exhibit.identifier}">
                    ${ICONS.insert}
                </button>
            </div>
        `;
    }

    /**
     * Render issues list
     */
    function renderIssuesList() {
        const issues = _state.issues;

        if (issues.length === 0) {
            return '';
        }

        const issueItems = issues.map(issue => renderIssueItem(issue)).join('');

        return `
            <div class="issues-section">
                <h3 class="issues-header">
                    <span>${ICONS.warning}</span>
                    Issues (${issues.length})
                </h3>
                <div class="issues-list">
                    ${issueItems}
                </div>
            </div>
        `;
    }

    /**
     * Render single issue item
     */
    function renderIssueItem(issue) {
        const icon = issue.severity === 'error' ? ICONS.error 
            : issue.severity === 'warning' ? ICONS.warning 
            : ICONS.info;

        return `
            <div class="issue-item issue-${issue.severity}">
                <span class="issue-icon">${icon}</span>
                <div class="issue-content">
                    <p class="issue-message">${issue.message}</p>
                    ${issue.suggestion ? `<p class="issue-suggestion">${issue.suggestion}</p>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render quick actions section
     */
    function renderQuickActions() {
        return `
            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <button class="btn-action add-exhibit-btn">
                        ${ICONS.add} Add Exhibit
                    </button>
                    <button class="btn-action add-schedule-btn">
                        ${ICONS.add} Add Schedule
                    </button>
                </div>
                <div class="insert-reference">
                    <label for="insert-ref-select">Insert Reference:</label>
                    <select id="insert-ref-select" class="ref-select">
                        <option value="">Select exhibit...</option>
                        ${renderExhibitOptions()}
                    </select>
                    <button class="btn-action insert-btn" id="insert-selected-ref">
                        Insert
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render exhibit options for select dropdown
     */
    function renderExhibitOptions() {
        return _state.exhibits.map(exhibit => 
            `<option value="${exhibit.type}:${exhibit.identifier}">${exhibit.displayName}</option>`
        ).join('');
    }

    // ========================================================================
    // Event Handling
    // ========================================================================

    /**
     * Attach all event listeners
     */
    function attachEventListeners() {
        if (!_container) return;

        // Refresh button
        _container.addEventListener('click', (e) => {
            if (e.target.closest('.refresh-btn')) {
                refresh();
            }
        });

        // Type filter tabs
        _container.addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (tab && !tab.disabled) {
                _state.selectedType = tab.dataset.type;
                render();
                attachEventListeners();
            }
        });

        // Insert reference button (in list)
        _container.addEventListener('click', (e) => {
            const btn = e.target.closest('.insert-ref-btn');
            if (btn) {
                insertReferenceAtCursor(btn.dataset.type, btn.dataset.id);
            }
        });

        // Add exhibit/schedule buttons
        _container.addEventListener('click', (e) => {
            if (e.target.closest('.add-exhibit-btn')) {
                showAddExhibitDialog('exhibit');
            }
            if (e.target.closest('.add-schedule-btn')) {
                showAddExhibitDialog('schedule');
            }
        });

        // Insert selected reference
        _container.addEventListener('click', (e) => {
            if (e.target.id === 'insert-selected-ref') {
                const select = document.getElementById('insert-ref-select');
                if (select && select.value) {
                    const [type, id] = select.value.split(':');
                    insertReferenceAtCursor(type, id);
                }
            }
        });

        // Drag and drop for reordering
        attachDragListeners();
    }

    /**
     * Attach drag and drop listeners
     */
    function attachDragListeners() {
        const items = _container.querySelectorAll('.exhibit-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', onDragStart);
            item.addEventListener('dragover', onDragOver);
            item.addEventListener('drop', onDrop);
            item.addEventListener('dragend', onDragEnd);
        });
    }

    function onDragStart(e) {
        _state.dragSource = e.target.closest('.exhibit-item');
        _state.dragSource.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: _state.dragSource.dataset.type,
            id: _state.dragSource.dataset.id,
            order: _state.dragSource.dataset.order
        }));
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.exhibit-item');
        if (target && target !== _state.dragSource) {
            const targetRect = target.getBoundingClientRect();
            const midY = targetRect.top + targetRect.height / 2;
            
            // Remove existing indicators
            _container.querySelectorAll('.drag-above, .drag-below').forEach(el => {
                el.classList.remove('drag-above', 'drag-below');
            });
            
            // Add indicator
            if (e.clientY < midY) {
                target.classList.add('drag-above');
            } else {
                target.classList.add('drag-below');
            }
        }
    }

    function onDrop(e) {
        e.preventDefault();
        
        const target = e.target.closest('.exhibit-item');
        if (!target || target === _state.dragSource) return;
        
        const sourceData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetData = {
            type: target.dataset.type,
            id: target.dataset.id,
            order: parseInt(target.dataset.order)
        };

        // Only allow reordering within same type
        if (sourceData.type !== targetData.type) {
            showNotification('Can only reorder within same exhibit type', 'warning');
            return;
        }

        // Determine new order
        const isAbove = target.classList.contains('drag-above');
        handleReorder(sourceData.type, sourceData.id, targetData.id, isAbove);
    }

    function onDragEnd(e) {
        _state.dragSource?.classList.remove('dragging');
        _state.dragSource = null;
        
        _container.querySelectorAll('.drag-above, .drag-below').forEach(el => {
            el.classList.remove('drag-above', 'drag-below');
        });
    }

    // ========================================================================
    // Actions
    // ========================================================================

    /**
     * Refresh - rescan document
     */
    async function refresh() {
        if (typeof ExhibitSync === 'undefined') {
            showNotification('ExhibitSync not loaded', 'error');
            return;
        }

        _state.isScanning = true;
        render();
        attachEventListeners();

        try {
            const results = await ExhibitSync.fullScan();
            _state.exhibits = results.definitions;
            _state.references = results.references;
            _state.issues = results.issues;
            _state.summary = results.summary;
        } catch (err) {
            showNotification('Scan failed: ' + err.message, 'error');
        } finally {
            _state.isScanning = false;
            render();
            attachEventListeners();
        }
    }

    /**
     * Handle document change notification
     */
    function onDocumentChanged(results) {
        _state.exhibits = results.definitions;
        _state.references = results.references;
        _state.issues = results.issues;
        _state.summary = results.summary;
        render();
        attachEventListeners();
    }

    /**
     * Insert reference at cursor
     */
    async function insertReferenceAtCursor(type, identifier) {
        if (typeof ExhibitSync === 'undefined') return;

        try {
            await ExhibitSync.insertReference(type, identifier);
            showNotification(`Inserted ${capitalize(type)} ${identifier}`, 'success');
        } catch (err) {
            showNotification('Insert failed: ' + err.message, 'error');
        }
    }

    /**
     * Handle exhibit reorder
     */
    async function handleReorder(exhibitType, sourceId, targetId, insertBefore) {
        if (typeof ExhibitSync === 'undefined') return;

        // Get current order
        const typeExhibits = _state.exhibits
            .filter(e => e.type === exhibitType)
            .sort((a, b) => a.order - b.order);
        
        const currentOrder = typeExhibits.map(e => e.identifier);
        
        // Calculate new order
        const sourceIdx = currentOrder.indexOf(sourceId);
        let targetIdx = currentOrder.indexOf(targetId);
        
        // Remove source from current position
        currentOrder.splice(sourceIdx, 1);
        
        // Recalculate target index after removal
        targetIdx = currentOrder.indexOf(targetId);
        
        // Insert at new position
        const insertIdx = insertBefore ? targetIdx : targetIdx + 1;
        currentOrder.splice(insertIdx, 0, sourceId);

        try {
            showNotification('Renumbering exhibits...', 'info');
            const result = await ExhibitSync.renumberExhibits(exhibitType, currentOrder);
            showNotification(result.message, 'success');
            await refresh();
        } catch (err) {
            showNotification('Reorder failed: ' + err.message, 'error');
        }
    }

    /**
     * Show add exhibit dialog
     */
    function showAddExhibitDialog(type) {
        const title = prompt(`Enter title for new ${type} (optional):`);
        if (title === null) return; // Cancelled

        addNewExhibit(type, title || null);
    }

    /**
     * Add new exhibit
     */
    async function addNewExhibit(type, title) {
        if (typeof ExhibitSync === 'undefined') return;

        try {
            const result = await ExhibitSync.insertExhibitDefinition(type, title);
            showNotification(result.message, 'success');
            await refresh();
        } catch (err) {
            showNotification('Add failed: ' + err.message, 'error');
        }
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    function getFilteredExhibits() {
        if (_state.selectedType === 'all') {
            return _state.exhibits;
        }
        return _state.exhibits.filter(e => e.type === _state.selectedType);
    }

    function getTypeCounts() {
        const counts = {};
        _state.exhibits.forEach(e => {
            counts[e.type] = (counts[e.type] || 0) + 1;
        });
        return counts;
    }

    function getRefCountForExhibit(exhibit) {
        return _state.references.filter(
            r => r.type === exhibit.type && r.identifier === exhibit.identifier
        ).length;
    }

    function hasIssueForExhibit(exhibit) {
        return _state.issues.some(issue => 
            (issue.definition && 
             issue.definition.type === exhibit.type && 
             issue.definition.identifier === exhibit.identifier) ||
            (issue.reference && 
             issue.reference.type === exhibit.type && 
             issue.reference.identifier === exhibit.identifier)
        );
    }

    function getTypeIcon(type) {
        return ICONS[type] || ICONS.exhibit;
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'error': return ICONS.error;
            case 'warning': return ICONS.warning;
            case 'ok': return ICONS.ok;
            default: return ICONS.info;
        }
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function truncate(str, max) {
        if (str.length <= max) return str;
        return str.substring(0, max - 3) + '...';
    }

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.exhibit-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `exhibit-notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${getStatusIcon(type)}</span>
            <span class="notification-message">${message}</span>
        `;
        
        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ========================================================================
    // Public API
    // ========================================================================

    return {
        init,
        render,
        refresh,
        getState: () => ({ ..._state }),
        showNotification,
        VERSION: '1.0.0'
    };
})();

// Global export
if (typeof window !== 'undefined') {
    window.ExhibitSyncUI = ExhibitSyncUI;
}

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExhibitSyncUI;
}
