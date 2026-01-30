/**
 * DraftBridge Keyboard Ninja Mode - Handler and Registry
 * 
 * Global keyboard shortcut system for power users.
 * Configurable, extensible, and vim-fast document assembly.
 */

const KeyboardShortcuts = (function() {
    'use strict';

    /**
     * Default shortcut configuration
     * Format: { key, ctrl, shift, alt, meta, action, description, category }
     */
    const DEFAULT_SHORTCUTS = [
        // Document Actions
        { key: 'f', ctrl: true, shift: true, action: 'fillAll', description: 'Fill All Fields', category: 'Document' },
        { key: 'n', ctrl: true, shift: true, action: 'applyNumbering', description: 'Apply Numbering', category: 'Document' },
        { key: 'h', ctrl: true, shift: true, action: 'insertHeader', description: 'Insert Header', category: 'Document' },
        { key: 'c', ctrl: true, shift: true, action: 'checkDocument', description: 'Check Document', category: 'Document' },
        
        // Navigation & UI
        { key: 'p', ctrl: true, shift: true, action: 'commandPalette', description: 'Command Palette', category: 'Navigation' },
        { key: 'd', ctrl: true, shift: false, action: 'showDiff', description: 'Compare Changes', category: 'Navigation' },
        { key: '/', ctrl: true, shift: false, action: 'inlineSearch', description: 'Search in Document', category: 'Navigation' },
        { key: '?', ctrl: true, shift: false, action: 'showShortcuts', description: 'Show Shortcuts', category: 'Navigation' },
        
        // Field Navigation
        { key: 'Tab', ctrl: false, shift: false, action: 'nextField', description: 'Next Field', category: 'Fields' },
        { key: 'Tab', ctrl: false, shift: true, action: 'prevField', description: 'Previous Field', category: 'Fields' },
        { key: 'Enter', ctrl: true, shift: false, action: 'acceptField', description: 'Accept & Next', category: 'Fields' },
        
        // Quick Select (1-9)
        { key: '1', ctrl: true, shift: false, action: 'quickSelect1', description: 'Quick Select 1', category: 'Quick Select' },
        { key: '2', ctrl: true, shift: false, action: 'quickSelect2', description: 'Quick Select 2', category: 'Quick Select' },
        { key: '3', ctrl: true, shift: false, action: 'quickSelect3', description: 'Quick Select 3', category: 'Quick Select' },
        { key: '4', ctrl: true, shift: false, action: 'quickSelect4', description: 'Quick Select 4', category: 'Quick Select' },
        { key: '5', ctrl: true, shift: false, action: 'quickSelect5', description: 'Quick Select 5', category: 'Quick Select' },
        { key: '6', ctrl: true, shift: false, action: 'quickSelect6', description: 'Quick Select 6', category: 'Quick Select' },
        { key: '7', ctrl: true, shift: false, action: 'quickSelect7', description: 'Quick Select 7', category: 'Quick Select' },
        { key: '8', ctrl: true, shift: false, action: 'quickSelect8', description: 'Quick Select 8', category: 'Quick Select' },
        { key: '9', ctrl: true, shift: false, action: 'quickSelect9', description: 'Quick Select 9', category: 'Quick Select' },
        
        // Edit Actions
        { key: 'z', ctrl: true, shift: false, action: 'undo', description: 'Undo', category: 'Edit' },
        { key: 'z', ctrl: true, shift: true, action: 'redo', description: 'Redo', category: 'Edit' },
        { key: 'y', ctrl: true, shift: false, action: 'redo', description: 'Redo (Alt)', category: 'Edit' },
        { key: 's', ctrl: true, shift: false, action: 'save', description: 'Save Document', category: 'Edit' },
        
        // Close/Cancel
        { key: 'Escape', ctrl: false, shift: false, action: 'closePanel', description: 'Close Panel/Modal', category: 'Navigation' },
    ];

    let shortcuts = [];
    let actionHandlers = {};
    let isEnabled = true;
    let hintTimeout = null;
    let activeHints = new Map();
    const STORAGE_KEY = 'draftbridge_shortcuts';

    /**
     * Initialize the keyboard shortcuts system
     */
    function init() {
        loadShortcuts();
        attachGlobalListener();
        registerDefaultHandlers();
    }

    /**
     * Load shortcuts from localStorage or use defaults
     */
    function loadShortcuts() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new shortcuts are available
                shortcuts = mergeShortcuts(DEFAULT_SHORTCUTS, parsed);
            } else {
                shortcuts = [...DEFAULT_SHORTCUTS];
            }
        } catch (e) {
            console.warn('[KeyboardShortcuts] Load failed, using defaults:', e);
            shortcuts = [...DEFAULT_SHORTCUTS];
            // Silent fallback is OK here - user just gets default shortcuts
        }
    }

    /**
     * Merge stored shortcuts with defaults
     * Stored shortcuts take precedence for existing actions
     */
    function mergeShortcuts(defaults, stored) {
        const result = [];
        const storedMap = new Map(stored.map(s => [s.action, s]));
        
        for (const def of defaults) {
            if (storedMap.has(def.action)) {
                result.push({ ...def, ...storedMap.get(def.action) });
            } else {
                result.push(def);
            }
        }
        
        // Add any custom shortcuts from storage that aren't in defaults
        for (const s of stored) {
            if (!defaults.find(d => d.action === s.action)) {
                result.push(s);
            }
        }
        
        return result;
    }

    /**
     * Save shortcuts to localStorage
     */
    function saveShortcuts() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
        } catch (e) {
            console.warn('[KeyboardShortcuts] Save failed:', e);
            // TODO: Consider showing toast - user's custom shortcuts didn't persist
        }
    }

    /**
     * Attach the global keydown listener
     */
    function attachGlobalListener() {
        document.addEventListener('keydown', handleKeyDown, true);
    }

    /**
     * Handle keydown events
     */
    function handleKeyDown(e) {
        if (!isEnabled) return;
        
        // Don't intercept when typing in inputs (except for special keys)
        if (isTypingContext(e) && !isSpecialKey(e)) {
            return;
        }

        const shortcut = findMatchingShortcut(e);
        if (shortcut) {
            // Check if there's a handler for this action
            const handler = actionHandlers[shortcut.action];
            if (handler) {
                e.preventDefault();
                e.stopPropagation();
                executeAction(shortcut, handler);
            }
        }
    }

    /**
     * Check if user is in a text input context
     */
    function isTypingContext(e) {
        const target = e.target;
        const tagName = target.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            return true;
        }
        
        if (target.isContentEditable) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if key is a special navigation key that should work in inputs
     */
    function isSpecialKey(e) {
        return e.key === 'Escape' || 
               (e.key === 'Tab' && !e.ctrlKey) ||
               (e.ctrlKey && (e.key === '?' || e.key === '/'));
    }

    /**
     * Find a shortcut matching the current key event
     */
    function findMatchingShortcut(e) {
        const key = normalizeKey(e.key);
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;

        return shortcuts.find(s => {
            const sKey = normalizeKey(s.key);
            const sCtrl = s.ctrl || s.meta || false;
            const sShift = s.shift || false;
            const sAlt = s.alt || false;
            
            return sKey === key && sCtrl === ctrl && sShift === shift && sAlt === alt;
        });
    }

    /**
     * Normalize key names for comparison
     */
    function normalizeKey(key) {
        if (!key) return '';
        const k = key.toLowerCase();
        // Handle special cases
        if (k === 'escape') return 'escape';
        if (k === 'tab') return 'tab';
        if (k === 'enter') return 'enter';
        return k;
    }

    /**
     * Execute a shortcut action
     */
    /**
     * Execute a shortcut action
     * @param {Object} shortcut - The shortcut configuration
     * @param {Function} handler - The action handler to execute
     */
    function executeAction(shortcut, handler) {
        try {
            handler(shortcut);
            
            // Emit custom event for extensibility
            document.dispatchEvent(new CustomEvent('draftbridge:shortcut', {
                detail: { action: shortcut.action, shortcut }
            }));
        } catch (e) {
            // Action failed silently - don't break the keyboard handling
        }
    }

    /**
     * Register default action handlers
     */
    function registerDefaultHandlers() {
        // Document Actions
        registerAction('fillAll', () => {
            window.DraftBridge?.fillAll?.();
        });
        
        registerAction('applyNumbering', () => {
            if (typeof NumberingEngine !== 'undefined') {
                NumberingEngine.applyToDocument?.();
            }
        });
        
        registerAction('insertHeader', () => {
            if (typeof LetterheadManager !== 'undefined') {
                LetterheadManager.showPicker?.();
            }
        });
        
        registerAction('checkDocument', () => {
            window.DraftBridge?.checkDocument?.();
        });
        
        // Navigation
        registerAction('commandPalette', () => {
            if (typeof CommandPalette !== 'undefined') {
                CommandPalette.toggle?.();
            } else {
                // Fallback: emit event
                document.dispatchEvent(new CustomEvent('draftbridge:openCommandPalette'));
            }
        });
        
        registerAction('showDiff', () => {
            if (typeof DiffPreview !== 'undefined') {
                DiffPreview.showForCurrentChanges?.();
            }
        });
        
        registerAction('inlineSearch', () => {
            document.dispatchEvent(new CustomEvent('draftbridge:openSearch'));
        });
        
        registerAction('showShortcuts', () => {
            if (typeof ShortcutsUI !== 'undefined') {
                ShortcutsUI.show?.();
            }
        });
        
        // Field Navigation
        registerAction('nextField', () => {
            window.DraftBridge?.nextField?.();
        });
        
        registerAction('prevField', () => {
            window.DraftBridge?.prevField?.();
        });
        
        registerAction('acceptField', () => {
            window.DraftBridge?.acceptField?.();
        });
        
        // Quick Select
        for (let i = 1; i <= 9; i++) {
            registerAction(`quickSelect${i}`, () => {
                window.DraftBridge?.quickSelect?.(i);
            });
        }
        
        // Edit Actions
        registerAction('undo', () => {
            window.DraftBridge?.undo?.() || document.execCommand('undo');
        });
        
        registerAction('redo', () => {
            window.DraftBridge?.redo?.() || document.execCommand('redo');
        });
        
        registerAction('save', () => {
            window.DraftBridge?.save?.();
        });
        
        // Close Panel
        registerAction('closePanel', () => {
            // Try to close any open panels/modals
            if (typeof ShortcutsUI !== 'undefined' && ShortcutsUI.isVisible?.()) {
                ShortcutsUI.hide?.();
                return;
            }
            if (typeof DiffPreview !== 'undefined' && DiffPreview.isPreviewVisible?.()) {
                DiffPreview.hide?.();
                return;
            }
            if (typeof CommandPalette !== 'undefined' && CommandPalette.isVisible?.()) {
                CommandPalette.hide?.();
                return;
            }
            // Emit generic close event
            document.dispatchEvent(new CustomEvent('draftbridge:closePanel'));
        });
    }

    /**
     * Register an action handler
     * @param {string} action - Action identifier
     * @param {Function} handler - Handler function
     */
    function registerAction(action, handler) {
        actionHandlers[action] = handler;
    }

    /**
     * Unregister an action handler
     * @param {string} action - Action identifier
     */
    function unregisterAction(action) {
        delete actionHandlers[action];
    }

    /**
     * Register a new shortcut
     * @param {Object} shortcut - Shortcut configuration
     */
    function registerShortcut(shortcut) {
        // Remove existing shortcut for same action
        shortcuts = shortcuts.filter(s => s.action !== shortcut.action);
        shortcuts.push(shortcut);
        saveShortcuts();
    }

    /**
     * Update an existing shortcut's key binding
     * @param {string} action - Action to update
     * @param {Object} newBinding - New key binding { key, ctrl, shift, alt }
     */
    function updateShortcut(action, newBinding) {
        const idx = shortcuts.findIndex(s => s.action === action);
        if (idx !== -1) {
            shortcuts[idx] = { ...shortcuts[idx], ...newBinding };
            saveShortcuts();
        }
    }

    /**
     * Reset all shortcuts to defaults
     */
    function resetToDefaults() {
        shortcuts = [...DEFAULT_SHORTCUTS];
        saveShortcuts();
    }

    /**
     * Get all registered shortcuts
     */
    function getShortcuts() {
        return [...shortcuts];
    }

    /**
     * Get shortcuts grouped by category
     */
    function getShortcutsByCategory() {
        const grouped = {};
        for (const s of shortcuts) {
            const cat = s.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(s);
        }
        return grouped;
    }

    /**
     * Format a shortcut for display
     * @param {Object} shortcut - Shortcut object
     * @returns {string} Formatted string like "Ctrl+Shift+F"
     */
    function formatShortcut(shortcut) {
        const parts = [];
        const isMac = navigator.platform.includes('Mac');
        
        if (shortcut.ctrl || shortcut.meta) {
            parts.push(isMac ? '⌘' : 'Ctrl');
        }
        if (shortcut.alt) {
            parts.push(isMac ? '⌥' : 'Alt');
        }
        if (shortcut.shift) {
            parts.push(isMac ? '⇧' : 'Shift');
        }
        
        // Format the key
        let key = shortcut.key;
        if (key === 'Escape') key = 'Esc';
        else if (key === 'Tab') key = '⇥';
        else if (key === 'Enter') key = '↵';
        else if (key === ' ') key = 'Space';
        else key = key.toUpperCase();
        
        parts.push(key);
        
        return parts.join(isMac ? '' : '+');
    }

    /**
     * Enable keyboard shortcuts
     */
    function enable() {
        isEnabled = true;
    }

    /**
     * Disable keyboard shortcuts
     */
    function disable() {
        isEnabled = false;
    }

    /**
     * Check if shortcuts are enabled
     */
    function isShortcutsEnabled() {
        return isEnabled;
    }

    /**
     * Show shortcut hints on elements
     * Elements should have data-shortcut-action attribute
     */
    function showHints() {
        const elements = document.querySelectorAll('[data-shortcut-action]');
        
        elements.forEach(el => {
            const action = el.dataset.shortcutAction;
            const shortcut = shortcuts.find(s => s.action === action);
            
            if (shortcut) {
                const hint = createHintBadge(shortcut);
                positionHint(hint, el);
                activeHints.set(el, hint);
            }
        });
    }

    /**
     * Hide all shortcut hints
     */
    function hideHints() {
        activeHints.forEach((hint, el) => {
            hint.remove();
        });
        activeHints.clear();
    }

    /**
     * Create a hint badge element
     */
    function createHintBadge(shortcut) {
        const badge = document.createElement('div');
        badge.className = 'shortcut-hint-badge';
        badge.textContent = formatShortcut(shortcut);
        document.body.appendChild(badge);
        return badge;
    }

    /**
     * Position hint badge near element
     */
    function positionHint(hint, element) {
        const rect = element.getBoundingClientRect();
        hint.style.position = 'fixed';
        hint.style.top = `${rect.top - 8}px`;
        hint.style.left = `${rect.right + 4}px`;
        hint.style.zIndex = '100000';
    }

    /**
     * Attach hover hints to elements with data-shortcut-action
     * Shows keyboard shortcut on hover
     */
    function attachHoverHints() {
        document.addEventListener('mouseenter', (e) => {
            const target = e.target.closest('[data-shortcut-action]');
            if (!target) return;
            
            const action = target.dataset.shortcutAction;
            const shortcut = shortcuts.find(s => s.action === action);
            
            if (shortcut && !activeHints.has(target)) {
                // Wait a bit before showing hint
                hintTimeout = setTimeout(() => {
                    const hint = createHintBadge(shortcut);
                    positionHint(hint, target);
                    activeHints.set(target, hint);
                }, 500);
            }
        }, true);
        
        document.addEventListener('mouseleave', (e) => {
            const target = e.target.closest('[data-shortcut-action]');
            if (!target) return;
            
            clearTimeout(hintTimeout);
            
            if (activeHints.has(target)) {
                activeHints.get(target).remove();
                activeHints.delete(target);
            }
        }, true);
    }

    /**
     * Get shortcut by action name
     */
    function getShortcutForAction(action) {
        return shortcuts.find(s => s.action === action);
    }

    // Public API
    return {
        init,
        enable,
        disable,
        isEnabled: isShortcutsEnabled,
        registerAction,
        unregisterAction,
        registerShortcut,
        updateShortcut,
        resetToDefaults,
        getShortcuts,
        getShortcutsByCategory,
        getShortcutForAction,
        formatShortcut,
        showHints,
        hideHints,
        attachHoverHints,
        DEFAULT_SHORTCUTS
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', KeyboardShortcuts.init);
} else {
    KeyboardShortcuts.init();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}
