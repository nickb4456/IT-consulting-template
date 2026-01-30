/**
 * DocForge Document Health Dashboard - UI
 * 
 * Beautiful, premium dashboard for document quality assessment.
 * Designed for legal professionals who appreciate attention to detail.
 * 
 * @version 2.0.0
 */

/* global DocForgeHealthDashboard */

// ============================================================================
// Design System - Icons (Clean SVG)
// ============================================================================

const ICONS = {
    // Dashboard icon
    dashboard: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.58 0-6.5-2.92-6.5-6.5S6.42 3.5 10 3.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5z" fill="currentColor"/>
        <path d="M10 5v5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Category icons
    formatting: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4h14M2 9h10M2 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    
    definedTerms: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 6h8M5 9h6M5 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    crossReferences: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3H4a1 1 0 00-1 1v3M11 3h3a1 1 0 011 1v3M7 15H4a1 1 0 01-1-1v-3M11 15h3a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
    
    partyNames: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="12" cy="6" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 15c0-2.5 2-4 4-4s4 1.5 4 4M8 15c0-2.5 2-4 4-4s4 1.5 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    exhibits: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 6H2v8a2 2 0 002 2h8v-2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 7h4M8 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    emptyFields: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M6 9h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
    </svg>`,
    
    placeholders: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 5l3-3 3 3M3 13l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 2v14" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 6h4M11 9h4M11 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Action icons
    refresh: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 8A6 6 0 114.8 3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M14 3v5h-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    history: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 4v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    chevronDown: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    chevronLeft: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 9l-3-3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    check: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    warning: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4v2.5M6 8h.005" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M5.13 2.15L1.28 8.85A1 1 0 002.15 10.3h7.7a1 1 0 00.87-1.45L6.87 2.15a1 1 0 00-1.74 0z" stroke="currentColor" stroke-width="1.2"/>
    </svg>`,
    
    error: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    sparkle: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    trendUp: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12l4-4 3 2 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 4h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    trendDown: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4l4 4 3-2 5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 12h4v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    trendStable: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
};

// Category icon mapping
const CATEGORY_ICONS = {
    formatting: ICONS.formatting,
    definedTerms: ICONS.definedTerms,
    crossReferences: ICONS.crossReferences,
    partyNames: ICONS.partyNames,
    exhibits: ICONS.exhibits,
    emptyFields: ICONS.emptyFields,
    placeholders: ICONS.placeholders
};

// ============================================================================
// Color System - Score Scale
// ============================================================================

const SCORE_COLORS = {
    // Dynamic gradient stops for score ring
    getColor(score) {
        if (score >= 80) return { primary: '#059669', light: '#d1fae5', border: '#6ee7b7' };
        if (score >= 60) return { primary: '#65a30d', light: '#ecfccb', border: '#bef264' };
        if (score >= 40) return { primary: '#d97706', light: '#fef3c7', border: '#fcd34d' };
        if (score >= 20) return { primary: '#ea580c', light: '#ffedd5', border: '#fdba74' };
        return { primary: '#dc2626', light: '#fee2e2', border: '#fca5a5' };
    },
    
    // Get severity bucket
    getSeverity(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'warning';
        return 'critical';
    },
    
    // Get status text
    getStatusText(score) {
        if (score === 100) return 'Perfect Score';
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Very Good';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Fair';
        if (score >= 50) return 'Needs Work';
        if (score >= 40) return 'Poor';
        return 'Critical Issues';
    }
};

// ============================================================================
// UI State
// ============================================================================

let dashboard = null;
let currentReport = null;
let expandedCategories = new Set();
let animationFrameId = null;

// ============================================================================
// Initialize
// ============================================================================

function initHealthDashboardUI() {
    dashboard = new DocForgeHealthDashboard.Dashboard();
    
    // Wire up the health dashboard button
    const healthBtn = document.getElementById('healthDashboardBtn');
    if (healthBtn) {
        healthBtn.addEventListener('click', showHealthDashboard);
    }
    
    // Inject styles
    injectHealthDashboardStyles();
}

// ============================================================================
// Modal Management
// ============================================================================

function showHealthDashboard() {
    let modal = document.getElementById('healthDashboardModal');
    if (!modal) {
        modal = createHealthDashboardModal();
        document.body.appendChild(modal);
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('entering');
    
    requestAnimationFrame(() => {
        modal.classList.remove('entering');
    });
    
    runHealthCheck();
}

function hideHealthDashboard() {
    const modal = document.getElementById('healthDashboardModal');
    if (modal) {
        modal.classList.add('exiting');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('exiting');
        }, 200);
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function createHealthDashboardModal() {
    const modal = document.createElement('div');
    modal.id = 'healthDashboardModal';
    modal.className = 'modal health-modal hidden';
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="hideHealthDashboard()"></div>
        <div class="modal-content health-content">
            <div class="modal-header health-header">
                <div class="header-title">
                    <span class="header-icon">${ICONS.dashboard}</span>
                    <h2 class="modal-title">Document Health</h2>
                </div>
                <button class="modal-close" onclick="hideHealthDashboard()" aria-label="Close">
                    ${ICONS.close}
                </button>
            </div>
            <div class="modal-body health-body" id="healthDashboardBody">
                <div class="health-loading">
                    <div class="health-spinner"></div>
                    <p class="loading-text">Analyzing document health...</p>
                </div>
            </div>
            <div class="modal-footer health-footer" id="healthDashboardFooter">
                <button class="btn btn-ghost" onclick="toggleHealthHistory()">
                    <span class="btn-icon">${ICONS.history}</span>
                    History
                </button>
                <div class="footer-actions">
                    <button class="btn btn-secondary" onclick="hideHealthDashboard()">Close</button>
                    <button class="btn btn-primary" id="healthRerunBtn" onclick="runHealthCheck()">
                        <span class="btn-icon">${ICONS.refresh}</span>
                        Refresh
                    </button>
                </div>
            </div>
        </div>
        <div class="celebration-container" id="celebrationContainer"></div>
    `;
    
    return modal;
}

// ============================================================================
// Run Health Check
// ============================================================================

async function runHealthCheck() {
    const body = document.getElementById('healthDashboardBody');
    const rerunBtn = document.getElementById('healthRerunBtn');
    
    // Show loading with subtle animation
    body.innerHTML = `
        <div class="health-loading">
            <div class="health-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring delay-1"></div>
                <div class="spinner-ring delay-2"></div>
            </div>
            <p class="loading-text">Analyzing document health...</p>
            <div class="loading-progress">
                <div class="progress-bar"></div>
            </div>
        </div>
    `;
    
    if (rerunBtn) {
        rerunBtn.disabled = true;
        rerunBtn.classList.add('loading');
    }
    
    try {
        currentReport = await dashboard.runHealthCheck();
        renderHealthDashboard(currentReport);
        
        // Trigger celebration if perfect score
        if (currentReport.overallScore === 100) {
            triggerCelebration();
        }
    } catch (err) {
        body.innerHTML = `
            <div class="health-error">
                <div class="error-icon-wrapper">
                    <span class="error-icon">${ICONS.warning}</span>
                </div>
                <h3 class="error-title">Couldn't analyze document</h3>
                <p class="error-message">Make sure you have a document open and it's not protected. Then try again.</p>
                <button class="btn btn-primary" onclick="runHealthCheck()">
                    <span class="btn-icon">${ICONS.refresh}</span>
                    Try Again
                </button>
            </div>
        `;
    }
    
    if (rerunBtn) {
        rerunBtn.disabled = false;
        rerunBtn.classList.remove('loading');
    }
}

// ============================================================================
// Render Dashboard
// ============================================================================

function renderHealthDashboard(report) {
    const body = document.getElementById('healthDashboardBody');
    
    // Build components
    const scoreSection = buildScoreSection(report);
    const summaryBanner = buildSummaryBanner(report);
    const categoryCards = buildCategoryCards(report);
    
    body.innerHTML = `
        <div class="health-dashboard">
            ${scoreSection}
            ${summaryBanner}
            <div class="health-categories">
                <div class="categories-header">
                    <h3 class="categories-title">Quality Categories</h3>
                    <span class="categories-count">${report.totalIssues} item${report.totalIssues !== 1 ? 's' : ''}</span>
                </div>
                <div class="categories-grid">
                    ${categoryCards}
                </div>
            </div>
            <div class="health-meta">
                <span class="meta-item">Analyzed in ${report.elapsed}ms</span>
                <span class="meta-separator">•</span>
                <span class="meta-item">${new Date(report.timestamp).toLocaleTimeString()}</span>
            </div>
        </div>
    `;
    
    // Animate score ring after render
    requestAnimationFrame(() => {
        animateScoreRing(report.overallScore);
    });
}

// ============================================================================
// Score Section with Animated Ring
// ============================================================================

function buildScoreSection(report) {
    const colors = SCORE_COLORS.getColor(report.overallScore);
    const statusText = SCORE_COLORS.getStatusText(report.overallScore);
    const severity = SCORE_COLORS.getSeverity(report.overallScore);
    
    return `
        <div class="health-score-section score-${severity}">
            <div class="score-ring-container">
                <svg class="score-ring" viewBox="0 0 140 140">
                    <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.7" />
                        </linearGradient>
                        <filter id="scoreShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${colors.primary}" flood-opacity="0.3"/>
                        </filter>
                    </defs>
                    <!-- Background track -->
                    <circle
                        class="score-ring-bg"
                        cx="70"
                        cy="70"
                        r="58"
                        fill="none"
                        stroke="${colors.light}"
                        stroke-width="10"
                    />
                    <!-- Progress arc -->
                    <circle
                        class="score-ring-progress"
                        id="scoreProgress"
                        cx="70"
                        cy="70"
                        r="58"
                        fill="none"
                        stroke="url(#scoreGradient)"
                        stroke-width="10"
                        stroke-linecap="round"
                        stroke-dasharray="0 364.42"
                        transform="rotate(-90 70 70)"
                        filter="url(#scoreShadow)"
                    />
                    <!-- Score text -->
                    <text
                        x="70"
                        y="64"
                        text-anchor="middle"
                        class="score-ring-value"
                        fill="${colors.primary}"
                    >
                        <tspan id="scoreValue">0</tspan>
                    </text>
                    <text
                        x="70"
                        y="84"
                        text-anchor="middle"
                        class="score-ring-label"
                    >out of 100</text>
                </svg>
                ${report.overallScore === 100 ? '<div class="perfect-badge">Perfect</div>' : ''}
            </div>
            <div class="score-details">
                <div class="score-status">${statusText}</div>
                <div class="score-trend" id="scoreTrend">${buildMiniTrend()}</div>
            </div>
        </div>
    `;
}

function animateScoreRing(targetScore) {
    const progressEl = document.getElementById('scoreProgress');
    const valueEl = document.getElementById('scoreValue');
    
    if (!progressEl || !valueEl) return;
    
    const circumference = 2 * Math.PI * 58;
    const startTime = performance.now();
    const duration = 1200; // ms
    
    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutExpo(progress);
        
        const currentScore = Math.round(easedProgress * targetScore);
        const arcLength = (currentScore / 100) * circumference;
        
        valueEl.textContent = currentScore;
        progressEl.setAttribute('stroke-dasharray', `${arcLength} ${circumference}`);
        
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

function buildMiniTrend() {
    const history = dashboard.getHistory();
    if (history.length < 2) {
        return '<span class="trend-label">First analysis</span>';
    }
    
    const recent = history.slice(-5);
    const trend = dashboard.getHistoryTrend(5);
    const trendIcon = trend.trend === 'improving' ? ICONS.trendUp :
                      trend.trend === 'declining' ? ICONS.trendDown : ICONS.trendStable;
    const trendClass = trend.trend === 'improving' ? 'trend-up' :
                       trend.trend === 'declining' ? 'trend-down' : 'trend-stable';
    
    // Build sparkline
    const sparkline = buildSparkline(recent.map(h => h.score));
    
    return `
        <div class="trend-sparkline">${sparkline}</div>
        <span class="trend-indicator ${trendClass}">${trendIcon}</span>
    `;
}

function buildSparkline(values, width = 60, height = 24) {
    if (values.length < 2) return '';
    
    const padding = 2;
    const minVal = Math.min(...values) - 5;
    const maxVal = Math.max(...values) + 5;
    const range = maxVal - minVal || 1;
    
    const points = values.map((val, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
        return `${x},${y}`;
    });
    
    const lastPoint = points[points.length - 1].split(',');
    
    return `
        <svg width="${width}" height="${height}" class="sparkline-svg">
            <polyline
                points="${points.join(' ')}"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.6"
            />
            <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="2.5" fill="currentColor"/>
        </svg>
    `;
}

// ============================================================================
// Summary Banner
// ============================================================================

function buildSummaryBanner(report) {
    const { criticalIssues, warnings, topPriority } = report.summary;
    
    if (report.overallScore === 100) {
        return `
            <div class="health-summary summary-perfect">
                <div class="summary-icon-wrapper perfect">
                    ${ICONS.sparkle}
                </div>
                <div class="summary-content">
                    <strong class="summary-title">Outstanding Work</strong>
                    <span class="summary-desc">This document passes all quality checks.</span>
                </div>
            </div>
        `;
    }
    
    if (criticalIssues.length === 0 && warnings.length === 0) {
        return `
            <div class="health-summary summary-success">
                <div class="summary-icon-wrapper success">
                    ${ICONS.check}
                </div>
                <div class="summary-content">
                    <strong class="summary-title">Looking Good</strong>
                    <span class="summary-desc">No critical issues found in this document.</span>
                </div>
            </div>
        `;
    }
    
    if (criticalIssues.length > 0) {
        return `
            <div class="health-summary summary-error">
                <div class="summary-icon-wrapper error">
                    ${ICONS.error}
                </div>
                <div class="summary-content">
                    <strong class="summary-title">${criticalIssues.length} Critical Issue${criticalIssues.length > 1 ? 's' : ''}</strong>
                    <span class="summary-desc">${topPriority?.message || 'Review the issues below'}</span>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="health-summary summary-warning">
            <div class="summary-icon-wrapper warning">
                ${ICONS.warning}
            </div>
            <div class="summary-content">
                <strong class="summary-title">${warnings.length} Item${warnings.length > 1 ? 's' : ''} to Review</strong>
                <span class="summary-desc">${topPriority?.message || 'See details below'}</span>
            </div>
        </div>
    `;
}

// ============================================================================
// Category Cards
// ============================================================================

function buildCategoryCards(report) {
    const categories = DocForgeHealthDashboard.CATEGORIES;
    
    return Object.entries(report.categories).map(([id, result]) => {
        const category = categories[id];
        if (!category) return '';
        
        const severity = SCORE_COLORS.getSeverity(result.score);
        const colors = SCORE_COLORS.getColor(result.score);
        const issueCount = result.issues.filter(i => i.severity !== 'pass').length;
        const isExpanded = expandedCategories.has(id);
        const hasIssues = issueCount > 0;
        
        const icon = CATEGORY_ICONS[id] || ICONS.formatting;
        
        // Build issues list
        const issuesList = result.issues
            .filter(i => i.severity !== 'pass')
            .map(issue => `
                <div class="issue-item issue-${issue.severity}">
                    <span class="issue-icon-wrapper ${issue.severity}">
                        ${issue.severity === 'error' ? ICONS.error : ICONS.warning}
                    </span>
                    <div class="issue-content">
                        <span class="issue-message">${escapeHtml(issue.message)}</span>
                        ${issue.detail ? `<span class="issue-detail">${escapeHtml(issue.detail)}</span>` : ''}
                    </div>
                </div>
            `).join('');
        
        // Build pass items
        const passItems = result.issues.filter(i => i.severity === 'pass');
        const passInfo = passItems.length > 0 ? `
            <div class="category-passes">
                ${passItems.map(i => `
                    <span class="pass-item">
                        <span class="pass-check">${ICONS.check}</span>
                        ${escapeHtml(i.message)}
                    </span>
                `).join('')}
            </div>
        ` : '';
        
        // Progress bar width
        const progressWidth = result.score;
        
        return `
            <div class="category-card category-${severity} ${isExpanded ? 'expanded' : ''}" data-category="${id}">
                <div class="category-header" onclick="toggleCategory('${id}')" role="button" aria-expanded="${isExpanded}">
                    <div class="category-icon" style="color: ${colors.primary}">
                        ${icon}
                    </div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-progress">
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${progressWidth}%; background: ${colors.primary}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="category-score" style="color: ${colors.primary}">
                        ${result.score}
                    </div>
                    ${hasIssues ? `
                        <div class="category-expand">
                            <span class="issue-badge">${issueCount}</span>
                            <span class="expand-icon">${ICONS.chevronDown}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="category-details" id="category-details-${id}">
                    ${passInfo}
                    ${issuesList ? `<div class="issues-list">${issuesList}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// History View
// ============================================================================

let showingHistory = false;

function toggleHealthHistory() {
    showingHistory = !showingHistory;
    
    if (showingHistory) {
        renderHistoryView();
    } else {
        if (currentReport) {
            renderHealthDashboard(currentReport);
        }
    }
}

function renderHistoryView() {
    const body = document.getElementById('healthDashboardBody');
    const history = dashboard.getHistory();
    const trend = dashboard.getHistoryTrend(10);
    
    if (history.length === 0) {
        body.innerHTML = `
            <div class="health-history-empty">
                <div class="empty-icon-wrapper">
                    ${ICONS.history}
                </div>
                <h3 class="empty-title">No History Yet</h3>
                <p class="empty-desc">Health scores will be tracked over time as you use the dashboard.</p>
                <button class="btn btn-primary" onclick="toggleHealthHistory()">
                    ${ICONS.chevronLeft} Back to Dashboard
                </button>
            </div>
        `;
        return;
    }
    
    // Build trend chart
    const chartSvg = buildHistoryChart(trend);
    
    // Build history list
    const historyList = history.slice().reverse().slice(0, 20).map((entry, idx) => {
        const date = new Date(entry.timestamp);
        const colors = SCORE_COLORS.getColor(entry.score);
        const severity = SCORE_COLORS.getSeverity(entry.score);
        
        return `
            <div class="history-entry" style="animation-delay: ${idx * 30}ms">
                <div class="history-score" style="background: ${colors.light}; color: ${colors.primary}">
                    ${entry.score}
                </div>
                <div class="history-info">
                    <div class="history-date">${date.toLocaleDateString()}</div>
                    <div class="history-time">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="history-stats">
                    <span class="history-issues">${entry.totalIssues} issue${entry.totalIssues !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
    }).join('');
    
    const trendIcon = trend.trend === 'improving' ? ICONS.trendUp : 
                      trend.trend === 'declining' ? ICONS.trendDown : ICONS.trendStable;
    const trendText = trend.trend === 'improving' ? 'Improving' :
                      trend.trend === 'declining' ? 'Declining' : 'Stable';
    const trendClass = trend.trend === 'improving' ? 'trend-up' :
                       trend.trend === 'declining' ? 'trend-down' : 'trend-stable';
    
    body.innerHTML = `
        <div class="health-history">
            <div class="history-header">
                <button class="btn btn-ghost" onclick="toggleHealthHistory()">
                    ${ICONS.chevronLeft} Back
                </button>
                <h3 class="history-title">Score History</h3>
            </div>
            
            <div class="history-chart-section">
                <div class="chart-container">
                    ${chartSvg}
                </div>
                <div class="trend-summary ${trendClass}">
                    <span class="trend-icon-large">${trendIcon}</span>
                    <span class="trend-text">${trendText}</span>
                </div>
            </div>
            
            <div class="history-list">
                ${historyList}
            </div>
            
            <button class="btn btn-ghost btn-danger" onclick="clearHealthHistory()">
                Clear History
            </button>
        </div>
    `;
}

function buildHistoryChart(trend) {
    if (trend.scores.length < 2) {
        return `<div class="no-chart-data">
            <span>Not enough data for chart</span>
        </div>`;
    }
    
    const width = 320;
    const height = 100;
    const padding = { top: 10, right: 10, bottom: 20, left: 30 };
    
    const scores = trend.scores;
    const minScore = Math.max(0, Math.min(...scores) - 15);
    const maxScore = Math.min(100, Math.max(...scores) + 10);
    const range = maxScore - minScore || 1;
    
    // Build area + line path
    const points = scores.map((score, i) => {
        const x = padding.left + (i / (scores.length - 1)) * (width - padding.left - padding.right);
        const y = height - padding.bottom - ((score - minScore) / range) * (height - padding.top - padding.bottom);
        return { x, y, score };
    });
    
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = linePath + ` L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`;
    
    // Y-axis labels
    const yLabels = [minScore, Math.round((minScore + maxScore) / 2), maxScore];
    const yAxisLabels = yLabels.map(val => {
        const y = height - padding.bottom - ((val - minScore) / range) * (height - padding.top - padding.bottom);
        return `<text x="${padding.left - 8}" y="${y}" class="chart-label" text-anchor="end" dominant-baseline="middle">${val}</text>`;
    }).join('');
    
    // Grid lines
    const gridLines = yLabels.map(val => {
        const y = height - padding.bottom - ((val - minScore) / range) * (height - padding.top - padding.bottom);
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid"/>`;
    }).join('');
    
    const lastPoint = points[points.length - 1];
    
    return `
        <svg viewBox="0 0 ${width} ${height}" class="history-chart-svg">
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2563eb" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${gridLines}
            ${yAxisLabels}
            <path d="${areaPath}" fill="url(#areaGradient)" class="chart-area"/>
            <path d="${linePath}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>
            <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="5" fill="#2563eb" class="chart-point"/>
            <text x="${lastPoint.x}" y="${lastPoint.y - 10}" class="chart-point-label" text-anchor="middle">${lastPoint.score}</text>
        </svg>
    `;
}

function clearHealthHistory() {
    if (confirm('Clear all health history? This cannot be undone.')) {
        dashboard.clearHistory();
        toggleHealthHistory();
    }
}

// ============================================================================
// Celebration Animation (Perfect Score)
// ============================================================================

function triggerCelebration() {
    const container = document.getElementById('celebrationContainer');
    if (!container) return;
    
    container.innerHTML = '';
    container.classList.add('active');
    
    // Create confetti particles
    const colors = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#ec4899'];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.setProperty('--x', `${Math.random() * 100}%`);
        particle.style.setProperty('--delay', `${Math.random() * 0.5}s`);
        particle.style.setProperty('--duration', `${1 + Math.random() * 1}s`);
        particle.style.setProperty('--rotate', `${Math.random() * 360}deg`);
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(particle);
    }
    
    // Clean up after animation
    setTimeout(() => {
        container.classList.remove('active');
        container.innerHTML = '';
    }, 3000);
}

// ============================================================================
// Interactions
// ============================================================================

function toggleCategory(categoryId) {
    const card = document.querySelector(`[data-category="${categoryId}"]`);
    const details = document.getElementById(`category-details-${categoryId}`);
    
    if (!card || !details) return;
    
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
        card.classList.remove('expanded');
    } else {
        expandedCategories.add(categoryId);
        card.classList.add('expanded');
    }
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// Styles Injection
// ============================================================================

function injectHealthDashboardStyles() {
    if (document.getElementById('health-dashboard-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'health-dashboard-styles';
    link.rel = 'stylesheet';
    link.href = './features/health-dashboard/health-dashboard.css';
    document.head.appendChild(link);
}

// ============================================================================
// Auto-init
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHealthDashboardUI);
} else {
    initHealthDashboardUI();
}

// ============================================================================
// Exports
// ============================================================================

const HealthDashboardUI = {
    show: showHealthDashboard,
    hide: hideHealthDashboard,
    run: runHealthCheck,
    toggleHistory: toggleHealthHistory,
    getReport: () => currentReport,
    ICONS,
    SCORE_COLORS
};

// Global exports
if (typeof window !== 'undefined') {
    window.HealthDashboardUI = HealthDashboardUI;
    window.showHealthDashboard = showHealthDashboard;
    window.hideHealthDashboard = hideHealthDashboard;
    window.runHealthCheck = runHealthCheck;
    window.toggleCategory = toggleCategory;
    window.toggleHealthHistory = toggleHealthHistory;
    window.clearHealthHistory = clearHealthHistory;
}

export default HealthDashboardUI;
