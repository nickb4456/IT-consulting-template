/**
 * DocForge Integration Test
 * 
 * Tests the full numbering flow with mock Word.js API
 * Can be run standalone in Node.js or in browser
 */

console.log('🧪 DocForge Integration Test\n');

// Mock Word.js API for testing outside of Office
if (typeof Word === 'undefined') {
    console.log('📦 Creating mock Word.js environment...\n');
    
    global.Word = {
        run: async (callback) => {
            const mockContext = createMockContext();
            await callback(mockContext);
        },
        InsertLocation: {
            replace: 'replace',
            start: 'start',
            end: 'end'
        }
    };
    
    global.window = global;
}

// Mock context with sample legal document
function createMockContext() {
    const sampleParagraphs = [
        { text: 'LEGAL SERVICES AGREEMENT', style: 'Title', leftIndent: 0 },
        { text: 'ARTICLE I DEFINITIONS', style: 'Heading1', leftIndent: 0 },
        { text: '1. Agreement means this Legal Services Agreement.', style: 'Normal', leftIndent: 0 },
        { text: '1.1 The term "Client" refers to the party receiving services.', style: 'Normal', leftIndent: 36 },
        { text: '1.2 The term "Provider" refers to the service provider.', style: 'Normal', leftIndent: 36 },
        { text: '1.3 The term "Services" shall mean the legal services described herein.', style: 'Normal', leftIndent: 36 },
        { text: '2. Scope of Services', style: 'Normal', leftIndent: 0 },
        { text: '2.1 Provider shall provide the following services:', style: 'Normal', leftIndent: 36 },
        { text: '(a) Legal consultation and advice;', style: 'Normal', leftIndent: 72 },
        { text: '(b) Document preparation and review;', style: 'Normal', leftIndent: 72 },
        { text: '(c) Representation in negotiations;', style: 'Normal', leftIndent: 72 },
        { text: '(i) Including contract negotiations;', style: 'Normal', leftIndent: 108 },
        { text: '(ii) And settlement discussions.', style: 'Normal', leftIndent: 108 },
        { text: '(d) Court appearances as needed.', style: 'Normal', leftIndent: 72 },
        { text: '2.3 Additional services may be provided upon request.', style: 'Normal', leftIndent: 36 }, // Wrong! Should be 2.2
        { text: 'ARTICLE III COMPENSATION', style: 'Heading1', leftIndent: 0 }, // Wrong! Should be ARTICLE II
        { text: '3. Payment Terms', style: 'Normal', leftIndent: 0 },
        { text: '3.1 Client shall pay Provider on a monthly basis.', style: 'Normal', leftIndent: 36 },
        { text: '4. Term and Termination', style: 'Normal', leftIndent: 0 },
        { text: '4.1 This Agreement shall commence on the Effective Date.', style: 'Normal', leftIndent: 36 }
    ];
    
    // Create mock paragraph objects
    const mockParagraphItems = sampleParagraphs.map((p, i) => ({
        text: p.text,
        style: p.style,
        leftIndent: p.leftIndent,
        firstLineIndent: 0,
        getRange: () => ({
            text: p.text,
            load: () => {},
            insertText: (newText, location) => {
                console.log(`  📝 Paragraph ${i}: "${p.text.substring(0,30)}..." → "${newText.substring(0,30)}..."`);
                p.text = newText;
            }
        })
    }));
    
    return {
        document: {
            body: {
                paragraphs: {
                    items: mockParagraphItems,
                    load: (props) => {
                        // Simulate async load
                    }
                },
                text: sampleParagraphs.map(p => p.text).join('\n')
            },
            getSelection: () => ({
                paragraphs: {
                    items: [mockParagraphItems[0]]
                },
                load: () => {}
            })
        },
        sync: async () => {
            // Simulate async sync
            await new Promise(r => setTimeout(r, 1));
        }
    };
}

// Run tests
async function runIntegrationTests() {
    // Load the numbering module
    const Numbering = typeof require !== 'undefined' 
        ? require('./numbering.js')
        : window.DocForge?.Numbering;
    
    if (!Numbering) {
        console.error('❌ Could not load numbering module');
        return;
    }
    
    console.log('✅ Numbering module loaded\n');
    console.log('-------------------------------------------');
    console.log('📄 Sample Document:');
    console.log('-------------------------------------------\n');
    
    // Test 1: Analyze document
    console.log('📊 Test 1: Analyze Document Structure\n');
    
    await Word.run(async (context) => {
        const { tree, issues, stats } = await Numbering.analyzeDocumentStructure(context);
        
        console.log('  Stats:');
        console.log(`    Total paragraphs: ${stats.totalParagraphs}`);
        console.log(`    Numbered items: ${stats.numberedParagraphs}`);
        console.log(`    Issues found: ${stats.issues}`);
        console.log(`    Analysis time: ${stats.analysisTime.toFixed(2)}ms`);
        console.log();
        
        console.log('  Tree structure:');
        tree.traverse((node, depth) => {
            if (node.type !== 'root') {
                const indent = '    '.repeat(depth);
                const status = node.hasIssue ? '⚠️' : '✓';
                console.log(`    ${indent}${status} ${node.actualPrefix || ''} (L${node.level})`);
            }
        });
        console.log();
    });
    
    // Test 2: Preview changes
    console.log('-------------------------------------------');
    console.log('🔍 Test 2: Preview Numbering Changes\n');
    
    await Word.run(async (context) => {
        const changes = await Numbering.previewNumberingChanges(context);
        
        if (changes.length === 0) {
            console.log('  No issues to fix!');
        } else {
            console.log('  Issues found:');
            changes.forEach((c, i) => {
                console.log(`    ${i+1}. Line ${c.line}: ${c.current} → ${c.expected}`);
                console.log(`       "${c.text}"`);
            });
        }
        console.log();
    });
    
    // Test 3: Fix all numbering
    console.log('-------------------------------------------');
    console.log('🔧 Test 3: Fix All Numbering\n');
    
    await Word.run(async (context) => {
        const result = await Numbering.fixAllNumbering(context);
        console.log(`  Result: ${result.message}`);
        console.log(`  Fixed: ${result.fixed} issues`);
        console.log();
    });
    
    // Test 4: Verify fix
    console.log('-------------------------------------------');
    console.log('✅ Test 4: Verify After Fix\n');
    
    await Word.run(async (context) => {
        const { stats } = await Numbering.analyzeDocumentStructure(context);
        console.log(`  Issues remaining: ${stats.issues}`);
        console.log(`  ${stats.issues === 0 ? '✓ All numbering fixed!' : '⚠️ Some issues remain'}`);
        console.log();
    });
    
    // Test 5: Pattern detection performance
    console.log('-------------------------------------------');
    console.log('⚡ Test 5: Performance Benchmark\n');
    
    const testPatterns = [
        'ARTICLE I. DEFINITIONS',
        '1.1.1 Deep subsection text here',
        '(a) First paragraph item',
        '(iii) Third roman numeral',
        'Regular text without numbering'
    ];
    
    const iterations = 10000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        for (const pattern of testPatterns) {
            Numbering.detectPattern(pattern);
        }
    }
    
    const elapsed = performance.now() - startTime;
    const perOp = elapsed / (iterations * testPatterns.length);
    
    console.log(`  ${iterations * testPatterns.length} pattern detections`);
    console.log(`  Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`  Per operation: ${perOp.toFixed(4)}ms`);
    console.log(`  ${perOp < 0.01 ? '✓ FAST!' : perOp < 0.1 ? '✓ Good' : '⚠️ Could be faster'}`);
    
    console.log('\n-------------------------------------------');
    console.log('🏁 Integration tests complete!');
    console.log('-------------------------------------------');
}

// Run
if (typeof module !== 'undefined' && module.exports) {
    runIntegrationTests();
} else {
    window.runIntegrationTests = runIntegrationTests;
    console.log('💡 Run tests with: runIntegrationTests()');
}
