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
  CUSTOM_TEMPLATES: 'draftbridge_custom_templates',
  ONBOARDING_COMPLETE: 'draftbridge_onboarding_complete'
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
  // KEEP IN SYNC with src/services/contactHandler.ts STATE_NAMES (55 entries: 50 states + DC + 5 territories)
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
    'AS': 'American Samoa',
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
    if (this._templateSearchTimer) {
      clearTimeout(this._templateSearchTimer);
      this._templateSearchTimer = null;
    }
    // Clear timers from sv-validation.js
    if (this._validateTimer) {
      clearTimeout(this._validateTimer);
      this._validateTimer = null;
    }
    if (this._renderFormTimer) {
      clearTimeout(this._renderFormTimer);
      this._renderFormTimer = null;
    }
    if (this._autosaveTimer) {
      clearTimeout(this._autosaveTimer);
      this._autosaveTimer = null;
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
    // Clean up global keyboard shortcuts listener
    if (this._keyboardShortcutHandler) {
      document.removeEventListener('keydown', this._keyboardShortcutHandler);
      this._keyboardShortcutHandler = null;
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
  async init() {
    this.loadUserProfile();
    this.loadRecentContacts();
    await Promise.all([
      this.loadCourtsDatabase(),
      this.loadTemplates()
    ]);
    this._initKeyboardShortcuts();
    this._checkOnboarding();
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
    if (!/^[a-zA-Z0-9_\-:.\/]+$/.test(id)) {
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
   * Dismiss a toast notification and remove it from the stack.
   * @param {HTMLElement} toastEl - the toast DOM element to dismiss
   */
  _dismissToast(toastEl) {
    if (!toastEl || !toastEl.parentElement) return;
    toastEl.classList.remove('show');
    setTimeout(() => {
      toastEl.remove();
      // Remove from global stack if present
      if (typeof _toastStack !== 'undefined') {
        const idx = _toastStack.indexOf(toastEl);
        if (idx > -1) _toastStack.splice(idx, 1);
        // Reposition remaining toasts
        _toastStack.forEach((t, i) => {
          t.style.bottom = `${20 + i * 56}px`;
        });
      }
    }, 300);
  }
};

// ============================================================================
// ONBOARDING FLOW
// ============================================================================

Object.assign(SmartVariables, {

  /**
   * Check if onboarding should be shown (first-run detection).
   * Shows the onboarding modal if the user hasn't completed it.
   */
  _checkOnboarding() {
    try {
      if (localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE)) return;
    } catch (e) { return; }
    // Delay slightly so the UI is fully rendered
    setTimeout(() => this.showOnboarding(), 500);
  },

  /**
   * Show the 3-feature onboarding modal for first-time users.
   */
  showOnboarding() {
    let overlay = document.getElementById('db-onboarding-overlay');
    if (overlay) return; // already showing

    overlay = document.createElement('div');
    overlay.id = 'db-onboarding-overlay';
    overlay.className = 'sv-modal-overlay';

    overlay.innerHTML = `
      <div class="sv-modal db-onboarding-modal">
        <div class="sv-modal-header">
          <h3>Welcome to DraftBridge</h3>
          <button class="sv-modal-close" onclick="SmartVariables.completeOnboarding()">×</button>
        </div>
        <div class="sv-modal-body">
          <div class="db-onboarding-features">
            <div class="db-onboarding-feature">
              <div class="db-onboarding-feature-icon">📋</div>
              <div class="db-onboarding-feature-text">
                <strong>Smart Templates</strong>
                <span>Choose from pre-built legal templates with intelligent auto-fill from your profile.</span>
              </div>
            </div>
            <div class="db-onboarding-feature">
              <div class="db-onboarding-feature-icon">👤</div>
              <div class="db-onboarding-feature-text">
                <strong>Attorney Profile</strong>
                <span>Save your bar number, firm details, and signature block once — auto-fill everywhere.</span>
              </div>
            </div>
            <div class="db-onboarding-feature">
              <div class="db-onboarding-feature-icon">📂</div>
              <div class="db-onboarding-feature-text">
                <strong>Contact Manager</strong>
                <span>Store opposing counsel, clients, and parties for quick selection across documents.</span>
              </div>
            </div>
          </div>
        </div>
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.completeOnboarding()">Get Started</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  /**
   * Mark onboarding as complete and close the modal.
   */
  completeOnboarding() {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (e) { /* ignore */ }
    const overlay = document.getElementById('db-onboarding-overlay');
    if (overlay) overlay.remove();
  }
});

// ============================================================================
// CUSTOM CONFIRMATION DIALOG
// ============================================================================

Object.assign(SmartVariables, {

  /**
   * Promise-based replacement for window.confirm().
   * Renders a styled modal with Confirm/Cancel buttons.
   * @param {string} message - the confirmation message
   * @param {Object} [options] - optional overrides
   * @param {string} [options.confirmText='Confirm'] - confirm button label
   * @param {string} [options.cancelText='Cancel'] - cancel button label
   * @param {boolean} [options.destructive=false] - if true, style confirm as danger
   * @returns {Promise<boolean>} resolves true if confirmed, false if cancelled
   */
  showConfirm(message, options = {}) {
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';
    const destructive = options.destructive || false;

    return new Promise((resolve) => {
      let overlay = document.getElementById('db-confirm-overlay');
      if (overlay) overlay.remove();

      overlay = document.createElement('div');
      overlay.id = 'db-confirm-overlay';
      overlay.className = 'sv-modal-overlay';

      const btnClass = destructive ? 'sv-btn db-confirm-btn-danger' : 'sv-btn sv-btn-primary';

      overlay.innerHTML = `
        <div class="sv-modal db-confirm-modal">
          <div class="sv-modal-body">
            <p class="db-confirm-message">${this.escapeHtml(message)}</p>
          </div>
          <div class="sv-modal-footer">
            <button class="sv-btn sv-btn-secondary" id="db-confirm-cancel">${this.escapeHtml(cancelText)}</button>
            <button class="${btnClass}" id="db-confirm-ok">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const cleanup = (result) => {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
        resolve(result);
      };

      overlay.querySelector('#db-confirm-ok').addEventListener('click', () => cleanup(true));
      overlay.querySelector('#db-confirm-cancel').addEventListener('click', () => cleanup(false));

      const escHandler = (e) => {
        if (e.key === 'Escape') cleanup(false);
      };
      document.addEventListener('keydown', escHandler);

      // Focus confirm button
      setTimeout(() => overlay.querySelector('#db-confirm-ok')?.focus(), 50);
    });
  },

  /**
   * Promise-based replacement for window.prompt().
   * Renders a styled modal with a text input and OK/Cancel buttons.
   * @param {string} message - the prompt message
   * @param {Object} [options] - optional overrides
   * @param {string} [options.defaultValue=''] - pre-filled input value
   * @param {string} [options.placeholder=''] - input placeholder text
   * @param {string} [options.confirmText='OK'] - confirm button label
   * @param {string} [options.cancelText='Cancel'] - cancel button label
   * @returns {Promise<string|null>} resolves with input value, or null if cancelled
   */
  showPrompt(message, options = {}) {
    const defaultValue = options.defaultValue || '';
    const placeholder = options.placeholder || '';
    const confirmText = options.confirmText || 'OK';
    const cancelText = options.cancelText || 'Cancel';

    return new Promise((resolve) => {
      let overlay = document.getElementById('db-prompt-overlay');
      if (overlay) overlay.remove();

      overlay = document.createElement('div');
      overlay.id = 'db-prompt-overlay';
      overlay.className = 'sv-modal-overlay';

      overlay.innerHTML = `
        <div class="sv-modal db-confirm-modal">
          <div class="sv-modal-body">
            <p class="db-confirm-message">${this.escapeHtml(message)}</p>
            <input type="text" id="db-prompt-input" class="sv-input"
                   value="${this.escapeHtml(defaultValue)}"
                   placeholder="${this.escapeHtml(placeholder)}"
                   style="width:100%;margin-top:12px;padding:8px 12px;border:1px solid var(--db-border);border-radius:var(--db-radius-sm);font-size:14px;">
          </div>
          <div class="sv-modal-footer">
            <button class="sv-btn sv-btn-secondary" id="db-prompt-cancel">${this.escapeHtml(cancelText)}</button>
            <button class="sv-btn sv-btn-primary" id="db-prompt-ok">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#db-prompt-input');

      const cleanup = (result) => {
        overlay.remove();
        document.removeEventListener('keydown', keyHandler);
        resolve(result);
      };

      overlay.querySelector('#db-prompt-ok').addEventListener('click', () => cleanup(input.value));
      overlay.querySelector('#db-prompt-cancel').addEventListener('click', () => cleanup(null));

      const keyHandler = (e) => {
        if (e.key === 'Escape') cleanup(null);
        if (e.key === 'Enter') cleanup(input.value);
      };
      document.addEventListener('keydown', keyHandler);

      // Focus and select input
      setTimeout(() => { input?.focus(); input?.select(); }, 50);
    });
  }
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

Object.assign(SmartVariables, {

  /** Whether the keyboard shortcuts overlay is visible */
  _shortcutsOpen: false,

  /** Currently focused template card index (-1 = none) */
  _focusedTemplateIndex: -1,

  /**
   * Initialize global keyboard shortcut listener.
   * Called once from init().
   */
  _initKeyboardShortcuts() {
    // Remove any previously attached handler to prevent duplicate listeners on re-init
    if (this._keyboardShortcutHandler) {
      document.removeEventListener('keydown', this._keyboardShortcutHandler);
    }

    this._keyboardShortcutHandler = (e) => {
      // Ignore when typing in inputs
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+/ or Cmd+/ — toggle shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.toggleShortcutsOverlay();
        return;
      }

      // Escape — close any open overlay/panel
      if (e.key === 'Escape') {
        if (this._shortcutsOpen) {
          this.toggleShortcutsOverlay();
          return;
        }
        if (this._snippetPaletteOpen) {
          this.toggleSnippetPalette();
          return;
        }
        return;
      }

      // Don't handle other shortcuts when in input fields
      if (isInput) return;

      // Ctrl+Enter — generate document
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (this.state.template) {
          const container = document.querySelector('.sv-form')?.parentElement;
          this.generateDocument(container?.id);
        }
        return;
      }

      // Ctrl+S — toggle snippet palette
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.toggleSnippetPalette();
        return;
      }

      // Ctrl+E — show export panel (via generateDocument for validation)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (this.state.template) {
          const container = document.querySelector('.sv-form')?.parentElement;
          if (container?.id) this.generateDocument(container.id);
        }
        return;
      }

      // Arrow keys — template navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const cards = document.querySelectorAll('.sv-template-card');
        if (cards.length === 0) return;

        e.preventDefault();
        if (e.key === 'ArrowDown') {
          this._focusedTemplateIndex = Math.min(this._focusedTemplateIndex + 1, cards.length - 1);
        } else {
          this._focusedTemplateIndex = Math.max(this._focusedTemplateIndex - 1, 0);
        }

        cards.forEach((card, i) => {
          card.setAttribute('aria-selected', i === this._focusedTemplateIndex ? 'true' : 'false');
          card.classList.toggle('focused', i === this._focusedTemplateIndex);
          if (i === this._focusedTemplateIndex) card.focus();
        });
        return;
      }

      // Enter — select focused template
      if (e.key === 'Enter') {
        const cards = document.querySelectorAll('.sv-template-card');
        if (this._focusedTemplateIndex >= 0 && cards[this._focusedTemplateIndex]) {
          cards[this._focusedTemplateIndex].click();
        }
      }
    };

    document.addEventListener('keydown', this._keyboardShortcutHandler);
  },

  /**
   * Toggle the keyboard shortcuts help overlay.
   */
  toggleShortcutsOverlay() {
    this._shortcutsOpen = !this._shortcutsOpen;

    let overlay = document.getElementById('db-shortcuts-overlay');

    if (this._shortcutsOpen) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'db-shortcuts-overlay';
        overlay.className = 'sv-modal-overlay';
        overlay.onclick = (e) => {
          if (e.target === overlay) this.toggleShortcutsOverlay();
        };
        document.body.appendChild(overlay);
      }

      overlay.innerHTML = `
        <div class="sv-modal db-shortcuts-modal">
          <div class="sv-modal-header">
            <h3>Keyboard Shortcuts</h3>
            <button class="sv-modal-close" onclick="SmartVariables.toggleShortcutsOverlay()">×</button>
          </div>
          <div class="sv-modal-body">
            <div class="db-shortcut-group">
              <div class="db-shortcut-group-title">Navigation</div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Close panel / overlay</span><kbd>Esc</kbd></div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Navigate templates</span><kbd>↑</kbd> <kbd>↓</kbd></div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Select template</span><kbd>Enter</kbd></div>
            </div>
            <div class="db-shortcut-group">
              <div class="db-shortcut-group-title">Form</div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Next / Previous field</span><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd></div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Generate document</span><kbd>Ctrl</kbd>+<kbd>Enter</kbd></div>
            </div>
            <div class="db-shortcut-group">
              <div class="db-shortcut-group-title">Quick Actions</div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Snippet library</span><kbd>Ctrl</kbd>+<kbd>S</kbd></div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Export panel</span><kbd>Ctrl</kbd>+<kbd>E</kbd></div>
              <div class="db-shortcut-row"><span class="db-shortcut-desc">Show this help</span><kbd>Ctrl</kbd>+<kbd>/</kbd></div>
            </div>
          </div>
        </div>
      `;
      overlay.style.display = 'flex';
    } else if (overlay) {
      overlay.style.display = 'none';
    }
  }
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SmartVariables.init());
} else {
  SmartVariables.init();
}
