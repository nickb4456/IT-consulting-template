/**
 * DocForge - Shared Utilities
 */

// Status notification helper
function showStatus(type, message, duration = 4000) {
    const status = document.getElementById('status');
    if (!status) return;
    
    status.className = `status ${type}`;
    status.textContent = message;
    status.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            status.className = 'status';
            status.style.display = 'none';
        }, duration);
    }
}

// Loading state helper
function setLoading(isLoading, buttonId = null) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
    
    if (buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = isLoading;
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.textContent = 'Working...';
            } else if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }
}

// Debounce helper for search/input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Safe Word.run wrapper with error handling
async function safeWordRun(callback, errorMessage = 'Operation failed') {
    try {
        await Word.run(callback);
        return { success: true };
    } catch (error) {
        console.error(errorMessage, error);
        showStatus('error', `${errorMessage}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Format numbers for display
function formatNumber(num) {
    if (typeof num === 'number') {
        return num.toLocaleString();
    }
    return num;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Truncate text with ellipsis
function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Deep clone object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Generate unique ID
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Local storage helpers with error handling
const storage = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.warn('Storage get error:', e);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Storage set error:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Create HTML element helper
function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    
    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.text) el.textContent = options.text;
    if (options.html) el.innerHTML = options.html;
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }
    if (options.styles) {
        Object.assign(el.style, options.styles);
    }
    if (options.onClick) el.addEventListener('click', options.onClick);
    
    return el;
}

// Render a list of items
function renderList(container, items, renderItem) {
    const containerEl = typeof container === 'string' ? 
        document.getElementById(container) : container;
    
    if (!containerEl) return;
    
    containerEl.innerHTML = '';
    
    items.forEach((item, index) => {
        const el = renderItem(item, index);
        if (el) containerEl.appendChild(el);
    });
}

// Animation helpers
function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;
        element.style.opacity = Math.min(progress, 1);
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}

function fadeOut(element, duration = 300) {
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;
        element.style.opacity = Math.max(1 - progress, 0);
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }
    requestAnimationFrame(animate);
}

// Confirmation dialog
function confirm(message) {
    return new Promise((resolve) => {
        // Could implement custom modal, using native for now
        resolve(window.confirm(message));
    });
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showStatus('success', 'Copied to clipboard');
        return true;
    } catch (e) {
        showStatus('error', 'Failed to copy');
        return false;
    }
}

// Export
window.DocForge = window.DocForge || {};
window.DocForge.Utils = {
    showStatus,
    setLoading,
    debounce,
    safeWordRun,
    formatNumber,
    escapeHtml,
    truncate,
    deepClone,
    generateId,
    storage,
    createElement,
    renderList,
    fadeIn,
    fadeOut,
    confirm,
    copyToClipboard
};
