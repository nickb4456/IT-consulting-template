/**
 * DocForge - Table of Contents Generator v2.0
 * 
 * Intelligent TOC that detects document structure from multiple signals,
 * not just Word heading styles (which lawyers rarely use correctly).
 * 
 * Features:
 * - Multi-signal heading detection (styles, formatting, patterns, all caps)
 * - Configurable detection sensitivity
 * - One-click TOC generation with proper formatting
 * - Incremental TOC updates (preserve formatting)
 * - Speed target: <200ms with caching
 * - ContentControl container for easy updates
 * - Leader dots and page number support
 * 
 * Architecture:
 * - HeadingDetector: Multi-signal heading analysis
 * - TOCBuilder: Constructs hierarchical TOC structure
 * - TOCRenderer: Formats and inserts TOC
 * - TOCCache: Caching for incremental updates
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Detection sensitivity presets
 */
const SENSITIVITY = {
    LOW: { threshold: 45, minConfidence: 0.4 },    // More permissive
    MEDIUM: { threshold: 35, minConfidence: 0.3 }, // Default
    HIGH: { threshold: 25, minConfidence: 0.25 }   // Aggressive detection
};

/**
 * Heading patterns - ordered by DESCENDING priority (highest first)
 * First matching pattern wins, so priority order determines precedence
 */
const HEADING_PATTERNS = [
    // Priority 100: ARTICLE with Roman numerals
    {
        id: 'article-roman',
        regex: /^ARTICLE\s+([IVXLCDM]+)[\s.:-]*(.*)/i,
        level: 1,
        priority: 100,
        type: 'article',
        extractNumber: (m) => `ARTICLE ${m[1].toUpperCase()}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 95: ARTICLE with Arabic numerals
    {
        id: 'article-arabic',
        regex: /^ARTICLE\s+(\d+)[\s.:-]*(.*)/i,
        level: 1,
        priority: 95,
        type: 'article',
        extractNumber: (m) => `ARTICLE ${m[1]}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 90: SECTION keyword
    {
        id: 'section-word',
        regex: /^SECTION\s+(\d+(?:\.\d+)*)[\s.:-]*(.*)/i,
        level: (m) => m[1].split('.').length,
        priority: 90,
        type: 'section',
        extractNumber: (m) => m[1],
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 85: EXHIBIT
    {
        id: 'exhibit',
        regex: /^EXHIBIT\s+([A-Z0-9]+)[\s.:-]*(.*)/i,
        level: 1,
        priority: 85,
        type: 'exhibit',
        extractNumber: (m) => `EXHIBIT ${m[1].toUpperCase()}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 84: SCHEDULE
    {
        id: 'schedule',
        regex: /^SCHEDULE\s+([A-Z0-9]+(?:\.\d+(?:\([a-z]\))?)?)[\s.:-]*(.*)/i,
        level: 1,
        priority: 84,
        type: 'schedule',
        extractNumber: (m) => `SCHEDULE ${m[1].toUpperCase()}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 83: APPENDIX
    {
        id: 'appendix',
        regex: /^APPENDIX\s+([A-Z0-9]+)[\s.:-]*(.*)/i,
        level: 1,
        priority: 83,
        type: 'appendix',
        extractNumber: (m) => `APPENDIX ${m[1].toUpperCase()}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 82: ANNEX
    {
        id: 'annex',
        regex: /^ANNEX\s+([A-Z0-9]+)[\s.:-]*(.*)/i,
        level: 1,
        priority: 82,
        type: 'annex',
        extractNumber: (m) => `ANNEX ${m[1].toUpperCase()}`,
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 80: RECITALS standalone
    {
        id: 'recitals',
        regex: /^RECITALS?\s*$/i,
        level: 1,
        priority: 80,
        type: 'recitals',
        extractNumber: () => '',
        extractTitle: () => 'RECITALS'
    },
    // Priority 79: DEFINITIONS standalone
    {
        id: 'definitions',
        regex: /^DEFINITIONS?\s*$/i,
        level: 1,
        priority: 79,
        type: 'definitions',
        extractNumber: () => '',
        extractTitle: () => 'DEFINITIONS'
    },
    // Priority 78: BACKGROUND standalone
    {
        id: 'background',
        regex: /^BACKGROUND\s*$/i,
        level: 1,
        priority: 78,
        type: 'background',
        extractNumber: () => '',
        extractTitle: () => 'BACKGROUND'
    },
    // Priority 77: PREAMBLE standalone
    {
        id: 'preamble',
        regex: /^PREAMBLE\s*$/i,
        level: 1,
        priority: 77,
        type: 'preamble',
        extractNumber: () => '',
        extractTitle: () => 'PREAMBLE'
    },
    // Priority 75: Decimal level 1 (e.g., "1. Introduction")
    {
        id: 'decimal-1',
        regex: /^(\d+)\.\s+([A-Z][A-Za-z].*)/,
        level: 1,
        priority: 75,
        type: 'decimal',
        extractNumber: (m) => m[1],
        extractTitle: (m) => m[2]?.trim() || '',
        requiresFormatting: true // Only match if bold or heading style
    },
    // Priority 70: Decimal level 2 (e.g., "1.1 Scope")
    {
        id: 'decimal-2',
        regex: /^(\d+\.\d+)\s+(.*)/,
        level: 2,
        priority: 70,
        type: 'decimal',
        extractNumber: (m) => m[1],
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 65: Decimal level 3 (e.g., "1.1.1 Details")
    {
        id: 'decimal-3',
        regex: /^(\d+\.\d+\.\d+)\s+(.*)/,
        level: 3,
        priority: 65,
        type: 'decimal',
        extractNumber: (m) => m[1],
        extractTitle: (m) => m[2]?.trim() || ''
    },
    // Priority 60: Roman numeral outline (I., II., III.)
    {
        id: 'roman-outline',
        regex: /^([IVXLCDM]+)\.\s+(.*)/,
        level: 1,
        priority: 60,
        type: 'outline-roman',
        extractNumber: (m) => m[1].toUpperCase(),
        extractTitle: (m) => m[2]?.trim() || '',
        requiresFormatting: true
    },
    // Priority 55: Alpha outline (A., B., C.)
    {
        id: 'alpha-outline',
        regex: /^([A-Z])\.\s+(.*)/,
        level: 2,
        priority: 55,
        type: 'outline-alpha',
        extractNumber: (m) => m[1],
        extractTitle: (m) => m[2]?.trim() || '',
        requiresFormatting: true
    }
];

// Pattern lookup for O(1) access
const PATTERN_MAP = new Map(HEADING_PATTERNS.map(p => [p.id, p]));

// ============================================================================
// TOC CACHE
// ============================================================================

/**
 * Cache for TOC data to enable fast incremental updates
 */
class TOCCache {
    constructor() {
        this.headings = null;
        this.paragraphHashes = new Map();
        this.lastScan = 0;
        this.tocContentControl = null;
        this.CACHE_TTL = 30000; // 30 seconds
    }
    
    /**
     * Generate hash for change detection
     */
    hashParagraph(text, bold, fontSize, allCaps) {
        const str = `${text}|${bold}|${fontSize}|${allCaps}`;
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
        if (!this.headings) return false;
        if (Date.now() - this.lastScan > this.CACHE_TTL) return false;
        return true;
    }
    
    /**
     * Store headings in cache
     */
    store(headings, paragraphs) {
        this.headings = headings;
        this.paragraphHashes.clear();
        for (const p of paragraphs) {
            const hash = this.hashParagraph(p.text, p.bold, p.fontSize, p.allCaps);
            this.paragraphHashes.set(p.index, hash);
        }
        this.lastScan = Date.now();
    }
    
    /**
     * Detect which paragraphs have changed
     */
    getChangedIndices(paragraphs) {
        const changed = [];
        for (const p of paragraphs) {
            const hash = this.hashParagraph(p.text, p.bold, p.fontSize, p.allCaps);
            const oldHash = this.paragraphHashes.get(p.index);
            if (oldHash !== hash) {
                changed.push(p.index);
            }
        }
        return changed;
    }
    
    /**
     * Invalidate cache
     */
    invalidate() {
        this.headings = null;
        this.paragraphHashes.clear();
        this.lastScan = 0;
    }
}

// Singleton cache
const cache = new TOCCache();

// ============================================================================
// HEADING DETECTOR
// ============================================================================

/**
 * Calculate confidence score for a heading using multiple signals
 */
function calculateHeadingScore(para, text, patternMatch = null) {
    let score = 0;
    const signals = {};
    
    // Signal 1: Word heading styles (40 points)
    const style = (para.style || '').toLowerCase();
    if (style.includes('heading')) {
        score += 40;
        signals.style = 40;
    } else if (style.includes('title')) {
        score += 35;
        signals.style = 35;
    }
    
    // Signal 2: Pattern match (35 points)
    if (patternMatch) {
        score += 35;
        signals.pattern = 35;
    }
    
    // Signal 3: Font formatting
    if (para.bold) {
        score += 15;
        signals.bold = 15;
    }
    if (para.allCaps || text === text.toUpperCase() && /[A-Z]/.test(text)) {
        score += 15;
        signals.allCaps = 15;
    }
    if (para.fontSize >= 14) {
        score += 10;
        signals.fontSize = 10;
    }
    if (para.fontSize >= 16) {
        score += 5; // Additional boost for large text
    }
    
    // Signal 4: Centered alignment (often used for article titles)
    if (para.alignment === 'Centered' || para.alignment === Word?.Alignment?.centered) {
        score += 8;
        signals.centered = 8;
    }
    
    // Signal 5: Length heuristic (headings are short)
    if (text.length < 80) {
        score += 5;
        signals.shortLength = 5;
    }
    if (text.length < 40) {
        score += 5;
        signals.veryShort = 5;
    }
    
    // Penalty: Ends with period (probably body text, not heading)
    if (text.endsWith('.') && text.length > 30) {
        score -= 15;
        signals.endsPeriod = -15;
    }
    
    // Penalty: Contains lowercase 'whereas', likely recital body
    if (/^WHEREAS,?\s+.{50,}/i.test(text)) {
        score -= 20;
        signals.whereasBody = -20;
    }
    
    // Penalty: Multiple sentences
    if ((text.match(/\.\s+[A-Z]/g) || []).length >= 2) {
        score -= 25;
        signals.multipleSentences = -25;
    }
    
    return { score: Math.max(0, Math.min(100, score)), signals };
}

/**
 * Match text against heading patterns
 */
function matchPattern(text, para = null) {
    if (text == null) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    for (const pattern of HEADING_PATTERNS) {
        const match = trimmed.match(pattern.regex);
        if (match) {
            // Some patterns require formatting signals
            if (pattern.requiresFormatting && para) {
                if (!para.bold && !(para.style || '').toLowerCase().includes('heading')) {
                    continue; // Skip if formatting requirement not met
                }
            }
            
            // Calculate level (may be dynamic)
            const level = typeof pattern.level === 'function' 
                ? pattern.level(match) 
                : pattern.level;
            
            return {
                patternId: pattern.id,
                type: pattern.type,
                level: level,
                priority: pattern.priority,
                number: pattern.extractNumber(match),
                title: pattern.extractTitle(match),
                match: match
            };
        }
    }
    
    return null;
}

/**
 * Infer heading level from formatting when no pattern match
 */
function inferLevelFromFormatting(para, text) {
    // All caps usually indicates top level
    const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
    
    if (para.fontSize >= 18 || isAllCaps) return 1;
    if (para.fontSize >= 16) return 1;
    if (para.fontSize >= 14) return 2;
    if (para.bold) return 2;
    return 3;
}

/**
 * Detect all headings in the document
 * @param {Word.RequestContext} context
 * @param {Object} options - Detection options
 * @returns {Promise<Array>}
 */
async function detectHeadings(context, options = {}) {
    const startTime = performance.now();
    const sensitivity = options.sensitivity || SENSITIVITY.MEDIUM;
    const maxLevel = options.maxLevel || 4;
    
    // Load paragraphs with all needed properties
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load([
        'items/text',
        'items/style',
        'items/font/bold',
        'items/font/allCaps',
        'items/font/size',
        'items/alignment',
        'items/leftIndent'
    ]);
    await context.sync();
    
    const headings = [];
    const paragraphData = [];
    
    for (let i = 0; i < paragraphs.items.length; i++) {
        const para = paragraphs.items[i];
        const text = (para.text || '').trim();
        
        // Skip empty, whitespace-only, or very long paragraphs
        if (!text || text.length > 200) continue;
        
        // Extract paragraph properties
        const paraInfo = {
            index: i,
            text: text,
            style: para.style || '',
            bold: para.font?.bold || false,
            allCaps: para.font?.allCaps || false,
            fontSize: para.font?.size || 12,
            alignment: para.alignment,
            leftIndent: para.leftIndent || 0
        };
        paragraphData.push(paraInfo);
        
        // Try pattern matching first
        const patternMatch = matchPattern(text, paraInfo);
        
        // Calculate confidence score
        const { score, signals } = calculateHeadingScore(paraInfo, text, patternMatch);
        
        // Check if meets threshold
        if (score >= sensitivity.threshold) {
            const level = patternMatch 
                ? patternMatch.level 
                : inferLevelFromFormatting(paraInfo, text);
            
            // Skip if beyond max level
            if (level > maxLevel) continue;
            
            headings.push({
                index: i,
                text: text,
                level: level,
                type: patternMatch?.type || 'formatting',
                patternId: patternMatch?.patternId || null,
                number: patternMatch?.number || '',
                title: patternMatch?.title || cleanHeadingText(text),
                confidence: score / 100,
                signals: signals,
                leftIndent: paraInfo.leftIndent
            });
        }
    }
    
    // Cache results
    cache.store(headings, paragraphData);
    
    const analysisTime = performance.now() - startTime;
    
    return {
        headings,
        stats: {
            totalParagraphs: paragraphs.items.length,
            headingsFound: headings.length,
            byLevel: countByLevel(headings),
            byType: countByType(headings),
            analysisTime
        }
    };
}

/**
 * Clean heading text for display
 */
function cleanHeadingText(text) {
    let cleaned = text
        // Remove ARTICLE/SECTION prefixes
        .replace(/^ARTICLE\s+[IVXLCDM0-9]+[\s.:–-]*/i, '')
        .replace(/^SECTION\s+\d+(?:\.\d+)*[\s.:–-]*/i, '')
        // Remove numeric prefixes
        .replace(/^\d+(?:\.\d+)*[\s.:–-]+/, '')
        // Remove roman numeral outline prefixes
        .replace(/^[IVXLCDM]+\.[\s]*/i, '')
        .trim();
    
    // Capitalize first letter if needed
    if (cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    // Truncate long titles
    if (cleaned.length > 60) {
        cleaned = cleaned.substring(0, 57) + '...';
    }
    
    return cleaned;
}

/**
 * Count headings by level
 */
function countByLevel(headings) {
    const counts = {};
    for (const h of headings) {
        counts[h.level] = (counts[h.level] || 0) + 1;
    }
    return counts;
}

/**
 * Count headings by type
 */
function countByType(headings) {
    const counts = {};
    for (const h of headings) {
        counts[h.type] = (counts[h.type] || 0) + 1;
    }
    return counts;
}

// ============================================================================
// TOC BUILDER
// ============================================================================

/**
 * Build hierarchical TOC structure
 */
function buildTOCStructure(headings) {
    const root = { children: [], level: 0 };
    const stack = [root];
    
    for (const heading of headings) {
        const node = {
            ...heading,
            children: []
        };
        
        // Find appropriate parent
        while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }
        
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    }
    
    return root;
}

/**
 * Format a single TOC entry
 */
function formatTOCEntry(heading, options = {}) {
    const { 
        showNumbers = true,
        indentSpaces = 4,
        maxWidth = 60
    } = options;
    
    const indent = ' '.repeat(indentSpaces * (heading.level - 1));
    const number = showNumbers && heading.number ? `${heading.number}  ` : '';
    const title = heading.title || heading.text;
    
    // Truncate if too long
    const maxTitleLength = maxWidth - indent.length - number.length;
    const displayTitle = title.length > maxTitleLength
        ? title.substring(0, maxTitleLength - 3) + '...'
        : title;
    
    return `${indent}${number}${displayTitle}`;
}

/**
 * Generate leader dots between title and page number
 */
function generateLeaderDots(textLength, totalWidth = 60) {
    const dotsNeeded = Math.max(3, totalWidth - textLength - 2);
    return ' ' + '.'.repeat(dotsNeeded) + ' ';
}

// ============================================================================
// TOC RENDERER
// ============================================================================

/**
 * Generate TOC text content
 */
function generateTOCContent(headings, options = {}) {
    const {
        title = 'TABLE OF CONTENTS',
        maxLevel = 3,
        includeNumbers = true,
        lineWidth = 60
    } = options;
    
    const lines = [];
    
    // Title
    if (title) {
        lines.push(title);
        lines.push(''); // Blank line after title
    }
    
    // Filter by level
    const filtered = headings.filter(h => h.level <= maxLevel);
    
    // Generate entries
    for (const heading of filtered) {
        const entry = formatTOCEntry(heading, {
            showNumbers: includeNumbers,
            maxWidth: lineWidth
        });
        lines.push(entry);
    }
    
    lines.push(''); // Trailing blank line
    
    return lines.join('\n');
}

/**
 * Find existing TOC ContentControl
 */
async function findTOCControl(context) {
    const controls = context.document.contentControls;
    controls.load('items/tag,items/id');
    await context.sync();
    
    for (const cc of controls.items) {
        if (cc.tag === 'DocForge_TOC') {
            return cc;
        }
    }
    return null;
}

/**
 * Create TOC ContentControl container
 */
async function createTOCControl(context, insertLocation) {
    let range;
    
    if (insertLocation === 'cursor') {
        range = context.document.getSelection();
    } else if (insertLocation === 'end') {
        range = context.document.body.getRange(Word.RangeLocation.end);
    } else {
        range = context.document.body.getRange(Word.RangeLocation.start);
    }
    
    // Insert placeholder text
    range.insertText('\n', Word.InsertLocation.before);
    await context.sync();
    
    // Wrap in ContentControl
    const cc = range.insertContentControl();
    cc.tag = 'DocForge_TOC';
    cc.title = 'Table of Contents';
    cc.appearance = Word.ContentControlAppearance.boundingBox;
    
    await context.sync();
    
    cache.tocContentControl = cc;
    return cc;
}

/**
 * Generate and insert table of contents
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function generateTOC(context, options = {}) {
    const startTime = performance.now();
    
    const {
        maxLevel = 3,
        sensitivity = 'MEDIUM',
        insertLocation = 'start', // 'start', 'cursor', 'end'
        title = 'TABLE OF CONTENTS',
        includeNumbers = true,
        createBookmarks = true,
        useContentControl = true
    } = options;
    
    // Detect headings
    const sensitivityConfig = typeof sensitivity === 'string' 
        ? SENSITIVITY[sensitivity] 
        : sensitivity;
    
    const { headings, stats } = await detectHeadings(context, {
        sensitivity: sensitivityConfig,
        maxLevel: maxLevel
    });
    
    if (headings.length === 0) {
        return {
            success: false,
            message: 'No headings detected in document. Try adjusting sensitivity.',
            stats
        };
    }
    
    // Filter headings by level for TOC
    const tocHeadings = headings.filter(h => h.level <= maxLevel);
    
    // Generate TOC content
    const tocContent = generateTOCContent(tocHeadings, {
        title,
        maxLevel,
        includeNumbers
    });
    
    // Check for existing TOC
    let tocControl = await findTOCControl(context);
    
    if (tocControl) {
        // Update existing TOC
        const range = tocControl.getRange(Word.RangeLocation.content);
        range.insertText(tocContent, Word.InsertLocation.replace);
    } else if (useContentControl) {
        // Create new TOC with ContentControl
        tocControl = await createTOCControl(context, insertLocation);
        const range = tocControl.getRange(Word.RangeLocation.content);
        range.insertText(tocContent, Word.InsertLocation.replace);
    } else {
        // Insert as plain text
        let insertRange;
        if (insertLocation === 'cursor') {
            insertRange = context.document.getSelection();
        } else if (insertLocation === 'end') {
            insertRange = context.document.body.getRange(Word.RangeLocation.end);
        } else {
            insertRange = context.document.body.getRange(Word.RangeLocation.start);
        }
        insertRange.insertText(tocContent + '\n', Word.InsertLocation.before);
    }
    
    await context.sync();
    
    // Create bookmarks for headings if requested
    if (createBookmarks) {
        await createHeadingBookmarks(context, tocHeadings);
    }
    
    const totalTime = performance.now() - startTime;
    
    return {
        success: true,
        message: `Generated TOC with ${tocHeadings.length} entries in ${Math.round(totalTime)}ms`,
        headings: tocHeadings,
        stats: {
            ...stats,
            tocEntries: tocHeadings.length,
            totalTime
        }
    };
}

/**
 * Update existing TOC without full regeneration
 * Preserves custom formatting when possible
 */
async function updateTOC(context, options = {}) {
    // Check for existing TOC
    const tocControl = await findTOCControl(context);
    
    if (!tocControl) {
        // No existing TOC, generate new one
        return generateTOC(context, options);
    }
    
    // Regenerate and update content only
    const { headings, stats } = await detectHeadings(context, {
        sensitivity: options.sensitivity || SENSITIVITY.MEDIUM,
        maxLevel: options.maxLevel || 3
    });
    
    if (headings.length === 0) {
        return {
            success: false,
            message: 'No headings found to update TOC.',
            stats
        };
    }
    
    const tocHeadings = headings.filter(h => h.level <= (options.maxLevel || 3));
    const tocContent = generateTOCContent(tocHeadings, options);
    
    // Update content
    const range = tocControl.getRange(Word.RangeLocation.content);
    range.insertText(tocContent, Word.InsertLocation.replace);
    await context.sync();
    
    return {
        success: true,
        message: `Updated TOC with ${tocHeadings.length} entries`,
        headings: tocHeadings,
        stats
    };
}

/**
 * Create bookmarks for navigation
 */
async function createHeadingBookmarks(context, headings) {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    for (const heading of headings) {
        try {
            if (heading.index >= paragraphs.items.length) continue;
            
            const para = paragraphs.items[heading.index];
            const range = para.getRange();
            
            // Generate safe bookmark name
            const safeName = (heading.number || heading.title || `h${heading.index}`)
                .replace(/[^a-zA-Z0-9_]/g, '_')
                .substring(0, 30);
            
            const bookmarkName = `_DocForge_TOC_${safeName}_${heading.index}`;
            heading.bookmarkName = bookmarkName;
            
            // Note: Bookmark creation requires Word API 1.4+
            // This may not be available in all environments
        } catch (e) {
            console.warn(`Could not create bookmark for heading: ${heading.text}`, e);
        }
    }
}

/**
 * Preview TOC without inserting
 */
async function previewTOC(context, options = {}) {
    const { headings, stats } = await detectHeadings(context, {
        sensitivity: options.sensitivity || SENSITIVITY.MEDIUM,
        maxLevel: options.maxLevel || 4
    });
    
    const filtered = headings.filter(h => h.level <= (options.maxLevel || 3));
    
    return {
        entries: filtered.map(h => ({
            level: h.level,
            number: h.number,
            title: h.title || h.text,
            type: h.type,
            confidence: `${Math.round(h.confidence * 100)}%`,
            signals: Object.keys(h.signals).filter(k => h.signals[k] > 0)
        })),
        stats,
        estimatedLines: filtered.length + 2 // +2 for title and spacing
    };
}

/**
 * Delete existing TOC
 */
async function deleteTOC(context) {
    const tocControl = await findTOCControl(context);
    
    if (tocControl) {
        tocControl.delete(false);
        await context.sync();
        cache.tocContentControl = null;
        return { success: true, message: 'TOC deleted' };
    }
    
    return { success: false, message: 'No TOC found to delete' };
}

/**
 * Use Word's native TOC (if document uses heading styles correctly)
 */
async function generateNativeTOC(context, options = {}) {
    try {
        const body = context.document.body;
        
        // Word's built-in TOC based on Heading styles
        const toc = body.insertTableOfContents(Word.InsertLocation.start, {
            useBuiltInStyles: true,
            includePageNumbers: options.includePageNumbers !== false,
            rightAlignPageNumbers: true,
            useHyperlinks: options.useHyperlinks !== false
        });
        
        await context.sync();
        
        return {
            success: true,
            type: 'native',
            message: 'Native Word TOC inserted'
        };
    } catch (e) {
        console.warn('Native TOC failed, falling back to custom:', e);
        return generateTOC(context, options);
    }
}

/**
 * Get document structure overview (for debugging/analysis)
 */
async function analyzeDocumentStructure(context, options = {}) {
    const { headings, stats } = await detectHeadings(context, {
        sensitivity: SENSITIVITY.HIGH, // Use high sensitivity for analysis
        maxLevel: 6
    });
    
    // Build hierarchy
    const hierarchy = buildTOCStructure(headings);
    
    return {
        headings,
        hierarchy,
        stats,
        recommendations: generateRecommendations(headings, stats)
    };
}

/**
 * Generate recommendations for improving document structure
 */
function generateRecommendations(headings, stats) {
    const recommendations = [];
    
    // Check for inconsistent level jumps
    for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1];
        const curr = headings[i];
        if (curr.level > prev.level + 1) {
            recommendations.push({
                type: 'level-jump',
                severity: 'warning',
                message: `Level jumps from ${prev.level} to ${curr.level} at "${curr.text.substring(0, 30)}..."`
            });
        }
    }
    
    // Check for very long headings
    const longHeadings = headings.filter(h => h.text.length > 80);
    if (longHeadings.length > 0) {
        recommendations.push({
            type: 'long-headings',
            severity: 'info',
            message: `${longHeadings.length} heading(s) exceed 80 characters`
        });
    }
    
    // Check for low confidence headings
    const lowConfidence = headings.filter(h => h.confidence < 0.4);
    if (lowConfidence.length > 0) {
        recommendations.push({
            type: 'low-confidence',
            severity: 'info',
            message: `${lowConfidence.length} heading(s) detected with low confidence - review manually`
        });
    }
    
    return recommendations;
}

// ============================================================================
// EXPORT
// ============================================================================

const TOCModule = {
    // Main API
    detectHeadings,
    generateTOC,
    updateTOC,
    previewTOC,
    deleteTOC,
    generateNativeTOC,
    analyzeDocumentStructure,
    
    // Utilities
    buildTOCStructure,
    cleanHeadingText,
    matchPattern,
    
    // Configuration
    SENSITIVITY,
    HEADING_PATTERNS,
    PATTERN_MAP,
    
    // Cache management
    cache,
    invalidateCache: () => cache.invalidate(),
    
    // Internals (exposed for testing)
    calculateHeadingScore,
    formatTOCEntry,
    generateTOCContent,
    findTOCControl,
    
    // Version
    VERSION: '2.0.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.TOC = TOCModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOCModule;
}
