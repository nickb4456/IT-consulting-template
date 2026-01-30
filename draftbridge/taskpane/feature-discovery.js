/**
 * Feature Discovery Panel
 * 
 * "What can this thing do?" — answered in 3 seconds
 * Surfaces ALL 16+ features in a scannable, organized panel
 * 
 * @version 1.0.0
 */

const FeatureDiscovery = (() => {
    // ============================================================================
    // Feature Definitions - The Complete DraftBridge Feature Set
    // ============================================================================
    
    const FEATURES = {
        checks: {
            title: 'Document Checks',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
            features: [
                {
                    id: 'preflight',
                    name: 'Quality Check',
                    description: 'Document check catches issues before submission',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
                    shortcut: null,
                    action: 'runPreflight'
                },
                {
                    id: 'typo-shield',
                    name: 'Typo Shield',
                    description: 'Catch embarrassing spelling and grammar mistakes',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
                    shortcut: null,
                    action: 'runTypoShield',
                    isNew: true
                },
                {
                    id: 'party-checker',
                    name: 'Party Checker',
                    description: 'Verify party names are consistent throughout',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
                    shortcut: null,
                    action: 'runPartyChecker'
                },
                {
                    id: 'health-dashboard',
                    name: 'Health Dashboard',
                    description: 'Document fitness score and improvement suggestions',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
                    shortcut: null,
                    action: 'showHealthDashboard'
                }
            ]
        },
        
        formatting: {
            title: 'Formatting',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
            features: [
                {
                    id: 'numbering-fix',
                    name: 'Numbering Fix',
                    description: 'Repair and standardize document numbering styles',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
                    shortcut: null,
                    action: 'showNumberingModal'
                },
                {
                    id: 'letterhead',
                    name: 'Insert Letterhead',
                    description: 'Add professional letterhead to document header',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
                    shortcut: null,
                    action: 'insertLetterhead'
                },
                {
                    id: 'toc',
                    name: 'Table of Contents',
                    description: 'Generate or update document table of contents',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
                    shortcut: null,
                    action: 'generateTOC'
                }
            ]
        },
        
        templates: {
            title: 'Templates',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
            features: [
                {
                    id: 'fill-all',
                    name: 'Fill All Fields',
                    description: 'Fill all template fields with entered values at once',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2z"/><path d="M12 22V12"/><path d="M12 12L3 7.5"/><path d="M21 7.5L12 12"/></svg>`,
                    shortcut: ['Ctrl', 'Shift', 'F'],
                    action: 'fillAllFields'
                },
                {
                    id: 'clause-library',
                    name: 'Clause Library',
                    description: 'Insert boilerplate clauses from your library',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
                    shortcut: null,
                    action: 'openClauseLibrary',
                    isNew: true
                },
                {
                    id: 'save-dataset',
                    name: 'Save Answers',
                    description: 'Save current field values for reuse in similar documents',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
                    shortcut: ['Ctrl', 'S'],
                    action: 'saveDataset'
                },
                {
                    id: 'load-dataset',
                    name: 'Load Answers',
                    description: 'Load previously saved answers to pre-fill fields',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="12 10 12 16"/><polyline points="9 13 12 10 15 13"/></svg>`,
                    shortcut: ['Ctrl', 'O'],
                    action: 'loadDataset'
                }
            ]
        },
        
        versions: {
            title: 'Versions',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            features: [
                {
                    id: 'version-history',
                    name: 'Version History',
                    description: 'Save restore points and travel back in time',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
                    shortcut: null,
                    action: 'showVersionHistory'
                },
                {
                    id: 'diff-preview',
                    name: 'Compare Changes',
                    description: 'See what changed since you started editing',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>`,
                    shortcut: ['Ctrl', 'D'],
                    action: 'showDiffPreview'
                },
                {
                    id: 'undo',
                    name: 'Multi-Level Undo',
                    description: 'Undo multiple fill operations, not just the last one',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.39 2.64L3 13"/></svg>`,
                    shortcut: ['Ctrl', 'Z'],
                    action: 'undo'
                }
            ]
        },
        
        navigation: {
            title: 'Navigation',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
            features: [
                {
                    id: 'command-palette',
                    name: 'Command Palette',
                    description: 'Search and run any command instantly',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
                    shortcut: ['Ctrl', 'Shift', 'P'],
                    action: 'openCommandPalette'
                },
                {
                    id: 'cross-references',
                    name: 'Cross-References',
                    description: 'Link and manage section cross-references',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
                    shortcut: null,
                    action: 'manageCrossReferences'
                },
                {
                    id: 'defined-terms',
                    name: 'Defined Terms',
                    description: 'Track and navigate to term definitions',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
                    shortcut: null,
                    action: 'showDefinedTerms',
                    isNew: true
                },
                {
                    id: 'exhibit-sync',
                    name: 'Exhibit Sync',
                    description: 'Keep exhibit references updated automatically',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
                    shortcut: null,
                    action: 'syncExhibits'
                }
            ]
        }
    };
    
    // ============================================================================
    // State
    // ============================================================================
    
    let isOpen = false;
    let panelEl = null;
    let overlayEl = null;
    
    // ============================================================================
    // Create Panel HTML
    // ============================================================================
    
    function createPanel() {
        // Overlay
        overlayEl = document.createElement('div');
        overlayEl.className = 'feature-panel-overlay';
        overlayEl.addEventListener('click', close);
        
        // Panel
        panelEl = document.createElement('div');
        panelEl.className = 'feature-panel';
        panelEl.setAttribute('role', 'dialog');
        panelEl.setAttribute('aria-modal', 'true');
        panelEl.setAttribute('aria-labelledby', 'feature-panel-title');
        
        // Count total features
        const totalFeatures = Object.values(FEATURES).reduce(
            (sum, cat) => sum + cat.features.length, 0
        );
        
        panelEl.innerHTML = `
            <header class="feature-panel-header">
                <div>
                    <h2 id="feature-panel-title" class="feature-panel-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                            <polyline points="2 17 12 22 22 17"/>
                            <polyline points="2 12 12 17 22 12"/>
                        </svg>
                        All Tools
                    </h2>
                    <p class="feature-panel-subtitle">${totalFeatures} features to power your documents</p>
                </div>
                <button class="feature-panel-close" id="featurePanelClose" aria-label="Close panel">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </header>
            
            <div class="feature-search">
                <div class="feature-search-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input 
                        type="text" 
                        class="feature-search-input" 
                        id="featureSearchInput"
                        placeholder="Search tools..."
                        autocomplete="off"
                    />
                </div>
            </div>
            
            <div class="feature-panel-body" id="featurePanelBody">
                ${renderCategories()}
            </div>
            
            <footer class="feature-panel-footer">
                <div class="keyboard-hint">
                    <span>Pro tip:</span>
                    <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
                    <span>for quick commands</span>
                </div>
            </footer>
        `;
        
        document.body.appendChild(overlayEl);
        document.body.appendChild(panelEl);
        
        // Bind events
        panelEl.querySelector('#featurePanelClose').addEventListener('click', close);
        panelEl.querySelector('#featureSearchInput').addEventListener('input', handleSearch);
        
        // Feature card clicks
        panelEl.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                if (action) {
                    executeAction(action);
                    close();
                }
            });
        });
        
        // Escape key closes
        document.addEventListener('keydown', handleKeyDown);
    }
    
    function renderCategories() {
        return Object.entries(FEATURES).map(([key, category]) => `
            <section class="feature-category" data-category="${key}">
                <header class="feature-category-header">
                    <span class="feature-category-icon">${category.icon}</span>
                    <span class="feature-category-title">${category.title}</span>
                    <span class="feature-category-count">(${category.features.length})</span>
                </header>
                <div class="feature-list">
                    ${category.features.map(f => renderFeatureCard(f)).join('')}
                </div>
            </section>
        `).join('');
    }
    
    function renderFeatureCard(feature) {
        const shortcutHtml = feature.shortcut 
            ? `<div class="feature-shortcut">${feature.shortcut.map(k => `<kbd>${k}</kbd>`).join('')}</div>`
            : '';
        
        const newBadge = feature.isNew ? '<span class="new-badge">New</span>' : '';
        
        return `
            <button class="feature-card" data-action="${feature.action}" data-id="${feature.id}">
                <span class="feature-icon">${feature.icon}</span>
                <span class="feature-content">
                    <span class="feature-name">${feature.name}${newBadge}</span>
                    <span class="feature-description">${feature.description}</span>
                    ${shortcutHtml}
                </span>
                <svg class="feature-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
    }
    
    // ============================================================================
    // Search
    // ============================================================================
    
    function handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        const cards = panelEl.querySelectorAll('.feature-card');
        const categories = panelEl.querySelectorAll('.feature-category');
        
        if (!query) {
            // Show all
            cards.forEach(card => card.classList.remove('hidden'));
            categories.forEach(cat => cat.style.display = '');
            return;
        }
        
        // Filter cards
        cards.forEach(card => {
            const name = card.querySelector('.feature-name').textContent.toLowerCase();
            const desc = card.querySelector('.feature-description').textContent.toLowerCase();
            const matches = name.includes(query) || desc.includes(query);
            card.classList.toggle('hidden', !matches);
        });
        
        // Hide empty categories
        categories.forEach(cat => {
            const visibleCards = cat.querySelectorAll('.feature-card:not(.hidden)');
            cat.style.display = visibleCards.length === 0 ? 'none' : '';
        });
    }
    
    // ============================================================================
    // Actions
    // ============================================================================
    
    function executeAction(actionName) {
        // Map action names to actual functions
        const actionMap = {
            'runPreflight': () => window.DraftBridge?.runPreflight?.() || document.getElementById('preflightBtn')?.click(),
            'runTypoShield': () => window.DraftBridge?.runTypoShield?.(),
            'runPartyChecker': () => window.DraftBridge?.runPartyChecker?.(),
            'showHealthDashboard': () => window.DraftBridge?.showHealthDashboard?.(),
            'showNumberingModal': () => document.getElementById('numberingModal')?.classList.remove('hidden'),
            'insertLetterhead': () => document.getElementById('menuLetterhead')?.click(),
            'generateTOC': () => document.getElementById('menuTOC')?.click(),
            'fillAllFields': () => document.getElementById('fillAllBtn')?.click(),
            'openClauseLibrary': () => window.DraftBridge?.openClauseLibrary?.(),
            'saveDataset': () => document.getElementById('menuSaveDataset')?.click(),
            'loadDataset': () => document.getElementById('menuLoadDataset')?.click(),
            'showVersionHistory': () => window.DraftBridge?.showVersionHistory?.(),
            'showDiffPreview': () => document.getElementById('previewDiffBtn')?.click(),
            'undo': () => document.getElementById('undoBtn')?.click(),
            'openCommandPalette': () => window.DraftBridge?.openCommandPalette?.() || dispatchKey('P', true, true),
            'manageCrossReferences': () => document.getElementById('menuCrossRef')?.click(),
            'showDefinedTerms': () => window.DraftBridge?.showDefinedTerms?.(),
            'syncExhibits': () => window.DraftBridge?.syncExhibits?.()
        };
        
        const action = actionMap[actionName];
        if (action) {
            try {
                action();
            } catch (err) {
                console.warn(`Feature action failed: ${actionName}`, err);
                showToast(`${actionName} not available yet`, 'info');
            }
        } else {
            console.warn(`Unknown action: ${actionName}`);
            showToast('Coming soon!', 'info');
        }
    }
    
    function dispatchKey(key, ctrl = false, shift = false) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: key,
            ctrlKey: ctrl,
            shiftKey: shift,
            bubbles: true
        }));
    }
    
    function showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
        
        // Fallback simple toast
        const container = document.getElementById('toastContainer') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ============================================================================
    // Open / Close
    // ============================================================================
    
    function open() {
        if (!panelEl) createPanel();
        
        isOpen = true;
        overlayEl.classList.add('visible');
        panelEl.classList.add('visible');
        
        // Focus search input
        setTimeout(() => {
            panelEl.querySelector('#featureSearchInput')?.focus();
        }, 100);
        
        // Trap focus
        panelEl.setAttribute('aria-hidden', 'false');
    }
    
    function close() {
        if (!isOpen) return;
        
        isOpen = false;
        overlayEl?.classList.remove('visible');
        panelEl?.classList.remove('visible');
        panelEl?.setAttribute('aria-hidden', 'true');
        
        // Clear search
        const searchInput = panelEl?.querySelector('#featureSearchInput');
        if (searchInput) {
            searchInput.value = '';
            handleSearch({ target: searchInput });
        }
    }
    
    function toggle() {
        isOpen ? close() : open();
    }
    
    function handleKeyDown(e) {
        if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close();
        }
    }
    
    // ============================================================================
    // Add Tools Button to Header
    // ============================================================================
    
    function addToolsButton() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions || document.getElementById('toolsBtn')) return;
        
        // Count total features
        const totalFeatures = Object.values(FEATURES).reduce(
            (sum, cat) => sum + cat.features.length, 0
        );
        
        const toolsBtn = document.createElement('button');
        toolsBtn.id = 'toolsBtn';
        toolsBtn.className = 'btn-tools';
        toolsBtn.type = 'button';
        toolsBtn.setAttribute('aria-label', 'Open tools panel');
        toolsBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
            </svg>
            Tools
            <span class="tools-badge">${totalFeatures}</span>
        `;
        
        toolsBtn.addEventListener('click', toggle);
        
        // Insert before the More button
        const moreBtn = document.getElementById('moreBtn');
        if (moreBtn) {
            headerActions.insertBefore(toolsBtn, moreBtn);
        } else {
            headerActions.appendChild(toolsBtn);
        }
    }
    
    // ============================================================================
    // Initialize
    // ============================================================================
    
    function init() {
        // Add tools button when DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addToolsButton);
        } else {
            addToolsButton();
        }
        
        // Expose for keyboard shortcut registration
        window.FeatureDiscovery = {
            open,
            close,
            toggle,
            isOpen: () => isOpen
        };
    }
    
    // Auto-init
    init();
    
    return {
        open,
        close,
        toggle,
        isOpen: () => isOpen
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.FeatureDiscovery = FeatureDiscovery;
}
