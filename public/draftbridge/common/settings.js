/**
 * DraftBridge User Settings
 * Handles UI size, contrast, and saved templates (bookmarks)
 */

const DraftBridgeSettings = (function() {
    'use strict';

    const STORAGE_KEY = 'draftbridge_settings';
    const TEMPLATES_KEY = 'draftbridge_saved_templates';

    // Default settings
    const DEFAULTS = {
        size: 'normal',      // normal | large | xlarge
        contrast: 'normal',  // normal | high
        motion: 'normal',    // normal | reduced
        recentTemplates: []
    };

    // =========================================================================
    // Settings Management
    // =========================================================================

    function getSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
        } catch {
            return { ...DEFAULTS };
        }
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Could not save settings:', e);
        }
    }

    function setSetting(key, value) {
        const settings = getSettings();
        settings[key] = value;
        saveSettings(settings);
        applySettings();
    }

    function applySettings() {
        const settings = getSettings();
        
        // Apply to body
        document.body.setAttribute('data-size', settings.size);
        document.body.setAttribute('data-contrast', settings.contrast);
        document.body.setAttribute('data-motion', settings.motion);
    }

    // =========================================================================
    // Template Bookmarks - Quick save/load
    // =========================================================================

    function getSavedTemplates() {
        try {
            const saved = localStorage.getItem(TEMPLATES_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    function saveTemplate(template) {
        const templates = getSavedTemplates();
        
        // Template structure: { id, name, fields, createdAt }
        const newTemplate = {
            id: 'tpl_' + Date.now(),
            name: template.name || 'My Template',
            fields: template.fields || [],
            createdAt: new Date().toISOString()
        };

        templates.unshift(newTemplate);
        
        // Keep max 20 templates
        if (templates.length > 20) {
            templates.pop();
        }

        try {
            localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        } catch (e) {
            console.warn('Could not save template:', e);
        }

        return newTemplate;
    }

    function deleteTemplate(id) {
        let templates = getSavedTemplates();
        templates = templates.filter(t => t.id !== id);
        
        try {
            localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        } catch (e) {
            console.warn('Could not delete template:', e);
        }
    }

    function getTemplate(id) {
        const templates = getSavedTemplates();
        return templates.find(t => t.id === id);
    }

    // =========================================================================
    // Size Picker UI Component
    // =========================================================================

    function createSizePicker() {
        const settings = getSettings();
        
        const html = `
            <div class="size-picker">
                <span class="size-picker-label">Text Size</span>
                <button class="size-btn ${settings.size === 'normal' ? 'active' : ''}" 
                        data-size="normal" 
                        onclick="DraftBridgeSettings.setSize('normal')"
                        title="Normal size">
                    A
                </button>
                <button class="size-btn ${settings.size === 'large' ? 'active' : ''}" 
                        data-size="large" 
                        onclick="DraftBridgeSettings.setSize('large')"
                        title="Large size">
                    A
                </button>
                <button class="size-btn ${settings.size === 'xlarge' ? 'active' : ''}" 
                        data-size="xlarge" 
                        onclick="DraftBridgeSettings.setSize('xlarge')"
                        title="Extra large size">
                    A
                </button>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;
        return container.firstElementChild;
    }

    function setSize(size) {
        setSetting('size', size);
        
        // Update picker buttons
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
    }

    // =========================================================================
    // Template Bookmark UI
    // =========================================================================

    function createSaveTemplateButton(getFieldsFn) {
        const btn = document.createElement('button');
        btn.className = 'btn-save-template';
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save as Template
        `;
        btn.title = 'Save current fields as a reusable template';
        
        btn.onclick = () => {
            const name = prompt('Template name:', 'My Template');
            if (name) {
                const fields = typeof getFieldsFn === 'function' ? getFieldsFn() : [];
                const template = saveTemplate({ name, fields });
                showToast(`Saved "${template.name}"!`);
            }
        };

        return btn;
    }

    function createTemplateList(onSelect) {
        const templates = getSavedTemplates();
        
        if (templates.length === 0) {
            return null;
        }

        const container = document.createElement('div');
        container.className = 'saved-templates';
        container.innerHTML = `
            <div class="saved-templates-header">
                <span>My Templates</span>
                <span class="template-count">${templates.length}</span>
            </div>
            <div class="saved-templates-list">
                ${templates.map(t => `
                    <button class="saved-template-btn" data-id="${t.id}">
                        <span class="template-name">${t.name}</span>
                        <span class="template-fields">${t.fields.length} fields</span>
                    </button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.saved-template-btn').forEach(btn => {
            btn.onclick = () => {
                const template = getTemplate(btn.dataset.id);
                if (template && typeof onSelect === 'function') {
                    onSelect(template);
                }
            };
        });

        return container;
    }

    // Helper
    function showToast(message) {
        const existing = document.querySelector('.settings-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'settings-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2500);
    }

    // =========================================================================
    // Initialize on load
    // =========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySettings);
    } else {
        applySettings();
    }

    // Public API
    return {
        getSettings,
        setSetting,
        setSize,
        applySettings,
        createSizePicker,
        
        // Templates
        getSavedTemplates,
        saveTemplate,
        deleteTemplate,
        getTemplate,
        createSaveTemplateButton,
        createTemplateList
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.DraftBridgeSettings = DraftBridgeSettings;
}
