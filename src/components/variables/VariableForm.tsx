/**
 * DraftBridge Gold - Variable Form Component
 * 
 * Main form container that orchestrates all variable inputs.
 * Connects to the VariableEngine for state management.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  VariableEngine, 
  createVariableEngine 
} from '../../services/variableEngine';
import { 
  TemplateDefinition, 
  VariableDefinition,
  UserProfile,
  ValidationError
} from '../../types/variables';
import { VariableInput } from './VariableInput';
import './VariableForm.css';

// ============================================================================
// PROPS
// ============================================================================

export interface VariableFormProps {
  template: TemplateDefinition;
  userProfile?: UserProfile;
  initialValues?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>, derived: Record<string, unknown>) => void;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
  onComplete?: (values: Record<string, unknown>, derived: Record<string, unknown>) => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VariableForm: React.FC<VariableFormProps> = ({
  template,
  userProfile,
  initialValues,
  onValuesChange,
  onValidationChange,
  onComplete,
  disabled = false
}) => {
  // Initialize engine
  const [engine] = useState(() => 
    createVariableEngine(template, { values: initialValues }, userProfile)
  );
  
  // State
  const [values, setValues] = useState<Record<string, unknown>>(engine.getAllValues());
  const [derivedValues, setDerivedValues] = useState<Record<string, unknown>>(engine.getAllDerivedValues());
  const [validation, setValidation] = useState(engine.getValidationState());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['case', 'parties', 'motion']));
  
  // Group variables
  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableDefinition[]> = {};
    const ungrouped: VariableDefinition[] = [];
    
    const visibleVars = engine.getVisibleVariables();
    
    for (const variable of visibleVars) {
      if (variable.group) {
        if (!groups[variable.group]) {
          groups[variable.group] = [];
        }
        groups[variable.group].push(variable);
      } else {
        ungrouped.push(variable);
      }
    }
    
    // Sort by order within each group
    for (const group of Object.values(groups)) {
      group.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    ungrouped.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return { groups, ungrouped };
  }, [engine, values]); // Re-compute when values change (conditionals)
  
  // Get error for a variable
  const getError = useCallback((variableId: string): string | undefined => {
    const error = validation.errors.find(e => e.variableId === variableId);
    return error?.message;
  }, [validation]);
  
  // Handle value change
  const handleChange = useCallback((variableId: string, value: unknown) => {
    const result = engine.setValue(variableId, value);
    
    setValues(result.values);
    setDerivedValues(result.derived);
    setValidation(result.validation);
    
    onValuesChange?.(result.values, result.derived);
    onValidationChange?.(result.validation.isValid, result.validation.errors);
  }, [engine, onValuesChange, onValidationChange]);
  
  // Toggle group expansion
  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);
  
  // Handle generate/complete
  const handleGenerate = useCallback(() => {
    if (engine.isComplete()) {
      onComplete?.(values, derivedValues);
    }
  }, [engine, values, derivedValues, onComplete]);
  
  // Notify parent of initial state (use refs to avoid stale closures)
  const onValuesChangeRef = React.useRef(onValuesChange);
  const onValidationChangeRef = React.useRef(onValidationChange);
  onValuesChangeRef.current = onValuesChange;
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    const initialValues = engine.getAllValues();
    const initialDerived = engine.getAllDerivedValues();
    const initialValidation = engine.getValidationState();
    onValuesChangeRef.current?.(initialValues, initialDerived);
    onValidationChangeRef.current?.(initialValidation.isValid, initialValidation.errors);
  }, [engine]); // Only on mount - engine is stable
  
  // Group titles (friendly names)
  const groupTitles: Record<string, string> = {
    case: 'Case Information',
    parties: 'Parties',
    motion: 'Motion Details',
    attachments: 'Attachments & Service',
    author: 'Your Information'
  };

  return (
    <div className="variable-form">
      {/* Template Header */}
      <div className="form-header">
        <h2 className="template-name">{template.name}</h2>
        {template.description && (
          <p className="template-description">{template.description}</p>
        )}
      </div>
      
      {/* Validation Summary */}
      {!validation.isValid && (
        <div className="validation-summary" role="alert">
          <span className="validation-icon">⚠️</span>
          <span className="validation-text">
            {validation.errors.length} required field{validation.errors.length > 1 ? 's' : ''} need attention
          </span>
        </div>
      )}
      
      {/* Grouped Variables */}
      {Object.entries(groupedVariables.groups).map(([group, vars]) => (
        <div key={group} className="variable-group">
          <button
            type="button"
            className={`group-header ${expandedGroups.has(group) ? 'expanded' : ''}`}
            onClick={() => toggleGroup(group)}
            aria-expanded={expandedGroups.has(group)}
          >
            <span className="group-title">{groupTitles[group] || group}</span>
            <span className="group-count">{vars.length}</span>
            <span className="group-expand">▼</span>
          </button>
          
          {expandedGroups.has(group) && (
            <div className="group-content">
              {vars.map((variable) => (
                <VariableInput
                  key={variable.id}
                  variable={variable}
                  value={values[variable.id]}
                  derivedValues={derivedValues}
                  onChange={handleChange}
                  error={getError(variable.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Ungrouped Variables */}
      {groupedVariables.ungrouped.length > 0 && (
        <div className="variable-group ungrouped">
          <div className="group-content">
            {groupedVariables.ungrouped.map((variable) => (
              <VariableInput
                key={variable.id}
                variable={variable}
                value={values[variable.id]}
                derivedValues={derivedValues}
                onChange={handleChange}
                error={getError(variable.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.history.back()}
          disabled={disabled}
        >
          Cancel
        </button>
        
        <button
          type="button"
          className={`btn btn-primary ${!validation.isValid ? 'disabled' : ''}`}
          onClick={handleGenerate}
          disabled={disabled || !validation.isValid}
        >
          {validation.isValid ? '✓ Generate Document' : 'Complete Required Fields'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPACT MODE (For sidebar task pane)
// ============================================================================

export interface VariableFormCompactProps extends VariableFormProps {
  showPreview?: boolean;
}

export const VariableFormCompact: React.FC<VariableFormCompactProps> = (props) => {
  return (
    <div className="variable-form-compact">
      <VariableForm {...props} />
    </div>
  );
};

export default VariableForm;
