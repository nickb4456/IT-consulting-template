# DraftBridge Source Code

**"Type the client name once. It fills everywhere."**

## Philosophy

> "People think focus means saying yes to the thing you've got to focus on. But that's not what it means at all. It means saying no to the hundred other good ideas."
> — Steve Jobs

We said no to **showing** everything at once. Not to **having** everything.

**Simplified UI, full capabilities.** Features are hidden, not deleted.

## Directory Structure

```
src/
├── manifest.xml          # Office Add-in manifest
│
├── taskpane/             # THE UI (one focused screen)
│   ├── taskpane.html     # Simple, focused HTML
│   ├── taskpane.css      # Clean styles
│   ├── taskpane.js       # Main controller
│   ├── onboarding.js     # First-run experience (dormant)
│   └── onboarding.css    # Onboarding styles
│
├── common/               # Shared services
│   ├── storage.js        # Local storage for datasets
│   ├── utils.js          # Basic utilities
│   ├── state.js          # State management (with feature flags)
│   ├── api.js            # API client (disabled, offline-first)
│   └── sync.js           # Sync manager (disabled, local-only)
│
├── features/             # Feature implementations
│   ├── templates/        # Template fill engine (ACTIVE)
│   │   └── fill-engine.js
│   ├── numbering/        # Numbering presets (ACTIVE)
│   │   └── sync.js
│   ├── letterhead/       # Firm letterhead (ACTIVE, via menu)
│   │   └── insert.js
│   ├── toc/              # Table of Contents (HIDDEN, feature flag)
│   │   └── generator.js
│   └── crossref/         # Cross-references (HIDDEN, feature flag)
│       └── manager.js
│
└── assets/               # Icons
```

## Feature Visibility

### Always Visible (Main Screen)
- **Fill All** - The magic button
- **Fix Numbering** - One-click numbering fix
- **Rescan** - Refresh field detection

### Hidden in "More" Menu
- **Insert Letterhead** - Firm headers (active)
- **Table of Contents** - (hidden behind flag, incomplete)
- **Cross-References** - (hidden behind flag, incomplete)
- **Save/Load/Manage Datasets** - Data management
- **Settings** - Preferences
- **Help** - Documentation link

### Feature Flags

Incomplete features are hidden behind flags in `state.js`:

```javascript
features: {
    toc: false,          // TOC generator - hidden until complete
    crossref: false,     // Cross-references - hidden until complete
    cloudSync: false,    // Cloud sync - hidden until backend ready
    teamSharing: false   // Team features - hidden until v2
}
```

To enable a hidden feature (for testing):
```javascript
DraftBridgeState.actions.enableFeature('toc');
```

## The UI

ONE main screen. Everything else in the "More" menu.

```
┌─────────────────────────────────┐
│ DraftBridge              [⋮ More] │
├─────────────────────────────────┤
│                                 │
│  8 fields found • 3 empty       │
│                                 │
│  CLIENT NAME                    │
│  ┌─────────────────────────┐   │
│  │ Acme Corporation        │   │
│  └─────────────────────────┘   │
│                                 │
│  ... (fields list scrolls) ... │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────┐ ┌───────────┐ │
│  │  Fill All   │ │ Numbering │ │
│  └─────────────┘ └───────────┘ │
└─────────────────────────────────┘

"More" Menu:
┌─────────────────────────────────┐
│ Insert Letterhead               │
│ Table of Contents*              │
│ Cross-References*               │
│─────────────────────────────────│
│ Save as Dataset                 │
│ Load Dataset                    │
│ Manage Datasets                 │
│─────────────────────────────────│
│ Settings                        │
│ Help                            │
└─────────────────────────────────┘
* = "Coming soon" (feature flag)
```

## Running Locally

```bash
npm run dev
```

Then sideload in Word via Insert > Add-ins > My Add-ins.

## Design Rules

1. **One screen** - No tabs, no complex navigation
2. **3 visible buttons** - Fill All, Numbering, More
3. **Everything else in More menu** - Hidden but accessible
4. **No loading spinners** - Must be instant
5. **Undo always works** - Snapshot before every Fill
6. **Incomplete = hidden** - Feature flags for WIP

## Speed Requirements

- Scan: < 200ms
- Fill All: < 300ms
- UI render: < 100ms

If it shows a spinner, we failed.

## What "Simplified" Means

❌ NOT: Deleting features
✅ YES: Hiding complexity

The code is still there. The capabilities exist. Users just don't see 14 buttons on first load.

Advanced features live in:
- The "More" menu
- Modals (triggered from menu)
- Feature flags (for incomplete work)

First-time users see: fields, Fill All, done.
Power users find: everything else in the menu.
