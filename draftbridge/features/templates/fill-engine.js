/**
 * DraftBridge Template Fill Engine
 * 
 * SPEED-OPTIMIZED: Every operation under 300ms
 * BULLETPROOF UNDO: Always works, multi-level, Ctrl+Z mapped
 * 
 * @version 2.0.0
 */

/* global Word, Office */

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTENT_CONTROL_PREFIX = 'template_';
const MAX_UNDO_LEVELS = 10;

const FieldType = Object.freeze({
    TEXT: 'text',
    TEXTAREA: 'textarea',
    DATE: 'date',
    NUMBER: 'number',
    DROPDOWN: 'dropdown',
    BOOLEAN: 'boolean',
    PARTY: 'party',
    ADDRESS: 'address',
    REPEATING: 'repeating'
});

// Default field style (matches designer.js)
const DEFAULT_FIELD_STYLE = {
    fontName: 'Times New Roman',
    fontSize: 12,
    bold: false,
    italic: false,
    underline: false,
    allCaps: false,
    color: '#000000'
};

const ValidationResult = Object.freeze({
    VALID: 'valid',
    INVALID: 'invalid',
    WARNING: 'warning'
});

// ============================================================================
// CACHING - Parse once, never re-parse
// ============================================================================

const _cache = {
    controls: null,
    controlMap: null,
    lastScanTime: 0,
    schema: null,
    parsedSchema: null
};

const CACHE_TTL = 5000; // 5 seconds

function invalidateCache() {
    _cache.controls = null;
    _cache.controlMap = null;
    _cache.lastScanTime = 0;
}

function isCacheValid() {
    return _cache.controls && (Date.now() - _cache.lastScanTime) < CACHE_TTL;
}

// ============================================================================
// UNDO STACK - Multi-level, bulletproof
// ============================================================================

const _undoStack = [];

/**
 * Push a snapshot to the undo stack.
 * Always succeeds - never throws.
 */
function pushUndoState(snapshot, description = 'Change') {
    _undoStack.push({
        timestamp: Date.now(),
        description,
        snapshot
    });
    
    // Keep only last N states
    while (_undoStack.length > MAX_UNDO_LEVELS) {
        _undoStack.shift();
    }
}

/**
 * Pop and return the last undo state.
 * Returns null if stack is empty.
 */
function popUndoState() {
    return _undoStack.pop() || null;
}

/**
 * Check if undo is available.
 */
function canUndo() {
    return _undoStack.length > 0;
}

/**
 * Get undo stack depth.
 */
function getUndoDepth() {
    return _undoStack.length;
}

/**
 * Clear all undo states.
 */
function clearUndoStack() {
    _undoStack.length = 0;
}

/**
 * Get description of next undo operation.
 */
function getNextUndoDescription() {
    const state = _undoStack[_undoStack.length - 1];
    return state ? state.description : null;
}

// ============================================================================
// SPEED-OPTIMIZED DOCUMENT SCANNING
// Single context.sync(), aggressive caching
// ============================================================================

/**
 * Scans document for content controls. Uses cache if valid.
 * Target: <100ms
 */
async function scanContentControls(forceRefresh = false) {
    if (!forceRefresh && isCacheValid()) {
        return _cache.controls;
    }
    
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/title,items/text,items/type,items/placeholderText');
        await context.sync(); // SINGLE sync
        
        const controls = [];
        for (const cc of contentControls.items) {
            if (cc.tag && cc.tag.startsWith(CONTENT_CONTROL_PREFIX)) {
                controls.push({
                    id: cc.id,
                    tag: cc.tag,
                    fieldId: cc.tag.slice(CONTENT_CONTROL_PREFIX.length), // Faster than replace()
                    title: cc.title || '',
                    currentValue: cc.text || '',
                    type: cc.type,
                    placeholderText: cc.placeholderText || '',
                    isEmpty: isTextEmpty(cc.text, cc.placeholderText)
                });
            }
        }
        
        // Update cache
        _cache.controls = controls;
        _cache.lastScanTime = Date.now();
        _cache.controlMap = null; // Invalidate derived cache
        
        return controls;
    });
}

/**
 * Fast check if control text is empty.
 */
function isTextEmpty(text, placeholder) {
    if (!text || text.trim() === '') return true;
    if (placeholder && text === placeholder) return true;
    if (text.length > 2 && text[0] === '{' && text[1] === '{' && text.endsWith('}}')) return true;
    return false;
}

/**
 * Builds control map from cache or fresh scan.
 * Target: <50ms if cached
 */
async function buildControlMap(forceRefresh = false) {
    if (!forceRefresh && _cache.controlMap && isCacheValid()) {
        return _cache.controlMap;
    }
    
    const controls = await scanContentControls(forceRefresh);
    const map = new Map();
    
    for (const control of controls) {
        const existing = map.get(control.fieldId);
        if (existing) {
            existing.push(control);
        } else {
            map.set(control.fieldId, [control]);
        }
    }
    
    _cache.controlMap = map;
    return map;
}

// ============================================================================
// SPEED-OPTIMIZED TEMPLATE FILLING
// Single Word.run, batched operations, snapshot before fill
// ============================================================================

/**
 * Fill all content controls from dataset.
 * ALWAYS captures undo snapshot FIRST.
 * Target: <300ms total
 * 
 * @returns {Promise<FillResult>}
 */
async function fillTemplate(schema, dataset, options = {}) {
    const {
        validateFirst = true,
        highlightUnfilled = false
    } = options;

    // Validate synchronously if requested (no async, no delay)
    if (validateFirst && schema) {
        const validation = validateDataset(schema, dataset);
        if (!validation.isValid) {
            return {
                success: false,
                errorType: 'validation',
                message: buildValidationErrorMessage(validation),
                validation
            };
        }
    }

    // SINGLE Word.run: snapshot + fill in one context
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/title,items/type,items/text');
        await context.sync(); // Sync #1: Load all data
        
        // Capture snapshot BEFORE any changes
        const snapshot = {};
        const controlsToFill = [];
        
        for (const cc of contentControls.items) {
            if (!cc.tag || !cc.tag.startsWith(CONTENT_CONTROL_PREFIX)) continue;
            
            const fieldId = cc.tag.slice(CONTENT_CONTROL_PREFIX.length);
            snapshot[cc.id] = cc.text || '';
            
            const value = getNestedValue(dataset?.values, fieldId);
            if (value !== undefined && value !== null && value !== '') {
                const field = schema ? findField(schema, fieldId) : null;
                controlsToFill.push({
                    control: cc,
                    fieldId,
                    field, // Include field for style application
                    formattedValue: formatValueWithStyle(field, value)
                });
            } else if (highlightUnfilled) {
                cc.appearance = Word.ContentControlAppearance.tags;
            }
        }
        
        // Push to undo stack BEFORE making changes
        pushUndoState(snapshot, `Fill ${controlsToFill.length} fields`);
        
        // Batch all insertions (no sync between them)
        const result = {
            success: true,
            filled: [],
            skipped: [],
            errors: []
        };
        
        for (const { control, fieldId, formattedValue, field } of controlsToFill) {
            try {
                control.insertText(formattedValue, Word.InsertLocation.replace);
                
                // Apply field styles if defined
                if (field?.style) {
                    applyStyleToControl(control, field.style, context);
                }
                
                result.filled.push({ fieldId, value: formattedValue });
            } catch (err) {
                result.errors.push({ fieldId, message: err.message });
            }
        }
        
        await context.sync(); // Sync #2: Apply all changes at once
        
        // Invalidate cache after changes
        invalidateCache();
        
        return result;
    }).catch(err => {
        return {
            success: false,
            errorType: 'office',
            message: buildOfficeErrorMessage(err, 'fill your template'),
            originalError: err.message
        };
    });
}

/**
 * Fill a single field. Captures undo snapshot.
 * Applies field styles if defined in schema.
 * Target: <100ms
 */
async function fillSingleField(fieldId, value, schema = null) {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/text');
        await context.sync();
        
        const snapshot = {};
        let filled = false;
        let filledControl = null;
        let field = null;
        
        for (const cc of contentControls.items) {
            if (!cc.tag || !cc.tag.startsWith(CONTENT_CONTROL_PREFIX)) continue;
            
            const ccFieldId = cc.tag.slice(CONTENT_CONTROL_PREFIX.length);
            snapshot[cc.id] = cc.text || '';
            
            if (ccFieldId === fieldId) {
                field = schema ? findField(schema, fieldId) : null;
                const formattedValue = formatValueWithStyle(field, value);
                cc.insertText(formattedValue, Word.InsertLocation.replace);
                filledControl = cc;
                filled = true;
            }
        }
        
        // Apply styles after text insertion
        if (filled && filledControl && field?.style) {
            applyStyleToControl(filledControl, field.style, context);
        }
        
        if (filled) {
            pushUndoState(snapshot, `Fill ${fieldId}`);
        }
        
        await context.sync();
        invalidateCache();
        
        return { success: filled, fieldId };
    }).catch(err => ({
        success: false,
        message: buildOfficeErrorMessage(err, `fill "${fieldId}"`)
    }));
}

// ============================================================================
// BULLETPROOF UNDO
// Always works, never fails silently
// ============================================================================

/**
 * Undo the last operation.
 * Returns result object, never throws.
 */
async function undo() {
    const state = popUndoState();
    
    if (!state) {
        return {
            success: false,
            message: 'Nothing to undo—you haven\'t made any changes yet.'
        };
    }
    
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag');
        await context.sync();
        
        let restoredCount = 0;
        
        for (const cc of contentControls.items) {
            const savedValue = state.snapshot[cc.id];
            if (savedValue !== undefined) {
                cc.insertText(savedValue, Word.InsertLocation.replace);
                restoredCount++;
            }
        }
        
        await context.sync();
        invalidateCache();
        
        return {
            success: true,
            restoredCount,
            description: state.description,
            remainingUndos: _undoStack.length
        };
    }).catch(err => {
        // Put the state back if undo failed
        _undoStack.push(state);
        
        return {
            success: false,
            message: buildOfficeErrorMessage(err, 'undo your changes'),
            canRetry: true
        };
    });
}

/**
 * Create a manual restore point without making changes.
 * Useful for "checkpoint" before risky operations.
 */
async function createCheckpoint(description = 'Checkpoint') {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/text');
        await context.sync();
        
        const snapshot = {};
        for (const cc of contentControls.items) {
            if (cc.tag && cc.tag.startsWith(CONTENT_CONTROL_PREFIX)) {
                snapshot[cc.id] = cc.text || '';
            }
        }
        
        pushUndoState(snapshot, description);
        
        return {
            success: true,
            undoDepth: _undoStack.length
        };
    }).catch(err => ({
        success: false,
        message: buildOfficeErrorMessage(err, 'create a restore point')
    }));
}

// ============================================================================
// HUMAN ERROR MESSAGES
// Never use "failed", always explain, always offer a way forward
// ============================================================================

function buildValidationErrorMessage(validation) {
    if (!validation.errors || validation.errors.length === 0) {
        return 'Some fields need attention before filling.';
    }
    
    const firstError = validation.errors[0];
    const remaining = validation.errors.length - 1;
    
    let message = `Couldn't fill the template—${firstError.fieldLabel || firstError.fieldId} ${firstError.message.toLowerCase()}.`;
    
    if (remaining > 0) {
        message += ` (Plus ${remaining} other ${remaining === 1 ? 'field needs' : 'fields need'} attention.)`;
    }
    
    message += ' Fix the highlighted fields and try again.';
    
    return message;
}

function buildOfficeErrorMessage(err, action) {
    const errorCode = err.code || '';
    const errorMessage = (err.message || '').toLowerCase();
    
    // Document not ready
    if (errorMessage.includes('not ready') || errorCode === 'GeneralException') {
        return `Couldn't ${action}—Word is still loading. Give it a moment and try again.`;
    }
    
    // Content control issues
    if (errorMessage.includes('content control') || errorMessage.includes('contentcontrol')) {
        return `Couldn't ${action}—it looks like some template fields were changed or deleted. Try scanning the document again.`;
    }
    
    // Document protected
    if (errorMessage.includes('protected') || errorMessage.includes('read-only')) {
        return `Couldn't ${action}—the document is protected. Check if it's in read-only mode or if editing is restricted.`;
    }
    
    // Selection issues
    if (errorMessage.includes('selection')) {
        return `Couldn't ${action}—there's something selected that's preventing changes. Click somewhere in the document and try again.`;
    }
    
    // Network/timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        return `Couldn't ${action}—Word took too long to respond. Try again in a moment.`;
    }
    
    // Generic fallback - still human, still helpful
    return `Couldn't ${action}—something unexpected happened. Try again, or if it keeps happening, close and reopen the panel.`;
}

function buildFieldErrorMessage(fieldId, fieldLabel, action, err) {
    const label = fieldLabel || fieldId;
    
    if (err.message?.includes('not found')) {
        return `Couldn't ${action} ${label}—the field seems to have been deleted from the document. Try scanning again to refresh.`;
    }
    
    return `Couldn't ${action} ${label}. You can try again or skip this field.`;
}

// ============================================================================
// SCHEMA MAPPING (Optimized)
// ============================================================================

async function mapControlsToSchema(schema) {
    const controlMap = await buildControlMap();
    const result = {
        matched: [],
        unmatchedControls: [],
        unmatchedFields: [],
        warnings: []
    };

    const usedFieldIds = new Set();

    for (const field of schema.fields) {
        const controls = controlMap.get(field.id);
        
        if (controls && controls.length > 0) {
            result.matched.push({
                field,
                controls,
                occurrences: controls.length
            });
            usedFieldIds.add(field.id);
        } else {
            result.unmatchedFields.push(field);
        }
    }

    for (const [fieldId, controls] of controlMap) {
        if (!usedFieldIds.has(fieldId)) {
            result.unmatchedControls.push({ fieldId, controls });
        }
    }

    if (result.unmatchedFields.length > 0) {
        result.warnings.push({
            type: 'missing_controls',
            message: `${result.unmatchedFields.length} schema field(s) have no matching content controls`,
            fields: result.unmatchedFields.map(f => f.id)
        });
    }

    if (result.unmatchedControls.length > 0) {
        result.warnings.push({
            type: 'extra_controls',
            message: `${result.unmatchedControls.length} content control(s) not defined in schema`,
            fields: result.unmatchedControls.map(c => c.fieldId)
        });
    }

    return result;
}

// ============================================================================
// VALIDATION (Synchronous - no async overhead)
// ============================================================================

function validateDataset(schema, dataset) {
    const report = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldResults: {}
    };

    for (const field of schema.fields) {
        const value = getNestedValue(dataset?.values, field.id);
        const fieldResult = validateField(field, value, schema, dataset);
        
        report.fieldResults[field.id] = fieldResult;
        
        if (fieldResult.status === ValidationResult.INVALID) {
            report.isValid = false;
            report.errors.push({
                fieldId: field.id,
                fieldLabel: field.label,
                message: fieldResult.message
            });
        } else if (fieldResult.status === ValidationResult.WARNING) {
            report.warnings.push({
                fieldId: field.id,
                fieldLabel: field.label,
                message: fieldResult.message
            });
        }
    }

    return report;
}

function validateField(field, value, schema, dataset) {
    const result = { status: ValidationResult.VALID, message: null };

    if (!isFieldVisible(field, schema, dataset)) {
        return result;
    }

    if (field.required && isEmpty(value)) {
        return {
            status: ValidationResult.INVALID,
            message: `is required`
        };
    }

    if (isEmpty(value)) {
        return result;
    }

    switch (field.type) {
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
            return validateText(field, value);
        case FieldType.DATE:
            return validateDate(field, value);
        case FieldType.NUMBER:
            return validateNumber(field, value);
        case FieldType.DROPDOWN:
            return validateDropdown(field, value);
        case FieldType.REPEATING:
            return validateRepeating(field, value);
        default:
            return result;
    }
}

function validateText(field, value) {
    const v = field.validation || {};
    
    if (v.minLength && value.length < v.minLength) {
        return { status: ValidationResult.INVALID, message: `needs at least ${v.minLength} characters` };
    }
    if (v.maxLength && value.length > v.maxLength) {
        return { status: ValidationResult.INVALID, message: `can't exceed ${v.maxLength} characters` };
    }
    if (v.pattern && !new RegExp(v.pattern).test(value)) {
        return { status: ValidationResult.INVALID, message: v.patternMessage || `has an invalid format` };
    }
    
    return { status: ValidationResult.VALID, message: null };
}

function validateDate(field, value) {
    const v = field.validation || {};
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
        return { status: ValidationResult.INVALID, message: `isn't a valid date` };
    }
    
    if (v.minDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
            return { status: ValidationResult.INVALID, message: `can't be in the past` };
        }
    }
    
    return { status: ValidationResult.VALID, message: null };
}

function validateNumber(field, value) {
    const v = field.validation || {};
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return { status: ValidationResult.INVALID, message: `needs to be a number` };
    }
    if (v.min !== undefined && num < v.min) {
        return { status: ValidationResult.INVALID, message: `needs to be at least ${v.min}` };
    }
    if (v.max !== undefined && num > v.max) {
        return { status: ValidationResult.INVALID, message: `can't exceed ${v.max}` };
    }
    
    return { status: ValidationResult.VALID, message: null };
}

function validateDropdown(field, value) {
    if (!field.options) return { status: ValidationResult.VALID, message: null };
    
    const validValues = field.options.map(o => o.value);
    if (!validValues.includes(value)) {
        return { status: ValidationResult.INVALID, message: `has an invalid selection` };
    }
    
    return { status: ValidationResult.VALID, message: null };
}

function validateRepeating(field, value) {
    if (!Array.isArray(value)) {
        return { status: ValidationResult.INVALID, message: `needs to be a list` };
    }
    if (field.minItems && value.length < field.minItems) {
        return { status: ValidationResult.INVALID, message: `needs at least ${field.minItems} item(s)` };
    }
    if (field.maxItems && value.length > field.maxItems) {
        return { status: ValidationResult.INVALID, message: `can't have more than ${field.maxItems} items` };
    }
    
    return { status: ValidationResult.VALID, message: null };
}

// ============================================================================
// VALUE FORMATTING (Optimized - no unnecessary operations)
// ============================================================================

function formatValue(field, value) {
    if (!field) return String(value);

    switch (field.type) {
        case FieldType.DATE:
            return formatDate(value, field.format);
        case FieldType.NUMBER:
            return formatNumber(value, field.format, field.currency);
        case FieldType.DROPDOWN:
            return formatDropdownValue(field, value);
        case FieldType.BOOLEAN:
            return value ? 'Yes' : 'No';
        case FieldType.ADDRESS:
            return formatAddress(value, field.format);
        case FieldType.PARTY:
            return formatParty(value);
        default:
            return String(value);
    }
}

// Pre-computed month names (avoid creating array on each call)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

// ============================================================================
// STYLE APPLICATION
// Apply font/formatting styles to content controls
// ============================================================================

/**
 * Apply style settings to a content control's text.
 * Called after inserting text to format it according to field style.
 * 
 * @param {Word.ContentControl} control - The content control to style
 * @param {Object} style - Style settings from field schema
 * @param {Word.RequestContext} context - Word context for applying styles
 */
function applyStyleToControl(control, style, context) {
    if (!style) return;
    
    const effectiveStyle = { ...DEFAULT_FIELD_STYLE, ...style };
    
    // Get the range inside the content control
    const range = control.getRange('Content');
    const font = range.font;
    
    // Apply font family
    if (effectiveStyle.fontName) {
        font.name = effectiveStyle.fontName;
    }
    
    // Apply font size
    if (effectiveStyle.fontSize) {
        font.size = effectiveStyle.fontSize;
    }
    
    // Apply bold
    font.bold = !!effectiveStyle.bold;
    
    // Apply italic
    font.italic = !!effectiveStyle.italic;
    
    // Apply underline
    if (effectiveStyle.underline) {
        font.underline = Word.UnderlineType.single;
    } else {
        font.underline = Word.UnderlineType.none;
    }
    
    // Apply color (convert hex to Word color)
    if (effectiveStyle.color && effectiveStyle.color !== '#000000') {
        font.color = effectiveStyle.color;
    }
    
    // Note: allCaps is handled in formatValueWithStyle, not here
    // because Word's font.allCaps applies to display only, 
    // we transform the actual text for legal documents
}

/**
 * Format a value with style considerations.
 * Handles allCaps and wrapQuotes transformations.
 * 
 * @param {Object} field - Field definition with style
 * @param {*} value - Value to format
 * @returns {string} Formatted value
 */
function formatValueWithStyle(field, value) {
    // First get the base formatted value
    let formatted = formatValue(field, value);
    
    // Apply style transformations
    const style = field?.style;
    if (style) {
        // Apply ALL CAPS transformation
        if (style.allCaps) {
            formatted = formatted.toUpperCase();
        }
        
        // Apply quote wrapping for defined terms
        if (style.wrapQuotes) {
            formatted = `"${formatted}"`;
        }
    }
    
    return formatted;
}

function formatDate(value, format = 'MMMM D, YYYY') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();

    switch (format) {
        case 'MMMM D, YYYY':
            return `${MONTHS[m]} ${d}, ${y}`;
        case 'MM/DD/YYYY':
            return `${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
        case 'D MMMM YYYY':
            return `${d} ${MONTHS[m]} ${y}`;
        case 'YYYY-MM-DD':
            return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        default:
            return `${MONTHS[m]} ${d}, ${y}`;
    }
}

function formatNumber(value, format = 'decimal', currency = 'USD') {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);

    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
        case 'integer':
            return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(num));
        case 'percent':
            return `${num}%`;
        case 'words':
            return numberToWords(num);
        default:
            return new Intl.NumberFormat('en-US').format(num);
    }
}

function formatDropdownValue(field, value) {
    if (!field.options) return value;
    const option = field.options.find(o => o.value === value);
    return option ? option.label : value;
}

function formatAddress(value, format = 'full') {
    if (typeof value === 'string') return value;
    if (!value) return '';

    const parts = [];
    if (value.street1) parts.push(value.street1);
    if (value.street2) parts.push(value.street2);
    
    const cityStateZip = [value.city, value.state, value.zip].filter(Boolean).join(', ');
    if (cityStateZip) parts.push(cityStateZip);
    if (value.country) parts.push(value.country);

    return format === 'oneline' ? parts.join(', ') 
         : format === 'city_state' ? `${value.city}, ${value.state}` 
         : parts.join('\n');
}

function formatParty(value) {
    if (typeof value === 'string') return value;
    return value?.name || '';
}

// ============================================================================
// REPEATING SECTIONS
// ============================================================================

async function fillRepeatingSection(schema, dataset, fieldId) {
    const field = findField(schema, fieldId);
    if (!field || field.type !== FieldType.REPEATING) {
        return {
            success: false,
            message: `"${fieldId}" isn't a repeating section. Check your template schema.`
        };
    }

    const items = dataset?.values?.[fieldId] || [];

    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/text');
        await context.sync();

        // Snapshot first
        const snapshot = {};
        for (const cc of contentControls.items) {
            if (cc.tag && cc.tag.startsWith(CONTENT_CONTROL_PREFIX)) {
                snapshot[cc.id] = cc.text || '';
            }
        }
        pushUndoState(snapshot, `Fill repeating: ${field.label || fieldId}`);

        const result = { success: true, filled: [], errors: [] };

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            for (const subField of (field.fields || [])) {
                const tag = `${CONTENT_CONTROL_PREFIX}${fieldId}_${i}_${subField.id}`;
                const control = contentControls.items.find(cc => cc.tag === tag);
                
                if (control && item[subField.id] != null) {
                    const value = formatValue(subField, item[subField.id]);
                    control.insertText(value, Word.InsertLocation.replace);
                    result.filled.push({ tag, value });
                }
            }
        }

        await context.sync();
        invalidateCache();
        
        return result;
    }).catch(err => ({
        success: false,
        message: buildOfficeErrorMessage(err, `fill the "${field.label || fieldId}" section`)
    }));
}

// ============================================================================
// DATASET STORAGE (Cloud-First with Local Cache)
// ============================================================================

let _dataStore = null;

function initializeDataStore(dataStore) {
    _dataStore = dataStore;
}

function getDataStore() {
    if (_dataStore) return _dataStore;
    if (typeof window !== 'undefined' && window.DraftBridgeDataStore) {
        return window.DraftBridgeDataStore;
    }
    throw new Error('DataStore not initialized. Call initializeDataStore() first.');
}

async function saveDataset(dataset) {
    const store = getDataStore();
    return store.saveDataset(dataset);
}

async function loadDataset(datasetId) {
    const store = getDataStore();
    try {
        return await store.getDataset(datasetId);
    } catch (error) {
        if (error.status === 404) return null;
        throw error;
    }
}

async function deleteDataset(datasetId) {
    const store = getDataStore();
    return store.deleteDataset(datasetId);
}

async function listDatasets(options = {}) {
    const store = getDataStore();
    return store.listDatasets(options);
}

async function getRecentDatasets(limit = 5) {
    const store = getDataStore();
    const result = await store.listDatasets({ limit });
    return (result.items || []).slice(0, limit);
}

function getSyncStatus() {
    try {
        const store = getDataStore();
        return store.getSyncStatus();
    } catch {
        return { isOnline: navigator.onLine, pendingChanges: false, pendingCount: 0 };
    }
}

async function forceSyncChanges() {
    const store = getDataStore();
    return store.forceSync();
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

function exportDatasetToJson(dataset) {
    return JSON.stringify(dataset, null, 2);
}

function importDatasetFromJson(json) {
    const dataset = JSON.parse(json);
    dataset.id = generateId();
    dataset.created = new Date().toISOString();
    dataset.modified = dataset.created;
    return saveDataset(dataset);
}

function exportDatasetToCsv(dataset) {
    const lines = ['fieldId,value'];
    
    function flatten(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                flatten(value, fullKey);
            } else if (Array.isArray(value)) {
                value.forEach((item, i) => {
                    if (typeof item === 'object') {
                        flatten(item, `${fullKey}[${i}]`);
                    } else {
                        lines.push(`"${fullKey}[${i}]","${escapeCSV(item)}"`);
                    }
                });
            } else {
                lines.push(`"${fullKey}","${escapeCSV(value)}"`);
            }
        }
    }
    
    flatten(dataset?.values || {});
    return lines.join('\n');
}

function escapeCSV(value) {
    if (value == null) return '';
    return String(value).replace(/"/g, '""');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function findField(schema, fieldId) {
    if (!schema?.fields) return null;
    
    // Direct match (most common case)
    const direct = schema.fields.find(f => f.id === fieldId);
    if (direct) return direct;

    // Try nested fields (party, address, repeating)
    const parts = fieldId.split('_');
    const parentId = parts[0];
    const parentField = schema.fields.find(f => f.id === parentId);
    
    if (!parentField) return null;
    
    if (parentField.type === FieldType.REPEATING && parentField.fields) {
        const subFieldId = parts.slice(2).join('_');
        return parentField.fields.find(f => f.id === subFieldId) || null;
    }
    
    if (parentField.type === FieldType.PARTY || parentField.type === FieldType.ADDRESS) {
        const subFieldId = parts.slice(1).join('_');
        const subFields = parentField.partyFields || parentField.addressFields;
        return subFields?.find(f => f.id === subFieldId) || null;
    }

    return null;
}

function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current == null) return undefined;
        current = current[part];
    }
    
    return current;
}

function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

function isFieldVisible(field, schema, dataset) {
    if (!schema?.conditionals) return true;

    for (const conditional of schema.conditionals) {
        const showFields = conditional.then?.show || [];
        
        if (showFields.includes(field.id)) {
            const conditionMet = evaluateCondition(conditional.condition, dataset?.values);
            if (!conditionMet) return false;
        }
    }

    return true;
}

function evaluateCondition(condition, values) {
    const fieldValue = getNestedValue(values, condition.field);
    
    switch (condition.operator) {
        case 'equals': return fieldValue === condition.value;
        case 'notEquals': return fieldValue !== condition.value;
        case 'in': return condition.value?.includes(fieldValue);
        case 'notIn': return !condition.value?.includes(fieldValue);
        case 'greaterThan': return fieldValue > condition.value;
        case 'lessThan': return fieldValue < condition.value;
        case 'isEmpty': return isEmpty(fieldValue);
        case 'isNotEmpty': return !isEmpty(fieldValue);
        case 'contains': return String(fieldValue).includes(condition.value);
        default: return true;
    }
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    function convertHundreds(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            return (str + teens[n - 10]).trim();
        }
        if (n > 0) str += ones[n];
        return str.trim();
    }

    const trillion = Math.floor(num / 1e12);
    const billion = Math.floor((num % 1e12) / 1e9);
    const million = Math.floor((num % 1e9) / 1e6);
    const thousand = Math.floor((num % 1e6) / 1e3);
    const remainder = Math.floor(num % 1e3);

    let result = '';
    if (trillion) result += convertHundreds(trillion) + ' Trillion ';
    if (billion) result += convertHundreds(billion) + ' Billion ';
    if (million) result += convertHundreds(million) + ' Million ';
    if (thousand) result += convertHundreds(thousand) + ' Thousand ';
    if (remainder) result += convertHundreds(remainder);

    return result.trim() + ' Dollars';
}

// ============================================================================
// OFFICE.JS INITIALIZATION
// ============================================================================

if (typeof Office !== 'undefined') {
    Office.onReady(() => {
        // Ctrl+Z is handled by taskpane.js for better control
    });
}

// ============================================================================
// WINDOW GLOBAL FOR BROWSER USE
// ============================================================================

if (typeof window !== 'undefined') {
    window.FillEngine = {
        // Initialization
        initializeDataStore,
        
        // Scanning (cached)
        scanContentControls,
        buildControlMap,
        mapControlsToSchema,
        invalidateCache,
        
        // Validation
        validateDataset,
        validateField,
        
        // Filling (speed-optimized)
        fillTemplate,
        fillSingleField,
        fillRepeatingSection,
        formatValue,
        formatValueWithStyle,
        
        // Styling
        applyStyleToControl,
        DEFAULT_FIELD_STYLE,
        
        // Undo (bulletproof)
        undo,
        canUndo,
        getUndoDepth,
        getNextUndoDescription,
        clearUndoStack,
        createCheckpoint,
        pushUndoState,
        
        // Error messages
        buildValidationErrorMessage,
        buildOfficeErrorMessage,
        buildFieldErrorMessage,
        
        // Utilities
        findField,
        getNestedValue,
        isEmpty,
        generateId
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Initialization
        initializeDataStore,
        
        // Scanning (cached)
        scanContentControls,
        buildControlMap,
        mapControlsToSchema,
        invalidateCache,
        
        // Validation
        validateDataset,
        validateField,
        
        // Filling (speed-optimized)
        fillTemplate,
        fillSingleField,
        fillRepeatingSection,
        formatValue,
        formatValueWithStyle,
        
        // Styling
        applyStyleToControl,
        DEFAULT_FIELD_STYLE,
        
        // Undo (bulletproof)
        undo,
        canUndo,
        getUndoDepth,
        getNextUndoDescription,
        clearUndoStack,
        createCheckpoint,
        
        // Error messages
        buildValidationErrorMessage,
        buildOfficeErrorMessage,
        buildFieldErrorMessage,
        
        // Storage (Cloud-First)
        saveDataset,
        loadDataset,
        deleteDataset,
        listDatasets,
        getRecentDatasets,
        getSyncStatus,
        forceSyncChanges,
        
        // Import/Export
        exportDatasetToJson,
        importDatasetFromJson,
        exportDatasetToCsv,
        
        // Utilities
        findField,
        getNestedValue,
        isEmpty,
        generateId
    };
}
