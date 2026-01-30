/**
 * DraftBridge Party Name Consistency Checker
 * 
 * Detects party definitions and tracks usage throughout the document.
 * Warns on inconsistent usage, undefined references, and typos.
 * 
 * @version 1.0.0
 */

const DraftBridgePartyChecker = (function() {
    'use strict';

    // =========================================================================
    // Patterns for detecting party definitions
    // =========================================================================

    // Main definition pattern: "ABC Corp, a Delaware corporation (the "Company")"
    const DEFINITION_PATTERNS = [
        // Standard: "Full Name, a [jurisdiction] [entity type] (the "ShortName")"
        /([A-Z][A-Za-z0-9\s,\.&'-]+?),\s*(?:a|an)\s+([A-Za-z\s]+?)\s+(?:corporation|company|limited liability company|LLC|partnership|LP|LLP|trust|association|entity)\s*\(\s*(?:the\s+)?[""]([A-Za-z0-9\s]+)[""]\s*\)/gi,
        
        // Simpler: "Full Name (the "ShortName")" or "Full Name ("ShortName")"
        /([A-Z][A-Za-z0-9\s,\.&'-]{2,50})\s*\(\s*(?:the\s+)?[""]([A-Za-z0-9\s]+)[""]\s*\)/gi,
        
        // Hereinafter: "Full Name, hereinafter referred to as "ShortName""
        /([A-Z][A-Za-z0-9\s,\.&'-]+?),?\s*(?:hereinafter|hereafter)\s+(?:referred to as|called)\s*[""]([A-Za-z0-9\s]+)[""]/gi,
        
        // Collectively pattern: "X and Y (collectively, the "Parties")"
        /([A-Za-z0-9\s]+)\s+and\s+([A-Za-z0-9\s]+)\s*\(\s*collectively,?\s*(?:the\s+)?[""]([A-Za-z0-9\s]+)[""]\s*\)/gi,
        
        // Role-based: "ABC Corp, as Seller" or "ABC Corp (the "Seller")"
        /([A-Z][A-Za-z0-9\s,\.&'-]+?),?\s*as\s+(Buyer|Seller|Purchaser|Vendor|Licensor|Licensee|Landlord|Tenant|Lender|Borrower|Debtor|Creditor|Guarantor|Agent|Trustee)/gi
    ];

    // Common legal short forms we should recognize
    const COMMON_SHORT_FORMS = [
        'Company', 'Buyer', 'Seller', 'Purchaser', 'Vendor',
        'Licensor', 'Licensee', 'Landlord', 'Tenant', 'Lender',
        'Borrower', 'Debtor', 'Creditor', 'Guarantor', 'Agent',
        'Trustee', 'Parties', 'Party', 'Employer', 'Employee',
        'Client', 'Contractor', 'Consultant', 'Supplier', 'Customer',
        'Investor', 'Shareholder', 'Partner', 'Member', 'Manager'
    ];

    // Entity type keywords for context detection
    const ENTITY_TYPES = [
        'corporation', 'company', 'limited liability company', 'LLC', 'L.L.C.',
        'partnership', 'limited partnership', 'LP', 'L.P.', 'LLP', 'L.L.P.',
        'trust', 'association', 'entity', 'Inc.', 'Inc', 'Incorporated',
        'Corp.', 'Corp', 'Co.', 'Ltd.', 'Limited', 'P.C.', 'PLLC'
    ];

    // =========================================================================
    // Party Registry - Core data structure
    // =========================================================================

    let partyRegistry = {
        parties: [],      // Array of Party objects
        usages: [],       // Array of Usage objects
        issues: [],       // Array of Issue objects
        lastScan: null
    };

    /**
     * Party object structure
     */
    function createParty(id, fullName, shortForm, jurisdiction, entityType, definitionLocation) {
        return {
            id: id,
            fullName: fullName.trim(),
            shortForm: shortForm.trim(),
            jurisdiction: jurisdiction || null,
            entityType: entityType || null,
            definitionLocation: definitionLocation,  // { paragraph, offset }
            aliases: [],         // Other acceptable names
            usageCount: 0,
            variations: []       // Detected variations of this party's name
        };
    }

    /**
     * Usage object - tracks where a party name appears
     */
    function createUsage(partyId, text, location, confidence) {
        return {
            partyId: partyId,
            text: text,
            location: location,  // { paragraph, offset }
            confidence: confidence,  // 0-1
            isDefinition: false,
            hasIssue: false
        };
    }

    /**
     * Issue object - tracks problems found
     */
    function createIssue(type, partyId, text, location, suggestion, severity) {
        return {
            id: 'issue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type,           // 'undefined', 'inconsistent', 'typo', 'duplicate'
            partyId: partyId,
            text: text,
            location: location,
            suggestion: suggestion,
            severity: severity,   // 'error', 'warning', 'info'
            resolved: false
        };
    }

    // =========================================================================
    // Scanning & Detection
    // =========================================================================

    /**
     * Main scan function - analyzes entire document
     */
    async function scanDocument() {
        return Word.run(async (context) => {
            // Reset registry
            partyRegistry = {
                parties: [],
                usages: [],
                issues: [],
                lastScan: new Date().toISOString()
            };

            // Load all paragraphs
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items/text');
            await context.sync();

            const fullText = paragraphs.items.map(p => p.text).join('\n');
            const paragraphTexts = paragraphs.items.map((p, idx) => ({
                index: idx,
                text: p.text
            }));

            // Step 1: Detect party definitions
            detectPartyDefinitions(paragraphTexts);

            // Step 2: Scan for all party name usages
            scanPartyUsages(paragraphTexts);

            // Step 3: Find issues
            detectIssues(paragraphTexts);

            // Step 4: Calculate statistics
            partyRegistry.parties.forEach(party => {
                party.usageCount = partyRegistry.usages.filter(u => u.partyId === party.id).length;
            });

            return {
                parties: partyRegistry.parties,
                usages: partyRegistry.usages,
                issues: partyRegistry.issues,
                summary: generateSummary()
            };
        });
    }

    /**
     * Detect party definitions from document text
     */
    function detectPartyDefinitions(paragraphTexts) {
        let partyId = 0;

        paragraphTexts.forEach((para, paraIdx) => {
            const text = para.text;
            
            // Skip very short paragraphs
            if (text.length < 20) return;

            // Try each definition pattern
            DEFINITION_PATTERNS.forEach((pattern, patternIdx) => {
                // Reset lastIndex for global patterns
                pattern.lastIndex = 0;
                
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    let fullName, shortForm, jurisdiction, entityType;

                    if (patternIdx === 0) {
                        // Full pattern with jurisdiction and entity type
                        fullName = match[1];
                        jurisdiction = match[2];
                        shortForm = match[3];
                    } else if (patternIdx === 3) {
                        // Collectively pattern - creates a group party
                        fullName = match[1] + ' and ' + match[2];
                        shortForm = match[3];
                    } else if (patternIdx === 4) {
                        // Role-based pattern
                        fullName = match[1];
                        shortForm = match[2];
                    } else {
                        // Simpler patterns
                        fullName = match[1];
                        shortForm = match[2];
                    }

                    // Avoid duplicates
                    const exists = partyRegistry.parties.some(p => 
                        p.shortForm.toLowerCase() === shortForm.toLowerCase() ||
                        p.fullName.toLowerCase() === fullName.toLowerCase()
                    );

                    if (!exists && shortForm && fullName) {
                        const party = createParty(
                            'party_' + (++partyId),
                            fullName,
                            shortForm,
                            jurisdiction,
                            entityType,
                            { paragraph: paraIdx, offset: match.index }
                        );

                        // Generate common aliases
                        party.aliases = generateAliases(fullName, shortForm);
                        partyRegistry.parties.push(party);
                    }
                }
            });
        });

        return partyRegistry.parties;
    }

    /**
     * Generate common aliases for a party
     */
    function generateAliases(fullName, shortForm) {
        const aliases = new Set();
        
        // Add the short form variations
        aliases.add(shortForm);
        aliases.add('the ' + shortForm);
        
        // Extract company name parts
        const words = fullName.split(/[\s,]+/).filter(w => w.length > 1);
        
        // First word if it's capitalized (usually company name)
        if (words[0] && /^[A-Z]/.test(words[0])) {
            aliases.add(words[0]);
        }

        // Common abbreviations (e.g., "ABC Corp" -> "ABC")
        const corpIndex = words.findIndex(w => 
            /^(Corp|Inc|LLC|Ltd|Co|Company|Corporation)\.?$/i.test(w)
        );
        if (corpIndex > 0) {
            aliases.add(words.slice(0, corpIndex).join(' '));
        }

        // Initials for multi-word names
        if (words.length >= 2 && words.length <= 5) {
            const initials = words
                .filter(w => /^[A-Z]/.test(w) && !/^(a|an|the|and|of|for)$/i.test(w))
                .map(w => w[0])
                .join('');
            if (initials.length >= 2) {
                aliases.add(initials);
            }
        }

        return Array.from(aliases).filter(a => a !== fullName);
    }

    /**
     * Scan document for all party name usages
     */
    function scanPartyUsages(paragraphTexts) {
        partyRegistry.parties.forEach(party => {
            // Build search terms
            const searchTerms = [
                party.fullName,
                party.shortForm,
                'the ' + party.shortForm,
                ...party.aliases
            ].filter(Boolean);

            paragraphTexts.forEach((para, paraIdx) => {
                const text = para.text;

                searchTerms.forEach(term => {
                    // Case-insensitive search but track actual case used
                    const regex = new RegExp(escapeRegex(term), 'gi');
                    let match;
                    
                    while ((match = regex.exec(text)) !== null) {
                        // Avoid duplicate usages at same location
                        const existingUsage = partyRegistry.usages.find(u => 
                            u.location.paragraph === paraIdx && 
                            Math.abs(u.location.offset - match.index) < 3
                        );

                        if (!existingUsage) {
                            const usage = createUsage(
                                party.id,
                                match[0],
                                { paragraph: paraIdx, offset: match.index },
                                1.0
                            );

                            // Check if this is the definition
                            if (party.definitionLocation.paragraph === paraIdx &&
                                Math.abs(party.definitionLocation.offset - match.index) < 100) {
                                usage.isDefinition = true;
                            }

                            partyRegistry.usages.push(usage);

                            // Track variations
                            if (!party.variations.includes(match[0])) {
                                party.variations.push(match[0]);
                            }
                        }
                    }
                });
            });
        });
    }

    /**
     * Detect issues in party usage
     */
    function detectIssues(paragraphTexts) {
        // 1. Find undefined party references (capitalized terms that look like parties)
        detectUndefinedReferences(paragraphTexts);

        // 2. Find inconsistent usage
        detectInconsistentUsage();

        // 3. Find potential typos using fuzzy matching
        detectTypos(paragraphTexts);

        // 4. Find duplicate definitions
        detectDuplicateDefinitions();
    }

    /**
     * Detect undefined party references
     */
    function detectUndefinedReferences(paragraphTexts) {
        // Pattern for potential party references (capitalized terms)
        const potentialPartyPattern = /\b(the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
        
        paragraphTexts.forEach((para, paraIdx) => {
            const text = para.text;
            let match;

            while ((match = potentialPartyPattern.exec(text)) !== null) {
                const term = match[2];
                
                // Skip common non-party terms
                if (isCommonNonPartyTerm(term)) continue;

                // Check if this looks like a party reference
                if (COMMON_SHORT_FORMS.some(sf => sf.toLowerCase() === term.toLowerCase())) {
                    // This looks like a party reference - is it defined?
                    const isDefined = partyRegistry.parties.some(p => 
                        p.shortForm.toLowerCase() === term.toLowerCase() ||
                        p.aliases.some(a => a.toLowerCase() === term.toLowerCase())
                    );

                    if (!isDefined) {
                        const issue = createIssue(
                            'undefined',
                            null,
                            term,
                            { paragraph: paraIdx, offset: match.index },
                            'Define this party or check if it should reference an existing party',
                            'warning'
                        );
                        
                        // Don't add duplicates
                        if (!partyRegistry.issues.some(i => 
                            i.type === 'undefined' && 
                            i.text.toLowerCase() === term.toLowerCase()
                        )) {
                            partyRegistry.issues.push(issue);
                        }
                    }
                }
            }
        });
    }

    /**
     * Detect inconsistent usage (different forms of same party)
     */
    function detectInconsistentUsage() {
        partyRegistry.parties.forEach(party => {
            // Get all unique variations used
            const variations = party.variations;
            
            if (variations.length > 2) {
                // More than 2 variations might indicate inconsistency
                const preferredForm = party.shortForm;
                
                variations.forEach(variation => {
                    // Skip the preferred form and "the X" form
                    if (variation === preferredForm || 
                        variation === 'the ' + preferredForm ||
                        variation === party.fullName) {
                        return;
                    }

                    // Check for inconsistent capitalization or articles
                    const usagesWithVariation = partyRegistry.usages.filter(u => 
                        u.partyId === party.id && u.text === variation
                    );

                    if (usagesWithVariation.length >= 2) {
                        const issue = createIssue(
                            'inconsistent',
                            party.id,
                            variation,
                            usagesWithVariation[0].location,
                            `Consider using "${preferredForm}" consistently`,
                            'info'
                        );
                        partyRegistry.issues.push(issue);

                        usagesWithVariation.forEach(u => u.hasIssue = true);
                    }
                });
            }
        });
    }

    /**
     * Detect potential typos using Levenshtein distance
     */
    function detectTypos(paragraphTexts) {
        partyRegistry.parties.forEach(party => {
            const partyTerms = [party.fullName, party.shortForm, ...party.aliases];
            
            paragraphTexts.forEach((para, paraIdx) => {
                const text = para.text;
                
                // Find capitalized words that might be typos
                const wordPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
                let match;

                while ((match = wordPattern.exec(text)) !== null) {
                    const word = match[1];
                    
                    // Check against each party term
                    partyTerms.forEach(term => {
                        const distance = levenshteinDistance(word.toLowerCase(), term.toLowerCase());
                        const maxLen = Math.max(word.length, term.length);
                        const similarity = 1 - (distance / maxLen);

                        // If very similar but not exact, might be a typo
                        if (similarity >= 0.7 && similarity < 1.0 && distance <= 2) {
                            // Make sure it's not already tracked
                            const alreadyTracked = partyRegistry.usages.some(u => 
                                u.location.paragraph === paraIdx && 
                                Math.abs(u.location.offset - match.index) < 3
                            );

                            if (!alreadyTracked) {
                                const issue = createIssue(
                                    'typo',
                                    party.id,
                                    word,
                                    { paragraph: paraIdx, offset: match.index },
                                    `Did you mean "${term}"?`,
                                    'warning'
                                );
                                partyRegistry.issues.push(issue);
                            }
                        }
                    });
                }
            });
        });
    }

    /**
     * Detect duplicate party definitions
     */
    function detectDuplicateDefinitions() {
        const seen = new Map();

        partyRegistry.parties.forEach(party => {
            const key = party.shortForm.toLowerCase();
            
            if (seen.has(key)) {
                const issue = createIssue(
                    'duplicate',
                    party.id,
                    party.shortForm,
                    party.definitionLocation,
                    `"${party.shortForm}" is already defined as ${seen.get(key)}`,
                    'error'
                );
                partyRegistry.issues.push(issue);
            } else {
                seen.set(key, party.fullName);
            }
        });
    }

    // =========================================================================
    // Fix Functions
    // =========================================================================

    /**
     * Replace all instances of a term with another
     */
    async function replaceAll(oldText, newText, options = {}) {
        return Word.run(async (context) => {
            const body = context.document.body;
            const searchResults = body.search(oldText, {
                matchCase: options.matchCase || false,
                matchWholeWord: options.matchWholeWord || true
            });
            
            searchResults.load('items');
            await context.sync();

            let replacedCount = 0;
            
            for (let i = 0; i < searchResults.items.length; i++) {
                // Skip if this is the definition
                if (options.skipDefinitions && i === 0) continue;
                
                searchResults.items[i].insertText(newText, 'Replace');
                replacedCount++;
            }

            await context.sync();
            return { replacedCount };
        });
    }

    /**
     * Standardize all party references to the defined short form
     */
    async function standardizeParty(partyId) {
        const party = partyRegistry.parties.find(p => p.id === partyId);
        if (!party) throw new Error('Party not found: ' + partyId);

        return Word.run(async (context) => {
            let totalReplaced = 0;

            // Replace each variation with the standard short form
            for (const variation of party.variations) {
                // Skip the preferred forms
                if (variation === party.shortForm || 
                    variation === 'the ' + party.shortForm ||
                    variation === party.fullName) {
                    continue;
                }

                const body = context.document.body;
                const searchResults = body.search(variation, { matchCase: true });
                searchResults.load('items');
                await context.sync();

                // Replace with "the ShortForm" for consistency
                const replacement = variation.startsWith('the ') || variation.startsWith('The ') 
                    ? 'the ' + party.shortForm 
                    : party.shortForm;

                for (const item of searchResults.items) {
                    item.insertText(replacement, 'Replace');
                    totalReplaced++;
                }
                await context.sync();
            }

            return { partyId, replacedCount: totalReplaced };
        });
    }

    /**
     * Fix a specific issue
     */
    async function fixIssue(issueId) {
        const issue = partyRegistry.issues.find(i => i.id === issueId);
        if (!issue) throw new Error('Issue not found: ' + issueId);

        return Word.run(async (context) => {
            if (issue.type === 'typo' || issue.type === 'inconsistent') {
                // Find and navigate to the issue location
                const paragraphs = context.document.body.paragraphs;
                paragraphs.load('items');
                await context.sync();

                if (issue.location.paragraph < paragraphs.items.length) {
                    const para = paragraphs.items[issue.location.paragraph];
                    const searchResults = para.search(issue.text, { matchCase: true });
                    searchResults.load('items');
                    await context.sync();

                    if (searchResults.items.length > 0) {
                        // Extract the suggestion text
                        const suggestionMatch = issue.suggestion.match(/[""](.+?)[""]/);
                        if (suggestionMatch) {
                            searchResults.items[0].insertText(suggestionMatch[1], 'Replace');
                            issue.resolved = true;
                        }
                    }
                }
                await context.sync();
            }

            return { issueId, resolved: issue.resolved };
        });
    }

    /**
     * Highlight all issues in the document
     * Uses HighlightCoordinator when available to prevent conflicts
     */
    async function highlightIssues() {
        // Try to use HighlightCoordinator for conflict-free highlighting
        if (typeof window !== 'undefined' && window.HighlightCoordinator) {
            const items = partyRegistry.issues
                .filter(issue => !issue.resolved)
                .map(issue => ({
                    searchText: issue.text,
                    issueType: issue.type || issue.severity,
                    color: issue.severity === 'error' ? 'Red' : 
                           issue.severity === 'warning' ? 'Pink' : 
                           'Cyan'
                }));
            
            return window.HighlightCoordinator.highlight('party-checker', items, {
                clearPrevious: true
            });
        }
        
        // Fall back to direct highlighting
        return Word.run(async (context) => {
            const body = context.document.body;
            
            // Clear existing highlights first
            body.font.highlightColor = 'None';
            await context.sync();

            let highlightedCount = 0;

            for (const issue of partyRegistry.issues) {
                if (issue.resolved) continue;

                const searchResults = body.search(issue.text, { 
                    matchCase: true,
                    matchWholeWord: true 
                });
                searchResults.load('items');
                await context.sync();

                const color = issue.severity === 'error' ? 'Red' : 
                              issue.severity === 'warning' ? 'Yellow' : 
                              'Turquoise';

                for (const item of searchResults.items) {
                    item.font.highlightColor = color;
                    highlightedCount++;
                }
                await context.sync();
            }

            return { highlightedCount };
        });
    }

    /**
     * Clear all highlights from this module
     * Uses HighlightCoordinator when available to only clear our layer
     */
    async function clearHighlights() {
        // Try to use HighlightCoordinator for layer-specific clearing
        if (typeof window !== 'undefined' && window.HighlightCoordinator) {
            await window.HighlightCoordinator.clearLayer('party-checker');
            return { success: true };
        }
        
        // Fall back to clearing all highlights (legacy behavior)
        return Word.run(async (context) => {
            const body = context.document.body;
            body.font.highlightColor = 'None';
            await context.sync();
            return { success: true };
        });
    }

    /**
     * Navigate to a specific location
     */
    async function navigateToLocation(location) {
        return Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items');
            await context.sync();

            if (location.paragraph < paragraphs.items.length) {
                const para = paragraphs.items[location.paragraph];
                para.select();
                await context.sync();
            }

            return { success: true };
        });
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================

    /**
     * Escape special regex characters
     */
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Levenshtein distance for fuzzy matching
     */
    function levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // deletion
                        dp[i][j - 1],     // insertion
                        dp[i - 1][j - 1]  // substitution
                    );
                }
            }
        }

        return dp[m][n];
    }

    /**
     * Check if a term is a common non-party term
     */
    function isCommonNonPartyTerm(term) {
        const nonPartyTerms = [
            'Agreement', 'Contract', 'Article', 'Section', 'Exhibit', 'Schedule',
            'Party', 'Parties', 'Date', 'Term', 'Services', 'Products', 'Work',
            'Business', 'Days', 'State', 'County', 'Court', 'Law', 'Laws',
            'United', 'States', 'America', 'January', 'February', 'March',
            'April', 'May', 'June', 'July', 'August', 'September', 'October',
            'November', 'December', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
            'Friday', 'Saturday', 'Sunday', 'Notice', 'Effective', 'Termination',
            'Confidential', 'Information', 'Intellectual', 'Property', 'Rights',
            'Payment', 'Amount', 'Total', 'Whereas', 'Therefore', 'Hereby',
            'Pursuant', 'Notwithstanding', 'Provided', 'Including', 'Without'
        ];

        return nonPartyTerms.some(t => t.toLowerCase() === term.toLowerCase());
    }

    /**
     * Generate summary statistics
     */
    function generateSummary() {
        const issues = partyRegistry.issues;
        return {
            totalParties: partyRegistry.parties.length,
            totalUsages: partyRegistry.usages.length,
            totalIssues: issues.length,
            issuesByType: {
                undefined: issues.filter(i => i.type === 'undefined').length,
                inconsistent: issues.filter(i => i.type === 'inconsistent').length,
                typo: issues.filter(i => i.type === 'typo').length,
                duplicate: issues.filter(i => i.type === 'duplicate').length
            },
            issuesBySeverity: {
                error: issues.filter(i => i.severity === 'error').length,
                warning: issues.filter(i => i.severity === 'warning').length,
                info: issues.filter(i => i.severity === 'info').length
            }
        };
    }

    /**
     * Get current registry state
     */
    function getRegistry() {
        return { ...partyRegistry };
    }

    /**
     * Add a party manually
     */
    function addPartyManually(fullName, shortForm, aliases = []) {
        const party = createParty(
            'party_manual_' + Date.now(),
            fullName,
            shortForm,
            null,
            null,
            { paragraph: -1, offset: -1 }
        );
        party.aliases = aliases;
        partyRegistry.parties.push(party);
        return party;
    }

    /**
     * Remove a party
     */
    function removeParty(partyId) {
        const index = partyRegistry.parties.findIndex(p => p.id === partyId);
        if (index > -1) {
            partyRegistry.parties.splice(index, 1);
            // Also remove related usages and issues
            partyRegistry.usages = partyRegistry.usages.filter(u => u.partyId !== partyId);
            partyRegistry.issues = partyRegistry.issues.filter(i => i.partyId !== partyId);
            return true;
        }
        return false;
    }

    /**
     * Add alias to a party
     */
    function addAlias(partyId, alias) {
        const party = partyRegistry.parties.find(p => p.id === partyId);
        if (party && !party.aliases.includes(alias)) {
            party.aliases.push(alias);
            return true;
        }
        return false;
    }

    // =========================================================================
    // Public API
    // =========================================================================

    return {
        // Core scanning
        scanDocument,
        getRegistry,
        
        // Party management
        addPartyManually,
        removeParty,
        addAlias,
        
        // Fixing issues
        replaceAll,
        standardizeParty,
        fixIssue,
        
        // Highlighting
        highlightIssues,
        clearHighlights,
        
        // Navigation
        navigateToLocation,
        
        // Constants
        COMMON_SHORT_FORMS,
        ENTITY_TYPES
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgePartyChecker;
}
