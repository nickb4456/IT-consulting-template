/**
 * DocForge Compare Changes Engine - Unit Tests
 * 
 * Run with: node diff-engine.test.js
 */

// Simple test framework
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
}

function assertTrue(value, message = '') {
    if (!value) {
        throw new Error(message || 'Expected true but got false');
    }
}

// Mock DOM for Node.js environment
if (typeof document === 'undefined') {
    global.document = {
        createElement: (tag) => ({
            textContent: '',
            innerHTML: '',
            get innerHTML() { return this.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        })
    };
}

// Load the diff engine
const DiffEngine = require('./diff-engine.js');

// ============================================================================
// Tests
// ============================================================================

test('diffStrings - identical strings return equal', () => {
    const result = DiffEngine.diffStrings('hello world', 'hello world');
    assertEqual(result.length, 1);
    assertEqual(result[0].type, 'equal');
});

test('diffStrings - empty old string shows all as added', () => {
    const result = DiffEngine.diffStrings('', 'new text');
    assertEqual(result.length, 1);
    assertEqual(result[0].type, 'add');
    assertEqual(result[0].text, 'new text');
});

test('diffStrings - empty new string shows all as deleted', () => {
    const result = DiffEngine.diffStrings('old text', '');
    assertEqual(result.length, 1);
    assertEqual(result[0].type, 'delete');
    assertEqual(result[0].text, 'old text');
});

test('diffStrings - word change detected', () => {
    const result = DiffEngine.diffStrings('hello world', 'hello universe');
    assertTrue(result.some(s => s.type === 'delete' && s.text.includes('world')));
    assertTrue(result.some(s => s.type === 'add' && s.text.includes('universe')));
});

test('compareFields - detects modifications', () => {
    const oldFields = { 'Party Name': 'Acme Corp', 'Date': '2024-01-01' };
    const newFields = { 'Party Name': 'Acme Inc', 'Date': '2024-01-01' };
    
    const changes = DiffEngine.compareFields(oldFields, newFields);
    
    assertEqual(changes.length, 1);
    assertEqual(changes[0].type, 'modify');
    assertEqual(changes[0].field, 'Party Name');
    assertEqual(changes[0].oldValue, 'Acme Corp');
    assertEqual(changes[0].newValue, 'Acme Inc');
});

test('compareFields - detects additions', () => {
    const oldFields = { 'Party Name': 'Acme Corp' };
    const newFields = { 'Party Name': 'Acme Corp', 'Date': '2024-01-01' };
    
    const changes = DiffEngine.compareFields(oldFields, newFields);
    
    assertEqual(changes.length, 1);
    assertEqual(changes[0].type, 'add');
    assertEqual(changes[0].field, 'Date');
});

test('compareFields - detects deletions', () => {
    const oldFields = { 'Party Name': 'Acme Corp', 'Date': '2024-01-01' };
    const newFields = { 'Party Name': 'Acme Corp' };
    
    const changes = DiffEngine.compareFields(oldFields, newFields);
    
    assertEqual(changes.length, 1);
    assertEqual(changes[0].type, 'delete');
    assertEqual(changes[0].field, 'Date');
});

test('summarizeChanges - counts correctly', () => {
    const changes = [
        new DiffEngine.Change('add', 'Field1', null, 'value'),
        new DiffEngine.Change('modify', 'Field2', 'old', 'new'),
        new DiffEngine.Change('delete', 'Field3', 'deleted', null),
        new DiffEngine.Change('modify', 'Field4', 'foo', 'bar'),
    ];
    
    const summary = DiffEngine.summarizeChanges(changes);
    
    assertEqual(summary.total, 4);
    assertEqual(summary.additions, 1);
    assertEqual(summary.modifications, 2);
    assertEqual(summary.deletions, 1);
});

test('takeSnapshot - stores fields correctly', () => {
    DiffEngine.clearSnapshots();
    
    const fields = [
        { title: 'Company', value: 'Acme Inc' },
        { title: 'Date', value: '2024-01-15' }
    ];
    
    const snapshot = DiffEngine.takeSnapshot(fields);
    
    assertTrue(snapshot.id.startsWith('snap_'));
    assertTrue(snapshot.fields instanceof Map);
    assertEqual(snapshot.fields.get('Company'), 'Acme Inc');
    assertEqual(snapshot.fields.get('Date'), '2024-01-15');
});

test('diffAgainstLastSnapshot - works correctly', () => {
    DiffEngine.clearSnapshots();
    
    // Take initial snapshot
    const initialFields = [
        { title: 'Company', value: 'Acme Inc' },
        { title: 'Amount', value: '$1000' }
    ];
    DiffEngine.takeSnapshot(initialFields);
    
    // Current state with changes
    const currentFields = [
        { title: 'Company', value: 'Acme Corporation' },
        { title: 'Amount', value: '$1000' },
        { title: 'New Field', value: 'added' }
    ];
    
    const result = DiffEngine.diffAgainstLastSnapshot(currentFields);
    
    assertEqual(result.summary.total, 2); // 1 modify + 1 add
    assertEqual(result.summary.modifications, 1);
    assertEqual(result.summary.additions, 1);
});

test('diffToHTML - generates correct markup', () => {
    const segments = [
        { type: 'equal', text: 'Hello ' },
        { type: 'delete', text: 'world' },
        { type: 'add', text: 'universe' }
    ];
    
    const html = DiffEngine.diffToHTML(segments);
    
    assertTrue(html.includes('<del class="diff-delete">world</del>'));
    assertTrue(html.includes('<ins class="diff-add">universe</ins>'));
    assertTrue(html.includes('Hello '));
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n🧪 DocForge Diff Engine Tests\n');
console.log('='.repeat(50));

for (const { name, fn } of tests) {
    try {
        fn();
        passed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        failed++;
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}\n`);
    }
}

console.log('='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    process.exit(1);
}
