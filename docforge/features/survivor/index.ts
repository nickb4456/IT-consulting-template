/**
 * Version History - Auto-Versioning System
 * 
 * Export all public APIs for the Version History feature.
 */

export { 
  VersionManager, 
  getSurvivor,
  type DocumentSnapshot,
  type VersionMetadata,
  type SurvivorConfig,
  type DiffResult 
} from './VersionManager';

export { SurvivorPanel } from './SurvivorPanel';
