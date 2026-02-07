/**
 * DraftBridge Gold - Smart Variables Type System
 * 
 * A modern, JSON-based variable system for legal document automation.
 * Inspired by industry patterns, implemented from scratch.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// ============================================================================
// BASIC VARIABLE TYPES
// ============================================================================

export type BasicVariableType = 
  | 'text'       // Single line input
  | 'textarea'   // Multi-line input
  | 'date'       // Date picker
  | 'checkbox'   // Boolean toggle
  | 'select'     // Dropdown from list
  | 'number'     // Numeric input
  | 'email'      // Email with validation
  | 'phone';     // Phone with formatting

// ============================================================================
// SMART VARIABLE TYPES (The Good Stuff)
// ============================================================================

export type SmartVariableType =
  | 'contact'    // Person with cascading fields
  | 'party'      // Legal party (extends contact)
  | 'attorney'   // Lawyer (extends contact + bar info)
  | 'court'      // Court with jurisdiction awareness
  | 'signature'  // Signature block picker
  | 'letterhead' // Letterhead picker
  | 'component'; // Reusable template component

export type VariableType = BasicVariableType | SmartVariableType;

// ============================================================================
// ADDRESS STRUCTURE
// ============================================================================

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

// ============================================================================
// CONTACT - Base for People
// ============================================================================

export interface Contact {
  id: string;
  prefix?: string;           // Mr., Ms., Dr., Hon.
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;           // Jr., III, Esq.
  title?: string;            // CEO, Partner, etc.
  company?: string;
  address?: Address;
  email?: string;
  phone?: string;
  fax?: string;
}

/**
 * Auto-generated fields from Contact
 * These are computed, not stored
 */
export interface ContactDerived {
  fullName: string;                    // "John Smith"
  fullNameWithPrefix: string;          // "Mr. John Smith"
  fullNameWithSuffix: string;          // "John Smith, Esq."
  fullNameFormal: string;              // "Mr. John Smith, Esq."
  formalWithTitle: string;             // "John Smith, CEO"
  salutation: string;                  // "Dear Mr. Smith:"
  salutationInformal: string;          // "Dear John,"
  addressBlock: string;                // Multi-line address
  cityStateZip: string;                // "Boston, MA 02101"
  cityState: string;                   // "Boston, Massachusetts"
  emailLine?: string;                  // "Via Email: john@acme.com"
}

// ============================================================================
// PARTY - Legal Party (extends Contact)
// ============================================================================

export type PartyRole = 
  | 'plaintiff'
  | 'defendant'
  | 'petitioner'
  | 'respondent'
  | 'appellant'
  | 'appellee'
  | 'cross-defendant'
  | 'cross-complainant'
  | 'intervenor'
  | 'third-party-plaintiff'
  | 'third-party-defendant'
  | 'real-party-in-interest'
  | 'nominal-defendant'
  | 'claimant'
  | 'counter-claimant';

export interface Party extends Contact {
  role: PartyRole;
  isEntity: boolean;         // Corporation vs individual
  entityType?: string;       // LLC, Corp, Inc., etc.
  aliasNames?: string[];     // AKA, DBA, FKA
  represented: boolean;      // Has counsel?
  counselId?: string;        // Link to attorney
}

/**
 * Auto-generated from Party array
 */
export interface PartiesDerived {
  plaintiffNames: string;              // "JOHN SMITH"
  plaintiffNamesEtAl: string;          // "JOHN SMITH, et al."
  defendantNames: string;              // "ACME CORPORATION"
  defendantNamesEtAl: string;          // "ACME CORPORATION, et al."
  allPartyNames: string;               // Full list
  serviceList: string;                 // Formatted service list
  versusText: string;                  // "v." or "vs."
}

// ============================================================================
// ATTORNEY - Lawyer (extends Contact)
// ============================================================================

export interface Attorney extends Contact {
  barNumber: string;
  barState: string;
  firmName: string;
  firmAddress?: Address;
  isLeadCounsel?: boolean;
  admissions?: BarAdmission[];
}

export interface BarAdmission {
  state: string;
  barNumber: string;
  status: 'active' | 'inactive' | 'suspended';
  admissionDate?: string;
}

/**
 * Auto-generated from Attorney
 */
export interface AttorneyDerived {
  signatureBlock: string;              // Formatted signature
  counselBlock: string;                // For pleading counsel section
  barLine: string;                     // "Bar No. 123456"
  firmBlock: string;                   // Firm name + address
}

// ============================================================================
// VARIABLE DEFINITION
// ============================================================================

export interface VariableDefinition {
  id: string;                          // Unique identifier
  name: string;                        // Display label
  type: VariableType;                  // Variable type
  required: boolean;                   // Must fill before generate
  defaultValue?: unknown;              // Default or expression
  helpText?: string;                   // Tooltip/help text
  group?: string;                      // UI grouping
  order?: number;                      // Display order
  
  // Type-specific config
  config?: VariableConfig;
  
  // Conditional display
  conditional?: ConditionalRule;
  
  // Cascade rules
  cascades?: CascadeRule[];
  
  // Validation
  validation?: ValidationRule[];
}

export interface VariableConfig {
  // Select/dropdown options
  options?: SelectOption[];
  optionsSource?: string;              // Dynamic options from API
  
  // Number constraints
  min?: number;
  max?: number;
  step?: number;
  
  // Text constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;                    // Regex pattern
  
  // Date constraints
  minDate?: string;
  maxDate?: string;
  dateFormat?: string;
  
  // Array constraints (for party[], etc.)
  minItems?: number;
  maxItems?: number;
  
  // Party-specific
  allowedRoles?: PartyRole[];
  
  // Component picker
  componentType?: string;              // letterhead, signature, caption
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================================================
// CONDITIONAL RULES
// ============================================================================

export interface ConditionalRule {
  dependsOn: string;                   // Variable id
  condition: ConditionalOperator;
  value?: unknown;                     // Value to compare
}

export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'empty'
  | 'notEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'in'
  | 'notIn';

// ============================================================================
// CASCADE RULES
// ============================================================================

export interface CascadeRule {
  target: string;                      // Variable id to update
  field?: string;                      // Specific field if object
  expression: string;                  // How to compute value
  trigger?: 'change' | 'blur' | 'init';
}

// ============================================================================
// VALIDATION RULES  
// ============================================================================

export interface ValidationRule {
  type: ValidationType;
  value?: unknown;
  message: string;                     // Error message
}

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'email'
  | 'phone'
  | 'custom';

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;                    // litigation/motions, correspondence, etc.
  jurisdiction?: string;               // If jurisdiction-specific
  version: string;
  
  // Component composition
  components: ComponentReference[];
  
  // Variables
  variables: VariableDefinition[];
  
  // Template body (Handlebars)
  body: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ComponentReference {
  id: string;                          // Component template id
  slot: string;                        // Where to insert (header, footer, etc.)
  required: boolean;
}

// ============================================================================
// DOCUMENT STATE
// ============================================================================

export interface DocumentState {
  templateId: string;
  templateVersion: string;
  values: Record<string, unknown>;     // Variable values
  derivedValues: Record<string, unknown>; // Computed values
  validation: ValidationState;
  generatedAt?: string;
  lastModified: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  variableId: string;
  rule: ValidationType;
  message: string;
}

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  userId: string;
  firmId: string;
  
  // Personal info (auto-fills attorney variables)
  attorney: Attorney;
  
  // Default preferences
  defaults: UserDefaults;
  
  // Saved data for reuse
  savedContacts: Contact[];
  savedParties: Party[];
  
  // Recently used
  recentTemplates: string[];
  recentCourts: string[];
}

export interface UserDefaults {
  letterheadId?: string;
  signatureId?: string;
  dateFormat: string;
  fontFamily: string;
  fontSize: number;
  jurisdictionId?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface VariableEngineResult {
  success: boolean;
  values: Record<string, unknown>;
  derived: Record<string, unknown>;
  validation: ValidationState;
  errors?: string[];
}

export interface TemplateRenderResult {
  success: boolean;
  content: string;                     // Rendered template content
  contentControls: ContentControlMap[];
  errors?: string[];
}

export interface ContentControlMap {
  id: string;
  variableId: string;
  xpath: string;                       // Location in document
  value: string;
}
