/**
 * Court & Caption Types for DraftBridge
 * 
 * Based on research by Dot (2025-02-03)
 * Key finding: MA requires county in captions, federal does not.
 */

// Jurisdiction levels
export type JurisdictionType = 'federal' | 'state';

// Court levels (federal and state)
export type FederalCourtLevel = 'district' | 'circuit' | 'supreme' | 'bankruptcy';
export type StateCourtLevel = 'superior' | 'district' | 'probate' | 'housing' | 'appeals' | 'supreme';

// Caption format settings based on jurisdiction
export interface CaptionFormat {
  includeCounty: boolean;           // MA state = true, federal = false
  numberLabel: string;              // "Case No." vs "Civil Action No."
  courtFormat: 'full' | 'abbreviated';
  partyVsStyle: 'v.' | 'vs.';       // Federal uses "v.", some states use "vs."
  courtNameCase: 'upper' | 'title'; // ALL CAPS vs Title Case
}

// Court definition
export interface Court {
  id: string;
  name: string;                     // Display name
  fullName: string;                 // Full legal name for caption
  abbreviation: string;             // Short form (e.g., "D. Mass.")
  jurisdiction: JurisdictionType;
  level: FederalCourtLevel | StateCourtLevel;
  state?: string;                   // State code (null for federal)
  district?: string;                // Federal district name
  counties?: string[];              // Counties served (state courts)
  captionFormat: CaptionFormat;
  isDefault?: boolean;
}

// Caption variables for template insertion
export interface CaptionVariables {
  'court.full_name': string;        // "United States District Court, District of Massachusetts"
  'court.short_name': string;       // "D. Mass."
  'court.county'?: string;          // "MIDDLESEX, SS." (state only)
  'case.number': string;            // Docket/file number
  'case.number_label': string;      // "CIVIL ACTION NO." or "CASE NO."
  'document.type': string;          // "COMPLAINT", "ANSWER", etc.
  'plaintiff.full': string;         // Full plaintiff name(s)
  'plaintiff.short': string;        // First plaintiff + "et al."
  'defendant.full': string;         // Full defendant name(s)
  'defendant.short': string;        // First defendant + "et al."
  'party.vs': string;               // "v." or "vs."
}

// Caption preset template
export interface CaptionPreset {
  id: string;
  name: string;                     // "Federal District Court Caption"
  courtId: string;                  // Links to Court
  template: string;                 // Word content control template
  variables: (keyof CaptionVariables)[];  // Variables used in template
  isDefault?: boolean;
}

// Massachusetts county designations (with proper legal format)
export const MA_COUNTIES: Record<string, string> = {
  'barnstable': 'BARNSTABLE, SS.',
  'berkshire': 'BERKSHIRE, SS.',
  'bristol': 'BRISTOL, SS.',
  'dukes': 'DUKES, SS.',
  'essex': 'ESSEX, SS.',
  'franklin': 'FRANKLIN, SS.',
  'hampden': 'HAMPDEN, SS.',
  'hampshire': 'HAMPSHIRE, SS.',
  'middlesex': 'MIDDLESEX, SS.',
  'nantucket': 'NANTUCKET, SS.',
  'norfolk': 'NORFOLK, SS.',
  'plymouth': 'PLYMOUTH, SS.',
  'suffolk': 'SUFFOLK, SS.',
  'worcester': 'WORCESTER, SS.'
};

// Document types for pleadings
export const DOCUMENT_TYPES = [
  'COMPLAINT',
  'ANSWER',
  'MOTION TO DISMISS',
  'MOTION FOR SUMMARY JUDGMENT',
  'MEMORANDUM IN SUPPORT',
  'MEMORANDUM IN OPPOSITION',
  'REPLY MEMORANDUM',
  'AFFIDAVIT',
  'DECLARATION',
  'NOTICE OF APPEAL',
  'AMENDED COMPLAINT',
  'COUNTERCLAIM',
  'CROSS-CLAIM',
  'THIRD-PARTY COMPLAINT'
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];
