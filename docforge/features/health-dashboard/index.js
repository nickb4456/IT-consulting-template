/**
 * DocForge Document Health Dashboard
 * 
 * A fitness tracker for your legal documents.
 * Single-glance view of document quality with drill-down capability.
 * 
 * @module health-dashboard
 * @version 1.0.0
 */

export { default as HealthDashboard, HEALTH_CATEGORIES, SEVERITY_THRESHOLDS } from './health-dashboard.js';
export { default as HealthDashboardUI } from './health-dashboard-ui.js';

// Re-export for convenience
import DocForgeHealthDashboard from './health-dashboard.js';
import HealthDashboardUI from './health-dashboard-ui.js';

export default {
    ...DocForgeHealthDashboard,
    UI: HealthDashboardUI
};
