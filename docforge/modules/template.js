/**
 * DocForge - Template Fill Engine v2.0
 * 
 * Intelligent template variable detection and filling for legal documents.
 * Scans for placeholder patterns, infers types, and fills from saved profiles.
 * 
 * Features:
 * - Multi-syntax variable detection: [var], {{var}}, <<var>>, {var}
 * - Content Control detection as structured variables
 * - Type inference: name, date, currency, address, phone, email
 * - Variable profiles: save/load for quick reuse
 * - One-click fill with preview
 * - Speed target: <1 second for full document scan
 * 
 * Architecture:
 * - VariableDetector: Pattern-based variable detection
 * - TypeInference: Smart type detection with validation
 * - ProfileStore: LocalStorage + optional cloud sync
 * - TemplateFiller: Applies profile values to document
 * - TemplateCache: Incremental processing for speed
 */

// ============================================================================
// CONSTANTS & PATTERNS
// ============================================================================

/**
 * Variable bracket styles in priority order
 * Each style has regex for detection and formatting for output
 */
const BRACKET_STYLES = {
    DOUBLE_CURLY: {
        id: 'double_curly',
        name: 'Double Curly',
        regex: /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
        open: '{{',
        close: '}}',
        example: '{{ClientName}}'
    },
    SQUARE: {
        id: 'square',
        name: 'Square Brackets',
        regex: /\[([A-Za-z_][A-Za-z0-9_]*)\]/g,
        open: '[',
        close: ']',
        example: '[ClientName]'
    },
    ANGLE: {
        id: 'angle',
        name: 'Angle Brackets',
        regex: /<<([A-Za-z_][A-Za-z0-9_]*)>>/g,
        open: '<<',
        close: '>>',
        example: '<<ClientName>>'
    },
    SINGLE_CURLY: {
        id: 'single_curly',
        name: 'Single Curly',
        regex: /\{([A-Z_][A-Z0-9_]*)\}/g, // Usually UPPER_CASE
        open: '{',
        close: '}',
        example: '{PARTY_A}'
    },
    PERCENT: {
        id: 'percent',
        name: 'Percent Signs',
        regex: /%([A-Za-z_][A-Za-z0-9_]*)%/g,
        open: '%',
        close: '%',
        example: '%ClientName%'
    },
    UNDERSCORE: {
        id: 'underscore',
        name: 'Underscores',
        regex: /__([A-Za-z][A-Za-z0-9_]*)__/g,
        open: '__',
        close: '__',
        example: '__ClientName__'
    }
};

/**
 * Default enabled bracket styles
 */
const DEFAULT_BRACKET_STYLES = ['double_curly', 'square', 'angle', 'single_curly'];

/**
 * Variable type definitions with detection patterns and formatters
 */
const VARIABLE_TYPES = {
    date: {
        id: 'date',
        name: 'Date',
        patterns: [
            /date/i,
            /effective.*date/i,
            /closing.*date/i,
            /execution.*date/i,
            /termination.*date/i,
            /_dt$/i,
            /dated/i
        ],
        validator: (value) => {
            const date = new Date(value);
            return !isNaN(date.getTime());
        },
        formatter: (value, format = 'long') => {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            
            const formats = {
                'short': { month: 'numeric', day: 'numeric', year: 'numeric' },
                'medium': { month: 'short', day: 'numeric', year: 'numeric' },
                'long': { month: 'long', day: 'numeric', year: 'numeric' },
                'iso': null // special handling
            };
            
            if (format === 'iso') {
                return date.toISOString().split('T')[0];
            }
            
            return date.toLocaleDateString('en-US', formats[format] || formats.long);
        },
        placeholder: 'YYYY-MM-DD',
        inputType: 'date'
    },
    
    currency: {
        id: 'currency',
        name: 'Currency',
        patterns: [
            /amount/i,
            /price/i,
            /fee/i,
            /payment/i,
            /salary/i,
            /cost/i,
            /value/i,
            /consideration/i,
            /purchase.*price/i,
            /_amt$/i,
            /\$\s*$/
        ],
        validator: (value) => {
            const clean = value.replace(/[$,\s]/g, '');
            return !isNaN(parseFloat(clean)) && isFinite(clean);
        },
        formatter: (value, currency = 'USD') => {
            const clean = value.replace(/[$,\s]/g, '');
            const num = parseFloat(clean);
            if (isNaN(num)) return value;
            
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2
            }).format(num);
        },
        placeholder: '0.00',
        inputType: 'number'
    },
    
    email: {
        id: 'email',
        name: 'Email',
        patterns: [
            /email/i,
            /e-mail/i,
            /contact.*email/i,
            /_email$/i
        ],
        validator: (value) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        formatter: (value) => value.toLowerCase().trim(),
        placeholder: 'email@example.com',
        inputType: 'email'
    },
    
    phone: {
        id: 'phone',
        name: 'Phone',
        patterns: [
            /phone/i,
            /telephone/i,
            /fax/i,
            /mobile/i,
            /cell/i,
            /_tel$/i,
            /_ph$/i
        ],
        validator: (value) => {
            const digits = value.replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 15;
        },
        formatter: (value) => {
            const digits = value.replace(/\D/g, '');
            if (digits.length === 10) {
                return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
            }
            if (digits.length === 11 && digits[0] === '1') {
                return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
            }
            return value;
        },
        placeholder: '(555) 555-5555',
        inputType: 'tel'
    },
    
    address: {
        id: 'address',
        name: 'Address',
        patterns: [
            /address/i,
            /street/i,
            /city/i,
            /state/i,
            /zip/i,
            /postal/i,
            /location/i,
            /headquarters/i,
            /principal.*place/i
        ],
        validator: (value) => value.length > 5,
        formatter: (value) => value.trim(),
        placeholder: '123 Main St, City, State 12345',
        inputType: 'text'
    },
    
    name: {
        id: 'name',
        name: 'Name',
        patterns: [
            /name/i,
            /client/i,
            /party/i,
            /attorney/i,
            /counsel/i,
            /company/i,
            /corporation/i,
            /entity/i,
            /individual/i,
            /signatory/i,
            /borrower/i,
            /lender/i,
            /buyer/i,
            /seller/i,
            /landlord/i,
            /tenant/i,
            /employer/i,
            /employee/i
        ],
        validator: (value) => value.length >= 2,
        formatter: (value) => {
            // Title case for names
            return value.trim().replace(/\b\w/g, l => l.toUpperCase());
        },
        placeholder: 'Enter name',
        inputType: 'text'
    },
    
    state: {
        id: 'state',
        name: 'State/Jurisdiction',
        patterns: [
            /^state$/i,
            /jurisdiction/i,
            /governing.*law/i,
            /formation.*state/i
        ],
        validator: (value) => {
            const states = ['Alabama','Alaska','Arizona','Arkansas','California',
                'Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii',
                'Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
                'Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
                'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
                'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma',
                'Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
                'Tennessee','Texas','Utah','Vermont','Virginia','Washington',
                'West Virginia','Wisconsin','Wyoming','District of Columbia'];
            const abbrevs = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI',
                'ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO',
                'MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
                'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
            const upper = value.toUpperCase().trim();
            return states.some(s => s.toUpperCase() === upper) || abbrevs.includes(upper);
        },
        formatter: (value) => {
            // Return as-is, could expand abbreviations
            return value.trim();
        },
        placeholder: 'Delaware',
        inputType: 'text'
    },
    
    percentage: {
        id: 'percentage',
        name: 'Percentage',
        patterns: [
            /percent/i,
            /rate/i,
            /interest/i,
            /_pct$/i,
            /%$/
        ],
        validator: (value) => {
            const clean = value.replace(/[%\s]/g, '');
            const num = parseFloat(clean);
            return !isNaN(num) && num >= 0 && num <= 100;
        },
        formatter: (value) => {
            const clean = value.replace(/[%\s]/g, '');
            const num = parseFloat(clean);
            if (isNaN(num)) return value;
            return `${num}%`;
        },
        placeholder: '0.00%',
        inputType: 'number'
    },
    
    number: {
        id: 'number',
        name: 'Number',
        patterns: [
            /number/i,
            /count/i,
            /quantity/i,
            /term/i,
            /months/i,
            /years/i,
            /days/i,
            /_num$/i,
            /_no$/i
        ],
        validator: (value) => !isNaN(parseFloat(value)),
        formatter: (value) => {
            const num = parseFloat(value);
            if (isNaN(num)) return value;
            return num.toLocaleString();
        },
        placeholder: '0',
        inputType: 'number'
    },
    
    text: {
        id: 'text',
        name: 'Text',
        patterns: [], // Default fallback
        validator: () => true,
        formatter: (value) => value.trim(),
        placeholder: 'Enter text',
        inputType: 'text'
    }
};

/**
 * Type detection priority order
 */
const TYPE_PRIORITY = [
    'email', 'phone', 'date', 'currency', 'percentage',
    'state', 'address', 'number', 'name', 'text'
];

// ============================================================================
// TEMPLATE CACHE
// ============================================================================

/**
 * Cache for template scanning results
 */
class TemplateCache {
    constructor() {
        this.variables = null;
        this.contentControls = null;
        this.documentHash = null;
        this.lastScan = 0;
        this.CACHE_TTL = 30000; // 30 seconds
    }
    
    /**
     * Generate document hash for change detection
     */
    hashDocument(text) {
        let hash = 0;
        for (let i = 0; i < Math.min(text.length, 10000); i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }
    
    /**
     * Check if cache is still valid
     */
    isValid(documentText) {
        if (!this.variables) return false;
        if (Date.now() - this.lastScan > this.CACHE_TTL) return false;
        if (documentText && this.hashDocument(documentText) !== this.documentHash) return false;
        return true;
    }
    
    /**
     * Store scan results
     */
    store(variables, contentControls, documentText) {
        this.variables = variables;
        this.contentControls = contentControls;
        this.documentHash = documentText ? this.hashDocument(documentText) : null;
        this.lastScan = Date.now();
    }
    
    /**
     * Invalidate cache
     */
    invalidate() {
        this.variables = null;
        this.contentControls = null;
        this.documentHash = null;
        this.lastScan = 0;
    }
}

// Singleton cache
const cache = new TemplateCache();

// ============================================================================
// FAST VARIABLE STORAGE (NO CUSTOM XML)
// ============================================================================

/**
 * Fast variable storage using document custom properties
 * MUCH faster than Custom XML Parts (Litera's approach)
 * 
 * Storage hierarchy:
 * 1. In-memory cache (fastest, session only)
 * 2. localStorage cache with doc fingerprint (fast, persists)
 * 3. Document custom properties (survives document transfer)
 */
class FastVariableStore {
    constructor() {
        this.PREFIX = '_DocForge_Var_';
        this.INDEX_KEY = '_DocForge_VarIndex';
        
        // In-memory cache for current session
        this.memoryCache = new Map();
        this.memoryCacheFingerprint = null;
        
        // localStorage cache key prefix
        this.LOCAL_CACHE_PREFIX = 'docforge_vars_';
    }
    
    /**
     * Generate a document fingerprint for cache keying
     * @param {Word.RequestContext} context
     * @returns {Promise<string>}
     */
    async getDocumentFingerprint(context) {
        try {
            const props = context.document.properties;
            props.load(['title', 'author', 'creationDate']);
            await context.sync();
            
            // Combine properties for unique fingerprint
            const parts = [
                props.title || 'untitled',
                props.author || 'unknown',
                props.creationDate ? new Date(props.creationDate).getTime() : 0
            ];
            
            let hash = 0;
            const str = parts.join('|');
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash = hash & hash;
            }
            
            return `doc_${Math.abs(hash).toString(36)}`;
        } catch (e) {
            // Fallback to timestamp-based ID
            return `doc_${Date.now().toString(36)}`;
        }
    }
    
    /**
     * Store variables using fast storage (no XML)
     * @param {Word.RequestContext} context
     * @param {Object} variables - Variable name -> value mapping
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async storeVariables(context, variables, options = {}) {
        const startTime = performance.now();
        const { persistToDocument = true } = options;
        
        // 1. Update memory cache immediately
        for (const [name, value] of Object.entries(variables)) {
            this.memoryCache.set(name, value);
        }
        
        // 2. Update localStorage cache
        const fingerprint = await this.getDocumentFingerprint(context);
        this.memoryCacheFingerprint = fingerprint;
        this._updateLocalCache(fingerprint, variables);
        
        // 3. Persist to document properties if requested
        if (persistToDocument) {
            await this._persistToDocumentProperties(context, variables);
        }
        
        return {
            success: true,
            storedCount: Object.keys(variables).length,
            duration: performance.now() - startTime
        };
    }
    
    /**
     * Load variables with fallback chain
     * @param {Word.RequestContext} context
     * @returns {Promise<Object>}
     */
    async loadVariables(context) {
        const startTime = performance.now();
        
        // 1. Check memory cache first (fastest)
        if (this.memoryCache.size > 0) {
            return {
                variables: Object.fromEntries(this.memoryCache),
                source: 'memory',
                duration: performance.now() - startTime
            };
        }
        
        // 2. Check localStorage cache
        const fingerprint = await this.getDocumentFingerprint(context);
        const localCached = this._loadFromLocalCache(fingerprint);
        
        if (localCached) {
            // Populate memory cache
            for (const [name, value] of Object.entries(localCached)) {
                this.memoryCache.set(name, value);
            }
            this.memoryCacheFingerprint = fingerprint;
            
            return {
                variables: localCached,
                source: 'localStorage',
                duration: performance.now() - startTime
            };
        }
        
        // 3. Load from document properties
        const docVariables = await this._loadFromDocumentProperties(context);
        
        if (docVariables && Object.keys(docVariables).length > 0) {
            // Populate caches
            for (const [name, value] of Object.entries(docVariables)) {
                this.memoryCache.set(name, value);
            }
            this._updateLocalCache(fingerprint, docVariables);
            this.memoryCacheFingerprint = fingerprint;
            
            return {
                variables: docVariables,
                source: 'documentProperties',
                duration: performance.now() - startTime
            };
        }
        
        return {
            variables: {},
            source: 'none',
            duration: performance.now() - startTime
        };
    }
    
    /**
     * Get a single variable value (fast path)
     * @param {string} name
     * @returns {*}
     */
    getVariable(name) {
        return this.memoryCache.get(name) || null;
    }
    
    /**
     * Set a single variable value (memory only until persist)
     * @param {string} name
     * @param {*} value
     */
    setVariable(name, value) {
        this.memoryCache.set(name, value);
    }
    
    /**
     * Clear all variable caches
     * @param {Word.RequestContext} context
     * @param {Object} options
     */
    async clearVariables(context, options = {}) {
        const { clearDocument = false } = options;
        
        // Clear memory cache
        this.memoryCache.clear();
        this.memoryCacheFingerprint = null;
        
        // Clear localStorage cache for this document
        const fingerprint = await this.getDocumentFingerprint(context);
        localStorage.removeItem(this.LOCAL_CACHE_PREFIX + fingerprint);
        
        // Clear document properties if requested
        if (clearDocument) {
            await this._clearDocumentProperties(context);
        }
        
        return { success: true };
    }
    
    /**
     * Persist current memory cache to document
     * @param {Word.RequestContext} context
     */
    async persistToDocument(context) {
        if (this.memoryCache.size === 0) return { success: true, persisted: 0 };
        
        const variables = Object.fromEntries(this.memoryCache);
        await this._persistToDocumentProperties(context, variables);
        
        return { success: true, persisted: this.memoryCache.size };
    }
    
    // ========================================================================
    // PRIVATE: localStorage Operations
    // ========================================================================
    
    /**
     * Update localStorage cache
     * @private
     */
    _updateLocalCache(fingerprint, variables) {
        try {
            const cacheKey = this.LOCAL_CACHE_PREFIX + fingerprint;
            const existing = this._loadFromLocalCache(fingerprint) || {};
            const merged = { ...existing, ...variables };
            
            localStorage.setItem(cacheKey, JSON.stringify({
                variables: merged,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[FastVariableStore] localStorage write failed:', e);
        }
    }
    
    /**
     * Load from localStorage cache
     * @private
     */
    _loadFromLocalCache(fingerprint) {
        try {
            const cacheKey = this.LOCAL_CACHE_PREFIX + fingerprint;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            
            // Check if cache is still valid (24 hour TTL)
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return data.variables;
        } catch (e) {
            return null;
        }
    }
    
    // ========================================================================
    // PRIVATE: Document Property Operations
    // ========================================================================
    
    /**
     * Persist variables to document custom properties
     * @private
     */
    async _persistToDocumentProperties(context, variables) {
        try {
            const props = context.document.properties.customProperties;
            
            // Store as single JSON property (faster than multiple properties)
            const jsonValue = JSON.stringify(variables);
            
            // Word custom properties have value length limits
            // For large variable sets, we need to chunk
            if (jsonValue.length <= 200) {
                props.add(this.INDEX_KEY, jsonValue);
            } else {
                // Store chunked
                await this._storeChunked(props, this.INDEX_KEY, jsonValue);
            }
            
            await context.sync();
        } catch (e) {
            console.error('[FastVariableStore] Document property write failed:', e);
            throw e;
        }
    }
    
    /**
     * Load variables from document custom properties
     * @private
     */
    async _loadFromDocumentProperties(context) {
        try {
            const props = context.document.properties.customProperties;
            props.load('items');
            await context.sync();
            
            // Load all property values
            for (const item of props.items) {
                item.load('key,value');
            }
            await context.sync();
            
            // Find our index property
            let indexValue = null;
            const chunks = new Map();
            
            for (const item of props.items) {
                if (item.key === this.INDEX_KEY) {
                    indexValue = item.value;
                } else if (item.key.startsWith(this.INDEX_KEY + '_chunk_')) {
                    const idx = parseInt(item.key.replace(this.INDEX_KEY + '_chunk_', ''));
                    chunks.set(idx, item.value);
                }
            }
            
            // Handle chunked storage
            if (indexValue) {
                try {
                    const parsed = JSON.parse(indexValue);
                    if (parsed.chunked && parsed.count) {
                        // Reassemble chunks
                        let assembled = '';
                        for (let i = 0; i < parsed.count; i++) {
                            assembled += chunks.get(i) || '';
                        }
                        return JSON.parse(assembled);
                    }
                    return parsed;
                } catch (e) {
                    return null;
                }
            }
            
            return null;
        } catch (e) {
            console.warn('[FastVariableStore] Document property read failed:', e);
            return null;
        }
    }
    
    /**
     * Store large value in chunks
     * @private
     */
    async _storeChunked(props, key, value) {
        const CHUNK_SIZE = 180;
        const chunks = [];
        
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
            chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        
        // Store header
        props.add(key, JSON.stringify({ chunked: true, count: chunks.length }));
        
        // Store chunks
        for (let i = 0; i < chunks.length; i++) {
            props.add(`${key}_chunk_${i}`, chunks[i]);
        }
    }
    
    /**
     * Clear all DocForge properties from document
     * @private
     */
    async _clearDocumentProperties(context) {
        try {
            const props = context.document.properties.customProperties;
            props.load('items');
            await context.sync();
            
            for (const item of props.items) {
                item.load('key');
            }
            await context.sync();
            
            for (const item of props.items) {
                if (item.key.startsWith('_DocForge_')) {
                    item.delete();
                }
            }
            
            await context.sync();
        } catch (e) {
            console.warn('[FastVariableStore] Failed to clear properties:', e);
        }
    }
    
    /**
     * Get storage statistics
     */
    getStats() {
        return {
            memoryCacheSize: this.memoryCache.size,
            hasFingerprint: !!this.memoryCacheFingerprint,
            fingerprint: this.memoryCacheFingerprint
        };
    }
}

// Singleton fast variable store
const fastVariableStore = new FastVariableStore();

// ============================================================================
// PROFILE STORE
// ============================================================================

/**
 * Manages variable profiles in localStorage and optional cloud sync
 */
class ProfileStore {
    constructor() {
        this.STORAGE_KEY = 'docforge_template_profiles';
        this.RECENT_KEY = 'docforge_recent_profiles';
        this.MAX_RECENT = 10;
    }
    
    /**
     * Get all saved profiles
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.warn('Failed to load profiles:', e);
            return {};
        }
    }
    
    /**
     * Get a specific profile by name
     */
    get(name) {
        const profiles = this.getAll();
        return profiles[name] || null;
    }
    
    /**
     * Save a profile
     */
    save(name, variables, metadata = {}) {
        try {
            const profiles = this.getAll();
            profiles[name] = {
                name: name,
                variables: variables,
                created: profiles[name]?.created || new Date().toISOString(),
                modified: new Date().toISOString(),
                usageCount: (profiles[name]?.usageCount || 0),
                ...metadata
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
            return true;
        } catch (e) {
            console.error('Failed to save profile:', e);
            return false;
        }
    }
    
    /**
     * Delete a profile
     */
    delete(name) {
        try {
            const profiles = this.getAll();
            if (profiles[name]) {
                delete profiles[name];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to delete profile:', e);
            return false;
        }
    }
    
    /**
     * Rename a profile
     */
    rename(oldName, newName) {
        try {
            const profiles = this.getAll();
            if (profiles[oldName] && !profiles[newName]) {
                profiles[newName] = { ...profiles[oldName], name: newName };
                delete profiles[oldName];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to rename profile:', e);
            return false;
        }
    }
    
    /**
     * Record profile usage
     */
    recordUsage(name) {
        try {
            const profiles = this.getAll();
            if (profiles[name]) {
                profiles[name].usageCount = (profiles[name].usageCount || 0) + 1;
                profiles[name].lastUsed = new Date().toISOString();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
            }
            
            // Update recent list
            const recent = this.getRecent();
            const filtered = recent.filter(n => n !== name);
            filtered.unshift(name);
            localStorage.setItem(this.RECENT_KEY, JSON.stringify(filtered.slice(0, this.MAX_RECENT)));
        } catch (e) {
            console.warn('Failed to record usage:', e);
        }
    }
    
    /**
     * Get recently used profiles
     */
    getRecent() {
        try {
            const data = localStorage.getItem(this.RECENT_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Get profile names sorted by usage
     */
    getSortedNames(sortBy = 'recent') {
        const profiles = this.getAll();
        const names = Object.keys(profiles);
        
        if (sortBy === 'recent') {
            const recent = this.getRecent();
            return [
                ...recent.filter(n => names.includes(n)),
                ...names.filter(n => !recent.includes(n))
            ];
        }
        
        if (sortBy === 'usage') {
            return names.sort((a, b) => 
                (profiles[b].usageCount || 0) - (profiles[a].usageCount || 0)
            );
        }
        
        if (sortBy === 'name') {
            return names.sort((a, b) => a.localeCompare(b));
        }
        
        return names;
    }
    
    /**
     * Export profiles to JSON
     */
    exportToJSON() {
        return JSON.stringify(this.getAll(), null, 2);
    }
    
    /**
     * Import profiles from JSON
     */
    importFromJSON(json, merge = true) {
        try {
            const imported = JSON.parse(json);
            if (merge) {
                const existing = this.getAll();
                const merged = { ...existing, ...imported };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            } else {
                localStorage.setItem(this.STORAGE_KEY, json);
            }
            return true;
        } catch (e) {
            console.error('Failed to import profiles:', e);
            return false;
        }
    }
    
    /**
     * Clear all profiles
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.RECENT_KEY);
    }
}

// Singleton profile store
const profileStore = new ProfileStore();

// ============================================================================
// DATASET MANAGER
// ============================================================================

/**
 * Manages quick-fill datasets (named collections of variable values)
 * Datasets are optimized for the two-click fill workflow
 */
class DatasetManager {
    constructor() {
        this.STORAGE_KEY = 'docforge_datasets';
        this.RECENT_KEY = 'docforge_recent_datasets';
        this.MAX_RECENT = 10;
    }
    
    /**
     * Get all saved datasets
     * @returns {Object} - Map of dataset name -> dataset
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.warn('Failed to load datasets:', e);
            return {};
        }
    }
    
    /**
     * List all datasets with metadata
     * @returns {Array}
     */
    getDatasets() {
        const datasets = this.getAll();
        return Object.values(datasets).map(d => ({
            name: d.name,
            valueCount: Object.keys(d.values || {}).length,
            created: d.created,
            modified: d.modified,
            lastUsed: d.lastUsed,
            usageCount: d.usageCount || 0,
            description: d.description || ''
        })).sort((a, b) => {
            // Sort by last used, then modified, then name
            if (a.lastUsed && b.lastUsed) {
                return new Date(b.lastUsed) - new Date(a.lastUsed);
            }
            if (a.lastUsed) return -1;
            if (b.lastUsed) return 1;
            return a.name.localeCompare(b.name);
        });
    }
    
    /**
     * Get recently used datasets (for quick access)
     * @param {number} limit - Max number to return
     * @returns {Array}
     */
    getRecentDatasets(limit = 5) {
        try {
            const recentNames = localStorage.getItem(this.RECENT_KEY);
            const recent = recentNames ? JSON.parse(recentNames) : [];
            const datasets = this.getAll();
            
            return recent
                .filter(name => datasets[name])
                .slice(0, limit)
                .map(name => ({
                    name: datasets[name].name,
                    valueCount: Object.keys(datasets[name].values || {}).length,
                    lastUsed: datasets[name].lastUsed
                }));
        } catch (e) {
            console.warn('Failed to get recent datasets:', e);
            return [];
        }
    }
    
    /**
     * Save a dataset
     * @param {string} name - Dataset name (e.g., "Acme Corp Deal")
     * @param {Object} values - Variable name -> value mapping
     * @param {Object} metadata - Optional metadata
     * @returns {boolean}
     */
    saveDataset(name, values, metadata = {}) {
        try {
            const datasets = this.getAll();
            const existing = datasets[name];
            
            // Clean values - remove nulls and empty strings
            const cleanedValues = {};
            for (const [key, val] of Object.entries(values)) {
                if (val !== null && val !== undefined && val !== '') {
                    cleanedValues[key] = val;
                }
            }
            
            datasets[name] = {
                name: name,
                values: cleanedValues,
                created: existing?.created || new Date().toISOString(),
                modified: new Date().toISOString(),
                usageCount: existing?.usageCount || 0,
                lastUsed: existing?.lastUsed || null,
                description: metadata.description || existing?.description || '',
                ...metadata
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datasets));
            return true;
        } catch (e) {
            console.error('Failed to save dataset:', e);
            return false;
        }
    }
    
    /**
     * Load a dataset by name
     * @param {string} name
     * @returns {Object|null} - The dataset values or null if not found
     */
    loadDataset(name) {
        try {
            const datasets = this.getAll();
            const dataset = datasets[name];
            
            if (!dataset) return null;
            
            // Record usage
            this._recordUsage(name);
            
            return dataset.values;
        } catch (e) {
            console.error('Failed to load dataset:', e);
            return null;
        }
    }
    
    /**
     * Get dataset with full metadata
     * @param {string} name
     * @returns {Object|null}
     */
    getDataset(name) {
        try {
            const datasets = this.getAll();
            return datasets[name] || null;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Delete a dataset
     * @param {string} name
     * @returns {boolean}
     */
    deleteDataset(name) {
        try {
            const datasets = this.getAll();
            if (datasets[name]) {
                delete datasets[name];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datasets));
                
                // Also remove from recent list
                const recent = this._getRecentList();
                const filtered = recent.filter(n => n !== name);
                localStorage.setItem(this.RECENT_KEY, JSON.stringify(filtered));
                
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to delete dataset:', e);
            return false;
        }
    }
    
    /**
     * Rename a dataset
     * @param {string} oldName
     * @param {string} newName
     * @returns {boolean}
     */
    renameDataset(oldName, newName) {
        try {
            const datasets = this.getAll();
            if (datasets[oldName] && !datasets[newName]) {
                datasets[newName] = { 
                    ...datasets[oldName], 
                    name: newName,
                    modified: new Date().toISOString()
                };
                delete datasets[oldName];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datasets));
                
                // Update recent list
                const recent = this._getRecentList();
                const idx = recent.indexOf(oldName);
                if (idx >= 0) {
                    recent[idx] = newName;
                    localStorage.setItem(this.RECENT_KEY, JSON.stringify(recent));
                }
                
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to rename dataset:', e);
            return false;
        }
    }
    
    /**
     * Duplicate a dataset
     * @param {string} sourceName
     * @param {string} newName
     * @returns {boolean}
     */
    duplicateDataset(sourceName, newName) {
        try {
            const datasets = this.getAll();
            const source = datasets[sourceName];
            
            if (source && !datasets[newName]) {
                datasets[newName] = {
                    ...source,
                    name: newName,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    usageCount: 0,
                    lastUsed: null
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datasets));
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to duplicate dataset:', e);
            return false;
        }
    }
    
    /**
     * Record dataset usage (internal)
     */
    _recordUsage(name) {
        try {
            // Update usage count and timestamp
            const datasets = this.getAll();
            if (datasets[name]) {
                datasets[name].usageCount = (datasets[name].usageCount || 0) + 1;
                datasets[name].lastUsed = new Date().toISOString();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datasets));
            }
            
            // Update recent list
            const recent = this._getRecentList();
            const filtered = recent.filter(n => n !== name);
            filtered.unshift(name);
            localStorage.setItem(this.RECENT_KEY, JSON.stringify(filtered.slice(0, this.MAX_RECENT)));
        } catch (e) {
            console.warn('Failed to record usage:', e);
        }
    }
    
    /**
     * Get raw recent list (internal)
     */
    _getRecentList() {
        try {
            const data = localStorage.getItem(this.RECENT_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Match dataset values to document variables (case-insensitive)
     * @param {Object} datasetValues - Variable name -> value mapping
     * @param {Array} documentVariables - Array of Variable objects from scan
     * @returns {Object} - { matched: {name: value}, unmatched: [names], notInDataset: [names] }
     */
    matchToDocument(datasetValues, documentVariables) {
        const result = {
            matched: {},
            unmatched: [],     // In document but not in dataset
            notInDataset: []   // In dataset but not in document
        };
        
        // Create lowercase lookup for case-insensitive matching
        const datasetLower = {};
        const datasetOriginalNames = {};
        for (const [key, val] of Object.entries(datasetValues)) {
            const lowerKey = key.toLowerCase();
            datasetLower[lowerKey] = val;
            datasetOriginalNames[lowerKey] = key;
        }
        
        // Track which dataset keys were matched
        const matchedDatasetKeys = new Set();
        
        // Match document variables to dataset
        for (const variable of documentVariables) {
            const varNameLower = variable.name.toLowerCase();
            
            if (datasetLower.hasOwnProperty(varNameLower)) {
                result.matched[variable.name] = datasetLower[varNameLower];
                matchedDatasetKeys.add(varNameLower);
            } else {
                result.unmatched.push(variable.name);
            }
        }
        
        // Find dataset values not in document
        for (const lowerKey of Object.keys(datasetLower)) {
            if (!matchedDatasetKeys.has(lowerKey)) {
                result.notInDataset.push(datasetOriginalNames[lowerKey]);
            }
        }
        
        return result;
    }
    
    /**
     * Export all datasets to JSON
     * @returns {string}
     */
    exportToJSON() {
        return JSON.stringify(this.getAll(), null, 2);
    }
    
    /**
     * Import datasets from JSON
     * @param {string} json
     * @param {boolean} merge - If true, merge with existing; if false, replace all
     * @returns {Object} - { success: boolean, imported: number, message: string }
     */
    importFromJSON(json, merge = true) {
        try {
            const imported = JSON.parse(json);
            const existing = merge ? this.getAll() : {};
            
            let importCount = 0;
            for (const [name, dataset] of Object.entries(imported)) {
                if (dataset.values && typeof dataset.values === 'object') {
                    existing[name] = {
                        ...dataset,
                        name: name,
                        modified: new Date().toISOString()
                    };
                    importCount++;
                }
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
            
            return {
                success: true,
                imported: importCount,
                message: `Imported ${importCount} dataset(s)`
            };
        } catch (e) {
            return {
                success: false,
                imported: 0,
                message: `Import failed: ${e.message}`
            };
        }
    }
    
    /**
     * Clear all datasets
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.RECENT_KEY);
    }
    
    /**
     * Get storage statistics
     * @returns {Object}
     */
    getStats() {
        const datasets = this.getAll();
        const names = Object.keys(datasets);
        
        let totalValues = 0;
        let totalUsage = 0;
        
        for (const dataset of Object.values(datasets)) {
            totalValues += Object.keys(dataset.values || {}).length;
            totalUsage += dataset.usageCount || 0;
        }
        
        return {
            datasetCount: names.length,
            totalValues: totalValues,
            totalUsage: totalUsage,
            avgValuesPerDataset: names.length > 0 ? Math.round(totalValues / names.length) : 0
        };
    }
}

// Singleton dataset manager
const datasetManager = new DatasetManager();

// ============================================================================
// SHARED DATASET MANAGER
// ============================================================================

/**
 * Manages shared (firm-wide) datasets synced from cloud storage
 * Supports S3-compatible endpoints or REST APIs
 * 
 * Storage structure (S3-compatible):
 * s3://bucket/docforge-shared/
 * ├── datasets.json          # Index of all shared datasets
 * ├── datasets/
 * │   ├── acme-corp.json    # Individual dataset files
 * │   ├── standard-llc.json
 * │   └── ...
 * └── config.json           # Admin settings
 */
class SharedDatasetManager {
    constructor(options = {}) {
        // Configurable endpoint - S3 bucket URL or REST API base URL
        this.endpoint = options.endpoint || localStorage.getItem('docforge_shared_endpoint') || '';
        this.apiKey = options.apiKey || localStorage.getItem('docforge_shared_apikey') || '';
        
        // Local cache for offline support
        this.CACHE_KEY = 'docforge_shared_datasets_cache';
        this.CACHE_META_KEY = 'docforge_shared_cache_meta';
        this.ADMIN_KEY = 'docforge_is_admin';
        
        // In-memory cache
        this.cache = new Map();
        this.indexCache = null;
        this.lastSync = 0;
        
        // Sync settings
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.OFFLINE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    
    /**
     * Configure the shared dataset endpoint
     * @param {string} endpoint - S3 bucket URL or API base URL
     * @param {string} apiKey - Optional API key for authentication
     */
    configure(endpoint, apiKey = '') {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        
        localStorage.setItem('docforge_shared_endpoint', endpoint);
        if (apiKey) {
            localStorage.setItem('docforge_shared_apikey', apiKey);
        }
        
        // Clear cache when endpoint changes
        this.invalidateCache();
    }
    
    /**
     * Get current configuration
     * @returns {Object}
     */
    getConfig() {
        return {
            endpoint: this.endpoint,
            hasApiKey: !!this.apiKey,
            isConfigured: !!this.endpoint,
            lastSync: this.getLastSyncTime(),
            cacheSize: this.getCacheSize()
        };
    }
    
    /**
     * Check if endpoint is configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.endpoint;
    }
    
    // ========================================================================
    // ADMIN DETECTION
    // ========================================================================
    
    /**
     * Check if current user is admin
     * @returns {boolean}
     */
    isAdmin() {
        return localStorage.getItem(this.ADMIN_KEY) === 'true';
    }
    
    /**
     * Set admin status (typically set by login or config)
     * @param {boolean} isAdmin
     */
    setAdmin(isAdmin) {
        localStorage.setItem(this.ADMIN_KEY, isAdmin ? 'true' : 'false');
    }
    
    /**
     * Toggle admin mode (for dev/testing via Ctrl+Shift+A)
     * @returns {boolean} - New admin state
     */
    toggleAdmin() {
        const newState = !this.isAdmin();
        this.setAdmin(newState);
        return newState;
    }
    
    // ========================================================================
    // FETCH SHARED DATASETS
    // ========================================================================
    
    /**
     * Fetch all shared datasets from cloud
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async getSharedDatasets(options = {}) {
        const { forceRefresh = false } = options;
        
        // Check in-memory cache first
        if (!forceRefresh && this.indexCache && Date.now() - this.lastSync < this.CACHE_TTL) {
            return this.indexCache;
        }
        
        // If no endpoint configured, return cached or empty
        if (!this.endpoint) {
            return this._getCachedDatasets();
        }
        
        try {
            // Fetch index from endpoint
            const indexUrl = this._buildUrl('datasets.json');
            const response = await this._fetch(indexUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch datasets: ${response.status}`);
            }
            
            const index = await response.json();
            const datasets = index.datasets || [];
            
            // Update caches
            this.indexCache = datasets;
            this.lastSync = Date.now();
            this._saveToLocalCache(datasets);
            
            return datasets;
        } catch (error) {
            console.warn('Failed to fetch shared datasets:', error);
            
            // Fall back to local cache
            return this._getCachedDatasets();
        }
    }
    
    /**
     * Load a specific shared dataset by name
     * @param {string} name
     * @returns {Promise<Object|null>}
     */
    async loadSharedDataset(name) {
        // Check in-memory cache
        if (this.cache.has(name)) {
            const cached = this.cache.get(name);
            if (Date.now() - cached.loadedAt < this.CACHE_TTL) {
                return cached.data;
            }
        }
        
        // If no endpoint, try local cache
        if (!this.endpoint) {
            return this._getCachedDataset(name);
        }
        
        try {
            const datasetUrl = this._buildUrl(`datasets/${this._slugify(name)}.json`);
            const response = await this._fetch(datasetUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to load dataset: ${response.status}`);
            }
            
            const dataset = await response.json();
            
            // Cache in memory
            this.cache.set(name, {
                data: dataset,
                loadedAt: Date.now()
            });
            
            // Update local cache
            this._cacheDataset(name, dataset);
            
            return dataset;
        } catch (error) {
            console.warn(`Failed to load shared dataset "${name}":`, error);
            return this._getCachedDataset(name);
        }
    }
    
    // ========================================================================
    // ADMIN: PUBLISH/UPDATE/DELETE
    // ========================================================================
    
    /**
     * Publish a new shared dataset (admin only)
     * @param {string} name - Dataset name
     * @param {Object} values - Variable name -> value mapping
     * @param {Object} metadata - Optional metadata
     * @returns {Promise<Object>}
     */
    async publishDataset(name, values, metadata = {}) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        if (!this.endpoint) {
            return { success: false, message: 'Shared endpoint not configured' };
        }
        
        const slug = this._slugify(name);
        const dataset = {
            name: name,
            slug: slug,
            values: values,
            metadata: {
                description: metadata.description || '',
                category: metadata.category || 'General',
                tags: metadata.tags || [],
                createdBy: metadata.createdBy || 'Admin',
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                version: 1
            }
        };
        
        try {
            // Upload dataset file
            const datasetUrl = this._buildUrl(`datasets/${slug}.json`);
            const uploadResponse = await this._fetch(datasetUrl, {
                method: 'PUT',
                body: JSON.stringify(dataset, null, 2),
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            // Update index
            await this._updateIndex('add', {
                name: name,
                slug: slug,
                valueCount: Object.keys(values).length,
                description: metadata.description || '',
                category: metadata.category || 'General',
                createdAt: dataset.metadata.createdAt,
                modifiedAt: dataset.metadata.modifiedAt
            });
            
            // Invalidate caches
            this.invalidateCache();
            
            return {
                success: true,
                message: `Published "${name}" to firm datasets`,
                dataset: dataset
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to publish: ${error.message}`
            };
        }
    }
    
    /**
     * Update an existing shared dataset (admin only)
     * @param {string} name
     * @param {Object} values
     * @param {Object} metadata
     * @returns {Promise<Object>}
     */
    async updateSharedDataset(name, values, metadata = {}) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        if (!this.endpoint) {
            return { success: false, message: 'Shared endpoint not configured' };
        }
        
        try {
            // Load existing to get metadata
            const existing = await this.loadSharedDataset(name);
            if (!existing) {
                return { success: false, message: `Dataset "${name}" not found` };
            }
            
            const slug = this._slugify(name);
            const dataset = {
                ...existing,
                values: values,
                metadata: {
                    ...existing.metadata,
                    ...metadata,
                    modifiedAt: new Date().toISOString(),
                    version: (existing.metadata?.version || 0) + 1
                }
            };
            
            // Upload updated dataset
            const datasetUrl = this._buildUrl(`datasets/${slug}.json`);
            const uploadResponse = await this._fetch(datasetUrl, {
                method: 'PUT',
                body: JSON.stringify(dataset, null, 2),
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            // Update index
            await this._updateIndex('update', {
                name: name,
                slug: slug,
                valueCount: Object.keys(values).length,
                description: metadata.description || existing.metadata?.description || '',
                modifiedAt: dataset.metadata.modifiedAt
            });
            
            this.invalidateCache();
            
            return {
                success: true,
                message: `Updated "${name}"`,
                dataset: dataset
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update: ${error.message}`
            };
        }
    }
    
    /**
     * Delete a shared dataset (admin only)
     * @param {string} name
     * @returns {Promise<Object>}
     */
    async deleteSharedDataset(name) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        if (!this.endpoint) {
            return { success: false, message: 'Shared endpoint not configured' };
        }
        
        try {
            const slug = this._slugify(name);
            
            // Delete dataset file
            const datasetUrl = this._buildUrl(`datasets/${slug}.json`);
            const deleteResponse = await this._fetch(datasetUrl, {
                method: 'DELETE'
            });
            
            // 404 is OK - file might already be gone
            if (!deleteResponse.ok && deleteResponse.status !== 404) {
                throw new Error(`Delete failed: ${deleteResponse.status}`);
            }
            
            // Update index
            await this._updateIndex('remove', { name: name, slug: slug });
            
            this.invalidateCache();
            
            return {
                success: true,
                message: `Deleted "${name}" from firm datasets`
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete: ${error.message}`
            };
        }
    }
    
    // ========================================================================
    // MERGE SHARED + PERSONAL
    // ========================================================================
    
    /**
     * Get all datasets (shared + personal) organized for dropdown
     * @returns {Promise<Object>}
     */
    async getAllDatasets() {
        // Get personal datasets from local DatasetManager
        const personalDatasets = datasetManager.getDatasets();
        
        // Get shared datasets
        let sharedDatasets = [];
        if (this.endpoint) {
            sharedDatasets = await this.getSharedDatasets();
        }
        
        return {
            shared: sharedDatasets,
            personal: personalDatasets,
            hasShared: sharedDatasets.length > 0,
            isConfigured: this.isConfigured()
        };
    }
    
    /**
     * Load a dataset by prefixed name (shared: or personal:)
     * @param {string} prefixedName - e.g., "shared:acme-corp" or "personal:my-client"
     * @returns {Promise<Object|null>}
     */
    async loadDatasetByPrefix(prefixedName) {
        if (prefixedName.startsWith('shared:')) {
            const name = prefixedName.replace('shared:', '');
            const dataset = await this.loadSharedDataset(name);
            return dataset ? dataset.values : null;
        } else if (prefixedName.startsWith('personal:')) {
            const name = prefixedName.replace('personal:', '');
            return datasetManager.loadDataset(name);
        } else {
            // Try personal first, then shared
            let values = datasetManager.loadDataset(prefixedName);
            if (!values) {
                const dataset = await this.loadSharedDataset(prefixedName);
                values = dataset ? dataset.values : null;
            }
            return values;
        }
    }
    
    // ========================================================================
    // OFFLINE SUPPORT
    // ========================================================================
    
    /**
     * Sync shared datasets to local cache for offline use
     * @returns {Promise<Object>}
     */
    async syncToLocal() {
        if (!this.endpoint) {
            return { success: false, message: 'No endpoint configured' };
        }
        
        try {
            // Fetch all shared datasets
            const datasets = await this.getSharedDatasets({ forceRefresh: true });
            
            // Load each dataset fully
            let syncedCount = 0;
            for (const dataset of datasets) {
                const full = await this.loadSharedDataset(dataset.name);
                if (full) {
                    syncedCount++;
                }
            }
            
            // Update sync timestamp
            localStorage.setItem(this.CACHE_META_KEY, JSON.stringify({
                lastSync: Date.now(),
                datasetCount: syncedCount
            }));
            
            return {
                success: true,
                syncedCount: syncedCount,
                message: `Synced ${syncedCount} datasets for offline use`
            };
        } catch (error) {
            return {
                success: false,
                message: `Sync failed: ${error.message}`
            };
        }
    }
    
    /**
     * Get last sync timestamp
     * @returns {string|null}
     */
    getLastSyncTime() {
        try {
            const meta = JSON.parse(localStorage.getItem(this.CACHE_META_KEY) || '{}');
            return meta.lastSync ? new Date(meta.lastSync).toISOString() : null;
        } catch {
            return null;
        }
    }
    
    /**
     * Check if we're working offline (cache only)
     * @returns {boolean}
     */
    isOffline() {
        return !navigator.onLine || !this.endpoint;
    }
    
    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================
    
    /**
     * Build URL for endpoint
     */
    _buildUrl(path) {
        const base = this.endpoint.endsWith('/') ? this.endpoint : this.endpoint + '/';
        return base + path;
    }
    
    /**
     * Fetch with authentication headers
     */
    async _fetch(url, options = {}) {
        const headers = {
            ...options.headers
        };
        
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        
        return fetch(url, {
            ...options,
            headers,
            mode: 'cors'
        });
    }
    
    /**
     * Convert name to URL-safe slug
     */
    _slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    /**
     * Update the datasets index file
     */
    async _updateIndex(action, datasetMeta) {
        const indexUrl = this._buildUrl('datasets.json');
        
        // Fetch current index
        let index = { datasets: [], lastUpdated: null };
        try {
            const response = await this._fetch(indexUrl);
            if (response.ok) {
                index = await response.json();
            }
        } catch {
            // Start fresh if can't fetch
        }
        
        if (action === 'add') {
            // Remove if exists, then add
            index.datasets = index.datasets.filter(d => d.slug !== datasetMeta.slug);
            index.datasets.push(datasetMeta);
        } else if (action === 'update') {
            const idx = index.datasets.findIndex(d => d.slug === datasetMeta.slug);
            if (idx >= 0) {
                index.datasets[idx] = { ...index.datasets[idx], ...datasetMeta };
            }
        } else if (action === 'remove') {
            index.datasets = index.datasets.filter(d => d.slug !== datasetMeta.slug);
        }
        
        index.lastUpdated = new Date().toISOString();
        
        // Upload updated index
        await this._fetch(indexUrl, {
            method: 'PUT',
            body: JSON.stringify(index, null, 2),
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    /**
     * Save datasets to local storage cache
     */
    _saveToLocalCache(datasets) {
        try {
            const cache = {
                datasets: datasets,
                cachedAt: Date.now()
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('Failed to cache datasets locally:', e);
        }
    }
    
    /**
     * Get datasets from local cache
     */
    _getCachedDatasets() {
        try {
            const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
            
            // Check if cache is still valid
            if (cache.datasets && Date.now() - cache.cachedAt < this.OFFLINE_TTL) {
                return cache.datasets;
            }
            
            return [];
        } catch {
            return [];
        }
    }
    
    /**
     * Cache a single dataset locally
     */
    _cacheDataset(name, dataset) {
        try {
            const key = `docforge_shared_dataset_${this._slugify(name)}`;
            localStorage.setItem(key, JSON.stringify({
                dataset: dataset,
                cachedAt: Date.now()
            }));
        } catch (e) {
            console.warn(`Failed to cache dataset "${name}":`, e);
        }
    }
    
    /**
     * Get a single dataset from local cache
     */
    _getCachedDataset(name) {
        try {
            const key = `docforge_shared_dataset_${this._slugify(name)}`;
            const cache = JSON.parse(localStorage.getItem(key) || '{}');
            
            if (cache.dataset && Date.now() - cache.cachedAt < this.OFFLINE_TTL) {
                return cache.dataset;
            }
            
            return null;
        } catch {
            return null;
        }
    }
    
    /**
     * Invalidate all caches
     */
    invalidateCache() {
        this.cache.clear();
        this.indexCache = null;
        this.lastSync = 0;
    }
    
    /**
     * Get cache size info
     */
    getCacheSize() {
        try {
            const cache = localStorage.getItem(this.CACHE_KEY) || '';
            return Math.round(cache.length / 1024) + 'KB';
        } catch {
            return '0KB';
        }
    }
    
    /**
     * Clear all local caches
     */
    clearLocalCache() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_META_KEY);
        
        // Clear individual dataset caches
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith('docforge_shared_dataset_')) {
                localStorage.removeItem(key);
            }
        }
        
        this.invalidateCache();
    }
    
    /**
     * Export shared datasets to JSON (for backup/migration)
     * @returns {Promise<string>}
     */
    async exportToJSON() {
        const datasets = await this.getSharedDatasets({ forceRefresh: true });
        const fullDatasets = {};
        
        for (const meta of datasets) {
            const full = await this.loadSharedDataset(meta.name);
            if (full) {
                fullDatasets[meta.name] = full;
            }
        }
        
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            datasets: fullDatasets
        }, null, 2);
    }
    
    /**
     * Import datasets from JSON (admin only)
     * @param {string} json
     * @param {boolean} overwrite - Overwrite existing datasets
     * @returns {Promise<Object>}
     */
    async importFromJSON(json, overwrite = false) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        try {
            const data = JSON.parse(json);
            const datasets = data.datasets || data;
            
            let imported = 0;
            let skipped = 0;
            
            for (const [name, dataset] of Object.entries(datasets)) {
                // Check if exists
                const existing = await this.loadSharedDataset(name);
                
                if (existing && !overwrite) {
                    skipped++;
                    continue;
                }
                
                const values = dataset.values || dataset;
                const metadata = dataset.metadata || {};
                
                const result = existing
                    ? await this.updateSharedDataset(name, values, metadata)
                    : await this.publishDataset(name, values, metadata);
                
                if (result.success) {
                    imported++;
                }
            }
            
            return {
                success: true,
                imported: imported,
                skipped: skipped,
                message: `Imported ${imported} datasets${skipped > 0 ? `, skipped ${skipped} existing` : ''}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Import failed: ${error.message}`
            };
        }
    }
}

// Singleton shared dataset manager
const sharedDatasetManager = new SharedDatasetManager();

// ============================================================================
// TYPE INFERENCE
// ============================================================================

/**
 * Infer the type of a variable based on its name
 */
function inferVariableType(variableName) {
    const name = variableName.toLowerCase();
    
    for (const typeId of TYPE_PRIORITY) {
        const type = VARIABLE_TYPES[typeId];
        if (!type.patterns || type.patterns.length === 0) continue;
        
        for (const pattern of type.patterns) {
            if (pattern.test(name)) {
                return typeId;
            }
        }
    }
    
    return 'text'; // Default fallback
}

/**
 * Validate a value against its type
 */
function validateValue(value, typeId) {
    const type = VARIABLE_TYPES[typeId];
    if (!type || !type.validator) return true;
    
    try {
        return type.validator(value);
    } catch (e) {
        return false;
    }
}

/**
 * Format a value according to its type
 */
function formatValue(value, typeId, options = {}) {
    const type = VARIABLE_TYPES[typeId];
    if (!type || !type.formatter) return value;
    
    try {
        return type.formatter(value, options.format);
    } catch (e) {
        return value;
    }
}

/**
 * Get type metadata (placeholder, inputType, etc.)
 */
function getTypeInfo(typeId) {
    return VARIABLE_TYPES[typeId] || VARIABLE_TYPES.text;
}

// ============================================================================
// VARIABLE DETECTOR
// ============================================================================

/**
 * Represents a detected variable in the document
 */
class Variable {
    constructor(opts) {
        this.name = opts.name;
        this.bracketStyle = opts.bracketStyle;
        this.inferredType = opts.inferredType || inferVariableType(opts.name);
        this.occurrences = opts.occurrences || [];
        this.value = opts.value || null;
        this.isContentControl = opts.isContentControl || false;
        this.contentControlId = opts.contentControlId || null;
    }
    
    /**
     * Get the full placeholder text
     */
    getPlaceholder() {
        const style = BRACKET_STYLES[this.bracketStyle.toUpperCase()] || BRACKET_STYLES.DOUBLE_CURLY;
        return `${style.open}${this.name}${style.close}`;
    }
    
    /**
     * Get formatted display name
     */
    getDisplayName() {
        // Convert snake_case or camelCase to readable
        return this.name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * Validate current value
     */
    validate() {
        if (!this.value) return { valid: false, message: 'Value is required' };
        return {
            valid: validateValue(this.value, this.inferredType),
            message: validateValue(this.value, this.inferredType) ? null : `Invalid ${this.inferredType} format`
        };
    }
    
    /**
     * Format value for insertion
     */
    format(options = {}) {
        if (!this.value) return '';
        return formatValue(this.value, this.inferredType, options);
    }
}

/**
 * Scan document text for template variables
 * @param {string} text - Document text to scan
 * @param {Object} options - Scanning options
 * @returns {Map<string, Variable>}
 */
function scanTextForVariables(text, options = {}) {
    const enabledStyles = options.bracketStyles || DEFAULT_BRACKET_STYLES;
    const variableMap = new Map();
    
    for (const styleId of enabledStyles) {
        const styleKey = styleId.toUpperCase();
        const style = BRACKET_STYLES[styleKey];
        if (!style) continue;
        
        // Create fresh regex for each scan
        const regex = new RegExp(style.regex.source, 'g');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const varName = match[1];
            const position = match.index;
            
            // Normalize name for deduplication (case-insensitive compare)
            const normalizedName = options.caseSensitive ? varName : varName;
            
            if (variableMap.has(normalizedName)) {
                // Add occurrence to existing variable
                variableMap.get(normalizedName).occurrences.push({
                    position: position,
                    length: match[0].length,
                    bracketStyle: styleId
                });
            } else {
                // Create new variable
                variableMap.set(normalizedName, new Variable({
                    name: varName,
                    bracketStyle: styleId,
                    occurrences: [{
                        position: position,
                        length: match[0].length,
                        bracketStyle: styleId
                    }]
                }));
            }
        }
    }
    
    return variableMap;
}

/**
 * Scan document for all template variables
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function scanDocument(context, options = {}) {
    const startTime = performance.now();
    
    // Load document body text
    const body = context.document.body;
    body.load('text');
    await context.sync();
    
    const documentText = body.text;
    
    // Check cache
    if (!options.forceRefresh && cache.isValid(documentText)) {
        return {
            variables: cache.variables,
            contentControls: cache.contentControls,
            fromCache: true,
            scanTime: performance.now() - startTime
        };
    }
    
    // Scan for text-based variables
    const variableMap = scanTextForVariables(documentText, options);
    
    // Scan for content controls
    const contentControls = await scanContentControls(context, options);
    
    // Merge content control variables
    for (const cc of contentControls) {
        if (variableMap.has(cc.name)) {
            // Update existing variable with CC info
            const existing = variableMap.get(cc.name);
            existing.isContentControl = true;
            existing.contentControlId = cc.id;
        } else {
            // Add new variable from CC
            variableMap.set(cc.name, new Variable({
                name: cc.name,
                bracketStyle: 'content_control',
                inferredType: inferVariableType(cc.name),
                isContentControl: true,
                contentControlId: cc.id,
                occurrences: [{
                    position: -1, // Unknown position for CC
                    isContentControl: true
                }]
            }));
        }
    }
    
    // Convert to array and sort by name
    const variables = Array.from(variableMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Calculate statistics
    const stats = {
        totalVariables: variables.length,
        uniqueNames: new Set(variables.map(v => v.name.toLowerCase())).size,
        totalOccurrences: variables.reduce((sum, v) => sum + v.occurrences.length, 0),
        byType: {},
        byBracketStyle: {},
        contentControlCount: contentControls.length,
        scanTime: performance.now() - startTime
    };
    
    for (const v of variables) {
        stats.byType[v.inferredType] = (stats.byType[v.inferredType] || 0) + 1;
        stats.byBracketStyle[v.bracketStyle] = (stats.byBracketStyle[v.bracketStyle] || 0) + 1;
    }
    
    // Update cache
    cache.store(variables, contentControls, documentText);
    
    return {
        variables,
        contentControls,
        stats,
        fromCache: false,
        scanTime: stats.scanTime
    };
}

/**
 * Scan for content controls used as template variables
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function scanContentControls(context, options = {}) {
    try {
        const controls = context.document.contentControls;
        controls.load('items/id,items/tag,items/title,items/text,items/placeholderText');
        await context.sync();
        
        const templateControls = [];
        
        for (const cc of controls.items) {
            // Check if this is a template variable CC
            const isTemplate = (cc.tag && cc.tag.startsWith('template_')) ||
                              (cc.title && /^[A-Za-z_][A-Za-z0-9_]*$/.test(cc.title)) ||
                              (cc.placeholderText && cc.placeholderText.match(/\{\{|\[\[|<</));
            
            if (isTemplate) {
                const name = cc.tag?.replace('template_', '') || 
                           cc.title || 
                           extractVarNameFromPlaceholder(cc.placeholderText);
                
                if (name) {
                    templateControls.push({
                        id: cc.id,
                        name: name,
                        currentValue: cc.text,
                        placeholder: cc.placeholderText,
                        tag: cc.tag,
                        title: cc.title
                    });
                }
            }
        }
        
        return templateControls;
    } catch (e) {
        console.warn('Content control scanning failed:', e);
        return [];
    }
}

/**
 * Extract variable name from placeholder text
 */
function extractVarNameFromPlaceholder(placeholder) {
    if (!placeholder) return null;
    
    for (const style of Object.values(BRACKET_STYLES)) {
        const match = placeholder.match(style.regex);
        if (match) return match[1];
    }
    
    return null;
}

// ============================================================================
// TEMPLATE FILLER
// ============================================================================

/**
 * Preview changes before applying
 * @param {Word.RequestContext} context
 * @param {Object} values - Variable name -> value mapping
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function previewFill(context, values, options = {}) {
    const { variables } = await scanDocument(context, options);
    
    const preview = [];
    
    for (const variable of variables) {
        const newValue = values[variable.name];
        
        if (newValue !== undefined && newValue !== null) {
            const formattedValue = formatValue(newValue, variable.inferredType);
            const validation = validateValue(newValue, variable.inferredType);
            
            preview.push({
                name: variable.name,
                displayName: variable.getDisplayName(),
                currentPlaceholder: variable.getPlaceholder(),
                newValue: formattedValue,
                occurrences: variable.occurrences.length,
                type: variable.inferredType,
                isValid: validation,
                isContentControl: variable.isContentControl
            });
        }
    }
    
    return preview;
}

/**
 * Fill template variables with values - BATCH OPTIMIZED
 * Minimizes context.sync() calls for maximum speed
 * 
 * Performance target: < 200ms for 50 variables
 * 
 * @param {Word.RequestContext} context
 * @param {Object} values - Variable name -> value mapping
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fillTemplate(context, values, options = {}) {
    const startTime = performance.now();
    const { variables, contentControls } = await scanDocument(context, options);
    
    let filledCount = 0;
    let occurrencesFilled = 0;
    const errors = [];
    
    // Get enabled bracket styles
    const enabledStyles = options.bracketStyles || DEFAULT_BRACKET_STYLES;
    
    // BATCH OPTIMIZATION: Collect all search patterns first
    const allSearches = [];
    const variableByPattern = new Map();
    
    // Build search patterns for all variables upfront
    for (const variable of variables) {
        const value = values[variable.name];
        if (value === undefined || value === null) continue;
        
        const formattedValue = formatValue(value, variable.inferredType);
        
        // Collect all bracket style patterns for this variable
        for (const occ of variable.occurrences) {
            if (occ.isContentControl) continue;
            const style = BRACKET_STYLES[occ.bracketStyle.toUpperCase()];
            if (style) {
                const pattern = `${style.open}${variable.name}${style.close}`;
                if (!variableByPattern.has(pattern)) {
                    variableByPattern.set(pattern, {
                        variable,
                        formattedValue,
                        pattern
                    });
                }
            }
        }
    }
    
    // BATCH PHASE 1: Fill content controls (if any)
    if (contentControls.length > 0) {
        const controls = context.document.contentControls;
        controls.load('items/id,items/tag,items/title');
        await context.sync();
        
        // Queue all content control replacements
        for (const cc of contentControls) {
            const value = values[cc.name];
            if (value === undefined || value === null) continue;
            
            try {
                for (const ctrl of controls.items) {
                    if (ctrl.id === cc.id) {
                        const variable = variables.find(v => v.name === cc.name);
                        const formattedValue = variable 
                            ? formatValue(value, variable.inferredType)
                            : value;
                        
                        // Queue replacement (no sync yet)
                        ctrl.insertText(formattedValue, Word.InsertLocation.replace);
                        filledCount++;
                        occurrencesFilled++;
                        break;
                    }
                }
            } catch (e) {
                errors.push({ name: cc.name, error: e.message });
            }
        }
        
        // Single sync for all content control replacements
        await context.sync();
    }
    
    // BATCH PHASE 2: Search for all patterns at once
    const searchResults = [];
    for (const [pattern, data] of variableByPattern) {
        const results = context.document.body.search(pattern, { matchCase: true });
        searchResults.push({ results, ...data });
    }
    
    // Load all search results in single sync
    for (const sr of searchResults) {
        sr.results.load('items');
    }
    await context.sync();
    
    // BATCH PHASE 3: Queue all replacements
    for (const sr of searchResults) {
        try {
            for (const range of sr.results.items) {
                // Queue replacement (no sync yet)
                range.insertText(sr.formattedValue, Word.InsertLocation.replace);
                occurrencesFilled++;
            }
            
            if (sr.results.items.length > 0) {
                filledCount++;
            }
        } catch (e) {
            errors.push({ name: sr.variable.name, pattern: sr.pattern, error: e.message });
        }
    }
    
    // Single final sync for all text replacements
    await context.sync();
    
    // Store filled values in fast storage
    try {
        await fastVariableStore.storeVariables(context, values, { persistToDocument: true });
    } catch (e) {
        console.warn('[fillTemplate] Failed to persist variables:', e);
    }
    
    // Invalidate cache after changes
    cache.invalidate();
    
    const fillTime = performance.now() - startTime;
    
    return {
        success: errors.length === 0,
        filledCount: filledCount,
        occurrencesFilled: occurrencesFilled,
        errors: errors,
        fillTime: fillTime,
        message: errors.length === 0 
            ? `Filled ${filledCount} variable(s) (${occurrencesFilled} occurrence(s)) in ${fillTime.toFixed(0)}ms` 
            : `Filled ${filledCount} variable(s) with ${errors.length} error(s)`
    };
}

/**
 * Fill template from a saved profile
 * @param {Word.RequestContext} context
 * @param {string} profileName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fillFromProfile(context, profileName, options = {}) {
    const profile = profileStore.get(profileName);
    
    if (!profile) {
        return {
            success: false,
            message: `Profile "${profileName}" not found`
        };
    }
    
    // Record usage
    profileStore.recordUsage(profileName);
    
    // Fill template
    const result = await fillTemplate(context, profile.variables, options);
    result.profileName = profileName;
    
    return result;
}

/**
 * Create a profile from current document variables
 * @param {Word.RequestContext} context
 * @param {string} profileName
 * @param {Object} values - Variable values to save
 * @returns {Promise<Object>}
 */
async function createProfileFromDocument(context, profileName, values = {}) {
    const { variables } = await scanDocument(context);
    
    // Build profile with provided values and placeholders
    const profileVariables = {};
    for (const variable of variables) {
        profileVariables[variable.name] = values[variable.name] || null;
    }
    
    const success = profileStore.save(profileName, profileVariables, {
        variableCount: variables.length,
        sourceDocument: 'Current Document'
    });
    
    return {
        success,
        message: success 
            ? `Profile "${profileName}" created with ${variables.length} variables`
            : 'Failed to save profile'
    };
}

// ============================================================================
// INSERT VARIABLE
// ============================================================================

/**
 * Insert a new template variable at cursor position
 * @param {Word.RequestContext} context
 * @param {string} variableName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function insertVariable(context, variableName, options = {}) {
    const {
        bracketStyle = 'double_curly',
        useContentControl = false,
        variableType = null
    } = options;
    
    const selection = context.document.getSelection();
    
    if (useContentControl) {
        // Insert as Content Control
        const cc = selection.insertContentControl();
        cc.tag = `template_${variableName}`;
        cc.title = variableName;
        cc.placeholderText = `Enter ${variableName.replace(/_/g, ' ')}`;
        
        // Set appearance
        cc.appearance = Word.ContentControlAppearance.boundingBox;
        
        await context.sync();
        
        return {
            success: true,
            type: 'content_control',
            message: `Inserted Content Control for "${variableName}"`
        };
    } else {
        // Insert as text placeholder
        const style = BRACKET_STYLES[bracketStyle.toUpperCase()] || BRACKET_STYLES.DOUBLE_CURLY;
        const placeholder = `${style.open}${variableName}${style.close}`;
        
        selection.insertText(placeholder, Word.InsertLocation.replace);
        await context.sync();
        
        return {
            success: true,
            type: 'text',
            placeholder: placeholder,
            message: `Inserted "${placeholder}"`
        };
    }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export variable list to JSON
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<string>}
 */
async function exportVariablesToJSON(context, options = {}) {
    const { variables } = await scanDocument(context, options);
    
    const exportData = {
        documentName: 'Untitled', // Could get from document properties
        exportDate: new Date().toISOString(),
        variableCount: variables.length,
        variables: variables.map(v => ({
            name: v.name,
            displayName: v.getDisplayName(),
            type: v.inferredType,
            occurrences: v.occurrences.length,
            placeholder: v.getPlaceholder(),
            isContentControl: v.isContentControl,
            value: v.value || null
        }))
    };
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Export variable list to CSV
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<string>}
 */
async function exportVariablesToCSV(context, options = {}) {
    const { variables } = await scanDocument(context, options);
    
    const headers = ['Name', 'Display Name', 'Type', 'Occurrences', 'Placeholder', 'Value'];
    const rows = variables.map(v => [
        v.name,
        v.getDisplayName(),
        v.inferredType,
        v.occurrences.length,
        v.getPlaceholder(),
        v.value || ''
    ]);
    
    const escapeCSV = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const csv = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    return csv;
}

/**
 * Import variable values from JSON
 * @param {string} json
 * @returns {Object}
 */
function importValuesFromJSON(json) {
    try {
        const data = JSON.parse(json);
        
        // Handle both formats: array of variables or simple object
        if (Array.isArray(data.variables)) {
            const values = {};
            for (const v of data.variables) {
                if (v.name && v.value) {
                    values[v.name] = v.value;
                }
            }
            return { success: true, values };
        }
        
        if (typeof data === 'object') {
            return { success: true, values: data };
        }
        
        return { success: false, message: 'Invalid JSON format' };
    } catch (e) {
        return { success: false, message: `Parse error: ${e.message}` };
    }
}

// ============================================================================
// HIGHLIGHT UNFILLED
// ============================================================================

/**
 * Highlight unfilled variables in the document
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function highlightUnfilled(context, options = {}) {
    const { color = 'yellow' } = options;
    const { variables } = await scanDocument(context, options);
    
    const colorMap = {
        yellow: '#FFFF00',
        red: '#FF6B6B',
        green: '#90EE90',
        blue: '#87CEEB'
    };
    
    const highlightColor = colorMap[color] || color;
    let highlightedCount = 0;
    
    for (const variable of variables) {
        if (variable.isContentControl) continue; // Skip CCs, they have their own styling
        
        const placeholder = variable.getPlaceholder();
        
        try {
            const results = context.document.body.search(placeholder, { matchCase: true });
            results.load('items');
            await context.sync();
            
            for (const range of results.items) {
                range.font.highlightColor = highlightColor;
                highlightedCount++;
            }
        } catch (e) {
            console.warn(`Failed to highlight ${placeholder}:`, e);
        }
    }
    
    await context.sync();
    
    return {
        success: true,
        highlightedCount,
        message: `Highlighted ${highlightedCount} unfilled variable(s)`
    };
}

/**
 * Clear highlighting from variables
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function clearHighlighting(context, options = {}) {
    const { variables } = await scanDocument(context, options);
    let clearedCount = 0;
    
    for (const variable of variables) {
        const placeholder = variable.getPlaceholder();
        
        try {
            const results = context.document.body.search(placeholder, { matchCase: true });
            results.load('items');
            await context.sync();
            
            for (const range of results.items) {
                range.font.highlightColor = null;
                clearedCount++;
            }
        } catch (e) {
            console.warn(`Failed to clear highlight for ${placeholder}:`, e);
        }
    }
    
    await context.sync();
    
    return {
        success: true,
        clearedCount,
        message: `Cleared highlighting from ${clearedCount} variable(s)`
    };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate all variable values
 * @param {Object} values - Variable name -> value mapping
 * @param {Array} variables - Variable definitions
 * @returns {Object}
 */
function validateAllValues(values, variables) {
    const results = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    for (const variable of variables) {
        const value = values[variable.name];
        
        // Check for missing required values
        if (value === undefined || value === null || value === '') {
            results.warnings.push({
                name: variable.name,
                message: 'No value provided'
            });
            continue;
        }
        
        // Validate against type
        const isValid = validateValue(value, variable.inferredType);
        if (!isValid) {
            results.valid = false;
            results.errors.push({
                name: variable.name,
                value: value,
                type: variable.inferredType,
                message: `Invalid ${VARIABLE_TYPES[variable.inferredType]?.name || 'value'} format`
            });
        }
    }
    
    return results;
}

// ============================================================================
// EXPORT
// ============================================================================

const TemplateModule = {
    // Main API
    scanDocument,
    scanContentControls,
    previewFill,
    fillTemplate,
    fillFromProfile,
    createProfileFromDocument,
    insertVariable,
    
    // Type inference
    inferVariableType,
    validateValue,
    formatValue,
    getTypeInfo,
    validateAllValues,
    
    // Highlighting
    highlightUnfilled,
    clearHighlighting,
    
    // Export/Import
    exportVariablesToJSON,
    exportVariablesToCSV,
    importValuesFromJSON,
    
    // Profile management (legacy)
    profileStore,
    
    // Dataset management (Quick Fill)
    datasetManager,
    
    // Shared dataset management (Firm-wide)
    sharedDatasetManager,
    
    // Fast variable storage (NO Custom XML - speed optimized)
    fastVariableStore,
    FastVariableStore,
    
    // Configuration
    BRACKET_STYLES,
    DEFAULT_BRACKET_STYLES,
    VARIABLE_TYPES,
    TYPE_PRIORITY,
    
    // Classes
    Variable,
    TemplateCache,
    ProfileStore,
    DatasetManager,
    SharedDatasetManager,
    
    // Utilities
    scanTextForVariables,
    extractVarNameFromPlaceholder,
    
    // Cache management
    cache,
    invalidateCache: () => cache.invalidate(),
    
    // Version
    VERSION: '2.3.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.Template = TemplateModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateModule;
}
