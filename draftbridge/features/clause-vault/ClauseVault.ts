/**
 * ClauseVault - Personal Clause Library for DraftBridge
 * 
 * Store, search, and insert your favorite legal clauses with one click.
 * All data stored locally - no cloud, no API calls.
 */

export interface Clause {
  id: string;
  title: string;
  content: string;           // Plain text for search
  ooxml: string;             // Formatted content for insertion
  category: ClauseCategory;
  tags: string[];
  description?: string;
  matterType?: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export type ClauseCategory = 
  | 'indemnification'
  | 'limitation-of-liability'
  | 'confidentiality'
  | 'termination'
  | 'governing-law'
  | 'dispute-resolution'
  | 'representations'
  | 'warranties'
  | 'intellectual-property'
  | 'payment-terms'
  | 'force-majeure'
  | 'assignment'
  | 'notices'
  | 'amendments'
  | 'severability'
  | 'entire-agreement'
  | 'definitions'
  | 'boilerplate'
  | 'custom';

export const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  'indemnification': 'Indemnification',
  'limitation-of-liability': 'Limitation of Liability',
  'confidentiality': 'Confidentiality',
  'termination': 'Termination',
  'governing-law': 'Governing Law',
  'dispute-resolution': 'Dispute Resolution',
  'representations': 'Representations',
  'warranties': 'Warranties',
  'intellectual-property': 'Intellectual Property',
  'payment-terms': 'Payment Terms',
  'force-majeure': 'Force Majeure',
  'assignment': 'Assignment',
  'notices': 'Notices',
  'amendments': 'Amendments',
  'severability': 'Severability',
  'entire-agreement': 'Entire Agreement',
  'definitions': 'Definitions',
  'boilerplate': 'Boilerplate',
  'custom': 'Custom'
};

const STORAGE_KEY = 'draftbridge_clause_vault';

/**
 * ClauseVaultService - Core logic for clause management
 */
export class ClauseVaultService {
  private clauses: Map<string, Clause> = new Map();
  private initialized = false;

  /**
   * Initialize the vault, loading from Office document settings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Word.run(async (context) => {
      // Try to load from document settings first (for document-specific clauses)
      // Then fall back to roaming settings (cross-document)
      const settings = Office.context.roamingSettings;
      const stored = settings.get(STORAGE_KEY);

      if (stored && typeof stored === 'string') {
        try {
          const parsed: Clause[] = JSON.parse(stored);
          parsed.forEach(clause => this.clauses.set(clause.id, clause));
          console.log(`ClauseVault: Loaded ${this.clauses.size} clauses`);
        } catch (e) {
          console.error('[ClauseVault] Parse stored clauses failed:', e);
          // Continue with empty vault - user clauses may be recoverable from backup
        }
      }
    });

    this.initialized = true;
  }

  /**
   * Save current state to Office settings
   */
  private async persist(): Promise<void> {
    const data = JSON.stringify(Array.from(this.clauses.values()));
    Office.context.roamingSettings.set(STORAGE_KEY, data);
    
    return new Promise((resolve, reject) => {
      Office.context.roamingSettings.saveAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error(result.error?.message || "Couldn't save your clauses — try again"));
        }
      });
    });
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `clause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save currently selected text as a new clause
   */
  async saveFromSelection(
    title: string,
    category: ClauseCategory,
    tags: string[] = [],
    description?: string,
    matterType?: string
  ): Promise<Clause> {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load('text');
      
      // Get OOXML for formatted content
      const ooxml = selection.getOoxml();
      
      await context.sync();

      if (!selection.text.trim()) {
        throw new Error('Select some text first — highlight the clause you want to save');
      }

      const clause: Clause = {
        id: this.generateId(),
        title,
        content: selection.text,
        ooxml: ooxml.value,
        category,
        tags,
        description,
        matterType,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      };

      this.clauses.set(clause.id, clause);
      await this.persist();

      console.log(`ClauseVault: Saved clause "${title}"`);
      return clause;
    });
  }

  /**
   * Insert a clause at current cursor position
   */
  async insertClause(clauseId: string): Promise<void> {
    const clause = this.clauses.get(clauseId);
    if (!clause) {
      throw new Error("Couldn't find that clause — it may have been deleted");
    }

    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      
      // Insert the OOXML (preserves formatting)
      selection.insertOoxml(clause.ooxml, Word.InsertLocation.replace);
      
      await context.sync();
    });

    // Update usage count
    clause.usageCount++;
    clause.updatedAt = Date.now();
    await this.persist();

    console.log(`ClauseVault: Inserted clause "${clause.title}"`);
  }

  /**
   * Insert clause and prompt for placeholders
   * Placeholders use syntax: {{PlaceholderName}}
   */
  async insertWithPlaceholders(clauseId: string, replacements?: Record<string, string>): Promise<string[]> {
    const clause = this.clauses.get(clauseId);
    if (!clause) {
      throw new Error("Clause not found — refresh the panel to see current clauses");
    }

    // Find all placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = placeholderRegex.exec(clause.content)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    // If we have replacements, apply them
    if (replacements && Object.keys(replacements).length > 0) {
      let modifiedOoxml = clause.ooxml;
      let modifiedContent = clause.content;
      
      for (const [placeholder, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
        modifiedOoxml = modifiedOoxml.replace(regex, value);
        modifiedContent = modifiedContent.replace(regex, value);
      }

      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertOoxml(modifiedOoxml, Word.InsertLocation.replace);
        await context.sync();
      });

      clause.usageCount++;
      clause.updatedAt = Date.now();
      await this.persist();
    }

    return placeholders;
  }

  /**
   * Search clauses by text, tags, or category
   */
  search(query: string, category?: ClauseCategory): Clause[] {
    const queryLower = query.toLowerCase();
    
    return Array.from(this.clauses.values()).filter(clause => {
      // Category filter
      if (category && clause.category !== category) {
        return false;
      }

      // Text search across title, content, tags, description
      if (query) {
        const searchable = [
          clause.title,
          clause.content,
          clause.description || '',
          ...clause.tags
        ].join(' ').toLowerCase();
        
        if (!searchable.includes(queryLower)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get all clauses, optionally filtered by category
   */
  getAll(category?: ClauseCategory): Clause[] {
    const all = Array.from(this.clauses.values());
    
    if (category) {
      return all.filter(c => c.category === category);
    }
    
    // Sort by usage count (most used first), then by updated date
    return all.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return b.updatedAt - a.updatedAt;
    });
  }

  /**
   * Get frequently used clauses
   */
  getFrequentlyUsed(limit = 5): Clause[] {
    return this.getAll()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently added clauses
   */
  getRecent(limit = 5): Clause[] {
    return this.getAll()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get a single clause by ID
   */
  get(id: string): Clause | undefined {
    return this.clauses.get(id);
  }

  /**
   * Update a clause
   */
  async update(id: string, updates: Partial<Omit<Clause, 'id' | 'createdAt'>>): Promise<Clause> {
    const clause = this.clauses.get(id);
    if (!clause) {
      throw new Error("Can't update — that clause no longer exists");
    }

    Object.assign(clause, updates, { updatedAt: Date.now() });
    await this.persist();
    
    return clause;
  }

  /**
   * Update clause content from current selection
   */
  async updateFromSelection(id: string): Promise<Clause> {
    const clause = this.clauses.get(id);
    if (!clause) {
      throw new Error("Can't update — that clause was deleted");
    }

    return Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load('text');
      const ooxml = selection.getOoxml();
      
      await context.sync();

      if (!selection.text.trim()) {
        throw new Error('Select some text first — highlight what you want to save');
      }

      clause.content = selection.text;
      clause.ooxml = ooxml.value;
      clause.updatedAt = Date.now();
      
      await this.persist();
      return clause;
    });
  }

  /**
   * Delete a clause
   */
  async delete(id: string): Promise<void> {
    if (!this.clauses.has(id)) {
      throw new Error("Clause already deleted or doesn't exist");
    }

    this.clauses.delete(id);
    await this.persist();
  }

  /**
   * Export all clauses as JSON (for backup)
   */
  export(): string {
    return JSON.stringify(Array.from(this.clauses.values()), null, 2);
  }

  /**
   * Import clauses from JSON
   */
  async import(json: string, merge = true): Promise<number> {
    const imported: Clause[] = JSON.parse(json);
    let count = 0;

    for (const clause of imported) {
      if (!merge || !this.clauses.has(clause.id)) {
        // Generate new ID if merging to avoid conflicts
        const newClause = merge ? { ...clause, id: this.generateId() } : clause;
        this.clauses.set(newClause.id, newClause);
        count++;
      }
    }

    await this.persist();
    return count;
  }

  /**
   * Get statistics about the vault
   */
  getStats(): {
    totalClauses: number;
    byCategory: Record<ClauseCategory, number>;
    totalUsages: number;
    mostUsed?: Clause;
  } {
    const byCategory = {} as Record<ClauseCategory, number>;
    let totalUsages = 0;
    let mostUsed: Clause | undefined;

    for (const clause of this.clauses.values()) {
      byCategory[clause.category] = (byCategory[clause.category] || 0) + 1;
      totalUsages += clause.usageCount;
      
      if (!mostUsed || clause.usageCount > mostUsed.usageCount) {
        mostUsed = clause;
      }
    }

    return {
      totalClauses: this.clauses.size,
      byCategory,
      totalUsages,
      mostUsed
    };
  }
}

// Singleton instance
export const clauseVault = new ClauseVaultService();
