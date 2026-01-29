/**
 * DocForge - Template Fill UI Integration
 * 
 * Bridges the template.js module with the DocForge taskpane UI.
 * Provides user-facing functions that wrap the core module functionality.
 * 
 * This file should be loaded after template.js in the HTML.
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// UI STATE
// ============================================================================

const TemplateUI = {
    // Current scanned variables
    currentVariables: [],
    
    // Current values entered in UI
    currentValues: {},
    
    // Selected bracket styles
    enabledBracketStyles: ['double_curly', 'square', 'angle', 'single_curly'],
    
    // Whether highlighting is enabled
    highlightingEnabled: false
};

// ============================================================================
// SCAN FUNCTIONS
// ============================================================================

/**
 * Scan document for template variables
 * @param {Word.RequestContext} context
 * @returns {Promise<Array>}
 */
async function scanVariables(context) {
    const Template = DocForge.Template;
    
    const result = await Template.scanDocument(context, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        forceRefresh: true
    });
    
    // Store for UI use
    TemplateUI.currentVariables = result.variables;
    
    // Convert to simplified format for UI
    return result.variables.map(v => ({
        name: v.name,
        displayName: v.getDisplayName(),
        type: v.inferredType,
        typeInfo: Template.getTypeInfo(v.inferredType),
        occurrences: v.occurrences.length,
        placeholder: v.getPlaceholder(),
        isContentControl: v.isContentControl,
        defaultValue: TemplateUI.currentValues[v.name] || ''
    }));
}

/**
 * Quick scan for variable count (lighter weight)
 * @param {Word.RequestContext} context
 * @returns {Promise<Object>}
 */
async function quickScanStats(context) {
    const Template = DocForge.Template;
    
    const result = await Template.scanDocument(context, {
        bracketStyles: TemplateUI.enabledBracketStyles
    });
    
    return result.stats;
}

// ============================================================================
// FILL FUNCTIONS
// ============================================================================

/**
 * Fill template with provided values
 * @param {Word.RequestContext} context
 * @param {Object} data - Variable name -> value mapping
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fillTemplate(context, data, options = {}) {
    const Template = DocForge.Template;
    
    // Store values for later use
    TemplateUI.currentValues = { ...TemplateUI.currentValues, ...data };
    
    // Fill the template
    const result = await Template.fillTemplate(context, data, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        ...options
    });
    
    // Handle highlighting if enabled
    if (options.highlightUnfilled) {
        await Template.highlightUnfilled(context, { color: 'yellow' });
        TemplateUI.highlightingEnabled = true;
    }
    
    return result;
}

/**
 * Preview fill without applying
 * @param {Word.RequestContext} context
 * @param {Object} data
 * @returns {Promise<Array>}
 */
async function previewFill(context, data) {
    const Template = DocForge.Template;
    
    return await Template.previewFill(context, data, {
        bracketStyles: TemplateUI.enabledBracketStyles
    });
}

// ============================================================================
// VARIABLE INSERT
// ============================================================================

/**
 * Insert a new template variable at cursor
 * @param {Word.RequestContext} context
 * @param {string} name
 * @param {string} type
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function insertVariable(context, name, type, options = {}) {
    const Template = DocForge.Template;
    
    // Validate name
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        return {
            success: false,
            message: 'Invalid variable name. Use letters, numbers, and underscores only.'
        };
    }
    
    // Get preferred bracket style
    const bracketStyle = options.bracketStyle || TemplateUI.enabledBracketStyles[0] || 'double_curly';
    
    return await Template.insertVariable(context, name, {
        bracketStyle: bracketStyle,
        useContentControl: options.useContentControl || false,
        variableType: type
    });
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

/**
 * List all saved profiles
 * @returns {Array}
 */
function listProfiles() {
    const Template = DocForge.Template;
    const profiles = Template.profileStore.getAll();
    
    return Object.values(profiles).map(p => ({
        name: p.name,
        variableCount: Object.keys(p.variables || {}).length,
        lastUsed: p.lastUsed,
        created: p.created
    })).sort((a, b) => {
        // Sort by last used, then by name
        if (a.lastUsed && b.lastUsed) {
            return new Date(b.lastUsed) - new Date(a.lastUsed);
        }
        return a.name.localeCompare(b.name);
    });
}

/**
 * Get recently used profiles
 * @returns {Array}
 */
function getRecentProfiles() {
    const Template = DocForge.Template;
    return Template.profileStore.getRecent();
}

/**
 * Save current values as a profile
 * @param {string} name
 * @param {Object} data
 * @returns {boolean}
 */
function saveProfile(name, data) {
    const Template = DocForge.Template;
    
    // Merge with current values
    const values = { ...TemplateUI.currentValues, ...data };
    
    // Remove empty values
    const cleanedValues = {};
    for (const [key, val] of Object.entries(values)) {
        if (val !== null && val !== undefined && val !== '') {
            cleanedValues[key] = val;
        }
    }
    
    return Template.profileStore.save(name, cleanedValues, {
        variableCount: Object.keys(cleanedValues).length
    });
}

/**
 * Load a saved profile
 * @param {string} name
 * @returns {Object}
 */
function loadProfile(name) {
    const Template = DocForge.Template;
    const profile = Template.profileStore.get(name);
    
    if (!profile) {
        return { success: false, message: `Profile "${name}" not found` };
    }
    
    // Store in UI state
    TemplateUI.currentValues = { ...profile.variables };
    
    // Record usage
    Template.profileStore.recordUsage(name);
    
    return {
        success: true,
        data: profile.variables,
        name: profile.name
    };
}

/**
 * Delete a profile
 * @param {string} name
 * @returns {boolean}
 */
function deleteProfile(name) {
    const Template = DocForge.Template;
    return Template.profileStore.delete(name);
}

/**
 * Export profiles to JSON string
 * @returns {string}
 */
function exportProfiles() {
    const Template = DocForge.Template;
    return Template.profileStore.exportToJSON();
}

/**
 * Import profiles from JSON string
 * @param {string} json
 * @param {boolean} merge
 * @returns {boolean}
 */
function importProfiles(json, merge = true) {
    const Template = DocForge.Template;
    return Template.profileStore.importFromJSON(json, merge);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate all current values
 * @param {Object} values
 * @returns {Object}
 */
function validateValues(values) {
    const Template = DocForge.Template;
    
    return Template.validateAllValues(values, TemplateUI.currentVariables);
}

/**
 * Validate a single value
 * @param {string} value
 * @param {string} typeId
 * @returns {boolean}
 */
function validateSingleValue(value, typeId) {
    const Template = DocForge.Template;
    return Template.validateValue(value, typeId);
}

/**
 * Format a value according to its type
 * @param {string} value
 * @param {string} typeId
 * @param {Object} options
 * @returns {string}
 */
function formatValue(value, typeId, options) {
    const Template = DocForge.Template;
    return Template.formatValue(value, typeId, options);
}

// ============================================================================
// HIGHLIGHTING
// ============================================================================

/**
 * Highlight unfilled variables
 * @param {Word.RequestContext} context
 * @param {string} color
 * @returns {Promise<Object>}
 */
async function highlightUnfilled(context, color = 'yellow') {
    const Template = DocForge.Template;
    const result = await Template.highlightUnfilled(context, { color });
    TemplateUI.highlightingEnabled = true;
    return result;
}

/**
 * Clear variable highlighting
 * @param {Word.RequestContext} context
 * @returns {Promise<Object>}
 */
async function clearHighlighting(context) {
    const Template = DocForge.Template;
    const result = await Template.clearHighlighting(context);
    TemplateUI.highlightingEnabled = false;
    return result;
}

/**
 * Toggle highlighting
 * @param {Word.RequestContext} context
 * @returns {Promise<Object>}
 */
async function toggleHighlighting(context) {
    if (TemplateUI.highlightingEnabled) {
        return await clearHighlighting(context);
    } else {
        return await highlightUnfilled(context);
    }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export variable list to JSON
 * @param {Word.RequestContext} context
 * @returns {Promise<string>}
 */
async function exportToJSON(context) {
    const Template = DocForge.Template;
    return await Template.exportVariablesToJSON(context, {
        bracketStyles: TemplateUI.enabledBracketStyles
    });
}

/**
 * Export variable list to CSV
 * @param {Word.RequestContext} context
 * @returns {Promise<string>}
 */
async function exportToCSV(context) {
    const Template = DocForge.Template;
    return await Template.exportVariablesToCSV(context, {
        bracketStyles: TemplateUI.enabledBracketStyles
    });
}

/**
 * Import values from JSON
 * @param {string} json
 * @returns {Object}
 */
function importValuesFromJSON(json) {
    const Template = DocForge.Template;
    const result = Template.importValuesFromJSON(json);
    
    if (result.success) {
        TemplateUI.currentValues = { ...TemplateUI.currentValues, ...result.values };
    }
    
    return result;
}

// ============================================================================
// BRACKET STYLE CONFIGURATION
// ============================================================================

/**
 * Get available bracket styles
 * @returns {Array}
 */
function getBracketStyles() {
    const Template = DocForge.Template;
    
    return Object.entries(Template.BRACKET_STYLES).map(([key, style]) => ({
        id: style.id,
        name: style.name,
        example: style.example,
        enabled: TemplateUI.enabledBracketStyles.includes(style.id)
    }));
}

/**
 * Set enabled bracket styles
 * @param {Array} styleIds
 */
function setEnabledBracketStyles(styleIds) {
    TemplateUI.enabledBracketStyles = styleIds;
    // Invalidate cache since detection may change
    const Template = DocForge.Template;
    Template.invalidateCache();
}

/**
 * Toggle a bracket style
 * @param {string} styleId
 * @returns {boolean} - New enabled state
 */
function toggleBracketStyle(styleId) {
    const idx = TemplateUI.enabledBracketStyles.indexOf(styleId);
    if (idx >= 0) {
        TemplateUI.enabledBracketStyles.splice(idx, 1);
        return false;
    } else {
        TemplateUI.enabledBracketStyles.push(styleId);
        return true;
    }
}

// ============================================================================
// VARIABLE TYPES
// ============================================================================

/**
 * Get available variable types
 * @returns {Array}
 */
function getVariableTypes() {
    const Template = DocForge.Template;
    
    return Object.entries(Template.VARIABLE_TYPES).map(([id, type]) => ({
        id: id,
        name: type.name,
        placeholder: type.placeholder,
        inputType: type.inputType
    }));
}

/**
 * Get type info for a variable
 * @param {string} variableName
 * @returns {Object}
 */
function getTypeForVariable(variableName) {
    const Template = DocForge.Template;
    const typeId = Template.inferVariableType(variableName);
    return {
        id: typeId,
        ...Template.getTypeInfo(typeId)
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear current session state
 */
function clearState() {
    TemplateUI.currentVariables = [];
    TemplateUI.currentValues = {};
    TemplateUI.highlightingEnabled = false;
    
    const Template = DocForge.Template;
    Template.invalidateCache();
}

/**
 * Get current state
 * @returns {Object}
 */
function getState() {
    return {
        variableCount: TemplateUI.currentVariables.length,
        filledCount: Object.keys(TemplateUI.currentValues).filter(k => 
            TemplateUI.currentValues[k] !== null && 
            TemplateUI.currentValues[k] !== ''
        ).length,
        highlightingEnabled: TemplateUI.highlightingEnabled,
        enabledBracketStyles: TemplateUI.enabledBracketStyles
    };
}

// ============================================================================
// HTML GENERATION HELPERS
// ============================================================================

/**
 * Generate HTML for variable list
 * @param {Array} variables
 * @param {Object} options
 * @returns {string}
 */
function generateVariableListHTML(variables, options = {}) {
    const { showType = true, showOccurrences = false, editable = true } = options;
    
    if (variables.length === 0) {
        return `<div class="result-item">No template variables found. Use {{VariableName}} syntax.</div>`;
    }
    
    return variables.map(v => {
        const typeInfo = v.typeInfo || {};
        const inputType = typeInfo.inputType || 'text';
        const placeholder = typeInfo.placeholder || 'Enter value...';
        
        const typeLabel = showType ? `<span class="var-type">(${v.type})</span>` : '';
        const occLabel = showOccurrences ? `<span class="var-occurrences">×${v.occurrences}</span>` : '';
        
        if (editable) {
            return `
                <div class="variable-item" data-varname="${v.name}">
                    <label title="${v.placeholder}">
                        ${v.displayName}
                        ${typeLabel}
                        ${occLabel}
                    </label>
                    <input type="${inputType}" 
                           data-var="${v.name}" 
                           data-type="${v.type}"
                           placeholder="${placeholder}"
                           value="${v.defaultValue || ''}"
                           ${v.isContentControl ? 'data-cc="true"' : ''}>
                </div>
            `;
        } else {
            return `
                <div class="variable-item readonly" data-varname="${v.name}">
                    <span class="var-name">${v.displayName}</span>
                    ${typeLabel}
                    ${occLabel}
                    <span class="var-value">${v.defaultValue || '(empty)'}</span>
                </div>
            `;
        }
    }).join('');
}

/**
 * Generate HTML for profile dropdown
 * @param {Array} profiles
 * @param {string} selectedName
 * @returns {string}
 */
function generateProfileDropdownHTML(profiles, selectedName = '') {
    const recentNames = getRecentProfiles();
    
    let html = '<option value="">-- Saved Profiles --</option>';
    
    // Recent profiles first
    if (recentNames.length > 0) {
        html += '<optgroup label="Recent">';
        for (const name of recentNames) {
            const profile = profiles.find(p => p.name === name);
            if (profile) {
                const selected = name === selectedName ? 'selected' : '';
                html += `<option value="${name}" ${selected}>${name} (${profile.variableCount} vars)</option>`;
            }
        }
        html += '</optgroup>';
    }
    
    // All profiles
    const otherProfiles = profiles.filter(p => !recentNames.includes(p.name));
    if (otherProfiles.length > 0) {
        html += '<optgroup label="All Profiles">';
        for (const profile of otherProfiles) {
            const selected = profile.name === selectedName ? 'selected' : '';
            html += `<option value="${profile.name}" ${selected}>${profile.name} (${profile.variableCount} vars)</option>`;
        }
        html += '</optgroup>';
    }
    
    return html;
}

/**
 * Generate HTML for preview changes
 * @param {Array} preview
 * @returns {string}
 */
function generatePreviewHTML(preview) {
    if (preview.length === 0) {
        return '<div class="result-item">No changes to preview.</div>';
    }
    
    return preview.map(p => {
        const validClass = p.isValid ? 'success' : 'warning';
        const validIcon = p.isValid ? 'Valid' : 'Warning';
        
        return `
            <div class="result-item ${validClass}">
                <div class="preview-var">
                    <strong>${p.displayName}</strong>
                    <span class="preview-occurrences">(${p.occurrences} occurrence${p.occurrences !== 1 ? 's' : ''})</span>
                </div>
                <div class="preview-change">
                    <span class="old">${p.currentPlaceholder}</span>
                    <span class="arrow">→</span>
                    <span class="new">${p.newValue}</span>
                    <span class="valid-icon">${validIcon}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Generate HTML for bracket style checkboxes
 * @returns {string}
 */
function generateBracketStylesHTML() {
    const styles = getBracketStyles();
    
    return styles.map(s => `
        <div class="checkbox-group">
            <input type="checkbox" 
                   id="bracket-${s.id}" 
                   data-style="${s.id}"
                   ${s.enabled ? 'checked' : ''}>
            <label for="bracket-${s.id}">${s.name} <code>${s.example}</code></label>
        </div>
    `).join('');
}

// ============================================================================
// QUICK FILL DATASET FUNCTIONS
// ============================================================================

/**
 * Get all saved datasets for dropdown
 * @returns {Array}
 */
function getDatasets() {
    const Template = DocForge.Template;
    return Template.datasetManager.getDatasets();
}

/**
 * Get recently used datasets
 * @param {number} limit
 * @returns {Array}
 */
function getRecentDatasets(limit = 5) {
    const Template = DocForge.Template;
    return Template.datasetManager.getRecentDatasets(limit);
}

/**
 * Save current values as a new dataset
 * @param {string} name - Dataset name (e.g., "Acme Corp Deal")
 * @param {Object} values - Variable name -> value mapping
 * @param {Object} metadata - Optional metadata
 * @returns {boolean}
 */
function saveDataset(name, values, metadata = {}) {
    const Template = DocForge.Template;
    
    // Merge with current UI values
    const allValues = { ...TemplateUI.currentValues, ...values };
    
    return Template.datasetManager.saveDataset(name, allValues, metadata);
}

/**
 * Load a dataset by name
 * @param {string} name
 * @returns {Object|null}
 */
function loadDataset(name) {
    const Template = DocForge.Template;
    return Template.datasetManager.loadDataset(name);
}

/**
 * Delete a dataset
 * @param {string} name
 * @returns {boolean}
 */
function deleteDataset(name) {
    const Template = DocForge.Template;
    return Template.datasetManager.deleteDataset(name);
}

/**
 * Quick Fill - Fill all document variables from a dataset (TWO-CLICK FLOW)
 * Supports both personal (personal:name) and shared (shared:name) datasets
 * @param {Word.RequestContext} context
 * @param {string} datasetName - Name of dataset to use (with optional prefix)
 * @param {Object} options
 * @returns {Promise<Object>} - { success, filledCount, totalVars, unmatched, message }
 */
async function quickFill(context, datasetName, options = {}) {
    const Template = DocForge.Template;
    
    // Load the dataset (handles both shared: and personal: prefixes)
    let datasetValues = null;
    let displayName = datasetName;
    let isShared = false;
    
    if (datasetName.startsWith('shared:')) {
        // Load from shared datasets
        const name = datasetName.replace('shared:', '');
        displayName = name;
        isShared = true;
        
        const dataset = await Template.sharedDatasetManager.loadSharedDataset(name);
        datasetValues = dataset ? dataset.values : null;
    } else if (datasetName.startsWith('personal:')) {
        // Load from personal datasets
        const name = datasetName.replace('personal:', '');
        displayName = name;
        datasetValues = Template.datasetManager.loadDataset(name);
    } else {
        // No prefix - try personal first, then shared
        datasetValues = Template.datasetManager.loadDataset(datasetName);
        
        if (!datasetValues && Template.sharedDatasetManager?.isConfigured()) {
            const dataset = await Template.sharedDatasetManager.loadSharedDataset(datasetName);
            datasetValues = dataset ? dataset.values : null;
            isShared = datasetValues !== null;
        }
    }
    
    if (!datasetValues) {
        return {
            success: false,
            message: `Dataset "${displayName}" not found`
        };
    }
    
    // Scan document for variables
    const result = await Template.scanDocument(context, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        forceRefresh: true
    });
    
    const variables = result.variables;
    
    if (variables.length === 0) {
        return {
            success: false,
            message: 'No template variables found in document'
        };
    }
    
    // Match dataset to document (case-insensitive)
    const match = Template.datasetManager.matchToDocument(datasetValues, variables);
    
    const matchedCount = Object.keys(match.matched).length;
    const totalVars = variables.length;
    
    if (matchedCount === 0) {
        return {
            success: false,
            filledCount: 0,
            totalVars: totalVars,
            unmatched: match.unmatched,
            message: `No matching variables found. Dataset has: ${Object.keys(datasetValues).join(', ')}`
        };
    }
    
    // Fill the matched variables
    const fillResult = await Template.fillTemplate(context, match.matched, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        highlightUnfilled: options.highlightUnfilled || false
    });
    
    // Update UI state
    TemplateUI.currentValues = { ...TemplateUI.currentValues, ...match.matched };
    
    // Build result message
    const unmatchedCount = match.unmatched.length;
    const sourceLabel = isShared ? '(firm)' : '(personal)';
    let message;
    if (unmatchedCount === 0) {
        message = `Filled all ${matchedCount} variables ${sourceLabel}`;
    } else {
        message = `Filled ${matchedCount}/${totalVars} variables ${sourceLabel} (${unmatchedCount} not in dataset)`;
    }
    
    return {
        success: true,
        filledCount: matchedCount,
        totalVars: totalVars,
        matched: match.matched,
        unmatched: match.unmatched,
        notInDataset: match.notInDataset,
        isShared: isShared,
        message: message
    };
}

/**
 * Quick Fill from selected values in UI
 * @param {Word.RequestContext} context
 * @param {Object} values - Variable name -> value from UI inputs
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function quickFillFromUI(context, values, options = {}) {
    const Template = DocForge.Template;
    
    // Scan document first
    const result = await Template.scanDocument(context, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        forceRefresh: true
    });
    
    const variables = result.variables;
    
    // Match UI values to document
    const match = Template.datasetManager.matchToDocument(values, variables);
    
    if (Object.keys(match.matched).length === 0) {
        return {
            success: false,
            message: 'Please enter values for at least one variable'
        };
    }
    
    // Fill
    const fillResult = await Template.fillTemplate(context, match.matched, {
        bracketStyles: TemplateUI.enabledBracketStyles,
        highlightUnfilled: options.highlightUnfilled || false
    });
    
    // Update state
    TemplateUI.currentValues = { ...TemplateUI.currentValues, ...match.matched };
    
    return {
        success: true,
        filledCount: Object.keys(match.matched).length,
        totalVars: variables.length,
        unmatched: match.unmatched,
        message: fillResult.message
    };
}

/**
 * Save current UI values as a dataset
 * @param {string} name
 * @param {string} description
 * @returns {Object}
 */
function saveCurrentAsDataset(name, description = '') {
    const Template = DocForge.Template;
    
    // Get values from UI state
    const values = { ...TemplateUI.currentValues };
    
    // Count non-empty values
    const valueCount = Object.values(values).filter(v => v && v !== '').length;
    
    if (valueCount === 0) {
        return {
            success: false,
            message: 'Please fill in at least one variable before saving'
        };
    }
    
    const success = Template.datasetManager.saveDataset(name, values, { description });
    
    return {
        success,
        valueCount,
        message: success 
            ? `Saved dataset "${name}" with ${valueCount} values`
            : 'Failed to save dataset'
    };
}

/**
 * Generate HTML for dataset dropdown (with shared/personal groups)
 * @param {string} selectedName
 * @returns {string}
 */
function generateDatasetDropdownHTML(selectedName = '') {
    const Template = DocForge.Template;
    const personalDatasets = getDatasets();
    const recent = getRecentDatasets(5);
    const recentNames = recent.map(d => d.name);
    
    let html = '<option value="">Select client/matter...</option>';
    
    // Recent datasets section (personal only for now - shared handled async)
    if (recentNames.length > 0) {
        html += '<optgroup label="Recent">';
        for (const r of recent) {
            const selected = `personal:${r.name}` === selectedName ? 'selected' : '';
            html += `<option value="personal:${escapeAttr(r.name)}" ${selected}>
                ${escapeHtml(r.name)} (${r.valueCount} values)
            </option>`;
        }
        html += '</optgroup>';
    }
    
    // Personal datasets (excluding recent)
    const otherPersonal = personalDatasets.filter(d => !recentNames.includes(d.name));
    if (otherPersonal.length > 0) {
        html += '<optgroup label="My Datasets">';
        for (const d of otherPersonal) {
            const selected = `personal:${d.name}` === selectedName ? 'selected' : '';
            html += `<option value="personal:${escapeAttr(d.name)}" ${selected}>
                ${escapeHtml(d.name)} (${d.valueCount} values)
            </option>`;
        }
        html += '</optgroup>';
    }
    
    if (personalDatasets.length === 0 && !Template.sharedDatasetManager?.isConfigured()) {
        html = '<option value="">No saved datasets yet</option>';
    }
    
    return html;
}

/**
 * Generate HTML for dataset dropdown with shared datasets (async)
 * @param {string} selectedName
 * @returns {Promise<string>}
 */
async function generateDatasetDropdownHTMLAsync(selectedName = '') {
    const Template = DocForge.Template;
    const personalDatasets = getDatasets();
    const recent = getRecentDatasets(5);
    const recentNames = recent.map(d => d.name);
    
    // Get shared datasets if configured
    let sharedDatasets = [];
    if (Template.sharedDatasetManager?.isConfigured()) {
        try {
            sharedDatasets = await Template.sharedDatasetManager.getSharedDatasets();
        } catch (e) {
            console.warn('Failed to load shared datasets for dropdown:', e);
        }
    }
    
    let html = '<option value="">Select client/matter...</option>';
    
    // Shared datasets (firm-wide) - show first
    if (sharedDatasets.length > 0) {
        html += '<optgroup label="Firm Datasets">';
        for (const d of sharedDatasets) {
            const selected = `shared:${d.name}` === selectedName ? 'selected' : '';
            html += `<option value="shared:${escapeAttr(d.name)}" ${selected}>
                ${escapeHtml(d.name)} (${d.valueCount || '?'} values)
            </option>`;
        }
        html += '</optgroup>';
    }
    
    // Recent personal datasets
    if (recentNames.length > 0) {
        html += '<optgroup label="Recent">';
        for (const r of recent) {
            const selected = `personal:${r.name}` === selectedName ? 'selected' : '';
            html += `<option value="personal:${escapeAttr(r.name)}" ${selected}>
                ${escapeHtml(r.name)} (${r.valueCount} values)
            </option>`;
        }
        html += '</optgroup>';
    }
    
    // Other personal datasets
    const otherPersonal = personalDatasets.filter(d => !recentNames.includes(d.name));
    if (otherPersonal.length > 0) {
        html += '<optgroup label="My Datasets">';
        for (const d of otherPersonal) {
            const selected = `personal:${d.name}` === selectedName ? 'selected' : '';
            html += `<option value="personal:${escapeAttr(d.name)}" ${selected}>
                ${escapeHtml(d.name)} (${d.valueCount} values)
            </option>`;
        }
        html += '</optgroup>';
    }
    
    if (personalDatasets.length === 0 && sharedDatasets.length === 0) {
        html = '<option value="">No datasets available</option>';
    }
    
    return html;
}

/**
 * Generate HTML for quick fill result summary
 * @param {Object} result - Result from quickFill()
 * @returns {string}
 */
function generateQuickFillResultHTML(result) {
    if (!result.success) {
        return `<div class="result-item error">${escapeHtml(result.message)}</div>`;
    }
    
    let html = `<div class="result-item success">
        <strong>${result.filledCount}/${result.totalVars}</strong> variables filled
    </div>`;
    
    // Show unmatched variables if any
    if (result.unmatched && result.unmatched.length > 0) {
        html += `<div class="result-item warning">
            <strong>Not in dataset:</strong> ${result.unmatched.map(escapeHtml).join(', ')}
        </div>`;
    }
    
    return html;
}

/**
 * HTML escape helper
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Attribute escape helper
 */
function escapeAttr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ============================================================================
// EXPORT TO DOCFORGE NAMESPACE
// ============================================================================

// Create or extend Template namespace
DocForge.Template = {
    // Inherit from core module
    ...(window.DocForge?.Template || {}),
    
    // UI-specific functions
    scanVariables,
    quickScanStats,
    fillTemplate,
    previewFill,
    insertVariable,
    
    // Profile management (legacy)
    listProfiles,
    getRecentProfiles,
    saveProfile,
    loadProfile,
    deleteProfile,
    exportProfiles,
    importProfiles,
    
    // Quick Fill Dataset management
    getDatasets,
    getRecentDatasets,
    saveDataset,
    loadDataset,
    deleteDataset,
    quickFill,
    quickFillFromUI,
    saveCurrentAsDataset,
    generateDatasetDropdownHTML,
    generateDatasetDropdownHTMLAsync,
    generateQuickFillResultHTML,
    
    // Validation
    validateValues,
    validateSingleValue,
    formatValue,
    
    // Highlighting
    highlightUnfilled,
    clearHighlighting,
    toggleHighlighting,
    
    // Export/Import
    exportToJSON,
    exportToCSV,
    importValuesFromJSON,
    
    // Configuration
    getBracketStyles,
    setEnabledBracketStyles,
    toggleBracketStyle,
    getVariableTypes,
    getTypeForVariable,
    
    // State
    clearState,
    getState,
    
    // HTML Helpers
    generateVariableListHTML,
    generateProfileDropdownHTML,
    generatePreviewHTML,
    generateBracketStylesHTML,
    
    // Internal state (for debugging)
    _ui: TemplateUI
};

// Also export for direct access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scanVariables,
        quickScanStats,
        fillTemplate,
        previewFill,
        insertVariable,
        listProfiles,
        getRecentProfiles,
        saveProfile,
        loadProfile,
        deleteProfile,
        exportProfiles,
        importProfiles,
        validateValues,
        validateSingleValue,
        formatValue,
        highlightUnfilled,
        clearHighlighting,
        toggleHighlighting,
        exportToJSON,
        exportToCSV,
        importValuesFromJSON,
        getBracketStyles,
        setEnabledBracketStyles,
        toggleBracketStyle,
        getVariableTypes,
        getTypeForVariable,
        clearState,
        getState,
        generateVariableListHTML,
        generateProfileDropdownHTML,
        generatePreviewHTML,
        generateBracketStylesHTML,
        TemplateUI
    };
}
