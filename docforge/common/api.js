/**
 * DocForge API Client
 * 
 * AWS API client for cloud operations.
 * Currently disabled - all operations work offline-first.
 * 
 * @version 1.0.0
 */

// ============================================================================
// Configuration
// ============================================================================

const defaultConfig = {
    baseUrl: '',
    timeout: 10000,
    retries: 3
};

let config = { ...defaultConfig };

// ============================================================================
// Core API Methods
// ============================================================================

/**
 * Initialize API client
 * @param {Object} options - Configuration options
 */
function init(options = {}) {
    config = { ...defaultConfig, ...options };
}

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function request(endpoint, options = {}) {
    if (!config.baseUrl) {
        throw new Error('API not configured - running in offline mode');
    }
    
    const url = `${config.baseUrl}${endpoint}`;
    const fetchOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
}

// ============================================================================
// Endpoints (Placeholder - for future cloud sync)
// ============================================================================

const endpoints = {
    // Datasets
    async getDatasets() {
        return request('/datasets');
    },
    
    async saveDataset(dataset) {
        return request('/datasets', {
            method: 'POST',
            body: JSON.stringify(dataset)
        });
    },
    
    // Numbering
    async getNumberingSets() {
        return request('/numbering');
    },
    
    async saveNumberingSet(set) {
        return request('/numbering', {
            method: 'POST',
            body: JSON.stringify(set)
        });
    },
    
    // Letterhead
    async getFirmConfig() {
        return request('/firm/config');
    },
    
    async getAttorneys() {
        return request('/firm/attorneys');
    }
};

// ============================================================================
// Exports
// ============================================================================

const DocForgeAPI = {
    init,
    request,
    ...endpoints,
    
    // Check if API is configured
    isConfigured() {
        return !!config.baseUrl;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.DocForgeAPI = DocForgeAPI;
}

