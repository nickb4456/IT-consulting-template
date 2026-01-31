/**
 * DocForge - Numbering Engine UI Integration
 * 
 * Handles the connection between the numbering engine and the taskpane UI.
 * This module provides the high-level functions called by UI event handlers.
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};
window.DocForge.NumberingUI = {};

/**
 * UI State management
 */
const UIState = {
    lastAnalysis: null,
    isProcessing: false,
    currentScope: 'all', // 'all' or 'cursor'
    
    setProcessing(value) {
        this.isProcessing = value;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = value ? 'flex' : 'none';
        }
    }
};

/**
 * Render functions
 */
const Renderer = {
    /**
     * Update stats display
     */
    renderStats(stats) {
        const statsContainer = document.getElementById('numbering-stats');
        if (!statsContainer) return;
        
        document.getElementById('numbered-count').textContent = stats.totalNumbered || 0;
        document.getElementById('issues-count').textContent = stats.issues || 0;
        
        statsContainer.classList.remove('hidden');
        
        // Update issue stat styling
        const issueStat = document.getElementById('issues-stat');
        if (issueStat) {
            issueStat.className = stats.issues > 0 ? 'stat error' : 'stat success';
        }
    },
    
    /**
     * Render issue list
     */
    renderIssues(issues) {
        const resultsContainer = document.getElementById('numbering-results');
        if (!resultsContainer) return;
        
        if (issues.length === 0) {
            resultsContainer.innerHTML = `
                <div class="result-item success">
                    No numbering issues found.
                </div>
            `;
        } else {
            resultsContainer.innerHTML = issues.map((issue, idx) => `
                <div class="result-item" data-index="${idx}">
                    <div class="issue-main">
                        <span class="issue-line">Line ${issue.line}</span>
                        <span class="issue-change">
                            <strong class="old">${escapeHtml(issue.current)}</strong>
                            <span class="arrow">→</span>
                            <strong class="new">${escapeHtml(issue.expected)}</strong>
                        </span>
                    </div>
                    <div class="issue-context">${escapeHtml(issue.text)}</div>
                </div>
            `).join('');
        }
        
        resultsContainer.classList.remove('hidden');
    },
    
    /**
     * Show status message
     */
    showStatus(type, message, duration = 4000) {
        const status = document.getElementById('status');
        if (!status) return;
        
        status.className = `status ${type}`;
        status.textContent = message;
        
        if (duration > 0) {
            setTimeout(() => {
                status.className = 'status';
            }, duration);
        }
    }
};

/**
 * Escape HTML to prevent XSS - delegates to shared utility
 */
function escapeHtml(text) {
    return window.DocForge?.Utils?.escapeHtml?.(text) || (text || '');
}

/**
 * Main analyze function - called by UI
 */
async function analyzeNumbering() {
    if (UIState.isProcessing) return;
    
    UIState.setProcessing(true);
    
    try {
        await Word.run(async (context) => {
            // Get stats
            const stats = await DocForge.Numbering.getNumberingStats(context);
            Renderer.renderStats(stats);
            
            // Get detailed issues for preview
            const issues = await DocForge.Numbering.previewNumberingChanges(context);
            Renderer.renderIssues(issues);
            
            // Store for later use
            UIState.lastAnalysis = { stats, issues };
            
            // Show summary
            const message = stats.issues === 0 
                ? 'Document numbering looks good! ✓'
                : `Found ${stats.issues} issue${stats.issues !== 1 ? 's' : ''} (${stats.analysisTime.toFixed(0)}ms)`;
            
            Renderer.showStatus(stats.issues > 0 ? 'warning' : 'success', message);
        });
    } catch (error) {
        console.error('Analyze error:', error);
        Renderer.showStatus('error', `Analysis failed: ${error.message}`);
    } finally {
        UIState.setProcessing(false);
    }
}

/**
 * Main fix function - called by UI
 */
async function fixNumbering() {
    if (UIState.isProcessing) return;
    
    UIState.setProcessing(true);
    
    try {
        await Word.run(async (context) => {
            // Check scope
            const scope = document.querySelector('input[name="numbering-scope"]:checked');
            const fromCursor = scope && scope.id === 'scope-cursor';
            
            let result;
            if (fromCursor) {
                result = await DocForge.Numbering.fixNumberingFromCursor(context);
            } else {
                result = await DocForge.Numbering.fixAllNumbering(context);
            }
            
            Renderer.showStatus('success', result.message);
            
            // Re-analyze to show updated state
            await analyzeNumberingInternal(context);
        });
    } catch (error) {
        console.error('Fix error:', error);
        Renderer.showStatus('error', `Fix failed: ${error.message}`);
    } finally {
        UIState.setProcessing(false);
    }
}

/**
 * Internal analyze (already in Word.run context)
 */
async function analyzeNumberingInternal(context) {
    const stats = await DocForge.Numbering.getNumberingStats(context);
    Renderer.renderStats(stats);
    
    const issues = await DocForge.Numbering.previewNumberingChanges(context);
    Renderer.renderIssues(issues);
    
    UIState.lastAnalysis = { stats, issues };
}

/**
 * Fix single item at specific paragraph index
 */
async function fixSingleItem(paragraphIndex) {
    if (UIState.isProcessing) return;
    
    UIState.setProcessing(true);
    
    try {
        await Word.run(async (context) => {
            const result = await DocForge.Numbering.fixSingleItem(context, paragraphIndex);
            
            if (result.success) {
                Renderer.showStatus('success', result.message);
                await analyzeNumberingInternal(context);
            } else {
                Renderer.showStatus('error', result.message);
            }
        });
    } catch (error) {
        console.error('Fix single error:', error);
        Renderer.showStatus('error', `Fix failed: ${error.message}`);
    } finally {
        UIState.setProcessing(false);
    }
}

/**
 * Get sections for cross-reference dropdown
 */
async function getSectionsForDropdown() {
    try {
        let sections = [];
        await Word.run(async (context) => {
            sections = await DocForge.Numbering.getSections(context);
        });
        return sections;
    } catch (error) {
        console.error('Get sections error:', error);
        return [];
    }
}

/**
 * Highlight a specific paragraph in the document
 */
async function highlightParagraph(paragraphIndex) {
    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items');
            await context.sync();
            
            const para = paragraphs.items[paragraphIndex];
            if (para) {
                const range = para.getRange();
                range.select();
                await context.sync();
            }
        });
    } catch (error) {
        console.error('Highlight error:', error);
    }
}

/**
 * Get detailed tree structure for debugging
 */
async function getDocumentTreeDebug() {
    try {
        let tree = null;
        await Word.run(async (context) => {
            tree = await DocForge.Numbering.getDocumentTree(context);
        });
        return tree;
    } catch (error) {
        console.error('Get tree error:', error);
        return null;
    }
}

/**
 * Initialize UI handlers
 */
function initializeNumberingUI() {
    // Click handlers for result items
    const resultsContainer = document.getElementById('numbering-results');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.result-item');
            if (item && item.dataset.index !== undefined) {
                const issue = UIState.lastAnalysis?.issues?.[parseInt(item.dataset.index)];
                if (issue) {
                    highlightParagraph(issue.line - 1);
                }
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Shift + N = Analyze
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            analyzeNumbering();
        }
        // Ctrl/Cmd + Shift + F = Fix All
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            fixNumbering();
        }
    });
}

// Export functions to global namespace for HTML onclick handlers
window.analyzeNumbering = analyzeNumbering;
window.fixNumbering = fixNumbering;
window.fixSingleItem = fixSingleItem;
window.getSectionsForDropdown = getSectionsForDropdown;
window.highlightParagraph = highlightParagraph;
window.getDocumentTreeDebug = getDocumentTreeDebug;

// Also export to DocForge namespace
DocForge.NumberingUI = {
    analyzeNumbering,
    fixNumbering,
    fixSingleItem,
    getSectionsForDropdown,
    highlightParagraph,
    getDocumentTreeDebug,
    initializeNumberingUI,
    UIState,
    Renderer
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNumberingUI);
} else {
    initializeNumberingUI();
}
