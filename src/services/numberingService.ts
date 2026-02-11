/**
 * DraftBridge Gold - OOXML Numbering Service
 *
 * Generates Word-compatible multilevel list numbering definitions.
 * Implements OOXML numbering.xml structure for proper document formatting.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Number format types supported by OOXML
 */
export type NumberFormat =
  | 'decimal'        // 1, 2, 3
  | 'lowerLetter'    // a, b, c
  | 'upperLetter'    // A, B, C
  | 'lowerRoman'     // i, ii, iii
  | 'upperRoman'     // I, II, III
  | 'bullet'         // •
  | 'none';          // No number

/**
 * Predefined multilevel list presets
 */
export type MultilevelPreset =
  | 'legal'          // 1, 1.1, 1.1.1
  | 'outline'        // I, A, 1, a, i
  | 'numbered'       // 1, 2, 3 with indented sub-levels
  | 'bulleted'       // Bullets at each level
  | 'hybrid'         // 1, a, i mixed
  | 'mixedLegalOutline'; // 1, 1.1, 1.1.A, 1.1.A.i

/**
 * Justification for number position
 */
export type LevelJustification = 'left' | 'center' | 'right';

/**
 * Configuration for a single numbering level (0-8)
 */
export interface LevelConfig {
  /** Level index (0-8, where 0 is the top level) */
  ilvl: number;

  /** Starting number for this level */
  start: number;

  /** Number format (decimal, lowerLetter, etc.) */
  numFmt: NumberFormat;

  /**
   * Level text pattern. Use %1, %2, etc. for level numbers.
   * Examples: "%1.", "%1.%2", "(%1)"
   */
  lvlText: string;

  /** Linked paragraph style (e.g., "Heading1") */
  pStyle?: string;

  /** Level after which this level restarts (for nested lists) */
  lvlRestart?: number;

  /** Number justification */
  lvlJc?: LevelJustification;

  /** Indentation settings in twips (1/20 of a point) */
  indent?: {
    left: number;
    hanging: number;
    firstLine?: number;
  };

  /** Tab stop position in twips */
  tabStop?: number;

  /** Font for the number (optional override) */
  font?: {
    ascii?: string;
    hAnsi?: string;
  };
}

/**
 * Configuration for creating an abstract numbering definition
 */
export interface NumberingConfig {
  /** Unique ID for this abstract numbering definition */
  abstractNumId: number;

  /** Descriptive name for the numbering style */
  name?: string;

  /** Level configurations (up to 9 levels, indices 0-8) */
  levels: LevelConfig[];

  /** Whether this is a multi-level list type */
  multiLevelType?: 'singleLevel' | 'multilevel' | 'hybridMultilevel';
}

/**
 * Complete abstract numbering definition
 */
export interface AbstractNumDefinition {
  abstractNumId: number;
  name?: string;
  multiLevelType: string;
  levels: LevelConfig[];
}

/**
 * Numbering instance that references an abstract definition
 */
export interface NumInstance {
  numId: number;
  abstractNumId: number;
  /** Level overrides (optional) */
  lvlOverrides?: Array<{
    ilvl: number;
    startOverride?: number;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard indent increment per level in twips (720 = 0.5 inch) */
const INDENT_INCREMENT = 720;

/** Standard hanging indent in twips */
const HANGING_INDENT = 360;

/** Maximum OOXML levels (0-8 = 9 levels) */
const MAX_OOXML_LEVELS = 9;

/** Minimum valid level index */
const MIN_LEVEL = 0;

/** Maximum valid level index */
const MAX_LEVEL = 8;

/** Bullet characters for each level */
const BULLET_CHARS = ['•', '○', '■', '□', '◆', '◇', '▪', '▫', '►'];

/** Number suffix styles */
export type NumberSuffix = '.' | ')' | ':' | '' | '()';

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a level index is within OOXML bounds (0-8).
 * @throws Error if level is out of range
 */
export function validateLevelIndex(ilvl: number, context?: string): void {
  if (!Number.isInteger(ilvl) || ilvl < MIN_LEVEL || ilvl > MAX_LEVEL) {
    const ctx = context ? ` in ${context}` : '';
    throw new Error(`Invalid level index${ctx}: ${ilvl}. Must be integer 0-8.`);
  }
}

/**
 * Validate level configuration array.
 * @throws Error if configuration is invalid
 */
export function validateLevelConfigs(levels: LevelConfig[]): void {
  if (!Array.isArray(levels)) {
    throw new Error('Level configs must be an array');
  }

  if (levels.length === 0) {
    throw new Error('At least one level configuration is required');
  }

  if (levels.length > MAX_OOXML_LEVELS) {
    throw new Error(`Maximum ${MAX_OOXML_LEVELS} levels allowed, got ${levels.length}`);
  }

  const seenLevels = new Set<number>();
  for (const lvl of levels) {
    validateLevelIndex(lvl.ilvl, 'level config');

    if (seenLevels.has(lvl.ilvl)) {
      throw new Error(`Duplicate level index: ${lvl.ilvl}`);
    }
    seenLevels.add(lvl.ilvl);

    if (!lvl.lvlText || typeof lvl.lvlText !== 'string') {
      throw new Error(`Level ${lvl.ilvl}: lvlText is required and must be a string`);
    }

    if (lvl.start !== undefined && (!Number.isInteger(lvl.start) || lvl.start < 0)) {
      throw new Error(`Level ${lvl.ilvl}: start must be a non-negative integer`);
    }
  }
}

/**
 * Sanitize lvlText pattern to prevent XML injection.
 * Allows %1-%9 placeholders and common punctuation.
 */
export function sanitizeLvlText(lvlText: string): string {
  // Remove any characters that aren't alphanumeric, spaces, or common punctuation
  const sanitized = lvlText.replace(/[^\w\s%().:\-\u2022\u25CB\u25A0\u25A1\u25C6\u25C7\u25AA\u25AB\u25BA]/g, '');
  return sanitized;
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Legal numbering: 1, 1.1, 1.1.1, etc.
 * Used for contracts, legal briefs, statutes
 *
 * @param levels - Number of levels (1-9, clamped)
 * @param startValues - Optional starting values per level
 * @param suffix - Optional suffix style (default: none for legal)
 */
function createLegalPreset(
  levels: number = 4,
  startValues?: number[],
  suffix: NumberSuffix = ''
): LevelConfig[] {
  const configs: LevelConfig[] = [];
  const numLevels = Math.max(1, Math.min(levels, MAX_OOXML_LEVELS));

  for (let i = 0; i < numLevels; i++) {
    // Build lvlText: "%1" for level 0, "%1.%2" for level 1, etc.
    const lvlTextParts: string[] = [];
    for (let j = 0; j <= i; j++) {
      lvlTextParts.push(`%${j + 1}`);
    }

    // Apply suffix formatting
    let lvlText = lvlTextParts.join('.');
    if (suffix === '()') {
      lvlText = `(${lvlText})`;
    } else if (suffix) {
      lvlText = `${lvlText}${suffix}`;
    }

    configs.push({
      ilvl: i,
      start: startValues?.[i] ?? 1,
      numFmt: 'decimal',
      lvlText,
      pStyle: i < 6 ? `Heading${i + 1}` : undefined,
      lvlRestart: i > 0 ? i - 1 : undefined,
      lvlJc: 'left',
      indent: {
        left: INDENT_INCREMENT * (i + 1),
        hanging: HANGING_INDENT
      }
    });
  }

  return configs;
}

/**
 * Outline numbering: I, A, 1, a, i
 * Classic legal/academic outline format
 */
function createOutlinePreset(): LevelConfig[] {
  const formats: Array<{ numFmt: NumberFormat; suffix: string }> = [
    { numFmt: 'upperRoman', suffix: '.' },   // I.
    { numFmt: 'upperLetter', suffix: '.' },  // A.
    { numFmt: 'decimal', suffix: '.' },      // 1.
    { numFmt: 'lowerLetter', suffix: ')' },  // a)
    { numFmt: 'lowerRoman', suffix: ')' },   // i)
    { numFmt: 'decimal', suffix: ')' },      // 1)
    { numFmt: 'lowerLetter', suffix: ')' },  // a)
    { numFmt: 'lowerRoman', suffix: ')' },   // i)
    { numFmt: 'decimal', suffix: ')' }       // 1)
  ];

  return formats.map((fmt, i) => ({
    ilvl: i,
    start: 1,
    numFmt: fmt.numFmt,
    lvlText: `%${i + 1}${fmt.suffix}`,
    pStyle: i < 6 ? `Heading${i + 1}` : undefined,
    lvlRestart: i > 0 ? i - 1 : undefined,
    lvlJc: 'left',
    indent: {
      left: INDENT_INCREMENT * (i + 1),
      hanging: HANGING_INDENT
    }
  }));
}

/**
 * Simple numbered list: 1, 2, 3 with indented sub-levels
 */
function createNumberedPreset(): LevelConfig[] {
  return Array.from({ length: 9 }, (_, i) => ({
    ilvl: i,
    start: 1,
    numFmt: 'decimal' as NumberFormat,
    lvlText: `%${i + 1}.`,
    lvlRestart: i > 0 ? i - 1 : undefined,
    lvlJc: 'left' as LevelJustification,
    indent: {
      left: INDENT_INCREMENT * (i + 1),
      hanging: HANGING_INDENT
    }
  }));
}

/**
 * Bulleted list with different bullet characters per level
 */
function createBulletedPreset(): LevelConfig[] {
  return BULLET_CHARS.map((_, i) => ({
    ilvl: i,
    start: 1,
    numFmt: 'bullet' as NumberFormat,
    lvlText: BULLET_CHARS[i],
    lvlJc: 'left' as LevelJustification,
    indent: {
      left: INDENT_INCREMENT * (i + 1),
      hanging: HANGING_INDENT
    },
    font: {
      ascii: 'Symbol',
      hAnsi: 'Symbol'
    }
  }));
}

/**
 * Hybrid list: 1, a, i mixed format
 */
function createHybridPreset(): LevelConfig[] {
  const formats: Array<{ numFmt: NumberFormat; suffix: string }> = [
    { numFmt: 'decimal', suffix: '.' },      // 1.
    { numFmt: 'lowerLetter', suffix: '.' },  // a.
    { numFmt: 'lowerRoman', suffix: '.' },   // i.
    { numFmt: 'decimal', suffix: ')' },      // 1)
    { numFmt: 'lowerLetter', suffix: ')' },  // a)
    { numFmt: 'lowerRoman', suffix: ')' },   // i)
    { numFmt: 'decimal', suffix: ')' },
    { numFmt: 'lowerLetter', suffix: ')' },
    { numFmt: 'lowerRoman', suffix: ')' }
  ];

  return formats.map((fmt, i) => ({
    ilvl: i,
    start: 1,
    numFmt: fmt.numFmt,
    lvlText: `%${i + 1}${fmt.suffix}`,
    lvlRestart: i > 0 ? i - 1 : undefined,
    lvlJc: 'left' as LevelJustification,
    indent: {
      left: INDENT_INCREMENT * (i + 1),
      hanging: HANGING_INDENT
    }
  }));
}

/**
 * Mixed format preset: Legal style at top levels, outline at lower levels.
 * Example: 1, 1.1, 1.1.A, 1.1.A.i
 * Useful for complex legal documents with varied numbering needs.
 */
function createMixedLegalOutlinePreset(): LevelConfig[] {
  const configs: LevelConfig[] = [];

  // Levels 0-2: Legal decimal format (1, 1.1, 1.1.1)
  for (let i = 0; i < 3; i++) {
    const lvlTextParts: string[] = [];
    for (let j = 0; j <= i; j++) {
      lvlTextParts.push(`%${j + 1}`);
    }
    configs.push({
      ilvl: i,
      start: 1,
      numFmt: 'decimal',
      lvlText: lvlTextParts.join('.'),
      pStyle: `Heading${i + 1}`,
      lvlRestart: i > 0 ? i - 1 : undefined,
      lvlJc: 'left',
      indent: {
        left: INDENT_INCREMENT * (i + 1),
        hanging: HANGING_INDENT
      }
    });
  }

  // Levels 3-8: Outline format (A, 1, a, i, (1), (a))
  const outlineFormats: Array<{ numFmt: NumberFormat; prefix: string; suffix: string }> = [
    { numFmt: 'upperLetter', prefix: '', suffix: '.' },  // A.
    { numFmt: 'decimal', prefix: '', suffix: '.' },      // 1.
    { numFmt: 'lowerLetter', prefix: '', suffix: ')' },  // a)
    { numFmt: 'lowerRoman', prefix: '', suffix: ')' },   // i)
    { numFmt: 'decimal', prefix: '(', suffix: ')' },     // (1)
    { numFmt: 'lowerLetter', prefix: '(', suffix: ')' }  // (a)
  ];

  for (let i = 0; i < outlineFormats.length; i++) {
    const lvlIdx = i + 3;
    const fmt = outlineFormats[i];
    configs.push({
      ilvl: lvlIdx,
      start: 1,
      numFmt: fmt.numFmt,
      lvlText: `${fmt.prefix}%${lvlIdx + 1}${fmt.suffix}`,
      pStyle: lvlIdx < 6 ? `Heading${lvlIdx + 1}` : undefined,
      lvlRestart: lvlIdx - 1,
      lvlJc: 'left',
      indent: {
        left: INDENT_INCREMENT * (lvlIdx + 1),
        hanging: HANGING_INDENT
      }
    });
  }

  return configs;
}

// ============================================================================
// NUMBERING SERVICE
// ============================================================================

/**
 * Service for generating OOXML-compliant numbering definitions.
 *
 * @example
 * ```typescript
 * const service = new NumberingService();
 *
 * // Get a legal numbering format
 * const legalDef = service.getLegalNumberingFormat(4);
 *
 * // Generate the XML
 * const xml = service.generateNumberingXml([legalDef]);
 * ```
 */
export class NumberingService {
  private nextAbstractNumId = 0;
  private nextNumId = 1;

  /**
   * Create an abstract numbering definition with custom configuration.
   *
   * @param config - Configuration for the numbering definition
   * @returns The abstract numbering definition
   */
  createAbstractNum(config: NumberingConfig): AbstractNumDefinition {
    return {
      abstractNumId: config.abstractNumId,
      name: config.name,
      multiLevelType: config.multiLevelType || 'multilevel',
      levels: config.levels
    };
  }

  /**
   * Create a multilevel list from a preset configuration.
   *
   * @param preset - The preset type to use
   * @returns The abstract numbering definition
   */
  createMultilevelList(preset: MultilevelPreset): AbstractNumDefinition {
    const abstractNumId = this.nextAbstractNumId++;
    let levels: LevelConfig[];

    switch (preset) {
      case 'legal':
        levels = createLegalPreset(MAX_OOXML_LEVELS);
        break;
      case 'outline':
        levels = createOutlinePreset();
        break;
      case 'numbered':
        levels = createNumberedPreset();
        break;
      case 'bulleted':
        levels = createBulletedPreset();
        break;
      case 'hybrid':
        levels = createHybridPreset();
        break;
      case 'mixedLegalOutline':
        levels = createMixedLegalOutlinePreset();
        break;
      default:
        levels = createNumberedPreset();
    }

    return {
      abstractNumId,
      name: `${preset}Numbering`,
      multiLevelType: 'multilevel',
      levels
    };
  }

  /**
   * Get a legal numbering format (1, 1.1, 1.1.1, etc.)
   *
   * @param levels - Number of levels to include (1-9)
   * @returns The abstract numbering definition
   */
  getLegalNumberingFormat(levels: number = 4): AbstractNumDefinition {
    const abstractNumId = this.nextAbstractNumId++;

    return {
      abstractNumId,
      name: 'legalNumbering',
      multiLevelType: 'multilevel',
      levels: createLegalPreset(levels)
    };
  }

  /**
   * Get an outline numbering format (I, A, 1, a, i)
   *
   * @returns The abstract numbering definition
   */
  getOutlineNumberingFormat(): AbstractNumDefinition {
    const abstractNumId = this.nextAbstractNumId++;

    return {
      abstractNumId,
      name: 'outlineNumbering',
      multiLevelType: 'multilevel',
      levels: createOutlinePreset()
    };
  }

  /**
   * Generate the complete numbering.xml content.
   *
   * @param definitions - Array of abstract numbering definitions
   * @param instances - Optional array of numbering instances
   * @returns Valid OOXML numbering.xml content
   */
  generateNumberingXml(
    definitions: AbstractNumDefinition[],
    instances?: NumInstance[]
  ): string {
    const abstractNums = definitions.map(def => this.generateAbstractNum(def)).join('\n');

    // Generate num instances (one per abstract num if not specified)
    const nums = instances
      ? instances.map(inst => this.generateNumInstance(inst)).join('\n')
      : definitions.map((def, i) => this.generateNumInstance({
          numId: i + 1,
          abstractNumId: def.abstractNumId
        })).join('\n');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${abstractNums}
${nums}
</w:numbering>`;
  }

  /**
   * Generate XML for a single abstract numbering definition.
   */
  private generateAbstractNum(def: AbstractNumDefinition): string {
    const levels = def.levels.map(lvl => this.generateLevel(lvl)).join('\n');

    return `  <w:abstractNum w:abstractNumId="${def.abstractNumId}">
    <w:multiLevelType w:val="${def.multiLevelType}"/>
${levels}
  </w:abstractNum>`;
  }

  /**
   * Generate XML for a single level.
   */
  private generateLevel(lvl: LevelConfig): string {
    const parts: string[] = [
      `    <w:lvl w:ilvl="${lvl.ilvl}">`,
      `      <w:start w:val="${lvl.start}"/>`,
      `      <w:numFmt w:val="${lvl.numFmt}"/>`
    ];

    // Add lvlRestart if specified
    if (lvl.lvlRestart !== undefined) {
      parts.push(`      <w:lvlRestart w:val="${lvl.lvlRestart}"/>`);
    }

    // Add pStyle link if specified
    if (lvl.pStyle) {
      parts.push(`      <w:pStyle w:val="${lvl.pStyle}"/>`);
    }

    // Add lvlText
    parts.push(`      <w:lvlText w:val="${this.escapeXml(lvl.lvlText)}"/>`);

    // Add justification
    if (lvl.lvlJc) {
      parts.push(`      <w:lvlJc w:val="${lvl.lvlJc}"/>`);
    }

    // Add paragraph properties (indentation)
    if (lvl.indent) {
      parts.push('      <w:pPr>');
      parts.push(`        <w:ind w:left="${lvl.indent.left}" w:hanging="${lvl.indent.hanging}"${lvl.indent.firstLine !== undefined ? ` w:firstLine="${lvl.indent.firstLine}"` : ''}/>`);
      if (lvl.tabStop) {
        parts.push('        <w:tabs>');
        parts.push(`          <w:tab w:val="num" w:pos="${lvl.tabStop}"/>`);
        parts.push('        </w:tabs>');
      }
      parts.push('      </w:pPr>');
    }

    // Add run properties (font) for bullets
    if (lvl.font) {
      parts.push('      <w:rPr>');
      parts.push(`        <w:rFonts w:ascii="${lvl.font.ascii || 'Symbol'}" w:hAnsi="${lvl.font.hAnsi || 'Symbol'}"/>`);
      parts.push('      </w:rPr>');
    }

    parts.push('    </w:lvl>');

    return parts.join('\n');
  }

  /**
   * Generate XML for a numbering instance.
   */
  private generateNumInstance(inst: NumInstance): string {
    const parts: string[] = [
      `  <w:num w:numId="${inst.numId}">`,
      `    <w:abstractNumId w:val="${inst.abstractNumId}"/>`
    ];

    // Add level overrides if present
    if (inst.lvlOverrides) {
      for (const override of inst.lvlOverrides) {
        parts.push(`    <w:lvlOverride w:ilvl="${override.ilvl}">`);
        if (override.startOverride !== undefined) {
          parts.push(`      <w:startOverride w:val="${override.startOverride}"/>`);
        }
        parts.push('    </w:lvlOverride>');
      }
    }

    parts.push('  </w:num>');

    return parts.join('\n');
  }

  /**
   * Escape special XML characters.
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate paragraph properties XML for applying a specific numbering level.
   * This is used when generating document.xml content.
   *
   * @param numId - The numbering instance ID
   * @param ilvl - The level index (0-8)
   * @returns XML string for w:numPr element
   * @throws Error if ilvl is out of range
   */
  generateNumPr(numId: number, ilvl: number): string {
    validateLevelIndex(ilvl, 'generateNumPr');
    return `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`;
  }

  /**
   * Create a numbering instance from an abstract definition.
   *
   * @param abstractNumId - The abstract numbering ID to reference
   * @returns A new numbering instance
   */
  createNumInstance(abstractNumId: number): NumInstance {
    return {
      numId: this.nextNumId++,
      abstractNumId
    };
  }

  /**
   * Create a numbering instance with restart at specific level.
   * This creates a new list that continues from an abstract definition
   * but restarts numbering at a specific level.
   *
   * @param abstractNumId - The abstract numbering ID to reference
   * @param restartLevel - The level index (0-8) at which to restart numbering
   * @param startValue - The value to restart at (default: 1)
   * @returns A new numbering instance with level override
   */
  createRestartInstance(
    abstractNumId: number,
    restartLevel: number,
    startValue: number = 1
  ): NumInstance {
    validateLevelIndex(restartLevel, 'createRestartInstance');

    return {
      numId: this.nextNumId++,
      abstractNumId,
      lvlOverrides: [{
        ilvl: restartLevel,
        startOverride: startValue
      }]
    };
  }

  /**
   * Create a numbering instance that continues from a previous list.
   * All levels continue their previous numbering (no restart).
   *
   * @param abstractNumId - The abstract numbering ID to reference
   * @returns A new numbering instance
   */
  createContinuationInstance(abstractNumId: number): NumInstance {
    // A continuation instance has no overrides - it just references
    // the same abstract definition, which maintains continuous numbering
    return {
      numId: this.nextNumId++,
      abstractNumId
    };
  }

  /**
   * Create a numbering instance with multiple level overrides.
   * Useful for complex restart scenarios.
   *
   * @param abstractNumId - The abstract numbering ID to reference
   * @param overrides - Array of level overrides with ilvl and startOverride
   * @returns A new numbering instance with all specified overrides
   */
  createInstanceWithOverrides(
    abstractNumId: number,
    overrides: Array<{ ilvl: number; startOverride: number }>
  ): NumInstance {
    for (const override of overrides) {
      validateLevelIndex(override.ilvl, 'createInstanceWithOverrides');
    }

    return {
      numId: this.nextNumId++,
      abstractNumId,
      lvlOverrides: overrides
    };
  }

  /**
   * Create a custom legal numbering format with specific options.
   *
   * @param options - Custom options for legal numbering
   * @returns The abstract numbering definition
   */
  createCustomLegalFormat(options: {
    levels?: number;
    startValues?: number[];
    suffix?: NumberSuffix;
  } = {}): AbstractNumDefinition {
    const abstractNumId = this.nextAbstractNumId++;
    const levels = createLegalPreset(
      options.levels ?? 4,
      options.startValues,
      options.suffix ?? ''
    );

    return {
      abstractNumId,
      name: 'customLegalNumbering',
      multiLevelType: 'multilevel',
      levels
    };
  }

  /**
   * Validate a numbering configuration before use.
   * @throws Error if configuration is invalid
   */
  validateConfig(config: NumberingConfig): void {
    validateLevelConfigs(config.levels);
  }

  /**
   * Reset the ID counters (useful for testing).
   */
  reset(): void {
    this.nextAbstractNumId = 0;
    this.nextNumId = 1;
  }

  /**
   * Get the current abstract num ID counter value.
   * Useful for testing or debugging.
   */
  getCurrentAbstractNumId(): number {
    return this.nextAbstractNumId;
  }

  /**
   * Get the current num ID counter value.
   * Useful for testing or debugging.
   */
  getCurrentNumId(): number {
    return this.nextNumId;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: NumberingService | null = null;

/**
 * Get (or lazily create) the singleton NumberingService instance.
 */
export function getNumberingService(): NumberingService {
  if (!instance) {
    instance = new NumberingService();
  }
  return instance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert a level number (1-9) to OOXML index (0-8).
 * Clamps to valid range.
 */
export function toOoxmlLevel(level: number): number {
  return Math.max(0, Math.min(8, level - 1));
}

/**
 * Convert an OOXML level index (0-8) to display level (1-9).
 */
export function toDisplayLevel(ilvl: number): number {
  return ilvl + 1;
}
