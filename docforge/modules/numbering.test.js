/**
 * DocForge - Smart Numbering Engine Tests
 * 
 * Run with: node numbering.test.js
 * Or in browser console with the add-in loaded
 */

// ============================================================================
// TEST FRAMEWORK (lightweight, no dependencies)
// ============================================================================

const TestRunner = {
    tests: [],
    results: { passed: 0, failed: 0, errors: [] },
    
    test(name, fn) {
        this.tests.push({ name, fn });
    },
    
    async run() {
        console.log('🧪 Running Numbering Engine Tests...\n');
        this.results = { passed: 0, failed: 0, errors: [] };
        
        for (const { name, fn } of this.tests) {
            try {
                await fn();
                console.log(`  ✅ ${name}`);
                this.results.passed++;
            } catch (e) {
                console.error(`  ❌ ${name}`);
                console.error(`     ${e.message}`);
                this.results.failed++;
                this.results.errors.push({ name, error: e.message });
            }
        }
        
        console.log(`\n📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        return this.results;
    }
};

function assert(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
}

function assertDeepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
}

// ============================================================================
// TESTS
// ============================================================================

// Set up global environment for Node.js
if (typeof window === 'undefined') {
    global.window = {};
    global.performance = {
        now: () => Date.now()
    };
}

// Get module reference
const Numbering = typeof require !== 'undefined' && typeof window === 'object' && !window.DocForge
    ? require('./numbering.js')
    : (typeof window !== 'undefined' ? window.DocForge?.Numbering : null);

if (!Numbering) {
    console.error('❌ Numbering module not loaded');
    if (typeof process !== 'undefined') process.exit(1);
}

// === Roman Numeral Tests ===

TestRunner.test('toRoman: converts basic numbers', () => {
    assertEqual(Numbering.toRoman(1), 'I');
    assertEqual(Numbering.toRoman(2), 'II');
    assertEqual(Numbering.toRoman(3), 'III');
    assertEqual(Numbering.toRoman(4), 'IV');
    assertEqual(Numbering.toRoman(5), 'V');
    assertEqual(Numbering.toRoman(9), 'IX');
    assertEqual(Numbering.toRoman(10), 'X');
});

TestRunner.test('toRoman: converts larger numbers', () => {
    assertEqual(Numbering.toRoman(50), 'L');
    assertEqual(Numbering.toRoman(100), 'C');
    assertEqual(Numbering.toRoman(500), 'D');
    assertEqual(Numbering.toRoman(1000), 'M');
    assertEqual(Numbering.toRoman(1999), 'MCMXCIX');
    assertEqual(Numbering.toRoman(2024), 'MMXXIV');
});

TestRunner.test('fromRoman: converts back correctly', () => {
    assertEqual(Numbering.fromRoman('I'), 1);
    assertEqual(Numbering.fromRoman('IV'), 4);
    assertEqual(Numbering.fromRoman('IX'), 9);
    assertEqual(Numbering.fromRoman('XIV'), 14);
    assertEqual(Numbering.fromRoman('XL'), 40);
    assertEqual(Numbering.fromRoman('MCMXCIX'), 1999);
});

TestRunner.test('fromRoman: case insensitive', () => {
    assertEqual(Numbering.fromRoman('iv'), 4);
    assertEqual(Numbering.fromRoman('xiv'), 14);
    assertEqual(Numbering.fromRoman('mcmxcix'), 1999);
});

TestRunner.test('Roman roundtrip: toRoman->fromRoman', () => {
    for (let i = 1; i <= 100; i++) {
        const roman = Numbering.toRoman(i);
        const back = Numbering.fromRoman(roman);
        assertEqual(back, i, `Failed for ${i} (roman: ${roman})`);
    }
});

// === Pattern Detection Tests ===

TestRunner.test('detectPattern: ARTICLE style', () => {
    const result = Numbering.detectPattern('ARTICLE I. DEFINITIONS');
    assert(result !== null, 'Should detect pattern');
    assertEqual(result.patternId, 'roman-article');
    assertEqual(result.level, 1);
    assertEqual(result.actualValue, 1);
    assert(result.content.includes('DEFINITIONS'));
});

TestRunner.test('detectPattern: ARTICLE II', () => {
    const result = Numbering.detectPattern('ARTICLE II SERVICES');
    assertEqual(result.patternId, 'roman-article');
    assertEqual(result.actualValue, 2);
});

TestRunner.test('detectPattern: ARTICLE X (10)', () => {
    const result = Numbering.detectPattern('ARTICLE X MISCELLANEOUS');
    assertEqual(result.patternId, 'roman-article');
    assertEqual(result.actualValue, 10);
});

TestRunner.test('detectPattern: Section 1. style', () => {
    const result = Numbering.detectPattern('1. DEFINITIONS');
    assert(result !== null);
    assertEqual(result.patternId, 'decimal-1');
    assertEqual(result.level, 1);
    assertEqual(result.actualValue.current, 1);
});

TestRunner.test('detectPattern: 1.1 decimal subsection', () => {
    const result = Numbering.detectPattern('1.1 Agreement means this document.');
    assert(result !== null);
    assertEqual(result.patternId, 'decimal-2');
    assertEqual(result.level, 2);
    assertEqual(result.actualValue.full, '1.1');
    assertEqual(result.actualValue.parts[0], 1);
    assertEqual(result.actualValue.parts[1], 1);
});

TestRunner.test('detectPattern: 1.1.1 deep decimal', () => {
    const result = Numbering.detectPattern('1.1.1 First subsection');
    assert(result !== null);
    assertEqual(result.patternId, 'decimal-3');
    assertEqual(result.level, 3);
    assertEqual(result.actualValue.full, '1.1.1');
});

TestRunner.test('detectPattern: 1.2.3.4 very deep decimal', () => {
    const result = Numbering.detectPattern('1.2.3.4 Very deep section');
    assert(result !== null);
    assertEqual(result.patternId, 'decimal-4');
    assertEqual(result.level, 4);
    assertEqual(result.actualValue.full, '1.2.3.4');
});

TestRunner.test('detectPattern: (a) alpha paren', () => {
    const result = Numbering.detectPattern('(a) the first item;');
    assert(result !== null);
    assertEqual(result.patternId, 'alpha-paren');
    assertEqual(result.level, 3);
    assertEqual(result.actualValue, 1); // a = 1
});

TestRunner.test('detectPattern: (b) alpha paren', () => {
    const result = Numbering.detectPattern('(b) the second item;');
    assertEqual(result.actualValue, 2); // b = 2
});

TestRunner.test('detectPattern: (z) alpha paren max', () => {
    const result = Numbering.detectPattern('(z) the last letter;');
    assertEqual(result.actualValue, 26); // z = 26
});

TestRunner.test('detectPattern: (i) roman paren', () => {
    const result = Numbering.detectPattern('(i) first Roman item');
    assert(result !== null);
    assertEqual(result.patternId, 'roman-paren');
    assertEqual(result.level, 4);
    assertEqual(result.actualValue, 1);
});

TestRunner.test('detectPattern: (ii) roman paren', () => {
    const result = Numbering.detectPattern('(ii) second Roman item');
    assertEqual(result.actualValue, 2);
});

TestRunner.test('detectPattern: (iii) roman paren', () => {
    const result = Numbering.detectPattern('(iii) third Roman item');
    assertEqual(result.actualValue, 3);
});

TestRunner.test('detectPattern: (iv) roman paren', () => {
    const result = Numbering.detectPattern('(iv) fourth Roman item');
    assertEqual(result.actualValue, 4);
});

TestRunner.test('detectPattern: (1) numeric paren', () => {
    const result = Numbering.detectPattern('(1) first numbered item');
    assert(result !== null);
    assertEqual(result.patternId, 'numeric-paren');
    assertEqual(result.level, 4);
    assertEqual(result.actualValue, 1);
});

TestRunner.test('detectPattern: (A) upper alpha paren', () => {
    const result = Numbering.detectPattern('(A) first upper letter');
    assert(result !== null);
    assertEqual(result.patternId, 'alpha-upper-paren');
    assertEqual(result.level, 5);
    assertEqual(result.actualValue, 1);
});

TestRunner.test('detectPattern: returns null for non-numbered', () => {
    const result = Numbering.detectPattern('This is just regular text.');
    assertEqual(result, null);
});

TestRunner.test('detectPattern: returns null for empty', () => {
    assertEqual(Numbering.detectPattern(''), null);
    assertEqual(Numbering.detectPattern(null), null);
    assertEqual(Numbering.detectPattern(undefined), null);
});

// === Document Tree Tests ===

TestRunner.test('DocumentTree: builds correctly from paragraphs', () => {
    const Tree = Numbering.DocumentTree;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: '1. Section One', patternId: 'decimal-1', level: 1, actualValue: { current: 1 }, actualPrefix: '1. ', content: 'Section One' },
        { index: 1, text: '1.1 Subsection', patternId: 'decimal-2', level: 2, actualValue: { current: 1 }, actualPrefix: '1.1 ', content: 'Subsection' },
        { index: 2, text: '1.2 Another', patternId: 'decimal-2', level: 2, actualValue: { current: 2 }, actualPrefix: '1.2 ', content: 'Another' },
        { index: 3, text: '2. Section Two', patternId: 'decimal-1', level: 1, actualValue: { current: 2 }, actualPrefix: '2. ', content: 'Section Two' }
    ];
    
    tree.build(paragraphs);
    
    assertEqual(tree.nodes.length, 4, 'Should have 4 nodes');
    assertEqual(tree.root.children.length, 2, 'Root should have 2 children (sections 1 and 2)');
    
    const section1 = tree.root.children[0];
    assertEqual(section1.children.length, 2, 'Section 1 should have 2 children');
});

TestRunner.test('DocumentTree: getNode by index', () => {
    const Tree = Numbering.DocumentTree;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 5, text: '1. Test', patternId: 'decimal-1', level: 1, actualValue: { current: 1 }, actualPrefix: '1. ', content: 'Test' }
    ];
    
    tree.build(paragraphs);
    
    const node = tree.getNode(5);
    assert(node !== undefined, 'Should find node at index 5');
    assertEqual(node.paragraphIndex, 5);
    
    const missing = tree.getNode(999);
    assertEqual(missing, undefined, 'Should return undefined for missing index');
});

TestRunner.test('DocumentTree: traverse in order', () => {
    const Tree = Numbering.DocumentTree;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: '1. A', patternId: 'decimal-1', level: 1, actualValue: { current: 1 }, actualPrefix: '1. ', content: 'A' },
        { index: 1, text: '1.1 B', patternId: 'decimal-2', level: 2, actualValue: { current: 1 }, actualPrefix: '1.1 ', content: 'B' },
        { index: 2, text: '2. C', patternId: 'decimal-1', level: 1, actualValue: { current: 2 }, actualPrefix: '2. ', content: 'C' }
    ];
    
    tree.build(paragraphs);
    
    const visited = [];
    tree.traverse((node) => {
        if (node.type !== 'root') {
            visited.push(node.content);
        }
    });
    
    assertDeepEqual(visited, ['A', 'B', 'C'], 'Should traverse in document order');
});

// === Number Calculation Tests ===

TestRunner.test('Expected numbers: sequential decimal sections', () => {
    const Tree = Numbering.DocumentTree;
    const calcExpected = Numbering.calculateExpectedNumbers;
    const tree = new Tree();
    
    // Simulate: 1. 2. 3. (but mislabeled as 1. 3. 4.)
    const paragraphs = [
        { index: 0, text: '1. First', patternId: 'decimal-1', level: 1, actualValue: { current: 1, full: '1', parts: [1] }, actualPrefix: '1. ', content: 'First' },
        { index: 1, text: '3. Second', patternId: 'decimal-1', level: 1, actualValue: { current: 3, full: '3', parts: [3] }, actualPrefix: '3. ', content: 'Second' }, // Wrong!
        { index: 2, text: '4. Third', patternId: 'decimal-1', level: 1, actualValue: { current: 4, full: '4', parts: [4] }, actualPrefix: '4. ', content: 'Third' } // Wrong!
    ];
    
    tree.build(paragraphs);
    calcExpected(tree); // Calculate expected numbers
    
    assertEqual(tree.nodes[0].expectedValue.current, 1);
    assertEqual(tree.nodes[1].expectedValue.current, 2); // Should be 2, not 3
    assertEqual(tree.nodes[2].expectedValue.current, 3); // Should be 3, not 4
    
    assert(!tree.nodes[0].hasIssue, 'First should be correct');
    assert(tree.nodes[1].hasIssue, 'Second should have issue');
    assert(tree.nodes[2].hasIssue, 'Third should have issue');
});

TestRunner.test('Expected numbers: nested decimal hierarchy', () => {
    const Tree = Numbering.DocumentTree;
    const calcExpected = Numbering.calculateExpectedNumbers;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: '1. Sec', patternId: 'decimal-1', level: 1, actualValue: { current: 1, full: '1', parts: [1] }, actualPrefix: '1. ', content: 'Sec', indent: 0 },
        { index: 1, text: '1.1 Sub', patternId: 'decimal-2', level: 2, actualValue: { current: 1, full: '1.1', parts: [1,1] }, actualPrefix: '1.1 ', content: 'Sub', indent: 36 },
        { index: 2, text: '1.3 Wrong', patternId: 'decimal-2', level: 2, actualValue: { current: 3, full: '1.3', parts: [1,3] }, actualPrefix: '1.3 ', content: 'Wrong', indent: 36 } // Should be 1.2
    ];
    
    tree.build(paragraphs);
    calcExpected(tree);
    
    assertEqual(tree.nodes[1].expectedValue.full, '1.1');
    assertEqual(tree.nodes[2].expectedValue.full, '1.2'); // Fixed
    assert(tree.nodes[2].hasIssue, 'Should detect the wrong number');
});

TestRunner.test('Expected numbers: alpha paren sequence', () => {
    const Tree = Numbering.DocumentTree;
    const calcExpected = Numbering.calculateExpectedNumbers;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: '(a) first', patternId: 'alpha-paren', level: 3, actualValue: 1, actualPrefix: '(a) ', content: 'first' },
        { index: 1, text: '(c) wrong', patternId: 'alpha-paren', level: 3, actualValue: 3, actualPrefix: '(c) ', content: 'wrong' }, // Should be (b)
        { index: 2, text: '(c) also wrong', patternId: 'alpha-paren', level: 3, actualValue: 3, actualPrefix: '(c) ', content: 'also wrong' } // Should be (c)
    ];
    
    tree.build(paragraphs);
    calcExpected(tree);
    
    assertEqual(tree.nodes[0].expectedValue, 1);
    assertEqual(tree.nodes[1].expectedValue, 2);
    assertEqual(tree.nodes[2].expectedValue, 3);
    
    assertEqual(tree.nodes[0].expectedPrefix, '(a) ');
    assertEqual(tree.nodes[1].expectedPrefix, '(b) ');
    assertEqual(tree.nodes[2].expectedPrefix, '(c) ');
});

TestRunner.test('Expected numbers: roman paren sequence', () => {
    const Tree = Numbering.DocumentTree;
    const calcExpected = Numbering.calculateExpectedNumbers;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: '(i) first', patternId: 'roman-paren', level: 4, actualValue: 1, actualPrefix: '(i) ', content: 'first' },
        { index: 1, text: '(ii) second', patternId: 'roman-paren', level: 4, actualValue: 2, actualPrefix: '(ii) ', content: 'second' },
        { index: 2, text: '(v) wrong', patternId: 'roman-paren', level: 4, actualValue: 5, actualPrefix: '(v) ', content: 'wrong' } // Should be (iii)
    ];
    
    tree.build(paragraphs);
    calcExpected(tree);
    
    assertEqual(tree.nodes[2].expectedValue, 3);
    assertEqual(tree.nodes[2].expectedPrefix, '(iii) ');
    assert(tree.nodes[2].hasIssue);
});

// === Edge Cases ===

TestRunner.test('Edge: empty document', () => {
    const Tree = Numbering.DocumentTree;
    const tree = new Tree();
    tree.build([]);
    
    assertEqual(tree.nodes.length, 0);
    assertEqual(tree.root.children.length, 0);
});

TestRunner.test('Edge: document with no numbered paragraphs', () => {
    const Tree = Numbering.DocumentTree;
    const tree = new Tree();
    
    const paragraphs = [
        { index: 0, text: 'Regular text', patternId: null, level: 0, actualValue: null, actualPrefix: null, content: 'Regular text' },
        { index: 1, text: 'More text', patternId: null, level: 0, actualValue: null, actualPrefix: null, content: 'More text' }
    ];
    
    tree.build(paragraphs);
    
    assertEqual(tree.nodes.length, 0);
});

TestRunner.test('Edge: mixed patterns preserve separate counters', () => {
    const Tree = Numbering.DocumentTree;
    const calcExpected = Numbering.calculateExpectedNumbers;
    const tree = new Tree();
    
    // 1. -> (a) -> (i)
    const paragraphs = [
        { index: 0, text: '1. Section', patternId: 'decimal-1', level: 1, actualValue: { current: 1, full: '1', parts: [1] }, actualPrefix: '1. ', content: 'Section' },
        { index: 1, text: '(a) first', patternId: 'alpha-paren', level: 3, actualValue: 1, actualPrefix: '(a) ', content: 'first' },
        { index: 2, text: '(i) sub', patternId: 'roman-paren', level: 4, actualValue: 1, actualPrefix: '(i) ', content: 'sub' },
        { index: 3, text: '(ii) sub2', patternId: 'roman-paren', level: 4, actualValue: 2, actualPrefix: '(ii) ', content: 'sub2' },
        { index: 4, text: '(b) second', patternId: 'alpha-paren', level: 3, actualValue: 2, actualPrefix: '(b) ', content: 'second' },
        { index: 5, text: '(i) new', patternId: 'roman-paren', level: 4, actualValue: 1, actualPrefix: '(i) ', content: 'new' } // Resets!
    ];
    
    tree.build(paragraphs);
    calcExpected(tree);
    
    // Roman numerals should reset when (b) starts
    assertEqual(tree.nodes[5].expectedValue, 1, 'Roman should reset after (b)');
    assert(!tree.nodes[5].hasIssue, 'Should not have issue since it correctly reset');
});

// === Cache Tests ===

TestRunner.test('Cache: initializes correctly', () => {
    const CacheClass = Numbering.NumberingCache;
    const testCache = new CacheClass();
    
    assertEqual(testCache.tree, null);
    assert(!testCache.isValid(), 'New cache should not be valid');
});

TestRunner.test('Cache: stores and validates', () => {
    const CacheClass = Numbering.NumberingCache;
    const Tree = Numbering.DocumentTree;
    
    const testCache = new CacheClass();
    const tree = new Tree();
    tree.build([]);
    
    const paragraphs = [{ index: 0, text: 'test', indent: 0 }];
    testCache.update(tree, paragraphs);
    
    assert(testCache.isValid(), 'Cache should be valid after update');
    assertEqual(testCache.tree, tree);
});

TestRunner.test('Cache: detects changes', () => {
    const CacheClass = Numbering.NumberingCache;
    const Tree = Numbering.DocumentTree;
    
    const testCache = new CacheClass();
    const tree = new Tree();
    tree.build([]);
    
    const originalParagraphs = [
        { index: 0, text: 'original', indent: 0 }
    ];
    
    testCache.update(tree, originalParagraphs);
    
    // No changes
    let changed = testCache.getChangedIndices(originalParagraphs);
    assertEqual(changed.length, 0, 'No changes when paragraphs same');
    
    // Text changed
    const modifiedParagraphs = [
        { index: 0, text: 'modified', indent: 0 }
    ];
    changed = testCache.getChangedIndices(modifiedParagraphs);
    assertEqual(changed.length, 1, 'Should detect text change');
    assertEqual(changed[0], 0);
});

TestRunner.test('Cache: invalidates correctly', () => {
    const CacheClass = Numbering.NumberingCache;
    const Tree = Numbering.DocumentTree;
    
    const testCache = new CacheClass();
    const tree = new Tree();
    tree.build([]);
    
    testCache.update(tree, []);
    assert(testCache.isValid());
    
    testCache.invalidate();
    assert(!testCache.isValid(), 'Should be invalid after invalidate()');
});

// === Performance Tests ===

TestRunner.test('Performance: pattern detection is fast', () => {
    const iterations = 10000;
    const testCases = [
        'ARTICLE I. DEFINITIONS',
        '1.1.1 Deep subsection with a lot of text that goes on for a while',
        '(a) first item with detailed description',
        '(iii) Roman numeral item',
        'Regular text without numbering that should return quickly'
    ];
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        for (const text of testCases) {
            Numbering.detectPattern(text);
        }
    }
    
    const elapsed = performance.now() - startTime;
    const perOp = elapsed / (iterations * testCases.length);
    
    console.log(`     Pattern detection: ${perOp.toFixed(4)}ms per operation`);
    assert(perOp < 0.1, `Pattern detection too slow: ${perOp}ms`);
});

TestRunner.test('Performance: tree building is fast', () => {
    const Tree = Numbering.DocumentTree;
    
    // Simulate 500 paragraphs (large legal document)
    const paragraphs = [];
    for (let i = 0; i < 500; i++) {
        const level = (i % 4) + 1;
        paragraphs.push({
            index: i,
            text: `${i}. Test paragraph`,
            patternId: `decimal-${level}`,
            level: level,
            actualValue: { current: i, full: `${i}`, parts: [i] },
            actualPrefix: `${i}. `,
            content: 'Test paragraph',
            indent: level * 36
        });
    }
    
    const startTime = performance.now();
    
    const tree = new Tree();
    tree.build(paragraphs);
    
    const elapsed = performance.now() - startTime;
    
    console.log(`     Tree build (500 paras): ${elapsed.toFixed(2)}ms`);
    assert(elapsed < 100, `Tree building too slow: ${elapsed}ms`);
});

// ============================================================================
// RUN TESTS
// ============================================================================

// Determine environment
const isNode = typeof process !== 'undefined' && process.versions?.node;
const isBrowser = typeof document !== 'undefined';

if (isNode) {
    // Auto-run in Node.js
    TestRunner.run().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    });
} else if (isBrowser) {
    // In browser, expose runner
    window.runNumberingTests = () => TestRunner.run();
    console.log('💡 Run tests with: runNumberingTests()');
} else {
    // Running in some other environment, auto-run
    TestRunner.run();
}
