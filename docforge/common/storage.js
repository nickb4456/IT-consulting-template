/**
 * DocForge Storage Manager
 * 
 * Local storage management with caching, offline support, and IndexedDB fallback.
 * Provides a unified interface for persisting data across sessions.
 * 
 * @version 1.0.0
 */

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    // Auth
    AUTH: 'docforge_auth',
    
    // Templates
    TEMPLATES: 'docforge_templates',
    DATASETS: 'docforge_datasets',
    RECENT_DATASETS: 'docforge_recent_datasets',
    
    // Numbering
    NUMBERING_PERSONAL: 'docforge_numbering_personal',
    NUMBERING_FIRM_CACHE: 'docforge_numbering_firm_cache',
    NUMBERING_STATE: 'docforge_numbering_state',
    
    // Letterhead
    FIRM_CONFIG: 'docforge_firm_config',
    ATTORNEYS: 'docforge_attorneys',
    
    // User state
    USER_PREFERENCES: 'docforge_preferences',
    RECENT_FILES: 'docforge_recent_files',
    
    // Sync
    SYNC_QUEUE: 'docforge_sync_queue',
    CACHE_METADATA: 'docforge_cache_meta'
};

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_CONFIG = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxItems: 100,
    storageQuotaWarning: 4 * 1024 * 1024 // 4MB warning threshold
};

// ============================================================================
// Core Storage Operations
// ============================================================================

/**
 * Get an item from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
function get(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;
        return JSON.parse(stored);
    } catch (e) {
        console.warn(`Storage get error for ${key}:`, e);
        return defaultValue;
    }
}

/**
 * Set an item in storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success
 */
function set(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (e) {
        console.error(`Storage set error for ${key}:`, e);
        
        // Check for quota exceeded
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            handleQuotaExceeded();
            // Retry once
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e2) {
                return false;
            }
        }
        return false;
    }
}

/**
 * Remove an item from storage
 * @param {string} key - Storage key
 */
function remove(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn(`Storage remove error for ${key}:`, e);
    }
}

/**
 * Check if key exists
 * @param {string} key - Storage key
 * @returns {boolean}
 */
function has(key) {
    return localStorage.getItem(key) !== null;
}

/**
 * Clear all DocForge storage
 */
function clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached data with TTL check
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in ms
 * @returns {*} Cached value or null if expired
 */
function getWithTTL(key, ttl = CACHE_CONFIG.defaultTTL) {
    const meta = getCacheMeta();
    const itemMeta = meta[key];
    
    if (!itemMeta) return null;
    
    const age = Date.now() - itemMeta.timestamp;
    if (age > ttl) {
        // Expired
        remove(key);
        delete meta[key];
        set(STORAGE_KEYS.CACHE_METADATA, meta);
        return null;
    }
    
    return get(key);
}

/**
 * Set cached data with metadata
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {Object} options - Cache options
 */
function setWithMeta(key, value, options = {}) {
    const success = set(key, value);
    
    if (success) {
        const meta = getCacheMeta();
        meta[key] = {
            timestamp: Date.now(),
            size: JSON.stringify(value).length,
            etag: options.etag || null,
            source: options.source || 'local'
        };
        set(STORAGE_KEYS.CACHE_METADATA, meta);
    }
    
    return success;
}

/**
 * Get cache metadata
 * @returns {Object} Cache metadata
 */
function getCacheMeta() {
    return get(STORAGE_KEYS.CACHE_METADATA, {});
}

/**
 * Get ETag for cached item
 * @param {string} key - Cache key
 * @returns {string|null} ETag or null
 */
function getETag(key) {
    const meta = getCacheMeta();
    return meta[key]?.etag || null;
}

/**
 * Handle storage quota exceeded
 * Clears old cache entries
 */
function handleQuotaExceeded() {
    console.warn('Storage quota exceeded, clearing old cache entries');
    
    const meta = getCacheMeta();
    const entries = Object.entries(meta)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest half
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(([key]) => {
        remove(key);
        delete meta[key];
    });
    
    set(STORAGE_KEYS.CACHE_METADATA, meta);
}

/**
 * Get storage usage statistics
 * @returns {Object} Usage stats
 */
function getStorageStats() {
    let totalSize = 0;
    const breakdown = {};
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('docforge_')) {
            const size = localStorage.getItem(key).length;
            totalSize += size;
            breakdown[key] = size;
        }
    }
    
    return {
        totalSize,
        breakdown,
        itemCount: Object.keys(breakdown).length,
        nearQuota: totalSize > CACHE_CONFIG.storageQuotaWarning
    };
}

// ============================================================================
// Domain-Specific Storage
// ============================================================================

/**
 * Templates storage
 */
const templates = {
    getAll() {
        return get(STORAGE_KEYS.TEMPLATES, {});
    },
    
    get(id) {
        const all = this.getAll();
        return all[id] || null;
    },
    
    save(template) {
        const all = this.getAll();
        template.updatedAt = new Date().toISOString();
        if (!template.createdAt) template.createdAt = template.updatedAt;
        all[template.id] = template;
        return set(STORAGE_KEYS.TEMPLATES, all);
    },
    
    delete(id) {
        const all = this.getAll();
        delete all[id];
        return set(STORAGE_KEYS.TEMPLATES, all);
    },
    
    list(options = {}) {
        const all = this.getAll();
        let results = Object.values(all);
        
        if (options.scope) {
            results = results.filter(t => t.scope === options.scope);
        }
        
        results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return results;
    }
};

/**
 * Datasets storage (Quick Fill)
 */
const datasets = {
    getAll() {
        return get(STORAGE_KEYS.DATASETS, {});
    },
    
    get(id) {
        const all = this.getAll();
        return all[id] || null;
    },
    
    save(dataset) {
        const all = this.getAll();
        dataset.updatedAt = new Date().toISOString();
        if (!dataset.createdAt) dataset.createdAt = dataset.updatedAt;
        if (!dataset.id) dataset.id = generateId();
        all[dataset.id] = dataset;
        set(STORAGE_KEYS.DATASETS, all);
        this.updateRecent(dataset.id);
        return dataset;
    },
    
    delete(id) {
        const all = this.getAll();
        delete all[id];
        return set(STORAGE_KEYS.DATASETS, all);
    },
    
    list(options = {}) {
        const all = this.getAll();
        let results = Object.values(all);
        
        if (options.scope) {
            results = results.filter(d => d.scope === options.scope);
        }
        if (options.templateId) {
            results = results.filter(d => d.templateId === options.templateId);
        }
        
        results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return results;
    },
    
    getRecent(limit = 5) {
        const recentIds = get(STORAGE_KEYS.RECENT_DATASETS, []);
        const all = this.getAll();
        return recentIds
            .slice(0, limit)
            .map(id => all[id])
            .filter(Boolean);
    },
    
    updateRecent(id) {
        let recent = get(STORAGE_KEYS.RECENT_DATASETS, []);
        recent = [id, ...recent.filter(rid => rid !== id)].slice(0, 10);
        set(STORAGE_KEYS.RECENT_DATASETS, recent);
    }
};

/**
 * Numbering sets storage
 */
const numbering = {
    getPersonal() {
        return get(STORAGE_KEYS.NUMBERING_PERSONAL, []);
    },
    
    savePersonal(sets) {
        return set(STORAGE_KEYS.NUMBERING_PERSONAL, sets);
    },
    
    getPersonalSet(id) {
        return this.getPersonal().find(s => s.id === id);
    },
    
    savePersonalSet(numberingSet) {
        const sets = this.getPersonal();
        const index = sets.findIndex(s => s.id === numberingSet.id);
        
        numberingSet.updatedAt = new Date().toISOString();
        
        if (index >= 0) {
            sets[index] = numberingSet;
        } else {
            numberingSet.createdAt = numberingSet.updatedAt;
            if (!numberingSet.id) numberingSet.id = generateId();
            sets.push(numberingSet);
        }
        
        this.savePersonal(sets);
        return numberingSet;
    },
    
    deletePersonalSet(id) {
        const sets = this.getPersonal().filter(s => s.id !== id);
        return this.savePersonal(sets);
    },
    
    getFirmCache() {
        return getWithTTL(STORAGE_KEYS.NUMBERING_FIRM_CACHE, 5 * 60 * 1000) || [];
    },
    
    setFirmCache(sets, etag) {
        return setWithMeta(STORAGE_KEYS.NUMBERING_FIRM_CACHE, sets, { etag, source: 'api' });
    },
    
    getState() {
        return get(STORAGE_KEYS.NUMBERING_STATE, {
            lastUsed: null,
            defaultPreset: null,
            recentPresets: []
        });
    },
    
    updateState(updates) {
        const state = this.getState();
        Object.assign(state, updates);
        if (state.recentPresets?.length > 5) {
            state.recentPresets = state.recentPresets.slice(0, 5);
        }
        return set(STORAGE_KEYS.NUMBERING_STATE, state);
    }
};

/**
 * Letterhead storage
 */
const letterhead = {
    getFirmConfig() {
        return get(STORAGE_KEYS.FIRM_CONFIG, null);
    },
    
    saveFirmConfig(config) {
        config.updatedAt = new Date().toISOString();
        return set(STORAGE_KEYS.FIRM_CONFIG, config);
    },
    
    getAttorneys() {
        return get(STORAGE_KEYS.ATTORNEYS, []);
    },
    
    getAttorney(id) {
        return this.getAttorneys().find(a => a.id === id);
    },
    
    saveAttorney(attorney) {
        const attorneys = this.getAttorneys();
        const index = attorneys.findIndex(a => a.id === attorney.id);
        
        attorney.updatedAt = new Date().toISOString();
        
        if (index >= 0) {
            attorneys[index] = attorney;
        } else {
            attorney.createdAt = attorney.updatedAt;
            if (!attorney.id) attorney.id = generateId();
            attorneys.push(attorney);
        }
        
        set(STORAGE_KEYS.ATTORNEYS, attorneys);
        return attorney;
    },
    
    deleteAttorney(id) {
        const attorneys = this.getAttorneys().filter(a => a.id !== id);
        return set(STORAGE_KEYS.ATTORNEYS, attorneys);
    },
    
    getCurrentUser() {
        return this.getAttorneys().find(a => a.isCurrentUser);
    }
};

/**
 * User preferences storage
 */
const preferences = {
    get() {
        return get(STORAGE_KEYS.USER_PREFERENCES, {
            theme: 'light',
            defaultTab: 'templates',
            highlightUnfilled: true,
            validateBeforeFill: true,
            dateFormat: 'MMMM D, YYYY'
        });
    },
    
    set(prefs) {
        return set(STORAGE_KEYS.USER_PREFERENCES, prefs);
    },
    
    update(updates) {
        const current = this.get();
        return this.set({ ...current, ...updates });
    }
};

// ============================================================================
// Sync Queue
// ============================================================================

const syncQueue = {
    get() {
        return get(STORAGE_KEYS.SYNC_QUEUE, []);
    },
    
    add(operation) {
        const queue = this.get();
        queue.push({
            ...operation,
            id: generateId(),
            timestamp: Date.now(),
            attempts: 0
        });
        return set(STORAGE_KEYS.SYNC_QUEUE, queue);
    },
    
    remove(operationId) {
        const queue = this.get().filter(op => op.id !== operationId);
        return set(STORAGE_KEYS.SYNC_QUEUE, queue);
    },
    
    clear() {
        return remove(STORAGE_KEYS.SYNC_QUEUE);
    },
    
    markAttempt(operationId) {
        const queue = this.get();
        const op = queue.find(o => o.id === operationId);
        if (op) {
            op.attempts++;
            op.lastAttempt = Date.now();
            set(STORAGE_KEYS.SYNC_QUEUE, queue);
        }
    }
};

// ============================================================================
// Utilities
// ============================================================================

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// Exports
// ============================================================================

const DocForgeStorage = {
    // Core
    get,
    set,
    remove,
    has,
    clearAll,
    
    // Cache
    getWithTTL,
    setWithMeta,
    getCacheMeta,
    getETag,
    getStorageStats,
    
    // Domain storage
    templates,
    datasets,
    numbering,
    letterhead,
    preferences,
    
    // Sync queue
    syncQueue,
    
    // Keys reference
    KEYS: STORAGE_KEYS,
    
    // Utils
    generateId
};

// ES modules

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocForgeStorage;
}

// Global
if (typeof window !== 'undefined') {
    window.DocForgeStorage = DocForgeStorage;
}
