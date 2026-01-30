/**
 * DraftBridge Table of Contents Generator
 * 
 * STATUS: IN DEVELOPMENT - Hidden behind feature flag
 * 
 * Generates and updates table of contents in Word documents.
 * Currently limited: no page numbers, no hyperlinks.
 * 
 * @version 0.1.0
 */

/* global Word */

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if TOC feature is enabled
 * Enable via: DraftBridgeState.actions.enableFeature('toc')
 */
function isEnabled() {
    if (typeof DraftBridgeState !== 'undefined') {
        return DraftBridgeState.actions.isFeatureEnabled('toc');
    }
    return false;
}

// ============================================================================
// TOC Detection
// ============================================================================

/**
 * Detect headings in the document
 * @returns {Promise<Array>} Array of heading objects
 */
async function detectHeadings() {
    if (!isEnabled()) {
        throw new Error('TOC feature is not enabled');
    }
    
    return Word.run(async (context) => {
        const body = context.document.body;
        const paragraphs = body.paragraphs;
        paragraphs.load('items/style,items/text,items/outlineLevel');
        
        await context.sync();
        
        const headings = [];
        
        for (const para of paragraphs.items) {
            // Check if it's a heading style
            if (para.style && para.style.toLowerCase().includes('heading')) {
                headings.push({
                    text: para.text,
                    style: para.style,
                    level: para.outlineLevel || extractLevelFromStyle(para.style)
                });
            }
        }
        
        return headings;
    });
}

/**
 * Extract heading level from style name
 */
function extractLevelFromStyle(style) {
    const match = style.match(/(\d)/);
    return match ? parseInt(match[1]) : 1;
}

// ============================================================================
// TOC Generation
// ============================================================================

/**
 * Generate TOC text from headings
 * @param {Array} headings - Array of heading objects
 * @param {Object} options - Generation options
 * @returns {string} Formatted TOC text
 */
function generateTOCText(headings, options = {}) {
    const {
        includeLevel = 3,
        indent = '    ',
        showPageNumbers = false  // NOT IMPLEMENTED YET
    } = options;
    
    // Note: showPageNumbers not yet implemented - planned for future release
    
    const lines = [];
    
    for (const heading of headings) {
        if (heading.level <= includeLevel) {
            const indentation = indent.repeat(heading.level - 1);
            lines.push(`${indentation}${heading.text}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Insert TOC at cursor position
 * @param {Object} options - TOC options
 */
async function insertTOC(options = {}) {
    if (!isEnabled()) {
        throw new Error('TOC feature is not enabled');
    }
    
    const headings = await detectHeadings();
    const tocText = generateTOCText(headings, options);
    
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        
        // Insert TOC header
        selection.insertText('TABLE OF CONTENTS\n\n', Word.InsertLocation.replace);
        selection.insertText(tocText, Word.InsertLocation.end);
        
        await context.sync();
        
        return { success: true, headingCount: headings.length };
    });
}

/**
 * Update existing TOC
 * NOTE: Currently just regenerates - doesn't preserve formatting
 */
/**
 * Update existing TOC
 * NOTE: Currently just regenerates - doesn't preserve formatting
 * @returns {Promise<Object>} Update result
 */
async function updateTOC() {
    // TODO: Find existing TOC and update in place
    return insertTOC();
}

// ============================================================================
// Exports
// ============================================================================

const TOCGenerator = {
    isEnabled,
    detectHeadings,
    generateTOCText,
    insertTOC,
    updateTOC,
    
    // Feature status
    VERSION: '0.1.0',
    STATUS: 'development',
    LIMITATIONS: [
        'No page numbers',
        'No hyperlinks',
        'No automatic updates',
        'Limited style detection'
    ]
};

// Global export
if (typeof window !== 'undefined') {
    window.TOCGenerator = TOCGenerator;
}

export default TOCGenerator;
export { TOCGenerator };
