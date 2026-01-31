/**
 * DocForge - TOC Generator UI v2.0
 * 
 * Taskpane UI controller for the Table of Contents generator.
 * Provides interactive preview, generation, and update controls.
 */

// ============================================================================
// UI CONTROLLER
// ============================================================================

const TOC_UI = {
    // State
    previewData: null,
    currentOptions: {
        maxLevel: 3,
        sensitivity: 'MEDIUM',
        includeNumbers: true,
        insertLocation: 'start'
    },
    
    /**
     * Initialize the TOC UI section
     */
    init() {
        this.createTOCSection();
        this.attachEventListeners();
    },
    
    /**
     * Create the TOC section HTML
     */
    createTOCSection() {
        const section = document.createElement('div');
        section.className = 'section';
        section.id = 'tocSection';
        section.innerHTML = `
            <div class="section-title">Table of Contents</div>
            
            <div class="toc-actions">
                <button id="tocPreviewBtn" class="action-btn">
                    Preview
                </button>
                <button id="tocGenerateBtn" class="action-btn primary">
                    Generate
                </button>
            </div>
            
            <div id="tocPreviewContainer" class="preview-container" style="display:none">
                <div class="preview-header">
                    <span class="preview-title">Detected Structure</span>
                    <span id="tocPreviewCount" class="preview-count"></span>
                </div>
                <div id="tocPreviewList" class="preview-list"></div>
            </div>
            
            <div class="toc-options">
                <div class="option-row">
                    <label for="tocMaxLevel">Include levels:</label>
                    <select id="tocMaxLevel">
                        <option value="1">Level 1 only</option>
                        <option value="2">Levels 1-2</option>
                        <option value="3" selected>Levels 1-3</option>
                        <option value="4">Levels 1-4</option>
                    </select>
                </div>
                
                <div class="option-row">
                    <label for="tocSensitivity">Detection:</label>
                    <select id="tocSensitivity">
                        <option value="LOW">Conservative</option>
                        <option value="MEDIUM" selected>Standard</option>
                        <option value="HIGH">Aggressive</option>
                    </select>
                </div>
                
                <div class="option-row">
                    <label for="tocLocation">Insert at:</label>
                    <select id="tocLocation">
                        <option value="start" selected>Document start</option>
                        <option value="cursor">Cursor position</option>
                        <option value="end">Document end</option>
                    </select>
                </div>
                
                <div class="option-row checkbox-row">
                    <label>
                        <input type="checkbox" id="tocIncludeNumbers" checked>
                        Include section numbers
                    </label>
                </div>
            </div>
            
            <div class="toc-secondary-actions">
                <button id="tocUpdateBtn" class="secondary-btn" title="Update existing TOC">
                    Update
                </button>
                <button id="tocDeleteBtn" class="secondary-btn" title="Delete existing TOC">
                    Delete
                </button>
                <button id="tocNativeBtn" class="secondary-btn" title="Use Word's native TOC">
                    Native
                </button>
            </div>
            
            <div id="tocStatus" class="toc-status"></div>
        `;
        
        // Find insertion point (after numbering section if exists)
        const insertionPoint = document.querySelector('#numberingSection')?.nextSibling 
            || document.querySelector('.section:last-of-type');
        
        if (insertionPoint) {
            insertionPoint.parentNode.insertBefore(section, insertionPoint.nextSibling);
        } else {
            document.body.appendChild(section);
        }
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Preview button
        document.getElementById('tocPreviewBtn')?.addEventListener('click', () => {
            this.handlePreview();
        });
        
        // Generate button
        document.getElementById('tocGenerateBtn')?.addEventListener('click', () => {
            this.handleGenerate();
        });
        
        // Update button
        document.getElementById('tocUpdateBtn')?.addEventListener('click', () => {
            this.handleUpdate();
        });
        
        // Delete button
        document.getElementById('tocDeleteBtn')?.addEventListener('click', () => {
            this.handleDelete();
        });
        
        // Native TOC button
        document.getElementById('tocNativeBtn')?.addEventListener('click', () => {
            this.handleNative();
        });
        
        // Option changes
        document.getElementById('tocMaxLevel')?.addEventListener('change', (e) => {
            this.currentOptions.maxLevel = parseInt(e.target.value);
            if (this.previewData) this.handlePreview(); // Refresh preview
        });
        
        document.getElementById('tocSensitivity')?.addEventListener('change', (e) => {
            this.currentOptions.sensitivity = e.target.value;
            if (this.previewData) this.handlePreview(); // Refresh preview
        });
        
        document.getElementById('tocLocation')?.addEventListener('change', (e) => {
            this.currentOptions.insertLocation = e.target.value;
        });
        
        document.getElementById('tocIncludeNumbers')?.addEventListener('change', (e) => {
            this.currentOptions.includeNumbers = e.target.checked;
        });
    },
    
    /**
     * Handle preview action
     */
    async handlePreview() {
        this.showStatus('info', 'Scanning document...');
        this.setButtonLoading('tocPreviewBtn', true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.TOC.previewTOC(context, {
                    maxLevel: this.currentOptions.maxLevel,
                    sensitivity: this.currentOptions.sensitivity
                });
                
                this.previewData = result;
                this.renderPreview(result);
                
                this.showStatus('success', 
                    `Found ${result.entries.length} headings in ${Math.round(result.stats.analysisTime)}ms`);
            });
        } catch (error) {
            console.error('Preview error:', error);
            this.showStatus('error', `Preview failed: ${error.message}`);
        } finally {
            this.setButtonLoading('tocPreviewBtn', false);
        }
    },
    
    /**
     * Handle generate action
     */
    async handleGenerate() {
        this.showStatus('info', 'Generating TOC...');
        this.setButtonLoading('tocGenerateBtn', true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.TOC.generateTOC(context, {
                    maxLevel: this.currentOptions.maxLevel,
                    sensitivity: this.currentOptions.sensitivity,
                    insertLocation: this.currentOptions.insertLocation,
                    includeNumbers: this.currentOptions.includeNumbers
                });
                
                if (result.success) {
                    this.showStatus('success', result.message);
                } else {
                    this.showStatus('warning', result.message);
                }
            });
        } catch (error) {
            console.error('Generate error:', error);
            this.showStatus('error', `Generation failed: ${error.message}`);
        } finally {
            this.setButtonLoading('tocGenerateBtn', false);
        }
    },
    
    /**
     * Handle update action
     */
    async handleUpdate() {
        this.showStatus('info', 'Updating TOC...');
        this.setButtonLoading('tocUpdateBtn', true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.TOC.updateTOC(context, {
                    maxLevel: this.currentOptions.maxLevel,
                    sensitivity: this.currentOptions.sensitivity
                });
                
                if (result.success) {
                    this.showStatus('success', result.message);
                } else {
                    this.showStatus('warning', result.message);
                }
            });
        } catch (error) {
            console.error('Update error:', error);
            this.showStatus('error', `Update failed: ${error.message}`);
        } finally {
            this.setButtonLoading('tocUpdateBtn', false);
        }
    },
    
    /**
     * Handle delete action
     */
    async handleDelete() {
        if (!confirm('Delete the existing Table of Contents?')) return;
        
        this.showStatus('info', 'Deleting TOC...');
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.TOC.deleteTOC(context);
                
                if (result.success) {
                    this.showStatus('success', result.message);
                } else {
                    this.showStatus('warning', result.message);
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
            this.showStatus('error', `Delete failed: ${error.message}`);
        }
    },
    
    /**
     * Handle native TOC action
     */
    async handleNative() {
        this.showStatus('info', 'Generating native Word TOC...');
        this.setButtonLoading('tocNativeBtn', true);
        
        try {
            await Word.run(async (context) => {
                const result = await window.DocForge.TOC.generateNativeTOC(context);
                
                if (result.success) {
                    this.showStatus('success', 
                        result.type === 'native' 
                            ? 'Native Word TOC inserted' 
                            : 'Custom TOC inserted (native not available)');
                } else {
                    this.showStatus('warning', result.message);
                }
            });
        } catch (error) {
            console.error('Native TOC error:', error);
            this.showStatus('error', `Native TOC failed: ${error.message}`);
        } finally {
            this.setButtonLoading('tocNativeBtn', false);
        }
    },
    
    /**
     * Render preview list
     */
    renderPreview(result) {
        const container = document.getElementById('tocPreviewContainer');
        const list = document.getElementById('tocPreviewList');
        const count = document.getElementById('tocPreviewCount');
        
        if (!container || !list) return;
        
        // Show container
        container.style.display = 'block';
        
        // Update count
        if (count) {
            count.textContent = `${result.entries.length} entries`;
        }
        
        // Build list HTML
        const html = result.entries.map(entry => {
            const indent = '  '.repeat(entry.level - 1);
            const number = entry.number ? `<span class="entry-number">${entry.number}</span>` : '';
            const confidence = entry.confidence;
            const confidenceClass = this.getConfidenceClass(confidence);
            
            return `
                <div class="preview-entry level-${entry.level}">
                    <span class="entry-indent">${indent}</span>
                    ${number}
                    <span class="entry-title">${this.escapeHtml(entry.title)}</span>
                    <span class="entry-confidence ${confidenceClass}" title="Confidence: ${confidence}">${confidence}</span>
                </div>
            `;
        }).join('');
        
        list.innerHTML = html || '<div class="no-entries">No headings detected</div>';
    },
    
    /**
     * Get CSS class for confidence level
     */
    getConfidenceClass(confidence) {
        const value = parseInt(confidence);
        if (value >= 70) return 'confidence-high';
        if (value >= 50) return 'confidence-medium';
        return 'confidence-low';
    },
    
    /**
     * Show status message
     */
    showStatus(type, message) {
        const status = document.getElementById('tocStatus');
        if (!status) return;
        
        status.className = `toc-status status-${type}`;
        status.textContent = message;
        status.style.display = 'block';
        
        // Auto-hide after delay (except errors)
        if (type !== 'error') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 4000);
        }
    },
    
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = 'Working...';
        } else if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    },
    
    /**
     * Escape HTML to prevent XSS - delegates to shared utility
     */
    escapeHtml(text) {
        return window.DocForge?.Utils?.escapeHtml?.(text) ?? (text || '');
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize TOC UI when DOM is ready
 * Note: Styles are now loaded from modules/docforge.css
 */
function initTOCUI() {
    // Initialize UI (styles loaded externally)
    TOC_UI.init();
}

// Auto-initialize if Office.js is ready
if (typeof Office !== 'undefined') {
    Office.onReady((info) => {
        if (info.host === Office.HostType.Word) {
            initTOCUI();
        }
    });
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTOCUI);
} else {
    initTOCUI();
}

// Export for external use
if (typeof window !== 'undefined') {
    window.DocForge = window.DocForge || {};
    window.DocForge.TOC_UI = TOC_UI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TOC_UI, initTOCUI };
}
