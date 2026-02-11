/**
 * DraftBridge Gold - Contact Handler
 * 
 * Processes Contact, Party, and Attorney types.
 * Auto-generates derived fields (salutation, address block, etc.)
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import {
  Contact,
  ContactDerived,
  Party,
  PartyRole,
  PartiesDerived,
  Attorney,
  AttorneyDerived,
  Address
} from '../types/variables';

// ============================================================================
// CONTACT PROCESSING
// ============================================================================

/**
 * Generate all derived display fields from a Contact record.
 *
 * Computes full name variants, salutations, address block, and other
 * presentation-ready strings used by templates and caption formatting.
 */
export function deriveContactFields(contact: Contact): ContactDerived {
  const fullName = buildFullName(contact);
  const fullNameWithPrefix = buildFullNameWithPrefix(contact);
  const fullNameWithSuffix = buildFullNameWithSuffix(contact);
  const fullNameFormal = buildFullNameFormal(contact);
  
  return {
    fullName,
    fullNameWithPrefix,
    fullNameWithSuffix,
    fullNameFormal,
    formalWithTitle: contact.title 
      ? `${fullName}, ${contact.title}` 
      : fullName,
    salutation: buildSalutation(contact),
    salutationInformal: `Dear ${contact.firstName},`,
    addressBlock: buildAddressBlock(contact),
    cityStateZip: buildCityStateZip(contact.address),
    cityState: buildCityState(contact.address),
    emailLine: contact.email 
      ? `Via Email: ${contact.email}` 
      : undefined
  };
}

/**
 * Build full name: "John Michael Smith"
 */
function buildFullName(contact: Contact): string {
  const parts = [
    contact.firstName,
    contact.middleName,
    contact.lastName
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Build name with prefix: "Mr. John Smith"
 */
function buildFullNameWithPrefix(contact: Contact): string {
  const name = buildFullName(contact);
  return contact.prefix ? `${contact.prefix} ${name}` : name;
}

/**
 * Build name with suffix: "John Smith, Esq."
 */
function buildFullNameWithSuffix(contact: Contact): string {
  const name = buildFullName(contact);
  return contact.suffix ? `${name}, ${contact.suffix}` : name;
}

/**
 * Build formal name: "Mr. John Smith, Esq."
 */
function buildFullNameFormal(contact: Contact): string {
  let name = buildFullName(contact);
  if (contact.prefix) name = `${contact.prefix} ${name}`;
  if (contact.suffix) name = `${name}, ${contact.suffix}`;
  return name;
}

/**
 * Build salutation: "Dear Mr. Smith:"
 */
function buildSalutation(contact: Contact): string {
  const prefix = contact.prefix || inferPrefix(contact);
  const lastName = contact.lastName;
  
  if (prefix) {
    return `Dear ${prefix} ${lastName}:`;
  }
  return `Dear ${contact.firstName} ${lastName}:`;
}

/**
 * Infer prefix from suffix (Esq. → no prefix needed for lawyers)
 *
 * Placeholder for future inference logic. Currently returns undefined
 * because reliable prefix inference requires gender data or user configuration
 * that is not yet available in the contact model.
 */
function inferPrefix(contact: Contact): string | undefined {
  // Lawyers with Esq. suffix typically don't need Mr./Ms.
  if (contact.suffix?.toLowerCase().includes('esq')) {
    return undefined;
  }
  // TODO: Add inference logic when gender/title preferences are added to Contact model
  return undefined;
}

/**
 * Build multi-line address block
 */
function buildAddressBlock(contact: Contact): string {
  const lines: string[] = [];

  // Name line
  const name = buildFullNameFormal(contact);
  lines.push(name);

  // Title line (if present)
  if (contact.title) {
    lines.push(contact.title);
  }

  // Company line (if present)
  if (contact.company) {
    lines.push(contact.company);
  }

  // Address lines (reuse helper)
  lines.push(...formatAddressLines(contact.address));

  return lines.join('\n');
}

/**
 * Build city, state zip: "Boston, MA 02101"
 */
/**
 * Format address into lines: [street1, street2?, city/state/zip]
 */
function formatAddressLines(address?: Address): string[] {
  if (!address) return [];
  const lines: string[] = [];
  if (address.street1) lines.push(address.street1);
  if (address.street2) lines.push(address.street2);
  const cityStateZip = buildCityStateZip(address);
  if (cityStateZip) lines.push(cityStateZip);
  return lines;
}

function buildCityStateZip(address?: Address): string {
  if (!address) return '';
  
  const parts: string[] = [];
  
  if (address.city && address.state) {
    parts.push(`${address.city}, ${address.state}`);
  } else if (address.city) {
    parts.push(address.city);
  } else if (address.state) {
    parts.push(address.state);
  }
  
  if (address.zip) {
    parts.push(address.zip);
  }
  
  return parts.join(' ');
}

/**
 * Build city, state (full name): "Boston, Massachusetts"
 */
function buildCityState(address?: Address): string {
  if (!address?.city || !address?.state) return '';
  
  const fullState = STATE_NAMES[address.state.toUpperCase()] || address.state;
  return `${address.city}, ${fullState}`;
}

// ============================================================================
// PARTY PROCESSING
// ============================================================================

/**
 * Generate derived caption fields from an array of parties.
 *
 * Produces plaintiff/defendant name lists (with et al. variants),
 * a formatted service list, and the versus style text.
 */
export function derivePartyFields(
  parties: Party[], 
  versusStyle: 'v.' | 'vs.' = 'v.'
): PartiesDerived {
  const plaintiffs = parties.filter(p => isPlaintiffRole(p.role));
  const defendants = parties.filter(p => isDefendantRole(p.role));
  
  return {
    plaintiffNames: formatPartyNames(plaintiffs, false),
    plaintiffNamesEtAl: formatPartyNames(plaintiffs, true),
    defendantNames: formatPartyNames(defendants, false),
    defendantNamesEtAl: formatPartyNames(defendants, true),
    allPartyNames: formatAllPartyNames(parties),
    serviceList: buildServiceList(parties),
    versusText: versusStyle
  };
}

/**
 * Check if role is plaintiff-side
 */
function isPlaintiffRole(role: PartyRole): boolean {
  const plaintiffRoles: PartyRole[] = [
    'plaintiff',
    'petitioner',
    'appellant',
    'cross-complainant',
    'counter-claimant',
    'claimant',
    'third-party-plaintiff'
  ];
  return plaintiffRoles.includes(role);
}

/**
 * Check if role is defendant-side
 */
function isDefendantRole(role: PartyRole): boolean {
  const defendantRoles: PartyRole[] = [
    'defendant',
    'respondent',
    'appellee',
    'cross-defendant',
    'third-party-defendant',
    'nominal-defendant'
  ];
  return defendantRoles.includes(role);
}

/**
 * Format party names for caption (ALL CAPS)
 */
function formatPartyNames(parties: Party[], useEtAl: boolean): string {
  if (parties.length === 0) return '';
  
  const firstParty = formatPartyName(parties[0]);
  
  if (parties.length === 1 || !useEtAl) {
    if (parties.length === 1) {
      return firstParty.toUpperCase();
    }
    return parties.map(p => formatPartyName(p).toUpperCase()).join(', ');
  }
  
  // Multiple parties with et al.
  return `${firstParty.toUpperCase()}, et al.`;
}

/**
 * Format single party name (handles entities vs individuals)
 */
function formatPartyName(party: Party): string {
  if (party.isEntity) {
    // Corporation: "Acme Corporation" or "Acme Corp., Inc."
    let name = party.company || buildFullName(party);
    if (party.entityType && !name.includes(party.entityType)) {
      name = `${name}, ${party.entityType}`;
    }
    return name;
  }
  
  // Individual
  return buildFullName(party);
}

/**
 * Format all party names (for reference)
 */
function formatAllPartyNames(parties: Party[]): string {
  return parties
    .map(p => `${formatPartyName(p)} (${formatRoleLabel(p.role)})`)
    .join('\n');
}

/**
 * Format role for display
 */
function formatRoleLabel(role: PartyRole): string {
  const labels: Record<PartyRole, string> = {
    'plaintiff': 'Plaintiff',
    'defendant': 'Defendant',
    'petitioner': 'Petitioner',
    'respondent': 'Respondent',
    'appellant': 'Appellant',
    'appellee': 'Appellee',
    'cross-defendant': 'Cross-Defendant',
    'cross-complainant': 'Cross-Complainant',
    'intervenor': 'Intervenor',
    'third-party-plaintiff': 'Third-Party Plaintiff',
    'third-party-defendant': 'Third-Party Defendant',
    'real-party-in-interest': 'Real Party in Interest',
    'nominal-defendant': 'Nominal Defendant',
    'claimant': 'Claimant',
    'counter-claimant': 'Counter-Claimant'
  };
  return labels[role] || role;
}

/**
 * Build proof of service list
 */
function buildServiceList(parties: Party[]): string {
  const lines: string[] = [];

  parties.forEach(party => {
    lines.push(`${formatPartyName(party)}, ${formatRoleLabel(party.role)}`);
    if (party.address) {
      const addressLines = formatAddressLines(party.address);
      if (addressLines.length > 0) {
        lines.push(addressLines.join('\n'));
      }
    }
    lines.push(''); // Blank line between parties
  });

  return lines.join('\n').trim();
}

// ============================================================================
// ATTORNEY PROCESSING
// ============================================================================

/**
 * Generate derived display fields specific to attorneys.
 *
 * Produces a signature block, counsel identification block, bar number line,
 * and firm address block for use in pleadings and correspondence.
 */
export function deriveAttorneyFields(attorney: Attorney): AttorneyDerived {
  const contactDerived = deriveContactFields(attorney);
  
  return {
    signatureBlock: buildSignatureBlock(attorney, contactDerived),
    counselBlock: buildCounselBlock(attorney, contactDerived),
    barLine: `Bar No. ${attorney.barNumber}`,
    firmBlock: buildFirmBlock(attorney)
  };
}

/**
 * Build signature block for pleadings
 */
function buildSignatureBlock(attorney: Attorney, derived: ContactDerived): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Respectfully submitted,');
  lines.push('');
  lines.push('');
  lines.push('____________________________');
  lines.push(derived.fullNameFormal);
  lines.push(`Bar No. ${attorney.barNumber}`);
  lines.push(attorney.firmName);
  lines.push(...formatAddressLines(attorney.firmAddress));

  if (attorney.phone) {
    lines.push(`Tel: ${attorney.phone}`);
  }
  if (attorney.fax) {
    lines.push(`Fax: ${attorney.fax}`);
  }
  if (attorney.email) {
    lines.push(`Email: ${attorney.email}`);
  }

  lines.push('');
  lines.push('Attorney for [Party]');

  return lines.join('\n');
}

/**
 * Build counsel block for caption
 */
function buildCounselBlock(attorney: Attorney, derived: ContactDerived): string {
  const lines: string[] = [];

  lines.push(derived.fullNameFormal);
  lines.push(`(Bar No. ${attorney.barNumber})`);
  lines.push(attorney.firmName);
  lines.push(...formatAddressLines(attorney.firmAddress));

  if (attorney.phone) {
    lines.push(`Telephone: ${attorney.phone}`);
  }
  if (attorney.email) {
    lines.push(`Email: ${attorney.email}`);
  }

  return lines.join('\n');
}

/**
 * Build firm block
 */
function buildFirmBlock(attorney: Attorney): string {
  const lines: string[] = [attorney.firmName];
  lines.push(...formatAddressLines(attorney.firmAddress));
  
  return lines.join('\n');
}

// ============================================================================
// STATE NAME MAPPING
// ============================================================================

// KEEP IN SYNC with src/taskpane/sv-state.js STATE_NAMES (55 entries: 50 states + DC + 5 territories)
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
  'PR': 'Puerto Rico',
  'VI': 'Virgin Islands',
  'GU': 'Guam',
  'MP': 'Northern Mariana Islands',
  'AS': 'American Samoa'
};
