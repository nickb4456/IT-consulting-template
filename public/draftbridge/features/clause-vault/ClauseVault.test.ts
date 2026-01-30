/**
 * Clause Library Unit Tests
 * 
 * Run with: npm test -- --grep "ClauseVault"
 */

import { ClauseVaultService, Clause, ClauseCategory } from './ClauseVault';

// Mock Office.js for testing
const mockStorage = new Map<string, any>();

(global as any).Office = {
  context: {
    roamingSettings: {
      get: (key: string) => mockStorage.get(key),
      set: (key: string, value: any) => mockStorage.set(key, value),
      saveAsync: (callback: any) => callback({ status: 'succeeded' }),
    },
  },
  AsyncResultStatus: {
    Succeeded: 'succeeded',
  },
};

(global as any).Word = {
  run: async (callback: any) => {
    const mockContext = {
      document: {
        getSelection: () => ({
          text: 'Sample clause text with {{PartyName}} placeholder',
          load: () => {},
          getOoxml: () => ({ value: '<w:document>mock ooxml</w:document>' }),
          insertOoxml: () => {},
        }),
      },
      sync: async () => {},
    };
    return callback(mockContext);
  },
};

describe('ClauseVaultService', () => {
  let vault: ClauseVaultService;

  beforeEach(() => {
    mockStorage.clear();
    vault = new ClauseVaultService();
  });

  describe('initialization', () => {
    it('should initialize empty vault', async () => {
      await vault.initialize();
      expect(vault.getAll()).toHaveLength(0);
    });

    it('should load existing clauses from storage', async () => {
      const existingClauses: Clause[] = [{
        id: 'test-1',
        title: 'Test Clause',
        content: 'Test content',
        ooxml: '<w:document></w:document>',
        category: 'custom',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      }];
      
      mockStorage.set('draftbridge_clause_vault', JSON.stringify(existingClauses));
      
      await vault.initialize();
      expect(vault.getAll()).toHaveLength(1);
    });
  });

  describe('saveFromSelection', () => {
    it('should save selected text as clause', async () => {
      await vault.initialize();
      
      const clause = await vault.saveFromSelection(
        'Indemnification Clause',
        'indemnification',
        ['contracts', 'standard'],
        'Basic indemnification language'
      );

      expect(clause.title).toBe('Indemnification Clause');
      expect(clause.category).toBe('indemnification');
      expect(clause.tags).toContain('contracts');
      expect(clause.usageCount).toBe(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await vault.initialize();
      
      // Add test clauses
      await vault.saveFromSelection('Mutual Indemnification', 'indemnification', ['mutual']);
      await vault.saveFromSelection('Limitation of Liability', 'limitation-of-liability', ['cap']);
      await vault.saveFromSelection('Delaware Governing Law', 'governing-law', ['delaware', 'us']);
    });

    it('should find clauses by title', () => {
      const results = vault.search('indemnification');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Mutual Indemnification');
    });

    it('should find clauses by tag', () => {
      const results = vault.search('delaware');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Delaware Governing Law');
    });

    it('should filter by category', () => {
      const results = vault.search('', 'governing-law');
      expect(results).toHaveLength(1);
    });

    it('should return all with empty search', () => {
      const results = vault.search('');
      expect(results).toHaveLength(3);
    });
  });

  describe('insertWithPlaceholders', () => {
    it('should detect placeholders in clause', async () => {
      await vault.initialize();
      const clause = await vault.saveFromSelection('Test', 'custom', []);
      
      const placeholders = await vault.insertWithPlaceholders(clause.id);
      expect(placeholders).toContain('PartyName');
    });
  });

  describe('statistics', () => {
    it('should track usage count', async () => {
      await vault.initialize();
      const clause = await vault.saveFromSelection('Test', 'custom', []);
      
      expect(clause.usageCount).toBe(0);
      
      await vault.insertClause(clause.id);
      expect(vault.get(clause.id)?.usageCount).toBe(1);
      
      await vault.insertClause(clause.id);
      expect(vault.get(clause.id)?.usageCount).toBe(2);
    });

    it('should calculate vault stats', async () => {
      await vault.initialize();
      await vault.saveFromSelection('Clause 1', 'indemnification', []);
      await vault.saveFromSelection('Clause 2', 'indemnification', []);
      await vault.saveFromSelection('Clause 3', 'governing-law', []);
      
      const stats = vault.getStats();
      expect(stats.totalClauses).toBe(3);
      expect(stats.byCategory['indemnification']).toBe(2);
      expect(stats.byCategory['governing-law']).toBe(1);
    });
  });

  describe('export/import', () => {
    it('should export all clauses as JSON', async () => {
      await vault.initialize();
      await vault.saveFromSelection('Export Test', 'custom', ['export']);
      
      const json = vault.export();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Export Test');
    });

    it('should import clauses from JSON', async () => {
      await vault.initialize();
      
      const importData: Clause[] = [{
        id: 'imported-1',
        title: 'Imported Clause',
        content: 'Imported content',
        ooxml: '<w:document></w:document>',
        category: 'custom',
        tags: ['imported'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 5,
      }];
      
      const count = await vault.import(JSON.stringify(importData));
      
      expect(count).toBe(1);
      expect(vault.getAll()).toHaveLength(1);
    });
  });
});
