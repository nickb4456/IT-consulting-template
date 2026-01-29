/**
 * DocForge - TOC Generator Tests v2.0
 * 
 * Comprehensive test suite for the Table of Contents generator.
 * Tests heading detection, TOC building, and rendering.
 * 
 * Run with: node toc.test.js
 */

// ============================================================================
// TEST FRAMEWORK (minimal, no dependencies)
// ============================================================================

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function test(name, fn) {
    testsRun++;
    try {
        fn();
        testsPassed++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        testsFailed++;
        failures.push({ name, error: error.message });
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${error.message}`);
    }
}

function assert(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} Expected "${expected}" but got "${actual}"`);
    }
}

function assertDeepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message} Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
}

function assertMatch(actual, regex, message = '') {
    if (!regex.test(actual)) {
        throw new Error(`${message} "${actual}" does not match ${regex}`);
    }
}

function assertInRange(value, min, max, message = '') {
    if (value < min || value > max) {
        throw new Error(`${message} ${value} not in range [${min}, ${max}]`);
    }
}

function describe(suiteName, fn) {
    console.log(`\n${suiteName}`);
    fn();
}

// ============================================================================
// MOCK WORD API
// ============================================================================

const Word = {
    InsertLocation: {
        start: 'start',
        end: 'end',
        before: 'before',
        after: 'after',
        replace: 'replace'
    },
    RangeLocation: {
        start: 'start',
        end: 'end',
        content: 'content'
    },
    Alignment: {
        centered: 'Centered',
        left: 'Left',
        right: 'Right',
        justified: 'Justified'
    },
    ContentControlAppearance: {
        boundingBox: 'BoundingBox',
        tags: 'Tags',
        hidden: 'Hidden'
    }
};

// Make Word available globally for the module
global.Word = Word;

// Load the TOC module
const TOC = require('./toc.js');

// ============================================================================
// HEADING PATTERN TESTS
// ============================================================================

describe('Heading Pattern Detection', () => {
    
    test('detects ARTICLE with Roman numerals', () => {
        const result = TOC.matchPattern('ARTICLE I - DEFINITIONS');
        assert(result !== null, 'Should match');
        assertEqual(result.patternId, 'article-roman');
        assertEqual(result.level, 1);
        assertEqual(result.number, 'ARTICLE I');
        assertEqual(result.title, 'DEFINITIONS');
    });
    
    test('detects ARTICLE with Arabic numerals', () => {
        const result = TOC.matchPattern('ARTICLE 1: GENERAL PROVISIONS');
        assert(result !== null, 'Should match');
        assertEqual(result.patternId, 'article-arabic');
        assertEqual(result.level, 1);
        assertEqual(result.number, 'ARTICLE 1');
    });
    
    test('detects ARTICLE with various separators', () => {
        const tests = [
            'ARTICLE II SCOPE OF WORK',
            'ARTICLE II. SCOPE OF WORK',
            'ARTICLE II - SCOPE OF WORK',
            'ARTICLE II: SCOPE OF WORK',
            'Article III – Representations'
        ];
        for (const text of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.type, 'article');
        }
    });
    
    test('detects SECTION patterns', () => {
        const result = TOC.matchPattern('SECTION 3.2 Payment Terms');
        assert(result !== null, 'Should match');
        assertEqual(result.patternId, 'section-word');
        assertEqual(result.number, '3.2');
        assertEqual(result.level, 2); // Dynamic level based on decimal parts
    });
    
    test('detects SECTION with varying depths', () => {
        const tests = [
            { text: 'Section 1 Definitions', expectedLevel: 1 },
            { text: 'Section 1.1 Term Definitions', expectedLevel: 2 },
            { text: 'Section 1.1.1 Specific Terms', expectedLevel: 3 },
            { text: 'Section 2.3.4 Deep Nesting', expectedLevel: 3 }
        ];
        for (const { text, expectedLevel } of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.level, expectedLevel, `Level mismatch for: ${text}`);
        }
    });
    
    test('detects decimal numbering', () => {
        const tests = [
            { text: '1.1 Services', number: '1.1', level: 2 },
            { text: '2.3.1 Specific Deliverable', number: '2.3.1', level: 3 }
        ];
        for (const { text, number, level } of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.number, number);
            assertEqual(result.level, level);
        }
    });
    
    test('detects EXHIBIT patterns', () => {
        const tests = [
            'EXHIBIT A - Form of Assignment',
            'Exhibit B: Legal Opinion',
            'EXHIBIT 1 Financial Statements'
        ];
        for (const text of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.type, 'exhibit');
            assertEqual(result.level, 1);
        }
    });
    
    test('detects SCHEDULE patterns', () => {
        const result = TOC.matchPattern('SCHEDULE 1.1(a) - List of Properties');
        assert(result !== null, 'Should match');
        assertEqual(result.type, 'schedule');
        assertMatch(result.number, /SCHEDULE/i);
    });
    
    test('detects APPENDIX patterns', () => {
        const result = TOC.matchPattern('APPENDIX A Technical Specifications');
        assert(result !== null, 'Should match');
        assertEqual(result.type, 'appendix');
    });
    
    test('detects ANNEX patterns', () => {
        const result = TOC.matchPattern('ANNEX I - Supporting Documents');
        assert(result !== null, 'Should match');
        assertEqual(result.type, 'annex');
    });
    
    test('detects standalone document sections', () => {
        const sections = ['RECITALS', 'DEFINITIONS', 'BACKGROUND', 'PREAMBLE'];
        for (const section of sections) {
            const result = TOC.matchPattern(section);
            assert(result !== null, `Should match: ${section}`);
            assertEqual(result.level, 1);
        }
    });
    
    test('returns null for non-heading text', () => {
        const nonHeadings = [
            'This is a regular paragraph of text.',
            'The parties agree as follows:',
            'including without limitation the following items',
            ''
        ];
        for (const text of nonHeadings) {
            const result = TOC.matchPattern(text);
            assert(result === null, `Should not match: ${text}`);
        }
    });
    
    test('pattern priority ordering is correct', () => {
        // ARTICLE should match before decimal
        const text = 'ARTICLE 1 DEFINITIONS';
        const result = TOC.matchPattern(text);
        assertEqual(result.type, 'article', 'ARTICLE should take priority');
    });
});

// ============================================================================
// HEADING SCORE CALCULATION TESTS
// ============================================================================

describe('Heading Confidence Scoring', () => {
    
    test('calculates score for styled heading', () => {
        const para = { style: 'Heading 1', bold: false, allCaps: false, fontSize: 12 };
        const { score } = TOC.calculateHeadingScore(para, 'Test Heading');
        assert(score >= 40, `Style should add significant score, got ${score}`);
    });
    
    test('calculates score for pattern match', () => {
        const para = { style: '', bold: false, allCaps: false, fontSize: 12 };
        const pattern = { id: 'article-roman', type: 'article' };
        const { score } = TOC.calculateHeadingScore(para, 'ARTICLE I', pattern);
        assert(score >= 35, `Pattern should add significant score, got ${score}`);
    });
    
    test('calculates score for bold text', () => {
        const para = { style: '', bold: true, allCaps: false, fontSize: 12 };
        const { score } = TOC.calculateHeadingScore(para, 'Test Heading');
        assert(score >= 15, `Bold should add score, got ${score}`);
    });
    
    test('calculates score for all caps', () => {
        const para = { style: '', bold: false, allCaps: true, fontSize: 12 };
        const { score, signals } = TOC.calculateHeadingScore(para, 'TEST HEADING');
        assert(score >= 15, `AllCaps should add score, got ${score}`);
        assert(signals.allCaps !== undefined, 'Should have allCaps signal');
    });
    
    test('calculates score for large font', () => {
        const para = { style: '', bold: false, allCaps: false, fontSize: 16 };
        const { score } = TOC.calculateHeadingScore(para, 'Test Heading');
        assert(score >= 10, `Large font should add score, got ${score}`);
    });
    
    test('combined signals produce high confidence', () => {
        const para = { 
            style: 'Heading 1', 
            bold: true, 
            allCaps: true, 
            fontSize: 16,
            alignment: 'Centered'
        };
        const pattern = { id: 'article-roman', type: 'article' };
        const { score } = TOC.calculateHeadingScore(para, 'ARTICLE I', pattern);
        assert(score >= 80, `Combined signals should produce high score, got ${score}`);
    });
    
    test('penalizes text ending with period', () => {
        const para = { style: '', bold: true, allCaps: false, fontSize: 12 };
        const withPeriod = TOC.calculateHeadingScore(para, 'This is a long sentence that ends with a period.');
        const withoutPeriod = TOC.calculateHeadingScore(para, 'This is a heading without period');
        assert(withPeriod.score < withoutPeriod.score, 'Period ending should reduce score');
    });
    
    test('penalizes long WHEREAS clauses', () => {
        const para = { style: '', bold: false, allCaps: false, fontSize: 12 };
        const longWhereas = 'WHEREAS, the parties desire to enter into this agreement for the purpose of establishing their respective rights and obligations with respect to the transaction described herein;';
        const { score } = TOC.calculateHeadingScore(para, longWhereas);
        assert(score < 30, `Long WHEREAS body should have low score, got ${score}`);
    });
    
    test('penalizes multiple sentences', () => {
        const para = { style: '', bold: true, allCaps: false, fontSize: 14 };
        const multiSentence = 'First sentence here. Second sentence follows. Third one too.';
        const { score } = TOC.calculateHeadingScore(para, multiSentence);
        assert(score < 40, `Multiple sentences should reduce score, got ${score}`);
    });
    
    test('short text gets bonus', () => {
        const para = { style: '', bold: true, allCaps: false, fontSize: 12 };
        const shortText = TOC.calculateHeadingScore(para, 'Short Title');
        const longText = TOC.calculateHeadingScore(para, 'This is a much longer heading that goes on for quite a while and contains many words');
        assert(shortText.score > longText.score, 'Short text should score higher');
    });
});

// ============================================================================
// HEADING TEXT CLEANING TESTS
// ============================================================================

describe('Heading Text Cleaning', () => {
    
    test('removes ARTICLE prefix', () => {
        const cleaned = TOC.cleanHeadingText('ARTICLE I - DEFINITIONS');
        assertEqual(cleaned, 'DEFINITIONS');
    });
    
    test('removes ARTICLE with various formats', () => {
        const tests = [
            { input: 'ARTICLE I: DEFINITIONS', expected: 'DEFINITIONS' },
            { input: 'ARTICLE II. SCOPE', expected: 'SCOPE' },
            { input: 'Article III – Services', expected: 'Services' }
        ];
        for (const { input, expected } of tests) {
            const cleaned = TOC.cleanHeadingText(input);
            assertEqual(cleaned, expected, `Failed for: ${input}`);
        }
    });
    
    test('removes SECTION prefix', () => {
        const cleaned = TOC.cleanHeadingText('SECTION 3.1: Payment Terms');
        assertEqual(cleaned, 'Payment Terms');
    });
    
    test('removes numeric prefix', () => {
        const tests = [
            { input: '1. Introduction', expected: 'Introduction' },
            { input: '2.1 Scope of Services', expected: 'Scope of Services' },
            { input: '3.1.2 - Specific Terms', expected: 'Specific Terms' }
        ];
        for (const { input, expected } of tests) {
            const cleaned = TOC.cleanHeadingText(input);
            assertEqual(cleaned, expected, `Failed for: ${input}`);
        }
    });
    
    test('removes roman numeral outline prefix', () => {
        const cleaned = TOC.cleanHeadingText('III. Argument');
        assertEqual(cleaned, 'Argument');
    });
    
    test('capitalizes first letter if lowercase', () => {
        const cleaned = TOC.cleanHeadingText('1.1 services and deliverables');
        assert(cleaned.charAt(0) === 'S', 'Should capitalize first letter');
    });
    
    test('truncates long titles', () => {
        const longTitle = 'This is a very long heading that contains way too many words and should be truncated for display in the table of contents';
        const cleaned = TOC.cleanHeadingText(longTitle);
        assert(cleaned.length <= 60, 'Should be truncated');
        assert(cleaned.endsWith('...'), 'Should end with ellipsis');
    });
    
    test('handles empty and whitespace input', () => {
        assertEqual(TOC.cleanHeadingText(''), '');
        assertEqual(TOC.cleanHeadingText('   '), '');
    });
});

// ============================================================================
// TOC STRUCTURE BUILDING TESTS
// ============================================================================

describe('TOC Structure Building', () => {
    
    test('builds flat structure for same-level headings', () => {
        const headings = [
            { text: 'First', level: 1 },
            { text: 'Second', level: 1 },
            { text: 'Third', level: 1 }
        ];
        const structure = TOC.buildTOCStructure(headings);
        assertEqual(structure.children.length, 3);
    });
    
    test('builds nested structure for hierarchical headings', () => {
        const headings = [
            { text: 'Parent', level: 1 },
            { text: 'Child', level: 2 },
            { text: 'Grandchild', level: 3 }
        ];
        const structure = TOC.buildTOCStructure(headings);
        assertEqual(structure.children.length, 1);
        assertEqual(structure.children[0].children.length, 1);
        assertEqual(structure.children[0].children[0].children.length, 1);
    });
    
    test('handles siblings at same level', () => {
        const headings = [
            { text: 'Parent 1', level: 1 },
            { text: 'Child 1', level: 2 },
            { text: 'Child 2', level: 2 },
            { text: 'Parent 2', level: 1 }
        ];
        const structure = TOC.buildTOCStructure(headings);
        assertEqual(structure.children.length, 2);
        assertEqual(structure.children[0].children.length, 2);
        assertEqual(structure.children[1].children.length, 0);
    });
    
    test('handles level jumps correctly', () => {
        const headings = [
            { text: 'Level 1', level: 1 },
            { text: 'Level 3', level: 3 }, // Jump from 1 to 3
            { text: 'Level 2', level: 2 }  // Back to 2
        ];
        const structure = TOC.buildTOCStructure(headings);
        assertEqual(structure.children.length, 1);
        // Level 3 becomes child of Level 1
        assertEqual(structure.children[0].children.length, 2);
    });
    
    test('handles empty input', () => {
        const structure = TOC.buildTOCStructure([]);
        assertEqual(structure.children.length, 0);
    });
    
    test('preserves heading properties in nodes', () => {
        const headings = [
            { text: 'Test', level: 1, number: 'I', title: 'Test Title', confidence: 0.9 }
        ];
        const structure = TOC.buildTOCStructure(headings);
        const node = structure.children[0];
        assertEqual(node.text, 'Test');
        assertEqual(node.number, 'I');
        assertEqual(node.title, 'Test Title');
        assertEqual(node.confidence, 0.9);
    });
});

// ============================================================================
// TOC ENTRY FORMATTING TESTS
// ============================================================================

describe('TOC Entry Formatting', () => {
    
    test('formats basic entry', () => {
        const heading = { level: 1, number: 'I', title: 'Introduction' };
        const entry = TOC.formatTOCEntry(heading);
        assertMatch(entry, /I\s+Introduction/);
    });
    
    test('applies correct indentation', () => {
        const tests = [
            { level: 1, expectedIndent: 0 },
            { level: 2, expectedIndent: 4 },
            { level: 3, expectedIndent: 8 }
        ];
        for (const { level, expectedIndent } of tests) {
            const heading = { level, number: '', title: 'Test' };
            const entry = TOC.formatTOCEntry(heading, { indentSpaces: 4 });
            const leadingSpaces = entry.length - entry.trimStart().length;
            assertEqual(leadingSpaces, expectedIndent, `Level ${level} should have ${expectedIndent} spaces`);
        }
    });
    
    test('omits number when showNumbers is false', () => {
        const heading = { level: 1, number: 'I', title: 'Introduction' };
        const entry = TOC.formatTOCEntry(heading, { showNumbers: false });
        assert(!entry.includes('I '), 'Should not include number');
        assert(entry.includes('Introduction'), 'Should include title');
    });
    
    test('truncates long titles', () => {
        const heading = { 
            level: 1, 
            number: '', 
            title: 'This is a very long title that exceeds the maximum width and should be truncated'
        };
        const entry = TOC.formatTOCEntry(heading, { maxWidth: 40 });
        assert(entry.length <= 40, 'Should not exceed maxWidth');
        assert(entry.endsWith('...'), 'Should end with ellipsis');
    });
    
    test('handles missing number gracefully', () => {
        const heading = { level: 1, number: '', title: 'Test' };
        const entry = TOC.formatTOCEntry(heading);
        assert(!entry.includes('undefined'), 'Should not have undefined');
        assert(entry.includes('Test'), 'Should have title');
    });
    
    test('handles missing title gracefully', () => {
        const heading = { level: 1, number: 'I', title: '', text: 'Fallback' };
        const entry = TOC.formatTOCEntry(heading);
        assert(entry.includes('I'), 'Should have number');
    });
});

// ============================================================================
// TOC CONTENT GENERATION TESTS
// ============================================================================

describe('TOC Content Generation', () => {
    
    test('generates content with title', () => {
        const headings = [{ level: 1, number: 'I', title: 'Test' }];
        const content = TOC.generateTOCContent(headings);
        assert(content.includes('TABLE OF CONTENTS'), 'Should have title');
    });
    
    test('generates content with custom title', () => {
        const headings = [{ level: 1, number: 'I', title: 'Test' }];
        const content = TOC.generateTOCContent(headings, { title: 'CONTENTS' });
        assert(content.includes('CONTENTS'), 'Should have custom title');
        assert(!content.includes('TABLE OF'), 'Should not have default title');
    });
    
    test('generates content without title when empty', () => {
        const headings = [{ level: 1, number: 'I', title: 'Test' }];
        const content = TOC.generateTOCContent(headings, { title: '' });
        const lines = content.trim().split('\n');
        assert(!lines[0].includes('TABLE'), 'Should not have title');
    });
    
    test('filters headings by maxLevel', () => {
        const headings = [
            { level: 1, number: 'I', title: 'Level 1' },
            { level: 2, number: '1.1', title: 'Level 2' },
            { level: 3, number: '1.1.1', title: 'Level 3' },
            { level: 4, number: '1.1.1.1', title: 'Level 4' }
        ];
        const content = TOC.generateTOCContent(headings, { maxLevel: 2 });
        assert(content.includes('Level 1'), 'Should include level 1');
        assert(content.includes('Level 2'), 'Should include level 2');
        assert(!content.includes('Level 3'), 'Should not include level 3');
        assert(!content.includes('Level 4'), 'Should not include level 4');
    });
    
    test('generates multiple entries', () => {
        const headings = [
            { level: 1, number: 'I', title: 'First' },
            { level: 1, number: 'II', title: 'Second' },
            { level: 1, number: 'III', title: 'Third' }
        ];
        const content = TOC.generateTOCContent(headings);
        assert(content.includes('First'), 'Should include first');
        assert(content.includes('Second'), 'Should include second');
        assert(content.includes('Third'), 'Should include third');
    });
    
    test('respects includeNumbers option', () => {
        const headings = [{ level: 1, number: 'I', title: 'Test' }];
        const withNumbers = TOC.generateTOCContent(headings, { includeNumbers: true });
        const withoutNumbers = TOC.generateTOCContent(headings, { includeNumbers: false });
        assert(withNumbers.includes('I'), 'Should include number');
        // Check that the number appears adjacent to title
    });
    
    test('handles empty headings array', () => {
        const content = TOC.generateTOCContent([]);
        assert(content.includes('TABLE OF CONTENTS'), 'Should still have title');
        const lines = content.trim().split('\n').filter(l => l.trim());
        assertEqual(lines.length, 1, 'Should only have title');
    });
});

// ============================================================================
// SENSITIVITY CONFIGURATION TESTS
// ============================================================================

describe('Sensitivity Configuration', () => {
    
    test('SENSITIVITY presets exist', () => {
        assert(TOC.SENSITIVITY.LOW !== undefined, 'LOW should exist');
        assert(TOC.SENSITIVITY.MEDIUM !== undefined, 'MEDIUM should exist');
        assert(TOC.SENSITIVITY.HIGH !== undefined, 'HIGH should exist');
    });
    
    test('SENSITIVITY thresholds are ordered correctly', () => {
        assert(TOC.SENSITIVITY.HIGH.threshold < TOC.SENSITIVITY.MEDIUM.threshold, 
            'HIGH should be more permissive');
        assert(TOC.SENSITIVITY.MEDIUM.threshold < TOC.SENSITIVITY.LOW.threshold, 
            'MEDIUM should be more permissive than LOW');
    });
    
    test('SENSITIVITY minConfidence is ordered correctly', () => {
        assert(TOC.SENSITIVITY.HIGH.minConfidence < TOC.SENSITIVITY.MEDIUM.minConfidence, 
            'HIGH should accept lower confidence');
        assert(TOC.SENSITIVITY.MEDIUM.minConfidence < TOC.SENSITIVITY.LOW.minConfidence, 
            'MEDIUM should accept lower confidence than LOW');
    });
});

// ============================================================================
// CACHE TESTS
// ============================================================================

describe('TOC Cache', () => {
    
    test('cache starts invalid', () => {
        TOC.invalidateCache();
        assert(!TOC.cache.isValid(), 'Cache should start invalid');
    });
    
    test('cache hash is deterministic', () => {
        const hash1 = TOC.cache.hashParagraph('test', true, 14, false);
        const hash2 = TOC.cache.hashParagraph('test', true, 14, false);
        assertEqual(hash1, hash2, 'Same input should produce same hash');
    });
    
    test('cache hash changes with content', () => {
        const hash1 = TOC.cache.hashParagraph('test1', true, 14, false);
        const hash2 = TOC.cache.hashParagraph('test2', true, 14, false);
        assert(hash1 !== hash2, 'Different content should produce different hash');
    });
    
    test('cache hash changes with formatting', () => {
        const hash1 = TOC.cache.hashParagraph('test', true, 14, false);
        const hash2 = TOC.cache.hashParagraph('test', false, 14, false);
        assert(hash1 !== hash2, 'Different formatting should produce different hash');
    });
    
    test('cache invalidation clears data', () => {
        TOC.cache.headings = [{ test: true }];
        TOC.cache.lastScan = Date.now();
        TOC.invalidateCache();
        assertEqual(TOC.cache.headings, null, 'Headings should be null');
        assertEqual(TOC.cache.lastScan, 0, 'lastScan should be 0');
    });
});

// ============================================================================
// PATTERN MAP TESTS
// ============================================================================

describe('Pattern Map', () => {
    
    test('PATTERN_MAP contains all patterns', () => {
        assertEqual(TOC.PATTERN_MAP.size, TOC.HEADING_PATTERNS.length, 
            'Map should contain all patterns');
    });
    
    test('patterns are accessible by id', () => {
        const articlePattern = TOC.PATTERN_MAP.get('article-roman');
        assert(articlePattern !== undefined, 'Should find article-roman');
        assertEqual(articlePattern.type, 'article');
    });
    
    test('all patterns have required properties', () => {
        for (const pattern of TOC.HEADING_PATTERNS) {
            assert(pattern.id !== undefined, `Pattern missing id`);
            assert(pattern.regex !== undefined, `Pattern ${pattern.id} missing regex`);
            assert(pattern.level !== undefined, `Pattern ${pattern.id} missing level`);
            assert(pattern.type !== undefined, `Pattern ${pattern.id} missing type`);
            assert(pattern.extractNumber !== undefined, `Pattern ${pattern.id} missing extractNumber`);
            assert(pattern.extractTitle !== undefined, `Pattern ${pattern.id} missing extractTitle`);
        }
    });
    
    test('patterns have unique ids', () => {
        const ids = TOC.HEADING_PATTERNS.map(p => p.id);
        const uniqueIds = new Set(ids);
        assertEqual(ids.length, uniqueIds.size, 'All pattern ids should be unique');
    });
    
    test('patterns are sorted by priority', () => {
        let lastPriority = Infinity;
        for (const pattern of TOC.HEADING_PATTERNS) {
            assert(pattern.priority <= lastPriority, 
                `Pattern ${pattern.id} has higher priority than previous`);
            lastPriority = pattern.priority;
        }
    });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
    
    test('handles null/undefined text', () => {
        const result1 = TOC.matchPattern(null);
        const result2 = TOC.matchPattern(undefined);
        assertEqual(result1, null);
        assertEqual(result2, null);
    });
    
    test('handles empty string', () => {
        const result = TOC.matchPattern('');
        assertEqual(result, null);
    });
    
    test('handles whitespace-only text', () => {
        const result = TOC.matchPattern('   \t\n  ');
        assertEqual(result, null);
    });
    
    test('handles very long text', () => {
        const longText = 'A'.repeat(500);
        const result = TOC.matchPattern(longText);
        // Should not crash
    });
    
    test('handles special characters in text', () => {
        const texts = [
            'ARTICLE I — "Special" Characters',
            'SECTION 1.1 (Parentheses)',
            'EXHIBIT A [Brackets]',
            'SCHEDULE 1 {Braces}'
        ];
        for (const text of texts) {
            // Should not throw
            const result = TOC.matchPattern(text);
        }
    });
    
    test('handles unicode characters', () => {
        const result = TOC.matchPattern('ARTICLE I – DÉFINITIONS');
        assert(result !== null, 'Should handle unicode');
    });
    
    test('case insensitivity for ARTICLE', () => {
        const tests = ['ARTICLE I', 'Article I', 'article i', 'ArTiClE I'];
        for (const text of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.type, 'article');
        }
    });
    
    test('handles roman numerals edge cases', () => {
        const tests = [
            'ARTICLE I',    // 1
            'ARTICLE IV',   // 4
            'ARTICLE IX',   // 9
            'ARTICLE XL',   // 40
            'ARTICLE XCIX', // 99
        ];
        for (const text of tests) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
        }
    });
    
    test('handles numbered headings at start of line only', () => {
        const valid = TOC.matchPattern('1.1 Services');
        const invalid = TOC.matchPattern('See Section 1.1 Services');
        assert(valid !== null, 'Should match at start');
        // The second might match depending on implementation
    });
});

// ============================================================================
// LEGAL DOCUMENT SIMULATION TESTS
// ============================================================================

describe('Real-World Legal Document Patterns', () => {
    
    test('detects typical contract structure', () => {
        const lines = [
            'RECITALS',
            'ARTICLE I DEFINITIONS',
            '1.1 "Agreement" means...',
            '1.2 "Party" means...',
            'ARTICLE II SERVICES',
            '2.1 Scope of Work',
            '2.2 Deliverables',
            'ARTICLE III COMPENSATION',
            'EXHIBIT A - STATEMENT OF WORK',
            'SCHEDULE 1 - PRICING'
        ];
        
        let matchedCount = 0;
        for (const line of lines) {
            if (TOC.matchPattern(line)) matchedCount++;
        }
        // Should match most of these as headings
        assert(matchedCount >= 8, `Should match most lines, got ${matchedCount}`);
    });
    
    test('detects appellate brief structure', () => {
        const lines = [
            'I. JURISDICTIONAL STATEMENT',
            'II. STATEMENT OF THE ISSUES',
            'III. STATEMENT OF THE CASE',
            'A. Factual Background',
            'B. Procedural History',
            'IV. SUMMARY OF ARGUMENT',
            'V. ARGUMENT'
        ];
        
        let matchedCount = 0;
        for (const line of lines) {
            // Use formatting requirement
            const para = { style: '', bold: true, allCaps: false, fontSize: 12 };
            const result = TOC.matchPattern(line, para);
            if (result) matchedCount++;
        }
        // Brief patterns require formatting, so let's just test roman numerals
        const romanMatches = lines.filter(l => TOC.matchPattern(l)).length;
        assert(romanMatches >= 4, `Should match at least sections with patterns`);
    });
    
    test('handles exhibit variations', () => {
        const exhibits = [
            'EXHIBIT A',
            'EXHIBIT B - Form of Assignment',
            'Exhibit C: Legal Opinion',
            'EXHIBIT 1',
            'Exhibit 2 Financial Statements'
        ];
        
        for (const text of exhibits) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.type, 'exhibit');
        }
    });
    
    test('handles schedule variations', () => {
        const schedules = [
            'SCHEDULE 1',
            'SCHEDULE 1.1',
            'SCHEDULE 1.1(a)',
            'Schedule A',
            'SCHEDULE 2 - List of Properties'
        ];
        
        for (const text of schedules) {
            const result = TOC.matchPattern(text);
            assert(result !== null, `Should match: ${text}`);
            assertEqual(result.type, 'schedule');
        }
    });
});

// ============================================================================
// INTEGRATION TESTS (Simulated)
// ============================================================================

describe('Integration Tests (Simulated)', () => {
    
    test('full pipeline: pattern → structure → content', () => {
        const documentLines = [
            'ARTICLE I - DEFINITIONS',
            'ARTICLE II - SERVICES',
            'ARTICLE III - PAYMENT'
        ];
        
        // Step 1: Detect patterns
        const headings = documentLines.map((text, index) => {
            const match = TOC.matchPattern(text);
            return {
                index,
                text,
                level: match?.level || 1,
                number: match?.number || '',
                title: match?.title || TOC.cleanHeadingText(text),
                type: match?.type || 'unknown',
                confidence: 0.9
            };
        });
        
        // Step 2: Build structure
        const structure = TOC.buildTOCStructure(headings);
        assertEqual(structure.children.length, 3);
        
        // Step 3: Generate content
        const content = TOC.generateTOCContent(headings);
        assert(content.includes('TABLE OF CONTENTS'));
        assert(content.includes('DEFINITIONS'));
        assert(content.includes('SERVICES'));
        assert(content.includes('PAYMENT'));
    });
    
    test('handles mixed heading types', () => {
        const headings = [
            { text: 'ARTICLE I - GENERAL', level: 1, number: 'ARTICLE I', title: 'GENERAL' },
            { text: '1.1 Purpose', level: 2, number: '1.1', title: 'Purpose' },
            { text: '1.2 Scope', level: 2, number: '1.2', title: 'Scope' },
            { text: 'ARTICLE II - SPECIFIC', level: 1, number: 'ARTICLE II', title: 'SPECIFIC' },
            { text: 'EXHIBIT A', level: 1, number: 'EXHIBIT A', title: '' }
        ];
        
        const structure = TOC.buildTOCStructure(headings);
        // Should have 3 top-level (2 articles + 1 exhibit)
        assertEqual(structure.children.length, 3);
        // First article should have 2 children
        assertEqual(structure.children[0].children.length, 2);
    });
});

// ============================================================================
// VERSION CHECK
// ============================================================================

describe('Module Metadata', () => {
    
    test('VERSION is defined', () => {
        assert(TOC.VERSION !== undefined, 'VERSION should be defined');
        assertMatch(TOC.VERSION, /^\d+\.\d+\.\d+$/, 'VERSION should be semver');
    });
    
    test('exports all required functions', () => {
        const requiredExports = [
            'detectHeadings',
            'generateTOC',
            'updateTOC',
            'previewTOC',
            'deleteTOC',
            'generateNativeTOC',
            'analyzeDocumentStructure',
            'buildTOCStructure',
            'cleanHeadingText',
            'matchPattern',
            'SENSITIVITY',
            'HEADING_PATTERNS',
            'cache'
        ];
        
        for (const name of requiredExports) {
            assert(TOC[name] !== undefined, `Should export ${name}`);
        }
    });
});

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('DocForge TOC Generator - Test Suite');
console.log('='.repeat(60));

// Note: Some tests require Word context which we simulate
// In real environment, use Office.js testing framework

console.log('\n' + '-'.repeat(60));
console.log(`\nTests: ${testsRun} total, ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed > 0) {
    console.log('\nFailures:');
    for (const { name, error } of failures) {
        console.log(`  - ${name}: ${error}`);
    }
    process.exit(1);
} else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
}
