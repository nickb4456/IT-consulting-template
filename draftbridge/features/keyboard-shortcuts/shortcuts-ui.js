/**
 * DraftBridge Keyboard Ninja Mode - Cheat Sheet UI
 * 
 * Modal overlay showing all available keyboard shortcuts.
 * Searchable, grouped by category, with customization support.
 */

const ShortcutsUI = (function() {
    'use strict';

    let modal = null;
    let isShowing = false;
    let searchInput = null;
    let currentFilter = '';

    /**
     * Initialize the shortcuts UI
     */
    function init() {
        createModal();
    }

    /**
     * Create the modal DOM structure
     */
    function createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('shortcutsModal');
        if (existing) existing.remove();

        modal = document.createElement('div');
        modal.id = 'shortcutsModal';
        modal.className = 'shortcuts-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'shortcutsTitle');

        modal.innerHTML = `
            <div class="shortcuts-backdrop"></div>
            <div class="shortcuts-content">
                <div class="shortcuts-header">
                    <div class="shortcuts-title-row">
                        <h2 id="shortcutsTitle" class="shortcuts-title">
                            <span class="shortcuts-title-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01"/>
                                    <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>
                                    <path d="M7 16h10"/>
                                </svg>
                            </span>
                            <span>Keyboard Shortcuts</span>
                        </h2>
                        <button class="shortcuts-close" id="closeShortcuts" aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="shortcuts-search-row">
                        <div class="shortcuts-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                            <input type="text" 
                                   id="shortcutsSearch" 
                                   class="shortcuts-search-input" 
                                   placeholder="Search shortcuts..." 
                                   autocomplete="off"
                                   autocorrect="off"
                                   autocapitalize="off"
                                   spellcheck="false"
                                   aria-label="Search shortcuts">
                        </div>
                    </div>
                </div>
                
                <div class="shortcuts-body" id="shortcutsBody">
                    <!-- Shortcuts rendered here -->
                </div>
                
                <div class="shortcuts-footer">
                    <div class="shortcuts-footer-hint">
                        <kbd class="key-hint">Esc</kbd>
                        <span>to close</span>
                        <span style="margin-left: 12px;">Press</span>
                        <kbd class="key-hint">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                        <kbd class="key-hint">?</kbd>
                        <span>anytime</span>
                    </div>
                    <div class="shortcuts-footer-actions">
                        <button class="btn-text" id="resetShortcuts">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Close button
        document.getElementById('closeShortcuts')?.addEventListener('click', hide);
        
        // Backdrop click
        modal.querySelector('.shortcuts-backdrop')?.addEventListener('click', hide);
        
        // Search input
        searchInput = document.getElementById('shortcutsSearch');
        searchInput?.addEventListener('input', (e) => {
            currentFilter = e.target.value.toLowerCase();
            renderShortcuts();
        });
        
        // Reset button
        document.getElementById('resetShortcuts')?.addEventListener('click', () => {
            if (confirm('Reset all keyboard shortcuts to defaults?')) {
                KeyboardShortcuts.resetToDefaults();
                renderShortcuts();
            }
        });
        
        // Keyboard navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hide();
            }
        });
    }

    /**
     * Show the shortcuts modal
     */
    function show() {
        if (!modal) init();
        
        renderShortcuts();
        modal.classList.remove('hidden');
        isShowing = true;
        
        // Focus search input
        setTimeout(() => {
            searchInput?.focus();
        }, 100);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide the shortcuts modal
     */
    function hide() {
        if (modal) {
            modal.classList.add('hidden');
        }
        isShowing = false;
        currentFilter = '';
        if (searchInput) searchInput.value = '';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Toggle modal visibility
     */
    function toggle() {
        if (isShowing) {
            hide();
        } else {
            show();
        }
    }

    /**
     * Check if modal is visible
     */
    function isVisible() {
        return isShowing;
    }

    /**
     * Render the shortcuts list
     */
    function renderShortcuts() {
        const body = document.getElementById('shortcutsBody');
        if (!body) return;

        const grouped = KeyboardShortcuts.getShortcutsByCategory();
        const categories = Object.keys(grouped).sort();
        
        let html = '';
        let visibleCount = 0;
        
        for (const category of categories) {
            const shortcuts = grouped[category];
            const filteredShortcuts = filterShortcuts(shortcuts);
            
            if (filteredShortcuts.length === 0) continue;
            
            visibleCount += filteredShortcuts.length;
            
            html += `
                <div class="shortcuts-category" data-category="${escapeHTML(category)}">
                    <h3 class="shortcuts-category-title">${escapeHTML(category)}</h3>
                    <div class="shortcuts-list">
                        ${filteredShortcuts.map(s => renderShortcutRow(s)).join('')}
                    </div>
                </div>
            `;
        }
        
        if (visibleCount === 0) {
            html = `
                <div class="shortcuts-empty">
                    <div class="shortcuts-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                    </div>
                    <p class="shortcuts-empty-text">No shortcuts found</p>
                    <p class="shortcuts-empty-hint">No matches for "${escapeHTML(currentFilter)}"</p>
                </div>
            `;
        }
        
        body.innerHTML = html;
    }

    /**
     * Filter shortcuts based on search input
     */
    function filterShortcuts(shortcuts) {
        if (!currentFilter) return shortcuts;
        
        return shortcuts.filter(s => {
            const searchText = (
                s.description + ' ' + 
                s.action + ' ' + 
                s.key + ' ' +
                KeyboardShortcuts.formatShortcut(s)
            ).toLowerCase();
            
            return searchText.includes(currentFilter);
        });
    }

    /**
     * Render a single shortcut row
     */
    function renderShortcutRow(shortcut) {
        const keys = formatKeysHTML(shortcut);
        
        return `
            <div class="shortcuts-row" data-action="${escapeHTML(shortcut.action)}">
                <div class="shortcuts-description">
                    ${escapeHTML(shortcut.description)}
                </div>
                <div class="shortcuts-keys">
                    ${keys}
                </div>
            </div>
        `;
    }

    /**
     * Format shortcut keys as HTML badges
     */
    function formatKeysHTML(shortcut) {
        const keys = [];
        const isMac = navigator.platform.includes('Mac');
        
        // Modifier keys (marked as such for styling)
        if (shortcut.ctrl || shortcut.meta) {
            const label = isMac ? '⌘' : 'Ctrl';
            keys.push({ label, isModifier: true, key: 'ctrl' });
        }
        if (shortcut.alt) {
            const label = isMac ? '⌥' : 'Alt';
            keys.push({ label, isModifier: true, key: 'alt' });
        }
        if (shortcut.shift) {
            const label = isMac ? '⇧' : 'Shift';
            keys.push({ label, isModifier: true, key: 'shift' });
        }
        
        // Main key
        let key = shortcut.key;
        let displayKey = key;
        let keyType = 'normal';
        
        if (key === 'Escape') { displayKey = 'Esc'; keyType = 'escape'; }
        else if (key === 'Tab') { displayKey = isMac ? '⇥' : 'Tab'; keyType = 'tab'; }
        else if (key === 'Enter') { displayKey = isMac ? '↵' : 'Enter'; keyType = 'enter'; }
        else if (key === ' ') { displayKey = 'Space'; keyType = 'space'; }
        else if (key === 'Backspace') { displayKey = isMac ? '⌫' : 'Backspace'; keyType = 'backspace'; }
        else { displayKey = key.toUpperCase(); }
        
        keys.push({ label: displayKey, isModifier: false, key: keyType });
        
        return keys.map(k => 
            `<kbd class="shortcut-key" data-key="${k.key}" ${k.isModifier ? 'data-modifier="true"' : ''}>${escapeHTML(k.label)}</kbd>`
        ).join('');
    }

    /**
     * Escape HTML characters
     */
    function escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create a floating cheat sheet (compact version)
     * Can be docked to a corner of the screen
     */
    function createFloatingCheatSheet(position = 'bottom-right') {
        const sheet = document.createElement('div');
        sheet.className = `shortcuts-floating-sheet shortcuts-floating-${position}`;
        sheet.innerHTML = `
            <div class="floating-sheet-header">
                <span>Quick Reference</span>
                <button class="floating-sheet-close" aria-label="Close">×</button>
            </div>
            <div class="floating-sheet-content">
                ${renderQuickReference()}
            </div>
        `;
        
        document.body.appendChild(sheet);
        
        sheet.querySelector('.floating-sheet-close')?.addEventListener('click', () => {
            sheet.remove();
        });
        
        return sheet;
    }

    /**
     * Render quick reference (most common shortcuts)
     */
    function renderQuickReference() {
        const essentials = [
            'fillAll', 'applyNumbering', 'showDiff', 
            'commandPalette', 'showShortcuts', 'closePanel'
        ];
        
        const shortcuts = KeyboardShortcuts.getShortcuts()
            .filter(s => essentials.includes(s.action));
        
        return shortcuts.map(s => `
            <div class="floating-shortcut">
                <span>${escapeHTML(s.description)}</span>
                <span class="floating-keys">${KeyboardShortcuts.formatShortcut(s)}</span>
            </div>
        `).join('');
    }

    // Public API
    return {
        init,
        show,
        hide,
        toggle,
        isVisible,
        createFloatingCheatSheet
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ShortcutsUI.init);
} else {
    ShortcutsUI.init();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShortcutsUI;
}
