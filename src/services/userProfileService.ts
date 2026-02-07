/**
 * DraftBridge Gold - User Profile Service
 * 
 * Manages user profiles, preferences, and saved data.
 * Handles auto-fill for attorney info, letterheads, signatures.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

// TODO: Profile data in localStorage is unencrypted. Sensitive fields (barNumber,
// email, phone, addresses) should be encrypted at rest once auth is implemented.

import {
  UserProfile,
  UserDefaults,
  Attorney,
  Contact,
  Party,
  Address
} from '../types/variables';

// ============================================================================
// USER PROFILE SERVICE
// ============================================================================

export class UserProfileService {
  private profile: UserProfile | null = null;
  private storageKey = 'draftbridge_user_profile';
  public lastSyncError: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MAX_RECENT_ITEMS = 10;
  
  /**
   * Load a user profile, preferring the local cache for offline support.
   *
   * Falls back to the REST API when no cached profile matches `userId`.
   * If both cache and API fail, returns whatever stale cache exists (or null).
   *
   * @param userId - The unique identifier of the user whose profile to load.
   */
  // TODO: Add retry logic (e.g. 1 retry with exponential back-off) for transient network failures.
  async loadProfile(userId: string): Promise<UserProfile | null> {
    // Try local storage first (for offline support)
    const cached = this.loadFromStorage();
    if (cached && cached.userId === userId) {
      this.profile = cached;
      return cached;
    }

    // Fetch from API
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (response.ok) {
        const profile = await response.json() as UserProfile;
        this.profile = profile;
        this.saveToStorage(profile);
        return profile;
      }
      console.warn(`[UserProfileService] API returned ${response.status} loading profile for user "${userId}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[UserProfileService] Network error loading profile for user "${userId}":`, message);
    }

    return cached || null;
  }
  
  /**
   * Get current profile
   */
  getProfile(): UserProfile | null {
    return this.profile;
  }
  
  /**
   * Merge partial updates into the current profile, persist locally, and schedule an API sync.
   *
   * @param updates - Partial profile fields to merge. Existing fields not in `updates` are preserved.
   * @returns The merged profile, or `null` if no profile is loaded.
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!this.profile) return null;

    const updated: UserProfile = {
      ...this.profile,
      ...updates
    };

    this.profile = updated;
    this.saveToStorage(updated);

    // Debounced sync to API
    this.debouncedSync(updated);

    return updated;
  }

  // TODO: Add retry logic (1-2 retries with back-off) for transient sync failures.
  private debouncedSync(updated: UserProfile): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/${updated.userId}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} for PUT /api/users/${updated.userId}/profile`);
        }
        this.lastSyncError = null;
      } catch (error) {
        this.lastSyncError = error instanceof Error ? error.message : String(error);
        console.error(`[UserProfileService] Failed to sync profile for user "${updated.userId}":`, this.lastSyncError);
      }
    }, 1500);
  }
  
  /**
   * Update attorney info
   */
  async updateAttorney(attorney: Attorney): Promise<void> {
    await this.updateProfile({ attorney });
  }
  
  /**
   * Update defaults
   */
  async updateDefaults(defaults: Partial<UserDefaults>): Promise<void> {
    if (!this.profile) return;
    
    await this.updateProfile({
      defaults: {
        ...this.profile.defaults,
        ...defaults
      }
    });
  }
  
  /**
   * Persist a contact for future reuse (upserts by `contact.id`).
   */
  async saveContact(contact: Contact): Promise<void> {
    if (!this.profile) return;

    const existing = this.profile.savedContacts.findIndex(saved => saved.id === contact.id);
    const savedContacts = [...this.profile.savedContacts];
    
    if (existing >= 0) {
      savedContacts[existing] = contact;
    } else {
      savedContacts.push(contact);
    }
    
    await this.updateProfile({ savedContacts });
  }
  
  /**
   * Get saved contacts
   */
  getSavedContacts(): Contact[] {
    return this.profile?.savedContacts || [];
  }
  
  /**
   * Search saved contacts
   */
  searchContacts(query: string): Contact[] {
    if (!this.profile) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.profile.savedContacts.filter(contact => {
      const searchable = [
        contact.firstName,
        contact.lastName,
        contact.company,
        contact.email
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchable.includes(lowerQuery);
    });
  }
  
  /**
   * Persist a party for future reuse (upserts by `party.id`).
   */
  async saveParty(party: Party): Promise<void> {
    if (!this.profile) return;

    const existing = this.profile.savedParties.findIndex(saved => saved.id === party.id);
    const savedParties = [...this.profile.savedParties];
    
    if (existing >= 0) {
      savedParties[existing] = party;
    } else {
      savedParties.push(party);
    }
    
    await this.updateProfile({ savedParties });
  }
  
  /**
   * Get saved parties
   */
  getSavedParties(): Party[] {
    return this.profile?.savedParties || [];
  }
  
  /**
   * Add to recent templates
   */
  async addRecentTemplate(templateId: string): Promise<void> {
    if (!this.profile) return;
    
    const recentTemplates = [
      templateId,
      ...this.profile.recentTemplates.filter(id => id !== templateId)
    ].slice(0, UserProfileService.MAX_RECENT_ITEMS);

    await this.updateProfile({ recentTemplates });
  }
  
  /**
   * Get recent templates
   */
  getRecentTemplates(): string[] {
    return this.profile?.recentTemplates || [];
  }
  
  /**
   * Add to recent courts
   */
  async addRecentCourt(courtId: string): Promise<void> {
    if (!this.profile) return;
    
    const recentCourts = [
      courtId,
      ...this.profile.recentCourts.filter(id => id !== courtId)
    ].slice(0, UserProfileService.MAX_RECENT_ITEMS);

    await this.updateProfile({ recentCourts });
  }
  
  /**
   * Get recent courts
   */
  getRecentCourts(): string[] {
    return this.profile?.recentCourts || [];
  }
  
  /**
   * Dispose of this service instance, clearing pending sync timers.
   * Call when the add-in is being torn down.
   */
  dispose(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.profile = null;
    this.lastSyncError = null;
  }

  // ==========================================================================
  // LOCAL STORAGE
  // ==========================================================================
  
  private loadFromStorage(): UserProfile | null {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data) as UserProfile;
      }
    } catch (error) {
      console.error(`[UserProfileService] Failed to read "${this.storageKey}" from localStorage:`, error);
    }
    return null;
  }

  private saveToStorage(profile: UserProfile): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(profile));
    } catch (error) {
      console.error(`[UserProfileService] Failed to write "${this.storageKey}" to localStorage (quota exceeded?):`, error);
    }
  }

  /** Remove the cached profile from localStorage. */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error(`[UserProfileService] Failed to remove "${this.storageKey}" from localStorage:`, error);
    }
  }
}

// ============================================================================
// PROFILE FACTORY
// ============================================================================

/**
 * Create a new UserProfile populated with sensible defaults for a firm.
 *
 * @param userId - Unique user identifier.
 * @param firmId - Firm the user belongs to.
 * @param attorney - Optional partial attorney data to pre-fill.
 */
export function createDefaultProfile(
  userId: string,
  firmId: string,
  attorney: Partial<Attorney> = {}
): UserProfile {
  const defaultAttorney: Attorney = {
    id: userId,
    prefix: undefined,
    firstName: attorney.firstName || '',
    lastName: attorney.lastName || '',
    suffix: 'Esq.',
    barNumber: attorney.barNumber || '',
    barState: attorney.barState || '',
    firmName: attorney.firmName || '',
    firmAddress: attorney.firmAddress,
    email: attorney.email,
    phone: attorney.phone,
    ...attorney
  };
  
  return {
    userId,
    firmId,
    attorney: defaultAttorney,
    defaults: {
      dateFormat: 'MMMM D, YYYY',
      fontFamily: 'Times New Roman',
      fontSize: 12
    },
    savedContacts: [],
    savedParties: [],
    recentTemplates: [],
    recentCourts: []
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: UserProfileService | null = null;

/** Get (or lazily create) the singleton UserProfileService instance. */
export function getUserProfileService(): UserProfileService {
  if (!instance) {
    instance = new UserProfileService();
  }
  return instance;
}

/** Dispose the singleton instance, clearing timers and cached data. */
export function disposeUserProfileService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

// ============================================================================
// PROFILE MERGE UTILITIES
// ============================================================================

/** Convert an Attorney record to a plain Contact (e.g. for address blocks). */
export function attorneyToContact(attorney: Attorney): Contact {
  return {
    id: attorney.id,
    prefix: attorney.prefix,
    firstName: attorney.firstName,
    middleName: attorney.middleName,
    lastName: attorney.lastName,
    suffix: attorney.suffix,
    title: 'Attorney at Law',
    company: attorney.firmName,
    address: attorney.firmAddress,
    email: attorney.email,
    phone: attorney.phone,
    fax: attorney.fax
  };
}

/** Clone a saved contact with optional field overrides and a fresh ID. */
export function prefillContact(
  saved: Contact,
  overrides: Partial<Contact> = {}
): Contact {
  return {
    ...saved,
    ...overrides,
    id: overrides.id || generateId()
  };
}

/** Clone a saved party with optional field overrides and a fresh ID. */
export function prefillParty(
  saved: Party,
  overrides: Partial<Party> = {}
): Party {
  return {
    ...saved,
    ...overrides,
    id: overrides.id || generateId()
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
