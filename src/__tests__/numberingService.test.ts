/**
 * DraftBridge Gold - Numbering Service Tests
 *
 * Comprehensive tests for OOXML multilevel list numbering generation.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import {
  NumberingService,
  getNumberingService,
  toOoxmlLevel,
  toDisplayLevel,
  validateLevelIndex,
  validateLevelConfigs,
  sanitizeLvlText,
  NumberFormat,
  MultilevelPreset,
  LevelConfig,
  AbstractNumDefinition,
  NumInstance
} from '../services/numberingService';

// ============================================================================
// TEST DATA
// ============================================================================

const validLevelConfig: LevelConfig = {
  ilvl: 0,
  start: 1,
  numFmt: 'decimal',
  lvlText: '%1.',
  pStyle: 'Heading1',
  lvlJc: 'left',
  indent: {
    left: 720,
    hanging: 360
  }
};

const validLevelConfigs: LevelConfig[] = [
  { ilvl: 0, start: 1, numFmt: 'decimal', lvlText: '%1.' },
  { ilvl: 1, start: 1, numFmt: 'lowerLetter', lvlText: '%2)' },
  { ilvl: 2, start: 1, numFmt: 'lowerRoman', lvlText: '%3.' }
];

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Validation Functions', () => {
  describe('validateLevelIndex', () => {
    it('should accept valid level indices (0-8)', () => {
      for (let i = 0; i <= 8; i++) {
        expect(() => validateLevelIndex(i)).not.toThrow();
      }
    });

    it('should reject negative level index', () => {
      expect(() => validateLevelIndex(-1)).toThrow('Invalid level index');
    });

    it('should reject level index above 8', () => {
      expect(() => validateLevelIndex(9)).toThrow('Invalid level index');
    });

    it('should reject non-integer level index', () => {
      expect(() => validateLevelIndex(1.5)).toThrow('Invalid level index');
    });

    it('should include context in error message', () => {
      expect(() => validateLevelIndex(-1, 'test context')).toThrow('in test context');
    });
  });

  describe('validateLevelConfigs', () => {
    it('should accept valid level configurations', () => {
      expect(() => validateLevelConfigs(validLevelConfigs)).not.toThrow();
    });

    it('should reject non-array input', () => {
      expect(() => validateLevelConfigs(null as any)).toThrow('must be an array');
    });

    it('should reject empty array', () => {
      expect(() => validateLevelConfigs([])).toThrow('At least one level');
    });

    it('should reject more than 9 levels', () => {
      const tooManyLevels = Array.from({ length: 10 }, (_, i) => ({
        ilvl: i,
        start: 1,
        numFmt: 'decimal' as NumberFormat,
        lvlText: `%${i + 1}.`
      }));
      expect(() => validateLevelConfigs(tooManyLevels)).toThrow('Maximum 9 levels');
    });

    it('should reject duplicate level indices', () => {
      const duplicateLevels: LevelConfig[] = [
        { ilvl: 0, start: 1, numFmt: 'decimal', lvlText: '%1.' },
        { ilvl: 0, start: 1, numFmt: 'lowerLetter', lvlText: '%1)' }
      ];
      expect(() => validateLevelConfigs(duplicateLevels)).toThrow('Duplicate level index');
    });

    it('should reject missing lvlText', () => {
      const missingLvlText: LevelConfig[] = [
        { ilvl: 0, start: 1, numFmt: 'decimal', lvlText: '' }
      ];
      expect(() => validateLevelConfigs(missingLvlText)).toThrow('lvlText is required');
    });

    it('should reject negative start value', () => {
      const negativeStart: LevelConfig[] = [
        { ilvl: 0, start: -1, numFmt: 'decimal', lvlText: '%1.' }
      ];
      expect(() => validateLevelConfigs(negativeStart)).toThrow('non-negative integer');
    });
  });

  describe('sanitizeLvlText', () => {
    it('should preserve valid patterns', () => {
      expect(sanitizeLvlText('%1.')).toBe('%1.');
      expect(sanitizeLvlText('%1.%2')).toBe('%1.%2');
      expect(sanitizeLvlText('(%1)')).toBe('(%1)');
    });

    it('should preserve bullet characters', () => {
      expect(sanitizeLvlText('•')).toBe('•');
      expect(sanitizeLvlText('○')).toBe('○');
    });

    it('should remove potentially dangerous characters', () => {
      expect(sanitizeLvlText('%1.<script>')).toBe('%1.script');
      expect(sanitizeLvlText('%1.&amp;')).toBe('%1.amp');
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('toOoxmlLevel', () => {
    it('should convert display level (1-9) to OOXML index (0-8)', () => {
      expect(toOoxmlLevel(1)).toBe(0);
      expect(toOoxmlLevel(5)).toBe(4);
      expect(toOoxmlLevel(9)).toBe(8);
    });

    it('should clamp values below 1 to 0', () => {
      expect(toOoxmlLevel(0)).toBe(0);
      expect(toOoxmlLevel(-5)).toBe(0);
    });

    it('should clamp values above 9 to 8', () => {
      expect(toOoxmlLevel(10)).toBe(8);
      expect(toOoxmlLevel(100)).toBe(8);
    });
  });

  describe('toDisplayLevel', () => {
    it('should convert OOXML index (0-8) to display level (1-9)', () => {
      expect(toDisplayLevel(0)).toBe(1);
      expect(toDisplayLevel(4)).toBe(5);
      expect(toDisplayLevel(8)).toBe(9);
    });
  });
});

// ============================================================================
// NUMBERING SERVICE TESTS
// ============================================================================

describe('NumberingService', () => {
  let service: NumberingService;

  beforeEach(() => {
    service = new NumberingService();
  });

  describe('ID management', () => {
    it('should start with abstractNumId at 0', () => {
      expect(service.getCurrentAbstractNumId()).toBe(0);
    });

    it('should start with numId at 1', () => {
      expect(service.getCurrentNumId()).toBe(1);
    });

    it('should increment abstractNumId when creating definitions', () => {
      service.createMultilevelList('legal');
      expect(service.getCurrentAbstractNumId()).toBe(1);

      service.createMultilevelList('outline');
      expect(service.getCurrentAbstractNumId()).toBe(2);
    });

    it('should increment numId when creating instances', () => {
      service.createNumInstance(0);
      expect(service.getCurrentNumId()).toBe(2);

      service.createNumInstance(0);
      expect(service.getCurrentNumId()).toBe(3);
    });

    it('should reset counters correctly', () => {
      service.createMultilevelList('legal');
      service.createNumInstance(0);

      service.reset();

      expect(service.getCurrentAbstractNumId()).toBe(0);
      expect(service.getCurrentNumId()).toBe(1);
    });
  });

  describe('Preset creation', () => {
    const presets: MultilevelPreset[] = [
      'legal',
      'outline',
      'numbered',
      'bulleted',
      'hybrid',
      'mixedLegalOutline'
    ];

    presets.forEach(preset => {
      it(`should create ${preset} preset with valid structure`, () => {
        const def = service.createMultilevelList(preset);

        expect(def.abstractNumId).toBeDefined();
        expect(def.name).toBe(`${preset}Numbering`);
        expect(def.multiLevelType).toBe('multilevel');
        expect(Array.isArray(def.levels)).toBe(true);
        expect(def.levels.length).toBeGreaterThan(0);
        expect(def.levels.length).toBeLessThanOrEqual(9);
      });
    });

    it('should create legal preset with 9 levels by default', () => {
      const def = service.createMultilevelList('legal');
      expect(def.levels.length).toBe(9);
    });

    it('should use correct legal numbering format (1, 1.1, 1.1.1)', () => {
      const def = service.createMultilevelList('legal');

      expect(def.levels[0].lvlText).toBe('%1');
      expect(def.levels[1].lvlText).toBe('%1.%2');
      expect(def.levels[2].lvlText).toBe('%1.%2.%3');
      expect(def.levels[8].lvlText).toBe('%1.%2.%3.%4.%5.%6.%7.%8.%9');
    });

    it('should use correct outline format (I, A, 1, a, i)', () => {
      const def = service.createMultilevelList('outline');

      expect(def.levels[0].numFmt).toBe('upperRoman');
      expect(def.levels[1].numFmt).toBe('upperLetter');
      expect(def.levels[2].numFmt).toBe('decimal');
      expect(def.levels[3].numFmt).toBe('lowerLetter');
      expect(def.levels[4].numFmt).toBe('lowerRoman');
    });

    it('should set bullet format correctly', () => {
      const def = service.createMultilevelList('bulleted');

      def.levels.forEach(level => {
        expect(level.numFmt).toBe('bullet');
        expect(level.font).toBeDefined();
      });
    });

    it('should set lvlRestart for sub-levels', () => {
      const def = service.createMultilevelList('legal');

      expect(def.levels[0].lvlRestart).toBeUndefined();
      expect(def.levels[1].lvlRestart).toBe(0);
      expect(def.levels[2].lvlRestart).toBe(1);
    });

    it('should link first 6 levels to Heading styles', () => {
      const def = service.createMultilevelList('legal');

      for (let i = 0; i < 6; i++) {
        expect(def.levels[i].pStyle).toBe(`Heading${i + 1}`);
      }
    });

    it('should not link levels 7-9 to styles', () => {
      const def = service.createMultilevelList('legal');

      for (let i = 6; i < 9; i++) {
        expect(def.levels[i].pStyle).toBeUndefined();
      }
    });
  });

  describe('Legal numbering format', () => {
    it('should create legal format with specified number of levels', () => {
      const def4 = service.getLegalNumberingFormat(4);
      expect(def4.levels.length).toBe(4);

      service.reset();
      const def9 = service.getLegalNumberingFormat(9);
      expect(def9.levels.length).toBe(9);
    });

    it('should clamp levels to valid range', () => {
      const def0 = service.getLegalNumberingFormat(0);
      expect(def0.levels.length).toBeGreaterThanOrEqual(1);

      service.reset();
      const def100 = service.getLegalNumberingFormat(100);
      expect(def100.levels.length).toBe(9);
    });
  });

  describe('Custom legal format', () => {
    it('should create custom legal format with options', () => {
      const def = service.createCustomLegalFormat({
        levels: 3,
        startValues: [5, 10, 1],
        suffix: '.'
      });

      expect(def.levels.length).toBe(3);
      expect(def.levels[0].start).toBe(5);
      expect(def.levels[1].start).toBe(10);
      expect(def.levels[0].lvlText).toBe('%1.');
    });

    it('should support parentheses suffix', () => {
      const def = service.createCustomLegalFormat({
        levels: 2,
        suffix: '()'
      });

      expect(def.levels[0].lvlText).toBe('(%1)');
      expect(def.levels[1].lvlText).toBe('(%1.%2)');
    });
  });

  describe('Indentation', () => {
    it('should apply correct indentation per level', () => {
      const def = service.createMultilevelList('numbered');

      const INDENT_INCREMENT = 720;
      const HANGING_INDENT = 360;

      def.levels.forEach((level, i) => {
        expect(level.indent?.left).toBe(INDENT_INCREMENT * (i + 1));
        expect(level.indent?.hanging).toBe(HANGING_INDENT);
      });
    });
  });

  describe('Restart instances', () => {
    it('should create restart instance with level override', () => {
      const def = service.createMultilevelList('legal');
      const inst = service.createRestartInstance(def.abstractNumId, 0, 5);

      expect(inst.lvlOverrides).toBeDefined();
      expect(inst.lvlOverrides?.length).toBe(1);
      expect(inst.lvlOverrides?.[0].ilvl).toBe(0);
      expect(inst.lvlOverrides?.[0].startOverride).toBe(5);
    });

    it('should validate level index in restart instance', () => {
      const def = service.createMultilevelList('legal');

      expect(() => service.createRestartInstance(def.abstractNumId, -1)).toThrow();
      expect(() => service.createRestartInstance(def.abstractNumId, 9)).toThrow();
    });

    it('should create continuation instance without overrides', () => {
      const def = service.createMultilevelList('legal');
      const inst = service.createContinuationInstance(def.abstractNumId);

      expect(inst.lvlOverrides).toBeUndefined();
      expect(inst.abstractNumId).toBe(def.abstractNumId);
    });

    it('should create instance with multiple overrides', () => {
      const def = service.createMultilevelList('legal');
      const inst = service.createInstanceWithOverrides(def.abstractNumId, [
        { ilvl: 0, startOverride: 10 },
        { ilvl: 1, startOverride: 5 },
        { ilvl: 2, startOverride: 1 }
      ]);

      expect(inst.lvlOverrides?.length).toBe(3);
    });
  });

  describe('XML generation', () => {
    it('should generate valid numbering.xml structure', () => {
      const def = service.createMultilevelList('legal');
      const xml = service.generateNumberingXml([def]);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<w:numbering');
      expect(xml).toContain('<w:abstractNum');
      expect(xml).toContain('<w:num');
      expect(xml).toContain('</w:numbering>');
    });

    it('should include all levels in XML', () => {
      const def = service.createMultilevelList('legal');
      const xml = service.generateNumberingXml([def]);

      for (let i = 0; i < def.levels.length; i++) {
        expect(xml).toContain(`w:ilvl="${i}"`);
      }
    });

    it('should escape special XML characters', () => {
      const config = {
        abstractNumId: 0,
        levels: [{
          ilvl: 0,
          start: 1,
          numFmt: 'decimal' as NumberFormat,
          lvlText: '<%1>&'
        }]
      };
      const def = service.createAbstractNum(config);
      const xml = service.generateNumberingXml([def]);

      expect(xml).toContain('&lt;%1&gt;&amp;');
      expect(xml).not.toContain('<%1>&');
    });

    it('should include level overrides in num instance', () => {
      const def = service.createMultilevelList('legal');
      const inst = service.createRestartInstance(def.abstractNumId, 0, 10);
      const xml = service.generateNumberingXml([def], [inst]);

      expect(xml).toContain('<w:lvlOverride');
      expect(xml).toContain('<w:startOverride w:val="10"/>');
    });

    it('should include pStyle links', () => {
      const def = service.createMultilevelList('legal');
      const xml = service.generateNumberingXml([def]);

      expect(xml).toContain('w:pStyle w:val="Heading1"');
    });

    it('should include indentation settings', () => {
      const def = service.createMultilevelList('numbered');
      const xml = service.generateNumberingXml([def]);

      expect(xml).toContain('w:ind');
      expect(xml).toContain('w:left=');
      expect(xml).toContain('w:hanging=');
    });
  });

  describe('generateNumPr', () => {
    it('should generate correct numPr XML', () => {
      const xml = service.generateNumPr(1, 2);

      expect(xml).toBe('<w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr>');
    });

    it('should validate level index', () => {
      expect(() => service.generateNumPr(1, -1)).toThrow();
      expect(() => service.generateNumPr(1, 9)).toThrow();
    });
  });

  describe('Configuration validation', () => {
    it('should validate config before use', () => {
      const validConfig = {
        abstractNumId: 0,
        levels: validLevelConfigs
      };

      expect(() => service.validateConfig(validConfig)).not.toThrow();
    });

    it('should throw for invalid config', () => {
      const invalidConfig = {
        abstractNumId: 0,
        levels: []
      };

      expect(() => service.validateConfig(invalidConfig)).toThrow();
    });
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe('Singleton', () => {
  it('should return the same instance', () => {
    const instance1 = getNumberingService();
    const instance2 = getNumberingService();

    expect(instance1).toBe(instance2);
  });
});

// ============================================================================
// MIXED LEGAL OUTLINE PRESET TESTS
// ============================================================================

describe('Mixed Legal Outline Preset', () => {
  let service: NumberingService;

  beforeEach(() => {
    service = new NumberingService();
  });

  it('should create 9 levels', () => {
    const def = service.createMultilevelList('mixedLegalOutline');
    expect(def.levels.length).toBe(9);
  });

  it('should use decimal format for first 3 levels', () => {
    const def = service.createMultilevelList('mixedLegalOutline');

    expect(def.levels[0].numFmt).toBe('decimal');
    expect(def.levels[1].numFmt).toBe('decimal');
    expect(def.levels[2].numFmt).toBe('decimal');
  });

  it('should use legal numbering text for first 3 levels', () => {
    const def = service.createMultilevelList('mixedLegalOutline');

    expect(def.levels[0].lvlText).toBe('%1');
    expect(def.levels[1].lvlText).toBe('%1.%2');
    expect(def.levels[2].lvlText).toBe('%1.%2.%3');
  });

  it('should switch to outline format for levels 4-9', () => {
    const def = service.createMultilevelList('mixedLegalOutline');

    expect(def.levels[3].numFmt).toBe('upperLetter');
    expect(def.levels[4].numFmt).toBe('decimal');
    expect(def.levels[5].numFmt).toBe('lowerLetter');
    expect(def.levels[6].numFmt).toBe('lowerRoman');
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  let service: NumberingService;

  beforeEach(() => {
    service = new NumberingService();
  });

  it('should handle creating many definitions in sequence', () => {
    for (let i = 0; i < 100; i++) {
      const def = service.createMultilevelList('legal');
      expect(def.abstractNumId).toBe(i);
    }
  });

  it('should handle all 9 levels of legal numbering', () => {
    const def = service.getLegalNumberingFormat(9);

    // Verify deepest level
    const level9 = def.levels[8];
    expect(level9.ilvl).toBe(8);
    expect(level9.lvlText).toBe('%1.%2.%3.%4.%5.%6.%7.%8.%9');
    expect(level9.lvlRestart).toBe(7);
  });

  it('should handle bullet lists with all 9 levels', () => {
    const def = service.createMultilevelList('bulleted');
    expect(def.levels.length).toBe(9);

    def.levels.forEach((level, i) => {
      expect(level.numFmt).toBe('bullet');
      expect(level.lvlText).toBeTruthy();
    });
  });

  it('should handle multiple instances referencing same abstract', () => {
    const def = service.createMultilevelList('legal');

    const inst1 = service.createNumInstance(def.abstractNumId);
    const inst2 = service.createNumInstance(def.abstractNumId);
    const inst3 = service.createRestartInstance(def.abstractNumId, 0, 1);

    expect(inst1.abstractNumId).toBe(def.abstractNumId);
    expect(inst2.abstractNumId).toBe(def.abstractNumId);
    expect(inst3.abstractNumId).toBe(def.abstractNumId);

    expect(inst1.numId).not.toBe(inst2.numId);
    expect(inst2.numId).not.toBe(inst3.numId);
  });
});
