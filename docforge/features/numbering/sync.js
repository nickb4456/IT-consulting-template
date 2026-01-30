/**
 * DocForge Numbering Set Sync Module
 * 
 * Handles persistence, synchronization, and management of numbering sets
 * across personal (localStorage) and firm (cloud) scopes.
 */

// Storage keys
const STORAGE_KEYS = {
    PERSONAL_SETS: 'docforge_numbering_personal',
    FIRM_CACHE: 'docforge_numbering_firm_cache',
    FIRM_CACHE_ETAG: 'docforge_numbering_firm_etag',
    SYNC_QUEUE: 'docforge_numbering_sync_queue',
    USER_STATE: 'docforge_numbering_state' // Last used, default, recent
};

// API endpoints (relative to backend base URL)
const API = {
    USER_SETS: '/api/user/numbering-sets',
    FIRM_SETS: '/api/firm/numbering-sets',
    IMPORT: '/api/numbering-sets/import',
    EXPORT: '/api/numbering-sets/export'
};

/**
 * Generate a UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * NumberingSetManager - Main class for managing numbering sets
 * 
 * Design principle: Configure once → One-click apply
 * Tracks last-used and default presets for frictionless repeat use.
 */
class NumberingSetManager {
    constructor(options = {}) {
        this.apiBaseUrl = options.apiBaseUrl || '';
        this.authToken = options.authToken || null;
        this.userEmail = options.userEmail || null;
        this.firmId = options.firmId || null;
        this.isAdmin = options.isAdmin || false;
        
        // Cache for firm sets (avoid repeated API calls)
        this.firmSetsCache = null;
        this.firmSetsCacheExpiry = null;
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    }

    // =========================================================================
    // USER STATE (Last used, default, recent presets)
    // =========================================================================

    /**
     * Get user's numbering state (last used, default, recent)
     */
    getUserState() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.USER_STATE);
            return data ? JSON.parse(data) : {
                lastUsed: null,
                defaultPreset: null,
                recentPresets: []
            };
        } catch (e) {
            return { lastUsed: null, defaultPreset: null, recentPresets: [] };
        }
    }

    /**
     * Update user's numbering state
     */
    updateUserState(updates) {
        try {
            const state = this.getUserState();
            Object.assign(state, updates);
            
            // Keep recent list to max 5 items
            if (state.recentPresets && state.recentPresets.length > 5) {
                state.recentPresets = state.recentPresets.slice(0, 5);
            }
            
            localStorage.setItem(STORAGE_KEYS.USER_STATE, JSON.stringify(state));
            return state;
        } catch (e) {
            console.warn('Failed to update user state:', e);
            return this.getUserState();
        }
    }

    /**
     * Record a preset was used (updates lastUsed and recent list)
     */
    recordPresetUsed(presetId) {
        const state = this.getUserState();
        state.lastUsed = presetId;
        
        // Add to recent, dedupe, keep max 5
        state.recentPresets = state.recentPresets || [];
        state.recentPresets = [presetId, ...state.recentPresets.filter(id => id !== presetId)].slice(0, 5);
        
        this.updateUserState(state);
    }

    /**
     * Set the default preset (used for keyboard shortcut)
     */
    setDefaultPreset(presetId) {
        this.updateUserState({ defaultPreset: presetId });
    }

    /**
     * Get the default preset ID
     */
    getDefaultPreset() {
        return this.getUserState().defaultPreset;
    }

    /**
     * Get the last used preset ID
     */
    getLastUsed() {
        return this.getUserState().lastUsed;
    }

    /**
     * Get the preset to use on panel open (last used or default)
     */
    getAutoSelectPreset() {
        const state = this.getUserState();
        return state.lastUsed || state.defaultPreset || 'preset-standard-firm-outline';
    }

    // =========================================================================
    // PERSONAL SETS (localStorage)
    // =========================================================================

    /**
     * Get all personal numbering sets
     */
    getPersonalSets() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PERSONAL_SETS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('[Numbering] Load personal sets failed:', e);
            // Return empty array but log for debugging - user won't see error directly here
            return [];
        }
    }

    /**
     * Save personal sets to localStorage
     */
    _savePersonalSets(sets) {
        try {
            localStorage.setItem(STORAGE_KEYS.PERSONAL_SETS, JSON.stringify(sets));
        } catch (e) {
            console.error('[Numbering] Save personal sets failed:', e);
            throw new Error("Couldn't save your numbering set — storage might be full");
        }
    }

    /**
     * Get a specific personal set by ID
     */
    getPersonalSet(id) {
        const sets = this.getPersonalSets();
        return sets.find(s => s.id === id) || null;
    }

    /**
     * Save a personal numbering set (create or update)
     */
    savePersonalSet(set) {
        const sets = this.getPersonalSets();
        const now = new Date().toISOString();
        
        const existingIndex = sets.findIndex(s => s.id === set.id);
        
        if (existingIndex >= 0) {
            // Update existing
            sets[existingIndex] = {
                ...sets[existingIndex],
                ...set,
                updatedAt: now,
                version: (sets[existingIndex].version || 1) + 1
            };
        } else {
            // Create new
            sets.push({
                ...set,
                id: set.id || generateUUID(),
                scope: 'personal',
                createdBy: this.userEmail,
                createdAt: now,
                updatedAt: now,
                version: 1
            });
        }
        
        this._savePersonalSets(sets);
        
        // Queue for cloud sync if online
        this._queueSync('personal', set.id, 'upsert');
        
        return sets[existingIndex >= 0 ? existingIndex : sets.length - 1];
    }

    /**
     * Delete a personal numbering set
     */
    deletePersonalSet(id) {
        const sets = this.getPersonalSets();
        const filtered = sets.filter(s => s.id !== id);
        
        if (filtered.length === sets.length) {
            throw new Error('Set not found');
        }
        
        this._savePersonalSets(filtered);
        this._queueSync('personal', id, 'delete');
    }

    // =========================================================================
    // FIRM SETS (Cloud API)
    // =========================================================================

    /**
     * Fetch all firm numbering sets
     */
    async getFirmSets(forceRefresh = false) {
        // Return cached if fresh
        if (!forceRefresh && this.firmSetsCache && this.firmSetsCacheExpiry > Date.now()) {
            return this.firmSetsCache;
        }

        // Check localStorage cache for offline
        if (!navigator.onLine) {
            return this._getOfflineFirmCache();
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}${API.FIRM_SETS}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Update caches
            this.firmSetsCache = data.sets || data;
            this.firmSetsCacheExpiry = Date.now() + this.CACHE_TTL_MS;
            this._updateOfflineFirmCache(this.firmSetsCache, response.headers.get('ETag'));

            return this.firmSetsCache;
        } catch (e) {
            console.error('Failed to fetch firm sets:', e);
            // Fall back to offline cache
            return this._getOfflineFirmCache();
        }
    }

    /**
     * Get a specific firm set by ID
     */
    async getFirmSet(id) {
        const sets = await this.getFirmSets();
        return sets.find(s => s.id === id) || null;
    }

    /**
     * Create a new firm numbering set (admin only)
     */
    async createFirmSet(set) {
        if (!this.isAdmin) {
            throw new Error('Permission denied: Admin access required');
        }

        const now = new Date().toISOString();
        const newSet = {
            ...set,
            id: generateUUID(),
            scope: 'firm',
            createdBy: this.userEmail,
            createdAt: now,
            updatedAt: now,
            version: 1
        };

        const response = await fetch(`${this.apiBaseUrl}${API.FIRM_SETS}`, {
            method: 'POST',
            headers: {
                ...this._getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSet)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Invalidate cache
        this.firmSetsCache = null;

        return await response.json();
    }

    /**
     * Update an existing firm numbering set (admin only)
     */
    async updateFirmSet(id, updates, expectedVersion) {
        if (!this.isAdmin) {
            throw new Error('Permission denied: Admin access required');
        }

        const response = await fetch(`${this.apiBaseUrl}${API.FIRM_SETS}/${id}`, {
            method: 'PUT',
            headers: {
                ...this._getAuthHeaders(),
                'Content-Type': 'application/json',
                'If-Match': `"${expectedVersion}"`
            },
            body: JSON.stringify({
                ...updates,
                updatedAt: new Date().toISOString()
            })
        });

        if (response.status === 409) {
            // Version conflict
            const current = await response.json();
            throw new ConflictError('Version conflict', current);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Invalidate cache
        this.firmSetsCache = null;

        return await response.json();
    }

    /**
     * Delete a firm numbering set (admin only)
     */
    async deleteFirmSet(id) {
        if (!this.isAdmin) {
            throw new Error('Permission denied: Admin access required');
        }

        const response = await fetch(`${this.apiBaseUrl}${API.FIRM_SETS}/${id}`, {
            method: 'DELETE',
            headers: this._getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Invalidate cache
        this.firmSetsCache = null;
    }

    /**
     * Promote a personal set to firm set (admin only)
     */
    async promoteToFirmSet(personalSetId) {
        const personalSet = this.getPersonalSet(personalSetId);
        if (!personalSet) {
            throw new Error('Personal set not found');
        }

        const { id, scope, createdAt, createdBy, ...setData } = personalSet;
        return this.createFirmSet(setData);
    }

    // =========================================================================
    // UNIFIED ACCESS
    // =========================================================================

    /**
     * Get all available numbering sets (personal + firm)
     */
    async getAllSets() {
        const [personal, firm] = await Promise.all([
            Promise.resolve(this.getPersonalSets()),
            this.getFirmSets().catch(() => [])
        ]);

        return {
            personal,
            firm,
            all: [...firm, ...personal] // Firm sets first
        };
    }

    /**
     * Get a set by ID (searches both personal and firm)
     */
    async getSet(id) {
        // Check personal first (faster)
        const personal = this.getPersonalSet(id);
        if (personal) return personal;

        // Then check firm
        return this.getFirmSet(id);
    }

    /**
     * Save a set (routes to personal or firm based on scope)
     */
    async saveSet(set) {
        if (set.scope === 'firm') {
            if (set.id) {
                return this.updateFirmSet(set.id, set, set.version);
            } else {
                return this.createFirmSet(set);
            }
        } else {
            return this.savePersonalSet(set);
        }
    }

    // =========================================================================
    // IMPORT / EXPORT
    // =========================================================================

    /**
     * Export a numbering set to JSON
     */
    async exportSet(id) {
        const set = await this.getSet(id);
        if (!set) {
            throw new Error('Set not found');
        }

        // Remove internal fields for clean export
        const { createdBy, createdAt, updatedAt, version, ...exportData } = set;

        return {
            format: 'docforge-numbering-v1',
            exportedAt: new Date().toISOString(),
            set: exportData
        };
    }

    /**
     * Import a numbering set from JSON
     */
    importSet(jsonData, targetScope = 'personal') {
        // Validate format
        if (typeof jsonData === 'string') {
            jsonData = JSON.parse(jsonData);
        }

        if (jsonData.format !== 'docforge-numbering-v1') {
            throw new Error('Invalid format: Expected docforge-numbering-v1');
        }

        if (!jsonData.set || !jsonData.set.name || !jsonData.set.levels) {
            throw new Error('Invalid numbering set data');
        }

        // Create new set with fresh ID
        const importedSet = {
            ...jsonData.set,
            id: generateUUID(),
            scope: targetScope
        };

        if (targetScope === 'personal') {
            return this.savePersonalSet(importedSet);
        } else if (targetScope === 'firm' && this.isAdmin) {
            return this.createFirmSet(importedSet);
        } else {
            throw new Error("You need admin access to add firm-wide numbering sets");
        }
    }

    /**
     * Download a set as a JSON file
     */
    async downloadSetAsFile(id) {
        const exportData = await this.exportSet(id);
        const set = await this.getSet(id);
        const filename = `${set.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docforge-numbering.json`;
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // =========================================================================
    // SYNC QUEUE (for offline-first personal sets)
    // =========================================================================

    /**
     * Queue a sync operation for when we're back online
     */
    _queueSync(scope, id, operation) {
        if (!this.authToken) return; // No cloud sync without auth

        try {
            const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
            queue.push({
                scope,
                id,
                operation,
                timestamp: Date.now()
            });
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (e) {
            console.warn('Failed to queue sync operation:', e);
        }
    }

    /**
     * Process pending sync operations
     */
    async processSyncQueue() {
        if (!navigator.onLine || !this.authToken) return;

        const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
        if (queue.length === 0) return;

        const processed = [];
        
        for (const item of queue) {
            try {
                if (item.scope === 'personal') {
                    if (item.operation === 'upsert') {
                        const set = this.getPersonalSet(item.id);
                        if (set) {
                            await fetch(`${this.apiBaseUrl}${API.USER_SETS}`, {
                                method: 'POST',
                                headers: {
                                    ...this._getAuthHeaders(),
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(set)
                            });
                        }
                    } else if (item.operation === 'delete') {
                        await fetch(`${this.apiBaseUrl}${API.USER_SETS}/${item.id}`, {
                            method: 'DELETE',
                            headers: this._getAuthHeaders()
                        });
                    }
                }
                processed.push(item);
            } catch (e) {
                console.warn('Sync operation failed:', e);
                // Leave in queue for retry
            }
        }

        // Remove processed items
        const remaining = queue.filter(item => 
            !processed.some(p => p.id === item.id && p.timestamp === item.timestamp)
        );
        localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining));
    }

    // =========================================================================
    // OFFLINE CACHE HELPERS
    // =========================================================================

    _getOfflineFirmCache() {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.FIRM_CACHE);
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            return [];
        }
    }

    _updateOfflineFirmCache(sets, etag) {
        try {
            localStorage.setItem(STORAGE_KEYS.FIRM_CACHE, JSON.stringify(sets));
            if (etag) {
                localStorage.setItem(STORAGE_KEYS.FIRM_CACHE_ETAG, etag);
            }
        } catch (e) {
            console.warn('Failed to update offline cache:', e);
        }
    }

    _getAuthHeaders() {
        const headers = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.firmId) {
            headers['X-Firm-ID'] = this.firmId;
        }
        return headers;
    }
}

/**
 * Custom error for version conflicts
 */
class ConflictError extends Error {
    constructor(message, currentVersion) {
        super(message);
        this.name = 'ConflictError';
        this.currentVersion = currentVersion;
    }
}

// =========================================================================
// PRESET NUMBERING SETS
// =========================================================================

const PRESET_NUMBERING_SETS = [
    {
        id: 'preset-standard-firm-outline',
        name: 'Standard Firm Outline',
        description: 'ARTICLE I → 1.1 → (a) → (i) → (A)',
        scope: 'template',
        levels: [
            {
                level: 1,
                name: 'Article',
                patternType: 'roman-upper',
                prefix: 'ARTICLE ',
                suffix: '',
                followedBy: 'newline',
                style: { bold: true, allCaps: true, fontSize: 12 },
                indent: { left: 0, hanging: 0 },
                restartAfter: null
            },
            {
                level: 2,
                name: 'Section',
                patternType: 'decimal-outline',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: true, fontSize: 12 },
                indent: { left: 0, hanging: 36 },
                restartAfter: 1
            },
            {
                level: 3,
                name: 'Subsection',
                patternType: 'alpha-lower',
                prefix: '(',
                suffix: ')',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 36, hanging: 36 },
                restartAfter: 2
            },
            {
                level: 4,
                name: 'Clause',
                patternType: 'roman-lower',
                prefix: '(',
                suffix: ')',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 72, hanging: 36 },
                restartAfter: 3
            },
            {
                level: 5,
                name: 'Sub-clause',
                patternType: 'alpha-upper',
                prefix: '(',
                suffix: ')',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 108, hanging: 36 },
                restartAfter: 4
            }
        ]
    },
    {
        id: 'preset-federal-court',
        name: 'Federal Court Style',
        description: 'I. → A. → 1. → a.',
        scope: 'template',
        levels: [
            {
                level: 1,
                name: 'Main',
                patternType: 'roman-upper',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: true, fontSize: 12 },
                indent: { left: 0, hanging: 36 },
                restartAfter: null
            },
            {
                level: 2,
                name: 'Sub',
                patternType: 'alpha-upper',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 36, hanging: 36 },
                restartAfter: 1
            },
            {
                level: 3,
                name: 'Item',
                patternType: 'arabic',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 72, hanging: 36 },
                restartAfter: 2
            },
            {
                level: 4,
                name: 'Sub-item',
                patternType: 'alpha-lower',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 108, hanging: 36 },
                restartAfter: 3
            }
        ]
    },
    {
        id: 'preset-contract-style',
        name: 'Contract Style',
        description: 'ARTICLE I → Section 1.1 → 1.1.1 → (a) → (i)',
        scope: 'template',
        levels: [
            {
                level: 1,
                name: 'Article',
                patternType: 'roman-upper',
                prefix: 'ARTICLE ',
                suffix: '',
                followedBy: 'newline',
                style: { bold: true, allCaps: true, fontSize: 12 },
                indent: { left: 0, hanging: 0 },
                restartAfter: null
            },
            {
                level: 2,
                name: 'Section',
                patternType: 'decimal-outline',
                prefix: 'Section ',
                suffix: '.',
                includeParentNumbers: false,
                followedBy: 'tab',
                style: { bold: true, fontSize: 12 },
                indent: { left: 0, hanging: 72 },
                restartAfter: 1
            },
            {
                level: 3,
                name: 'Subsection',
                patternType: 'decimal-outline',
                prefix: '',
                suffix: '.',
                includeParentNumbers: true,
                parentSeparator: '.',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 36, hanging: 54 },
                restartAfter: 2
            },
            {
                level: 4,
                name: 'Paragraph',
                patternType: 'alpha-lower',
                prefix: '(',
                suffix: ')',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 72, hanging: 36 },
                restartAfter: 3
            },
            {
                level: 5,
                name: 'Sub-paragraph',
                patternType: 'roman-lower',
                prefix: '(',
                suffix: ')',
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 108, hanging: 36 },
                restartAfter: 4
            }
        ]
    },
    {
        id: 'preset-simple-numeric',
        name: 'Simple Numeric',
        description: '1. → 1.1 → 1.1.1',
        scope: 'template',
        levels: [
            {
                level: 1,
                name: 'Main',
                patternType: 'arabic',
                prefix: '',
                suffix: '.',
                followedBy: 'tab',
                style: { bold: true, fontSize: 12 },
                indent: { left: 0, hanging: 36 },
                restartAfter: null
            },
            {
                level: 2,
                name: 'Sub',
                patternType: 'decimal-outline',
                prefix: '',
                suffix: '.',
                includeParentNumbers: true,
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 36, hanging: 54 },
                restartAfter: 1
            },
            {
                level: 3,
                name: 'Sub-sub',
                patternType: 'decimal-outline',
                prefix: '',
                suffix: '.',
                includeParentNumbers: true,
                followedBy: 'tab',
                style: { bold: false, fontSize: 12 },
                indent: { left: 72, hanging: 72 },
                restartAfter: 2
            }
        ]
    }
];

// =========================================================================
// NUMBERING FORMATTER (for preview and application)
// =========================================================================

/**
 * Format a number according to pattern type
 */
function formatNumber(patternType, value) {
    switch (patternType) {
        case 'arabic':
            return String(value);
        case 'roman-upper':
            return toRoman(value).toUpperCase();
        case 'roman-lower':
            return toRoman(value).toLowerCase();
        case 'alpha-upper':
            return toAlpha(value).toUpperCase();
        case 'alpha-lower':
            return toAlpha(value).toLowerCase();
        case 'decimal-outline':
            return String(value);
        default:
            return String(value);
    }
}

/**
 * Convert number to Roman numerals
 */
function toRoman(num) {
    const lookup = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let result = '';
    for (const [letter, value] of lookup) {
        while (num >= value) {
            result += letter;
            num -= value;
        }
    }
    return result;
}

/**
 * Convert number to letter (1=A, 2=B, ..., 27=AA)
 */
function toAlpha(num) {
    let result = '';
    while (num > 0) {
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - 1) / 26);
    }
    return result;
}

/**
 * Generate preview text for a numbering set
 */
function generatePreview(numberingSet, maxLevels = 3) {
    const lines = [];
    const counters = {};
    
    // Initialize counters
    numberingSet.levels.forEach(level => {
        counters[level.level] = level.startAt || 1;
    });

    // Generate sample structure
    const sampleStructure = [
        { level: 1, text: 'First Major Section' },
        { level: 2, text: 'First Subsection' },
        { level: 3, text: 'First paragraph under subsection' },
        { level: 3, text: 'Second paragraph under subsection' },
        { level: 2, text: 'Second Subsection' },
        { level: 1, text: 'Second Major Section' },
        { level: 2, text: 'First Subsection of Second' }
    ];

    for (const item of sampleStructure) {
        const levelDef = numberingSet.levels.find(l => l.level === item.level);
        if (!levelDef || item.level > maxLevels) continue;

        // Reset lower levels if needed
        for (const lvl of numberingSet.levels) {
            if (lvl.restartAfter && lvl.restartAfter < item.level) {
                counters[lvl.level] = lvl.startAt || 1;
            }
        }

        // Build number string
        let numberStr = '';
        if (levelDef.includeParentNumbers) {
            // Include parent numbers (e.g., 1.1.1)
            const parts = [];
            for (let l = 1; l <= item.level; l++) {
                const parentDef = numberingSet.levels.find(lvl => lvl.level === l);
                if (parentDef) {
                    parts.push(formatNumber(parentDef.patternType, counters[l]));
                }
            }
            numberStr = levelDef.prefix + parts.join(levelDef.parentSeparator || '.') + levelDef.suffix;
        } else {
            numberStr = levelDef.prefix + formatNumber(levelDef.patternType, counters[item.level]) + levelDef.suffix;
        }

        // Calculate indent (simplified for preview)
        const indent = '    '.repeat(item.level - 1);

        lines.push(`${indent}${numberStr} ${item.text}`);

        // Increment counter
        counters[item.level]++;
    }

    return lines.join('\n');
}

// =========================================================================
// EXPORTS
// =========================================================================

// For ES modules
export {
    NumberingSetManager,
    ConflictError,
    PRESET_NUMBERING_SETS,
    formatNumber,
    generatePreview,
    toRoman,
    toAlpha,
    generateUUID
};

// For CommonJS/Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NumberingSetManager,
        ConflictError,
        PRESET_NUMBERING_SETS,
        formatNumber,
        generatePreview,
        toRoman,
        toAlpha,
        generateUUID
    };
}
