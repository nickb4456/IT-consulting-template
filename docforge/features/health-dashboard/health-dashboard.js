/**
 * DocForge Document Health Dashboard - Core Engine
 * 
 * A fitness tracker for your legal documents.
 * Aggregates all quality checks into a single health score.
 * 
 * @version 1.0.0
 */

/* global Word, Office, DocForgePreflight, CrossRefManager */

// ============================================================================
// Health Categories
// ============================================================================

const HEALTH_CATEGORIES = {
    formatting: {
        id: 'formatting',
        name: 'Formatting Consistency',
        description: 'Style consistency, numbering, and visual formatting',
        weight: 15,
        icon: '📐'
    },
    definedTerms: {
        id: 'definedTerms',
        name: 'Defined Terms',
        description: 'Term definitions, usage, and consistency',
        weight: 20,
        icon: '📖'
    },
    crossReferences: {
        id: 'crossReferences',
        name: 'Cross-References',
        description: 'Section and exhibit references',
        weight: 15,
        icon: '🔗'
    },
    partyNames: {
        id: 'partyNames',
        name: 'Party Names',
        description: 'Party name consistency and accuracy',
        weight: 15,
        icon: '👥'
    },
    exhibits: {
        id: 'exhibits',
        name: 'Exhibits',
        description: 'Exhibit references and attachments',
        weight: 10,
        icon: '📎'
    },
    emptyFields: {
        id: 'emptyFields',
        name: 'Empty Fields',
        description: 'Unfilled template fields and blanks',
        weight: 15,
        icon: '📝'
    },
    placeholders: {
        id: 'placeholders',
        name: 'Placeholder Text',
        description: 'TBD, XXX, [INSERT], and similar markers',
        weight: 10,
        icon: '🚧'
    }
};

// Severity thresholds for color coding
const SEVERITY_THRESHOLDS = {
    green: 80,   // 80-100: Good
    yellow: 50,  // 50-79: Needs attention
    red: 0       // 0-49: Critical issues
};

// ============================================================================
// Health Dashboard Class
// ============================================================================

class HealthDashboard {
    constructor(options = {}) {
        this.categories = { ...HEALTH_CATEGORIES };
        this.options = {
            trackHistory: options.trackHistory !== false,
            maxHistoryEntries: options.maxHistoryEntries || 50,
            storageKey: options.storageKey || 'docforge_health_history',
            ...options
        };
        
        this.lastResults = null;
        this.history = [];
        
        // OPTIMIZATION: Cache document text across category checks
        this._cachedDocumentText = null;
        this._cacheTimestamp = 0;
        this._CACHE_TTL = 5000; // 5 seconds
        
        // Load history if available
        this._loadHistory();
    }
    
    /**
     * Get cached document text or load fresh
     * OPTIMIZATION: Avoids reloading document for each category check
     */
    async _getDocumentText() {
        const now = Date.now();
        if (this._cachedDocumentText && (now - this._cacheTimestamp) < this._CACHE_TTL) {
            return this._cachedDocumentText;
        }
        
        await Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();
            this._cachedDocumentText = body.text;
            this._cacheTimestamp = now;
        });
        
        return this._cachedDocumentText;
    }
    
    /**
     * Clear document cache after health check completes
     */
    _clearDocumentCache() {
        this._cachedDocumentText = null;
        this._cacheTimestamp = 0;
    }

    /**
     * Run all health checks and calculate overall score
     * @returns {Promise<HealthReport>}
     */
    async runHealthCheck() {
        const startTime = Date.now();
        const categoryResults = {};
        
        // Run all category checks in parallel
        const checkPromises = [
            this._checkFormatting(),
            this._checkDefinedTerms(),
            this._checkCrossReferences(),
            this._checkPartyNames(),
            this._checkExhibits(),
            this._checkEmptyFields(),
            this._checkPlaceholders()
        ];
        
        const results = await Promise.allSettled(checkPromises);
        
        // Map results to categories
        const categoryIds = Object.keys(this.categories);
        results.forEach((result, idx) => {
            const categoryId = categoryIds[idx];
            if (result.status === 'fulfilled') {
                categoryResults[categoryId] = result.value;
            } else {
                categoryResults[categoryId] = {
                    score: 100,
                    issues: [],
                    error: result.reason?.message || 'Check failed'
                };
            }
        });
        
        // Calculate overall health score
        const overallScore = this._calculateOverallScore(categoryResults);
        
        const report = {
            timestamp: new Date().toISOString(),
            elapsed: Date.now() - startTime,
            overallScore,
            severity: this._getSeverity(overallScore),
            categories: categoryResults,
            summary: this._generateSummary(categoryResults),
            totalIssues: Object.values(categoryResults)
                .reduce((sum, cat) => sum + cat.issues.length, 0)
        };
        
        this.lastResults = report;
        
        // Track history
        if (this.options.trackHistory) {
            this._addToHistory(report);
        }
        
        // MEMORY: Clear document cache after health check completes
        this._clearDocumentCache();
        
        return report;
    }

    /**
     * Get health score for a specific category
     */
    async checkCategory(categoryId) {
        const checkMethod = {
            formatting: this._checkFormatting,
            definedTerms: this._checkDefinedTerms,
            crossReferences: this._checkCrossReferences,
            partyNames: this._checkPartyNames,
            exhibits: this._checkExhibits,
            emptyFields: this._checkEmptyFields,
            placeholders: this._checkPlaceholders
        }[categoryId];
        
        if (!checkMethod) {
            throw new Error(`Unknown category: ${categoryId}`);
        }
        
        return checkMethod.call(this);
    }

    // ========================================================================
    // Category Check Methods
    // ========================================================================

    /**
     * Check formatting consistency
     * OPTIMIZED: Load all font properties upfront, single sync
     */
    async _checkFormatting() {
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const paragraphs = context.document.body.paragraphs;
                // Load all needed properties in one call
                paragraphs.load('items/style,items/font/name,items/font/size,items/leftIndent');
                await context.sync();
                
                const styleUsage = new Map();
                const fontUsage = new Map();
                let inconsistentIndents = 0;
                
                // OPTIMIZED: No sync inside loop - all data already loaded
                for (const para of paragraphs.items) {
                    // Track style usage
                    const style = para.style || 'Normal';
                    styleUsage.set(style, (styleUsage.get(style) || 0) + 1);
                    
                    // Track font usage (already loaded, no sync needed)
                    try {
                        const fontKey = `${para.font.name || 'Unknown'}-${para.font.size || 'Unknown'}`;
                        fontUsage.set(fontKey, (fontUsage.get(fontKey) || 0) + 1);
                    } catch (e) {
                        // Font not accessible
                    }
                }
                
                // Check for too many different styles (potential inconsistency)
                const uniqueStyles = styleUsage.size;
                if (uniqueStyles > 15) {
                    issues.push({
                        severity: 'warning',
                        message: `${uniqueStyles} different paragraph styles detected`,
                        detail: 'Consider consolidating styles for consistency',
                        count: uniqueStyles
                    });
                    score -= 10;
                }
                
                // Check for too many different fonts
                const uniqueFonts = fontUsage.size;
                if (uniqueFonts > 5) {
                    issues.push({
                        severity: 'warning',
                        message: `${uniqueFonts} different font combinations used`,
                        detail: 'Professional documents typically use 1-3 fonts',
                        count: uniqueFonts
                    });
                    score -= 15;
                }
                
                // Check for non-standard body fonts
                const bodyFonts = Array.from(fontUsage.keys());
                const nonStandard = bodyFonts.filter(f => {
                    const lower = f.toLowerCase();
                    return !lower.includes('times') && 
                           !lower.includes('arial') && 
                           !lower.includes('calibri') &&
                           !lower.includes('garamond') &&
                           !lower.includes('century');
                });
                
                if (nonStandard.length > 2) {
                    issues.push({
                        severity: 'info',
                        message: 'Non-standard fonts detected',
                        detail: nonStandard.slice(0, 3).join(', ')
                    });
                }
            });
        } catch (err) {
            // Formatting check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.formatting
            }
        };
    }

    /**
     * Check defined terms
     * Delegates to DefinedTermsScanner if available
     */
    async _checkDefinedTerms() {
        // Try delegation first
        const delegated = await this._tryDelegateDefinedTerms();
        if (delegated) return delegated;
        
        // Fall back to built-in implementation
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const body = context.document.body;
                body.load('text');
                await context.sync();
                
                const text = body.text;
                
                // Find definition patterns: "Term" means, (the "Term"), ("Term")
                const definitionPatterns = [
                    /"([A-Z][A-Za-z\s]+)"\s+means/g,
                    /\(the\s+"([A-Z][A-Za-z\s]+)"\)/g,
                    /\("([A-Z][A-Za-z\s]+)"\)/g,
                    /"([A-Z][A-Za-z\s]+)"\s+shall\s+mean/g
                ];
                
                const definedTerms = new Set();
                for (const pattern of definitionPatterns) {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        definedTerms.add(match[1].trim());
                    }
                }
                
                // Find potential undefined terms (capitalized phrases)
                const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
                const potentialTerms = new Map();
                let match;
                
                while ((match = capitalizedPattern.exec(text)) !== null) {
                    const term = match[1];
                    // Skip common non-terms
                    if (this._isCommonPhrase(term)) continue;
                    potentialTerms.set(term, (potentialTerms.get(term) || 0) + 1);
                }
                
                // Check for undefined terms used multiple times
                const undefinedTerms = [];
                for (const [term, count] of potentialTerms) {
                    if (!definedTerms.has(term) && count >= 3) {
                        undefinedTerms.push({ term, count });
                    }
                }
                
                if (undefinedTerms.length > 0) {
                    const sorted = undefinedTerms.sort((a, b) => b.count - a.count);
                    issues.push({
                        severity: 'warning',
                        message: `${undefinedTerms.length} potentially undefined terms`,
                        detail: sorted.slice(0, 5).map(t => `"${t.term}" (${t.count}x)`).join(', '),
                        items: sorted.slice(0, 10)
                    });
                    score -= Math.min(30, undefinedTerms.length * 5);
                }
                
                // Check for unused defined terms
                const unusedTerms = [];
                for (const term of definedTerms) {
                    const usagePattern = new RegExp(term.replace(/\s+/g, '\\s+'), 'g');
                    const matches = text.match(usagePattern);
                    // Term should appear at least twice (definition + usage)
                    if (!matches || matches.length < 2) {
                        unusedTerms.push(term);
                    }
                }
                
                if (unusedTerms.length > 0) {
                    issues.push({
                        severity: 'info',
                        message: `${unusedTerms.length} defined terms may be unused`,
                        detail: unusedTerms.slice(0, 5).join(', '),
                        items: unusedTerms
                    });
                    score -= Math.min(15, unusedTerms.length * 3);
                }
                
                // Report stats
                if (definedTerms.size > 0) {
                    issues.unshift({
                        severity: 'pass',
                        message: `${definedTerms.size} defined terms found`,
                        detail: 'Document has formal term definitions'
                    });
                }
            });
        } catch (err) {
            // Defined terms check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.definedTerms
            }
        };
    }

    /**
     * Check cross-references
     */
    async _checkCrossReferences() {
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const body = context.document.body;
                body.load('text');
                await context.sync();
                
                const text = body.text;
                
                // Find section references
                const sectionRefs = [];
                const sectionPattern = /Section\s+(\d+(?:\.\d+)*(?:\([a-z]\))?)/gi;
                let match;
                
                while ((match = sectionPattern.exec(text)) !== null) {
                    sectionRefs.push({
                        type: 'section',
                        reference: match[1],
                        fullMatch: match[0]
                    });
                }
                
                // Find article references
                const articlePattern = /Article\s+([IVXLCDM]+|\d+)/gi;
                while ((match = articlePattern.exec(text)) !== null) {
                    sectionRefs.push({
                        type: 'article',
                        reference: match[1],
                        fullMatch: match[0]
                    });
                }
                
                // Find exhibit references
                const exhibitPattern = /Exhibit\s+([A-Z](?:-\d+)?|\d+)/gi;
                while ((match = exhibitPattern.exec(text)) !== null) {
                    sectionRefs.push({
                        type: 'exhibit',
                        reference: match[1],
                        fullMatch: match[0]
                    });
                }
                
                // Find schedule references
                const schedulePattern = /Schedule\s+([A-Z](?:-\d+)?|\d+)/gi;
                while ((match = schedulePattern.exec(text)) !== null) {
                    sectionRefs.push({
                        type: 'schedule',
                        reference: match[1],
                        fullMatch: match[0]
                    });
                }
                
                // Build section heading map
                const headings = new Set();
                const headingPattern = /^(\d+(?:\.\d+)*)\s+[A-Z]/gm;
                while ((match = headingPattern.exec(text)) !== null) {
                    headings.add(match[1]);
                }
                
                // Check for potentially broken section references
                const brokenRefs = sectionRefs.filter(ref => {
                    if (ref.type === 'section') {
                        // Very basic check - section number should exist
                        const baseSection = ref.reference.split('(')[0].split('.')[0];
                        return !headings.has(ref.reference) && 
                               parseInt(baseSection) > headings.size;
                    }
                    return false;
                });
                
                if (brokenRefs.length > 0) {
                    issues.push({
                        severity: 'error',
                        message: `${brokenRefs.length} potentially broken references`,
                        detail: brokenRefs.slice(0, 5).map(r => r.fullMatch).join(', '),
                        items: brokenRefs
                    });
                    score -= Math.min(40, brokenRefs.length * 10);
                }
                
                // Report ref stats
                if (sectionRefs.length > 0) {
                    const byType = {};
                    sectionRefs.forEach(ref => {
                        byType[ref.type] = (byType[ref.type] || 0) + 1;
                    });
                    
                    issues.unshift({
                        severity: 'pass',
                        message: `${sectionRefs.length} cross-references found`,
                        detail: Object.entries(byType)
                            .map(([type, count]) => `${count} ${type}`)
                            .join(', ')
                    });
                }
            });
        } catch (err) {
            // Cross-reference check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.crossReferences
            }
        };
    }

    /**
     * Check party name consistency
     * Delegates to PartyChecker if available
     */
    async _checkPartyNames() {
        // Try delegation first
        const delegated = await this._tryDelegatePartyChecker();
        if (delegated) return delegated;
        
        // Fall back to built-in implementation
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const body = context.document.body;
                body.load('text');
                await context.sync();
                
                const text = body.text;
                
                // Find party definitions pattern:
                // "Name, Inc., a Delaware corporation ("Company")"
                const partyPattern = /([A-Z][A-Za-z\s,\.]+(?:Inc\.|LLC|Corp(?:oration)?|L\.P\.|LP|Ltd\.?))[,\s]+(?:a|an)\s+([A-Za-z]+)\s+(?:corporation|company|limited\s+liability\s+company|partnership)[^(]*\("([^"]+)"\)/gi;
                
                const parties = [];
                let match;
                
                while ((match = partyPattern.exec(text)) !== null) {
                    parties.push({
                        fullName: match[1].trim(),
                        jurisdiction: match[2],
                        shortName: match[3]
                    });
                }
                
                // Check for party name variations
                for (const party of parties) {
                    // Look for variations of the full name
                    const nameParts = party.fullName.split(/[,\s]+/).filter(p => p.length > 2);
                    const variations = [];
                    
                    for (const part of nameParts) {
                        if (part.length < 4) continue;
                        const partPattern = new RegExp(`\\b${part}\\b`, 'gi');
                        const matches = text.match(partPattern);
                        if (matches && matches.length > 0) {
                            // Check for case inconsistencies
                            const uniqueVariations = [...new Set(matches)];
                            if (uniqueVariations.length > 1) {
                                variations.push(...uniqueVariations);
                            }
                        }
                    }
                    
                    if (variations.length > 0) {
                        issues.push({
                            severity: 'warning',
                            message: `Inconsistent variations for "${party.shortName}"`,
                            detail: [...new Set(variations)].slice(0, 4).join(', ')
                        });
                        score -= 10;
                    }
                }
                
                // Check common party term inconsistencies
                const commonTerms = [
                    { variants: ['the Company', 'The Company', 'COMPANY'], name: 'Company' },
                    { variants: ['the Buyer', 'The Buyer', 'BUYER', 'Purchaser'], name: 'Buyer' },
                    { variants: ['the Seller', 'The Seller', 'SELLER', 'Vendor'], name: 'Seller' },
                    { variants: ['the Parties', 'the parties', 'Parties'], name: 'Parties' }
                ];
                
                for (const term of commonTerms) {
                    const found = term.variants.filter(v => text.includes(v));
                    if (found.length > 1) {
                        issues.push({
                            severity: 'warning',
                            message: `Mixed usage of "${term.name}" references`,
                            detail: found.join(', ')
                        });
                        score -= 5;
                    }
                }
                
                if (parties.length > 0) {
                    issues.unshift({
                        severity: 'pass',
                        message: `${parties.length} party definition${parties.length > 1 ? 's' : ''} detected`,
                        detail: parties.map(p => p.shortName).join(', ')
                    });
                }
            });
        } catch (err) {
            // Party names check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.partyNames
            }
        };
    }

    /**
     * Check exhibits
     * Delegates to ExhibitSync if available
     */
    async _checkExhibits() {
        // Try delegation first
        const delegated = await this._tryDelegateExhibitSync();
        if (delegated) return delegated;
        
        // Fall back to built-in implementation
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const body = context.document.body;
                body.load('text');
                await context.sync();
                
                const text = body.text;
                
                // Find exhibit references
                const exhibitRefs = new Map();
                const exhibitRefPattern = /Exhibit\s+([A-Z](?:-\d+)?)/gi;
                let match;
                
                while ((match = exhibitRefPattern.exec(text)) !== null) {
                    const exhibit = match[1].toUpperCase();
                    exhibitRefs.set(exhibit, (exhibitRefs.get(exhibit) || 0) + 1);
                }
                
                // Find exhibit headers (typically on their own line)
                const exhibitHeaders = new Set();
                const exhibitHeaderPattern = /^EXHIBIT\s+([A-Z](?:-\d+)?)\s*$/gmi;
                
                while ((match = exhibitHeaderPattern.exec(text)) !== null) {
                    exhibitHeaders.add(match[1].toUpperCase());
                }
                
                // Check for referenced but missing exhibits
                const missingExhibits = [];
                for (const [exhibit, count] of exhibitRefs) {
                    if (!exhibitHeaders.has(exhibit)) {
                        missingExhibits.push({ exhibit, refCount: count });
                    }
                }
                
                if (missingExhibits.length > 0) {
                    issues.push({
                        severity: 'error',
                        message: `${missingExhibits.length} referenced exhibit${missingExhibits.length > 1 ? 's' : ''} not found`,
                        detail: missingExhibits.map(e => `Exhibit ${e.exhibit}`).join(', '),
                        items: missingExhibits
                    });
                    score -= Math.min(40, missingExhibits.length * 15);
                }
                
                // Check for unreferenced exhibits
                const unreferencedExhibits = [];
                for (const exhibit of exhibitHeaders) {
                    if (!exhibitRefs.has(exhibit) || exhibitRefs.get(exhibit) < 2) {
                        unreferencedExhibits.push(exhibit);
                    }
                }
                
                if (unreferencedExhibits.length > 0) {
                    issues.push({
                        severity: 'warning',
                        message: `${unreferencedExhibits.length} exhibit${unreferencedExhibits.length > 1 ? 's' : ''} may be unreferenced`,
                        detail: unreferencedExhibits.map(e => `Exhibit ${e}`).join(', ')
                    });
                    score -= Math.min(20, unreferencedExhibits.length * 5);
                }
                
                if (exhibitHeaders.size > 0 || exhibitRefs.size > 0) {
                    issues.unshift({
                        severity: 'pass',
                        message: `${exhibitHeaders.size} exhibit${exhibitHeaders.size !== 1 ? 's' : ''} attached, ${exhibitRefs.size} referenced`,
                        detail: exhibitHeaders.size > 0 ? 
                            Array.from(exhibitHeaders).sort().join(', ') : 
                            'No exhibit sections found'
                    });
                }
            });
        } catch (err) {
            // Exhibits check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.exhibits
            }
        };
    }

    /**
     * Check empty fields (integrates with preflight)
     */
    async _checkEmptyFields() {
        const issues = [];
        let score = 100;
        
        try {
            await Word.run(async (context) => {
                const contentControls = context.document.contentControls;
                contentControls.load('items/id,items/tag,items/title,items/text,items/placeholderText');
                await context.sync();
                
                const emptyFields = [];
                const filledFields = [];
                
                for (const cc of contentControls.items) {
                    const isEmpty = !cc.text || 
                        cc.text.trim() === '' || 
                        cc.text === cc.placeholderText ||
                        (cc.text.startsWith('{{') && cc.text.endsWith('}}'));
                    
                    if (isEmpty) {
                        emptyFields.push({
                            id: cc.id,
                            tag: cc.tag,
                            title: cc.title || cc.tag || 'Unnamed field'
                        });
                    } else {
                        filledFields.push(cc.title || cc.tag);
                    }
                }
                
                if (emptyFields.length > 0) {
                    issues.push({
                        severity: 'error',
                        message: `${emptyFields.length} empty field${emptyFields.length > 1 ? 's' : ''} need attention`,
                        detail: emptyFields.slice(0, 5).map(f => f.title).join(', '),
                        items: emptyFields
                    });
                    score -= Math.min(50, emptyFields.length * 10);
                }
                
                const totalFields = emptyFields.length + filledFields.length;
                if (totalFields > 0) {
                    issues.unshift({
                        severity: emptyFields.length === 0 ? 'pass' : 'info',
                        message: `${filledFields.length}/${totalFields} template fields filled`,
                        detail: emptyFields.length === 0 ? 
                            'All fields complete' : 
                            `${emptyFields.length} remaining`
                    });
                }
            });
        } catch (err) {
            // Empty fields check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.emptyFields
            }
        };
    }

    /**
     * Check placeholder text (integrates with Typo Shield)
     * OPTIMIZED: Batch all searches, single sync
     * Delegates to TypoShieldChecker if available
     */
    async _checkPlaceholders() {
        // Try delegation first
        const delegated = await this._tryDelegateTypoShield();
        if (delegated) return delegated;
        
        // Fall back to built-in implementation
        const issues = [];
        let score = 100;
        
        const PLACEHOLDER_PATTERNS = [
            '[INSERT]', '[insert]', '[INSERT NAME]', '[INSERT DATE]',
            '[INSERT ADDRESS]', '[NAME]', '[DATE]', '[ADDRESS]',
            '[AMOUNT]', '[PARTY]', 'TBD', 'XXX', 'XXXX', '____',
            '{{', '}}', '[  ]', '[   ]', 'NEED TO', 'TODO', 'FIXME', '???'
        ];
        
        try {
            await Word.run(async (context) => {
                const body = context.document.body;
                const foundPlaceholders = [];
                
                // BATCH: Create all searches first
                const searches = PLACEHOLDER_PATTERNS.map(pattern => ({
                    pattern,
                    results: body.search(pattern, {
                        matchCase: false,
                        matchWholeWord: false
                    })
                }));
                
                // Load all results at once
                searches.forEach(s => s.results.load('items/text'));
                
                // Single sync for all searches
                try {
                    await context.sync();
                    
                    // Process all results
                    for (const { pattern, results } of searches) {
                        for (const item of results.items) {
                            foundPlaceholders.push({
                                pattern,
                                text: item.text
                            });
                        }
                    }
                } catch (e) {
                    // Search failed, continue
                }
                
                if (foundPlaceholders.length > 0) {
                    // Group by pattern
                    const byPattern = {};
                    foundPlaceholders.forEach(p => {
                        byPattern[p.pattern] = (byPattern[p.pattern] || 0) + 1;
                    });
                    
                    issues.push({
                        severity: 'error',
                        message: `${foundPlaceholders.length} placeholder${foundPlaceholders.length > 1 ? 's' : ''} found`,
                        detail: Object.entries(byPattern)
                            .slice(0, 5)
                            .map(([p, c]) => `"${p}" (${c}x)`)
                            .join(', '),
                        items: Object.entries(byPattern).map(([pattern, count]) => ({
                            pattern,
                            count
                        }))
                    });
                    score -= Math.min(60, foundPlaceholders.length * 8);
                } else {
                    issues.push({
                        severity: 'pass',
                        message: 'No placeholder text found',
                        detail: 'Document is free of common placeholders'
                    });
                }
            });
        } catch (err) {
            // Placeholder check failed - continue with partial results
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details: {
                category: this.categories.placeholders
            }
        };
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Calculate weighted overall score
     */
    _calculateOverallScore(categoryResults) {
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const [categoryId, result] of Object.entries(categoryResults)) {
            const category = this.categories[categoryId];
            if (category) {
                totalWeight += category.weight;
                weightedSum += result.score * category.weight;
            }
        }
        
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;
    }

    /**
     * Get severity level from score
     */
    _getSeverity(score) {
        if (score >= SEVERITY_THRESHOLDS.green) return 'green';
        if (score >= SEVERITY_THRESHOLDS.yellow) return 'yellow';
        return 'red';
    }

    /**
     * Generate summary text
     */
    _generateSummary(categoryResults) {
        const criticalIssues = [];
        const warnings = [];
        
        for (const [categoryId, result] of Object.entries(categoryResults)) {
            const category = this.categories[categoryId];
            for (const issue of result.issues) {
                if (issue.severity === 'error') {
                    criticalIssues.push({
                        category: category.name,
                        message: issue.message
                    });
                } else if (issue.severity === 'warning') {
                    warnings.push({
                        category: category.name,
                        message: issue.message
                    });
                }
            }
        }
        
        return {
            criticalIssues,
            warnings,
            topPriority: criticalIssues[0] || warnings[0] || null
        };
    }

    /**
     * Check if phrase is a common non-defined-term
     */
    _isCommonPhrase(phrase) {
        const common = [
            'United States', 'New York', 'State of', 'County of',
            'Dear Sir', 'Dear Madam', 'Very Truly', 'Sincerely Yours',
            'District Court', 'Supreme Court', 'Circuit Court',
            'First Amendment', 'Second Amendment', 'Due Process',
            'Section Number', 'Article Number', 'Business Day',
            'Business Days', 'Calendar Days', 'Working Days'
        ];
        return common.some(c => phrase.includes(c) || c.includes(phrase));
    }

    // ========================================================================
    // History Tracking
    // ========================================================================

    _loadHistory() {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.options.storageKey);
                if (stored) {
                    this.history = JSON.parse(stored);
                }
            }
        } catch (e) {
            console.warn('Could not load health history:', e);
            this.history = [];
        }
    }

    _addToHistory(report) {
        this.history.push({
            timestamp: report.timestamp,
            score: report.overallScore,
            severity: report.severity,
            totalIssues: report.totalIssues,
            categoryScores: Object.fromEntries(
                Object.entries(report.categories).map(([id, result]) => [id, result.score])
            )
        });
        
        // Trim to max entries
        while (this.history.length > this.options.maxHistoryEntries) {
            this.history.shift();
        }
        
        // Save
        this._saveHistory();
    }

    _saveHistory() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.options.storageKey, JSON.stringify(this.history));
            }
        } catch (e) {
            console.warn('Could not save health history:', e);
        }
    }

    /**
     * Get health history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Get trend data for charts
     */
    getHistoryTrend(limit = 10) {
        const recent = this.history.slice(-limit);
        return {
            timestamps: recent.map(h => h.timestamp),
            scores: recent.map(h => h.score),
            trend: this._calculateTrend(recent.map(h => h.score))
        };
    }

    _calculateTrend(scores) {
        if (scores.length < 2) return 'stable';
        const recent = scores.slice(-3);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const first = scores[0];
        
        if (avg > first + 5) return 'improving';
        if (avg < first - 5) return 'declining';
        return 'stable';
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this._saveHistory();
    }
}

// ============================================================================
// Module Integration Helpers
// These methods delegate to actual checker modules when available
// ============================================================================

/**
 * Try to use dedicated DefinedTermsScanner if available
 * Falls back to built-in check otherwise
 * @private
 */
HealthDashboard.prototype._tryDelegateDefinedTerms = async function() {
    if (typeof window !== 'undefined' && window.definedTermsScanner) {
        try {
            const scanner = window.definedTermsScanner;
            await scanner.initialize();
            const result = await scanner.scan();
            
            return this._mapDefinedTermsResult(result);
        } catch (e) {
            console.warn('HealthDashboard: DefinedTermsScanner delegation failed, using built-in', e);
        }
    }
    return null; // Signal to use built-in
};

/**
 * Map DefinedTermsScanner result to Health Dashboard format
 * @private
 */
HealthDashboard.prototype._mapDefinedTermsResult = function(scanResult) {
    const issues = [];
    let score = 100;
    
    // Map undefined terms
    if (scanResult.undefinedTerms && scanResult.undefinedTerms.length > 0) {
        issues.push({
            severity: 'warning',
            message: `${scanResult.undefinedTerms.length} potentially undefined terms`,
            detail: scanResult.undefinedTerms.slice(0, 5).map(t => `"${t.term}"`).join(', '),
            items: scanResult.undefinedTerms.slice(0, 10)
        });
        score -= Math.min(30, scanResult.undefinedTerms.length * 5);
    }
    
    // Map unused terms
    if (scanResult.unusedTerms && scanResult.unusedTerms.length > 0) {
        issues.push({
            severity: 'info',
            message: `${scanResult.unusedTerms.length} defined terms may be unused`,
            detail: scanResult.unusedTerms.slice(0, 5).map(t => t.term).join(', '),
            items: scanResult.unusedTerms
        });
        score -= Math.min(15, scanResult.unusedTerms.length * 3);
    }
    
    // Map capitalization issues
    if (scanResult.capitalizationIssues && scanResult.capitalizationIssues.length > 0) {
        issues.push({
            severity: 'warning',
            message: `${scanResult.capitalizationIssues.length} capitalization inconsistencies`,
            detail: scanResult.capitalizationIssues.slice(0, 3)
                .map(i => `"${i.usage.text}" should be "${i.term.term}"`)
                .join(', ')
        });
        score -= Math.min(20, scanResult.capitalizationIssues.length * 4);
    }
    
    // Add pass message for defined terms
    const definedCount = scanResult.definedTerms ? scanResult.definedTerms.size : 0;
    if (definedCount > 0) {
        issues.unshift({
            severity: 'pass',
            message: `${definedCount} defined terms found`,
            detail: 'Document has formal term definitions'
        });
    }
    
    return {
        score: Math.max(0, score),
        issues,
        details: {
            category: this.categories.definedTerms,
            source: 'definedTermsScanner'
        }
    };
};

/**
 * Try to use TypoShieldChecker for placeholder check if available
 * @private
 */
HealthDashboard.prototype._tryDelegateTypoShield = async function() {
    if (typeof window !== 'undefined' && window.TypoShieldChecker) {
        try {
            const checker = new window.TypoShieldChecker();
            await checker.loadDocumentText();
            await checker.checkPlaceholderText();
            
            const placeholderResult = checker.results.find(r => r.checkId === 'placeholderText');
            if (placeholderResult) {
                return this._mapTypoShieldResult(placeholderResult);
            }
        } catch (e) {
            console.warn('HealthDashboard: TypoShieldChecker delegation failed, using built-in', e);
        }
    }
    return null;
};

/**
 * Map TypoShield result to Health Dashboard format
 * @private
 */
HealthDashboard.prototype._mapTypoShieldResult = function(typoResult) {
    const issues = [];
    let score = 100;
    
    if (typoResult.severity === 'pass') {
        issues.push({
            severity: 'pass',
            message: typoResult.message,
            detail: 'Document is free of common placeholders'
        });
    } else {
        issues.push({
            severity: typoResult.severity,
            message: typoResult.message,
            detail: typoResult.items.slice(0, 5)
                .map(i => `"${i.description || i.pattern}"`)
                .join(', '),
            items: typoResult.items
        });
        score -= Math.min(60, typoResult.items.length * 8);
    }
    
    return {
        score: Math.max(0, score),
        issues,
        details: {
            category: this.categories.placeholders,
            source: 'typoShieldChecker'
        }
    };
};

/**
 * Try to use PartyChecker if available
 * @private
 */
HealthDashboard.prototype._tryDelegatePartyChecker = async function() {
    if (typeof window !== 'undefined' && window.DocForgePartyChecker) {
        try {
            const result = await window.DocForgePartyChecker.scanDocument();
            return this._mapPartyCheckerResult(result);
        } catch (e) {
            console.warn('HealthDashboard: PartyChecker delegation failed, using built-in', e);
        }
    }
    return null;
};

/**
 * Map PartyChecker result to Health Dashboard format
 * @private
 */
HealthDashboard.prototype._mapPartyCheckerResult = function(partyResult) {
    const issues = [];
    let score = 100;
    
    // Map party issues
    if (partyResult.issues && partyResult.issues.length > 0) {
        const errorIssues = partyResult.issues.filter(i => i.severity === 'error');
        const warningIssues = partyResult.issues.filter(i => i.severity === 'warning');
        
        if (errorIssues.length > 0) {
            issues.push({
                severity: 'error',
                message: `${errorIssues.length} party name error${errorIssues.length > 1 ? 's' : ''}`,
                detail: errorIssues.slice(0, 3).map(i => i.text).join(', '),
                items: errorIssues
            });
            score -= Math.min(30, errorIssues.length * 10);
        }
        
        if (warningIssues.length > 0) {
            issues.push({
                severity: 'warning',
                message: `${warningIssues.length} party name inconsistenc${warningIssues.length > 1 ? 'ies' : 'y'}`,
                detail: warningIssues.slice(0, 3).map(i => i.suggestion || i.text).join(', '),
                items: warningIssues
            });
            score -= Math.min(20, warningIssues.length * 5);
        }
    }
    
    // Add pass message for parties found
    if (partyResult.parties && partyResult.parties.length > 0) {
        issues.unshift({
            severity: 'pass',
            message: `${partyResult.parties.length} party definition${partyResult.parties.length > 1 ? 's' : ''} detected`,
            detail: partyResult.parties.map(p => p.shortForm).join(', ')
        });
    }
    
    return {
        score: Math.max(0, score),
        issues,
        details: {
            category: this.categories.partyNames,
            source: 'partyChecker'
        }
    };
};

/**
 * Try to use ExhibitSync if available
 * @private
 */
HealthDashboard.prototype._tryDelegateExhibitSync = async function() {
    if (typeof window !== 'undefined' && window.ExhibitSync) {
        try {
            const result = await window.ExhibitSync.fullScan();
            return this._mapExhibitSyncResult(result);
        } catch (e) {
            console.warn('HealthDashboard: ExhibitSync delegation failed, using built-in', e);
        }
    }
    return null;
};

/**
 * Map ExhibitSync result to Health Dashboard format
 * @private
 */
HealthDashboard.prototype._mapExhibitSyncResult = function(exhibitResult) {
    const issues = [];
    let score = 100;
    
    // Map exhibit issues
    if (exhibitResult.issues && exhibitResult.issues.length > 0) {
        const missing = exhibitResult.issues.filter(i => i.type === 'missing');
        const unreferenced = exhibitResult.issues.filter(i => i.type === 'unreferenced');
        
        if (missing.length > 0) {
            issues.push({
                severity: 'error',
                message: `${missing.length} referenced exhibit${missing.length > 1 ? 's' : ''} not found`,
                detail: missing.map(m => m.displayName).join(', '),
                items: missing
            });
            score -= Math.min(40, missing.length * 15);
        }
        
        if (unreferenced.length > 0) {
            issues.push({
                severity: 'warning',
                message: `${unreferenced.length} exhibit${unreferenced.length > 1 ? 's' : ''} may be unreferenced`,
                detail: unreferenced.map(u => u.displayName).join(', ')
            });
            score -= Math.min(20, unreferenced.length * 5);
        }
    }
    
    // Add pass message
    const defCount = exhibitResult.definitions ? exhibitResult.definitions.length : 0;
    const refCount = exhibitResult.references ? exhibitResult.references.length : 0;
    
    if (defCount > 0 || refCount > 0) {
        issues.unshift({
            severity: 'pass',
            message: `${defCount} exhibit${defCount !== 1 ? 's' : ''} attached, ${refCount} referenced`,
            detail: defCount > 0 ? 
                exhibitResult.definitions.map(d => d.displayName).join(', ') : 
                'No exhibit sections found'
        });
    }
    
    return {
        score: Math.max(0, score),
        issues,
        details: {
            category: this.categories.exhibits,
            source: 'exhibitSync'
        }
    };
};

// ============================================================================
// Export
// ============================================================================

const DocForgeHealthDashboard = {
    Dashboard: HealthDashboard,
    CATEGORIES: HEALTH_CATEGORIES,
    THRESHOLDS: SEVERITY_THRESHOLDS,
    
    // Quick check method
    async quickCheck() {
        const dashboard = new HealthDashboard();
        return dashboard.runHealthCheck();
    }
};

// ES modules
export default DocForgeHealthDashboard;
export { HealthDashboard, HEALTH_CATEGORIES, SEVERITY_THRESHOLDS };

// Global
if (typeof window !== 'undefined') {
    window.DocForgeHealthDashboard = DocForgeHealthDashboard;
}

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocForgeHealthDashboard;
}
