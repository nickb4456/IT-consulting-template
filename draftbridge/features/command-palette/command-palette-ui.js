/**
 * DraftBridge Command Palette UI
 * 
 * VS Code-inspired modal interface for the command palette.
 * Handles rendering, keyboard navigation, and user interaction.
 * 
 * @version 1.0.0
 */

/* global CommandPalette */

// ============================================================================
// UI STATE
// ============================================================================

let _container = null;
let _isOpen = false;
let _selectedIndex = 0;
let _currentResults = [];
let _searchQuery = '';
let _onExecute = null;
let _onClose = null;

// Element references
let _elements = {
    overlay: null,
    modal: null,
    input: null,
    resultsList: null,
    recentSection: null,
    allSection: null,
    emptyState: null,
    countBadge: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the command palette UI.
 * Creates DOM elements and attaches event listeners.
 * 
 * @param {Object} options
 * @param {HTMLElement} [options.container] - Parent container (default: document.body)
 * @param {Function} [options.onExecute] - Callback after command execution
 * @param {Function} [options.onClose] - Callback when palette closes
 */
function init(options = {}) {
    _container = options.container || document.body;
    _onExecute = options.onExecute || null;
    _onClose = options.onClose || null;
    
    // Create DOM structure
    createDOMElements();
    
    // Attach event listeners
    attachEventListeners();
    
    // Register with CommandPalette core
    if (window.CommandPalette) {
        window.CommandPalette.setPaletteOpenCallback(open);
        window.CommandPalette.initKeyboardListener();
    }
}

/**
 * Create all DOM elements for the palette.
 */
function createDOMElements() {
    // Overlay
    _elements.overlay = document.createElement('div');
    _elements.overlay.className = 'command-palette-overlay';
    _elements.overlay.setAttribute('aria-hidden', 'true');
    
    // Modal container
    _elements.modal = document.createElement('div');
    _elements.modal.className = 'command-palette';
    _elements.modal.setAttribute('role', 'dialog');
    _elements.modal.setAttribute('aria-label', 'Command Palette');
    _elements.modal.setAttribute('aria-modal', 'true');
    
    // Search input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'command-palette-input-wrapper';
    
    // Search icon
    const searchIcon = document.createElement('span');
    searchIcon.className = 'command-palette-search-icon';
    searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
    </svg>`;
    
    // Search input
    _elements.input = document.createElement('input');
    _elements.input.type = 'text';
    _elements.input.className = 'command-palette-input';
    _elements.input.placeholder = 'Type a command or search...';
    _elements.input.setAttribute('autocomplete', 'off');
    _elements.input.setAttribute('autocorrect', 'off');
    _elements.input.setAttribute('autocapitalize', 'off');
    _elements.input.setAttribute('spellcheck', 'false');
    _elements.input.setAttribute('aria-label', 'Search commands');
    _elements.input.setAttribute('aria-controls', 'command-palette-results');
    _elements.input.setAttribute('aria-activedescendant', '');
    
    // Count badge
    _elements.countBadge = document.createElement('span');
    _elements.countBadge.className = 'command-palette-count';
    _elements.countBadge.textContent = '0 commands';
    
    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(_elements.input);
    inputWrapper.appendChild(_elements.countBadge);
    
    // Results container
    _elements.resultsList = document.createElement('div');
    _elements.resultsList.className = 'command-palette-results';
    _elements.resultsList.id = 'command-palette-results';
    _elements.resultsList.setAttribute('role', 'listbox');
    
    // Empty state
    _elements.emptyState = document.createElement('div');
    _elements.emptyState.className = 'command-palette-empty';
    _elements.emptyState.innerHTML = `
        <span class="command-palette-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
            </svg>
        </span>
        <span class="command-palette-empty-text">No commands found</span>
        <span class="command-palette-empty-hint">Try a different search term or press <kbd>Esc</kbd> to close</span>
    `;
    
    // Loading state
    _elements.loadingState = document.createElement('div');
    _elements.loadingState.className = 'command-palette-loading';
    _elements.loadingState.innerHTML = `
        <div class="command-palette-spinner"></div>
        <span class="command-palette-loading-text">Loading commands...</span>
    `;
    
    // Assemble modal
    _elements.modal.appendChild(inputWrapper);
    _elements.modal.appendChild(_elements.resultsList);
    
    // Add to overlay
    _elements.overlay.appendChild(_elements.modal);
    
    // Add to container (hidden)
    _container.appendChild(_elements.overlay);
}

/**
 * Attach all event listeners.
 */
function attachEventListeners() {
    // Click on overlay closes palette
    _elements.overlay.addEventListener('click', (e) => {
        if (e.target === _elements.overlay) {
            close();
        }
    });
    
    // Prevent modal clicks from closing
    _elements.modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Input events
    _elements.input.addEventListener('input', handleInput);
    _elements.input.addEventListener('keydown', handleKeyDown);
    
    // Results click
    _elements.resultsList.addEventListener('click', handleResultClick);
    
    // Results hover
    _elements.resultsList.addEventListener('mousemove', handleResultHover);
}

// ============================================================================
// OPEN / CLOSE
// ============================================================================

/**
 * Open the command palette.
 */
function open() {
    if (_isOpen) return;
    
    _isOpen = true;
    _searchQuery = '';
    _selectedIndex = 0;
    
    // Show overlay
    _elements.overlay.classList.add('is-open');
    _elements.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('command-palette-body-lock');
    
    // Clear and focus input
    _elements.input.value = '';
    _elements.input.focus();
    
    // Render initial state (recent commands)
    render();
    
    // Disable core shortcut while open
    if (window.CommandPalette) {
        window.CommandPalette.setGlobalShortcutEnabled(false);
    }
}

/**
 * Close the command palette.
 */
function close() {
    if (!_isOpen) return;
    
    _isOpen = false;
    
    // Hide overlay
    _elements.overlay.classList.remove('is-open');
    _elements.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('command-palette-body-lock');
    
    // Clear state
    _searchQuery = '';
    _selectedIndex = 0;
    _currentResults = [];
    
    // Re-enable core shortcut
    if (window.CommandPalette) {
        window.CommandPalette.setGlobalShortcutEnabled(true);
    }
    
    // Callback
    if (_onClose) {
        _onClose();
    }
}

/**
 * Toggle the command palette.
 */
function toggle() {
    if (_isOpen) {
        close();
    } else {
        open();
    }
}

/**
 * Check if palette is open.
 */
function isOpen() {
    return _isOpen;
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Handle input changes (search).
 */
function handleInput(e) {
    _searchQuery = e.target.value;
    _selectedIndex = 0;
    render();
}

/**
 * Handle keyboard navigation.
 */
function handleKeyDown(e) {
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            close();
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            selectNext();
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            selectPrevious();
            break;
            
        case 'Enter':
            e.preventDefault();
            executeSelected();
            break;
            
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
                selectPrevious();
            } else {
                selectNext();
            }
            break;
            
        case 'Home':
            if (e.ctrlKey) {
                e.preventDefault();
                _selectedIndex = 0;
                updateSelection();
            }
            break;
            
        case 'End':
            if (e.ctrlKey) {
                e.preventDefault();
                _selectedIndex = Math.max(0, _currentResults.length - 1);
                updateSelection();
            }
            break;
            
        case 'PageDown':
            e.preventDefault();
            _selectedIndex = Math.min(_currentResults.length - 1, _selectedIndex + 10);
            updateSelection();
            break;
            
        case 'PageUp':
            e.preventDefault();
            _selectedIndex = Math.max(0, _selectedIndex - 10);
            updateSelection();
            break;
    }
}

/**
 * Select next result.
 */
function selectNext() {
    if (_currentResults.length === 0) return;
    _selectedIndex = (_selectedIndex + 1) % _currentResults.length;
    updateSelection();
}

/**
 * Select previous result.
 */
function selectPrevious() {
    if (_currentResults.length === 0) return;
    _selectedIndex = (_selectedIndex - 1 + _currentResults.length) % _currentResults.length;
    updateSelection();
}

/**
 * Update visual selection without full re-render.
 */
function updateSelection() {
    const items = _elements.resultsList.querySelectorAll('.command-palette-item');
    items.forEach((item, idx) => {
        if (idx === _selectedIndex) {
            item.classList.add('is-selected');
            item.setAttribute('aria-selected', 'true');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            _elements.input.setAttribute('aria-activedescendant', item.id);
        } else {
            item.classList.remove('is-selected');
            item.setAttribute('aria-selected', 'false');
        }
    });
}

// ============================================================================
// RESULT INTERACTION
// ============================================================================

/**
 * Handle click on a result item.
 */
function handleResultClick(e) {
    const item = e.target.closest('.command-palette-item');
    if (!item) return;
    
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
        _selectedIndex = index;
        executeSelected();
    }
}

/**
 * Handle hover on result items.
 */
function handleResultHover(e) {
    const item = e.target.closest('.command-palette-item');
    if (!item) return;
    
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index) && index !== _selectedIndex) {
        _selectedIndex = index;
        updateSelection();
    }
}

/**
 * Execute the currently selected command.
 */
async function executeSelected() {
    if (_currentResults.length === 0 || _selectedIndex >= _currentResults.length) {
        return;
    }
    
    const command = _currentResults[_selectedIndex];
    if (!command) return;
    
    // Close palette first
    close();
    
    // Execute command
    try {
        if (window.CommandPalette) {
            const result = await window.CommandPalette.executeCommand(command.id);
            if (_onExecute) {
                _onExecute(command, result);
            }
        }
    } catch (error) {
        // Command execution failed - handle silently
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the results list.
 */
function render() {
    if (!window.CommandPalette) {
        renderError('Command palette not initialized');
        return;
    }
    
    const data = window.CommandPalette.getCommandsForDisplay(_searchQuery);
    
    if (data.isSearching) {
        // Search results mode
        renderSearchResults(data.results);
    } else {
        // Browse mode (recent + categories)
        renderBrowseMode(data);
    }
}

/**
 * Render search results.
 */
function renderSearchResults(results) {
    _currentResults = results.map(r => r.command);
    
    if (results.length === 0) {
        _elements.resultsList.innerHTML = '';
        _elements.resultsList.appendChild(_elements.emptyState);
        _elements.countBadge.textContent = 'No matches';
        return;
    }
    
    _elements.countBadge.textContent = `${results.length} match${results.length !== 1 ? 'es' : ''}`;
    
    const html = results.map((result, index) => 
        renderCommandItem(result.command, index, result.score)
    ).join('');
    
    _elements.resultsList.innerHTML = html;
    updateSelection();
}

/**
 * Render browse mode (recent + categories).
 */
function renderBrowseMode(data) {
    const sections = [];
    _currentResults = [];
    let globalIndex = 0;
    
    // Recent commands section
    if (data.recent && data.recent.length > 0) {
        const recentItems = data.recent.map(cmd => {
            _currentResults.push(cmd);
            return renderCommandItem(cmd, globalIndex++);
        }).join('');
        
        const recentIcon = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 5v3.5l2 1.5"/>
        </svg>`;
        
        sections.push(`
            <div class="command-palette-section is-recent">
                <div class="command-palette-section-header">
                    <span class="command-palette-section-icon">${recentIcon}</span>
                    Recent
                </div>
                ${recentItems}
            </div>
        `);
    }
    
    // Category sections
    for (const [category, commands] of Object.entries(data.categories)) {
        if (commands.length === 0) continue;
        
        const categoryItems = commands.map(cmd => {
            _currentResults.push(cmd);
            return renderCommandItem(cmd, globalIndex++);
        }).join('');
        
        sections.push(`
            <div class="command-palette-section" data-category="${escapeHtml(category)}">
                <div class="command-palette-section-header">
                    ${getCategoryIcon(category)}
                    <span>${escapeHtml(category)}</span>
                </div>
                ${categoryItems}
            </div>
        `);
    }
    
    _elements.countBadge.textContent = `${_currentResults.length} commands`;
    
    if (sections.length === 0) {
        _elements.resultsList.innerHTML = '';
        _elements.resultsList.appendChild(_elements.emptyState);
        return;
    }
    
    _elements.resultsList.innerHTML = sections.join('');
    updateSelection();
}

/**
 * Render a single command item.
 */
function renderCommandItem(command, index, score = null) {
    const isSelected = index === _selectedIndex;
    const shortcutHtml = command.shortcut 
        ? `<span class="command-palette-shortcut">${formatShortcut(command.shortcut)}</span>` 
        : '';
    
    const descHtml = command.description 
        ? `<span class="command-palette-item-description">${escapeHtml(command.description)}</span>` 
        : '';
    
    // Get icon for command (uses command-icons.js if available)
    const iconHtml = window.getIconForCommand 
        ? `<span class="command-palette-item-icon">${window.getIconForCommand(command.id, command.category)}</span>`
        : '';
    
    return `
        <div 
            class="command-palette-item ${isSelected ? 'is-selected' : ''}"
            id="command-palette-item-${index}"
            data-index="${index}"
            data-command-id="${command.id}"
            role="option"
            aria-selected="${isSelected}"
        >
            ${iconHtml}
            <div class="command-palette-item-content">
                <span class="command-palette-item-label">
                    ${highlightMatch(command.label, _searchQuery)}
                </span>
                ${descHtml}
            </div>
            <div class="command-palette-item-meta">
                <span class="command-palette-item-category">${escapeHtml(command.category)}</span>
                ${shortcutHtml}
            </div>
        </div>
    `;
}

/**
 * Render error state.
 */
function renderError(message) {
    _elements.resultsList.innerHTML = `
        <div class="command-palette-error">
            <span class="command-palette-error-icon">⚠️</span>
            <span class="command-palette-error-text">${escapeHtml(message)}</span>
        </div>
    `;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get icon for a category.
 */
function getCategoryIcon(category) {
    // Use SVG icons if available
    if (window.getCategoryIcon) {
        return `<span class="command-palette-section-icon">${window.getCategoryIcon(category)}</span>`;
    }
    
    // Fallback to emoji
    const icons = {
        'Templates': '📄',
        'Numbering': '🔢',
        'Insert': '➕',
        'Check': '✅',
        'Compare': '🔄',
        'Format': '🎨',
        'Versions': '📚',
        'Navigate': '🧭',
        'Settings': '⚙️',
        'Help': '❓',
        'General': '📌'
    };
    return `<span class="command-palette-section-icon">${icons[category] || '📌'}</span>`;
}

/**
 * Format keyboard shortcut for display.
 */
function formatShortcut(shortcut) {
    if (!shortcut) return '';
    
    // Detect Mac
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    return shortcut
        .replace(/Ctrl\+/g, isMac ? '⌘' : 'Ctrl+')
        .replace(/Alt\+/g, isMac ? '⌥' : 'Alt+')
        .replace(/Shift\+/g, isMac ? '⇧' : 'Shift+')
        .split('+')
        .map(key => `<kbd>${key}</kbd>`)
        .join('');
}

/**
 * Highlight matching text in a string.
 */
function highlightMatch(text, query) {
    if (!query || !query.trim()) {
        return escapeHtml(text);
    }
    
    const escaped = escapeHtml(text);
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    
    // Simple substring highlight
    const idx = t.indexOf(q);
    if (idx >= 0) {
        const before = escaped.substring(0, idx);
        const match = escaped.substring(idx, idx + q.length);
        const after = escaped.substring(idx + q.length);
        return `${before}<mark>${match}</mark>${after}`;
    }
    
    // Fuzzy highlight (highlight matching characters)
    let result = '';
    let qIdx = 0;
    
    for (let i = 0; i < text.length; i++) {
        const char = escapeHtml(text[i]);
        if (qIdx < q.length && text[i].toLowerCase() === q[qIdx]) {
            result += `<mark>${char}</mark>`;
            qIdx++;
        } else {
            result += char;
        }
    }
    
    return result;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Window global
if (typeof window !== 'undefined') {
    window.CommandPaletteUI = {
        init,
        open,
        close,
        toggle,
        isOpen,
        render
    };
}

// CommonJS exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        init,
        open,
        close,
        toggle,
        isOpen,
        render
    };
}
