# Document Health Dashboard

A fitness tracker for your legal documents. Single-glance view of document quality with color-coded categories and drill-down capability.

## Features

- **Overall Health Score (0-100)** - Weighted aggregate of all quality checks
- **7 Quality Categories** with individual scoring:
  - 📐 Formatting Consistency (15%)
  - 📖 Defined Terms (20%)
  - 🔗 Cross-References (15%)
  - 👥 Party Names (15%)
  - 📎 Exhibits (10%)
  - 📝 Empty Fields (15%)
  - 🚧 Placeholder Text (10%)
- **Color-Coded Severity** - Green (80+), Yellow (50-79), Red (<50)
- **Click-to-Expand Details** - See specific issues per category
- **History Tracking** - Monitor document health over time

## Usage

### Quick Check

```javascript
import DocForgeHealthDashboard from './health-dashboard.js';

// Quick one-liner
const report = await DocForgeHealthDashboard.quickCheck();
console.log(`Health Score: ${report.overallScore}`);
```

### Full Dashboard

```javascript
import { HealthDashboard } from './health-dashboard.js';
import HealthDashboardUI from './health-dashboard-ui.js';

// Create dashboard instance
const dashboard = new HealthDashboard({
    trackHistory: true,
    maxHistoryEntries: 50
});

// Run check
const report = await dashboard.runHealthCheck();

// Show UI
HealthDashboardUI.show();
```

### Check Single Category

```javascript
const result = await dashboard.checkCategory('definedTerms');
console.log(`Defined Terms Score: ${result.score}`);
console.log(`Issues: ${result.issues.length}`);
```

## Report Structure

```javascript
{
    timestamp: "2025-01-30T00:15:00.000Z",
    elapsed: 245,
    overallScore: 78,
    severity: "yellow",
    totalIssues: 5,
    categories: {
        formatting: { score: 85, issues: [...] },
        definedTerms: { score: 70, issues: [...] },
        crossReferences: { score: 100, issues: [...] },
        partyNames: { score: 80, issues: [...] },
        exhibits: { score: 60, issues: [...] },
        emptyFields: { score: 100, issues: [...] },
        placeholders: { score: 52, issues: [...] }
    },
    summary: {
        criticalIssues: [...],
        warnings: [...],
        topPriority: { category: "...", message: "..." }
    }
}
```

## Integration

The dashboard integrates with existing DocForge features:

- **Document Check** - Empty fields and placeholder detection
- **Cross-Reference Manager** - Section/exhibit reference validation
- **Style Detector** - Formatting consistency analysis

## Files

- `health-dashboard.js` - Core engine (aggregates all checks)
- `health-dashboard-ui.js` - Visual dashboard component
- `health-dashboard.css` - Clean, modern styling
- `index.js` - Module exports

## Styling

The dashboard supports both light and dark modes via CSS custom properties. Colors follow the severity scheme:

- **Green** (#22c55e) - Score 80-100, healthy
- **Yellow** (#eab308) - Score 50-79, needs attention  
- **Red** (#ef4444) - Score 0-49, critical issues

## History

Health scores are tracked in localStorage and can be viewed as a trend chart. The dashboard stores the last 50 checks by default.

```javascript
// Get history
const history = dashboard.getHistory();

// Get trend data (last 10 entries)
const trend = dashboard.getHistoryTrend(10);
// { timestamps: [...], scores: [...], trend: "improving" | "declining" | "stable" }

// Clear history
dashboard.clearHistory();
```
