# Defined Terms Guardian

**Never miss a defined term or use one inconsistently again.**

## Overview

The Defined Terms Guardian scans legal documents to:
- Build an index of all defined terms
- Track every usage of each term
- Highlight undefined terms being used
- Flag defined terms that are never used
- Warn on inconsistent capitalization
- Detect terms used before their definition

## Files

| File | Purpose |
|------|---------|
| `defined-terms.js` | Core scanner and validator logic |
| `defined-terms-ui.js` | Task pane panel UI |
| `defined-terms.css` | Styling |
| `index.js` | Module exports |

## Usage

### Basic Scanning

```javascript
import { definedTermsScanner } from './features/defined-terms';

// Initialize and scan
await definedTermsScanner.initialize();
const result = await definedTermsScanner.scan();

// Get all defined terms
const terms = definedTermsScanner.getAllTerms();

// Get statistics
const stats = definedTermsScanner.getStats();
console.log(`${stats.defined} defined, ${stats.undefined} undefined`);
```

### Navigation

```javascript
// Jump to a term's definition
await definedTermsScanner.navigateToDefinition(termId);

// Jump to a specific usage
await definedTermsScanner.navigateToUsage(termId, usageIndex);
```

### Highlighting

```javascript
// Highlight all issues in the document
await definedTermsScanner.highlightIssues({
    undefinedColor: 'Yellow',
    unusedColor: 'LightGray',
    capitalizationColor: 'DarkYellow'
});

// Clear all highlights
await definedTermsScanner.clearHighlights();
```

### UI Panel

```javascript
import { DefinedTermsUI } from './features/defined-terms';

// Initialize the panel in a container
const container = document.getElementById('myContainer');
await DefinedTermsUI.initialize(container);

// Manually refresh
await DefinedTermsUI.refresh();
```

## Definition Patterns Detected

The scanner recognizes these common legal definition patterns:

1. **"Term" means...** or **"Term" shall mean...**
   ```
   "Confidential Information" means any non-public information...
   ```

2. **Parenthetical definitions**: `(the "Term")`, `(a "Term")`, `("Term")`
   ```
   Acme Corporation, a Delaware corporation (the "Company")
   ```

3. **Hereinafter**: `(hereinafter "Term")`, `(hereinafter referred to as "Term")`
   ```
   John Smith (hereinafter "Consultant")
   ```

4. **As used herein**: `As used herein, "Term" means...`
   ```
   As used in this Agreement, "Services" means...
   ```

5. **Defined as**: `"Term" is defined as...`
   ```
   "Effective Date" is defined as the date first written above.
   ```

6. **Short forms**: `Full Name (the "Short Form")`
   ```
   Big Example Corporation, Inc. (the "Company")
   ```

## Scan Result Object

```typescript
interface ScanResult {
    definedTerms: Map<string, DefinedTerm>;  // All defined terms
    undefinedTerms: Array<UndefinedTerm>;    // Potentially undefined
    unusedTerms: Array<DefinedTerm>;         // Defined but never used
    capitalizationIssues: Array<Issue>;      // Wrong caps
    usedBeforeDefinition: Array<Issue>;      // Used before defined
    scanTime: number;                        // Milliseconds
}

interface DefinedTerm {
    id: string;
    term: string;                  // "Client"
    normalizedTerm: string;        // "client"
    definitionStart: number;       // Character offset
    definitionEnd: number;
    definitionContext: string;     // Surrounding text
    definitionType: string;        // 'means', 'parenthetical', etc.
    usages: Array<TermUsage>;
}

interface TermUsage {
    start: number;
    end: number;
    text: string;                  // Actual text found
    beforeDefinition: boolean;     // Used before definition?
    capitalizationMismatch: boolean;
}
```

## UI Views

The panel has three tabs:

### Terms Tab
- Alphabetical list of all defined terms
- Click term name to jump to definition
- Expand to see all usages
- Badge shows usage count

### Issues Tab
- Unused terms (defined but never used)
- Terms used before definition
- Capitalization mismatches
- Click to navigate to each issue

### Undefined Tab
- Terms that look like defined terms but have no definition
- Shows occurrence count
- Quick actions to navigate or highlight

## Styling

Uses DraftBridge CSS variables for consistency. Override these in your theme:

```css
--df-primary: #2563eb;
--df-warning: #f59e0b;
--df-error: #ef4444;
--df-surface: #f9fafb;
--df-border: #e5e7eb;
```

## Limitations

- Scanner uses regex patterns which may miss unusual definition formats
- Very long documents may take a few seconds to scan
- Highlights are per-document and not persisted

## Future Enhancements

- [ ] Custom definition patterns
- [ ] Export terms to glossary
- [ ] Persistent highlight state
- [ ] Integration with Document Health Dashboard
- [ ] Auto-fix capitalization issues
