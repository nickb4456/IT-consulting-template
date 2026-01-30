/**
 * Error Handling Utilities
 * 
 * Human-friendly error messages with recovery hints.
 * Bad: "Failed to load template"
 * Good: "Couldn't load that template — try refreshing the panel"
 */

// Error context types for targeted messaging
export const ErrorContext = {
    TEMPLATE_IMPORT: 'template_import',
    TEMPLATE_SAVE: 'template_save',
    FIELD_INSERT: 'field_insert',
    DOCUMENT_SCAN: 'document_scan',
    CLAUSE_SAVE: 'clause_save',
    CLAUSE_INSERT: 'clause_insert',
    CLAUSE_DELETE: 'clause_delete',
    VERSION_LOAD: 'version_load',
    VERSION_SAVE: 'version_save',
    VERSION_RESTORE: 'version_restore',
    VERSION_COMPARE: 'version_compare',
    PARTY_STANDARDIZE: 'party_standardize',
    PARTY_ADD: 'party_add',
    HIGHLIGHT: 'highlight',
    NAVIGATION: 'navigation',
    STORAGE_READ: 'storage_read',
    STORAGE_WRITE: 'storage_write',
    NETWORK: 'network',
    SYNC: 'sync',
    PREFLIGHT: 'preflight',
    NUMBERING: 'numbering',
    SETTINGS: 'settings',
    KEYBOARD_SHORTCUTS: 'keyboard_shortcuts',
    GENERIC: 'generic'
};

// Human-friendly messages by context
const friendlyMessages = {
    [ErrorContext.TEMPLATE_IMPORT]: {
        message: "Couldn't load that template",
        hint: "Make sure the file is a valid JSON template and try again"
    },
    [ErrorContext.TEMPLATE_SAVE]: {
        message: "Couldn't save your template",
        hint: "Try saving again, or export it as a backup"
    },
    [ErrorContext.FIELD_INSERT]: {
        message: "Couldn't insert that field",
        hint: "Click where you want it in the document and try again"
    },
    [ErrorContext.DOCUMENT_SCAN]: {
        message: "Couldn't scan the document",
        hint: "Try refreshing the panel or reopening the document"
    },
    [ErrorContext.CLAUSE_SAVE]: {
        message: "Couldn't save your clause",
        hint: "Check your connection and try again"
    },
    [ErrorContext.CLAUSE_INSERT]: {
        message: "Couldn't insert that clause",
        hint: "Make sure your cursor is in the document and try again"
    },
    [ErrorContext.CLAUSE_DELETE]: {
        message: "Couldn't delete that clause",
        hint: "Refresh the panel and try again"
    },
    [ErrorContext.VERSION_LOAD]: {
        message: "Couldn't load version history",
        hint: "Your versions are still safe — try refreshing the panel"
    },
    [ErrorContext.VERSION_SAVE]: {
        message: "Couldn't save this version",
        hint: "Your document is still safe — try saving again"
    },
    [ErrorContext.VERSION_RESTORE]: {
        message: "Couldn't restore that version",
        hint: "The version is still available — try again or pick a different one"
    },
    [ErrorContext.VERSION_COMPARE]: {
        message: "Couldn't compare these versions",
        hint: "Try selecting different versions to compare"
    },
    [ErrorContext.PARTY_STANDARDIZE]: {
        message: "Couldn't standardize party references",
        hint: "Some references may have changed — rescan to see current status"
    },
    [ErrorContext.PARTY_ADD]: {
        message: "Couldn't add that party",
        hint: "Check for typos and try again"
    },
    [ErrorContext.HIGHLIGHT]: {
        message: "Couldn't highlight items",
        hint: "Try clearing highlights first, then highlight again"
    },
    [ErrorContext.NAVIGATION]: {
        message: "Couldn't jump to that location",
        hint: "The content may have moved — try scanning again"
    },
    [ErrorContext.STORAGE_READ]: {
        message: "Couldn't load your saved data",
        hint: "Your data should still be there — try refreshing"
    },
    [ErrorContext.STORAGE_WRITE]: {
        message: "Couldn't save your changes",
        hint: "Try again in a moment"
    },
    [ErrorContext.NETWORK]: {
        message: "Connection issue",
        hint: "Check your internet and try again"
    },
    [ErrorContext.SYNC]: {
        message: "Couldn't sync your data",
        hint: "Changes are saved locally — sync will retry automatically"
    },
    [ErrorContext.PREFLIGHT]: {
        message: "Couldn't run the check",
        hint: "Try running it again, or check a smaller section"
    },
    [ErrorContext.NUMBERING]: {
        message: "Couldn't update numbering",
        hint: "Undo and try again, or reset the numbering style"
    },
    [ErrorContext.SETTINGS]: {
        message: "Couldn't save your preferences",
        hint: "Try again — your settings will use defaults until saved"
    },
    [ErrorContext.KEYBOARD_SHORTCUTS]: {
        message: "Couldn't update shortcuts",
        hint: "Try refreshing and setting them again"
    },
    [ErrorContext.GENERIC]: {
        message: "Something went wrong",
        hint: "Try again, or refresh the panel if it persists"
    }
};

// Common error patterns and their friendly translations
const errorPatterns = [
    { pattern: /network|fetch|xhr|request failed/i, context: ErrorContext.NETWORK },
    { pattern: /quota|storage.*full|exceeded/i, message: "Storage is full", hint: "Try deleting some old items to free up space" },
    { pattern: /permission|access denied|unauthorized/i, message: "You don't have permission for that", hint: "Check with your admin if you need access" },
    { pattern: /timeout|timed out/i, message: "That's taking too long", hint: "Try again with a smaller selection or check your connection" },
    { pattern: /invalid|malformed|corrupt/i, message: "That data doesn't look right", hint: "The file may be damaged — try a different one" },
    { pattern: /not found|404|missing/i, message: "Couldn't find that", hint: "It may have been moved or deleted" },
    { pattern: /offline|no connection/i, message: "You're offline", hint: "Connect to the internet and try again" },
    { pattern: /busy|locked|in use/i, message: "That's currently in use", hint: "Wait a moment and try again" }
];

/**
 * Get a human-friendly error message with recovery hint
 * 
 * @param {Error|string} error - The error object or message
 * @param {string} context - Context from ErrorContext enum
 * @returns {{ message: string, hint: string, technical?: string }}
 */
export function getUserFriendlyMessage(error, context = ErrorContext.GENERIC) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for specific error patterns first
    for (const { pattern, context: patternContext, message, hint } of errorPatterns) {
        if (pattern.test(errorMessage)) {
            if (message && hint) {
                return { message, hint, technical: errorMessage };
            }
            if (patternContext && friendlyMessages[patternContext]) {
                return { 
                    ...friendlyMessages[patternContext], 
                    technical: errorMessage 
                };
            }
        }
    }
    
    // Fall back to context-based message
    const contextMessage = friendlyMessages[context] || friendlyMessages[ErrorContext.GENERIC];
    
    return {
        ...contextMessage,
        technical: errorMessage
    };
}

/**
 * Format error for display (message with hint)
 * 
 * @param {Error|string} error - The error
 * @param {string} context - Context from ErrorContext enum
 * @returns {string} - Formatted message like "Couldn't save — try again"
 */
export function formatError(error, context = ErrorContext.GENERIC) {
    const { message, hint } = getUserFriendlyMessage(error, context);
    return `${message} — ${hint.toLowerCase().replace(/\.$/, '')}`;
}

/**
 * Format error for toast/notification (shorter)
 * 
 * @param {Error|string} error - The error  
 * @param {string} context - Context from ErrorContext enum
 * @returns {string} - Just the friendly message
 */
export function formatErrorShort(error, context = ErrorContext.GENERIC) {
    const { message } = getUserFriendlyMessage(error, context);
    return message;
}

/**
 * Log error with context (for debugging)
 * Ensures no error goes silently unhandled
 * 
 * @param {Error|string} error - The error
 * @param {string} context - What was happening
 * @param {object} extra - Additional debug info
 */
export function logError(error, context = 'unknown', extra = {}) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${timestamp}] Error in ${context}:`, errorMessage, { stack, ...extra });
    
    // Could add telemetry here in the future
    return { timestamp, context, message: errorMessage, stack, ...extra };
}

/**
 * Wrap an async function with error handling
 * Ensures errors are logged and user gets feedback
 * 
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Error context
 * @param {Function} onError - Callback when error occurs (receives friendly error)
 * @returns {Function} - Wrapped function
 */
export function withErrorHandling(fn, context, onError) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            logError(error, context);
            const friendly = getUserFriendlyMessage(error, context);
            if (onError) {
                onError(friendly);
            }
            throw error; // Re-throw so caller can handle if needed
        }
    };
}

/**
 * Create a safe version of a function that won't throw
 * Returns null on error instead
 * 
 * @param {Function} fn - Function to wrap
 * @param {string} context - Error context for logging
 * @returns {Function} - Safe function that returns null on error
 */
export function safeCall(fn, context = 'unknown') {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            logError(error, context);
            return null;
        }
    };
}

export default {
    ErrorContext,
    getUserFriendlyMessage,
    formatError,
    formatErrorShort,
    logError,
    withErrorHandling,
    safeCall
};
