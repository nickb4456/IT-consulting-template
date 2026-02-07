/**
 * DraftBridge Gold - Party Input Component
 * 
 * Legal party input with role selection and entity handling.
 * Supports single party or array of parties.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Party, PartyRole, Address, VariableConfig } from '../../types/variables';
import './PartyInput.css';

// ============================================================================
// ROLE OPTIONS
// ============================================================================

const PARTY_ROLES: Array<{ value: PartyRole; label: string; side: 'plaintiff' | 'defendant' | 'other' }> = [
  { value: 'plaintiff', label: 'Plaintiff', side: 'plaintiff' },
  { value: 'defendant', label: 'Defendant', side: 'defendant' },
  { value: 'petitioner', label: 'Petitioner', side: 'plaintiff' },
  { value: 'respondent', label: 'Respondent', side: 'defendant' },
  { value: 'appellant', label: 'Appellant', side: 'plaintiff' },
  { value: 'appellee', label: 'Appellee', side: 'defendant' },
  { value: 'cross-defendant', label: 'Cross-Defendant', side: 'defendant' },
  { value: 'cross-complainant', label: 'Cross-Complainant', side: 'plaintiff' },
  { value: 'intervenor', label: 'Intervenor', side: 'other' },
  { value: 'third-party-plaintiff', label: 'Third-Party Plaintiff', side: 'plaintiff' },
  { value: 'third-party-defendant', label: 'Third-Party Defendant', side: 'defendant' },
  { value: 'real-party-in-interest', label: 'Real Party in Interest', side: 'other' },
  { value: 'nominal-defendant', label: 'Nominal Defendant', side: 'defendant' },
  { value: 'claimant', label: 'Claimant', side: 'plaintiff' },
  { value: 'counter-claimant', label: 'Counter-Claimant', side: 'plaintiff' }
];

const ENTITY_TYPES = [
  'Corporation',
  'LLC',
  'LLP',
  'LP',
  'Inc.',
  'Co.',
  'Ltd.',
  'Trust',
  'Estate',
  'Partnership',
  'Association'
];

// ============================================================================
// PROPS
// ============================================================================

export interface PartyInputProps {
  value: Party | Party[] | undefined;
  onChange: (value: Party | Party[]) => void;
  derivedValues?: Record<string, unknown>;
  variableId: string;
  config?: VariableConfig;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PartyInput: React.FC<PartyInputProps> = ({
  value,
  onChange,
  derivedValues,
  variableId,
  config,
  disabled = false
}) => {
  // Determine if we're in array mode
  const isArrayMode = config?.minItems !== undefined || config?.maxItems !== undefined || Array.isArray(value);
  
  // Normalize value to array for internal handling
  const parties: Party[] = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }, [value]);
  
  // Filter allowed roles
  const allowedRoles = useMemo(() => {
    if (config?.allowedRoles) {
      return PARTY_ROLES.filter(r => config.allowedRoles!.includes(r.value));
    }
    return PARTY_ROLES;
  }, [config?.allowedRoles]);
  
  // Add new party
  const addParty = useCallback(() => {
    const defaultRole = allowedRoles[0]?.value || 'plaintiff';
    const newParty: Party = {
      id: `party-${Date.now()}`,
      firstName: '',
      lastName: '',
      role: defaultRole,
      isEntity: false,
      represented: true
    };
    
    if (isArrayMode) {
      onChange([...parties, newParty]);
    } else {
      onChange(newParty);
    }
  }, [parties, allowedRoles, isArrayMode, onChange]);
  
  // Update party at index
  const updateParty = useCallback((index: number, updated: Party) => {
    if (isArrayMode) {
      const newParties = [...parties];
      newParties[index] = updated;
      onChange(newParties);
    } else {
      onChange(updated);
    }
  }, [parties, isArrayMode, onChange]);
  
  // Remove party at index
  const removeParty = useCallback((index: number) => {
    if (isArrayMode) {
      const newParties = parties.filter((_, i) => i !== index);
      onChange(newParties);
    }
  }, [parties, isArrayMode, onChange]);
  
  // Get derived values for caption
  const captionPreview = useMemo(() => {
    if (!derivedValues) return null;
    
    return {
      plaintiffs: derivedValues[`${variableId}.plaintiffNamesEtAl`] as string,
      defendants: derivedValues[`${variableId}.defendantNamesEtAl`] as string,
      versus: derivedValues[`${variableId}.versusText`] as string || 'v.'
    };
  }, [derivedValues, variableId]);

  const canAddMore = !config?.maxItems || parties.length < config.maxItems;
  const canRemove = !config?.minItems || parties.length > config.minItems;

  return (
    <div className="party-input">
      {/* Party List */}
      {parties.map((party, index) => (
        <SinglePartyInput
          key={party.id}
          party={party}
          index={index}
          onChange={(updated) => updateParty(index, updated)}
          onRemove={canRemove ? () => removeParty(index) : undefined}
          allowedRoles={allowedRoles}
          disabled={disabled}
        />
      ))}
      
      {/* Add Button */}
      {canAddMore && (
        <button
          type="button"
          className="party-add-btn"
          onClick={addParty}
          disabled={disabled}
        >
          + Add {allowedRoles[0]?.label || 'Party'}
        </button>
      )}
      
      {/* Caption Preview */}
      {captionPreview && parties.length > 0 && (
        <div className="party-caption-preview">
          <div className="caption-line plaintiffs">
            {captionPreview.plaintiffs || '[Plaintiffs]'},
          </div>
          <div className="caption-line versus">
            {captionPreview.versus}
          </div>
          <div className="caption-line defendants">
            {captionPreview.defendants || '[Defendants]'},
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SINGLE PARTY INPUT
// ============================================================================

interface SinglePartyInputProps {
  party: Party;
  index: number;
  onChange: (party: Party) => void;
  onRemove?: () => void;
  allowedRoles: typeof PARTY_ROLES;
  disabled: boolean;
}

const SinglePartyInput: React.FC<SinglePartyInputProps> = ({
  party,
  index,
  onChange,
  onRemove,
  allowedRoles,
  disabled
}) => {
  const [expanded, setExpanded] = useState(index === 0 || !party.firstName);
  
  const updateField = <K extends keyof Party>(field: K, value: Party[K]) => {
    onChange({ ...party, [field]: value });
  };
  
  const updateAddress = <K extends keyof Address>(field: K, value: Address[K]) => {
    const address: Address = party.address || {
      street1: '',
      city: '',
      state: '',
      zip: ''
    };
    onChange({ ...party, address: { ...address, [field]: value } });
  };
  
  // Display name for collapsed view
  const displayName = useMemo(() => {
    if (party.isEntity && party.company) {
      return party.company;
    }
    if (party.firstName || party.lastName) {
      return `${party.firstName} ${party.lastName}`.trim();
    }
    return 'New Party';
  }, [party]);
  
  const roleInfo = allowedRoles.find(r => r.value === party.role);

  return (
    <div className={`single-party ${roleInfo?.side || 'other'}`}>
      {/* Header */}
      <div 
        className="party-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <span className={`party-icon ${party.isEntity ? 'entity' : 'individual'}`}>
          {party.isEntity ? '🏢' : '👤'}
        </span>
        <span className="party-display-name">{displayName}</span>
        <span className="party-role-badge">{roleInfo?.label || party.role}</span>
        <span className={`party-expand ${expanded ? 'expanded' : ''}`}>▼</span>
        {onRemove && (
          <button
            type="button"
            className="party-remove-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove party"
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>
      
      {/* Expanded Form */}
      {expanded && (
        <div className="party-form">
          {/* Type & Role Row */}
          <div className="party-row">
            <div className="party-field">
              <label>Party Type</label>
              <div className="party-type-toggle">
                <button
                  type="button"
                  className={`type-btn ${!party.isEntity ? 'active' : ''}`}
                  onClick={() => updateField('isEntity', false)}
                  disabled={disabled}
                >
                  👤 Individual
                </button>
                <button
                  type="button"
                  className={`type-btn ${party.isEntity ? 'active' : ''}`}
                  onClick={() => updateField('isEntity', true)}
                  disabled={disabled}
                >
                  🏢 Entity
                </button>
              </div>
            </div>
            
            <div className="party-field">
              <label>Role</label>
              <select
                value={party.role}
                onChange={(e) => updateField('role', e.target.value as PartyRole)}
                disabled={disabled}
              >
                {allowedRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Entity Fields */}
          {party.isEntity ? (
            <>
              <div className="party-row">
                <div className="party-field party-field-full">
                  <label>Entity Name *</label>
                  <input
                    type="text"
                    value={party.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                    placeholder="Acme Corporation"
                    disabled={disabled}
                    required
                  />
                </div>
              </div>
              
              <div className="party-row">
                <div className="party-field">
                  <label>Entity Type</label>
                  <select
                    value={party.entityType || ''}
                    onChange={(e) => updateField('entityType', e.target.value || undefined)}
                    disabled={disabled}
                  >
                    <option value="">Select...</option>
                    {ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* Individual Fields */
            <>
              <div className="party-row">
                <div className="party-field">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={party.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </div>
                
                <div className="party-field">
                  <label>Middle</label>
                  <input
                    type="text"
                    value={party.middleName || ''}
                    onChange={(e) => updateField('middleName', e.target.value || undefined)}
                    disabled={disabled}
                  />
                </div>
                
                <div className="party-field">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={party.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </div>
              </div>
            </>
          )}
          
          {/* Address */}
          <div className="party-section">
            <h4>Address (for Service)</h4>
            <div className="party-row">
              <div className="party-field party-field-full">
                <input
                  type="text"
                  value={party.address?.street1 || ''}
                  onChange={(e) => updateAddress('street1', e.target.value)}
                  placeholder="Street Address"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="party-row">
              <div className="party-field">
                <input
                  type="text"
                  value={party.address?.city || ''}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  placeholder="City"
                  disabled={disabled}
                />
              </div>
              <div className="party-field party-field-small">
                <input
                  type="text"
                  value={party.address?.state || ''}
                  onChange={(e) => updateAddress('state', e.target.value.toUpperCase())}
                  placeholder="State"
                  maxLength={2}
                  disabled={disabled}
                />
              </div>
              <div className="party-field party-field-small">
                <input
                  type="text"
                  value={party.address?.zip || ''}
                  onChange={(e) => updateAddress('zip', e.target.value)}
                  placeholder="ZIP"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          {/* Representation */}
          <div className="party-row">
            <label className="party-checkbox">
              <input
                type="checkbox"
                checked={party.represented}
                onChange={(e) => updateField('represented', e.target.checked)}
                disabled={disabled}
              />
              <span>Represented by counsel</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyInput;
