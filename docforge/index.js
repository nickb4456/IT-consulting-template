/**
 * DocForge Main Entry Point
 * 
 * Exports all modules for use in the application.
 * 
 * @version 1.0.0
 */

// Common modules
export { default as DocForgeAPI } from './common/api.js';
export { default as DocForgeStorage } from './common/storage.js';
export { default as DocForgeSync } from './common/sync.js';
export { default as DocForgeState } from './common/state.js';
export { default as DocForgeUtils } from './common/utils.js';

// Feature modules
export { default as FillEngine } from './features/templates/fill-engine.js';
export { default as NumberingSync } from './features/numbering/sync.js';
export { default as LetterheadInsert } from './features/letterhead/insert.js';

// Version
export const VERSION = '1.0.0';
