# Skill: Test Checklist

Manual verification checklist for DraftBridge Gold after any code change.

---

## 1. Generate Panel

- [ ] Template selector loads and displays all available templates (Letter, Memo, Fax, Motion to Dismiss, etc.)
- [ ] Clicking a template opens the form view with correct variable groups
- [ ] Form groups expand/collapse correctly
- [ ] All input types render: text, textarea, select, date, contact picker
- [ ] Variable values persist when switching between groups
- [ ] "Generate Document" button is enabled when required fields are filled
- [ ] Document generates and inserts into the active Word document
- [ ] Generated document uses correct Handlebars substitutions (no `{{raw_variable}}` leftovers)
- [ ] Back button returns to template selector

## 2. Edit Panel (Smart Variables)

- [ ] Variable inputs display and accept text input
- [ ] Contact picker opens and shows contacts
- [ ] Selecting a contact populates related fields (name, address, phone)
- [ ] Attorney input shows bar number and firm fields
- [ ] Party input shows plaintiff/defendant role selector
- [ ] Cascade engine fires: changing one variable updates dependent variables
- [ ] Court selector loads court database and populates address fields

## 3. Numbering Panel

- [ ] Numbering panel displays correctly when tab is clicked
- [ ] Numbering schemes load (I. A. 1. (a), Section-based, etc.)
- [ ] Tree view expands/collapses levels
- [ ] Selecting a scheme shows preview
- [ ] Apply button inserts numbering into document

## 4. Library Panel

- [ ] Library tab loads and displays clause categories
- [ ] Search filters clauses by keyword
- [ ] Clicking a clause shows preview
- [ ] Insert button adds clause at cursor position in document
- [ ] Category tags display with correct colors (Contracts=blue, Litigation=red, Corporate=green, IP=purple)

## 5. Settings Panel

- [ ] Settings tab loads profile form
- [ ] Existing profile data loads from localStorage
- [ ] Firm name, attorney name, bar number fields accept input
- [ ] Save button persists profile to localStorage
- [ ] Success toast appears after save
- [ ] Reloading the add-in restores saved profile

## 6. Dialog (Pop-out Form)

- [ ] Dialog opens via `Office.context.ui.displayDialogAsync`
- [ ] Dialog header shows "DraftBridge" branding
- [ ] Form inputs render correctly
- [ ] Preview updates as variables are filled
- [ ] Close button dismisses dialog
- [ ] Data passes back to taskpane on dialog close

## 7. Recreate Panel

- [ ] Recreate panel loads when triggered
- [ ] Document detection identifies the current document type
- [ ] Detected variables display in editable form
- [ ] Transformation applies changes to the existing document
- [ ] Error states display correctly for unsupported document types

## 8. Visual Consistency

- [ ] No hardcoded hex colors visible (everything uses `var(--db-*)` tokens)
- [ ] Spacing is consistent across panels (4px grid)
- [ ] Brown primary palette throughout (not blue/Fluent)
- [ ] Cards have consistent radius (`var(--db-radius-lg)`) and shadow (`var(--db-shadow-sm)`)
- [ ] Focus rings appear on all interactive elements
- [ ] Status messages use correct semantic colors (green=success, red=error, yellow=warning, blue=info)

## 9. Console Check

- [ ] No JavaScript errors in browser console on load
- [ ] No `undefined is not a function` errors when clicking buttons
- [ ] No failed network requests (check Network tab)
- [ ] No CSP violations in console

## Quick Smoke Test (minimum after any change)

1. Load the add-in in Word
2. Click through all 4 main tabs (Generate, Numbering, Library, Settings)
3. Select a template and fill one variable
4. Generate a document
5. Check console for errors
