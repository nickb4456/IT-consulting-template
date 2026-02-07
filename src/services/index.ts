/**
 * DraftBridge Gold - Service Exports
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// Variable engine
export { VariableEngine, createVariableEngine } from './variableEngine';

// Cascade engine
export { 
  processCascades, 
  processBatchChanges,
  evaluateExpression,
  buildDependencyGraph,
  getProcessingOrder
} from './cascadeEngine';

// Contact handler
export {
  deriveContactFields,
  derivePartyFields,
  deriveAttorneyFields
} from './contactHandler';

// User profile service
export {
  UserProfileService,
  getUserProfileService,
  createDefaultProfile,
  attorneyToContact,
  prefillContact,
  prefillParty
} from './userProfileService';

// Template renderer
export {
  TemplateRenderer,
  getTemplateRenderer,
  initializeRenderer,
  BUILT_IN_PARTIALS
} from './templateRenderer';

// Court service (if exists)
export * from './courtService';

// Document detector (if exists)
export * from './documentDetector';

// Recreate service (if exists)
export * from './recreateService';
