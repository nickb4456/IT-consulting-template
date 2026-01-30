/**
 * DraftBridge Template Designer - UI Controller
 * 
 * Provides delightful, Lego-like template building experience.
 * Handles drag-drop, undo/redo, inline editing, and animations.
 * 
 * @version 2.0.0
 */

(function() {
    'use strict';

    // =========================================================================
    // State
    // =========================================================================

    let state = {
        currentStep: 1,
        fields: [],
        templateName: '',
        scope: 'personal',
        selectedFieldType: 'text',
        editingStyle: null,
        previewVisible: false
    };

    // Undo/Redo history
    let history = {
        past: [],
        future: [],
        maxLength: 50
    };

    // Field type definitions with icons and descriptions
    const FIELD_TYPES = {
        text: { icon: 'Aa', name: 'Text', desc: 'Names, titles, short text' },
        date: { icon: '📅', name: 'Date', desc: 'Dates with formatting' },
        number: { icon: '#', name: 'Number', desc: 'Numbers, quantities' },
        currency: { icon: '$', name: 'Money', desc: 'Currency amounts' },
        dropdown: { icon: '▼', name: 'Choice', desc: 'Pick from options' },
        checkbox: { icon: '☑', name: 'Yes/No', desc: 'Boolean toggles' },
        state: { icon: '🗺️', name: 'State', desc: 'US states dropdown' },
        address: { icon: '🏠', name: 'Address', desc: 'Full address block' }
    };

    // Quick-add presets
    const QUICK_PRESETS = [
        { id: 'clientName', label: 'Client Name', type: 'text', icon: '👤' },
        { id: 'effectiveDate', label: 'Effective Date', type: 'date', icon: '📅' },
        { id: 'counterparty', label: 'Other Party', type: 'text', icon: '🤝' },
        { id: 'state', label: 'State', type: 'state', icon: '🗺️' },
        { id: 'amount', label: 'Amount', type: 'currency', icon: '💰' },
        { id: 'address', label: 'Address', type: 'address', icon: '🏠' },
        { id: 'email', label: 'Email', type: 'text', icon: '📧' },
        { id: 'termMonths', label: 'Term', type: 'number', icon: '📆' }
    ];

    // Style presets
    const STYLE_PRESETS = [
        { id: 'bodyText', name: 'Body', style: { fontName: 'Times New Roman', fontSize: 12, bold: false, italic: false, underline: false, allCaps: false, color: '#000000' }},
        { id: 'partyName', name: 'Party', style: { fontName: 'Times New Roman', fontSize: 12, bold: true, italic: false, underline: false, allCaps: false, color: '#000000' }},
        { id: 'definedTerm', name: 'Term', style: { fontName: 'Times New Roman', fontSize: 12, bold: true, italic: false, underline: false, allCaps: false, color: '#000000', wrapQuotes: true }},
        { id: 'sectionHeader', name: 'Header', style: { fontName: 'Times New Roman', fontSize: 12, bold: true, italic: false, underline: false, allCaps: true, color: '#000000' }},
        { id: 'emphasis', name: 'Italic', style: { fontName: 'Times New Roman', fontSize: 12, bold: false, italic: true, underline: false, allCaps: false, color: '#000000' }},
        { id: 'signature', name: 'Signature', style: { fontName: 'Times New Roman', fontSize: 12, bold: false, italic: false, underline: true, allCaps: false, color: '#000000' }}
    ];

    const LEGAL_FONTS = [
        'Times New Roman', 'Georgia', 'Garamond', 'Palatino Linotype',
        'Book Antiqua', 'Century Schoolbook', 'Arial', 'Calibri', 'Cambria', 'Courier New'
    ];

    const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48];

    const DEFAULT_STYLE = {
        fontName: 'Times New Roman',
        fontSize: 12,
        bold: false,
        italic: false,
        underline: false,
        allCaps: false,
        color: '#000000'
    };

    // =========================================================================
    // Initialization
    // =========================================================================

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        updatePlatformShortcuts();
        renderFieldTypeGrid();
        renderQuickChips();
        renderStyleModal();
        renderTypePicker();
        setupDragAndDrop();
        setupKeyboardShortcuts();
        updateUI();
    }

    /**
     * Update shortcut displays for Mac
     */
    function updatePlatformShortcuts() {
        if (!navigator.platform.includes('Mac')) return;
        
        // Update title attributes with shortcuts
        document.querySelectorAll('[title*="Ctrl+"]').forEach(el => {
            const title = el.getAttribute('title');
            if (title) {
                const macTitle = title
                    .replace(/Ctrl\+Shift\+/gi, '⌘⇧')
                    .replace(/Ctrl\+/gi, '⌘');
                el.setAttribute('title', macTitle);
            }
        });
    }

    // =========================================================================
    // Navigation
    // =========================================================================

    window.handleBack = function() {
        if (state.currentStep > 1) {
            goToStep(state.currentStep - 1);
        } else {
            if (state.fields.length > 0) {
                if (!confirm('Discard your template?')) return;
            }
            window.location.href = 'taskpane.html';
        }
    };

    window.handleNext = function() {
        if (state.currentStep === 1) {
            // Need to choose a method first
            return;
        } else if (state.currentStep === 2) {
            if (state.fields.length === 0) {
                showToast('Add at least one field to continue', 'warning');
                return;
            }
            goToStep(3);
        } else if (state.currentStep === 3) {
            saveTemplate();
        }
    };

    window.startFromDocument = function() {
        goToStep(2);
        // Would scan document here in real implementation
        showToast('Scanning document for fields...', 'info');
        setTimeout(() => {
            showToast('Ready to add fields!', 'success');
        }, 1000);
    };

    window.startFromScratch = function() {
        goToStep(2);
    };

    window.importExisting = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const template = JSON.parse(text);
                
                if (template.fields && Array.isArray(template.fields)) {
                    state.fields = template.fields.map(f => ({
                        ...f,
                        style: f.style || { ...DEFAULT_STYLE }
                    }));
                    state.templateName = template.name || '';
                    goToStep(2);
                    updateFieldList();
                    showToast(`Imported ${state.fields.length} fields`, 'success');
                }
            } catch (err) {
                console.warn('[TemplateDesigner] Import failed:', err);
                showToast("Couldn't load that template — make sure it's a valid JSON file", 'error');
            }
        };
        input.click();
    };

    window.goHome = function() {
        window.location.href = 'taskpane.html';
    };

    function goToStep(step) {
        state.currentStep = step;
        updateUI();
        
        // Animate transition
        const sections = document.querySelectorAll('.step-section');
        sections.forEach((s, i) => {
            s.classList.toggle('active', i + 1 === step);
        });
    }

    // =========================================================================
    // Field Management
    // =========================================================================

    function addField(fieldConfig, skipHistory = false) {
        const field = {
            id: fieldConfig.id || generateId(),
            label: fieldConfig.label || 'New Field',
            type: fieldConfig.type || 'text',
            style: fieldConfig.style || { ...DEFAULT_STYLE },
            placeholder: fieldConfig.placeholder || '',
            options: fieldConfig.options || null
        };

        // Check for duplicates
        if (state.fields.find(f => f.id === field.id)) {
            // Append number to make unique
            let counter = 2;
            while (state.fields.find(f => f.id === `${field.id}_${counter}`)) {
                counter++;
            }
            field.id = `${field.id}_${counter}`;
        }

        if (!skipHistory) {
            pushHistory();
        }

        state.fields.push(field);
        updateFieldList();
        animateFieldAdd(field.id);
        showToast(`Added "${field.label}"`, 'success');
        
        return field;
    }

    window.quickAdd = function(presetId) {
        const preset = QUICK_PRESETS.find(p => p.id === presetId);
        if (preset) {
            addField({
                id: preset.id,
                label: preset.label,
                type: preset.type
            });
        }
    };

    window.removeField = function(fieldId) {
        pushHistory();
        const field = state.fields.find(f => f.id === fieldId);
        state.fields = state.fields.filter(f => f.id !== fieldId);
        updateFieldList();
        showToast(`Removed "${field?.label || 'field'}"`, 'info');
    };

    window.updateFieldLabel = function(fieldId, newLabel) {
        const field = state.fields.find(f => f.id === fieldId);
        if (field && newLabel.trim()) {
            pushHistory();
            field.label = newLabel.trim();
        }
    };

    function reorderField(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        pushHistory();
        const [field] = state.fields.splice(fromIndex, 1);
        state.fields.splice(toIndex, 0, field);
        updateFieldList();
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    function renderFieldTypeGrid() {
        const grid = document.getElementById('fieldTypeGrid');
        grid.innerHTML = Object.entries(FIELD_TYPES).map(([type, info]) => `
            <div class="field-type-card" 
                 data-type="${type}" 
                 draggable="true"
                 onclick="openAddFieldModal('${type}')"
                 title="${info.desc}">
                <div class="type-icon">${info.icon}</div>
                <div class="type-name">${info.name}</div>
            </div>
        `).join('');
    }

    function renderQuickChips() {
        const chips = document.getElementById('quickChips');
        chips.innerHTML = QUICK_PRESETS.map(p => `
            <button class="quick-chip" onclick="quickAdd('${p.id}')">
                <span class="chip-icon">${p.icon}</span>
                ${p.label}
            </button>
        `).join('');
    }

    function updateFieldList() {
        const list = document.getElementById('fieldList');
        const empty = document.getElementById('canvasEmpty');
        const count = document.getElementById('fieldCount');
        const preview = document.getElementById('previewPanel');

        count.textContent = state.fields.length;

        if (state.fields.length === 0) {
            list.style.display = 'none';
            empty.style.display = 'flex';
            preview.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        list.style.display = 'flex';
        
        if (state.previewVisible) {
            preview.style.display = 'block';
        }

        list.innerHTML = state.fields.map((field, index) => `
            <div class="field-item" 
                 data-id="${field.id}" 
                 data-index="${index}"
                 draggable="true">
                <div class="field-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5"/>
                        <circle cx="15" cy="6" r="1.5"/>
                        <circle cx="9" cy="12" r="1.5"/>
                        <circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9" cy="18" r="1.5"/>
                        <circle cx="15" cy="18" r="1.5"/>
                    </svg>
                </div>
                <div class="field-icon-wrapper">${FIELD_TYPES[field.type]?.icon || 'Aa'}</div>
                <div class="field-info">
                    <input type="text" 
                           class="field-name" 
                           value="${escapeHtml(field.label)}"
                           onchange="updateFieldLabel('${field.id}', this.value)"
                           onclick="event.stopPropagation()">
                    <div class="field-meta">
                        <span>${FIELD_TYPES[field.type]?.name || field.type}</span>
                        <span class="field-style-badge">${getStyleSummary(field.style)}</span>
                    </div>
                </div>
                <div class="field-actions">
                    <button class="field-action-btn" onclick="openStyleModal('${field.id}')" title="Edit style">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                    <button class="field-action-btn" onclick="insertFieldInDocument('${field.id}')" title="Insert in document">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </button>
                    <button class="field-action-btn danger" onclick="removeField('${field.id}')" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Setup drag handlers for field items
        setupFieldItemDrag();
        updatePreview();
    }

    function updateUI() {
        // Update progress steps
        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`progressStep${i}`);
            const line = document.getElementById(`stepLine${i - 1}`);
            
            step.classList.remove('active', 'complete');
            if (i < state.currentStep) {
                step.classList.add('complete');
            } else if (i === state.currentStep) {
                step.classList.add('active');
            }

            if (line) {
                line.classList.remove('active', 'complete');
                if (i < state.currentStep) {
                    line.classList.add('complete');
                } else if (i === state.currentStep) {
                    line.classList.add('active');
                }
            }
        }

        // Update buttons
        const backBtn = document.getElementById('backBtn');
        const nextBtn = document.getElementById('nextBtn');
        const nextBtnText = document.getElementById('nextBtnText');

        if (state.currentStep === 1) {
            backBtn.textContent = 'Cancel';
            nextBtn.style.display = 'none';
        } else if (state.currentStep === 2) {
            backBtn.textContent = 'Back';
            nextBtn.style.display = 'flex';
            nextBtnText.textContent = 'Continue';
            nextBtn.disabled = state.fields.length === 0;
        } else if (state.currentStep === 3) {
            backBtn.textContent = 'Back';
            nextBtn.style.display = 'flex';
            nextBtnText.textContent = 'Save Template';
        }

        // Update undo/redo buttons
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        undoBtn.disabled = history.past.length === 0;
        redoBtn.disabled = history.future.length === 0;
        undoBtn.classList.toggle('has-history', history.past.length > 0);
        redoBtn.classList.toggle('has-history', history.future.length > 0);

        // Populate template name if on step 3
        if (state.currentStep === 3) {
            const nameInput = document.getElementById('templateName');
            if (!nameInput.value && state.templateName) {
                nameInput.value = state.templateName;
            }
        }
    }

    function getStyleSummary(style) {
        if (!style) return 'Body';
        const parts = [];
        if (style.bold) parts.push('Bold');
        if (style.italic) parts.push('Italic');
        if (style.underline) parts.push('Underline');
        if (style.allCaps) parts.push('CAPS');
        if (parts.length === 0) return 'Body';
        return parts.join(' ');
    }

    // =========================================================================
    // Drag and Drop
    // =========================================================================

    function setupDragAndDrop() {
        const canvas = document.getElementById('templateCanvas');
        const typeGrid = document.getElementById('fieldTypeGrid');

        // Type cards drag
        typeGrid.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('field-type-card')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            }
        });

        typeGrid.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('field-type-card')) {
                e.target.classList.remove('dragging');
            }
        });

        // Canvas drop zone
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvas.classList.add('drag-over');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('drag-over');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over');
            
            const type = e.dataTransfer.getData('text/plain');
            if (type && FIELD_TYPES[type]) {
                openAddFieldModal(type);
            }
        });
    }

    function setupFieldItemDrag() {
        const list = document.getElementById('fieldList');
        const items = list.querySelectorAll('.field-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.field-item').forEach(i => {
                    i.classList.remove('drag-over-above', 'drag-over-below');
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = list.querySelector('.dragging');
                if (dragging && dragging !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    item.classList.remove('drag-over-above', 'drag-over-below');
                    if (e.clientY < midY) {
                        item.classList.add('drag-over-above');
                    } else {
                        item.classList.add('drag-over-below');
                    }
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-above', 'drag-over-below');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);
                
                if (!isNaN(fromIndex) && !isNaN(toIndex)) {
                    // Adjust for above/below
                    const isAbove = item.classList.contains('drag-over-above');
                    let finalIndex = toIndex;
                    if (!isAbove && fromIndex < toIndex) {
                        finalIndex = toIndex;
                    } else if (isAbove && fromIndex > toIndex) {
                        finalIndex = toIndex;
                    } else if (!isAbove) {
                        finalIndex = toIndex + 1;
                    }
                    
                    reorderField(fromIndex, Math.min(finalIndex, state.fields.length - 1));
                }

                item.classList.remove('drag-over-above', 'drag-over-below');
            });
        });
    }

    // =========================================================================
    // Undo/Redo
    // =========================================================================

    function pushHistory() {
        history.past.push(JSON.stringify(state.fields));
        history.future = [];
        
        if (history.past.length > history.maxLength) {
            history.past.shift();
        }
        
        updateUI();
    }

    window.handleUndo = function() {
        if (history.past.length === 0) return;
        
        history.future.push(JSON.stringify(state.fields));
        state.fields = JSON.parse(history.past.pop());
        
        updateFieldList();
        updateUI();
        showToast('Undone', 'info');
    };

    window.handleRedo = function() {
        if (history.future.length === 0) return;
        
        history.past.push(JSON.stringify(state.fields));
        state.fields = JSON.parse(history.future.pop());
        
        updateFieldList();
        updateUI();
        showToast('Redone', 'info');
    };

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Undo: Ctrl/Cmd + Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                closeStyleModal();
                closeAddFieldModal();
            }
        });
    }

    // =========================================================================
    // Style Modal
    // =========================================================================

    function renderStyleModal() {
        // Font select
        const fontSelect = document.getElementById('styleFontName');
        fontSelect.innerHTML = LEGAL_FONTS.map(f => 
            `<option value="${f}">${f}</option>`
        ).join('');

        // Size select
        const sizeSelect = document.getElementById('styleFontSize');
        sizeSelect.innerHTML = FONT_SIZES.map(s => 
            `<option value="${s}">${s}pt</option>`
        ).join('');

        // Presets
        const presetsGrid = document.getElementById('stylePresetsGrid');
        presetsGrid.innerHTML = STYLE_PRESETS.map(p => `
            <button class="preset-btn" data-preset="${p.id}" onclick="applyStylePreset('${p.id}')">
                <div class="preset-name">${p.name}</div>
            </button>
        `).join('');
    }

    window.openStyleModal = function(fieldId) {
        const field = state.fields.find(f => f.id === fieldId);
        if (!field) return;

        document.getElementById('editingFieldId').value = fieldId;
        state.editingStyle = { ...DEFAULT_STYLE, ...(field.style || {}) };

        // Set form values
        document.getElementById('styleFontName').value = state.editingStyle.fontName;
        document.getElementById('styleFontSize').value = state.editingStyle.fontSize;
        document.getElementById('styleColor').value = state.editingStyle.color || '#000000';

        // Set toggles
        setStyleToggle('styleBold', state.editingStyle.bold);
        setStyleToggle('styleItalic', state.editingStyle.italic);
        setStyleToggle('styleUnderline', state.editingStyle.underline);
        setStyleToggle('styleAllCaps', state.editingStyle.allCaps);

        updateStylePreview();
        document.getElementById('styleModal').classList.add('active');
    };

    window.closeStyleModal = function() {
        document.getElementById('styleModal').classList.remove('active');
        state.editingStyle = null;
    };

    function setStyleToggle(id, active) {
        const btn = document.getElementById(id);
        btn.classList.toggle('active', active);
    }

    window.toggleStyleOption = function(prop) {
        if (!state.editingStyle) return;
        state.editingStyle[prop] = !state.editingStyle[prop];
        
        const btnMap = {
            bold: 'styleBold',
            italic: 'styleItalic',
            underline: 'styleUnderline',
            allCaps: 'styleAllCaps'
        };
        
        setStyleToggle(btnMap[prop], state.editingStyle[prop]);
        updateStylePreview();
    };

    window.updateStylePreview = function() {
        if (!state.editingStyle) return;

        state.editingStyle.fontName = document.getElementById('styleFontName').value;
        state.editingStyle.fontSize = parseFloat(document.getElementById('styleFontSize').value);
        state.editingStyle.color = document.getElementById('styleColor').value;

        const preview = document.getElementById('stylePreviewText');
        let text = 'Sample Text';
        if (state.editingStyle.allCaps) text = text.toUpperCase();
        if (state.editingStyle.wrapQuotes) text = `"${text}"`;

        preview.textContent = text;
        preview.style.fontFamily = state.editingStyle.fontName;
        preview.style.fontSize = state.editingStyle.fontSize + 'pt';
        preview.style.fontWeight = state.editingStyle.bold ? 'bold' : 'normal';
        preview.style.fontStyle = state.editingStyle.italic ? 'italic' : 'normal';
        preview.style.textDecoration = state.editingStyle.underline ? 'underline' : 'none';
        preview.style.color = state.editingStyle.color;

        // Clear active preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    };

    window.applyStylePreset = function(presetId) {
        const preset = STYLE_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        state.editingStyle = { ...preset.style };

        document.getElementById('styleFontName').value = state.editingStyle.fontName;
        document.getElementById('styleFontSize').value = state.editingStyle.fontSize;
        document.getElementById('styleColor').value = state.editingStyle.color || '#000000';

        setStyleToggle('styleBold', state.editingStyle.bold);
        setStyleToggle('styleItalic', state.editingStyle.italic);
        setStyleToggle('styleUnderline', state.editingStyle.underline);
        setStyleToggle('styleAllCaps', state.editingStyle.allCaps);

        // Highlight active preset
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });

        updateStylePreview();
    };

    window.saveFieldStyle = function() {
        const fieldId = document.getElementById('editingFieldId').value;
        const field = state.fields.find(f => f.id === fieldId);
        if (!field || !state.editingStyle) return;

        pushHistory();
        field.style = { ...state.editingStyle };
        closeStyleModal();
        updateFieldList();
        showToast('Style updated', 'success');
    };

    // =========================================================================
    // Add Field Modal
    // =========================================================================

    function renderTypePicker() {
        const picker = document.getElementById('typePicker');
        picker.innerHTML = Object.entries(FIELD_TYPES).map(([type, info]) => `
            <div class="type-picker-card" data-type="${type}" onclick="selectFieldType('${type}')">
                <div class="type-picker-icon">${info.icon}</div>
                <div class="type-picker-name">${info.name}</div>
                <div class="type-picker-desc">${info.desc}</div>
            </div>
        `).join('');
    }

    window.openAddFieldModal = function(type = 'text') {
        state.selectedFieldType = type;
        document.getElementById('newFieldName').value = '';
        
        // Update selected state
        document.querySelectorAll('.type-picker-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });
        
        document.getElementById('addFieldModal').classList.add('active');
        setTimeout(() => document.getElementById('newFieldName').focus(), 100);
    };

    window.closeAddFieldModal = function() {
        document.getElementById('addFieldModal').classList.remove('active');
    };

    window.selectFieldType = function(type) {
        state.selectedFieldType = type;
        document.querySelectorAll('.type-picker-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });
    };

    window.confirmAddField = function() {
        const name = document.getElementById('newFieldName').value.trim();
        if (!name) {
            showToast('Please enter a field name', 'warning');
            return;
        }

        const id = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        addField({
            id,
            label: name,
            type: state.selectedFieldType
        });

        closeAddFieldModal();
    };

    // =========================================================================
    // Preview
    // =========================================================================

    window.togglePreview = function() {
        state.previewVisible = !state.previewVisible;
        const panel = document.getElementById('previewPanel');
        const toggle = panel.querySelector('.preview-toggle');
        
        if (state.previewVisible) {
            panel.style.display = 'block';
            toggle.textContent = 'Hide';
            updatePreview();
        } else {
            panel.style.display = 'none';
            toggle.textContent = 'Show';
        }
    };

    function updatePreview() {
        if (!state.previewVisible || state.fields.length === 0) return;

        const content = document.getElementById('previewContent');
        const previewText = state.fields.map(f => 
            `<span class="preview-field">[${f.label}]</span>`
        ).join(' ... ');

        content.innerHTML = `This Agreement is entered into as of ${previewText}. The parties agree to the terms set forth herein.`;
    }

    // =========================================================================
    // Save Template
    // =========================================================================

    window.selectScope = function(element) {
        document.querySelectorAll('.scope-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        element.classList.add('selected');
        state.scope = element.dataset.scope;
    };

    async function saveTemplate() {
        const name = document.getElementById('templateName').value.trim();
        if (!name) {
            showToast('Please enter a template name', 'warning');
            document.getElementById('templateName').focus();
            return;
        }

        const template = {
            $schema: 'draftbridge-template-v2.0',
            id: `template_${Date.now()}`,
            name,
            scope: state.scope,
            createdAt: new Date().toISOString(),
            fields: state.fields
        };

        try {
            // Save to localStorage (would save to server in production)
            const templates = JSON.parse(localStorage.getItem('df_templates') || '[]');
            templates.push(template);
            localStorage.setItem('df_templates', JSON.stringify(templates));

            // Show success
            document.getElementById('saveForm').style.display = 'none';
            document.getElementById('saveSuccess').classList.add('visible');
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('backBtn').style.display = 'none';

            showToast('Template saved!', 'success');
        } catch (err) {
            console.warn('[TemplateDesigner] Save failed:', err);
            showToast("Couldn't save your template — try exporting it as a backup", 'error');
        }
    }

    // =========================================================================
    // Document Integration
    // =========================================================================

    window.insertFieldInDocument = async function(fieldId) {
        const field = state.fields.find(f => f.id === fieldId);
        if (!field) return;

        if (typeof DraftBridgeTemplateDesigner !== 'undefined' && DraftBridgeTemplateDesigner.insertFieldAtCursor) {
            try {
                await DraftBridgeTemplateDesigner.insertFieldAtCursor(field);
                showToast(`Inserted "${field.label}"`, 'success');
            } catch (err) {
                console.warn('[TemplateDesigner] Field insert failed:', err);
                showToast("Couldn't insert that field — click where you want it and try again", 'error');
            }
        } else {
            showToast('Open in Word to insert fields', 'info');
        }
    };

    // =========================================================================
    // Utilities
    // =========================================================================

    function generateId() {
        return 'field_' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function animateFieldAdd(fieldId) {
        requestAnimationFrame(() => {
            const item = document.querySelector(`[data-id="${fieldId}"]`);
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#6366f1'};
            color: white;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: toastIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Add toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

})();
