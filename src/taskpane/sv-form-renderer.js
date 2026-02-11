/**
 * DraftBridge Gold - Smart Variables: Form UI Rendering
 *
 * Template selector, form rendering, variable inputs, contact picker,
 * party inputs, and the full Contacts Manager modal.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // DEBOUNCE HELPERS
  // ============================================================================

  _contactSearchTimer: null,
  _templateSearchTimer: null,

  /**
   * Debounced contact search handler (250ms delay).
   * @param {string} query - the search input value
   */
  handleContactsSearchDebounced(query) {
    clearTimeout(this._contactSearchTimer);
    this._contactSearchTimer = setTimeout(() => {
      this.handleContactsSearch(query);
    }, 250);
  },

  // ============================================================================
  // UI RENDERING
  // ============================================================================

  /**
   * Show the template selector grid (main entry screen).
   * @param {string} containerId - DOM container ID to render into
   */
  // Current template filter state
  _templateSearchQuery: '',
  _templateFilterCategory: null,

  showTemplateSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset filters when entering selector fresh
    this._templateSearchQuery = '';
    this._templateFilterCategory = null;

    this._renderTemplateList(containerId);
  },

  /**
   * Render the template list with current search/filter state.
   * @param {string} containerId - DOM container ID
   */
  _renderTemplateList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const hasProfile = this.userProfile?.firstName || this.userProfile?.lastName;
    const categories = this.getTemplateCategories();
    const filtered = this.filterTemplates(this._templateSearchQuery, this._templateFilterCategory);
    const customTemplates = filtered.filter(template => template.isCustom);
    const builtInTemplates = filtered.filter(template => !template.isCustom);

    container.innerHTML = `
      <div class="sv-template-selector">
        <div class="sv-selector-header">
          <h3 class="sv-section-title">Smart Templates</h3>
          <div class="sv-header-actions">
            <button class="sv-icon-btn" title="Import Template" onclick="SmartVariables.showImportDialog('${this.safeId(containerId)}')">
              Import
            </button>
            <button class="sv-icon-btn" title="Bridge Document" onclick="SmartVariables.showBridgingWizard('${this.safeId(containerId)}')">
              Bridge
            </button>
            <button class="sv-profile-btn ${hasProfile ? 'has-profile' : ''}"
                    onclick="SmartVariables.showProfileEditor('${this.safeId(containerId)}')">
              My Profile
            </button>
          </div>
        </div>
        <p class="sv-description">Choose a template to get started with intelligent auto-fill.</p>

        <div class="sv-template-search-bar">
          <input type="text" class="sv-input sv-template-search" placeholder="Search templates..."
                 value="${this.escapeHtml(this._templateSearchQuery)}"
                 oninput="SmartVariables._handleTemplateSearch(this.value, '${this.safeId(containerId)}')">
        </div>

        <div class="sv-filter-chips" role="group" aria-label="Filter by category">
          <button class="sv-chip ${!this._templateFilterCategory ? 'active' : ''}"
                  onclick="SmartVariables._handleCategoryFilter(null, '${this.safeId(containerId)}')">All</button>
          ${categories.map(cat => `
            <button class="sv-chip ${this._templateFilterCategory === cat.value ? 'active' : ''}"
                    onclick="SmartVariables._handleCategoryFilter('${this.safeId(cat.value)}', '${this.safeId(containerId)}')">${this.escapeHtml(cat.label)}</button>
          `).join('')}
        </div>

        <div class="sv-template-grid stagger-children" role="listbox" aria-label="Template selection">
          ${builtInTemplates.length > 0 ? builtInTemplates.map(tpl => `
            <div class="sv-template-card" role="option" tabindex="0" aria-selected="false" onclick="SmartVariables.selectTemplate('${this.safeId(tpl.id)}', '${this.safeId(containerId)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
              <div class="sv-template-icon">${this.getCategoryIcon(tpl.category)}</div>
              <div class="sv-template-info">
                <div class="sv-template-name">${this.escapeHtml(tpl.name)}</div>
                <div class="sv-template-desc">${this.escapeHtml(tpl.description || '')}</div>
              </div>
              <div class="sv-template-actions">
                <button class="sv-mini-btn" title="Export" onclick="event.stopPropagation(); SmartVariables.exportTemplate('${this.safeId(tpl.id)}')">Export</button>
                <span class="sv-template-arrow">→</span>
              </div>
            </div>
          `).join('') : `<div class="sv-picker-empty">No templates match your search.</div>`}
        </div>
        ${customTemplates.length > 0 ? `
          <div class="sv-custom-templates">
            <h4 class="sv-subsection-title">My Custom Templates</h4>
            <div class="sv-template-grid stagger-children" role="listbox" aria-label="Custom template selection">
              ${customTemplates.map(tpl => `
                <div class="sv-template-card custom" role="option" tabindex="0" aria-selected="false" onclick="SmartVariables.selectTemplate('${this.safeId(tpl.id)}', '${this.safeId(containerId)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
                  <div class="sv-template-icon">${this.getCategoryIcon(tpl.category)}</div>
                  <div class="sv-template-info">
                    <div class="sv-template-name">${this.escapeHtml(tpl.name)}</div>
                    <div class="sv-template-desc">${this.escapeHtml(tpl.description || '')}</div>
                  </div>
                  <div class="sv-template-actions">
                    <button class="sv-mini-btn" title="Export" onclick="event.stopPropagation(); SmartVariables.exportTemplate('${this.safeId(tpl.id)}')">Export</button>
                    <button class="sv-mini-btn danger" title="Delete" onclick="event.stopPropagation(); SmartVariables.deleteTemplate('${this.safeId(tpl.id)}', '${this.safeId(containerId)}')">Delete</button>
                    <span class="sv-template-arrow">→</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Handle template search input.
   * @param {string} query - search text
   * @param {string} containerId - DOM container ID
   */
  _handleTemplateSearch(query, containerId) {
    this._templateSearchQuery = query;
    clearTimeout(this._templateSearchTimer);
    this._templateSearchTimer = setTimeout(() => {
      this._renderTemplateList(containerId);
    }, 250);
  },

  /**
   * Handle category filter chip click.
   * @param {string|null} category - category value or null for all
   * @param {string} containerId - DOM container ID
   */
  _handleCategoryFilter(category, containerId) {
    this._templateFilterCategory = category;
    this._renderTemplateList(containerId);
  },

  /**
   * Select a template, apply defaults, auto-fill from profile, and render the form.
   * @param {string} templateId - the template to load
   * @param {string} containerId - DOM container ID to render into
   */
  selectTemplate(templateId, containerId) {
    const template = this.templates[templateId];
    if (!template) return;

    this.state.template = template;
    this.state.values = {};
    this.state.derivedValues = {};
    this.state.errors = {};

    // Apply defaults
    template.variables.forEach(variable => {
      if (variable.defaultValue !== undefined && variable.defaultValue !== null) {
        this.state.values[variable.id] = variable.defaultValue;
      }
      // Date fields default to today when no explicit default is set
      if (variable.type === 'date' && this.state.values[variable.id] === undefined) {
        this.state.values[variable.id] = new Date().toISOString().split('T')[0];
      }
    });

    // Check for saved draft
    const draft = this._loadDraft(templateId);
    if (draft && draft.values && Object.keys(draft.values).length > 0) {
      // Show draft recovery toast after rendering
      setTimeout(() => {
        this._showDraftRecoveryToast(templateId, containerId, draft);
      }, 300);
    }

    // Auto-fill derived attorney values from profile
    if (this.userProfile) {
      const profile = this.userProfile;

      // Store profile for use in document generation
      this.state.derivedValues['attorney.name'] = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      this.state.derivedValues['attorney.barInfo'] = profile.barNumber && profile.barState
        ? `${profile.barState} Bar No. ${profile.barNumber}`
        : '';
      this.state.derivedValues['attorney.firm'] = profile.firmName || '';
      this.state.derivedValues['attorney.email'] = profile.email || '';
      this.state.derivedValues['attorney.phone'] = profile.phone || '';
      this.state.derivedValues['attorney.address'] = [
        profile.firmStreet,
        `${profile.firmCity || ''}, ${profile.firmState || ''} ${profile.firmZip || ''}`.trim()
      ].filter(Boolean).join('\n');
      this.state.derivedValues['attorney.block'] = this.getAttorneyBlock();
    }

    this.renderForm(containerId);
  },

  /**
   * Render the full variable form for the currently selected template.
   * @param {string} containerId - DOM container ID to render into
   */
  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !this.state.template) return;

    const template = this.state.template;
    const groups = this.groupVariables(template.variables);
    const isValid = this.validateAll();

    // Calculate overall completion
    const totalRequired = template.variables.filter(v => v.required).length;
    const filledRequired = template.variables.filter(v => v.required && !this.isEmpty(this.state.values[v.id])).length;
    const progressPercent = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;

    container.innerHTML = `
      <div class="sv-form panel-enter" role="form" aria-label="Document variables">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${this.safeId(containerId)}')">← Back</button>
          <h3 class="sv-template-title">${template.name}</h3>
        </div>

        <div class="sv-progress-bar-container" title="${filledRequired} of ${totalRequired} required fields completed">
          <div class="sv-progress-bar" style="width: ${progressPercent}%"></div>
          <span class="sv-progress-label">${progressPercent}% complete</span>
        </div>

        ${!isValid ? `
          <div class="sv-validation-warning">
            • ${Object.keys(this.state.errors).length} required field(s) need attention
          </div>
        ` : ''}

        ${Object.entries(groups).map(([group, vars]) => this.renderGroup(group, vars, containerId)).join('')}

        <div class="sv-form-actions">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.showTemplateSelector('${this.safeId(containerId)}')">
            Cancel
          </button>
          <button class="sv-btn sv-btn-primary ${!isValid ? 'disabled' : ''}"
                  onclick="SmartVariables.generateDocument('${this.safeId(containerId)}')" ${!isValid ? 'disabled' : ''}>
            ${isValid ? 'Generate Document' : 'Complete Required Fields'}
          </button>
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.showExportPanel('${this.safeId(containerId)}')" ${!isValid ? 'disabled' : ''}>
            Export
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Group variables by their group field and sort by order within each group.
   * @param {Array<Object>} variables - template variable definitions
   * @returns {Object} map of groupId to sorted array of variables
   */
  groupVariables(variables) {
    const groups = {};
    variables.forEach(variable => {
      const groupKey = variable.group || 'other';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(variable);
    });
    // Sort within groups by order
    Object.values(groups).forEach(groupVars => {
      groupVars.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return groups;
  },

  /**
   * Render a collapsible group of variables with a header.
   * @param {string} groupId - group identifier (e.g. 'case', 'parties')
   * @param {Array<Object>} variables - variable definitions in this group
   * @param {string} containerId - DOM container ID for event handlers
   * @returns {string} HTML string
   */
  renderGroup(groupId, variables, containerId) {
    const titles = {
      case: 'Case Information',
      parties: 'Parties',
      motion: 'Motion Details',
      attachments: 'Attachments & Service',
      letter: 'Letter Details',
      recipient: 'Recipient',
      substance: 'Claims & Allegations',
      options: 'Options',
      responses: 'Responses to Allegations',
      defenses: 'Affirmative Defenses',
      counterclaim: 'Counterclaim',
      discovery: 'Discovery Details',
      content: 'Request Content',
      other: 'Other'
    };

    const isExpanded = this.state.expandedGroups.has(groupId);

    // Per-group progress
    const requiredInGroup = variables.filter(v => v.required);
    const filledInGroup = requiredInGroup.filter(v => !this.isEmpty(this.state.values[v.id]));
    const groupComplete = requiredInGroup.length > 0 && filledInGroup.length === requiredInGroup.length;
    const groupProgress = requiredInGroup.length > 0 ? Math.round((filledInGroup.length / requiredInGroup.length) * 100) : 100;

    return `
      <div class="sv-group">
        <button class="sv-group-header ${isExpanded ? 'expanded' : ''}"
                aria-expanded="${isExpanded ? 'true' : 'false'}"
                onclick="SmartVariables.toggleGroup('${this.safeId(groupId)}', '${this.safeId(containerId)}')">
          <span class="sv-group-title">${titles[groupId] || groupId}</span>
          ${requiredInGroup.length > 0 ? `
            <span class="sv-group-progress ${groupComplete ? 'complete' : ''}">${filledInGroup.length}/${requiredInGroup.length}</span>
          ` : ''}
          <span class="sv-group-count">${variables.length}</span>
          <span class="sv-group-arrow">▼</span>
        </button>
        ${requiredInGroup.length > 0 ? `
          <div class="sv-group-progress-track">
            <div class="sv-group-progress-fill ${groupComplete ? 'complete' : ''}" style="width: ${groupProgress}%"></div>
          </div>
        ` : ''}
        <div class="sv-group-content ${isExpanded ? 'sv-group-expanded' : 'sv-group-collapsed'}">
          ${variables.map(variable => this.renderVariable(variable, containerId)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Toggle a variable group open/closed and re-render the form.
   * @param {string} groupId - group to toggle
   * @param {string} containerId - DOM container ID
   */
  toggleGroup(groupId, containerId) {
    if (this.state.expandedGroups.has(groupId)) {
      this.state.expandedGroups.delete(groupId);
    } else {
      this.state.expandedGroups.add(groupId);
    }
    this.renderForm(containerId);
  },

  /**
   * Render a single variable row (label, help text, input, error).
   * @param {Object} variable - the variable definition
   * @param {string} containerId - DOM container ID
   * @returns {string} HTML string
   */
  renderVariable(variable, containerId) {
    const value = this.state.values[variable.id];
    const error = this.state.errors[variable.id];
    const derived = this.state.derivedValues[variable.id];

    return `
      <div class="sv-variable ${error ? 'has-error' : ''}">
        <label class="sv-label" for="sv-${variable.id}">
          ${this.escapeHtml(variable.name)}
          ${variable.required ? '<span class="sv-required">*</span>' : ''}
        </label>
        ${variable.helpText ? `<p class="sv-help">${this.escapeHtml(variable.helpText)}</p>` : ''}
        <div class="sv-control">
          ${this.renderInput(variable, value, containerId)}
        </div>
        ${error ? `<p class="sv-error">${this.escapeHtml(error)}</p>` : ''}
        ${derived ? `<div class="sv-derived">${this.escapeHtml(derived)}</div>` : ''}
      </div>
    `;
  },

  /**
   * Render the appropriate input control for a variable type.
   * @param {Object} variable - variable definition (type, config, etc.)
   * @param {*} value - current value
   * @param {string} containerId - DOM container ID
   * @returns {string} HTML string for the input control
   */
  renderInput(variable, value, containerId) {
    const id = `sv-${variable.id}`;
    const onChange = `SmartVariables.handleChange('${this.safeId(variable.id)}', this.value, '${this.safeId(containerId)}')`;

    switch (variable.type) {
      case 'text':
        return `<input type="text" id="${id}" class="sv-input" value="${this.escapeHtml(value || '')}" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}" onkeyup="${onChange}">`;

      case 'textarea':
        return `<textarea id="${id}" class="sv-textarea" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}" onkeyup="${onChange}">${this.escapeHtml(value || '')}</textarea>`;

      case 'number':
        return `<input type="number" id="${id}" class="sv-input" value="${this.escapeHtml(String(value || ''))}" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}">`;

      case 'date':
        return `<input type="date" id="${id}" class="sv-input" value="${this.escapeHtml(value || '')}" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}">`;

      case 'checkbox':
        return `
          <label class="sv-checkbox-wrapper">
            <input type="checkbox" id="${id}" ${value ? 'checked' : ''}
                   onchange="SmartVariables.handleChange('${this.safeId(variable.id)}', this.checked, '${this.safeId(containerId)}')">
            <span>${this.escapeHtml(variable.name)}</span>
          </label>
        `;

      case 'select':
        // Check if this is a court field - use dynamic court database
        if (variable.id === 'court' && this.courts.length > 0) {
          return `
            <div class="sv-court-select-wrapper">
              <select id="${id}" class="sv-select" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}">
                <option value="">Select Court...</option>
                ${this.renderCourtOptionsGrouped(value)}
              </select>
              ${value ? `<a class="sv-court-link" href="${this.getCourtById(value)?.filingUrl || '#'}" target="_blank" title="Open ECF Filing">ECF Link</a>` : ''}
            </div>
          `;
        }
        const options = variable.config?.options || [];
        return `
          <select id="${id}" class="sv-select" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}">
            <option value="">Select...</option>
            ${options.map(option => `
              <option value="${this.escapeHtml(option.value)}" ${value === option.value ? 'selected' : ''}>${this.escapeHtml(option.label)}</option>
            `).join('')}
          </select>
        `;

      case 'checkboxGroup':
        const groupOptions = variable.config?.options || [];
        const selectedValues = Array.isArray(value) ? value : [];
        return `
          <div class="sv-checkbox-group" id="${id}">
            ${groupOptions.map(option => `
              <label class="sv-checkbox-wrapper">
                <input type="checkbox" value="${this.escapeHtml(option.value)}" ${selectedValues.includes(option.value) ? 'checked' : ''}
                       onchange="SmartVariables.handleCheckboxGroupChange('${this.safeId(variable.id)}', '${this.safeId(option.value)}', this.checked, '${this.safeId(containerId)}')">
                <span>${this.escapeHtml(option.label)}</span>
              </label>
            `).join('')}
          </div>
        `;

      case 'contact':
        return this.renderContactInput(variable, value, containerId);

      case 'party':
        return this.renderPartyInput(variable, value, containerId);

      default:
        return `<input type="text" id="${id}" class="sv-input" value="${this.escapeHtml(value || '')}" aria-required="${variable.required ? 'true' : 'false'}" onchange="${onChange}">`;
    }
  },

  /**
   * Render court select options grouped by US state with optgroup elements.
   * @param {string} selectedValue - currently selected court ID
   * @returns {string} HTML string of optgroup/option elements
   */
  renderCourtOptionsGrouped(selectedValue) {
    // Use pre-computed courtsByState index from courts.json (loaded in sv-courts.js)
    // to avoid O(n*m) filtering on every render.
    const stateNames = this.STATE_NAMES;
    const stateIndex = this.courtsByState;
    const states = Object.keys(stateIndex).sort();

    // Fallback: if stateIndex is empty (courts.json didn't load or had no stateIndex),
    // build it on the fly from the courts array.
    if (states.length === 0 && this.courts.length > 0) {
      const fallbackStates = [...new Set(this.courts.map(court => court.state))].sort();
      return fallbackStates.map(state => {
        const stateCourts = this.courts.filter(court => court.state === state);
        return `
          <optgroup label="${stateNames[state] || state}">
            ${stateCourts.map(court => `
              <option value="${court.id}" ${selectedValue === court.id ? 'selected' : ''}>${court.abbreviation} - ${court.city}</option>
            `).join('')}
          </optgroup>
        `;
      }).join('');
    }

    return states.map(state => {
      const courtIds = stateIndex[state] || [];
      const stateCourts = courtIds.map(id => this.courtsById[id]).filter(Boolean);
      return `
        <optgroup label="${stateNames[state] || state}">
          ${stateCourts.map(court => `
            <option value="${court.id}" ${selectedValue === court.id ? 'selected' : ''}>${court.abbreviation} - ${court.city}</option>
          `).join('')}
        </optgroup>
      `;
    }).join('');
  },

  /**
   * Render a contact input block (name, company, email, address fields).
   * @param {Object} variable - the contact variable definition
   * @param {Object|null} value - current contact value
   * @param {string} containerId - DOM container ID
   * @returns {string} HTML string
   */
  renderContactInput(variable, value, containerId) {
    const contact = value || { firstName: '', lastName: '', company: '', email: '' };
    const prefix = `sv-${variable.id}`;
    const hasContacts = this.getSavedContacts().length > 0;

    return `
      <div class="sv-contact-input">
        <div class="sv-contact-header">
          <button class="sv-contacts-btn" onclick="SmartVariables.showContactPicker('${this.safeId(variable.id)}', '${this.safeId(containerId)}')" title="Select from contacts">
            Contacts
          </button>
        </div>
        <div class="sv-contact-row">
          <input type="text" placeholder="First Name" value="${this.escapeHtml(contact.firstName || '')}"
                 onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'firstName', this.value, '${this.safeId(containerId)}')">
          <input type="text" placeholder="Last Name" value="${this.escapeHtml(contact.lastName || '')}"
                 onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'lastName', this.value, '${this.safeId(containerId)}')">
        </div>
        <input type="text" placeholder="Company" value="${this.escapeHtml(contact.company || '')}"
               onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'company', this.value, '${this.safeId(containerId)}')">
        <input type="email" placeholder="Email" value="${this.escapeHtml(contact.email || '')}"
               onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'email', this.value, '${this.safeId(containerId)}')">
        <input type="text" placeholder="Address" value="${this.escapeHtml(contact.address?.street1 || '')}"
               onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'street1', this.value, '${this.safeId(containerId)}')">
        <div class="sv-contact-row">
          <input type="text" placeholder="City" value="${this.escapeHtml(contact.address?.city || '')}"
                 onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'city', this.value, '${this.safeId(containerId)}')">
          <input type="text" placeholder="State" maxlength="2" style="width:60px" value="${this.escapeHtml(contact.address?.state || '')}"
                 onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'state', this.value.toUpperCase(), '${this.safeId(containerId)}')">
          <input type="text" placeholder="ZIP" style="width:80px" value="${this.escapeHtml(contact.address?.zip || '')}"
                 onchange="SmartVariables.handleContactChange('${this.safeId(variable.id)}', 'zip', this.value, '${this.safeId(containerId)}')">
        </div>
        ${this.renderContactPreview(contact)}
      </div>
    `;
  },

  /**
   * Render a small preview of contact name and salutation.
   * @param {Object} contact - the contact data
   * @returns {string} HTML string (empty if no name)
   */
  renderContactPreview(contact) {
    if (!contact.firstName && !contact.lastName) return '';

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const salutation = contact.lastName ? `Dear ${this.escapeHtml(contact.prefix || 'Mr./Ms.')} ${this.escapeHtml(contact.lastName)}:` : '';

    return `
      <div class="sv-contact-preview">
        <div><strong>Name:</strong> ${this.escapeHtml(fullName)}</div>
        ${salutation ? `<div><strong>Salutation:</strong> ${salutation}</div>` : ''}
      </div>
    `;
  },

  /**
   * Render the party list input (add/remove parties, entity toggle).
   * @param {Object} variable - the party variable definition
   * @param {Array|Object|null} value - current parties array
   * @param {string} containerId - DOM container ID
   * @returns {string} HTML string
   */
  renderPartyInput(variable, value, containerId) {
    const parties = Array.isArray(value) ? value : (value ? [value] : []);
    const allowedRoles = variable.config?.allowedRoles || ['plaintiff', 'defendant'];
    const roleLabel = allowedRoles[0] === 'plaintiff' ? 'Plaintiff' : 'Defendant';
    const hasContacts = this.getSavedContacts().length > 0;

    return `
      <div class="sv-party-input">
        ${parties.map((party, idx) => `
          <div class="sv-party-card ${allowedRoles[0]}">
            <div class="sv-party-header">
              <span class="sv-party-icon">${party.isEntity ? '[Co]' : '[P]'}</span>
              <span class="sv-party-name">${this.escapeHtml(party.isEntity ? (party.company || 'Entity') : ([party.firstName, party.lastName].filter(Boolean).join(' ') || 'Individual'))}</span>
              <div class="sv-party-actions">
                <button class="sv-mini-btn" title="Save to Contacts" onclick="SmartVariables.addContactFromParty('${this.safeId(variable.id)}', ${idx}, '${this.safeId(containerId)}')">Save</button>
                <button class="sv-party-remove" aria-label="Remove party ${idx + 1}" onclick="SmartVariables.removeParty('${this.safeId(variable.id)}', ${idx}, '${this.safeId(containerId)}')">×</button>
              </div>
            </div>
            <div class="sv-party-form">
              <label class="sv-checkbox-wrapper">
                <input type="checkbox" ${party.isEntity ? 'checked' : ''}
                       onchange="SmartVariables.handlePartyChange('${this.safeId(variable.id)}', ${idx}, 'isEntity', this.checked, '${this.safeId(containerId)}')">
                <span>Entity (Corporation/LLC)</span>
              </label>
              ${party.isEntity ? `
                <input type="text" placeholder="Entity Name" value="${this.escapeHtml(party.company || '')}"
                       onchange="SmartVariables.handlePartyChange('${this.safeId(variable.id)}', ${idx}, 'company', this.value, '${this.safeId(containerId)}')">
              ` : `
                <div class="sv-contact-row">
                  <input type="text" placeholder="First Name" value="${this.escapeHtml(party.firstName || '')}"
                         onchange="SmartVariables.handlePartyChange('${this.safeId(variable.id)}', ${idx}, 'firstName', this.value, '${this.safeId(containerId)}')">
                  <input type="text" placeholder="Last Name" value="${this.escapeHtml(party.lastName || '')}"
                         onchange="SmartVariables.handlePartyChange('${this.safeId(variable.id)}', ${idx}, 'lastName', this.value, '${this.safeId(containerId)}')">
                </div>
              `}
            </div>
          </div>
        `).join('')}
        <div class="sv-party-add-actions">
          <button class="sv-add-party-btn" aria-label="Add ${roleLabel}" onclick="SmartVariables.addParty('${this.safeId(variable.id)}', '${this.safeId(allowedRoles[0])}', '${this.safeId(containerId)}')">
            + Add ${roleLabel}
          </button>
          ${hasContacts ? `
            <button class="sv-contacts-btn" onclick="SmartVariables.showPartyPicker('${this.safeId(variable.id)}', '${this.safeId(allowedRoles[0])}', '${this.safeId(containerId)}')" title="Add from contacts">
              From Contacts
            </button>
          ` : ''}
        </div>
        ${parties.length > 0 ? this.renderCaptionPreview(parties, allowedRoles[0]) : ''}
      </div>
    `;
  },

  /**
   * Render the caption-style preview (e.g. "SMITH, et al., Plaintiff(s).").
   * @param {Array<Object>} parties - array of party objects
   * @param {string} role - 'plaintiff' or 'defendant'
   * @returns {string} HTML string
   */
  renderCaptionPreview(parties, role) {
    const names = parties.map(party => {
      if (party.isEntity) return (party.company || 'ENTITY').toUpperCase();
      return [party.firstName, party.lastName].filter(Boolean).join(' ').toUpperCase() || 'PARTY';
    });

    const display = names.length > 1 ? `${names[0]}, et al.` : names[0];

    return `
      <div class="sv-caption-preview">
        <div class="sv-caption-party">${this.escapeHtml(display)},</div>
        <div class="sv-caption-role">${role === 'plaintiff' ? 'Plaintiff(s)' : 'Defendant(s)'}.</div>
      </div>
    `;
  },

  // ============================================================================
  // CONTACT PICKER
  // ============================================================================

  /**
   * Show contact picker modal for selecting from saved contacts.
   * @param {string} variableId - the variable to populate
   * @param {string} containerId - DOM container ID for navigation
   */
  showContactPicker(variableId, containerId) {
    this.state.contactPickerTarget = { variableId, containerId };

    const contacts = this.getSavedContacts();
    const recentContacts = this.getRecentContacts();

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'sv-modal-overlay';
    modal.id = 'sv-contact-picker-modal';
    modal.innerHTML = `
      <div class="sv-modal">
        <div class="sv-modal-header">
          <h3>Select Contact</h3>
          <button class="sv-modal-close" onclick="SmartVariables.closeContactPicker()">×</button>
        </div>
        <div class="sv-modal-search">
          <input type="text" class="sv-input" placeholder="Search by name, company, or email..."
                 oninput="SmartVariables.filterContactPicker(this.value)">
        </div>
        <div class="sv-modal-body" id="sv-contact-picker-list" role="listbox" aria-label="Contact selection">
          ${recentContacts.length > 0 ? `
            <div class="sv-picker-section">
              <div class="sv-picker-label">Recent</div>
              ${recentContacts.map(contact => this.renderContactPickerItem(contact)).join('')}
            </div>
          ` : ''}
          <div class="sv-picker-section">
            <div class="sv-picker-label">All Contacts (${contacts.length})</div>
            ${contacts.length > 0 ?
              contacts.map(contact => this.renderContactPickerItem(contact)).join('') :
              '<div class="sv-picker-empty">No saved contacts yet. Click "+ Add New Contact" below to create one.</div>'
            }
          </div>
        </div>
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactPicker()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.showProfileEditor('${this.safeId(containerId)}'); SmartVariables.closeContactPicker();">
            + Add New Contact
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Keyboard shortcut: Escape to close
    this._pickerEscapeHandler = (event) => {
      if (event.key === 'Escape') this.closeContactPicker();
    };
    document.addEventListener('keydown', this._pickerEscapeHandler);
  },

  /**
   * Render a single contact picker item with optional search highlighting.
   * @param {Object} contact - the contact to render
   * @param {string} [highlightQuery=''] - text to highlight in the result
   * @returns {string} HTML string
   */
  renderContactPickerItem(contact, highlightQuery = '') {
    const name = contact.isEntity ? contact.company :
      [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const subtitle = contact.isEntity ?
      (contact.email || '') :
      [contact.company, contact.email].filter(Boolean).join(' \u2022 ');

    const displayName = this._highlightMatch(name || 'Unnamed', highlightQuery);
    const displaySubtitle = subtitle ? this._highlightMatch(subtitle, highlightQuery) : '';

    return `
      <div class="sv-picker-item" role="option" tabindex="0" onclick="SmartVariables.selectContact('${this.safeId(contact.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
        <span class="sv-picker-icon">${contact.isEntity ? '[Co]' : '[P]'}</span>
        <div class="sv-picker-info">
          <div class="sv-picker-name">${displayName}</div>
          ${displaySubtitle ? `<div class="sv-picker-subtitle">${displaySubtitle}</div>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Highlight matching text in a string (case-insensitive). Returns escaped HTML.
   * @param {string} text - the text to search within
   * @param {string} query - the search term to highlight
   * @returns {string} escaped HTML with <mark> tags around matches
   */
  _highlightMatch(text, query) {
    const escaped = this.escapeHtml(text);
    if (!query) return escaped;

    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const matchIndex = textLower.indexOf(queryLower);
    if (matchIndex === -1) return escaped;

    // Re-escape the parts individually to preserve the mark tag
    const before = this.escapeHtml(text.slice(0, matchIndex));
    const match = this.escapeHtml(text.slice(matchIndex, matchIndex + query.length));
    const after = this.escapeHtml(text.slice(matchIndex + query.length));
    return `${before}<mark>${match}</mark>${after}`;
  },

  /**
   * Filter the contact picker list by a search query.
   * @param {string} query - search text
   */
  filterContactPicker(query) {
    const filtered = this.searchContacts(query);
    const list = document.getElementById('sv-contact-picker-list');
    if (!list) return;

    list.innerHTML = `
      <div class="sv-picker-section">
        <div class="sv-picker-label">${query ? 'Search Results' : 'All Contacts'} (${filtered.length})</div>
        ${filtered.length > 0 ?
          filtered.map(contact => this.renderContactPickerItem(contact, query)).join('') :
          `<div class="sv-picker-empty">${query ? 'No contacts match your search. Try a different term.' : 'No saved contacts yet.'}</div>`
        }
      </div>
    `;
  },

  /**
   * Select a contact from picker
   */
  selectContact(contactId) {
    const contact = this.getSavedContacts().find(saved => saved.id === contactId);
    if (!contact || !this.state.contactPickerTarget) return;

    const { variableId, containerId, asParty, role } = this.state.contactPickerTarget;

    // If selecting as party, add to party list
    if (asParty) {
      let parties = this.state.values[variableId] || [];
      if (!Array.isArray(parties)) parties = parties ? [parties] : [];

      parties.push({
        id: `party-${Date.now()}`,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        company: contact.company || '',
        isEntity: contact.isEntity || false,
        role: role,
        email: contact.email || '',
        address: contact.address || {},
        represented: true
      });

      this.state.values[variableId] = parties;
    } else {
      // Set the contact value directly
      this.state.values[variableId] = { ...contact };
    }

    this.processDerivations(variableId);
    this.validateAll();
    this.addToRecentContacts(contact);

    this.closeContactPicker();
    this.renderForm(containerId);

    toast(`Selected "${contact.firstName || contact.company}"`, 'success');
  },

  /** Close the contact picker modal and clean up event listeners. */
  closeContactPicker() {
    const modal = document.getElementById('sv-contact-picker-modal');
    if (modal) modal.remove();
    this.state.contactPickerTarget = null;
    // Clean up Escape key handler
    if (this._pickerEscapeHandler) {
      document.removeEventListener('keydown', this._pickerEscapeHandler);
      this._pickerEscapeHandler = null;
    }
  },

  /**
   * Save a party as a reusable contact in the user's profile.
   * @param {string} variableId - the party variable ID
   * @param {number} index - party index in the array
   * @param {string} containerId - DOM container ID (unused)
   */
  addContactFromParty(variableId, index, containerId) {
    const parties = this.state.values[variableId] || [];
    const party = parties[index];
    if (!party) return;

    // Save as contact
    const contact = this.saveContact({
      ...party,
      id: `contact-${Date.now()}`
    });

    toast(`Saved "${party.firstName || party.company}" to contacts`, 'success');
  },

  /**
   * Show party picker modal (select a contact to add as plaintiff/defendant).
   * @param {string} variableId - the party variable ID to add to
   * @param {string} role - 'plaintiff' or 'defendant'
   * @param {string} containerId - DOM container ID for navigation
   */
  showPartyPicker(variableId, role, containerId) {
    this.state.contactPickerTarget = { variableId, containerId, asParty: true, role };

    const contacts = this.getSavedContacts();

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'sv-modal-overlay';
    modal.id = 'sv-contact-picker-modal';
    modal.innerHTML = `
      <div class="sv-modal">
        <div class="sv-modal-header">
          <h3>Add ${role === 'plaintiff' ? 'Plaintiff' : 'Defendant'} from Contacts</h3>
          <button class="sv-modal-close" onclick="SmartVariables.closeContactPicker()">×</button>
        </div>
        <div class="sv-modal-search">
          <input type="text" class="sv-input" placeholder="Search by name, company, or email..."
                 oninput="SmartVariables.filterContactPicker(this.value)">
        </div>
        <div class="sv-modal-body" id="sv-contact-picker-list">
          <div class="sv-picker-section">
            <div class="sv-picker-label">Saved Contacts (${contacts.length})</div>
            ${contacts.length > 0 ?
              contacts.map(contact => this.renderContactPickerItem(contact)).join('') :
              '<div class="sv-picker-empty">No saved contacts yet. Click "+ Add Manually Instead" below.</div>'
            }
          </div>
        </div>
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactPicker()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.addManualParty('${this.safeId(variableId)}', '${this.safeId(role)}', '${this.safeId(containerId)}')">
            + Add Manually Instead
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Keyboard shortcut: Escape to close
    this._pickerEscapeHandler = (event) => {
      if (event.key === 'Escape') this.closeContactPicker();
    };
    document.addEventListener('keydown', this._pickerEscapeHandler);
  },

  /**
   * Close the picker and add an empty party entry for manual data entry.
   * @param {string} variableId - the party variable ID
   * @param {string} role - 'plaintiff' or 'defendant'
   * @param {string} containerId - DOM container ID
   */
  addManualParty(variableId, role, containerId) {
    this.closeContactPicker();
    this.addParty(variableId, role, containerId);
  },

  // ============================================================================
  // CONTACTS MANAGER
  // ============================================================================

  /**
   * Show the full Contacts Manager modal with search, add, edit, delete.
   * @param {string} containerId - DOM container ID (for context)
   */
  showContactsManager(containerId) {
    const modal = document.createElement('div');
    modal.className = 'sv-modal-overlay';
    modal.id = 'sv-contacts-manager-modal';

    modal.innerHTML = this.renderContactsManagerContent();
    document.body.appendChild(modal);

    // Focus search input
    setTimeout(() => {
      const searchInput = document.getElementById('sv-contacts-search');
      if (searchInput) searchInput.focus();
    }, 100);

    // Keyboard shortcut: Escape to close
    this._managerEscapeHandler = (event) => {
      if (event.key === 'Escape') this.closeContactsManager();
    };
    document.addEventListener('keydown', this._managerEscapeHandler);
  },

  /**
   * Render the contacts manager modal body with sections and cards.
   * @param {string} [searchQuery=''] - optional filter query
   * @returns {string} HTML string for the full modal
   */
  renderContactsManagerContent(searchQuery = '') {
    const allContacts = this.getSavedContacts();
    const recentContacts = this.getRecentContacts();
    const filteredContacts = searchQuery ? this.searchContacts(searchQuery) : allContacts;

    return `
      <div class="sv-modal sv-contacts-manager">
        <div class="sv-modal-header">
          <h3>Contacts Manager</h3>
          <button class="sv-modal-close" onclick="SmartVariables.closeContactsManager()">×</button>
        </div>

        <div class="sv-contacts-toolbar">
          <div class="sv-contacts-search-wrapper">
            <input type="text"
                   class="sv-input sv-contacts-search"
                   id="sv-contacts-search"
                   placeholder="Search by name, company, email..."
                   value="${searchQuery}"
                   oninput="SmartVariables.handleContactsSearchDebounced(this.value)">
            <span class="sv-search-icon"></span>
          </div>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.showAddContactForm()">
            + Add Contact
          </button>
        </div>

        <div class="sv-modal-body" id="sv-contacts-list-container">
          ${recentContacts.length > 0 && !searchQuery ? `
            <div class="sv-contacts-section">
              <div class="sv-contacts-section-header">
                <span class="sv-section-icon"></span>
                <span>Recent Contacts</span>
                <span class="sv-section-count">${recentContacts.length}</span>
              </div>
              <div class="sv-contacts-grid">
                ${recentContacts.map(contact => this.renderContactCard(contact, true)).join('')}
              </div>
            </div>
            <div class="sv-contacts-divider"></div>
          ` : ''}

          <div class="sv-contacts-section">
            <div class="sv-contacts-section-header">
              <span class="sv-section-icon"></span>
              <span>${searchQuery ? 'Search Results' : 'All Contacts'}</span>
              <span class="sv-section-count">${filteredContacts.length}</span>
            </div>
            ${filteredContacts.length > 0 ? `
              <div class="sv-contacts-grid">
                ${filteredContacts.map(contact => this.renderContactCard(contact, false)).join('')}
              </div>
            ` : `
              <div class="sv-contacts-empty">
                <div class="sv-empty-icon">${searchQuery ? '' : ''}</div>
                <div class="sv-empty-title">${searchQuery ? 'No contacts found' : 'No contacts yet'}</div>
                <div class="sv-empty-desc">
                  ${searchQuery ?
                    'Try a different search term' :
                    'Add your first contact to get started'
                  }
                </div>
                ${!searchQuery ? `
                  <button class="sv-btn sv-btn-primary" onclick="SmartVariables.showAddContactForm()">
                    + Add Contact
                  </button>
                ` : ''}
              </div>
            `}
          </div>
        </div>

        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactsManager()">Close</button>
        </div>
      </div>
    `;
  },

  /**
   * Render a contact card with avatar, info, and action buttons.
   * @param {Object} contact - the contact to render
   * @param {boolean} [isRecent=false] - whether this is in the Recent section
   * @returns {string} HTML string
   */
  renderContactCard(contact, isRecent = false) {
    const name = contact.isEntity ? contact.company :
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed Contact';
    const subtitle = contact.isEntity ?
      (contact.email || contact.phone || '') :
      [contact.company, contact.email].filter(Boolean).join(' • ');
    const initials = contact.isEntity ? '[Co]' :
      ((contact.firstName?.[0] || '') + (contact.lastName?.[0] || '')).toUpperCase() || '?';

    return `
      <div class="sv-contact-card" data-contact-id="${contact.id}" tabindex="0">
        <div class="sv-contact-avatar ${contact.isEntity ? 'entity' : ''}">${initials}</div>
        <div class="sv-contact-info">
          <div class="sv-contact-name">${this.escapeHtml(name)}</div>
          ${subtitle ? `<div class="sv-contact-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
          ${contact.address?.city ? `<div class="sv-contact-location">${this.escapeHtml(contact.address.city)}${contact.address.state ? `, ${contact.address.state}` : ''}</div>` : ''}
        </div>
        <div class="sv-contact-actions">
          <button class="sv-icon-btn" title="Edit" onclick="SmartVariables.showEditContactForm('${this.safeId(contact.id)}')">Edit</button>
          <button class="sv-icon-btn sv-danger" title="Delete" onclick="SmartVariables.confirmDeleteContact('${this.safeId(contact.id)}')">Delete</button>
        </div>
      </div>
    `;
  },

  /**
   * Re-render the contacts manager list filtered by the search query.
   * @param {string} query - search text from the input
   */
  handleContactsSearch(query) {
    const container = document.getElementById('sv-contacts-list-container');
    if (!container) return;

    const content = this.renderContactsManagerContent(query);
    // Extract just the modal body content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const newBody = tempDiv.querySelector('#sv-contacts-list-container');
    if (newBody) {
      container.innerHTML = newBody.innerHTML;
    }
  },

  /**
   * Show the Add Contact form
   */
  showAddContactForm() {
    this.showContactForm(null);
  },

  /**
   * Show the Edit Contact form
   */
  showEditContactForm(contactId) {
    const contact = this.getSavedContacts().find(saved => saved.id === contactId);
    if (!contact) {
      toast('Contact not found', 'error');
      return;
    }
    this.showContactForm(contact);
  },

  /**
   * Show the add/edit contact form modal.
   * @param {Object|null} contact - existing contact to edit, or null for new
   */
  showContactForm(contact) {
    const isEdit = !!contact;
    const data = contact || { firstName: '', lastName: '', company: '', email: '', phone: '', address: {} };

    const formHtml = `
      <div class="sv-modal sv-contact-form-modal">
        <div class="sv-modal-header">
          <h3>${isEdit ? 'Edit Contact' : 'Add Contact'}</h3>
          <button class="sv-modal-close" onclick="SmartVariables.closeContactForm()">×</button>
        </div>

        <div class="sv-modal-body">
          <div class="sv-form-group">
            <label class="sv-checkbox-wrapper">
              <input type="checkbox" id="sv-contact-isEntity" ${data.isEntity ? 'checked' : ''}
                     onchange="SmartVariables.toggleEntityMode()">
              <span>This is a business/entity (not individual)</span>
            </label>
          </div>

          <div id="sv-contact-individual-fields" ${data.isEntity ? 'style="display:none"' : ''}>
            <div class="sv-form-row">
              <div class="sv-form-group">
                <label class="sv-label">First Name</label>
                <input type="text" class="sv-input" id="sv-contact-firstName" value="${this.escapeHtml(data.firstName || '')}" placeholder="John">
              </div>
              <div class="sv-form-group">
                <label class="sv-label">Last Name</label>
                <input type="text" class="sv-input" id="sv-contact-lastName" value="${this.escapeHtml(data.lastName || '')}" placeholder="Smith">
              </div>
            </div>
          </div>

          <div class="sv-form-group">
            <label class="sv-label">${data.isEntity ? 'Entity Name' : 'Company'}</label>
            <input type="text" class="sv-input" id="sv-contact-company" value="${this.escapeHtml(data.company || '')}" placeholder="${data.isEntity ? 'Acme Corporation' : 'Company (optional)'}">
          </div>

          <div class="sv-form-row">
            <div class="sv-form-group">
              <label class="sv-label">Email</label>
              <input type="email" class="sv-input" id="sv-contact-email" value="${this.escapeHtml(data.email || '')}" placeholder="john@example.com">
            </div>
            <div class="sv-form-group">
              <label class="sv-label">Phone</label>
              <input type="tel" class="sv-input" id="sv-contact-phone" value="${this.escapeHtml(data.phone || '')}" placeholder="(555) 123-4567">
            </div>
          </div>

          <div class="sv-form-divider">
            <span>Address</span>
          </div>

          <div class="sv-form-group">
            <label class="sv-label">Street Address</label>
            <input type="text" class="sv-input" id="sv-contact-street" value="${this.escapeHtml(data.address?.street1 || '')}" placeholder="123 Main Street">
          </div>

          <div class="sv-form-group">
            <label class="sv-label">Address Line 2</label>
            <input type="text" class="sv-input" id="sv-contact-street2" value="${this.escapeHtml(data.address?.street2 || '')}" placeholder="Suite 100 (optional)">
          </div>

          <div class="sv-form-row sv-form-row-city">
            <div class="sv-form-group sv-flex-2">
              <label class="sv-label">City</label>
              <input type="text" class="sv-input" id="sv-contact-city" value="${this.escapeHtml(data.address?.city || '')}" placeholder="Boston">
            </div>
            <div class="sv-form-group sv-flex-1">
              <label class="sv-label">State</label>
              <input type="text" class="sv-input" id="sv-contact-state" maxlength="2" value="${this.escapeHtml(data.address?.state || '')}" placeholder="MA">
            </div>
            <div class="sv-form-group sv-flex-1">
              <label class="sv-label">ZIP</label>
              <input type="text" class="sv-input" id="sv-contact-zip" value="${this.escapeHtml(data.address?.zip || '')}" placeholder="02101">
            </div>
          </div>
        </div>

        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactForm()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.saveContactFromForm('${isEdit ? this.safeId(data.id) : ''}')">
            ${isEdit ? 'Save Changes' : '+ Add Contact'}
          </button>
        </div>
      </div>
    `;

    // Create form modal overlay
    let formOverlay = document.getElementById('sv-contact-form-overlay');
    if (!formOverlay) {
      formOverlay = document.createElement('div');
      formOverlay.className = 'sv-modal-overlay sv-form-overlay';
      formOverlay.id = 'sv-contact-form-overlay';
      document.body.appendChild(formOverlay);
    }
    formOverlay.innerHTML = formHtml;
    formOverlay.style.display = 'flex';
  },

  /** Toggle between individual and entity mode in the contact form. */
  toggleEntityMode() {
    const isEntity = document.getElementById('sv-contact-isEntity')?.checked;
    const individualFields = document.getElementById('sv-contact-individual-fields');
    const companyLabel = document.querySelector('#sv-contact-company')?.previousElementSibling;

    if (individualFields) {
      individualFields.style.display = isEntity ? 'none' : 'block';
    }
    if (companyLabel) {
      companyLabel.textContent = isEntity ? 'Entity Name' : 'Company';
    }
  },

  /**
   * Collect form fields and save (or update) the contact.
   * @param {string} existingId - contact ID for updates, or empty string for new
   */
  saveContactFromForm(existingId) {
    const isEntity = document.getElementById('sv-contact-isEntity')?.checked || false;

    const contact = {
      id: existingId || `contact-${Date.now()}`,
      isEntity: isEntity,
      firstName: isEntity ? '' : (document.getElementById('sv-contact-firstName')?.value.trim() || ''),
      lastName: isEntity ? '' : (document.getElementById('sv-contact-lastName')?.value.trim() || ''),
      company: document.getElementById('sv-contact-company')?.value.trim() || '',
      email: document.getElementById('sv-contact-email')?.value.trim() || '',
      phone: document.getElementById('sv-contact-phone')?.value.trim() || '',
      address: {
        street1: document.getElementById('sv-contact-street')?.value.trim() || '',
        street2: document.getElementById('sv-contact-street2')?.value.trim() || '',
        city: document.getElementById('sv-contact-city')?.value.trim() || '',
        state: document.getElementById('sv-contact-state')?.value.trim().toUpperCase() || '',
        zip: document.getElementById('sv-contact-zip')?.value.trim() || ''
      }
    };

    // Validate - need at least a name or company
    if (!contact.firstName && !contact.lastName && !contact.company) {
      toast('Please enter at least a first name, last name, or company name.', 'error');
      return;
    }

    // Save using existing method
    this.saveContact(contact);

    // Close form and refresh manager
    this.closeContactForm();
    this.refreshContactsManager();

    const displayName = contact.isEntity ? contact.company :
      [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    toast(`${existingId ? 'Updated' : 'Added'} contact: ${displayName}`, 'success');
  },

  /** Close the add/edit contact form overlay. */
  closeContactForm() {
    const formOverlay = document.getElementById('sv-contact-form-overlay');
    if (formOverlay) {
      formOverlay.style.display = 'none';
      formOverlay.innerHTML = '';
    }
  },

  /**
   * Show a confirmation dialog before deleting a contact.
   * @param {string} contactId - the contact to delete
   */
  async confirmDeleteContact(contactId) {
    const contact = this.getSavedContacts().find(
      existing => existing.id === contactId
    );
    if (!contact) return;

    const displayName = contact.isEntity ? contact.company :
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'this contact';

    const confirmed = await this.showConfirm(`Delete "${displayName}"? This cannot be undone.`, { confirmText: 'Delete', destructive: true });
    if (confirmed) {
      this.deleteContact(contactId);
      this.refreshContactsManager();
      toast('Contact deleted', 'success');
    }
  },

  /** Refresh the contacts manager list (e.g. after save or delete). */
  refreshContactsManager() {
    const modal = document.getElementById('sv-contacts-manager-modal');
    if (modal) {
      const searchQuery = document.getElementById('sv-contacts-search')?.value || '';
      modal.innerHTML = this.renderContactsManagerContent(searchQuery);
    }
  },

  /** Close the contacts manager modal and clean up event listeners. */
  closeContactsManager() {
    const modal = document.getElementById('sv-contacts-manager-modal');
    if (modal) modal.remove();

    const formOverlay = document.getElementById('sv-contact-form-overlay');
    if (formOverlay) formOverlay.remove();

    // Clean up Escape key handler
    if (this._managerEscapeHandler) {
      document.removeEventListener('keydown', this._managerEscapeHandler);
      this._managerEscapeHandler = null;
    }
  }

});
