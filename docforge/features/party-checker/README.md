# Party Name Consistency Checker

Ensures party names are used consistently throughout legal documents.

## Features

- **Auto-detect party definitions** - Recognizes patterns like "ABC Corp, a Delaware corporation (the "Company")"
- **Track all variations** - Monitors Company, ABC Corp, ABC, Seller, etc.
- **Warn on inconsistent usage** - Flags when different forms are mixed
- **Warn on undefined references** - Catches "Buyer" used without definition
- **One-click fix** - Standardize all references to the defined short form
- **Multiple party support** - Handles complex multi-party agreements

## Files

| File | Description |
|------|-------------|
| `party-checker.js` | Core scanner and analyzer logic |
| `party-checker-ui.js` | Task pane UI component |
| `party-checker.css` | Styling (supports dark mode) |
| `index.js` | Module entry point |

## Usage

### Basic Integration

```html
<!-- Include styles -->
<link rel="stylesheet" href="party-checker.css">

<!-- Include scripts -->
<script src="party-checker.js"></script>
<script src="party-checker-ui.js"></script>

<!-- Container for the panel -->
<div id="party-checker-panel"></div>

<script>
  // Initialize when Office is ready
  Office.onReady(() => {
    DocForgePartyCheckerUI.init('party-checker-panel');
  });
</script>
```

### Programmatic API

```javascript
// Scan the document
const results = await DocForgePartyChecker.scanDocument();
console.log(results.parties);  // Detected parties
console.log(results.issues);   // Found issues
console.log(results.summary);  // Statistics

// Get current registry
const registry = DocForgePartyChecker.getRegistry();

// Standardize a party's references
await DocForgePartyChecker.standardizeParty('party_1');

// Highlight all issues in document
await DocForgePartyChecker.highlightIssues();

// Clear highlights
await DocForgePartyChecker.clearHighlights();

// Navigate to a location
await DocForgePartyChecker.navigateToLocation({ paragraph: 5, offset: 0 });

// Add a party manually
DocForgePartyChecker.addPartyManually('Acme Corporation', 'Acme', ['ACME', 'Acme Corp']);

// Fix a specific issue
await DocForgePartyChecker.fixIssue('issue_123');
```

## Detection Patterns

The checker recognizes these party definition patterns:

1. **Standard legal format:**
   ```
   ABC Corp, a Delaware corporation (the "Company")
   ```

2. **Simple parenthetical:**
   ```
   John Smith ("Employee")
   ```

3. **Hereinafter clause:**
   ```
   XYZ LLC, hereinafter referred to as "Vendor"
   ```

4. **Collective parties:**
   ```
   Buyer and Seller (collectively, the "Parties")
   ```

5. **Role-based:**
   ```
   ABC Corp, as Seller
   ```

## Issue Types

| Type | Severity | Description |
|------|----------|-------------|
| `undefined` | Warning | Party reference without definition |
| `inconsistent` | Info | Multiple variations of same party |
| `typo` | Warning | Possible typo (fuzzy match) |
| `duplicate` | Error | Same short form defined twice |

## UI Features

- **Summary card** - Shows overall document health
- **Parties list** - Expandable cards for each party
- **Issues list** - Grouped by severity with one-click fixes
- **Quick actions** - Highlight, clear, fix all, rescan

## Customization

### CSS Variables

Override these in your stylesheet:

```css
.party-checker-container {
  --pc-primary: #your-brand-color;
  --pc-border-radius: 4px;
  /* See party-checker.css for full list */
}
```

### Adding Custom Patterns

```javascript
// Access the checker's pattern list
console.log(DocForgePartyChecker.COMMON_SHORT_FORMS);
console.log(DocForgePartyChecker.ENTITY_TYPES);
```

## Office.js APIs Used

- `Word.Document.body.paragraphs` - Document structure
- `Word.Range.search()` - Finding text
- `Word.Range.insertText()` - Replacing text
- `Word.Range.font.highlightColor` - Highlighting issues
- `Word.Range.select()` - Navigation

## Dependencies

None. Pure JavaScript with Office.js APIs only.

## Browser Support

- Microsoft Edge (Chromium)
- Chrome
- Firefox
- Safari

Works in all Office.js supported environments (Word Online, Word Desktop).
