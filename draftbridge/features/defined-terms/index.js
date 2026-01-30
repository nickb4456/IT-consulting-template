/**
 * Defined Terms Guardian - Module Index
 * 
 * Exports all components for the defined terms feature.
 * 
 * @version 1.0.0
 */

export { DefinedTermsScanner, definedTermsScanner } from './defined-terms.js';
export { DefinedTermsUI, initializeUI, performScan } from './defined-terms-ui.js';

// Re-export default as the main scanner
export { default } from './defined-terms.js';
