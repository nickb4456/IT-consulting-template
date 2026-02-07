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
      sections.push({
        text: '\n\t' + values.factualAllegations.split('\n').map((paragraph, idx) => `${partyNum + idx}.\t${paragraph}`).join('\n\n\t'),
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
    const sections = [];

    // Court caption - use dynamic court database (H11: replaced hardcoded courtNames)
    sections.push({
      text: this.getCourtCaption(values.court),
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
   * Insert generated content into the Word document via Office.js.
   * Falls back to console output when running outside of Word.
   * @param {Object} template - the selected template
   * @param {Object} values - form values
   * @param {Object} derived - derived values
   */
  async insertIntoDocument(template, values, derived) {
    // Build the content sections
    const sections = this.buildDocumentContent(template, values, derived);

    // Check if Office.js is available
    if (typeof Word === 'undefined') {
      // Fallback for testing outside Word
      console.log('[SmartVariables] Word API not available. Content preview:');
      sections.forEach(section => console.log(`[${section.style}] ${section.text}`));
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
  },

  /**
   * Convert a number to its ordinal word (FIRST, SECOND, ...) for legal documents.
   * Falls back to numeric ordinal (11TH, 12TH, 21ST, etc.) beyond the word list.
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
    const suffixes = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

});
