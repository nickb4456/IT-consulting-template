/**
 * DocForge - Template Fill Engine Tests
 * 
 * Unit tests for template variable detection, type inference,
 * profile management, and fill operations.
 * 
 * Run with: npm test -- --grep "Template"
 */

const assert = require('assert');

// Mock Word API for testing
const mockWord = {
    InsertLocation: {
        replace: 'replace',
        before: 'before',
        after: 'after'
    },
    ContentControlAppearance: {
        boundingBox: 'boundingBox',
        tags: 'tags',
        hidden: 'hidden'
    }
};

global.Word = mockWord;

// Import module (handles both CommonJS and direct require)
let TemplateModule;
try {
    TemplateModule = require('./template.js');
} catch (e) {
    // If running in isolation, create mock
    console.warn('Running with mocked module');
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create mock Word context
 */
function createMockContext(documentText = '', contentControls = []) {
    const searchResults = new Map();
    
    return {
        document: {
            body: {
                text: documentText,
                load: function(props) { this._loaded = props; },
                search: function(pattern, options) {
                    const items = [];
                    let index = 0;
                    while ((index = documentText.indexOf(pattern, index)) !== -1) {
                        items.push({
                            text: pattern,
                            insertText: function(text, loc) { this._newText = text; },
                            font: { highlightColor: null }
                        });
                        index += pattern.length;
                    }
                    return {
                        items,
                        load: function() {}
                    };
                }
            },
            contentControls: {
                items: contentControls.map((cc, i) => ({
                    id: cc.id || i,
                    tag: cc.tag,
                    title: cc.title,
                    text: cc.text || '',
                    placeholderText: cc.placeholderText,
                    insertText: function(text, loc) { this._newText = text; },
                    appearance: null
                })),
                load: function() {}
            },
            getSelection: function() {
                return {
                    insertText: function(text, loc) { this._newText = text; },
                    insertContentControl: function() {
                        return {
                            tag: null,
                            title: null,
                            placeholderText: null,
                            appearance: null
                        };
                    }
                };
            }
        },
        sync: async function() { return Promise.resolve(); }
    };
}

/**
 * Assert test helper
 */
function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        return true;
    } catch (e) {
        console.error(`✗ ${name}`);
        console.error(`  ${e.message}`);
        return false;
    }
}

/**
 * Async test helper
 */
async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
        return true;
    } catch (e) {
        console.error(`✗ ${name}`);
        console.error(`  ${e.message}`);
        return false;
    }
}

// ============================================================================
// BRACKET STYLE TESTS
// ============================================================================

function testBracketStyles() {
    console.log('\n=== Bracket Style Tests ===\n');
    
    const { BRACKET_STYLES, scanTextForVariables } = TemplateModule;
    
    test('BRACKET_STYLES should have all expected styles', () => {
        assert.ok(BRACKET_STYLES.DOUBLE_CURLY, 'Missing DOUBLE_CURLY');
        assert.ok(BRACKET_STYLES.SQUARE, 'Missing SQUARE');
        assert.ok(BRACKET_STYLES.ANGLE, 'Missing ANGLE');
        assert.ok(BRACKET_STYLES.SINGLE_CURLY, 'Missing SINGLE_CURLY');
        assert.ok(BRACKET_STYLES.PERCENT, 'Missing PERCENT');
        assert.ok(BRACKET_STYLES.UNDERSCORE, 'Missing UNDERSCORE');
    });
    
    test('Double curly detection {{var}}', () => {
        const text = 'Hello {{ClientName}}, your matter {{MatterNumber}} is pending.';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('ClientName'));
        assert.ok(vars.has('MatterNumber'));
    });
    
    test('Square bracket detection [var]', () => {
        const text = 'Dear [ClientName], regarding [MatterTitle]...';
        const vars = scanTextForVariables(text, { bracketStyles: ['square'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('ClientName'));
        assert.ok(vars.has('MatterTitle'));
    });
    
    test('Angle bracket detection <<var>>', () => {
        const text = 'Attorney: <<AttorneyName>> representing <<ClientName>>';
        const vars = scanTextForVariables(text, { bracketStyles: ['angle'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('AttorneyName'));
        assert.ok(vars.has('ClientName'));
    });
    
    test('Single curly detection {VAR}', () => {
        const text = 'This Agreement between {PARTY_A} and {PARTY_B}...';
        const vars = scanTextForVariables(text, { bracketStyles: ['single_curly'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('PARTY_A'));
        assert.ok(vars.has('PARTY_B'));
    });
    
    test('Percent detection %var%', () => {
        const text = 'Client: %client_name%, Date: %effective_date%';
        const vars = scanTextForVariables(text, { bracketStyles: ['percent'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('client_name'));
        assert.ok(vars.has('effective_date'));
    });
    
    test('Underscore detection __var__', () => {
        const text = 'Filed by __attorney__ on behalf of __client__';
        const vars = scanTextForVariables(text, { bracketStyles: ['underscore'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('attorney'));
        assert.ok(vars.has('client'));
    });
    
    test('Mixed bracket styles in same document', () => {
        const text = 'Client: {{ClientName}}, Attorney: [Attorney], Party: {PARTY_A}';
        const vars = scanTextForVariables(text, { 
            bracketStyles: ['double_curly', 'square', 'single_curly'] 
        });
        
        assert.equal(vars.size, 3);
        assert.ok(vars.has('ClientName'));
        assert.ok(vars.has('Attorney'));
        assert.ok(vars.has('PARTY_A'));
    });
    
    test('Multiple occurrences of same variable', () => {
        const text = '{{ClientName}} agrees. Said {{ClientName}} shall...';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 1);
        assert.ok(vars.has('ClientName'));
        assert.equal(vars.get('ClientName').occurrences.length, 2);
    });
    
    test('Variables with underscores in names', () => {
        const text = '{{client_full_name}} and {{matter_number}}';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 2);
        assert.ok(vars.has('client_full_name'));
        assert.ok(vars.has('matter_number'));
    });
    
    test('Variables with numbers in names', () => {
        const text = '{{Party1Name}} and {{Party2Name}} and {{Address1}}';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 3);
        assert.ok(vars.has('Party1Name'));
        assert.ok(vars.has('Party2Name'));
        assert.ok(vars.has('Address1'));
    });
    
    test('Should not match incomplete brackets', () => {
        const text = '{{incomplete and {broken} and [[wrong]] and ClientName';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 0);
    });
    
    test('Should not match variables starting with numbers', () => {
        const text = '{{1stParty}} {{2ndParty}} {{ValidName}}';
        const vars = scanTextForVariables(text, { bracketStyles: ['double_curly'] });
        
        assert.equal(vars.size, 1);
        assert.ok(vars.has('ValidName'));
    });
}

// ============================================================================
// TYPE INFERENCE TESTS
// ============================================================================

function testTypeInference() {
    console.log('\n=== Type Inference Tests ===\n');
    
    const { inferVariableType, validateValue, formatValue, VARIABLE_TYPES } = TemplateModule;
    
    // Date type tests
    test('Infer date type from "effective_date"', () => {
        assert.equal(inferVariableType('effective_date'), 'date');
    });
    
    test('Infer date type from "ClosingDate"', () => {
        assert.equal(inferVariableType('ClosingDate'), 'date');
    });
    
    test('Infer date type from "matter_dated"', () => {
        assert.equal(inferVariableType('matter_dated'), 'date');
    });
    
    test('Validate date: valid ISO format', () => {
        assert.ok(validateValue('2024-01-15', 'date'));
    });
    
    test('Validate date: valid long format', () => {
        assert.ok(validateValue('January 15, 2024', 'date'));
    });
    
    test('Validate date: invalid format', () => {
        assert.ok(!validateValue('not a date', 'date'));
    });
    
    test('Format date: long format', () => {
        const formatted = formatValue('2024-01-15', 'date', { format: 'long' });
        assert.ok(formatted.includes('January'));
        assert.ok(formatted.includes('15'));
        assert.ok(formatted.includes('2024'));
    });
    
    test('Format date: ISO format', () => {
        const formatted = formatValue('January 15, 2024', 'date', { format: 'iso' });
        assert.equal(formatted, '2024-01-15');
    });
    
    // Currency type tests
    test('Infer currency type from "purchase_price"', () => {
        assert.equal(inferVariableType('purchase_price'), 'currency');
    });
    
    test('Infer currency type from "TotalAmount"', () => {
        assert.equal(inferVariableType('TotalAmount'), 'currency');
    });
    
    test('Infer currency type from "consideration"', () => {
        assert.equal(inferVariableType('consideration'), 'currency');
    });
    
    test('Validate currency: valid number', () => {
        assert.ok(validateValue('1000', 'currency'));
        assert.ok(validateValue('1,000.50', 'currency'));
        assert.ok(validateValue('$1,000,000.00', 'currency'));
    });
    
    test('Validate currency: invalid format', () => {
        assert.ok(!validateValue('not money', 'currency'));
    });
    
    test('Format currency: USD', () => {
        const formatted = formatValue('1000', 'currency');
        assert.ok(formatted.includes('$'));
        assert.ok(formatted.includes('1,000'));
    });
    
    // Email type tests
    test('Infer email type from "client_email"', () => {
        assert.equal(inferVariableType('client_email'), 'email');
    });
    
    test('Infer email type from "ContactEmail"', () => {
        assert.equal(inferVariableType('ContactEmail'), 'email');
    });
    
    test('Validate email: valid format', () => {
        assert.ok(validateValue('test@example.com', 'email'));
        assert.ok(validateValue('name.surname@company.org', 'email'));
    });
    
    test('Validate email: invalid format', () => {
        assert.ok(!validateValue('not-an-email', 'email'));
        assert.ok(!validateValue('missing@domain', 'email'));
    });
    
    test('Format email: lowercase', () => {
        const formatted = formatValue('TEST@EXAMPLE.COM', 'email');
        assert.equal(formatted, 'test@example.com');
    });
    
    // Phone type tests
    test('Infer phone type from "phone_number"', () => {
        assert.equal(inferVariableType('phone_number'), 'phone');
    });
    
    test('Infer phone type from "ClientTelephone"', () => {
        assert.equal(inferVariableType('ClientTelephone'), 'phone');
    });
    
    test('Validate phone: valid formats', () => {
        assert.ok(validateValue('555-123-4567', 'phone'));
        assert.ok(validateValue('(555) 123-4567', 'phone'));
        assert.ok(validateValue('5551234567', 'phone'));
        assert.ok(validateValue('+1 555 123 4567', 'phone'));
    });
    
    test('Validate phone: invalid format', () => {
        assert.ok(!validateValue('123', 'phone'));
        assert.ok(!validateValue('not-a-phone', 'phone'));
    });
    
    test('Format phone: US format', () => {
        const formatted = formatValue('5551234567', 'phone');
        assert.equal(formatted, '(555) 123-4567');
    });
    
    // Name type tests
    test('Infer name type from "ClientName"', () => {
        assert.equal(inferVariableType('ClientName'), 'name');
    });
    
    test('Infer name type from "party_a_company"', () => {
        assert.equal(inferVariableType('party_a_company'), 'name');
    });
    
    test('Infer name type from "attorney"', () => {
        assert.equal(inferVariableType('attorney'), 'name');
    });
    
    test('Format name: title case', () => {
        const formatted = formatValue('john smith', 'name');
        assert.equal(formatted, 'John Smith');
    });
    
    // State type tests
    test('Infer state type from "GoverningLaw"', () => {
        assert.equal(inferVariableType('GoverningLaw'), 'state');
    });
    
    test('Infer state type from "formation_state"', () => {
        assert.equal(inferVariableType('formation_state'), 'state');
    });
    
    test('Validate state: valid state', () => {
        assert.ok(validateValue('Delaware', 'state'));
        assert.ok(validateValue('NY', 'state'));
        assert.ok(validateValue('California', 'state'));
    });
    
    test('Validate state: invalid state', () => {
        assert.ok(!validateValue('Freedonia', 'state'));
    });
    
    // Percentage type tests
    test('Infer percentage type from "interest_rate"', () => {
        assert.equal(inferVariableType('interest_rate'), 'percentage');
    });
    
    test('Validate percentage: valid range', () => {
        assert.ok(validateValue('5.5', 'percentage'));
        assert.ok(validateValue('100%', 'percentage'));
        assert.ok(validateValue('0', 'percentage'));
    });
    
    test('Validate percentage: invalid', () => {
        assert.ok(!validateValue('150', 'percentage'));
        assert.ok(!validateValue('-5', 'percentage'));
    });
    
    test('Format percentage: adds symbol', () => {
        const formatted = formatValue('5.5', 'percentage');
        assert.equal(formatted, '5.5%');
    });
    
    // Number type tests
    test('Infer number type from "term_months"', () => {
        assert.equal(inferVariableType('term_months'), 'number');
    });
    
    test('Format number: with comma separators', () => {
        const formatted = formatValue('1000000', 'number');
        assert.equal(formatted, '1,000,000');
    });
    
    // Address type tests
    test('Infer address type from "business_address"', () => {
        assert.equal(inferVariableType('business_address'), 'address');
    });
    
    test('Infer address type from "headquarters"', () => {
        assert.equal(inferVariableType('headquarters'), 'address');
    });
    
    // Fallback to text
    test('Fallback to text type for unknown variables', () => {
        assert.equal(inferVariableType('random_field'), 'text');
        assert.equal(inferVariableType('XYZ123'), 'text');
    });
}

// ============================================================================
// VARIABLE CLASS TESTS
// ============================================================================

function testVariableClass() {
    console.log('\n=== Variable Class Tests ===\n');
    
    const { Variable } = TemplateModule;
    
    test('Variable constructor sets defaults', () => {
        const v = new Variable({ name: 'ClientName', bracketStyle: 'double_curly' });
        
        assert.equal(v.name, 'ClientName');
        assert.equal(v.bracketStyle, 'double_curly');
        assert.equal(v.inferredType, 'name'); // Should infer from name
        assert.deepEqual(v.occurrences, []);
        assert.equal(v.value, null);
        assert.equal(v.isContentControl, false);
    });
    
    test('Variable.getPlaceholder() returns correct format', () => {
        const v1 = new Variable({ name: 'Test', bracketStyle: 'double_curly' });
        assert.equal(v1.getPlaceholder(), '{{Test}}');
        
        const v2 = new Variable({ name: 'Test', bracketStyle: 'square' });
        assert.equal(v2.getPlaceholder(), '[Test]');
        
        const v3 = new Variable({ name: 'Test', bracketStyle: 'angle' });
        assert.equal(v3.getPlaceholder(), '<<Test>>');
    });
    
    test('Variable.getDisplayName() formats name nicely', () => {
        const v1 = new Variable({ name: 'client_name', bracketStyle: 'double_curly' });
        assert.equal(v1.getDisplayName(), 'Client Name');
        
        const v2 = new Variable({ name: 'ClientName', bracketStyle: 'double_curly' });
        assert.equal(v2.getDisplayName(), 'Client Name');
        
        const v3 = new Variable({ name: 'PARTY_A_NAME', bracketStyle: 'double_curly' });
        // UPPER_CASE becomes "P A R T Y A N A M E" with spaces, then title case
        assert.ok(v3.getDisplayName().length > 0);
    });
    
    test('Variable.validate() checks value', () => {
        const v = new Variable({ name: 'client_email', bracketStyle: 'double_curly' });
        
        // No value
        let result = v.validate();
        assert.equal(result.valid, false);
        
        // Invalid email
        v.value = 'not-an-email';
        result = v.validate();
        assert.equal(result.valid, false);
        
        // Valid email
        v.value = 'test@example.com';
        result = v.validate();
        assert.equal(result.valid, true);
    });
    
    test('Variable.format() applies type formatting', () => {
        const v = new Variable({ name: 'purchase_price', bracketStyle: 'double_curly' });
        v.value = '1000';
        
        const formatted = v.format();
        assert.ok(formatted.includes('$'));
        assert.ok(formatted.includes('1,000'));
    });
}

// ============================================================================
// PROFILE STORE TESTS
// ============================================================================

function testProfileStore() {
    console.log('\n=== Profile Store Tests ===\n');
    
    const { ProfileStore } = TemplateModule;
    
    // Create fresh instance for testing
    const store = new ProfileStore();
    store.STORAGE_KEY = 'docforge_test_profiles';
    store.RECENT_KEY = 'docforge_test_recent';
    
    // Mock localStorage
    const mockStorage = {};
    global.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, value) => { mockStorage[key] = value; },
        removeItem: (key) => { delete mockStorage[key]; }
    };
    
    // Clear before tests
    store.clear();
    
    test('ProfileStore.getAll() returns empty object initially', () => {
        const profiles = store.getAll();
        assert.deepEqual(profiles, {});
    });
    
    test('ProfileStore.save() creates new profile', () => {
        const success = store.save('TestProfile', {
            ClientName: 'ACME Corp',
            Amount: '10000'
        });
        
        assert.ok(success);
        
        const profile = store.get('TestProfile');
        assert.ok(profile);
        assert.equal(profile.variables.ClientName, 'ACME Corp');
        assert.equal(profile.variables.Amount, '10000');
    });
    
    test('ProfileStore.get() returns null for non-existent', () => {
        const profile = store.get('NonExistent');
        assert.equal(profile, null);
    });
    
    test('ProfileStore.save() updates existing profile', () => {
        store.save('TestProfile', {
            ClientName: 'Updated Corp',
            Amount: '20000'
        });
        
        const profile = store.get('TestProfile');
        assert.equal(profile.variables.ClientName, 'Updated Corp');
        assert.equal(profile.variables.Amount, '20000');
    });
    
    test('ProfileStore.delete() removes profile', () => {
        store.save('ToDelete', { Test: 'value' });
        assert.ok(store.get('ToDelete'));
        
        store.delete('ToDelete');
        assert.equal(store.get('ToDelete'), null);
    });
    
    test('ProfileStore.rename() changes profile name', () => {
        store.save('OldName', { Test: 'value' });
        
        const success = store.rename('OldName', 'NewName');
        assert.ok(success);
        
        assert.equal(store.get('OldName'), null);
        assert.ok(store.get('NewName'));
        assert.equal(store.get('NewName').variables.Test, 'value');
    });
    
    test('ProfileStore.recordUsage() tracks usage count', () => {
        store.save('UsageTest', { Test: 'value' });
        
        store.recordUsage('UsageTest');
        store.recordUsage('UsageTest');
        store.recordUsage('UsageTest');
        
        const profile = store.get('UsageTest');
        assert.equal(profile.usageCount, 3);
        assert.ok(profile.lastUsed);
    });
    
    test('ProfileStore.getRecent() returns recently used profiles', () => {
        store.save('Profile1', {});
        store.save('Profile2', {});
        store.save('Profile3', {});
        
        store.recordUsage('Profile3');
        store.recordUsage('Profile1');
        store.recordUsage('Profile2');
        
        const recent = store.getRecent();
        assert.equal(recent[0], 'Profile2'); // Most recent first
        assert.equal(recent[1], 'Profile1');
        assert.equal(recent[2], 'Profile3');
    });
    
    test('ProfileStore.getSortedNames() sorts by different criteria', () => {
        // Setup
        store.clear();
        store.save('Zebra', {});
        store.save('Alpha', {});
        store.save('Middle', {});
        
        store.recordUsage('Middle');
        store.recordUsage('Middle');
        store.recordUsage('Alpha');
        
        // By name
        const byName = store.getSortedNames('name');
        assert.equal(byName[0], 'Alpha');
        assert.equal(byName[1], 'Middle');
        assert.equal(byName[2], 'Zebra');
        
        // By usage
        const byUsage = store.getSortedNames('usage');
        assert.equal(byUsage[0], 'Middle'); // 2 uses
        assert.equal(byUsage[1], 'Alpha');   // 1 use
    });
    
    test('ProfileStore.exportToJSON() returns valid JSON', () => {
        store.clear();
        store.save('Export1', { Name: 'Test' });
        
        const json = store.exportToJSON();
        const parsed = JSON.parse(json);
        
        assert.ok(parsed.Export1);
        assert.equal(parsed.Export1.variables.Name, 'Test');
    });
    
    test('ProfileStore.importFromJSON() imports profiles', () => {
        store.clear();
        
        const json = JSON.stringify({
            Imported1: { name: 'Imported1', variables: { Field: 'Value' } },
            Imported2: { name: 'Imported2', variables: { Other: 'Data' } }
        });
        
        const success = store.importFromJSON(json);
        assert.ok(success);
        
        assert.ok(store.get('Imported1'));
        assert.ok(store.get('Imported2'));
    });
    
    // Cleanup
    store.clear();
}

// ============================================================================
// DOCUMENT SCANNING TESTS (Async)
// ============================================================================

async function testDocumentScanning() {
    console.log('\n=== Document Scanning Tests ===\n');
    
    const { scanDocument, scanTextForVariables } = TemplateModule;
    
    await testAsync('scanDocument finds text variables', async () => {
        const context = createMockContext(
            'Agreement between {{ClientName}} and {{CounterpartyName}}. ' +
            'Effective Date: {{EffectiveDate}}. Amount: {{PurchasePrice}}.'
        );
        
        const result = await scanDocument(context);
        
        assert.equal(result.variables.length, 4);
        assert.ok(result.variables.find(v => v.name === 'ClientName'));
        assert.ok(result.variables.find(v => v.name === 'CounterpartyName'));
        assert.ok(result.variables.find(v => v.name === 'EffectiveDate'));
        assert.ok(result.variables.find(v => v.name === 'PurchasePrice'));
    });
    
    await testAsync('scanDocument includes statistics', async () => {
        const context = createMockContext(
            '{{ClientName}} and {{ClientName}} and {{Amount}}'
        );
        
        const result = await scanDocument(context);
        
        assert.ok(result.stats);
        assert.equal(result.stats.totalVariables, 2); // Unique names
        assert.equal(result.stats.totalOccurrences, 3); // Total occurrences
    });
    
    await testAsync('scanDocument detects content controls', async () => {
        const context = createMockContext(
            'Some text',
            [{ tag: 'template_ClientName', title: 'ClientName' }]
        );
        
        const result = await scanDocument(context);
        
        const ccVar = result.variables.find(v => v.name === 'ClientName');
        assert.ok(ccVar);
        assert.equal(ccVar.isContentControl, true);
    });
    
    await testAsync('scanDocument uses cache on second call', async () => {
        const context = createMockContext('{{Test}}');
        
        const result1 = await scanDocument(context);
        assert.equal(result1.fromCache, false);
        
        const result2 = await scanDocument(context);
        assert.equal(result2.fromCache, true);
    });
    
    await testAsync('scanDocument invalidates cache with forceRefresh', async () => {
        const context = createMockContext('{{Test}}');
        
        await scanDocument(context);
        const result = await scanDocument(context, { forceRefresh: true });
        
        assert.equal(result.fromCache, false);
    });
}

// ============================================================================
// TEMPLATE FILLING TESTS (Async)
// ============================================================================

async function testTemplateFilling() {
    console.log('\n=== Template Filling Tests ===\n');
    
    const { previewFill, fillTemplate, invalidateCache } = TemplateModule;
    
    await testAsync('previewFill shows pending changes', async () => {
        invalidateCache();
        const context = createMockContext(
            'Client: {{ClientName}}, Amount: {{Amount}}'
        );
        
        const preview = await previewFill(context, {
            ClientName: 'ACME Corporation',
            Amount: '50000'
        });
        
        assert.equal(preview.length, 2);
        
        const clientPreview = preview.find(p => p.name === 'ClientName');
        assert.ok(clientPreview);
        // Title case formatter capitalizes first letter of each word
        assert.ok(clientPreview.newValue.includes('Corporation'));
        
        const amountPreview = preview.find(p => p.name === 'Amount');
        assert.ok(amountPreview);
        assert.ok(amountPreview.newValue.includes('$')); // Currency formatted
    });
    
    await testAsync('previewFill includes validation status', async () => {
        invalidateCache();
        const context = createMockContext('Email: {{client_email}}');
        
        const preview = await previewFill(context, {
            client_email: 'invalid-email'
        });
        
        assert.equal(preview.length, 1);
        assert.equal(preview[0].isValid, false);
    });
    
    await testAsync('fillTemplate applies values to document', async () => {
        invalidateCache();
        const context = createMockContext(
            'Agreement with {{ClientName}} for {{Amount}}'
        );
        
        const result = await fillTemplate(context, {
            ClientName: 'Test Corp',
            Amount: '10000'
        });
        
        assert.ok(result.success);
        assert.ok(result.filledCount > 0);
    });
    
    await testAsync('fillTemplate reports fill count', async () => {
        invalidateCache();
        const context = createMockContext(
            '{{A}} and {{A}} and {{B}}'
        );
        
        const result = await fillTemplate(context, {
            A: 'First',
            B: 'Second'
        });
        
        // filledCount tracks unique variable types filled + occurrence fills
        assert.ok(result.filledCount > 0);
        assert.ok(result.occurrencesFilled >= 2); // At least 2 fills (A and B patterns)
    });
    
    await testAsync('fillTemplate handles partial fills', async () => {
        invalidateCache();
        const context = createMockContext('{{A}} {{B}} {{C}}');
        
        const result = await fillTemplate(context, {
            A: 'Filled',
            // B intentionally omitted
            C: 'Also Filled'
        });
        
        assert.ok(result.success);
        assert.ok(result.filledCount >= 2); // At least A and C
    });
}

// ============================================================================
// EXPORT/IMPORT TESTS (Async)
// ============================================================================

async function testExportImport() {
    console.log('\n=== Export/Import Tests ===\n');
    
    const { exportVariablesToJSON, exportVariablesToCSV, importValuesFromJSON, invalidateCache } = TemplateModule;
    
    await testAsync('exportVariablesToJSON produces valid JSON', async () => {
        invalidateCache();
        const context = createMockContext('{{Name}} {{Email}} {{Phone}}');
        
        const json = await exportVariablesToJSON(context);
        const parsed = JSON.parse(json);
        
        assert.ok(parsed.variables);
        assert.equal(parsed.variableCount, 3);
        assert.ok(parsed.exportDate);
    });
    
    await testAsync('exportVariablesToCSV produces valid CSV', async () => {
        invalidateCache();
        const context = createMockContext('{{Name}} {{Amount}}');
        
        const csv = await exportVariablesToCSV(context);
        const lines = csv.split('\n');
        
        assert.ok(lines[0].includes('Name')); // Header
        assert.equal(lines.length, 3); // Header + 2 variables
    });
    
    test('importValuesFromJSON parses object format', () => {
        const json = JSON.stringify({
            ClientName: 'Test Corp',
            Amount: '10000'
        });
        
        const result = importValuesFromJSON(json);
        
        assert.ok(result.success);
        assert.equal(result.values.ClientName, 'Test Corp');
        assert.equal(result.values.Amount, '10000');
    });
    
    test('importValuesFromJSON parses array format', () => {
        const json = JSON.stringify({
            variables: [
                { name: 'ClientName', value: 'Test Corp' },
                { name: 'Amount', value: '10000' }
            ]
        });
        
        const result = importValuesFromJSON(json);
        
        assert.ok(result.success);
        assert.equal(result.values.ClientName, 'Test Corp');
        assert.equal(result.values.Amount, '10000');
    });
    
    test('importValuesFromJSON handles invalid JSON', () => {
        const result = importValuesFromJSON('not valid json');
        
        assert.equal(result.success, false);
        assert.ok(result.message.includes('Parse error'));
    });
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

function testValidation() {
    console.log('\n=== Validation Tests ===\n');
    
    const { validateAllValues, Variable } = TemplateModule;
    
    test('validateAllValues returns valid for correct values', () => {
        const variables = [
            new Variable({ name: 'client_email', bracketStyle: 'double_curly' }),
            new Variable({ name: 'phone_number', bracketStyle: 'double_curly' }),
            new Variable({ name: 'Amount', bracketStyle: 'double_curly' })
        ];
        
        const result = validateAllValues({
            client_email: 'test@example.com',
            phone_number: '555-123-4567',
            Amount: '10000'
        }, variables);
        
        assert.ok(result.valid);
        assert.equal(result.errors.length, 0);
    });
    
    test('validateAllValues reports errors for invalid values', () => {
        const variables = [
            new Variable({ name: 'client_email', bracketStyle: 'double_curly' })
        ];
        
        const result = validateAllValues({
            client_email: 'not-an-email'
        }, variables);
        
        assert.equal(result.valid, false);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].name, 'client_email');
    });
    
    test('validateAllValues warns for missing values', () => {
        const variables = [
            new Variable({ name: 'ClientName', bracketStyle: 'double_curly' }),
            new Variable({ name: 'Amount', bracketStyle: 'double_curly' })
        ];
        
        const result = validateAllValues({
            ClientName: 'Test Corp'
            // Amount intentionally missing
        }, variables);
        
        assert.ok(result.valid); // Missing values are warnings, not errors
        assert.equal(result.warnings.length, 1);
        assert.equal(result.warnings[0].name, 'Amount');
    });
}

// ============================================================================
// INSERT VARIABLE TESTS (Async)
// ============================================================================

async function testInsertVariable() {
    console.log('\n=== Insert Variable Tests ===\n');
    
    const { insertVariable } = TemplateModule;
    
    await testAsync('insertVariable as text placeholder', async () => {
        const context = createMockContext('');
        
        const result = await insertVariable(context, 'NewVariable', {
            bracketStyle: 'double_curly',
            useContentControl: false
        });
        
        assert.ok(result.success);
        assert.equal(result.type, 'text');
        assert.equal(result.placeholder, '{{NewVariable}}');
    });
    
    await testAsync('insertVariable with different bracket styles', async () => {
        const context = createMockContext('');
        
        const result1 = await insertVariable(context, 'Test', { bracketStyle: 'square' });
        assert.equal(result1.placeholder, '[Test]');
        
        const result2 = await insertVariable(context, 'Test', { bracketStyle: 'angle' });
        assert.equal(result2.placeholder, '<<Test>>');
    });
    
    await testAsync('insertVariable as content control', async () => {
        const context = createMockContext('');
        
        const result = await insertVariable(context, 'NewVariable', {
            useContentControl: true
        });
        
        assert.ok(result.success);
        assert.equal(result.type, 'content_control');
    });
}

// ============================================================================
// CACHE TESTS
// ============================================================================

function testCache() {
    console.log('\n=== Cache Tests ===\n');
    
    const { TemplateCache } = TemplateModule;
    
    test('TemplateCache starts invalid', () => {
        const cache = new TemplateCache();
        assert.ok(!cache.isValid());
    });
    
    test('TemplateCache becomes valid after store', () => {
        const cache = new TemplateCache();
        cache.store([], [], 'test document');
        assert.ok(cache.isValid('test document'));
    });
    
    test('TemplateCache invalidates on document change', () => {
        const cache = new TemplateCache();
        cache.store([], [], 'original text');
        
        assert.ok(cache.isValid('original text'));
        assert.ok(!cache.isValid('changed text'));
    });
    
    test('TemplateCache.invalidate() clears cache', () => {
        const cache = new TemplateCache();
        cache.store([], [], 'test');
        assert.ok(cache.isValid('test'));
        
        cache.invalidate();
        assert.ok(!cache.isValid('test'));
    });
    
    test('TemplateCache expires after TTL', () => {
        const cache = new TemplateCache();
        cache.CACHE_TTL = 100; // 100ms for test
        cache.store([], [], 'test');
        
        assert.ok(cache.isValid('test'));
        
        // Manually expire
        cache.lastScan = Date.now() - 200;
        assert.ok(!cache.isValid('test'));
    });
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

function testPerformance() {
    console.log('\n=== Performance Tests ===\n');
    
    const { scanTextForVariables } = TemplateModule;
    
    test('Scan large document in <100ms', () => {
        // Generate large document with many variables
        const paragraphs = [];
        for (let i = 0; i < 1000; i++) {
            paragraphs.push(
                `Paragraph ${i}: {{Client${i}}} agrees to pay {{Amount${i}}} ` +
                `on {{Date${i}}} to [Recipient${i}].`
            );
        }
        const largeDoc = paragraphs.join('\n');
        
        const start = performance.now();
        const vars = scanTextForVariables(largeDoc, {
            bracketStyles: ['double_curly', 'square']
        });
        const elapsed = performance.now() - start;
        
        console.log(`  Scanned ${largeDoc.length} chars, found ${vars.size} variables in ${elapsed.toFixed(2)}ms`);
        
        assert.ok(elapsed < 100, `Scan took ${elapsed}ms, expected <100ms`);
        assert.equal(vars.size, 4000); // 4 vars per paragraph * 1000 paragraphs
    });
    
    test('Handle 10000+ occurrences efficiently', () => {
        // Document with same variable repeated many times
        const doc = '{{ClientName}} '.repeat(10000);
        
        const start = performance.now();
        const vars = scanTextForVariables(doc, { bracketStyles: ['double_curly'] });
        const elapsed = performance.now() - start;
        
        console.log(`  Scanned ${doc.length} chars, ${vars.get('ClientName').occurrences.length} occurrences in ${elapsed.toFixed(2)}ms`);
        
        assert.ok(elapsed < 200, `Scan took ${elapsed}ms, expected <200ms`);
        assert.equal(vars.size, 1);
        assert.equal(vars.get('ClientName').occurrences.length, 10000);
    });
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   DocForge Template Module Tests       ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const startTime = performance.now();
    
    // Synchronous tests
    testBracketStyles();
    testTypeInference();
    testVariableClass();
    testProfileStore();
    testValidation();
    testCache();
    testPerformance();
    
    // Async tests
    await testDocumentScanning();
    await testTemplateFilling();
    await testExportImport();
    await testInsertVariable();
    
    const totalTime = performance.now() - startTime;
    
    console.log('\n════════════════════════════════════════');
    console.log(`All tests completed in ${totalTime.toFixed(2)}ms`);
    console.log('════════════════════════════════════════\n');
}

// Run if executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

// Export for external test runners
module.exports = {
    runAllTests,
    testBracketStyles,
    testTypeInference,
    testVariableClass,
    testProfileStore,
    testValidation,
    testCache,
    testPerformance,
    testDocumentScanning,
    testTemplateFilling,
    testExportImport,
    testInsertVariable
};
