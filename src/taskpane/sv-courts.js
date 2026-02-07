/**
 * DraftBridge Gold - Smart Variables: Courts Database
 *
 * Courts database management: loading, querying, and caption generation.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // COURTS DATABASE
  // ============================================================================

  /** Load the courts database from courts.json, with empty-array fallback. */
  async loadCourtsDatabase() {
    try {
      const response = await fetch('src/data/courts.json');
      if (response.ok) {
        const data = await response.json();
        this.courts = data.courts || [];
        this.courtsByState = data.stateIndex || {};
        // Build lookup by ID
        this.courtsById = {};
        this.courts.forEach(court => { this.courtsById[court.id] = court; });
        console.log(`[SmartVariables] Loaded ${this.courts.length} courts from database`);
      }
    } catch (e) {
      console.warn('[SmartVariables] Could not load courts database, using fallback:', e);
      this.courts = [];
    }
  },

  /**
   * Get court options formatted for a select dropdown.
   * @param {string|null} [filterState=null] - optional 2-letter state code to filter by
   * @returns {Array<{value: string, label: string}>} select option objects
   */
  getCourtOptions(filterState = null) {
    let filtered = this.courts;
    if (filterState) {
      const ids = this.courtsByState[filterState] || [];
      filtered = ids.map(id => this.courtsById[id]).filter(Boolean);
    }
    return filtered.map(court => ({
      value: court.id,
      label: `${court.abbreviation} - ${court.city}`
    }));
  },

  /**
   * Get full court details by ID.
   * @param {string} courtId - court identifier
   * @returns {Object|null} court object or null if not found
   */
  getCourtById(courtId) {
    return this.courtsById[courtId] || null;
  },

  /**
   * Get the formatted court caption for document headers.
   * @param {string} courtId - court identifier
   * @returns {string} multi-line court caption (e.g. "UNITED STATES DISTRICT COURT\n...")
   */
  getCourtCaption(courtId) {
    const court = this.getCourtById(courtId);
    if (!court) return 'UNITED STATES DISTRICT COURT';
    // Extract district from name
    const name = court.name.replace('United States District Court for the ', '').toUpperCase();
    return `UNITED STATES DISTRICT COURT\n${name}`;
  }

});
