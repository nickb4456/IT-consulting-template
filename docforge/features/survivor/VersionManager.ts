/**
 * Version History - Auto-Versioning System
 * 
 * Automatically saves document snapshots locally, providing
 * time-travel capability for document recovery.
 * 
 * No cloud. No APIs. Just peace of mind.
 */

import * as diffLib from 'diff';

export interface DocumentSnapshot {
  id: string;
  timestamp: Date;
  documentName: string;
  content: string;           // Full OOXML content
  contentHash: string;       // For deduplication
  delta?: string;            // Delta from previous version (for compression)
  wordCount: number;
  changesSummary?: string;   // Brief description of changes
  isManualSave: boolean;     // User-triggered vs auto
}

export interface VersionMetadata {
  documentId: string;
  documentPath: string;
  snapshots: Omit<DocumentSnapshot, 'content' | 'delta'>[];
  totalSnapshots: number;
  oldestSnapshot: Date;
  newestSnapshot: Date;
}

export interface SurvivorConfig {
  autoSaveIntervalMs: number;       // Default: 5 minutes
  maxSnapshots: number;             // Default: 100 per document
  useDeltaCompression: boolean;     // Default: true
  retentionDays: number;            // Default: 30 days
  panicButtonCount: number;         // Versions shown in panic mode: 10
}

const DEFAULT_CONFIG: SurvivorConfig = {
  autoSaveIntervalMs: 5 * 60 * 1000,  // 5 minutes
  maxSnapshots: 100,
  useDeltaCompression: true,
  retentionDays: 30,
  panicButtonCount: 10
};

export class VersionManager {
  private config: SurvivorConfig;
  private autoSaveTimer: number | null = null;
  private lastContentHash: string | null = null;
  private documentId: string | null = null;
  private isEnabled: boolean = false;

  constructor(config: Partial<SurvivorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize versioning for current document
   */
  async initialize(context: Word.RequestContext): Promise<void> {
    const document = context.document;
    document.load('properties');
    await context.sync();

    // Generate stable document ID from path + creation date
    this.documentId = await this.getDocumentId(context);
    
    // Load existing version history
    await this.loadVersionHistory();
    
    this.isEnabled = true;
    console.log(`[Survivor] Initialized for document: ${this.documentId}`);
  }

  /**
   * Start automatic versioning
   */
  startAutoSave(): void {
    if (this.autoSaveTimer) {
      this.stopAutoSave();
    }

    this.autoSaveTimer = window.setInterval(async () => {
      try {
        await Word.run(async (context) => {
          await this.createSnapshot(context, false);
        });
      } catch (error) {
        console.error('[Survivor] Auto-save failed:', error);
      }
    }, this.config.autoSaveIntervalMs);

    console.log(`[Survivor] Auto-save started (interval: ${this.config.autoSaveIntervalMs}ms)`);
  }

  /**
   * Stop automatic versioning
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      window.clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('[Survivor] Auto-save stopped');
    }
  }

  /**
   * Create a snapshot of the current document state
   */
  async createSnapshot(
    context: Word.RequestContext, 
    isManual: boolean = false
  ): Promise<DocumentSnapshot | null> {
    if (!this.isEnabled || !this.documentId) {
      throw new Error('[Survivor] Not initialized');
    }

    // Get document content as OOXML
    const body = context.document.body;
    const content = body.getOoxml();
    body.load('text');
    await context.sync();

    const contentStr = content.value;
    const contentHash = await this.hashContent(contentStr);

    // Skip if content hasn't changed (unless manual save)
    if (!isManual && contentHash === this.lastContentHash) {
      console.log('[Survivor] No changes detected, skipping snapshot');
      return null;
    }

    // Get previous snapshot for delta compression
    const previousSnapshot = await this.getLatestSnapshot();
    let delta: string | undefined;
    
    if (this.config.useDeltaCompression && previousSnapshot) {
      delta = this.createDelta(previousSnapshot.content, contentStr);
    }

    const snapshot: DocumentSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      documentName: await this.getDocumentName(context),
      content: contentStr,
      contentHash,
      delta,
      wordCount: this.countWords(body.text),
      changesSummary: previousSnapshot 
        ? this.summarizeChanges(previousSnapshot.content, contentStr)
        : 'Initial snapshot',
      isManualSave: isManual
    };

    // Save snapshot to storage
    await this.saveSnapshot(snapshot);
    this.lastContentHash = contentHash;

    // Cleanup old snapshots if needed
    await this.enforceRetentionPolicy();

    console.log(`[Survivor] Snapshot created: ${snapshot.id} (${isManual ? 'manual' : 'auto'})`);
    return snapshot;
  }

  /**
   * 🚨 PANIC BUTTON - Quick access to recent versions
   */
  async panicButton(): Promise<DocumentSnapshot[]> {
    const allSnapshots = await this.getAllSnapshots();
    return allSnapshots
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.config.panicButtonCount);
  }

  /**
   * Get all snapshots for current document
   */
  async getAllSnapshots(): Promise<DocumentSnapshot[]> {
    if (!this.documentId) return [];
    
    const stored = localStorage.getItem(this.getStorageKey());
    if (!stored) return [];
    
    const data = JSON.parse(stored) as DocumentSnapshot[];
    return data.map(s => ({
      ...s,
      timestamp: new Date(s.timestamp)
    }));
  }

  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<DocumentSnapshot | null> {
    const all = await this.getAllSnapshots();
    return all.find(s => s.id === snapshotId) || null;
  }

  /**
   * Get the latest snapshot
   */
  async getLatestSnapshot(): Promise<DocumentSnapshot | null> {
    const all = await this.getAllSnapshots();
    if (all.length === 0) return null;
    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  /**
   * Restore document to a specific snapshot
   */
  async restoreSnapshot(
    context: Word.RequestContext, 
    snapshotId: string
  ): Promise<void> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // Create a "before restore" snapshot first
    await this.createSnapshot(context, true);

    // Restore the content
    const body = context.document.body;
    body.clear();
    body.insertOoxml(snapshot.content, Word.InsertLocation.replace);
    await context.sync();

    console.log(`[Survivor] Restored to snapshot: ${snapshotId}`);
  }

  /**
   * Compare two snapshots and return differences
   */
  async compareSnapshots(
    snapshotId1: string, 
    snapshotId2: string
  ): Promise<DiffResult> {
    const snap1 = await this.getSnapshot(snapshotId1);
    const snap2 = await this.getSnapshot(snapshotId2);
    
    if (!snap1 || !snap2) {
      throw new Error('One or both snapshots not found');
    }

    // Extract plain text for readable diff
    const text1 = this.extractTextFromOoxml(snap1.content);
    const text2 = this.extractTextFromOoxml(snap2.content);

    const diff = diffLib.diffWords(text1, text2);
    
    return {
      snapshot1: snap1,
      snapshot2: snap2,
      changes: diff,
      addedWords: diff.filter(d => d.added).reduce((sum, d) => sum + this.countWords(d.value), 0),
      removedWords: diff.filter(d => d.removed).reduce((sum, d) => sum + this.countWords(d.value), 0),
    };
  }

  /**
   * Get version metadata (for UI display without loading full content)
   */
  async getVersionMetadata(): Promise<VersionMetadata | null> {
    if (!this.documentId) return null;
    
    const snapshots = await this.getAllSnapshots();
    if (snapshots.length === 0) return null;

    const sorted = snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      documentId: this.documentId,
      documentPath: '', // Would come from Office context
      snapshots: snapshots.map(({ content, delta, ...meta }) => meta),
      totalSnapshots: snapshots.length,
      oldestSnapshot: sorted[0].timestamp,
      newestSnapshot: sorted[sorted.length - 1].timestamp
    };
  }

  /**
   * Delete a specific snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshots = await this.getAllSnapshots();
    const filtered = snapshots.filter(s => s.id !== snapshotId);
    await this.saveAllSnapshots(filtered);
    console.log(`[Survivor] Deleted snapshot: ${snapshotId}`);
  }

  /**
   * Clear all snapshots for current document
   */
  async clearAllSnapshots(): Promise<void> {
    if (this.documentId) {
      localStorage.removeItem(this.getStorageKey());
      console.log(`[Survivor] Cleared all snapshots for: ${this.documentId}`);
    }
  }

  // ============ Private Methods ============

  private async getDocumentId(context: Word.RequestContext): Promise<string> {
    // Use document properties to create stable ID
    const props = context.document.properties;
    props.load('title, author, creationDate');
    await context.sync();
    
    const idString = `${props.title || 'untitled'}_${props.creationDate || Date.now()}`;
    return await this.hashContent(idString);
  }

  private async getDocumentName(context: Word.RequestContext): Promise<string> {
    const props = context.document.properties;
    props.load('title');
    await context.sync();
    return props.title || 'Untitled Document';
  }

  private getStorageKey(): string {
    return `survivor_${this.documentId}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  private createDelta(oldContent: string, newContent: string): string {
    const patches = diffLib.createPatch('document', oldContent, newContent);
    return patches;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  private extractTextFromOoxml(ooxml: string): string {
    // Simple extraction - strip XML tags
    return ooxml
      .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1 ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private summarizeChanges(oldContent: string, newContent: string): string {
    const oldText = this.extractTextFromOoxml(oldContent);
    const newText = this.extractTextFromOoxml(newContent);
    
    const oldWords = this.countWords(oldText);
    const newWords = this.countWords(newText);
    const diff = newWords - oldWords;
    
    if (diff > 0) {
      return `Added ~${diff} words`;
    } else if (diff < 0) {
      return `Removed ~${Math.abs(diff)} words`;
    }
    return 'Minor edits';
  }

  private async loadVersionHistory(): Promise<void> {
    // Pre-load for faster access
    await this.getAllSnapshots();
  }

  private async saveSnapshot(snapshot: DocumentSnapshot): Promise<void> {
    const existing = await this.getAllSnapshots();
    existing.push(snapshot);
    await this.saveAllSnapshots(existing);
  }

  private async saveAllSnapshots(snapshots: DocumentSnapshot[]): Promise<void> {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(snapshots));
  }

  private async enforceRetentionPolicy(): Promise<void> {
    let snapshots = await this.getAllSnapshots();
    
    // Remove old snapshots beyond retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    snapshots = snapshots.filter(s => 
      s.timestamp >= cutoffDate || s.isManualSave
    );

    // Keep only maxSnapshots (always keep manual saves)
    if (snapshots.length > this.config.maxSnapshots) {
      const manualSaves = snapshots.filter(s => s.isManualSave);
      const autoSaves = snapshots.filter(s => !s.isManualSave)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.config.maxSnapshots - manualSaves.length);
      
      snapshots = [...manualSaves, ...autoSaves];
    }

    await this.saveAllSnapshots(snapshots);
  }
}

export interface DiffResult {
  snapshot1: DocumentSnapshot;
  snapshot2: DocumentSnapshot;
  changes: diffLib.Change[];
  addedWords: number;
  removedWords: number;
}

// Singleton for easy access
let versionManagerInstance: VersionManager | null = null;

export function getSurvivor(config?: Partial<SurvivorConfig>): VersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager(config);
  }
  return versionManagerInstance;
}
