/**
 * DraftBridge Template Designer - Core Logic
 * 
 * Admin/Designer mode to create templates visually.
 * - Scan document for potential fields
 * - Drag and drop field library
 * - Configure field types
 * - Style settings per field
 * - Save as reusable template
 * 
 * The UI is handled by designer-ui.js - this file provides
 * the Word integration and template management logic.
 * 
 * @version 2.0.0
 */

const DraftBridgeTemplateDesigner = (function() {
    'use strict';

    // Field types available in designer
    const FIELD_TYPES = {
        text: { label: 'Text', icon: 'T', default: '' },
        textarea: { label: 'Long Text', icon: '¶', default: '' },
        date: { label: 'Date', icon: '📅', default: '' },
        number: { label: 'Number', icon: '#', default: 0 },
        currency: { label: 'Currency', icon: '$', default: 0 },
        dropdown: { label: 'Dropdown', icon: '▼', default: '', hasOptions: true },
        checkbox: { label: 'Yes/No', icon: '☑', default: false },
        email: { label: 'Email', icon: '@', default: '' },
        phone: { label: 'Phone', icon: '☎', default: '' },
        state: { label: 'State', icon: '🗺', default: '', preset: 'US_STATES' },
        party: { label: 'Party Name', icon: '👤', default: '' },
        address: { label: 'Address Block', icon: '🏠', default: {}, isComplex: true }
    };

    // Legal-friendly fonts for style picker
    const LEGAL_FONTS = [
        'Times New Roman',
        'Georgia',
        'Garamond',
        'Palatino Linotype',
        'Book Antiqua',
        'Century Schoolbook',
        'Arial',
        'Calibri',
        'Cambria',
        'Courier New'
    ];

    // Common font sizes for legal documents
    const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

    // Default field style
    const DEFAULT_STYLE = {
        fontName: 'Times New Roman',
        fontSize: 12,
        bold: false,
        italic: false,
        underline: false,
        allCaps: false,
        color: '#000000'
    };

    // Style presets for common legal formatting
    const STYLE_PRESETS = {
        bodyText: {
            id: 'bodyText',
            label: 'Body Text',
            description: 'Standard document body text',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: false,
                italic: false,
                underline: false,
                allCaps: false,
                color: '#000000'
            }
        },
        partyName: {
            id: 'partyName',
            label: 'Party Name',
            description: 'Bold name for parties to an agreement',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: true,
                italic: false,
                underline: false,
                allCaps: false,
                color: '#000000'
            }
        },
        definedTerm: {
            id: 'definedTerm',
            label: 'Defined Term',
            description: 'Bold with quotes for defined terms',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: true,
                italic: false,
                underline: false,
                allCaps: false,
                color: '#000000',
                wrapQuotes: true // Special flag for defined terms
            }
        },
        sectionHeader: {
            id: 'sectionHeader',
            label: 'Section Header',
            description: 'Bold caps for section headings',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: true,
                italic: false,
                underline: false,
                allCaps: true,
                color: '#000000'
            }
        },
        emphasis: {
            id: 'emphasis',
            label: 'Emphasis',
            description: 'Italic text for emphasis',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: false,
                italic: true,
                underline: false,
                allCaps: false,
                color: '#000000'
            }
        },
        signatureLine: {
            id: 'signatureLine',
            label: 'Signature Line',
            description: 'Underlined text for signatures',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: false,
                italic: false,
                underline: true,
                allCaps: false,
                color: '#000000'
            }
        },
        exhibit: {
            id: 'exhibit',
            label: 'Exhibit Reference',
            description: 'Bold caps for exhibit references',
            style: {
                fontName: 'Times New Roman',
                fontSize: 12,
                bold: true,
                italic: false,
                underline: true,
                allCaps: true,
                color: '#000000'
            }
        }
    };

    // Common field presets (drag and drop these) with default styles
    const FIELD_PRESETS = {
        client: {
            id: 'clientName',
            label: 'Client Name',
            type: 'text',
            group: 'parties',
            placeholder: 'Enter client name',
            style: { ...STYLE_PRESETS.partyName.style }
        },
        clientAddress: {
            id: 'clientAddress',
            label: 'Client Address',
            type: 'address',
            group: 'parties',
            style: { ...STYLE_PRESETS.bodyText.style }
        },
        effectiveDate: {
            id: 'effectiveDate',
            label: 'Effective Date',
            type: 'date',
            group: 'dates',
            style: { ...STYLE_PRESETS.bodyText.style }
        },
        governingLaw: {
            id: 'governingLaw',
            label: 'Governing Law',
            type: 'state',
            group: 'terms',
            style: { ...STYLE_PRESETS.bodyText.style }
        },
        term: {
            id: 'termMonths',
            label: 'Term (Months)',
            type: 'number',
            group: 'terms',
            validation: { min: 1, max: 120 },
            style: { ...STYLE_PRESETS.bodyText.style }
        },
        counterparty: {
            id: 'counterpartyName',
            label: 'Counterparty Name',
            type: 'text',
            group: 'parties',
            style: { ...STYLE_PRESETS.partyName.style }
        },
        definedTerm: {
            id: 'definedTerm',
            label: 'Defined Term',
            type: 'text',
            group: 'terms',
            placeholder: 'Enter defined term',
            style: { ...STYLE_PRESETS.definedTerm.style }
        },
        sectionTitle: {
            id: 'sectionTitle',
            label: 'Section Title',
            type: 'text',
            group: 'other',
            placeholder: 'Enter section title',
            style: { ...STYLE_PRESETS.sectionHeader.style }
        }
    };

    let designerState = {
        active: false,
        fields: [],
        groups: [],
        documentName: '',
        modified: false
    };

    /**
     * Enter designer mode
     */
    async function enterDesignerMode() {
        designerState.active = true;
        designerState.fields = [];
        designerState.groups = ['parties', 'dates', 'terms', 'other'];
        
        // Get document name
        await Word.run(async (context) => {
            const doc = context.document;
            doc.load('properties/title');
            await context.sync();
            designerState.documentName = doc.properties.title || 'Untitled Template';
        });

        return designerState;
    }

    /**
     * Exit designer mode
     */
    function exitDesignerMode() {
        designerState.active = false;
        return designerState;
    }

    /**
     * Scan document for potential fields
     * Looks for common patterns that could be fields
     */
    async function scanForPotentialFields() {
        return Word.run(async (context) => {
            const body = context.document.body;
            
            // Patterns that suggest a field
            const patterns = [
                { regex: /\[([A-Z_]+)\]/g, type: 'bracket' },           // [CLIENT_NAME]
                { regex: /\{\{(\w+)\}\}/g, type: 'mustache' },          // {{clientName}}
                { regex: /__+([A-Za-z\s]+)__+/g, type: 'underline' },   // ___Client Name___
                { regex: /\$\{(\w+)\}/g, type: 'template' },            // ${variableName}
                { regex: /"([^"]+)":\s*$/gm, type: 'colon' },           // "Client Name":
            ];

            const potentialFields = [];

            // Search for each pattern
            for (const pattern of patterns) {
                const results = body.search(pattern.regex.source, { matchWildcards: true });
                results.load('items/text');
                await context.sync();

                for (const item of results.items) {
                    const match = item.text.match(pattern.regex);
                    if (match) {
                        potentialFields.push({
                            text: item.text,
                            suggestedId: camelCase(match[1] || item.text),
                            suggestedLabel: titleCase(match[1] || item.text),
                            suggestedType: guessFieldType(match[1] || item.text),
                            pattern: pattern.type,
                            location: item
                        });
                    }
                }
            }

            // Also scan for existing content controls
            const controls = body.contentControls;
            controls.load('items/tag,items/title,items/text');
            await context.sync();

            for (const control of controls.items) {
                if (control.tag && control.tag.startsWith('template_')) {
                    potentialFields.push({
                        text: control.text || control.title,
                        suggestedId: control.tag.replace('template_', ''),
                        suggestedLabel: control.title || control.tag.replace('template_', ''),
                        suggestedType: guessFieldType(control.tag),
                        pattern: 'contentControl',
                        isExisting: true
                    });
                }
            }

            return potentialFields;
        });
    }

    /**
     * Add field to template
     */
    function addField(fieldConfig) {
        const field = {
            id: fieldConfig.id || generateId(),
            label: fieldConfig.label || 'New Field',
            type: fieldConfig.type || 'text',
            group: fieldConfig.group || 'other',
            placeholder: fieldConfig.placeholder || '',
            required: fieldConfig.required || false,
            validation: fieldConfig.validation || null,
            options: fieldConfig.options || null,
            style: fieldConfig.style || { ...DEFAULT_STYLE },
            order: designerState.fields.length
        };

        designerState.fields.push(field);
        designerState.modified = true;
        
        return field;
    }

    /**
     * Update field style
     */
    function updateFieldStyle(fieldId, styleUpdates) {
        const field = designerState.fields.find(f => f.id === fieldId);
        if (field) {
            field.style = { ...(field.style || DEFAULT_STYLE), ...styleUpdates };
            designerState.modified = true;
        }
        return field;
    }

    /**
     * Apply a style preset to a field
     */
    function applyStylePreset(fieldId, presetId) {
        const preset = STYLE_PRESETS[presetId];
        if (!preset) throw new Error(`Unknown style preset: ${presetId}`);
        
        return updateFieldStyle(fieldId, { ...preset.style });
    }

    /**
     * Get available style presets
     */
    function getStylePresets() {
        return Object.values(STYLE_PRESETS);
    }

    /**
     * Get available legal fonts
     */
    function getLegalFonts() {
        return [...LEGAL_FONTS];
    }

    /**
     * Get available font sizes
     */
    function getFontSizes() {
        return [...FONT_SIZES];
    }

    /**
     * Get default style
     */
    function getDefaultStyle() {
        return { ...DEFAULT_STYLE };
    }

    /**
     * Add field from preset
     */
    function addPresetField(presetKey) {
        const preset = FIELD_PRESETS[presetKey];
        if (!preset) throw new Error(`Unknown preset: ${presetKey}`);
        return addField({ ...preset });
    }

    /**
     * Remove field
     */
    function removeField(fieldId) {
        designerState.fields = designerState.fields.filter(f => f.id !== fieldId);
        designerState.modified = true;
    }

    /**
     * Update field
     */
    function updateField(fieldId, updates) {
        const field = designerState.fields.find(f => f.id === fieldId);
        if (field) {
            Object.assign(field, updates);
            designerState.modified = true;
        }
        return field;
    }

    /**
     * Reorder field
     */
    function reorderField(fieldId, newIndex) {
        const currentIndex = designerState.fields.findIndex(f => f.id === fieldId);
        if (currentIndex === -1) return;

        const [field] = designerState.fields.splice(currentIndex, 1);
        designerState.fields.splice(newIndex, 0, field);
        
        // Update order values
        designerState.fields.forEach((f, i) => f.order = i);
        designerState.modified = true;
    }

    /**
     * Add group
     */
    function addGroup(groupName) {
        const groupId = camelCase(groupName);
        if (!designerState.groups.includes(groupId)) {
            designerState.groups.push(groupId);
        }
        return groupId;
    }

    /**
     * Insert content control in document at cursor
     * Now with style application for a polished look
     */
    async function insertFieldAtCursor(field) {
        return Word.run(async (context) => {
            const selection = context.document.getSelection();
            
            // Insert content control
            const control = selection.insertContentControl();
            control.tag = `template_${field.id}`;
            control.title = field.label;
            control.placeholderText = field.placeholder || `[${field.label}]`;
            control.appearance = 'BoundingBox';
            
            // Apply field style if defined
            if (field.style) {
                const style = field.style;
                const font = control.font;
                
                if (style.fontName) font.name = style.fontName;
                if (style.fontSize) font.size = style.fontSize;
                if (style.bold !== undefined) font.bold = style.bold;
                if (style.italic !== undefined) font.italic = style.italic;
                if (style.underline !== undefined) {
                    font.underline = style.underline ? 'Single' : 'None';
                }
                if (style.color) font.color = style.color;
                if (style.allCaps) font.allCaps = style.allCaps;
            }
            
            await context.sync();
            
            return { success: true, controlId: control.id };
        });
    }

    /**
     * Insert field with visual feedback animation
     */
    async function insertFieldWithAnimation(field) {
        try {
            const result = await insertFieldAtCursor(field);
            if (result.success) {
                // Flash the control briefly to show success
                await Word.run(async (context) => {
                    const controls = context.document.contentControls;
                    controls.load('items/tag');
                    await context.sync();
                    
                    const control = controls.items.find(c => c.tag === `template_${field.id}`);
                    if (control) {
                        // Briefly highlight
                        const originalColor = control.color || 'automatic';
                        control.color = '#6366f1'; // Designer accent color
                        await context.sync();
                        
                        setTimeout(async () => {
                            await Word.run(async (ctx) => {
                                const ctrls = ctx.document.contentControls;
                                ctrls.load('items/tag');
                                await ctx.sync();
                                const ctrl = ctrls.items.find(c => c.tag === `template_${field.id}`);
                                if (ctrl) {
                                    ctrl.color = originalColor;
                                    await ctx.sync();
                                }
                            });
                        }, 500);
                    }
                });
            }
            return result;
        } catch (error) {
            console.error('Insert field error:', error);
            throw error;
        }
    }

    /**
     * Get all template fields currently in the document
     */
    async function getDocumentFields() {
        return Word.run(async (context) => {
            const controls = context.document.contentControls;
            controls.load('items/tag,items/title,items/text,items/placeholderText');
            await context.sync();

            const fields = [];
            for (const control of controls.items) {
                if (control.tag && control.tag.startsWith('template_')) {
                    fields.push({
                        id: control.tag.replace('template_', ''),
                        label: control.title,
                        text: control.text,
                        placeholder: control.placeholderText
                    });
                }
            }
            return fields;
        });
    }

    /**
     * Highlight a specific field in the document
     */
    async function highlightField(fieldId) {
        return Word.run(async (context) => {
            const controls = context.document.contentControls;
            controls.load('items/tag');
            await context.sync();

            const control = controls.items.find(c => c.tag === `template_${fieldId}`);
            if (control) {
                control.select();
                await context.sync();
                return { success: true };
            }
            return { success: false, error: 'Field not found' };
        });
    }

    /**
     * Insert field at specific location (for drag and drop)
     */
    async function insertFieldAtRange(field, rangeOrBookmark) {
        return Word.run(async (context) => {
            let range;
            
            if (typeof rangeOrBookmark === 'string') {
                // It's a bookmark name
                range = context.document.getBookmarkRange(rangeOrBookmark);
            } else {
                range = rangeOrBookmark;
            }

            const control = range.insertContentControl();
            control.tag = `template_${field.id}`;
            control.title = field.label;
            control.placeholderText = field.placeholder || `[${field.label}]`;
            control.appearance = 'BoundingBox';
            
            await context.sync();
            
            return { success: true };
        });
    }

    /**
     * Export template as JSON
     */
    function exportTemplate() {
        return {
            $schema: 'draftbridge-template-v1.1',
            name: designerState.documentName,
            description: '',
            createdAt: new Date().toISOString(),
            groups: designerState.groups.map(g => ({
                id: g,
                label: titleCase(g),
                order: designerState.groups.indexOf(g)
            })),
            fields: designerState.fields.map(f => ({
                id: f.id,
                label: f.label,
                type: f.type,
                group: f.group,
                placeholder: f.placeholder,
                required: f.required,
                validation: f.validation,
                options: f.options,
                style: f.style || DEFAULT_STYLE
            }))
        };
    }

    /**
     * Import template from JSON
     */
    function importTemplate(templateJson) {
        designerState.documentName = templateJson.name || 'Imported Template';
        designerState.groups = templateJson.groups?.map(g => g.id) || ['other'];
        designerState.fields = templateJson.fields?.map((f, i) => ({
            ...f,
            order: i
        })) || [];
        designerState.modified = true;
        
        return designerState;
    }

    /**
     * Save template to storage
     */
    async function saveTemplate(name, scope = 'personal') {
        const template = exportTemplate();
        template.name = name || template.name;
        template.scope = scope;
        template.id = `template_${Date.now()}`;

        // Save using versioned storage if available
        if (typeof DraftBridgeVersionedStorage !== 'undefined') {
            await DraftBridgeVersionedStorage.Templates.save(template.id, template);
        } else {
            // Fallback to localStorage
            const templates = JSON.parse(localStorage.getItem('df_templates') || '[]');
            templates.push(template);
            localStorage.setItem('df_templates', JSON.stringify(templates));
        }

        designerState.modified = false;
        return template;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    function generateId() {
        return 'field_' + Math.random().toString(36).substr(2, 9);
    }

    function camelCase(str) {
        return str
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .split(' ')
            .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    function titleCase(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .trim()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }

    function guessFieldType(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('date')) return 'date';
        if (lower.includes('email')) return 'email';
        if (lower.includes('phone') || lower.includes('tel')) return 'phone';
        if (lower.includes('state') || lower.includes('jurisdiction')) return 'state';
        if (lower.includes('amount') || lower.includes('price') || lower.includes('fee')) return 'currency';
        if (lower.includes('address')) return 'address';
        if (lower.includes('number') || lower.includes('count') || lower.includes('term')) return 'number';
        if (lower.includes('party') || lower.includes('name')) return 'party';
        if (lower.includes('description') || lower.includes('notes')) return 'textarea';
        
        return 'text';
    }

    // Public API
    return {
        // Mode control
        enterDesignerMode,
        exitDesignerMode,
        isActive: () => designerState.active,
        getState: () => ({ ...designerState }),

        // Field management
        addField,
        addPresetField,
        removeField,
        updateField,
        reorderField,
        
        // Style management
        updateFieldStyle,
        applyStylePreset,
        getStylePresets,
        getLegalFonts,
        getFontSizes,
        getDefaultStyle,
        
        // Groups
        addGroup,

        // Document interaction
        scanForPotentialFields,
        insertFieldAtCursor,
        insertFieldAtRange,
        insertFieldWithAnimation,
        getDocumentFields,
        highlightField,

        // Import/Export
        exportTemplate,
        importTemplate,
        saveTemplate,

        // Reference data
        FIELD_TYPES,
        FIELD_PRESETS,
        STYLE_PRESETS,
        LEGAL_FONTS,
        FONT_SIZES,
        DEFAULT_STYLE
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgeTemplateDesigner;
}
