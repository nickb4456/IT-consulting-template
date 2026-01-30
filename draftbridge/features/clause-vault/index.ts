/**
 * Clause Library Feature - Index
 * 
 * Your personal clause library. Save, search, and reuse your best legal text.
 */

export * from './ClauseVault';
export { default as ClauseVaultTaskPane } from './ClauseVaultTaskPane';

// Quick-access commands for ribbon integration
export const ClauseVaultCommands = {
  /**
   * Show the Clause Library task pane
   */
  showTaskPane: async () => {
    // This would be wired up in the manifest
    Office.addin.showAsTaskpane();
  },

  /**
   * Quick save - save selection with minimal dialog
   */
  quickSave: async () => {
    const { clauseVault } = await import('./ClauseVault');
    await clauseVault.initialize();
    
    // Open save dialog (handled by task pane)
    Office.addin.showAsTaskpane();
    // Task pane will handle the save flow
  },

  /**
   * Quick insert - show search/insert UI
   */
  quickInsert: async () => {
    Office.addin.showAsTaskpane();
  },
};
