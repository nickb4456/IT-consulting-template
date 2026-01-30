/**
 * DraftBridge Document Check UI
 * 
 * Beautiful, anxiety-reducing quality check interface.
 * Green = good, yellow = review, red = fix before filing.
 * 
 * @version 1.0.0
 */

/* global DraftBridgePreflight */

// ============================================================================
// UI State
// ============================================================================

let currentResults = null;
let checker = null;

// ============================================================================
// Initialize
// ============================================================================

function initPreflightUI() {
    checker = new DraftBridgePreflight.Checker();
    
    // Wire up the pre-flight button in main UI
    const preflightBtn = document.getElementById('preflightBtn');
    if (preflightBtn) {
        preflightBtn.addEventListener('click', showPreflightModal);
    }
}

// ============================================================================
// Modal Management
// ============================================================================

function showPreflightModal() {
    // Create modal if doesn't exist
    let modal = document.getElementById('preflightModal');
    if (!modal) {
        modal = createPreflightModal();
        document.body.appendChild(modal);
    }
    
    // Show and run checks
    modal.classList.remove('hidden');
    runPreflightChecks();
}

function hidePreflightModal() {
    const modal = document.getElementById('preflightModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function createPreflightModal() {
    const modal = document.createElement('div');
    modal.id = 'preflightModal';
    modal.className = 'modal preflight-modal';
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="hidePreflightModal()"></div>
        <div class="modal-content preflight-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <span class="preflight-icon">✅</span>
                    Document Check
                </h2>
                <button class="modal-close" onclick="hidePreflightModal()">×</button>
            </div>
            <div class="modal-body" id="preflightBody">
                <div class="preflight-loading">
                    <div class="preflight-spinner"></div>
                    <p>Scanning document...</p>
                </div>
            </div>
            <div class="modal-footer" id="preflightFooter">
                <button class="btn btn-secondary" onclick="hidePreflightModal()">Close</button>
                <button class="btn btn-primary" id="preflightRerunBtn" onclick="runPreflightChecks()">
                    Run Again
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

// ============================================================================
// Run Checks
// ============================================================================

async function runPreflightChecks() {
    const body = document.getElementById('preflightBody');
    const rerunBtn = document.getElementById('preflightRerunBtn');
    
    // Check names for visual feedback
    const checkNames = [
        'Blank fields...',
        'Placeholders...',
        'Track changes...',
        'Comments...',
        'Formatting...'
    ];
    const totalChecks = checkNames.length;
    
    // Show checking animation using new loading components
    if (typeof DraftBridgeLoading !== 'undefined') {
        DraftBridgeLoading.showCheckingAnimation({ 
            message: 'Checking document...',
            totalChecks 
        });
    } else {
        // Fallback to simple loading
        body.innerHTML = `
            <div class="preflight-loading">
                <div class="preflight-spinner"></div>
                <p>Scanning document for issues...</p>
            </div>
        `;
    }
    
    if (rerunBtn) rerunBtn.disabled = true;
    
    try {
        // Run checks with progress updates
        let checkIndex = 0;
        const updateProgress = () => {
            if (typeof DraftBridgeLoading !== 'undefined' && checkIndex < totalChecks) {
                DraftBridgeLoading.updateCheckingProgress(
                    checkIndex + 1, 
                    totalChecks, 
                    checkNames[checkIndex]
                );
                checkIndex++;
            }
        };
        
        // Simulate progress during check run (actual checks are batched)
        const progressInterval = setInterval(updateProgress, 200);
        
        // Run all checks
        currentResults = await checker.runAllChecks();
        
        // Clear interval and complete progress
        clearInterval(progressInterval);
        
        // Show completion animation
        if (typeof DraftBridgeLoading !== 'undefined') {
            DraftBridgeLoading.updateCheckingProgress(totalChecks, totalChecks, 'Complete!');
            await new Promise(r => setTimeout(r, 300)); // Brief pause for animation
            DraftBridgeLoading.hideCheckingAnimation({ 
                success: currentResults.overall !== 'error',
                delay: 400 
            });
        }
        
        // Render results
        renderPreflightResults(currentResults);
        
    } catch (err) {
        // Hide checking animation on error
        if (typeof DraftBridgeLoading !== 'undefined') {
            DraftBridgeLoading.hideCheckingAnimation({ success: false });
        }
        
        body.innerHTML = `
            <div class="preflight-error">
                <div class="error-icon">⚠️</div>
                <h3>Couldn't complete check</h3>
                <p>Make sure you have a document open and try again.</p>
            </div>
        `;
    }
    
    if (rerunBtn) rerunBtn.disabled = false;
}

// ============================================================================
// Render Results
// ============================================================================

function renderPreflightResults(results) {
    const body = document.getElementById('preflightBody');
    
    // Overall status banner
    const statusClass = results.overall === 'pass' ? 'success' : 
                        results.overall === 'warning' ? 'warning' : 'error';
    const statusIcon = results.overall === 'pass' ? '✅' : 
                       results.overall === 'warning' ? '⚠️' : '❌';
    const statusText = results.overall === 'pass' ? 'Ready to File!' : 
                       results.overall === 'warning' ? 'Review Warnings' : 'Issues Found';
    
    let html = `
        <div class="preflight-status preflight-status-${statusClass}">
            <span class="status-icon">${statusIcon}</span>
            <div class="status-text">
                <h3>${statusText}</h3>
                <p>${results.errors} error${results.errors !== 1 ? 's' : ''}, 
                   ${results.warnings} warning${results.warnings !== 1 ? 's' : ''}, 
                   ${results.passed} passed</p>
            </div>
        </div>
        
        <div class="preflight-checks">
    `;
    
    // Sort: errors first, then warnings, then passed
    const sortedResults = [...results.results].sort((a, b) => {
        const order = { error: 0, warning: 1, pass: 2 };
        return order[a.severity] - order[b.severity];
    });
    
    for (const check of sortedResults) {
        const icon = check.severity === 'pass' ? '✓' : 
                     check.severity === 'warning' ? '!' : '✕';
        const itemCount = check.items.length;
        
        html += `
            <div class="preflight-check preflight-check-${check.severity}">
                <div class="check-header" onclick="toggleCheckDetails('${check.checkId}')">
                    <span class="check-icon">${icon}</span>
                    <span class="check-name">${check.checkName}</span>
                    <span class="check-message">${check.message}</span>
                    ${itemCount > 0 ? `<span class="check-expand">▼</span>` : ''}
                </div>
                ${itemCount > 0 ? `
                    <div class="check-details hidden" id="details-${check.checkId}">
                        <ul class="check-items">
                            ${check.items.map((item, idx) => `
                                <li class="check-item ${item.jumpable ? 'jumpable' : ''}" 
                                    ${item.jumpable ? `onclick="jumpToPreflightItem('${check.checkId}', ${idx})"` : ''}>
                                    <span class="item-text">${item.description}</span>
                                    ${item.jumpable ? '<span class="item-jump">→</span>' : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    html += `
        </div>
        <div class="preflight-meta">
            Checked in ${results.elapsed}ms
        </div>
    `;
    
    body.innerHTML = html;
}

// ============================================================================
// Interactions
// ============================================================================

function toggleCheckDetails(checkId) {
    const details = document.getElementById(`details-${checkId}`);
    if (details) {
        details.classList.toggle('hidden');
        
        // Update expand icon
        const check = details.closest('.preflight-check');
        const expand = check?.querySelector('.check-expand');
        if (expand) {
            expand.textContent = details.classList.contains('hidden') ? '▼' : '▲';
        }
    }
}

async function jumpToPreflightItem(checkId, itemIndex) {
    if (!currentResults) return;
    
    const check = currentResults.results.find(r => r.checkId === checkId);
    if (!check || !check.items[itemIndex]) return;
    
    const item = check.items[itemIndex];
    
    // Visual feedback
    const itemEl = document.querySelectorAll(`#details-${checkId} .check-item`)[itemIndex];
    if (itemEl) {
        itemEl.classList.add('jumping');
    }
    
    try {
        const jumped = await checker.jumpToItem(item);
        
        if (jumped) {
            // Brief highlight then hide modal for better view
            setTimeout(() => {
                hidePreflightModal();
            }, 300);
        }
    } catch (err) {
        // Jump failed - item may have been removed from document
    }
    
    // Remove visual feedback
    if (itemEl) {
        setTimeout(() => itemEl.classList.remove('jumping'), 500);
    }
}

// ============================================================================
// CSS Styles (inject on load)
// ============================================================================

function injectPreflightStyles() {
    if (document.getElementById('preflight-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'preflight-styles';
    styles.textContent = `
        /* Pre-Flight Modal */
        .preflight-modal .modal-content {
            max-width: 480px;
            max-height: 80vh;
        }
        
        .preflight-modal .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        
        .preflight-modal .modal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .preflight-icon {
            font-size: 20px;
        }
        
        .preflight-modal .modal-body {
            padding: 0;
            overflow-y: auto;
            max-height: calc(80vh - 140px);
        }
        
        .preflight-modal .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 20px;
            border-top: 1px solid var(--border-color, #e5e7eb);
        }
        
        /* Loading State */
        .preflight-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 20px;
            text-align: center;
        }
        
        .preflight-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-color, #e5e7eb);
            border-top-color: var(--primary-color, #2563eb);
            border-radius: 50%;
            animation: preflight-spin 0.8s linear infinite;
            margin-bottom: 12px;
        }
        
        @keyframes preflight-spin {
            to { transform: rotate(360deg); }
        }
        
        /* Status Banner */
        .preflight-status {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            margin: 0;
        }
        
        .preflight-status-success {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-bottom: 1px solid #a7f3d0;
        }
        
        .preflight-status-warning {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-bottom: 1px solid #fcd34d;
        }
        
        .preflight-status-error {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-bottom: 1px solid #fca5a5;
        }
        
        .status-icon {
            font-size: 28px;
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
        
        /* Check List */
        .preflight-checks {
            padding: 8px 0;
        }
        
        .preflight-check {
            border-bottom: 1px solid var(--border-color, #f3f4f6);
        }
        
        .preflight-check:last-child {
            border-bottom: none;
        }
        
        .check-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        
        .check-header:hover {
            background: #f9fafb;
        }
        
        .check-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
        }
        
        .preflight-check-pass .check-icon {
            background: #dcfce7;
            color: #16a34a;
        }
        
        .preflight-check-warning .check-icon {
            background: #fef3c7;
            color: #d97706;
        }
        
        .preflight-check-error .check-icon {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .check-name {
            font-weight: 500;
            color: #111827;
            flex: 0 0 auto;
        }
        
        .check-message {
            color: #6b7280;
            font-size: 13px;
            flex: 1;
            text-align: right;
        }
        
        .check-expand {
            color: #9ca3af;
            font-size: 10px;
            transition: transform 0.2s ease;
        }
        
        /* Check Details */
        .check-details {
            padding: 0 20px 12px 50px;
        }
        
        .check-details.hidden {
            display: none;
        }
        
        .check-items {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        
        .check-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            margin: 4px 0;
            background: #f9fafb;
            border-radius: 6px;
            font-size: 13px;
            color: #374151;
        }
        
        .check-item.jumpable {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .check-item.jumpable:hover {
            background: #f3f4f6;
            transform: translateX(2px);
        }
        
        .check-item.jumping {
            background: #dbeafe;
        }
        
        .item-jump {
            color: #2563eb;
            font-weight: 500;
        }
        
        /* Meta */
        .preflight-meta {
            padding: 8px 20px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
            border-top: 1px solid #f3f4f6;
        }
        
        /* Error State */
        .preflight-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 20px;
            text-align: center;
        }
        
        .preflight-error .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .preflight-error h3 {
            margin: 0 0 8px 0;
            color: #111827;
        }
        
        .preflight-error p {
            margin: 0;
            color: #6b7280;
        }
    `;
    
    document.head.appendChild(styles);
}

// ============================================================================
// Auto-init
// ============================================================================

// Inject styles immediately
injectPreflightStyles();

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreflightUI);
} else {
    initPreflightUI();
}

// ============================================================================
// Exports
// ============================================================================

const PreflightUI = {
    show: showPreflightModal,
    hide: hidePreflightModal,
    run: runPreflightChecks,
    jumpTo: jumpToPreflightItem,
    getResults: () => currentResults
};

// Global
if (typeof window !== 'undefined') {
    window.PreflightUI = PreflightUI;
    window.showPreflightModal = showPreflightModal;
    window.hidePreflightModal = hidePreflightModal;
    window.runPreflightChecks = runPreflightChecks;
    window.toggleCheckDetails = toggleCheckDetails;
    window.jumpToPreflightItem = jumpToPreflightItem;
}

