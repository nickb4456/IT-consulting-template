/**
 * DraftBridge Shared Utilities
 * 
 * Common utility functions used across all modules.
 * 
 * @version 1.0.0
 */

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate a short ID
 * @param {number} length - ID length
 * @returns {string} Short ID
 */
function generateShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================================================
// Date Formatting
// ============================================================================

const DATE_FORMATS = {
    'MMMM D, YYYY': { month: 'long', day: 'numeric', year: 'numeric' },
    'MMM D, YYYY': { month: 'short', day: 'numeric', year: 'numeric' },
    'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
    'D MMMM YYYY': { day: 'numeric', month: 'long', year: 'numeric' },
    'YYYY-MM-DD': 'iso'
};

/**
 * Format a date
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format key
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'MMMM D, YYYY') {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const formatOptions = DATE_FORMATS[format];
    
    if (formatOptions === 'iso') {
        return d.toISOString().split('T')[0];
    }
    
    if (formatOptions) {
        return d.toLocaleDateString('en-US', formatOptions);
    }
    
    return d.toLocaleDateString();
}

/**
 * Get relative time string
 * @param {Date|string|number} date - Date
 * @returns {string} Relative time
 */
function relativeTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now - d;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return formatDate(d, 'MMM D, YYYY');
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number as currency
 * @param {number} value - Number to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(value);
}

/**
 * Convert number to words
 * @param {number} num - Number to convert
 * @returns {string} Number in words
 */
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    function convertHundreds(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            str += teens[n - 10] + ' ';
            return str.trim();
        }
        if (n > 0) {
            str += ones[n] + ' ';
        }
        return str.trim();
    }

    const trillion = Math.floor(num / 1000000000000);
    const billion = Math.floor((num % 1000000000000) / 1000000000);
    const million = Math.floor((num % 1000000000) / 1000000);
    const thousand = Math.floor((num % 1000000) / 1000);
    const remainder = Math.floor(num % 1000);

    let result = '';
    if (trillion) result += convertHundreds(trillion) + ' Trillion ';
    if (billion) result += convertHundreds(billion) + ' Billion ';
    if (million) result += convertHundreds(million) + ' Million ';
    if (thousand) result += convertHundreds(thousand) + ' Thousand ';
    if (remainder) result += convertHundreds(remainder);

    return result.trim();
}

/**
 * Convert number to Roman numerals
 * @param {number} num - Number to convert
 * @returns {string} Roman numeral
 */
function toRoman(num) {
    const lookup = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let result = '';
    for (const [letter, value] of lookup) {
        while (num >= value) {
            result += letter;
            num -= value;
        }
    }
    return result;
}

/**
 * Convert number to letter (1=A, 2=B, ..., 27=AA)
 * @param {number} num - Number to convert
 * @returns {string} Letter
 */
function toAlpha(num) {
    let result = '';
    while (num > 0) {
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - 1) / 26);
    }
    return result;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert camelCase or snake_case to Title Case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
function toTitleCase(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\s+/, '')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Escape for CSV
 * @param {*} value - Value to escape
 * @returns {string} CSV-safe string
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '""');
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Get nested value from object by path
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-notation path
 * @param {*} defaultValue - Default if not found
 * @returns {*} Found value or default
 */
function getNestedValue(obj, path, defaultValue = undefined) {
    if (!obj || !path) return defaultValue;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === undefined || current === null) return defaultValue;
        current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
}

/**
 * Set nested value in object by path
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
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

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Create element from HTML string
 * @param {string} html - HTML string
 * @returns {Element} Created element
 */
function createElementFromHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Toast type (success/error/warning/info)
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect if running on Mac
 * @returns {boolean} True if Mac
 */
function isMac() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
           navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Detect if running on Windows
 * @returns {boolean} True if Windows
 */
function isWindows() {
    return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
}

/**
 * Get the primary modifier key for the platform
 * Returns ⌘ on Mac, Ctrl on Windows
 * @param {boolean} asSymbol - Return symbol (⌘/Ctrl) vs word
 * @returns {string} Modifier key
 */
function getPrimaryModifier(asSymbol = true) {
    return isMac() ? (asSymbol ? '⌘' : 'Cmd') : 'Ctrl';
}

/**
 * Get the alt/option key for the platform
 * @param {boolean} asSymbol - Return symbol (⌥/Alt)
 * @returns {string} Alt key
 */
function getAltKey(asSymbol = true) {
    return isMac() ? (asSymbol ? '⌥' : 'Option') : 'Alt';
}

/**
 * Format a keyboard shortcut for the current platform
 * @param {Object} options - {ctrl, alt, shift, key}
 * @returns {string} Formatted shortcut
 */
function formatPlatformShortcut({ ctrl = false, alt = false, shift = false, key = '' }) {
    const parts = [];
    const mac = isMac();
    
    if (ctrl) parts.push(mac ? '⌘' : 'Ctrl');
    if (alt) parts.push(mac ? '⌥' : 'Alt');
    if (shift) parts.push(mac ? '⇧' : 'Shift');
    
    if (key) {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
    }
    
    return parts.join(mac ? '' : '+');
}

/**
 * Get platform-specific undo hint
 * @returns {string} Undo shortcut hint
 */
function getUndoHint() {
    return isMac() ? '⌘Z' : 'Ctrl+Z';
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Valid
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate date
 * @param {string} dateStr - Date string
 * @returns {boolean} Valid
 */
function isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// ============================================================================
// Exports
// ============================================================================

const DraftBridgeUtils = {
    // IDs
    generateUUID,
    generateShortId,
    
    // Dates
    formatDate,
    relativeTime,
    DATE_FORMATS,
    
    // Numbers
    formatCurrency,
    numberToWords,
    toRoman,
    toAlpha,
    
    // Strings
    toTitleCase,
    truncate,
    escapeHtml,
    escapeCSV,
    
    // Objects
    deepClone,
    getNestedValue,
    setNestedValue,
    isEmpty,
    
    // Async
    sleep,
    debounce,
    throttle,
    
    // DOM
    createElementFromHtml,
    showToast,
    
    // Platform
    isMac,
    isWindows,
    getPrimaryModifier,
    getAltKey,
    formatPlatformShortcut,
    getUndoHint,
    
    // Validation
    isValidEmail,
    isValidDate
};

// ES modules
    generateUUID,
    generateShortId,
    formatDate,
    relativeTime,
    formatCurrency,
    numberToWords,
    toRoman,
    toAlpha,
    toTitleCase,
    truncate,
    escapeHtml,
    deepClone,
    getNestedValue,
    setNestedValue,
    isEmpty,
    sleep,
    debounce,
    throttle,
    showToast,
    isValidEmail,
    isValidDate,
    isMac,
    isWindows,
    getPrimaryModifier,
    getAltKey,
    formatPlatformShortcut,
    getUndoHint
};

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraftBridgeUtils;
}

// Global
if (typeof window !== 'undefined') {
    window.DraftBridgeUtils = DraftBridgeUtils;
}
