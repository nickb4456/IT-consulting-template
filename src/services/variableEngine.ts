/**
 * DraftBridge Gold - Variable Engine
 * 
 * Main engine for variable processing, validation, and template rendering.
 * Orchestrates contact handling, cascade processing, and conditional logic.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import {
  VariableDefinition,
  TemplateDefinition,
  DocumentState,
  ValidationState,
  ValidationError,
  ValidationRule,
  ConditionalRule,
  VariableEngineResult,
  UserProfile,
  Contact,
  Party,
  Attorney
} from '../types/variables';

import {
  processCascades,
  processBatchChanges,
  buildDependencyGraph,
  DependencyGraph
} from './cascadeEngine';

// ============================================================================
// VARIABLE ENGINE
// ============================================================================

export class VariableEngine {
  private template: TemplateDefinition;
  private state: DocumentState;
  private regexCache = new Map<string, RegExp>();
  private _dependencyGraph: DependencyGraph | null = null;
  private userProfile?: UserProfile;
  
  constructor(
    template: TemplateDefinition,
    initialState?: Partial<DocumentState>,
    userProfile?: UserProfile
  ) {
    this.template = template;
    this.userProfile = userProfile;
    
    // Initialize state
    this.state = {
      templateId: template.id,
      templateVersion: template.version,
      values: initialState?.values || {},
      derivedValues: initialState?.derivedValues || {},
      validation: { isValid: true, errors: [] },
      lastModified: new Date().toISOString()
    };
    
    // Apply defaults
    this.applyDefaults();
    
    // Initial validation
    this.validate();
  }
  
  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  
  /**
   * Set a single variable value and trigger cascade processing.
   *
   * @param variableId - The unique identifier of the variable to update.
   * @param value - The new value to assign.
   * @returns Engine result containing updated values, derived values, and validation state.
   */
  setValue(variableId: string, value: unknown): VariableEngineResult {
    // Process cascades
    const result = processCascades(
      variableId,
      value,
      this.state,
      this.template.variables
    );
    
    // Update state
    this.state.values = result.updatedValues;
    this.state.derivedValues = result.derivedValues;
    this.state.lastModified = new Date().toISOString();
    
    // Revalidate
    this.validate();
    
    return this.getResult();
  }
  
  /**
   * Set multiple variable values atomically and process all cascades in a single batch.
   *
   * @param changes - Array of variable ID / value pairs to apply.
   * @returns Engine result with the final merged state after all cascades complete.
   */
  setValues(changes: Array<{ variableId: string; value: unknown }>): VariableEngineResult {
    const result = processBatchChanges(
      changes,
      this.state,
      this.template.variables
    );
    
    this.state.values = result.updatedValues;
    this.state.derivedValues = result.derivedValues;
    this.state.lastModified = new Date().toISOString();
    
    this.validate();
    
    return this.getResult();
  }
  
  /**
   * Get current value of a variable
   */
  getValue(variableId: string): unknown {
    return this.state.values[variableId];
  }
  
  /**
   * Get derived value (computed field)
   */
  getDerivedValue(path: string): unknown {
    return this.state.derivedValues[path];
  }
  
  /**
   * Get all values (for template rendering)
   */
  getAllValues(): Record<string, unknown> {
    return { ...this.state.values };
  }
  
  /**
   * Get all derived values
   */
  getAllDerivedValues(): Record<string, unknown> {
    return { ...this.state.derivedValues };
  }
  
  /**
   * Build a merged context object suitable for Handlebars template rendering.
   *
   * Combines direct variable values with derived values (prefixed with `$`)
   * and user profile data (author, firm, defaults) when available.
   */
  getTemplateContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {};
    
    // Add direct values
    Object.entries(this.state.values).forEach(([key, value]) => {
      context[key] = value;
    });
    
    // Add derived values under special $ prefix
    Object.entries(this.state.derivedValues).forEach(([key, value]) => {
      // Convert "recipient.fullName" to accessible path
      const parts = key.split('.');
      if (parts.length === 2) {
        const [varId, field] = parts;
        if (!context[`${varId}$`]) {
          context[`${varId}$`] = {};
        }
        (context[`${varId}$`] as Record<string, unknown>)[field] = value;
      }
    });
    
    // Add user profile if available
    if (this.userProfile) {
      context['author'] = this.userProfile.attorney;
      context['firm'] = {
        name: this.userProfile.attorney.firmName,
        address: this.userProfile.attorney.firmAddress
      };
      context['defaults'] = this.userProfile.defaults;
    }
    
    return context;
  }
  
  /**
   * Check if a variable should be visible
   */
  isVariableVisible(variableId: string): boolean {
    const varDef = this.template.variables.find(def => def.id === variableId);
    if (!varDef) return false;
    if (!varDef.conditional) return true;
    
    return this.evaluateCondition(varDef.conditional);
  }
  
  /**
   * Get visible variables (respecting conditionals)
   */
  getVisibleVariables(): VariableDefinition[] {
    return this.template.variables.filter(varDef => {
      if (!varDef.conditional) return true;
      const dependValue = this.state.values[varDef.conditional.dependsOn];
      return this.evaluateCondition(varDef.conditional, dependValue);
    });
  }
  
  /**
   * Get validation state
   */
  getValidationState(): ValidationState {
    return this.state.validation;
  }
  
  /** Returns `true` when all required visible variables pass validation. */
  isComplete(): boolean {
    return this.state.validation.isValid;
  }
  
  /**
   * Get current state snapshot
   */
  getState(): DocumentState {
    return { ...this.state };
  }
  
  /**
   * Get result object
   */
  getResult(): VariableEngineResult {
    return {
      success: true,
      values: this.state.values,
      derived: this.state.derivedValues,
      validation: this.state.validation
    };
  }
  
  // ==========================================================================
  // DEFAULTS
  // ==========================================================================
  
  /**
   * Apply default values from template and user profile
   */
  private applyDefaults(): void {
    for (const varDef of this.template.variables) {
      // Skip if value already set
      if (this.state.values[varDef.id] !== undefined) {
        continue;
      }
      
      // Check for user profile override
      const profileValue = this.getProfileDefault(varDef);
      if (profileValue !== undefined) {
        this.state.values[varDef.id] = profileValue;
        continue;
      }
      
      // Apply template default
      if (varDef.defaultValue !== undefined) {
        this.state.values[varDef.id] = varDef.defaultValue;
      }
    }
    
    // Process initial cascades
    const graph = this.getDependencyGraph();
    for (const varId of graph.nodes) {
      if (this.state.values[varId] !== undefined) {
        const result = processCascades(
          varId,
          this.state.values[varId],
          this.state,
          this.template.variables
        );
        this.state.derivedValues = {
          ...this.state.derivedValues,
          ...result.derivedValues
        };
      }
    }
  }
  
  /**
   * Get default value from user profile
   */
  private getProfileDefault(varDef: VariableDefinition): unknown {
    if (!this.userProfile) return undefined;
    
    switch (varDef.type) {
      case 'attorney':
        // Auto-fill with user's attorney info
        return this.userProfile.attorney;
        
      case 'letterhead':
        return this.userProfile.defaults.letterheadId;
        
      case 'signature':
        return this.userProfile.defaults.signatureId;
        
      case 'date':
        // Default to today with user's preferred format
        return new Date().toISOString().split('T')[0];
        
      default:
        return undefined;
    }
  }
  
  // ==========================================================================
  // DEPENDENCY GRAPH CACHE
  // ==========================================================================

  private getDependencyGraph(): DependencyGraph {
    if (!this._dependencyGraph) {
      this._dependencyGraph = buildDependencyGraph(this.template.variables);
    }
    return this._dependencyGraph;
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  
  /**
   * Validate all variables
   */
  private validate(): void {
    const errors: ValidationError[] = [];
    
    for (const varDef of this.template.variables) {
      // Skip hidden variables
      if (!this.isVariableVisible(varDef.id)) {
        continue;
      }
      
      const value = this.state.values[varDef.id];
      
      // Required check
      if (varDef.required && isEmpty(value)) {
        errors.push({
          variableId: varDef.id,
          rule: 'required',
          message: `${varDef.name} is required`
        });
        continue;
      }
      
      // Skip further validation if empty and not required
      if (isEmpty(value)) {
        continue;
      }
      
      // Custom validation rules
      if (varDef.validation) {
        for (const rule of varDef.validation) {
          const error = this.validateRule(varDef.id, value, rule);
          if (error) {
            errors.push(error);
          }
        }
      }
      
      // Type-specific validation
      const typeError = this.validateType(varDef, value);
      if (typeError) {
        errors.push(typeError);
      }
    }
    
    this.state.validation = {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate a single rule
   */
  private validateRule(
    variableId: string,
    value: unknown,
    rule: ValidationRule
  ): ValidationError | null {
    switch (rule.type) {
      case 'minLength':
        if (typeof value === 'string' && value.length < (rule.value as number)) {
          return { variableId, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'maxLength':
        if (typeof value === 'string' && value.length > (rule.value as number)) {
          return { variableId, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'pattern':
        if (typeof value === 'string') {
          const pattern = rule.value as string;

          // Reject dangerous regex patterns (ReDoS prevention)
          if (pattern.length > 200) {
            console.warn(`[variableEngine] Regex pattern too long (${pattern.length} chars), skipping`);
            break;
          }
          // Reject nested quantifiers like (a+)+, (a*)*$, (a{1,}){1,}
          if (/(\+|\*|\{[^}]+\})\s*\)(\+|\*|\{[^}]+\}|\?)/.test(pattern)) {
            console.warn(`[variableEngine] Rejected regex with nested quantifiers:`, pattern);
            break;
          }

          let regex = this.regexCache.get(pattern);
          if (regex) {
            // LRU: move to end (most recently used)
            this.regexCache.delete(pattern);
            this.regexCache.set(pattern, regex);
          } else {
            try {
              regex = new RegExp(pattern);
              if (this.regexCache.size >= 100) {
                const firstKey = this.regexCache.keys().next().value;
                if (firstKey) this.regexCache.delete(firstKey);
              }
              this.regexCache.set(pattern, regex);
            } catch (e) {
              console.warn(`[variableEngine] Invalid regex pattern "${pattern}":`, e);
              break;
            }
          }
          if (!regex.test(value)) {
            return { variableId, rule: rule.type, message: rule.message };
          }
        }
        break;
        
      case 'email':
        if (typeof value === 'string' && !isValidEmail(value)) {
          return { variableId, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'phone':
        if (typeof value === 'string' && !isValidPhone(value)) {
          return { variableId, rule: rule.type, message: rule.message };
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Type-specific validation
   */
  private validateType(
    varDef: VariableDefinition,
    value: unknown
  ): ValidationError | null {
    switch (varDef.type) {
      case 'contact':
      case 'party':
      case 'attorney':
        if (!isValidContact(value)) {
          return {
            variableId: varDef.id,
            rule: 'custom',
            message: `${varDef.name} must have a name (first + last) or company`
          };
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            variableId: varDef.id,
            rule: 'custom',
            message: `${varDef.name} must be a valid number`
          };
        }
        // Check min/max
        if (varDef.config?.min !== undefined && value < varDef.config.min) {
          return {
            variableId: varDef.id,
            rule: 'custom',
            message: `${varDef.name} must be at least ${varDef.config.min}`
          };
        }
        if (varDef.config?.max !== undefined && value > varDef.config.max) {
          return {
            variableId: varDef.id,
            rule: 'custom',
            message: `${varDef.name} must be at most ${varDef.config.max}`
          };
        }
        break;
    }
    
    return null;
  }
  
  // ==========================================================================
  // CONDITIONAL EVALUATION
  // ==========================================================================
  
  /**
   * Evaluate a conditional rule
   */
  private evaluateCondition(rule: ConditionalRule, dependencyValue?: unknown): boolean {
    if (dependencyValue === undefined) {
      dependencyValue = this.state.values[rule.dependsOn];
    }
    
    switch (rule.condition) {
      case 'equals':
        return dependencyValue === rule.value;
        
      case 'notEquals':
        return dependencyValue !== rule.value;
        
      case 'empty':
        return isEmpty(dependencyValue);
        
      case 'notEmpty':
        return !isEmpty(dependencyValue);
        
      case 'contains':
        if (typeof dependencyValue === 'string' && typeof rule.value === 'string') {
          return dependencyValue.includes(rule.value);
        }
        if (Array.isArray(dependencyValue)) {
          return dependencyValue.includes(rule.value);
        }
        return false;
        
      case 'notContains':
        if (typeof dependencyValue === 'string' && typeof rule.value === 'string') {
          return !dependencyValue.includes(rule.value);
        }
        if (Array.isArray(dependencyValue)) {
          return !dependencyValue.includes(rule.value);
        }
        return true;
        
      case 'greaterThan':
        return typeof dependencyValue === 'number' && 
               typeof rule.value === 'number' && 
               dependencyValue > rule.value;
        
      case 'lessThan':
        return typeof dependencyValue === 'number' && 
               typeof rule.value === 'number' && 
               dependencyValue < rule.value;
        
      case 'in':
        if (Array.isArray(rule.value)) {
          return rule.value.includes(dependencyValue);
        }
        return false;
        
      case 'notIn':
        if (Array.isArray(rule.value)) {
          return !rule.value.includes(dependencyValue);
        }
        return true;
        
      default:
        return true;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return true;
  return false;
}

function isValidEmail(email: string): boolean {
  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Accept various phone formats
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^\+?[\d]{7,15}$/.test(cleaned);
}

function isValidContact(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  const hasFirstName = typeof obj.firstName === 'string' && obj.firstName.trim() !== '';
  const hasLastName = typeof obj.lastName === 'string' && obj.lastName.trim() !== '';
  const hasCompany = typeof obj.company === 'string' && obj.company.trim() !== '';
  return hasFirstName || hasLastName || hasCompany;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Factory: create a new VariableEngine pre-loaded with a template definition.
 *
 * @param template - The template whose variables will be managed.
 * @param initialState - Optional partial state to hydrate from a saved document.
 * @param userProfile - Optional user profile for auto-filling attorney/firm defaults.
 */
export function createVariableEngine(
  template: TemplateDefinition,
  initialState?: Partial<DocumentState>,
  userProfile?: UserProfile
): VariableEngine {
  return new VariableEngine(template, initialState, userProfile);
}
