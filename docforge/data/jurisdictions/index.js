/**
 * Jurisdiction Format Profiles
 * 
 * Court-specific formatting rules for legal document validation.
 * Each profile contains comprehensive formatting requirements including:
 * - Font specifications
 * - Margin requirements
 * - Line spacing rules
 * - Caption format templates
 * - Signature block requirements
 * - E-filing specifications
 * - Brief/page limits
 */

import federal from './federal.json' with { type: 'json' };
import california from './california.json' with { type: 'json' };
import newYork from './new-york.json' with { type: 'json' };
import texas from './texas.json' with { type: 'json' };
import florida from './florida.json' with { type: 'json' };

// Export individual profiles
export { federal, california, newYork, texas, florida };

// Export as a map keyed by ID
export const jurisdictions = {
  federal,
  california,
  'new-york': newYork,
  texas,
  florida
};

// Export as array for iteration
export const jurisdictionList = [
  federal,
  california,
  newYork,
  texas,
  florida
];

/**
 * Get a jurisdiction profile by ID
 * @param {string} id - Jurisdiction ID (e.g., 'california', 'federal', 'new-york')
 * @returns {Object|null} Jurisdiction profile or null if not found
 */
export function getJurisdiction(id) {
  const normalizedId = id.toLowerCase().replace(/\s+/g, '-');
  return jurisdictions[normalizedId] || null;
}

/**
 * Get all jurisdiction IDs
 * @returns {string[]} Array of jurisdiction IDs
 */
export function getJurisdictionIds() {
  return Object.keys(jurisdictions);
}

/**
 * Check if a jurisdiction requires line numbering
 * @param {string} id - Jurisdiction ID
 * @returns {boolean}
 */
export function requiresLineNumbering(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.lineNumbering?.required || false;
}

/**
 * Check if a jurisdiction requires a footer
 * @param {string} id - Jurisdiction ID
 * @returns {boolean}
 */
export function requiresFooter(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.footer?.required || false;
}

/**
 * Get minimum font size for a jurisdiction
 * @param {string} id - Jurisdiction ID
 * @param {boolean} monospaced - Whether checking for monospaced fonts
 * @returns {number} Minimum font size in points
 */
export function getMinFontSize(id, monospaced = false) {
  const jurisdiction = getJurisdiction(id);
  if (!jurisdiction) return 12; // Safe default
  
  if (monospaced && jurisdiction.fonts.minSizeMonospaced) {
    return jurisdiction.fonts.minSizeMonospaced;
  }
  return jurisdiction.fonts.minSize;
}

/**
 * Get margin requirements for a jurisdiction
 * @param {string} id - Jurisdiction ID
 * @returns {Object} Margin requirements { top, bottom, left, right, unit }
 */
export function getMargins(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.margins || { top: 1, bottom: 1, left: 1, right: 1, unit: 'inches' };
}

/**
 * Get caption format type for a jurisdiction
 * @param {string} id - Jurisdiction ID
 * @returns {string} Caption format identifier
 */
export function getCaptionFormat(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.captionFormat || 'standard';
}

/**
 * Get e-filing system name for a jurisdiction
 * @param {string} id - Jurisdiction ID
 * @returns {string} E-filing system name
 */
export function getEFilingSystem(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.eFilingSystem || 'unknown';
}

/**
 * Get special requirements for a jurisdiction
 * @param {string} id - Jurisdiction ID
 * @returns {string[]} Array of special requirement identifiers
 */
export function getSpecialRequirements(id) {
  const jurisdiction = getJurisdiction(id);
  return jurisdiction?.specialRequirements || [];
}

/**
 * Validate a document against jurisdiction requirements
 * @param {Object} document - Document metadata to validate
 * @param {string} jurisdictionId - Target jurisdiction ID
 * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateAgainstJurisdiction(document, jurisdictionId) {
  const jurisdiction = getJurisdiction(jurisdictionId);
  const errors = [];
  const warnings = [];
  
  if (!jurisdiction) {
    errors.push(`Unknown jurisdiction: ${jurisdictionId}`);
    return { valid: false, errors, warnings };
  }
  
  // Check font size
  if (document.fontSize && document.fontSize < jurisdiction.fonts.minSize) {
    errors.push(`Font size ${document.fontSize}pt is below minimum ${jurisdiction.fonts.minSize}pt for ${jurisdiction.name}`);
  }
  
  // Check margins
  if (document.margins) {
    const reqMargins = jurisdiction.margins;
    if (document.margins.left < reqMargins.left) {
      errors.push(`Left margin ${document.margins.left}" is below minimum ${reqMargins.left}" for ${jurisdiction.name}`);
    }
    if (document.margins.right < reqMargins.right) {
      errors.push(`Right margin ${document.margins.right}" is below minimum ${reqMargins.right}" for ${jurisdiction.name}`);
    }
  }
  
  // Check line numbering (California)
  if (jurisdiction.lineNumbering?.required && !document.hasLineNumbers) {
    errors.push(`${jurisdiction.name} requires line-numbered pleading paper`);
  }
  
  // Check footer (California)
  if (jurisdiction.footer?.required && !document.hasFooter) {
    errors.push(`${jurisdiction.name} requires footer with document title on each page`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Default export
export default {
  jurisdictions,
  jurisdictionList,
  getJurisdiction,
  getJurisdictionIds,
  requiresLineNumbering,
  requiresFooter,
  getMinFontSize,
  getMargins,
  getCaptionFormat,
  getEFilingSystem,
  getSpecialRequirements,
  validateAgainstJurisdiction
};
