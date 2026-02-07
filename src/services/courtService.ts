/**
 * Court Service for DraftBridge
 * 
 * Jurisdiction-aware caption generation based on Dot's research.
 * Key insight: MA requires county, federal does not.
 * 
 * @see /tmp/family-agents/dot-research/CAPTION-REQUIREMENTS.md
 */

import {
  Court,
  CaptionFormat,
  CaptionVariables,
  CaptionPreset,
  MA_COUNTIES,
  JurisdictionType
} from '../types/courts';

// =============================================================================
// DEFAULT COURTS
// =============================================================================

export const DEFAULT_COURTS: Court[] = [
  // Federal Courts - Massachusetts
  {
    id: 'fed-d-mass',
    name: 'District of Massachusetts',
    fullName: 'UNITED STATES DISTRICT COURT\nDISTRICT OF MASSACHUSETTS',
    abbreviation: 'D. Mass.',
    jurisdiction: 'federal',
    level: 'district',
    district: 'Massachusetts',
    captionFormat: {
      includeCounty: false,
      numberLabel: 'Case No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    },
    isDefault: true
  },
  {
    id: 'fed-1st-cir',
    name: 'First Circuit Court of Appeals',
    fullName: 'UNITED STATES COURT OF APPEALS\nFOR THE FIRST CIRCUIT',
    abbreviation: '1st Cir.',
    jurisdiction: 'federal',
    level: 'circuit',
    captionFormat: {
      includeCounty: false,
      numberLabel: 'No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },
  {
    id: 'fed-bankr-d-mass',
    name: 'Bankruptcy Court, D. Mass.',
    fullName: 'UNITED STATES BANKRUPTCY COURT\nDISTRICT OF MASSACHUSETTS',
    abbreviation: 'Bankr. D. Mass.',
    jurisdiction: 'federal',
    level: 'bankruptcy',
    district: 'Massachusetts',
    captionFormat: {
      includeCounty: false,
      numberLabel: 'Case No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },

  // Massachusetts State Courts
  {
    id: 'ma-superior',
    name: 'Massachusetts Superior Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nSUPERIOR COURT',
    abbreviation: 'Mass. Super. Ct.',
    jurisdiction: 'state',
    level: 'superior',
    state: 'MA',
    counties: Object.keys(MA_COUNTIES),
    captionFormat: {
      includeCounty: true,  // KEY DIFFERENCE from federal
      numberLabel: 'Civil Action No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    },
    isDefault: true
  },
  {
    id: 'ma-district',
    name: 'Massachusetts District Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nDISTRICT COURT',
    abbreviation: 'Mass. Dist. Ct.',
    jurisdiction: 'state',
    level: 'district',
    state: 'MA',
    counties: Object.keys(MA_COUNTIES),
    captionFormat: {
      includeCounty: true,
      numberLabel: 'Docket No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },
  {
    id: 'ma-probate',
    name: 'Massachusetts Probate & Family Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nPROBATE AND FAMILY COURT',
    abbreviation: 'Mass. Prob. & Fam. Ct.',
    jurisdiction: 'state',
    level: 'probate',
    state: 'MA',
    counties: Object.keys(MA_COUNTIES),
    captionFormat: {
      includeCounty: true,
      numberLabel: 'Docket No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },
  {
    id: 'ma-housing',
    name: 'Massachusetts Housing Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nHOUSING COURT',
    abbreviation: 'Mass. Housing Ct.',
    jurisdiction: 'state',
    level: 'housing',
    state: 'MA',
    counties: Object.keys(MA_COUNTIES),
    captionFormat: {
      includeCounty: true,
      numberLabel: 'Docket No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },
  {
    id: 'ma-appeals',
    name: 'Massachusetts Appeals Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nAPPEALS COURT',
    abbreviation: 'Mass. App. Ct.',
    jurisdiction: 'state',
    level: 'appeals',
    state: 'MA',
    captionFormat: {
      includeCounty: false,  // Appellate courts don't use county
      numberLabel: 'No.',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  },
  {
    id: 'ma-sjc',
    name: 'Massachusetts Supreme Judicial Court',
    fullName: 'COMMONWEALTH OF MASSACHUSETTS\nSUPREME JUDICIAL COURT',
    abbreviation: 'Mass.',
    jurisdiction: 'state',
    level: 'supreme',
    state: 'MA',
    captionFormat: {
      includeCounty: false,  // SJC doesn't use county
      numberLabel: 'SJC-',
      courtFormat: 'full',
      partyVsStyle: 'v.',
      courtNameCase: 'upper'
    }
  }
];

// =============================================================================
// CAPTION PRESETS
// =============================================================================

export const CAPTION_PRESETS: CaptionPreset[] = [
  {
    id: 'federal-district',
    name: 'Federal District Court Caption',
    courtId: 'fed-d-mass',
    template: `{{court.full_name}}

{{case.number_label}} {{case.number}}

{{plaintiff.full}},
        Plaintiff,
                                         {{document.type}}
{{party.vs}}

{{defendant.full}},
        Defendant.`,
    variables: [
      'court.full_name',
      'case.number_label',
      'case.number',
      'plaintiff.full',
      'defendant.full',
      'party.vs',
      'document.type'
    ],
    isDefault: true
  },
  {
    id: 'ma-superior',
    name: 'Massachusetts Superior Court Caption',
    courtId: 'ma-superior',
    template: `{{court.full_name}}
{{court.county}}                         {{case.number_label}} {{case.number}}

{{plaintiff.full}},
        Plaintiff,
                                         {{document.type}}
{{party.vs}}

{{defendant.full}},
        Defendant.`,
    variables: [
      'court.full_name',
      'court.county',
      'case.number_label',
      'case.number',
      'plaintiff.full',
      'defendant.full',
      'party.vs',
      'document.type'
    ],
    isDefault: true
  },
  {
    id: 'ma-district',
    name: 'Massachusetts District Court Caption',
    courtId: 'ma-district',
    template: `{{court.full_name}}
{{court.county}}                         {{case.number_label}} {{case.number}}

{{plaintiff.full}},
        Plaintiff,
                                         {{document.type}}
{{party.vs}}

{{defendant.full}},
        Defendant.`,
    variables: [
      'court.full_name',
      'court.county',
      'case.number_label',
      'case.number',
      'plaintiff.full',
      'defendant.full',
      'party.vs',
      'document.type'
    ]
  },
  {
    id: 'ma-probate',
    name: 'Massachusetts Probate & Family Court Caption',
    courtId: 'ma-probate',
    template: `{{court.full_name}}
{{court.county}}                         {{case.number_label}} {{case.number}}

{{plaintiff.full}},
        Plaintiff,
                                         {{document.type}}
{{party.vs}}

{{defendant.full}},
        Defendant.`,
    variables: [
      'court.full_name',
      'court.county',
      'case.number_label',
      'case.number',
      'plaintiff.full',
      'defendant.full',
      'party.vs',
      'document.type'
    ]
  }
];

// =============================================================================
// COURT SERVICE
// =============================================================================

export class CourtService {
  private courts: Court[] = [...DEFAULT_COURTS];
  private presets: CaptionPreset[] = [...CAPTION_PRESETS];

  // ---------------------------------------------------------------------------
  // COURT METHODS
  // ---------------------------------------------------------------------------

  /** Return all registered courts (federal and state). */
  getAllCourts(): Court[] {
    return this.courts;
  }

  /** Look up a court by its unique ID. */
  getCourtById(id: string): Court | undefined {
    return this.courts.find(court => court.id === id);
  }

  /** Filter courts by jurisdiction type (federal or state). */
  getCourtsByJurisdiction(jurisdiction: JurisdictionType): Court[] {
    return this.courts.filter(court => court.jurisdiction === jurisdiction);
  }

  /** Filter courts by state code (e.g. "MA"). */
  getCourtsByState(state: string): Court[] {
    return this.courts.filter(court => court.state === state);
  }

  getFederalCourts(): Court[] {
    return this.getCourtsByJurisdiction('federal');
  }

  getStateCourts(): Court[] {
    return this.getCourtsByJurisdiction('state');
  }

  // ---------------------------------------------------------------------------
  // CAPTION FORMAT DETECTION
  // ---------------------------------------------------------------------------

  /**
   * Get caption format based on court.
   * Key logic: State courts (except appellate) require county.
   */
  getCaptionFormat(court: Court): CaptionFormat {
    return court.captionFormat;
  }

  /**
   * Check if court requires county in caption.
   * Per Dot's research: MA trial courts require county, federal never does.
   */
  requiresCounty(court: Court): boolean {
    return court.captionFormat.includeCounty;
  }

  // ---------------------------------------------------------------------------
  // CAPTION GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Build caption variables for template insertion.
   */
  buildCaptionVariables(options: {
    court: Court;
    county?: string;          // Required if court.captionFormat.includeCounty
    caseNumber: string;
    documentType: string;
    plaintiffs: string[];
    defendants: string[];
  }): CaptionVariables {
    const { court, county, caseNumber, documentType, plaintiffs, defendants } = options;
    const format = court.captionFormat;

    // Build county string for MA courts
    let countyStr: string | undefined;
    if (format.includeCounty && county) {
      countyStr = MA_COUNTIES[county.toLowerCase()] || `${county.toUpperCase()}, SS.`;
    }

    // Party formatting
    const plaintiffFull = plaintiffs.join(',\n');
    const plaintiffShort = plaintiffs.length > 1 
      ? `${plaintiffs[0]}, et al.` 
      : plaintiffs[0];
    
    const defendantFull = defendants.join(',\n');
    const defendantShort = defendants.length > 1 
      ? `${defendants[0]}, et al.` 
      : defendants[0];

    return {
      'court.full_name': court.fullName,
      'court.short_name': court.abbreviation,
      'court.county': countyStr,
      'case.number': caseNumber,
      'case.number_label': format.numberLabel,
      'document.type': documentType.toUpperCase(),
      'plaintiff.full': plaintiffFull,
      'plaintiff.short': plaintiffShort,
      'defendant.full': defendantFull,
      'defendant.short': defendantShort,
      'party.vs': format.partyVsStyle
    };
  }

  /**
   * Generate caption text from preset template and variables.
   */
  /**
   * Generate caption text from a preset template and a set of caption variables.
   *
   * @throws Error if the preset ID is not found.
   */
  generateCaption(presetId: string, variables: CaptionVariables): string {
    const preset = this.presets.find(captionPreset => captionPreset.id === presetId);
    if (!preset) {
      throw new Error(`Caption preset not found: ${presetId}`);
    }

    let result = preset.template;

    // Replace all template variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
    }

    // Clean up empty county lines for federal courts
    result = result.replace(/^\s*\n/gm, '\n').replace(/\n{3,}/g, '\n\n');

    return result;
  }

  // ---------------------------------------------------------------------------
  // PRESET METHODS
  // ---------------------------------------------------------------------------

  /** Return all registered caption presets. */
  getAllPresets(): CaptionPreset[] {
    return this.presets;
  }

  /** Look up a caption preset by ID. */
  getPresetById(id: string): CaptionPreset | undefined {
    return this.presets.find(preset => preset.id === id);
  }

  /** Get all caption presets associated with a specific court. */
  getPresetsForCourt(courtId: string): CaptionPreset[] {
    return this.presets.filter(preset => preset.courtId === courtId);
  }

  // ---------------------------------------------------------------------------
  // COUNTY HELPERS
  // ---------------------------------------------------------------------------

  /** Return all Massachusetts county names (keys of MA_COUNTIES). */
  getMACounties(): string[] {
    return Object.keys(MA_COUNTIES);
  }

  /** Format a county name into its legal caption form (e.g. "MIDDLESEX, SS."). */
  formatCountyForCaption(county: string): string {
    return MA_COUNTIES[county.toLowerCase()] || `${county.toUpperCase()}, SS.`;
  }
}

// Export singleton instance
export const courtService = new CourtService();
