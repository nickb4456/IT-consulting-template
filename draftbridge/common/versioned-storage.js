/**
 * DraftBridge Versioned Storage
 * 
 * Save to AWS with automatic versioning and backup.
 * Keeps last N versions of each item.
 * 
 * @version 1.0.0
 */

const DraftBridgeVersionedStorage = (function() {
    'use strict';

    const MAX_VERSIONS = 10; // Keep last 10 versions
    const API_BASE = 'https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod';

    /**
     * Save item with versioning
     * Creates new version, prunes old ones
     */
    async function save(type, id, data, options = {}) {
        const token = getAuthToken();
        const firmId = getFirmId();
        
        // Create versioned record
        const record = {
            id: id,
            type: type,
            data: data,
            version: Date.now(),
            versionLabel: options.label || null,
            createdBy: getUserId(),
            createdAt: new Date().toISOString()
        };

        // Save to AWS
        const response = await fetch(`${API_BASE}/api/${type}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...record,
                _versioning: true,
                _maxVersions: options.maxVersions || MAX_VERSIONS
            })
        });

        if (!response.ok) {
            throw new Error(`Save failed: ${response.status}`);
        }

        // Update local cache
        cacheLocally(type, id, record);

        return await response.json();
    }

    /**
     * Get item (latest version)
     */
    async function get(type, id) {
        const token = getAuthToken();
        const firmId = getFirmId();

        // Try cache first
        const cached = getFromCache(type, id);
        if (cached && !isStale(cached)) {
            return cached;
        }

        // Fetch from AWS
        const response = await fetch(`${API_BASE}/api/${type}/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Fetch failed: ${response.status}`);
        }

        const data = await response.json();
        cacheLocally(type, id, data);
        return data;
    }

    /**
     * Get version history for an item
     */
    async function getVersions(type, id) {
        const token = getAuthToken();
        const firmId = getFirmId();

        const response = await fetch(`${API_BASE}/api/${type}/${id}/versions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch versions failed: ${response.status}`);
        }

        return await response.json();
        // Returns: { versions: [{ version, createdAt, createdBy, label }, ...] }
    }

    /**
     * Restore a specific version
     */
    async function restoreVersion(type, id, version) {
        const token = getAuthToken();
        const firmId = getFirmId();

        const response = await fetch(`${API_BASE}/api/${type}/${id}/restore`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ version })
        });

        if (!response.ok) {
            throw new Error(`Restore failed: ${response.status}`);
        }

        // Clear cache to force fresh fetch
        clearCache(type, id);

        return await response.json();
    }

    /**
     * Delete item (soft delete - moves to trash)
     */
    async function remove(type, id) {
        const token = getAuthToken();
        const firmId = getFirmId();

        const response = await fetch(`${API_BASE}/api/${type}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId
            }
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
        }

        clearCache(type, id);
        return true;
    }

    /**
     * List all items of a type
     */
    async function list(type, options = {}) {
        const token = getAuthToken();
        const firmId = getFirmId();

        const params = new URLSearchParams();
        if (options.scope) params.set('scope', options.scope);
        if (options.limit) params.set('limit', options.limit);

        const response = await fetch(`${API_BASE}/api/${type}?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Firm-ID': firmId
            }
        });

        if (!response.ok) {
            throw new Error(`List failed: ${response.status}`);
        }

        return await response.json();
    }

    // =========================================================================
    // Local Cache Helpers
    // =========================================================================

    function cacheLocally(type, id, data) {
        const key = `df_${type}_${id}`;
        const record = {
            data: data,
            cachedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(record));
    }

    function getFromCache(type, id) {
        const key = `df_${type}_${id}`;
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        
        try {
            const record = JSON.parse(stored);
            return record.data;
        } catch {
            return null;
        }
    }

    function isStale(cached, maxAgeMs = 5 * 60 * 1000) {
        // Default 5 min cache
        const record = localStorage.getItem(`df_${cached.type}_${cached.id}`);
        if (!record) return true;
        const { cachedAt } = JSON.parse(record);
        return Date.now() - cachedAt > maxAgeMs;
    }

    function clearCache(type, id) {
        const key = `df_${type}_${id}`;
        localStorage.removeItem(key);
    }

    // =========================================================================
    // Auth Helpers (placeholder - integrate with your auth)
    // =========================================================================

    function getAuthToken() {
        return localStorage.getItem('df_auth_token') || '';
    }

    function getFirmId() {
        return localStorage.getItem('df_firm_id') || '';
    }

    function getUserId() {
        return localStorage.getItem('df_user_id') || 'unknown';
    }

    // =========================================================================
    // Convenience Methods for Specific Types
    // =========================================================================

    const NumberingSets = {
        save: (id, data, options) => save('numbering-sets', id, data, options),
        get: (id) => get('numbering-sets', id),
        list: (options) => list('numbering-sets', options),
        getVersions: (id) => getVersions('numbering-sets', id),
        restore: (id, version) => restoreVersion('numbering-sets', id, version),
        delete: (id) => remove('numbering-sets', id)
    };

    const Templates = {
        save: (id, data, options) => save('templates', id, data, options),
        get: (id) => get('templates', id),
        list: (options) => list('templates', options),
        getVersions: (id) => getVersions('templates', id),
        restore: (id, version) => restoreVersion('templates', id, version),
        delete: (id) => remove('templates', id)
    };

    const Datasets = {
        save: (id, data, options) => save('datasets', id, data, options),
        get: (id) => get('datasets', id),
        list: (options) => list('datasets', options),
        getVersions: (id) => getVersions('datasets', id),
        restore: (id, version) => restoreVersion('datasets', id, version),
        delete: (id) => remove('datasets', id)
    };

    // Public API
    return {
        save,
        get,
        list,
        getVersions,
        restoreVersion,
        remove,
        MAX_VERSIONS,
        
        // Type-specific helpers
        NumberingSets,
        Templates,
        Datasets
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgeVersionedStorage;
}
