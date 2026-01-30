/**
 * DocForge Letterhead Insertion Module
 * 
 * Handles insertion of letterhead, attorney info, and document headers
 * into Word documents via the Office.js API.
 */

// ============================================================================
// Configuration & State
// ============================================================================

const LetterheadConfig = {
    // Default typography
    typography: {
        firmNameFont: 'Georgia',
        firmNameSize: 18,
        addressFont: 'Arial',
        addressSize: 9
    },
    
    // Default colors (professional navy)
    colors: {
        primary: '#1a365d',
        secondary: '#4a5568',
        accent: '#2563eb'
    },
    
    // Date format options
    dateFormats: {
        'MMMM D, YYYY': { month: 'long', day: 'numeric', year: 'numeric' },
        'MMM D, YYYY': { month: 'short', day: 'numeric', year: 'numeric' },
        'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
        'D MMMM YYYY': { day: 'numeric', month: 'long', year: 'numeric' }
    }
};

// ============================================================================
// HTML Generation
// ============================================================================

/**
 * Generate letterhead HTML
 * @param {Object} firm - Firm configuration from schema
 * @param {Object} options - Display options
 * @returns {string} HTML string
 */
function generateLetterheadHtml(firm, options = {}) {
    const layout = options.layout || 'split';
    const showLogo = options.showLogo !== false && firm.logo?.data;
    
    const address = firm.primaryOffice?.address || {};
    const addressLine = `${address.street}${address.street2 ? ', ' + address.street2 : ''}`;
    const cityLine = `${address.city}, ${address.state} ${address.zip}`;
    
    const contactParts = [];
    if (firm.primaryOffice?.phone) contactParts.push(`Tel: ${firm.primaryOffice.phone}`);
    if (firm.primaryOffice?.fax) contactParts.push(`Fax: ${firm.primaryOffice.fax}`);
    
    const styles = {
        firmName: `font-family: ${LetterheadConfig.typography.firmNameFont}; font-size: ${LetterheadConfig.typography.firmNameSize}pt; font-weight: bold; color: ${LetterheadConfig.colors.primary};`,
        address: `font-family: ${LetterheadConfig.typography.addressFont}; font-size: ${LetterheadConfig.typography.addressSize}pt; color: ${LetterheadConfig.colors.secondary};`,
        tagline: `font-family: ${LetterheadConfig.typography.addressFont}; font-size: 10pt; font-style: italic; color: ${LetterheadConfig.colors.secondary};`
    };
    
    if (layout === 'split') {
        return `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24pt;">
                <tr>
                    <td style="vertical-align: top; width: 60%;">
                        ${showLogo ? `<img src="${firm.logo.data}" style="max-width: ${firm.logo.width || 2}in; margin-bottom: 6pt;"><br>` : ''}
                        <span style="${styles.firmName}">${firm.firmName}</span>
                        ${firm.tagline ? `<br><span style="${styles.tagline}">${firm.tagline}</span>` : ''}
                    </td>
                    <td style="vertical-align: top; text-align: right;">
                        <span style="${styles.address}">
                            ${addressLine}<br>
                            ${cityLine}<br>
                            ${contactParts.join(' | ')}
                            ${firm.primaryOffice?.website ? `<br>${firm.primaryOffice.website}` : ''}
                        </span>
                    </td>
                </tr>
            </table>
            <hr style="border: none; border-top: 1px solid ${LetterheadConfig.colors.primary}; margin-bottom: 18pt;">
        `;
    }
    
    if (layout === 'centered') {
        return `
            <div style="text-align: center; margin-bottom: 24pt;">
                ${showLogo ? `<img src="${firm.logo.data}" style="max-width: ${firm.logo.width || 2}in; margin-bottom: 6pt;"><br>` : ''}
                <span style="${styles.firmName}">${firm.firmName}</span>
                ${firm.tagline ? `<br><span style="${styles.tagline}">${firm.tagline}</span>` : ''}
                <br><br>
                <span style="${styles.address}">
                    ${addressLine} | ${cityLine}<br>
                    ${contactParts.join(' | ')}
                </span>
            </div>
            <hr style="border: none; border-top: 1px solid ${LetterheadConfig.colors.primary}; margin-bottom: 18pt;">
        `;
    }
    
    if (layout === 'minimal') {
        return `
            <div style="text-align: center; margin-bottom: 18pt;">
                <span style="${styles.firmName}">${firm.firmName}</span>
            </div>
            <hr style="border: none; border-top: 1px solid ${LetterheadConfig.colors.primary}; margin-bottom: 18pt;">
        `;
    }
    
    // Default: left-aligned
    return `
        <div style="margin-bottom: 24pt;">
            ${showLogo ? `<img src="${firm.logo.data}" style="max-width: ${firm.logo.width || 2}in; margin-bottom: 6pt;"><br>` : ''}
            <span style="${styles.firmName}">${firm.firmName}</span>
            <br>
            <span style="${styles.address}">
                ${addressLine} | ${cityLine} | ${contactParts.join(' | ')}
            </span>
        </div>
        <hr style="border: none; border-top: 1px solid ${LetterheadConfig.colors.primary}; margin-bottom: 18pt;">
    `;
}

/**
 * Generate attorney info block HTML
 * @param {Object} attorney - Attorney profile from schema
 * @param {Object} options - Display options
 * @returns {string} HTML string
 */
function generateAttorneyBlockHtml(attorney, options = {}) {
    const format = options.format || 'full';
    const phoneLabel = attorney.display?.phoneLabel || "Writer's Direct:";
    
    // Build full name
    const nameParts = [];
    if (attorney.name.prefix) nameParts.push(attorney.name.prefix);
    nameParts.push(attorney.name.first);
    if (attorney.name.middle) nameParts.push(attorney.name.middle);
    nameParts.push(attorney.name.last);
    if (attorney.name.suffix) nameParts.push(attorney.name.suffix);
    
    const fullName = nameParts.join(' ');
    const credentials = attorney.name.credentials?.join(', ') || '';
    
    // Get primary bar number
    const primaryBar = attorney.barNumbers.find(b => b.isPrimary) || attorney.barNumbers[0];
    const barDisplay = options.showAllBars 
        ? attorney.barNumbers.map(b => `${b.jurisdiction} ${b.number}`).join(', ')
        : `${primaryBar.jurisdiction} Bar No. ${primaryBar.number}`;
    
    const styles = {
        container: 'font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4;',
        name: 'font-weight: bold; font-size: 11pt;',
        title: 'color: #4a5568;',
        contact: 'color: #1f2937;',
        bar: 'color: #6b7280; font-size: 9pt;'
    };
    
    if (format === 'minimal') {
        return `
            <div style="${styles.container}">
                <span style="${styles.name}">${fullName}</span><br>
                <span style="${styles.contact}">${attorney.email}</span>
            </div>
        `;
    }
    
    if (format === 'compact') {
        return `
            <div style="${styles.container}">
                <span style="${styles.name}">${fullName}${credentials ? ', ' + credentials : ''}</span><br>
                <span style="${styles.title}">${attorney.title}</span><br>
                <span style="${styles.contact}">${phoneLabel} ${attorney.directPhone}</span><br>
                <span style="${styles.contact}">${attorney.email}</span>
            </div>
        `;
    }
    
    // Full format
    let html = `
        <div style="${styles.container}">
            <span style="${styles.name}">${fullName}${credentials ? ', ' + credentials : ''}</span><br>
            <span style="${styles.title}">${attorney.title}</span><br>
            <span style="${styles.contact}">${phoneLabel} ${attorney.directPhone}</span><br>
            <span style="${styles.contact}">${attorney.email}</span><br>
            <span style="${styles.bar}">${barDisplay}</span>
    `;
    
    if (attorney.primaryPracticeGroup) {
        html += `<br><span style="${styles.title}">${attorney.primaryPracticeGroup}</span>`;
    }
    
    if (options.showAssistant && attorney.assistant?.name) {
        html += `
            <br><br>
            <span style="font-size: 9pt; color: #6b7280;">
                Assistant: ${attorney.assistant.name}
                ${attorney.assistant.phone ? ` | ${attorney.assistant.phone}` : ''}
            </span>
        `;
    }
    
    html += '</div>';
    return html;
}

/**
 * Generate document info block HTML
 * @param {Object} docInfo - Document info from schema
 * @param {Object} options - Display options
 * @returns {string} HTML string
 */
function generateDocumentInfoHtml(docInfo, options = {}) {
    const parts = [];
    const styles = {
        container: 'font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin-bottom: 18pt;',
        label: 'font-weight: bold;',
        confidential: 'font-weight: bold; text-transform: uppercase; color: #dc2626;',
        via: 'font-style: italic; text-transform: uppercase;',
        draft: 'font-weight: bold; color: #d97706; border: 2px solid #d97706; padding: 2pt 8pt; display: inline-block;'
    };
    
    // Confidentiality notice (if at top)
    if (docInfo.confidentiality?.enabled && docInfo.confidentiality.position === 'above-date') {
        const notice = docInfo.confidentiality.customNotice || docInfo.confidentiality.notice;
        parts.push(`<div style="${styles.confidential}">${notice}</div><br>`);
    }
    
    // Via line
    if (docInfo.via?.enabled) {
        const method = docInfo.via.customMethod || docInfo.via.method;
        parts.push(`<div style="${styles.via}">${method}</div><br>`);
    }
    
    // Date
    if (docInfo.date) {
        const dateValue = docInfo.date.useToday ? new Date() : new Date(docInfo.date.value);
        const formatOptions = LetterheadConfig.dateFormats[docInfo.date.format] || LetterheadConfig.dateFormats['MMMM D, YYYY'];
        const formattedDate = dateValue.toLocaleDateString('en-US', formatOptions);
        parts.push(`<div>${formattedDate}</div>`);
    }
    
    // Recipient
    if (docInfo.recipient?.enabled && docInfo.recipient.name) {
        let recipientBlock = '<br>';
        recipientBlock += docInfo.recipient.name;
        if (docInfo.recipient.title) recipientBlock += `<br>${docInfo.recipient.title}`;
        if (docInfo.recipient.company) recipientBlock += `<br>${docInfo.recipient.company}`;
        if (docInfo.recipient.address) {
            const addr = docInfo.recipient.address;
            if (addr.street) recipientBlock += `<br>${addr.street}`;
            if (addr.street2) recipientBlock += `<br>${addr.street2}`;
            if (addr.city) recipientBlock += `<br>${addr.city}, ${addr.state} ${addr.zip}`;
        }
        parts.push(`<div>${recipientBlock}</div>`);
    }
    
    // Re: line
    if (docInfo.re?.enabled) {
        const label = docInfo.re.label || 'Re:';
        let reLine = '';
        
        if (docInfo.re.format === 'custom' && docInfo.re.customText) {
            reLine = docInfo.re.customText;
        } else if (docInfo.re.format === 'client-matter') {
            reLine = `${docInfo.re.clientName || ''} / ${docInfo.re.matterName || ''}`;
        } else if (docInfo.re.format === 'matter-only') {
            reLine = docInfo.re.matterName || '';
        } else if (docInfo.re.format === 'client-only') {
            reLine = docInfo.re.clientName || '';
        } else if (docInfo.re.format === 'number-only') {
            reLine = docInfo.re.matterNumber || '';
        }
        
        if (reLine) {
            parts.push(`<br><div><span style="${styles.label}">${label}</span> ${reLine}</div>`);
        }
    }
    
    // Version/Draft indicator
    if (docInfo.version?.enabled) {
        const version = docInfo.version.number 
            ? `${docInfo.version.status} ${docInfo.version.number}`
            : docInfo.version.status;
        parts.push(`<br><span style="${styles.draft}">${version}</span>`);
    }
    
    // Salutation
    if (docInfo.salutation?.enabled) {
        const greeting = docInfo.salutation.text || 'Dear';
        const recipient = docInfo.salutation.recipientRef || 'Sir or Madam';
        const punct = docInfo.salutation.punctuation || ':';
        parts.push(`<br><br><div>${greeting} ${recipient}${punct}</div>`);
    }
    
    return `<div style="${styles.container}">${parts.join('')}</div>`;
}

/**
 * Generate continuation page header HTML
 * @param {Object} firm - Firm configuration
 * @param {Object} options - Continuation page options
 * @returns {string} HTML string
 */
function generateContinuationHeaderHtml(firm, options = {}) {
    const style = options.style || 'firm-name-only';
    const showPageNumber = options.showPageNumber !== false;
    const pageFormat = options.pageNumberFormat || 'Page X of Y';
    
    const baseStyle = 'font-family: Arial, sans-serif; font-size: 9pt; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6pt; margin-bottom: 12pt;';
    
    // Page number placeholder (Word will replace with actual numbers)
    let pageNum = '';
    if (showPageNumber) {
        pageNum = pageFormat
            .replace('X', '{{ PAGE }}')
            .replace('Y', '{{ NUMPAGES }}');
    }
    
    if (style === 'firm-name-only') {
        return `
            <table style="width: 100%; ${baseStyle}">
                <tr>
                    <td>${firm.firmName}</td>
                    ${showPageNumber ? `<td style="text-align: right;">${pageNum}</td>` : ''}
                </tr>
            </table>
        `;
    }
    
    if (style === 'page-number-only') {
        return `
            <div style="${baseStyle} text-align: center;">
                ${pageNum}
            </div>
        `;
    }
    
    // Mini logo or full
    return `
        <table style="width: 100%; ${baseStyle}">
            <tr>
                <td>
                    ${style === 'mini-logo' && firm.logo?.data 
                        ? `<img src="${firm.logo.data}" style="height: 0.3in; margin-right: 8pt; vertical-align: middle;">`
                        : ''
                    }
                    ${firm.firmName}
                </td>
                ${showPageNumber ? `<td style="text-align: right;">${pageNum}</td>` : ''}
            </tr>
        </table>
    `;
}

// ============================================================================
// Word API Integration
// ============================================================================

/**
 * Insert letterhead into document header (first page)
 * @param {Object} firm - Firm configuration
 * @param {Object} options - Display options
 */
async function insertLetterheadToHeader(firm, options = {}) {
    await Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();
        
        const firstSection = sections.items[0];
        
        // Enable different first page header
        firstSection.headerFooterDistanceFirstPage = 36; // 0.5 inch
        
        const header = firstSection.getHeader(Word.HeaderFooterType.firstPage);
        header.clear();
        
        const html = generateLetterheadHtml(firm, options);
        header.insertHtml(html, Word.InsertLocation.start);
        
        await context.sync();
    });
}

/**
 * Insert attorney info block at cursor position
 * @param {Object} attorney - Attorney profile
 * @param {Object} options - Display options
 */
async function insertAttorneyBlock(attorney, options = {}) {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const html = generateAttorneyBlockHtml(attorney, options);
        selection.insertHtml(html, Word.InsertLocation.end);
        await context.sync();
    });
}

/**
 * Insert document info block at cursor position
 * @param {Object} docInfo - Document info configuration
 * @param {Object} options - Display options
 */
async function insertDocumentInfo(docInfo, options = {}) {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const html = generateDocumentInfoHtml(docInfo, options);
        selection.insertHtml(html, Word.InsertLocation.end);
        await context.sync();
    });
}

/**
 * Insert full document header (letterhead + attorney + doc info)
 * @param {Object} firm - Firm configuration
 * @param {Object} attorney - Attorney profile
 * @param {Object} docInfo - Document info
 * @param {Object} options - Combined options
 */
async function insertFullHeader(firm, attorney, docInfo, options = {}) {
    await Word.run(async (context) => {
        // Insert letterhead to header
        if (options.insertToHeader !== false) {
            const sections = context.document.sections;
            sections.load('items');
            await context.sync();
            
            const firstSection = sections.items[0];
            const header = firstSection.getHeader(Word.HeaderFooterType.firstPage);
            header.clear();
            
            const letterheadHtml = generateLetterheadHtml(firm, options.letterhead);
            header.insertHtml(letterheadHtml, Word.InsertLocation.start);
        }
        
        // Insert attorney and doc info to body
        const body = context.document.body;
        
        // Create a table for side-by-side layout
        const tableHtml = `
            <table style="width: 100%; margin-bottom: 18pt;">
                <tr>
                    <td style="width: 60%; vertical-align: top;">
                        ${generateDocumentInfoHtml(docInfo, options.docInfo)}
                    </td>
                    <td style="width: 40%; vertical-align: top; text-align: right;">
                        ${generateAttorneyBlockHtml(attorney, options.attorney)}
                    </td>
                </tr>
            </table>
        `;
        
        body.insertHtml(tableHtml, Word.InsertLocation.start);
        
        // Set up continuation page header if configured
        if (firm.continuationPage?.enabled) {
            const sections = context.document.sections;
            sections.load('items');
            await context.sync();
            
            const firstSection = sections.items[0];
            const contHeader = firstSection.getHeader(Word.HeaderFooterType.primary);
            contHeader.clear();
            
            const contHtml = generateContinuationHeaderHtml(firm, firm.continuationPage);
            contHeader.insertHtml(contHtml, Word.InsertLocation.start);
        }
        
        await context.sync();
    });
}

/**
 * Insert date at cursor with specified format
 * @param {string} format - Date format key
 */
async function insertFormattedDate(format = 'MMMM D, YYYY') {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const formatOptions = LetterheadConfig.dateFormats[format] || LetterheadConfig.dateFormats['MMMM D, YYYY'];
        const formattedDate = new Date().toLocaleDateString('en-US', formatOptions);
        selection.insertText(formattedDate, Word.InsertLocation.end);
        await context.sync();
    });
}

// ============================================================================
// Data Management
// ============================================================================

/**
 * Load firm letterhead configuration from storage
 * @returns {Promise<Object>} Firm configuration
 */
async function loadFirmConfig() {
    // In production, load from backend/localStorage
    const stored = localStorage.getItem('docforge_firm_config');
    if (stored) {
        return JSON.parse(stored);
    }
    return null;
}

/**
 * Save firm letterhead configuration
 * @param {Object} config - Firm configuration
 */
async function saveFirmConfig(config) {
    // Validate against schema (simplified)
    if (!config.firmName || !config.primaryOffice) {
        throw new Error('Invalid firm configuration: missing required fields');
    }
    
    config.metadata = {
        ...config.metadata,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('docforge_firm_config', JSON.stringify(config));
    
    // In production, also sync to backend
    // await api.post('/letterhead/firm', config);
}

/**
 * Load attorney profiles
 * @returns {Promise<Object[]>} Array of attorney profiles
 */
async function loadAttorneyProfiles() {
    const stored = localStorage.getItem('docforge_attorneys');
    if (stored) {
        return JSON.parse(stored);
    }
    return [];
}

/**
 * Save attorney profile
 * @param {Object} profile - Attorney profile
 */
async function saveAttorneyProfile(profile) {
    const profiles = await loadAttorneyProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    
    profile.metadata = {
        ...profile.metadata,
        updatedAt: new Date().toISOString()
    };
    
    if (index >= 0) {
        profiles[index] = profile;
    } else {
        profile.metadata.createdAt = new Date().toISOString();
        profiles.push(profile);
    }
    
    localStorage.setItem('docforge_attorneys', JSON.stringify(profiles));
}

/**
 * Get current user's attorney profile
 * @returns {Promise<Object|null>} Attorney profile or null
 */
async function getCurrentUserProfile() {
    const profiles = await loadAttorneyProfiles();
    return profiles.find(p => p.metadata?.isCurrentUser) || null;
}

// ============================================================================
// Exports
// ============================================================================

// Export for use in taskpane and other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // HTML generators
        generateLetterheadHtml,
        generateAttorneyBlockHtml,
        generateDocumentInfoHtml,
        generateContinuationHeaderHtml,
        
        // Word API functions
        insertLetterheadToHeader,
        insertAttorneyBlock,
        insertDocumentInfo,
        insertFullHeader,
        insertFormattedDate,
        
        // Data management
        loadFirmConfig,
        saveFirmConfig,
        loadAttorneyProfiles,
        saveAttorneyProfile,
        getCurrentUserProfile,
        
        // Configuration
        LetterheadConfig
    };
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
    window.DocForgeLetterhead = {
        generateLetterheadHtml,
        generateAttorneyBlockHtml,
        generateDocumentInfoHtml,
        generateContinuationHeaderHtml,
        insertLetterheadToHeader,
        insertAttorneyBlock,
        insertDocumentInfo,
        insertFullHeader,
        insertFormattedDate,
        loadFirmConfig,
        saveFirmConfig,
        loadAttorneyProfiles,
        saveAttorneyProfile,
        getCurrentUserProfile,
        LetterheadConfig
    };
}
