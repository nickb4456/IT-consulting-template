/**
 * DocForge Loading & Progress States
 * 
 * Reusable loading components for consistent feedback across the app.
 * Every action needs feedback - no user should wonder "did that work?"
 * 
 * @version 1.0.0
 */

/* global window */

const DocForgeLoading = (() => {
    // Track active loading states
    const _state = {
        buttonLoading: new Map(), // btn element -> original state
        skeletons: new Map(),     // container -> skeleton element
        progressBars: new Map(),  // container -> progress element
        spinners: new Map(),      // container -> spinner element
        longOpTimer: null,
        longOpCallback: null,
    };

    // ========================================================================
    // Button Loading States
    // ========================================================================

    /**
     * Show loading state on a button
     * Disables button, shows spinner, preserves original content
     * 
     * @param {HTMLButtonElement} btn - Button element
     * @param {Object} options - Options
     * @param {string} options.text - Loading text (default: "Loading...")
     * @param {boolean} options.hideText - Hide text, show only spinner
     */
    function showButtonLoading(btn, options = {}) {
        if (!btn || _state.buttonLoading.has(btn)) return;

        const { text = 'Loading...', hideText = false } = options;

        // Save original state
        _state.buttonLoading.set(btn, {
            innerHTML: btn.innerHTML,
            disabled: btn.disabled,
            ariaDisabled: btn.getAttribute('aria-disabled'),
            ariaBusy: btn.getAttribute('aria-busy'),
        });

        // Create spinner
        const spinner = document.createElement('span');
        spinner.className = 'btn-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        // Set loading state
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('aria-busy', 'true');
        btn.classList.add('btn-loading');

        if (hideText) {
            btn.innerHTML = '';
            btn.appendChild(spinner);
        } else {
            btn.innerHTML = '';
            btn.appendChild(spinner);
            const textSpan = document.createElement('span');
            textSpan.className = 'btn-loading-text';
            textSpan.textContent = text;
            btn.appendChild(textSpan);
        }
    }

    /**
     * Hide loading state on a button
     * Restores original content and enabled state
     * 
     * @param {HTMLButtonElement} btn - Button element
     */
    function hideButtonLoading(btn) {
        if (!btn || !_state.buttonLoading.has(btn)) return;

        const original = _state.buttonLoading.get(btn);
        
        btn.innerHTML = original.innerHTML;
        btn.disabled = original.disabled;
        btn.classList.remove('btn-loading');
        
        if (original.ariaDisabled) {
            btn.setAttribute('aria-disabled', original.ariaDisabled);
        } else {
            btn.removeAttribute('aria-disabled');
        }
        
        if (original.ariaBusy) {
            btn.setAttribute('aria-busy', original.ariaBusy);
        } else {
            btn.removeAttribute('aria-busy');
        }

        _state.buttonLoading.delete(btn);
    }

    // ========================================================================
    // Panel Skeleton Loading
    // ========================================================================

    /**
     * Show skeleton loading placeholder in a container
     * 
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @param {number} options.rows - Number of skeleton rows (default: 3)
     * @param {string} options.type - Skeleton type: 'list' | 'card' | 'text' (default: 'list')
     */
    function showPanelSkeleton(container, options = {}) {
        if (!container || _state.skeletons.has(container)) return;

        const { rows = 3, type = 'list' } = options;

        // Save original content
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton-container skeleton-${type}`;
        skeleton.setAttribute('aria-busy', 'true');
        skeleton.setAttribute('aria-label', 'Loading content');

        if (type === 'list') {
            for (let i = 0; i < rows; i++) {
                const row = document.createElement('div');
                row.className = 'skeleton-row';
                row.innerHTML = `
                    <div class="skeleton-line skeleton-line-short"></div>
                    <div class="skeleton-line skeleton-line-long"></div>
                `;
                skeleton.appendChild(row);
            }
        } else if (type === 'card') {
            for (let i = 0; i < rows; i++) {
                const card = document.createElement('div');
                card.className = 'skeleton-card';
                card.innerHTML = `
                    <div class="skeleton-line skeleton-line-title"></div>
                    <div class="skeleton-line skeleton-line-body"></div>
                    <div class="skeleton-line skeleton-line-body-short"></div>
                `;
                skeleton.appendChild(card);
            }
        } else if (type === 'text') {
            for (let i = 0; i < rows; i++) {
                const line = document.createElement('div');
                line.className = `skeleton-line skeleton-line-${i === rows - 1 ? 'short' : 'full'}`;
                skeleton.appendChild(line);
            }
        }

        _state.skeletons.set(container, {
            element: skeleton,
            originalDisplay: container.style.display,
            originalVisibility: container.style.visibility,
            children: Array.from(container.children),
        });

        // Hide original content, show skeleton
        Array.from(container.children).forEach(child => {
            child.style.display = 'none';
        });
        container.appendChild(skeleton);
    }

    /**
     * Hide skeleton loading and restore original content
     * 
     * @param {HTMLElement} container - Container element
     */
    function hidePanelSkeleton(container) {
        if (!container || !_state.skeletons.has(container)) return;

        const saved = _state.skeletons.get(container);
        
        // Remove skeleton
        if (saved.element && saved.element.parentNode) {
            saved.element.remove();
        }

        // Restore original content
        saved.children.forEach(child => {
            child.style.display = '';
        });

        _state.skeletons.delete(container);
    }

    // ========================================================================
    // Progress Bar
    // ========================================================================

    /**
     * Show a progress bar in a container
     * 
     * @param {HTMLElement} container - Container element
     * @param {number} current - Current progress value
     * @param {number} total - Total value
     * @param {Object} options - Options
     * @param {string} options.label - Label template (use {current} and {total})
     * @param {boolean} options.overlay - Show as overlay (default: false)
     */
    function showProgressBar(container, current, total, options = {}) {
        if (!container) return;

        const { 
            label = 'Filling {current} of {total}...', 
            overlay = false 
        } = options;

        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const labelText = label
            .replace('{current}', current)
            .replace('{total}', total)
            .replace('{percent}', percent);

        let progress = _state.progressBars.get(container);

        if (!progress) {
            progress = document.createElement('div');
            progress.className = `progress-container${overlay ? ' progress-overlay' : ''}`;
            progress.innerHTML = `
                <div class="progress-header">
                    <span class="progress-label">${escapeHtml(labelText)}</span>
                    <span class="progress-percent">${percent}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            `;
            progress.setAttribute('role', 'progressbar');
            progress.setAttribute('aria-valuenow', current);
            progress.setAttribute('aria-valuemin', '0');
            progress.setAttribute('aria-valuemax', total);
            progress.setAttribute('aria-label', labelText);

            if (overlay) {
                document.body.appendChild(progress);
            } else {
                container.insertBefore(progress, container.firstChild);
            }

            _state.progressBars.set(container, progress);
        } else {
            // Update existing
            progress.querySelector('.progress-label').textContent = labelText;
            progress.querySelector('.progress-percent').textContent = `${percent}%`;
            progress.querySelector('.progress-fill').style.width = `${percent}%`;
            progress.setAttribute('aria-valuenow', current);
            progress.setAttribute('aria-label', labelText);
        }

        return progress;
    }

    /**
     * Hide progress bar
     * 
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @param {boolean} options.animate - Animate out (default: true)
     */
    function hideProgressBar(container, options = {}) {
        if (!container || !_state.progressBars.has(container)) return;

        const { animate = true } = options;
        const progress = _state.progressBars.get(container);

        if (animate) {
            progress.classList.add('progress-fade-out');
            setTimeout(() => {
                progress.remove();
            }, 200);
        } else {
            progress.remove();
        }

        _state.progressBars.delete(container);
    }

    // ========================================================================
    // Subtle Spinner (for cloud sync, background ops)
    // ========================================================================

    /**
     * Show a subtle inline spinner
     * 
     * @param {HTMLElement} container - Container element or button
     * @param {Object} options - Options
     * @param {string} options.position - Position: 'before' | 'after' | 'replace' (default: 'after')
     * @param {string} options.size - Size: 'sm' | 'md' | 'lg' (default: 'sm')
     */
    function showSpinner(container, options = {}) {
        if (!container || _state.spinners.has(container)) return;

        const { position = 'after', size = 'sm' } = options;

        const spinner = document.createElement('span');
        spinner.className = `inline-spinner inline-spinner-${size}`;
        spinner.setAttribute('aria-hidden', 'true');

        let savedContent = null;

        if (position === 'replace') {
            savedContent = container.innerHTML;
            container.innerHTML = '';
            container.appendChild(spinner);
        } else if (position === 'before') {
            container.insertBefore(spinner, container.firstChild);
        } else {
            container.appendChild(spinner);
        }

        _state.spinners.set(container, { spinner, savedContent, position });
    }

    /**
     * Hide inline spinner
     * 
     * @param {HTMLElement} container - Container element
     */
    function hideSpinner(container) {
        if (!container || !_state.spinners.has(container)) return;

        const { spinner, savedContent, position } = _state.spinners.get(container);

        spinner.remove();

        if (position === 'replace' && savedContent !== null) {
            container.innerHTML = savedContent;
        }

        _state.spinners.delete(container);
    }

    // ========================================================================
    // Long Operation Handler (>500ms)
    // ========================================================================

    /**
     * Wrap an async operation with automatic loading state for long operations
     * Shows loading after 500ms, hides when complete
     * 
     * @param {Function} operation - Async function to execute
     * @param {Object} options - Options
     * @param {HTMLButtonElement} options.button - Button to show loading on
     * @param {string} options.loadingText - Loading text for button
     * @param {number} options.delay - Delay before showing loading (default: 500ms)
     * @returns {Promise} - Result of operation
     */
    async function withLoadingState(operation, options = {}) {
        const { button, loadingText = 'Working...', delay = 500 } = options;

        let showedLoading = false;
        let timer = null;

        // Start timer to show loading after delay
        if (button) {
            timer = setTimeout(() => {
                showButtonLoading(button, { text: loadingText });
                showedLoading = true;
            }, delay);
        }

        try {
            const result = await operation();
            return result;
        } finally {
            // Clear timer if operation completed before delay
            if (timer) {
                clearTimeout(timer);
            }
            // Hide loading if it was shown
            if (showedLoading && button) {
                hideButtonLoading(button);
            }
        }
    }

    // ========================================================================
    // Document Scanning Animation
    // ========================================================================

    /**
     * Show document scanning animation overlay
     * 
     * @param {Object} options - Options
     * @param {string} options.message - Message to show (default: 'Scanning document...')
     */
    function showScanningAnimation(options = {}) {
        const { message = 'Scanning document...' } = options;

        // Remove existing if any
        hideScanningAnimation();

        const overlay = document.createElement('div');
        overlay.id = 'scanningOverlay';
        overlay.className = 'scanning-overlay';
        overlay.innerHTML = `
            <div class="scanning-container">
                <div class="scanning-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div class="scanning-beam"></div>
                </div>
                <span class="scanning-text">${escapeHtml(message)}</span>
            </div>
        `;
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-label', message);

        document.body.appendChild(overlay);
    }

    /**
     * Hide document scanning animation
     */
    function hideScanningAnimation() {
        const overlay = document.getElementById('scanningOverlay');
        if (overlay) {
            overlay.classList.add('scanning-fade-out');
            setTimeout(() => overlay.remove(), 200);
        }
    }

    // ========================================================================
    // Check Animation (for Document Check / Preflight)
    // ========================================================================

    /**
     * Show checking/validation animation
     * 
     * @param {Object} options - Options
     * @param {string} options.message - Message to show
     * @param {number} options.totalChecks - Total number of checks
     */
    function showCheckingAnimation(options = {}) {
        const { message = 'Checking document...', totalChecks = 5 } = options;

        hideCheckingAnimation();

        const overlay = document.createElement('div');
        overlay.id = 'checkingOverlay';
        overlay.className = 'checking-overlay';
        overlay.innerHTML = `
            <div class="checking-container">
                <div class="checking-icon">
                    <svg class="checking-circle" width="48" height="48" viewBox="0 0 48 48">
                        <circle class="checking-circle-bg" cx="24" cy="24" r="20" fill="none" stroke-width="3"/>
                        <circle class="checking-circle-progress" cx="24" cy="24" r="20" fill="none" stroke-width="3"/>
                    </svg>
                    <svg class="checking-checkmark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <span class="checking-text">${escapeHtml(message)}</span>
                <span class="checking-progress">0 / ${totalChecks}</span>
            </div>
        `;
        overlay.setAttribute('role', 'progressbar');
        overlay.setAttribute('aria-valuenow', '0');
        overlay.setAttribute('aria-valuemax', totalChecks);
        overlay.setAttribute('aria-label', message);

        document.body.appendChild(overlay);
    }

    /**
     * Update checking animation progress
     * 
     * @param {number} current - Current check number
     * @param {number} total - Total checks
     * @param {string} checkName - Name of current check (optional)
     */
    function updateCheckingProgress(current, total, checkName = '') {
        const overlay = document.getElementById('checkingOverlay');
        if (!overlay) return;

        const percent = (current / total) * 100;
        const circumference = 2 * Math.PI * 20; // r=20
        const offset = circumference - (percent / 100) * circumference;

        const progressCircle = overlay.querySelector('.checking-circle-progress');
        if (progressCircle) {
            progressCircle.style.strokeDasharray = circumference;
            progressCircle.style.strokeDashoffset = offset;
        }

        const progressText = overlay.querySelector('.checking-progress');
        if (progressText) {
            progressText.textContent = checkName || `${current} / ${total}`;
        }

        overlay.setAttribute('aria-valuenow', current);
    }

    /**
     * Hide checking animation with success/error state
     * 
     * @param {Object} options - Options
     * @param {boolean} options.success - Show success state (default: true)
     * @param {number} options.delay - Delay before hiding (default: 800ms)
     */
    function hideCheckingAnimation(options = {}) {
        const { success = true, delay = 800 } = options;

        const overlay = document.getElementById('checkingOverlay');
        if (!overlay) return;

        if (success) {
            overlay.classList.add('checking-complete');
            setTimeout(() => {
                overlay.classList.add('checking-fade-out');
                setTimeout(() => overlay.remove(), 200);
            }, delay);
        } else {
            overlay.classList.add('checking-fade-out');
            setTimeout(() => overlay.remove(), 200);
        }
    }

    // ========================================================================
    // Cloud Sync Indicator
    // ========================================================================

    /**
     * Show cloud sync indicator (subtle, non-blocking)
     * 
     * @param {Object} options - Options
     * @param {string} options.message - Message to show
     */
    function showCloudSync(options = {}) {
        const { message = 'Syncing...' } = options;

        let indicator = document.getElementById('cloudSyncIndicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'cloudSyncIndicator';
            indicator.className = 'cloud-sync-indicator';
            indicator.innerHTML = `
                <span class="cloud-sync-spinner"></span>
                <span class="cloud-sync-text">${escapeHtml(message)}</span>
            `;
            document.body.appendChild(indicator);
        } else {
            indicator.querySelector('.cloud-sync-text').textContent = message;
            indicator.classList.remove('cloud-sync-hide');
        }
    }

    /**
     * Hide cloud sync indicator
     */
    function hideCloudSync() {
        const indicator = document.getElementById('cloudSyncIndicator');
        if (indicator) {
            indicator.classList.add('cloud-sync-hide');
            setTimeout(() => indicator.remove(), 300);
        }
    }

    // ========================================================================
    // Utility
    // ========================================================================

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, m => map[m]);
    }

    // ========================================================================
    // Public API
    // ========================================================================

    return {
        // Button loading
        showButtonLoading,
        hideButtonLoading,

        // Panel skeleton
        showPanelSkeleton,
        hidePanelSkeleton,

        // Progress bar
        showProgressBar,
        hideProgressBar,

        // Inline spinner
        showSpinner,
        hideSpinner,

        // Long operation wrapper
        withLoadingState,

        // Scanning animation
        showScanningAnimation,
        hideScanningAnimation,

        // Checking animation
        showCheckingAnimation,
        updateCheckingProgress,
        hideCheckingAnimation,

        // Cloud sync
        showCloudSync,
        hideCloudSync,
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocForgeLoading;
}

// Expose globally for script tags
if (typeof window !== 'undefined') {
    window.DocForgeLoading = DocForgeLoading;
}
