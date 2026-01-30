/**
 * DocForge Taskpane - Polished Interactions
 * 
 * One job: Help lawyers fill templates faster.
 * 
 * Interaction design principles:
 * - Immediate feedback for all user actions (<100ms)
 * - Loading states that reduce perceived wait time
 * - Success/error states that help users understand outcomes
 * - Subtle animations that feel professional, not playful
 * 
 * @version 4.2.0 - Micro-interactions Edition
 */

/* global Office, Word */

// ============================================================================
// Templates
// ============================================================================

const TEMPLATES = {
    nda: {
        name: 'Non-Disclosure Agreement',
        shortName: 'NDA',
        fields: [
            { id: 'disclosingParty', label: 'Disclosing Party' },
            { id: 'receivingParty', label: 'Receiving Party' },
            { id: 'effectiveDate', label: 'Effective Date' },
            { id: 'confidentialInfo', label: 'Confidential Information Description' },
            { id: 'term', label: 'Term (Years)' },
            { id: 'governingLaw', label: 'Governing Law (State)' }
        ]
    },
    employment: {
        name: 'Employment Agreement',
        shortName: 'Employment',
        fields: [
            { id: 'employerName', label: 'Employer Name' },
            { id: 'employeeName', label: 'Employee Name' },
            { id: 'jobTitle', label: 'Job Title' },
            { id: 'startDate', label: 'Start Date' },
            { id: 'salary', label: 'Annual Salary' },
            { id: 'workLocation', label: 'Work Location' }
        ]
    },
    service: {
        name: 'Service Agreement',
        shortName: 'Service',
        fields: [
            { id: 'providerName', label: 'Service Provider' },
            { id: 'clientName', label: 'Client Name' },
            { id: 'serviceDescription', label: 'Services Description' },
            { id: 'compensation', label: 'Compensation' },
            { id: 'startDate', label: 'Start Date' },
            { id: 'endDate', label: 'End Date' }
        ]
    },
    lease: {
        name: 'Lease Agreement',
        shortName: 'Lease',
        fields: [
            { id: 'landlordName', label: 'Landlord Name' },
            { id: 'tenantName', label: 'Tenant Name' },
            { id: 'propertyAddress', label: 'Property Address' },
            { id: 'monthlyRent', label: 'Monthly Rent' },
            { id: 'leaseStart', label: 'Lease Start Date' },
            { id: 'leaseEnd', label: 'Lease End Date' }
        ]
    },
    billOfSale: {
        name: 'Bill of Sale',
        shortName: 'Bill of Sale',
        fields: [
            { id: 'sellerName', label: 'Seller Name' },
            { id: 'buyerName', label: 'Buyer Name' },
            { id: 'itemDescription', label: 'Item Description' },
            { id: 'salePrice', label: 'Sale Price' },
            { id: 'saleDate', label: 'Sale Date' }
        ]
    },
    poa: {
        name: 'Power of Attorney',
        shortName: 'POA',
        fields: [
            { id: 'principalName', label: 'Principal Name' },
            { id: 'agentName', label: 'Agent Name' },
            { id: 'powers', label: 'Powers Granted' },
            { id: 'effectiveDate', label: 'Effective Date' },
            { id: 'expirationDate', label: 'Expiration Date' }
        ]
    }
};

// ============================================================================
// State
// ============================================================================

let currentTemplate = null;
let fieldValues = {};
let undoStack = [];
const MAX_UNDO = 10;

// ============================================================================
// Init
// ============================================================================

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        init();
    }
});

function init() {
    // Template selection with loading state
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => selectTemplate(card.dataset.template, card));
    });
    
    // Back button
    document.getElementById('backBtn')?.addEventListener('click', goHome);
    
    // Fill button
    document.getElementById('fillAllBtn')?.addEventListener('click', fillAll);
    
    // Undo button
    document.getElementById('undoBtn')?.addEventListener('click', handleUndo);
    
    // Scan document button
    document.getElementById('scanDocBtn')?.addEventListener('click', scanDocument);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Global keyboard shortcuts
 */
function handleKeyboard(e) {
    // Escape to go back
    if (e.key === 'Escape' && currentTemplate) {
        goHome();
    }
    
    // Ctrl/Cmd + Enter to fill all
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentTemplate) {
        e.preventDefault();
        fillAll();
    }
    
    // Ctrl/Cmd + Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (undoStack.length > 0) {
            e.preventDefault();
            handleUndo();
        }
    }
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Select a template and show fields view
 */
async function selectTemplate(templateId, card) {
    const template = TEMPLATES[templateId];
    if (!template) return;
    
    // Show loading state on card
    if (card) {
        card.classList.add('loading');
        card.setAttribute('aria-busy', 'true');
    }
    
    announce(`Loading ${template.shortName} template`);
    
    currentTemplate = templateId;
    fieldValues = {};
    undoStack = [];
    
    // Update title and field count
    document.getElementById('templateTitle').textContent = template.shortName || template.name;
    updateFieldCount(template.fields.length, template.fields.length);
    
    // Show skeleton loading
    const list = document.getElementById('fieldsList');
    list.innerHTML = template.fields.map(() => `
        <div class="field-group skeleton-field skeleton"></div>
    `).join('');
    
    // Switch view for perceived speed
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('fieldsView').classList.remove('hidden');
    
    // Insert template into document
    await insertTemplate(templateId);
    
    // Remove card loading state
    if (card) {
        card.classList.remove('loading');
        card.setAttribute('aria-busy', 'false');
    }
    
    // Render actual fields
    renderFields(template);
    
    // Focus first field after animation settles
    setTimeout(() => {
        const firstInput = list.querySelector('.field-input');
        if (firstInput) firstInput.focus();
    }, 150);
    
    // Update undo button state
    updateUndoButton();
    
    announce(`${template.shortName} loaded with ${template.fields.length} fields`);
}

/**
 * Render field inputs
 */
function renderFields(template) {
    const list = document.getElementById('fieldsList');
    
    list.innerHTML = template.fields.map((field, index) => `
        <div class="field-group" data-field-id="${field.id}" style="animation-delay: ${index * 50}ms">
            <label class="field-label" for="field-${field.id}">${escapeHtml(field.label)}</label>
            <input type="text" 
                   id="field-${field.id}"
                   class="field-input" 
                   data-field="${field.id}"
                   placeholder="Enter ${field.label.toLowerCase()}"
                   autocomplete="off">
        </div>
    `).join('');
    
    // Wire up inputs
    list.querySelectorAll('.field-input').forEach(input => {
        input.addEventListener('input', debounce(() => {
            fieldValues[input.dataset.field] = input.value;
            updateEmptyState(input);
            updateFieldCount();
        }, 150));
        
        input.addEventListener('blur', () => {
            if (!input.value.trim()) {
                input.closest('.field-group').classList.add('empty');
            }
        });
        
        input.addEventListener('focus', () => {
            input.closest('.field-group').classList.remove('empty');
        });
    });
}

/**
 * Navigate back to home
 */
function goHome() {
    currentTemplate = null;
    fieldValues = {};
    
    document.getElementById('fieldsView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    
    // Focus first template card
    setTimeout(() => {
        document.querySelector('.template-card')?.focus();
    }, 100);
    
    announce('Returned to template selection');
}

// ============================================================================
// Document Operations
// ============================================================================

/**
 * Insert template into Word document
 */
async function insertTemplate(templateId) {
    const template = TEMPLATES[templateId];
    if (!template) return;
    
    try {
        await Word.run(async (context) => {
            const body = context.document.body;
            
            const title = body.insertParagraph(template.name.toUpperCase(), Word.InsertLocation.end);
            title.styleBuiltIn = Word.BuiltInStyle.title;
            
            body.insertParagraph('', Word.InsertLocation.end);
            
            for (const field of template.fields) {
                const para = body.insertParagraph('', Word.InsertLocation.end);
                
                const label = para.insertText(`${field.label}: `, Word.InsertLocation.end);
                label.font.bold = true;
                
                const cc = para.insertContentControl();
                cc.tag = `template_${field.id}`;
                cc.title = field.label;
                cc.placeholderText = `[Enter ${field.label}]`;
                cc.appearance = Word.ContentControlAppearance.boundingBox;
            }
            
            await context.sync();
        });
    } catch (err) {
        console.error('Insert template error:', err);
        showToast('Could not insert template. Click inside the document first.', 'error');
    }
}

/**
 * Scan existing document for content controls
 */
async function scanDocument() {
    const btn = document.getElementById('scanDocBtn');
    
    btn.classList.add('loading');
    btn.disabled = true;
    announce('Scanning document for fields');
    
    try {
        const fields = await Word.run(async (context) => {
            const cc = context.document.contentControls;
            cc.load('items/id,items/tag,items/title,items/text,items/placeholderText');
            await context.sync();
            
            const foundFields = [];
            for (const c of cc.items) {
                if (c.tag && c.tag.startsWith('template_')) {
                    foundFields.push({
                        id: c.tag.replace('template_', ''),
                        label: c.title || toTitleCase(c.tag.replace('template_', '')),
                        currentValue: c.text || ''
                    });
                }
            }
            return foundFields;
        });
        
        if (fields.length === 0) {
            showToast('No template fields found in this document', 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
            return;
        }
        
        // Create a custom template from scanned fields
        const scannedTemplate = {
            name: 'Scanned Document',
            shortName: 'Scanned',
            fields: fields
        };
        
        currentTemplate = 'scanned';
        TEMPLATES.scanned = scannedTemplate;
        fieldValues = {};
        
        // Pre-fill existing values
        fields.forEach(f => {
            if (f.currentValue && !f.currentValue.startsWith('[')) {
                fieldValues[f.id] = f.currentValue;
            }
        });
        
        // Switch to fields view
        document.getElementById('templateTitle').textContent = 'Scanned Document';
        updateFieldCount(fields.length, fields.length);
        renderFields(scannedTemplate);
        
        document.getElementById('homeView').classList.add('hidden');
        document.getElementById('fieldsView').classList.remove('hidden');
        
        setTimeout(() => {
            document.querySelector('.field-input')?.focus();
        }, 150);
        
        showToast(`Found ${fields.length} fields`, 'success');
        announce(`Found ${fields.length} fields in document`);
        
    } catch (err) {
        console.error('Scan error:', err);
        showToast('Could not scan document. Make sure it is open.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/**
 * Fill all fields in the document
 */
async function fillAll() {
    const template = TEMPLATES[currentTemplate];
    if (!template) return;
    
    const btn = document.getElementById('fillAllBtn');
    
    // Collect values
    document.querySelectorAll('.field-input').forEach(input => {
        if (input.value.trim()) {
            fieldValues[input.dataset.field] = input.value.trim();
        }
    });
    
    const toFill = Object.keys(fieldValues).length;
    if (toFill === 0) {
        showToast('Enter some values first', 'error');
        highlightEmptyFields();
        return;
    }
    
    // Show loading state
    btn.classList.add('loading');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    
    const overlay = showFillProgress(toFill);
    
    try {
        await Word.run(async (context) => {
            const contentControls = context.document.contentControls;
            contentControls.load('items/id,items/tag,items/text');
            await context.sync();
            
            // Capture state for undo
            const previousState = {};
            for (const cc of contentControls.items) {
                if (cc.tag && cc.tag.startsWith('template_')) {
                    previousState[cc.tag] = cc.text;
                }
            }
            
            let filled = 0;
            for (const cc of contentControls.items) {
                if (cc.tag && cc.tag.startsWith('template_')) {
                    const fieldId = cc.tag.replace('template_', '');
                    const value = fieldValues[fieldId];
                    
                    if (value) {
                        cc.insertText(value, Word.InsertLocation.replace);
                        filled++;
                        
                        updateFillProgress(overlay, filled, toFill);
                        animateFieldFilled(fieldId);
                        
                        await new Promise(r => setTimeout(r, 40));
                    }
                }
            }
            
            await context.sync();
            
            // Save to undo stack
            pushUndo(previousState, `Fill ${filled} fields`);
            updateUndoButton();
            
            showFillComplete(overlay, filled);
            
            // Button success flash
            btn.classList.remove('loading');
            btn.classList.add('success');
            setTimeout(() => btn.classList.remove('success'), 500);
            
            announce(`Filled ${filled} fields`);
        });
    } catch (err) {
        console.error('Fill error:', err);
        hideFillProgress(overlay);
        showToast('Could not fill fields. Make sure the document is active.', 'error');
    } finally {
        btn.disabled = false;
        btn.setAttribute('aria-busy', 'false');
    }
}

/**
 * Handle undo action
 */
async function handleUndo() {
    const state = undoStack.pop();
    if (!state) {
        showToast('Nothing to undo', 'info');
        return;
    }
    
    const btn = document.getElementById('undoBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        await Word.run(async (context) => {
            const contentControls = context.document.contentControls;
            contentControls.load('items/tag');
            await context.sync();
            
            let restored = 0;
            for (const cc of contentControls.items) {
                const savedValue = state.snapshot[cc.tag];
                if (savedValue !== undefined) {
                    cc.insertText(savedValue, Word.InsertLocation.replace);
                    restored++;
                }
            }
            
            await context.sync();
            
            showToast(`Undone: ${state.description}`, 'success');
            announce(`Undone: ${state.description}`);
        });
    } catch (err) {
        console.error('Undo error:', err);
        undoStack.push(state); // Put it back
        showToast('Could not undo. Try Word\'s built-in undo.', 'error');
    } finally {
        btn.classList.remove('loading');
        updateUndoButton();
    }
}

// ============================================================================
// Undo Stack Management
// ============================================================================

function pushUndo(snapshot, description) {
    undoStack.push({
        snapshot,
        description,
        timestamp: Date.now()
    });
    
    while (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }
}

function updateUndoButton() {
    const btn = document.getElementById('undoBtn');
    if (!btn) return;
    
    const hasUndo = undoStack.length > 0;
    btn.disabled = !hasUndo;
    
    if (hasUndo) {
        const lastAction = undoStack[undoStack.length - 1];
        btn.title = `Undo: ${lastAction.description}`;
        btn.classList.add('has-undo');
    } else {
        btn.title = 'Nothing to undo';
        btn.classList.remove('has-undo');
    }
}

// ============================================================================
// UI Feedback
// ============================================================================

function highlightEmptyFields() {
    document.querySelectorAll('.field-input').forEach(input => {
        if (!input.value.trim()) {
            input.closest('.field-group').classList.add('empty');
        }
    });
    
    const firstEmpty = document.querySelector('.field-group.empty .field-input');
    if (firstEmpty) firstEmpty.focus();
}

function animateFieldFilled(fieldId) {
    const group = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (group) {
        group.classList.add('just-filled');
        setTimeout(() => group.classList.remove('just-filled'), 500);
    }
}

function updateEmptyState(input) {
    const group = input.closest('.field-group');
    if (input.value.trim()) {
        group.classList.remove('empty');
    }
}

function updateFieldCount(filled, total) {
    const template = TEMPLATES[currentTemplate];
    if (!template) return;
    
    total = total || template.fields.length;
    
    // Count filled fields
    if (filled === undefined) {
        filled = 0;
        document.querySelectorAll('.field-input').forEach(input => {
            if (input.value.trim()) filled++;
        });
    }
    
    const remaining = total - filled;
    const countEl = document.getElementById('fieldCount');
    
    if (countEl) {
        if (remaining === 0) {
            countEl.textContent = `${total} fields ready`;
            countEl.classList.add('complete');
        } else if (filled === 0) {
            countEl.textContent = `${total} fields`;
            countEl.classList.remove('complete');
        } else {
            countEl.textContent = `${remaining} remaining`;
            countEl.classList.remove('complete');
        }
    }
}

// ============================================================================
// Fill Progress UI
// ============================================================================

function showFillProgress(total) {
    const overlay = document.createElement('div');
    overlay.className = 'fill-progress-overlay';
    overlay.setAttribute('role', 'progressbar');
    overlay.setAttribute('aria-valuemin', '0');
    overlay.setAttribute('aria-valuemax', total.toString());
    overlay.setAttribute('aria-valuenow', '0');
    
    overlay.innerHTML = `
        <div class="fill-progress-content">
            <div class="fill-progress-text">Filling fields...</div>
            <div class="fill-progress-bar">
                <div class="fill-progress-fill" style="width: 0%"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
}

function updateFillProgress(overlay, current, total) {
    if (!overlay) return;
    
    const percent = (current / total) * 100;
    const fill = overlay.querySelector('.fill-progress-fill');
    const text = overlay.querySelector('.fill-progress-text');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `Filling ${current} of ${total}...`;
    
    overlay.setAttribute('aria-valuenow', current.toString());
}

function showFillComplete(overlay, count) {
    if (!overlay) return;
    
    const content = overlay.querySelector('.fill-progress-content');
    if (content) {
        content.innerHTML = `
            <div class="fill-complete">
                <div class="fill-complete-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="fill-complete-title">Done!</div>
                <div class="fill-complete-subtitle">Filled ${count} field${count === 1 ? '' : 's'}</div>
            </div>
        `;
    }
    
    setTimeout(() => hideFillProgress(overlay), 1500);
}

function hideFillProgress(overlay) {
    if (!overlay) return;
    
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    
    setTimeout(() => overlay.remove(), 200);
}

// ============================================================================
// Toast
// ============================================================================

let toastTimeout = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toast.classList.remove('exiting', 'hidden');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    announce(message, type === 'error' ? 'assertive' : 'polite');
    
    toastTimeout = setTimeout(() => {
        toast.classList.add('exiting');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('exiting');
        }, 200);
    }, 3000);
}

// ============================================================================
// Accessibility
// ============================================================================

function announce(message, priority = 'polite') {
    const region = document.getElementById('srAnnouncements');
    if (!region) return;
    
    region.setAttribute('aria-live', priority);
    region.textContent = message;
    
    setTimeout(() => {
        region.textContent = '';
    }, 1000);
}

// ============================================================================
// Utils
// ============================================================================

function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}

function toTitleCase(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\s+/, '')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
