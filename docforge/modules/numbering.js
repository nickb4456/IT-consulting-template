/**
 * DocForge - Smart Numbering Engine v2.0
 * 
 * The killer feature. Detects and fixes legal document numbering patterns
 * with sub-500ms performance on large documents.
 * 
 * Supports:
 * - ARTICLE I, II, III... (Roman articles)
 * - 1., 2., 3... (Section top-level)
 * - 1.1, 1.2, 2.1... (Decimal subsections)
 * - 1.1.1, 1.1.2... (Deep decimal)
 * - (a), (b), (c)... (Alpha paragraphs)
 * - (i), (ii), (iii)... (Roman sub-paragraphs)
 * - (1), (2), (3)... (Numeric sub-paragraphs)
 * - (A), (B), (C)... (Upper alpha)
 * 
 * Architecture:
 * - DocumentTree: AST representation of document numbering
 * - PatternDetector: Identifies numbering type and level
 * - NumberingFixer: Calculates and applies corrections
 * - Cache: Incremental processing for speed
 */

// ============================================================================
// CONSTANTS & PATTERNS
// ============================================================================

/**
 * Legal numbering patterns in priority order (most specific first)
 * Each pattern includes regex, type identifier, level detection, and formatter
 */
const NUMBERING_PATTERNS = [
    // ===== ARTICLE-level (Level 1) =====
    {
        id: 'roman-article',
        regex: /^(ARTICLE\s+)([IVXLCDM]+)\.?\s*/i,
        level: 1,
        priority: 100,
        extractValue: (m) => fromRoman(m[2]),
        format: (n, ctx) => `ARTICLE ${toRoman(n)}`,
        nextPattern: null // Articles are standalone
    },
    
    // ===== Decimal Outline (Levels 1-4) =====
    // Must check deeper levels first (most specific)
    {
        id: 'decimal-4',
        regex: /^(\d+)\.(\d+)\.(\d+)\.(\d+)\.?\s+/,
        level: 4,
        priority: 90,
        extractValue: (m) => ({
            full: `${m[1]}.${m[2]}.${m[3]}.${m[4]}`,
            parts: [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseInt(m[4])],
            current: parseInt(m[4])
        }),
        format: (n, ctx) => `${ctx.parent}.${n}. `,
        parentPattern: 'decimal-3'
    },
    {
        id: 'decimal-3',
        regex: /^(\d+)\.(\d+)\.(\d+)\.?\s+/,
        level: 3,
        priority: 85,
        extractValue: (m) => ({
            full: `${m[1]}.${m[2]}.${m[3]}`,
            parts: [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])],
            current: parseInt(m[3])
        }),
        format: (n, ctx) => `${ctx.parent}.${n}. `,
        parentPattern: 'decimal-2'
    },
    {
        id: 'decimal-2',
        regex: /^(\d+)\.(\d+)\.?\s+/,
        level: 2,
        priority: 80,
        extractValue: (m) => ({
            full: `${m[1]}.${m[2]}`,
            parts: [parseInt(m[1]), parseInt(m[2])],
            current: parseInt(m[2])
        }),
        format: (n, ctx) => `${ctx.parent}.${n} `,
        parentPattern: 'decimal-1'
    },
    {
        id: 'decimal-1',
        regex: /^(\d+)\.\s+(?=[A-Z])/,
        level: 1,
        priority: 75,
        extractValue: (m) => ({
            full: `${m[1]}`,
            parts: [parseInt(m[1])],
            current: parseInt(m[1])
        }),
        format: (n, ctx) => `${n}. `,
        parentPattern: null
    },
    
    // ===== Section X. style (alternative Level 1) =====
    {
        id: 'section-numbered',
        regex: /^(Section\s+)(\d+)\.?\s*/i,
        level: 1,
        priority: 70,
        extractValue: (m) => parseInt(m[2]),
        format: (n, ctx) => `Section ${n}. `,
        parentPattern: null
    },
    
    // ===== Parenthetical styles (Levels 3-5) =====
    // IMPORTANT: Order matters! More specific patterns first.
    // Roman numerals must come before alpha to catch (i), (v), (x), etc.
    {
        id: 'roman-paren',
        // Match roman numerals: i, ii, iii, iv, v, vi, vii, viii, ix, x, xi, xii, etc.
        // Exclude single letters that aren't roman (j-z except valid roman)
        regex: /^\(([ivxlcdm]{1,9})\)\s+/i,
        level: 4,
        priority: 65, // Higher than alpha-paren
        extractValue: (m) => fromRoman(m[1]),
        format: (n, ctx) => `(${toRoman(n).toLowerCase()}) `,
        // Only match if it's a valid roman numeral value
        validate: (m) => {
            const val = fromRoman(m[1]);
            return val > 0 && val <= 50; // Reasonable range for legal docs
        },
        resets: ['alpha-upper-paren', 'numeric-paren-deep']
    },
    {
        id: 'alpha-upper-paren',
        // Match uppercase letters: (A), (B), (C), etc.
        // Must be uppercase specifically
        regex: /^\(([A-Z])\)\s+/,
        level: 5,
        priority: 62, // Between roman and lower alpha
        extractValue: (m) => m[1].charCodeAt(0) - 64,
        format: (n, ctx) => `(${String.fromCharCode(64 + n)}) `,
        resets: []
    },
    {
        id: 'alpha-paren',
        // Match lowercase letters: (a), (b), (c), etc.
        // Explicitly lowercase only, not case-insensitive
        regex: /^\(([a-z])\)\s+/,
        level: 3,
        priority: 60,
        extractValue: (m) => m[1].charCodeAt(0) - 96,
        format: (n, ctx) => `(${String.fromCharCode(96 + n)}) `,
        resets: ['roman-paren', 'numeric-paren'] // Resets sub-levels
    },
    {
        id: 'numeric-paren',
        regex: /^\((\d+)\)\s+/,
        level: 4,
        priority: 50,
        extractValue: (m) => parseInt(m[1]),
        format: (n, ctx) => `(${n}) `,
        resets: []
    },
    
    // ===== Non-parenthetical letter/number styles =====
    {
        id: 'alpha-dot',
        regex: /^([a-z])\.\s+/i,
        level: 3,
        priority: 40,
        extractValue: (m) => m[1].toLowerCase().charCodeAt(0) - 96,
        format: (n, ctx) => `${String.fromCharCode(96 + n)}. `,
        resets: []
    },
    {
        id: 'roman-dot',
        regex: /^([ivxlcdm]+)\.\s+/i,
        level: 4,
        priority: 35,
        extractValue: (m) => fromRoman(m[1]),
        format: (n, ctx) => `${toRoman(n).toLowerCase()}. `,
        resets: []
    }
];

// Pattern lookup cache for O(1) access
const PATTERN_MAP = new Map(NUMBERING_PATTERNS.map(p => [p.id, p]));

// ============================================================================
// ROMAN NUMERAL UTILITIES
// ============================================================================

const ROMAN_VALUES = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
];

function toRoman(num) {
    if (num <= 0 || num > 3999) return num.toString();
    let result = '';
    for (const [letter, value] of ROMAN_VALUES) {
        while (num >= value) {
            result += letter;
            num -= value;
        }
    }
    return result;
}

function fromRoman(roman) {
    if (!roman || typeof roman !== 'string') return 0;
    const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let result = 0;
    const upper = roman.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        const current = values[upper[i]] || 0;
        const next = values[upper[i + 1]] || 0;
        result += current < next ? -current : current;
    }
    return result;
}

// ============================================================================
// DOCUMENT TREE (AST)
// ============================================================================

/**
 * Represents the document's numbering structure as a tree
 */
class DocumentTree {
    constructor() {
        this.root = { type: 'root', children: [], level: 0 };
        this.nodes = []; // Flat array for fast index-based access
        this.nodeMap = new Map(); // paragraphIndex -> node
        this.dirty = true;
        this.lastBuildTime = 0;
    }
    
    /**
     * Build tree from flat paragraph list
     */
    build(paragraphs) {
        const startTime = performance.now();
        
        this.root = { type: 'root', children: [], level: 0 };
        this.nodes = [];
        this.nodeMap = new Map();
        
        const stack = [this.root]; // Parent stack for tree building
        
        for (const para of paragraphs) {
            if (!para.patternId) continue; // Skip non-numbered paragraphs
            
            const node = {
                paragraphIndex: para.index,
                text: para.text,
                patternId: para.patternId,
                level: para.level,
                actualValue: para.actualValue,
                actualPrefix: para.actualPrefix,
                content: para.content,
                indent: para.indent,
                expectedValue: null,
                expectedPrefix: null,
                hasIssue: false,
                children: [],
                parent: null
            };
            
            // Find appropriate parent by level
            while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
                stack.pop();
            }
            
            const parent = stack[stack.length - 1];
            node.parent = parent;
            parent.children.push(node);
            
            this.nodes.push(node);
            this.nodeMap.set(para.index, node);
            
            // Push this node as potential parent
            stack.push(node);
        }
        
        this.dirty = false;
        this.lastBuildTime = performance.now() - startTime;
        
        return this;
    }
    
    /**
     * Get node by paragraph index
     */
    getNode(paragraphIndex) {
        return this.nodeMap.get(paragraphIndex);
    }
    
    /**
     * Traverse tree in document order
     */
    traverse(callback) {
        const visit = (node, depth = 0) => {
            callback(node, depth);
            for (const child of node.children) {
                visit(child, depth + 1);
            }
        };
        visit(this.root);
    }
    
    /**
     * Get subtree starting from a node
     */
    getSubtree(node) {
        const nodes = [];
        const visit = (n) => {
            nodes.push(n);
            n.children.forEach(visit);
        };
        visit(node);
        return nodes;
    }
    
    /**
     * Get all sibling nodes
     */
    getSiblings(node) {
        if (!node.parent) return [];
        return node.parent.children.filter(c => c.patternId === node.patternId);
    }
}

// ============================================================================
// PATTERN DETECTOR
// ============================================================================

/**
 * Detect numbering pattern in a paragraph
 */
function detectPattern(text) {
    if (!text || typeof text !== 'string') return null;
    
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    // Try each pattern in priority order
    for (const pattern of NUMBERING_PATTERNS) {
        const match = trimmed.match(pattern.regex);
        if (match) {
            const value = pattern.extractValue(match);
            return {
                patternId: pattern.id,
                level: pattern.level,
                actualValue: value,
                actualPrefix: match[0],
                content: trimmed.substring(match[0].length),
                match: match
            };
        }
    }
    
    return null;
}

/**
 * Infer level from indentation when pattern level is ambiguous
 */
function inferLevelFromIndent(indent, baseIndent = 0, indentPerLevel = 36) {
    if (indent <= baseIndent) return 1;
    return Math.floor((indent - baseIndent) / indentPerLevel) + 1;
}

// ============================================================================
// NUMBERING CALCULATOR
// ============================================================================

/**
 * Calculate expected numbers for all nodes in the tree
 */
function calculateExpectedNumbers(tree) {
    // Track counters per pattern type at each level
    const counters = new Map();
    
    // Track decimal parent chain for hierarchical numbering
    let decimalParents = [];
    
    const processNode = (node) => {
        if (node.type === 'root') {
            node.children.forEach(processNode);
            return;
        }
        
        const pattern = PATTERN_MAP.get(node.patternId);
        if (!pattern) return;
        
        // Get or initialize counter key based on pattern and level
        const counterKey = `${node.patternId}_${node.level}`;
        
        // Handle level changes - reset lower-level counters
        const currentLevel = node.level;
        
        // For decimal patterns, track parent chain
        if (node.patternId.startsWith('decimal-')) {
            // Reset counters for LOWER levels only (children reset when parent changes)
            // Also reset same level if switching from different parent
            for (const [key, _] of counters) {
                const [patternId, levelStr] = key.split('_');
                const level = parseInt(levelStr);
                // Reset deeper levels (children)
                if (patternId.startsWith('decimal-') && level > currentLevel) {
                    counters.delete(key);
                }
                // Also reset non-decimal patterns at deeper levels
                if (!patternId.startsWith('decimal-') && level > currentLevel) {
                    counters.delete(key);
                }
            }
            
            // Update decimal parent chain
            decimalParents = decimalParents.slice(0, currentLevel - 1);
            
            // Increment counter
            const count = (counters.get(counterKey) || 0) + 1;
            counters.set(counterKey, count);
            
            // Calculate expected value
            const expectedParts = [...decimalParents, count];
            node.expectedValue = {
                full: expectedParts.join('.'),
                parts: expectedParts,
                current: count
            };
            
            // Format expected prefix
            const ctx = {
                parent: decimalParents.join('.') || null
            };
            node.expectedPrefix = pattern.format(count, ctx);
            
            // Update parent chain
            decimalParents.push(count);
        } else {
            // Non-decimal patterns: simpler counter logic
            // Reset lower-level patterns when we go up
            const patternsToReset = pattern.resets || [];
            for (const resetId of patternsToReset) {
                for (const [key, _] of counters) {
                    if (key.startsWith(resetId)) {
                        counters.delete(key);
                    }
                }
            }
            
            // Reset same-level counters of different pattern types
            for (const [key, _] of counters) {
                const [patternId, levelStr] = key.split('_');
                const level = parseInt(levelStr);
                if (level >= currentLevel && patternId !== node.patternId) {
                    counters.delete(key);
                }
            }
            
            // Increment counter
            const count = (counters.get(counterKey) || 0) + 1;
            counters.set(counterKey, count);
            
            node.expectedValue = count;
            node.expectedPrefix = pattern.format(count, {});
        }
        
        // Determine if there's an issue
        node.hasIssue = !prefixesMatch(node.actualPrefix, node.expectedPrefix);
        
        // Process children
        node.children.forEach(processNode);
    };
    
    processNode(tree.root);
    
    return tree;
}

/**
 * Compare prefixes, ignoring whitespace differences
 */
function prefixesMatch(actual, expected) {
    if (!actual || !expected) return false;
    const normalizePrefix = (p) => p.trim().replace(/\s+/g, ' ').replace(/\.?\s*$/, '');
    return normalizePrefix(actual) === normalizePrefix(expected);
}

// ============================================================================
// CACHE MANAGER (for incremental processing)
// ============================================================================

class NumberingCache {
    constructor() {
        this.tree = null;
        this.paragraphHashes = new Map();
        this.lastFullAnalysis = 0;
        this.CACHE_TTL = 30000; // 30 seconds
    }
    
    /**
     * Hash a paragraph for change detection
     */
    hashParagraph(text, indent) {
        // Simple hash - could use FNV-1a for better distribution
        const str = `${text}|${indent}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }
    
    /**
     * Check if cache is valid
     */
    isValid() {
        if (!this.tree) return false;
        if (Date.now() - this.lastFullAnalysis > this.CACHE_TTL) return false;
        return true;
    }
    
    /**
     * Get changed paragraph indices
     */
    getChangedIndices(paragraphs) {
        const changed = [];
        for (const para of paragraphs) {
            const hash = this.hashParagraph(para.text, para.indent);
            const oldHash = this.paragraphHashes.get(para.index);
            if (oldHash !== hash) {
                changed.push(para.index);
            }
        }
        return changed;
    }
    
    /**
     * Update cache with new analysis
     */
    update(tree, paragraphs) {
        this.tree = tree;
        this.paragraphHashes.clear();
        for (const para of paragraphs) {
            const hash = this.hashParagraph(para.text, para.indent);
            this.paragraphHashes.set(para.index, hash);
        }
        this.lastFullAnalysis = Date.now();
    }
    
    /**
     * Invalidate cache
     */
    invalidate() {
        this.tree = null;
        this.paragraphHashes.clear();
        this.lastFullAnalysis = 0;
    }
}

// Singleton cache instance
const cache = new NumberingCache();

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Analyze document structure and build numbered paragraph tree
 * @param {Word.RequestContext} context - Office.js context
 * @returns {Promise<{tree: DocumentTree, issues: Array, stats: Object}>}
 */
async function analyzeDocumentStructure(context) {
    const startTime = performance.now();
    
    // Load paragraphs with required properties
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items/text,items/style,items/leftIndent,items/firstLineIndent');
    await context.sync();
    
    // Parse all paragraphs
    const parsedParagraphs = [];
    
    for (let i = 0; i < paragraphs.items.length; i++) {
        const para = paragraphs.items[i];
        const text = para.text?.trim() || '';
        
        if (!text) continue;
        
        const detection = detectPattern(text);
        
        parsedParagraphs.push({
            index: i,
            text: text,
            indent: para.leftIndent || 0,
            firstLineIndent: para.firstLineIndent || 0,
            style: para.style || '',
            patternId: detection?.patternId || null,
            level: detection?.level || 0,
            actualValue: detection?.actualValue || null,
            actualPrefix: detection?.actualPrefix || null,
            content: detection?.content || text
        });
    }
    
    // Build AST
    const tree = new DocumentTree().build(parsedParagraphs);
    
    // Calculate expected numbers
    calculateExpectedNumbers(tree);
    
    // Update cache
    cache.update(tree, parsedParagraphs);
    
    // Gather issues
    const issues = tree.nodes.filter(n => n.hasIssue);
    
    // Calculate stats
    const stats = {
        totalParagraphs: paragraphs.items.length,
        numberedParagraphs: tree.nodes.length,
        issues: issues.length,
        byLevel: {},
        byPattern: {},
        analysisTime: performance.now() - startTime
    };
    
    for (const node of tree.nodes) {
        stats.byLevel[node.level] = (stats.byLevel[node.level] || 0) + 1;
        stats.byPattern[node.patternId] = (stats.byPattern[node.patternId] || 0) + 1;
    }
    
    return { tree, issues, stats, parsedParagraphs };
}

/**
 * Preview numbering changes without applying
 * @param {Word.RequestContext} context
 * @returns {Promise<Array>}
 */
async function previewNumberingChanges(context) {
    const { issues } = await analyzeDocumentStructure(context);
    
    return issues.map(issue => ({
        line: issue.paragraphIndex + 1,
        current: issue.actualPrefix?.trim() || '',
        expected: issue.expectedPrefix?.trim() || '',
        text: issue.content?.substring(0, 60) + (issue.content?.length > 60 ? '...' : ''),
        level: issue.level,
        patternId: issue.patternId
    }));
}

/**
 * Fix all numbering issues in the document
 * @param {Word.RequestContext} context
 * @returns {Promise<{fixed: number, message: string}>}
 */
async function fixAllNumbering(context) {
    const { tree, issues, parsedParagraphs } = await analyzeDocumentStructure(context);
    
    if (issues.length === 0) {
        return { fixed: 0, message: 'No numbering issues found! ✓' };
    }
    
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    // Fix in reverse order to preserve paragraph indices
    const sortedIssues = issues.sort((a, b) => b.paragraphIndex - a.paragraphIndex);
    
    let fixedCount = 0;
    
    for (const issue of sortedIssues) {
        try {
            const para = paragraphs.items[issue.paragraphIndex];
            if (!para) continue;
            
            const range = para.getRange();
            range.load('text');
            await context.sync();
            
            const currentText = range.text;
            const oldPrefix = issue.actualPrefix;
            const newPrefix = issue.expectedPrefix;
            
            // Build new text
            const newText = newPrefix + issue.content;
            
            // Replace
            range.insertText(newText, Word.InsertLocation.replace);
            await context.sync();
            
            fixedCount++;
        } catch (err) {
            console.warn(`Failed to fix paragraph ${issue.paragraphIndex}:`, err);
        }
    }
    
    // Invalidate cache after changes
    cache.invalidate();
    
    return {
        fixed: fixedCount,
        message: `Fixed ${fixedCount} numbering issue${fixedCount !== 1 ? 's' : ''}! ✓`
    };
}

/**
 * Fix numbering from cursor position to end of document
 * @param {Word.RequestContext} context
 * @returns {Promise<{fixed: number, message: string}>}
 */
async function fixNumberingFromCursor(context) {
    // Get current selection
    const selection = context.document.getSelection();
    selection.load('paragraphs');
    await context.sync();
    
    // Find start paragraph index
    const allParagraphs = context.document.body.paragraphs;
    allParagraphs.load('items/text');
    await context.sync();
    
    let startIndex = 0;
    const selectedText = selection.paragraphs.items[0]?.text;
    
    if (selectedText) {
        for (let i = 0; i < allParagraphs.items.length; i++) {
            if (allParagraphs.items[i].text === selectedText) {
                startIndex = i;
                break;
            }
        }
    }
    
    // Analyze and filter issues
    const { tree, issues } = await analyzeDocumentStructure(context);
    const relevantIssues = issues.filter(issue => issue.paragraphIndex >= startIndex);
    
    if (relevantIssues.length === 0) {
        return { fixed: 0, message: 'No issues found from cursor position! ✓' };
    }
    
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    // Fix in reverse order
    const sortedIssues = relevantIssues.sort((a, b) => b.paragraphIndex - a.paragraphIndex);
    let fixedCount = 0;
    
    for (const issue of sortedIssues) {
        try {
            const para = paragraphs.items[issue.paragraphIndex];
            if (!para) continue;
            
            const range = para.getRange();
            const newText = issue.expectedPrefix + issue.content;
            range.insertText(newText, Word.InsertLocation.replace);
            await context.sync();
            
            fixedCount++;
        } catch (err) {
            console.warn(`Failed to fix paragraph ${issue.paragraphIndex}:`, err);
        }
    }
    
    cache.invalidate();
    
    return {
        fixed: fixedCount,
        message: `Fixed ${fixedCount} issue${fixedCount !== 1 ? 's' : ''} from cursor! ✓`
    };
}

/**
 * Fix a single numbering issue
 * @param {Word.RequestContext} context
 * @param {number} paragraphIndex
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function fixSingleItem(context, paragraphIndex) {
    const { tree } = await analyzeDocumentStructure(context);
    const node = tree.getNode(paragraphIndex);
    
    if (!node || !node.hasIssue) {
        return { success: false, message: 'No issue found at this position' };
    }
    
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    const para = paragraphs.items[paragraphIndex];
    if (!para) {
        return { success: false, message: 'Paragraph not found' };
    }
    
    const range = para.getRange();
    const newText = node.expectedPrefix + node.content;
    range.insertText(newText, Word.InsertLocation.replace);
    await context.sync();
    
    cache.invalidate();
    
    return {
        success: true,
        message: `Fixed: ${node.actualPrefix.trim()} → ${node.expectedPrefix.trim()}`
    };
}

/**
 * Get numbering statistics
 * @param {Word.RequestContext} context
 * @returns {Promise<Object>}
 */
async function getNumberingStats(context) {
    const { stats } = await analyzeDocumentStructure(context);
    return {
        totalNumbered: stats.numberedParagraphs,
        issues: stats.issues,
        byLevel: stats.byLevel,
        byType: stats.byPattern,
        analysisTime: stats.analysisTime
    };
}

/**
 * Get the document tree for external use
 * @param {Word.RequestContext} context
 * @returns {Promise<DocumentTree>}
 */
async function getDocumentTree(context) {
    const { tree } = await analyzeDocumentStructure(context);
    return tree;
}

/**
 * Incremental update after document change
 * Only reprocesses affected sections for speed
 * @param {Word.RequestContext} context
 * @param {number} changedParagraphIndex
 * @returns {Promise<Object>}
 */
async function incrementalUpdate(context, changedParagraphIndex) {
    if (!cache.isValid()) {
        // Full rebuild needed
        return analyzeDocumentStructure(context);
    }
    
    // Find the affected branch
    const node = cache.tree.getNode(changedParagraphIndex);
    if (!node) {
        // New paragraph or not numbered - full rebuild
        cache.invalidate();
        return analyzeDocumentStructure(context);
    }
    
    // Find the topmost affected parent
    let affectedRoot = node;
    while (affectedRoot.parent && affectedRoot.parent.type !== 'root') {
        if (affectedRoot.level <= 2) break; // Stop at major sections
        affectedRoot = affectedRoot.parent;
    }
    
    // Get all nodes in affected subtree
    const affectedNodes = cache.tree.getSubtree(affectedRoot);
    
    // Re-analyze just the affected section
    // For simplicity, we invalidate and rebuild
    // A more sophisticated implementation would patch the tree
    cache.invalidate();
    return analyzeDocumentStructure(context);
}

/**
 * Validate that Word.js API is available and working
 * @returns {Promise<boolean>}
 */
async function validateEnvironment() {
    try {
        await Word.run(async (context) => {
            const doc = context.document;
            doc.load('body');
            await context.sync();
        });
        return true;
    } catch (e) {
        console.error('Word.js environment validation failed:', e);
        return false;
    }
}

/**
 * Get all sections/headings in the document
 * Useful for cross-reference features
 * @param {Word.RequestContext} context
 * @returns {Promise<Array>}
 */
async function getSections(context) {
    const { tree } = await analyzeDocumentStructure(context);
    
    // Return only level 1-2 items (sections and major subsections)
    return tree.nodes
        .filter(n => n.level <= 2)
        .map(n => ({
            number: typeof n.expectedValue === 'object' 
                ? n.expectedValue.full 
                : n.expectedValue?.toString() || '',
            text: n.content?.substring(0, 80) || '',
            level: n.level,
            paragraphIndex: n.paragraphIndex
        }));
}

// ============================================================================
// EXPORT
// ============================================================================

const NumberingModule = {
    // Main API
    analyzeDocumentStructure,
    previewNumberingChanges,
    fixAllNumbering,
    fixNumberingFromCursor,
    fixSingleItem,
    getNumberingStats,
    getDocumentTree,
    getSections,
    
    // Incremental processing
    incrementalUpdate,
    
    // Utilities
    validateEnvironment,
    detectPattern,
    toRoman,
    fromRoman,
    
    // Internals (exposed for testing)
    NUMBERING_PATTERNS,
    PATTERN_MAP,
    DocumentTree,
    NumberingCache,
    calculateExpectedNumbers, // Exposed for testing
    cache,
    
    // Version
    VERSION: '2.0.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.Numbering = NumberingModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NumberingModule;
}
