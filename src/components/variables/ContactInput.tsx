/**
 * DraftBridge Gold - Contact Input Component
 * 
 * Smart contact input with expandable fields and derived previews.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Contact, Address } from '../../types/variables';
import './ContactInput.css';

// ============================================================================
// PROPS
// ============================================================================

export interface ContactInputProps {
  value: Contact | undefined;
  onChange: (value: Contact) => void;
  derivedValues?: Record<string, unknown>;
  variableId: string;
  disabled?: boolean;
  showPreview?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ContactInput: React.FC<ContactInputProps> = ({
  value,
  onChange,
  derivedValues,
  variableId,
  disabled = false,
  showPreview = true
}) => {
  const [expanded, setExpanded] = useState(false);

  // Stable fallback ID for empty contact (generated once per component instance)
  const [fallbackId] = useState(() => `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Initialize empty contact if needed
  const contact: Contact = value || {
    id: fallbackId,
    firstName: '',
    lastName: ''
  };
  
  // Update a single field
  const updateField = useCallback(<K extends keyof Contact>(
    field: K, 
    fieldValue: Contact[K]
  ) => {
    onChange({ ...contact, [field]: fieldValue });
  }, [contact, onChange]);
  
  // Update address field
  const updateAddress = useCallback(<K extends keyof Address>(
    field: K,
    fieldValue: Address[K]
  ) => {
    const address: Address = contact.address || {
      street1: '',
      city: '',
      state: '',
      zip: ''
    };
    onChange({
      ...contact,
      address: { ...address, [field]: fieldValue }
    });
  }, [contact, onChange]);
  
  // Get derived value helper
  const getDerived = useCallback((field: string): string => {
    const key = `${variableId}.${field}`;
    return (derivedValues?.[key] as string) || '';
  }, [variableId, derivedValues]);
  
  // Quick name display
  const displayName = useMemo(() => {
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`.trim();
    }
    return 'Enter contact details...';
  }, [contact.firstName, contact.lastName]);

  return (
    <div className="contact-input">
      {/* Collapsed View */}
      <div 
        className="contact-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="contact-icon">👤</span>
        <span className="contact-display-name">{displayName}</span>
        <span className={`contact-expand-icon ${expanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      
      {/* Expanded Form */}
      {expanded && (
        <div className="contact-form">
          {/* Name Row */}
          <div className="contact-row contact-row-name">
            <div className="contact-field contact-field-small">
              <label>Prefix</label>
              <select
                value={contact.prefix || ''}
                onChange={(e) => updateField('prefix', e.target.value || undefined)}
                disabled={disabled}
              >
                <option value="">--</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Hon.">Hon.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
            
            <div className="contact-field">
              <label>First Name *</label>
              <input
                type="text"
                value={contact.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            
            <div className="contact-field">
              <label>Middle</label>
              <input
                type="text"
                value={contact.middleName || ''}
                onChange={(e) => updateField('middleName', e.target.value || undefined)}
                disabled={disabled}
              />
            </div>
            
            <div className="contact-field">
              <label>Last Name *</label>
              <input
                type="text"
                value={contact.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            
            <div className="contact-field contact-field-small">
              <label>Suffix</label>
              <select
                value={contact.suffix || ''}
                onChange={(e) => updateField('suffix', e.target.value || undefined)}
                disabled={disabled}
              >
                <option value="">--</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
                <option value="Esq.">Esq.</option>
                <option value="MD">MD</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
          </div>
          
          {/* Title & Company Row */}
          <div className="contact-row">
            <div className="contact-field">
              <label>Title</label>
              <input
                type="text"
                value={contact.title || ''}
                onChange={(e) => updateField('title', e.target.value || undefined)}
                placeholder="CEO, Partner, etc."
                disabled={disabled}
              />
            </div>
            
            <div className="contact-field">
              <label>Company</label>
              <input
                type="text"
                value={contact.company || ''}
                onChange={(e) => updateField('company', e.target.value || undefined)}
                placeholder="Company name"
                disabled={disabled}
              />
            </div>
          </div>
          
          {/* Address Section */}
          <div className="contact-section">
            <h4 className="contact-section-title">Address</h4>
            
            <div className="contact-row">
              <div className="contact-field contact-field-full">
                <label>Street Address</label>
                <input
                  type="text"
                  value={contact.address?.street1 || ''}
                  onChange={(e) => updateAddress('street1', e.target.value)}
                  placeholder="123 Main Street"
                  disabled={disabled}
                />
              </div>
            </div>
            
            <div className="contact-row">
              <div className="contact-field contact-field-full">
                <label>Street Address 2</label>
                <input
                  type="text"
                  value={contact.address?.street2 || ''}
                  onChange={(e) => updateAddress('street2', e.target.value || undefined)}
                  placeholder="Suite, Floor, etc."
                  disabled={disabled}
                />
              </div>
            </div>
            
            <div className="contact-row">
              <div className="contact-field">
                <label>City</label>
                <input
                  type="text"
                  value={contact.address?.city || ''}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  disabled={disabled}
                />
              </div>
              
              <div className="contact-field contact-field-small">
                <label>State</label>
                <input
                  type="text"
                  value={contact.address?.state || ''}
                  onChange={(e) => updateAddress('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="MA"
                  disabled={disabled}
                />
              </div>
              
              <div className="contact-field contact-field-small">
                <label>ZIP</label>
                <input
                  type="text"
                  value={contact.address?.zip || ''}
                  onChange={(e) => updateAddress('zip', e.target.value)}
                  maxLength={10}
                  placeholder="02101"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          {/* Contact Info Section */}
          <div className="contact-section">
            <h4 className="contact-section-title">Contact Info</h4>
            
            <div className="contact-row">
              <div className="contact-field">
                <label>Email</label>
                <input
                  type="email"
                  value={contact.email || ''}
                  onChange={(e) => updateField('email', e.target.value || undefined)}
                  placeholder="email@example.com"
                  disabled={disabled}
                />
              </div>
              
              <div className="contact-field">
                <label>Phone</label>
                <input
                  type="tel"
                  value={contact.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value || undefined)}
                  placeholder="(555) 123-4567"
                  disabled={disabled}
                />
              </div>
              
              <div className="contact-field">
                <label>Fax</label>
                <input
                  type="tel"
                  value={contact.fax || ''}
                  onChange={(e) => updateField('fax', e.target.value || undefined)}
                  placeholder="(555) 123-4568"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Derived Values Preview */}
      {showPreview && (contact.firstName || contact.lastName) && (
        <div className="contact-preview">
          <div className="preview-section">
            <span className="preview-label">Salutation:</span>
            <span className="preview-value">{getDerived('salutation') || '—'}</span>
          </div>
          <div className="preview-section">
            <span className="preview-label">Address Block:</span>
            <pre className="preview-value preview-multiline">
              {getDerived('addressBlock') || '—'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInput;
