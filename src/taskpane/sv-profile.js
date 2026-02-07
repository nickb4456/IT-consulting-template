/**
 * DraftBridge Gold - Smart Variables: Profile Editor UI
 *
 * User profile editor, signature preview, and profile group toggling.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // PROFILE EDITOR
  // ============================================================================

  /**
   * Show the attorney profile editor form.
   * @param {string} containerId - DOM container ID to render into
   */
  showProfileEditor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const profile = this.userProfile || {};
    const signatureStyles = [
      { value: 'formal', label: 'Formal (Full name with credentials)' },
      { value: 'professional', label: 'Professional (Name and title)' },
      { value: 'simple', label: 'Simple (First and last name)' },
      { value: 'initials', label: 'Initials only' }
    ];

    container.innerHTML = `
      <div class="sv-profile-editor" role="form" aria-label="Attorney profile">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${this.safeId(containerId)}')">← Back to Templates</button>
          <h3 class="sv-template-title">My Profile</h3>
        </div>

        <div class="sv-profile-intro">
          <p>Your profile auto-fills attorney information when creating documents.</p>
        </div>

        <div class="sv-profile-form">
          <!-- Attorney Information -->
          <div class="sv-group">
            <button class="sv-group-header expanded" aria-expanded="true" onclick="SmartVariables.toggleProfileGroup('attorney', '${this.safeId(containerId)}')">
              <span class="sv-group-title">Attorney Information</span>
              <span class="sv-group-arrow">▼</span>
            </button>
            <div class="sv-group-content" id="sv-profile-attorney">
              <div class="sv-variable">
                <label class="sv-label">First Name <span class="sv-required">*</span></label>
                <input type="text" class="sv-input" id="sv-profile-firstName"
                       value="${this.escapeHtml(profile.firstName || '')}"
                       aria-required="true"
                       onchange="SmartVariables.handleProfileChange('firstName', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Last Name <span class="sv-required">*</span></label>
                <input type="text" class="sv-input" id="sv-profile-lastName"
                       value="${this.escapeHtml(profile.lastName || '')}"
                       aria-required="true"
                       onchange="SmartVariables.handleProfileChange('lastName', this.value)">
              </div>
              <div class="sv-variable">
                <div class="sv-contact-row">
                  <div style="flex: 1;">
                    <label class="sv-label">Bar Number</label>
                    <input type="text" class="sv-input" id="sv-profile-barNumber"
                           value="${this.escapeHtml(profile.barNumber || '')}"
                           onchange="SmartVariables.handleProfileChange('barNumber', this.value)">
                  </div>
                  <div style="width: 100px;">
                    <label class="sv-label">State</label>
                    <input type="text" class="sv-input" id="sv-profile-barState"
                           maxlength="2" placeholder="CA"
                           value="${this.escapeHtml(profile.barState || '')}"
                           onchange="SmartVariables.handleProfileChange('barState', this.value.toUpperCase())">
                  </div>
                </div>
              </div>
              <div class="sv-variable">
                <label class="sv-label">Email</label>
                <input type="email" class="sv-input" id="sv-profile-email"
                       value="${this.escapeHtml(profile.email || '')}"
                       onchange="SmartVariables.handleProfileChange('email', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Phone</label>
                <input type="tel" class="sv-input" id="sv-profile-phone"
                       placeholder="(555) 555-5555"
                       value="${this.escapeHtml(profile.phone || '')}"
                       onchange="SmartVariables.handleProfileChange('phone', this.value)">
              </div>
            </div>
          </div>

          <!-- Firm Information -->
          <div class="sv-group">
            <button class="sv-group-header expanded" aria-expanded="true" onclick="SmartVariables.toggleProfileGroup('firm', '${this.safeId(containerId)}')">
              <span class="sv-group-title">Firm Information</span>
              <span class="sv-group-arrow">▼</span>
            </button>
            <div class="sv-group-content" id="sv-profile-firm">
              <div class="sv-variable">
                <label class="sv-label">Firm Name</label>
                <input type="text" class="sv-input" id="sv-profile-firmName"
                       value="${this.escapeHtml(profile.firmName || '')}"
                       onchange="SmartVariables.handleProfileChange('firmName', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Street Address</label>
                <input type="text" class="sv-input" id="sv-profile-firmStreet"
                       value="${this.escapeHtml(profile.firmStreet || '')}"
                       onchange="SmartVariables.handleProfileChange('firmStreet', this.value)">
              </div>
              <div class="sv-variable">
                <div class="sv-contact-row">
                  <div style="flex: 2;">
                    <label class="sv-label">City</label>
                    <input type="text" class="sv-input" id="sv-profile-firmCity"
                           value="${this.escapeHtml(profile.firmCity || '')}"
                           onchange="SmartVariables.handleProfileChange('firmCity', this.value)">
                  </div>
                  <div style="width: 70px;">
                    <label class="sv-label">State</label>
                    <input type="text" class="sv-input" id="sv-profile-firmState"
                           maxlength="2"
                           value="${this.escapeHtml(profile.firmState || '')}"
                           onchange="SmartVariables.handleProfileChange('firmState', this.value.toUpperCase())">
                  </div>
                  <div style="width: 90px;">
                    <label class="sv-label">ZIP</label>
                    <input type="text" class="sv-input" id="sv-profile-firmZip"
                           value="${this.escapeHtml(profile.firmZip || '')}"
                           onchange="SmartVariables.handleProfileChange('firmZip', this.value)">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences -->
          <div class="sv-group">
            <button class="sv-group-header expanded" aria-expanded="true" onclick="SmartVariables.toggleProfileGroup('prefs', '${this.safeId(containerId)}')">
              <span class="sv-group-title">Preferences</span>
              <span class="sv-group-arrow">▼</span>
            </button>
            <div class="sv-group-content" id="sv-profile-prefs">
              <div class="sv-variable">
                <label class="sv-label">Default Signature Style</label>
                <select class="sv-select" id="sv-profile-signatureStyle"
                        onchange="SmartVariables.handleProfileChange('signatureStyle', this.value)">
                  ${signatureStyles.map(s => `
                    <option value="${s.value}" ${profile.signatureStyle === s.value ? 'selected' : ''}>${s.label}</option>
                  `).join('')}
                </select>
              </div>
              ${this.renderSignaturePreview(profile)}
            </div>
          </div>
        </div>

        <div class="sv-form-actions">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.showTemplateSelector('${this.safeId(containerId)}')">
            Cancel
          </button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.saveAndCloseProfile('${this.safeId(containerId)}')">
            Save Profile
          </button>
        </div>
      </div>
    `;

    // Keyboard shortcut: Escape to go back to template selector
    this._profileEscapeHandler = (event) => {
      if (event.key === 'Escape') {
        this.showTemplateSelector(containerId);
        document.removeEventListener('keydown', this._profileEscapeHandler);
      }
    };
    document.addEventListener('keydown', this._profileEscapeHandler);
  },

  /**
   * Render a signature preview based on the current profile and style.
   * @param {Object} profile - user profile object
   * @returns {string} HTML string for the signature preview
   */
  renderSignaturePreview(profile) {
    if (!profile.firstName && !profile.lastName) {
      return '<div class="sv-profile-preview sv-profile-preview-empty">Enter your name to preview signature</div>';
    }

    const style = profile.signatureStyle || 'formal';
    let signature = '';

    const safe = (str) => this.escapeHtml(str || '');

    switch (style) {
      case 'formal':
        signature = `${safe(profile.firstName)} ${safe(profile.lastName)}${profile.barState ? `, Esq.` : ''}`;
        if (profile.barNumber && profile.barState) {
          signature += `<br><span class="sv-sig-detail">${safe(profile.barState)} Bar No. ${safe(profile.barNumber)}</span>`;
        }
        if (profile.firmName) {
          signature += `<br><span class="sv-sig-detail">${safe(profile.firmName)}</span>`;
        }
        break;
      case 'professional':
        signature = `${safe(profile.firstName)} ${safe(profile.lastName)}`;
        if (profile.firmName) {
          signature += `<br><span class="sv-sig-detail">${safe(profile.firmName)}</span>`;
        }
        break;
      case 'simple':
        signature = `${safe(profile.firstName)} ${safe(profile.lastName)}`;
        break;
      case 'initials':
        signature = `${safe((profile.firstName || '')[0])}${safe((profile.lastName || '')[0])}`.toUpperCase();
        break;
    }

    return `
      <div class="sv-profile-preview">
        <div class="sv-preview-label">Signature Preview:</div>
        <div class="sv-signature-preview">${signature}</div>
      </div>
    `;
  },

  /**
   * Toggle a profile section group open/closed.
   * @param {string} groupId - the group identifier (attorney, firm, prefs)
   * @param {string} containerId - DOM container ID (unused, kept for consistency)
   */
  toggleProfileGroup(groupId, containerId) {
    const content = document.getElementById(`sv-profile-${groupId}`);
    const header = content?.previousElementSibling;

    if (content && header) {
      const isExpanded = header.classList.contains('expanded');
      if (isExpanded) {
        header.classList.remove('expanded');
        header.setAttribute('aria-expanded', 'false');
        content.style.display = 'none';
      } else {
        header.classList.add('expanded');
        header.setAttribute('aria-expanded', 'true');
        content.style.display = 'block';
      }
    }
  },

  /**
   * Handle a profile field change and update the signature preview if needed.
   * @param {string} field - profile field name (e.g. 'firstName', 'barNumber')
   * @param {string} value - the new value
   */
  handleProfileChange(field, value) {
    if (!this.userProfile) {
      this.userProfile = {};
    }
    this.userProfile[field] = value;

    // Update signature preview if name or style changed
    if (['firstName', 'lastName', 'signatureStyle', 'barNumber', 'barState', 'firmName'].includes(field)) {
      const prefsContent = document.getElementById('sv-profile-prefs');
      if (prefsContent) {
        const previewEl = prefsContent.querySelector('.sv-profile-preview');
        if (previewEl) {
          previewEl.outerHTML = this.renderSignaturePreview(this.userProfile);
        }
      }
    }
  },

  /**
   * Save profile to localStorage and return to template selector.
   * @param {string} containerId - DOM container ID for navigation
   */
  saveAndCloseProfile(containerId) {
    this.saveUserProfile();
    toast('Profile saved!', 'success');
    this.showTemplateSelector(containerId);
  },

  /**
   * Get profile value for auto-fill
   */
  getProfileValue(key) {
    return this.userProfile?.[key] || '';
  },

  /**
   * Get the formatted multi-line attorney block for document headers.
   * @returns {string} newline-separated attorney info (name, bar, firm, address, contact)
   */
  getAttorneyBlock() {
    const profile = this.userProfile;
    if (!profile) return '';

    const lines = [];
    if (profile.firstName || profile.lastName) {
      lines.push(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
    }
    if (profile.barNumber && profile.barState) {
      lines.push(`${profile.barState} Bar No. ${profile.barNumber}`);
    }
    if (profile.firmName) lines.push(profile.firmName);
    if (profile.firmStreet) lines.push(profile.firmStreet);
    if (profile.firmCity || profile.firmState || profile.firmZip) {
      lines.push(`${profile.firmCity || ''}, ${profile.firmState || ''} ${profile.firmZip || ''}`.trim());
    }
    if (profile.phone) lines.push(`Tel: ${profile.phone}`);
    if (profile.email) lines.push(profile.email);

    return lines.join('\n');
  }

});
