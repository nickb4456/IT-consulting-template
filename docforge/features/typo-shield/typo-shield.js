/**
 * DocForge Typo Shield
 * 
 * Pre-save check that catches common legal document errors.
 * "Catch embarrassing mistakes before they leave your desk."
 * 
 * Checks:
 * - Unclosed parentheses/brackets/quotes
 * - Placeholder text remaining ([INSERT], TBD, XXX, ___, etc.)
 * - Double spaces
 * - Inconsistent spacing around punctuation
 * - Wrong dates (future dates in executed docs, dates > 1 year old)
 * - Missing signature blocks
 * 
 * @version 1.0.0
 */

/* global Word, Office */

// ============================================================================
// Configuration
// ============================================================================

const TYPO_CHECKS = {
    unclosedBrackets: {
        id: 'unclosedBrackets',
        name: 'Unclosed Brackets',
        description: 'Unmatched parentheses, brackets, or quotes',
        severity: 'error',
        enabled: true
    },
    placeholderText: {
        id: 'placeholderText',
        name: 'Placeholder Text',
        description: 'Common placeholders like [INSERT], TBD, XXX, ___',
        severity: 'error',
        enabled: true
    },
    doubleSpaces: {
        id: 'doubleSpaces',
        name: 'Double Spaces',
        description: 'Multiple consecutive spaces',
        severity: 'warning',
        enabled: true
    },
    punctuationSpacing: {
        id: 'punctuationSpacing',
        name: 'Punctuation Spacing',
        description: 'Inconsistent spacing around punctuation',
        severity: 'warning',
        enabled: true
    },
    wrongDates: {
        id: 'wrongDates',
        name: 'Suspicious Dates',
        description: 'Future dates or dates more than 1 year old',
        severity: 'warning',
        enabled: true
    },
    missingSignature: {
        id: 'missingSignature',
        name: 'Missing Signature Block',
        description: 'No signature block detected in document',
        severity: 'warning',
        enabled: true
    }
};

// Placeholder patterns to detect
const PLACEHOLDER_PATTERNS = [
    { pattern: '[INSERT]', regex: false },
    { pattern: '[INSERT NAME]', regex: false },
    { pattern: '[INSERT DATE]', regex: false },
    { pattern: '[INSERT ADDRESS]', regex: false },
    { pattern: '[INSERT AMOUNT]', regex: false },
    { pattern: '[NAME]', regex: false },
    { pattern: '[DATE]', regex: false },
    { pattern: '[ADDRESS]', regex: false },
    { pattern: '[PARTY]', regex: false },
    { pattern: '[COMPANY]', regex: false },
    { pattern: '[AMOUNT]', regex: false },
    { pattern: 'TBD', regex: false },
    { pattern: 'XXX', regex: false },
    { pattern: 'XXXX', regex: false },
    { pattern: '___', regex: false },
    { pattern: '____', regex: false },
    { pattern: '_____', regex: false },
    { pattern: '______', regex: false },
    { pattern: '{{', regex: false },
    { pattern: '}}', regex: false },
    { pattern: '[  ]', regex: false },
    { pattern: '[   ]', regex: false },
    { pattern: 'TODO', regex: false },
    { pattern: 'FIXME', regex: false },
    { pattern: 'NEED TO', regex: false },
    { pattern: '???', regex: false },
    { pattern: '[ ]', regex: false },
    { pattern: '[TBD]', regex: false },
    { pattern: '[BLANK]', regex: false },
    { pattern: '[•]', regex: false }
];

// Signature block indicators
const SIGNATURE_INDICATORS = [
    'Signature:',
    'By:___',
    'By: ___',
    'Signed:',
    'EXECUTED',
    'IN WITNESS WHEREOF',
    'AGREED AND ACCEPTED',
    'Authorized Signature',
    'Name:',
    'Title:',
    'Date:',
    '/s/',
    '(Signature)'
];

// Bracket pairs for matching
const BRACKET_PAIRS = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'"
};

// ============================================================================
// Typo Shield Checker Class
// ============================================================================

class TypoShieldChecker {
    constructor(options = {}) {
        this.checks = { ...TYPO_CHECKS };
        this.customPatterns = options.customPatterns || [];
        this.maxDateAge = options.maxDateAge || 365; // days
        this.results = [];
        this.documentText = '';
        this.paragraphs = [];
    }

    /**
     * Run all enabled checks
     * @returns {Promise<TypoShieldResult>}
     */
    async runAllChecks() {
        this.results = [];
        const startTime = Date.now();

        try {
            // First, load the document text for analysis
            await this.loadDocumentText();

            // Run checks in parallel where possible
            const checkPromises = [];

            if (this.checks.unclosedBrackets.enabled) {
                checkPromises.push(this.checkUnclosedBrackets());
            }
            if (this.checks.placeholderText.enabled) {
                checkPromises.push(this.checkPlaceholderText());
            }
            if (this.checks.doubleSpaces.enabled) {
                checkPromises.push(this.checkDoubleSpaces());
            }
            if (this.checks.punctuationSpacing.enabled) {
                checkPromises.push(this.checkPunctuationSpacing());
            }
            if (this.checks.wrongDates.enabled) {
                checkPromises.push(this.checkWrongDates());
            }
            if (this.checks.missingSignature.enabled) {
                checkPromises.push(this.checkMissingSignature());
            }

            await Promise.all(checkPromises);

        } catch (err) {
            this.results.push({
                checkId: 'system',
                checkName: 'System',
                severity: 'warning',
                message: 'Some checks could not be completed',
                items: []
            });
        }

        const elapsed = Date.now() - startTime;

        return {
            timestamp: new Date().toISOString(),
            elapsed,
            errors: this.results.filter(r => r.severity === 'error').length,
            warnings: this.results.filter(r => r.severity === 'warning').length,
            passed: this.results.filter(r => r.severity === 'pass').length,
            results: this.results,
            overall: this.getOverallStatus(),
            issueCount: this.getTotalIssueCount()
        };
    }

    /**
     * Load document text for analysis
     */
    async loadDocumentText() {
        return Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');

            const paragraphs = body.paragraphs;
            paragraphs.load('items/text');

            await context.sync();

            this.documentText = body.text;
            this.paragraphs = paragraphs.items.map((p, idx) => ({
                index: idx,
                text: p.text
            }));
        });
    }

    /**
     * Check for unclosed brackets/parentheses
     */
    async checkUnclosedBrackets() {
        const issues = [];

        // Check each bracket type
        for (const [open, close] of Object.entries(BRACKET_PAIRS)) {
            // Special handling for quotes (same open/close char)
            if (open === close) {
                const count = (this.documentText.match(new RegExp(this.escapeRegex(open), 'g')) || []).length;
                if (count % 2 !== 0) {
                    issues.push({
                        description: `Unmatched ${this.getBracketName(open)} (found ${count}, expected even number)`,
                        bracket: open,
                        jumpable: true
                    });
                }
            } else {
                const openCount = (this.documentText.match(new RegExp(this.escapeRegex(open), 'g')) || []).length;
                const closeCount = (this.documentText.match(new RegExp(this.escapeRegex(close), 'g')) || []).length;

                if (openCount !== closeCount) {
                    const diff = Math.abs(openCount - closeCount);
                    const missing = openCount > closeCount ? close : open;
                    issues.push({
                        description: `${diff} unclosed ${this.getBracketName(open)} — missing "${missing}"`,
                        bracket: open,
                        openCount,
                        closeCount,
                        jumpable: true
                    });
                }
            }
        }

        // Also check for specific legal bracket patterns
        const legalBracketIssues = this.checkLegalBrackets();
        issues.push(...legalBracketIssues);

        if (issues.length === 0) {
            this.results.push({
                checkId: 'unclosedBrackets',
                checkName: this.checks.unclosedBrackets.name,
                severity: 'pass',
                message: 'All brackets are properly closed',
                items: []
            });
        } else {
            this.results.push({
                checkId: 'unclosedBrackets',
                checkName: this.checks.unclosedBrackets.name,
                severity: 'error',
                message: `${issues.length} bracket issue${issues.length !== 1 ? 's' : ''} found`,
                items: issues
            });
        }
    }

    /**
     * Check for common legal bracket patterns that might be broken
     */
    checkLegalBrackets() {
        const issues = [];

        // Check for incomplete section references like "Section 2(a" without closing
        const sectionPattern = /Section\s+\d+\([a-z]/gi;
        const matches = this.documentText.match(sectionPattern) || [];

        for (const match of matches) {
            // Look ahead for the closing paren
            const idx = this.documentText.indexOf(match);
            const afterMatch = this.documentText.substring(idx, idx + match.length + 10);
            if (!afterMatch.includes(')')) {
                issues.push({
                    description: `Possible unclosed section reference: "${match}..."`,
                    pattern: match,
                    jumpable: true
                });
            }
        }

        return issues;
    }

    /**
     * Check for placeholder text
     */
    async checkPlaceholderText() {
        const foundPlaceholders = [];
        const allPatterns = [...PLACEHOLDER_PATTERNS, ...this.customPatterns.map(p => ({ pattern: p, regex: false }))];

        for (const { pattern } of allPatterns) {
            const regex = new RegExp(this.escapeRegex(pattern), 'gi');
            const matches = this.documentText.match(regex) || [];

            if (matches.length > 0) {
                foundPlaceholders.push({
                    pattern,
                    count: matches.length,
                    description: `"${pattern}" found ${matches.length}x`,
                    jumpable: true
                });
            }
        }

        // Also check for bracket placeholders with any content like [ANYTHING]
        const bracketPlaceholders = this.documentText.match(/\[[A-Z][A-Z\s]+\]/g) || [];
        const uniqueBrackets = [...new Set(bracketPlaceholders)];
        
        for (const bracket of uniqueBrackets) {
            // Skip if already caught by specific patterns
            if (!allPatterns.some(p => p.pattern === bracket)) {
                const count = bracketPlaceholders.filter(b => b === bracket).length;
                foundPlaceholders.push({
                    pattern: bracket,
                    count,
                    description: `"${bracket}" found ${count}x`,
                    jumpable: true
                });
            }
        }

        if (foundPlaceholders.length === 0) {
            this.results.push({
                checkId: 'placeholderText',
                checkName: this.checks.placeholderText.name,
                severity: 'pass',
                message: 'No placeholder text found',
                items: []
            });
        } else {
            const totalCount = foundPlaceholders.reduce((sum, p) => sum + p.count, 0);
            this.results.push({
                checkId: 'placeholderText',
                checkName: this.checks.placeholderText.name,
                severity: 'error',
                message: `${totalCount} placeholder${totalCount !== 1 ? 's' : ''} found`,
                items: foundPlaceholders
            });
        }
    }

    /**
     * Check for double spaces
     */
    async checkDoubleSpaces() {
        // Find double (or more) spaces
        const doubleSpaceMatches = this.documentText.match(/  +/g) || [];

        if (doubleSpaceMatches.length === 0) {
            this.results.push({
                checkId: 'doubleSpaces',
                checkName: this.checks.doubleSpaces.name,
                severity: 'pass',
                message: 'No double spaces found',
                items: []
            });
        } else {
            // Find locations in paragraphs
            const locations = [];
            for (const para of this.paragraphs) {
                const matches = para.text.match(/  +/g) || [];
                if (matches.length > 0) {
                    locations.push({
                        description: `Paragraph ${para.index + 1}: ${matches.length} double space${matches.length !== 1 ? 's' : ''}`,
                        paragraphIndex: para.index,
                        count: matches.length,
                        jumpable: true
                    });
                }
            }

            this.results.push({
                checkId: 'doubleSpaces',
                checkName: this.checks.doubleSpaces.name,
                severity: 'warning',
                message: `${doubleSpaceMatches.length} double space${doubleSpaceMatches.length !== 1 ? 's' : ''} found`,
                items: locations.slice(0, 10), // Limit to first 10
                fixable: true,
                fixDescription: 'Replace all double spaces with single spaces'
            });
        }
    }

    /**
     * Check for inconsistent punctuation spacing
     */
    async checkPunctuationSpacing() {
        const issues = [];

        // Space before comma, period, semicolon, colon (unless in numbers)
        const spaceBeforePunct = this.documentText.match(/\s[,;:](?!\d)/g) || [];
        if (spaceBeforePunct.length > 0) {
            issues.push({
                description: `${spaceBeforePunct.length}x space before punctuation`,
                type: 'spaceBefore',
                count: spaceBeforePunct.length,
                jumpable: true
            });
        }

        // Missing space after comma, period, semicolon (unless end of line or in numbers)
        const noSpaceAfterComma = this.documentText.match(/,[^\s\d\n"')]/g) || [];
        if (noSpaceAfterComma.length > 0) {
            issues.push({
                description: `${noSpaceAfterComma.length}x missing space after comma`,
                type: 'noSpaceAfterComma',
                count: noSpaceAfterComma.length,
                jumpable: true
            });
        }

        const noSpaceAfterPeriod = this.documentText.match(/\.[A-Z]/g) || [];
        if (noSpaceAfterPeriod.length > 0) {
            issues.push({
                description: `${noSpaceAfterPeriod.length}x missing space after period`,
                type: 'noSpaceAfterPeriod',
                count: noSpaceAfterPeriod.length,
                jumpable: true
            });
        }

        // Double punctuation (excluding ellipsis and common patterns)
        const doublePunct = this.documentText.match(/([,;:])\1|\.\.(?!\.)/g) || [];
        if (doublePunct.length > 0) {
            issues.push({
                description: `${doublePunct.length}x repeated punctuation`,
                type: 'doublePunct',
                count: doublePunct.length,
                jumpable: true
            });
        }

        if (issues.length === 0) {
            this.results.push({
                checkId: 'punctuationSpacing',
                checkName: this.checks.punctuationSpacing.name,
                severity: 'pass',
                message: 'Punctuation spacing looks good',
                items: []
            });
        } else {
            const totalCount = issues.reduce((sum, i) => sum + i.count, 0);
            this.results.push({
                checkId: 'punctuationSpacing',
                checkName: this.checks.punctuationSpacing.name,
                severity: 'warning',
                message: `${totalCount} punctuation spacing issue${totalCount !== 1 ? 's' : ''}`,
                items: issues
            });
        }
    }

    /**
     * Check for suspicious dates (future or >1 year old)
     */
    async checkWrongDates() {
        const issues = [];
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Common date patterns
        const datePatterns = [
            // January 15, 2025
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
            // 15 January 2025
            /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
            // 01/15/2025, 1/15/2025
            /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
            // 2025-01-15
            /\b\d{4}-\d{2}-\d{2}\b/g,
            // Jan 15, 2025
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi
        ];

        const foundDates = [];

        for (const pattern of datePatterns) {
            const matches = this.documentText.match(pattern) || [];
            for (const match of matches) {
                const parsed = this.parseDate(match);
                if (parsed) {
                    foundDates.push({
                        text: match,
                        date: parsed
                    });
                }
            }
        }

        // Check for future dates
        const futureDates = foundDates.filter(d => d.date > today);
        if (futureDates.length > 0) {
            issues.push({
                description: `${futureDates.length} future date${futureDates.length !== 1 ? 's' : ''}: ${futureDates.slice(0, 3).map(d => `"${d.text}"`).join(', ')}${futureDates.length > 3 ? '...' : ''}`,
                type: 'future',
                dates: futureDates,
                jumpable: true
            });
        }

        // Check for dates more than 1 year old
        const oldDates = foundDates.filter(d => d.date < oneYearAgo);
        if (oldDates.length > 0) {
            issues.push({
                description: `${oldDates.length} date${oldDates.length !== 1 ? 's' : ''} over 1 year old: ${oldDates.slice(0, 3).map(d => `"${d.text}"`).join(', ')}${oldDates.length > 3 ? '...' : ''}`,
                type: 'old',
                dates: oldDates,
                jumpable: true
            });
        }

        if (issues.length === 0) {
            this.results.push({
                checkId: 'wrongDates',
                checkName: this.checks.wrongDates.name,
                severity: 'pass',
                message: 'All dates appear current',
                items: []
            });
        } else {
            this.results.push({
                checkId: 'wrongDates',
                checkName: this.checks.wrongDates.name,
                severity: 'warning',
                message: `${issues.length} suspicious date issue${issues.length !== 1 ? 's' : ''}`,
                items: issues
            });
        }
    }

    /**
     * Check for missing signature blocks
     */
    async checkMissingSignature() {
        let hasSignatureBlock = false;
        let foundIndicators = [];

        for (const indicator of SIGNATURE_INDICATORS) {
            if (this.documentText.toLowerCase().includes(indicator.toLowerCase())) {
                hasSignatureBlock = true;
                foundIndicators.push(indicator);
            }
        }

        // Also check for signature lines (multiple underscores)
        if (this.documentText.match(/_{10,}/)) {
            hasSignatureBlock = true;
            foundIndicators.push('Signature line (underscores)');
        }

        // Check for /s/ signature format
        if (this.documentText.match(/\/s\/\s*\w/i)) {
            hasSignatureBlock = true;
            foundIndicators.push('/s/ signature');
        }

        if (hasSignatureBlock) {
            this.results.push({
                checkId: 'missingSignature',
                checkName: this.checks.missingSignature.name,
                severity: 'pass',
                message: 'Signature block detected',
                items: [{
                    description: `Found: ${foundIndicators.slice(0, 3).join(', ')}${foundIndicators.length > 3 ? '...' : ''}`,
                    jumpable: false
                }]
            });
        } else {
            // Only warn if document seems formal/legal
            const seemsLegal = this.documentText.toLowerCase().includes('agreement') ||
                this.documentText.toLowerCase().includes('contract') ||
                this.documentText.toLowerCase().includes('hereby') ||
                this.documentText.toLowerCase().includes('whereas');

            if (seemsLegal) {
                this.results.push({
                    checkId: 'missingSignature',
                    checkName: this.checks.missingSignature.name,
                    severity: 'warning',
                    message: 'No signature block detected',
                    items: [{
                        description: 'Document appears to be a legal document but has no signature block',
                        jumpable: false
                    }]
                });
            } else {
                this.results.push({
                    checkId: 'missingSignature',
                    checkName: this.checks.missingSignature.name,
                    severity: 'pass',
                    message: 'N/A (not a formal document)',
                    items: []
                });
            }
        }
    }

    /**
     * Jump to an issue in the document
     * OPTIMIZED: Single sync path, avoid unnecessary syncs
     */
    async jumpToIssue(item) {
        if (!item.jumpable) return false;

        try {
            return await Word.run(async (context) => {
                const body = context.document.body;

                // Determine what to search for
                let searchText = null;

                if (item.pattern) {
                    searchText = item.pattern;
                } else if (item.bracket) {
                    searchText = item.bracket;
                } else if (item.type === 'spaceBefore') {
                    searchText = ' ,';
                } else if (item.type === 'noSpaceAfterComma') {
                    // Can't easily search for this
                    return false;
                } else if (item.dates && item.dates.length > 0) {
                    searchText = item.dates[0].text;
                } else if (item.paragraphIndex !== undefined) {
                    // Jump to paragraph - single sync path
                    const paragraphs = body.paragraphs;
                    paragraphs.load('items');
                    await context.sync();

                    if (paragraphs.items[item.paragraphIndex]) {
                        paragraphs.items[item.paragraphIndex].select('Start');
                        await context.sync();
                        return true;
                    }
                    return false;
                }

                if (searchText) {
                    const results = body.search(searchText, { matchCase: false });
                    results.load('items');
                    await context.sync();

                    if (results.items.length > 0) {
                        results.items[0].select('Select');
                        // Single sync - selection already queued
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
     * Auto-fix double spaces
     */
    async fixDoubleSpaces() {
        try {
            return await Word.run(async (context) => {
                const body = context.document.body;
                let fixCount = 0;

                // Replace double spaces iteratively (handles triple+ spaces)
                for (let i = 0; i < 5; i++) {
                    const results = body.search('  ', { matchCase: false });
                    results.load('items');
                    await context.sync();

                    if (results.items.length === 0) break;

                    for (const item of results.items) {
                        item.insertText(' ', 'Replace');
                        fixCount++;
                    }
                    await context.sync();
                }

                return { fixed: true, count: fixCount };
            });
        } catch (err) {
            return { fixed: false, error: err.message };
        }
    }

    /**
     * Parse date from string
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        const cleaned = dateStr.trim();
        let date = new Date(cleaned);

        if (!isNaN(date.getTime())) {
            return date;
        }

        // Try explicit parsing for common formats
        // MM/DD/YYYY
        const mdyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mdyMatch) {
            date = new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
            if (!isNaN(date.getTime())) return date;
        }

        // YYYY-MM-DD
        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
            if (!isNaN(date.getTime())) return date;
        }

        return null;
    }

    /**
     * Get bracket display name
     */
    getBracketName(bracket) {
        const names = {
            '(': 'parenthesis',
            '[': 'square bracket',
            '{': 'curly brace',
            '"': 'double quote',
            "'": 'single quote'
        };
        return names[bracket] || 'bracket';
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get overall status
     */
    getOverallStatus() {
        const hasErrors = this.results.some(r => r.severity === 'error');
        const hasWarnings = this.results.some(r => r.severity === 'warning');

        if (hasErrors) return 'error';
        if (hasWarnings) return 'warning';
        return 'pass';
    }

    /**
     * Get total issue count
     */
    getTotalIssueCount() {
        return this.results.reduce((count, r) => {
            if (r.severity === 'pass') return count;
            return count + (r.items?.length || 1);
        }, 0);
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
     * Get all check configurations
     */
    getChecksConfig() {
        return { ...this.checks };
    }
}

// ============================================================================
// Save Hook Integration
// ============================================================================

let saveHookInstalled = false;
let lastCheckResult = null;
let onIssuesFoundCallback = null;

/**
 * Install the pre-save hook
 */
function installSaveHook(onIssuesFound) {
    if (saveHookInstalled) return;

    onIssuesFoundCallback = onIssuesFound;

    // Hook into Office.js document saving events
    if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        try {
            // Try to add before-save handler
            Office.context.document.addHandlerAsync(
                Office.EventType.DocumentSelectionChanged,
                () => {
                    // This is a workaround - actual save hook may vary by Office version
                }
            );
        } catch (e) {
            // Save hook not available in this Office version
        }
    }

    saveHookInstalled = true;
}

/**
 * Run check before save (call this from save button handler)
 */
async function checkBeforeSave() {
    const checker = new TypoShieldChecker();
    lastCheckResult = await checker.runAllChecks();

    if (lastCheckResult.issueCount > 0 && onIssuesFoundCallback) {
        onIssuesFoundCallback(lastCheckResult);
        return false; // Indicate issues found
    }

    return true; // Clear to save
}

/**
 * Get last check result
 */
function getLastCheckResult() {
    return lastCheckResult;
}

// ============================================================================
// Export
// ============================================================================

const TypoShield = {
    Checker: TypoShieldChecker,
    TYPO_CHECKS,
    PLACEHOLDER_PATTERNS,
    SIGNATURE_INDICATORS,

    // Hooks
    installSaveHook,
    checkBeforeSave,
    getLastCheckResult,

    // Convenience method for quick check
    async quickCheck(options = {}) {
        const checker = new TypoShieldChecker(options);
        return checker.runAllChecks();
    }
};

// ES modules
export default TypoShield;
export { TypoShieldChecker, TYPO_CHECKS, PLACEHOLDER_PATTERNS, checkBeforeSave };

// Global
if (typeof window !== 'undefined') {
    window.TypoShield = TypoShield;
}

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TypoShield;
}
