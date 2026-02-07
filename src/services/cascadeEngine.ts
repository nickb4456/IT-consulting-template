/**
 * DraftBridge Gold - Cascade Engine
 * 
 * Processes cascade rules when variables change.
 * Handles dependency resolution and computed values.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import {
  VariableDefinition,
  CascadeRule,
  Contact,
  Party,
  Attorney,
  DocumentState
} from '../types/variables';

import {
  deriveContactFields,
  derivePartyFields,
  deriveAttorneyFields
} from './contactHandler';

// Blocklist to prevent prototype pollution via template traversal
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ============================================================================
// CASCADE PROCESSOR
// ============================================================================

/** Aggregated result of processing one or more cascade chains. */
export interface CascadeResult {
  updatedValues: Record<string, unknown>;
  derivedValues: Record<string, unknown>;
  changedVariables: string[];
}

/**
 * Process cascades triggered by a single variable change.
 *
 * Walks the dependency graph recursively, applying cascade expressions and
 * type-specific derivations. Protects against cycles via `visited` and
 * runaway recursion via `depth`.
 *
 * @param changedVariableId - The variable whose value just changed.
 * @param newValue - The new value assigned to the variable.
 * @param state - Current document state snapshot (values + derivedValues).
 * @param variables - Full list of variable definitions (needed for lookups).
 * @param visited - Set of variable IDs already processed in this cascade chain (cycle detection).
 * @param depth - Current recursion depth (max 20).
 * @returns Aggregated cascade result with updated values, derived values, and changed variable IDs.
 */
export function processCascades(
  changedVariableId: string,
  newValue: unknown,
  state: DocumentState,
  variables: VariableDefinition[],
  visited: Set<string> = new Set(),
  depth: number = 0
): CascadeResult {
  const MAX_CASCADE_DEPTH = 20;

  const updatedValues = { ...state.values };
  const derivedValues = { ...state.derivedValues };
  const changedVariables: string[] = [changedVariableId];

  // Update the changed variable
  updatedValues[changedVariableId] = newValue;

  // Find variable definition
  const varDef = variables.find(varDef => varDef.id === changedVariableId);
  if (!varDef) {
    return { updatedValues, derivedValues, changedVariables };
  }

  // Process type-specific derivations
  processTypeDerivations(varDef, newValue, derivedValues);

  // Process cascade rules
  if (varDef.cascades) {
    for (const cascade of varDef.cascades) {
      // Cycle detection: skip if this target was already visited in the chain
      if (visited.has(cascade.target)) {
        console.warn(
          `[CascadeEngine] Cycle detected: skipping cascade to "${cascade.target}" ` +
          `(already visited in chain from "${changedVariableId}")`
        );
        continue;
      }

      // Depth limit: prevent runaway recursion
      if (depth >= MAX_CASCADE_DEPTH) {
        console.warn(
          `[CascadeEngine] Max cascade depth (${MAX_CASCADE_DEPTH}) reached ` +
          `processing "${changedVariableId}" -> "${cascade.target}". Skipping.`
        );
        continue;
      }

      const result = executeCascade(
        cascade,
        newValue,
        updatedValues,
        derivedValues
      );

      if (result.changed) {
        updatedValues[cascade.target] = result.value;
        changedVariables.push(cascade.target);

        // Recursive: process cascades for the updated target
        const targetDef = variables.find(def => def.id === cascade.target);
        if (targetDef?.cascades) {
          const nextVisited = new Set(visited);
          nextVisited.add(changedVariableId);

          const nestedResult = processCascades(
            cascade.target,
            result.value,
            { ...state, values: updatedValues, derivedValues },
            variables,
            nextVisited,
            depth + 1
          );
          Object.assign(updatedValues, nestedResult.updatedValues);
          Object.assign(derivedValues, nestedResult.derivedValues);
          changedVariables.push(...nestedResult.changedVariables);
        }
      }
    }
  }

  return {
    updatedValues,
    derivedValues,
    changedVariables: [...new Set(changedVariables)] // Dedupe
  };
}

/**
 * Process type-specific derivations
 */
function processTypeDerivations(
  varDef: VariableDefinition,
  value: unknown,
  derivedValues: Record<string, unknown>
): void {
  const baseKey = varDef.id;
  
  switch (varDef.type) {
    case 'contact':
      if (isContact(value)) {
        const derived = deriveContactFields(value);
        Object.entries(derived).forEach(([field, fieldValue]) => {
          derivedValues[`${baseKey}.${field}`] = fieldValue;
        });
      }
      break;

    case 'party':
      if (isParty(value)) {
        // Single party derivations
        const derived = deriveContactFields(value);
        Object.entries(derived).forEach(([field, fieldValue]) => {
          derivedValues[`${baseKey}.${field}`] = fieldValue;
        });
      } else if (Array.isArray(value) && value.every(isParty)) {
        // Array of parties
        const derived = derivePartyFields(value);
        Object.entries(derived).forEach(([field, fieldValue]) => {
          derivedValues[`${baseKey}.${field}`] = fieldValue;
        });
        // Also derive individual party fields
        value.forEach((party, index) => {
          const partyDerived = deriveContactFields(party);
          Object.entries(partyDerived).forEach(([field, fieldValue]) => {
            derivedValues[`${baseKey}[${index}].${field}`] = fieldValue;
          });
        });
      }
      break;

    case 'attorney':
      if (isAttorney(value)) {
        const derived = deriveAttorneyFields(value);
        Object.entries(derived).forEach(([field, fieldValue]) => {
          derivedValues[`${baseKey}.${field}`] = fieldValue;
        });
        // Also include contact fields
        const contactDerived = deriveContactFields(value);
        Object.entries(contactDerived).forEach(([field, fieldValue]) => {
          derivedValues[`${baseKey}.${field}`] = fieldValue;
        });
      }
      break;
  }
}

/**
 * Execute a single cascade rule.
 * Returns changed: false when the computed value is identical to the current value,
 * preventing unnecessary downstream cascades and re-renders.
 */
function executeCascade(
  cascade: CascadeRule,
  sourceValue: unknown,
  values: Record<string, unknown>,
  derivedValues: Record<string, unknown>
): { changed: boolean; value: unknown } {
  // Evaluate the expression
  const computedValue = evaluateExpression(
    cascade.expression,
    sourceValue,
    values,
    derivedValues
  );

  // Check if target has a specific field
  if (cascade.field) {
    const currentTarget = values[cascade.target] as Record<string, unknown> | undefined;
    if (currentTarget) {
      // Compare the specific field value before constructing a new object
      if (valuesEqual(currentTarget[cascade.field], computedValue)) {
        return { changed: false, value: currentTarget };
      }
      const newTarget = { ...currentTarget, [cascade.field]: computedValue };
      return { changed: true, value: newTarget };
    }
    return { changed: true, value: { [cascade.field]: computedValue } };
  }

  // Compare against current value to avoid unnecessary cascades
  const currentValue = values[cascade.target];
  if (valuesEqual(currentValue, computedValue)) {
    return { changed: false, value: computedValue };
  }

  return { changed: true, value: computedValue };
}

/**
 * Deep equality check for cascade values.
 * Uses JSON.stringify for objects/arrays; strict equality for primitives.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

// ============================================================================
// EXPRESSION EVALUATION
// ============================================================================

/**
 * Evaluate a cascade expression against the current variable context.
 *
 * Supported expression formats:
 * - Direct value pass-through: `{{value}}` or `{{this}}`
 * - Variable reference: `{{variableId}}`
 * - Field access: `{{variableId.field}}`
 * - Derived field: `{{variableId.$fieldName}}`
 * - Template interpolation: any string containing `{{...}}` tokens
 *
 * @returns The resolved value -- may be any type for direct refs, or a string for interpolated templates.
 */
export function evaluateExpression(
  expression: string,
  sourceValue: unknown,
  values: Record<string, unknown>,
  derivedValues: Record<string, unknown>
): unknown {
  // Simple value pass-through
  if (expression === '{{value}}' || expression === '{{this}}') {
    return sourceValue;
  }
  
  // Variable reference: {{variableId}}
  const varRefMatch = expression.match(/^\{\{(\w+)\}\}$/);
  if (varRefMatch) {
    return values[varRefMatch[1]];
  }
  
  // Field access: {{variableId.field}}
  const fieldMatch = expression.match(/^\{\{(\w+)\.(\w+)\}\}$/);
  if (fieldMatch) {
    const [, varId, field] = fieldMatch;
    if (BLOCKED_KEYS.has(varId) || BLOCKED_KEYS.has(field)) {
      console.warn('[CascadeEngine] Blocked prototype pollution attempt:', expression);
      return undefined;
    }
    const obj = values[varId] as Record<string, unknown> | undefined;
    return obj?.[field];
  }
  
  // Derived field: {{variableId.$field}}
  const derivedMatch = expression.match(/^\{\{(\w+)\.\$(\w+)\}\}$/);
  if (derivedMatch) {
    const [, varId, field] = derivedMatch;
    return derivedValues[`${varId}.${field}`];
  }
  
  // Template string interpolation
  if (expression.includes('{{')) {
    return interpolateTemplate(expression, values, derivedValues);
  }
  
  // Literal value
  return expression;
}

/**
 * Interpolate template string with variables
 */
function interpolateTemplate(
  template: string,
  values: Record<string, unknown>,
  derivedValues: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Block prototype pollution attempts
    const pathParts = trimmedPath.split('.');
    if (pathParts.some((part: string) => BLOCKED_KEYS.has(part))) {
      console.warn('[CascadeEngine] Blocked prototype pollution attempt:', trimmedPath);
      return '';
    }

    // Check derived values first (e.g., "contact.$salutation")
    if (trimmedPath.includes('.$')) {
      const [varId, derivedField] = trimmedPath.split('.$');
      const key = `${varId}.${derivedField}`;
      const value = derivedValues[key];
      return value !== undefined ? String(value) : match;
    }
    
    // Check for dot notation (e.g., "contact.firstName")
    if (trimmedPath.includes('.')) {
      const parts = trimmedPath.split('.');
      let current: unknown = values[parts[0]];
      
      for (let i = 1; i < parts.length && current != null; i++) {
        current = (current as Record<string, unknown>)[parts[i]];
      }
      
      return current !== undefined ? String(current) : match;
    }
    
    // Simple variable reference
    const value = values[trimmedPath];
    return value !== undefined ? String(value) : match;
  });
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isContact(value: unknown): value is Contact {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.firstName === 'string' && typeof obj.lastName === 'string';
}

function isParty(value: unknown): value is Party {
  if (!isContact(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.role === 'string';
}

function isAttorney(value: unknown): value is Attorney {
  if (!isContact(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.barNumber === 'string' && typeof obj.firmName === 'string';
}

// ============================================================================
// DEPENDENCY RESOLUTION
// ============================================================================

/** Directed graph of variable dependencies used for topological ordering. */
export interface DependencyGraph {
  nodes: Set<string>;
  edges: Map<string, Set<string>>; // source -> targets
}

/**
 * Build a dependency graph from variable definitions.
 *
 * Edges are created for cascade targets and conditional dependencies so that
 * downstream processing order can be determined.
 */
export function buildDependencyGraph(
  variables: VariableDefinition[]
): DependencyGraph {
  const nodes = new Set<string>();
  const edges = new Map<string, Set<string>>();
  
  for (const varDef of variables) {
    nodes.add(varDef.id);
    
    // Add cascade edges
    if (varDef.cascades) {
      const targets = edges.get(varDef.id) || new Set();
      for (const cascade of varDef.cascades) {
        targets.add(cascade.target);
      }
      edges.set(varDef.id, targets);
    }
    
    // Add conditional dependency edges (reverse)
    if (varDef.conditional) {
      const dependsOn = varDef.conditional.dependsOn;
      const targets = edges.get(dependsOn) || new Set();
      targets.add(varDef.id); // When dependsOn changes, this variable might show/hide
      edges.set(dependsOn, targets);
    }
  }
  
  return { nodes, edges };
}

/**
 * Get topological processing order starting from a given variable.
 *
 * @returns An array of variable IDs in the order they should be processed (root first).
 */
export function getProcessingOrder(
  graph: DependencyGraph,
  startingVariable: string
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];
  
  function visit(node: string): void {
    if (visited.has(node)) return;
    visited.add(node);
    
    const targets = graph.edges.get(node);
    if (targets) {
      for (const target of targets) {
        visit(target);
      }
    }
    
    order.push(node);
  }
  
  visit(startingVariable);
  return order.reverse();
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple variable changes in a single batch, minimizing redundant cascades.
 *
 * Changes are sorted by dependency depth so that upstream variables are processed
 * first, reducing re-processing of downstream targets.
 */
export function processBatchChanges(
  changes: Array<{ variableId: string; value: unknown }>,
  state: DocumentState,
  variables: VariableDefinition[]
): CascadeResult {
  let currentState = state;
  const allChangedVariables: string[] = [];
  
  // Build dependency graph once
  const graph = buildDependencyGraph(variables);
  
  // Sort changes by dependency order to minimize re-processing
  const orderCache = new Map<string, number>();
  for (const change of changes) {
    if (!orderCache.has(change.variableId)) {
      orderCache.set(change.variableId, getProcessingOrder(graph, change.variableId).length);
    }
  }
  const sortedChanges = [...changes].sort((a, b) => {
    return (orderCache.get(a.variableId) ?? 0) - (orderCache.get(b.variableId) ?? 0);
  });
  
  // Process each change
  for (const change of sortedChanges) {
    const result = processCascades(
      change.variableId,
      change.value,
      currentState,
      variables
    );
    
    currentState = {
      ...currentState,
      values: result.updatedValues,
      derivedValues: result.derivedValues
    };
    
    allChangedVariables.push(...result.changedVariables);
  }
  
  return {
    updatedValues: currentState.values,
    derivedValues: currentState.derivedValues,
    changedVariables: [...new Set(allChangedVariables)]
  };
}
