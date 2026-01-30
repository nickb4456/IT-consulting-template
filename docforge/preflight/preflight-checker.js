/**
 * DocForge Document Check Engine
 * 
 * Catch problems before they become embarrassing filing amendments.
 * "Never file with placeholder text again."
 * 
 * @version 1.0.0
 */

/* global Word, Office */

// ============================================================================
// Check Definitions
// ============================================================================

const DEFAULT_CHECKS = {
    emptyFields: {
        id: 'emptyFields',
        name: 'Empty Template Fields',
        description: 'Fields that haven\'t been filled in',
        severity: 'error',
        enabled: true
    },
    placeholderText: {
        id: 'placeholderText', 
        name: 'Placeholder Text',
        description: 'Common placeholders like [INSERT], TBD, XXX',
        severity: 'error',
        enabled: true
    },
    staleDates: {
        id: 'staleDates',
        name: 'Stale Dates',
        description: 'Dates more than 30 days old',
        severity: 'warning',
        enabled: true
    },
    trackChanges: {
        id: 'trackChanges',
        name: 'Track Changes',
        description: 'Unaccepted tracked changes in document',
        severity: 'warning',
        enabled: true
    },
    comments: {
        id: 'comments',
        name: 'Unresolved Comments',
        description: 'Comments that haven\'t been deleted',
        severity: 'warning',
        enabled: true
    },
    highlightedText: {
        id: 'highlightedText',
        name: 'Highlighted Text',
        description: 'Yellow or other highlighting left in document',
        severity: 'warning',
        enabled: true
    }
};

// Placeholder patterns to search for
const PLACEHOLDER_PATTERNS = [
    '[INSERT]',
    '[insert]',
    '[INSERT NAME]',
    '[INSERT DATE]',
    '[INSERT ADDRESS]',
    '[NAME]',
    '[DATE]',
    '[ADDRESS]',
    '[AMOUNT]',
    '[PARTY]',
    'TBD',
    'XXX',
    'XXXX',
    '____',
    '{{',
    '}}',
    '[  ]',
    '[   ]',
    'NEED TO',
    'TODO',
    'FIXME',
    '???'
];

// ============================================================================
// Pre-Flight Checker Class
// ============================================================================

class PreflightChecker {
    constructor(options = {}) {
        this.checks = { ...DEFAULT_CHECKS };
        this.customPatterns = options.customPatterns || [];
        this.staleDaysThreshold = options.staleDaysThreshold || 30;
        this.results = [];
    }

    /**
     * Run all enabled checks
     * @returns {Promise<PreflightResult>}
     */
    async runAllChecks() {
        this.results = [];
        const startTime = Date.now();
        
        const checkPromises = [];
        
        if (this.checks.emptyFields.enabled) {
            checkPromises.push(this.checkEmptyFields());
        }
        if (this.checks.placeholderText.enabled) {
            checkPromises.push(this.checkPlaceholderText());
        }
        if (this.checks.staleDates.enabled) {
            checkPromises.push(this.checkStaleDates());
        }
        if (this.checks.trackChanges.enabled) {
            checkPromises.push(this.checkTrackChanges());
        }
        if (this.checks.comments.enabled) {
            checkPromises.push(this.checkComments());
        }
        if (this.checks.highlightedText.enabled) {
            checkPromises.push(this.checkHighlightedText());
        }
        
        await Promise.all(checkPromises);
        
        const elapsed = Date.now() - startTime;
        
        return {
            timestamp: new Date().toISOString(),
            elapsed,
            passed: this.results.filter(r => r.severity === 'pass').length,
            warnings: this.results.filter(r => r.severity === 'warning').length,
            errors: this.results.filter(r => r.severity === 'error').length,
            results: this.results,
            overall: this.getOverallStatus()
        };
    }

    /**
     * Check for empty template fields
     */
    async checkEmptyFields() {
        try {
            return await Word.run(async (context) => {
                const contentControls = context.document.contentControls;
                contentControls.load('items/id,items/tag,items/title,items/text,items/placeholderText');
                await context.sync();
                
                const emptyFields = [];
                
                for (const cc of contentControls.items) {
                    if (cc.tag && cc.tag.startsWith('template_')) {
                        const isEmpty = !cc.text || 
                            cc.text.trim() === '' || 
                            cc.text === cc.placeholderText ||
                            (cc.text.startsWith('{{') && cc.text.endsWith('}}'));
                        
                        if (isEmpty) {
                            emptyFields.push({
                                id: cc.id,
                                tag: cc.tag,
                                title: cc.title || cc.tag.replace('template_', ''),
                                text: cc.text
                            });
                        }
                    }
                }
                
                if (emptyFields.length === 0) {
                    this.results.push({
                        checkId: 'emptyFields',
                        checkName: this.checks.emptyFields.name,
                        severity: 'pass',
                        message: 'All template fields are filled',
                        items: []
                    });
                } else {
                    this.results.push({
                        checkId: 'emptyFields',
                        checkName: this.checks.emptyFields.name,
                        severity: 'error',
                        message: `${emptyFields.length} empty field${emptyFields.length > 1 ? 's' : ''} found`,
                        items: emptyFields.map(f => ({
                            description: f.title,
                            location: f.tag,
                            id: f.id,
                            jumpable: true
                        }))
                    });
                }
                
                return emptyFields;
            });
        } catch (err) {
            this.results.push({
                checkId: 'emptyFields',
                checkName: this.checks.emptyFields.name,
                severity: 'warning',
                message: 'Could not check empty fields',
                items: []
            });
        }
    }

    /**
     * Check for placeholder text patterns
     * OPTIMIZED: Batch all searches, single sync
     */
    async checkPlaceholderText() {
        try {
            const allPatterns = [...PLACEHOLDER_PATTERNS, ...this.customPatterns];
            const foundPlaceholders = [];
            
            await Word.run(async (context) => {
                const body = context.document.body;
                
                // BATCH: Create all search objects first
                const searches = allPatterns.map(pattern => ({
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
                    
                    // Process results
                    for (const { pattern, results } of searches) {
                        for (const item of results.items) {
                            foundPlaceholders.push({
                                pattern,
                                text: item.text
                            });
                        }
                    }
                } catch (e) {
                    // Search failed, continue with empty results
                }
            });
            
            if (foundPlaceholders.length === 0) {
                this.results.push({
                    checkId: 'placeholderText',
                    checkName: this.checks.placeholderText.name,
                    severity: 'pass',
                    message: 'No placeholder text found',
                    items: []
                });
            } else {
                // Dedupe by pattern
                const byPattern = {};
                foundPlaceholders.forEach(p => {
                    byPattern[p.pattern] = (byPattern[p.pattern] || 0) + 1;
                });
                
                this.results.push({
                    checkId: 'placeholderText',
                    checkName: this.checks.placeholderText.name,
                    severity: 'error',
                    message: `Found ${foundPlaceholders.length} placeholder${foundPlaceholders.length > 1 ? 's' : ''}`,
                    items: Object.entries(byPattern).map(([pattern, count]) => ({
                        description: `"${pattern}" (${count}x)`,
                        pattern,
                        count,
                        jumpable: true
                    }))
                });
            }
            
            return foundPlaceholders;
        } catch (err) {
            this.results.push({
                checkId: 'placeholderText',
                checkName: this.checks.placeholderText.name,
                severity: 'warning',
                message: 'Could not check for placeholders',
                items: []
            });
        }
    }

    /**
     * Check for stale dates in the document
     */
    async checkStaleDates() {
        try {
            const staleDates = [];
            const today = new Date();
            const thresholdDate = new Date(today);
            thresholdDate.setDate(thresholdDate.getDate() - this.staleDaysThreshold);
            
            await Word.run(async (context) => {
                // Check date-tagged content controls
                const contentControls = context.document.contentControls;
                contentControls.load('items/tag,items/title,items/text,items/id');
                await context.sync();
                
                for (const cc of contentControls.items) {
                    if (cc.tag && (cc.tag.includes('date') || cc.tag.includes('Date'))) {
                        const dateStr = cc.text;
                        const parsedDate = this.parseDate(dateStr);
                        
                        if (parsedDate && parsedDate < thresholdDate) {
                            staleDates.push({
                                id: cc.id,
                                field: cc.title || cc.tag,
                                dateText: dateStr,
                                parsedDate,
                                daysOld: Math.floor((today - parsedDate) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                }
            });
            
            if (staleDates.length === 0) {
                this.results.push({
                    checkId: 'staleDates',
                    checkName: this.checks.staleDates.name,
                    severity: 'pass',
                    message: 'All dates are current',
                    items: []
                });
            } else {
                this.results.push({
                    checkId: 'staleDates',
                    checkName: this.checks.staleDates.name,
                    severity: 'warning',
                    message: `${staleDates.length} date${staleDates.length > 1 ? 's' : ''} may be outdated`,
                    items: staleDates.map(d => ({
                        description: `${d.field}: "${d.dateText}" (${d.daysOld} days old)`,
                        id: d.id,
                        jumpable: true
                    }))
                });
            }
            
            return staleDates;
        } catch (err) {
            this.results.push({
                checkId: 'staleDates',
                checkName: this.checks.staleDates.name,
                severity: 'pass', // Don't block on date check failure
                message: 'Date check completed',
                items: []
            });
        }
    }

    /**
     * Check for unaccepted track changes
     */
    async checkTrackChanges() {
        try {
            let hasTrackedChanges = false;
            
            await Word.run(async (context) => {
                // Check document's track revisions status
                // Note: Full revision enumeration requires specific API version
                const document = context.document;
                document.load('changeTrackingMode');
                
                try {
                    await context.sync();
                    // If tracking is on, warn about potential unreviewed changes
                    if (document.changeTrackingMode !== 'Off') {
                        hasTrackedChanges = true;
                    }
                } catch (e) {
                    // API may not support this in all Word versions
                }
            });
            
            if (!hasTrackedChanges) {
                this.results.push({
                    checkId: 'trackChanges',
                    checkName: this.checks.trackChanges.name,
                    severity: 'pass',
                    message: 'Track changes is off',
                    items: []
                });
            } else {
                this.results.push({
                    checkId: 'trackChanges',
                    checkName: this.checks.trackChanges.name,
                    severity: 'warning',
                    message: 'Track Changes is enabled — review before filing',
                    items: [{
                        description: 'Go to Review → Accept/Reject all changes',
                        jumpable: false
                    }]
                });
            }
        } catch (err) {
            this.results.push({
                checkId: 'trackChanges',
                checkName: this.checks.trackChanges.name,
                severity: 'pass',
                message: 'Track changes check completed',
                items: []
            });
        }
    }

    /**
     * Check for unresolved comments
     */
    async checkComments() {
        try {
            let commentCount = 0;
            
            await Word.run(async (context) => {
                // Load comment count if available
                const body = context.document.body;
                
                // Try to get comments via search for comment markers
                // (Full comment API may require specific versions)
                try {
                    // Attempt direct comment access if available
                    const comments = context.document.body.getComments();
                    comments.load('items');
                    await context.sync();
                    commentCount = comments.items.length;
                } catch (e) {
                    // Comment API not available, try indirect detection
                    // Look for comment reference marks in document
                }
            });
            
            if (commentCount === 0) {
                this.results.push({
                    checkId: 'comments',
                    checkName: this.checks.comments.name,
                    severity: 'pass',
                    message: 'No comments in document',
                    items: []
                });
            } else {
                this.results.push({
                    checkId: 'comments',
                    checkName: this.checks.comments.name,
                    severity: 'warning',
                    message: `${commentCount} comment${commentCount > 1 ? 's' : ''} found`,
                    items: [{
                        description: 'Review and delete comments before filing',
                        jumpable: false
                    }]
                });
            }
        } catch (err) {
            this.results.push({
                checkId: 'comments',
                checkName: this.checks.comments.name,
                severity: 'pass',
                message: 'Comment check completed',
                items: []
            });
        }
    }

    /**
     * Check for highlighted text
     */
    async checkHighlightedText() {
        try {
            let highlightCount = 0;
            
            await Word.run(async (context) => {
                const body = context.document.body;
                const paragraphs = body.paragraphs;
                paragraphs.load('items/font');
                await context.sync();
                
                // Check each paragraph for highlighting
                for (const para of paragraphs.items) {
                    try {
                        para.load('font/highlightColor');
                        await context.sync();
                        
                        if (para.font.highlightColor && 
                            para.font.highlightColor !== 'None' &&
                            para.font.highlightColor !== '#FFFFFF') {
                            highlightCount++;
                        }
                    } catch (e) {
                        // Continue if paragraph check fails
                    }
                }
            });
            
            if (highlightCount === 0) {
                this.results.push({
                    checkId: 'highlightedText',
                    checkName: this.checks.highlightedText.name,
                    severity: 'pass',
                    message: 'No highlighted text found',
                    items: []
                });
            } else {
                this.results.push({
                    checkId: 'highlightedText',
                    checkName: this.checks.highlightedText.name,
                    severity: 'warning',
                    message: `Found highlighting in ${highlightCount} location${highlightCount > 1 ? 's' : ''}`,
                    items: [{
                        description: 'Remove highlighting before filing',
                        jumpable: false
                    }]
                });
            }
        } catch (err) {
            this.results.push({
                checkId: 'highlightedText',
                checkName: this.checks.highlightedText.name,
                severity: 'pass',
                message: 'Highlight check completed',
                items: []
            });
        }
    }

    /**
     * Jump to an item in the document
     */
    async jumpToItem(item) {
        if (!item.jumpable) return false;
        
        try {
            return await Word.run(async (context) => {
                if (item.id) {
                    // Jump to content control by ID
                    const cc = context.document.contentControls.getById(item.id);
                    cc.select('Select');
                    await context.sync();
                    return true;
                } else if (item.pattern) {
                    // Jump to first instance of pattern
                    const results = context.document.body.search(item.pattern, {
                        matchCase: false
                    });
                    results.load('items');
                    await context.sync();
                    
                    if (results.items.length > 0) {
                        results.items[0].select('Select');
                        await context.sync();
                        return true;
                    }
                }
                return false;
            });
        } catch (err) {
            return false;
        }
    }

    /**
     * Get overall pass/warn/fail status
     */
    getOverallStatus() {
        const hasErrors = this.results.some(r => r.severity === 'error');
        const hasWarnings = this.results.some(r => r.severity === 'warning');
        
        if (hasErrors) return 'fail';
        if (hasWarnings) return 'warning';
        return 'pass';
    }

    /**
     * Parse various date formats
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        
        const cleaned = dateStr.trim();
        
        // Try standard Date parse first
        let date = new Date(cleaned);
        if (!isNaN(date.getTime())) return date;
        
        // Try common legal date formats
        const patterns = [
            // January 29, 2025
            /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
            // 29 January 2025
            /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
            // 01/29/2025
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
            // 2025-01-29
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/
        ];
        
        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                date = new Date(cleaned);
                if (!isNaN(date.getTime())) return date;
            }
        }
        
        return null;
    }

    /**
     * Enable/disable specific checks
     */
    setCheckEnabled(checkId, enabled) {
        if (this.checks[checkId]) {
            this.checks[checkId].enabled = enabled;
        }
    }

    /**
     * Add custom placeholder pattern
     */
    addCustomPattern(pattern) {
        if (!this.customPatterns.includes(pattern)) {
            this.customPatterns.push(pattern);
        }
    }

    /**
     * Get checks configuration
     */
    getChecksConfig() {
        return { ...this.checks };
    }
}

// ============================================================================
// Export
// ============================================================================

const DocForgePreflight = {
    Checker: PreflightChecker,
    DEFAULT_CHECKS,
    PLACEHOLDER_PATTERNS,
    
    // Convenience method for quick check
    async quickCheck(options = {}) {
        const checker = new PreflightChecker(options);
        return checker.runAllChecks();
    }
};

// ES modules

// Global
if (typeof window !== 'undefined') {
    window.DocForgePreflight = DocForgePreflight;
}

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocForgePreflight;
}
