/* DraftBridge Local Cache & Usage Tracking - Phase 2 */

// ═══════════════════════════════════════════════════════════════
// INDEXEDDB CACHE
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'DraftBridgeCache';
const DB_VERSION = 2;

let db = null;

async function initCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Clauses store (offline cache)
      if (!database.objectStoreNames.contains('clauses')) {
        const clauseStore = database.createObjectStore('clauses', { keyPath: 'clauseId' });
        clauseStore.createIndex('category', 'category', { unique: false });
        clauseStore.createIndex('client', 'client', { unique: false });
        clauseStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      
      // Usage tracking store
      if (!database.objectStoreNames.contains('usage')) {
        const usageStore = database.createObjectStore('usage', { keyPath: 'clauseId' });
        usageStore.createIndex('useCount', 'useCount', { unique: false });
        usageStore.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
      
      // Clause versions store
      if (!database.objectStoreNames.contains('versions')) {
        const versionStore = database.createObjectStore('versions', { keyPath: 'versionId' });
        versionStore.createIndex('clauseId', 'clauseId', { unique: false });
        versionStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Sync metadata
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'key' });
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// CLAUSE CACHE
// ═══════════════════════════════════════════════════════════════

async function getCachedClauses() {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clauses', 'readonly');
    const store = tx.objectStore('clauses');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function cacheClauses(clauses) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clauses', 'readwrite');
    const store = tx.objectStore('clauses');
    
    // Clear old and add new
    store.clear();
    clauses.forEach(clause => {
      store.put({ ...clause, cachedAt: Date.now() });
    });
    
    tx.oncomplete = () => {
      // Update sync timestamp
      setMeta('lastSync', Date.now());
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getCacheAge() {
  const lastSync = await getMeta('lastSync');
  if (!lastSync) return Infinity;
  return Date.now() - lastSync;
}

// ═══════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

async function trackUsage(clauseId) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('usage', 'readwrite');
    const store = tx.objectStore('usage');
    
    const getRequest = store.get(clauseId);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result || { clauseId, useCount: 0, uses: [] };
      
      const now = Date.now();
      existing.useCount = (existing.useCount || 0) + 1;
      existing.lastUsed = now;
      
      // Keep last 50 uses for patterns
      existing.uses = existing.uses || [];
      existing.uses.push(now);
      if (existing.uses.length > 50) {
        existing.uses = existing.uses.slice(-50);
      }
      
      store.put(existing);
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getRecentlyUsed(limit = 10) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('usage', 'readonly');
    const store = tx.objectStore('usage');
    const index = store.index('lastUsed');
    
    const results = [];
    const request = index.openCursor(null, 'prev'); // Descending
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getMostUsed(limit = 10) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('usage', 'readonly');
    const store = tx.objectStore('usage');
    const index = store.index('useCount');
    
    const results = [];
    const request = index.openCursor(null, 'prev'); // Descending
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        // Only include if used more than once
        if (cursor.value.useCount > 1) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getUsageStats(clauseId) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('usage', 'readonly');
    const store = tx.objectStore('usage');
    const request = store.get(clauseId);
    
    request.onsuccess = () => resolve(request.result || { useCount: 0 });
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════
// CLAUSE VERSIONING
// ═══════════════════════════════════════════════════════════════

async function saveVersion(clause, changeNote = '') {
  if (!db) await initCache();
  
  const versionId = `${clause.clauseId}_${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('versions', 'readwrite');
    const store = tx.objectStore('versions');
    
    const version = {
      versionId,
      clauseId: clause.clauseId,
      title: clause.title,
      content: clause.content,
      category: clause.category,
      tags: clause.tags,
      changeNote,
      createdAt: Date.now(),
      createdBy: 'user'
    };
    
    store.put(version);
    
    tx.oncomplete = () => resolve(version);
    tx.onerror = () => reject(tx.error);
  });
}

async function getVersions(clauseId, limit = 20) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('versions', 'readonly');
    const store = tx.objectStore('versions');
    const index = store.index('clauseId');
    
    const range = IDBKeyRange.only(clauseId);
    const results = [];
    const request = index.openCursor(range, 'prev'); // Newest first
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function restoreVersion(versionId) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('versions', 'readonly');
    const store = tx.objectStore('versions');
    const request = store.get(versionId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════
// METADATA HELPERS
// ═══════════════════════════════════════════════════════════════

async function getMeta(key) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

async function setMeta(key, value) {
  if (!db) await initCache();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    store.put({ key, value });
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ═══════════════════════════════════════════════════════════════
// SYNC STRATEGY
// ═══════════════════════════════════════════════════════════════

const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

async function loadClausesWithCache(fetchFn) {
  try {
    await initCache();
    
    const cacheAge = await getCacheAge();
    const cachedClauses = await getCachedClauses();
    
    // Use cache if fresh enough
    if (cacheAge < CACHE_MAX_AGE && cachedClauses.length > 0) {
      console.log('📦 Using cached clauses');
      
      // Refresh in background
      fetchFn().then(async (fresh) => {
        if (fresh && fresh.length > 0) {
          await cacheClauses(fresh);
          console.log('🔄 Cache refreshed in background');
        }
      }).catch(console.warn);
      
      return { clauses: cachedClauses, fromCache: true };
    }
    
    // Fetch fresh
    console.log('🌐 Fetching fresh clauses');
    const fresh = await fetchFn();
    
    if (fresh && fresh.length > 0) {
      await cacheClauses(fresh);
    }
    
    return { clauses: fresh || [], fromCache: false };
    
  } catch (err) {
    console.warn('Cache/fetch error:', err);
    
    // Fallback to cache on error
    const cached = await getCachedClauses().catch(() => []);
    if (cached.length > 0) {
      console.log('📦 Falling back to cached clauses');
      return { clauses: cached, fromCache: true, offline: true };
    }
    
    throw err;
  }
}

// Export for use in main app
window.DraftBridgeCache = {
  init: initCache,
  loadClausesWithCache,
  getCachedClauses,
  cacheClauses,
  trackUsage,
  getRecentlyUsed,
  getMostUsed,
  getUsageStats,
  saveVersion,
  getVersions,
  restoreVersion,
  getMeta,
  setMeta
};
