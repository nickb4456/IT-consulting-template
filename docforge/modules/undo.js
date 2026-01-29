/**
 * DocForge - Undo System v1.0
 * 
 * Document state snapshots before destructive operations.
 * Simple but functional - gives users the safety net they need.
 * 
 * "Without undo, we're asking users to gamble every time they click a button.
 *  Lawyers don't gamble. They bill by the hour for certainty." - SJ
 */

// Ensure DocForge namespace exists
window.DocForge = window.DocForge || {};

// ============================================================================
// UNDO STACK
// ============================================================================

/**
 * Represents a document state snapshot
 */
class Snapshot {
    constructor(data) {
        this.id = data.id || `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.timestamp = data.timestamp || Date.now();
        this.description = data.description || 'Unknown operation';
        this.operationType = data.operationType || 'unknown';
        this.content = data.content || null;      // OOXML or text content
        this.contentType = data.contentType || 'ooxml';
        this.metadata = data.metadata || {};
        this.restored = false;
    }
    
    /**
     * Get human-readable age
     */
    getAge() {
        const seconds = Math.floor((Date.now() - this.timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return new Date(this.timestamp).toLocaleDateString();
    }
    
    /**
     * Get size in KB
     */
    getSizeKB() {
        if (!this.content) return 0;
        return Math.round(this.content.length / 1024);
    }
}

/**
 * Undo Manager - maintains snapshot stack and handles restore
 */
class UndoManager {
    constructor(options = {}) {
        this.maxSnapshots = options.maxSnapshots || 20;      // Max history depth
        this.maxSizeMB = options.maxSizeMB || 50;            // Max total size
        this.autoCapture = options.autoCapture !== false;    // Auto-capture on mutations
        
        this.stack = [];                    // Snapshot stack (newest last)
        this.redoStack = [];                // Redo stack
        this.totalSize = 0;                 // Estimated total size in bytes
        this.isCapturing = false;           // Prevent recursion
        this.isRestoring = false;           // Track restore in progress
        
        // Hook into DocumentModel events if available
        if (window.DocForge?.DocumentModel?.model) {
            window.DocForge.DocumentModel.model.on('beforeMutation', (data) => {
                if (this.autoCapture && !this.isCapturing && !this.isRestoring) {
                    // Note: actual capture needs Word.run context, so this is just a flag
                    console.log('[Undo] Mutation starting:', data.description);
                }
            });
        }
    }
    
    // ========================================================================
    // CAPTURE
    // ========================================================================
    
    /**
     * Capture document state before an operation
     * Call this BEFORE making destructive changes
     * 
     * @param {Word.RequestContext} context - Word.run context
     * @param {string} description - Human-readable description
     * @param {string} operationType - Type of operation (numbering, toc, template, xref)
     * @returns {Promise<Snapshot>}
     */
    async capture(context, description, operationType = 'unknown') {
        if (this.isCapturing || this.isRestoring) {
            console.warn('[Undo] Skipping capture - already in progress');
            return null;
        }
        
        this.isCapturing = true;
        const startTime = Date.now();
        
        try {
            console.log(`[Undo] Capturing state: ${description}`);
            
            // Get document content as OOXML
            const body = context.document.body;
            const ooxml = body.getOoxml();
            
            await context.sync();
            
            // Create snapshot
            const snapshot = new Snapshot({
                description,
                operationType,
                content: ooxml.value,
                contentType: 'ooxml',
                metadata: {
                    captureTime: Date.now() - startTime,
                    paragraphCount: context.document.body.paragraphs?.items?.length || 0
                }
            });
            
            // Add to stack
            this._pushSnapshot(snapshot);
            
            // Clear redo stack on new action
            this.redoStack = [];
            
            console.log(`[Undo] Captured in ${snapshot.metadata.captureTime}ms (${snapshot.getSizeKB()}KB)`);
            
            return snapshot;
            
        } catch (error) {
            console.error('[Undo] Capture failed:', error);
            return null;
        } finally {
            this.isCapturing = false;
        }
    }
    
    /**
     * Quick capture for smaller operations (text only, faster)
     * Use for operations that only modify text, not formatting
     */
    async captureTextOnly(context, description, operationType = 'unknown') {
        if (this.isCapturing || this.isRestoring) {
            return null;
        }
        
        this.isCapturing = true;
        
        try {
            const body = context.document.body;
            body.load('text');
            await context.sync();
            
            const snapshot = new Snapshot({
                description,
                operationType,
                content: body.text,
                contentType: 'text',
                metadata: {
                    textOnly: true
                }
            });
            
            this._pushSnapshot(snapshot);
            this.redoStack = [];
            
            return snapshot;
            
        } catch (error) {
            console.error('[Undo] Text capture failed:', error);
            return null;
        } finally {
            this.isCapturing = false;
        }
    }
    
    /**
     * Push snapshot to stack with size management
     */
    _pushSnapshot(snapshot) {
        // Add to stack
        this.stack.push(snapshot);
        this.totalSize += snapshot.content?.length || 0;
        
        // Enforce max count
        while (this.stack.length > this.maxSnapshots) {
            const removed = this.stack.shift();
            this.totalSize -= removed.content?.length || 0;
            console.log(`[Undo] Removed old snapshot: ${removed.description}`);
        }
        
        // Enforce max size
        const maxBytes = this.maxSizeMB * 1024 * 1024;
        while (this.totalSize > maxBytes && this.stack.length > 1) {
            const removed = this.stack.shift();
            this.totalSize -= removed.content?.length || 0;
            console.log(`[Undo] Removed snapshot for size: ${removed.description}`);
        }
    }
    
    // ========================================================================
    // RESTORE (UNDO)
    // ========================================================================
    
    /**
     * Undo - restore the most recent snapshot
     * 
     * @param {Word.RequestContext} context - Word.run context
     * @returns {Promise<Object>} - Result with success flag and message
     */
    async undo(context) {
        if (this.stack.length === 0) {
            return {
                success: false,
                message: 'Nothing to undo'
            };
        }
        
        if (this.isRestoring) {
            return {
                success: false,
                message: 'Restore already in progress'
            };
        }
        
        this.isRestoring = true;
        
        try {
            // Get the snapshot to restore
            const snapshot = this.stack.pop();
            this.totalSize -= snapshot.content?.length || 0;
            
            console.log(`[Undo] Restoring: ${snapshot.description}`);
            
            // Capture current state for redo AND as safety net
            const body = context.document.body;
            const safetyOoxml = body.getOoxml();
            await context.sync();
            
            const redoSnapshot = new Snapshot({
                description: `Redo: ${snapshot.description}`,
                operationType: snapshot.operationType,
                content: safetyOoxml.value,
                contentType: 'ooxml'
            });
            this.redoStack.push(redoSnapshot);
            
            // Restore the snapshot with safety net
            if (snapshot.contentType === 'ooxml') {
                // Clear and insert OOXML with rollback protection
                body.clear();
                await context.sync();
                
                try {
                    body.insertOoxml(snapshot.content, Word.InsertLocation.start);
                    await context.sync();
                } catch (insertError) {
                    // CRITICAL: Insert failed after clear - restore from safety net
                    console.error('[Undo] Insert failed, restoring from safety net:', insertError);
                    body.insertOoxml(safetyOoxml.value, Word.InsertLocation.start);
                    await context.sync();
                    
                    // Put snapshot back on stack (undo failed, should remain available)
                    this.stack.push(snapshot);
                    this.totalSize += snapshot.content?.length || 0;
                    
                    // Remove the redo snapshot we just added
                    this.redoStack.pop();
                    
                    return {
                        success: false,
                        message: `Undo failed: ${insertError.message}. Document restored.`
                    };
                }
            } else {
                // Text-only restore (limited - loses formatting)
                body.clear();
                await context.sync();
                
                try {
                    body.insertText(snapshot.content, Word.InsertLocation.start);
                    await context.sync();
                } catch (insertError) {
                    // Restore from safety net
                    console.error('[Undo] Text insert failed, restoring:', insertError);
                    body.insertOoxml(safetyOoxml.value, Word.InsertLocation.start);
                    await context.sync();
                    
                    this.stack.push(snapshot);
                    this.totalSize += snapshot.content?.length || 0;
                    this.redoStack.pop();
                    
                    return {
                        success: false,
                        message: `Undo failed: ${insertError.message}. Document restored.`
                    };
                }
            }
            
            snapshot.restored = true;
            
            // Invalidate document model
            if (window.DocForge?.DocumentModel?.invalidateModel) {
                window.DocForge.DocumentModel.invalidateModel();
            }
            
            return {
                success: true,
                message: `Undone: ${snapshot.description}`,
                snapshot
            };
            
        } catch (error) {
            console.error('[Undo] Restore failed:', error);
            return {
                success: false,
                message: `Undo failed: ${error.message}`
            };
        } finally {
            this.isRestoring = false;
        }
    }
    
    /**
     * Redo - restore a previously undone state
     */
    async redo(context) {
        if (this.redoStack.length === 0) {
            return {
                success: false,
                message: 'Nothing to redo'
            };
        }
        
        if (this.isRestoring) {
            return {
                success: false,
                message: 'Restore already in progress'
            };
        }
        
        this.isRestoring = true;
        
        try {
            const snapshot = this.redoStack.pop();
            
            console.log(`[Undo] Redoing: ${snapshot.description}`);
            
            // Capture current for undo
            const body = context.document.body;
            const currentOoxml = body.getOoxml();
            await context.sync();
            
            const undoSnapshot = new Snapshot({
                description: snapshot.description.replace('Redo: ', ''),
                operationType: snapshot.operationType,
                content: currentOoxml.value,
                contentType: 'ooxml'
            });
            this.stack.push(undoSnapshot);
            this.totalSize += undoSnapshot.content?.length || 0;
            
            // Restore
            body.clear();
            body.insertOoxml(snapshot.content, Word.InsertLocation.start);
            await context.sync();
            
            // Invalidate document model
            if (window.DocForge?.DocumentModel?.invalidateModel) {
                window.DocForge.DocumentModel.invalidateModel();
            }
            
            return {
                success: true,
                message: `Redone: ${snapshot.description}`,
                snapshot
            };
            
        } catch (error) {
            console.error('[Undo] Redo failed:', error);
            return {
                success: false,
                message: `Redo failed: ${error.message}`
            };
        } finally {
            this.isRestoring = false;
        }
    }
    
    // ========================================================================
    // QUERIES
    // ========================================================================
    
    /**
     * Check if undo is available
     */
    canUndo() {
        return this.stack.length > 0 && !this.isRestoring;
    }
    
    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0 && !this.isRestoring;
    }
    
    /**
     * Get the most recent snapshot (without removing it)
     */
    peek() {
        return this.stack[this.stack.length - 1] || null;
    }
    
    /**
     * Get undo history
     */
    getHistory() {
        return this.stack.map(s => ({
            id: s.id,
            description: s.description,
            operationType: s.operationType,
            timestamp: s.timestamp,
            age: s.getAge(),
            sizeKB: s.getSizeKB()
        })).reverse(); // Newest first
    }
    
    /**
     * Get stats about undo system
     */
    getStats() {
        return {
            undoCount: this.stack.length,
            redoCount: this.redoStack.length,
            totalSizeKB: Math.round(this.totalSize / 1024),
            maxSnapshots: this.maxSnapshots,
            maxSizeMB: this.maxSizeMB,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
    
    /**
     * Clear all history
     */
    clear() {
        this.stack = [];
        this.redoStack = [];
        this.totalSize = 0;
        console.log('[Undo] History cleared');
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const undoManager = new UndoManager();

// ============================================================================
// KEYBOARD SHORTCUT HANDLER
// ============================================================================

/**
 * Setup Ctrl+Z and Ctrl+Y keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+Z = Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            if (undoManager.canUndo()) {
                e.preventDefault();
                try {
                    await Word.run(async (context) => {
                        const result = await undoManager.undo(context);
                        if (window.DocForge?.Utils?.showStatus) {
                            window.DocForge.Utils.showStatus(
                                result.success ? 'success' : 'warning',
                                result.message
                            );
                        }
                    });
                } catch (error) {
                    console.error('[Undo] Keyboard undo failed:', error);
                }
            }
        }
        
        // Ctrl+Y or Ctrl+Shift+Z = Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            if (undoManager.canRedo()) {
                e.preventDefault();
                try {
                    await Word.run(async (context) => {
                        const result = await undoManager.redo(context);
                        if (window.DocForge?.Utils?.showStatus) {
                            window.DocForge.Utils.showStatus(
                                result.success ? 'success' : 'warning',
                                result.message
                            );
                        }
                    });
                } catch (error) {
                    console.error('[Undo] Keyboard redo failed:', error);
                }
            }
        }
    });
    
    console.log('[Undo] Keyboard shortcuts registered (Ctrl+Z, Ctrl+Y)');
}

// Setup shortcuts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
} else {
    setupKeyboardShortcuts();
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * Wrap an async operation with automatic undo capture
 * Use this for any operation that modifies the document
 * 
 * @example
 * await DocForge.Undo.withUndo(context, 'Fix all numbering', 'numbering', async () => {
 *     // ... your mutation code ...
 * });
 */
async function withUndo(context, description, operationType, operation) {
    // Capture state before operation
    const snapshot = await undoManager.capture(context, description, operationType);
    
    try {
        // Run the operation
        const result = await operation();
        return result;
    } catch (error) {
        // If operation failed, we might want to auto-restore
        // For now, just log and re-throw
        console.error(`[Undo] Operation "${description}" failed:`, error);
        throw error;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.DocForge.Undo = {
    // Classes
    Snapshot,
    UndoManager,
    
    // Singleton
    manager: undoManager,
    
    // Direct methods
    capture: (context, description, operationType) => undoManager.capture(context, description, operationType),
    captureTextOnly: (context, description, operationType) => undoManager.captureTextOnly(context, description, operationType),
    undo: (context) => undoManager.undo(context),
    redo: (context) => undoManager.redo(context),
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    getHistory: () => undoManager.getHistory(),
    getStats: () => undoManager.getStats(),
    clear: () => undoManager.clear(),
    
    // Wrapper
    withUndo,
    
    // Keyboard shortcuts
    setupKeyboardShortcuts
};

// Module export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Snapshot,
        UndoManager,
        undoManager,
        withUndo,
        setupKeyboardShortcuts
    };
}
