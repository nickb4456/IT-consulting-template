/**
 * DraftBridge Gold - Variable Input Components
 * 
 * Renders appropriate input control based on variable type.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import React, { useState, useCallback } from 'react';
import { 
  VariableDefinition, 
  VariableType,
  Contact,
  Party,
  Attorney,
  SelectOption
} from '../../types/variables';
import { ContactInput } from './ContactInput';
import { PartyInput } from './PartyInput';
import { AttorneyInput } from './AttorneyInput';
import './VariableInput.css';

// ============================================================================
// PROPS
// ============================================================================

export interface VariableInputProps {
  variable: VariableDefinition;
  value: unknown;
  derivedValues?: Record<string, unknown>;
  onChange: (variableId: string, value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const VariableInput: React.FC<VariableInputProps> = ({
  variable,
  value,
  derivedValues,
  onChange,
  error,
  disabled = false
}) => {
  const handleChange = useCallback((newValue: unknown) => {
    onChange(variable.id, newValue);
  }, [variable.id, onChange]);

  const inputProps = {
    id: `var-${variable.id}`,
    disabled,
    'aria-describedby': error ? `${variable.id}-error` : undefined,
    'aria-invalid': !!error
  };

  return (
    <div className={`variable-input ${error ? 'has-error' : ''}`}>
      <label htmlFor={`var-${variable.id}`} className="variable-label">
        {variable.name}
        {variable.required && <span className="required-indicator">*</span>}
      </label>
      
      {variable.helpText && (
        <p className="variable-help">{variable.helpText}</p>
      )}
      
      <div className="variable-control">
        {renderInput(variable, value, derivedValues, handleChange, inputProps)}
      </div>
      
      {error && (
        <p id={`${variable.id}-error`} className="variable-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// INPUT RENDERER
// ============================================================================

function renderInput(
  variable: VariableDefinition,
  value: unknown,
  derivedValues: Record<string, unknown> | undefined,
  onChange: (value: unknown) => void,
  inputProps: Record<string, unknown>
): React.ReactNode {
  switch (variable.type) {
    case 'text':
      return (
        <TextInput
          value={value as string || ''}
          onChange={onChange}
          config={variable.config}
          {...inputProps}
        />
      );
      
    case 'textarea':
      return (
        <TextareaInput
          value={value as string || ''}
          onChange={onChange}
          config={variable.config}
          {...inputProps}
        />
      );
      
    case 'number':
      return (
        <NumberInput
          value={value as number}
          onChange={onChange}
          config={variable.config}
          {...inputProps}
        />
      );
      
    case 'date':
      return (
        <DateInput
          value={value as string || ''}
          onChange={onChange}
          config={variable.config}
          {...inputProps}
        />
      );
      
    case 'checkbox':
      return (
        <CheckboxInput
          value={value as boolean || false}
          onChange={onChange}
          label={variable.name}
          {...inputProps}
        />
      );
      
    case 'select':
      return (
        <SelectInput
          value={value as string || ''}
          onChange={onChange}
          options={variable.config?.options || []}
          {...inputProps}
        />
      );
      
    case 'email':
      return (
        <EmailInput
          value={value as string || ''}
          onChange={onChange}
          {...inputProps}
        />
      );
      
    case 'phone':
      return (
        <PhoneInput
          value={value as string || ''}
          onChange={onChange}
          {...inputProps}
        />
      );
      
    case 'contact':
      return (
        <ContactInput
          value={value as Contact | undefined}
          onChange={onChange}
          derivedValues={derivedValues}
          variableId={variable.id}
          {...inputProps}
        />
      );
      
    case 'party':
      return (
        <PartyInput
          value={value as Party | Party[] | undefined}
          onChange={onChange}
          derivedValues={derivedValues}
          variableId={variable.id}
          config={variable.config}
          {...inputProps}
        />
      );
      
    case 'attorney':
      return (
        <AttorneyInput
          value={value as Attorney | undefined}
          onChange={onChange}
          derivedValues={derivedValues}
          variableId={variable.id}
          {...inputProps}
        />
      );
      
    default:
      return (
        <TextInput
          value={String(value || '')}
          onChange={onChange}
          {...inputProps}
        />
      );
  }
}

// ============================================================================
// BASIC INPUT COMPONENTS
// ============================================================================

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  config?: { maxLength?: number; minLength?: number; pattern?: string };
  id?: string;
  disabled?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ 
  value, 
  onChange, 
  config,
  ...props 
}) => (
  <input
    type="text"
    className="input-text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    maxLength={config?.maxLength}
    pattern={config?.pattern}
    {...props}
  />
);

interface TextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  config?: { maxLength?: number; minLength?: number };
  id?: string;
  disabled?: boolean;
}

const TextareaInput: React.FC<TextareaInputProps> = ({ 
  value, 
  onChange, 
  config,
  ...props 
}) => (
  <textarea
    className="input-textarea"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    maxLength={config?.maxLength}
    rows={4}
    {...props}
  />
);

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  config?: { min?: number; max?: number; step?: number };
  id?: string;
  disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  config,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined as unknown as number); // Allow clearing
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  return (
    <input
      type="number"
      className="input-number"
      value={value ?? ''}
      onChange={handleChange}
      min={config?.min}
      max={config?.max}
      step={config?.step}
      {...props}
    />
  );
};

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  config?: { minDate?: string; maxDate?: string };
  id?: string;
  disabled?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  config,
  ...props 
}) => (
  <input
    type="date"
    className="input-date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    min={config?.minDate}
    max={config?.maxDate}
    {...props}
  />
);

interface CheckboxInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({ 
  value, 
  onChange, 
  label,
  id,
  ...props 
}) => (
  <label className="input-checkbox-wrapper">
    <input
      type="checkbox"
      className="input-checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      id={id}
      {...props}
    />
    <span className="checkbox-label">{label}</span>
  </label>
);

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  disabled?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({ 
  value, 
  onChange, 
  options,
  ...props 
}) => (
  <select
    className="input-select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    {...props}
  >
    <option value="">Select...</option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value} disabled={opt.disabled}>
        {opt.label}
      </option>
    ))}
  </select>
);

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

const EmailInput: React.FC<EmailInputProps> = ({ 
  value, 
  onChange, 
  ...props 
}) => (
  <input
    type="email"
    className="input-email"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="email@example.com"
    {...props}
  />
);

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ 
  value, 
  onChange, 
  ...props 
}) => {
  // Format phone as user types
  const formatPhone = (input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  return (
    <input
      type="tel"
      className="input-phone"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      placeholder="(555) 123-4567"
      {...props}
    />
  );
};

export default VariableInput;
