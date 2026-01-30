/**
 * DraftBridge Party Checker - Index
 * 
 * Entry point for the Party Name Consistency Checker feature.
 * 
 * @example
 * // Initialize the party checker
 * DraftBridgePartyCheckerUI.init('party-checker-container');
 * 
 * // Or use the scanner directly
 * const results = await DraftBridgePartyChecker.scanDocument();
 * 
 * @version 1.0.0
 */

// The feature exposes two global objects:
// - DraftBridgePartyChecker: Core scanning and fixing logic
// - DraftBridgePartyCheckerUI: Task pane UI component

// For module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PartyChecker: typeof DraftBridgePartyChecker !== 'undefined' ? DraftBridgePartyChecker : require('./party-checker'),
        PartyCheckerUI: typeof DraftBridgePartyCheckerUI !== 'undefined' ? DraftBridgePartyCheckerUI : require('./party-checker-ui')
    };
}

/**
 * Quick start function - initializes the party checker panel
 * @param {string} containerId - DOM element ID for the panel
 * @returns {Promise<Object>} Initial scan results
 */
async function initPartyChecker(containerId = 'party-checker-panel') {
    // Initialize UI
    DraftBridgePartyCheckerUI.init(containerId);
    
    // Return the API for programmatic access
    return {
        scan: DraftBridgePartyChecker.scanDocument,
        getRegistry: DraftBridgePartyChecker.getRegistry,
        standardize: DraftBridgePartyChecker.standardizeParty,
        highlightIssues: DraftBridgePartyChecker.highlightIssues,
        clearHighlights: DraftBridgePartyChecker.clearHighlights,
        ui: DraftBridgePartyCheckerUI
    };
}

// Export quick start
if (typeof window !== 'undefined') {
    window.initPartyChecker = initPartyChecker;
}
