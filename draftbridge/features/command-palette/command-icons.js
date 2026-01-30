/**
 * DraftBridge Command Palette Icons
 * 
 * SVG icons for command palette items.
 * Optimized, consistent 20x20 viewBox.
 * 
 * @version 1.0.0
 */

const CommandIcons = {
    // === TEMPLATES ===
    templates: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2"/>
        <path d="M7 7h6M7 10h6M7 13h4"/>
    </svg>`,
    
    fillAll: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2"/>
        <path d="M7 10l2 2 4-4"/>
    </svg>`,
    
    scan: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7V4a1 1 0 011-1h3M17 7V4a1 1 0 00-1-1h-3M3 13v3a1 1 0 001 1h3M17 13v3a1 1 0 01-1 1h-3"/>
        <path d="M7 10h6"/>
    </svg>`,
    
    designer: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 3l3 3-9 9H5v-3l9-9z"/>
        <path d="M11 6l3 3"/>
    </svg>`,
    
    checkpoint: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 6v4l2.5 2.5"/>
    </svg>`,
    
    // === NUMBERING ===
    numbering: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 5h1.5M4 10h1.5M4 15h1.5"/>
        <path d="M8 5h8M8 10h8M8 15h8"/>
    </svg>`,
    
    fix: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-8.4 8.4a2 2 0 000 2.8l1.4 1.4a2 2 0 002.8 0l8.4-8.4z"/>
        <path d="M12 6l2 2"/>
    </svg>`,
    
    restart: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10a6 6 0 0110.3-4.2"/>
        <path d="M16 10a6 6 0 01-10.3 4.2"/>
        <path d="M14 4v2h2M6 16v-2H4"/>
    </svg>`,
    
    // === INSERT ===
    insert: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 7v6M7 10h6"/>
    </svg>`,
    
    header: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h12M4 8h8"/>
        <rect x="4" y="12" width="12" height="4" rx="1"/>
    </svg>`,
    
    letterhead: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2"/>
        <path d="M3 7h14"/>
        <circle cx="6" cy="5" r="1" fill="currentColor"/>
    </svg>`,
    
    clause: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="10" height="14" rx="1"/>
        <path d="M13 7h4v10a1 1 0 01-1 1h-3"/>
        <path d="M6 7h4M6 10h4M6 13h2"/>
    </svg>`,
    
    toc: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h12M4 8h10M4 12h8M4 16h6"/>
        <circle cx="16" cy="8" r="1" fill="currentColor"/>
        <circle cx="14" cy="12" r="1" fill="currentColor"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>`,
    
    pageBreak: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4v4M16 4v4M4 16v-4M16 16v-4"/>
        <path d="M4 10h2M8 10h4M14 10h2" stroke-dasharray="1 2"/>
    </svg>`,
    
    sectionBreak: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1"/>
        <rect x="11" y="11" width="6" height="6" rx="1"/>
        <path d="M9 10l2 2M10 9l2 2"/>
    </svg>`,
    
    // === CHECK ===
    check: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 10l3 3 5-6"/>
        <circle cx="10" cy="10" r="7"/>
    </svg>`,
    
    preflight: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 3l7 4v6l-7 4-7-4V7l7-4z"/>
        <path d="M7 10l2 2 4-4"/>
    </svg>`,
    
    crossRef: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 4H5a1 1 0 00-1 1v3"/>
        <path d="M12 16h3a1 1 0 001-1v-3"/>
        <path d="M16 8v-3a1 1 0 00-1-1h-3"/>
        <path d="M4 12v3a1 1 0 001 1h3"/>
        <circle cx="10" cy="10" r="3"/>
    </svg>`,
    
    placeholder: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="6" width="14" height="8" rx="2"/>
        <path d="M7 10h6"/>
    </svg>`,
    
    // === COMPARE ===
    compare: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="6" height="14" rx="1"/>
        <rect x="11" y="3" width="6" height="14" rx="1"/>
        <path d="M6 7h-1M6 10h-1M6 13h-1"/>
        <path d="M15 7h-1M15 10h-1M15 13h-1"/>
    </svg>`,
    
    diff: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4v12M14 4v12"/>
        <path d="M6 8h8" stroke="currentColor" opacity="0.5"/>
        <path d="M6 12h8"/>
    </svg>`,
    
    changes: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1v-9"/>
        <path d="M12 3v4h4"/>
        <path d="M8 10h4M8 13h2"/>
    </svg>`,
    
    // === FORMAT ===
    format: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6h12"/>
        <path d="M4 10h8"/>
        <path d="M4 14h10"/>
    </svg>`,
    
    removeSpaces: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10h5M11 10h5"/>
        <path d="M8 7l-2 3 2 3"/>
        <path d="M12 7l2 3-2 3"/>
    </svg>`,
    
    clearFormat: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4h8l-2 12H8L6 4z"/>
        <path d="M4 16l12-12" stroke="currentColor" opacity="0.5"/>
    </svg>`,
    
    caps: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 15l4-10 4 10M5.5 12h5"/>
        <path d="M13 15l2.5-6 2.5 6M14 13h3"/>
    </svg>`,
    
    // === VERSIONS ===
    versions: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="10" height="12" rx="1"/>
        <rect x="3" y="5" width="10" height="12" rx="1"/>
        <rect x="7" y="8" width="10" height="12" rx="1" fill="var(--cp-bg-modal, #1a1b26)"/>
        <rect x="7" y="8" width="10" height="12" rx="1"/>
    </svg>`,
    
    save: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 17H5a1 1 0 01-1-1V4a1 1 0 011-1h8l3 3v10a1 1 0 01-1 1z"/>
        <path d="M13 3v3h3"/>
        <path d="M7 13h6M7 16h4"/>
    </svg>`,
    
    restore: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10a6 6 0 1112 0 6 6 0 01-12 0"/>
        <path d="M4 4v4h4"/>
        <path d="M10 7v4l2 1"/>
    </svg>`,
    
    // === NAVIGATE ===
    navigate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 6v8M6 10h8"/>
    </svg>`,
    
    goToPage: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="3" width="12" height="14" rx="1"/>
        <path d="M8 10h4M10 8v4"/>
    </svg>`,
    
    goToHeading: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4v12M16 4v12"/>
        <path d="M4 10h12"/>
    </svg>`,
    
    // === SETTINGS ===
    settings: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="2"/>
        <path d="M10 3v2M10 15v2M17 10h-2M5 10H3"/>
        <path d="M14.9 5.1l-1.4 1.4M6.5 13.5l-1.4 1.4M14.9 14.9l-1.4-1.4M6.5 6.5L5.1 5.1"/>
    </svg>`,
    
    shortcuts: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="5" width="16" height="10" rx="2"/>
        <path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01"/>
        <path d="M5 11h.01M14 11h.01"/>
        <path d="M8 11h4"/>
    </svg>`,
    
    // === HELP ===
    help: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="7"/>
        <path d="M8 8a2 2 0 112 2v1"/>
        <circle cx="10" cy="14" r="0.5" fill="currentColor"/>
    </svg>`,
    
    docs: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
        <path d="M11 3v4h4"/>
        <path d="M7 10h6M7 13h4"/>
    </svg>`,
    
    about: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 13v-3M10 7h.01"/>
    </svg>`,
    
    report: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 15a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v10z"/>
        <path d="M10 8v4M10 14h.01"/>
    </svg>`,
    
    // === GENERAL / FALLBACK ===
    command: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 4l6 6-6 6"/>
    </svg>`,
    
    undo: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 8h9a4 4 0 110 8H9"/>
        <path d="M7 5L4 8l3 3"/>
    </svg>`,
    
    search: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="9" r="5"/>
        <path d="M16 16l-3.5-3.5"/>
    </svg>`,
    
    external: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4h5v5M16 4L8 12"/>
        <path d="M14 11v4a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h4"/>
    </svg>`
};

/**
 * Get icon for a command based on ID or category
 * @param {string} commandId - Command ID
 * @param {string} category - Command category
 * @returns {string} SVG HTML string
 */
function getIconForCommand(commandId, category) {
    // Direct command ID match
    const idMap = {
        'template.fillAll': 'fillAll',
        'template.scanFields': 'scan',
        'template.undo': 'undo',
        'template.openDesigner': 'designer',
        'template.createCheckpoint': 'checkpoint',
        'numbering.apply': 'numbering',
        'numbering.fix': 'fix',
        'numbering.restart': 'restart',
        'insert.header': 'header',
        'insert.letterhead': 'letterhead',
        'insert.clause': 'clause',
        'insert.toc': 'toc',
        'insert.pageBreak': 'pageBreak',
        'insert.sectionBreak': 'sectionBreak',
        'check.document': 'preflight',
        'check.crossRefs': 'crossRef',
        'check.placeholders': 'placeholder',
        'diff.compare': 'compare',
        'diff.showChanges': 'changes',
        'format.removeDoubleSpaces': 'removeSpaces',
        'format.clearFormatting': 'clearFormat',
        'format.allCaps': 'caps',
        'survivor.save': 'save',
        'survivor.list': 'versions',
        'nav.goToPage': 'goToPage',
        'nav.goToHeading': 'goToHeading',
        'settings.open': 'settings',
        'settings.shortcuts': 'shortcuts',
        'help.documentation': 'docs',
        'help.about': 'about',
        'help.reportIssue': 'report'
    };
    
    if (idMap[commandId]) {
        return CommandIcons[idMap[commandId]];
    }
    
    // Category fallback
    const categoryMap = {
        'Templates': 'templates',
        'Numbering': 'numbering',
        'Insert': 'insert',
        'Check': 'check',
        'Compare': 'compare',
        'Format': 'format',
        'Versions': 'versions',
        'Navigate': 'navigate',
        'Settings': 'settings',
        'Help': 'help'
    };
    
    if (categoryMap[category]) {
        return CommandIcons[categoryMap[category]];
    }
    
    // Default
    return CommandIcons.command;
}

/**
 * Get category section icon
 * @param {string} category - Category name
 * @returns {string} SVG HTML string
 */
function getCategoryIcon(category) {
    const map = {
        'Templates': CommandIcons.templates,
        'Numbering': CommandIcons.numbering,
        'Insert': CommandIcons.insert,
        'Check': CommandIcons.check,
        'Compare': CommandIcons.compare,
        'Format': CommandIcons.format,
        'Versions': CommandIcons.versions,
        'Navigate': CommandIcons.navigate,
        'Settings': CommandIcons.settings,
        'Help': CommandIcons.help,
        'General': CommandIcons.command
    };
    
    return map[category] || CommandIcons.command;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommandIcons, getIconForCommand, getCategoryIcon };
}

if (typeof window !== 'undefined') {
    window.CommandIcons = CommandIcons;
    window.getIconForCommand = getIconForCommand;
    window.getCategoryIcon = getCategoryIcon;
}
