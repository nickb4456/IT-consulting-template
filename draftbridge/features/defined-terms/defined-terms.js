/**
 * Defined Terms Guardian - Core Scanner and Validator
 * 
 * Tracks and validates defined terms in legal documents.
 * Scans for definitions, builds an index, and identifies issues.
 * 
 * @version 1.0.0
 */

// ============================================================================
// Types & Constants
// ============================================================================

/**
 * @typedef {Object} DefinedTerm
 * @property {string} id - Unique identifier
 * @property {string} term - The defined term (e.g., "Client")
 * @property {string} normalizedTerm - Lowercase version for matching
 * @property {number} definitionStart - Character offset of definition
 * @property {number} definitionEnd - Character offset of definition end
 * @property {string} definitionContext - Surrounding text for context
 * @property {string} definitionType - How it was defined ('quoted', 'parenthetical', 'means')
 * @property {Array<TermUsage>} usages - Where the term is used
 */

/**
 * @typedef {Object} TermUsage
 * @property {number} start - Character offset
 * @property {number} end - Character offset
 * @property {string} text - Actual text found
 * @property {boolean} beforeDefinition - True if usage appears before definition
 * @property {boolean} capitalizationMismatch - True if capitalization differs
 */

/**
 * @typedef {Object} UndefinedTerm
 * @property {string} term - The term text
 * @property {string} normalizedTerm - Lowercase version
 * @property {Array<{start: number, end: number, text: string}>} occurrences
 */

/**
 * @typedef {Object} ScanResult
 * @property {Map<string, DefinedTerm>} definedTerms - Index of defined terms
 * @property {Array<UndefinedTerm>} undefinedTerms - Potentially undefined terms
 * @property {Array<DefinedTerm>} unusedTerms - Defined but never used
 * @property {Array<{term: DefinedTerm, usage: TermUsage}>} capitalizationIssues
 * @property {Array<{term: DefinedTerm, usage: TermUsage}>} usedBeforeDefinition
 * @property {number} scanTime - Time taken to scan (ms)
 */

// Patterns for finding defined terms
const DEFINITION_PATTERNS = {
    // "Term" means... or "Term" shall mean...
    quotedMeans: /"([A-Z][A-Za-z\s]+?)"\s+(?:means|shall mean|refers to|shall refer to)/gi,
    
    // (the "Term") or (a "Term") or ("Term")
    parenthetical: /\((?:the\s+|a\s+|an\s+)?[""]([A-Z][A-Za-z\s]+?)[""]\)/gi,
    
    // (hereinafter "Term") or (hereinafter referred to as "Term")
    hereinafter: /\(hereinafter(?:\s+referred\s+to\s+as)?\s+[""]([A-Z][A-Za-z\s]+?)[""]\)/gi,
    
    // As used herein, "Term" means
    asUsed: /[Aa]s\s+used\s+(?:herein|in\s+this\s+\w+),?\s+[""]([A-Z][A-Za-z\s]+?)[""]/gi,
    
    // "Term" is defined as or "Term" has the meaning
    definedAs: /[""]([A-Z][A-Za-z\s]+?)[""]\s+(?:is\s+defined\s+as|has\s+the\s+meaning)/gi,
    
    // Term (the "Short Form")
    shortForm: /([A-Z][A-Za-z\s,\.]+?)\s+\((?:the\s+|a\s+)?[""]([A-Z][A-Za-z]+?)[""]\)/gi
};

// Common legal terms that are often capitalized but not defined
const COMMON_LEGAL_TERMS = new Set([
    'agreement', 'party', 'parties', 'section', 'article', 'exhibit',
    'schedule', 'whereas', 'therefore', 'provided', 'herein', 'hereof',
    'thereof', 'hereby', 'hereto', 'thereto', 'hereunder', 'thereunder',
    'notwithstanding', 'pursuant', 'including', 'shall', 'may', 'will',
    'must', 'company', 'corporation', 'llc', 'inc', 'ltd', 'state', 'date'
]);

// Words that start sentences and shouldn't be flagged
const SENTENCE_STARTERS = new Set([
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'such', 'any',
    'all', 'each', 'every', 'no', 'neither', 'either', 'both', 'if',
    'when', 'where', 'while', 'although', 'unless', 'until', 'after',
    'before', 'because', 'since', 'however', 'moreover', 'furthermore',
    'therefore', 'accordingly', 'notwithstanding', 'provided', 'except'
]);

// ============================================================================
// DefinedTermsScanner Class
// ============================================================================

/**
 * Scanner and validator for defined terms in legal documents
 */
class DefinedTermsScanner {
    constructor() {
        /** @type {Map<string, DefinedTerm>} */
        this.definedTerms = new Map();
        
        /** @type {string} */
        this.documentText = '';
        
        /** @type {ScanResult|null} */
        this.lastScanResult = null;
        
        /** @type {boolean} */
        this.initialized = false;
    }

    /**
     * Initialize the scanner
     */
    /**
     * Initialize the scanner
     */
    async initialize() {
        if (this.initialized) return;
        this.initialized = true;
    }

    /**
     * Generate unique ID for a term
     */
    generateId() {
        return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Normalize a term for comparison
     * @param {string} term 
     * @returns {string}
     */
    normalizeTerm(term) {
        return term.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    /**
     * Check if a word is likely a proper noun or defined term
     * @param {string} word 
     * @param {number} position - Position in document
     * @returns {boolean}
     */
    isLikelyDefinedTerm(word, position) {
        // Must start with capital
        if (!/^[A-Z]/.test(word)) return false;
        
        // Skip common legal terms (unless they're in the middle of a sentence)
        if (COMMON_LEGAL_TERMS.has(word.toLowerCase())) return false;
        
        // Skip sentence starters at beginning of document or after sentence end
        const beforeText = this.documentText.substring(Math.max(0, position - 5), position).trim();
        if (beforeText === '' || /[.!?:]\s*$/.test(beforeText)) {
            if (SENTENCE_STARTERS.has(word.toLowerCase())) return false;
        }
        
        // Multi-word capitalized phrases are more likely to be defined
        if (/^[A-Z][a-z]+\s+[A-Z]/.test(word)) return true;
        
        // Single capitalized words in the middle of a sentence are likely defined
        if (/[a-z]\s+$/.test(beforeText)) return true;
        
        return true;
    }

    /**
     * Extract context around a position
     * @param {number} start 
     * @param {number} end 
     * @param {number} contextChars 
     * @returns {string}
     */
    getContext(start, end, contextChars = 100) {
        const contextStart = Math.max(0, start - contextChars);
        const contextEnd = Math.min(this.documentText.length, end + contextChars);
        
        let context = this.documentText.substring(contextStart, contextEnd);
        
        if (contextStart > 0) context = '...' + context;
        if (contextEnd < this.documentText.length) context = context + '...';
        
        return context;
    }

    /**
     * Scan document for defined terms
     * @returns {Promise<ScanResult>}
     */
    async scan() {
        const startTime = Date.now();
        
        // Clear previous results
        this.definedTerms.clear();
        
        await Word.run(async (context) => {
            // Get the full document body
            const body = context.document.body;
            body.load('text');
            await context.sync();
            
            this.documentText = body.text;
        });
        
        // Find all definitions
        this.findDefinitions();
        
        // Find all usages
        this.findUsages();
        
        // Identify undefined terms
        const undefinedTerms = this.findUndefinedTerms();
        
        // Identify unused terms
        const unusedTerms = this.findUnusedTerms();
        
        // Identify capitalization issues
        const capitalizationIssues = this.findCapitalizationIssues();
        
        // Identify terms used before definition
        const usedBeforeDefinition = this.findUsedBeforeDefinition();
        
        this.lastScanResult = {
            definedTerms: this.definedTerms,
            undefinedTerms,
            unusedTerms,
            capitalizationIssues,
            usedBeforeDefinition,
            scanTime: Date.now() - startTime
        };
        
        // MEMORY OPTIMIZATION: Clear document text after processing
        // It can be large (megabytes for long documents) and we've extracted what we need
        this.documentText = '';
        
        return this.lastScanResult;
    }

    /**
     * Find all term definitions in the document
     */
    findDefinitions() {
        const text = this.documentText;
        
        // Process each pattern type
        for (const [patternName, pattern] of Object.entries(DEFINITION_PATTERNS)) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                // Handle shortForm pattern which has two capture groups
                const term = patternName === 'shortForm' ? match[2] : match[1];
                const normalizedTerm = this.normalizeTerm(term);
                
                // Skip if already defined (first definition wins)
                if (this.definedTerms.has(normalizedTerm)) continue;
                
                const definedTerm = {
                    id: this.generateId(),
                    term: term.trim(),
                    normalizedTerm,
                    definitionStart: match.index,
                    definitionEnd: match.index + match[0].length,
                    definitionContext: this.getContext(match.index, match.index + match[0].length, 50),
                    definitionType: this.mapPatternToType(patternName),
                    usages: []
                };
                
                this.definedTerms.set(normalizedTerm, definedTerm);
            }
        }
    }

    /**
     * Map pattern name to user-friendly type
     * @param {string} patternName 
     * @returns {string}
     */
    mapPatternToType(patternName) {
        const typeMap = {
            quotedMeans: 'means',
            parenthetical: 'parenthetical',
            hereinafter: 'hereinafter',
            asUsed: 'as-used',
            definedAs: 'defined-as',
            shortForm: 'short-form'
        };
        return typeMap[patternName] || 'unknown';
    }

    /**
     * Find all usages of defined terms
     */
    findUsages() {
        const text = this.documentText;
        
        for (const [normalizedTerm, definedTerm] of this.definedTerms) {
            // Create a pattern that matches the term with possible variations
            // Match whole words only
            const termWords = definedTerm.term.split(/\s+/);
            const escapedTerm = termWords.map(w => 
                w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            ).join('\\s+');
            
            const pattern = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                // Skip the definition itself
                if (match.index >= definedTerm.definitionStart - 5 && 
                    match.index <= definedTerm.definitionEnd + 5) {
                    continue;
                }
                
                const usage = {
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    beforeDefinition: match.index < definedTerm.definitionStart,
                    capitalizationMismatch: match[0] !== definedTerm.term && 
                        match[0].toLowerCase() === definedTerm.term.toLowerCase()
                };
                
                definedTerm.usages.push(usage);
            }
        }
    }

    /**
     * Find terms that appear to be defined terms but have no definition
     * @returns {Array<UndefinedTerm>}
     */
    findUndefinedTerms() {
        const text = this.documentText;
        const undefined = new Map();
        
        // Pattern for capitalized terms (possibly multi-word)
        // Match: "the Term" or "Term" or "Multi Word Term"
        const capitalizedPattern = /\b((?:the\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
        let match;
        
        while ((match = capitalizedPattern.exec(text)) !== null) {
            let term = match[1];
            
            // Remove leading "the " if present
            if (term.toLowerCase().startsWith('the ')) {
                term = term.substring(4);
            }
            
            const normalizedTerm = this.normalizeTerm(term);
            
            // Skip if it's a defined term
            if (this.definedTerms.has(normalizedTerm)) continue;
            
            // Skip common legal terms
            if (COMMON_LEGAL_TERMS.has(normalizedTerm)) continue;
            
            // Skip short single words (likely just proper capitalization)
            if (term.length < 4 && !term.includes(' ')) continue;
            
            // Skip sentence starters
            const beforeText = text.substring(Math.max(0, match.index - 3), match.index);
            if (/[.!?:]\s*$/.test(beforeText) || match.index === 0) {
                if (SENTENCE_STARTERS.has(normalizedTerm)) continue;
            }
            
            // Add to undefined map
            if (!undefined.has(normalizedTerm)) {
                undefined.set(normalizedTerm, {
                    term,
                    normalizedTerm,
                    occurrences: []
                });
            }
            
            undefined.get(normalizedTerm).occurrences.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }
        
        // Only return terms that appear multiple times (more likely to be actual defined terms)
        return Array.from(undefined.values())
            .filter(t => t.occurrences.length >= 2)
            .sort((a, b) => b.occurrences.length - a.occurrences.length);
    }

    /**
     * Find defined terms that are never used
     * @returns {Array<DefinedTerm>}
     */
    findUnusedTerms() {
        return Array.from(this.definedTerms.values())
            .filter(term => term.usages.length === 0);
    }

    /**
     * Find usages with capitalization mismatches
     * @returns {Array<{term: DefinedTerm, usage: TermUsage}>}
     */
    findCapitalizationIssues() {
        const issues = [];
        
        for (const term of this.definedTerms.values()) {
            for (const usage of term.usages) {
                if (usage.capitalizationMismatch) {
                    issues.push({ term, usage });
                }
            }
        }
        
        return issues;
    }

    /**
     * Find terms used before they are defined
     * @returns {Array<{term: DefinedTerm, usage: TermUsage}>}
     */
    findUsedBeforeDefinition() {
        const issues = [];
        
        for (const term of this.definedTerms.values()) {
            for (const usage of term.usages) {
                if (usage.beforeDefinition) {
                    issues.push({ term, usage });
                }
            }
        }
        
        return issues;
    }

    /**
     * Navigate to a term's definition in the document
     * @param {string} termId 
     */
    /**
     * Navigate to a term's definition in the document
     * @param {string} termId - The term ID to navigate to
     * @returns {Promise<boolean>} True if navigation succeeded
     */
    async navigateToDefinition(termId) {
        const term = Array.from(this.definedTerms.values())
            .find(t => t.id === termId);
        
        if (!term) {
            return false;
        }
        
        await this.navigateToPosition(term.definitionStart, term.definitionEnd);
        return true;
    }

    /**
     * Navigate to a specific usage of a term
     * @param {string} termId - The term ID
     * @param {number} usageIndex - Index of the usage to navigate to
     * @returns {Promise<boolean>} True if navigation succeeded
     */
    async navigateToUsage(termId, usageIndex) {
        const term = Array.from(this.definedTerms.values())
            .find(t => t.id === termId);
        
        if (!term || !term.usages[usageIndex]) {
            return false;
        }
        
        const usage = term.usages[usageIndex];
        await this.navigateToPosition(usage.start, usage.end);
        return true;
    }

    /**
     * Navigate to a position and select it
     * @param {number} start 
     * @param {number} end 
     */
    async navigateToPosition(start, end) {
        await Word.run(async (context) => {
            const body = context.document.body;
            
            // Create a search range for the text at that position
            const textToFind = this.documentText.substring(start, end);
            
            // Search for the text
            const searchResults = body.search(textToFind, {
                matchCase: true,
                matchWholeWord: false
            });
            
            searchResults.load('items');
            await context.sync();
            
            if (searchResults.items.length > 0) {
                // Find the match closest to our expected position
                // For now, just use the first match
                const range = searchResults.items[0];
                range.select();
                await context.sync();
            }
        });
    }

    /**
     * Highlight all instances of a term
     * @param {string} termId 
     * @param {string} color - Highlight color
     */
    async highlightTerm(termId, color = 'yellow') {
        const term = Array.from(this.definedTerms.values())
            .find(t => t.id === termId);
        
        if (!term) return;
        
        await Word.run(async (context) => {
            const body = context.document.body;
            const searchResults = body.search(term.term, {
                matchCase: false,
                matchWholeWord: true
            });
            
            searchResults.load('items');
            await context.sync();
            
            for (const range of searchResults.items) {
                range.font.highlightColor = color;
            }
            
            await context.sync();
        });
    }

    /**
     * Clear all highlights from this module
     * Uses HighlightCoordinator when available to only clear our layer
     */
    async clearHighlights() {
        // Try to use HighlightCoordinator for layer-specific clearing
        if (typeof window !== 'undefined' && window.HighlightCoordinator) {
            return window.HighlightCoordinator.clearLayer('defined-terms');
        }
        
        // Fall back to clearing all highlights (legacy behavior)
        await Word.run(async (context) => {
            const body = context.document.body;
            body.font.highlightColor = null;
            await context.sync();
        });
    }

    /**
     * Highlight all issues (undefined, unused, capitalization)
     * OPTIMIZED: Batch all searches, single sync for highlights
     * Uses HighlightCoordinator when available to prevent conflicts
     * @param {Object} options
     */
    async highlightIssues(options = {}) {
        const {
            undefinedColor = 'Yellow',
            unusedColor = 'LightGray',
            capitalizationColor = 'DarkYellow',
            beforeDefinitionColor = 'Turquoise',
            useCoordinator = true // Use HighlightCoordinator if available
        } = options;
        
        if (!this.lastScanResult) {
            await this.scan();
        }
        
        // Try to use HighlightCoordinator for conflict-free highlighting
        if (useCoordinator && typeof window !== 'undefined' && window.HighlightCoordinator) {
            const items = [];
            
            // Undefined terms
            for (const undefinedTerm of this.lastScanResult.undefinedTerms) {
                items.push({
                    searchText: undefinedTerm.term,
                    issueType: 'undefined'
                });
            }
            
            // Unused terms
            for (const unusedTerm of this.lastScanResult.unusedTerms) {
                items.push({
                    searchText: unusedTerm.term,
                    issueType: 'unused'
                });
            }
            
            // Capitalization issues
            for (const issue of this.lastScanResult.capitalizationIssues) {
                items.push({
                    searchText: issue.usage.text,
                    issueType: 'capitalization'
                });
            }
            
            return window.HighlightCoordinator.highlight('defined-terms', items, {
                clearPrevious: true
            });
        }
        
        // Fall back to direct highlighting
        await Word.run(async (context) => {
            const body = context.document.body;
            
            // BATCH: Create all searches first
            const allSearches = [];
            
            // Undefined terms
            for (const undefinedTerm of this.lastScanResult.undefinedTerms) {
                allSearches.push({
                    results: body.search(undefinedTerm.term, { matchCase: true, matchWholeWord: true }),
                    color: undefinedColor,
                    type: 'undefined'
                });
            }
            
            // Unused terms
            for (const unusedTerm of this.lastScanResult.unusedTerms) {
                allSearches.push({
                    results: body.search(unusedTerm.term, { matchCase: true, matchWholeWord: true }),
                    color: unusedColor,
                    type: 'unused'
                });
            }
            
            // Capitalization issues
            for (const issue of this.lastScanResult.capitalizationIssues) {
                allSearches.push({
                    results: body.search(issue.usage.text, { matchCase: true, matchWholeWord: true }),
                    color: capitalizationColor,
                    type: 'capitalization'
                });
            }
            
            // Load all search results at once
            allSearches.forEach(s => s.results.load('items'));
            await context.sync();
            
            // Apply all highlights (no sync in loop!)
            for (const search of allSearches) {
                const items = search.type === 'unused' 
                    ? search.results.items.slice(0, 1)  // Only first for unused
                    : search.results.items;
                    
                for (const range of items) {
                    range.font.highlightColor = search.color;
                }
            }
            
            // Single sync for all highlight changes
            await context.sync();
        });
    }

    /**
     * Get summary statistics
     * @returns {Object}
     */
    getStats() {
        if (!this.lastScanResult) {
            return {
                defined: 0,
                undefined: 0,
                unused: 0,
                capitalizationIssues: 0,
                usedBeforeDefinition: 0,
                totalUsages: 0
            };
        }
        
        let totalUsages = 0;
        for (const term of this.definedTerms.values()) {
            totalUsages += term.usages.length;
        }
        
        return {
            defined: this.definedTerms.size,
            undefined: this.lastScanResult.undefinedTerms.length,
            unused: this.lastScanResult.unusedTerms.length,
            capitalizationIssues: this.lastScanResult.capitalizationIssues.length,
            usedBeforeDefinition: this.lastScanResult.usedBeforeDefinition.length,
            totalUsages
        };
    }

    /**
     * Get all defined terms as array
     * @returns {Array<DefinedTerm>}
     */
    getAllTerms() {
        return Array.from(this.definedTerms.values())
            .sort((a, b) => a.term.localeCompare(b.term));
    }

    /**
     * Get last scan result
     * @returns {ScanResult|null}
     */
    getLastScanResult() {
        return this.lastScanResult;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

const definedTermsScanner = new DefinedTermsScanner();

// ES modules
export default definedTermsScanner;
export { DefinedTermsScanner, definedTermsScanner };

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DefinedTermsScanner, definedTermsScanner };
}

// Global
if (typeof window !== 'undefined') {
    window.DefinedTermsScanner = DefinedTermsScanner;
    window.definedTermsScanner = definedTermsScanner;
}
