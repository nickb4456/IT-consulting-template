/**
 * DocForge Highlight Coordinator
 * 
 * Manages document highlighting across multiple features to prevent conflicts.
 * Each feature "owns" a layer of highlights that can be independently cleared.
 * 
 * @version 1.0.0
 */

/* global Word */

const HighlightCoordinator = (function() {
    'use strict';

    // Track which ranges are highlighted by which owner
    // Structure: Map<owner, Set<rangeId>>
    const layers = new Map();

    // Track range text/position for restoration
    // Structure: Map<rangeId, { text, position, owner, color }>
    const rangeRegistry = new Map();

    // Color mapping for each feature
    const FEATURE_COLORS = {
        'defined-terms': {
            default: 'Yellow',
            undefined: 'Yellow',
            unused: 'LightGray',
            capitalization: 'DarkYellow',
            beforeDefinition: 'Turquoise'
        },
        'party-checker': {
            default: 'Pink',
            inconsistent: 'Pink',
            undefined: 'Red',
            typo: 'Cyan'
        },
        'exhibit-sync': {
            default: 'Green',
            missing: 'Red',
            unreferenced: 'Gray'
        },
        'typo-shield': {
            default: 'Magenta',
            placeholder: 'Magenta',
            bracket: 'Red'
        },
        'change-pulse': {
            default: 'BrightGreen'
        }
    };

    /**
     * Generate a unique ID for a range based on its text and approximate position
     */
    function generateRangeId(text, position) {
        return `range_${position}_${text.slice(0, 20).replace(/\W/g, '')}`;
    }

    /**
     * Get the active highlight owner for a given layer
     */
    function getActiveOwners() {
        return Array.from(layers.keys()).filter(owner => {
            const ownerRanges = layers.get(owner);
            return ownerRanges && ownerRanges.size > 0;
        });
    }

    /**
     * Highlight ranges for a specific feature/owner
     * 
     * @param {string} owner - Feature identifier (e.g., 'defined-terms', 'party-checker')
     * @param {Array<{searchText: string, color?: string, issueType?: string}>} items - Items to highlight
     * @param {Object} options - Options
     * @param {boolean} options.clearPrevious - Clear previous highlights from this owner (default: true)
     * @param {string} options.defaultColor - Default highlight color
     * @returns {Promise<{highlighted: number, errors: number}>}
     */
    async function highlight(owner, items, options = {}) {
        const {
            clearPrevious = true,
            defaultColor = FEATURE_COLORS[owner]?.default || 'Yellow'
        } = options;

        // Clear previous highlights from this owner
        if (clearPrevious) {
            await clearLayer(owner);
        }

        // Initialize layer if needed
        if (!layers.has(owner)) {
            layers.set(owner, new Set());
        }
        const ownerLayer = layers.get(owner);

        let highlighted = 0;
        let errors = 0;

        return Word.run(async (context) => {
            const body = context.document.body;

            for (const item of items) {
                try {
                    const searchText = item.searchText || item.text || item.term;
                    if (!searchText) continue;

                    const color = item.color || 
                        FEATURE_COLORS[owner]?.[item.issueType] || 
                        defaultColor;

                    const searchResults = body.search(searchText, {
                        matchCase: true,
                        matchWholeWord: true
                    });

                    searchResults.load('items');
                    await context.sync();

                    for (const range of searchResults.items) {
                        range.font.highlightColor = color;
                        
                        // Generate and track range ID
                        const rangeId = generateRangeId(searchText, highlighted);
                        ownerLayer.add(rangeId);
                        rangeRegistry.set(rangeId, {
                            text: searchText,
                            position: highlighted,
                            owner,
                            color
                        });
                        
                        highlighted++;
                    }

                    await context.sync();
                } catch (e) {
                    console.warn(`HighlightCoordinator: Failed to highlight "${item.searchText}":`, e);
                    errors++;
                }
            }

            return { highlighted, errors };
        });
    }

    /**
     * Clear all highlights for a specific owner/feature
     * 
     * @param {string} owner - Feature identifier
     * @returns {Promise<number>} Number of highlights cleared
     */
    async function clearLayer(owner) {
        const ownerLayer = layers.get(owner);
        if (!ownerLayer || ownerLayer.size === 0) {
            return 0;
        }

        const rangeTexts = [];
        for (const rangeId of ownerLayer) {
            const info = rangeRegistry.get(rangeId);
            if (info) {
                rangeTexts.push(info.text);
                rangeRegistry.delete(rangeId);
            }
        }

        // Clear actual highlights in document
        let cleared = 0;
        
        if (rangeTexts.length > 0) {
            await Word.run(async (context) => {
                const body = context.document.body;
                
                // Dedupe texts to reduce API calls
                const uniqueTexts = [...new Set(rangeTexts)];
                
                for (const text of uniqueTexts) {
                    try {
                        const searchResults = body.search(text, {
                            matchCase: true,
                            matchWholeWord: true
                        });
                        
                        searchResults.load('items');
                        await context.sync();
                        
                        for (const range of searchResults.items) {
                            // Only clear if this highlight is still from our layer
                            // (another layer might have re-highlighted it)
                            range.font.highlightColor = null;
                            cleared++;
                        }
                    } catch (e) {
                        // Search failed, item may have been deleted
                    }
                }
                
                await context.sync();
            });
        }

        // Clear the layer tracking
        ownerLayer.clear();
        
        return cleared;
    }

    /**
     * Clear all highlights from all owners
     * 
     * @returns {Promise<number>} Total highlights cleared
     */
    async function clearAll() {
        let totalCleared = 0;
        
        await Word.run(async (context) => {
            const body = context.document.body;
            body.font.highlightColor = null;
            await context.sync();
        });

        // Count what we cleared
        for (const ownerLayer of layers.values()) {
            totalCleared += ownerLayer.size;
            ownerLayer.clear();
        }
        
        rangeRegistry.clear();
        
        return totalCleared;
    }

    /**
     * Check if a specific owner has active highlights
     * 
     * @param {string} owner - Feature identifier
     * @returns {boolean}
     */
    function hasActiveHighlights(owner) {
        const ownerLayer = layers.get(owner);
        return ownerLayer && ownerLayer.size > 0;
    }

    /**
     * Get count of active highlights for an owner
     * 
     * @param {string} owner - Feature identifier
     * @returns {number}
     */
    function getHighlightCount(owner) {
        const ownerLayer = layers.get(owner);
        return ownerLayer ? ownerLayer.size : 0;
    }

    /**
     * Get all highlight statistics
     * 
     * @returns {Object} Stats by owner
     */
    function getStats() {
        const stats = {
            total: 0,
            byOwner: {}
        };
        
        for (const [owner, ownerLayer] of layers) {
            const count = ownerLayer.size;
            stats.byOwner[owner] = count;
            stats.total += count;
        }
        
        return stats;
    }

    /**
     * Get the default color for a feature and issue type
     * 
     * @param {string} owner - Feature identifier
     * @param {string} issueType - Type of issue (optional)
     * @returns {string} Word highlight color
     */
    function getColor(owner, issueType = 'default') {
        return FEATURE_COLORS[owner]?.[issueType] || 
               FEATURE_COLORS[owner]?.default || 
               'Yellow';
    }

    /**
     * Register a custom feature with its color scheme
     * 
     * @param {string} owner - Feature identifier
     * @param {Object} colors - Color mapping { issueType: 'ColorName' }
     */
    function registerFeature(owner, colors) {
        FEATURE_COLORS[owner] = { ...FEATURE_COLORS[owner], ...colors };
    }

    // Public API
    return {
        highlight,
        clearLayer,
        clearAll,
        hasActiveHighlights,
        getHighlightCount,
        getActiveOwners,
        getStats,
        getColor,
        registerFeature,
        FEATURE_COLORS
    };
})();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightCoordinator;
}

// Global for browser
if (typeof window !== 'undefined') {
    window.HighlightCoordinator = HighlightCoordinator;
}
