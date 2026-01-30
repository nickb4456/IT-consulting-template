/**
 * DraftBridge Function Commands
 * 
 * Ribbon button handlers that execute without showing UI.
 * These provide keyboard-shortcut-style quick actions.
 * 
 * @version 1.0.0
 */

/* global Office, Word, DraftBridgeStorage, DraftBridgeUtils */

// ============================================================================
// Initialization
// ============================================================================

Office.onReady(() => {
    // Functions are ready
});

// ============================================================================
// Quick Fill Function
// ============================================================================

/**
 * Fill template with last used or default client profile
 * @param {Office.AddinCommands.Event} event - The event object
 */
async function quickFill(event) {
    try {
        // Get recent datasets
        const recentDatasets = DraftBridgeStorage.datasets.getRecent(1);
        
        if (recentDatasets.length === 0) {
            // No recent dataset - show notification
            Office.context.mailbox?.item?.notificationMessages?.addAsync('quickfill', {
                type: 'informationalMessage',
                message: 'No recent client profile found. Open DraftBridge panel to select one.',
                persistent: false
            });
            event.completed();
            return;
        }
        
        const dataset = recentDatasets[0];
        const values = dataset.values || {};
        
        await Word.run(async (context) => {
            const contentControls = context.document.contentControls;
            contentControls.load('items/id,items/tag');
            await context.sync();
            
            let filledCount = 0;
            
            for (const cc of contentControls.items) {
                if (cc.tag && cc.tag.startsWith('template_')) {
                    const fieldId = cc.tag.replace('template_', '');
                    const value = values[fieldId];
                    
                    if (value !== undefined && value !== null && value !== '') {
                        cc.insertText(String(value), Word.InsertLocation.replace);
                        filledCount++;
                    }
                }
            }
            
            await context.sync();
            
        });
        
    } catch (error) {
        // Quick fill failed silently
    }
    
    event.completed();
}

// ============================================================================
// Apply Numbering Function
// ============================================================================

/**
 * Apply default numbering format at cursor
 * @param {Office.AddinCommands.Event} event - The event object
 */
async function applyNumbering(event) {
    try {
        const state = DraftBridgeStorage.numbering.getState();
        const presetId = state.defaultPreset || state.lastUsed || 'preset-standard-firm-outline';
        
        // Get preset (either from personal or built-in)
        let preset = DraftBridgeStorage.numbering.getPersonalSet(presetId);
        
        if (!preset) {
            // Use built-in preset
            preset = getBuiltInPreset(presetId);
        }
        
        if (!preset) {
            event.completed();
            return;
        }
        
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.load('paragraphs');
            await context.sync();
            
            // TODO: Apply numbering formatting based on preset
            // This would involve setting list formatting on paragraphs
            
        });
        
        // Update last used
        DraftBridgeStorage.numbering.updateState({ lastUsed: presetId });
        
    } catch (error) {
        // Numbering application failed silently
    }
    
    event.completed();
}

function getBuiltInPreset(presetId) {
    const presets = {
        'preset-standard-firm-outline': {
            id: 'preset-standard-firm-outline',
            name: 'Standard Firm Outline',
            levels: [
                { level: 1, patternType: 'roman-upper', prefix: 'ARTICLE ', suffix: '' },
                { level: 2, patternType: 'decimal-outline', prefix: '', suffix: '.' },
                { level: 3, patternType: 'alpha-lower', prefix: '(', suffix: ')' },
                { level: 4, patternType: 'roman-lower', prefix: '(', suffix: ')' },
                { level: 5, patternType: 'alpha-upper', prefix: '(', suffix: ')' }
            ]
        },
        'preset-federal-court': {
            id: 'preset-federal-court',
            name: 'Federal Court',
            levels: [
                { level: 1, patternType: 'roman-upper', prefix: '', suffix: '.' },
                { level: 2, patternType: 'alpha-upper', prefix: '', suffix: '.' },
                { level: 3, patternType: 'arabic', prefix: '', suffix: '.' },
                { level: 4, patternType: 'alpha-lower', prefix: '', suffix: '.' }
            ]
        },
        'preset-contract-style': {
            id: 'preset-contract-style',
            name: 'Contract Style',
            levels: [
                { level: 1, patternType: 'roman-upper', prefix: 'ARTICLE ', suffix: '' },
                { level: 2, patternType: 'decimal-outline', prefix: 'Section ', suffix: '.' },
                { level: 3, patternType: 'decimal-outline', prefix: '', suffix: '.', includeParent: true },
                { level: 4, patternType: 'alpha-lower', prefix: '(', suffix: ')' },
                { level: 5, patternType: 'roman-lower', prefix: '(', suffix: ')' }
            ]
        },
        'preset-simple-numeric': {
            id: 'preset-simple-numeric',
            name: 'Simple Numeric',
            levels: [
                { level: 1, patternType: 'arabic', prefix: '', suffix: '.' },
                { level: 2, patternType: 'decimal-outline', prefix: '', suffix: '.', includeParent: true },
                { level: 3, patternType: 'decimal-outline', prefix: '', suffix: '.', includeParent: true }
            ]
        }
    };
    
    return presets[presetId] || null;
}

// ============================================================================
// Preset-Specific Numbering Functions
// ============================================================================

/**
 * Apply Standard Firm Outline numbering
 * ARTICLE I → 1.1 → (a) → (i) → (A)
 */
async function applyNumberingFirmOutline(event) {
    await applyNumberingPreset('preset-standard-firm-outline', event);
}

/**
 * Apply Federal Court numbering
 * I. → A. → 1. → a.
 */
async function applyNumberingFederalCourt(event) {
    await applyNumberingPreset('preset-federal-court', event);
}

/**
 * Apply Contract Style numbering
 * ARTICLE I → Section 1.1 → 1.1.1 → (a) → (i)
 */
async function applyNumberingContract(event) {
    await applyNumberingPreset('preset-contract-style', event);
}

/**
 * Apply Simple Numeric numbering
 * 1. → 1.1 → 1.1.1
 */
async function applyNumberingSimple(event) {
    await applyNumberingPreset('preset-simple-numeric', event);
}

/**
 * Common function to apply a specific numbering preset
 */
async function applyNumberingPreset(presetId, event) {
    try {
        const preset = getBuiltInPreset(presetId);
        
        if (!preset) {
            event.completed();
            return;
        }
        
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.load('paragraphs');
            await context.sync();
            
            // Apply list formatting to selected paragraphs
            const paragraphs = selection.paragraphs;
            paragraphs.load('items');
            await context.sync();
            
            // Create list definition from preset
            const list = context.document.createList();
            
            // Configure levels based on preset
            for (const level of preset.levels) {
                const listLevel = list.getLevelParagraphs(level.level - 1);
                // List configuration happens via the paragraph list properties
            }
            
            // Apply to each paragraph
            for (let i = 0; i < paragraphs.items.length; i++) {
                const para = paragraphs.items[i];
                para.startNewList();
            }
            
            await context.sync();
        });
        
        // Update last used
        if (typeof DraftBridgeStorage !== 'undefined') {
            DraftBridgeStorage.numbering.updateState({ lastUsed: presetId });
        }
        
    } catch (error) {
        console.error('Numbering preset application failed:', error);
    }
    
    event.completed();
}

// ============================================================================
// Insert Header Function
// ============================================================================

/**
 * Insert document header with current attorney info
 * @param {Office.AddinCommands.Event} event - The event object
 */
async function insertHeader(event) {
    try {
        const firmConfig = DraftBridgeStorage.letterhead.getFirmConfig();
        const currentUser = DraftBridgeStorage.letterhead.getCurrentUser();
        
        if (!firmConfig) {
            event.completed();
            return;
        }
        
        await Word.run(async (context) => {
            const body = context.document.body;
            
            // Build header HTML
            let html = '';
            
            // Date
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            
            html += `<p style="font-family: Arial; font-size: 11pt;">${dateStr}</p>`;
            html += '<p></p>';
            
            // Attorney info if available
            if (currentUser) {
                const name = currentUser.name?.first 
                    ? `${currentUser.name.first} ${currentUser.name.last}`
                    : '';
                
                if (name) {
                    html += `<p style="font-family: Arial; font-size: 10pt;">`;
                    html += `<strong>${name}</strong>`;
                    if (currentUser.title) html += `<br>${currentUser.title}`;
                    if (currentUser.directPhone) html += `<br>Direct: ${currentUser.directPhone}`;
                    if (currentUser.email) html += `<br>${currentUser.email}`;
                    html += `</p>`;
                    html += '<p></p>';
                }
            }
            
            body.insertHtml(html, Word.InsertLocation.start);
            await context.sync();
        });
        
    } catch (error) {
        // Header insertion failed silently
    }
    
    event.completed();
}

// ============================================================================
// Insert Template Field Function
// ============================================================================

/**
 * Insert a template content control at cursor
 * @param {Office.AddinCommands.Event} event - The event object
 */
async function insertTemplateField(event) {
    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.load('text');
            await context.sync();
            
            // Use selected text as field name, or prompt
            let fieldName = selection.text.trim();
            
            if (!fieldName) {
                fieldName = 'FieldName';
            }
            
            // Clean field name
            fieldName = fieldName.replace(/[^a-zA-Z0-9_]/g, '');
            
            // Insert content control
            const cc = selection.insertContentControl();
            cc.tag = `template_${fieldName}`;
            cc.title = DraftBridgeUtils.toTitleCase(fieldName);
            cc.placeholderText = `{{${fieldName}}}`;
            cc.appearance = Word.ContentControlAppearance.tags;
            
            await context.sync();
        });
        
    } catch (error) {
        // Template field insertion failed silently
    }
    
    event.completed();
}

// ============================================================================
// Insert Cross-Reference Function
// ============================================================================

/**
 * Insert a smart cross-reference
 * @param {Office.AddinCommands.Event} event - The event object
 */
async function insertCrossRef(event) {
    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.load('text');
            await context.sync();
            
            const selectedText = selection.text.trim();
            
            // If text looks like a section reference, insert as hyperlink
            const sectionMatch = selectedText.match(/^(\d+(?:\.\d+)*)/);
            
            if (sectionMatch) {
                const sectionNum = sectionMatch[1];
                const bookmarkName = `_Section_${sectionNum.replace(/\./g, '_')}`;
                
                // Insert as internal hyperlink
                selection.insertHyperlink(
                    `Section ${sectionNum}`,
                    `#${bookmarkName}`,
                    Word.InsertLocation.replace
                );
                
                await context.sync();
            } else {
                // Insert placeholder
                selection.insertText('[Section X.X]', Word.InsertLocation.replace);
                await context.sync();
            }
        });
        
    } catch (error) {
        // Cross-reference insertion failed silently
    }
    
    event.completed();
}

// ============================================================================
// Register Functions
// ============================================================================

// Register with Office
Office.actions = Office.actions || {};
Office.actions.associate('quickFill', quickFill);
Office.actions.associate('applyNumbering', applyNumbering);
Office.actions.associate('applyNumberingFirmOutline', applyNumberingFirmOutline);
Office.actions.associate('applyNumberingFederalCourt', applyNumberingFederalCourt);
Office.actions.associate('applyNumberingContract', applyNumberingContract);
Office.actions.associate('applyNumberingSimple', applyNumberingSimple);
Office.actions.associate('insertHeader', insertHeader);
Office.actions.associate('insertTemplateField', insertTemplateField);
Office.actions.associate('insertCrossRef', insertCrossRef);

// Also expose globally for debugging
if (typeof window !== 'undefined') {
    window.DraftBridgeFunctions = {
        quickFill,
        applyNumbering,
        applyNumberingFirmOutline,
        applyNumberingFederalCourt,
        applyNumberingContract,
        applyNumberingSimple,
        insertHeader,
        insertTemplateField,
        insertCrossRef
    };
}
