/**
 * DocForge Shared Utilities
 * 
 * Common utilities shared across features.
 */

// Export HighlightCoordinator
export { default as HighlightCoordinator } from './highlight-coordinator.js';

// Re-export for convenience
import HighlightCoordinator from './highlight-coordinator.js';

export default {
    HighlightCoordinator
};

// Browser global
if (typeof window !== 'undefined') {
    window.DocForgeShared = {
        HighlightCoordinator
    };
}
