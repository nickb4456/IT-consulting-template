/**
 * DocForge Party Checker - Index
 * 
 * Entry point for the Party Name Consistency Checker feature.
 * 
 * @example
 * // Initialize the party checker
 * DocForgePartyCheckerUI.init('party-checker-container');
 * 
 * // Or use the scanner directly
 * const results = await DocForgePartyChecker.scanDocument();
 * 
 * @version 1.0.0
 */

// The feature exposes two global objects:
// - DocForgePartyChecker: Core scanning and fixing logic
// - DocForgePartyCheckerUI: Task pane UI component

// For module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PartyChecker: typeof DocForgePartyChecker !== 'undefined' ? DocForgePartyChecker : require('./party-checker'),
        PartyCheckerUI: typeof DocForgePartyCheckerUI !== 'undefined' ? DocForgePartyCheckerUI : require('./party-checker-ui')
    };
}

/**
 * Quick start function - initializes the party checker panel
 * @param {string} containerId - DOM element ID for the panel
 * @returns {Promise<Object>} Initial scan results
 */
async function initPartyChecker(containerId = 'party-checker-panel') {
    // Initialize UI
    DocForgePartyCheckerUI.init(containerId);
    
    // Return the API for programmatic access
    return {
        scan: DocForgePartyChecker.scanDocument,
        getRegistry: DocForgePartyChecker.getRegistry,
        standardize: DocForgePartyChecker.standardizeParty,
        highlightIssues: DocForgePartyChecker.highlightIssues,
        clearHighlights: DocForgePartyChecker.clearHighlights,
        ui: DocForgePartyCheckerUI
    };
}

// Export quick start
if (typeof window !== 'undefined') {
    window.initPartyChecker = initPartyChecker;
}
