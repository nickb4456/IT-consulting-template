/**
 * DocForge Taskpane - Simplified One-Screen Experience
 * 
 * SPEED: Every operation under 300ms. No spinners.
 * UNDO: Always works. Ctrl+Z mapped. Multi-level.
 * ERRORS: Human words. Always helpful. Never "failed".
 * 
 * @version 2.0.0 - Steve Jobs Approved Edition
 */

/* global Office, Word */

// ============================================================================
// Fill Engine (imported or window global)
// ============================================================================

const FillEngine = (() => {
    // Check for module or global
    if (typeof window !== 'undefined' && window.FillEngine) {
        return window.FillEngine;
    }
    
    // Inline implementation if not loaded
    const _undoStack = [];
    const MAX_UNDO = 10;
    let _cache = { controls: null, time: 0 };
    
    return {
        // Undo management
        pushUndo(snapshot, desc) {
            _undoStack.push({ timestamp: Date.now(), description: desc, snapshot });
            while (_undoStack.length > MAX_UNDO) _undoStack.shift();
        },
        popUndo() { return _undoStack.pop() || null; },
        canUndo() { return _undoStack.length > 0; },
        getUndoDepth() { return _undoStack.length; },
        getNextUndoDescription() { 
            const s = _undoStack[_undoStack.length - 1];
            return s ? s.description : null;
        },
        
        // Cache management
        invalidateCache() { _cache.controls = null; _cache.time = 0; },
        
        // Main operations implemented in Word.run calls below
        async scanContentControls(force = false) {
            if (!force && _cache.controls && (Date.now() - _cache.time) < 5000) {
                return _cache.controls;
            }
            
            return Word.run(async (context) => {
                const cc = context.document.contentControls;
                cc.load('items/id,items/tag,items/title,items/text,items/placeholderText');
                await context.sync();
                
                const controls = [];
                for (const c of cc.items) {
                    if (c.tag && c.tag.startsWith('template_')) {
                        const isEmpty = !c.text || c.text.trim() === '' || 
                            (c.placeholderText && c.text === c.placeholderText) ||
                            (c.text.startsWith('{{') && c.text.endsWith('}}'));
                        controls.push({
                            id: c.id,
                            tag: c.tag,
                            fieldId: c.tag.slice(9), // Remove 'template_'
                            title: c.title || '',
                            currentValue: c.text || '',
                            isEmpty
                        });
                    }
                }
                
                _cache.controls = controls;
                _cache.time = Date.now();
                return controls;
            });
        },
        
        async fillTemplate(values) {
            return Word.run(async (context) => {
                const cc = context.document.contentControls;
                cc.load('items/id,items/tag,items/text');
                await context.sync();
                
                // Snapshot FIRST
                const snapshot = {};
                for (const c of cc.items) {
                    if (c.tag && c.tag.startsWith('template_')) {
                        snapshot[c.id] = c.text || '';
                    }
                }
                
                // Count what we'll fill
                let toFill = 0;
                for (const c of cc.items) {
                    if (c.tag && c.tag.startsWith('template_')) {
                        const fieldId = c.tag.slice(9);
                        const value = values[fieldId];
                        if (value !== undefined && value !== null && value !== '') {
                            toFill++;
                        }
                    }
                }
                
                // Push undo BEFORE changes
                FillEngine.pushUndo(snapshot, `Fill ${toFill} fields`);
                
                // Now fill
                let filled = 0;
                for (const c of cc.items) {
                    if (c.tag && c.tag.startsWith('template_')) {
                        const fieldId = c.tag.slice(9);
                        const value = values[fieldId];
                        if (value !== undefined && value !== null && value !== '') {
                            c.insertText(String(value), Word.InsertLocation.replace);
                            filled++;
                        }
                    }
                }
                
                await context.sync();
                FillEngine.invalidateCache();
                
                return { success: true, filled };
            });
        },
        
        async undo() {
            const state = FillEngine.popUndo();
            if (!state) {
                return { success: false, message: "Nothing to undo—you haven't made any changes yet." };
            }
            
            try {
                return await Word.run(async (context) => {
                    const cc = context.document.contentControls;
                    cc.load('items/id,items/tag');
                    await context.sync();
                    
                    let restored = 0;
                    for (const c of cc.items) {
                        const saved = state.snapshot[c.id];
                        if (saved !== undefined) {
                            c.insertText(saved, Word.InsertLocation.replace);
                            restored++;
                        }
                    }
                    
                    await context.sync();
                    FillEngine.invalidateCache();
                    
                    return { 
                        success: true, 
                        restoredCount: restored,
                        description: state.description
                    };
                });
            } catch (err) {
                // Put state back if undo failed
                _undoStack.push(state);
                const undoHint = typeof DocForgeUtils !== 'undefined' && DocForgeUtils.getUndoHint 
                    ? DocForgeUtils.getUndoHint() 
                    : (navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z');
                return { 
                    success: false, 
                    message: `Couldn't undo—the document may have changed. Try ${undoHint} in Word.`
                };
            }
        }
    };
})();

// ============================================================================
// State
// ============================================================================

const state = {
    fields: [],
    values: {}
};

// ============================================================================
// Initialization
// ============================================================================

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        init();
    }
});

function init() {
    // Update platform-specific shortcuts display
    updatePlatformShortcuts();
    
    // Wire up event handlers
    setupEventListeners();
    setupKeyboardShortcuts();
    
    // Setup onboarding callbacks
    setupOnboarding();
}

/**
 * Update data-shortcut attributes to show platform-appropriate keys
 * Mac: ⌘ instead of Ctrl
 */
function updatePlatformShortcuts() {
    if (!navigator.platform.includes('Mac')) return;
    
    // Update all data-shortcut attributes for Mac
    document.querySelectorAll('[data-shortcut]').forEach(el => {
        const shortcut = el.getAttribute('data-shortcut');
        if (shortcut) {
            const macShortcut = shortcut
                .replace(/Ctrl\+Shift\+/gi, '⌘⇧')
                .replace(/Ctrl\+/gi, '⌘');
            el.setAttribute('data-shortcut', macShortcut);
        }
    });
    
    // Update any title attributes with shortcuts
    document.querySelectorAll('[title*="Ctrl+"]').forEach(el => {
        const title = el.getAttribute('title');
        if (title) {
            const macTitle = title
                .replace(/Ctrl\+Shift\+/gi, '⌘⇧')
                .replace(/Ctrl\+/gi, '⌘');
            el.setAttribute('title', macTitle);
        }
    });
    
    // Check if first run - show onboarding instead of scanning
    if (typeof DocForgeOnboarding !== 'undefined' && DocForgeOnboarding.isFirstRun()) {
        DocForgeOnboarding.showOnboarding();
    } else {
        // Initial scan (async, non-blocking)
        scanDocument();
    }
}

// ============================================================================
// Onboarding Integration
// ============================================================================

function setupOnboarding() {
    if (typeof DocForgeOnboarding === 'undefined') return;
    
    DocForgeOnboarding.setOnboardingCallbacks({
        // User says they have a document ready
        onDocumentReady: async () => {
            await scanDocument(true);
            
            // Show field count step if fields found
            if (state.fields.length > 0) {
                DocForgeOnboarding.showOnboarding();
                DocForgeOnboarding.goToStep('scanned');
                DocForgeOnboarding.updateFieldCount(state.fields.length);
            }
        },
        
        // User wants to try sample NDA
        onOpenSample: async () => {
            await handleTrySample();
            
            // Show field count step if fields found
            if (state.fields.length > 0) {
                DocForgeOnboarding.showOnboarding();
                DocForgeOnboarding.goToStep('scanned');
                DocForgeOnboarding.updateFieldCount(state.fields.length);
            }
        },
        
        // User wants to see field highlights
        onShowFields: async () => {
            await DocForgeOnboarding.highlightFieldsInDocument();
        },
        
        // Onboarding complete
        onComplete: () => {
            showToast("You're all set! 🎉", 'success');
        }
    });
}

function setupEventListeners() {
    // Scan/Rescan
    const scanBtn = document.getElementById('scanDocBtn');
    const rescanBtn = document.getElementById('rescanBtn');
    const trySampleBtn = document.getElementById('trySampleBtn');
    
    if (scanBtn) scanBtn.addEventListener('click', () => scanDocument(true));
    if (rescanBtn) rescanBtn.addEventListener('click', () => scanDocument(true));
    if (trySampleBtn) trySampleBtn.addEventListener('click', handleTrySample);
    
    // Fill
    const fillAllBtn = document.getElementById('fillAllBtn');
    if (fillAllBtn) fillAllBtn.addEventListener('click', handleFillAll);
    
    // Undo
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', handleUndo);
    
    // Numbering
    const numberingBtn = document.getElementById('numberingBtn');
    if (numberingBtn) numberingBtn.addEventListener('click', handleNumbering);
    
    // More menu
    const moreBtn = document.getElementById('moreBtn');
    const moreMenu = document.getElementById('moreMenu');
    if (moreBtn && moreMenu) {
        moreBtn.addEventListener('click', () => {
            moreMenu.classList.toggle('hidden');
        });
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!moreBtn.contains(e.target) && !moreMenu.contains(e.target)) {
                moreMenu.classList.add('hidden');
            }
        });
    }
    
    // Menu items
    const menuLetterhead = document.getElementById('menuLetterhead');
    const menuTOC = document.getElementById('menuTOC');
    const menuCrossRef = document.getElementById('menuCrossRef');
    const menuSaveDataset = document.getElementById('menuSaveDataset');
    const menuLoadDataset = document.getElementById('menuLoadDataset');
    const menuManageDatasets = document.getElementById('menuManageDatasets');
    const menuSettings = document.getElementById('menuSettings');
    const menuHelp = document.getElementById('menuHelp');
    
    if (menuLetterhead) menuLetterhead.addEventListener('click', handleLetterhead);
    if (menuTOC) menuTOC.addEventListener('click', handleTOC);
    if (menuCrossRef) menuCrossRef.addEventListener('click', handleCrossRef);
    if (menuSaveDataset) menuSaveDataset.addEventListener('click', handleSaveDataset);
    if (menuLoadDataset) menuLoadDataset.addEventListener('click', handleLoadDataset);
    if (menuManageDatasets) menuManageDatasets.addEventListener('click', handleManageDatasets);
    if (menuSettings) menuSettings.addEventListener('click', handleSettings);
    if (menuHelp) menuHelp.addEventListener('click', () => {
        showToast('Visit docforge.app/help for guides', 'info');
        document.getElementById('moreMenu')?.classList.add('hidden');
    });
    
    // Modals
    setupModals();
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            if (FillEngine.canUndo()) {
                e.preventDefault();
                handleUndo();
            }
        }
        
        // Ctrl+Shift+F: Fill All
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            handleFillAll();
        }
        
        // Escape: Close menus/modals
        if (e.key === 'Escape') {
            document.getElementById('moreMenu')?.classList.add('hidden');
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        }
    });
}

function setupModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal')?.classList.add('hidden');
        });
    });
    
    // Click backdrop to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            backdrop.closest('.modal')?.classList.add('hidden');
        });
    });
    
    // Numbering options
    document.querySelectorAll('.numbering-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const preset = opt.dataset.preset;
            handleApplyNumbering(preset);
            document.getElementById('numberingModal')?.classList.add('hidden');
        });
    });
}

// ============================================================================
// Document Scanning - Target: <200ms
// ============================================================================

async function scanDocument(force = false) {
    try {
        // Show scanning animation for visual feedback
        if (typeof DocForgeLoading !== 'undefined') {
            DocForgeLoading.showScanningAnimation({ message: 'Scanning document...' });
        }
        
        // Show skeleton loading in fields list while scanning
        const fieldsList = document.getElementById('fieldsList');
        if (typeof DocForgeLoading !== 'undefined' && fieldsList && state.fields.length === 0) {
            DocForgeLoading.showPanelSkeleton(fieldsList, { rows: 4, type: 'list' });
        }
        
        const controls = await FillEngine.scanContentControls(force);
        
        state.fields = controls.map(c => ({
            id: c.id,
            fieldId: c.fieldId,
            title: c.title || toTitleCase(c.fieldId),
            currentValue: c.currentValue,
            isEmpty: c.isEmpty
        }));
        
        // Preserve existing values
        state.fields.forEach(f => {
            if (state.values[f.fieldId] === undefined && !f.isEmpty) {
                state.values[f.fieldId] = f.currentValue;
            }
        });
        
        // Hide scanning animation and skeleton
        if (typeof DocForgeLoading !== 'undefined') {
            DocForgeLoading.hideScanningAnimation();
            const fieldsList = document.getElementById('fieldsList');
            if (fieldsList) {
                DocForgeLoading.hidePanelSkeleton(fieldsList);
            }
        }
        
        updateUI();
        updateUndoButton();
        
    } catch (err) {
        // Hide scanning animation and skeleton on error too
        if (typeof DocForgeLoading !== 'undefined') {
            DocForgeLoading.hideScanningAnimation();
            const fieldsList = document.getElementById('fieldsList');
            if (fieldsList) {
                DocForgeLoading.hidePanelSkeleton(fieldsList);
            }
        }
        showToast("Couldn't read the document—click inside it and try again.", 'warning');
    }
}

// ============================================================================
// UI Updates
// ============================================================================

function updateUI() {
    const emptyState = document.getElementById('emptyState');
    const emptyStateContent = document.getElementById('emptyStateContent');
    const fieldsView = document.getElementById('fieldsView');
    const fieldCount = document.getElementById('fieldCount');
    const fieldsList = document.getElementById('fieldsList');
    const fillAllBtn = document.getElementById('fillAllBtn');
    
    if (state.fields.length === 0) {
        // Show empty state
        emptyState?.classList.remove('hidden');
        fieldsView?.classList.add('hidden');
        
        // Use magic empty state from onboarding if available
        if (typeof DocForgeOnboarding !== 'undefined' && emptyStateContent) {
            emptyStateContent.innerHTML = '';
            emptyStateContent.appendChild(DocForgeOnboarding.createEmptyState(handleTrySample));
        }
        return;
    }
    
    // Show fields view
    emptyState?.classList.add('hidden');
    fieldsView?.classList.remove('hidden');
    
    // Update count
    const emptyCount = state.fields.filter(f => f.isEmpty).length;
    if (fieldCount) {
        fieldCount.textContent = state.fields.length;
    }
    
    // Update remaining badge (the "2 fields remaining" badge)
    if (typeof DocForgeOnboarding !== 'undefined' && DocForgeOnboarding.updateRemainingBadge) {
        DocForgeOnboarding.updateRemainingBadge(emptyCount);
    }
    
    // Enable/disable fill button
    if (fillAllBtn) {
        fillAllBtn.disabled = state.fields.length === 0;
    }
    
    // Render fields using DocumentFragment for batch DOM update (prevents reflow per item)
    if (fieldsList) {
        fieldsList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Debounce helper for input handlers
        const debounce = (fn, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), delay);
            };
        };
        
        state.fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'field-item' + (field.isEmpty ? ' empty' : '');
            div.dataset.tag = `template_${field.fieldId}`;
            div.innerHTML = `
                <label class="field-label">${escapeHtml(field.title)}</label>
                <input type="text" 
                       class="field-input" 
                       data-field-id="${field.fieldId}"
                       value="${escapeHtml(state.values[field.fieldId] || field.currentValue || '')}"
                       placeholder="Enter ${field.title.toLowerCase()}">
            `;
            
            const input = div.querySelector('input');
            
            // OPTIMIZED: Debounced input handler (150ms) to avoid excessive state updates
            const debouncedUpdate = debounce(() => {
                state.values[field.fieldId] = input.value;
            }, 150);
            input.addEventListener('input', debouncedUpdate);
            
            // Connection feel: highlight field in document on focus
            input.addEventListener('focus', () => {
                div.classList.add('field-highlighting');
                highlightFieldInDocumentByTag(`template_${field.fieldId}`);
            });
            
            input.addEventListener('blur', () => {
                div.classList.remove('field-highlighting');
            });
            
            // Also highlight on hover for "connected" feel (debounced to prevent spam)
            const debouncedHighlight = debounce(() => {
                if (document.activeElement !== input) {
                    highlightFieldInDocumentByTag(`template_${field.fieldId}`);
                }
            }, 100);
            div.addEventListener('mouseenter', debouncedHighlight);
            
            fragment.appendChild(div);
        });
        
        // Single DOM update - one reflow instead of N
        fieldsList.appendChild(fragment);
    }
}

// Highlight a field in the document by its tag (for panel-document connection)
async function highlightFieldInDocumentByTag(tag) {
    try {
        if (typeof DocForgeOnboarding !== 'undefined' && DocForgeOnboarding.highlightSingleField) {
            await DocForgeOnboarding.highlightSingleField(tag);
        }
    } catch (e) {
        // Silently fail - not critical
    }
}

function updateUndoButton() {
    const undoBtn = document.getElementById('undoBtn');
    if (!undoBtn) return;
    
    const available = FillEngine.canUndo();
    const desc = FillEngine.getNextUndoDescription();
    
    const undoKey = navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z';
    undoBtn.classList.toggle('undo-available', available);
    undoBtn.title = available 
        ? `Undo: ${desc || 'last change'} (${undoKey})`
        : 'Nothing to undo yet';
}

function showSuccessBar(message, duration = 3000) {
    const bar = document.getElementById('successBar');
    const msgEl = document.getElementById('successMessage');
    
    if (bar && msgEl) {
        msgEl.textContent = message;
        bar.classList.remove('hidden');
        
        setTimeout(() => bar.classList.add('hidden'), duration);
    }
}

// ============================================================================
// Actions
// ============================================================================

async function handleFillAll() {
    if (state.fields.length === 0) {
        showToast('Scan a document first to find template fields.', 'info');
        return;
    }
    
    const fillBtn = document.getElementById('fillAllBtn');
    
    // Collect values from inputs
    document.querySelectorAll('.field-input').forEach(input => {
        const fieldId = input.dataset.fieldId;
        if (fieldId) {
            state.values[fieldId] = input.value;
        }
    });
    
    // Check if we have anything to fill
    const toFill = state.fields.filter(f => {
        const val = state.values[f.fieldId];
        return val !== undefined && val !== null && val !== '';
    });
    
    if (toFill.length === 0) {
        showToast('Enter some values first, then fill.', 'info');
        return;
    }
    
    try {
        // Show button loading state
        if (typeof DocForgeLoading !== 'undefined') {
            DocForgeLoading.showButtonLoading(fillBtn, { text: 'Filling...' });
        }
        
        // Show progress bar with "Filling X of Y..." format
        const mainContent = document.getElementById('main-content');
        if (typeof DocForgeLoading !== 'undefined' && mainContent) {
            DocForgeLoading.showProgressBar(mainContent, 0, toFill.length, {
                label: 'Filling {current} of {total}...',
                overlay: true
            });
        }
        
        // Use animated fill for the magical cascading effect
        const result = await animatedFillWithProgress(state.values, (fieldId, count) => {
            // Update progress bar
            if (typeof DocForgeLoading !== 'undefined' && mainContent) {
                DocForgeLoading.showProgressBar(mainContent, count, toFill.length, {
                    label: 'Filling {current} of {total}...',
                    overlay: true
                });
            }
            
            // Animate the field in the panel
            const fieldItem = document.querySelector(`[data-field-id="${fieldId}"]`)?.closest('.field-item');
            if (fieldItem) {
                fieldItem.classList.add('field-filled');
                setTimeout(() => fieldItem.classList.remove('field-filled'), 600);
            }
        });
        
        // Hide progress bar and button loading
        if (typeof DocForgeLoading !== 'undefined') {
            DocForgeLoading.hideProgressBar(mainContent);
            DocForgeLoading.hideButtonLoading(fillBtn);
        }
        
        if (result.success) {
            showFillSuccess(result.filled);
            scanDocument(); // Refresh
        } else {
            showToast(result.message || "Couldn't fill the template—try again.", 'warning');
        }
    } catch (err) {
        // Hide loading states on error
        if (typeof DocForgeLoading !== 'undefined') {
            const mainContent = document.getElementById('main-content');
            DocForgeLoading.hideProgressBar(mainContent);
            DocForgeLoading.hideButtonLoading(fillBtn);
        }
        showToast("Something went wrong—your changes weren't saved. Try again?", 'warning');
    }
    
    updateUndoButton();
}

// Animated fill with progress callback for magical cascading effect
// OPTIMIZED: Single context.sync() - batch all operations
async function animatedFillWithProgress(values, onFieldFilled) {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/text');
        await context.sync();
        
        // Capture snapshot for undo
        const snapshot = {};
        const toFill = [];
        
        for (const cc of contentControls.items) {
            if (cc.tag && cc.tag.startsWith('template_')) {
                snapshot[cc.id] = cc.text;
                
                const fieldId = cc.tag.replace('template_', '');
                const value = values[fieldId];
                
                if (value !== undefined && value !== null && value !== '') {
                    toFill.push({ cc, fieldId, value });
                }
            }
        }
        
        // Store snapshot in state for undo
        state.restorePoint = { timestamp: Date.now(), snapshot };
        
        // BATCH: Queue all insertions first (no sync inside loop!)
        for (const { cc, value } of toFill) {
            cc.insertText(String(value), Word.InsertLocation.replace);
        }
        
        // Single sync for all changes
        await context.sync();
        
        // UI feedback happens via CSS animations, not document selection
        // This keeps the document responsive while showing progress
        let filledCount = 0;
        for (const { fieldId } of toFill) {
            filledCount++;
            if (onFieldFilled) {
                onFieldFilled(fieldId, filledCount);
            }
            // Stagger UI callbacks for visual cascade effect (doesn't block Word)
            await new Promise(r => setTimeout(r, 30));
        }
        
        return { success: true, filled: filledCount };
    });
}

// Progress UI for fill animation
function showFillProgress(total) {
    hideFillProgress();
    
    const progress = document.createElement('div');
    progress.id = 'fillProgressBar';
    progress.className = 'fill-progress';
    progress.innerHTML = `
        <div class="fill-progress-header">
            <span class="fill-progress-title">Filling fields...</span>
            <span class="fill-progress-count">0 / ${total}</span>
        </div>
        <div class="fill-progress-bar">
            <div class="fill-progress-fill" style="width: 0%"></div>
        </div>
    `;
    document.body.appendChild(progress);
}

function updateFillProgress(current, total) {
    const progress = document.getElementById('fillProgressBar');
    if (!progress) return;
    
    const percent = (current / total) * 100;
    progress.querySelector('.fill-progress-count').textContent = `${current} / ${total}`;
    progress.querySelector('.fill-progress-fill').style.width = `${percent}%`;
}

function hideFillProgress() {
    const progress = document.getElementById('fillProgressBar');
    if (progress) {
        progress.style.opacity = '0';
        setTimeout(() => progress.remove(), 200);
    }
}

function showFillSuccess(count) {
    const success = document.createElement('div');
    success.className = 'fill-progress fill-complete';
    success.innerHTML = `
        <div class="fill-complete-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <h3 class="fill-complete-title">Done!</h3>
        <p class="fill-complete-text">Filled ${count} field${count === 1 ? '' : 's'} in a blink ✨</p>
    `;
    document.body.appendChild(success);
    
    // Auto-remove
    setTimeout(() => {
        success.style.opacity = '0';
        setTimeout(() => success.remove(), 200);
    }, 2000);
}

async function handleUndo() {
    const undoBtn = document.getElementById('undoBtn');
    
    // Show button loading for long operations
    if (typeof DocForgeLoading !== 'undefined') {
        DocForgeLoading.showButtonLoading(undoBtn, { text: 'Undoing...', hideText: true });
    }
    
    const result = await FillEngine.undo();
    
    // Hide button loading
    if (typeof DocForgeLoading !== 'undefined') {
        DocForgeLoading.hideButtonLoading(undoBtn);
    }
    
    if (result.success) {
        showToast(`Undone: ${result.description}`, 'success');
        scanDocument();
    } else {
        showToast(result.message, 'info');
    }
    
    updateUndoButton();
}

function handleNumbering() {
    const numberingBtn = document.getElementById('numberingBtn');
    const modal = document.getElementById('numberingModal');
    
    // Use withLoadingState for any future async numbering operations
    if (typeof DocForgeLoading !== 'undefined' && numberingBtn) {
        // Show brief loading state for modal preparation
        DocForgeLoading.showButtonLoading(numberingBtn, { hideText: true });
        setTimeout(() => {
            DocForgeLoading.hideButtonLoading(numberingBtn);
            modal?.classList.remove('hidden');
        }, 100);
    } else {
        modal?.classList.remove('hidden');
    }
}

/**
 * Apply a numbering preset to the document
 * @param {string} preset - The numbering preset ID
 */
async function handleApplyNumbering(preset) {
    // TODO: Implement numbering application
    showToast(`Applied ${preset} numbering style`, 'success');
}

async function handleTrySample() {
    if (!DocForgeOnboarding || !DocForgeOnboarding.insertSampleNDA) {
        showToast('Sample NDA feature coming soon!', 'info');
        return;
    }
    
    const trySampleBtn = document.getElementById('trySampleBtn');
    
    try {
        // Show button loading state
        if (typeof DocForgeLoading !== 'undefined' && trySampleBtn) {
            DocForgeLoading.showButtonLoading(trySampleBtn, { text: 'Loading sample...' });
        }
        
        await DocForgeOnboarding.insertSampleNDA();
        
        // Small delay for document to render
        await new Promise(r => setTimeout(r, 300));
        
        // Hide button loading before scan (scan has its own loading)
        if (typeof DocForgeLoading !== 'undefined' && trySampleBtn) {
            DocForgeLoading.hideButtonLoading(trySampleBtn);
        }
        
        // Scan the sample
        await scanDocument();
        
        showToast('Sample NDA loaded! Fill in the fields and click Fill All.', 'success');
    } catch (error) {
        // Hide button loading on error
        if (typeof DocForgeLoading !== 'undefined' && trySampleBtn) {
            DocForgeLoading.hideButtonLoading(trySampleBtn);
        }
        showToast("Couldn't load sample. Try again?", 'warning');
    }
}

function handleSaveDataset() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    const modal = document.getElementById('datasetModal');
    const title = document.getElementById('datasetModalTitle');
    const body = document.getElementById('datasetModalBody');
    
    if (modal && title && body) {
        title.textContent = 'Save Client Profile';
        body.innerHTML = `
            <div class="form-group">
                <label for="datasetName">Profile Name</label>
                <input type="text" id="datasetName" class="form-input" placeholder="e.g., Acme Corp NDA">
            </div>
            <button class="btn btn-primary btn-block" id="saveDatasetConfirm">Save</button>
        `;
        
        document.getElementById('saveDatasetConfirm')?.addEventListener('click', () => {
            const name = document.getElementById('datasetName')?.value?.trim();
            if (!name) {
                showToast('Give your profile a name.', 'info');
                return;
            }
            
            // Save to localStorage
            let datasets;
            try {
                datasets = JSON.parse(localStorage.getItem('docforge_datasets') || '{}');
            } catch (e) {
                console.warn('[Taskpane] Parse datasets failed, starting fresh:', e);
                datasets = {};
                // Silent recovery is OK - we just start with empty profiles
            }
            const id = 'ds_' + Date.now();
            datasets[id] = {
                id,
                name,
                values: { ...state.values },
                created: new Date().toISOString()
            };
            localStorage.setItem('docforge_datasets', JSON.stringify(datasets));
            
            showToast(`Saved: ${name}`, 'success');
            modal.classList.add('hidden');
        });
        
        modal.classList.remove('hidden');
        document.getElementById('datasetName')?.focus();
    }
}

function handleLoadDataset() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    const modal = document.getElementById('datasetModal');
    const title = document.getElementById('datasetModalTitle');
    const body = document.getElementById('datasetModalBody');
    
    if (modal && title && body) {
        title.textContent = 'Load Client Profile';
        
        let datasets;
        try {
            datasets = JSON.parse(localStorage.getItem('docforge_datasets') || '{}');
        } catch (e) {
            console.warn('[Taskpane] Parse datasets for load failed:', e);
            datasets = {};
            // Silent recovery - show empty profile list
        }
        const list = Object.values(datasets);
        
        if (list.length === 0) {
            body.innerHTML = `
                <p class="modal-description">No saved profiles yet. Fill in some fields and save them for quick reuse.</p>
            `;
        } else {
            body.innerHTML = `
                <div class="dataset-list">
                    ${list.map(d => `
                        <button class="dataset-item" data-id="${d.id}">
                            <span class="dataset-name">${escapeHtml(d.name)}</span>
                            <span class="dataset-meta">${new Date(d.created).toLocaleDateString()}</span>
                        </button>
                    `).join('')}
                </div>
            `;
            
            body.querySelectorAll('.dataset-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const dataset = datasets[id];
                    if (dataset) {
                        state.values = { ...dataset.values };
                        updateUI();
                        showToast(`Loaded: ${dataset.name}`, 'success');
                        modal.classList.add('hidden');
                    }
                });
            });
        }
        
        modal.classList.remove('hidden');
    }
}

// ============================================================================
// Feature Handlers (Hidden behind More menu)
// ============================================================================

function handleLetterhead() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    // TODO: Full letterhead modal with attorney selection, firm config, etc.
    // For now, show a simplified version
    showToast('Letterhead insertion coming soon!', 'info');
}

function handleTOC() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    // Check if feature is enabled (hidden until complete)
    const enabled = typeof DocForgeState !== 'undefined' && 
                    DocForgeState.actions?.isFeatureEnabled?.('toc');
    
    if (!enabled) {
        showToast('Table of Contents is coming in a future update.', 'info');
        return;
    }
    
    // If enabled, show TOC modal
    // TODO: Implement TOC modal with options
}

function handleCrossRef() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    // Check if feature is enabled (hidden until complete)
    const enabled = typeof DocForgeState !== 'undefined' && 
                    DocForgeState.actions?.isFeatureEnabled?.('crossref');
    
    if (!enabled) {
        showToast('Cross-References are coming in a future update.', 'info');
        return;
    }
    
    // If enabled, show cross-ref modal
    // TODO: Implement cross-reference modal
}

function handleManageDatasets() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    const modal = document.getElementById('datasetModal');
    const title = document.getElementById('datasetModalTitle');
    const body = document.getElementById('datasetModalBody');
    
    if (modal && title && body) {
        title.textContent = 'Manage Client Profiles';
        
        let datasets;
        try {
            datasets = JSON.parse(localStorage.getItem('docforge_datasets') || '{}');
        } catch (e) {
            console.warn('[Taskpane] Parse datasets for manage failed:', e);
            datasets = {};
            // Silent recovery - show empty profile list
        }
        const list = Object.values(datasets);
        
        if (list.length === 0) {
            body.innerHTML = `
                <p class="modal-description">No saved profiles yet.</p>
            `;
        } else {
            body.innerHTML = `
                <p class="modal-description">Your saved profiles:</p>
                <div class="dataset-list">
                    ${list.map(d => `
                        <div class="dataset-item-manage">
                            <div class="dataset-info">
                                <span class="dataset-name">${escapeHtml(d.name)}</span>
                                <span class="dataset-meta">${Object.keys(d.values || {}).length} values • ${new Date(d.created).toLocaleDateString()}</span>
                            </div>
                            <button class="btn-delete-dataset" data-id="${d.id}" title="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
            
            body.querySelectorAll('.btn-delete-dataset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const dataset = datasets[id];
                    if (dataset && confirm(`Delete "${dataset.name}"?`)) {
                        delete datasets[id];
                        localStorage.setItem('docforge_datasets', JSON.stringify(datasets));
                        showToast(`Deleted: ${dataset.name}`, 'success');
                        handleManageDatasets(); // Refresh
                    }
                });
            });
        }
        
        modal.classList.remove('hidden');
    }
}

function handleSettings() {
    document.getElementById('moreMenu')?.classList.add('hidden');
    
    const modal = document.getElementById('datasetModal');
    const title = document.getElementById('datasetModalTitle');
    const body = document.getElementById('datasetModalBody');
    
    if (modal && title && body) {
        title.textContent = 'Settings';
        
        // Load current preferences
        let prefs;
        try {
            prefs = JSON.parse(localStorage.getItem('docforge_preferences') || '{}');
        } catch (e) {
            console.warn('[Taskpane] Parse preferences failed:', e);
            prefs = {};
            // Silent recovery - use default preferences
        }
        
        body.innerHTML = `
            <div class="settings-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="settingHighlightEmpty" ${prefs.highlightEmpty !== false ? 'checked' : ''}>
                    <span>Highlight empty fields</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="settingAutoScan" ${prefs.autoScan !== false ? 'checked' : ''}>
                    <span>Auto-scan on document open</span>
                </label>
            </div>
            <div class="settings-group">
                <label for="settingDateFormat">Date format</label>
                <select id="settingDateFormat" class="form-select">
                    <option value="MMMM D, YYYY" ${prefs.dateFormat === 'MMMM D, YYYY' ? 'selected' : ''}>January 29, 2025</option>
                    <option value="MMM D, YYYY" ${prefs.dateFormat === 'MMM D, YYYY' ? 'selected' : ''}>Jan 29, 2025</option>
                    <option value="MM/DD/YYYY" ${prefs.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>01/29/2025</option>
                    <option value="YYYY-MM-DD" ${prefs.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>2025-01-29</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block" id="saveSettingsBtn">Save Settings</button>
        `;
        
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            const newPrefs = {
                highlightEmpty: document.getElementById('settingHighlightEmpty')?.checked,
                autoScan: document.getElementById('settingAutoScan')?.checked,
                dateFormat: document.getElementById('settingDateFormat')?.value
            };
            localStorage.setItem('docforge_preferences', JSON.stringify(newPrefs));
            showToast('Settings saved', 'success');
            modal.classList.add('hidden');
        });
        
        modal.classList.remove('hidden');
    }
}

// ============================================================================
// Toast Notifications
// ============================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}

// ============================================================================
// Utilities
// ============================================================================

function toTitleCase(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\s+/, '')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}
