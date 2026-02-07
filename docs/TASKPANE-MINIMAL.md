# DraftBridge Minimal Taskpane

## Overview

The minimal taskpane redesign removes tab navigation (moving to ribbon) and keeps only essential quick-access UI:

- **Status/health indicators** - Document health badge showing numbering issues
- **Quick action buttons** - Large, touch-friendly buttons for common tasks
- **Recent items list** - Last 5 actions for quick repeat
- **Voice toggle** - Quick access to voice control

## Files

- `taskpane-minimal.html` - The new minimal taskpane
- `dialog.html` - Dialog windows for forms (opened via Office Dialog API)
- `taskpane.html.backup-full` - Backup of original taskpane

## Architecture

```
┌─────────────────────────────────────┐
│         Taskpane (Minimal)          │
│  ┌─────────────────────────────────┐│
│  │ Header: DraftBridge + 🎤 Voice  ││
│  ├─────────────────────────────────┤│
│  │ Status: [●] Numbering: Healthy  ││
│  ├─────────────────────────────────┤│
│  │ Quick Actions (2x2 grid):       ││
│  │  [Demand Letter] [New Motion]   ││
│  │  [Numbering]     [Insert TOC]   ││
│  ├─────────────────────────────────┤│
│  │ Document Tools (2x2 grid):      ││
│  │  [Letter]  [Memo]               ││
│  │  [Fill Variables] [Clauses]     ││
│  ├─────────────────────────────────┤│
│  │ Recent:                         ││
│  │  - Demand Letter (5m ago)       ││
│  │  - Insert TOC (1h ago)          ││
│  └─────────────────────────────────┘│
│           ⚙️ Settings               │
└─────────────────────────────────────┘

        │ openFormDialog('letter')
        ▼

┌─────────────────────────────────────┐
│        Dialog Window (50x70%)       │
│  ┌─────────────────────────────────┐│
│  │ Header: New Letter          [×] ││
│  ├─────────────────────────────────┤│
│  │                                 ││
│  │    Full form with all fields    ││
│  │    More space for data entry    ││
│  │    Preview pane                 ││
│  │                                 ││
│  ├─────────────────────────────────┤│
│  │        [Cancel] [Insert]        ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## How It Works

### Quick Actions
Buttons in the taskpane call `openFormDialog(type)` which uses Office Dialog API:

```javascript
Office.context.ui.displayDialogAsync(
    'dialog.html?form=letter',
    { height: 70, width: 50 },
    callback
);
```

### Dialog Communication
Dialog sends message back to taskpane:

```javascript
// In dialog.html
Office.context.ui.messageParent(JSON.stringify({
    action: 'insert-template',
    data: formData
}));

// In taskpane
function handleDialogMessage(message) {
    switch (message.action) {
        case 'insert-template':
            insertTemplate(message.data);
            break;
    }
}
```

### Health Badge
Shows document numbering health:
- 🟢 **Healthy** - No issues detected
- 🟡 **Issues** - 1-3 minor issues
- 🔴 **Broken** - 4+ issues need attention

Click badge to open fix dialog.

### Recent Items
Stored in localStorage, shows last 5 actions:
- Auto-updates on every action
- Click to repeat (opens same form)
- Shows time since action

## Deployment

To use minimal taskpane:

1. **Backup current:**
   ```bash
   cp taskpane.html taskpane-full.html
   ```

2. **Switch to minimal:**
   ```bash
   cp taskpane-minimal.html taskpane.html
   ```

3. **Ensure dialog.html is deployed** alongside taskpane.html

## Form Types

| Form Type | Dialog Title | Purpose |
|-----------|--------------|---------|
| `letter` | New Letter | Business letter template |
| `memo` | New Memorandum | Internal memo template |
| `demand-letter` | Demand Letter | Legal demand with tone options |
| `motion` | New Motion | Court motion template |
| `numbering` | Apply Numbering | Select numbering scheme |
| `fix-numbering` | Fix Issues | Auto-fix numbering problems |
| `clause-library` | Clause Library | Browse/insert clauses |
| `fill-variables` | Fill Variables | Fill {{placeholders}} |
| `settings` | Settings | API key, author defaults |

## Future: Ribbon Integration

When custom ribbon tab is added, buttons there will also call `openFormDialog()`:

```xml
<!-- In manifest.xml -->
<Action xsi:type="ExecuteFunction">
    <FunctionName>openDemandLetterDialog</FunctionName>
</Action>
```

```javascript
// In function file
function openDemandLetterDialog(event) {
    openFormDialog('demand-letter');
    event.completed();
}
```
