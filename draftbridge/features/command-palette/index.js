/**
 * DraftBridge Command Palette
 * 
 * VS Code-style command palette for power users.
 * Ctrl+Shift+P opens searchable command list with fuzzy matching.
 * 
 * @example
 * // Initialize in your taskpane
 * import { init, registerBuiltInCommands } from './features/command-palette';
 * 
 * // Register built-in commands
 * registerBuiltInCommands();
 * 
 * // Initialize UI
 * init({ container: document.body });
 * 
 * // Register custom commands
 * registerCommand({
 *     id: 'custom.myCommand',
 *     label: 'My Custom Command',
 *     category: 'Custom',
 *     execute: () => console.log('Hello!')
 * });
 */

// Import core and UI modules
// Note: In browser context, these are loaded via script tags
// and expose window.CommandPalette and window.CommandPaletteUI

/**
 * Initialize the command palette.
 * Call this once during add-in startup.
 * 
 * @param {Object} options - Initialization options
 * @param {HTMLElement} [options.container] - Parent element for palette (default: document.body)
 * @param {Function} [options.onExecute] - Callback after command execution
 * @param {Function} [options.onClose] - Callback when palette closes
 */
function init(options = {}) {
    // Register built-in commands if not already done
    if (window.CommandPalette && window.CommandPalette.getAllCommands().length === 0) {
        window.CommandPalette.registerBuiltInCommands();
    }
    
    // Initialize UI
    if (window.CommandPaletteUI) {
        window.CommandPaletteUI.init(options);
    }
}

/**
 * Open the command palette.
 */
function open() {
    if (window.CommandPaletteUI) {
        window.CommandPaletteUI.open();
    }
}

/**
 * Close the command palette.
 */
function close() {
    if (window.CommandPaletteUI) {
        window.CommandPaletteUI.close();
    }
}

/**
 * Toggle the command palette.
 */
function toggle() {
    if (window.CommandPaletteUI) {
        window.CommandPaletteUI.toggle();
    }
}

/**
 * Register a custom command.
 * @see command-palette.js for full documentation
 */
function registerCommand(command) {
    if (window.CommandPalette) {
        return window.CommandPalette.registerCommand(command);
    }
    throw new Error('CommandPalette not loaded');
}

/**
 * Register multiple commands.
 */
function registerCommands(commands) {
    if (window.CommandPalette) {
        return window.CommandPalette.registerCommands(commands);
    }
    throw new Error('CommandPalette not loaded');
}

/**
 * Execute a command by ID.
 */
async function executeCommand(commandId, context) {
    if (window.CommandPalette) {
        return window.CommandPalette.executeCommand(commandId, context);
    }
    throw new Error('CommandPalette not loaded');
}

/**
 * Register built-in DraftBridge commands.
 */
function registerBuiltInCommands() {
    if (window.CommandPalette) {
        window.CommandPalette.registerBuiltInCommands();
    }
}

// Export for ES modules
export {
    init,
    open,
    close,
    toggle,
    registerCommand,
    registerCommands,
    executeCommand,
    registerBuiltInCommands
};

// Window global for direct script usage
if (typeof window !== 'undefined') {
    window.DraftBridgeCommandPalette = {
        init,
        open,
        close,
        toggle,
        registerCommand,
        registerCommands,
        executeCommand,
        registerBuiltInCommands
    };
}
