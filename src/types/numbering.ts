/**
 * DraftBridge Gold - Numbering Types
 *
 * Types for OOXML multilevel list numbering.
 * Re-exports from numberingService for convenience.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// Re-export all numbering types from the service
export type {
  NumberFormat,
  MultilevelPreset,
  LevelJustification,
  LevelConfig,
  NumberingConfig,
  AbstractNumDefinition,
  NumInstance,
  NumberSuffix
} from '../services/numberingService';

// Re-export validation functions
export {
  validateLevelIndex,
  validateLevelConfigs,
  sanitizeLvlText,
  toOoxmlLevel,
  toDisplayLevel
} from '../services/numberingService';

// ============================================================================
// TEMPLATE NUMBERING TYPES
// ============================================================================

/**
 * Options for the multilevel block helper.
 */
export interface MultilevelOptions {
  /** Preset type: legal, outline, numbered, bulleted, hybrid, mixedLegalOutline */
  type?: string;

  /** Starting number for level 1 (default: 1) */
  start?: number;

  /** Custom class name for styling */
  className?: string;
}

/**
 * Options for the level helper.
 */
export interface LevelOptions {
  /** Custom class name for this level */
  className?: string;

  /** Override the number value */
  value?: number;
}

/**
 * Options for simple numbered/bulleted lists.
 */
export interface ListOptions {
  /** Starting number (for numbered lists) */
  start?: number;

  /** Bullet style: disc, circle, square (for bulleted lists) */
  style?: 'disc' | 'circle' | 'square';

  /** Custom class name */
  className?: string;
}

/**
 * Context passed within a multilevel block.
 * Available to child helpers via the Handlebars context.
 */
export interface MultilevelContext {
  /** The preset type being used */
  type: string;

  /** Current counters for each level (index 0-8) */
  counters: number[];

  /** The numId for OOXML reference */
  numId: number;

  /** Get the current number for a level */
  getNumber(level: number): number;

  /** Format the number at a level according to the preset */
  formatNumber(level: number): string;
}

// ============================================================================
// OOXML GENERATION TYPES
// ============================================================================

/**
 * Result of generating numbering XML.
 */
export interface NumberingXmlResult {
  /** The complete numbering.xml content */
  xml: string;

  /** Abstract numbering definitions included */
  abstractNums: number[];

  /** Numbering instances included */
  numIds: number[];
}

/**
 * Paragraph numbering properties for document.xml.
 */
export interface ParagraphNumbering {
  /** The numbering instance ID */
  numId: number;

  /** The level index (0-8) */
  ilvl: number;
}
