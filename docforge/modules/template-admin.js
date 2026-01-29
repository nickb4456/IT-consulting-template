/**
 * DocForge - Template Admin Panel
 * 
 * Admin interface for managing shared (firm-wide) datasets.
 * Features:
 * - List/edit/delete shared datasets
 * - Publish personal datasets as shared
 * - Import/export datasets
 * - Sync status and offline support
 * - Admin detection (Ctrl+Shift+A toggle)
 * 
 * Requires: template.js, template-ui.js
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// ADMIN STATE
// ============================================================================

const AdminState = {
    isPanelVisible: false,
    isLoading: false,
    selectedDataset: null,
    editMode: false
};

// ============================================================================
// ADMIN PANEL CONTROLLER
// ============================================================================

/**
 * Initialize admin panel
 */
function initAdminPanel() {
    const Template = DocForge.Template;
    
    // Register keyboard shortcut for admin toggle (Ctrl+Shift+A)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            toggleAdminMode();
        }
    });
    
    // Bind admin panel event handlers
    bindAdminEvents();
    
    // Check if admin and show/hide accordingly
    updateAdminVisibility();
    
    console.log('DocForge Admin Panel initialized');
}

/**
 * Toggle admin mode (Ctrl+Shift+A)
 */
async function toggleAdminMode() {
    const Template = DocForge.Template;
    const isAdmin = Template.sharedDatasetManager.toggleAdmin();
    
    updateAdminVisibility();
    
    // Update toggle button text
    const adminToggleBtn = document.getElementById('btn-admin-toggle');
    if (adminToggleBtn) {
        adminToggleBtn.innerHTML = isAdmin ? 'Admin (On)' : 'Admin';
    }
    
    // If now admin, load shared datasets and update sync status
    if (isAdmin) {
        await loadSharedDatasetsList();
        updateSyncStatus();
    }
    
    // Show notification
    if (DocForge.Utils?.showStatus) {
        DocForge.Utils.showStatus(
            isAdmin ? 'success' : 'info',
            isAdmin ? 'Admin mode enabled' : 'Admin mode disabled'
        );
    }
    
    return isAdmin;
}

/**
 * Update admin panel visibility based on admin status
 */
function updateAdminVisibility() {
    const Template = DocForge.Template;
    const isAdmin = Template.sharedDatasetManager.isAdmin();
    
    // Show/hide admin toggle button in header
    const adminToggleBtn = document.getElementById('btn-admin-toggle');
    if (adminToggleBtn) {
        adminToggleBtn.classList.toggle('active', isAdmin);
        adminToggleBtn.title = isAdmin ? 'Admin Mode (ON)' : 'Enable Admin Mode (Ctrl+Shift+A)';
    }
    
    // Show/hide admin panel section
    const adminPanel = document.getElementById('admin-dataset-manager');
    if (adminPanel) {
        adminPanel.classList.toggle('hidden', !isAdmin);
    }
    
    // Show/hide admin buttons in dataset list
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('hidden', !isAdmin);
    });
}

/**
 * Bind event handlers for admin panel
 */
function bindAdminEvents() {
    // Admin toggle button
    document.getElementById('btn-admin-toggle')?.addEventListener('click', toggleAdminMode);
    
    // Publish button
    document.getElementById('btn-publish-dataset')?.addEventListener('click', handlePublishDataset);
    
    // Export all button
    document.getElementById('btn-export-all')?.addEventListener('click', handleExportAll);
    
    // Import button
    document.getElementById('btn-import-datasets')?.addEventListener('click', handleImportDatasets);
    
    // Sync button
    document.getElementById('btn-sync-datasets')?.addEventListener('click', handleSyncDatasets);
    
    // Configure endpoint button
    document.getElementById('btn-configure-endpoint')?.addEventListener('click', handleConfigureEndpoint);
    
    // Refresh shared datasets
    document.getElementById('btn-refresh-shared')?.addEventListener('click', handleRefreshShared);
}

// ============================================================================
// SHARED DATASETS DISPLAY
// ============================================================================

/**
 * Load and display shared datasets in admin panel
 */
async function loadSharedDatasetsList() {
    const Template = DocForge.Template;
    const listContainer = document.getElementById('shared-datasets-list');
    
    if (!listContainer) return;
    
    AdminState.isLoading = true;
    listContainer.innerHTML = '<div class="loading">Loading shared datasets...</div>';
    
    try {
        const datasets = await Template.sharedDatasetManager.getSharedDatasets({ forceRefresh: true });
        
        if (datasets.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>No shared datasets yet</p>
                    <small>Publish a personal dataset to share with the firm</small>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = datasets.map(d => generateSharedDatasetItemHTML(d)).join('');
        
        // Bind edit/delete buttons
        listContainer.querySelectorAll('.btn-edit-shared').forEach(btn => {
            btn.addEventListener('click', () => handleEditSharedDataset(btn.dataset.name));
        });
        
        listContainer.querySelectorAll('.btn-delete-shared').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteSharedDataset(btn.dataset.name));
        });
        
        listContainer.querySelectorAll('.btn-view-shared').forEach(btn => {
            btn.addEventListener('click', () => handleViewSharedDataset(btn.dataset.name));
        });
        
    } catch (error) {
        listContainer.innerHTML = `
            <div class="error-state">
                <p>Failed to load shared datasets</p>
                <small>${escapeHtml(error.message)}</small>
            </div>
        `;
    } finally {
        AdminState.isLoading = false;
    }
}

/**
 * Generate HTML for a shared dataset item
 */
function generateSharedDatasetItemHTML(dataset) {
    const Template = DocForge.Template;
    const isAdmin = Template.sharedDatasetManager.isAdmin();
    
    const modifiedDate = dataset.modifiedAt 
        ? new Date(dataset.modifiedAt).toLocaleDateString() 
        : 'Unknown';
    
    return `
        <div class="shared-dataset-item" data-name="${escapeAttr(dataset.name)}">
            <div class="dataset-info">
                <div class="dataset-name">${escapeHtml(dataset.name)}</div>
                <div class="dataset-meta">
                    <span class="dataset-count">${dataset.valueCount || '?'} values</span>
                    <span class="dataset-date">Modified: ${modifiedDate}</span>
                    ${dataset.category ? `<span class="dataset-category">${escapeHtml(dataset.category)}</span>` : ''}
                </div>
                ${dataset.description ? `<div class="dataset-description">${escapeHtml(dataset.description)}</div>` : ''}
            </div>
            <div class="dataset-actions">
                <button class="btn-icon btn-view-shared" data-name="${escapeAttr(dataset.name)}" title="View">
                    View
                </button>
                ${isAdmin ? `
                    <button class="btn-icon btn-edit-shared admin-only" data-name="${escapeAttr(dataset.name)}" title="Edit">
                        Edit
                    </button>
                    <button class="btn-icon btn-delete-shared admin-only" data-name="${escapeAttr(dataset.name)}" title="Delete">
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

/**
 * Handle publish personal dataset as shared
 */
async function handlePublishDataset() {
    const Template = DocForge.Template;
    
    // Get personal datasets
    const personalDatasets = Template.datasetManager.getDatasets();
    
    if (personalDatasets.length === 0) {
        showAdminStatus('warning', 'No personal datasets to publish. Save a dataset first.');
        return;
    }
    
    // Show selection dialog
    const datasetName = await showDatasetSelectionDialog(personalDatasets, 'Select dataset to publish to firm');
    
    if (!datasetName) return; // Cancelled
    
    // Get the dataset values
    const dataset = Template.datasetManager.getDataset(datasetName);
    if (!dataset) {
        showAdminStatus('error', 'Dataset not found');
        return;
    }
    
    // Prompt for optional description
    const description = prompt('Description (optional):', dataset.description || '');
    
    // Publish
    setAdminLoading(true);
    
    const result = await Template.sharedDatasetManager.publishDataset(
        datasetName,
        dataset.values,
        { description: description || '' }
    );
    
    setAdminLoading(false);
    
    if (result.success) {
        showAdminStatus('success', result.message);
        await loadSharedDatasetsList();
        updateDatasetDropdowns();
    } else {
        showAdminStatus('error', result.message);
    }
}

/**
 * Handle edit shared dataset
 */
async function handleEditSharedDataset(name) {
    const Template = DocForge.Template;
    
    setAdminLoading(true);
    
    const dataset = await Template.sharedDatasetManager.loadSharedDataset(name);
    
    setAdminLoading(false);
    
    if (!dataset) {
        showAdminStatus('error', `Failed to load dataset "${name}"`);
        return;
    }
    
    // Show edit modal
    showEditDatasetModal(name, dataset);
}

/**
 * Handle delete shared dataset
 */
async function handleDeleteSharedDataset(name) {
    const Template = DocForge.Template;
    
    const confirmed = confirm(`Delete shared dataset "${name}"?\n\nThis will remove it for all firm users.`);
    
    if (!confirmed) return;
    
    setAdminLoading(true);
    
    const result = await Template.sharedDatasetManager.deleteSharedDataset(name);
    
    setAdminLoading(false);
    
    if (result.success) {
        showAdminStatus('success', result.message);
        await loadSharedDatasetsList();
        updateDatasetDropdowns();
    } else {
        showAdminStatus('error', result.message);
    }
}

/**
 * Handle view shared dataset
 */
async function handleViewSharedDataset(name) {
    const Template = DocForge.Template;
    
    setAdminLoading(true);
    
    const dataset = await Template.sharedDatasetManager.loadSharedDataset(name);
    
    setAdminLoading(false);
    
    if (!dataset) {
        showAdminStatus('error', `Failed to load dataset "${name}"`);
        return;
    }
    
    // Show view modal
    showViewDatasetModal(name, dataset);
}

/**
 * Handle export all datasets
 */
async function handleExportAll() {
    const Template = DocForge.Template;
    
    setAdminLoading(true);
    
    try {
        // Export shared datasets
        const sharedJson = await Template.sharedDatasetManager.exportToJSON();
        
        // Also include personal datasets
        const personalJson = Template.datasetManager.exportToJSON();
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            shared: JSON.parse(sharedJson),
            personal: JSON.parse(personalJson)
        };
        
        // Create download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `docforge-datasets-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showAdminStatus('success', 'Datasets exported successfully');
    } catch (error) {
        showAdminStatus('error', `Export failed: ${error.message}`);
    }
    
    setAdminLoading(false);
}

/**
 * Handle import datasets
 */
async function handleImportDatasets() {
    const Template = DocForge.Template;
    
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setAdminLoading(true);
        
        try {
            const json = await file.text();
            const data = JSON.parse(json);
            
            // Import shared datasets (if admin)
            if (data.shared && Template.sharedDatasetManager.isAdmin()) {
                const sharedResult = await Template.sharedDatasetManager.importFromJSON(
                    JSON.stringify(data.shared.datasets || data.shared),
                    false // Don't overwrite existing
                );
                showAdminStatus('info', `Shared: ${sharedResult.message}`);
            }
            
            // Import personal datasets
            if (data.personal) {
                const personalResult = Template.datasetManager.importFromJSON(
                    JSON.stringify(data.personal),
                    true // Merge with existing
                );
                showAdminStatus('info', `Personal: Imported datasets`);
            }
            
            await loadSharedDatasetsList();
            updateDatasetDropdowns();
            
        } catch (error) {
            showAdminStatus('error', `Import failed: ${error.message}`);
        }
        
        setAdminLoading(false);
    };
    
    input.click();
}

/**
 * Handle sync datasets
 */
async function handleSyncDatasets() {
    const Template = DocForge.Template;
    
    setAdminLoading(true);
    
    const result = await Template.sharedDatasetManager.syncToLocal();
    
    setAdminLoading(false);
    
    if (result.success) {
        showAdminStatus('success', result.message);
        updateSyncStatus();
    } else {
        showAdminStatus('error', result.message);
    }
}

/**
 * Handle configure endpoint
 */
function handleConfigureEndpoint() {
    const Template = DocForge.Template;
    const config = Template.sharedDatasetManager.getConfig();
    
    const endpoint = prompt(
        'Enter shared datasets endpoint URL:\n(S3 bucket URL or API base URL)',
        config.endpoint || ''
    );
    
    if (endpoint === null) return; // Cancelled
    
    const apiKey = prompt(
        'API key (optional, leave blank for public buckets):',
        ''
    );
    
    Template.sharedDatasetManager.configure(endpoint, apiKey || '');
    
    showAdminStatus('success', 'Endpoint configured');
    
    // Refresh
    loadSharedDatasetsList();
    updateSyncStatus();
}

/**
 * Handle refresh shared datasets
 */
async function handleRefreshShared() {
    await loadSharedDatasetsList();
    updateDatasetDropdowns();
    showAdminStatus('success', 'Refreshed shared datasets');
}

// ============================================================================
// MODALS
// ============================================================================

/**
 * Show dataset selection dialog
 */
function showDatasetSelectionDialog(datasets, title) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>${escapeHtml(title)}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <select id="modal-dataset-select" class="dataset-select">
                        <option value="">Select a dataset...</option>
                        ${datasets.map(d => `
                            <option value="${escapeAttr(d.name)}">
                                ${escapeHtml(d.name)} (${d.valueCount} values)
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-secondary btn-cancel">Cancel</button>
                    <button class="btn btn-primary btn-confirm">Select</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = (value) => {
            document.body.removeChild(modal);
            resolve(value);
        };
        
        modal.querySelector('.btn-close').onclick = () => closeModal(null);
        modal.querySelector('.btn-cancel').onclick = () => closeModal(null);
        modal.querySelector('.btn-confirm').onclick = () => {
            const value = modal.querySelector('#modal-dataset-select').value;
            closeModal(value || null);
        };
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(null);
        });
    });
}

/**
 * Show edit dataset modal
 */
function showEditDatasetModal(name, dataset) {
    const values = dataset.values || {};
    const metadata = dataset.metadata || {};
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content admin-modal-large">
            <div class="admin-modal-header">
                <h3>Edit: ${escapeHtml(name)}</h3>
                <button class="btn-close">×</button>
            </div>
            <div class="admin-modal-body">
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="edit-description" value="${escapeAttr(metadata.description || '')}" placeholder="Optional description">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <input type="text" id="edit-category" value="${escapeAttr(metadata.category || 'General')}" placeholder="Category">
                </div>
                <div class="form-group">
                    <label>Values</label>
                    <div class="values-editor" id="edit-values">
                        ${Object.entries(values).map(([key, val]) => `
                            <div class="value-row">
                                <input type="text" class="value-key" value="${escapeAttr(key)}" readonly>
                                <input type="text" class="value-val" data-key="${escapeAttr(key)}" value="${escapeAttr(val)}">
                                <button class="btn-icon btn-remove-value" data-key="${escapeAttr(key)}">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary btn-sm" id="btn-add-value">+ Add Value</button>
                </div>
            </div>
            <div class="admin-modal-footer">
                <button class="btn btn-secondary btn-cancel">Cancel</button>
                <button class="btn btn-primary btn-save">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
        document.body.removeChild(modal);
    };
    
    modal.querySelector('.btn-close').onclick = closeModal;
    modal.querySelector('.btn-cancel').onclick = closeModal;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Add value button
    modal.querySelector('#btn-add-value').onclick = () => {
        const key = prompt('Variable name:');
        if (!key) return;
        
        const valuesEditor = modal.querySelector('#edit-values');
        const row = document.createElement('div');
        row.className = 'value-row';
        row.innerHTML = `
            <input type="text" class="value-key" value="${escapeAttr(key)}">
            <input type="text" class="value-val" data-key="${escapeAttr(key)}" placeholder="Enter value">
            <button class="btn-icon btn-remove-value" data-key="${escapeAttr(key)}">×</button>
        `;
        valuesEditor.appendChild(row);
        
        row.querySelector('.btn-remove-value').onclick = () => row.remove();
    };
    
    // Remove value buttons
    modal.querySelectorAll('.btn-remove-value').forEach(btn => {
        btn.onclick = () => btn.closest('.value-row').remove();
    });
    
    // Save button
    modal.querySelector('.btn-save').onclick = async () => {
        const Template = DocForge.Template;
        
        // Collect values
        const newValues = {};
        modal.querySelectorAll('.value-row').forEach(row => {
            const key = row.querySelector('.value-key').value.trim();
            const val = row.querySelector('.value-val').value;
            if (key) {
                newValues[key] = val;
            }
        });
        
        const newMetadata = {
            description: modal.querySelector('#edit-description').value,
            category: modal.querySelector('#edit-category').value
        };
        
        setAdminLoading(true);
        
        const result = await Template.sharedDatasetManager.updateSharedDataset(name, newValues, newMetadata);
        
        setAdminLoading(false);
        closeModal();
        
        if (result.success) {
            showAdminStatus('success', result.message);
            await loadSharedDatasetsList();
            updateDatasetDropdowns();
        } else {
            showAdminStatus('error', result.message);
        }
    };
}

/**
 * Show view dataset modal (read-only)
 */
function showViewDatasetModal(name, dataset) {
    const values = dataset.values || {};
    const metadata = dataset.metadata || {};
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content admin-modal-large">
            <div class="admin-modal-header">
                <h3>${escapeHtml(name)}</h3>
                <button class="btn-close">×</button>
            </div>
            <div class="admin-modal-body">
                ${metadata.description ? `<p class="dataset-view-description">${escapeHtml(metadata.description)}</p>` : ''}
                <div class="dataset-view-meta">
                    ${metadata.category ? `<span class="meta-tag">${escapeHtml(metadata.category)}</span>` : ''}
                    ${metadata.createdAt ? `<span class="meta-date">Created: ${new Date(metadata.createdAt).toLocaleDateString()}</span>` : ''}
                    ${metadata.modifiedAt ? `<span class="meta-date">Modified: ${new Date(metadata.modifiedAt).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="dataset-view-values">
                    <h4>Values (${Object.keys(values).length})</h4>
                    <table class="values-table">
                        <thead>
                            <tr><th>Variable</th><th>Value</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(values).map(([key, val]) => `
                                <tr>
                                    <td class="var-name">${escapeHtml(key)}</td>
                                    <td class="var-value">${escapeHtml(val)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="admin-modal-footer">
                <button class="btn btn-secondary btn-copy-json">Copy JSON</button>
                <button class="btn btn-primary btn-close-view">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
        document.body.removeChild(modal);
    };
    
    modal.querySelector('.btn-close').onclick = closeModal;
    modal.querySelector('.btn-close-view').onclick = closeModal;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Copy JSON
    modal.querySelector('.btn-copy-json').onclick = () => {
        const json = JSON.stringify(values, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            showAdminStatus('success', 'Copied to clipboard');
        });
    };
}

// ============================================================================
// SYNC STATUS
// ============================================================================

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const Template = DocForge.Template;
    const config = Template.sharedDatasetManager.getConfig();
    
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    
    if (!config.isConfigured) {
        statusEl.innerHTML = `
            <span class="sync-text">Not configured</span>
        `;
        statusEl.className = 'sync-status warning';
        return;
    }
    
    const lastSync = config.lastSync ? new Date(config.lastSync) : null;
    const isOffline = Template.sharedDatasetManager.isOffline();
    
    if (isOffline) {
        statusEl.innerHTML = `
            <span class="sync-text">Offline</span>
        `;
        statusEl.className = 'sync-status offline';
    } else if (lastSync) {
        const timeAgo = getTimeAgo(lastSync);
        statusEl.innerHTML = `
            <span class="sync-text">Synced ${timeAgo}</span>
        `;
        statusEl.className = 'sync-status synced';
    } else {
        statusEl.innerHTML = `
            <span class="sync-text">Not synced</span>
        `;
        statusEl.className = 'sync-status pending';
    }
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Show admin status message
 */
function showAdminStatus(type, message) {
    const statusEl = document.getElementById('admin-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `admin-status ${type}`;
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
    
    // Also show in main status area
    if (DocForge.Utils?.showStatus) {
        DocForge.Utils.showStatus(type, message);
    }
}

/**
 * Set admin panel loading state
 */
function setAdminLoading(loading) {
    AdminState.isLoading = loading;
    
    const overlay = document.getElementById('admin-loading-overlay');
    if (overlay) {
        overlay.style.display = loading ? 'flex' : 'none';
    }
    
    // Disable buttons while loading
    document.querySelectorAll('#admin-dataset-manager button').forEach(btn => {
        btn.disabled = loading;
    });
}

/**
 * Update all dataset dropdowns after changes
 */
function updateDatasetDropdowns() {
    // Trigger dropdown refresh in template-ui.js
    if (typeof updateDatasetDropdown === 'function') {
        updateDatasetDropdown();
    }
}

/**
 * Escape HTML
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Escape attribute value
 */
function escapeAttr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ============================================================================
// EXPORT
// ============================================================================

// Create Admin namespace
DocForge.Admin = {
    // State
    state: AdminState,
    
    // Initialization
    initAdminPanel,
    
    // Admin mode
    toggleAdminMode,
    updateAdminVisibility,
    
    // Shared datasets
    loadSharedDatasetsList,
    
    // Actions
    handlePublishDataset,
    handleEditSharedDataset,
    handleDeleteSharedDataset,
    handleViewSharedDataset,
    handleExportAll,
    handleImportDatasets,
    handleSyncDatasets,
    handleConfigureEndpoint,
    handleRefreshShared,
    
    // Sync
    updateSyncStatus,
    
    // UI helpers
    showAdminStatus,
    setAdminLoading,
    updateDatasetDropdowns,
    
    // Modals
    showDatasetSelectionDialog,
    showEditDatasetModal,
    showViewDatasetModal
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    // DOM already loaded
    setTimeout(initAdminPanel, 0);
}
