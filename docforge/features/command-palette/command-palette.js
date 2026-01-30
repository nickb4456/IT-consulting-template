/**
 * DocForge Command Palette
 * 
 * VS Code-style command palette for power users.
 * Ctrl+Shift+P opens searchable command list with fuzzy matching.
 * 
 * @version 1.0.0
 */

/* global Word, Office */

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
    RECENT_COMMANDS: 'docforge_command_palette_recent',
    COMMAND_STATS: 'docforge_command_palette_stats'
};

const MAX_RECENT_COMMANDS = 10;
const MAX_RESULTS = 50;

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

/**
 * Central command registry.
 * All DocForge commands are registered here for discoverability.
 */
const _commands = new Map();
const _categories = new Map();

/**
 * Register a command in the palette.
 * 
 * @param {Object} command - Command definition
 * @param {string} command.id - Unique identifier (e.g., 'template.fillAll')
 * @param {string} command.label - Display name (e.g., 'Fill All Template Fields')
 * @param {string} command.category - Category for grouping (e.g., 'Templates')
 * @param {string} [command.description] - Optional description
 * @param {string} [command.shortcut] - Keyboard shortcut (e.g., 'Ctrl+Shift+F')
 * @param {string[]} [command.keywords] - Additional search terms
 * @param {Function} command.execute - Function to run when selected
 * @param {Function} [command.isEnabled] - Optional function returning if command is available
 */
function registerCommand(command) {
    if (!command.id || !command.label || !command.execute) {
        throw new Error('Command must have id, label, and execute function');
    }
    
    const cmd = {
        id: command.id,
        label: command.label,
        category: command.category || 'General',
        description: command.description || '',
        shortcut: command.shortcut || null,
        keywords: command.keywords || [],
        execute: command.execute,
        isEnabled: command.isEnabled || (() => true)
    };
    
    _commands.set(command.id, cmd);
    
    // Track categories
    if (!_categories.has(cmd.category)) {
        _categories.set(cmd.category, []);
    }
    _categories.get(cmd.category).push(cmd.id);
    
    return cmd;
}

/**
 * Register multiple commands at once.
 */
function registerCommands(commands) {
    commands.forEach(registerCommand);
}

/**
 * Unregister a command.
 */
function unregisterCommand(id) {
    const cmd = _commands.get(id);
    if (cmd) {
        _commands.delete(id);
        const catCommands = _categories.get(cmd.category);
        if (catCommands) {
            const idx = catCommands.indexOf(id);
            if (idx >= 0) catCommands.splice(idx, 1);
        }
    }
}

/**
 * Get a command by ID.
 */
function getCommand(id) {
    return _commands.get(id) || null;
}

/**
 * Get all registered commands.
 */
function getAllCommands() {
    return Array.from(_commands.values());
}

/**
 * Get all categories.
 */
function getAllCategories() {
    return Array.from(_categories.keys()).sort();
}

/**
 * Get commands by category.
 */
function getCommandsByCategory(category) {
    const ids = _categories.get(category) || [];
    return ids.map(id => _commands.get(id)).filter(Boolean);
}

// ============================================================================
// RECENT COMMANDS
// ============================================================================

/**
 * Get recent commands from storage.
 */
function getRecentCommands() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.RECENT_COMMANDS);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Record a command execution.
 */
function recordCommandUsed(commandId) {
    try {
        let recent = getRecentCommands();
        // Remove if already exists, add to front
        recent = [commandId, ...recent.filter(id => id !== commandId)];
        // Keep max items
        recent = recent.slice(0, MAX_RECENT_COMMANDS);
        localStorage.setItem(STORAGE_KEYS.RECENT_COMMANDS, JSON.stringify(recent));
        
        // Also update stats
        updateCommandStats(commandId);
    } catch (e) {
        console.warn('Failed to record command usage:', e);
    }
}

/**
 * Get recent commands with full data.
 */
function getRecentCommandsWithData() {
    const recentIds = getRecentCommands();
    return recentIds
        .map(id => _commands.get(id))
        .filter(cmd => cmd && cmd.isEnabled());
}

/**
 * Update command usage statistics.
 */
function updateCommandStats(commandId) {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.COMMAND_STATS);
        const stats = data ? JSON.parse(data) : {};
        stats[commandId] = (stats[commandId] || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.COMMAND_STATS, JSON.stringify(stats));
    } catch (e) {
        // Ignore stats errors
    }
}

/**
 * Get command usage statistics.
 */
function getCommandStats() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.COMMAND_STATS);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

/**
 * Calculate fuzzy match score between query and text.
 * Higher score = better match.
 * Returns 0 if no match.
 * 
 * @param {string} query - Search query
 * @param {string} text - Text to search in
 * @returns {number} Match score (0 = no match)
 */
function fuzzyMatch(query, text) {
    if (!query || !text) return 0;
    
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    
    // Exact match gets highest score
    if (t === q) return 1000;
    
    // Starts with query gets high score
    if (t.startsWith(q)) return 900 + (q.length / t.length) * 50;
    
    // Contains query as substring
    if (t.includes(q)) return 700 + (q.length / t.length) * 50;
    
    // Fuzzy subsequence matching
    let qIdx = 0;
    let tIdx = 0;
    let score = 0;
    let consecutiveBonus = 0;
    let prevMatchIdx = -2;
    
    while (qIdx < q.length && tIdx < t.length) {
        if (q[qIdx] === t[tIdx]) {
            // Match found
            score += 10;
            
            // Bonus for consecutive matches
            if (tIdx === prevMatchIdx + 1) {
                consecutiveBonus += 5;
                score += consecutiveBonus;
            } else {
                consecutiveBonus = 0;
            }
            
            // Bonus for matching at word boundaries
            if (tIdx === 0 || t[tIdx - 1] === ' ' || t[tIdx - 1] === '-' || t[tIdx - 1] === '_') {
                score += 20;
            }
            
            // Bonus for matching uppercase (camelCase/PascalCase)
            if (text[tIdx] === text[tIdx].toUpperCase() && text[tIdx] !== text[tIdx].toLowerCase()) {
                score += 10;
            }
            
            prevMatchIdx = tIdx;
            qIdx++;
        }
        tIdx++;
    }
    
    // All query chars must match
    if (qIdx < q.length) return 0;
    
    // Penalize longer strings (prefer shorter matches)
    score -= t.length * 0.5;
    
    return Math.max(0, score);
}

/**
 * Search commands with fuzzy matching.
 * 
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {boolean} options.includeDisabled - Include disabled commands
 * @returns {Array} Matched commands with scores
 */
function searchCommands(query, options = {}) {
    const { includeDisabled = false } = options;
    
    const commands = getAllCommands();
    const stats = getCommandStats();
    const results = [];
    
    for (const cmd of commands) {
        // Skip disabled unless requested
        if (!includeDisabled && !cmd.isEnabled()) continue;
        
        // Calculate match score across multiple fields
        let score = 0;
        
        // Label is most important
        score += fuzzyMatch(query, cmd.label) * 2;
        
        // Category match
        score += fuzzyMatch(query, cmd.category) * 0.5;
        
        // Description match
        if (cmd.description) {
            score += fuzzyMatch(query, cmd.description) * 0.3;
        }
        
        // Keywords match
        for (const keyword of cmd.keywords) {
            score += fuzzyMatch(query, keyword) * 0.8;
        }
        
        // ID match (for power users who know command IDs)
        score += fuzzyMatch(query, cmd.id) * 0.4;
        
        if (score > 0) {
            // Boost by usage frequency
            const usageCount = stats[cmd.id] || 0;
            score += Math.min(usageCount * 2, 50); // Cap usage bonus
            
            results.push({ command: cmd, score });
        }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, MAX_RESULTS);
}

/**
 * Get commands for display (recent + all, optionally filtered).
 * 
 * @param {string} query - Optional search query
 * @returns {Object} { recent: [], all: [] } or { results: [] } if searching
 */
function getCommandsForDisplay(query) {
    if (query && query.trim()) {
        // Search mode
        return {
            isSearching: true,
            results: searchCommands(query)
        };
    }
    
    // Browse mode - show recent + all by category
    const recent = getRecentCommandsWithData();
    const categories = getAllCategories();
    const byCategory = {};
    
    for (const category of categories) {
        byCategory[category] = getCommandsByCategory(category)
            .filter(cmd => cmd.isEnabled())
            .sort((a, b) => a.label.localeCompare(b.label));
    }
    
    return {
        isSearching: false,
        recent,
        categories: byCategory
    };
}

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

/**
 * Execute a command by ID.
 * 
 * @param {string} commandId - Command ID to execute
 * @param {Object} context - Optional execution context
 * @returns {Promise<any>} Command result
 */
async function executeCommand(commandId, context = {}) {
    const cmd = _commands.get(commandId);
    
    if (!cmd) {
        throw new Error(`Command not found: ${commandId}`);
    }
    
    if (!cmd.isEnabled()) {
        throw new Error(`Command is not available: ${cmd.label}`);
    }
    
    // Record usage
    recordCommandUsed(commandId);
    
    // Execute
    try {
        const result = await cmd.execute(context);
        return { success: true, result };
    } catch (error) {
        return { 
            success: false, 
            error: error.message || 'Command failed'
        };
    }
}

// ============================================================================
// BUILT-IN DOCFORGE COMMANDS
// ============================================================================

/**
 * Register all built-in DocForge commands.
 * Call this during add-in initialization.
 */
function registerBuiltInCommands() {
    registerCommands([
        // === TEMPLATES ===
        {
            id: 'template.fillAll',
            label: 'Fill All Template Fields',
            category: 'Templates',
            description: 'Fill all content controls with current dataset values',
            shortcut: 'Ctrl+Shift+F',
            keywords: ['fill', 'template', 'fields', 'populate', 'data'],
            execute: async () => {
                if (window.FillEngine) {
                    // Would need schema and dataset from current context
                    return window.FillEngine.fillTemplate(
                        window.DocForgeState?.schema,
                        window.DocForgeState?.dataset
                    );
                }
            },
            isEnabled: () => !!window.FillEngine && !!window.DocForgeState?.schema
        },
        {
            id: 'template.scanFields',
            label: 'Scan Document for Fields',
            category: 'Templates',
            description: 'Detect all template fields in the document',
            keywords: ['scan', 'detect', 'fields', 'content controls'],
            execute: async () => {
                if (window.FillEngine) {
                    return window.FillEngine.scanContentControls(true);
                }
            }
        },
        {
            id: 'template.undo',
            label: 'Undo Last Fill',
            category: 'Templates',
            description: 'Restore fields to their previous values',
            shortcut: 'Ctrl+Z',
            keywords: ['undo', 'revert', 'restore'],
            execute: async () => {
                if (window.FillEngine) {
                    return window.FillEngine.undo();
                }
            },
            isEnabled: () => window.FillEngine?.canUndo?.() || false
        },
        {
            id: 'template.openDesigner',
            label: 'Open Template Designer',
            category: 'Templates',
            description: 'Open the template schema designer',
            keywords: ['designer', 'schema', 'edit', 'configure'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('designer');
                }
            }
        },
        {
            id: 'template.createCheckpoint',
            label: 'Create Checkpoint',
            category: 'Templates',
            description: 'Save current field values as a restore point',
            keywords: ['checkpoint', 'snapshot', 'save', 'backup'],
            execute: async () => {
                if (window.FillEngine) {
                    return window.FillEngine.createCheckpoint('Manual checkpoint');
                }
            }
        },

        // === NUMBERING ===
        {
            id: 'numbering.apply',
            label: 'Apply Numbering',
            category: 'Numbering',
            description: 'Apply the selected numbering scheme to the document',
            shortcut: 'Ctrl+Shift+N',
            keywords: ['numbering', 'outline', 'list', 'apply'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('numbering');
                }
            }
        },
        {
            id: 'numbering.fix',
            label: 'Fix Numbering Issues',
            category: 'Numbering',
            description: 'Detect and fix numbering inconsistencies',
            keywords: ['fix', 'repair', 'numbering', 'issues'],
            execute: async () => {
                if (window.NumberingSync) {
                    return window.NumberingSync.fixAllIssues();
                }
            }
        },
        {
            id: 'numbering.restart',
            label: 'Restart Numbering Here',
            category: 'Numbering',
            description: 'Restart numbering from 1 at current selection',
            keywords: ['restart', 'reset', 'numbering'],
            execute: async () => {
                return Word.run(async (context) => {
                    const selection = context.document.getSelection();
                    selection.listItem.load('level');
                    await context.sync();
                    
                    selection.listItem.setLevelStartingNumber(selection.listItem.level, 1);
                    await context.sync();
                });
            }
        },

        // === HEADERS & FORMATTING ===
        {
            id: 'insert.header',
            label: 'Insert Header',
            category: 'Insert',
            description: 'Insert a styled section header',
            keywords: ['header', 'heading', 'section', 'title'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('insert-header');
                }
            }
        },
        {
            id: 'insert.letterhead',
            label: 'Insert Letterhead',
            category: 'Insert',
            description: 'Insert firm letterhead at document start',
            keywords: ['letterhead', 'logo', 'firm', 'header'],
            execute: async () => {
                if (window.Letterhead) {
                    return window.Letterhead.insert();
                }
            }
        },
        {
            id: 'insert.clause',
            label: 'Insert Clause from Vault',
            category: 'Insert',
            description: 'Insert a clause from the clause vault',
            shortcut: 'Ctrl+Shift+C',
            keywords: ['clause', 'vault', 'library', 'boilerplate'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('clause-vault');
                }
            }
        },
        {
            id: 'insert.toc',
            label: 'Insert Table of Contents',
            category: 'Insert',
            description: 'Insert or update table of contents',
            keywords: ['toc', 'table of contents', 'contents', 'index'],
            execute: async () => {
                if (window.TOCGenerator) {
                    return window.TOCGenerator.insertOrUpdate();
                }
            }
        },
        {
            id: 'insert.pageBreak',
            label: 'Insert Page Break',
            category: 'Insert',
            description: 'Insert a page break at cursor',
            shortcut: 'Ctrl+Enter',
            keywords: ['page break', 'break', 'new page'],
            execute: async () => {
                return Word.run(async (context) => {
                    const selection = context.document.getSelection();
                    selection.insertBreak(Word.BreakType.page, Word.InsertLocation.after);
                    await context.sync();
                });
            }
        },
        {
            id: 'insert.sectionBreak',
            label: 'Insert Section Break',
            category: 'Insert',
            description: 'Insert a section break (next page)',
            keywords: ['section break', 'break', 'section'],
            execute: async () => {
                return Word.run(async (context) => {
                    const selection = context.document.getSelection();
                    selection.insertBreak(Word.BreakType.sectionNext, Word.InsertLocation.after);
                    await context.sync();
                });
            }
        },

        // === DOCUMENT CHECKS ===
        {
            id: 'check.document',
            label: 'Check Document',
            category: 'Check',
            description: 'Run document checks before filing',
            shortcut: 'Ctrl+Shift+K',
            keywords: ['check', 'preflight', 'validate', 'review', 'errors'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('preflight');
                }
            }
        },
        {
            id: 'check.crossRefs',
            label: 'Check Cross References',
            category: 'Check',
            description: 'Validate all cross-references in the document',
            keywords: ['cross reference', 'xref', 'references', 'links'],
            execute: async () => {
                if (window.CrossRefManager) {
                    return window.CrossRefManager.validateAll();
                }
            }
        },
        {
            id: 'check.placeholders',
            label: 'Find Unfilled Placeholders',
            category: 'Check',
            description: 'Find [BRACKETS] and other placeholder text',
            keywords: ['placeholder', 'unfilled', 'brackets', 'missing'],
            execute: async () => {
                return Word.run(async (context) => {
                    const body = context.document.body;
                    const results = body.search('[*]', { matchWildcards: true });
                    results.load('text');
                    await context.sync();
                    
                    return {
                        found: results.items.length,
                        items: results.items.map(r => r.text)
                    };
                });
            }
        },

        // === DIFF & COMPARE ===
        {
            id: 'diff.compare',
            label: 'Compare Documents',
            category: 'Compare',
            description: 'Compare changes between document versions',
            keywords: ['diff', 'compare', 'changes', 'redline'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('diff');
                }
            }
        },
        {
            id: 'diff.showChanges',
            label: 'Show Document Changes',
            category: 'Compare',
            description: 'Highlight all tracked changes',
            keywords: ['changes', 'track changes', 'revisions', 'markup'],
            execute: async () => {
                return Word.run(async (context) => {
                    context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
                    await context.sync();
                });
            }
        },

        // === FORMATTING ===
        {
            id: 'format.removeDoubleSpaces',
            label: 'Remove Double Spaces',
            category: 'Format',
            description: 'Replace all double spaces with single spaces',
            keywords: ['spaces', 'double', 'cleanup', 'clean'],
            execute: async () => {
                return Word.run(async (context) => {
                    const body = context.document.body;
                    const results = body.search('  ', { matchCase: false });
                    results.load('text');
                    await context.sync();
                    
                    let count = 0;
                    while (results.items.length > 0) {
                        for (const item of results.items) {
                            item.insertText(' ', Word.InsertLocation.replace);
                            count++;
                        }
                        await context.sync();
                        results.load('text');
                        await context.sync();
                    }
                    
                    return { replaced: count };
                });
            }
        },
        {
            id: 'format.clearFormatting',
            label: 'Clear Formatting',
            category: 'Format',
            description: 'Remove all formatting from selection',
            keywords: ['clear', 'formatting', 'plain', 'reset'],
            execute: async () => {
                return Word.run(async (context) => {
                    const selection = context.document.getSelection();
                    selection.font.bold = false;
                    selection.font.italic = false;
                    selection.font.underline = Word.UnderlineType.none;
                    selection.font.color = 'black';
                    selection.font.highlightColor = null;
                    await context.sync();
                });
            }
        },
        {
            id: 'format.allCaps',
            label: 'Toggle ALL CAPS',
            category: 'Format',
            description: 'Toggle uppercase on selection',
            keywords: ['caps', 'uppercase', 'capital'],
            execute: async () => {
                return Word.run(async (context) => {
                    const selection = context.document.getSelection();
                    selection.load('text');
                    await context.sync();
                    
                    const text = selection.text;
                    const isAllCaps = text === text.toUpperCase();
                    selection.insertText(
                        isAllCaps ? text.toLowerCase() : text.toUpperCase(),
                        Word.InsertLocation.replace
                    );
                    await context.sync();
                });
            }
        },

        // === SURVIVOR / VERSIONS ===
        {
            id: 'survivor.save',
            label: 'Save Version Snapshot',
            category: 'Versions',
            description: 'Save current document state as a version',
            keywords: ['version', 'snapshot', 'save', 'backup', 'survivor'],
            execute: async () => {
                if (window.SurvivorCommands) {
                    return window.SurvivorCommands.saveVersion();
                }
            }
        },
        {
            id: 'survivor.list',
            label: 'View Saved Versions',
            category: 'Versions',
            description: 'Browse and restore saved document versions',
            keywords: ['versions', 'history', 'restore', 'survivor'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('versions');
                }
            }
        },

        // === NAVIGATION ===
        {
            id: 'nav.goToPage',
            label: 'Go to Page...',
            category: 'Navigate',
            description: 'Jump to a specific page number',
            shortcut: 'Ctrl+G',
            keywords: ['go to', 'page', 'jump', 'navigate'],
            execute: () => {
                // Would show page number input
                if (window.DocForgeUI?.promptInput) {
                    window.DocForgeUI.promptInput('Enter page number:', async (pageNum) => {
                        return Word.run(async (context) => {
                            // Note: Word.js doesn't have direct page navigation
                            // Would need workaround
                        });
                    });
                }
            }
        },
        {
            id: 'nav.goToHeading',
            label: 'Go to Heading...',
            category: 'Navigate',
            description: 'Jump to a document heading',
            keywords: ['heading', 'section', 'jump', 'navigate'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('navigation');
                }
            }
        },

        // === SETTINGS ===
        {
            id: 'settings.open',
            label: 'Open Settings',
            category: 'Settings',
            description: 'Configure DocForge preferences',
            keywords: ['settings', 'preferences', 'options', 'configure'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('settings');
                }
            }
        },
        {
            id: 'settings.shortcuts',
            label: 'Keyboard Shortcuts',
            category: 'Settings',
            description: 'View and customize keyboard shortcuts',
            keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keybindings'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('shortcuts');
                }
            }
        },

        // === HELP ===
        {
            id: 'help.documentation',
            label: 'Open Documentation',
            category: 'Help',
            description: 'View DocForge documentation',
            shortcut: 'F1',
            keywords: ['help', 'docs', 'documentation', 'manual'],
            execute: () => {
                window.open('https://docs.docforge.app', '_blank');
            }
        },
        {
            id: 'help.about',
            label: 'About DocForge',
            category: 'Help',
            description: 'View version and license information',
            keywords: ['about', 'version', 'info'],
            execute: () => {
                if (window.DocForgeUI?.showPanel) {
                    window.DocForgeUI.showPanel('about');
                }
            }
        },
        {
            id: 'help.reportIssue',
            label: 'Report an Issue',
            category: 'Help',
            description: 'Report a bug or request a feature',
            keywords: ['bug', 'issue', 'report', 'feedback', 'support'],
            execute: () => {
                window.open('https://support.docforge.app/issues', '_blank');
            }
        }
    ]);
}

// ============================================================================
// KEYBOARD SHORTCUT HANDLER
// ============================================================================

let _globalShortcutEnabled = true;
let _paletteOpenCallback = null;

/**
 * Set callback for opening the palette.
 */
function setPaletteOpenCallback(callback) {
    _paletteOpenCallback = callback;
}

/**
 * Enable or disable the global shortcut.
 */
function setGlobalShortcutEnabled(enabled) {
    _globalShortcutEnabled = enabled;
}

/**
 * Initialize keyboard listener for Ctrl+Shift+P.
 */
function initKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+P (or Cmd+Shift+P on Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            e.stopPropagation();
            
            if (_globalShortcutEnabled && _paletteOpenCallback) {
                _paletteOpenCallback();
            }
        }
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Window global for browser use
if (typeof window !== 'undefined') {
    window.CommandPalette = {
        // Registry
        registerCommand,
        registerCommands,
        unregisterCommand,
        getCommand,
        getAllCommands,
        getAllCategories,
        getCommandsByCategory,
        
        // Search
        searchCommands,
        fuzzyMatch,
        getCommandsForDisplay,
        
        // Recent
        getRecentCommands,
        getRecentCommandsWithData,
        recordCommandUsed,
        getCommandStats,
        
        // Execution
        executeCommand,
        
        // Built-ins
        registerBuiltInCommands,
        
        // Keyboard
        initKeyboardListener,
        setPaletteOpenCallback,
        setGlobalShortcutEnabled
    };
}

// CommonJS exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        registerCommand,
        registerCommands,
        unregisterCommand,
        getCommand,
        getAllCommands,
        getAllCategories,
        getCommandsByCategory,
        searchCommands,
        fuzzyMatch,
        getCommandsForDisplay,
        getRecentCommands,
        getRecentCommandsWithData,
        recordCommandUsed,
        getCommandStats,
        executeCommand,
        registerBuiltInCommands,
        initKeyboardListener,
        setPaletteOpenCallback,
        setGlobalShortcutEnabled
    };
}
