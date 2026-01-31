/**
 * DocForge - Document Recreate Module v1.0
 * 
 * Enables recreating a document from its original template with fresh data.
 * Detects template variables from a filled document and allows users to
 * re-generate the document with new values.
 * 
 * Features:
 * - Detect template variables from filled document content
 * - Extract current filled values as a starting point
 * - Generate fresh document with new client/matter data
 * - Preserve document structure and formatting
 * 
 * Architecture:
 * - VariableDetector: Identifies variables from context patterns
 * - ValueExtractor: Extracts current values from filled placeholders
 * - RecreateEngine: Orchestrates the recreation process
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// CONSTANTS & PATTERNS
// ============================================================================

/**
 * Common template field patterns with extraction rules
 * Used to detect template variables from filled document content
 */
const FIELD_PATTERNS = {
    // Party/Client name patterns
    partyName: {
        contextPatterns: [
            /(?:between|by and between)\s+([A-Z][A-Za-z\s&,.'-]+(?:Inc\.|LLC|Corp\.?|Corporation|Company|Ltd\.?)?)/gi,
            /(?:party|client|buyer|seller|landlord|tenant|borrower|lender|employer|employee)[:\s]+([A-Z][A-Za-z\s&,.'-]+)/gi,
            /("([^"]+)")\s*\((?:hereinafter|the\s+)?["']?[A-Za-z]+["']?\)/gi
        ],
        variableNames: ['PartyA', 'PartyB', 'ClientName', 'CompanyName'],
        type: 'name'
    },
    
    // Date patterns
    date: {
        contextPatterns: [
            /(?:dated|effective|as of|executed on)[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
            /(?:this|entered into this)\s+(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[A-Z][a-z]+,?\s+\d{4})/gi,
            /(?:commence|termination|closing)\s+date[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
        ],
        variableNames: ['EffectiveDate', 'Date', 'ClosingDate', 'TerminationDate'],
        type: 'date'
    },
    
    // Address patterns
    address: {
        contextPatterns: [
            /(?:located at|address|principal place)[:\s]+(\d+[^,\n]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi,
            /(?:headquarters|office)[:\s]+(\d+[^,\n]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/gi
        ],
        variableNames: ['Address', 'PrincipalAddress', 'BusinessAddress'],
        type: 'address'
    },
    
    // State/Jurisdiction patterns
    state: {
        contextPatterns: [
            /(?:state of|organized under the laws of|governed by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
            /(?:jurisdiction|governing law)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi
        ],
        variableNames: ['State', 'Jurisdiction', 'GoverningLaw'],
        type: 'state'
    },
    
    // Currency/Amount patterns
    currency: {
        contextPatterns: [
            /(?:amount|sum of|consideration|purchase price|payment)[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi,
            /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:\(|dollars)/gi
        ],
        variableNames: ['Amount', 'PurchasePrice', 'Consideration', 'Payment'],
        type: 'currency'
    },
    
    // Percentage patterns
    percentage: {
        contextPatterns: [
            /(?:interest rate|rate of|percentage)[:\s]+(\d+(?:\.\d+)?)\s*%/gi,
            /(\d+(?:\.\d+)?)\s*percent/gi
        ],
        variableNames: ['InterestRate', 'Percentage', 'Rate'],
        type: 'percentage'
    },
    
    // Term/Duration patterns
    term: {
        contextPatterns: [
            /(?:term of|period of|for a term of)\s+(\d+)\s*(?:months?|years?|days?)/gi,
            /(?:duration|lease term)[:\s]+(\d+)\s*(?:months?|years?)/gi
        ],
        variableNames: ['Term', 'Duration', 'LeaseTerm'],
        type: 'number'
    }
};

/**
 * Document type detection patterns
 */
const DOCUMENT_TYPE_PATTERNS = {
    contract: {
        patterns: [/agreement|contract|covenant/i],
        commonVariables: ['PartyA', 'PartyB', 'EffectiveDate', 'Term']
    },
    lease: {
        patterns: [/lease|tenancy|rental/i],
        commonVariables: ['Landlord', 'Tenant', 'Property', 'MonthlyRent', 'LeaseTerm']
    },
    nda: {
        patterns: [/non-disclosure|nda|confidentiality/i],
        commonVariables: ['DisclosingParty', 'ReceivingParty', 'EffectiveDate', 'Term']
    },
    employment: {
        patterns: [/employment|offer letter|compensation/i],
        commonVariables: ['Employer', 'Employee', 'Position', 'Salary', 'StartDate']
    },
    purchase: {
        patterns: [/purchase|sale|acquisition/i],
        commonVariables: ['Buyer', 'Seller', 'PurchasePrice', 'ClosingDate']
    },
    loan: {
        patterns: [/loan|promissory|credit/i],
        commonVariables: ['Lender', 'Borrower', 'Principal', 'InterestRate', 'Term']
    }
};

// ============================================================================
// VARIABLE DETECTOR
// ============================================================================

/**
 * Detected variable from filled document
 */
class DetectedVariable {
    constructor(opts) {
        this.name = opts.name;
        this.type = opts.type;
        this.currentValue = opts.currentValue || '';
        this.confidence = opts.confidence || 'medium';
        this.source = opts.source || 'context'; // 'context', 'pattern', 'content_control'
        this.position = opts.position || -1;
        this.contextText = opts.contextText || '';
    }
    
    /**
     * Get display-friendly name
     */
    getDisplayName() {
        return this.name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}

/**
 * Detect document type from content
 * @param {string} text - Document text
 * @returns {Object}
 */
function detectDocumentType(text) {
    const firstChunk = text.substring(0, 5000).toLowerCase();
    
    for (const [type, config] of Object.entries(DOCUMENT_TYPE_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(firstChunk)) {
                return {
                    type: type,
                    commonVariables: config.commonVariables,
                    confidence: 'high'
                };
            }
        }
    }
    
    return {
        type: 'generic',
        commonVariables: ['PartyA', 'PartyB', 'EffectiveDate'],
        confidence: 'low'
    };
}

/**
 * Detect template variables from filled document content
 * Uses pattern matching and context analysis
 * @param {string} text - Document text
 * @param {Object} options
 * @returns {Array<DetectedVariable>}
 */
function detectVariablesFromContent(text, options = {}) {
    const detected = new Map();
    const docType = detectDocumentType(text);
    
    // Process each field pattern
    for (const [fieldType, config] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of config.contextPatterns) {
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;
            let varIndex = 0;
            
            while ((match = regex.exec(text)) !== null) {
                const value = match[1] || match[2];
                if (!value || value.length < 2 || value.length > 200) continue;
                
                // Skip if value looks like placeholder text
                if (/^\[.*\]$|^\{\{.*\}\}$|^<.*>$/.test(value)) continue;
                
                // Generate variable name
                const varName = config.variableNames[varIndex % config.variableNames.length];
                const uniqueName = detected.has(varName) 
                    ? `${varName}_${detected.size + 1}`
                    : varName;
                
                // Skip duplicates with same value
                const existing = Array.from(detected.values()).find(v => 
                    v.currentValue === value.trim()
                );
                if (existing) continue;
                
                detected.set(uniqueName, new DetectedVariable({
                    name: uniqueName,
                    type: config.type,
                    currentValue: value.trim(),
                    confidence: 'medium',
                    source: 'context',
                    position: match.index,
                    contextText: text.substring(
                        Math.max(0, match.index - 30),
                        Math.min(text.length, match.index + match[0].length + 30)
                    )
                }));
                
                varIndex++;
            }
        }
    }
    
    // Also detect any remaining bracketed placeholders that weren't filled
    const bracketPatterns = [
        /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
        /\[([A-Za-z_][A-Za-z0-9_]*)\]/g,
        /<<([A-Za-z_][A-Za-z0-9_]*)>>/g
    ];
    
    for (const pattern of bracketPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const varName = match[1];
            if (!detected.has(varName)) {
                detected.set(varName, new DetectedVariable({
                    name: varName,
                    type: inferTypeFromName(varName),
                    currentValue: '', // Still a placeholder
                    confidence: 'high',
                    source: 'pattern',
                    position: match.index
                }));
            }
        }
    }
    
    // Add common variables for document type if not detected
    for (const varName of docType.commonVariables) {
        if (!detected.has(varName) && !Array.from(detected.keys()).some(k => 
            k.toLowerCase().includes(varName.toLowerCase())
        )) {
            // Try to find a value in the document for this variable
            const value = findValueForVariable(text, varName);
            
            detected.set(varName, new DetectedVariable({
                name: varName,
                type: inferTypeFromName(varName),
                currentValue: value,
                confidence: value ? 'low' : 'suggested',
                source: 'document_type'
            }));
        }
    }
    
    return Array.from(detected.values())
        .sort((a, b) => {
            // Sort by confidence, then by position
            const confOrder = { high: 0, medium: 1, low: 2, suggested: 3 };
            if (confOrder[a.confidence] !== confOrder[b.confidence]) {
                return confOrder[a.confidence] - confOrder[b.confidence];
            }
            return a.position - b.position;
        });
}

/**
 * Infer variable type from name
 */
function inferTypeFromName(name) {
    const lower = name.toLowerCase();
    
    if (/date|day|time/.test(lower)) return 'date';
    if (/amount|price|fee|cost|salary|payment/.test(lower)) return 'currency';
    if (/rate|percent|pct/.test(lower)) return 'percentage';
    if (/term|duration|months|years|days/.test(lower)) return 'number';
    if (/address|street|city/.test(lower)) return 'address';
    if (/state|jurisdiction/.test(lower)) return 'state';
    if (/email/.test(lower)) return 'email';
    if (/phone|tel|fax/.test(lower)) return 'phone';
    if (/name|party|client|company/.test(lower)) return 'name';
    
    return 'text';
}

/**
 * Try to find a value for a known variable name
 */
function findValueForVariable(text, varName) {
    const lower = varName.toLowerCase();
    const patterns = [];
    
    // Build context-aware patterns based on variable name
    if (/party.*a|buyer|landlord|employer|lender|disclosing/i.test(varName)) {
        patterns.push(
            /(?:between|by and between)\s+([A-Z][A-Za-z\s&,.'-]+?)(?:,|\s+and\s+|,?\s*\()/i
        );
    }
    
    if (/party.*b|seller|tenant|employee|borrower|receiving/i.test(varName)) {
        patterns.push(
            /\s+and\s+([A-Z][A-Za-z\s&,.'-]+?)(?:,|\s*\()/i
        );
    }
    
    if (/date|effective/i.test(varName)) {
        patterns.push(
            /(?:dated|effective|as of)[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
            /(?:this)\s+(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[A-Z][a-z]+,?\s+\d{4})/i
        );
    }
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return '';
}

// ============================================================================
// VALUE EXTRACTOR
// ============================================================================

/**
 * Extract current values from a filled document
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function extractCurrentValues(context, options = {}) {
    // Load document text
    const body = context.document.body;
    body.load('text');
    await context.sync();
    
    const text = body.text;
    const detected = detectVariablesFromContent(text, options);
    
    // Also check for content controls
    const contentControls = await extractContentControlValues(context);
    
    // Merge content control values with detected
    for (const cc of contentControls) {
        const existing = detected.find(d => 
            d.name.toLowerCase() === cc.name.toLowerCase()
        );
        
        if (existing) {
            // Update existing with CC value
            if (cc.value && cc.value !== cc.placeholder) {
                existing.currentValue = cc.value;
                existing.confidence = 'high';
                existing.source = 'content_control';
            }
        } else {
            // Add new variable from CC
            detected.push(new DetectedVariable({
                name: cc.name,
                type: inferTypeFromName(cc.name),
                currentValue: cc.value !== cc.placeholder ? cc.value : '',
                confidence: 'high',
                source: 'content_control'
            }));
        }
    }
    
    return {
        variables: detected,
        documentType: detectDocumentType(text),
        contentControlCount: contentControls.length,
        extractedAt: new Date().toISOString()
    };
}

/**
 * Extract values from content controls
 */
async function extractContentControlValues(context) {
    try {
        const controls = context.document.contentControls;
        controls.load('items/id,items/tag,items/title,items/text,items/placeholderText');
        await context.sync();
        
        const values = [];
        
        for (const cc of controls.items) {
            const name = cc.tag?.replace('template_', '') || cc.title;
            if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
                values.push({
                    name: name,
                    value: cc.text,
                    placeholder: cc.placeholderText
                });
            }
        }
        
        return values;
    } catch (e) {
        console.warn('Failed to extract content controls:', e);
        return [];
    }
}

// ============================================================================
// TEMPLATE DETECTION FROM DOCUMENT
// ============================================================================

/**
 * Detect the original template from a filled document
 * Attempts to reverse-engineer the template structure
 * @param {Word.RequestContext} context
 * @returns {Promise<Object>}
 */
async function detectTemplateFromDocument(context) {
    // Load document
    const body = context.document.body;
    body.load('text');
    
    const properties = context.document.properties;
    properties.load('title,author,subject,keywords,comments');
    
    await context.sync();
    
    const text = body.text;
    const docType = detectDocumentType(text);
    const extraction = await extractCurrentValues(context);
    
    // Try to identify template from document properties
    let templateHint = null;
    try {
        const keywords = properties.keywords || '';
        const comments = properties.comments || '';
        
        // Look for template markers
        if (keywords.includes('template:') || comments.includes('Template:')) {
            const match = (keywords + comments).match(/template:\s*([^\s,;]+)/i);
            if (match) templateHint = match[1];
        }
    } catch (e) {
        // Properties may not be available
    }
    
    // Build template reconstruction
    const templateInfo = {
        detectedType: docType.type,
        confidence: docType.confidence,
        templateHint: templateHint,
        variables: extraction.variables.map(v => ({
            name: v.name,
            type: v.type,
            displayName: v.getDisplayName(),
            currentValue: v.currentValue,
            confidence: v.confidence,
            required: v.confidence !== 'suggested'
        })),
        structure: analyzeDocumentStructure(text),
        metadata: {
            wordCount: text.split(/\s+/).length,
            variableCount: extraction.variables.length,
            detectedAt: new Date().toISOString()
        }
    };
    
    return templateInfo;
}

/**
 * Analyze document structure for recreation
 */
function analyzeDocumentStructure(text) {
    const structure = {
        hasHeadings: /^[A-Z\s]+:$/m.test(text) || /^(?:Article|Section)\s+\d+/mi.test(text),
        hasNumberedParagraphs: /^\d+\.\s+[A-Z]/m.test(text),
        hasSignatureBlock: /(?:signature|signed|executed|witness)/i.test(text),
        estimatedSections: (text.match(/^[A-Z][A-Z\s]+:?\s*$/gm) || []).length,
        hasRecitals: /(?:whereas|recitals|background)/i.test(text),
        hasDefinitions: /(?:definitions|defined terms)/i.test(text)
    };
    
    return structure;
}

// ============================================================================
// RECREATE ENGINE
// ============================================================================

/**
 * Recreate document with new values
 * @param {Word.RequestContext} context
 * @param {Object} newValues - Variable name -> new value mapping
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function recreateDocument(context, newValues, options = {}) {
    const {
        extractFirst = true,
        preserveFormatting = true,
        createCopy = false
    } = options;
    
    const startTime = performance.now();
    let extraction = options.extraction;
    
    // Extract current values if not provided
    if (extractFirst && !extraction) {
        extraction = await extractCurrentValues(context);
    }
    
    if (!extraction || extraction.variables.length === 0) {
        return {
            success: false,
            message: 'No template variables detected in document'
        };
    }
    
    // Create copy if requested
    if (createCopy) {
        // Note: Creating a true copy requires different approach in Office.js
        // For now, we'll work on the current document
        console.log('Copy mode not yet implemented - working on current document');
    }
    
    // Build search/replace pairs
    const replacements = [];
    let replacedCount = 0;
    
    for (const variable of extraction.variables) {
        const newValue = newValues[variable.name];
        const oldValue = variable.currentValue;
        
        if (newValue === undefined || newValue === null) continue;
        if (!oldValue) continue; // Can't replace if we don't know the old value
        if (newValue === oldValue) continue; // No change needed
        
        replacements.push({
            variable: variable.name,
            oldValue: oldValue,
            newValue: newValue,
            type: variable.type
        });
    }
    
    // Perform replacements
    for (const replacement of replacements) {
        try {
            // Format new value based on type
            const formattedValue = formatValueForType(replacement.newValue, replacement.type);
            
            // Search and replace
            const results = context.document.body.search(replacement.oldValue, {
                matchCase: true,
                matchWholeWord: false
            });
            results.load('items');
            await context.sync();
            
            for (const range of results.items) {
                range.insertText(formattedValue, Word.InsertLocation.replace);
                replacedCount++;
            }
        } catch (e) {
            console.warn(`Failed to replace "${replacement.variable}":`, e);
        }
    }
    
    await context.sync();
    
    return {
        success: true,
        replacedCount: replacedCount,
        variablesProcessed: replacements.length,
        recreateTime: performance.now() - startTime,
        message: `Recreated document with ${replacements.length} variable(s) (${replacedCount} replacement(s))`
    };
}

/**
 * Format value based on type
 */
function formatValueForType(value, type) {
    if (!value) return value;
    
    switch (type) {
        case 'date':
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            } catch (e) {}
            return value;
            
        case 'currency':
            try {
                const num = parseFloat(value.replace(/[$,]/g, ''));
                if (!isNaN(num)) {
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(num);
                }
            } catch (e) {}
            return value;
            
        case 'percentage':
            const pctNum = parseFloat(value.replace(/%/g, ''));
            if (!isNaN(pctNum)) {
                return `${pctNum}%`;
            }
            return value;
            
        case 'name':
            // Title case
            return value.trim().replace(/\b\w/g, l => l.toUpperCase());
            
        default:
            return value.trim();
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Generate HTML for variable input form
 * @param {Array} variables - Detected variables
 * @param {boolean} prefill - Whether to prefill with current values
 * @returns {string}
 */
function generateRecreateFormHTML(variables, prefill = false) {
    if (variables.length === 0) {
        return `<div class="empty-state">
            <p>No template variables detected.</p>
            <small>This document may not have been created from a template.</small>
        </div>`;
    }
    
    return variables.map(v => {
        const typeInfo = getInputTypeForVariable(v.type);
        const confidenceClass = `confidence-${v.confidence}`;
        const value = prefill ? (v.currentValue || '') : '';
        
        return `
            <div class="recreate-var-item ${confidenceClass}" data-varname="${escapeAttr(v.name)}">
                <label for="recreate-${escapeAttr(v.name)}">
                    ${escapeHtml(v.getDisplayName ? v.getDisplayName() : v.name)}
                    ${v.confidence === 'suggested' ? '<span class="suggested-badge">suggested</span>' : ''}
                </label>
                <input type="${typeInfo.inputType}"
                       id="recreate-${escapeAttr(v.name)}"
                       name="${escapeAttr(v.name)}"
                       data-var="${escapeAttr(v.name)}"
                       data-type="${escapeAttr(v.type)}"
                       placeholder="${escapeAttr(typeInfo.placeholder)}"
                       value="${escapeAttr(value)}">
                ${v.currentValue && prefill ? 
                    `<span class="current-value-hint" title="Current value">Current: ${escapeHtml(truncate(v.currentValue, 30))}</span>` : 
                    ''}
            </div>
        `;
    }).join('');
}

/**
 * Get input type info for a variable type
 */
function getInputTypeForVariable(type) {
    const types = {
        date: { inputType: 'date', placeholder: 'YYYY-MM-DD' },
        currency: { inputType: 'text', placeholder: '$0.00' },
        percentage: { inputType: 'text', placeholder: '0%' },
        number: { inputType: 'number', placeholder: '0' },
        email: { inputType: 'email', placeholder: 'email@example.com' },
        phone: { inputType: 'tel', placeholder: '(555) 555-5555' },
        address: { inputType: 'text', placeholder: '123 Main St, City, ST 12345' },
        state: { inputType: 'text', placeholder: 'State name' },
        name: { inputType: 'text', placeholder: 'Enter name' },
        text: { inputType: 'text', placeholder: 'Enter value' }
    };
    
    return types[type] || types.text;
}

/**
 * Escape HTML
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Escape attribute
 */
function escapeAttr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * Truncate string
 */
function truncate(str, maxLen) {
    if (typeof str !== 'string') return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
}

// ============================================================================
// EXPORT
// ============================================================================

const RecreateModule = {
    // Main API
    detectTemplateFromDocument,
    extractCurrentValues,
    recreateDocument,
    
    // Detection helpers
    detectVariablesFromContent,
    detectDocumentType,
    extractContentControlValues,
    
    // Utility
    generateRecreateFormHTML,
    formatValueForType,
    
    // Classes
    DetectedVariable,
    
    // Constants
    FIELD_PATTERNS,
    DOCUMENT_TYPE_PATTERNS,
    
    // Version
    VERSION: '1.0.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.Recreate = RecreateModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecreateModule;
}
