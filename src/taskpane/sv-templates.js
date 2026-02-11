/**
 * DraftBridge Gold - Smart Variables: Template Definitions & Import/Export
 *
 * Built-in template definitions, custom template persistence,
 * and import/export functionality.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// H10: Shared court options used by all litigation templates
const DEFAULT_COURT_OPTIONS = [
  { value: 'usdc-ma', label: 'U.S. District Court - Massachusetts' },
  { value: 'usdc-sdny', label: 'U.S. District Court - Southern District of NY' },
  { value: 'usdc-ndca', label: 'U.S. District Court - Northern District of CA' },
  { value: 'usdc-cdca', label: 'U.S. District Court - Central District of CA' },
  { value: 'usdc-edny', label: 'U.S. District Court - Eastern District of NY' },
  { value: 'state-superior', label: 'State Superior Court' },
  { value: 'state-circuit', label: 'State Circuit Court' }
];

Object.assign(SmartVariables, {

  /** Load all built-in templates and merge any custom templates from localStorage. */
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
            config: { options: DEFAULT_COURT_OPTIONS }
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
            defaultValue: null },
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
            config: { options: DEFAULT_COURT_OPTIONS }
          },
          { id: 'caseNumber', name: 'Case Number', type: 'text', required: false, group: 'case', order: 2,
            helpText: 'Leave blank if filing new complaint' },
          { id: 'filingDate', name: 'Filing Date', type: 'date', required: false, group: 'case', order: 3,
            defaultValue: null },

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
            config: { options: DEFAULT_COURT_OPTIONS }
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
            config: { options: DEFAULT_COURT_OPTIONS }
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
  // TEMPLATE IMPORT/EXPORT
  // ============================================================================

  /**
   * Export a template as a downloadable JSON file.
   * @param {string} templateId - the template to export
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
   * Show the template import dialog with drag-and-drop support.
   * @param {string} containerId - DOM container ID to render into
   */
  showImportDialog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="sv-import-dialog">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.showTemplateSelector('${this.safeId(containerId)}')">← Back</button>
          <h3 class="sv-template-title">Import Template</h3>
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
                     onchange="SmartVariables.handleImportFile(this.files[0], '${this.safeId(containerId)}')">
            </label>
          </div>

          <div class="sv-import-preview" id="sv-import-preview" style="display:none;">
            <h4>Template Preview</h4>
            <div class="sv-preview-content" id="sv-preview-content"></div>
            <div class="sv-form-actions">
              <button class="sv-btn sv-btn-secondary" onclick="SmartVariables.cancelImport('${this.safeId(containerId)}')">Cancel</button>
              <button class="sv-btn sv-btn-primary" onclick="SmartVariables.confirmImport('${this.safeId(containerId)}')">Import Template</button>
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

  /**
   * Parse and preview an imported template JSON file.
   * @param {File} file - the uploaded .json file
   * @param {string} containerId - DOM container ID for navigation
   */
  async handleImportFile(file, containerId) {
    if (!file || !file.name.endsWith('.json')) {
      toast('Please select a .json template file', 'error');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate top-level structure
      if (!data.template || !data.template.id || !data.template.name || !data.template.variables) {
        toast('This file does not contain a valid template. Please select a DraftBridge template export (.json).', 'error');
        return;
      }

      // Validate that variables is an array with valid entries
      if (!Array.isArray(data.template.variables)) {
        toast('Template has invalid variables format. Expected an array of variable definitions.', 'error');
        return;
      }

      const allowedTypes = ['text', 'textarea', 'number', 'date', 'checkbox', 'select', 'checkboxGroup', 'contact', 'party'];
      for (let i = 0; i < data.template.variables.length; i++) {
        const v = data.template.variables[i];
        if (!v || typeof v !== 'object') {
          toast(`Invalid variable at position ${i + 1}: must be an object.`, 'error');
          return;
        }
        if (typeof v.id !== 'string' || !v.id.trim()) {
          toast(`Invalid variable at position ${i + 1}: missing or invalid "id" (must be a non-empty string).`, 'error');
          return;
        }
        if (typeof v.name !== 'string' || !v.name.trim()) {
          toast(`Invalid variable at position ${i + 1}: missing or invalid "name" (must be a non-empty string).`, 'error');
          return;
        }
        if (typeof v.type !== 'string' || !allowedTypes.includes(v.type)) {
          toast(`Invalid variable "${v.name || v.id}": unknown type "${v.type}". Allowed types: ${allowedTypes.join(', ')}.`, 'error');
          return;
        }
        // Validate config.options for select and checkboxGroup types
        if ((v.type === 'select' || v.type === 'checkboxGroup') && v.config?.options) {
          if (!Array.isArray(v.config.options)) {
            toast(`Invalid variable "${v.name}": config.options must be an array.`, 'error');
            return;
          }
          for (let j = 0; j < v.config.options.length; j++) {
            const opt = v.config.options[j];
            if (!opt || typeof opt.value !== 'string' || typeof opt.label !== 'string') {
              toast(`Invalid option at position ${j + 1} in "${v.name}": each option must have a string "value" and "label".`, 'error');
              return;
            }
          }
        }
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
          <div class="sv-preview-item"><strong>Name:</strong> ${SmartVariables.escapeHtml(data.template.name)}</div>
          <div class="sv-preview-item"><strong>Description:</strong> ${SmartVariables.escapeHtml(data.template.description || 'No description')}</div>
          <div class="sv-preview-item"><strong>Category:</strong> ${SmartVariables.escapeHtml(data.template.category || 'Uncategorized')}</div>
          <div class="sv-preview-item"><strong>Variables:</strong> ${data.template.variables.length} fields</div>
          ${data.exportDate ? `<div class="sv-preview-item"><strong>Exported:</strong> ${new Date(data.exportDate).toLocaleDateString()}</div>` : ''}
        `;
      }
    } catch (e) {
      console.error('[SmartVariables] Import error:', e);
      toast('Could not read the template file. It may be corrupted or not valid JSON.', 'error');
    }
  },

  /**
   * Cancel the pending import and re-show the import dialog.
   * @param {string} containerId - DOM container ID
   */
  cancelImport(containerId) {
    this._pendingImport = null;
    this.showImportDialog(containerId);
  },

  /**
   * Confirm and complete the pending template import.
   * @param {string} containerId - DOM container ID for navigation
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
   * Delete a custom template (with confirmation). Built-in templates cannot be deleted.
   * @param {string} templateId - template to delete
   * @param {string} containerId - DOM container ID for navigation
   */
  deleteTemplate(templateId, containerId) {
    const template = this.templates[templateId];
    if (!template || !template.isCustom) {
      toast('Cannot delete built-in templates', 'error');
      return;
    }

    this.showConfirm(`Delete "${template.name}"? This cannot be undone.`, { confirmText: 'Delete', destructive: true }).then(confirmed => {
      if (confirmed) {
        delete this.templates[templateId];
        this.saveCustomTemplates();
        toast('Template deleted', 'success');
        this.showTemplateSelector(containerId);
      }
    });
  },

  /** Persist all custom templates to localStorage. */
  saveCustomTemplates() {
    const customTemplates = {};
    Object.entries(this.templates).forEach(([id, template]) => {
      if (template.isCustom) customTemplates[id] = template;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(customTemplates));
    } catch (e) {
      console.error('[SmartVariables] Failed to save custom templates:', e);
    }
  },

  /** Load custom templates from localStorage and merge into the templates map. */
  loadCustomTemplates() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
      if (saved) {
        const custom = JSON.parse(saved);
        Object.assign(this.templates, custom);
        console.log(`[SmartVariables] Loaded ${Object.keys(custom).length} custom templates`);
      }
    } catch (e) {
      console.error('[SmartVariables] Failed to load custom templates:', e);
    }
  },

  /**
   * Get category icon for template display.
   * Returns empty strings intentionally -- icon assets are not yet available.
   * Callers rely on this returning a string; remove only after adding real icons.
   */
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
   * Get unique category labels from all templates for filter chips.
   * @returns {Array<{value: string, label: string}>} category filter options
   */
  getTemplateCategories() {
    const categories = new Map();
    Object.values(this.templates).forEach(tpl => {
      if (tpl.category && !tpl.isCustom) {
        const label = tpl.category.split('/').pop();
        categories.set(tpl.category, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });
    return Array.from(categories, ([value, label]) => ({ value, label }));
  },

  /**
   * Filter templates by search query and/or category.
   * @param {string} query - search text (case-insensitive)
   * @param {string|null} category - category to filter by, or null for all
   * @returns {Array<Object>} filtered template list
   */
  filterTemplates(query, category) {
    let templates = Object.values(this.templates);
    if (category) {
      templates = templates.filter(tpl => tpl.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      templates = templates.filter(tpl =>
        (tpl.name || '').toLowerCase().includes(q) ||
        (tpl.description || '').toLowerCase().includes(q) ||
        (tpl.category || '').toLowerCase().includes(q)
      );
    }
    return templates;
  }

});
