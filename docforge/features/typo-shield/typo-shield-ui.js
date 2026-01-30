/**
 * DocForge Typo Shield UI
 * 
 * Pre-save warning modal that catches common document errors.
 * Non-blocking: warns but doesn't prevent save.
 * 
 * @version 1.0.0
 */

/* global TypoShield */

// ============================================================================
// UI State
// ============================================================================

let currentResults = null;
let checker = null;
let dismissedIssues = new Set(); // Track user-dismissed issues
let pendingSaveCallback = null;

// ============================================================================
// Initialize
// ============================================================================

function initTypoShieldUI() {
    checker = new TypoShield.Checker();

    // Load dismissed issues from storage
    loadDismissedIssues();

    // Wire up save button intercept if exists
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        const originalClick = saveBtn.onclick;
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            const canSave = await interceptSave(() => {
                if (originalClick) originalClick.call(saveBtn, e);
            });
        };
    }

    // Also intercept Ctrl+S
    document.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            await interceptSave(() => {
                // Trigger native save
                if (typeof Office !== 'undefined') {
                    // Office add-in save would go here
                }
            });
        }
    });

    // Install the shield hook
    TypoShield.installSaveHook(showTypoShieldWarning);
}

/**
 * Intercept save action to check for issues
 */
async function interceptSave(saveCallback) {
    pendingSaveCallback = saveCallback;

    // Show checking toast
    showCheckingToast();

    try {
        currentResults = await checker.runAllChecks();

        // Filter out dismissed issues
        const activeResults = filterDismissedIssues(currentResults);

        hideCheckingToast();

        if (activeResults.issueCount > 0) {
            showTypoShieldWarning(activeResults);
            return false;
        } else {
            // Clear to save
            if (saveCallback) saveCallback();
            showSuccessToast();
            return true;
        }
    } catch (err) {
        hideCheckingToast();
        // On error, allow save to proceed
        if (saveCallback) saveCallback();
        return true;
    }
}

/**
 * Filter out issues the user has dismissed
 */
function filterDismissedIssues(results) {
    const filtered = {
        ...results,
        results: results.results.map(r => ({
            ...r,
            items: r.items.filter(item => {
                const key = `${r.checkId}:${item.description || item.pattern || ''}`;
                return !dismissedIssues.has(key);
            })
        }))
    };

    // Recalculate counts
    filtered.errors = filtered.results.filter(r => r.severity === 'error' && r.items.length > 0).length;
    filtered.warnings = filtered.results.filter(r => r.severity === 'warning' && r.items.length > 0).length;
    filtered.issueCount = filtered.results.reduce((count, r) => {
        if (r.severity === 'pass' || r.items.length === 0) return count;
        return count + r.items.length;
    }, 0);

    // Update overall status
    const hasErrors = filtered.results.some(r => r.severity === 'error' && r.items.length > 0);
    const hasWarnings = filtered.results.some(r => r.severity === 'warning' && r.items.length > 0);
    filtered.overall = hasErrors ? 'error' : (hasWarnings ? 'warning' : 'pass');

    return filtered;
}

// ============================================================================
// Modal Management
// ============================================================================

function showTypoShieldWarning(results) {
    currentResults = results;

    let modal = document.getElementById('typoShieldModal');
    if (!modal) {
        modal = createTypoShieldModal();
        document.body.appendChild(modal);
    }

    renderTypoShieldResults(results);
    modal.classList.remove('hidden');
    modal.classList.add('visible');

    // Focus the modal for accessibility
    const firstButton = modal.querySelector('button');
    if (firstButton) firstButton.focus();
}

function hideTypoShieldModal() {
    const modal = document.getElementById('typoShieldModal');
    if (modal) {
        modal.classList.remove('visible');
        modal.classList.add('hidden');
    }
}

function createTypoShieldModal() {
    const modal = document.createElement('div');
    modal.id = 'typoShieldModal';
    modal.className = 'modal typo-shield-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'typoShieldTitle');

    modal.innerHTML = `
        <div class="modal-backdrop" onclick="hideTypoShieldModal()"></div>
        <div class="modal-content typo-shield-content">
            <div class="modal-header typo-shield-header">
                <div class="header-left">
                    <span class="shield-icon">🛡️</span>
                    <h2 class="modal-title" id="typoShieldTitle">Typo Shield</h2>
                </div>
                <button class="modal-close" onclick="hideTypoShieldModal()" aria-label="Close">×</button>
            </div>
            <div class="modal-body typo-shield-body" id="typoShieldBody">
                <!-- Results rendered here -->
            </div>
            <div class="modal-footer typo-shield-footer">
                <button class="btn btn-secondary" onclick="hideTypoShieldModal()">
                    Review Document
                </button>
                <button class="btn btn-primary" onclick="saveAnyway()">
                    Save Anyway
                </button>
            </div>
        </div>
    `;

    return modal;
}

// ============================================================================
// Render Results
// ============================================================================

function renderTypoShieldResults(results) {
    const body = document.getElementById('typoShieldBody');
    if (!body) return;

    // Status banner
    const statusClass = results.overall === 'pass' ? 'success' :
        results.overall === 'warning' ? 'warning' : 'error';
    const statusIcon = results.overall === 'pass' ? '✅' :
        results.overall === 'warning' ? '⚠️' : '🚨';
    const statusText = results.overall === 'pass' ? 'Looking Good!' :
        results.overall === 'warning' ? 'Review Before Saving' : 'Issues Found';

    let html = `
        <div class="typo-shield-status typo-shield-status-${statusClass}">
            <span class="status-icon">${statusIcon}</span>
            <div class="status-text">
                <h3>${statusText}</h3>
                <p>${results.issueCount} potential issue${results.issueCount !== 1 ? 's' : ''} detected</p>
            </div>
        </div>
        <div class="typo-shield-issues">
    `;

    // Sort: errors first, then warnings
    const issuesWithItems = results.results.filter(r =>
        r.severity !== 'pass' && r.items && r.items.length > 0
    );
    const sortedIssues = issuesWithItems.sort((a, b) => {
        const order = { error: 0, warning: 1 };
        return (order[a.severity] || 2) - (order[b.severity] || 2);
    });

    if (sortedIssues.length === 0) {
        html += `
            <div class="no-issues">
                <span class="no-issues-icon">✨</span>
                <p>No issues found. Document is ready to save!</p>
            </div>
        `;
    } else {
        for (const issue of sortedIssues) {
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            const severityClass = issue.severity === 'error' ? 'error' : 'warning';

            html += `
                <div class="typo-issue typo-issue-${severityClass}">
                    <div class="issue-header" onclick="toggleIssueDetails('${issue.checkId}')">
                        <span class="issue-icon">${icon}</span>
                        <div class="issue-info">
                            <span class="issue-name">${issue.checkName}</span>
                            <span class="issue-message">${issue.message}</span>
                        </div>
                        <span class="issue-expand" id="expand-${issue.checkId}">▼</span>
                    </div>
                    <div class="issue-details hidden" id="details-${issue.checkId}">
                        <ul class="issue-items">
                            ${issue.items.map((item, idx) => `
                                <li class="issue-item">
                                    <div class="item-content ${item.jumpable ? 'jumpable' : ''}" 
                                         ${item.jumpable ? `onclick="jumpToTypoIssue('${issue.checkId}', ${idx})"` : ''}>
                                        <span class="item-text">${escapeHtml(item.description)}</span>
                                        ${item.jumpable ? '<span class="item-jump">Go to →</span>' : ''}
                                    </div>
                                    <button class="item-dismiss" onclick="dismissIssue('${issue.checkId}', ${idx})" 
                                            title="Don't warn about this">
                                        ×
                                    </button>
                                </li>
                            `).join('')}
                        </ul>
                        ${issue.fixable ? `
                            <button class="btn btn-small btn-fix" onclick="autoFix('${issue.checkId}')">
                                🔧 ${issue.fixDescription || 'Auto-fix'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    html += `
        </div>
        <div class="typo-shield-meta">
            Scanned in ${results.elapsed}ms
        </div>
    `;

    body.innerHTML = html;
}

// ============================================================================
// Interactions
// ============================================================================

function toggleIssueDetails(checkId) {
    const details = document.getElementById(`details-${checkId}`);
    const expand = document.getElementById(`expand-${checkId}`);

    if (details) {
        details.classList.toggle('hidden');
        if (expand) {
            expand.textContent = details.classList.contains('hidden') ? '▼' : '▲';
        }
    }
}

async function jumpToTypoIssue(checkId, itemIndex) {
    if (!currentResults) return;

    const issue = currentResults.results.find(r => r.checkId === checkId);
    if (!issue || !issue.items[itemIndex]) return;

    const item = issue.items[itemIndex];

    // Visual feedback
    const itemElements = document.querySelectorAll(`#details-${checkId} .issue-item`);
    const itemEl = itemElements[itemIndex];
    if (itemEl) {
        itemEl.classList.add('jumping');
    }

    try {
        const jumped = await checker.jumpToIssue(item);

        if (jumped) {
            // Hide modal briefly to show document
            setTimeout(() => {
                hideTypoShieldModal();
            }, 300);
        }
    } catch (err) {
        // Jump failed - item may have been removed
    }

    // Remove visual feedback
    if (itemEl) {
        setTimeout(() => itemEl.classList.remove('jumping'), 500);
    }
}

function dismissIssue(checkId, itemIndex) {
    if (!currentResults) return;

    const issue = currentResults.results.find(r => r.checkId === checkId);
    if (!issue || !issue.items[itemIndex]) return;

    const item = issue.items[itemIndex];
    const key = `${checkId}:${item.description || item.pattern || ''}`;

    dismissedIssues.add(key);
    saveDismissedIssues();

    // Re-filter and re-render
    const filtered = filterDismissedIssues(currentResults);

    if (filtered.issueCount === 0) {
        // All issues dismissed, close and save
        hideTypoShieldModal();
        if (pendingSaveCallback) pendingSaveCallback();
        showSuccessToast();
    } else {
        renderTypoShieldResults(filtered);
    }
}

async function autoFix(checkId) {
    if (checkId === 'doubleSpaces') {
        const result = await checker.fixDoubleSpaces();
        if (result.fixed) {
            showToast(`Fixed ${result.count} double space${result.count !== 1 ? 's' : ''}`, 'success');
            // Re-run checks
            await interceptSave(pendingSaveCallback);
        } else {
            showToast('Could not auto-fix', 'error');
        }
    }
}

function saveAnyway() {
    hideTypoShieldModal();
    if (pendingSaveCallback) {
        pendingSaveCallback();
    }
    showToast('Document saved', 'info');
}

// ============================================================================
// Toast Notifications
// ============================================================================

function showCheckingToast() {
    showToast('🛡️ Checking document...', 'info', 0);
}

function hideCheckingToast() {
    const toast = document.getElementById('typoShieldToast');
    if (toast && toast.textContent.includes('Checking')) {
        toast.remove();
    }
}

function showSuccessToast() {
    showToast('✅ Document saved', 'success', 2000);
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.getElementById('typoShieldToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'typoShieldToast';
    toast.className = `typo-shield-toast typo-shield-toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    // Auto dismiss
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// ============================================================================
// Storage
// ============================================================================

function loadDismissedIssues() {
    try {
        const stored = localStorage.getItem('typoShield.dismissed');
        if (stored) {
            dismissedIssues = new Set(JSON.parse(stored));
        }
    } catch (e) {
        console.warn('Could not load dismissed issues:', e);
    }
}

function saveDismissedIssues() {
    try {
        localStorage.setItem('typoShield.dismissed', JSON.stringify([...dismissedIssues]));
    } catch (e) {
        console.warn('Could not save dismissed issues:', e);
    }
}

function clearDismissedIssues() {
    dismissedIssues.clear();
    saveDismissedIssues();
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// Manual Trigger
// ============================================================================

async function runTypoShieldCheck() {
    showCheckingToast();

    try {
        currentResults = await checker.runAllChecks();
        hideCheckingToast();

        const filtered = filterDismissedIssues(currentResults);
        showTypoShieldWarning(filtered);
    } catch (err) {
        hideCheckingToast();
        showToast('Could not complete check', 'error');
    }
}

// ============================================================================
// Styles
// ============================================================================

function injectTypoShieldStyles() {
    if (document.getElementById('typo-shield-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'typo-shield-styles';
    styles.textContent = `
        /* Typo Shield Modal */
        .typo-shield-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }
        
        .typo-shield-modal.visible {
            opacity: 1;
            pointer-events: auto;
        }
        
        .typo-shield-modal.hidden {
            display: none;
        }
        
        .typo-shield-modal .modal-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .typo-shield-content {
            position: relative;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 440px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            animation: typoShieldSlideIn 0.3s ease;
        }
        
        @keyframes typoShieldSlideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        /* Header */
        .typo-shield-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .shield-icon {
            font-size: 24px;
        }
        
        .typo-shield-header .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px 8px;
            line-height: 1;
            border-radius: 4px;
            transition: all 0.15s ease;
        }
        
        .modal-close:hover {
            background: #f3f4f6;
            color: #374151;
        }
        
        /* Body */
        .typo-shield-body {
            padding: 0;
            overflow-y: auto;
            max-height: calc(80vh - 140px);
        }
        
        /* Status Banner */
        .typo-shield-status {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
        }
        
        .typo-shield-status-success {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
        
        .typo-shield-status-warning {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }
        
        .typo-shield-status-error {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }
        
        .status-icon {
            font-size: 32px;
        }
        
        .status-text h3 {
            margin: 0 0 2px 0;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }
        
        .status-text p {
            margin: 0;
            font-size: 13px;
            color: #6b7280;
        }
        
        /* Issues List */
        .typo-shield-issues {
            padding: 8px 0;
        }
        
        .typo-issue {
            border-bottom: 1px solid #f3f4f6;
        }
        
        .typo-issue:last-child {
            border-bottom: none;
        }
        
        .issue-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        
        .issue-header:hover {
            background: #f9fafb;
        }
        
        .issue-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        
        .issue-info {
            flex: 1;
            min-width: 0;
        }
        
        .issue-name {
            display: block;
            font-weight: 500;
            color: #111827;
            font-size: 14px;
        }
        
        .issue-message {
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-top: 2px;
        }
        
        .issue-expand {
            color: #9ca3af;
            font-size: 10px;
            transition: transform 0.2s ease;
        }
        
        /* Issue Details */
        .issue-details {
            padding: 0 20px 12px 46px;
        }
        
        .issue-details.hidden {
            display: none;
        }
        
        .issue-items {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        
        .issue-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 6px 0;
        }
        
        .item-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f9fafb;
            border-radius: 6px;
            font-size: 13px;
            color: #374151;
        }
        
        .item-content.jumpable {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .item-content.jumpable:hover {
            background: #f3f4f6;
            transform: translateX(2px);
        }
        
        .issue-item.jumping .item-content {
            background: #dbeafe;
        }
        
        .item-text {
            flex: 1;
            word-break: break-word;
        }
        
        .item-jump {
            color: #2563eb;
            font-weight: 500;
            font-size: 12px;
            white-space: nowrap;
            margin-left: 8px;
        }
        
        .item-dismiss {
            background: none;
            border: none;
            color: #9ca3af;
            font-size: 16px;
            cursor: pointer;
            padding: 4px 8px;
            line-height: 1;
            border-radius: 4px;
            transition: all 0.15s ease;
        }
        
        .item-dismiss:hover {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .btn-fix {
            margin-top: 8px;
            font-size: 12px;
            padding: 6px 12px;
        }
        
        /* No Issues */
        .no-issues {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 20px;
            text-align: center;
        }
        
        .no-issues-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }
        
        .no-issues p {
            margin: 0;
            color: #6b7280;
        }
        
        /* Meta */
        .typo-shield-meta {
            padding: 8px 20px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
            border-top: 1px solid #f3f4f6;
        }
        
        /* Footer */
        .typo-shield-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        /* Buttons */
        .btn {
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .btn-primary {
            background: #2563eb;
            color: #fff;
        }
        
        .btn-primary:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        .btn-secondary:hover {
            background: #e5e7eb;
        }
        
        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
        }
        
        /* Toast */
        .typo-shield-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 10001;
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .typo-shield-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        
        .typo-shield-toast-info {
            background: #1e40af;
            color: #fff;
        }
        
        .typo-shield-toast-success {
            background: #059669;
            color: #fff;
        }
        
        .typo-shield-toast-error {
            background: #dc2626;
            color: #fff;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .typo-shield-content {
                background: #1f2937;
                color: #f9fafb;
            }
            
            .typo-shield-header {
                border-color: #374151;
            }
            
            .typo-shield-header .modal-title {
                color: #f9fafb;
            }
            
            .modal-close {
                color: #6b7280;
            }
            
            .modal-close:hover {
                background: #374151;
                color: #f9fafb;
            }
            
            .typo-shield-status-success {
                background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
            }
            
            .typo-shield-status-warning {
                background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
            }
            
            .typo-shield-status-error {
                background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            }
            
            .status-text h3,
            .status-text p {
                color: #f9fafb;
            }
            
            .issue-header:hover {
                background: #374151;
            }
            
            .issue-name {
                color: #f9fafb;
            }
            
            .issue-message {
                color: #9ca3af;
            }
            
            .item-content {
                background: #374151;
                color: #f9fafb;
            }
            
            .item-content.jumpable:hover {
                background: #4b5563;
            }
            
            .typo-issue {
                border-color: #374151;
            }
            
            .typo-shield-meta,
            .typo-shield-footer {
                border-color: #374151;
            }
            
            .btn-secondary {
                background: #374151;
                color: #f9fafb;
            }
            
            .btn-secondary:hover {
                background: #4b5563;
            }
        }
    `;

    document.head.appendChild(styles);
}

// ============================================================================
// Auto-init
// ============================================================================

// Inject styles immediately
injectTypoShieldStyles();

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTypoShieldUI);
} else {
    initTypoShieldUI();
}

// ============================================================================
// Exports
// ============================================================================

const TypoShieldUI = {
    show: showTypoShieldWarning,
    hide: hideTypoShieldModal,
    check: runTypoShieldCheck,
    interceptSave,
    jumpTo: jumpToTypoIssue,
    getResults: () => currentResults,
    clearDismissed: clearDismissedIssues
};

// Global
if (typeof window !== 'undefined') {
    window.TypoShieldUI = TypoShieldUI;
    window.showTypoShieldWarning = showTypoShieldWarning;
    window.hideTypoShieldModal = hideTypoShieldModal;
    window.runTypoShieldCheck = runTypoShieldCheck;
    window.toggleIssueDetails = toggleIssueDetails;
    window.jumpToTypoIssue = jumpToTypoIssue;
    window.dismissIssue = dismissIssue;
    window.autoFix = autoFix;
    window.saveAnyway = saveAnyway;
}

export default TypoShieldUI;
