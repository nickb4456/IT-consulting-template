/**
 * DocForge - Document Model v2.0
 * 
 * Single source of truth for document structure.
 * All modules read from and write through this model instead of 
 * parsing the document independently.
 * 
 * v2.0 Features:
 * - Incremental parsing with paragraph hashing
 * - Fast change detection
 * - Stable references to unchanged sections
 * - Performance-optimized with batched operations
 * 
 * Performance targets:
 * - Full document scan: < 500ms for 100 pages
 * - Incremental update: < 100ms
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// DOCUMENT MODEL CLASSES
// ============================================================================

/**
 * Represents a parsed paragraph with all relevant metadata
 */
class Paragraph {
    constructor(data) {
        this.index = data.index;           // Position in document
        this.text = data.text || '';       // Full text content
        this.style = data.style || '';     // Word style name
        this.level = data.level || 0;      // Outline/heading level (0 = body)
        this.number = data.number || null; // Detected numbering (e.g., "1.2.3")
        this.numberFormat = data.numberFormat || null; // Format type
        this.isHeading = data.isHeading || false;
        this.isNumbered = data.isNumbered || false;
        this.isEmpty = data.isEmpty || false;
        this.range = data.range || null;   // Word range reference (for updates)
        this.bookmarkId = data.bookmarkId || null;
        this.children = [];                // Sub-paragraphs (for tree structure)
        this.parent = null;                // Parent paragraph reference
        this.hash = data.hash || 0;        // Content hash for change detection
        this.stableId = data.stableId || null; // Stable ID that persists across reparsing
    }
    
    /**
     * Get text without the numbering prefix
     */
    getTextWithoutNumber() {
        if (!this.number) return this.text;
        return this.text.replace(new RegExp(`^\\s*${this.number.replace(/\./g, '\\.')}\\s*\\.?\\s*`), '').trim();
    }
    
    /**
     * Get short preview of text
     */
    getPreview(maxLen = 50) {
        const text = this.getTextWithoutNumber();
        return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
    }
    
    /**
     * Generate content hash
     */
    computeHash() {
        return simpleHash(this.text + this.style);
    }
}

/**
 * Represents a cross-reference in the document
 */
class CrossReference {
    constructor(data) {
        this.text = data.text || '';           // Full reference text (e.g., "Section 3.2")
        this.target = data.target || '';       // Target number (e.g., "3.2")
        this.format = data.format || 'standard';
        this.paragraphIndex = data.paragraphIndex;
        this.isValid = data.isValid !== false;
        this.range = data.range || null;
    }
}

/**
 * Represents a template variable in the document
 */
class TemplateVariable {
    constructor(data) {
        this.name = data.name || '';
        this.type = data.type || 'text';
        this.occurrences = data.occurrences || [];  // Array of {paragraphIndex, position}
        this.value = data.value || null;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Fast hash function for strings
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
 * Generate stable ID from paragraph content and position
 */
function generateStableId(index, text, number) {
    const contentPart = text ? text.substring(0, 50) : '';
    const numberPart = number || 'body';
    return `p_${index}_${simpleHash(contentPart + numberPart)}`;
}

// ============================================================================
// INCREMENTAL PARSER
// ============================================================================

/**
 * Incremental parser for efficient document updates
 */
class IncrementalParser {
    constructor() {
        this.paragraphHashes = new Map();
        this.lastFullParse = 0;
        this.stableIdMap = new Map(); // stableId -> paragraph
    }
    
    /**
     * Detect which paragraphs have changed
     * @param {Array} currentParagraphs - Current paragraph data
     * @returns {Object} - { added, removed, modified, unchanged }
     */
    detectChanges(currentParagraphs) {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            unchanged: [],
            hasChanges: false
        };
        
        const newHashes = new Map();
        
        // Build new hash map
        for (let i = 0; i < currentParagraphs.length; i++) {
            const para = currentParagraphs[i];
            const hash = simpleHash(para.text + para.style);
            newHashes.set(i, hash);
        }
        
        // Compare with old hashes
        for (const [index, oldHash] of this.paragraphHashes) {
            if (!newHashes.has(index)) {
                changes.removed.push(index);
            } else if (newHashes.get(index) !== oldHash) {
                changes.modified.push(index);
            } else {
                changes.unchanged.push(index);
            }
        }
        
        // Find added paragraphs
        for (const [index] of newHashes) {
            if (!this.paragraphHashes.has(index)) {
                changes.added.push(index);
            }
        }
        
        changes.hasChanges = changes.added.length > 0 || 
                            changes.removed.length > 0 || 
                            changes.modified.length > 0;
        
        return changes;
    }
    
    /**
     * Update stored hashes
     * @param {Array} paragraphs - Paragraph data
     */
    updateHashes(paragraphs) {
        this.paragraphHashes.clear();
        for (let i = 0; i < paragraphs.length; i++) {
            const hash = simpleHash(paragraphs[i].text + paragraphs[i].style);
            this.paragraphHashes.set(i, hash);
        }
    }
    
    /**
     * Register a paragraph's stable ID
     */
    registerStableId(stableId, paragraph) {
        this.stableIdMap.set(stableId, paragraph);
    }
    
    /**
     * Get paragraph by stable ID
     */
    getByStableId(stableId) {
        return this.stableIdMap.get(stableId);
    }
    
    /**
     * Clear all cached data
     */
    clear() {
        this.paragraphHashes.clear();
        this.stableIdMap.clear();
        this.lastFullParse = 0;
    }
}

// ============================================================================
// MAIN DOCUMENT MODEL
// ============================================================================

/**
 * Main Document Model - single source of truth
 */
class DocumentModel {
    constructor() {
        this.paragraphs = [];           // Flat list of all paragraphs
        this.sections = [];             // Hierarchical section tree
        this.headings = [];             // Just the headings (for TOC)
        this.crossReferences = [];      // All cross-references
        this.variables = [];            // All template variables
        this.bookmarks = new Map();     // Bookmark name -> paragraph index
        
        this.lastParsed = null;         // Timestamp of last parse
        this.documentHash = null;       // Hash to detect changes
        this.documentFingerprint = null; // Fast fingerprint for change detection
        this.isDirty = true;            // Needs re-parse
        
        // Incremental parsing support
        this.incrementalParser = new IncrementalParser();
        this.parseMode = 'full';        // 'full' or 'incremental'
        this.lastIncrementalParse = 0;
        
        // Performance tracking
        this.stats = {
            fullParseCount: 0,
            incrementalParseCount: 0,
            totalParseTime: 0
        };
        
        // Event subscribers
        this._subscribers = {
            'change': [],
            'parsed': [],
            'beforeMutation': [],
            'afterMutation': []
        };
    }
    
    // ========================================================================
    // PARSING
    // ========================================================================
    
    /**
     * Parse the entire document and populate the model
     * @param {Word.RequestContext} context - Word.run context
     * @param {Object} options - Parse options
     */
    async parse(context, options = {}) {
        const startTime = performance.now();
        const forceRefresh = options.forceRefresh || false;
        const incrementalAllowed = options.incremental !== false;
        
        // Check if we need to re-parse
        if (!forceRefresh && !this.isDirty && this._isRecent()) {
            return this;
        }
        
        // Try incremental parse first if allowed and we have prior data
        if (incrementalAllowed && !forceRefresh && this.paragraphs.length > 0) {
            const incrementalResult = await this._tryIncrementalParse(context);
            if (incrementalResult.success) {
                this.parseMode = 'incremental';
                this.lastIncrementalParse = Date.now();
                this.stats.incrementalParseCount++;
                this.stats.totalParseTime += performance.now() - startTime;
                return this;
            }
        }
        
        // Full parse
        await this._fullParse(context);
        this.parseMode = 'full';
        this.stats.fullParseCount++;
        this.stats.totalParseTime += performance.now() - startTime;
        
        return this;
    }
    
    /**
     * Full document parse
     * @private
     */
    async _fullParse(context) {
        const startTime = performance.now();
        
        // Load all paragraphs - BATCH OPTIMIZED
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items');
        await context.sync();
        
        // Load all paragraph properties in single call
        for (const para of paragraphs.items) {
            para.load(['text', 'style', 'listItem', 'outlineLevel']);
        }
        await context.sync();
        
        // Reset model
        this.paragraphs = [];
        this.sections = [];
        this.headings = [];
        this.crossReferences = [];
        this.variables = [];
        this.bookmarks.clear();
        this.incrementalParser.clear();
        
        // Process each paragraph
        const rawParagraphs = [];
        for (let i = 0; i < paragraphs.items.length; i++) {
            rawParagraphs.push({
                text: paragraphs.items[i].text || '',
                style: paragraphs.items[i].style || '',
                outlineLevel: paragraphs.items[i].outlineLevel
            });
        }
        
        // Parse paragraphs
        for (let i = 0; i < rawParagraphs.length; i++) {
            const raw = rawParagraphs[i];
            const parsed = this._parseParagraph(raw, i);
            this.paragraphs.push(parsed);
            
            // Register stable ID
            this.incrementalParser.registerStableId(parsed.stableId, parsed);
            
            // Track headings
            if (parsed.isHeading) {
                this.headings.push(parsed);
            }
            
            // Track numbered sections
            if (parsed.isNumbered && parsed.number) {
                this.sections.push(parsed);
            }
            
            // Detect cross-references in text
            this._detectCrossReferences(parsed);
            
            // Detect template variables
            this._detectVariables(parsed);
        }
        
        // Update incremental parser hashes
        this.incrementalParser.updateHashes(rawParagraphs);
        
        // Build hierarchical structure
        this._buildHierarchy();
        
        // Validate cross-references
        this._validateCrossReferences();
        
        // Generate document fingerprint
        const fullText = this.paragraphs.map(p => p.text).join('\n');
        this.documentFingerprint = this._generateFingerprint(fullText);
        
        // Update model state
        this.lastParsed = Date.now();
        this.isDirty = false;
        
        const duration = performance.now() - startTime;
        
        // Notify subscribers
        this._emit('parsed', {
            paragraphCount: this.paragraphs.length,
            sectionCount: this.sections.length,
            headingCount: this.headings.length,
            crossRefCount: this.crossReferences.length,
            variableCount: this.variables.length,
            parseTime: duration,
            mode: 'full'
        });
        
        return this;
    }
    
    /**
     * Try incremental parse - only reparse changed paragraphs
     * @private
     */
    async _tryIncrementalParse(context) {
        const startTime = performance.now();
        
        try {
            // Load current paragraphs
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items');
            await context.sync();
            
            // Quick check: if paragraph count changed significantly, do full parse
            const countDiff = Math.abs(paragraphs.items.length - this.paragraphs.length);
            if (countDiff > 10) {
                return { success: false, reason: 'significant_structure_change' };
            }
            
            // Load text for all paragraphs
            for (const para of paragraphs.items) {
                para.load(['text', 'style']);
            }
            await context.sync();
            
            // Build current state
            const currentParagraphs = paragraphs.items.map((p, i) => ({
                text: p.text || '',
                style: p.style || '',
                index: i
            }));
            
            // Detect changes
            const changes = this.incrementalParser.detectChanges(currentParagraphs);
            
            // If too many changes, do full parse
            const changeCount = changes.added.length + changes.modified.length + changes.removed.length;
            if (changeCount > this.paragraphs.length * 0.3) {
                return { success: false, reason: 'too_many_changes' };
            }
            
            // No changes
            if (!changes.hasChanges) {
                this.lastParsed = Date.now();
                this.isDirty = false;
                return { success: true, changes: 0 };
            }
            
            // Apply incremental updates
            await this._applyIncrementalChanges(context, paragraphs.items, changes);
            
            // Update hashes
            this.incrementalParser.updateHashes(currentParagraphs);
            
            // Update state
            this.lastParsed = Date.now();
            this.isDirty = false;
            
            const duration = performance.now() - startTime;
            
            this._emit('parsed', {
                paragraphCount: this.paragraphs.length,
                parseTime: duration,
                mode: 'incremental',
                changedCount: changeCount
            });
            
            return { success: true, changes: changeCount };
        } catch (e) {
            console.warn('[DocumentModel] Incremental parse failed:', e);
            return { success: false, reason: 'error', error: e.message };
        }
    }
    
    /**
     * Apply incremental changes
     * @private
     */
    async _applyIncrementalChanges(context, wordParagraphs, changes) {
        // Handle removed paragraphs (update indices)
        if (changes.removed.length > 0) {
            // Remove from our list
            const removedSet = new Set(changes.removed);
            this.paragraphs = this.paragraphs.filter((_, i) => !removedSet.has(i));
            
            // Reindex
            this.paragraphs.forEach((p, i) => p.index = i);
        }
        
        // Handle added paragraphs
        for (const addedIndex of changes.added) {
            if (addedIndex < wordParagraphs.length) {
                const raw = {
                    text: wordParagraphs[addedIndex].text || '',
                    style: wordParagraphs[addedIndex].style || '',
                    outlineLevel: null
                };
                const parsed = this._parseParagraph(raw, addedIndex);
                
                // Insert at correct position
                this.paragraphs.splice(addedIndex, 0, parsed);
            }
        }
        
        // Handle modified paragraphs
        for (const modIndex of changes.modified) {
            if (modIndex < wordParagraphs.length && modIndex < this.paragraphs.length) {
                const raw = {
                    text: wordParagraphs[modIndex].text || '',
                    style: wordParagraphs[modIndex].style || '',
                    outlineLevel: null
                };
                const parsed = this._parseParagraph(raw, modIndex);
                
                // Preserve stable ID if content is similar
                if (this.paragraphs[modIndex]) {
                    parsed.stableId = this.paragraphs[modIndex].stableId;
                }
                
                this.paragraphs[modIndex] = parsed;
            }
        }
        
        // Rebuild derived data
        this._rebuildDerivedData();
    }
    
    /**
     * Rebuild sections, headings, etc. from paragraphs
     * @private
     */
    _rebuildDerivedData() {
        this.sections = [];
        this.headings = [];
        this.crossReferences = [];
        this.variables = [];
        
        for (const para of this.paragraphs) {
            if (para.isHeading) {
                this.headings.push(para);
            }
            if (para.isNumbered && para.number) {
                this.sections.push(para);
            }
            this._detectCrossReferences(para);
            this._detectVariables(para);
        }
        
        this._buildHierarchy();
        this._validateCrossReferences();
    }
    
    /**
     * Parse a single paragraph
     */
    _parseParagraph(raw, index) {
        const text = (raw.text || '').trim();
        const style = raw.style || '';
        
        // Detect if it's a heading
        const isHeading = this._isHeadingStyle(style) || this._looksLikeHeading(text, style);
        
        // Detect numbering
        const numberMatch = this._extractNumber(text);
        
        // Determine outline level
        let level = 0;
        if (raw.outlineLevel !== undefined && raw.outlineLevel !== null) {
            level = raw.outlineLevel + 1;
        } else if (isHeading) {
            level = this._inferLevelFromStyle(style);
        } else if (numberMatch) {
            level = numberMatch.number.split('.').length;
        }
        
        // Generate stable ID
        const stableId = generateStableId(index, text, numberMatch?.number);
        
        // Compute hash
        const hash = simpleHash(text + style);
        
        return new Paragraph({
            index,
            text,
            style,
            level,
            number: numberMatch?.number || null,
            numberFormat: numberMatch?.format || null,
            isHeading,
            isNumbered: !!numberMatch,
            isEmpty: !text || text.length === 0,
            hash,
            stableId
        });
    }
    
    /**
     * Check if style indicates a heading
     */
    _isHeadingStyle(style) {
        if (!style) return false;
        const lower = style.toLowerCase();
        return lower.includes('heading') || 
               lower.includes('title') ||
               lower.includes('article') ||
               lower.includes('section');
    }
    
    /**
     * Heuristic: does text look like a heading?
     */
    _looksLikeHeading(text, style) {
        if (!text) return false;
        
        const isShort = text.length < 100;
        const noPeriod = !text.endsWith('.');
        const startsWithNumber = /^(\d+\.)+\s+[A-Z]/.test(text) || 
                                  /^(ARTICLE|SECTION|PART)\s+/i.test(text);
        const allCaps = text === text.toUpperCase() && text.length > 3;
        
        return isShort && (startsWithNumber || allCaps) && noPeriod;
    }
    
    /**
     * Infer level from style name
     */
    _inferLevelFromStyle(style) {
        if (!style) return 1;
        const match = style.match(/(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }
    
    /**
     * Extract numbering from text
     */
    _extractNumber(text) {
        if (!text) return null;
        
        const patterns = [
            { regex: /^(ARTICLE|Article)\s+([IVXLCDM]+|\d+)/i, format: 'article' },
            { regex: /^(SECTION|Section)\s+(\d+(?:\.\d+)*)/i, format: 'section' },
            { regex: /^(\d+(?:\.\d+)+)\.?\s/, format: 'decimal' },
            { regex: /^\(([a-z]|[ivxlcdm]+)\)\s/i, format: 'parenthetical' },
            { regex: /^([a-z]|[ivxlcdm]+)\.\s/i, format: 'letter' }
        ];
        
        for (const { regex, format } of patterns) {
            const match = text.match(regex);
            if (match) {
                return {
                    number: match[2] || match[1],
                    format
                };
            }
        }
        
        return null;
    }
    
    /**
     * Detect cross-references in paragraph text
     */
    _detectCrossReferences(paragraph) {
        const text = paragraph.text;
        if (!text) return;
        
        const patterns = [
            /(?:Section|Sections?|[^\w])\s*(\d+(?:\.\d+)*)/gi,
            /(?:Article|Articles?)\s+([IVXLCDM]+|\d+)/gi,
            /(?:paragraph|para\.?)\s*(\d+(?:\.\d+)*)/gi
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                this.crossReferences.push(new CrossReference({
                    text: match[0],
                    target: match[1],
                    paragraphIndex: paragraph.index
                }));
            }
        }
    }
    
    /**
     * Detect template variables in paragraph text
     */
    _detectVariables(paragraph) {
        const text = paragraph.text;
        if (!text) return;
        
        const patterns = [
            /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
            /\[([A-Za-z_][A-Za-z0-9_]*)\]/g,
            /<<([A-Za-z_][A-Za-z0-9_]*)>>/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1];
                
                let variable = this.variables.find(v => v.name === name);
                if (!variable) {
                    variable = new TemplateVariable({ name });
                    this.variables.push(variable);
                }
                
                variable.occurrences.push({
                    paragraphIndex: paragraph.index,
                    position: match.index
                });
            }
        }
    }
    
    /**
     * Build hierarchical parent-child relationships
     */
    _buildHierarchy() {
        this.paragraphs.forEach(p => {
            p.children = [];
            p.parent = null;
        });
        
        const stack = [];
        
        for (const para of this.paragraphs) {
            if (!para.isNumbered && !para.isHeading) continue;
            
            while (stack.length > 0 && stack[stack.length - 1].level >= para.level) {
                stack.pop();
            }
            
            if (stack.length > 0) {
                para.parent = stack[stack.length - 1];
                stack[stack.length - 1].children.push(para);
            }
            
            stack.push(para);
        }
    }
    
    /**
     * Validate all cross-references
     */
    _validateCrossReferences() {
        const validTargets = new Set(
            this.sections.map(s => s.number).filter(Boolean)
        );
        
        for (const ref of this.crossReferences) {
            ref.isValid = validTargets.has(ref.target);
        }
    }
    
    /**
     * Generate document fingerprint
     */
    _generateFingerprint(text) {
        if (!text || text.length === 0) return '0:0:0';
        
        let hash = 0;
        const len = text.length;
        const step = Math.max(1, Math.floor(len / 1000));
        
        for (let i = 0; i < len; i += step) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const first = text.charCodeAt(0) || 0;
        const last = text.charCodeAt(len - 1) || 0;
        
        return `${len}:${hash}:${first}${last}`;
    }
    
    /**
     * Check if cached model is recent enough
     */
    _isRecent(maxAge = 5000) {
        if (!this.lastParsed) return false;
        return (Date.now() - this.lastParsed) < maxAge;
    }
    
    // ========================================================================
    // QUERIES
    // ========================================================================
    
    /**
     * Get all headings for TOC generation
     */
    getHeadings(maxLevel = 4) {
        return this.headings.filter(h => h.level <= maxLevel);
    }
    
    /**
     * Get all numbered sections
     */
    getSections() {
        return this.sections;
    }
    
    /**
     * Find a section by number
     */
    findSection(number) {
        return this.sections.find(s => s.number === number);
    }
    
    /**
     * Find paragraph by stable ID
     */
    findByStableId(stableId) {
        return this.incrementalParser.getByStableId(stableId);
    }
    
    /**
     * Get all cross-references
     */
    getCrossReferences() {
        return this.crossReferences;
    }
    
    /**
     * Get invalid cross-references
     */
    getInvalidCrossReferences() {
        return this.crossReferences.filter(r => !r.isValid);
    }
    
    /**
     * Get all template variables
     */
    getVariables() {
        return this.variables;
    }
    
    /**
     * Get unfilled variables
     */
    getUnfilledVariables() {
        return this.variables.filter(v => !v.value);
    }
    
    /**
     * Get paragraph by index
     */
    getParagraph(index) {
        return this.paragraphs[index];
    }
    
    /**
     * Search paragraphs by text
     */
    searchParagraphs(query) {
        const lower = query.toLowerCase();
        return this.paragraphs.filter(p => 
            p.text.toLowerCase().includes(lower)
        );
    }
    
    /**
     * Get statistics about the document
     */
    getStats() {
        return {
            totalParagraphs: this.paragraphs.length,
            headingCount: this.headings.length,
            sectionCount: this.sections.length,
            crossRefCount: this.crossReferences.length,
            invalidCrossRefCount: this.getInvalidCrossReferences().length,
            variableCount: this.variables.length,
            unfilledVariableCount: this.getUnfilledVariables().length,
            lastParsed: this.lastParsed,
            parseMode: this.parseMode,
            performance: {
                fullParseCount: this.stats.fullParseCount,
                incrementalParseCount: this.stats.incrementalParseCount,
                avgParseTime: this.stats.fullParseCount + this.stats.incrementalParseCount > 0
                    ? this.stats.totalParseTime / (this.stats.fullParseCount + this.stats.incrementalParseCount)
                    : 0
            }
        };
    }
    
    // ========================================================================
    // MUTATIONS
    // ========================================================================
    
    /**
     * Mark model as needing re-parse
     */
    invalidate() {
        this.isDirty = true;
        this._emit('change', { reason: 'invalidated' });
    }
    
    /**
     * Force incremental parse on next call
     */
    requestIncremental() {
        this.isDirty = true;
    }
    
    /**
     * Update a variable value
     */
    setVariableValue(name, value) {
        const variable = this.variables.find(v => v.name === name);
        if (variable) {
            variable.value = value;
            this._emit('change', { reason: 'variable-updated', name, value });
        }
    }
    
    /**
     * Record that a mutation is about to happen
     */
    beforeMutation(description) {
        const snapshot = {
            timestamp: Date.now(),
            description,
            paragraphCount: this.paragraphs.length,
            fingerprint: this.documentFingerprint
        };
        
        this._emit('beforeMutation', snapshot);
        return snapshot;
    }
    
    /**
     * Record that a mutation completed
     */
    afterMutation(snapshot, success = true) {
        this.invalidate();
        this._emit('afterMutation', { snapshot, success });
    }
    
    // ========================================================================
    // EVENT SYSTEM
    // ========================================================================
    
    /**
     * Subscribe to model events
     */
    on(event, callback) {
        if (this._subscribers[event]) {
            this._subscribers[event].push(callback);
        }
        return () => this.off(event, callback);
    }
    
    /**
     * Unsubscribe from model events
     */
    off(event, callback) {
        if (this._subscribers[event]) {
            this._subscribers[event] = this._subscribers[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit an event to subscribers
     */
    _emit(event, data) {
        if (this._subscribers[event]) {
            for (const callback of this._subscribers[event]) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[DocumentModel] Event handler error:`, e);
                }
            }
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const documentModel = new DocumentModel();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the document model (parsing if needed)
 * @param {Word.RequestContext} context
 * @param {Object} options
 */
async function getModel(context, options = {}) {
    await documentModel.parse(context, options);
    return documentModel;
}

/**
 * Get model with incremental parse
 * @param {Word.RequestContext} context
 */
async function getModelIncremental(context) {
    return await getModel(context, { incremental: true });
}

/**
 * Force full re-parse on next access
 */
function invalidateModel() {
    documentModel.invalidate();
}

/**
 * Get model without parsing (returns potentially stale data)
 */
function getModelSync() {
    return documentModel;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.DocForge.DocumentModel = {
    // Classes
    Paragraph,
    CrossReference,
    TemplateVariable,
    DocumentModel,
    IncrementalParser,
    
    // Singleton
    model: documentModel,
    
    // Convenience functions
    getModel,
    getModelIncremental,
    getModelSync,
    invalidateModel,
    
    // Utilities
    simpleHash,
    generateStableId,
    
    // Version
    VERSION: '2.0.0'
};

// Module export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Paragraph,
        CrossReference,
        TemplateVariable,
        DocumentModel,
        IncrementalParser,
        documentModel,
        getModel,
        getModelIncremental,
        getModelSync,
        invalidateModel,
        simpleHash,
        generateStableId
    };
}
