/**
 * DraftBridge Gold - Smart Variables (Vanilla JS)
 * 
 * Lightweight vanilla JS implementation of the Smart Variables UI.
 * Integrates directly with taskpane.html without a build step.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

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

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  init() {
    this.loadUserProfile();
    this.loadCourtsDatabase();
    this.loadRecentContacts();
    this.loadTemplates();
    console.log('[SmartVariables] Initialized');
  },

  loadUserProfile() {
    try {
      const saved = localStorage.getItem('draftbridge_user_profile');
      if (saved) {
        this.userProfile = JSON.parse(saved);
      }
    } catch (e) {
      console.error('[SmartVariables] Failed to load profile:', e);
    }
  },

  saveUserProfile() {
    try {
      localStorage.setItem('draftbridge_user_profile', JSON.stringify(this.userProfile));
    } catch (e) {
      console.error('[SmartVariables] Failed to save profile:', e);
    }
  },

  // ============================================================================
  // COURTS DATABASE
  // ============================================================================

  async loadCourtsDatabase() {
    try {
      // Try to load from external file first
      const response = await fetch('../data/courts.json');
      if (response.ok) {
        const data = await response.json();
        this.courts = data.courts || [];
        this.courtsByState = data.stateIndex || {};
        // Build lookup by ID
        this.courtsById = {};
        this.courts.forEach(c => { this.courtsById[c.id] = c; });
        console.log(`[SmartVariables] Loaded ${this.courts.length} courts from database`);
      }
    } catch (e) {
      console.warn('[SmartVariables] Could not load courts database, using fallback:', e);
      // Fallback to inline courts
      this.courts = [];
    }
  },

  /**
   * Get court options for select dropdown
   * @param {string} filterState - Optional state filter (2-letter code)
   */
  getCourtOptions(filterState = null) {
    let filtered = this.courts;
    if (filterState) {
      const ids = this.courtsByState[filterState] || [];
      filtered = ids.map(id => this.courtsById[id]).filter(Boolean);
    }
    return filtered.map(c => ({
      value: c.id,
      label: `${c.abbreviation} - ${c.city}`
    }));
  },

  /**
   * Get court details by ID
   */
  getCourtById(courtId) {
    return this.courtsById[courtId] || null;
  },

  /**
   * Get court caption for documents
   */
  getCourtCaption(courtId) {
    const court = this.getCourtById(courtId);
    if (!court) return 'UNITED STATES DISTRICT COURT';
    // Extract district from name
    const name = court.name.replace('United States District Court for the ', '').toUpperCase();
    return `UNITED STATES DISTRICT COURT\n${name}`;
  },

  // ============================================================================
  // CONTACTS MANAGEMENT
  // ============================================================================

  /**
   * Get saved contacts from profile
   */
  getSavedContacts() {
    return this.userProfile?.contacts || [];
  },

  /**
   * Save a contact to profile
   */
  saveContact(contact) {
    if (!this.userProfile) this.userProfile = {};
    if (!this.userProfile.contacts) this.userProfile.contacts = [];
    
    // Generate ID if needed
    if (!contact.id) {
      contact.id = `contact-${Date.now()}`;
    }
    
    // Check for duplicate
    const existingIdx = this.userProfile.contacts.findIndex(c => c.id === contact.id);
    if (existingIdx >= 0) {
      this.userProfile.contacts[existingIdx] = contact;
    } else {
      this.userProfile.contacts.push(contact);
    }
    
    this.saveUserProfile();
    this.addToRecentContacts(contact);
    return contact;
  },

  /**
   * Delete a contact from profile
   */
  deleteContact(contactId) {
    if (!this.userProfile?.contacts) return;
    this.userProfile.contacts = this.userProfile.contacts.filter(c => c.id !== contactId);
    this.saveUserProfile();
  },

  /**
   * Search contacts by name, company, or email
   */
  searchContacts(query) {
    const contacts = this.getSavedContacts();
    if (!query) return contacts;
    
    const q = query.toLowerCase();
    return contacts.filter(c => {
      const searchFields = [
        c.firstName, c.lastName, c.company, c.email,
        c.address?.city, c.address?.state
      ].filter(Boolean).join(' ').toLowerCase();
      return searchFields.includes(q);
    });
  },

  /**
   * Load recently used contacts
   */
  loadRecentContacts() {
    try {
      const saved = localStorage.getItem('draftbridge_recent_contacts');
      if (saved) {
        this.recentContacts = JSON.parse(saved);
      }
    } catch (e) {
      this.recentContacts = [];
    }
  },

  /**
   * Add contact to recent list
   */
  addToRecentContacts(contact) {
    // Remove if already exists
    this.recentContacts = this.recentContacts.filter(c => c.id !== contact.id);
    // Add to front
    this.recentContacts.unshift(contact);
    // Keep max 10
    this.recentContacts = this.recentContacts.slice(0, 10);
    // Save
    try {
      localStorage.setItem('draftbridge_recent_contacts', JSON.stringify(this.recentContacts));
    } catch (e) {}
  },

  /**
   * Get recent contacts
   */
  getRecentContacts() {
    return this.recentContacts;
  },

  async loadTemplates() {
    // Built-in templates
    this.templates = {
      // Note: Court options will be dynamically loaded from courts.json
      // Use "court" as special field ID to trigger dynamic loading
      'motion-to-dismiss': {
        id: 'motion-to-dismiss',
        name: 'Motion to Dismiss',
        description: 'Federal Rule 12(b) Motion to Dismiss',
        category: 'litigation/motions',
        variables: [
          { id: 'court', name: 'Court', type: 'select', required: true, group: 'case', order: 1,
            config: { options: [
              { value: 'usdc-ma', label: 'U.S. District Court - Massachusetts' },
              { value: 'usdc-sdny', label: 'U.S. District Court - Southern District of NY' },
              { value: 'usdc-ndca', label: 'U.S. District Court - Northern District of CA' }
            ]}
          },
          { id: 'caseNumber', name: 'Case Number', type: 'text', required: true, group: 'case', order: 2,
            helpText: 'Format: 1:24-cv-01234' },
          { id: 'judge', name: 'Assigned Judge', type: 'text', required: false, group: 'case', order: 3 },
          { id: 'plaintiffs', name: 'Plaintiffs', type: 'party', required: true, group: 'parties', order: 10,
            config: { allowedRoles: ['plaintiff'], minItems: 1 }},
          { id: 'defendants', name: 'Defendants', type: 'party', required: true, group: 'parties', order: 11,
            config: { allowedRoles: ['defendant'], minItems: 1 }},
          { id: 'movingParty', name: 'Moving Party', type: 'text', required: true, group: 'motion', order: 20 },
          { id: 'grounds', name: 'Grounds for Dismissal', type: 'select', required: true, group: 'motion', order: 21,
            config: { options: [
              { value: '12b1', label: 'Lack of Subject Matter Jurisdiction (12(b)(1))' },
              { value: '12b2', label: 'Lack of Personal Jurisdiction (12(b)(2))' },
              { value: '12b3', label: 'Improper Venue (12(b)(3))' },
              { value: '12b6', label: 'Failure to State a Claim (12(b)(6))' }
            ]}
          },
          { id: 'groundsSummary', name: 'Summary of Grounds', type: 'textarea', required: true, group: 'motion', order: 22 },
          { id: 'hearingDate', name: 'Hearing Date', type: 'date', required: false, group: 'motion', order: 30 },
          { id: 'includeExhibits', name: 'Include Exhibits', type: 'checkbox', required: false, group: 'attachments', order: 50 },
          { id: 'includeProofOfService', name: 'Include Proof of Service', type: 'checkbox', required: false, group: 'attachments', order: 60, defaultValue: true }
        ]
      },
      'demand-letter': {
        id: 'demand-letter',
        name: 'Demand Letter',
        description: 'Professional demand letter with customizable tone',
        category: 'correspondence',
        variables: [
          { id: 'recipient', name: 'Recipient', type: 'contact', required: true, group: 'recipient', order: 1 },
          { id: 'date', name: 'Date', type: 'date', required: true, group: 'letter', order: 10,
            defaultValue: new Date().toISOString().split('T')[0] },
          { id: 'subject', name: 'Re: Subject', type: 'text', required: true, group: 'letter', order: 11 },
          { id: 'demandAmount', name: 'Demand Amount', type: 'text', required: false, group: 'letter', order: 20 },
          { id: 'deadline', name: 'Response Deadline', type: 'date', required: false, group: 'letter', order: 21 },
          { id: 'tone', name: 'Tone', type: 'select', required: true, group: 'letter', order: 30,
            config: { options: [
              { value: 'professional', label: 'Professional' },
              { value: 'firm', label: 'Firm' },
              { value: 'aggressive', label: 'Aggressive' }
            ]},
            defaultValue: 'professional'
          },
          { id: 'includeAttachments', name: 'Include Attachments List', type: 'checkbox', required: false, group: 'attachments', order: 40 }
        ]
      },

      'complaint': {
        id: 'complaint',
        name: 'Complaint',
        description: 'Civil complaint with causes of action and damages',
        category: 'litigation',
        variables: [
          // Case Information
          { id: 'court', name: 'Court', type: 'select', required: true, group: 'case', order: 1,
            config: { options: [
              { value: 'usdc-ma', label: 'U.S. District Court - Massachusetts' },
              { value: 'usdc-sdny', label: 'U.S. District Court - Southern District of NY' },
              { value: 'usdc-ndca', label: 'U.S. District Court - Northern District of CA' },
              { value: 'usdc-cdca', label: 'U.S. District Court - Central District of CA' },
              { value: 'usdc-edny', label: 'U.S. District Court - Eastern District of NY' },
              { value: 'state-superior', label: 'State Superior Court' },
              { value: 'state-circuit', label: 'State Circuit Court' }
            ]}
          },
          { id: 'caseNumber', name: 'Case Number', type: 'text', required: false, group: 'case', order: 2,
            helpText: 'Leave blank if filing new complaint' },
          { id: 'filingDate', name: 'Filing Date', type: 'date', required: false, group: 'case', order: 3,
            defaultValue: new Date().toISOString().split('T')[0] },

          // Parties
          { id: 'plaintiffs', name: 'Plaintiffs', type: 'party', required: true, group: 'parties', order: 10,
            config: { allowedRoles: ['plaintiff'], minItems: 1 }},
          { id: 'defendants', name: 'Defendants', type: 'party', required: true, group: 'parties', order: 11,
            config: { allowedRoles: ['defendant'], minItems: 1 }},

          // Substance
          { id: 'causesOfAction', name: 'Causes of Action', type: 'checkboxGroup', required: true, group: 'substance', order: 20,
            helpText: 'Select all applicable causes of action',
            config: { options: [
              { value: 'breach-contract', label: 'Breach of Contract' },
              { value: 'negligence', label: 'Negligence' },
              { value: 'fraud', label: 'Fraud / Misrepresentation' },
              { value: 'unjust-enrichment', label: 'Unjust Enrichment' },
              { value: 'conversion', label: 'Conversion' },
              { value: 'defamation', label: 'Defamation' },
              { value: 'tortious-interference', label: 'Tortious Interference' },
              { value: 'civil-rights', label: 'Civil Rights Violation (§1983)' },
              { value: 'employment-discrimination', label: 'Employment Discrimination' },
              { value: 'products-liability', label: 'Products Liability' }
            ]}
          },
          { id: 'factualAllegations', name: 'Factual Allegations', type: 'textarea', required: true, group: 'substance', order: 21,
            helpText: 'Summary of key factual allegations supporting your claims' },
          { id: 'damagesSought', name: 'Damages Sought', type: 'text', required: true, group: 'substance', order: 22,
            helpText: 'e.g., "in excess of $75,000" or specific amount' },

          // Options
          { id: 'juryDemand', name: 'Jury Demand', type: 'checkbox', required: false, group: 'options', order: 30,
            defaultValue: true },
          { id: 'classAction', name: 'Class Action Complaint', type: 'checkbox', required: false, group: 'options', order: 31 },
          { id: 'requestInjunction', name: 'Request Injunctive Relief', type: 'checkbox', required: false, group: 'options', order: 32 },
          { id: 'includeSummons', name: 'Include Summons', type: 'checkbox', required: false, group: 'options', order: 33, defaultValue: true }
        ]
      },

      'answer-to-complaint': {
        id: 'answer-to-complaint',
        name: 'Answer to Complaint',
        description: 'Defendant\'s answer with admissions, denials, and affirmative defenses',
        category: 'litigation',
        variables: [
          // Case Information
          { id: 'court', name: 'Court', type: 'select', required: true, group: 'case', order: 1,
            config: { options: [
              { value: 'usdc-ma', label: 'U.S. District Court - Massachusetts' },
              { value: 'usdc-sdny', label: 'U.S. District Court - Southern District of NY' },
              { value: 'usdc-ndca', label: 'U.S. District Court - Northern District of CA' },
              { value: 'usdc-cdca', label: 'U.S. District Court - Central District of CA' },
              { value: 'usdc-edny', label: 'U.S. District Court - Eastern District of NY' },
              { value: 'state-superior', label: 'State Superior Court' },
              { value: 'state-circuit', label: 'State Circuit Court' }
            ]}
          },
          { id: 'caseNumber', name: 'Case Number', type: 'text', required: true, group: 'case', order: 2,
            helpText: 'Format: 1:24-cv-01234' },
          { id: 'answerDeadline', name: 'Answer Deadline', type: 'date', required: false, group: 'case', order: 3,
            helpText: 'Date answer is due' },

          // Parties
          { id: 'plaintiffs', name: 'Plaintiffs', type: 'party', required: true, group: 'parties', order: 10,
            config: { allowedRoles: ['plaintiff'], minItems: 1 }},
          { id: 'defendants', name: 'Defendants (Answering)', type: 'party', required: true, group: 'parties', order: 11,
            config: { allowedRoles: ['defendant'], minItems: 1 }},

          // Responses
          { id: 'admissions', name: 'Admissions', type: 'textarea', required: false, group: 'responses', order: 20,
            helpText: 'Paragraphs of the complaint that are admitted (e.g., "Defendant admits paragraphs 1-5...")' },
          { id: 'denials', name: 'Denials', type: 'textarea', required: true, group: 'responses', order: 21,
            helpText: 'Paragraphs of the complaint that are denied (e.g., "Defendant denies paragraphs 6-15...")' },
          { id: 'lackKnowledge', name: 'Lack of Knowledge', type: 'textarea', required: false, group: 'responses', order: 22,
            helpText: 'Paragraphs where defendant lacks sufficient knowledge to admit or deny' },

          // Affirmative Defenses
          { id: 'affirmativeDefenses', name: 'Affirmative Defenses', type: 'checkboxGroup', required: false, group: 'defenses', order: 30,
            helpText: 'Select all applicable affirmative defenses',
            config: { options: [
              { value: 'statute-limitations', label: 'Statute of Limitations' },
              { value: 'failure-state-claim', label: 'Failure to State a Claim' },
              { value: 'lack-standing', label: 'Lack of Standing' },
              { value: 'estoppel', label: 'Estoppel' },
              { value: 'waiver', label: 'Waiver' },
              { value: 'laches', label: 'Laches' },
              { value: 'unclean-hands', label: 'Unclean Hands' },
              { value: 'comparative-negligence', label: 'Comparative/Contributory Negligence' },
              { value: 'assumption-risk', label: 'Assumption of Risk' },
              { value: 'accord-satisfaction', label: 'Accord and Satisfaction' },
              { value: 'res-judicata', label: 'Res Judicata' },
              { value: 'collateral-estoppel', label: 'Collateral Estoppel' },
              { value: 'failure-mitigate', label: 'Failure to Mitigate Damages' },
              { value: 'release', label: 'Release' }
            ]}
          },

          // Counterclaim Options
          { id: 'includeCounterclaim', name: 'Include Counterclaim', type: 'checkbox', required: false, group: 'counterclaim', order: 40 },
          { id: 'counterclaim', name: 'Counterclaim Details', type: 'textarea', required: false, group: 'counterclaim', order: 41,
            helpText: 'Describe the counterclaim if applicable' },
          { id: 'juryDemand', name: 'Jury Demand', type: 'checkbox', required: false, group: 'counterclaim', order: 42 }
        ]
      },

      'discovery-request': {
        id: 'discovery-request',
        name: 'Discovery Request',
        description: 'Interrogatories, Requests for Production, or Requests for Admission',
        category: 'litigation/discovery',
        variables: [
          // Case Information
          { id: 'court', name: 'Court', type: 'select', required: true, group: 'case', order: 1,
            config: { options: [
              { value: 'usdc-ma', label: 'U.S. District Court - Massachusetts' },
              { value: 'usdc-sdny', label: 'U.S. District Court - Southern District of NY' },
              { value: 'usdc-ndca', label: 'U.S. District Court - Northern District of CA' },
              { value: 'usdc-cdca', label: 'U.S. District Court - Central District of CA' },
              { value: 'usdc-edny', label: 'U.S. District Court - Eastern District of NY' },
              { value: 'state-superior', label: 'State Superior Court' },
              { value: 'state-circuit', label: 'State Circuit Court' }
            ]}
          },
          { id: 'caseNumber', name: 'Case Number', type: 'text', required: true, group: 'case', order: 2,
            helpText: 'Format: 1:24-cv-01234' },
          { id: 'setNumber', name: 'Set Number', type: 'text', required: false, group: 'case', order: 3,
            helpText: 'e.g., "First", "Second"', defaultValue: 'First' },

          // Parties
          { id: 'requestingParty', name: 'Requesting Party', type: 'text', required: true, group: 'parties', order: 10,
            helpText: 'Party propounding the discovery' },
          { id: 'respondingParty', name: 'Responding Party', type: 'text', required: true, group: 'parties', order: 11,
            helpText: 'Party who must respond' },

          // Discovery Type
          { id: 'discoveryType', name: 'Discovery Type', type: 'select', required: true, group: 'discovery', order: 20,
            config: { options: [
              { value: 'interrogatories', label: 'Interrogatories (Written Questions)' },
              { value: 'rfp', label: 'Requests for Production (Documents)' },
              { value: 'rfa', label: 'Requests for Admission (Admit/Deny)' },
              { value: 'combined', label: 'Combined Discovery Requests' }
            ]}
          },
          { id: 'responseDeadline', name: 'Response Deadline', type: 'date', required: false, group: 'discovery', order: 21,
            helpText: 'Usually 30 days from service in federal court' },

          // Content
          { id: 'definitions', name: 'Definitions', type: 'textarea', required: false, group: 'content', order: 30,
            helpText: 'Define key terms used in requests (e.g., "DOCUMENT," "COMMUNICATION," relevant time periods)' },
          { id: 'instructions', name: 'Instructions', type: 'textarea', required: false, group: 'content', order: 31,
            helpText: 'Standard instructions for responding to discovery' },
          { id: 'requests', name: 'Discovery Requests', type: 'textarea', required: true, group: 'content', order: 32,
            helpText: 'Enter each request on a new line, numbered (1., 2., etc.)' },

          // Options
          { id: 'includePrelimStatement', name: 'Include Preliminary Statement', type: 'checkbox', required: false, group: 'options', order: 40, defaultValue: true },
          { id: 'includeDefinitions', name: 'Include Standard Definitions', type: 'checkbox', required: false, group: 'options', order: 41, defaultValue: true },
          { id: 'includeInstructions', name: 'Include Standard Instructions', type: 'checkbox', required: false, group: 'options', order: 42, defaultValue: true },
          { id: 'includeCertificateOfService', name: 'Include Certificate of Service', type: 'checkbox', required: false, group: 'options', order: 43, defaultValue: true }
        ]
      }
    };
    
    // Load custom templates from localStorage
    this.loadCustomTemplates();
  },

  // ============================================================================
  // UI RENDERING
  // ============================================================================

  /**
   * Show template selector
   */
  showTemplateSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const templateList = Object.values(this.templates);
    const hasProfile = this.userProfile?.firstName || this.userProfile?.lastName;
    const customTemplates = templateList.filter(t => t.isCustom);
    const builtInTemplates = templateList.filter(t => !t.isCustom);
    
    container.innerHTML = `
      <div class="sv-template-selector">
        <div class="sv-selector-header">
          <h3 class="sv-section-title">Smart Templates</h3>
          <div class="sv-header-actions">
            <button class="sv-icon-btn" title="Import Template" onclick="SmartVariables.showImportDialog('${containerId}')">
              Import
            </button>
            <button class="sv-profile-btn ${hasProfile ? 'has-profile' : ''}" 
                    onclick="SmartVariables.showProfileEditor('${containerId}')">
              My Profile
            </button>
          </div>
        </div>
        <p class="sv-description">Choose a template to get started with intelligent auto-fill.</p>
        <div class="sv-template-grid">
          ${builtInTemplates.map(t => `
            <div class="sv-template-card" onclick="SmartVariables.selectTemplate('${t.id}', '${containerId}')">
              <div class="sv-template-icon">${this.getCategoryIcon(t.category)}</div>
              <div class="sv-template-info">
                <div class="sv-template-name">${t.name}</div>
                <div class="sv-template-desc">${t.description || ''}</div>
              </div>
              <div class="sv-template-actions">
                <button class="sv-mini-btn" title="Export" onclick="event.stopPropagation(); SmartVariables.exportTemplate('${t.id}')">Export</button>
                <span class="sv-template-arrow">→</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${customTemplates.length > 0 ? `
          <div class="sv-custom-templates">
            <h4 class="sv-subsection-title">My Custom Templates</h4>
            <div class="sv-template-grid">
              ${customTemplates.map(t => `
                <div class="sv-template-card custom" onclick="SmartVariables.selectTemplate('${t.id}', '${containerId}')">
                  <div class="sv-template-icon">${this.getCategoryIcon(t.category)}</div>
                  <div class="sv-template-info">
                    <div class="sv-template-name">${t.name}</div>
                    <div class="sv-template-desc">${t.description || ''}</div>
                  </div>
                  <div class="sv-template-actions">
                    <button class="sv-mini-btn" title="Export" onclick="event.stopPropagation(); SmartVariables.exportTemplate('${t.id}')">Export</button>
                    <button class="sv-mini-btn danger" title="Delete" onclick="event.stopPropagation(); SmartVariables.deleteTemplate('${t.id}', '${containerId}')">Delete</button>
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

  getCategoryIcon(category) {
    const icons = {
      'litigation/motions': '',
      'litigation': '',
      'litigation/discovery': '',
      'correspondence': '',
      'agreements': '',
      'discovery': ''
    };
    return icons[category] || '';
  },

  /**
   * Show profile editor
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
      <div class="sv-profile-editor">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${containerId}')">← Back to Templates</button>
          <h3 class="sv-template-title">My Profile</h3>
        </div>
        
        <div class="sv-profile-intro">
          <p>Your profile auto-fills attorney information when creating documents.</p>
        </div>
        
        <div class="sv-profile-form">
          <!-- Attorney Information -->
          <div class="sv-group">
            <button class="sv-group-header expanded" onclick="SmartVariables.toggleProfileGroup('attorney', '${containerId}')">
              <span class="sv-group-title">Attorney Information</span>
              <span class="sv-group-arrow">▼</span>
            </button>
            <div class="sv-group-content" id="sv-profile-attorney">
              <div class="sv-variable">
                <label class="sv-label">First Name <span class="sv-required">*</span></label>
                <input type="text" class="sv-input" id="sv-profile-firstName" 
                       value="${profile.firstName || ''}"
                       onchange="SmartVariables.handleProfileChange('firstName', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Last Name <span class="sv-required">*</span></label>
                <input type="text" class="sv-input" id="sv-profile-lastName" 
                       value="${profile.lastName || ''}"
                       onchange="SmartVariables.handleProfileChange('lastName', this.value)">
              </div>
              <div class="sv-variable">
                <div class="sv-contact-row">
                  <div style="flex: 1;">
                    <label class="sv-label">Bar Number</label>
                    <input type="text" class="sv-input" id="sv-profile-barNumber" 
                           value="${profile.barNumber || ''}"
                           onchange="SmartVariables.handleProfileChange('barNumber', this.value)">
                  </div>
                  <div style="width: 100px;">
                    <label class="sv-label">State</label>
                    <input type="text" class="sv-input" id="sv-profile-barState" 
                           maxlength="2" placeholder="CA"
                           value="${profile.barState || ''}"
                           onchange="SmartVariables.handleProfileChange('barState', this.value.toUpperCase())">
                  </div>
                </div>
              </div>
              <div class="sv-variable">
                <label class="sv-label">Email</label>
                <input type="email" class="sv-input" id="sv-profile-email" 
                       value="${profile.email || ''}"
                       onchange="SmartVariables.handleProfileChange('email', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Phone</label>
                <input type="tel" class="sv-input" id="sv-profile-phone" 
                       placeholder="(555) 555-5555"
                       value="${profile.phone || ''}"
                       onchange="SmartVariables.handleProfileChange('phone', this.value)">
              </div>
            </div>
          </div>
          
          <!-- Firm Information -->
          <div class="sv-group">
            <button class="sv-group-header expanded" onclick="SmartVariables.toggleProfileGroup('firm', '${containerId}')">
              <span class="sv-group-title">Firm Information</span>
              <span class="sv-group-arrow">▼</span>
            </button>
            <div class="sv-group-content" id="sv-profile-firm">
              <div class="sv-variable">
                <label class="sv-label">Firm Name</label>
                <input type="text" class="sv-input" id="sv-profile-firmName" 
                       value="${profile.firmName || ''}"
                       onchange="SmartVariables.handleProfileChange('firmName', this.value)">
              </div>
              <div class="sv-variable">
                <label class="sv-label">Street Address</label>
                <input type="text" class="sv-input" id="sv-profile-firmStreet" 
                       value="${profile.firmStreet || ''}"
                       onchange="SmartVariables.handleProfileChange('firmStreet', this.value)">
              </div>
              <div class="sv-variable">
                <div class="sv-contact-row">
                  <div style="flex: 2;">
                    <label class="sv-label">City</label>
                    <input type="text" class="sv-input" id="sv-profile-firmCity" 
                           value="${profile.firmCity || ''}"
                           onchange="SmartVariables.handleProfileChange('firmCity', this.value)">
                  </div>
                  <div style="width: 70px;">
                    <label class="sv-label">State</label>
                    <input type="text" class="sv-input" id="sv-profile-firmState" 
                           maxlength="2"
                           value="${profile.firmState || ''}"
                           onchange="SmartVariables.handleProfileChange('firmState', this.value.toUpperCase())">
                  </div>
                  <div style="width: 90px;">
                    <label class="sv-label">ZIP</label>
                    <input type="text" class="sv-input" id="sv-profile-firmZip" 
                           value="${profile.firmZip || ''}"
                           onchange="SmartVariables.handleProfileChange('firmZip', this.value)">
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Preferences -->
          <div class="sv-group">
            <button class="sv-group-header expanded" onclick="SmartVariables.toggleProfileGroup('prefs', '${containerId}')">
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
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.showTemplateSelector('${containerId}')">
            Cancel
          </button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.saveAndCloseProfile('${containerId}')">
            Save Profile
          </button>
        </div>
      </div>
    `;
  },

  renderSignaturePreview(profile) {
    if (!profile.firstName && !profile.lastName) {
      return '<div class="sv-profile-preview sv-profile-preview-empty">Enter your name to preview signature</div>';
    }

    const style = profile.signatureStyle || 'formal';
    let signature = '';

    switch (style) {
      case 'formal':
        signature = `${profile.firstName || ''} ${profile.lastName || ''}${profile.barState ? `, Esq.` : ''}`;
        if (profile.barNumber && profile.barState) {
          signature += `<br><span class="sv-sig-detail">${profile.barState} Bar No. ${profile.barNumber}</span>`;
        }
        if (profile.firmName) {
          signature += `<br><span class="sv-sig-detail">${profile.firmName}</span>`;
        }
        break;
      case 'professional':
        signature = `${profile.firstName || ''} ${profile.lastName || ''}`;
        if (profile.firmName) {
          signature += `<br><span class="sv-sig-detail">${profile.firmName}</span>`;
        }
        break;
      case 'simple':
        signature = `${profile.firstName || ''} ${profile.lastName || ''}`;
        break;
      case 'initials':
        signature = `${(profile.firstName || '')[0] || ''}${(profile.lastName || '')[0] || ''}`.toUpperCase();
        break;
    }

    return `
      <div class="sv-profile-preview">
        <div class="sv-preview-label">Signature Preview:</div>
        <div class="sv-signature-preview">${signature}</div>
      </div>
    `;
  },

  toggleProfileGroup(groupId, containerId) {
    const content = document.getElementById(`sv-profile-${groupId}`);
    const header = content?.previousElementSibling;
    
    if (content && header) {
      const isExpanded = header.classList.contains('expanded');
      if (isExpanded) {
        header.classList.remove('expanded');
        content.style.display = 'none';
      } else {
        header.classList.add('expanded');
        content.style.display = 'block';
      }
    }
  },

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

  saveAndCloseProfile(containerId) {
    this.saveUserProfile();
    toast('Profile saved!', 'success');
    this.showTemplateSelector(containerId);
  },

  // ============================================================================
  // TEMPLATE IMPORT/EXPORT
  // ============================================================================

  /**
   * Export a template as JSON file
   */
  exportTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      toast('Template not found', 'error');
      return;
    }

    // Create export package
    const exportData = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        variables: template.variables,
        isCustom: true // Mark as custom when imported elsewhere
      }
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast(`Exported "${template.name}"`, 'success');
  },

  /**
   * Show import dialog
   */
  showImportDialog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="sv-import-dialog">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${containerId}')">← Back</button>
          <h3 class="sv-template-title">Import Import Template</h3>
        </div>
        
        <div class="sv-import-content">
          <p class="sv-description">Import a template JSON file shared by another user or firm.</p>
          
          <div class="sv-drop-zone" id="sv-drop-zone">
            <div class="sv-drop-icon"></div>
            <div class="sv-drop-text">Drag & drop template file here</div>
            <div class="sv-drop-or">or</div>
            <label class="sv-btn sv-btn-secondary">
              Browse Files
              <input type="file" accept=".json" style="display:none" 
                     onchange="SmartVariables.handleImportFile(this.files[0], '${containerId}')">
            </label>
          </div>
          
          <div class="sv-import-preview" id="sv-import-preview" style="display:none;">
            <h4>Template Preview</h4>
            <div class="sv-preview-content" id="sv-preview-content"></div>
            <div class="sv-form-actions">
              <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.cancelImport('${containerId}')">Cancel</button>
              <button class="sv-btn sv-btn-primary" onclick="SmartVariables.confirmImport('${containerId}')">Import Template</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup drag/drop handlers
    const dropZone = document.getElementById('sv-drop-zone');
    if (dropZone) {
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragging'); };
      dropZone.ondragleave = () => { dropZone.classList.remove('dragging'); };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) this.handleImportFile(file, containerId);
      };
    }
  },

  // Pending import data
  _pendingImport: null,

  /**
   * Handle imported file
   */
  async handleImportFile(file, containerId) {
    if (!file || !file.name.endsWith('.json')) {
      toast('Please select a JSON file', 'error');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.template || !data.template.id || !data.template.name || !data.template.variables) {
        toast('Invalid template file format', 'error');
        return;
      }

      // Store pending import
      this._pendingImport = data.template;

      // Show preview
      const preview = document.getElementById('sv-import-preview');
      const content = document.getElementById('sv-preview-content');
      const dropZone = document.getElementById('sv-drop-zone');
      
      if (preview && content && dropZone) {
        dropZone.style.display = 'none';
        preview.style.display = 'block';
        content.innerHTML = `
          <div class="sv-preview-item"><strong>Name:</strong> ${data.template.name}</div>
          <div class="sv-preview-item"><strong>Description:</strong> ${data.template.description || 'No description'}</div>
          <div class="sv-preview-item"><strong>Category:</strong> ${data.template.category || 'Uncategorized'}</div>
          <div class="sv-preview-item"><strong>Variables:</strong> ${data.template.variables.length} fields</div>
          ${data.exportDate ? `<div class="sv-preview-item"><strong>Exported:</strong> ${new Date(data.exportDate).toLocaleDateString()}</div>` : ''}
        `;
      }
    } catch (e) {
      console.error('[SmartVariables] Import error:', e);
      toast('Failed to parse template file', 'error');
    }
  },

  /**
   * Cancel import
   */
  cancelImport(containerId) {
    this._pendingImport = null;
    this.showImportDialog(containerId);
  },

  /**
   * Confirm and complete import
   */
  confirmImport(containerId) {
    if (!this._pendingImport) return;

    const template = this._pendingImport;
    
    // Check for ID collision
    if (this.templates[template.id] && !this.templates[template.id].isCustom) {
      // Built-in template - create new ID
      template.id = `custom-${template.id}-${Date.now()}`;
    }

    // Mark as custom
    template.isCustom = true;

    // Add to templates
    this.templates[template.id] = template;
    
    // Save custom templates
    this.saveCustomTemplates();

    this._pendingImport = null;
    toast(`Imported "${template.name}"`, 'success');
    this.showTemplateSelector(containerId);
  },

  /**
   * Delete a custom template
   */
  deleteTemplate(templateId, containerId) {
    const template = this.templates[templateId];
    if (!template || !template.isCustom) {
      toast('Cannot delete built-in templates', 'error');
      return;
    }

    if (confirm(`Delete "${template.name}"? This cannot be undone.`)) {
      delete this.templates[templateId];
      this.saveCustomTemplates();
      toast('Template deleted', 'success');
      this.showTemplateSelector(containerId);
    }
  },

  /**
   * Save custom templates to localStorage
   */
  saveCustomTemplates() {
    const customTemplates = {};
    Object.entries(this.templates).forEach(([id, t]) => {
      if (t.isCustom) customTemplates[id] = t;
    });
    try {
      localStorage.setItem('draftbridge_custom_templates', JSON.stringify(customTemplates));
    } catch (e) {
      console.error('[SmartVariables] Failed to save custom templates:', e);
    }
  },

  /**
   * Load custom templates from localStorage
   */
  loadCustomTemplates() {
    try {
      const saved = localStorage.getItem('draftbridge_custom_templates');
      if (saved) {
        const custom = JSON.parse(saved);
        Object.assign(this.templates, custom);
        console.log(`[SmartVariables] Loaded ${Object.keys(custom).length} custom templates`);
      }
    } catch (e) {
      console.error('[SmartVariables] Failed to load custom templates:', e);
    }
  },

  // ============================================================================
  // CONTACT PICKER
  // ============================================================================

  /**
   * Show contact picker modal
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
          <input type="text" class="sv-input" placeholder="Search contacts..." 
                 oninput="SmartVariables.filterContactPicker(this.value)">
        </div>
        <div class="sv-modal-body" id="sv-contact-picker-list">
          ${recentContacts.length > 0 ? `
            <div class="sv-picker-section">
              <div class="sv-picker-label">Recent</div>
              ${recentContacts.map(c => this.renderContactPickerItem(c)).join('')}
            </div>
          ` : ''}
          <div class="sv-picker-section">
            <div class="sv-picker-label">All Contacts (${contacts.length})</div>
            ${contacts.length > 0 ? 
              contacts.map(c => this.renderContactPickerItem(c)).join('') :
              '<div class="sv-picker-empty">No saved contacts. Add contacts in your profile.</div>'
            }
          </div>
        </div>
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactPicker()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.showProfileEditor('${containerId}'); SmartVariables.closeContactPicker();">
            + Add New Contact
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  /**
   * Render a contact picker item
   */
  renderContactPickerItem(contact) {
    const name = contact.isEntity ? contact.company : 
      [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const subtitle = contact.isEntity ? 
      (contact.email || '') : 
      [contact.company, contact.email].filter(Boolean).join(' • ');
    
    return `
      <div class="sv-picker-item" onclick="SmartVariables.selectContact('${contact.id}')">
        <span class="sv-picker-icon">${contact.isEntity ? '[Co]' : '[P]'}</span>
        <div class="sv-picker-info">
          <div class="sv-picker-name">${name || 'Unnamed'}</div>
          ${subtitle ? `<div class="sv-picker-subtitle">${subtitle}</div>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Filter contact picker by search query
   */
  filterContactPicker(query) {
    const filtered = this.searchContacts(query);
    const list = document.getElementById('sv-contact-picker-list');
    if (!list) return;
    
    list.innerHTML = `
      <div class="sv-picker-section">
        <div class="sv-picker-label">Search Results (${filtered.length})</div>
        ${filtered.length > 0 ? 
          filtered.map(c => this.renderContactPickerItem(c)).join('') :
          '<div class="sv-picker-empty">No matching contacts found.</div>'
        }
      </div>
    `;
  },

  /**
   * Select a contact from picker
   */
  selectContact(contactId) {
    const contact = this.getSavedContacts().find(c => c.id === contactId);
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

  /**
   * Close contact picker
   */
  closeContactPicker() {
    const modal = document.getElementById('sv-contact-picker-modal');
    if (modal) modal.remove();
    this.state.contactPickerTarget = null;
  },

  /**
   * Add contact from party input
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
   * Show party picker (for selecting from saved contacts)
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
          <input type="text" class="sv-input" placeholder="Search contacts..." 
                 oninput="SmartVariables.filterContactPicker(this.value)">
        </div>
        <div class="sv-modal-body" id="sv-contact-picker-list">
          <div class="sv-picker-section">
            <div class="sv-picker-label">Saved Contacts (${contacts.length})</div>
            ${contacts.length > 0 ? 
              contacts.map(c => this.renderContactPickerItem(c)).join('') :
              '<div class="sv-picker-empty">No saved contacts.</div>'
            }
          </div>
        </div>
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactPicker()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.addManualParty('${variableId}', '${role}', '${containerId}')">
            + Add Manually Instead
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  /**
   * Add manual party (close picker and add empty)
   */
  addManualParty(variableId, role, containerId) {
    this.closeContactPicker();
    this.addParty(variableId, role, containerId);
  },

  /**
   * Override selectContact for party mode
   */
  _selectContactOriginal: null,

  /**
   * Get profile value for auto-fill
   */
  getProfileValue(key) {
    return this.userProfile?.[key] || '';
  },

  /**
   * Get formatted attorney block
   */
  getAttorneyBlock() {
    const p = this.userProfile;
    if (!p) return '';
    
    const lines = [];
    if (p.firstName || p.lastName) {
      lines.push(`${p.firstName || ''} ${p.lastName || ''}`.trim());
    }
    if (p.barNumber && p.barState) {
      lines.push(`${p.barState} Bar No. ${p.barNumber}`);
    }
    if (p.firmName) lines.push(p.firmName);
    if (p.firmStreet) lines.push(p.firmStreet);
    if (p.firmCity || p.firmState || p.firmZip) {
      lines.push(`${p.firmCity || ''}, ${p.firmState || ''} ${p.firmZip || ''}`.trim());
    }
    if (p.phone) lines.push(`Tel: ${p.phone}`);
    if (p.email) lines.push(p.email);
    
    return lines.join('\n');
  },

  /**
   * Select and render a template
   */
  selectTemplate(templateId, containerId) {
    const template = this.templates[templateId];
    if (!template) return;

    this.state.template = template;
    this.state.values = {};
    this.state.derivedValues = {};
    this.state.errors = {};

    // Apply defaults
    template.variables.forEach(v => {
      if (v.defaultValue !== undefined) {
        this.state.values[v.id] = v.defaultValue;
      }
    });

    // Auto-fill from profile
    if (this.userProfile) {
      const p = this.userProfile;
      
      // Auto-fill moving party with attorney name for motions
      if (template.category?.includes('litigation') && template.variables.find(v => v.id === 'movingParty')) {
        if (p.firstName || p.lastName) {
          // Don't auto-fill movingParty - that's the client, not attorney
        }
      }
      
      // Store profile for use in document generation
      this.state.derivedValues['attorney.name'] = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      this.state.derivedValues['attorney.barInfo'] = p.barNumber && p.barState 
        ? `${p.barState} Bar No. ${p.barNumber}` 
        : '';
      this.state.derivedValues['attorney.firm'] = p.firmName || '';
      this.state.derivedValues['attorney.email'] = p.email || '';
      this.state.derivedValues['attorney.phone'] = p.phone || '';
      this.state.derivedValues['attorney.address'] = [
        p.firmStreet,
        `${p.firmCity || ''}, ${p.firmState || ''} ${p.firmZip || ''}`.trim()
      ].filter(Boolean).join('\n');
      this.state.derivedValues['attorney.block'] = this.getAttorneyBlock();
    }

    this.renderForm(containerId);
  },

  /**
   * Render the variable form
   */
  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !this.state.template) return;

    const template = this.state.template;
    const groups = this.groupVariables(template.variables);
    const isValid = this.validateAll();

    container.innerHTML = `
      <div class="sv-form">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${containerId}')">← Back</button>
          <h3 class="sv-template-title">${template.name}</h3>
        </div>
        
        ${!isValid ? `
          <div class="sv-validation-warning">
            • ${Object.keys(this.state.errors).length} required field(s) need attention
          </div>
        ` : ''}
        
        ${Object.entries(groups).map(([group, vars]) => this.renderGroup(group, vars, containerId)).join('')}
        
        <div class="sv-form-actions">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.showTemplateSelector('${containerId}')">
            Cancel
          </button>
          <button class="sv-btn sv-btn-primary ${!isValid ? 'disabled' : ''}" 
                  onclick="SmartVariables.generateDocument()" ${!isValid ? 'disabled' : ''}>
            ${isValid ? 'Generate Document' : 'Complete Required Fields'}
          </button>
        </div>
      </div>
    `;
  },

  groupVariables(variables) {
    const groups = {};
    variables.forEach(v => {
      const group = v.group || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(v);
    });
    // Sort within groups
    Object.values(groups).forEach(g => g.sort((a, b) => (a.order || 0) - (b.order || 0)));
    return groups;
  },

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

    return `
      <div class="sv-group">
        <button class="sv-group-header ${isExpanded ? 'expanded' : ''}" 
                onclick="SmartVariables.toggleGroup('${groupId}', '${containerId}')">
          <span class="sv-group-title">${titles[groupId] || groupId}</span>
          <span class="sv-group-count">${variables.length}</span>
          <span class="sv-group-arrow">▼</span>
        </button>
        ${isExpanded ? `
          <div class="sv-group-content">
            ${variables.map(v => this.renderVariable(v, containerId)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  toggleGroup(groupId, containerId) {
    if (this.state.expandedGroups.has(groupId)) {
      this.state.expandedGroups.delete(groupId);
    } else {
      this.state.expandedGroups.add(groupId);
    }
    this.renderForm(containerId);
  },

  renderVariable(variable, containerId) {
    const value = this.state.values[variable.id];
    const error = this.state.errors[variable.id];
    const derived = this.state.derivedValues[variable.id];

    return `
      <div class="sv-variable ${error ? 'has-error' : ''}">
        <label class="sv-label" for="sv-${variable.id}">
          ${variable.name}
          ${variable.required ? '<span class="sv-required">*</span>' : ''}
        </label>
        ${variable.helpText ? `<p class="sv-help">${variable.helpText}</p>` : ''}
        <div class="sv-control">
          ${this.renderInput(variable, value, containerId)}
        </div>
        ${error ? `<p class="sv-error">${error}</p>` : ''}
        ${derived ? `<div class="sv-derived">${derived}</div>` : ''}
      </div>
    `;
  },

  renderInput(variable, value, containerId) {
    const id = `sv-${variable.id}`;
    const onChange = `SmartVariables.handleChange('${variable.id}', this.value, '${containerId}')`;

    switch (variable.type) {
      case 'text':
        return `<input type="text" id="${id}" class="sv-input" value="${value || ''}" onchange="${onChange}" onkeyup="${onChange}">`;
      
      case 'textarea':
        return `<textarea id="${id}" class="sv-textarea" onchange="${onChange}" onkeyup="${onChange}">${value || ''}</textarea>`;
      
      case 'number':
        return `<input type="number" id="${id}" class="sv-input" value="${value || ''}" onchange="${onChange}">`;
      
      case 'date':
        return `<input type="date" id="${id}" class="sv-input" value="${value || ''}" onchange="${onChange}">`;
      
      case 'checkbox':
        return `
          <label class="sv-checkbox-wrapper">
            <input type="checkbox" id="${id}" ${value ? 'checked' : ''} 
                   onchange="SmartVariables.handleChange('${variable.id}', this.checked, '${containerId}')">
            <span>${variable.name}</span>
          </label>
        `;
      
      case 'select':
        // Check if this is a court field - use dynamic court database
        if (variable.id === 'court' && this.courts.length > 0) {
          const courtOptions = this.getCourtOptions();
          return `
            <div class="sv-court-select-wrapper">
              <select id="${id}" class="sv-select" onchange="${onChange}">
                <option value="">Select Court...</option>
                ${this.renderCourtOptionsGrouped(value)}
              </select>
              ${value ? `<a class="sv-court-link" href="${this.getCourtById(value)?.filingUrl || '#'}" target="_blank" title="Open ECF Filing">ECF Link</a>` : ''}
            </div>
          `;
        }
        const options = variable.config?.options || [];
        return `
          <select id="${id}" class="sv-select" onchange="${onChange}">
            <option value="">Select...</option>
            ${options.map(o => `
              <option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>
            `).join('')}
          </select>
        `;
      
      case 'checkboxGroup':
        const groupOptions = variable.config?.options || [];
        const selectedValues = Array.isArray(value) ? value : [];
        return `
          <div class="sv-checkbox-group" id="${id}">
            ${groupOptions.map(o => `
              <label class="sv-checkbox-wrapper">
                <input type="checkbox" value="${o.value}" ${selectedValues.includes(o.value) ? 'checked' : ''}
                       onchange="SmartVariables.handleCheckboxGroupChange('${variable.id}', '${o.value}', this.checked, '${containerId}')">
                <span>${o.label}</span>
              </label>
            `).join('')}
          </div>
        `;
      
      case 'contact':
        return this.renderContactInput(variable, value, containerId);
      
      case 'party':
        return this.renderPartyInput(variable, value, containerId);
      
      default:
        return `<input type="text" id="${id}" class="sv-input" value="${value || ''}" onchange="${onChange}">`;
    }
  },

  /**
   * Render court options grouped by state
   */
  renderCourtOptionsGrouped(selectedValue) {
    // Group courts by state
    const states = [...new Set(this.courts.map(c => c.state))].sort();
    const stateNames = {
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
    };
    
    return states.map(state => {
      const stateCourts = this.courts.filter(c => c.state === state);
      return `
        <optgroup label="${stateNames[state] || state}">
          ${stateCourts.map(c => `
            <option value="${c.id}" ${selectedValue === c.id ? 'selected' : ''}>${c.abbreviation} - ${c.city}</option>
          `).join('')}
        </optgroup>
      `;
    }).join('');
  },

  renderContactInput(variable, value, containerId) {
    const contact = value || { firstName: '', lastName: '', company: '', email: '' };
    const prefix = `sv-${variable.id}`;
    const hasContacts = this.getSavedContacts().length > 0;
    
    return `
      <div class="sv-contact-input">
        <div class="sv-contact-header">
          <button class="sv-contacts-btn" onclick="SmartVariables.showContactPicker('${variable.id}', '${containerId}')" title="Select from contacts">
            Contacts
          </button>
        </div>
        <div class="sv-contact-row">
          <input type="text" placeholder="First Name" value="${contact.firstName || ''}"
                 onchange="SmartVariables.handleContactChange('${variable.id}', 'firstName', this.value, '${containerId}')">
          <input type="text" placeholder="Last Name" value="${contact.lastName || ''}"
                 onchange="SmartVariables.handleContactChange('${variable.id}', 'lastName', this.value, '${containerId}')">
        </div>
        <input type="text" placeholder="Company" value="${contact.company || ''}"
               onchange="SmartVariables.handleContactChange('${variable.id}', 'company', this.value, '${containerId}')">
        <input type="email" placeholder="Email" value="${contact.email || ''}"
               onchange="SmartVariables.handleContactChange('${variable.id}', 'email', this.value, '${containerId}')">
        <input type="text" placeholder="Address" value="${contact.address?.street1 || ''}"
               onchange="SmartVariables.handleContactChange('${variable.id}', 'street1', this.value, '${containerId}')">
        <div class="sv-contact-row">
          <input type="text" placeholder="City" value="${contact.address?.city || ''}"
                 onchange="SmartVariables.handleContactChange('${variable.id}', 'city', this.value, '${containerId}')">
          <input type="text" placeholder="State" maxlength="2" style="width:60px" value="${contact.address?.state || ''}"
                 onchange="SmartVariables.handleContactChange('${variable.id}', 'state', this.value.toUpperCase(), '${containerId}')">
          <input type="text" placeholder="ZIP" style="width:80px" value="${contact.address?.zip || ''}"
                 onchange="SmartVariables.handleContactChange('${variable.id}', 'zip', this.value, '${containerId}')">
        </div>
        ${this.renderContactPreview(contact)}
      </div>
    `;
  },

  renderContactPreview(contact) {
    if (!contact.firstName && !contact.lastName) return '';
    
    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const salutation = contact.lastName ? `Dear ${contact.prefix || 'Mr./Ms.'} ${contact.lastName}:` : '';
    
    return `
      <div class="sv-contact-preview">
        <div><strong>Name:</strong> ${fullName}</div>
        ${salutation ? `<div><strong>Salutation:</strong> ${salutation}</div>` : ''}
      </div>
    `;
  },

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
              <span class="sv-party-name">${party.isEntity ? (party.company || 'Entity') : ([party.firstName, party.lastName].filter(Boolean).join(' ') || 'Individual')}</span>
              <div class="sv-party-actions">
                <button class="sv-mini-btn" title="Save to Contacts" onclick="SmartVariables.addContactFromParty('${variable.id}', ${idx}, '${containerId}')">Save</button>
                <button class="sv-party-remove" onclick="SmartVariables.removeParty('${variable.id}', ${idx}, '${containerId}')">×</button>
              </div>
            </div>
            <div class="sv-party-form">
              <label class="sv-checkbox-wrapper">
                <input type="checkbox" ${party.isEntity ? 'checked' : ''}
                       onchange="SmartVariables.handlePartyChange('${variable.id}', ${idx}, 'isEntity', this.checked, '${containerId}')">
                <span>Entity (Corporation/LLC)</span>
              </label>
              ${party.isEntity ? `
                <input type="text" placeholder="Entity Name" value="${party.company || ''}"
                       onchange="SmartVariables.handlePartyChange('${variable.id}', ${idx}, 'company', this.value, '${containerId}')">
              ` : `
                <div class="sv-contact-row">
                  <input type="text" placeholder="First Name" value="${party.firstName || ''}"
                         onchange="SmartVariables.handlePartyChange('${variable.id}', ${idx}, 'firstName', this.value, '${containerId}')">
                  <input type="text" placeholder="Last Name" value="${party.lastName || ''}"
                         onchange="SmartVariables.handlePartyChange('${variable.id}', ${idx}, 'lastName', this.value, '${containerId}')">
                </div>
              `}
            </div>
          </div>
        `).join('')}
        <div class="sv-party-add-actions">
          <button class="sv-add-party-btn" onclick="SmartVariables.addParty('${variable.id}', '${allowedRoles[0]}', '${containerId}')">
            + Add ${roleLabel}
          </button>
          ${hasContacts ? `
            <button class="sv-contacts-btn" onclick="SmartVariables.showPartyPicker('${variable.id}', '${allowedRoles[0]}', '${containerId}')" title="Add from contacts">
              From Contacts
            </button>
          ` : ''}
        </div>
        ${parties.length > 0 ? this.renderCaptionPreview(parties, allowedRoles[0]) : ''}
      </div>
    `;
  },

  renderCaptionPreview(parties, role) {
    const names = parties.map(p => {
      if (p.isEntity) return (p.company || 'ENTITY').toUpperCase();
      return [p.firstName, p.lastName].filter(Boolean).join(' ').toUpperCase() || 'PARTY';
    });
    
    const display = names.length > 1 ? `${names[0]}, et al.` : names[0];
    
    return `
      <div class="sv-caption-preview">
        <div class="sv-caption-party">${display},</div>
        <div class="sv-caption-role">${role === 'plaintiff' ? 'Plaintiff(s)' : 'Defendant(s)'}.</div>
      </div>
    `;
  },

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  handleChange(variableId, value, containerId) {
    this.state.values[variableId] = value;
    this.processDerivations(variableId);
    this.validateAll();
    // Don't re-render on every keystroke for text - only on blur or explicit change
  },

  handleCheckboxGroupChange(variableId, optionValue, isChecked, containerId) {
    let currentValues = this.state.values[variableId] || [];
    if (!Array.isArray(currentValues)) currentValues = [];

    if (isChecked) {
      if (!currentValues.includes(optionValue)) {
        currentValues.push(optionValue);
      }
    } else {
      currentValues = currentValues.filter(v => v !== optionValue);
    }

    this.state.values[variableId] = currentValues;
    this.processDerivations(variableId);
    this.validateAll();
  },

  handleContactChange(variableId, field, value, containerId) {
    const contact = this.state.values[variableId] || { firstName: '', lastName: '' };
    
    if (field === 'street1' || field === 'city' || field === 'state' || field === 'zip') {
      contact.address = contact.address || {};
      contact.address[field] = value;
    } else {
      contact[field] = value;
    }
    
    this.state.values[variableId] = contact;
    this.processDerivations(variableId);
    this.validateAll();
    this.renderForm(containerId);
  },

  handlePartyChange(variableId, index, field, value, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) parties = [parties];
    
    if (parties[index]) {
      parties[index][field] = value;
    }
    
    this.state.values[variableId] = parties;
    this.processDerivations(variableId);
    this.validateAll();
    this.renderForm(containerId);
  },

  addParty(variableId, role, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) parties = parties ? [parties] : [];
    
    parties.push({
      id: `party-${Date.now()}`,
      firstName: '',
      lastName: '',
      role: role,
      isEntity: false,
      represented: true
    });
    
    this.state.values[variableId] = parties;
    this.renderForm(containerId);
  },

  removeParty(variableId, index, containerId) {
    let parties = this.state.values[variableId] || [];
    if (!Array.isArray(parties)) return;
    
    parties.splice(index, 1);
    this.state.values[variableId] = parties;
    this.renderForm(containerId);
  },

  // ============================================================================
  // VALIDATION
  // ============================================================================

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

  processDerivations(variableId) {
    const value = this.state.values[variableId];
    const variable = this.state.template?.variables.find(v => v.id === variableId);
    
    if (!variable) return;
    
    if (variable.type === 'contact' && value) {
      const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ');
      this.state.derivedValues[`${variableId}.fullName`] = fullName;
      this.state.derivedValues[`${variableId}.salutation`] = value.lastName 
        ? `Dear ${value.prefix || 'Mr./Ms.'} ${value.lastName}:` 
        : '';
    }
    
    if (variable.type === 'party' && Array.isArray(value)) {
      const names = value.map(p => {
        if (p.isEntity) return (p.company || '').toUpperCase();
        return [p.firstName, p.lastName].filter(Boolean).join(' ').toUpperCase();
      }).filter(Boolean);
      
      this.state.derivedValues[`${variableId}.names`] = names.join(', ');
      this.state.derivedValues[`${variableId}.namesEtAl`] = names.length > 1 
        ? `${names[0]}, et al.` 
        : names[0] || '';
    }
  },

  // ============================================================================
  // DOCUMENT GENERATION
  // ============================================================================

  async generateDocument() {
    if (!this.validateAll()) {
      toast('Please complete all required fields', 'error');
      return;
    }

    const template = this.state.template;
    const values = this.state.values;
    const derived = this.state.derivedValues;

    try {
      // Show generating state
      toast('Generating document...', 'info');

      console.log('[SmartVariables] Generating with:', { template: template.id, values, derived });

      // Call Office.js to insert content
      await this.insertIntoDocument(template, values, derived);

      toast(`${template.name} generated successfully!`, 'success');
      
    } catch (error) {
      console.error('[SmartVariables] Generation failed:', error);
      toast('Failed to generate document: ' + error.message, 'error');
    }
  },

  /**
   * Build document content based on template type
   */
  buildDocumentContent(template, values, derived) {
    switch (template.id) {
      case 'motion-to-dismiss':
        return this.buildMotionContent(template, values, derived);
      case 'demand-letter':
        return this.buildLetterContent(template, values, derived);
      case 'complaint':
        return this.buildComplaintContent(template, values, derived);
      case 'answer-to-complaint':
        return this.buildAnswerContent(template, values, derived);
      case 'discovery-request':
        return this.buildDiscoveryContent(template, values, derived);
      default:
        return this.buildGenericContent(template, values, derived);
    }
  },

  /**
   * Build Motion to Dismiss content
   */
  buildMotionContent(template, values, derived) {
    const sections = [];
    
    // Court caption - use dynamic court database
    sections.push({
      text: this.getCourtCaption(values.court),
      style: 'caption'
    });
    
    // Case caption with parties
    const plaintiffNames = derived['plaintiffs.namesEtAl'] || 'PLAINTIFFS';
    const defendantNames = derived['defendants.namesEtAl'] || 'DEFENDANTS';
    
    sections.push({
      text: `${plaintiffNames},\n\tPlaintiff(s),\n\nv.\n\n${defendantNames},\n\tDefendant(s).`,
      style: 'caption'
    });
    
    // Case number
    if (values.caseNumber) {
      sections.push({
        text: `Case No. ${values.caseNumber}`,
        style: 'caption'
      });
    }
    
    // Motion title
    const groundsLabels = {
      '12b1': 'LACK OF SUBJECT MATTER JURISDICTION',
      '12b2': 'LACK OF PERSONAL JURISDICTION',
      '12b3': 'IMPROPER VENUE',
      '12b6': 'FAILURE TO STATE A CLAIM'
    };
    const groundsLabel = groundsLabels[values.grounds] || 'DISMISS';
    
    sections.push({
      text: `\nMOTION TO DISMISS FOR ${groundsLabel}`,
      style: 'title'
    });
    
    // Introduction
    sections.push({
      text: `\n\tDefendant ${values.movingParty || 'Moving Party'}, by and through undersigned counsel, respectfully moves this Court pursuant to Federal Rule of Civil Procedure 12(b) to dismiss the Complaint. In support thereof, Defendant states as follows:`,
      style: 'body'
    });
    
    // Grounds summary
    if (values.groundsSummary) {
      sections.push({
        text: `\nI.\tINTRODUCTION AND SUMMARY OF ARGUMENT`,
        style: 'heading'
      });
      sections.push({
        text: `\n\t${values.groundsSummary}`,
        style: 'body'
      });
    }
    
    // Closing
    sections.push({
      text: `\nWHEREFORE, Defendant respectfully requests that this Court grant its Motion to Dismiss and dismiss the Complaint with prejudice.`,
      style: 'body'
    });
    
    // Signature block
    sections.push({
      text: `\n\nRespectfully submitted,\n\n\n_______________________________\nCounsel for Defendant`,
      style: 'signature'
    });
    
    // Date
    sections.push({
      text: `\nDated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      style: 'body'
    });
    
    return sections;
  },

  /**
   * Build Demand Letter content
   */
  buildLetterContent(template, values, derived) {
    const sections = [];
    const recipient = values.recipient || {};
    
    // Date
    if (values.date) {
      const date = new Date(values.date);
      sections.push({
        text: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        style: 'body'
      });
    }
    
    // Recipient address block
    const recipientName = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ');
    let addressBlock = '';
    if (recipientName) addressBlock += recipientName + '\n';
    if (recipient.company) addressBlock += recipient.company + '\n';
    if (recipient.address?.street1) addressBlock += recipient.address.street1 + '\n';
    if (recipient.address?.city || recipient.address?.state || recipient.address?.zip) {
      addressBlock += [recipient.address.city, recipient.address.state].filter(Boolean).join(', ');
      if (recipient.address.zip) addressBlock += ' ' + recipient.address.zip;
    }
    
    if (addressBlock.trim()) {
      sections.push({
        text: '\n' + addressBlock.trim(),
        style: 'body'
      });
    }
    
    // Subject line
    if (values.subject) {
      sections.push({
        text: `\nRe: ${values.subject}`,
        style: 'subject'
      });
    }
    
    // Salutation
    const salutation = derived['recipient.salutation'] || (recipient.lastName ? `Dear ${recipient.lastName}:` : 'Dear Sir or Madam:');
    sections.push({
      text: '\n' + salutation,
      style: 'body'
    });
    
    // Demand paragraph based on tone
    const toneIntros = {
      professional: 'We are writing to you regarding the above-referenced matter.',
      firm: 'This letter serves as formal notice regarding the above-referenced matter.',
      aggressive: 'PLEASE TAKE NOTICE that this letter constitutes a formal demand regarding the above-referenced matter.'
    };
    sections.push({
      text: '\n\t' + (toneIntros[values.tone] || toneIntros.professional),
      style: 'body'
    });
    
    // Demand amount if present
    if (values.demandAmount) {
      sections.push({
        text: `\n\tWe demand payment in the amount of ${values.demandAmount}.`,
        style: 'body'
      });
    }
    
    // Deadline if present
    if (values.deadline) {
      const deadline = new Date(values.deadline);
      const deadlineStr = deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      sections.push({
        text: `\n\tPlease respond to this demand no later than ${deadlineStr}.`,
        style: 'body'
      });
    }
    
    // Closing
    const closings = {
      professional: 'We look forward to resolving this matter amicably.',
      firm: 'Your prompt attention to this matter is expected.',
      aggressive: 'Govern yourself accordingly.'
    };
    sections.push({
      text: '\n\t' + (closings[values.tone] || closings.professional),
      style: 'body'
    });
    
    // Signature
    sections.push({
      text: '\n\nSincerely,\n\n\n_______________________________',
      style: 'signature'
    });
    
    return sections;
  },

  /**
   * Build Complaint content
   */
  buildComplaintContent(template, values, derived) {
    const sections = [];
    
    // Court caption - use dynamic court database
    sections.push({
      text: this.getCourtCaption(values.court),
      style: 'caption'
    });
    
    // Party caption
    const plaintiffNames = derived['plaintiffs.namesEtAl'] || 'PLAINTIFFS';
    const defendantNames = derived['defendants.namesEtAl'] || 'DEFENDANTS';
    
    sections.push({
      text: `${plaintiffNames},\n\tPlaintiff(s),\n\nv.\n\n${defendantNames},\n\tDefendant(s).`,
      style: 'caption'
    });
    
    // Case number or "CIVIL ACTION"
    sections.push({
      text: values.caseNumber ? `Case No. ${values.caseNumber}` : 'CIVIL ACTION',
      style: 'caption'
    });
    
    // Jury demand
    if (values.juryDemand) {
      sections.push({
        text: 'JURY TRIAL DEMANDED',
        style: 'caption'
      });
    }
    
    // Title
    sections.push({
      text: '\nCOMPLAINT',
      style: 'title'
    });
    
    // Introduction
    sections.push({
      text: '\n\tPlaintiff(s), by and through undersigned counsel, hereby bring this Complaint against Defendant(s) and allege as follows:',
      style: 'body'
    });
    
    // Parties section
    sections.push({
      text: '\nPARTIES',
      style: 'heading'
    });
    
    // Build party descriptions from derived values
    const plaintiffs = values.plaintiffs || [];
    const defendants = values.defendants || [];
    let partyNum = 1;
    
    plaintiffs.forEach(p => {
      const name = p.isEntity ? p.company : [p.firstName, p.lastName].filter(Boolean).join(' ');
      const location = p.address ? [p.address.city, p.address.state].filter(Boolean).join(', ') : '';
      sections.push({
        text: `\n\t${partyNum}.\t${name} is a ${p.isEntity ? 'corporation' : 'citizen'} ${location ? `of ${location}` : ''} and is a Plaintiff in this action.`,
        style: 'body'
      });
      partyNum++;
    });
    
    defendants.forEach(d => {
      const name = d.isEntity ? d.company : [d.firstName, d.lastName].filter(Boolean).join(' ');
      const location = d.address ? [d.address.city, d.address.state].filter(Boolean).join(', ') : '';
      sections.push({
        text: `\n\t${partyNum}.\t${name} is a ${d.isEntity ? 'corporation' : 'citizen'} ${location ? `of ${location}` : ''} and is a Defendant in this action.`,
        style: 'body'
      });
      partyNum++;
    });
    
    // Factual Allegations
    if (values.factualAllegations) {
      sections.push({
        text: '\nFACTUAL ALLEGATIONS',
        style: 'heading'
      });
      sections.push({
        text: '\n\t' + values.factualAllegations.split('\n').map((p, i) => `${partyNum + i}.\t${p}`).join('\n\n\t'),
        style: 'body'
      });
    }
    
    // Causes of Action
    const causesOfAction = values.causesOfAction || [];
    if (causesOfAction.length > 0) {
      causesOfAction.forEach((cause, idx) => {
        const causeLabels = {
          'breach-contract': 'BREACH OF CONTRACT',
          'negligence': 'NEGLIGENCE',
          'fraud': 'FRAUD',
          'breach-fiduciary': 'BREACH OF FIDUCIARY DUTY',
          'unjust-enrichment': 'UNJUST ENRICHMENT',
          'conversion': 'CONVERSION',
          'defamation': 'DEFAMATION'
        };
        sections.push({
          text: `\nCOUNT ${idx + 1}\n${causeLabels[cause] || cause.toUpperCase()}`,
          style: 'heading'
        });
        sections.push({
          text: `\n\tPlaintiff incorporates all preceding paragraphs as if fully set forth herein.\n\n\t[Additional allegations for ${causeLabels[cause] || cause}]`,
          style: 'body'
        });
      });
    }
    
    // Prayer for Relief
    sections.push({
      text: '\nPRAYER FOR RELIEF',
      style: 'heading'
    });
    sections.push({
      text: '\n\tWHEREFORE, Plaintiff(s) respectfully request that this Court enter judgment in their favor and against Defendant(s) as follows:',
      style: 'body'
    });
    
    if (values.damagesSought) {
      sections.push({
        text: `\n\ta.\tCompensatory damages in the amount of ${values.damagesSought};`,
        style: 'body'
      });
    }
    sections.push({
      text: '\n\tb.\tPre-judgment and post-judgment interest;\n\tc.\tCosts of suit and reasonable attorneys\' fees; and\n\td.\tSuch other and further relief as the Court deems just and proper.',
      style: 'body'
    });
    
    // Jury Demand
    if (values.juryDemand) {
      sections.push({
        text: '\nDEMAND FOR JURY TRIAL',
        style: 'heading'
      });
      sections.push({
        text: '\n\tPlaintiff(s) hereby demand a trial by jury on all issues so triable.',
        style: 'body'
      });
    }
    
    // Signature
    sections.push({
      text: '\n\nRespectfully submitted,\n\n\n_______________________________\nCounsel for Plaintiff(s)',
      style: 'signature'
    });
    sections.push({
      text: `\nDated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      style: 'body'
    });
    
    return sections;
  },

  /**
   * Build Answer to Complaint content
   */
  buildAnswerContent(template, values, derived) {
    const sections = [];
    
    // Court caption - use dynamic court database
    sections.push({
      text: this.getCourtCaption(values.court),
      style: 'caption'
    });
    
    // Party caption
    const plaintiffNames = derived['plaintiffs.namesEtAl'] || 'PLAINTIFFS';
    const defendantNames = derived['defendants.namesEtAl'] || 'DEFENDANTS';
    
    sections.push({
      text: `${plaintiffNames},\n\tPlaintiff(s),\n\nv.\n\n${defendantNames},\n\tDefendant(s).`,
      style: 'caption'
    });
    
    // Case number
    sections.push({
      text: `Case No. ${values.caseNumber || '________'}`,
      style: 'caption'
    });
    
    // Title
    const title = values.includeCounterclaim ? 'ANSWER AND COUNTERCLAIM' : 'ANSWER TO COMPLAINT';
    sections.push({
      text: `\n${title}`,
      style: 'title'
    });
    
    // Introduction
    sections.push({
      text: '\n\tDefendant(s), by and through undersigned counsel, hereby answer Plaintiff\'s Complaint as follows:',
      style: 'body'
    });
    
    // Admissions
    if (values.admissions) {
      sections.push({
        text: '\nADMISSIONS',
        style: 'heading'
      });
      sections.push({
        text: '\n\t' + values.admissions,
        style: 'body'
      });
    }
    
    // Denials
    if (values.denials) {
      sections.push({
        text: '\nDENIALS',
        style: 'heading'
      });
      sections.push({
        text: '\n\t' + values.denials,
        style: 'body'
      });
    }
    
    // Affirmative Defenses
    const defenses = values.affirmativeDefenses || [];
    if (defenses.length > 0) {
      sections.push({
        text: '\nAFFIRMATIVE DEFENSES',
        style: 'heading'
      });
      
      const defenseLabels = {
        'statute-limitations': 'Statute of Limitations',
        'laches': 'Laches',
        'waiver': 'Waiver',
        'estoppel': 'Estoppel',
        'failure-mitigate': 'Failure to Mitigate Damages',
        'contributory-negligence': 'Contributory Negligence',
        'assumption-risk': 'Assumption of Risk',
        'accord-satisfaction': 'Accord and Satisfaction',
        'release': 'Release',
        'res-judicata': 'Res Judicata',
        'collateral-estoppel': 'Collateral Estoppel',
        'lack-standing': 'Lack of Standing',
        'failure-state-claim': 'Failure to State a Claim',
        'setoff': 'Setoff'
      };
      
      defenses.forEach((defense, idx) => {
        sections.push({
          text: `\nFIRST AFFIRMATIVE DEFENSE: ${defenseLabels[defense] || defense}`.replace('FIRST', ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH'][idx] || `${idx + 1}TH`),
          style: 'heading'
        });
        sections.push({
          text: `\n\tDefendant asserts the affirmative defense of ${defenseLabels[defense] || defense}.`,
          style: 'body'
        });
      });
    }
    
    // Counterclaim
    if (values.includeCounterclaim && values.counterclaim) {
      sections.push({
        text: '\nCOUNTERCLAIM',
        style: 'heading'
      });
      sections.push({
        text: '\n\tDefendant, by way of counterclaim against Plaintiff, alleges as follows:\n\n\t' + values.counterclaim,
        style: 'body'
      });
    }
    
    // Prayer
    sections.push({
      text: '\nWHEREFORE, Defendant(s) respectfully request that this Court:\n\ta.\tDismiss Plaintiff\'s Complaint with prejudice;\n\tb.\tAward Defendant costs and attorneys\' fees; and\n\tc.\tGrant such other relief as the Court deems just and proper.',
      style: 'body'
    });
    
    // Signature
    sections.push({
      text: '\n\nRespectfully submitted,\n\n\n_______________________________\nCounsel for Defendant(s)',
      style: 'signature'
    });
    sections.push({
      text: `\nDated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      style: 'body'
    });
    
    return sections;
  },

  /**
   * Build Discovery Request content
   */
  buildDiscoveryContent(template, values, derived) {
    const sections = [];
    
    // Court caption
    const courtNames = {
      'usdc-ma': 'UNITED STATES DISTRICT COURT\nDISTRICT OF MASSACHUSETTS',
      'usdc-sdny': 'UNITED STATES DISTRICT COURT\nSOUTHERN DISTRICT OF NEW YORK',
      'usdc-ndca': 'UNITED STATES DISTRICT COURT\nNORTHERN DISTRICT OF CALIFORNIA'
    };
    sections.push({
      text: courtNames[values.court] || 'UNITED STATES DISTRICT COURT',
      style: 'caption'
    });
    
    // Party caption - use requesting/responding party info
    sections.push({
      text: `${values.requestingParty || 'PLAINTIFF'},\n\n\tv.\n\n${values.respondingParty || 'DEFENDANT'}.`,
      style: 'caption'
    });
    
    // Case number
    sections.push({
      text: `Case No. ${values.caseNumber || '________'}`,
      style: 'caption'
    });
    
    // Discovery type title
    const discoveryTitles = {
      'interrogatories': 'INTERROGATORIES TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase(),
      'rfp': 'REQUEST FOR PRODUCTION OF DOCUMENTS TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase(),
      'rfa': 'REQUEST FOR ADMISSIONS TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase()
    };
    sections.push({
      text: `\n${discoveryTitles[values.discoveryType] || 'DISCOVERY REQUESTS'}`,
      style: 'title'
    });
    
    // Propounding party intro
    sections.push({
      text: `\n\t${values.requestingParty || 'Plaintiff'}, pursuant to Federal Rules of Civil Procedure ${values.discoveryType === 'interrogatories' ? '33' : values.discoveryType === 'rfp' ? '34' : '36'}, hereby propounds the following ${values.discoveryType === 'interrogatories' ? 'Interrogatories' : values.discoveryType === 'rfp' ? 'Requests for Production' : 'Requests for Admission'} upon ${values.respondingParty || 'Defendant'}:`,
      style: 'body'
    });
    
    // Definitions
    if (values.definitions) {
      sections.push({
        text: '\nDEFINITIONS',
        style: 'heading'
      });
      sections.push({
        text: '\n\t' + values.definitions,
        style: 'body'
      });
    }
    
    // Instructions based on type
    const instructions = {
      'interrogatories': 'Each Interrogatory shall be answered separately and fully in writing, under oath, within thirty (30) days of service.',
      'rfp': 'Please produce the following documents within thirty (30) days of service of these requests.',
      'rfa': 'Please admit or deny each of the following within thirty (30) days of service. If you cannot admit or deny, state the reasons.'
    };
    sections.push({
      text: '\nINSTRUCTIONS',
      style: 'heading'
    });
    sections.push({
      text: '\n\t' + (instructions[values.discoveryType] || instructions.interrogatories),
      style: 'body'
    });
    
    // Requests
    if (values.requests) {
      const requestLabel = values.discoveryType === 'interrogatories' ? 'INTERROGATORIES' : 
                          values.discoveryType === 'rfp' ? 'REQUESTS FOR PRODUCTION' : 'REQUESTS FOR ADMISSION';
      sections.push({
        text: `\n${requestLabel}`,
        style: 'heading'
      });
      
      // Split by newlines and number each request
      const requestLines = values.requests.split('\n').filter(line => line.trim());
      requestLines.forEach((req, idx) => {
        const prefix = values.discoveryType === 'interrogatories' ? 'INTERROGATORY' :
                      values.discoveryType === 'rfp' ? 'REQUEST' : 'REQUEST FOR ADMISSION';
        sections.push({
          text: `\n${prefix} NO. ${idx + 1}:\t${req.trim()}`,
          style: 'body'
        });
      });
    }
    
    // Signature
    sections.push({
      text: '\n\nRespectfully submitted,\n\n\n_______________________________\nCounsel for ' + (values.requestingParty || 'Plaintiff'),
      style: 'signature'
    });
    sections.push({
      text: `\nDated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      style: 'body'
    });
    
    return sections;
  },

  /**
   * Build generic content for unknown templates
   */
  buildGenericContent(template, values, derived) {
    const sections = [];
    
    sections.push({
      text: template.name.toUpperCase(),
      style: 'title'
    });
    
    // Just output all values
    for (const variable of template.variables) {
      const value = values[variable.id];
      if (value !== undefined && value !== null && value !== '') {
        let displayValue = value;
        if (typeof value === 'object') {
          displayValue = JSON.stringify(value);
        }
        sections.push({
          text: `\n${variable.name}: ${displayValue}`,
          style: 'body'
        });
      }
    }
    
    return sections;
  },

  // ============================================================================
  // CONTACTS MANAGER
  // ============================================================================

  /**
   * Show the full Contacts Manager modal
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
  },

  /**
   * Render the contacts manager content
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
                   oninput="SmartVariables.handleContactsSearch(this.value)">
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
                ${recentContacts.map(c => this.renderContactCard(c, true)).join('')}
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
                ${filteredContacts.map(c => this.renderContactCard(c, false)).join('')}
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
   * Render a single contact card
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
      <div class="sv-contact-card" data-contact-id="${contact.id}">
        <div class="sv-contact-avatar ${contact.isEntity ? 'entity' : ''}">${initials}</div>
        <div class="sv-contact-info">
          <div class="sv-contact-name">${this.escapeHtml(name)}</div>
          ${subtitle ? `<div class="sv-contact-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
          ${contact.address?.city ? `<div class="sv-contact-location">${this.escapeHtml(contact.address.city)}${contact.address.state ? `, ${contact.address.state}` : ''}</div>` : ''}
        </div>
        <div class="sv-contact-actions">
          <button class="sv-icon-btn" title="Edit" onclick="SmartVariables.showEditContactForm('${contact.id}')">Edit</button>
          <button class="sv-icon-btn sv-danger" title="Delete" onclick="SmartVariables.confirmDeleteContact('${contact.id}')">Delete</button>
        </div>
      </div>
    `;
  },

  /**
   * Handle search input
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
    const contact = this.getSavedContacts().find(c => c.id === contactId);
    if (!contact) {
      toast('Contact not found', 'error');
      return;
    }
    this.showContactForm(contact);
  },

  /**
   * Show contact form (add/edit)
   */
  showContactForm(contact) {
    const isEdit = !!contact;
    const c = contact || { firstName: '', lastName: '', company: '', email: '', phone: '', address: {} };
    
    const formHtml = `
      <div class="sv-modal sv-contact-form-modal">
        <div class="sv-modal-header">
          <h3>${isEdit ? 'Edit Contact' : 'Add Contact'}</h3>
          <button class="sv-modal-close" onclick="SmartVariables.closeContactForm()">×</button>
        </div>
        
        <div class="sv-modal-body">
          <div class="sv-form-group">
            <label class="sv-checkbox-wrapper">
              <input type="checkbox" id="sv-contact-isEntity" ${c.isEntity ? 'checked' : ''} 
                     onchange="SmartVariables.toggleEntityMode()">
              <span>This is a business/entity (not individual)</span>
            </label>
          </div>
          
          <div id="sv-contact-individual-fields" ${c.isEntity ? 'style="display:none"' : ''}>
            <div class="sv-form-row">
              <div class="sv-form-group">
                <label class="sv-label">First Name</label>
                <input type="text" class="sv-input" id="sv-contact-firstName" value="${this.escapeHtml(c.firstName || '')}" placeholder="John">
              </div>
              <div class="sv-form-group">
                <label class="sv-label">Last Name</label>
                <input type="text" class="sv-input" id="sv-contact-lastName" value="${this.escapeHtml(c.lastName || '')}" placeholder="Smith">
              </div>
            </div>
          </div>
          
          <div class="sv-form-group">
            <label class="sv-label">${c.isEntity ? 'Entity Name' : 'Company'}</label>
            <input type="text" class="sv-input" id="sv-contact-company" value="${this.escapeHtml(c.company || '')}" placeholder="${c.isEntity ? 'Acme Corporation' : 'Company (optional)'}">
          </div>
          
          <div class="sv-form-row">
            <div class="sv-form-group">
              <label class="sv-label">Email</label>
              <input type="email" class="sv-input" id="sv-contact-email" value="${this.escapeHtml(c.email || '')}" placeholder="john@example.com">
            </div>
            <div class="sv-form-group">
              <label class="sv-label">Phone</label>
              <input type="tel" class="sv-input" id="sv-contact-phone" value="${this.escapeHtml(c.phone || '')}" placeholder="(555) 123-4567">
            </div>
          </div>
          
          <div class="sv-form-divider">
            <span>Address</span>
          </div>
          
          <div class="sv-form-group">
            <label class="sv-label">Street Address</label>
            <input type="text" class="sv-input" id="sv-contact-street" value="${this.escapeHtml(c.address?.street1 || '')}" placeholder="123 Main Street">
          </div>
          
          <div class="sv-form-group">
            <label class="sv-label">Address Line 2</label>
            <input type="text" class="sv-input" id="sv-contact-street2" value="${this.escapeHtml(c.address?.street2 || '')}" placeholder="Suite 100 (optional)">
          </div>
          
          <div class="sv-form-row sv-form-row-city">
            <div class="sv-form-group sv-flex-2">
              <label class="sv-label">City</label>
              <input type="text" class="sv-input" id="sv-contact-city" value="${this.escapeHtml(c.address?.city || '')}" placeholder="Boston">
            </div>
            <div class="sv-form-group sv-flex-1">
              <label class="sv-label">State</label>
              <input type="text" class="sv-input" id="sv-contact-state" maxlength="2" value="${this.escapeHtml(c.address?.state || '')}" placeholder="MA">
            </div>
            <div class="sv-form-group sv-flex-1">
              <label class="sv-label">ZIP</label>
              <input type="text" class="sv-input" id="sv-contact-zip" value="${this.escapeHtml(c.address?.zip || '')}" placeholder="02101">
            </div>
          </div>
        </div>
        
        <div class="sv-modal-footer">
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.closeContactForm()">Cancel</button>
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables.saveContactFromForm('${isEdit ? c.id : ''}')">
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

  /**
   * Toggle entity mode in form
   */
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
   * Save contact from form
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
    
    // Validate - need at least a name
    if (!contact.firstName && !contact.lastName && !contact.company) {
      toast('Please enter a name or company', 'error');
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

  /**
   * Close contact form
   */
  closeContactForm() {
    const formOverlay = document.getElementById('sv-contact-form-overlay');
    if (formOverlay) {
      formOverlay.style.display = 'none';
      formOverlay.innerHTML = '';
    }
  },

  /**
   * Confirm delete contact
   */
  confirmDeleteContact(contactId) {
    const contact = this.getSavedContacts().find(c => c.id === contactId);
    if (!contact) return;
    
    const displayName = contact.isEntity ? contact.company : 
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'this contact';
    
    if (confirm(`Delete "${displayName}"? This cannot be undone.`)) {
      this.deleteContact(contactId);
      this.refreshContactsManager();
      toast('Contact deleted', 'success');
    }
  },

  /**
   * Refresh contacts manager display
   */
  refreshContactsManager() {
    const modal = document.getElementById('sv-contacts-manager-modal');
    if (modal) {
      const searchQuery = document.getElementById('sv-contacts-search')?.value || '';
      modal.innerHTML = this.renderContactsManagerContent(searchQuery);
    }
  },

  /**
   * Close the contacts manager
   */
  closeContactsManager() {
    const modal = document.getElementById('sv-contacts-manager-modal');
    if (modal) modal.remove();
    
    const formOverlay = document.getElementById('sv-contact-form-overlay');
    if (formOverlay) formOverlay.remove();
  },

  /**
   * Escape HTML for safe display
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
   * Insert content into Word document using Office.js
   */
  async insertIntoDocument(template, values, derived) {
    // Build the content sections
    const sections = this.buildDocumentContent(template, values, derived);
    
    // Check if Office.js is available
    if (typeof Word === 'undefined') {
      // Fallback for testing outside Word
      console.log('[SmartVariables] Word API not available. Content preview:');
      sections.forEach(s => console.log(`[${s.style}] ${s.text}`));
      return;
    }

    await Word.run(async (context) => {
      // Get current selection - we'll insert at cursor position
      const selection = context.document.getSelection();
      
      // Insert each section
      for (const section of sections) {
        // Insert the text
        const paragraph = selection.insertParagraph(section.text, Word.InsertLocation.after);
        
        // Apply basic styling based on section type
        switch (section.style) {
          case 'caption':
            paragraph.alignment = Word.Alignment.centered;
            break;
          case 'title':
            paragraph.alignment = Word.Alignment.centered;
            paragraph.font.bold = true;
            paragraph.font.size = 14;
            break;
          case 'heading':
            paragraph.font.bold = true;
            break;
          case 'subject':
            paragraph.font.bold = true;
            paragraph.font.underline = Word.UnderlineType.single;
            break;
          case 'signature':
            // Left aligned, some space above
            paragraph.spaceAfter = 0;
            break;
          case 'body':
          default:
            // Standard body text
            paragraph.alignment = Word.Alignment.left;
            break;
        }
      }
      
      // Sync to apply changes
      await context.sync();
      
      console.log('[SmartVariables] Document content inserted successfully');
    });
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SmartVariables.init());
} else {
  SmartVariables.init();
}
