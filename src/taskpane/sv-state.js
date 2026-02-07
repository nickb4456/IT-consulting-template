/**
 * DraftBridge Gold - Smart Variables: State Management
 *
 * Defines the SmartVariables namespace and core state properties.
 * All other sv-*.js modules extend this object via Object.assign().
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// TODO: localStorage data (profile, contacts, templates) is stored unencrypted.
// Future: encrypt sensitive fields (barNumber, email, phone, address) using
// Web Crypto API (AES-256-GCM) with a key derived from user authentication.
// See: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt

// ============================================================================
// STORAGE KEY CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  PROFILE: 'draftbridge_user_profile',
  RECENT_CONTACTS: 'draftbridge_recent_contacts',
  CUSTOM_TEMPLATES: 'draftbridge_custom_templates'
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const SmartVariables = {
  // Current state
  state: {
    template: null,
    values: {},
    derivedValues: {},
    errors: {},
    expandedGroups: new Set(['case', 'parties', 'motion', 'substance', 'responses', 'discovery']),
    contactPickerOpen: false,
    contactPickerTarget: null
  },

  // User profile (loaded from localStorage)
  userProfile: null,

  // Templates cache
  templates: {},

  // Courts database
  courts: [],
  courtsByState: {},
  courtsById: {},

  // Recently used contacts (for quick access)
  recentContacts: [],

  // Pending import data
  _pendingImport: null,

  // Shared US state abbreviation-to-name map (used by sv-form-renderer.js and others)
  STATE_NAMES: {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
    'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
    'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
    'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
    'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota',
    'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia',
    'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam', 'MP': 'Northern Mariana Islands'
  },

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Clean up all timers, listeners, and state. Call before re-init or unmount.
   */
  destroy() {
    // Clear timers from sv-form-renderer.js
    if (this._contactSearchTimer) {
      clearTimeout(this._contactSearchTimer);
      this._contactSearchTimer = null;
    }
    // Clear timers from sv-validation.js
    if (this._validateTimer) {
      clearTimeout(this._validateTimer);
      this._validateTimer = null;
    }
    // Clean up keyboard event listeners from sv-profile.js and sv-form-renderer.js
    if (this._profileEscapeHandler) {
      document.removeEventListener('keydown', this._profileEscapeHandler);
      this._profileEscapeHandler = null;
    }
    if (this._pickerEscapeHandler) {
      document.removeEventListener('keydown', this._pickerEscapeHandler);
      this._pickerEscapeHandler = null;
    }
    if (this._managerEscapeHandler) {
      document.removeEventListener('keydown', this._managerEscapeHandler);
      this._managerEscapeHandler = null;
    }
    // Reset state
    this.state = {
      template: null,
      values: {},
      derivedValues: {},
      errors: {},
      expandedGroups: new Set(),
      contactPickerOpen: false,
      contactPickerTarget: null
    };
    this.userProfile = null;
    this.templates = {};
    this.courts = [];
    this.courtsByState = {};
    this.courtsById = {};
    this.recentContacts = [];
    this._pendingImport = null;
    console.log('[SmartVariables] Destroyed and cleaned up');
  },

  /** Initialize SmartVariables: load profile, courts, contacts, and templates. */
  init() {
    this.loadUserProfile();
    this.loadCourtsDatabase();
    this.loadRecentContacts();
    this.loadTemplates();
    console.log('[SmartVariables] Initialized');
  },

  /** Load user profile from localStorage with shape validation. */
  loadUserProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (this.validateProfileShape(parsed)) {
          this.userProfile = parsed;
        } else {
          console.warn('[SmartVariables] Profile failed shape validation, using defaults');
          this.userProfile = null;
        }
      }
    } catch (e) {
      console.error('[SmartVariables] Failed to load profile:', e);
    }
  },

  /**
   * Validate that a parsed profile object has the expected shape.
   * Prevents corrupted or tampered localStorage from causing runtime errors.
   */
  validateProfileShape(obj) {
    if (!obj || typeof obj !== 'object') return false;
    // Required string fields (may be empty)
    const stringFields = ['firstName', 'lastName'];
    for (const field of stringFields) {
      if (field in obj && typeof obj[field] !== 'string') return false;
    }
    // Optional string fields
    const optionalStrings = ['barNumber', 'barState', 'email', 'phone', 'firmName', 'firmStreet', 'firmCity', 'firmState', 'firmZip', 'signatureStyle'];
    for (const field of optionalStrings) {
      if (field in obj && obj[field] !== null && obj[field] !== undefined && typeof obj[field] !== 'string') return false;
    }
    // Contacts array
    if ('contacts' in obj && !Array.isArray(obj.contacts)) return false;
    return true;
  },

  /** Persist user profile to localStorage. */
  saveUserProfile() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.userProfile));
    } catch (e) {
      console.error('[SmartVariables] Failed to save profile:', e);
    }
  },

  /**
   * Validate that a string is a safe identifier for use in HTML attribute contexts.
   * Rejects anything that could break out of JS string literals in onclick handlers.
   */
  safeId(id) {
    if (typeof id !== 'string') return '';
    if (!/^[a-zA-Z0-9_\-:.]+$/.test(id)) {
      console.warn('[SmartVariables] Rejected unsafe ID:', id);
      return '';
    }
    return id;
  },

  /**
   * Escape HTML for safe display. Prevents XSS when inserting user content into innerHTML.
   * @param {string} str - the string to escape
   * @returns {string} HTML-safe string
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Escape a value for use inside a JS string literal within an HTML attribute.
   * Handles both HTML entity encoding and JS string escaping.
   */
  escapeAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e')
      .replace(/&/g, '\\x26');
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SmartVariables.init());
} else {
  SmartVariables.init();
}
