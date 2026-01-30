/**
 * DraftBridge Party Checker UI
 * 
 * Task pane panel showing detected parties and issues.
 * Provides one-click fixes and navigation.
 * 
 * @version 1.0.0
 */

const DraftBridgePartyCheckerUI = (function() {
    'use strict';

    // State
    let container = null;
    let scanResults = null;
    let selectedParty = null;
    let isScanning = false;

    // =========================================================================
    // Initialization
    // =========================================================================

    /**
     * Initialize the UI in a container element
     */
    function init(containerId) {
        container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
        }
        
        container.className = 'party-checker-container';
        render();
        return container;
    }

    /**
     * Main render function
     */
    function render() {
        if (!container) return;

        container.innerHTML = `
            <div class="party-checker">
                <header class="party-checker-header">
                    <h2>Party Consistency</h2>
                    <div class="header-actions">
                        <button id="pc-scan-btn" class="btn btn-primary" ${isScanning ? 'disabled' : ''}>
                            ${isScanning ? 
                                '<span class="spinner"></span> Scanning...' : 
                                '<span class="icon">🔍</span> Scan Document'}
                        </button>
                    </div>
                </header>

                ${scanResults ? renderResults() : renderEmptyState()}
            </div>
        `;

        attachEventListeners();
    }

    /**
     * Render empty state (no scan yet)
     */
    function renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No Scan Results</h3>
                <p>Click "Scan Document" to detect party definitions and check for consistency issues.</p>
                <div class="feature-list">
                    <div class="feature-item">
                        <span class="icon">✓</span>
                        <span>Detect party definitions</span>
                    </div>
                    <div class="feature-item">
                        <span class="icon">✓</span>
                        <span>Track name variations</span>
                    </div>
                    <div class="feature-item">
                        <span class="icon">✓</span>
                        <span>Find undefined references</span>
                    </div>
                    <div class="feature-item">
                        <span class="icon">✓</span>
                        <span>Catch typos</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render scan results
     */
    function renderResults() {
        const { parties, issues, summary } = scanResults;

        return `
            <div class="results-container">
                ${renderSummaryCard(summary)}
                ${renderPartiesSection(parties)}
                ${renderIssuesSection(issues)}
                ${renderActionsSection()}
            </div>
        `;
    }

    /**
     * Render summary card
     */
    function renderSummaryCard(summary) {
        const hasIssues = summary.totalIssues > 0;
        const statusClass = hasIssues ? 
            (summary.issuesBySeverity.error > 0 ? 'status-error' : 'status-warning') : 
            'status-ok';

        return `
            <div class="summary-card ${statusClass}">
                <div class="summary-status">
                    <span class="status-icon">${hasIssues ? 
                        (summary.issuesBySeverity.error > 0 ? '⚠️' : '⚡') : 
                        '✅'}</span>
                    <span class="status-text">${hasIssues ? 
                        `${summary.totalIssues} issue${summary.totalIssues !== 1 ? 's' : ''} found` : 
                        'All parties consistent'}</span>
                </div>
                <div class="summary-stats">
                    <div class="stat">
                        <span class="stat-value">${summary.totalParties}</span>
                        <span class="stat-label">Parties</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${summary.totalUsages}</span>
                        <span class="stat-label">References</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${summary.issuesBySeverity.error}</span>
                        <span class="stat-label">Errors</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${summary.issuesBySeverity.warning}</span>
                        <span class="stat-label">Warnings</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render parties section
     */
    function renderPartiesSection(parties) {
        if (parties.length === 0) {
            return `
                <div class="section parties-section">
                    <h3 class="section-title">
                        <span class="icon">👥</span> Parties
                        <span class="badge badge-neutral">0</span>
                    </h3>
                    <div class="section-empty">
                        No party definitions detected. 
                        <button class="link-btn" id="pc-add-party-btn">Add manually</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="section parties-section">
                <h3 class="section-title">
                    <span class="icon">👥</span> Parties
                    <span class="badge badge-primary">${parties.length}</span>
                    <button class="icon-btn" id="pc-add-party-btn" title="Add party manually">+</button>
                </h3>
                <div class="parties-list">
                    ${parties.map(party => renderPartyItem(party)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render a single party item
     */
    function renderPartyItem(party) {
        const hasIssues = scanResults.issues.some(i => i.partyId === party.id && !i.resolved);
        const variationCount = party.variations.length;
        const isExpanded = selectedParty === party.id;

        return `
            <div class="party-item ${hasIssues ? 'has-issues' : ''} ${isExpanded ? 'expanded' : ''}" 
                 data-party-id="${party.id}">
                <div class="party-header" data-action="toggle-party" data-party-id="${party.id}">
                    <div class="party-info">
                        <span class="party-short-form">${escapeHtml(party.shortForm)}</span>
                        <span class="party-full-name">${escapeHtml(truncate(party.fullName, 40))}</span>
                    </div>
                    <div class="party-meta">
                        <span class="usage-count" title="${party.usageCount} references">
                            ${party.usageCount}×
                        </span>
                        ${variationCount > 1 ? 
                            `<span class="variation-badge" title="${variationCount} variations">
                                ${variationCount} var
                            </span>` : ''}
                        ${hasIssues ? '<span class="issue-indicator">⚠️</span>' : ''}
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                ${isExpanded ? renderPartyDetails(party) : ''}
            </div>
        `;
    }

    /**
     * Render party details (expanded view)
     */
    function renderPartyDetails(party) {
        const partyIssues = scanResults.issues.filter(i => i.partyId === party.id);

        return `
            <div class="party-details">
                <div class="detail-row">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${escapeHtml(party.fullName)}</span>
                </div>
                ${party.jurisdiction ? `
                    <div class="detail-row">
                        <span class="detail-label">Jurisdiction:</span>
                        <span class="detail-value">${escapeHtml(party.jurisdiction)}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Aliases:</span>
                    <span class="detail-value aliases">
                        ${party.aliases.map(a => `<span class="alias-tag">${escapeHtml(a)}</span>`).join('')}
                        <button class="mini-btn" data-action="add-alias" data-party-id="${party.id}">+</button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Variations Used:</span>
                    <div class="variations-list">
                        ${party.variations.map(v => `
                            <span class="variation-tag ${v === party.shortForm ? 'preferred' : ''}">
                                ${escapeHtml(v)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ${partyIssues.length > 0 ? `
                    <div class="party-issues">
                        <span class="detail-label">Issues:</span>
                        ${partyIssues.map(i => `
                            <div class="mini-issue ${i.resolved ? 'resolved' : ''}">
                                <span class="issue-type">${getIssueIcon(i.type)}</span>
                                <span class="issue-text">${escapeHtml(i.text)}: ${escapeHtml(i.suggestion)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="party-actions">
                    <button class="btn btn-sm" data-action="goto-definition" data-party-id="${party.id}">
                        📍 Go to Definition
                    </button>
                    <button class="btn btn-sm btn-primary" data-action="standardize" data-party-id="${party.id}">
                        ✨ Standardize
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render issues section
     */
    function renderIssuesSection(issues) {
        const unresolvedIssues = issues.filter(i => !i.resolved);
        
        if (unresolvedIssues.length === 0 && issues.length === 0) {
            return `
                <div class="section issues-section">
                    <h3 class="section-title">
                        <span class="icon">🔍</span> Issues
                        <span class="badge badge-success">0</span>
                    </h3>
                    <div class="section-empty success">
                        <span class="icon">✅</span> No issues found!
                    </div>
                </div>
            `;
        }

        // Group issues by type
        const groupedIssues = {
            error: unresolvedIssues.filter(i => i.severity === 'error'),
            warning: unresolvedIssues.filter(i => i.severity === 'warning'),
            info: unresolvedIssues.filter(i => i.severity === 'info')
        };

        return `
            <div class="section issues-section">
                <h3 class="section-title">
                    <span class="icon">🔍</span> Issues
                    <span class="badge badge-warning">${unresolvedIssues.length}</span>
                </h3>
                <div class="issues-list">
                    ${groupedIssues.error.map(i => renderIssueItem(i)).join('')}
                    ${groupedIssues.warning.map(i => renderIssueItem(i)).join('')}
                    ${groupedIssues.info.map(i => renderIssueItem(i)).join('')}
                </div>
                ${issues.some(i => i.resolved) ? `
                    <div class="resolved-count">
                        ${issues.filter(i => i.resolved).length} issue(s) resolved
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render a single issue item
     */
    function renderIssueItem(issue) {
        return `
            <div class="issue-item severity-${issue.severity}" data-issue-id="${issue.id}">
                <div class="issue-header">
                    <span class="issue-icon">${getIssueIcon(issue.type)}</span>
                    <span class="issue-type-label">${getIssueTypeLabel(issue.type)}</span>
                    <span class="issue-severity-badge">${issue.severity}</span>
                </div>
                <div class="issue-content">
                    <span class="issue-text">"${escapeHtml(issue.text)}"</span>
                    <span class="issue-suggestion">${escapeHtml(issue.suggestion)}</span>
                </div>
                <div class="issue-actions">
                    <button class="btn btn-xs" data-action="goto-issue" data-issue-id="${issue.id}">
                        📍 Go to
                    </button>
                    ${issue.type !== 'undefined' ? `
                        <button class="btn btn-xs btn-primary" data-action="fix-issue" data-issue-id="${issue.id}">
                            ✓ Fix
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render actions section
     */
    function renderActionsSection() {
        return `
            <div class="section actions-section">
                <h3 class="section-title">
                    <span class="icon">⚡</span> Quick Actions
                </h3>
                <div class="actions-grid">
                    <button class="action-btn" id="pc-highlight-btn">
                        <span class="action-icon">🖍️</span>
                        <span class="action-label">Highlight Issues</span>
                    </button>
                    <button class="action-btn" id="pc-clear-highlight-btn">
                        <span class="action-icon">🧹</span>
                        <span class="action-label">Clear Highlights</span>
                    </button>
                    <button class="action-btn" id="pc-fix-all-btn" 
                            ${scanResults.issues.filter(i => !i.resolved && i.type !== 'undefined').length === 0 ? 'disabled' : ''}>
                        <span class="action-icon">🔧</span>
                        <span class="action-label">Fix All</span>
                    </button>
                    <button class="action-btn" id="pc-rescan-btn">
                        <span class="action-icon">🔄</span>
                        <span class="action-label">Rescan</span>
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // Event Handling
    // =========================================================================

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        if (!container) return;

        // Scan button
        const scanBtn = container.querySelector('#pc-scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', handleScan);
        }

        // Rescan button
        const rescanBtn = container.querySelector('#pc-rescan-btn');
        if (rescanBtn) {
            rescanBtn.addEventListener('click', handleScan);
        }

        // Add party button
        const addPartyBtn = container.querySelector('#pc-add-party-btn');
        if (addPartyBtn) {
            addPartyBtn.addEventListener('click', handleAddParty);
        }

        // Highlight buttons
        const highlightBtn = container.querySelector('#pc-highlight-btn');
        if (highlightBtn) {
            highlightBtn.addEventListener('click', handleHighlight);
        }

        const clearHighlightBtn = container.querySelector('#pc-clear-highlight-btn');
        if (clearHighlightBtn) {
            clearHighlightBtn.addEventListener('click', handleClearHighlight);
        }

        // Fix all button
        const fixAllBtn = container.querySelector('#pc-fix-all-btn');
        if (fixAllBtn) {
            fixAllBtn.addEventListener('click', handleFixAll);
        }

        // Delegated events for dynamic content
        container.addEventListener('click', handleDelegatedClick);
    }

    /**
     * Handle delegated click events
     */
    function handleDelegatedClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const partyId = target.dataset.partyId;
        const issueId = target.dataset.issueId;

        switch (action) {
            case 'toggle-party':
                handleToggleParty(partyId);
                break;
            case 'goto-definition':
                handleGotoDefinition(partyId);
                break;
            case 'standardize':
                handleStandardize(partyId);
                break;
            case 'add-alias':
                handleAddAlias(partyId);
                break;
            case 'goto-issue':
                handleGotoIssue(issueId);
                break;
            case 'fix-issue':
                handleFixIssue(issueId);
                break;
        }
    }

    /**
     * Handle scan button click
     */
    async function handleScan() {
        if (isScanning) return;

        isScanning = true;
        render();

        try {
            scanResults = await DraftBridgePartyChecker.scanDocument();
            showToast('Scan complete!', 'success');
        } catch (error) {
            showToast('Scan failed: ' + error.message, 'error');
        } finally {
            isScanning = false;
            render();
        }
    }

    /**
     * Handle toggle party expansion
     */
    function handleToggleParty(partyId) {
        selectedParty = selectedParty === partyId ? null : partyId;
        render();
    }

    /**
     * Handle go to definition
     */
    async function handleGotoDefinition(partyId) {
        const party = scanResults.parties.find(p => p.id === partyId);
        if (party && party.definitionLocation) {
            try {
                await DraftBridgePartyChecker.navigateToLocation(party.definitionLocation);
            } catch (error) {
                console.warn('[PartyChecker] Navigate to definition failed:', error);
                showToast("Couldn't jump to definition — it may have moved", 'error');
            }
        }
    }

    /**
     * Handle standardize party
     */
    async function handleStandardize(partyId) {
        try {
            const result = await DraftBridgePartyChecker.standardizeParty(partyId);
            showToast(`Standardized ${result.replacedCount} references`, 'success');
            // Rescan to update
            await handleScan();
        } catch (error) {
            console.warn('[PartyChecker] Standardize failed:', error);
            showToast("Couldn't standardize all references — rescan to see what changed", 'error');
        }
    }

    /**
     * Handle add party manually
     */
    function handleAddParty() {
        const fullName = prompt('Enter full party name:');
        if (!fullName) return;

        const shortForm = prompt('Enter short form (e.g., "Company"):');
        if (!shortForm) return;

        try {
            DraftBridgePartyChecker.addPartyManually(fullName, shortForm);
            showToast('Party added', 'success');
            // Rescan to update
            handleScan();
        } catch (error) {
            console.warn('[PartyChecker] Add party failed:', error);
            showToast("Couldn't add that party — check for typos and try again", 'error');
        }
    }

    /**
     * Handle add alias to party
     */
    function handleAddAlias(partyId) {
        const alias = prompt('Enter new alias:');
        if (!alias) return;

        try {
            DraftBridgePartyChecker.addAlias(partyId, alias);
            showToast('Alias added', 'success');
            render();
        } catch (error) {
            console.warn('[PartyChecker] Add alias failed:', error);
            showToast("Couldn't add that alias — try a different name", 'error');
        }
    }

    /**
     * Handle go to issue
     */
    async function handleGotoIssue(issueId) {
        const issue = scanResults.issues.find(i => i.id === issueId);
        if (issue && issue.location) {
            try {
                await DraftBridgePartyChecker.navigateToLocation(issue.location);
            } catch (error) {
                console.warn('[PartyChecker] Navigate to issue failed:', error);
                showToast("Couldn't jump there — try rescanning the document", 'error');
            }
        }
    }

    /**
     * Handle fix issue
     */
    async function handleFixIssue(issueId) {
        try {
            await DraftBridgePartyChecker.fixIssue(issueId);
            showToast('Issue fixed', 'success');
            render();
        } catch (error) {
            console.warn('[PartyChecker] Fix issue failed:', error);
            showToast("Couldn't fix that automatically — you may need to edit manually", 'error');
        }
    }

    /**
     * Handle highlight issues
     */
    async function handleHighlight() {
        try {
            const result = await DraftBridgePartyChecker.highlightIssues();
            showToast(`Highlighted ${result.highlightedCount} items`, 'success');
        } catch (error) {
            console.warn('[PartyChecker] Highlight failed:', error);
            showToast("Couldn't highlight items — try clearing highlights first", 'error');
        }
    }

    /**
     * Handle clear highlights
     */
    async function handleClearHighlight() {
        try {
            await DraftBridgePartyChecker.clearHighlights();
            showToast('Highlights cleared', 'success');
        } catch (error) {
            console.warn('[PartyChecker] Clear highlights failed:', error);
            showToast("Couldn't clear highlights — try closing and reopening the document", 'error');
        }
    }

    /**
     * Handle fix all issues
     */
    async function handleFixAll() {
        const fixableIssues = scanResults.issues.filter(i => !i.resolved && i.type !== 'undefined');
        if (fixableIssues.length === 0) {
            showToast('No fixable issues', 'info');
            return;
        }

        if (!confirm(`Fix ${fixableIssues.length} issue(s)?`)) return;

        let fixed = 0;
        for (const issue of fixableIssues) {
            try {
                await DraftBridgePartyChecker.fixIssue(issue.id);
                fixed++;
            } catch (e) {
                // Individual fix failed - continue with others
            }
        }

        showToast(`Fixed ${fixed}/${fixableIssues.length} issues`, fixed === fixableIssues.length ? 'success' : 'warning');
        await handleScan();
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Truncate text
     */
    function truncate(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get icon for issue type
     */
    function getIssueIcon(type) {
        const icons = {
            undefined: '❓',
            inconsistent: '🔄',
            typo: '✏️',
            duplicate: '👯'
        };
        return icons[type] || '⚠️';
    }

    /**
     * Get label for issue type
     */
    function getIssueTypeLabel(type) {
        const labels = {
            undefined: 'Undefined Reference',
            inconsistent: 'Inconsistent Usage',
            typo: 'Possible Typo',
            duplicate: 'Duplicate Definition'
        };
        return labels[type] || 'Issue';
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existing = document.querySelector('.party-checker-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `party-checker-toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Destroy the UI
     */
    function destroy() {
        if (container) {
            container.innerHTML = '';
            container = null;
        }
        scanResults = null;
        selectedParty = null;
    }

    /**
     * Get current scan results
     */
    function getResults() {
        return scanResults;
    }

    // =========================================================================
    // Public API
    // =========================================================================

    return {
        init,
        render,
        destroy,
        getResults,
        showToast
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgePartyCheckerUI;
}
