/**
 * DraftBridge Gold - Smart Variables: Contact Management
 *
 * CRUD operations for contacts, search, and recent contacts tracking.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

Object.assign(SmartVariables, {

  // ============================================================================
  // CONTACTS MANAGEMENT
  // ============================================================================

  MAX_RECENT_CONTACTS: 10,

  /**
   * Get saved contacts from profile.
   * @returns {Array<Object>} array of contact objects
   */
  getSavedContacts() {
    return this.userProfile?.contacts || [];
  },

  /**
   * Save a contact to profile (insert or update by ID).
   * @param {Object} contact - contact object; .id is generated if missing
   * @returns {Object} the saved contact with an assigned ID
   */
  saveContact(contact) {
    if (!this.userProfile) this.userProfile = {};
    if (!this.userProfile.contacts) this.userProfile.contacts = [];

    // Generate ID if needed
    if (!contact.id) {
      contact.id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Check for duplicate
    const existingIdx = this.userProfile.contacts.findIndex(existing => existing.id === contact.id);
    if (existingIdx >= 0) {
      this.userProfile.contacts[existingIdx] = contact;
    } else {
      this.userProfile.contacts.push(contact);
    }

    this.saveUserProfile();
    this.addToRecentContacts(contact);
    return contact;
  },

  /**
   * Delete a contact from profile by ID.
   * @param {string} contactId - the contact's unique identifier
   */
  deleteContact(contactId) {
    if (!this.userProfile?.contacts) return;
    this.userProfile.contacts = this.userProfile.contacts.filter(
      contact => contact.id !== contactId
    );
    this.saveUserProfile();
  },

  /**
   * Search contacts by name, company, email, city, or state.
   * @param {string} query - search term (case-insensitive substring match)
   * @returns {Array<Object>} filtered contacts
   */
  searchContacts(query) {
    const contacts = this.getSavedContacts();
    if (!query) return contacts;

    const queryLower = query.toLowerCase();
    return contacts.filter(contact => {
      const searchableText = [
        contact.firstName, contact.lastName, contact.company, contact.email,
        contact.address?.city, contact.address?.state
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(queryLower);
    });
  },

  /** Load recently used contacts from localStorage with shape validation. */
  loadRecentContacts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT_CONTACTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(c => c && typeof c === 'object' && typeof c.id === 'string')) {
          this.recentContacts = parsed;
        } else {
          console.warn('[SmartVariables] Recent contacts failed shape validation, resetting');
          this.recentContacts = [];
        }
      }
    } catch (e) {
      this.recentContacts = [];
    }
  },

  /**
   * Add contact to the front of the recent-contacts list (max 10).
   * @param {Object} contact - the contact to promote
   */
  addToRecentContacts(contact) {
    // Remove if already exists
    this.recentContacts = this.recentContacts.filter(
      existing => existing.id !== contact.id
    );
    // Add to front
    this.recentContacts.unshift(contact);
    // Keep max recent contacts
    this.recentContacts = this.recentContacts.slice(0, this.MAX_RECENT_CONTACTS);
    // Save
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT_CONTACTS, JSON.stringify(this.recentContacts));
    } catch (e) {
      console.warn('[SmartVariables] Failed to save recent contacts to localStorage:', e);
    }
  },

  /**
   * Get the list of recently used contacts.
   * @returns {Array<Object>} up to 10 recent contacts
   */
  getRecentContacts() {
    return this.recentContacts;
  }

});
