/**
 * DocForge Compare Changes Integration
 * 
 * Connects the compare engine and preview UI to the main taskpane workflow.
 * Handles snapshot management and change tracking.
 */

const DiffIntegration = (function() {
    'use strict';

    let isInitialized = false;
    let lastSnapshotFields = null;

    /**
     * Initialize diff integration
     */
    function init() {
        if (isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupIntegration);
        } else {
            setupIntegration();
        }
        
        isInitialized = true;
    }

    /**
     * Set up event listeners and integration points
     */
    function setupIntegration() {
        // Preview button handler
        const previewBtn = document.getElementById('previewDiffBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', showDiffPreview);
        }

        // Take snapshot when fields are first loaded
        document.addEventListener('fieldsLoaded', (e) => {
            if (e.detail?.fields) {
                takeFieldSnapshot(e.detail.fields);
            }
        });

        // Take snapshot after successful fill
        document.addEventListener('fieldsFilled', (e) => {
            if (e.detail?.fields) {
                takeFieldSnapshot(e.detail.fields);
            }
        });

        // Expose global API for taskpane.js
        window.DocForge = window.DocForge || {};
        window.DocForge.getCurrentFields = getCurrentFields;
        window.DocForge.takeSnapshot = takeFieldSnapshot;
        window.DocForge.showDiffPreview = showDiffPreview;
        window.DocForge.getDiffSummary = getDiffSummary;

    }

    /**
     * Take a snapshot of the current field values
     * @param {Array} fields - Array of field objects
     */
    function takeFieldSnapshot(fields) {
        if (!fields || !Array.isArray(fields)) {
            console.warn('[DiffIntegration] Invalid fields for snapshot');
            return;
        }

        lastSnapshotFields = fields.map(f => ({
            title: f.title || f.name,
            value: f.value || ''
        }));

        if (typeof DiffEngine !== 'undefined') {
            DiffEngine.takeSnapshot(lastSnapshotFields);
        }
    }

    /**
     * Get current field values from the UI
     * @returns {Array} Array of field objects with title and value
     */
    function getCurrentFields() {
        const fields = [];
        const fieldItems = document.querySelectorAll('.field-item');
        
        fieldItems.forEach(item => {
            const titleEl = item.querySelector('.field-title');
            const inputEl = item.querySelector('input, select, textarea');
            
            if (titleEl && inputEl) {
                fields.push({
                    title: titleEl.textContent.trim(),
                    value: inputEl.value || '',
                    element: inputEl
                });
            }
        });

        return fields;
    }

    /**
     * Get a summary of current changes vs last snapshot
     * @returns {Object} Change summary
     */
    function getDiffSummary() {
        if (typeof DiffEngine === 'undefined') {
            return { total: 0, changes: [] };
        }

        const currentFields = getCurrentFields();
        const result = DiffEngine.diffAgainstLastSnapshot(currentFields);
        return result.summary;
    }

    /**
     * Show the diff preview panel
     */
    function showDiffPreview() {
        if (typeof DiffEngine === 'undefined' || typeof DiffPreview === 'undefined') {
            showToast('Compare preview not available', 'error');
            return;
        }

        const currentFields = getCurrentFields();
        
        // If no previous snapshot, take one now with empty values
        if (!DiffEngine.getLatestSnapshot()) {
            const emptyFields = currentFields.map(f => ({
                title: f.title,
                value: ''
            }));
            DiffEngine.takeSnapshot(emptyFields);
        }

        const diffResult = DiffEngine.diffAgainstLastSnapshot(currentFields);

        if (diffResult.summary.total === 0) {
            showToast('No changes to preview', 'info');
            return;
        }

        DiffPreview.show(diffResult, (diff) => {
            // When user clicks "Apply Changes", trigger the fill
            applyChanges(currentFields);
        });
    }

    /**
     * Apply the current field values to the document
     * @param {Array} fields - Fields to apply
     */
    function applyChanges(fields) {
        // Trigger the fill operation through existing mechanism
        const fillBtn = document.getElementById('fillAllBtn');
        if (fillBtn) {
            fillBtn.click();
        }
        
        // Take new snapshot after apply
        setTimeout(() => {
            takeFieldSnapshot(getCurrentFields());
        }, 500);
    }

    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success' | 'error' | 'info'
     */
    function showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }

        // Fallback: create simple toast
        const container = document.getElementById('toastContainer') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            animation: fadeIn 0.2s ease;
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }

    /**
     * Update the diff button badge with change count
     */
    function updateDiffBadge() {
        const previewBtn = document.getElementById('previewDiffBtn');
        if (!previewBtn) return;

        const summary = getDiffSummary();
        
        // Remove existing badge
        const existingBadge = previewBtn.querySelector('.change-badge');
        if (existingBadge) existingBadge.remove();

        if (summary.total > 0) {
            const badge = document.createElement('span');
            badge.className = 'change-badge';
            badge.textContent = summary.total;
            badge.style.cssText = `
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 16px;
                height: 16px;
                padding: 0 4px;
                background: #dc3545;
                color: white;
                font-size: 10px;
                font-weight: 600;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            previewBtn.style.position = 'relative';
            previewBtn.appendChild(badge);
        }
    }

    /**
     * Start monitoring field changes
     */
    function startChangeMonitoring() {
        // Debounced update on field changes
        let updateTimeout;
        const debouncedUpdate = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateDiffBadge, 300);
        };

        // Monitor input changes
        document.addEventListener('input', (e) => {
            if (e.target.closest('.field-item')) {
                debouncedUpdate();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.closest('.field-item')) {
                debouncedUpdate();
            }
        });
    }

    // Auto-initialize
    init();
    
    // Start monitoring after a short delay to let fields load
    setTimeout(startChangeMonitoring, 1000);

    // Public API
    return {
        init,
        takeFieldSnapshot,
        getCurrentFields,
        getDiffSummary,
        showDiffPreview,
        updateDiffBadge
    };
})();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffIntegration;
}
