/**
 * DocForge First-Run Onboarding
 * 
 * Creates the magical first-run experience that Steve Jobs demanded.
 * "Welcome to DocForge. Open any document and I'll show you something amazing."
 * 
 * Design Philosophy:
 * - First run feels magical, not instructional
 * - Empty states invite action, not shame users
 * - Zero confusion, maximum delight
 * - Build confidence with every interaction
 * 
 * @version 2.0.0 - The "Insanely Great" Edition
 */

/* global Word, Office */

// ============================================================================
// Onboarding State
// ============================================================================

const ONBOARDING_KEY = 'docforge_onboarding';
const ONBOARDING_VERSION = 2;

const OnboardingState = {
    isFirstRun: true,
    hasSeenWelcome: false,
    hasSeenScan: false,
    hasSeenFill: false,
    hasCompletedFirstFill: false,
    completedAt: null,
    version: ONBOARDING_VERSION,
    tipsDismissed: [],
    featuresSeen: []
};

// ============================================================================
// Check & Initialize
// ============================================================================

function isFirstRun() {
    try {
        const stored = localStorage.getItem(ONBOARDING_KEY);
        if (!stored) return true;
        
        const state = JSON.parse(stored);
        if (state.version !== ONBOARDING_VERSION) return true;
        
        return !state.completedAt;
    } catch (e) {
        return true;
    }
}

function getOnboardingState() {
    try {
        const stored = localStorage.getItem(ONBOARDING_KEY);
        if (!stored) return { ...OnboardingState };
        return { ...OnboardingState, ...JSON.parse(stored) };
    } catch (e) {
        return { ...OnboardingState };
    }
}

function saveOnboardingState(updates) {
    const current = getOnboardingState();
    const newState = { ...current, ...updates };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
    return newState;
}

function completeOnboarding() {
    saveOnboardingState({
        completedAt: Date.now(),
        hasSeenWelcome: true,
        hasSeenScan: true,
        hasSeenFill: true
    });
}

function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
}

function markFeatureSeen(featureId) {
    const state = getOnboardingState();
    if (!state.featuresSeen.includes(featureId)) {
        saveOnboardingState({
            featuresSeen: [...state.featuresSeen, featureId]
        });
    }
}

function hasSeenFeature(featureId) {
    return getOnboardingState().featuresSeen.includes(featureId);
}

// ============================================================================
// Micro-copy Library - Warm, professional, encouraging
// ============================================================================

const MICROCOPY = {
    welcome: {
        title: "Welcome to DocForge ✨",
        subtitle: "Let's show you something magical.",
        cta: "I have a document open",
        secondary: "Try our sample NDA"
    },
    scanning: {
        active: "Scanning your document...",
        found: (count) => count === 1 
            ? "Found 1 template field!" 
            : `Found ${count} template fields!`,
        none: "No template fields found",
        tip: "DocForge detects [[ ]] and {{ }} style placeholders"
    },
    fields: {
        showMe: "Show me where they are",
        skipIt: "I got it, let's go",
        remaining: (count) => count === 1 
            ? "1 field to fill" 
            : `${count} fields to fill`,
        allFilled: "All fields filled! 🎉"
    },
    fill: {
        instruction: "Fill in your details, then click Fill All",
        magic: "Type once. Fill everywhere.",
        ready: "Ready to fill",
        filling: "Filling...",
        complete: "Done! Document updated.",
        celebration: "Beautiful! Your document is ready."
    },
    errors: {
        noDocument: "Open a document to get started",
        scanFailed: "Couldn't scan this document. Try opening a different one.",
        fillFailed: (field) => `Couldn't fill "${field}" — try checking if it still exists in the document.`
    },
    empty: {
        noDocument: {
            title: "No document open",
            text: "Open a Word document to start filling templates, or try our sample NDA.",
            cta: "Open Sample NDA"
        },
        noFields: {
            title: "No template fields yet",
            text: "This document doesn't have any fields to fill. Want to see how it works?",
            cta: "Try Sample NDA",
            tip: "Tip: Add fields like {{ClientName}} or [[Date]] to your templates"
        },
        noTemplates: {
            title: "No saved templates",
            text: "Save your field values as a template to reuse them later.",
            cta: "Learn how",
            tip: "After filling fields, click 'Save as Template'"
        },
        noPresets: {
            title: "No presets yet",
            text: "Presets let you fill multiple fields at once. Create one from your current values!",
            cta: "Create preset"
        }
    },
    tips: {
        firstScan: "💡 DocForge will remember these fields for next time",
        get firstFill() {
            const mod = navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z';
            return `💡 Undo is always available (${mod}) — your document is safe`;
        },
        get keyboard() {
            const mod = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+';
            return `💡 Press ${mod}Enter to Fill All quickly`;
        },
        hover: "💡 Hover over a field to see it highlighted in your document"
    },
    success: {
        filled: (count) => count === 1 
            ? "1 field updated" 
            : `${count} fields updated`,
        saved: "Template saved!",
        exported: "Exported successfully"
    }
};

// ============================================================================
// Onboarding UI Components
// ============================================================================

/**
 * Create the onboarding overlay HTML - Magical first-run experience
 */
function createOnboardingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
        <div class="onboarding-backdrop"></div>
        <div class="onboarding-content">
            <!-- Animated background particles -->
            <div class="onboarding-particles" aria-hidden="true">
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
            </div>
            
            <!-- Step indicators -->
            <div class="step-indicators">
                <div class="step-dot active" data-step="welcome"></div>
                <div class="step-dot" data-step="scanned"></div>
                <div class="step-dot" data-step="highlighted"></div>
            </div>

            <!-- Step 1: Welcome -->
            <div class="onboarding-step active" data-step="welcome">
                <div class="onboarding-icon welcome-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <path d="M12 18v-6"/>
                        <path d="M9 15h6"/>
                    </svg>
                    <div class="icon-sparkle sparkle-1">✦</div>
                    <div class="icon-sparkle sparkle-2">✦</div>
                    <div class="icon-sparkle sparkle-3">✧</div>
                </div>
                <h2 class="onboarding-title">${MICROCOPY.welcome.title}</h2>
                <p class="onboarding-subtitle">${MICROCOPY.welcome.subtitle}</p>
                <p class="onboarding-magic-text">
                    <span class="typewriter">"Type the client name once. It fills everywhere."</span>
                </p>
                <div class="onboarding-actions">
                    <button class="btn btn-primary btn-lg btn-glow" id="onboardingOpenDoc">
                        ${MICROCOPY.welcome.cta}
                    </button>
                    <button class="btn btn-link btn-subtle" id="onboardingTrySample">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        ${MICROCOPY.welcome.secondary}
                    </button>
                </div>
            </div>

            <!-- Step 2: Document Scanned (Fields Found) -->
            <div class="onboarding-step" data-step="scanned">
                <div class="onboarding-icon success-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    <div class="success-ring"></div>
                </div>
                <h2 class="onboarding-title">
                    <span id="fieldCount" class="field-count-animated">0</span> template fields!
                </h2>
                <p class="onboarding-subtitle">I found everything you need to fill.</p>
                <div class="onboarding-actions">
                    <button class="btn btn-primary btn-lg btn-glow" id="onboardingShowFields">
                        ${MICROCOPY.fields.showMe} →
                    </button>
                    <button class="btn btn-link btn-subtle" id="onboardingSkipHighlight">
                        ${MICROCOPY.fields.skipIt}
                    </button>
                </div>
            </div>

            <!-- Step 3: Ready to Fill -->
            <div class="onboarding-step" data-step="highlighted">
                <div class="onboarding-icon ready-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <h2 class="onboarding-title">You're all set!</h2>
                <p class="onboarding-subtitle">${MICROCOPY.fill.magic}</p>
                <div class="onboarding-tip">
                    <span class="tip-icon">💡</span>
                    <span class="tip-text">Fill in your details, click <strong>Fill All</strong>, and watch the magic happen.</span>
                </div>
                <div class="onboarding-actions">
                    <button class="btn btn-primary btn-lg btn-glow btn-pulse" id="onboardingGotIt">
                        Let's go! ✨
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return overlay;
}

/**
 * Show the onboarding overlay with entrance animation
 */
function showOnboarding() {
    if (document.getElementById('onboardingOverlay')) return;
    
    const overlay = createOnboardingOverlay();
    document.body.appendChild(overlay);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
    });
    
    bindOnboardingEvents(overlay);
    saveOnboardingState({ hasSeenWelcome: true });
}

/**
 * Hide the onboarding overlay with exit animation
 */
function hideOnboarding(callback) {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    
    overlay.classList.remove('visible');
    overlay.classList.add('exiting');
    
    setTimeout(() => {
        overlay.remove();
        if (callback) callback();
    }, 400);
}

/**
 * Move to a specific onboarding step with animation
 */
function goToStep(stepName) {
    const steps = document.querySelectorAll('.onboarding-step');
    const dots = document.querySelectorAll('.step-dot');
    const currentActive = document.querySelector('.onboarding-step.active');
    
    // Exit animation on current
    if (currentActive) {
        currentActive.classList.add('exiting');
    }
    
    // Update step indicators
    dots.forEach(dot => {
        dot.classList.toggle('active', dot.dataset.step === stepName);
        dot.classList.toggle('completed', 
            getStepOrder(dot.dataset.step) < getStepOrder(stepName)
        );
    });
    
    // Enter animation on new step
    setTimeout(() => {
        steps.forEach(step => {
            const isTarget = step.dataset.step === stepName;
            step.classList.remove('active', 'exiting');
            if (isTarget) {
                step.classList.add('active', 'entering');
                setTimeout(() => step.classList.remove('entering'), 500);
            }
        });
    }, 200);
}

function getStepOrder(stepName) {
    const order = { welcome: 0, scanned: 1, highlighted: 2 };
    return order[stepName] || 0;
}

/**
 * Update the field count with animated counting
 */
function updateFieldCount(count) {
    const el = document.getElementById('fieldCount');
    if (!el) return;
    
    // Add celebration class for larger counts
    if (count >= 5) {
        el.classList.add('big-number');
    }
    
    animateNumber(el, 0, count, 600);
}

/**
 * Animate a number from start to end with easing
 */
function animateNumber(el, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Elastic ease out for playful feel
        const eased = progress === 1 
            ? 1 
            : 1 - Math.pow(2, -10 * progress) * Math.cos((progress * 10 - 0.75) * (2 * Math.PI / 3));
        
        const current = Math.round(start + (end - start) * eased);
        el.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Add a little bounce at the end
            el.classList.add('bounce');
            setTimeout(() => el.classList.remove('bounce'), 300);
        }
    }
    
    requestAnimationFrame(update);
}

// ============================================================================
// Event Binding
// ============================================================================

let onboardingCallbacks = {};

function bindOnboardingEvents(overlay) {
    // "I have a document ready"
    overlay.querySelector('#onboardingOpenDoc')?.addEventListener('click', () => {
        hideOnboarding(() => {
            if (onboardingCallbacks.onDocumentReady) {
                onboardingCallbacks.onDocumentReady();
            }
        });
    });
    
    // "Try with sample NDA"
    overlay.querySelector('#onboardingTrySample')?.addEventListener('click', () => {
        hideOnboarding(() => {
            if (onboardingCallbacks.onOpenSample) {
                onboardingCallbacks.onOpenSample();
            }
        });
    });
    
    // "Show me where they are" (highlight fields)
    overlay.querySelector('#onboardingShowFields')?.addEventListener('click', async () => {
        saveOnboardingState({ hasSeenScan: true });
        
        // Start highlight animation
        overlay.querySelector('.onboarding-step.active')?.classList.add('transitioning');
        
        if (onboardingCallbacks.onShowFields) {
            await onboardingCallbacks.onShowFields();
        }
        
        // Show final step after highlighting
        setTimeout(() => {
            goToStep('highlighted');
        }, 1500);
    });
    
    // "Skip" highlight
    overlay.querySelector('#onboardingSkipHighlight')?.addEventListener('click', () => {
        saveOnboardingState({ hasSeenScan: true });
        goToStep('highlighted');
    });
    
    // "Let's go!"
    overlay.querySelector('#onboardingGotIt')?.addEventListener('click', () => {
        completeOnboarding();
        hideOnboarding(() => {
            // Trigger confetti celebration
            showSuccessCelebration();
            if (onboardingCallbacks.onComplete) {
                onboardingCallbacks.onComplete();
            }
        });
    });
}

function setOnboardingCallbacks(callbacks) {
    onboardingCallbacks = callbacks;
}

// ============================================================================
// Empty States - Invitations, not commands
// ============================================================================

/**
 * Create an inviting empty state for no document open
 */
function createEmptyStateNoDocument(onOpenSample) {
    return createEmptyState({
        icon: 'document',
        title: MICROCOPY.empty.noDocument.title,
        text: MICROCOPY.empty.noDocument.text,
        cta: MICROCOPY.empty.noDocument.cta,
        ctaAction: onOpenSample,
        animation: 'float'
    });
}

/**
 * Create an inviting empty state for no fields found
 */
function createEmptyStateNoFields(onOpenSample) {
    return createEmptyState({
        icon: 'search',
        title: MICROCOPY.empty.noFields.title,
        text: MICROCOPY.empty.noFields.text,
        cta: MICROCOPY.empty.noFields.cta,
        ctaAction: onOpenSample,
        tip: MICROCOPY.empty.noFields.tip,
        animation: 'pulse'
    });
}

/**
 * Create an inviting empty state for no templates saved
 */
function createEmptyStateNoTemplates(onLearnHow) {
    return createEmptyState({
        icon: 'template',
        title: MICROCOPY.empty.noTemplates.title,
        text: MICROCOPY.empty.noTemplates.text,
        cta: MICROCOPY.empty.noTemplates.cta,
        ctaAction: onLearnHow,
        tip: MICROCOPY.empty.noTemplates.tip,
        animation: 'float'
    });
}

/**
 * Create an inviting empty state for no presets available
 */
function createEmptyStateNoPresets(onCreate) {
    return createEmptyState({
        icon: 'preset',
        title: MICROCOPY.empty.noPresets.title,
        text: MICROCOPY.empty.noPresets.text,
        cta: MICROCOPY.empty.noPresets.cta,
        ctaAction: onCreate,
        animation: 'bounce'
    });
}

/**
 * Generic empty state factory
 */
function createEmptyState({ icon, title, text, cta, ctaAction, tip, animation = 'float' }) {
    const container = document.createElement('div');
    container.className = `empty-state-magic empty-state-${animation}`;
    
    const iconSvg = getEmptyStateIcon(icon);
    
    container.innerHTML = `
        <div class="empty-state-icon-wrapper">
            <div class="empty-state-icon">
                ${iconSvg}
            </div>
            <div class="empty-state-decoration">
                <span class="deco deco-1">·</span>
                <span class="deco deco-2">·</span>
                <span class="deco deco-3">·</span>
            </div>
        </div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-text">${text}</p>
        ${tip ? `<p class="empty-state-tip">${tip}</p>` : ''}
        <button class="btn btn-primary btn-empty-cta" id="emptyStateCta">
            ${cta}
        </button>
    `;
    
    container.querySelector('#emptyStateCta')?.addEventListener('click', () => {
        if (ctaAction) ctaAction();
    });
    
    return container;
}

function getEmptyStateIcon(type) {
    const icons = {
        document: `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M12 18v-6" stroke-dasharray="2 2"/>
                <path d="M9 15h6" stroke-dasharray="2 2"/>
            </svg>
        `,
        search: `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <path d="M8 11h6" stroke-dasharray="2 2"/>
                <path d="M11 8v6" stroke-dasharray="2 2"/>
            </svg>
        `,
        template: `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
            </svg>
        `,
        preset: `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        `
    };
    return icons[type] || icons.document;
}

// ============================================================================
// Success Celebrations
// ============================================================================

/**
 * Show confetti celebration after first Fill All
 */
function showSuccessCelebration(message = "You're ready to go!") {
    const container = document.createElement('div');
    container.className = 'celebration-overlay';
    container.innerHTML = `
        <div class="confetti-container">
            ${generateConfetti(30)}
        </div>
        <div class="celebration-content">
            <div class="celebration-checkmark">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2 class="celebration-title">${message}</h2>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Trigger animation
    requestAnimationFrame(() => {
        container.classList.add('active');
    });
    
    // Auto-dismiss
    setTimeout(() => {
        container.classList.remove('active');
        container.classList.add('exiting');
        setTimeout(() => container.remove(), 500);
    }, 2500);
}

/**
 * Show sparkle effect on an element
 */
function showSparkle(element) {
    const rect = element.getBoundingClientRect();
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-burst';
    sparkle.style.left = `${rect.left + rect.width / 2}px`;
    sparkle.style.top = `${rect.top + rect.height / 2}px`;
    
    sparkle.innerHTML = `
        <span class="spark">✦</span>
        <span class="spark">✦</span>
        <span class="spark">✧</span>
        <span class="spark">✦</span>
        <span class="spark">✧</span>
    `;
    
    document.body.appendChild(sparkle);
    
    setTimeout(() => sparkle.remove(), 1000);
}

/**
 * Generate confetti elements
 */
function generateConfetti(count) {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const shapes = ['square', 'circle', 'triangle'];
    let html = '';
    
    for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        
        html += `<div class="confetti confetti-${shape}" style="
            left: ${left}%;
            background: ${color};
            width: ${size}px;
            height: ${size}px;
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
        "></div>`;
    }
    
    return html;
}

/**
 * Show fill completion mini-celebration
 */
function showFillComplete(count) {
    const toast = document.createElement('div');
    toast.className = 'fill-complete-toast';
    toast.innerHTML = `
        <div class="fill-complete-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        </div>
        <div class="fill-complete-text">
            <strong>${MICROCOPY.success.filled(count)}</strong>
            <span>Document updated</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Check if this is first fill
    const state = getOnboardingState();
    if (!state.hasCompletedFirstFill) {
        saveOnboardingState({ hasCompletedFirstFill: true });
        // Extra celebration for first time!
        setTimeout(() => showSuccessCelebration(MICROCOPY.fill.celebration), 500);
    }
}

// ============================================================================
// Contextual Tips
// ============================================================================

/**
 * Show a contextual tip near an element
 */
function showTip(targetElement, tipId, message) {
    const state = getOnboardingState();
    if (state.tipsDismissed.includes(tipId)) return;
    
    // Remove any existing tips
    document.querySelectorAll('.contextual-tip').forEach(t => t.remove());
    
    const tip = document.createElement('div');
    tip.className = 'contextual-tip';
    tip.dataset.tipId = tipId;
    tip.innerHTML = `
        <div class="tip-content">
            <span class="tip-icon">💡</span>
            <span class="tip-message">${message}</span>
            <button class="tip-dismiss" aria-label="Dismiss tip">×</button>
        </div>
        <div class="tip-arrow"></div>
    `;
    
    // Position near target
    const rect = targetElement.getBoundingClientRect();
    document.body.appendChild(tip);
    
    const tipRect = tip.getBoundingClientRect();
    tip.style.left = `${rect.left + rect.width / 2 - tipRect.width / 2}px`;
    tip.style.top = `${rect.bottom + 8}px`;
    
    // Dismiss handler
    tip.querySelector('.tip-dismiss').addEventListener('click', () => {
        dismissTip(tipId);
        tip.classList.add('dismissed');
        setTimeout(() => tip.remove(), 300);
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (tip.parentElement) {
            tip.classList.add('dismissed');
            setTimeout(() => tip.remove(), 300);
        }
    }, 10000);
    
    // Animate in
    requestAnimationFrame(() => {
        tip.classList.add('visible');
    });
}

function dismissTip(tipId) {
    const state = getOnboardingState();
    if (!state.tipsDismissed.includes(tipId)) {
        saveOnboardingState({
            tipsDismissed: [...state.tipsDismissed, tipId]
        });
    }
}

// ============================================================================
// Field Highlighting (Document Magic)
// ============================================================================

/**
 * Highlight all template fields in the document with cascading animation
 */
async function highlightFieldsInDocument() {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/appearance');
        await context.sync();
        
        const templateControls = contentControls.items.filter(cc => 
            cc.tag && cc.tag.startsWith('template_')
        );
        
        if (templateControls.length === 0) return;
        
        // Set appearance on all controls
        for (const cc of templateControls) {
            cc.appearance = Word.ContentControlAppearance.boundingBox;
        }
        
        // Select first field to show user where to look
        templateControls[0].select('Select');
        await context.sync();
        
        await sleep(1500);
        
        // Clear selection
        const selection = context.document.getSelection();
        selection.select('End');
        await context.sync();
    });
}

/**
 * Highlight a single field in the document
 */
async function highlightSingleField(fieldTag) {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/tag');
        await context.sync();
        
        const cc = contentControls.items.find(c => c.tag === fieldTag);
        if (cc) {
            cc.select('Select');
            await context.sync();
        }
    });
}

/**
 * Clear document selection
 */
async function clearDocumentSelection() {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.select('End');
        await context.sync();
    });
}

// ============================================================================
// Animated Fill (The Magic Moment)
// ============================================================================

/**
 * Fill all fields with cascading animation
 */
async function animatedFillAll(values, onFieldFilled) {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        contentControls.load('items/id,items/tag,items/text');
        await context.sync();
        
        const templateControls = contentControls.items.filter(cc => 
            cc.tag && cc.tag.startsWith('template_')
        );
        
        let filledCount = 0;
        
        for (const cc of templateControls) {
            const fieldId = cc.tag.replace('template_', '');
            const value = values[fieldId];
            
            if (value !== undefined && value !== null && value !== '') {
                cc.select('Select');
                await context.sync();
                
                await sleep(50);
                
                cc.insertText(String(value), Word.InsertLocation.replace);
                await context.sync();
                
                filledCount++;
                
                if (onFieldFilled) {
                    onFieldFilled(fieldId, filledCount);
                }
                
                await sleep(80);
            }
        }
        
        const selection = context.document.getSelection();
        selection.select('End');
        await context.sync();
        
        return filledCount;
    });
}

// ============================================================================
// Remaining Fields Badge
// ============================================================================

/**
 * Create or update the remaining fields badge
 */
function updateRemainingBadge(remaining) {
    let badge = document.getElementById('remainingBadge');
    
    if (remaining <= 0) {
        if (badge) {
            badge.classList.add('complete');
            setTimeout(() => badge.remove(), 500);
        }
        return;
    }
    
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'remainingBadge';
        badge.className = 'remaining-badge';
        document.querySelector('.taskpane-header')?.appendChild(badge);
    }
    
    badge.innerHTML = `
        <span class="badge-count">${remaining}</span>
        <span class="badge-text">${remaining === 1 ? 'field' : 'fields'} to fill</span>
    `;
    
    // Pulse animation on update
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    badge.classList.add('pulse');
}

// ============================================================================
// Sample NDA
// ============================================================================

const SAMPLE_NDA = {
    id: 'sample-nda',
    name: 'Sample NDA',
    description: 'A simple Non-Disclosure Agreement perfect for demos',
    fields: [
        { id: 'DisclosingPartyName', label: 'Disclosing Party', type: 'text', placeholder: 'Acme Corporation' },
        { id: 'ReceivingPartyName', label: 'Receiving Party', type: 'text', placeholder: 'Jane Smith' },
        { id: 'EffectiveDate', label: 'Effective Date', type: 'date' },
        { id: 'DisclosingPartyAddress', label: 'Disclosing Party Address', type: 'textarea' },
        { id: 'ReceivingPartyAddress', label: 'Receiving Party Address', type: 'textarea' },
        { id: 'ConfidentialityPeriod', label: 'Confidentiality Period', type: 'text', placeholder: '3 years' },
        { id: 'GoverningState', label: 'Governing State', type: 'text', placeholder: 'California' },
        { id: 'SignatureDate', label: 'Signature Date', type: 'date' }
    ],
    schema: {
        id: 'nda-template',
        name: 'Non-Disclosure Agreement',
        groups: [
            { id: 'parties', label: 'Parties', fields: ['DisclosingPartyName', 'ReceivingPartyName'] },
            { id: 'addresses', label: 'Addresses', fields: ['DisclosingPartyAddress', 'ReceivingPartyAddress'] },
            { id: 'terms', label: 'Terms', fields: ['EffectiveDate', 'ConfidentialityPeriod', 'GoverningState'] },
            { id: 'execution', label: 'Execution', fields: ['SignatureDate'] }
        ]
    }
};

function getSampleNDA() {
    return SAMPLE_NDA;
}

/**
 * Insert sample NDA content into the document
 */
async function insertSampleNDA() {
    return Word.run(async (context) => {
        const body = context.document.body;
        
        body.clear();
        await context.sync();
        
        const ndaHtml = generateSampleNDAHtml();
        body.insertHtml(ndaHtml, Word.InsertLocation.start);
        await context.sync();
        
        await addNDAContentControls(context);
    });
}

function generateSampleNDAHtml() {
    return `
        <h1 style="text-align:center;font-size:18pt;font-weight:bold;">NON-DISCLOSURE AGREEMENT</h1>
        
        <p>This Non-Disclosure Agreement (the "<b>Agreement</b>") is entered into as of 
        <span id="cc_EffectiveDate">{{EffectiveDate}}</span> (the "<b>Effective Date</b>"),</p>
        
        <p><b>BETWEEN:</b></p>
        
        <p>(1) <span id="cc_DisclosingPartyName">{{DisclosingPartyName}}</span>, 
        with offices at <span id="cc_DisclosingPartyAddress">{{DisclosingPartyAddress}}</span> 
        (the "<b>Disclosing Party</b>"); and</p>
        
        <p>(2) <span id="cc_ReceivingPartyName">{{ReceivingPartyName}}</span>, 
        with offices at <span id="cc_ReceivingPartyAddress">{{ReceivingPartyAddress}}</span> 
        (the "<b>Receiving Party</b>").</p>
        
        <p style="margin-top:20pt;"><b>RECITALS</b></p>
        
        <p>WHEREAS, the Disclosing Party possesses certain confidential and proprietary information 
        relating to its business operations, technology, and strategic plans; and</p>
        
        <p>WHEREAS, the Receiving Party desires to receive certain of this confidential information 
        for the purpose of evaluating a potential business relationship;</p>
        
        <p>NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:</p>
        
        <p style="margin-top:20pt;"><b>1. CONFIDENTIAL INFORMATION</b></p>
        
        <p>"Confidential Information" means any and all information or data disclosed by the Disclosing Party 
        to the Receiving Party, whether in writing, orally, or by inspection of tangible objects.</p>
        
        <p style="margin-top:15pt;"><b>2. OBLIGATIONS</b></p>
        
        <p>The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; 
        (b) not disclose any Confidential Information to any third party; and (c) use the Confidential 
        Information solely for the purpose of evaluating the potential business relationship.</p>
        
        <p style="margin-top:15pt;"><b>3. TERM</b></p>
        
        <p>The obligations of confidentiality shall remain in effect for a period of 
        <span id="cc_ConfidentialityPeriod">{{ConfidentialityPeriod}}</span> from the Effective Date.</p>
        
        <p style="margin-top:15pt;"><b>4. GOVERNING LAW</b></p>
        
        <p>This Agreement shall be governed by and construed in accordance with the laws of the State of 
        <span id="cc_GoverningState">{{GoverningState}}</span>.</p>
        
        <p style="margin-top:25pt;"><b>IN WITNESS WHEREOF</b>, the parties have executed this Agreement as of 
        <span id="cc_SignatureDate">{{SignatureDate}}</span>.</p>
        
        <table style="width:100%;margin-top:30pt;">
            <tr>
                <td style="width:45%;vertical-align:top;">
                    <p><b>DISCLOSING PARTY:</b></p>
                    <p style="margin-top:40pt;">_______________________________</p>
                    <p>Name: <span id="cc_DisclosingPartyName2">{{DisclosingPartyName}}</span></p>
                    <p>Title: Authorized Signatory</p>
                </td>
                <td style="width:10%;"></td>
                <td style="width:45%;vertical-align:top;">
                    <p><b>RECEIVING PARTY:</b></p>
                    <p style="margin-top:40pt;">_______________________________</p>
                    <p>Name: <span id="cc_ReceivingPartyName2">{{ReceivingPartyName}}</span></p>
                    <p>Title: Authorized Signatory</p>
                </td>
            </tr>
        </table>
    `;
}

async function addNDAContentControls(context) {
    const fieldMappings = [
        { id: 'EffectiveDate', placeholder: '{{EffectiveDate}}' },
        { id: 'DisclosingPartyName', placeholder: '{{DisclosingPartyName}}' },
        { id: 'DisclosingPartyAddress', placeholder: '{{DisclosingPartyAddress}}' },
        { id: 'ReceivingPartyName', placeholder: '{{ReceivingPartyName}}' },
        { id: 'ReceivingPartyAddress', placeholder: '{{ReceivingPartyAddress}}' },
        { id: 'ConfidentialityPeriod', placeholder: '{{ConfidentialityPeriod}}' },
        { id: 'GoverningState', placeholder: '{{GoverningState}}' },
        { id: 'SignatureDate', placeholder: '{{SignatureDate}}' }
    ];
    
    for (const field of fieldMappings) {
        const searchResults = context.document.body.search(field.placeholder, { matchCase: true });
        searchResults.load('items');
        await context.sync();
        
        for (const result of searchResults.items) {
            const cc = result.insertContentControl();
            cc.tag = `template_${field.id}`;
            cc.title = field.id.replace(/([A-Z])/g, ' $1').trim();
            cc.appearance = 'BoundingBox';
        }
        await context.sync();
    }
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Exports
// ============================================================================

const DocForgeOnboarding = {
    // State
    isFirstRun,
    getOnboardingState,
    completeOnboarding,
    resetOnboarding,
    markFeatureSeen,
    hasSeenFeature,
    
    // UI
    showOnboarding,
    hideOnboarding,
    goToStep,
    updateFieldCount,
    setOnboardingCallbacks,
    
    // Empty States
    createEmptyStateNoDocument,
    createEmptyStateNoFields,
    createEmptyStateNoTemplates,
    createEmptyStateNoPresets,
    
    // Celebrations
    showSuccessCelebration,
    showSparkle,
    showFillComplete,
    
    // Tips
    showTip,
    dismissTip,
    TIPS: MICROCOPY.tips,
    
    // Document Magic
    highlightFieldsInDocument,
    highlightSingleField,
    clearDocumentSelection,
    animatedFillAll,
    
    // Badge
    updateRemainingBadge,
    
    // Sample NDA
    getSampleNDA,
    insertSampleNDA,
    
    // Micro-copy
    MICROCOPY
};

// ES modules

// Global
if (typeof window !== 'undefined') {
    window.DocForgeOnboarding = DocForgeOnboarding;
}
