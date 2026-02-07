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

  /** Debounced validation (300ms delay) to avoid thrashing on keystrokes. */
  _debouncedValidate() {
    clearTimeout(this._validateTimer);
    this._validateTimer = setTimeout(() => {
      this.validateAll();
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
    this._debouncedValidate();
    // Don't re-render on every keystroke for text - only on blur or explicit change
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
    this.renderForm(containerId);
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
    this.renderForm(containerId);
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
  removeParty(variableId, index, containerId) {
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
      if (!confirm(`Remove ${displayName}? This cannot be undone.`)) return;
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
  // DOCUMENT GENERATION (entry point)
  // ============================================================================

  /**
   * Validate all fields, build document content, and insert into Word.
   * Entry point called by the "Generate Document" button.
   */
  async generateDocument() {
    if (!this.validateAll()) {
      const errorCount = Object.keys(this.state.errors).length;
      toast(`Please complete ${errorCount} required field(s) before generating.`, 'error');
      return;
    }

    const template = this.state.template;
    const values = this.state.values;
    const derived = this.state.derivedValues;

    try {
      // Show generating state
      toast('Generating document...', 'info');

      if (localStorage.getItem('draftbridge_debug') === 'true') {
        console.log('[SmartVariables] Generating with:', { template: template.id, values, derived });
      }

      // Call Office.js to insert content
      await this.insertIntoDocument(template, values, derived);

      toast(`${template.name} generated successfully!`, 'success');

    } catch (error) {
      console.error('[SmartVariables] Generation failed:', error);
      toast('Something went wrong while generating the document. Please try again.', 'error');
    }
  }

});
