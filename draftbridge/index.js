/**
 * DraftBridge Main Entry Point
 * 
 * Exports all modules for use in the application.
 * 
 * @version 1.0.0
 */

// Common modules
export { default as DraftBridgeAPI } from './common/api.js';
export { default as DraftBridgeStorage } from './common/storage.js';
export { default as DraftBridgeSync } from './common/sync.js';
export { default as DraftBridgeState } from './common/state.js';
export { default as DraftBridgeUtils } from './common/utils.js';

// Feature modules
export { default as FillEngine } from './features/templates/fill-engine.js';
export { default as NumberingSync } from './features/numbering/sync.js';
export { default as LetterheadInsert } from './features/letterhead/insert.js';

// Version
export const VERSION = '1.0.0';
