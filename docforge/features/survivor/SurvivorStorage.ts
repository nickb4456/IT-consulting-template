/**
 * Version History - Storage Adapters
 * 
 * Provides storage backends for document snapshots.
 * Uses IndexedDB for larger storage capacity vs localStorage.
 */

import { DocumentSnapshot } from './VersionManager';

const DB_NAME = 'DocForgeSurvivor';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

export interface StorageAdapter {
  save(documentId: string, snapshot: DocumentSnapshot): Promise<void>;
  getAll(documentId: string): Promise<DocumentSnapshot[]>;
  get(documentId: string, snapshotId: string): Promise<DocumentSnapshot | null>;
  delete(documentId: string, snapshotId: string): Promise<void>;
  deleteAll(documentId: string): Promise<void>;
  getStorageUsage(): Promise<StorageStats>;
}

export interface StorageStats {
  totalSnapshots: number;
  totalSizeBytes: number;
  documentsTracked: number;
}

/**
 * IndexedDB-based storage for large documents
 */
export class IndexedDBStorage implements StorageAdapter {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('documentId', 'documentId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('doc_time', ['documentId', 'timestamp'], { unique: false });
        }
      };
    });
  }

  async save(documentId: string, snapshot: DocumentSnapshot): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const record = { ...snapshot, documentId };
      const request = store.put(record);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAll(documentId: string): Promise<DocumentSnapshot[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('documentId');
      
      const request = index.getAll(documentId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((r: any) => {
          const { documentId: _, ...snapshot } = r;
          return {
            ...snapshot,
            timestamp: new Date(snapshot.timestamp)
          } as DocumentSnapshot;
        });
        resolve(results);
      };
    });
  }

  async get(documentId: string, snapshotId: string): Promise<DocumentSnapshot | null> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(snapshotId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (!request.result || request.result.documentId !== documentId) {
          resolve(null);
          return;
        }
        const { documentId: _, ...snapshot } = request.result;
        resolve({
          ...snapshot,
          timestamp: new Date(snapshot.timestamp)
        } as DocumentSnapshot);
      };
    });
  }

  async delete(documentId: string, snapshotId: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(snapshotId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteAll(documentId: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('documentId');
      
      const request = index.openCursor(documentId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async getStorageUsage(): Promise<StorageStats> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const records = request.result;
        const documents = new Set(records.map((r: any) => r.documentId));
        
        // Estimate size (rough calculation)
        const totalSize = records.reduce((sum: number, r: any) => {
          return sum + (r.content?.length || 0) + (r.delta?.length || 0);
        }, 0);
        
        resolve({
          totalSnapshots: records.length,
          totalSizeBytes: totalSize,
          documentsTracked: documents.size
        });
      };
    });
  }
}

/**
 * LocalStorage fallback (limited capacity ~5MB)
 */
export class LocalStorageAdapter implements StorageAdapter {
  private getKey(documentId: string): string {
    return `survivor_${documentId}`;
  }

  async save(documentId: string, snapshot: DocumentSnapshot): Promise<void> {
    const existing = await this.getAll(documentId);
    existing.push(snapshot);
    localStorage.setItem(this.getKey(documentId), JSON.stringify(existing));
  }

  async getAll(documentId: string): Promise<DocumentSnapshot[]> {
    const stored = localStorage.getItem(this.getKey(documentId));
    if (!stored) return [];
    
    const data = JSON.parse(stored) as DocumentSnapshot[];
    return data.map(s => ({
      ...s,
      timestamp: new Date(s.timestamp)
    }));
  }

  async get(documentId: string, snapshotId: string): Promise<DocumentSnapshot | null> {
    const all = await this.getAll(documentId);
    return all.find(s => s.id === snapshotId) || null;
  }

  async delete(documentId: string, snapshotId: string): Promise<void> {
    const all = await this.getAll(documentId);
    const filtered = all.filter(s => s.id !== snapshotId);
    localStorage.setItem(this.getKey(documentId), JSON.stringify(filtered));
  }

  async deleteAll(documentId: string): Promise<void> {
    localStorage.removeItem(this.getKey(documentId));
  }

  async getStorageUsage(): Promise<StorageStats> {
    let totalSnapshots = 0;
    let totalSize = 0;
    let documents = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('survivor_')) {
        documents++;
        const value = localStorage.getItem(key) || '';
        totalSize += value.length * 2; // UTF-16 characters
        const data = JSON.parse(value) as DocumentSnapshot[];
        totalSnapshots += data.length;
      }
    }

    return { totalSnapshots, totalSizeBytes: totalSize, documentsTracked: documents };
  }
}

/**
 * Create the best available storage adapter
 */
export function createStorage(): StorageAdapter {
  // Prefer IndexedDB for larger storage capacity
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBStorage();
  }
  // Fallback to localStorage
  return new LocalStorageAdapter();
}

export const defaultStorage = createStorage();
