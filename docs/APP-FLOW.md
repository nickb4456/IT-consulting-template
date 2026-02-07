# DraftBridge App Flow Documentation

> Last updated: 2026-02-02
> Every page and navigation path documented

---

## Application Structure

```
┌─────────────────────────────────────────────┐
│ Header: "DraftBridge"                       │
├─────────────────────────────────────────────┤
│ Main Tabs: Generate | Edit | Numbering |    │
│            Library | Settings               │
├─────────────────────────────────────────────┤
│ Active Panel Content                        │
│ (varies by selected tab)                    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ Actions Footer (context-dependent)          │
└─────────────────────────────────────────────┘
```

---

## Tab Navigation

### Trigger
User clicks a tab in the main navigation bar.

### Flow
1. User clicks tab (e.g., "Library")
2. `switchPanel('library')` is called
3. All `.main-tab` buttons have `active` class removed
4. Clicked tab gets `active` class (gold underline)
5. All `.panel` divs are hidden
6. Corresponding `#panel-library` is shown

### Decision Points
- None — direct navigation

---

## Generate Tab

### Overview
Create document templates (Letter, Memo, Fax) with form-based input.

### Main View

```
┌─────────────────────────────────────────────┐
│ Create Document                             │
│ Choose a template to start                  │
├─────────────────────────────────────────────┤
│ [✉️ Letter] → Formal business letter        │
│ [📝 Memorandum] → Internal memo             │
│ [📠 Fax Cover] → Fax cover sheet            │
├─────────────────────────────────────────────┤
│ Tools                                       │
│ [🔖 Detect Bookmarks] → Auto-fill bookmarks │
│ [🌐 Global Variables] → {{Placeholders}}    │
└─────────────────────────────────────────────┘
```

### Flow: Generate Letter

1. **Trigger:** User clicks "Letter" option card
2. **Action:** `showTemplate('letter')` called
3. **UI Change:** 
   - Main view hidden (`generate-main` loses `active`)
   - Letter form shown (`generate-letter` gets `active`)
4. **User fills form:**
   - Date (auto-filled with today)
   - Recipient Name
   - Recipient Address
   - RE: Subject
   - Closing (default: "Sincerely")
   - Your Name
5. **User clicks "Generate Letter"**
6. **Action:** `generateLetter()` called
7. **Process:**
   - Form values collected
   - Letter text formatted
   - `insertText()` called
   - Word.run() inserts at cursor
8. **Success:** Alert "✓ Inserted!", form hides, back to main
9. **Error:** Alert with error message

### Flow: Generate Memo
Same as Letter with different fields:
- Date, To, From, Subject, CC (optional)

### Flow: Generate Fax
Same pattern with fields:
- Date, To, Fax Number, From, Phone, Pages, RE: Subject

### Flow: Back from Form
1. **Trigger:** User clicks "← Back"
2. **Action:** `hideTemplate()` called
3. **UI Change:** All sub-panels hidden, main view shown

---

## Edit Tab

### Overview
Quick access to document editing tools.

### Main View

```
┌─────────────────────────────────────────────┐
│ Edit Tools                                  │
│ Format and structure your document          │
├─────────────────────────────────────────────┤
│ [🔢 Numbering] → Manage numbering schemes   │
│ [📑 Table of Contents] → Coming soon        │
│ [📄 Pleading Format] → Coming soon          │
└─────────────────────────────────────────────┘
```

### Flow: Open Numbering
1. **Trigger:** Click "Numbering" option
2. **Action:** `switchPanel('numbering')` called
3. **Result:** Numbering tab becomes active

### Flow: TOC / Pleading (Not Implemented)
1. **Trigger:** Click option
2. **Action:** `alert('Coming soon!')` shown

---

## Numbering Tab

### Overview
Browse, select, edit, and apply numbering schemes.

### Main View

```
┌─────────────────────────────────────────────┐
│ [+ New Scheme] [Apply]                      │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ I.  ARTICLE ONE                         │ │
│ │   A.  Section One                       │ │
│ │     1.  Paragraph text                  │ │
│ │       (a)  Sub-paragraph                │ │
│ │         (i)  Sub-sub item               │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ ▾ Active Document                           │
│     📄 Document Scheme                      │
│ ▾ Default Schemes                           │
│     📄 Legal Outline ✓                      │
│     📄 Contract Sections                    │
│     📄 Heading Style                        │
│     📄 Pleading Format                      │
│ ▾ My Schemes                                │
│     📄 Custom Outline A                     │
├─────────────────────────────────────────────┤
│ [Edit Selected] [Apply to Selection]        │
└─────────────────────────────────────────────┘
```

### Flow: Select a Scheme
1. **Trigger:** Click any scheme in tree (e.g., "Contract Sections")
2. **Action:** `selectScheme('contract-sections', element)` called
3. **Process:**
   - `selectedSchemeId` updated
   - Previous selection loses `selected` class and checkmark
   - Clicked item gets `selected` class and ✓
   - `updatePreview()` renders scheme in preview box
4. **Result:** Preview updates to show new scheme format

### Flow: Toggle Tree Section
1. **Trigger:** Click tree header (e.g., "Default Schemes")
2. **Action:** `toggleTreeSection('default')` called
3. **Process:** Section toggles `collapsed` class
4. **Result:** Items show/hide

### Flow: Apply Scheme to Selection
1. **Trigger:** Click "Apply to Selection"
2. **Action:** `applySelectedScheme()` called
3. **Process:**
   - Check if scheme selected
   - Word.run() starts
   - Get document selection
   - Get paragraphs in selection
   - Convert to numbered list
   - context.sync()
4. **Success:** Alert "✓ Numbering applied!"
5. **Error:** Alert with error message

### Flow: Open Scheme Editor
1. **Trigger:** Click "+ New Scheme" or "Edit Selected"
2. **Action:** `showNumberingEditor()` called
3. **UI Change:**
   - Main view hidden
   - Editor sub-panel shown
   - Form populated with selected scheme data
4. **Editor shows:**
   - Scheme Name field
   - Level 1-5 editors (collapsible)
   - Each level: Before, Style, After, Follow
   - Options checkboxes
   - Start At field

### Flow: Edit Level in Editor
1. **Trigger:** Click level header (e.g., "Level 2")
2. **Action:** `toggleLevelEditor(2)` called
3. **Result:** Level body expands/collapses

### Flow: Save Scheme
1. **Trigger:** Click "Save Scheme"
2. **Action:** `saveNumberingScheme()` called
3. **Process:**
   - Gather all form values
   - Build scheme object
   - Save to `numberingSchemes` object
   - Update preview
4. **Success:** Alert "✓ Scheme saved!", return to main view

### Flow: Cancel Editing
1. **Trigger:** Click "Cancel" or "← Back to Schemes"
2. **Action:** `hideNumberingEditor()` called
3. **Result:** Return to main numbering view, changes discarded

---

## Library Tab

### Overview
Search and insert clauses from the firm library.

### Main View

```
┌─────────────────────────────────────────────┐
│ [🔍 Search clauses...]                      │
├─────────────────────────────────────────────┤
│ All | Contracts | Litigation | Corporate    │
├─────────────────────────────────────────────┤
│ ✓ 106 clauses loaded                        │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Indemnification Clause    [CONTRACTS]   │ │
│ │ ─────────────────────────────────────── │ │
│ │ The Seller shall indemnify and hold...  │ │
│ │ [Insert]                                │ │
│ └─────────────────────────────────────────┘ │
│ (more clauses...)                           │
└─────────────────────────────────────────────┘
```

### Flow: Initial Load
1. **Trigger:** Office.onReady() fires
2. **Action:** `loadClauses()` called
3. **Process:**
   - Status shows "Fetching clauses..."
   - Fetch from API: `${API}/firms/${FIRM}/clauses`
   - Parse JSON response
   - Store in `allClauses` array
   - Call `renderClauses()`
4. **Success:** Status shows "✓ 106 clauses loaded"
5. **Error:** Status shows "✗ Failed to load: [error]" in red

### Flow: Search Clauses
1. **Trigger:** User types in search input
2. **Action:** `filterClauses()` called on each keystroke
3. **Process:**
   - Get search term (lowercase)
   - Filter `allClauses` by:
     - Title contains search term, OR
     - Content contains search term, OR
     - Any tag contains search term
   - AND matches current category filter
   - Call `renderClauses(filtered)`
4. **Result:** Clause list updates, status shows "X of Y clauses"

### Flow: Filter by Category
1. **Trigger:** Click category tab (e.g., "Contracts")
2. **Action:** `setCategory('contracts')` called
3. **Process:**
   - Update `currentCategory`
   - Update tab styling (active class)
   - Call `filterClauses()`
4. **Result:** Clauses filtered to category

### Flow: Insert Clause
1. **Trigger:** Click "Insert" button on a clause
2. **Action:** `insertClause(clauseId, button)` called
3. **Process:**
   - Find clause in `allClauses` by ID
   - Disable button, show "Inserting..."
   - Word.run() starts
   - Get document selection
   - `insertText(clause.content, 'replace')`
   - context.sync()
4. **Success:**
   - Button shows "✓ Done!" (green)
   - After 1.5s, resets to "Insert"
5. **Error:**
   - Button shows "✗ Error"
   - After 2s, resets to "Insert"

---

## Settings Tab

### Overview
Configuration placeholder (not yet implemented).

### Main View

```
┌─────────────────────────────────────────────┐
│ Settings                                    │
│ Configure your preferences                  │
├─────────────────────────────────────────────┤
│ [🏢 Firm Settings] → Coming soon            │
│ [🎨 Styles] → Coming soon                   │
└─────────────────────────────────────────────┘
```

### Flow: Click any option
1. **Trigger:** Click option card
2. **Action:** `alert('Coming soon!')`

---

## Error Handling Summary

| Action | Success | Error |
|--------|---------|-------|
| Load clauses | Status: "✓ X loaded" | Status: "✗ Failed: [msg]" (red) |
| Insert clause | Button: "✓ Done!" (green) | Button: "✗ Error" |
| Insert template | Alert: "✓ Inserted!" | Alert: "Failed: [msg]" |
| Apply numbering | Alert: "✓ Applied!" | Alert: "Failed: [msg]" |
| Save scheme | Alert: "✓ Saved!" | — |

---

## State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `allClauses` | Array | All loaded clauses from API |
| `currentCategory` | String | Active filter ("all", "contracts", etc.) |
| `selectedSchemeId` | String | Currently selected numbering scheme |
| `numberingSchemes` | Object | All scheme definitions |

---

*This document maps every user path through the application.*
