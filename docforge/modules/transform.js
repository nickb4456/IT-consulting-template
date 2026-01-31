/**
 * DocForge - Document Transform Module v1.0
 * 
 * Transform documents between different formats (Memo, Fax, Letter, Brief, etc.)
 * Analyzes document content and restructures it to fit the target format.
 * 
 * Features:
 * - Multiple transform templates (Memo, Fax Cover, Business Letter, Legal Brief)
 * - Content analysis to extract key information
 * - Preview transformation before applying
 * - Preserve original content while restructuring
 * 
 * Architecture:
 * - ContentAnalyzer: Extracts key information from source document
 * - TransformEngine: Applies template structure to content
 * - FormatTemplates: Predefined document format templates
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// TRANSFORM TEMPLATES
// ============================================================================

/**
 * Predefined document format templates
 * Each template defines structure, styling, and content mapping
 */
const TRANSFORM_TEMPLATES = {
    memo: {
        id: 'memo',
        name: 'Memorandum',
        description: 'Internal memo format with TO/FROM/DATE/RE header',
        structure: [
            { field: 'header', label: 'MEMORANDUM', type: 'title', required: true },
            { field: 'to', label: 'TO:', type: 'field', required: true, placeholder: 'Recipient Name' },
            { field: 'from', label: 'FROM:', type: 'field', required: true, placeholder: 'Sender Name' },
            { field: 'date', label: 'DATE:', type: 'field', required: true, placeholder: 'Date' },
            { field: 're', label: 'RE:', type: 'field', required: true, placeholder: 'Subject' },
            { field: 'divider', type: 'divider' },
            { field: 'body', label: '', type: 'body', required: true }
        ],
        styling: {
            titleFont: { name: 'Arial', size: 14, bold: true },
            labelFont: { name: 'Arial', size: 11, bold: true },
            bodyFont: { name: 'Times New Roman', size: 12, bold: false },
            lineSpacing: 1.15,
            headerMargin: 12,
            bodyMargin: 24
        },
        contentMapping: {
            to: ['recipient', 'toParty', 'addressee', 'client'],
            from: ['sender', 'fromParty', 'author', 'attorney'],
            date: ['date', 'effectiveDate', 'today'],
            re: ['subject', 'matter', 'regarding', 'title'],
            body: ['body', 'content', 'text']
        }
    },
    
    fax: {
        id: 'fax',
        name: 'Fax Cover Sheet',
        description: 'Standard fax transmission cover page',
        structure: [
            { field: 'header', label: 'FAX COVER SHEET', type: 'title', required: true },
            { field: 'divider', type: 'divider' },
            { field: 'to', label: 'TO:', type: 'field', required: true, placeholder: 'Recipient Name' },
            { field: 'faxNumber', label: 'FAX:', type: 'field', required: true, placeholder: 'Fax Number' },
            { field: 'from', label: 'FROM:', type: 'field', required: true, placeholder: 'Sender Name' },
            { field: 'date', label: 'DATE:', type: 'field', required: true, placeholder: 'Date' },
            { field: 'pages', label: 'PAGES:', type: 'field', required: false, placeholder: 'Including cover' },
            { field: 're', label: 'RE:', type: 'field', required: true, placeholder: 'Subject' },
            { field: 'divider', type: 'divider' },
            { field: 'urgent', label: 'URGENT', type: 'checkbox', required: false },
            { field: 'review', label: 'FOR REVIEW', type: 'checkbox', required: false },
            { field: 'reply', label: 'PLEASE REPLY', type: 'checkbox', required: false },
            { field: 'divider', type: 'divider' },
            { field: 'comments', label: 'COMMENTS:', type: 'textarea', required: false }
        ],
        styling: {
            titleFont: { name: 'Arial', size: 16, bold: true },
            labelFont: { name: 'Arial', size: 10, bold: true },
            bodyFont: { name: 'Arial', size: 11, bold: false },
            lineSpacing: 1.5,
            headerMargin: 18,
            fieldSpacing: 8
        },
        contentMapping: {
            to: ['recipient', 'toParty', 'addressee'],
            faxNumber: ['fax', 'faxNumber', 'phone'],
            from: ['sender', 'fromParty', 'author'],
            date: ['date', 'today'],
            pages: ['pageCount', 'pages'],
            re: ['subject', 'matter', 'regarding'],
            comments: ['body', 'content', 'notes', 'message']
        }
    },
    
    letter: {
        id: 'letter',
        name: 'Business Letter',
        description: 'Professional business correspondence format',
        structure: [
            { field: 'senderAddress', label: '', type: 'address', required: false },
            { field: 'date', label: '', type: 'date', required: true },
            { field: 'spacer', type: 'spacer' },
            { field: 'recipientName', label: '', type: 'text', required: true, placeholder: 'Recipient Name' },
            { field: 'recipientTitle', label: '', type: 'text', required: false, placeholder: 'Title' },
            { field: 'recipientCompany', label: '', type: 'text', required: false, placeholder: 'Company' },
            { field: 'recipientAddress', label: '', type: 'address', required: false },
            { field: 'spacer', type: 'spacer' },
            { field: 'salutation', label: '', type: 'salutation', required: true, placeholder: 'Dear' },
            { field: 'spacer', type: 'spacer' },
            { field: 'body', label: '', type: 'body', required: true },
            { field: 'spacer', type: 'spacer' },
            { field: 'closing', label: '', type: 'closing', required: true, placeholder: 'Sincerely,' },
            { field: 'spacer', type: 'spacer' },
            { field: 'spacer', type: 'spacer' },
            { field: 'senderName', label: '', type: 'signature', required: true },
            { field: 'senderTitle', label: '', type: 'text', required: false }
        ],
        styling: {
            titleFont: { name: 'Times New Roman', size: 12, bold: false },
            labelFont: { name: 'Times New Roman', size: 12, bold: false },
            bodyFont: { name: 'Times New Roman', size: 12, bold: false },
            lineSpacing: 1.0,
            paragraphSpacing: 12,
            margins: { top: 72, bottom: 72, left: 72, right: 72 }
        },
        contentMapping: {
            senderAddress: ['fromAddress', 'senderAddress', 'firmAddress'],
            date: ['date', 'letterDate', 'today'],
            recipientName: ['recipient', 'toName', 'addressee', 'client'],
            recipientTitle: ['recipientTitle', 'toTitle'],
            recipientCompany: ['recipientCompany', 'toCompany', 'company'],
            recipientAddress: ['toAddress', 'recipientAddress', 'clientAddress'],
            salutation: ['salutation', 'greeting'],
            body: ['body', 'content', 'letterBody'],
            closing: ['closing', 'valediction'],
            senderName: ['sender', 'fromName', 'attorney', 'author'],
            senderTitle: ['senderTitle', 'fromTitle', 'position']
        }
    },
    
    brief: {
        id: 'brief',
        name: 'Legal Brief',
        description: 'Court filing brief format with caption and sections',
        structure: [
            { field: 'court', label: '', type: 'court', required: true, placeholder: 'Court Name' },
            { field: 'divider', type: 'divider' },
            { field: 'caption', label: '', type: 'caption', required: true },
            { field: 'divider', type: 'divider' },
            { field: 'title', label: '', type: 'briefTitle', required: true, placeholder: 'Brief Title' },
            { field: 'divider', type: 'divider' },
            { field: 'toc', label: 'TABLE OF CONTENTS', type: 'section', required: false },
            { field: 'toa', label: 'TABLE OF AUTHORITIES', type: 'section', required: false },
            { field: 'introduction', label: 'INTRODUCTION', type: 'section', required: true },
            { field: 'facts', label: 'STATEMENT OF FACTS', type: 'section', required: true },
            { field: 'argument', label: 'ARGUMENT', type: 'section', required: true },
            { field: 'conclusion', label: 'CONCLUSION', type: 'section', required: true },
            { field: 'signature', label: '', type: 'signature', required: true },
            { field: 'certificate', label: 'CERTIFICATE OF SERVICE', type: 'section', required: false }
        ],
        styling: {
            titleFont: { name: 'Times New Roman', size: 14, bold: true },
            labelFont: { name: 'Times New Roman', size: 12, bold: true, underline: true },
            bodyFont: { name: 'Times New Roman', size: 12, bold: false },
            lineSpacing: 2.0,
            paragraphIndent: 36,
            margins: { top: 72, bottom: 72, left: 108, right: 72 }
        },
        contentMapping: {
            court: ['court', 'courtName', 'jurisdiction'],
            caption: ['caption', 'parties', 'caseCaption'],
            title: ['briefTitle', 'documentTitle', 'title'],
            introduction: ['introduction', 'intro', 'summary'],
            facts: ['facts', 'statementOfFacts', 'background'],
            argument: ['argument', 'arguments', 'legalArgument', 'body'],
            conclusion: ['conclusion', 'relief', 'prayer'],
            signature: ['signature', 'attorney', 'counsel']
        }
    },
    
    email: {
        id: 'email',
        name: 'Email Draft',
        description: 'Email format with subject line and body',
        structure: [
            { field: 'to', label: 'To:', type: 'field', required: true, placeholder: 'recipient@example.com' },
            { field: 'cc', label: 'Cc:', type: 'field', required: false },
            { field: 'subject', label: 'Subject:', type: 'field', required: true, placeholder: 'Subject line' },
            { field: 'divider', type: 'divider' },
            { field: 'greeting', label: '', type: 'text', required: false, placeholder: 'Dear' },
            { field: 'body', label: '', type: 'body', required: true },
            { field: 'closing', label: '', type: 'text', required: true, placeholder: 'Best regards,' },
            { field: 'signature', label: '', type: 'signature', required: true }
        ],
        styling: {
            titleFont: { name: 'Calibri', size: 11, bold: false },
            labelFont: { name: 'Calibri', size: 11, bold: true },
            bodyFont: { name: 'Calibri', size: 11, bold: false },
            lineSpacing: 1.15
        },
        contentMapping: {
            to: ['recipient', 'toEmail', 'email'],
            cc: ['cc', 'copyTo'],
            subject: ['subject', 're', 'matter'],
            greeting: ['salutation', 'greeting'],
            body: ['body', 'content', 'message'],
            closing: ['closing', 'signoff'],
            signature: ['sender', 'from', 'name']
        }
    },
    
    pleading: {
        id: 'pleading',
        name: 'Court Pleading',
        description: 'Standard court pleading format',
        structure: [
            { field: 'attorney', label: '', type: 'attorneyBlock', required: true },
            { field: 'court', label: '', type: 'court', required: true },
            { field: 'caption', label: '', type: 'caption', required: true },
            { field: 'title', label: '', type: 'pleadingTitle', required: true },
            { field: 'body', label: '', type: 'numberedBody', required: true },
            { field: 'prayer', label: '', type: 'prayer', required: false },
            { field: 'signature', label: '', type: 'signature', required: true },
            { field: 'verification', label: 'VERIFICATION', type: 'section', required: false }
        ],
        styling: {
            titleFont: { name: 'Courier New', size: 12, bold: true },
            labelFont: { name: 'Courier New', size: 12, bold: false },
            bodyFont: { name: 'Courier New', size: 12, bold: false },
            lineSpacing: 2.0,
            lineNumbers: true,
            margins: { top: 72, bottom: 72, left: 144, right: 72 }
        },
        contentMapping: {
            attorney: ['attorney', 'counsel', 'firmInfo'],
            court: ['court', 'courtName'],
            caption: ['caption', 'parties'],
            title: ['title', 'pleadingTitle'],
            body: ['body', 'allegations', 'content'],
            prayer: ['prayer', 'relief', 'wherefore'],
            signature: ['signature', 'attorney']
        }
    }
};

// ============================================================================
// CONTENT ANALYZER
// ============================================================================

/**
 * Analyzed content from source document
 */
class AnalyzedContent {
    constructor() {
        this.parties = [];
        this.dates = [];
        this.subject = '';
        this.body = '';
        this.sections = [];
        this.metadata = {};
        this.rawText = '';
    }
}

/**
 * Analyze document content to extract key information
 * @param {Word.RequestContext} context
 * @param {Object} options
 * @returns {Promise<AnalyzedContent>}
 */
async function analyzeDocumentContent(context, options = {}) {
    const body = context.document.body;
    body.load('text');
    
    // Also load paragraphs for structure analysis
    const paragraphs = body.paragraphs;
    paragraphs.load('items/text,items/style');
    
    await context.sync();
    
    const content = new AnalyzedContent();
    content.rawText = body.text;
    
    // Extract parties/names
    content.parties = extractParties(content.rawText);
    
    // Extract dates
    content.dates = extractDates(content.rawText);
    
    // Extract subject/matter
    content.subject = extractSubject(content.rawText);
    
    // Extract body content
    content.body = extractBody(content.rawText);
    
    // Extract sections
    content.sections = extractSections(paragraphs.items);
    
    // Extract metadata
    content.metadata = {
        wordCount: content.rawText.split(/\s+/).filter(w => w).length,
        paragraphCount: paragraphs.items.length,
        hasNumbering: /^\d+\.\s/m.test(content.rawText),
        hasHeadings: content.sections.length > 0,
        documentType: detectSourceType(content.rawText)
    };
    
    return content;
}

/**
 * Extract party names from text
 */
function extractParties(text) {
    const parties = [];
    
    // Pattern for parties in legal documents
    const patterns = [
        /(?:between|by and between)\s+([A-Z][A-Za-z\s&,.'-]+?)(?:\s+and\s+|\s*,\s*a\s+)/gi,
        /(?:"([^"]+)")\s*\((?:hereinafter|the\s+)?["']?(?:Party|Buyer|Seller|Landlord|Tenant|Borrower|Lender)/gi,
        /^(?:TO|FROM):\s*(.+)$/gim
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const party = (match[1] || match[2] || '').trim();
            if (party && party.length > 1 && party.length < 100 && !parties.includes(party)) {
                parties.push(party);
            }
        }
    }
    
    return parties.slice(0, 4); // Max 4 parties
}

/**
 * Extract dates from text
 */
function extractDates(text) {
    const dates = [];
    
    const patterns = [
        /([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/g,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
        /(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[A-Z][a-z]+,?\s+\d{4})/gi
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const dateStr = match[1].trim();
            if (!dates.includes(dateStr)) {
                dates.push(dateStr);
            }
        }
    }
    
    return dates.slice(0, 3); // Max 3 dates
}

/**
 * Extract subject/matter from text
 */
function extractSubject(text) {
    // Look for RE:, Subject:, or title patterns
    const patterns = [
        /(?:RE|SUBJECT|REGARDING)[:\s]+([^\n]+)/i,
        /^([A-Z][A-Z\s]+(?:AGREEMENT|CONTRACT|LEASE|MEMORANDUM))\b/m
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    // Try to extract from first meaningful line
    const lines = text.split('\n').filter(l => l.trim().length > 10);
    if (lines.length > 0) {
        return lines[0].trim().substring(0, 100);
    }
    
    return '';
}

/**
 * Extract main body content
 */
function extractBody(text) {
    // Remove headers, footers, signature blocks
    let body = text;
    
    // Remove common header patterns
    body = body.replace(/^(?:TO|FROM|DATE|RE|CC|SUBJECT)[:\s]+[^\n]+\n/gim, '');
    body = body.replace(/^(?:MEMORANDUM|FAX COVER SHEET)[^\n]*\n/gim, '');
    
    // Remove signature blocks (rough)
    body = body.replace(/(?:Sincerely|Regards|Best|Very truly yours)[,\s]*\n[\s\S]*$/i, '');
    
    // Clean up
    body = body.replace(/\n{3,}/g, '\n\n').trim();
    
    return body;
}

/**
 * Extract sections from paragraphs
 */
function extractSections(paragraphs) {
    const sections = [];
    let currentSection = null;
    
    for (const para of paragraphs) {
        const text = para.text?.trim() || '';
        if (!text) continue;
        
        // Check if this is a heading
        const isHeading = 
            (para.style && /Heading/i.test(para.style)) ||
            /^[A-Z\s]+:?\s*$/.test(text) ||
            /^(?:Article|Section|Part)\s+\d+/i.test(text) ||
            /^[IVXLC]+\.\s+/.test(text);
        
        if (isHeading) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = {
                title: text.replace(/:?\s*$/, ''),
                content: []
            };
        } else if (currentSection) {
            currentSection.content.push(text);
        }
    }
    
    if (currentSection) {
        sections.push(currentSection);
    }
    
    return sections;
}

/**
 * Detect source document type
 */
function detectSourceType(text) {
    const lower = text.toLowerCase();
    
    if (/memorandum|memo\b/i.test(lower)) return 'memo';
    if (/fax\s+cover/i.test(lower)) return 'fax';
    if (/dear\s+[a-z]/i.test(lower) && /sincerely|regards/i.test(lower)) return 'letter';
    if (/court|plaintiff|defendant|motion|brief/i.test(lower)) return 'legal';
    if (/agreement|contract|party.*hereto/i.test(lower)) return 'contract';
    
    return 'general';
}

// ============================================================================
// TRANSFORM ENGINE
// ============================================================================

/**
 * Transform preview result
 */
class TransformPreview {
    constructor(template, content, mappedFields) {
        this.template = template;
        this.content = content;
        this.mappedFields = mappedFields;
        this.warnings = [];
    }
    
    /**
     * Generate preview HTML
     */
    toHTML() {
        const template = TRANSFORM_TEMPLATES[this.template];
        if (!template) return '<p>Unknown template</p>';
        
        let html = `<div class="transform-preview">`;
        html += `<h4>${escapeHtml(template.name)}</h4>`;
        
        for (const field of template.structure) {
            if (field.type === 'divider') {
                html += `<hr class="preview-divider">`;
                continue;
            }
            if (field.type === 'spacer') {
                html += `<div class="preview-spacer"></div>`;
                continue;
            }
            
            const value = this.mappedFields[field.field] || '';
            const isEmpty = !value || value === field.placeholder;
            
            html += `<div class="preview-field ${isEmpty ? 'empty' : 'filled'}">`;
            if (field.label) {
                html += `<span class="preview-label">${escapeHtml(field.label)}</span>`;
            }
            html += `<span class="preview-value">${escapeHtml(value || field.placeholder || '(empty)')}</span>`;
            html += `</div>`;
        }
        
        if (this.warnings.length > 0) {
            html += `<div class="preview-warnings">`;
            for (const warning of this.warnings) {
                html += `<p class="warning">${escapeHtml(warning)}</p>`;
            }
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }
}

/**
 * Preview transformation before applying
 * @param {Word.RequestContext} context
 * @param {string} targetFormat - Target template ID
 * @param {Object} options
 * @returns {Promise<TransformPreview>}
 */
async function previewTransform(context, targetFormat, options = {}) {
    const template = TRANSFORM_TEMPLATES[targetFormat];
    if (!template) {
        throw new Error(`Unknown transform format: ${targetFormat}`);
    }
    
    // Analyze current document
    const content = await analyzeDocumentContent(context, options);
    
    // Map content to template fields
    const mappedFields = mapContentToTemplate(content, template);
    
    // Create preview
    const preview = new TransformPreview(targetFormat, content, mappedFields);
    
    // Add warnings for missing required fields
    for (const field of template.structure) {
        if (field.required && !mappedFields[field.field]) {
            preview.warnings.push(`Missing required field: ${field.label || field.field}`);
        }
    }
    
    return preview;
}

/**
 * Map analyzed content to template fields
 */
function mapContentToTemplate(content, template) {
    const mapped = {};
    
    // Helper to find best match from content
    const findMatch = (fieldMappings) => {
        for (const key of fieldMappings) {
            if (content[key]) return content[key];
            if (content.metadata[key]) return content.metadata[key];
        }
        return null;
    };
    
    // Map each field
    for (const [fieldName, mappings] of Object.entries(template.contentMapping || {})) {
        // Try direct mapping
        let value = findMatch(mappings);
        
        // Special handling for certain fields
        if (!value) {
            switch (fieldName) {
                case 'to':
                case 'recipient':
                case 'recipientName':
                    value = content.parties[0] || '';
                    break;
                case 'from':
                case 'sender':
                case 'senderName':
                    value = content.parties[1] || '';
                    break;
                case 'date':
                    value = content.dates[0] || formatDate(new Date());
                    break;
                case 're':
                case 'subject':
                    value = content.subject || '';
                    break;
                case 'body':
                case 'content':
                    value = content.body || content.rawText;
                    break;
                case 'closing':
                    value = 'Sincerely,';
                    break;
                case 'salutation':
                    value = content.parties[0] ? `Dear ${content.parties[0]},` : 'Dear Sir/Madam,';
                    break;
            }
        }
        
        mapped[fieldName] = value || '';
    }
    
    return mapped;
}

/**
 * Format date helper
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Transform document to target format
 * @param {Word.RequestContext} context
 * @param {string} targetFormat - Target template ID
 * @param {Object} fieldValues - Optional field value overrides
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function transformTo(context, targetFormat, fieldValues = {}, options = {}) {
    const template = TRANSFORM_TEMPLATES[targetFormat];
    if (!template) {
        return {
            success: false,
            message: `Unknown transform format: ${targetFormat}`
        };
    }
    
    const startTime = performance.now();
    
    // Analyze content if not overriding everything
    let mappedFields = fieldValues;
    if (!options.skipAnalysis) {
        const content = await analyzeDocumentContent(context, options);
        mappedFields = {
            ...mapContentToTemplate(content, template),
            ...fieldValues
        };
    }
    
    // Get document body
    const body = context.document.body;
    
    // Clear document if requested
    if (options.clearDocument !== false) {
        body.clear();
        await context.sync();
    }
    
    // Build new document structure
    try {
        await buildDocumentFromTemplate(context, template, mappedFields, options);
        await context.sync();
        
        return {
            success: true,
            format: targetFormat,
            templateName: template.name,
            transformTime: performance.now() - startTime,
            message: `Transformed document to ${template.name} format`
        };
    } catch (error) {
        return {
            success: false,
            message: `Transform failed: ${error.message}`
        };
    }
}

/**
 * Build document from template
 */
async function buildDocumentFromTemplate(context, template, fieldValues, options = {}) {
    const body = context.document.body;
    const styling = template.styling;
    
    for (const field of template.structure) {
        const value = fieldValues[field.field] || '';
        
        switch (field.type) {
            case 'title':
                const titlePara = body.insertParagraph(field.label || value, Word.InsertLocation.end);
                titlePara.font.name = styling.titleFont?.name || 'Arial';
                titlePara.font.size = styling.titleFont?.size || 14;
                titlePara.font.bold = styling.titleFont?.bold !== false;
                titlePara.alignment = Word.Alignment.centered;
                titlePara.spaceAfter = styling.headerMargin || 12;
                break;
                
            case 'field':
                const fieldPara = body.insertParagraph('', Word.InsertLocation.end);
                const labelRange = fieldPara.insertText(field.label + ' ', Word.InsertLocation.end);
                labelRange.font.name = styling.labelFont?.name || 'Arial';
                labelRange.font.size = styling.labelFont?.size || 11;
                labelRange.font.bold = styling.labelFont?.bold !== false;
                
                const valueRange = fieldPara.insertText(value || field.placeholder || '', Word.InsertLocation.end);
                valueRange.font.name = styling.bodyFont?.name || 'Arial';
                valueRange.font.size = styling.bodyFont?.size || 11;
                valueRange.font.bold = false;
                
                if (!value && field.placeholder) {
                    valueRange.font.color = '#808080';
                }
                
                fieldPara.spaceAfter = styling.fieldSpacing || 6;
                break;
                
            case 'divider':
                const dividerPara = body.insertParagraph('', Word.InsertLocation.end);
                dividerPara.insertText('_'.repeat(60), Word.InsertLocation.end);
                dividerPara.spaceAfter = 12;
                dividerPara.spaceBefore = 12;
                break;
                
            case 'spacer':
                const spacerPara = body.insertParagraph('', Word.InsertLocation.end);
                spacerPara.spaceAfter = styling.paragraphSpacing || 12;
                break;
                
            case 'body':
            case 'textarea':
                const bodyText = value || field.placeholder || '';
                const bodyParagraphs = bodyText.split(/\n\n+/);
                
                for (const paraText of bodyParagraphs) {
                    if (!paraText.trim()) continue;
                    
                    const para = body.insertParagraph(paraText.trim(), Word.InsertLocation.end);
                    para.font.name = styling.bodyFont?.name || 'Times New Roman';
                    para.font.size = styling.bodyFont?.size || 12;
                    para.lineSpacing = (styling.lineSpacing || 1.0) * 12;
                    para.spaceAfter = styling.paragraphSpacing || 12;
                    
                    if (styling.paragraphIndent) {
                        para.firstLineIndent = styling.paragraphIndent;
                    }
                }
                break;
                
            case 'section':
                // Section heading
                const sectionHead = body.insertParagraph(field.label || '', Word.InsertLocation.end);
                sectionHead.font.name = styling.labelFont?.name || 'Times New Roman';
                sectionHead.font.size = styling.labelFont?.size || 12;
                sectionHead.font.bold = styling.labelFont?.bold !== false;
                if (styling.labelFont?.underline) {
                    sectionHead.font.underline = Word.UnderlineType.single;
                }
                sectionHead.spaceAfter = 12;
                sectionHead.spaceBefore = 18;
                
                // Section content
                if (value) {
                    const sectionPara = body.insertParagraph(value, Word.InsertLocation.end);
                    sectionPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                    sectionPara.font.size = styling.bodyFont?.size || 12;
                    sectionPara.lineSpacing = (styling.lineSpacing || 1.0) * 12;
                    sectionPara.spaceAfter = 12;
                }
                break;
                
            case 'date':
                const datePara = body.insertParagraph(value || formatDate(new Date()), Word.InsertLocation.end);
                datePara.font.name = styling.bodyFont?.name || 'Times New Roman';
                datePara.font.size = styling.bodyFont?.size || 12;
                datePara.spaceAfter = 12;
                break;
                
            case 'signature':
                const sigPara = body.insertParagraph(value || '___________________________', Word.InsertLocation.end);
                sigPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                sigPara.font.size = styling.bodyFont?.size || 12;
                sigPara.spaceBefore = 36;
                break;
                
            case 'salutation':
            case 'closing':
                const greetPara = body.insertParagraph(value || field.placeholder || '', Word.InsertLocation.end);
                greetPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                greetPara.font.size = styling.bodyFont?.size || 12;
                greetPara.spaceAfter = 12;
                break;
                
            case 'address':
                if (value) {
                    const addrLines = value.split(/[,\n]+/);
                    for (const line of addrLines) {
                        const addrPara = body.insertParagraph(line.trim(), Word.InsertLocation.end);
                        addrPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                        addrPara.font.size = styling.bodyFont?.size || 12;
                        addrPara.spaceAfter = 0;
                    }
                }
                break;
                
            case 'court':
                const courtPara = body.insertParagraph(value || field.placeholder || 'IN THE [COURT NAME]', Word.InsertLocation.end);
                courtPara.font.name = styling.titleFont?.name || 'Times New Roman';
                courtPara.font.size = styling.titleFont?.size || 14;
                courtPara.font.bold = true;
                courtPara.alignment = Word.Alignment.centered;
                courtPara.spaceAfter = 24;
                break;
                
            case 'caption':
                // Build legal caption
                const parties = (value || '').split(/\s+(?:v\.?|vs\.?)\s+/i);
                const plaintiff = parties[0] || 'PLAINTIFF';
                const defendant = parties[1] || 'DEFENDANT';
                
                const captionPara = body.insertParagraph('', Word.InsertLocation.end);
                captionPara.insertText(`${plaintiff.toUpperCase()},\n`, Word.InsertLocation.end);
                captionPara.insertText(`\t\tPlaintiff,\n\n`, Word.InsertLocation.end);
                captionPara.insertText(`\tv.\t\t\t\tCase No. __________\n\n`, Word.InsertLocation.end);
                captionPara.insertText(`${defendant.toUpperCase()},\n`, Word.InsertLocation.end);
                captionPara.insertText(`\t\tDefendant.`, Word.InsertLocation.end);
                
                captionPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                captionPara.font.size = styling.bodyFont?.size || 12;
                captionPara.lineSpacing = 14;
                captionPara.spaceAfter = 24;
                break;
                
            case 'briefTitle':
            case 'pleadingTitle':
                const briefTitlePara = body.insertParagraph(value || field.placeholder || '', Word.InsertLocation.end);
                briefTitlePara.font.name = styling.titleFont?.name || 'Times New Roman';
                briefTitlePara.font.size = styling.titleFont?.size || 14;
                briefTitlePara.font.bold = true;
                briefTitlePara.alignment = Word.Alignment.centered;
                briefTitlePara.spaceAfter = 24;
                briefTitlePara.spaceBefore = 12;
                break;
                
            case 'checkbox':
                const checkPara = body.insertParagraph('', Word.InsertLocation.end);
                const checked = fieldValues[field.field] === true;
                checkPara.insertText(checked ? '[X] ' : '[ ] ', Word.InsertLocation.end);
                checkPara.insertText(field.label || '', Word.InsertLocation.end);
                checkPara.font.name = styling.labelFont?.name || 'Arial';
                checkPara.font.size = styling.labelFont?.size || 11;
                checkPara.spaceAfter = 6;
                break;
                
            default:
                // Generic text field
                if (value) {
                    const textPara = body.insertParagraph(value, Word.InsertLocation.end);
                    textPara.font.name = styling.bodyFont?.name || 'Times New Roman';
                    textPara.font.size = styling.bodyFont?.size || 12;
                    textPara.spaceAfter = styling.fieldSpacing || 6;
                }
        }
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Get available transform templates
 * @returns {Array}
 */
function getTransformTemplates() {
    return Object.entries(TRANSFORM_TEMPLATES).map(([id, template]) => ({
        id: id,
        name: template.name,
        description: template.description,
        fieldCount: template.structure.filter(f => f.required).length
    }));
}

/**
 * Get template by ID
 * @param {string} templateId
 * @returns {Object|null}
 */
function getTemplate(templateId) {
    return TRANSFORM_TEMPLATES[templateId] || null;
}

/**
 * Generate transform form HTML for a template
 * @param {string} templateId
 * @param {Object} values - Pre-filled values
 * @returns {string}
 */
function generateTransformFormHTML(templateId, values = {}) {
    const template = TRANSFORM_TEMPLATES[templateId];
    if (!template) return '<p>Unknown template</p>';
    
    let html = `<div class="transform-form" data-template="${escapeAttr(templateId)}">`;
    html += `<h4>${escapeHtml(template.name)}</h4>`;
    html += `<p class="form-description">${escapeHtml(template.description)}</p>`;
    
    const addedFields = new Set();
    
    for (const field of template.structure) {
        // Skip non-input fields
        if (['divider', 'spacer', 'title'].includes(field.type)) continue;
        // Skip duplicates
        if (addedFields.has(field.field)) continue;
        addedFields.add(field.field);
        
        const value = values[field.field] || '';
        const required = field.required ? 'required' : '';
        const requiredMark = field.required ? '<span class="required">*</span>' : '';
        
        html += `<div class="form-group">`;
        html += `<label for="tf-${escapeAttr(field.field)}">${escapeHtml(field.label || capitalizeFirst(field.field))}${requiredMark}</label>`;
        
        if (field.type === 'body' || field.type === 'textarea' || field.type === 'section') {
            html += `<textarea id="tf-${escapeAttr(field.field)}" 
                              name="${escapeAttr(field.field)}" 
                              ${required}
                              placeholder="${escapeAttr(field.placeholder || '')}"
                              rows="4">${escapeHtml(value)}</textarea>`;
        } else if (field.type === 'checkbox') {
            html += `<input type="checkbox" 
                           id="tf-${escapeAttr(field.field)}" 
                           name="${escapeAttr(field.field)}"
                           ${value ? 'checked' : ''}>`;
        } else {
            const inputType = field.type === 'date' ? 'date' : 'text';
            html += `<input type="${inputType}" 
                           id="tf-${escapeAttr(field.field)}" 
                           name="${escapeAttr(field.field)}" 
                           ${required}
                           placeholder="${escapeAttr(field.placeholder || '')}"
                           value="${escapeAttr(value)}">`;
        }
        
        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

/**
 * Generate template selector dropdown HTML
 * @param {string} selectedId
 * @returns {string}
 */
function generateTemplateDropdownHTML(selectedId = '') {
    let html = '<option value="">Select format...</option>';
    
    for (const [id, template] of Object.entries(TRANSFORM_TEMPLATES)) {
        const selected = id === selectedId ? 'selected' : '';
        html += `<option value="${escapeAttr(id)}" ${selected}>${escapeHtml(template.name)}</option>`;
    }
    
    return html;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1');
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

// ============================================================================
// EXPORT
// ============================================================================

const TransformModule = {
    // Main API
    analyzeDocumentContent,
    previewTransform,
    transformTo,
    
    // Template access
    getTransformTemplates,
    getTemplate,
    TRANSFORM_TEMPLATES,
    
    // Content analysis helpers
    extractParties,
    extractDates,
    extractSubject,
    extractBody,
    detectSourceType,
    
    // UI helpers
    generateTransformFormHTML,
    generateTemplateDropdownHTML,
    
    // Classes
    AnalyzedContent,
    TransformPreview,
    
    // Version
    VERSION: '1.0.0'
};

// Browser environment
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.Transform = TransformModule;
}

// Node.js / CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformModule;
}
