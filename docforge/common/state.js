/**
 * DocForge State Management
 * 
 * Centralized state management for the DocForge application.
 * Provides reactive state updates and persistence.
 * 
 * @version 1.0.0
 */

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
    // User context
    user: {
        id: null,
        email: null,
        name: null,
        isAdmin: false,
        preferences: {}
    },
    
    // Firm context
    firm: {
        id: null,
        name: null,
        config: null
    },
    
    // Current session state
    session: {
        initialized: false,
        activeTab: 'templates',
        isOnline: navigator.onLine,
        syncStatus: 'idle',
        lastError: null
    },
    
    // Template fill state
    templates: {
        currentSchema: null,
        currentDataset: null,
        controlMap: null,
        restorePoint: null,
        documentFields: [],
        isDirty: false
    },
    
    // Numbering state
    numbering: {
        selectedPreset: null,
        lastUsed: null,
        defaultPreset: null,
        recentPresets: [],
        firmSets: [],
        personalSets: []
    },
    
    // Letterhead state
    letterhead: {
        firmConfig: null,
        selectedAttorney: null,
        attorneys: [],
        documentOptions: {
            layout: 'split',
            showLogo: true,
            dateFormat: 'MMMM D, YYYY'
        }
    },
    
    // Feature flags (hide incomplete features)
    features: {
        toc: false,          // TOC generator - hidden until complete
        crossref: false,     // Cross-references - hidden until complete
        cloudSync: false,    // Cloud sync - hidden until backend ready
        teamSharing: false   // Team features - hidden until v2
    },
    
    // UI state
    ui: {
        loading: false,
        loadingMessage: '',
        toasts: [],
        modals: [],
        expandedSections: {}
    }
};

// ============================================================================
// State Store
// ============================================================================

let state = JSON.parse(JSON.stringify(initialState));
let listeners = new Map();
let listenerIdCounter = 0;

/**
 * Get current state or a slice of it
 * @param {string} path - Optional dot-notation path
 * @returns {*} State or state slice
 */
function getState(path = null) {
    if (!path) return state;
    
    const parts = path.split('.');
    let current = state;
    
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    
    return current;
}

/**
 * Update state
 * @param {string} path - Dot-notation path
 * @param {*} value - New value
 */
function setState(path, value) {
    const parts = path.split('.');
    let current = state;
    
    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }
    
    // Store old value for comparison
    const oldValue = current[parts[parts.length - 1]];
    
    // Set new value
    current[parts[parts.length - 1]] = value;
    
    // Notify listeners
    notifyListeners(path, value, oldValue);
}

/**
 * Merge partial state
 * @param {string} path - Base path
 * @param {Object} partial - Partial state to merge
 */
function mergeState(path, partial) {
    const current = getState(path) || {};
    setState(path, { ...current, ...partial });
}

/**
 * Reset state to initial values
 * @param {string} path - Optional path to reset (resets all if omitted)
 */
function resetState(path = null) {
    if (path) {
        const parts = path.split('.');
        let initial = initialState;
        for (const part of parts) {
            initial = initial[part];
        }
        setState(path, JSON.parse(JSON.stringify(initial)));
    } else {
        state = JSON.parse(JSON.stringify(initialState));
        notifyListeners('*', state, null);
    }
}

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to state changes
 * @param {string|string[]} paths - Path(s) to watch
 * @param {Function} callback - Callback function (newValue, oldValue, path)
 * @returns {Function} Unsubscribe function
 */
function subscribe(paths, callback) {
    const id = ++listenerIdCounter;
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    pathArray.forEach(path => {
        if (!listeners.has(path)) {
            listeners.set(path, new Map());
        }
        listeners.get(path).set(id, callback);
    });
    
    // Return unsubscribe function
    return () => {
        pathArray.forEach(path => {
            if (listeners.has(path)) {
                listeners.get(path).delete(id);
            }
        });
    };
}

/**
 * Notify listeners of state change
 */
function notifyListeners(changedPath, newValue, oldValue) {
    // Exact path listeners
    if (listeners.has(changedPath)) {
        listeners.get(changedPath).forEach(callback => {
            try {
                callback(newValue, oldValue, changedPath);
            } catch (e) {
                // State listener threw an error - continue notifying other listeners
            }
        });
    }
    
    // Parent path listeners
    const parts = changedPath.split('.');
    for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('.');
        if (listeners.has(parentPath)) {
            listeners.get(parentPath).forEach(callback => {
                try {
                    callback(getState(parentPath), null, changedPath);
                } catch (e) {
                    // State listener threw an error - continue notifying other listeners
                }
            });
        }
    }
    
    // Global listeners
    if (changedPath !== '*' && listeners.has('*')) {
        listeners.get('*').forEach(callback => {
            try {
                callback(state, null, changedPath);
            } catch (e) {
                // State listener threw an error - continue notifying other listeners
            }
        });
    }
}

// ============================================================================
// Actions
// ============================================================================

const actions = {
    initialize() {
        setState('session.initialized', true);
    },
    
    setActiveTab(tab) {
        setState('session.activeTab', tab);
    },
    
    setOnlineStatus(isOnline) {
        setState('session.isOnline', isOnline);
    },
    
    // Template actions
    setCurrentSchema(schema) {
        setState('templates.currentSchema', schema);
    },
    
    setCurrentDataset(dataset) {
        setState('templates.currentDataset', dataset);
        setState('templates.isDirty', false);
    },
    
    updateDatasetValue(fieldId, value) {
        const dataset = getState('templates.currentDataset') || { values: {} };
        if (!dataset.values) dataset.values = {};
        dataset.values[fieldId] = value;
        setState('templates.currentDataset', dataset);
        setState('templates.isDirty', true);
    },
    
    setDocumentFields(fields) {
        setState('templates.documentFields', fields);
    },
    
    setRestorePoint(point) {
        setState('templates.restorePoint', point);
    },
    
    // Numbering actions
    selectNumberingPreset(presetId) {
        setState('numbering.selectedPreset', presetId);
        setState('numbering.lastUsed', presetId);
    },
    
    setDefaultNumberingPreset(presetId) {
        setState('numbering.defaultPreset', presetId);
    },
    
    // Letterhead actions
    selectAttorney(attorney) {
        setState('letterhead.selectedAttorney', attorney);
    },
    
    // Feature flags
    isFeatureEnabled(feature) {
        return getState(`features.${feature}`) === true;
    },
    
    enableFeature(feature) {
        setState(`features.${feature}`, true);
    },
    
    // UI actions
    setLoading(loading, message = '') {
        setState('ui.loading', loading);
        setState('ui.loadingMessage', message);
    }
};

// ============================================================================
// Selectors
// ============================================================================

const selectors = {
    hasUnsavedChanges() {
        return getState('templates.isDirty');
    },
    
    canUndo() {
        return !!getState('templates.restorePoint');
    },
    
    getFilledFieldCount() {
        const fields = getState('templates.documentFields') || [];
        return fields.filter(f => !f.isEmpty).length;
    },
    
    getEmptyFieldCount() {
        const fields = getState('templates.documentFields') || [];
        return fields.filter(f => f.isEmpty).length;
    },
    
    getAutoSelectPreset() {
        return getState('numbering.lastUsed') 
            || getState('numbering.defaultPreset')
            || 'preset-standard-firm-outline';
    }
};

// ============================================================================
// Exports
// ============================================================================

const DocForgeState = {
    getState,
    setState,
    mergeState,
    resetState,
    subscribe,
    actions,
    selectors,
    get: getState,
    set: setState,
    merge: mergeState
};

// Global export
if (typeof window !== 'undefined') {
    window.DocForgeState = DocForgeState;
}

export default DocForgeState;
export { DocForgeState, actions, selectors };
