/**
 * DocForge - Performance Utilities
 * 
 * Batching utilities and performance helpers for fast Word API operations.
 * The key to speed: minimize context.sync() calls and batch operations.
 * 
 * Performance targets:
 * - Full document scan: < 500ms for 100 pages
 * - Variable fill: < 200ms for 50 variables
 * - Cross-ref scan: < 300ms
 */

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * BatchQueue - Collects operations and executes them with minimal sync calls
 * 
 * Usage:
 *   const batch = new BatchQueue(context);
 *   batch.add(() => range1.insertText('Hello'));
 *   batch.add(() => range2.font.bold = true);
 *   await batch.execute(); // Single sync
 */
class BatchQueue {
    constructor(context) {
        this.context = context;
        this.operations = [];
        this.loadQueue = [];
        this.preloadDone = false;
    }
    
    /**
     * Add an operation to the queue
     * @param {Function} operation - Function that modifies Word objects
     * @returns {BatchQueue} - For chaining
     */
    add(operation) {
        this.operations.push(operation);
        return this;
    }
    
    /**
     * Queue items for loading (call before execute)
     * @param {Object} item - Word API object to load
     * @param {string|Array} properties - Properties to load
     * @returns {BatchQueue}
     */
    load(item, properties) {
        this.loadQueue.push({ item, properties });
        return this;
    }
    
    /**
     * Execute all queued loads in single sync
     * @returns {Promise<void>}
     */
    async preload() {
        if (this.loadQueue.length === 0) return;
        
        for (const { item, properties } of this.loadQueue) {
            item.load(properties);
        }
        
        await this.context.sync();
        this.preloadDone = true;
        this.loadQueue = [];
    }
    
    /**
     * Execute all operations with single sync
     * @returns {Promise<Object>}
     */
    async execute() {
        const startTime = performance.now();
        
        // Preload if not done
        if (this.loadQueue.length > 0) {
            await this.preload();
        }
        
        // Execute all operations
        for (const operation of this.operations) {
            try {
                operation();
            } catch (e) {
                console.error('[BatchQueue] Operation error:', e);
            }
        }
        
        // Single sync for all mutations
        await this.context.sync();
        
        const duration = performance.now() - startTime;
        const count = this.operations.length;
        
        // Reset
        this.operations = [];
        
        return {
            operationCount: count,
            duration,
            avgPerOperation: count > 0 ? duration / count : 0
        };
    }
    
    /**
     * Clear all queued operations
     */
    clear() {
        this.operations = [];
        this.loadQueue = [];
        this.preloadDone = false;
    }
    
    /**
     * Get queue size
     */
    get size() {
        return this.operations.length;
    }
}

/**
 * Execute batched operations with automatic chunking for large datasets
 * Prevents API timeouts on very large documents
 * 
 * @param {Word.RequestContext} context
 * @param {Array} items - Items to process
 * @param {Function} processor - Function(item, context) to process each item
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function batchProcess(context, items, processor, options = {}) {
    const {
        chunkSize = 100,      // Items per sync
        onProgress = null,    // Progress callback(processed, total)
        continueOnError = true
    } = options;
    
    const startTime = performance.now();
    const results = [];
    const errors = [];
    let processed = 0;
    
    // Process in chunks
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        
        // Process chunk
        for (const item of chunk) {
            try {
                const result = processor(item, context);
                results.push(result);
            } catch (e) {
                errors.push({ item, error: e });
                if (!continueOnError) throw e;
            }
            processed++;
        }
        
        // Single sync per chunk
        await context.sync();
        
        // Report progress
        if (onProgress) {
            onProgress(processed, items.length);
        }
    }
    
    return {
        results,
        errors,
        processed,
        total: items.length,
        duration: performance.now() - startTime
    };
}

/**
 * Execute multiple async operations in parallel with sync batching
 * 
 * @param {Word.RequestContext} context
 * @param {Array<Function>} operations - Array of (context) => operation functions
 * @returns {Promise<Array>}
 */
async function batchParallel(context, operations) {
    // Execute all operations
    const results = operations.map(op => {
        try {
            return { success: true, result: op(context) };
        } catch (e) {
            return { success: false, error: e };
        }
    });
    
    // Single sync
    await context.sync();
    
    return results;
}

// ============================================================================
// PARAGRAPH LOADER
// ============================================================================

/**
 * Load all paragraphs efficiently with minimal syncs
 * 
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function loadAllParagraphs(context, options = {}) {
    const {
        properties = ['text', 'style', 'outlineLevel'],
        includeListItem = true,
        includeRange = false
    } = options;
    
    const startTime = performance.now();
    
    // Load paragraph collection
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    // Build load properties string
    const propString = properties.map(p => `items/${p}`).join(',');
    let fullProps = propString;
    
    if (includeListItem) {
        fullProps += ',items/listItem';
    }
    
    // Load all paragraph properties in single call
    paragraphs.load(fullProps);
    await context.sync();
    
    // Extract data
    const data = paragraphs.items.map((para, index) => {
        const item = {
            index,
            text: para.text || '',
            style: para.style || '',
            outlineLevel: para.outlineLevel
        };
        
        if (includeListItem && para.listItem) {
            item.listItem = {
                level: para.listItem.level,
                listString: para.listItem.listString
            };
        }
        
        if (includeRange) {
            item.range = para.getRange();
        }
        
        return item;
    });
    
    return {
        paragraphs: data,
        count: data.length,
        loadTime: performance.now() - startTime
    };
}

// ============================================================================
// DOCUMENT FINGERPRINT
// ============================================================================

/**
 * Generate a fast document fingerprint for change detection
 * Uses sampling for speed - not a cryptographic hash
 * 
 * @param {string} text - Document text
 * @returns {string}
 */
function generateFingerprint(text) {
    if (!text || text.length === 0) return '0:0:0';
    
    // Fast hash using character sampling
    let hash = 0;
    const len = text.length;
    const step = Math.max(1, Math.floor(len / 1000)); // Sample ~1000 chars
    
    for (let i = 0; i < len; i += step) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit
    }
    
    // Include length and first/last chars for extra uniqueness
    const first = text.charCodeAt(0) || 0;
    const last = text.charCodeAt(len - 1) || 0;
    
    return `${len}:${hash}:${first}${last}`;
}

/**
 * Generate paragraph-level hashes for incremental detection
 * 
 * @param {Array} paragraphs - Array of paragraph objects with text
 * @returns {Map<number, string>}
 */
function generateParagraphHashes(paragraphs) {
    const hashes = new Map();
    
    for (let i = 0; i < paragraphs.length; i++) {
        const text = paragraphs[i].text || '';
        hashes.set(i, simpleHash(text));
    }
    
    return hashes;
}

/**
 * Simple fast hash for strings
 * @param {string} str
 * @returns {number}
 */
function simpleHash(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return hash;
}

/**
 * Detect changed paragraphs by comparing hashes
 * 
 * @param {Map} oldHashes
 * @param {Map} newHashes
 * @returns {Object}
 */
function detectChanges(oldHashes, newHashes) {
    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];
    
    // Check for modified and removed
    for (const [index, oldHash] of oldHashes) {
        if (!newHashes.has(index)) {
            removed.push(index);
        } else if (newHashes.get(index) !== oldHash) {
            modified.push(index);
        } else {
            unchanged.push(index);
        }
    }
    
    // Check for added
    for (const [index] of newHashes) {
        if (!oldHashes.has(index)) {
            added.push(index);
        }
    }
    
    return {
        added,
        removed,
        modified,
        unchanged,
        hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0
    };
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Fast in-memory cache with TTL
 */
class MemoryCache {
    constructor(defaultTTL = 30000) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }
    
    /**
     * Get cached value
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value;
    }
    
    /**
     * Set cached value
     * @param {string} key
     * @param {*} value
     * @param {number} ttl - Time to live in ms
     */
    set(key, value, ttl = null) {
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttl || this.defaultTTL),
            created: Date.now()
        });
    }
    
    /**
     * Check if key exists and is valid
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    
    /**
     * Delete a key
     * @param {string} key
     */
    delete(key) {
        this.cache.delete(key);
    }
    
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
    
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.expires) {
                this.cache.delete(key);
            }
        }
    }
    
    /**
     * Get cache stats
     */
    getStats() {
        let valid = 0;
        let expired = 0;
        const now = Date.now();
        
        for (const [, entry] of this.cache) {
            if (now > entry.expires) {
                expired++;
            } else {
                valid++;
            }
        }
        
        return { valid, expired, total: this.cache.size };
    }
}

// ============================================================================
// DOCUMENT PROPERTY STORAGE
// ============================================================================

/**
 * Fast key-value storage using document custom properties
 * Much faster than Custom XML Parts
 */
class DocumentPropertyStore {
    constructor() {
        this.PREFIX = '_DocForge_';
        this.localCache = new MemoryCache(60000); // 1 minute cache
    }
    
    /**
     * Store a value in document properties
     * @param {Word.RequestContext} context
     * @param {string} key
     * @param {*} value - Will be JSON stringified
     * @returns {Promise<boolean>}
     */
    async set(context, key, value) {
        try {
            const props = context.document.properties.customProperties;
            const fullKey = this.PREFIX + key;
            const stringValue = JSON.stringify(value);
            
            // Word has a limit on property value length (~255 chars for some properties)
            // For larger values, chunk them
            if (stringValue.length > 200) {
                return await this._setChunked(context, key, stringValue);
            }
            
            props.add(fullKey, stringValue);
            await context.sync();
            
            // Update local cache
            this.localCache.set(key, value);
            
            return true;
        } catch (e) {
            console.error('[DocumentPropertyStore] Set error:', e);
            return false;
        }
    }
    
    /**
     * Get a value from document properties
     * @param {Word.RequestContext} context
     * @param {string} key
     * @returns {Promise<*>}
     */
    async get(context, key) {
        // Check local cache first
        if (this.localCache.has(key)) {
            return this.localCache.get(key);
        }
        
        try {
            const props = context.document.properties.customProperties;
            const fullKey = this.PREFIX + key;
            
            props.load('items');
            await context.sync();
            
            // Find the property
            for (const item of props.items) {
                item.load('key,value');
            }
            await context.sync();
            
            for (const item of props.items) {
                if (item.key === fullKey) {
                    const value = JSON.parse(item.value);
                    this.localCache.set(key, value);
                    return value;
                }
            }
            
            // Check for chunked value
            const chunked = await this._getChunked(context, key);
            if (chunked !== null) {
                this.localCache.set(key, chunked);
                return chunked;
            }
            
            return null;
        } catch (e) {
            console.error('[DocumentPropertyStore] Get error:', e);
            return null;
        }
    }
    
    /**
     * Delete a value from document properties
     * @param {Word.RequestContext} context
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async delete(context, key) {
        try {
            const props = context.document.properties.customProperties;
            const fullKey = this.PREFIX + key;
            
            props.load('items');
            await context.sync();
            
            for (const item of props.items) {
                item.load('key');
            }
            await context.sync();
            
            for (const item of props.items) {
                if (item.key === fullKey || item.key.startsWith(fullKey + '_chunk_')) {
                    item.delete();
                }
            }
            
            await context.sync();
            this.localCache.delete(key);
            
            return true;
        } catch (e) {
            console.error('[DocumentPropertyStore] Delete error:', e);
            return false;
        }
    }
    
    /**
     * List all DocForge properties
     * @param {Word.RequestContext} context
     * @returns {Promise<Array>}
     */
    async list(context) {
        try {
            const props = context.document.properties.customProperties;
            props.load('items');
            await context.sync();
            
            for (const item of props.items) {
                item.load('key,value');
            }
            await context.sync();
            
            const keys = [];
            for (const item of props.items) {
                if (item.key.startsWith(this.PREFIX) && !item.key.includes('_chunk_')) {
                    keys.push(item.key.replace(this.PREFIX, ''));
                }
            }
            
            return keys;
        } catch (e) {
            console.error('[DocumentPropertyStore] List error:', e);
            return [];
        }
    }
    
    /**
     * Store chunked value for large data
     * @private
     */
    async _setChunked(context, key, stringValue) {
        const CHUNK_SIZE = 180;
        const chunks = [];
        
        for (let i = 0; i < stringValue.length; i += CHUNK_SIZE) {
            chunks.push(stringValue.slice(i, i + CHUNK_SIZE));
        }
        
        const props = context.document.properties.customProperties;
        const fullKey = this.PREFIX + key;
        
        // Store chunk count
        props.add(fullKey, JSON.stringify({ chunked: true, count: chunks.length }));
        
        // Store each chunk
        for (let i = 0; i < chunks.length; i++) {
            props.add(`${fullKey}_chunk_${i}`, chunks[i]);
        }
        
        await context.sync();
        return true;
    }
    
    /**
     * Retrieve chunked value
     * @private
     */
    async _getChunked(context, key) {
        try {
            const props = context.document.properties.customProperties;
            const fullKey = this.PREFIX + key;
            
            props.load('items');
            await context.sync();
            
            for (const item of props.items) {
                item.load('key,value');
            }
            await context.sync();
            
            // Find header
            let header = null;
            const chunkMap = new Map();
            
            for (const item of props.items) {
                if (item.key === fullKey) {
                    try {
                        header = JSON.parse(item.value);
                    } catch {
                        return null;
                    }
                } else if (item.key.startsWith(fullKey + '_chunk_')) {
                    const idx = parseInt(item.key.replace(fullKey + '_chunk_', ''));
                    chunkMap.set(idx, item.value);
                }
            }
            
            if (!header || !header.chunked) return null;
            
            // Reassemble
            let assembled = '';
            for (let i = 0; i < header.count; i++) {
                assembled += chunkMap.get(i) || '';
            }
            
            return JSON.parse(assembled);
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Clear local cache
     */
    clearCache() {
        this.localCache.clear();
    }
}

// ============================================================================
// PERFORMANCE TIMER
// ============================================================================

/**
 * Simple performance timer for profiling
 */
class PerformanceTimer {
    constructor(name) {
        this.name = name;
        this.marks = new Map();
        this.startTime = performance.now();
    }
    
    /**
     * Mark a point in time
     * @param {string} label
     */
    mark(label) {
        this.marks.set(label, performance.now());
    }
    
    /**
     * Get elapsed time since start or mark
     * @param {string} fromMark - Optional mark to measure from
     * @returns {number}
     */
    elapsed(fromMark = null) {
        const start = fromMark ? this.marks.get(fromMark) : this.startTime;
        return performance.now() - (start || this.startTime);
    }
    
    /**
     * Get time between two marks
     * @param {string} from
     * @param {string} to
     * @returns {number}
     */
    between(from, to) {
        const fromTime = this.marks.get(from) || this.startTime;
        const toTime = this.marks.get(to) || performance.now();
        return toTime - fromTime;
    }
    
    /**
     * Log timing report
     */
    report() {
        console.log(`[${this.name}] Performance Report:`);
        console.log(`  Total: ${this.elapsed().toFixed(2)}ms`);
        
        const sortedMarks = [...this.marks.entries()].sort((a, b) => a[1] - b[1]);
        let prevTime = this.startTime;
        
        for (const [label, time] of sortedMarks) {
            const delta = time - prevTime;
            console.log(`  ${label}: +${delta.toFixed(2)}ms`);
            prevTime = time;
        }
    }
    
    /**
     * Get results as object
     */
    getResults() {
        const results = {
            name: this.name,
            total: this.elapsed(),
            marks: {}
        };
        
        for (const [label, time] of this.marks) {
            results.marks[label] = time - this.startTime;
        }
        
        return results;
    }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

const documentPropertyStore = new DocumentPropertyStore();
const globalCache = new MemoryCache();

// ============================================================================
// EXPORT
// ============================================================================

const PerformanceModule = {
    // Batch operations
    BatchQueue,
    batchProcess,
    batchParallel,
    
    // Loading
    loadAllParagraphs,
    
    // Fingerprinting
    generateFingerprint,
    generateParagraphHashes,
    simpleHash,
    detectChanges,
    
    // Caching
    MemoryCache,
    globalCache,
    
    // Document storage
    DocumentPropertyStore,
    documentPropertyStore,
    
    // Timing
    PerformanceTimer,
    
    // Version
    VERSION: '1.0.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.Performance = PerformanceModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceModule;
}
