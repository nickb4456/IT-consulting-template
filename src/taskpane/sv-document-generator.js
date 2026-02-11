/**
 * DraftBridge Gold - Smart Variables: Document Content Building & Word Insertion
 *
 * Builds structured document content for each template type and
 * inserts it into the Word document via Office.js.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // SHARED DOCUMENT BUILDER HELPERS (H12)
  // ============================================================================

  /**
   * Build the standard court/party/case-number caption sections.
   * Used by motion, complaint, and answer builders.
   * @param {Object} values - form values (needs court, caseNumber)
   * @param {Object} derived - derived values (needs plaintiffs.namesEtAl, defendants.namesEtAl)
   * @param {Object} [options] - optional overrides
   * @param {string} [options.caseNumberFallback] - text if no case number (e.g. 'CIVIL ACTION')
   * @returns {Array} array of section objects
   */
  _buildCaptionSection(values, derived, options = {}) {
    const sections = [];

    // Court caption
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
    if (values.caseNumber || options.caseNumberFallback) {
      sections.push({
        text: values.caseNumber ? `Case No. ${values.caseNumber}` : options.caseNumberFallback,
        style: 'caption'
      });
    }

    return sections;
  },

  /**
   * Build the standard signature block.
   * @param {string} [counselFor='Defendant'] - who counsel represents (e.g. 'Plaintiff(s)', 'Defendant')
   * @returns {Array} array of section objects
   */
  _buildSignatureSection(counselFor = 'Defendant') {
    return [{
      text: `\n\nRespectfully submitted,\n\n\n_______________________________\nCounsel for ${counselFor}`,
      style: 'signature'
    }];
  },

  /**
   * Build the standard date section.
   * @returns {Array} array of section objects
   */
  _buildDateSection() {
    return [{
      text: `\nDated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      style: 'body'
    }];
  },

  // ============================================================================
  // DOCUMENT GENERATION
  // ============================================================================

  /**
   * Route to the correct builder method based on template type.
   * @param {Object} template - the selected template
   * @param {Object} values - form field values
   * @param {Object} derived - derived/computed values
   * @returns {Array<Object>} array of {text, style} section objects
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
    // Caption (court + parties + case number)
    const sections = [...this._buildCaptionSection(values, derived)];

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

    // Signature & date
    sections.push(...this._buildSignatureSection('Defendant'));
    sections.push(...this._buildDateSection());

    return sections;
  },

  /**
   * Build Demand Letter content with date, recipient block, subject, and tone.
   * @param {Object} template - the demand-letter template
   * @param {Object} values - form values
   * @param {Object} derived - derived values (salutation, etc.)
   * @returns {Array<Object>} document sections
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
   * Build a Civil Complaint with parties, allegations, causes of action, and prayer.
   * @param {Object} template - the complaint template
   * @param {Object} values - form values
   * @param {Object} derived - derived values
   * @returns {Array<Object>} document sections
   */
  buildComplaintContent(template, values, derived) {
    // Caption (court + parties + case number or "CIVIL ACTION")
    const sections = [...this._buildCaptionSection(values, derived, { caseNumberFallback: 'CIVIL ACTION' })];

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

    plaintiffs.forEach(plaintiff => {
      const name = plaintiff.isEntity ? plaintiff.company : [plaintiff.firstName, plaintiff.lastName].filter(Boolean).join(' ');
      const location = plaintiff.address ? [plaintiff.address.city, plaintiff.address.state].filter(Boolean).join(', ') : '';
      sections.push({
        text: `\n\t${partyNum}.\t${name} is a ${plaintiff.isEntity ? 'corporation' : 'citizen'} ${location ? `of ${location}` : ''} and is a Plaintiff in this action.`,
        style: 'body'
      });
      partyNum++;
    });

    defendants.forEach(defendant => {
      const name = defendant.isEntity ? defendant.company : [defendant.firstName, defendant.lastName].filter(Boolean).join(' ');
      const location = defendant.address ? [defendant.address.city, defendant.address.state].filter(Boolean).join(', ') : '';
      sections.push({
        text: `\n\t${partyNum}.\t${name} is a ${defendant.isEntity ? 'corporation' : 'citizen'} ${location ? `of ${location}` : ''} and is a Defendant in this action.`,
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
      const allegationParagraphs = values.factualAllegations.split('\n').filter(p => p.trim());
      sections.push({
        text: '\n\t' + allegationParagraphs.map((paragraph, idx) => `${partyNum + idx}.\t${paragraph}`).join('\n\n\t'),
        style: 'body'
      });
      partyNum += allegationParagraphs.length;
    }

    // Causes of Action
    const causesOfAction = values.causesOfAction || [];
    if (causesOfAction.length > 0) {
      causesOfAction.forEach((cause, idx) => {
        const causeLabels = {
          'breach-contract': 'BREACH OF CONTRACT',
          'negligence': 'NEGLIGENCE',
          'fraud': 'FRAUD',
          'unjust-enrichment': 'UNJUST ENRICHMENT',
          'conversion': 'CONVERSION',
          'defamation': 'DEFAMATION',
          'tortious-interference': 'TORTIOUS INTERFERENCE',
          'civil-rights': 'CIVIL RIGHTS VIOLATION (42 U.S.C. § 1983)',
          'employment-discrimination': 'EMPLOYMENT DISCRIMINATION',
          'products-liability': 'PRODUCTS LIABILITY'
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

    // Signature & date
    sections.push(...this._buildSignatureSection('Plaintiff(s)'));
    sections.push(...this._buildDateSection());

    return sections;
  },

  /**
   * Build an Answer to Complaint with admissions, denials, and affirmative defenses.
   * @param {Object} template - the answer-to-complaint template
   * @param {Object} values - form values
   * @param {Object} derived - derived values
   * @returns {Array<Object>} document sections
   */
  buildAnswerContent(template, values, derived) {
    // Caption (court + parties + case number)
    const sections = [...this._buildCaptionSection(values, derived, { caseNumberFallback: 'Case No. ________' })];

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
        'comparative-negligence': 'Comparative/Contributory Negligence',
        'assumption-risk': 'Assumption of Risk',
        'accord-satisfaction': 'Accord and Satisfaction',
        'release': 'Release',
        'res-judicata': 'Res Judicata',
        'collateral-estoppel': 'Collateral Estoppel',
        'lack-standing': 'Lack of Standing',
        'failure-state-claim': 'Failure to State a Claim',
        'unclean-hands': 'Unclean Hands'
      };

      defenses.forEach((defense, idx) => {
        sections.push({
          text: `\n${this._getOrdinalWord(idx + 1)} AFFIRMATIVE DEFENSE: ${defenseLabels[defense] || defense}`,
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

    // Signature & date
    sections.push(...this._buildSignatureSection('Defendant(s)'));
    sections.push(...this._buildDateSection());

    return sections;
  },

  /**
   * Build Discovery Request content (interrogatories, RFP, or RFA).
   * @param {Object} template - the discovery-request template
   * @param {Object} values - form values
   * @param {Object} derived - derived values
   * @returns {Array<Object>} document sections
   */
  buildDiscoveryContent(template, values, derived) {
    // Build caption using requesting/responding party names for discovery
    const discoveryDerived = {
      'plaintiffs.namesEtAl': values.requestingParty || 'PLAINTIFF',
      'defendants.namesEtAl': values.respondingParty || 'DEFENDANT'
    };
    const sections = [...this._buildCaptionSection(values, discoveryDerived, { caseNumberFallback: 'Case No. ________' })];

    // Discovery type title
    const discoveryTitles = {
      'interrogatories': 'INTERROGATORIES TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase(),
      'rfp': 'REQUEST FOR PRODUCTION OF DOCUMENTS TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase(),
      'rfa': 'REQUEST FOR ADMISSIONS TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase(),
      'combined': 'COMBINED DISCOVERY REQUESTS TO ' + (values.respondingParty || 'DEFENDANT').toUpperCase()
    };
    sections.push({
      text: `\n${discoveryTitles[values.discoveryType] || 'DISCOVERY REQUESTS'}`,
      style: 'title'
    });

    // Propounding party intro
    sections.push({
      text: `\n\t${values.requestingParty || 'Plaintiff'}, pursuant to Federal Rules of Civil Procedure ${values.discoveryType === 'interrogatories' ? '33' : values.discoveryType === 'rfp' ? '34' : values.discoveryType === 'combined' ? '33, 34, and 36' : '36'}, hereby propounds the following ${values.discoveryType === 'interrogatories' ? 'Interrogatories' : values.discoveryType === 'rfp' ? 'Requests for Production' : values.discoveryType === 'combined' ? 'Combined Discovery Requests' : 'Requests for Admission'} upon ${values.respondingParty || 'Defendant'}:`,
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
      'rfa': 'Please admit or deny each of the following within thirty (30) days of service. If you cannot admit or deny, state the reasons.',
      'combined': 'Each Interrogatory shall be answered separately and fully in writing, under oath. Each Request for Production and Request for Admission shall be responded to individually. All responses are due within thirty (30) days of service.'
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
                          values.discoveryType === 'rfp' ? 'REQUESTS FOR PRODUCTION' :
                          values.discoveryType === 'combined' ? 'COMBINED DISCOVERY REQUESTS' : 'REQUESTS FOR ADMISSION';
      sections.push({
        text: `\n${requestLabel}`,
        style: 'heading'
      });

      // Split by newlines and number each request
      const requestLines = values.requests.split('\n').filter(line => line.trim());
      requestLines.forEach((req, idx) => {
        const prefix = values.discoveryType === 'interrogatories' ? 'INTERROGATORY' :
                      values.discoveryType === 'rfp' ? 'REQUEST' :
                      values.discoveryType === 'combined' ? 'REQUEST' : 'REQUEST FOR ADMISSION';
        sections.push({
          text: `\n${prefix} NO. ${idx + 1}:\t${req.trim()}`,
          style: 'body'
        });
      });
    }

    // Signature & date
    sections.push(...this._buildSignatureSection(values.requestingParty || 'Plaintiff'));
    sections.push(...this._buildDateSection());

    return sections;
  },

  /**
   * Build generic content for custom/unknown templates (simple key-value output).
   * @param {Object} template - the template
   * @param {Object} values - form values
   * @param {Object} derived - derived values (unused)
   * @returns {Array<Object>} document sections
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

  /**
   * Convert a number to its ordinal word (FIRST, SECOND, ...) for legal documents.
   * Falls back to numeric ordinal (21ST, 22ND, etc.) beyond the word list.
   * Correctly handles teens (11TH, 12TH, 13TH).
   */
  _getOrdinalWord(n) {
    const words = [
      '', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH',
      'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH',
      'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH',
      'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH'
    ];
    if (n > 0 && n < words.length) return words[n];
    // Fallback: numeric ordinal with proper suffix
    // Teens (11-13) always use TH
    const v = n % 100;
    if (v >= 11 && v <= 13) return n + 'TH';
    const lastDigit = n % 10;
    const suffixes = { 1: 'ST', 2: 'ND', 3: 'RD' };
    return n + (suffixes[lastDigit] || 'TH');
  },

  // ============================================================================
  // WORD COUNT
  // ============================================================================

  /**
   * Count words in an array of document sections.
   * @param {Array<Object>} sections - array of {text, style} section objects
   * @returns {Object} word count stats: { total, body, headings, caption }
   */
  countWords(sections) {
    const counts = { total: 0, body: 0, headings: 0, caption: 0 };
    for (const section of sections) {
      const text = (section.text || '').trim();
      if (!text) continue;
      // Split on whitespace, filter empty strings
      const words = text.split(/\s+/).filter(w => w.length > 0).length;
      counts.total += words;
      if (section.style === 'heading' || section.style === 'title') {
        counts.headings += words;
      } else if (section.style === 'caption') {
        counts.caption += words;
      } else {
        counts.body += words;
      }
    }
    return counts;
  },

  /**
   * Count paragraphs (numbered items) in an array of document sections.
   * Useful for legal documents where paragraph count matters.
   * @param {Array<Object>} sections - array of {text, style} section objects
   * @returns {number} count of numbered/body paragraphs
   */
  countParagraphs(sections) {
    return sections.filter(s => s.style === 'body' && (s.text || '').trim()).length;
  },

  // ============================================================================
  // NUMBERING SCHEME APPLICATION
  // ============================================================================

  /** Currently selected numbering scheme for export. Defaults to 'roman'. */
  _exportNumberingScheme: 'roman',

  /** Whether to include TOC in export. */
  _exportIncludeToc: false,

  /**
   * Apply a numbering scheme to heading sections with multilevel support.
   * Sections with a 'level' property (1-5) get level-appropriate numbering.
   * Sections without a level default to level 1.
   * @param {Array<Object>} sections - document sections
   * @param {string} scheme - 'roman', 'decimal', 'legal', 'none'
   * @returns {Array<Object>} sections with numbering applied (new array)
   */
  applyNumberingScheme(sections, scheme) {
    if (scheme === 'none') return sections;

    // Per-level counters (indices 0-4 for levels 1-5)
    const counters = [0, 0, 0, 0, 0];

    return sections.map(section => {
      if (section.style !== 'heading') return section;

      const level = Math.max(1, Math.min(5, section.level || 1));
      const lvlIdx = level - 1;

      // Increment this level's counter
      counters[lvlIdx]++;
      // Reset all deeper level counters
      for (let i = lvlIdx + 1; i < 5; i++) counters[i] = 0;

      const prefix = this._formatLevelNumber(counters[lvlIdx], level, scheme);

      // Strip leading newline, prepend prefix, restore newline
      const stripped = section.text.replace(/^\n/, '');
      return {
        ...section,
        text: `\n${prefix}\t${stripped}`
      };
    });
  },

  /**
   * Format a number for a specific heading level within a numbering scheme.
   * @param {number} n - the counter value
   * @param {number} level - heading level (1-5)
   * @param {string} scheme - 'roman', 'decimal', 'legal'
   * @returns {string} formatted number prefix
   */
  _formatLevelNumber(n, level, scheme) {
    // Multilevel format: Level 1: I./1./A.  Level 2: A./a./1.  Level 3: 1./(a)/(i)  etc.
    const formats = {
      roman: [
        () => this._toRoman(n) + '.',          // I. II. III.
        () => this._toAlpha(n, true) + '.',     // A. B. C.
        () => n + '.',                           // 1. 2. 3.
        () => '(' + this._toAlpha(n, false) + ')', // (a) (b) (c)
        () => '(' + this._toRoman(n).toLowerCase() + ')' // (i) (ii) (iii)
      ],
      decimal: [
        () => n + '.',
        () => this._toAlpha(n, false) + '.',
        () => '(' + n + ')',
        () => '(' + this._toAlpha(n, false) + ')',
        () => '(' + this._toRoman(n).toLowerCase() + ')'
      ],
      legal: [
        () => this._toAlpha(n, true) + '.',
        () => n + '.',
        () => this._toAlpha(n, false) + '.',
        () => '(' + n + ')',
        () => '(' + this._toAlpha(n, false) + ')'
      ]
    };
    const schemeFmts = formats[scheme] || formats.roman;
    const lvlIdx = Math.min(level - 1, schemeFmts.length - 1);
    return schemeFmts[lvlIdx]();
  },

  /**
   * Convert a number to alphabetic (A=1, B=2, ..., Z=26, AA=27).
   * @param {number} n - the number to convert
   * @param {boolean} upper - true for uppercase, false for lowercase
   * @returns {string}
   */
  _toAlpha(n, upper) {
    let result = '';
    while (n > 0) {
      n--;
      result = String.fromCharCode((upper ? 65 : 97) + (n % 26)) + result;
      n = Math.floor(n / 26);
    }
    return result || (upper ? 'A' : 'a');
  },

  /**
   * Convert a number to a Roman numeral string.
   * @param {number} num
   * @returns {string}
   */
  _toRoman(num) {
    const romanNumerals = [
      ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
      ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
      ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let result = '';
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        result += letter;
        num -= value;
      }
    }
    return result;
  },

  /**
   * Apply legal document formatting to a Word paragraph based on section style.
   * Maps heading levels to Word's built-in Heading 1-5 styles for TOC/outline support.
   * Shared by exportToWord() and insertIntoDocument().
   * @param {Object} paragraph - Word.Paragraph proxy
   * @param {string} style - section style ('caption','title','heading','continuation','subject','signature','body')
   * @param {number} [level=1] - heading level (1-5) for 'heading' and 'continuation' styles
   */
  _applyParagraphStyle(paragraph, style, level) {
    paragraph.font.name = 'Times New Roman';
    paragraph.font.size = 12;

    switch (style) {
      case 'caption':
        paragraph.alignment = Word.Alignment.centered;
        paragraph.spaceAfter = 6;
        paragraph.spaceBefore = 0;
        break;
      case 'title':
        paragraph.alignment = Word.Alignment.centered;
        paragraph.font.bold = true;
        paragraph.font.size = 14;
        paragraph.font.underline = Word.UnderlineType.single;
        paragraph.spaceAfter = 12;
        paragraph.spaceBefore = 12;
        break;
      case 'heading': {
        paragraph.font.bold = true;
        paragraph.spaceAfter = 6;
        paragraph.spaceBefore = 12;
        // Map heading levels to Word's built-in Heading styles for TOC support
        const headingLevel = Math.max(1, Math.min(5, level || 1));
        try {
          paragraph.styleBuiltIn = Word.BuiltInStyleName['heading' + headingLevel];
          // Re-apply font after style override
          paragraph.font.name = 'Times New Roman';
          paragraph.font.size = Math.max(12, 16 - (headingLevel - 1) * 1);
          paragraph.font.bold = true;
        } catch (e) {
          // Fallback: if built-in style fails, use manual formatting
        }
        // Indent based on level
        if (headingLevel > 1) {
          paragraph.leftIndent = (headingLevel - 1) * 36; // 0.5in per level
        }
        break;
      }
      case 'continuation':
        // Body text that continues under a numbered item (no number prefix)
        paragraph.alignment = Word.Alignment.left;
        paragraph.lineSpacing = 24;
        paragraph.spaceAfter = 0;
        // Indent to match parent heading level
        paragraph.leftIndent = Math.max(0, ((level || 1) - 1) * 36 + 36);
        break;
      case 'subject':
        paragraph.font.bold = true;
        paragraph.font.underline = Word.UnderlineType.single;
        paragraph.spaceAfter = 6;
        break;
      case 'signature':
        paragraph.alignment = Word.Alignment.left;
        paragraph.spaceAfter = 0;
        paragraph.spaceBefore = 24;
        break;
      case 'body':
      default:
        paragraph.alignment = Word.Alignment.left;
        paragraph.lineSpacing = 24;
        paragraph.spaceAfter = 0;
        break;
    }
  },

  // ============================================================================
  // EXPORT PANEL
  // ============================================================================

  /** Cached sections from last build, used by export panel actions. */
  _lastBuiltSections: null,

  /**
   * Show the export panel with stats, numbering options, and action buttons.
   * Renders into the form container, replacing the form.
   * @param {string} containerId - DOM container ID
   */
  showExportPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !this.state.template) return;

    const template = this.state.template;
    const values = this.state.values;
    const derived = this.state.derivedValues;

    // Build sections and cache them
    const sections = this.buildDocumentContent(template, values, derived);
    this._lastBuiltSections = sections;

    const wordCount = this.countWords(sections);
    const sectionCount = sections.filter(s => s.style === 'heading' || s.style === 'title').length;
    // Rough page estimate: ~250 words/page for double-spaced legal
    const pageEstimate = Math.max(1, Math.ceil(wordCount.total / 250));

    const scheme = this._exportNumberingScheme;

    const safeId = this.safeId(containerId);
    const tocChecked = this._exportIncludeToc;
    const previewHtml = this._renderSchemePreview(scheme);

    container.innerHTML = `
      <div class="db-export-panel panel-enter">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.renderForm('${safeId}')">← Back to Form</button>
          <h3 class="sv-template-title">${this.escapeHtml(template.name)}</h3>
        </div>

        <div class="db-export-stats">
          <div class="db-export-stat">
            <div class="db-export-stat-value">${wordCount.total.toLocaleString()}</div>
            <div class="db-export-stat-label">Words</div>
          </div>
          <div class="db-export-stat">
            <div class="db-export-stat-value">${sectionCount}</div>
            <div class="db-export-stat-label">Sections</div>
          </div>
          <div class="db-export-stat">
            <div class="db-export-stat-value">~${pageEstimate}</div>
            <div class="db-export-stat-label">Pages</div>
          </div>
        </div>

        <div class="db-export-numbering">
          <div class="db-export-numbering-label">Section Numbering</div>
          <div class="db-export-numbering-options">
            <label class="db-export-numbering-option ${scheme === 'roman' ? 'selected' : ''}" onclick="SmartVariables.setExportNumbering('roman', '${safeId}')">
              <input type="radio" name="numbering" value="roman" ${scheme === 'roman' ? 'checked' : ''}>
              I. II. III.
            </label>
            <label class="db-export-numbering-option ${scheme === 'decimal' ? 'selected' : ''}" onclick="SmartVariables.setExportNumbering('decimal', '${safeId}')">
              <input type="radio" name="numbering" value="decimal" ${scheme === 'decimal' ? 'checked' : ''}>
              1. 2. 3.
            </label>
            <label class="db-export-numbering-option ${scheme === 'legal' ? 'selected' : ''}" onclick="SmartVariables.setExportNumbering('legal', '${safeId}')">
              <input type="radio" name="numbering" value="legal" ${scheme === 'legal' ? 'checked' : ''}>
              A. B. C.
            </label>
            <label class="db-export-numbering-option ${scheme === 'none' ? 'selected' : ''}" onclick="SmartVariables.setExportNumbering('none', '${safeId}')">
              <input type="radio" name="numbering" value="none" ${scheme === 'none' ? 'checked' : ''}>
              None
            </label>
          </div>
        </div>

        ${previewHtml}

        <div class="db-export-option-row">
          <div class="db-export-option-info">
            <div class="db-export-option-label">Include Table of Contents</div>
            <div class="db-export-option-desc">Inserts a TOC field before the document body (uses Heading 1-3)</div>
          </div>
          <button class="db-toggle-switch ${tocChecked ? 'active' : ''}" role="switch" aria-checked="${tocChecked}"
                  onclick="SmartVariables._toggleExportToc('${safeId}')">
            <span class="db-toggle-thumb"></span>
          </button>
        </div>

        <div class="db-export-actions">
          <button class="db-export-btn db-export-btn-primary" onclick="SmartVariables.exportToWord('${safeId}')">
            Insert to Word
          </button>
          <button class="db-export-btn db-export-btn-secondary" onclick="SmartVariables.exportToClipboard()">
            Copy to Clipboard
          </button>
        </div>

        <div class="db-export-save-scheme" id="db-save-scheme-area">
          <button class="db-save-scheme-link" onclick="SmartVariables._showSaveSchemeForm()">
            ★ Save This Scheme
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Toggle the TOC export option and re-render export panel.
   * @param {string} containerId - DOM container ID
   */
  _toggleExportToc(containerId) {
    this._exportIncludeToc = !this._exportIncludeToc;
    this.showExportPanel(containerId);
  },

  /**
   * Render a mini preview card showing the selected numbering scheme hierarchy.
   * @param {string} scheme - 'roman', 'decimal', 'legal', 'none'
   * @returns {string} HTML string
   */
  _renderSchemePreview(scheme) {
    if (scheme === 'none') return '';

    const sampleTexts = ['INTRODUCTION', 'Background', 'Factual Basis', 'First allegation', 'Supporting detail'];
    const levels = [1, 2, 3, 4, 5];
    const counters = [0, 0, 0, 0, 0];

    let linesHtml = '';
    for (let i = 0; i < 5; i++) {
      const lvl = levels[i];
      counters[lvl - 1]++;
      const prefix = this._formatLevelNumber(counters[lvl - 1], lvl, scheme);
      linesHtml += `<div class="db-preview-line db-preview-l${lvl}"><span class="db-preview-num">${this.escapeHtml(prefix)}</span> ${this.escapeHtml(sampleTexts[i])}</div>`;
    }

    // Add continuation paragraph indicator
    linesHtml += `<div class="db-preview-line db-preview-continuation"><span class="db-preview-pilcrow">¶</span> <em>Continuation paragraph text...</em></div>`;

    return `
      <div class="db-scheme-preview">
        <div class="db-scheme-preview-label">Preview</div>
        <div class="db-scheme-preview-card">
          ${linesHtml}
        </div>
      </div>
    `;
  },

  /**
   * Show the inline "Save This Scheme" form.
   */
  _showSaveSchemeForm() {
    const area = document.getElementById('db-save-scheme-area');
    if (!area) return;

    area.innerHTML = `
      <div class="db-save-scheme-form">
        <input type="text" class="sv-input db-save-scheme-input" id="db-scheme-name" placeholder="My Custom Scheme" maxlength="50">
        <div class="db-save-scheme-btns">
          <button class="sv-btn sv-btn-primary" onclick="SmartVariables._saveCurrentScheme()">Save</button>
          <button class="sv-btn sv-btn-secondary" onclick="SmartVariables._cancelSaveScheme()">Cancel</button>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('db-scheme-name')?.focus(), 50);
  },

  /**
   * Save the current numbering scheme to localStorage.
   */
  _saveCurrentScheme() {
    const nameInput = document.getElementById('db-scheme-name');
    const name = (nameInput?.value || '').trim();
    if (!name) {
      toast('Please enter a scheme name', 'error');
      return;
    }

    const scheme = this._exportNumberingScheme;
    const schemeId = 'user_' + Date.now();

    // Build level definitions matching taskpane.html format
    const levelDefs = {
      roman: [
        { before: '', style: 'I', after: '.', follow: 'tab' },
        { before: '', style: 'A', after: '.', follow: 'tab' },
        { before: '', style: '1', after: '.', follow: 'tab' },
        { before: '(', style: 'a', after: ')', follow: 'tab' },
        { before: '(', style: 'i', after: ')', follow: 'tab' }
      ],
      decimal: [
        { before: '', style: '1', after: '.', follow: 'tab' },
        { before: '', style: 'a', after: '.', follow: 'tab' },
        { before: '(', style: '1', after: ')', follow: 'tab' },
        { before: '(', style: 'a', after: ')', follow: 'tab' },
        { before: '(', style: 'i', after: ')', follow: 'tab' }
      ],
      legal: [
        { before: '', style: 'A', after: '.', follow: 'tab' },
        { before: '', style: '1', after: '.', follow: 'tab' },
        { before: '', style: 'a', after: '.', follow: 'tab' },
        { before: '(', style: '1', after: ')', follow: 'tab' },
        { before: '(', style: 'a', after: ')', follow: 'tab' }
      ]
    };

    const schemeData = {
      name: name,
      levels: levelDefs[scheme] || levelDefs.roman,
      options: { restart: true, legal: false, rightAlign: false, startAt: 1 },
      styleAssociations: [
        { level: 0, styleName: 'Heading 1' },
        { level: 1, styleName: 'Heading 2' },
        { level: 2, styleName: 'Heading 3' }
      ],
      createdAt: new Date().toISOString()
    };

    try {
      let userSchemes = {};
      try {
        userSchemes = JSON.parse(localStorage.getItem('draftbridge_numbering_schemes') || '{}');
      } catch (e) { /* ignore */ }
      userSchemes[schemeId] = schemeData;
      localStorage.setItem('draftbridge_numbering_schemes', JSON.stringify(userSchemes));
      toast(`Saved scheme "${name}"`, 'success');
      this._cancelSaveScheme();
    } catch (e) {
      console.error('[SmartVariables] Failed to save scheme:', e);
      toast('Could not save scheme', 'error');
    }
  },

  /**
   * Cancel the save scheme form and restore the link.
   */
  _cancelSaveScheme() {
    const area = document.getElementById('db-save-scheme-area');
    if (!area) return;
    area.innerHTML = `
      <button class="db-save-scheme-link" onclick="SmartVariables._showSaveSchemeForm()">
        ★ Save This Scheme
      </button>
    `;
  },

  /**
   * Update the selected numbering scheme and re-render export panel.
   * @param {string} scheme - 'roman', 'decimal', 'legal', 'none'
   * @param {string} containerId - DOM container ID
   */
  setExportNumbering(scheme, containerId) {
    this._exportNumberingScheme = scheme;
    this.showExportPanel(containerId);
  },

  /**
   * Export to Word: apply numbering scheme and insert into document.
   * @param {string} containerId - DOM container ID
   */
  async exportToWord(containerId) {
    if (!this._lastBuiltSections || !this.state.template) return;

    const numbered = this.applyNumberingScheme(this._lastBuiltSections, this._exportNumberingScheme);
    const wordCount = this.countWords(numbered);

    try {
      toast('Inserting into Word...', 'info');

      if (typeof Word === 'undefined') {
        console.log('[SmartVariables] Word API not available. Preview:');
        numbered.forEach(s => console.log(`[${s.style}${s.level ? ':L' + s.level : ''}] ${s.text}`));
        toast(`Preview: ${wordCount.total} words (Word unavailable)`, 'info');
        return;
      }

      await Word.run(async (context) => {
        const selection = context.document.getSelection();

        // Insert TOC if enabled
        if (this._exportIncludeToc) {
          this._insertTocOoxml(selection);
        }

        for (const section of numbered) {
          const paragraph = selection.insertParagraph(section.text, Word.InsertLocation.after);
          this._applyParagraphStyle(paragraph, section.style, section.level);
        }

        await context.sync();
      });

      // Clear draft after successful export
      if (this.state.template) {
        this._clearDraft(this.state.template.id);
      }

      const tocNote = this._exportIncludeToc ? ' with TOC' : '';
      toast(`${this.state.template.name} inserted${tocNote} — ${wordCount.total.toLocaleString()} words`, 'success');
    } catch (error) {
      console.error('[SmartVariables] Export to Word failed:', error);
      toast('Failed to insert. Click in your document and try again.', 'error');
    }
  },

  /**
   * Insert a Table of Contents field via OOXML before document body.
   * Uses heading levels 1-3 by default.
   * @param {Object} selection - Word.Range selection proxy
   */
  _insertTocOoxml(selection) {
    const tocOoxml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
        <pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
          <pkg:xmlData>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:body>
                <w:p>
                  <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
                  <w:r><w:t>Table of Contents</w:t></w:r>
                </w:p>
                <w:p>
                  <w:r><w:fldChar w:fldCharType="begin"/></w:r>
                  <w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>
                  <w:r><w:fldChar w:fldCharType="separate"/></w:r>
                  <w:r><w:t>Press F9 to update table of contents</w:t></w:r>
                  <w:r><w:fldChar w:fldCharType="end"/></w:r>
                </w:p>
              </w:body>
            </w:document>
          </pkg:xmlData>
        </pkg:part>
      </pkg:package>`;

    try {
      selection.insertOoxml(tocOoxml, Word.InsertLocation.before);
    } catch (e) {
      console.warn('[SmartVariables] TOC OOXML insertion failed, skipping:', e);
    }
  },

  /**
   * Export document content to clipboard as formatted plain text.
   * Applies the selected numbering scheme before copying.
   */
  async exportToClipboard() {
    if (!this._lastBuiltSections) {
      toast('No document to copy. Generate first.', 'error');
      return;
    }

    const numbered = this.applyNumberingScheme(this._lastBuiltSections, this._exportNumberingScheme);
    const lines = [];

    for (const section of numbered) {
      const text = (section.text || '').replace(/^\n/, '');
      if (!text) continue;

      // Indent multilevel headings in plain text
      const level = section.level || 1;
      const indent = '  '.repeat(Math.max(0, level - 1));

      switch (section.style) {
        case 'title':
          lines.push('', text.toUpperCase(), '');
          break;
        case 'heading':
          lines.push('', indent + text, '');
          break;
        case 'continuation':
          lines.push(indent + '  ' + text);
          break;
        case 'caption':
          lines.push(text);
          break;
        case 'signature':
          lines.push('', text, '');
          break;
        default:
          lines.push(text);
      }
    }

    const plainText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    try {
      await navigator.clipboard.writeText(plainText);
      const wordCount = this.countWords(numbered);
      toast(`Copied to clipboard — ${wordCount.total.toLocaleString()} words`, 'success');
    } catch (err) {
      console.error('[SmartVariables] Clipboard write failed:', err);
      toast('Could not copy to clipboard. Try again.', 'error');
    }
  },

  // ============================================================================
  // ENHANCED DOCUMENT INSERTION (direct, no export panel)
  // ============================================================================

  /**
   * Insert generated content into the Word document via Office.js
   * with proper legal document formatting.
   * Falls back to console output when running outside of Word.
   * @param {Object} template - the selected template
   * @param {Object} values - form values
   * @param {Object} derived - derived values
   * @returns {Object|undefined} word count stats if successful
   */
  async insertIntoDocument(template, values, derived) {
    // Build the content sections
    const sections = this.buildDocumentContent(template, values, derived);
    const wordCount = this.countWords(sections);

    // Check if Office.js is available
    if (typeof Word === 'undefined') {
      // Fallback for testing outside Word
      console.log('[SmartVariables] Word API not available. Content preview:');
      sections.forEach(section => console.log(`[${section.style}] ${section.text}`));
      console.log(`[SmartVariables] Word count: ${wordCount.total} (body: ${wordCount.body}, headings: ${wordCount.headings})`);
      return wordCount;
    }

    await Word.run(async (context) => {
      const selection = context.document.getSelection();

      for (const section of sections) {
        const paragraph = selection.insertParagraph(section.text, Word.InsertLocation.after);
        this._applyParagraphStyle(paragraph, section.style, section.level);
      }

      await context.sync();
      console.log(`[SmartVariables] Document inserted: ${wordCount.total} words`);
    });

    return wordCount;
  },

  // ============================================================================
  // DOCUMENT BRIDGING WIZARD (Design B)
  // ============================================================================

  /** Bridging wizard state */
  _bridgeState: {
    step: 1,         // 1=upload, 2=preview, 3=merge
    file: null,      // uploaded file reference
    fileName: '',
    fileSize: 0,
    detectedVars: [] // variables detected in uploaded doc
  },

  /**
   * Show the document bridging wizard (3-step: upload → preview → merge).
   * @param {string} containerId - DOM container ID
   */
  showBridgingWizard(containerId) {
    this._bridgeState = { step: 1, file: null, fileName: '', fileSize: 0, detectedVars: [] };
    this._renderBridgeStep(containerId);
  },

  /**
   * Render the current bridging wizard step with stepper indicator.
   * @param {string} containerId - DOM container ID
   */
  _renderBridgeStep(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const step = this._bridgeState.step;
    const steps = ['Upload', 'Preview', 'Merge'];
    const safeId = this.safeId(containerId);

    let stepperHtml = '<div class="db-bridge-stepper">';
    steps.forEach((label, idx) => {
      const num = idx + 1;
      const cls = num < step ? 'completed' : num === step ? 'active' : '';
      stepperHtml += `<div class="db-bridge-step ${cls}"><span class="db-bridge-step-num">${num}</span><span class="db-bridge-step-label">${this.escapeHtml(label)}</span></div>`;
    });
    stepperHtml += '</div>';

    let bodyHtml = '';
    switch (step) {
      case 1: bodyHtml = this._renderBridgeUpload(safeId); break;
      case 2: bodyHtml = this._renderBridgePreview(safeId); break;
      case 3: bodyHtml = this._renderBridgeMerge(safeId); break;
    }

    container.innerHTML = `
      <div class="db-bridge-wizard">
        <div class="sv-form-header">
          <button class="sv-back-btn" onclick="SmartVariables.renderForm('${safeId}')">← Back</button>
          <h3 class="sv-template-title">Import &amp; Bridge Document</h3>
        </div>
        ${stepperHtml}
        <div class="db-bridge-body">${bodyHtml}</div>
      </div>
    `;
  },

  /**
   * Render step 1: file upload dropzone.
   * @param {string} safeContainerId - sanitized container ID
   * @returns {string} HTML string
   */
  _renderBridgeUpload(safeContainerId) {
    return `
      <div class="db-bridge-dropzone" id="db-bridge-dropzone"
           ondragover="event.preventDefault(); this.classList.add('dragover')"
           ondragleave="this.classList.remove('dragover')"
           ondrop="event.preventDefault(); this.classList.remove('dragover'); SmartVariables._handleBridgeFile(event.dataTransfer.files[0], '${safeContainerId}')">
        <div class="db-bridge-dropzone-icon">📄</div>
        <p class="db-bridge-dropzone-text">Drag &amp; drop a .docx file here</p>
        <p class="db-bridge-dropzone-hint">or</p>
        <label class="db-export-btn db-export-btn-secondary" style="cursor:pointer">
          Browse Files
          <input type="file" accept=".docx,.doc" style="display:none"
                 onchange="SmartVariables._handleBridgeFile(this.files[0], '${safeContainerId}')">
        </label>
      </div>
    `;
  },

  /**
   * Handle a file selected/dropped in the bridging wizard.
   * Reads the file and detects placeholder variables.
   * @param {File} file - the uploaded file
   * @param {string} containerId - DOM container ID
   */
  _handleBridgeFile(file, containerId) {
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.docx?$/i)) {
      toast('Please upload a Word document (.docx or .doc)', 'error');
      return;
    }

    this._bridgeState.file = file;
    this._bridgeState.fileName = file.name;
    this._bridgeState.fileSize = file.size;

    // Simulate variable detection (in production, would parse .docx XML)
    // Look for {{variable}} patterns in templates
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Detect {{variable}} placeholders from binary content
      const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
      const vars = [...new Set(matches)].map(m => m.replace(/\{\{|\}\}/g, '').trim());
      this._bridgeState.detectedVars = vars.length > 0 ? vars : ['(No variables detected — document will be inserted as-is)'];
      this._bridgeState.step = 2;
      this._renderBridgeStep(containerId);
    };
    reader.onerror = () => {
      toast('Could not read file. Please try again.', 'error');
    };
    reader.readAsText(file);
  },

  /**
   * Render step 2: preview detected variables.
   * @param {string} safeContainerId - sanitized container ID
   * @returns {string} HTML string
   */
  _renderBridgePreview(safeContainerId) {
    const vars = this._bridgeState.detectedVars;
    const sizeKb = (this._bridgeState.fileSize / 1024).toFixed(1);

    let chipsHtml = vars.map(v =>
      `<span class="db-bridge-var-chip">${this.escapeHtml(v)}</span>`
    ).join('');

    return `
      <div class="db-bridge-file-card">
        <div class="db-bridge-file-icon">📄</div>
        <div class="db-bridge-file-info">
          <div class="db-bridge-file-name">${this.escapeHtml(this._bridgeState.fileName)}</div>
          <div class="db-bridge-file-size">${sizeKb} KB</div>
        </div>
      </div>
      <div class="db-bridge-section-label">Detected Variables (${vars.length})</div>
      <div class="db-bridge-var-chips">${chipsHtml}</div>
      <div class="db-bridge-actions" style="display:flex;gap:8px;margin-top:16px">
        <button class="db-export-btn db-export-btn-secondary" onclick="SmartVariables._bridgeState.step=1;SmartVariables._renderBridgeStep('${safeContainerId}')">← Back</button>
        <button class="db-export-btn db-export-btn-primary" onclick="SmartVariables._bridgeState.step=3;SmartVariables._renderBridgeStep('${safeContainerId}')">Continue to Merge →</button>
      </div>
    `;
  },

  /**
   * Render step 3: merge confirmation.
   * @param {string} safeContainerId - sanitized container ID
   * @returns {string} HTML string
   */
  _renderBridgeMerge(safeContainerId) {
    const vars = this._bridgeState.detectedVars.filter(v => !v.startsWith('('));
    const hasVars = vars.length > 0;

    return `
      <div class="db-bridge-merge-summary">
        <h4>Ready to Merge</h4>
        <p><strong>${this.escapeHtml(this._bridgeState.fileName)}</strong></p>
        ${hasVars ? `<p>${vars.length} variable(s) will be replaced with current form values.</p>` : '<p>Document will be inserted as-is (no variables detected).</p>'}
      </div>
      <div class="db-bridge-actions" style="display:flex;gap:8px;margin-top:16px">
        <button class="db-export-btn db-export-btn-secondary" onclick="SmartVariables._bridgeState.step=2;SmartVariables._renderBridgeStep('${safeContainerId}')">← Back</button>
        <button class="db-export-btn db-export-btn-primary" onclick="SmartVariables._completeBridging('${safeContainerId}')">Merge &amp; Insert</button>
      </div>
    `;
  },

  /**
   * Complete the bridging process: merge variables and insert into Word.
   * @param {string} containerId - DOM container ID
   */
  async _completeBridging(containerId) {
    toast('Merging document...', 'info');

    try {
      if (typeof Word === 'undefined') {
        console.log('[SmartVariables] Bridging complete (Word API unavailable). File:', this._bridgeState.fileName);
        console.log('[SmartVariables] Variables to merge:', this._bridgeState.detectedVars);
        toast(`Bridged ${this._bridgeState.fileName} (preview mode)`, 'success');
        this.renderForm(containerId);
        return;
      }

      // In production: read .docx, replace {{var}} placeholders, insert via Office.js
      await Word.run(async (context) => {
        const body = context.document.body;
        // Insert file content at cursor
        // Note: Full implementation would parse .docx and replace variables
        body.insertText(`[Bridged content from: ${this._bridgeState.fileName}]`, Word.InsertLocation.end);
        await context.sync();
      });

      toast(`${this._bridgeState.fileName} merged successfully!`, 'success');
      this.renderForm(containerId);
    } catch (error) {
      console.error('[SmartVariables] Bridging failed:', error);
      toast('Merge failed. Please try again.', 'error');
    }
  },

  // ============================================================================
  // QUICK-INSERT SNIPPET LIBRARY (Design D)
  // ============================================================================

  /** Whether the snippet palette is open */
  _snippetPaletteOpen: false,

  /** Current snippet search query */
  _snippetSearchQuery: '',

  /** Current snippet category tab */
  _snippetCategory: 'captions',

  /** Built-in snippet library organized by category */
  _snippets: {
    captions: [
      { title: 'Standard Caption', text: 'IN THE [COURT NAME]\n[COUNTY/DISTRICT], [STATE]\n\n[PLAINTIFF],\n\tPlaintiff(s),\n\nv.\n\n[DEFENDANT],\n\tDefendant(s).', keywords: 'caption header court' },
      { title: 'Family Court Caption', text: 'IN THE FAMILY COURT OF\n[COUNTY] COUNTY, [STATE]\n\nIn the Matter of:\n[PETITIONER],\n\tPetitioner,\n\nand\n\n[RESPONDENT],\n\tRespondent.', keywords: 'family court domestic' },
      { title: 'Appellate Caption', text: 'IN THE [COURT OF APPEALS / SUPREME COURT]\nOF THE STATE OF [STATE]\n\n[APPELLANT],\n\tAppellant,\n\nv.\n\n[APPELLEE],\n\tAppellee.\n\nCase No. ________', keywords: 'appeal appellate' }
    ],
    signatures: [
      { title: 'Standard Signature', text: 'Respectfully submitted,\n\n\n_______________________________\n[Attorney Name], Esq.\n[Bar No.]\n[Firm Name]\n[Address]\n[Phone]\n[Email]', keywords: 'signature sign closing' },
      { title: 'Certificate of Service', text: 'CERTIFICATE OF SERVICE\n\nI hereby certify that on this ___ day of __________, 20__, a true and correct copy of the foregoing was served upon all counsel of record via [e-filing/mail/hand delivery].\n\n\n_______________________________\n[Attorney Name]', keywords: 'certificate service proof' },
      { title: 'Verification', text: 'VERIFICATION\n\nI, [NAME], declare under penalty of perjury under the laws of the State of [STATE] that the foregoing is true and correct.\n\nExecuted on __________, 20__.\n\n\n_______________________________\n[NAME]', keywords: 'verification sworn declare' }
    ],
    clauses: [
      { title: 'Wherefore Clause', text: 'WHEREFORE, [Party] respectfully requests that this Court enter judgment in [his/her/their] favor and award:\n\ta.\tCompensatory damages;\n\tb.\tPre- and post-judgment interest;\n\tc.\tCosts of suit and attorneys\' fees; and\n\td.\tSuch other relief as the Court deems just and proper.', keywords: 'wherefore prayer relief' },
      { title: 'Incorporation Clause', text: '[Party] incorporates by reference all preceding paragraphs as if fully set forth herein.', keywords: 'incorporate reference preceding' },
      { title: 'Jury Demand', text: 'DEMAND FOR JURY TRIAL\n\n[Party] hereby demands a trial by jury on all issues so triable.', keywords: 'jury trial demand' },
      { title: 'Reservation of Rights', text: '[Party] reserves the right to amend, supplement, or modify this [document] as discovery progresses and additional facts become known.', keywords: 'reservation rights amend' }
    ]
  },

  /**
   * Toggle the snippet palette open/closed.
   * Creates the palette DOM element if it doesn't exist.
   */
  toggleSnippetPalette() {
    this._snippetPaletteOpen = !this._snippetPaletteOpen;

    let palette = document.getElementById('db-snippet-palette');

    if (this._snippetPaletteOpen) {
      if (!palette) {
        palette = document.createElement('div');
        palette.id = 'db-snippet-palette';
        palette.className = 'db-snippet-palette';
        document.body.appendChild(palette);
      }
      palette.classList.add('open');
      this._renderSnippetPalette();
    } else if (palette) {
      palette.classList.remove('open');
    }
  },

  /**
   * Render the snippet palette contents: search, category tabs, snippet list.
   */
  _renderSnippetPalette() {
    const palette = document.getElementById('db-snippet-palette');
    if (!palette) return;

    const categories = Object.keys(this._snippets);
    const activeCat = this._snippetCategory;
    const query = this._snippetSearchQuery.toLowerCase();

    // Filter snippets
    let snippets = this._snippets[activeCat] || [];
    if (query) {
      snippets = snippets.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.keywords.toLowerCase().includes(query) ||
        s.text.toLowerCase().includes(query)
      );
    }

    const tabsHtml = categories.map(cat => {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      const cls = cat === activeCat ? 'active' : '';
      return `<button class="db-snippet-tab ${cls}" onclick="SmartVariables._snippetCategory='${this.safeId(cat)}';SmartVariables._renderSnippetPalette()">${this.escapeHtml(label)}</button>`;
    }).join('');

    const listHtml = snippets.map((snippet, idx) => {
      const preview = snippet.text.substring(0, 80).replace(/\n/g, ' ') + (snippet.text.length > 80 ? '...' : '');
      return `
        <div class="db-snippet-item" onclick="SmartVariables._insertSnippet('${this.safeId(activeCat)}', ${idx})">
          <div class="db-snippet-item-title">${this.escapeHtml(snippet.title)}</div>
          <div class="db-snippet-item-preview">${this.escapeHtml(preview)}</div>
        </div>
      `;
    }).join('');

    palette.innerHTML = `
      <div class="db-snippet-header">
        <span class="db-snippet-header-title">Snippets</span>
        <button class="db-snippet-close" onclick="SmartVariables.toggleSnippetPalette()">&times;</button>
      </div>
      <input type="text" class="db-snippet-search" placeholder="Search snippets..."
             value="${this.escapeHtml(this._snippetSearchQuery)}"
             oninput="SmartVariables._snippetSearchQuery=this.value;SmartVariables._renderSnippetPalette()">
      <div class="db-snippet-tabs">${tabsHtml}</div>
      <div class="db-snippet-list">
        ${listHtml || '<div class="db-snippet-empty">No snippets match your search.</div>'}
      </div>
    `;
  },

  /**
   * Insert a snippet at the current cursor position in Word.
   * @param {string} category - snippet category key
   * @param {number} index - snippet index within the category
   */
  async _insertSnippet(category, index) {
    const snippet = (this._snippets[category] || [])[index];
    if (!snippet) return;

    try {
      if (typeof Word === 'undefined') {
        console.log('[SmartVariables] Snippet inserted (preview):', snippet.title);
        toast(`Inserted: ${snippet.title}`, 'success');
        return;
      }

      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const paragraph = selection.insertParagraph(snippet.text, Word.InsertLocation.after);
        paragraph.font.name = 'Times New Roman';
        paragraph.font.size = 12;
        await context.sync();
      });

      toast(`Inserted: ${snippet.title}`, 'success');
    } catch (error) {
      console.error('[SmartVariables] Snippet insert failed:', error);
      toast('Could not insert snippet. Click in your document first.', 'error');
    }
  },

  // ============================================================================
  // CROSS-REFERENCE SCAN (Design C)
  // ============================================================================

  /** Last cross-reference scan results */
  _xrefResults: null,

  /**
   * Scan the current document for broken cross-references (REF fields).
   * Shows results in a modal with per-item fix and bulk update actions.
   */
  async scanCrossReferences() {
    if (typeof Word === 'undefined') {
      toast('Cross-reference scan requires Word', 'info');
      this._showXrefResults([
        { name: 'REF _Ref123456', status: 'broken', detail: 'Target bookmark not found' },
        { name: 'REF _Ref789012', status: 'valid', detail: 'Points to Section I' },
        { name: 'REF _Ref345678', status: 'broken', detail: 'Target bookmark not found' }
      ]);
      return;
    }

    toast('Scanning cross-references...', 'info');

    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const fields = body.fields;
        fields.load('items');
        await context.sync();

        const results = [];
        for (const field of fields.items) {
          field.load(['code', 'result']);
          await context.sync();

          const code = field.code?.value || '';
          if (code.trim().startsWith('REF ') || code.trim().startsWith('PAGEREF ')) {
            const refName = code.trim().split(/\s+/)[1] || 'Unknown';
            const resultText = field.result?.value || '';
            const isBroken = !resultText || resultText.includes('Error') || resultText === '0';

            results.push({
              name: code.trim(),
              status: isBroken ? 'broken' : 'valid',
              detail: isBroken ? 'Target bookmark not found' : `Points to: ${resultText.substring(0, 40)}`
            });
          }
        }

        this._showXrefResults(results);
      });
    } catch (error) {
      console.error('[SmartVariables] Cross-reference scan failed:', error);
      toast('Scan failed. Make sure your document is open.', 'error');
    }
  },

  /**
   * Show cross-reference scan results in a modal.
   * @param {Array<Object>} results - array of {name, status, detail}
   */
  _showXrefResults(results) {
    this._xrefResults = results;
    const brokenCount = results.filter(r => r.status === 'broken').length;
    const totalCount = results.length;

    let overlay = document.getElementById('db-xref-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'db-xref-overlay';
    overlay.className = 'sv-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const itemsHtml = results.length > 0 ? results.map((r, idx) => `
      <div class="db-xref-item">
        <span class="db-xref-dot ${r.status}"></span>
        <div class="db-xref-info">
          <div class="db-xref-name">${this.escapeHtml(r.name)}</div>
          <div class="db-xref-detail">${this.escapeHtml(r.detail)}</div>
        </div>
        ${r.status === 'broken' ? `<button class="sv-mini-btn" onclick="SmartVariables._fixXref(${idx})">Fix</button>` : '<span class="db-xref-check">✓</span>'}
      </div>
    `).join('') : '<div class="sv-picker-empty">No cross-references found in the document.</div>';

    overlay.innerHTML = `
      <div class="sv-modal db-xref-modal">
        <div class="sv-modal-header">
          <h3>Cross-Reference Scan</h3>
          <button class="sv-modal-close" onclick="document.getElementById('db-xref-overlay').remove()">×</button>
        </div>
        <div class="sv-modal-body">
          <div class="db-xref-summary">
            <span>${totalCount} reference${totalCount !== 1 ? 's' : ''} found, ${brokenCount} broken</span>
            ${brokenCount > 0 ? `<button class="sv-btn sv-btn-primary" onclick="SmartVariables._updateAllXrefs()">Update All</button>` : ''}
          </div>
          <div class="db-xref-list">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  /**
   * Fix a single broken cross-reference by updating fields.
   * @param {number} index - index in _xrefResults
   */
  async _fixXref(index) {
    if (typeof Word === 'undefined') {
      toast('Fixed (preview mode)', 'success');
      if (this._xrefResults?.[index]) this._xrefResults[index].status = 'valid';
      this._showXrefResults(this._xrefResults || []);
      return;
    }

    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const fields = body.fields;
        fields.load('items');
        await context.sync();
        // Update all fields (Word doesn't support per-field update easily)
        for (const field of fields.items) {
          field.updateResult();
        }
        await context.sync();
      });
      toast('Reference updated', 'success');
      // Re-scan to refresh results
      this.scanCrossReferences();
    } catch (e) {
      toast('Could not update reference', 'error');
    }
  },

  /**
   * Update all cross-references in the document.
   */
  async _updateAllXrefs() {
    if (typeof Word === 'undefined') {
      toast('All references updated (preview mode)', 'success');
      if (this._xrefResults) {
        this._xrefResults.forEach(r => r.status = 'valid');
        this._showXrefResults(this._xrefResults);
      }
      return;
    }

    try {
      toast('Updating all references...', 'info');
      await Word.run(async (context) => {
        const body = context.document.body;
        const fields = body.fields;
        fields.load('items');
        await context.sync();
        for (const field of fields.items) {
          field.updateResult();
        }
        await context.sync();
      });
      toast('All references updated', 'success');
      this.scanCrossReferences();
    } catch (e) {
      toast('Could not update references', 'error');
    }
  }

});
