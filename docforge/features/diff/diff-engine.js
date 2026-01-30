/**
 * DocForge Compare Changes Engine
 * 
 * "See exactly what changes before you commit. Like GitHub for documents."
 * 
 * Core diffing logic for comparing document states and field values.
 * Works entirely locally - no external APIs needed.
 */

const DiffEngine = (function() {
    'use strict';

    // Store document snapshots for comparison
    let snapshots = [];
    const MAX_SNAPSHOTS = 20;

    /**
     * Represents a change between two states
     */
    class Change {
        constructor(type, field, oldValue, newValue, context) {
            this.type = type;        // 'add' | 'delete' | 'modify'
            this.field = field;      // Field name/title
            this.oldValue = oldValue;
            this.newValue = newValue;
            this.context = context;  // Surrounding text for context
            this.timestamp = Date.now();
        }
    }

    /**
     * Represents a document snapshot
     */
    class Snapshot {
        constructor(fields, timestamp = Date.now()) {
            this.id = `snap_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
            this.fields = new Map(fields); // Map of fieldName -> value
            this.timestamp = timestamp;
        }
    }

    /**
     * Take a snapshot of current field values
     * @param {Array} fields - Array of field objects with title and value
     * @returns {Snapshot}
     */
    function takeSnapshot(fields) {
        const fieldMap = fields.map(f => [f.title || f.name, f.value || '']);
        const snapshot = new Snapshot(fieldMap);
        
        snapshots.push(snapshot);
        
        // Keep only recent snapshots
        if (snapshots.length > MAX_SNAPSHOTS) {
            snapshots.shift();
        }
        
        return snapshot;
    }

    /**
     * Get the most recent snapshot
     * @returns {Snapshot|null}
     */
    function getLatestSnapshot() {
        return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    }

    /**
     * Get snapshot by index (0 = oldest, -1 = newest)
     * @param {number} index
     * @returns {Snapshot|null}
     */
    function getSnapshot(index) {
        if (index < 0) {
            index = snapshots.length + index;
        }
        return snapshots[index] || null;
    }

    /**
     * Compare two field value sets and generate changes
     * @param {Map|Object} oldFields - Previous field values
     * @param {Map|Object} newFields - Current field values
     * @returns {Array<Change>}
     */
    function compareFields(oldFields, newFields) {
        const changes = [];
        
        // Normalize to Maps
        const oldMap = oldFields instanceof Map ? oldFields : new Map(Object.entries(oldFields || {}));
        const newMap = newFields instanceof Map ? newFields : new Map(Object.entries(newFields || {}));
        
        // Find modifications and deletions
        for (const [field, oldValue] of oldMap) {
            if (newMap.has(field)) {
                const newValue = newMap.get(field);
                if (oldValue !== newValue) {
                    changes.push(new Change('modify', field, oldValue, newValue));
                }
            } else {
                changes.push(new Change('delete', field, oldValue, null));
            }
        }
        
        // Find additions
        for (const [field, newValue] of newMap) {
            if (!oldMap.has(field)) {
                changes.push(new Change('add', field, null, newValue));
            }
        }
        
        return changes;
    }

    /**
     * Compute a word-level diff between two strings
     * @param {string} oldText
     * @param {string} newText
     * @returns {Array} Array of diff segments [{type, text}]
     */
    function diffStrings(oldText, newText) {
        if (oldText === newText) return [{ type: 'equal', text: newText }];
        if (!oldText) return [{ type: 'add', text: newText }];
        if (!newText) return [{ type: 'delete', text: oldText }];

        // Word-level diff using LCS algorithm
        const oldWords = tokenize(oldText);
        const newWords = tokenize(newText);
        
        const lcs = longestCommonSubsequence(oldWords, newWords);
        return buildDiffFromLCS(oldWords, newWords, lcs);
    }

    /**
     * Tokenize text into words while preserving whitespace
     */
    function tokenize(text) {
        return text.match(/\S+|\s+/g) || [];
    }

    /**
     * Find longest common subsequence of two arrays
     */
    function longestCommonSubsequence(a, b) {
        const m = a.length;
        const n = b.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Backtrack to find LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                lcs.unshift({ word: a[i - 1], oldIdx: i - 1, newIdx: j - 1 });
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return lcs;
    }

    /**
     * Build diff segments from LCS result
     */
    function buildDiffFromLCS(oldWords, newWords, lcs) {
        const result = [];
        let oldIdx = 0;
        let newIdx = 0;
        
        for (const match of lcs) {
            // Add deletions (words in old but not in LCS)
            while (oldIdx < match.oldIdx) {
                result.push({ type: 'delete', text: oldWords[oldIdx] });
                oldIdx++;
            }
            
            // Add additions (words in new but not in LCS)
            while (newIdx < match.newIdx) {
                result.push({ type: 'add', text: newWords[newIdx] });
                newIdx++;
            }
            
            // Add equal word
            result.push({ type: 'equal', text: match.word });
            oldIdx++;
            newIdx++;
        }
        
        // Add remaining deletions
        while (oldIdx < oldWords.length) {
            result.push({ type: 'delete', text: oldWords[oldIdx] });
            oldIdx++;
        }
        
        // Add remaining additions
        while (newIdx < newWords.length) {
            result.push({ type: 'add', text: newWords[newIdx] });
            newIdx++;
        }
        
        // Merge consecutive segments of same type
        return mergeSegments(result);
    }

    /**
     * Merge consecutive diff segments of the same type
     */
    function mergeSegments(segments) {
        if (segments.length === 0) return segments;
        
        const merged = [segments[0]];
        for (let i = 1; i < segments.length; i++) {
            const last = merged[merged.length - 1];
            const curr = segments[i];
            
            if (last.type === curr.type) {
                last.text += curr.text;
            } else {
                merged.push(curr);
            }
        }
        
        return merged;
    }

    /**
     * Generate a summary of changes
     * @param {Array<Change>} changes
     * @returns {Object} Summary statistics
     */
    function summarizeChanges(changes) {
        const summary = {
            total: changes.length,
            additions: 0,
            deletions: 0,
            modifications: 0,
            fields: [],
            wordsAdded: 0,
            wordsDeleted: 0
        };
        
        for (const change of changes) {
            switch (change.type) {
                case 'add':
                    summary.additions++;
                    summary.wordsAdded += countWords(change.newValue);
                    break;
                case 'delete':
                    summary.deletions++;
                    summary.wordsDeleted += countWords(change.oldValue);
                    break;
                case 'modify':
                    summary.modifications++;
                    const oldWords = countWords(change.oldValue);
                    const newWords = countWords(change.newValue);
                    if (newWords > oldWords) {
                        summary.wordsAdded += (newWords - oldWords);
                    } else {
                        summary.wordsDeleted += (oldWords - newWords);
                    }
                    break;
            }
            summary.fields.push(change.field);
        }
        
        return summary;
    }

    /**
     * Count words in a string
     */
    function countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }

    /**
     * Generate HTML representation of a diff
     * @param {Array} diffSegments - From diffStrings()
     * @returns {string} HTML string with highlighted changes
     */
    function diffToHTML(diffSegments) {
        return diffSegments.map(seg => {
            const escaped = escapeHTML(seg.text);
            switch (seg.type) {
                case 'add':
                    return `<ins class="diff-add">${escaped}</ins>`;
                case 'delete':
                    return `<del class="diff-delete">${escaped}</del>`;
                default:
                    return escaped;
            }
        }).join('');
    }

    /**
     * Escape HTML special characters
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Compare current fields against last snapshot
     * @param {Array} currentFields - Current field values
     * @returns {Object} { changes, summary, diffHTML }
     */
    function diffAgainstLastSnapshot(currentFields) {
        const lastSnapshot = getLatestSnapshot();
        if (!lastSnapshot) {
            return { changes: [], summary: { total: 0 }, diffHTML: {} };
        }
        
        const currentMap = new Map(currentFields.map(f => [f.title || f.name, f.value || '']));
        const changes = compareFields(lastSnapshot.fields, currentMap);
        const summary = summarizeChanges(changes);
        
        // Generate HTML diffs for each changed field
        const diffHTML = {};
        for (const change of changes) {
            if (change.type === 'modify') {
                diffHTML[change.field] = diffToHTML(diffStrings(change.oldValue || '', change.newValue || ''));
            }
        }
        
        return { changes, summary, diffHTML };
    }

    /**
     * Clear all snapshots (for testing or reset)
     */
    function clearSnapshots() {
        snapshots = [];
    }

    /**
     * Get all snapshots for time-travel UI
     * @returns {Array<Snapshot>}
     */
    function getAllSnapshots() {
        return [...snapshots];
    }

    // Public API
    return {
        takeSnapshot,
        getLatestSnapshot,
        getSnapshot,
        getAllSnapshots,
        compareFields,
        diffStrings,
        diffToHTML,
        summarizeChanges,
        diffAgainstLastSnapshot,
        clearSnapshots,
        Change,
        Snapshot
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffEngine;
}
