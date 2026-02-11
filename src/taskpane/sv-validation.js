/**
 * DraftBridge Gold - Smart Variables: Validation & Event Handlers
 *
 * Input change handlers, party management, form validation,
 * derivation processing, and the generateDocument entry point.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  _validateTimer: null,
  _renderFormTimer: null,
  _autosaveTimer: null,

  /** Debounced validation (300ms delay) to avoid thrashing on keystrokes. */
  _debouncedValidate() {
    clearTimeout(this._validateTimer);
    this._validateTimer = setTimeout(() => {
      this.validateAll();
    }, 300);
  },

  /**
   * Debounced validate and targeted DOM update for a single field.
   * Avoids full re-render by updating only error/progress indicators.
   * @param {string} variableId - the variable that changed
   * @param {string} containerId - DOM container ID
   */
  _debouncedValidateAndUpdate(variableId, containerId) {
    clearTimeout(this._validateTimer);
    this._validateTimer = setTimeout(() => {
      this.validateAll();
      this._updateFieldState(variableId);
      this._updateProgressIndicators(containerId);
    }, 300);
  },

  /**
   * Update a single field's error state in the DOM without full re-render.
   * @param {string} variableId - the variable to update
   */
  _updateFieldState(variableId) {
    const inputEl = document.getElementById(`sv-${variableId}`);
    if (!inputEl) return;
    const wrapper = inputEl.closest('.sv-variable');
    if (!wrapper) return;

    const error = this.state.errors[variableId];
    if (error) {
      wrapper.classList.add('has-error');
      let errEl = wrapper.querySelector('.sv-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'sv-error';
        wrapper.appendChild(errEl);
      }
      errEl.textContent = error;
    } else {
      wrapper.classList.remove('has-error');
      const errEl = wrapper.querySelector('.sv-error');
      if (errEl) errEl.remove();
    }
  },

  /**
   * Update overall and per-group progress indicators without full re-render.
   * @param {string} containerId - DOM container ID
   */
  _updateProgressIndicators(containerId) {
    if (!this.state.template) return;
    const template = this.state.template;

    // Update overall progress bar
    const totalRequired = template.variables.filter(v => v.required).length;
    const filledRequired = template.variables.filter(v => v.required && !this.isEmpty(this.state.values[v.id])).length;
    const progressPercent = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;

    const progressBar = document.querySelector('.sv-progress-bar');
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    const progressLabel = document.querySelector('.sv-progress-label');
    if (progressLabel) progressLabel.textContent = `${progressPercent}% complete`;

    // Update generate button state
    const isValid = Object.keys(this.state.errors).length === 0;
    const generateBtn = document.querySelector('.sv-btn-primary[onclick*="generateDocument"]');
    if (generateBtn) {
      generateBtn.disabled = !isValid;
      generateBtn.classList.toggle('disabled', !isValid);
      generateBtn.textContent = isValid ? 'Generate Document' : 'Complete Required Fields';
    }
  },

  /**
   * Debounced renderForm (300ms delay) to avoid full DOM replacement on every
   * contact/party field keystroke, which causes focus and cursor position loss.
   * @param {string} containerId - DOM container ID to render into
   */
  _debouncedRenderForm(containerId) {
    clearTimeout(this._renderFormTimer);
    this._renderFormTimer = setTimeout(() => {
      this.renderForm(containerId);
    }, 300);
  },

  /**
   * Handle a value change for a text/select/date/number variable.
   * @param {string} variableId - the variable that changed
   * @param {*} value - the new value
   * @param {string} containerId - DOM container ID (for potential re-render)
   */
  handleChange(variableId, value, containerId) {
    this.state.values[variableId] = value;
    this.processDerivations(variableId);
    this._debouncedValidateAndUpdate(variableId, containerId);
    this._debouncedAutosave();
  },

  /**
   * Handle a checkbox group change (add/remove value from array).
   * @param {string} variableId - the checkbox group variable
   * @param {string} optionValue - the option that was toggled
   * @param {boolean} isChecked - whether it was checked or unchecked
   * @param {string} containerId - DOM container ID
   */
  handleCheckboxGroupChange(variableId, optionValue, isChecked, containerId) {
    let currentValues = this.state.values[variableId] || [];
    if (!Array.isArray(currentValues)) currentValues = [];

    if (isChecked) {
      if (!currentValues.includes(optionValue)) {
        currentValues.push(optionValue);
      }
    } else {
      currentValues = currentValues.filter(val => val !== optionValue);
    }

    this.state.values[variableId] = currentValues;
    this.processDerivations(variableId);
    this._debouncedValidate();
  },

  /**
   * Handle a field change within a contact input (name, email, address fields).
   * @param {string} variableId - the contact variable
   * @param {string} field - sub-field name (firstName, city, etc.)
   * @param {string} value - the new value
   * @param {string} containerId - DOM container ID
   */
  handleContactChange(variableId, field, value, containerId) {
    const contact = this.state.values[variableId] || { firstName: '', lastName: '' };
    const isAddressField = ['street1', 'city', 'state', 'zip'].includes(field);

    if (isAddressField) {
      contact.address = contact.address || {};
      contact.address[field] = value;
    } else {
      contact[field] = value;
    }

    this.state.values[variableId] = contact;
    this.processDerivations(variableId);
    this._debouncedValidate();
    this._debouncedRenderForm(containerId);
  },

  /**
   * Handle a field change within a party card (name, entity toggle, etc.).
   * @param {string} variableId - the party variable
   * @param {number} index - party index in the array
   * @param {string} field - sub-field name
   * @param {*} value - the new value
   * @param {string} containerId - DOM container ID
   */
  handlePartyChange(variableId, index, field, value, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) parties = [parties];

    if (parties[index]) {
      parties[index][field] = value;
    }

    this.state.values[variableId] = parties;
    this.processDerivations(variableId);
    this._debouncedValidate();
    this._debouncedRenderForm(containerId);
  },

  /**
   * Add an empty party entry to the party list.
   * @param {string} variableId - the party variable
   * @param {string} role - 'plaintiff' or 'defendant'
   * @param {string} containerId - DOM container ID
   */
  addParty(variableId, role, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) parties = parties ? [parties] : [];

    parties.push({
      id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `party-${Date.now()}`,
      firstName: '',
      lastName: '',
      role: role,
      isEntity: false,
      represented: true
    });

    this.state.values[variableId] = parties;
    this.renderForm(containerId);
  },

  /**
   * Remove a party from the list (with confirmation if party has data).
   * @param {string} variableId - the party variable
   * @param {number} index - party index to remove
   * @param {string} containerId - DOM container ID
   */
  async removeParty(variableId, index, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) return;

    const party = parties[index];
    if (!party) return;

    // Confirm if the party has any data entered
    const hasData = party.firstName || party.lastName || party.company;
    if (hasData) {
      const displayName = party.isEntity
        ? (party.company || 'this entity')
        : ([party.firstName, party.lastName].filter(Boolean).join(' ') || 'this party');
      const confirmed = await this.showConfirm(`Remove ${displayName}? This cannot be undone.`, { confirmText: 'Remove', destructive: true });
      if (!confirmed) return;
    }

    parties.splice(index, 1);
    this.state.values[variableId] = parties;
    this.renderForm(containerId);
  },

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate all required fields and populate state.errors.
   * @returns {boolean} true if all required fields are filled
   */
  validateAll() {
    this.state.errors = {};

    if (!this.state.template) return true;

    for (const variable of this.state.template.variables) {
      const value = this.state.values[variable.id];

      if (variable.required && this.isEmpty(value)) {
        this.state.errors[variable.id] = `${variable.name} is required`;
      }
    }

    return Object.keys(this.state.errors).length === 0;
  },

  /**
   * Check if a value is empty (handles strings, arrays, objects, contacts).
   * @param {*} value - the value to check
   * @returns {boolean} true if value is considered empty
   */
  isEmpty(value) {
    if (value === undefined || value === null || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    // Check contact has at least name
    if (typeof value === 'object' && 'firstName' in value) {
      return !value.firstName && !value.lastName && !value.company;
    }
    return false;
  },

  // ============================================================================
  // DERIVATIONS
  // ============================================================================

  /**
   * Compute derived values (fullName, salutation, party names) after a change.
   * @param {string} variableId - the variable that changed
   */
  processDerivations(variableId) {
    const value = this.state.values[variableId];
    const variable = this.state.template?.variables.find(
      varDef => varDef.id === variableId
    );

    if (!variable) return;

    if (variable.type === 'contact' && value) {
      const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ');
      this.state.derivedValues[`${variableId}.fullName`] = fullName;
      this.state.derivedValues[`${variableId}.salutation`] = value.lastName
        ? `Dear ${value.prefix || 'Mr./Ms.'} ${value.lastName}:`
        : '';
    }

    if (variable.type === 'party' && Array.isArray(value)) {
      const names = value.map(party => {
        if (party.isEntity) return (party.company || '').toUpperCase();
        return [party.firstName, party.lastName].filter(Boolean).join(' ').toUpperCase();
      }).filter(Boolean);

      this.state.derivedValues[`${variableId}.names`] = names.join(', ');
      this.state.derivedValues[`${variableId}.namesEtAl`] = names.length > 1
        ? `${names[0]}, et al.`
        : names[0] || '';
    }
  },

  // ============================================================================
  // AUTOSAVE & DRAFT RECOVERY
  // ============================================================================

  /**
   * Debounced autosave (2s after last change).
   * Saves current form values to localStorage under draftbridge_draft_{templateId}.
   */
  _debouncedAutosave() {
    clearTimeout(this._autosaveTimer);

    // Show "Saving..." indicator
    this._updateAutosaveIndicator('saving');

    this._autosaveTimer = setTimeout(() => {
      this._saveDraft();
      this._updateAutosaveIndicator('saved');

      // Fade indicator after 2s
      setTimeout(() => {
        this._updateAutosaveIndicator('idle');
      }, 2000);
    }, 2000);
  },

  /**
   * Save current form values as a draft in localStorage.
   */
  _saveDraft() {
    if (!this.state.template) return;
    const key = `draftbridge_draft_${this.state.template.id}`;
    try {
      const draft = {
        templateId: this.state.template.id,
        values: this.state.values,
        derivedValues: this.state.derivedValues,
        exportNumberingScheme: this._exportNumberingScheme,
        exportIncludeToc: this._exportIncludeToc,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) {
      console.error('[SmartVariables] Failed to save draft:', e);
    }
  },

  /**
   * Load a saved draft for a template from localStorage.
   * @param {string} templateId - the template to check for drafts
   * @returns {Object|null} draft data or null
   */
  _loadDraft(templateId) {
    const key = `draftbridge_draft_${templateId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('[SmartVariables] Failed to load draft:', e);
    }
    return null;
  },

  /**
   * Clear a saved draft for a template.
   * @param {string} templateId - the template whose draft to clear
   */
  _clearDraft(templateId) {
    localStorage.removeItem(`draftbridge_draft_${templateId}`);
  },

  /**
   * Update the autosave indicator in the form header.
   * @param {string} status - 'saving', 'saved', or 'idle'
   */
  _updateAutosaveIndicator(status) {
    let indicator = document.querySelector('.db-autosave');
    if (!indicator) {
      // Create indicator in form header
      const header = document.querySelector('.sv-form-header');
      if (!header) return;
      indicator = document.createElement('span');
      indicator.className = 'db-autosave';
      header.appendChild(indicator);
    }

    switch (status) {
      case 'saving':
        indicator.innerHTML = '<span class="db-autosave-dot saving"></span> Saving...';
        indicator.classList.add('visible');
        break;
      case 'saved':
        indicator.innerHTML = '<span class="db-autosave-dot saved"></span> Saved';
        indicator.classList.add('visible');
        break;
      case 'idle':
        indicator.classList.remove('visible');
        break;
    }
  },

  /**
   * Show a "Resume draft?" toast when a saved draft is detected.
   * @param {string} templateId - the template with a saved draft
   * @param {string} containerId - DOM container ID
   * @param {Object} draft - the draft data
   */
  _showDraftRecoveryToast(templateId, containerId, draft) {
    const savedDate = new Date(draft.savedAt);
    const timeAgo = this._formatTimeAgo(savedDate);

    // Create a special draft recovery toast
    const toastEl = document.createElement('div');
    toastEl.className = 'toast db-draft-toast show';
    toastEl.innerHTML = `
      <div class="toast-body">
        <div class="db-draft-toast-text">
          <strong>Resume draft?</strong>
          <span>You have unsaved work from ${this.escapeHtml(timeAgo)}</span>
        </div>
        <div class="db-draft-toast-actions">
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables._resumeDraft('${this.safeId(templateId)}', '${this.safeId(containerId)}'); this.closest('.toast').remove();">Resume</button>
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables._clearDraft('${this.safeId(templateId)}'); this.closest('.toast').remove();">New</button>
          <button class="sv-btn sv-btn-secondary" onclick="this.closest('.toast').remove();">Dismiss</button>
        </div>
      </div>
    `;
    toastEl.style.bottom = '20px';
    document.body.appendChild(toastEl);

    // Auto-dismiss after 10s
    setTimeout(() => {
      if (toastEl.parentElement) toastEl.remove();
    }, 10000);
  },

  /**
   * Resume a saved draft by restoring values and re-rendering.
   * @param {string} templateId - the template to resume
   * @param {string} containerId - DOM container ID
   */
  _resumeDraft(templateId, containerId) {
    const draft = this._loadDraft(templateId);
    if (!draft) return;

    this.state.values = draft.values || {};
    this.state.derivedValues = draft.derivedValues || {};
    // Restore export preferences if saved
    if (draft.exportNumberingScheme) this._exportNumberingScheme = draft.exportNumberingScheme;
    if (draft.exportIncludeToc !== undefined) this._exportIncludeToc = draft.exportIncludeToc;
    this.renderForm(containerId);
    toast('Draft restored', 'success');
  },

  /**
   * Format a date as a relative time string (e.g., "5 minutes ago").
   * @param {Date} date
   * @returns {string}
   */
  _formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  },

  // ============================================================================
  // DOCUMENT GENERATION (entry point)
  // ============================================================================

  /**
   * Validate all fields and show the export panel with stats, numbering, and export options.
   * Entry point called by the "Generate Document" button.
   * @param {string} [containerId='sv-container'] - DOM container ID for the export panel
   */
  generateDocument(containerId) {
    if (!this.validateAll()) {
      const errorCount = Object.keys(this.state.errors).length;
      toast(`Please complete ${errorCount} required field(s) before generating.`, 'error');
      return;
    }

    if (localStorage.getItem('draftbridge_debug') === 'true') {
      console.log('[SmartVariables] Generating with:', {
        template: this.state.template.id,
        values: this.state.values,
        derived: this.state.derivedValues
      });
    }

    // Show export panel with stats, numbering options, and export buttons
    const target = containerId || 'sv-container';
    this.showExportPanel(target);
  }

});
