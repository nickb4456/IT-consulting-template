/**
 * DraftBridge Numbering Style Detector
 * 
 * Analyzes any Word document and extracts numbering patterns.
 * Import styles from existing docs, competitor templates, or court forms.
 * 
 * @version 1.0.0
 */

const DraftBridgeStyleDetector = (function() {
    'use strict';

    // Common legal numbering patterns
    const PATTERNS = {
        romanUpper: /^([IVXLCDM]+)\./,           // I. II. III.
        romanLower: /^\(([ivxlcdm]+)\)/,          // (i) (ii) (iii)
        alphaUpper: /^([A-Z])\./,                 // A. B. C.
        alphaLower: /^\(([a-z])\)/,               // (a) (b) (c)
        arabicDot: /^(\d+)\./,                    // 1. 2. 3.
        arabicParen: /^\((\d+)\)/,                // (1) (2) (3)
        decimalOutline: /^(\d+(?:\.\d+)*)\s/,     // 1.1 1.2 1.1.1
        articleRoman: /^ARTICLE\s+([IVXLCDM]+)/i, // ARTICLE I
        sectionSymbol: /^§\s*(\d+)/,              // § 1
    };

    /**
     * Scan document and detect all numbering styles
     */
    async function detectStyles() {
        return Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items/text,items/style,items/leftIndent,items/firstLineIndent,items/font');
            await context.sync();

            const detected = {
                levels: [],
                samples: [],
                confidence: 0
            };

            const levelMap = new Map(); // indent -> level info

            for (let i = 0; i < paragraphs.items.length; i++) {
                const para = paragraphs.items[i];
                const text = para.text.trim();
                
                if (!text) continue;

                // Detect pattern
                const pattern = detectPattern(text);
                if (!pattern) continue;

                // Calculate indent level
                const indent = Math.round(para.leftIndent / 18); // ~18pts per level
                
                // Track this level
                if (!levelMap.has(indent)) {
                    levelMap.set(indent, {
                        level: indent,
                        pattern: pattern.type,
                        samples: [],
                        indent: para.leftIndent,
                        firstLineIndent: para.firstLineIndent,
                        font: {
                            name: para.font?.name,
                            size: para.font?.size,
                            bold: para.font?.bold
                        }
                    });
                }

                // Add sample
                const levelInfo = levelMap.get(indent);
                if (levelInfo.samples.length < 3) {
                    levelInfo.samples.push({
                        text: text.substring(0, 50),
                        value: pattern.value
                    });
                }
            }

            // Convert to array sorted by level
            detected.levels = Array.from(levelMap.values())
                .sort((a, b) => a.level - b.level)
                .map((info, idx) => ({
                    level: idx + 1,
                    pattern: info.pattern,
                    indent: info.indent,
                    firstLineIndent: info.firstLineIndent,
                    font: info.font,
                    samples: info.samples
                }));

            // Calculate confidence
            detected.confidence = calculateConfidence(detected.levels);
            detected.samples = detected.levels.flatMap(l => l.samples);

            return detected;
        });
    }

    /**
     * Detect which pattern a line matches
     */
    function detectPattern(text) {
        for (const [type, regex] of Object.entries(PATTERNS)) {
            const match = text.match(regex);
            if (match) {
                return { type, value: match[1], full: match[0] };
            }
        }
        return null;
    }

    /**
     * Calculate confidence score for detection
     */
    function calculateConfidence(levels) {
        if (levels.length === 0) return 0;
        if (levels.length === 1) return 0.5;
        
        let score = 0.5;
        
        // More levels = more confidence
        score += Math.min(levels.length * 0.1, 0.3);
        
        // Consistent patterns = more confidence
        const hasMultipleSamples = levels.every(l => l.samples.length > 1);
        if (hasMultipleSamples) score += 0.2;
        
        return Math.min(score, 1);
    }

    /**
     * Convert detected styles to DraftBridge preset format
     */
    function toPreset(detected, name = 'Imported Style') {
        return {
            id: 'imported_' + Date.now(),
            name: name,
            scope: 'personal',
            description: 'Imported from document',
            importedAt: new Date().toISOString(),
            confidence: detected.confidence,
            levels: detected.levels.map(level => ({
                level: level.level,
                pattern: patternToConfig(level.pattern),
                indent: {
                    left: level.indent || (level.level - 1) * 36,
                    hanging: Math.abs(level.firstLineIndent) || 18,
                    firstLine: level.firstLineIndent > 0 ? level.firstLineIndent : 0
                },
                style: {
                    fontName: level.font?.name || 'Times New Roman',
                    fontSize: level.font?.size || 12,
                    bold: level.font?.bold || false
                },
                restartAfter: level.level > 1 ? level.level - 1 : null
            }))
        };
    }

    /**
     * Convert pattern type to preset config
     */
    function patternToConfig(patternType) {
        const configs = {
            romanUpper: { type: 'roman-upper', format: '{n}.' },
            romanLower: { type: 'roman-lower', format: '({n})' },
            alphaUpper: { type: 'alpha-upper', format: '{n}.' },
            alphaLower: { type: 'alpha-lower', format: '({n})' },
            arabicDot: { type: 'arabic', format: '{n}.' },
            arabicParen: { type: 'arabic', format: '({n})' },
            decimalOutline: { type: 'decimal-outline', format: '{n}' },
            articleRoman: { type: 'article-roman', format: 'ARTICLE {n}' },
            sectionSymbol: { type: 'arabic', format: '§ {n}' }
        };
        return configs[patternType] || { type: 'arabic', format: '{n}.' };
    }

    /**
     * Import from a specific selection
     */
    async function detectFromSelection() {
        return Word.run(async (context) => {
            const selection = context.document.getSelection();
            const paragraphs = selection.paragraphs;
            paragraphs.load('items/text,items/leftIndent,items/firstLineIndent,items/font');
            await context.sync();

            // Same detection logic but on selection only
            const detected = { levels: [], samples: [], confidence: 0 };
            const levelMap = new Map();

            for (const para of paragraphs.items) {
                const text = para.text.trim();
                if (!text) continue;

                const pattern = detectPattern(text);
                if (!pattern) continue;

                const indent = Math.round(para.leftIndent / 18);
                
                if (!levelMap.has(indent)) {
                    levelMap.set(indent, {
                        level: indent,
                        pattern: pattern.type,
                        samples: [{ text: text.substring(0, 50), value: pattern.value }],
                        indent: para.leftIndent,
                        firstLineIndent: para.firstLineIndent
                    });
                }
            }

            detected.levels = Array.from(levelMap.values())
                .sort((a, b) => a.level - b.level);
            detected.confidence = calculateConfidence(detected.levels);

            return detected;
        });
    }

    /**
     * Import from another open document
     */
    async function detectFromFile(file) {
        // For importing from a file, we'd need to:
        // 1. Open file as new document (or parse OOXML directly)
        // 2. Run detection
        // 3. Close document
        // This requires Office.js document handling or OOXML parsing
        
        // Placeholder - would need file picker integration
        throw new Error('File import requires file picker. Use detectStyles() on open document.');
    }

    /**
     * Quick analysis - just show what patterns exist
     */
    async function quickAnalysis() {
        const detected = await detectStyles();
        
        return {
            levelsFound: detected.levels.length,
            patterns: detected.levels.map(l => l.pattern),
            confidence: Math.round(detected.confidence * 100) + '%',
            canImport: detected.levels.length > 0,
            preview: detected.levels.map(l => 
                `Level ${l.level}: ${l.pattern} (e.g., "${l.samples[0]?.text || 'N/A'}")`
            )
        };
    }

    // Public API
    return {
        detectStyles,
        detectFromSelection,
        toPreset,
        quickAnalysis,
        PATTERNS
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgeStyleDetector;
}
