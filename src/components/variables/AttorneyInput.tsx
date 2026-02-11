/**
 * DraftBridge Gold - Attorney Input Component
 * 
 * Attorney input with bar info and signature preview.
 * Auto-fills from user profile when available.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Attorney, Address, BarAdmission } from '../../types/variables';
import './AttorneyInput.css';

// ============================================================================
// STATE OPTIONS
// ============================================================================

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

// ============================================================================
// PROPS
// ============================================================================

export interface AttorneyInputProps {
  value: Attorney | undefined;
  onChange: (value: Attorney) => void;
  derivedValues?: Record<string, unknown>;
  variableId: string;
  disabled?: boolean;
  useProfile?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AttorneyInput: React.FC<AttorneyInputProps> = ({
  value,
  onChange,
  derivedValues,
  variableId,
  disabled = false,
  useProfile = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);

  // Stable fallback ID for empty attorney (generated once per component instance)
  const [fallbackId] = useState(() => `attorney-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Initialize empty attorney if needed
  const attorney: Attorney = value || {
    id: fallbackId,
    firstName: '',
    lastName: '',
    barNumber: '',
    barState: '',
    firmName: ''
  };
  
  // Update field
  const updateField = useCallback(<K extends keyof Attorney>(
    field: K,
    fieldValue: Attorney[K]
  ) => {
    onChange({ ...attorney, [field]: fieldValue });
  }, [attorney, onChange]);
  
  // Update firm address
  const updateFirmAddress = useCallback(<K extends keyof Address>(
    field: K,
    fieldValue: Address[K]
  ) => {
    const address: Address = attorney.firmAddress || {
      street1: '',
      city: '',
      state: '',
      zip: ''
    };
    onChange({
      ...attorney,
      firmAddress: { ...address, [field]: fieldValue }
    });
  }, [attorney, onChange]);
  
  // Get derived value helper
  const getDerived = useCallback((field: string): string => {
    const key = `${variableId}.${field}`;
    return (derivedValues?.[key] as string) || '';
  }, [variableId, derivedValues]);
  
  // Display name
  const displayName = useMemo(() => {
    if (attorney.firstName || attorney.lastName) {
      return `${attorney.firstName} ${attorney.lastName}`.trim() + (attorney.suffix ? `, ${attorney.suffix}` : '');
    }
    return 'Enter attorney details...';
  }, [attorney]);

  return (
    <div className="attorney-input">
      {/* Header */}
      <div 
        className="attorney-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <span className="attorney-icon">⚖️</span>
        <span className="attorney-display-name">{displayName}</span>
        {attorney.barNumber && (
          <span className="attorney-bar-badge">Bar #{attorney.barNumber}</span>
        )}
        <span className={`attorney-expand ${expanded ? 'expanded' : ''}`}>▼</span>
      </div>
      
      {/* Expanded Form */}
      {expanded && (
        <div className="attorney-form">
          {/* Name Section */}
          <div className="attorney-section">
            <h4>Name</h4>
            <div className="attorney-row">
              <div className="attorney-field">
                <label>First Name *</label>
                <input
                  type="text"
                  value={attorney.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>
              
              <div className="attorney-field">
                <label>Middle</label>
                <input
                  type="text"
                  value={attorney.middleName || ''}
                  onChange={(e) => updateField('middleName', e.target.value || undefined)}
                  disabled={disabled}
                />
              </div>
              
              <div className="attorney-field">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={attorney.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>
              
              <div className="attorney-field attorney-field-small">
                <label>Suffix</label>
                <select
                  value={attorney.suffix || ''}
                  onChange={(e) => updateField('suffix', e.target.value || undefined)}
                  disabled={disabled}
                >
                  <option value="">--</option>
                  <option value="Esq.">Esq.</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Bar Admission Section */}
          <div className="attorney-section">
            <h4>Bar Admission</h4>
            <div className="attorney-row">
              <div className="attorney-field">
                <label>Bar Number *</label>
                <input
                  type="text"
                  value={attorney.barNumber}
                  onChange={(e) => updateField('barNumber', e.target.value)}
                  placeholder="123456"
                  disabled={disabled}
                  required
                />
              </div>
              
              <div className="attorney-field">
                <label>State *</label>
                <select
                  value={attorney.barState}
                  onChange={(e) => updateField('barState', e.target.value)}
                  disabled={disabled}
                  required
                >
                  <option value="">Select State...</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Firm Section */}
          <div className="attorney-section">
            <h4>Firm Information</h4>
            <div className="attorney-row">
              <div className="attorney-field attorney-field-full">
                <label>Firm Name *</label>
                <input
                  type="text"
                  value={attorney.firmName}
                  onChange={(e) => updateField('firmName', e.target.value)}
                  placeholder="Law Offices of..."
                  disabled={disabled}
                  required
                />
              </div>
            </div>
            
            <div className="attorney-row">
              <div className="attorney-field attorney-field-full">
                <label>Street Address</label>
                <input
                  type="text"
                  value={attorney.firmAddress?.street1 || ''}
                  onChange={(e) => updateFirmAddress('street1', e.target.value)}
                  placeholder="123 Legal Way"
                  disabled={disabled}
                />
              </div>
            </div>
            
            <div className="attorney-row">
              <div className="attorney-field">
                <label>City</label>
                <input
                  type="text"
                  value={attorney.firmAddress?.city || ''}
                  onChange={(e) => updateFirmAddress('city', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="attorney-field attorney-field-small">
                <label>State</label>
                <input
                  type="text"
                  value={attorney.firmAddress?.state || ''}
                  onChange={(e) => updateFirmAddress('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  disabled={disabled}
                />
              </div>
              <div className="attorney-field attorney-field-small">
                <label>ZIP</label>
                <input
                  type="text"
                  value={attorney.firmAddress?.zip || ''}
                  onChange={(e) => updateFirmAddress('zip', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          {/* Contact Section */}
          <div className="attorney-section">
            <h4>Contact</h4>
            <div className="attorney-row">
              <div className="attorney-field">
                <label>Email</label>
                <input
                  type="email"
                  value={attorney.email || ''}
                  onChange={(e) => updateField('email', e.target.value || undefined)}
                  placeholder="attorney@firm.com"
                  disabled={disabled}
                />
              </div>
              
              <div className="attorney-field">
                <label>Phone</label>
                <input
                  type="tel"
                  value={attorney.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value || undefined)}
                  placeholder="(555) 123-4567"
                  disabled={disabled}
                />
              </div>
              
              <div className="attorney-field">
                <label>Fax</label>
                <input
                  type="tel"
                  value={attorney.fax || ''}
                  onChange={(e) => updateField('fax', e.target.value || undefined)}
                  placeholder="(555) 123-4568"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          {/* Lead Counsel Toggle */}
          <div className="attorney-row">
            <label className="attorney-checkbox">
              <input
                type="checkbox"
                checked={attorney.isLeadCounsel || false}
                onChange={(e) => updateField('isLeadCounsel', e.target.checked)}
                disabled={disabled}
              />
              <span>Lead Counsel</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Signature Block Preview */}
      {(attorney.firstName || attorney.lastName) && (
        <div className="attorney-preview">
          <button
            type="button"
            className="preview-toggle"
            onClick={() => setShowSignaturePreview(!showSignaturePreview)}
          >
            {showSignaturePreview ? '▼' : '▶'} Signature Block Preview
          </button>
          
          {showSignaturePreview && (
            <pre className="signature-preview">
              {getDerived('signatureBlock') || generateSignaturePreview(attorney)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SIGNATURE PREVIEW HELPER
// ============================================================================

function generateSignaturePreview(attorney: Attorney): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('Respectfully submitted,');
  lines.push('');
  lines.push('');
  lines.push('____________________________');
  
  let name = `${attorney.firstName} ${attorney.lastName}`.trim();
  if (attorney.suffix) name += `, ${attorney.suffix}`;
  lines.push(name);
  
  if (attorney.barNumber) {
    lines.push(`Bar No. ${attorney.barNumber}`);
  }
  
  if (attorney.firmName) {
    lines.push(attorney.firmName);
  }
  
  if (attorney.firmAddress?.street1) {
    lines.push(attorney.firmAddress.street1);
  }
  
  if (attorney.firmAddress?.city && attorney.firmAddress?.state) {
    const cityLine = `${attorney.firmAddress.city}, ${attorney.firmAddress.state}`;
    lines.push(attorney.firmAddress.zip ? `${cityLine} ${attorney.firmAddress.zip}` : cityLine);
  }
  
  if (attorney.phone) {
    lines.push(`Tel: ${attorney.phone}`);
  }
  
  if (attorney.email) {
    lines.push(`Email: ${attorney.email}`);
  }
  
  return lines.join('\n');
}

export default AttorneyInput;
