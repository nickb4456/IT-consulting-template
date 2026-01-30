/**
 * DraftBridge Exhibit/Schedule Auto-Sync
 * 
 * Keeps exhibit and schedule references in sync with actual exhibits.
 * Detects references, tracks definitions, warns on mismatches, and
 * supports auto-renumbering when exhibits are reordered.
 * 
 * @version 1.0.0
 */

/* global Word, Office */

const ExhibitSync = (function() {
    'use strict';

    // ========================================================================
    // Constants & Patterns
    // ========================================================================

    /**
     * Reference types we track
     */
    const EXHIBIT_TYPES = {
        EXHIBIT: 'exhibit',
        SCHEDULE: 'schedule',
        APPENDIX: 'appendix',
        ATTACHMENT: 'attachment',
        ANNEX: 'annex'
    };

    /**
     * Patterns to detect exhibit references in text
     * Captures: type, identifier (letter/number), optional title
     */
    const REFERENCE_PATTERNS = {
        // "Exhibit A", "Exhibit B-1", "Exhibit 1"
        exhibit: /\b(Exhibit)\s+([A-Z](?:-\d+)?|\d+)\b/gi,
        
        // "Schedule 1", "Schedule A", "Schedule 1.1"
        schedule: /\b(Schedule)\s+(\d+(?:\.\d+)?|[A-Z])\b/gi,
        
        // "Appendix A", "Appendix 1"
        appendix: /\b(Appendix)\s+([A-Z]|\d+)\b/gi,
        
        // "Attachment 1", "Attachment A"
        attachment: /\b(Attachment)\s+([A-Z]|\d+)\b/gi,
        
        // "Annex A", "Annex 1"
        annex: /\b(Annex)\s+([A-Z]|\d+)\b/gi
    };

    /**
     * Patterns to detect exhibit definitions (where an exhibit is actually defined)
     * These appear at exhibit headers, e.g., "EXHIBIT A" or "EXHIBIT A - IP Assignment"
     */
    const DEFINITION_PATTERNS = {
        // "EXHIBIT A" at start of line, possibly with title
        exhibit: /^(?:EXHIBIT)\s+([A-Z](?:-\d+)?|\d+)(?:\s*[-–—:]\s*(.+?))?$/gim,
        
        // "SCHEDULE 1" at start of line
        schedule: /^(?:SCHEDULE)\s+(\d+(?:\.\d+)?|[A-Z])(?:\s*[-–—:]\s*(.+?))?$/gim,
        
        // "APPENDIX A" at start of line
        appendix: /^(?:APPENDIX)\s+([A-Z]|\d+)(?:\s*[-–—:]\s*(.+?))?$/gim,
        
        // "ATTACHMENT 1" at start of line
        attachment: /^(?:ATTACHMENT)\s+([A-Z]|\d+)(?:\s*[-–—:]\s*(.+?))?$/gim,
        
        // "ANNEX A" at start of line
        annex: /^(?:ANNEX)\s+([A-Z]|\d+)(?:\s*[-–—:]\s*(.+?))?$/gim
    };

    /**
     * Content Control tag prefix for DraftBridge-managed references
     */
    const CONTROL_TAG_PREFIX = 'draftbridge-exhibit-';

    // ========================================================================
    // State
    // ========================================================================

    let _state = {
        exhibits: [],      // Defined exhibits in document
        references: [],    // All references found
        issues: [],        // Validation issues
        lastScan: null     // Timestamp of last scan
    };

    // ========================================================================
    // Scanning & Detection
    // ========================================================================

    /**
     * Scan document for all exhibit definitions
     * @returns {Promise<Array>} Array of exhibit definition objects
     */
    async function scanExhibitDefinitions() {
        return Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            const text = body.text;
            const definitions = [];

            // Scan for each type of exhibit definition
            for (const [type, pattern] of Object.entries(DEFINITION_PATTERNS)) {
                // Reset regex lastIndex
                pattern.lastIndex = 0;
                let match;
                
                while ((match = pattern.exec(text)) !== null) {
                    definitions.push({
                        type: type,
                        identifier: match[1].toUpperCase(),
                        title: match[2] ? match[2].trim() : null,
                        fullMatch: match[0],
                        position: match.index,
                        displayName: `${capitalize(type)} ${match[1].toUpperCase()}`
                    });
                }
            }

            // Sort by position in document
            definitions.sort((a, b) => a.position - b.position);

            // Assign order numbers
            definitions.forEach((def, idx) => {
                def.order = idx + 1;
            });

            return definitions;
        });
    }

    /**
     * Scan document for all exhibit references
     * @returns {Promise<Array>} Array of reference objects
     */
    async function scanExhibitReferences() {
        return Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            const text = body.text;
            const references = [];

            // Scan for each type of reference
            for (const [type, pattern] of Object.entries(REFERENCE_PATTERNS)) {
                pattern.lastIndex = 0;
                let match;
                
                while ((match = pattern.exec(text)) !== null) {
                    // Check if this is a definition (all caps at line start)
                    // If so, skip it - we only want references
                    const lineStart = text.lastIndexOf('\n', match.index) + 1;
                    const beforeMatch = text.substring(lineStart, match.index).trim();
                    
                    // Skip if this looks like a definition header
                    if (beforeMatch === '' && match[0] === match[0].toUpperCase()) {
                        continue;
                    }

                    references.push({
                        type: type,
                        identifier: match[2].toUpperCase(),
                        fullMatch: match[0],
                        position: match.index,
                        displayName: `${capitalize(type)} ${match[2].toUpperCase()}`
                    });
                }
            }

            // Sort by position
            references.sort((a, b) => a.position - b.position);

            return references;
        });
    }

    /**
     * Full document scan - get both definitions and references
     * @returns {Promise<Object>} Scan results with definitions, references, and issues
     */
    async function fullScan() {
        const definitions = await scanExhibitDefinitions();
        const references = await scanExhibitReferences();
        const issues = validateSync(definitions, references);

        _state = {
            exhibits: definitions,
            references: references,
            issues: issues,
            lastScan: new Date()
        };

        return {
            definitions,
            references,
            issues,
            summary: generateSummary(definitions, references, issues)
        };
    }

    // ========================================================================
    // Validation
    // ========================================================================

    /**
     * Validate that references match definitions
     * @param {Array} definitions - Exhibit definitions
     * @param {Array} references - Exhibit references
     * @returns {Array} Array of issue objects
     */
    function validateSync(definitions, references) {
        const issues = [];

        // Build lookup maps
        const definedExhibits = new Map();
        definitions.forEach(def => {
            const key = `${def.type}:${def.identifier}`;
            definedExhibits.set(key, def);
        });

        const referenceCounts = new Map();
        definitions.forEach(def => {
            const key = `${def.type}:${def.identifier}`;
            referenceCounts.set(key, 0);
        });

        // Check each reference
        references.forEach(ref => {
            const key = `${ref.type}:${ref.identifier}`;
            
            if (!definedExhibits.has(key)) {
                // Reference to non-existent exhibit
                issues.push({
                    type: 'missing-definition',
                    severity: 'error',
                    reference: ref,
                    message: `Reference to ${ref.displayName} but no such ${ref.type} is defined`,
                    suggestion: `Add ${ref.displayName} to the document or correct the reference`
                });
            } else {
                // Count the reference
                referenceCounts.set(key, (referenceCounts.get(key) || 0) + 1);
            }
        });

        // Check for unreferenced exhibits
        definitions.forEach(def => {
            const key = `${def.type}:${def.identifier}`;
            const count = referenceCounts.get(key) || 0;
            
            if (count === 0) {
                issues.push({
                    type: 'no-references',
                    severity: 'warning',
                    definition: def,
                    message: `${def.displayName} is defined but never referenced`,
                    suggestion: `Add references to ${def.displayName} or remove it if unused`
                });
            }
        });

        // Check for gaps in numbering
        const exhibitsByType = groupBy(definitions, 'type');
        for (const [type, exhibits] of Object.entries(exhibitsByType)) {
            const gaps = detectNumberingGaps(exhibits);
            gaps.forEach(gap => {
                issues.push({
                    type: 'numbering-gap',
                    severity: 'info',
                    exhibitType: type,
                    message: gap.message,
                    suggestion: gap.suggestion
                });
            });
        }

        return issues;
    }

    /**
     * Detect gaps in exhibit numbering sequence
     * @param {Array} exhibits - Exhibits of same type
     * @returns {Array} Gap issues
     */
    function detectNumberingGaps(exhibits) {
        const gaps = [];
        if (exhibits.length < 2) return gaps;

        // Separate letter-based from number-based
        const letterExhibits = exhibits.filter(e => /^[A-Z]/.test(e.identifier));
        const numberExhibits = exhibits.filter(e => /^\d/.test(e.identifier));

        // Check letter sequence
        if (letterExhibits.length > 1) {
            const sorted = letterExhibits.sort((a, b) => 
                a.identifier.charCodeAt(0) - b.identifier.charCodeAt(0)
            );
            
            for (let i = 1; i < sorted.length; i++) {
                const expected = String.fromCharCode(sorted[i-1].identifier.charCodeAt(0) + 1);
                if (sorted[i].identifier[0] !== expected) {
                    gaps.push({
                        message: `Gap in ${sorted[0].type} sequence: ${sorted[i-1].identifier} → ${sorted[i].identifier}`,
                        suggestion: `Consider renumbering exhibits to close the gap`
                    });
                }
            }
        }

        // Check number sequence
        if (numberExhibits.length > 1) {
            const sorted = numberExhibits.sort((a, b) => 
                parseInt(a.identifier) - parseInt(b.identifier)
            );
            
            for (let i = 1; i < sorted.length; i++) {
                const prev = parseInt(sorted[i-1].identifier);
                const curr = parseInt(sorted[i].identifier);
                if (curr !== prev + 1) {
                    gaps.push({
                        message: `Gap in ${sorted[0].type} sequence: ${sorted[i-1].identifier} → ${sorted[i].identifier}`,
                        suggestion: `Consider renumbering to close the gap`
                    });
                }
            }
        }

        return gaps;
    }

    // ========================================================================
    // Auto-Renumbering
    // ========================================================================

    /**
     * Renumber exhibits based on new order
     * OPTIMIZED: Batch all searches, single sync for replacements
     * @param {string} exhibitType - Type of exhibits to renumber
     * @param {Array} newOrder - Array of exhibit identifiers in new order
     * @returns {Promise<Object>} Renumbering results
     */
    async function renumberExhibits(exhibitType, newOrder) {
        return Word.run(async (context) => {
            const body = context.document.body;
            
            // Build replacement map: old identifier -> new identifier
            const replacements = new Map();
            newOrder.forEach((oldId, idx) => {
                const newId = isLetter(oldId) 
                    ? String.fromCharCode('A'.charCodeAt(0) + idx)
                    : String(idx + 1);
                if (oldId !== newId) {
                    replacements.set(oldId, newId);
                }
            });

            if (replacements.size === 0) {
                return { changed: 0, message: 'No changes needed' };
            }

            // Process replacements from Z->A or high->low to avoid conflicts
            const sortedReplacements = Array.from(replacements.entries())
                .sort((a, b) => b[0].localeCompare(a[0]));

            const typeName = capitalize(exhibitType);
            
            // BATCH: Create all searches first
            const allSearches = [];
            
            for (const [oldId, newId] of sortedReplacements) {
                // Reference search (e.g., "Exhibit A")
                allSearches.push({
                    results: body.search(`${typeName} ${oldId}`, { matchCase: false, matchWholeWord: false }),
                    newText: `${typeName} ${newId}`
                });
                
                // Definition search (e.g., "EXHIBIT A")
                allSearches.push({
                    results: body.search(`${typeName.toUpperCase()} ${oldId}`, { matchCase: true, matchWholeWord: false }),
                    newText: `${typeName.toUpperCase()} ${newId}`
                });
            }
            
            // Load all search results at once
            allSearches.forEach(s => s.results.load('items'));
            await context.sync();
            
            // Apply all replacements (no sync in loop!)
            let totalChanges = 0;
            for (const { results, newText } of allSearches) {
                for (const range of results.items) {
                    range.insertText(newText, Word.InsertLocation.replace);
                    totalChanges++;
                }
            }

            // Single sync for all changes
            await context.sync();

            return {
                changed: totalChanges,
                replacements: Object.fromEntries(replacements),
                message: `Renumbered ${totalChanges} occurrences`
            };
        });
    }

    /**
     * Shift all exhibits after a certain point
     * Used when inserting a new exhibit
     * @param {string} exhibitType - Type of exhibits
     * @param {string} insertAfter - Insert new exhibit after this one (or null for beginning)
     * @returns {Promise<Object>} Shift results
     */
    async function shiftExhibitsForInsert(exhibitType, insertAfter) {
        // Get current exhibits of this type
        const allExhibits = _state.exhibits.filter(e => e.type === exhibitType);
        const currentOrder = allExhibits.map(e => e.identifier);
        
        if (currentOrder.length === 0) {
            return { shifted: 0, newIdentifier: 'A' };
        }

        // Determine insertion point
        let insertIdx = 0;
        if (insertAfter) {
            insertIdx = currentOrder.indexOf(insertAfter.toUpperCase()) + 1;
        }

        // Build new order with placeholder
        const newOrder = [...currentOrder];
        const isLetterBased = isLetter(currentOrder[0]);
        
        // Shift everything after insert point
        const newIdentifier = isLetterBased
            ? String.fromCharCode('A'.charCodeAt(0) + insertIdx)
            : String(insertIdx + 1);

        // Renumber existing exhibits to make room
        const shiftedOrder = currentOrder.slice(insertIdx);
        if (shiftedOrder.length > 0) {
            const updatedOrder = currentOrder.map((id, idx) => {
                if (idx >= insertIdx) {
                    return isLetterBased
                        ? String.fromCharCode('A'.charCodeAt(0) + idx + 1)
                        : String(idx + 2);
                }
                return id;
            });
            
            await renumberExhibits(exhibitType, updatedOrder);
        }

        return {
            shifted: shiftedOrder.length,
            newIdentifier: newIdentifier,
            message: `Shifted ${shiftedOrder.length} exhibits. New exhibit should be ${capitalize(exhibitType)} ${newIdentifier}`
        };
    }

    // ========================================================================
    // Reference Insertion
    // ========================================================================

    /**
     * Insert an exhibit reference at cursor position
     * @param {string} exhibitType - Type of exhibit
     * @param {string} identifier - Exhibit identifier (A, B, 1, 2, etc.)
     * @param {boolean} useContentControl - Wrap in content control for tracking
     * @returns {Promise<void>}
     */
    async function insertReference(exhibitType, identifier, useContentControl = true) {
        return Word.run(async (context) => {
            const selection = context.document.getSelection();
            
            const text = `${capitalize(exhibitType)} ${identifier.toUpperCase()}`;
            
            if (useContentControl) {
                // Insert as content control for tracking
                const contentControl = selection.insertContentControl();
                contentControl.tag = `${CONTROL_TAG_PREFIX}${exhibitType}-${identifier}`;
                contentControl.title = text;
                contentControl.insertText(text, Word.InsertLocation.replace);
                contentControl.appearance = Word.ContentControlAppearance.hidden;
                contentControl.cannotEdit = false;
                contentControl.cannotDelete = false;
            } else {
                // Simple text insertion
                selection.insertText(text, Word.InsertLocation.end);
            }

            await context.sync();
        });
    }

    /**
     * Insert a new exhibit definition at cursor position
     * @param {string} exhibitType - Type of exhibit
     * @param {string} title - Optional title for the exhibit
     * @param {boolean} autoNumber - Automatically determine number
     * @returns {Promise<Object>} Insertion result with identifier
     */
    async function insertExhibitDefinition(exhibitType, title = null, autoNumber = true) {
        let identifier;

        if (autoNumber) {
            // Determine next available identifier
            const existing = _state.exhibits.filter(e => e.type === exhibitType);
            if (existing.length === 0) {
                identifier = 'A';
            } else {
                const lastId = existing[existing.length - 1].identifier;
                if (isLetter(lastId)) {
                    identifier = String.fromCharCode(lastId.charCodeAt(0) + 1);
                } else {
                    identifier = String(parseInt(lastId) + 1);
                }
            }
        }

        return Word.run(async (context) => {
            const selection = context.document.getSelection();
            
            let text = `${exhibitType.toUpperCase()} ${identifier}`;
            if (title) {
                text += ` - ${title}`;
            }

            // Insert with exhibit header formatting
            const para = selection.insertParagraph(text, Word.InsertLocation.after);
            para.alignment = Word.Alignment.centered;
            para.font.bold = true;
            para.font.size = 14;

            await context.sync();

            // Trigger rescan to update state
            await fullScan();

            return {
                identifier,
                displayName: `${capitalize(exhibitType)} ${identifier}`,
                message: `Inserted ${capitalize(exhibitType)} ${identifier}`
            };
        });
    }

    // ========================================================================
    // Content Control Management
    // ========================================================================

    /**
     * Find all DraftBridge exhibit content controls
     * @returns {Promise<Array>} Array of content control info
     */
    async function findManagedControls() {
        return Word.run(async (context) => {
            const contentControls = context.document.contentControls;
            contentControls.load('items/tag,items/title,items/text');
            await context.sync();

            const managed = [];
            for (const control of contentControls.items) {
                if (control.tag && control.tag.startsWith(CONTROL_TAG_PREFIX)) {
                    const parts = control.tag.replace(CONTROL_TAG_PREFIX, '').split('-');
                    managed.push({
                        tag: control.tag,
                        type: parts[0],
                        identifier: parts[1],
                        text: control.text,
                        title: control.title
                    });
                }
            }

            return managed;
        });
    }

    /**
     * Update all managed content controls after renumbering
     * @param {Map} replacements - Map of old identifier to new identifier
     * @param {string} exhibitType - Type of exhibits
     * @returns {Promise<number>} Number of controls updated
     */
    async function updateManagedControls(replacements, exhibitType) {
        return Word.run(async (context) => {
            const contentControls = context.document.contentControls;
            contentControls.load('items/tag,items/title,items/text');
            await context.sync();

            let updated = 0;
            for (const control of contentControls.items) {
                if (control.tag && control.tag.startsWith(CONTROL_TAG_PREFIX + exhibitType)) {
                    const parts = control.tag.replace(CONTROL_TAG_PREFIX, '').split('-');
                    const oldId = parts[1];
                    
                    if (replacements.has(oldId)) {
                        const newId = replacements.get(oldId);
                        control.tag = `${CONTROL_TAG_PREFIX}${exhibitType}-${newId}`;
                        control.title = `${capitalize(exhibitType)} ${newId}`;
                        // Text is already updated by search/replace
                        updated++;
                    }
                }
            }

            await context.sync();
            return updated;
        });
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    /**
     * Capitalize first letter
     */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Check if string starts with a letter
     */
    function isLetter(str) {
        return /^[A-Z]/i.test(str);
    }

    /**
     * Group array by key
     */
    function groupBy(arr, key) {
        return arr.reduce((groups, item) => {
            const val = item[key];
            groups[val] = groups[val] || [];
            groups[val].push(item);
            return groups;
        }, {});
    }

    /**
     * Generate human-readable summary
     */
    function generateSummary(definitions, references, issues) {
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        
        return {
            exhibitCount: definitions.length,
            referenceCount: references.length,
            errorCount: errors,
            warningCount: warnings,
            status: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok',
            message: errors > 0 
                ? `${errors} broken reference(s) found`
                : warnings > 0
                    ? `${warnings} potential issue(s) found`
                    : 'All exhibits in sync'
        };
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    /**
     * Register document change handler to auto-rescan
     */
    function registerChangeHandler(callback) {
        if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
            Office.context.document.addHandlerAsync(
                Office.EventType.DocumentSelectionChanged,
                debounce(async () => {
                    const results = await fullScan();
                    if (callback) callback(results);
                }, 2000)
            );
        }
    }

    /**
     * Simple debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================================================
    // Public API
    // ========================================================================

    return {
        // Types
        TYPES: EXHIBIT_TYPES,
        
        // Scanning
        scanExhibitDefinitions,
        scanExhibitReferences,
        fullScan,
        
        // Validation
        validateSync,
        
        // Renumbering
        renumberExhibits,
        shiftExhibitsForInsert,
        
        // Insertion
        insertReference,
        insertExhibitDefinition,
        
        // Content Controls
        findManagedControls,
        updateManagedControls,
        
        // State
        getState: () => ({ ..._state }),
        getExhibits: () => [..._state.exhibits],
        getReferences: () => [..._state.references],
        getIssues: () => [..._state.issues],
        
        // Events
        registerChangeHandler,
        
        // Version info
        VERSION: '1.0.0'
    };
})();

// Global export for Office Add-in
if (typeof window !== 'undefined') {
    window.ExhibitSync = ExhibitSync;
}

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExhibitSync;
}
