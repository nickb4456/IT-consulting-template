# DocForge Modules

## Smart Numbering Engine (`numbering.js`)

The killer feature. Detects and fixes legal document numbering patterns with sub-500ms performance.

### Features

- **Pattern Detection**: Recognizes all common legal numbering formats
  - ARTICLE I, II, III... (Roman articles)
  - 1., 2., 3... (Section top-level)  
  - 1.1, 1.2, 2.1... (Decimal subsections)
  - 1.1.1, 1.1.2... (Deep decimal, up to 4 levels)
  - (a), (b), (c)... (Alpha paragraphs)
  - (i), (ii), (iii)... (Roman sub-paragraphs)
  - (1), (2), (3)... (Numeric sub-paragraphs)
  - (A), (B), (C)... (Upper alpha)

- **AST/Tree Building**: Builds document structure tree for proper hierarchy analysis

- **One-Click Fix**: Identifies all numbering issues and fixes them in a single operation

- **Incremental Processing**: Caches document structure for fast updates

- **Performance**: Target <500ms for full document renumbering on 500+ paragraph docs

### API

```javascript
// Main functions
await DocForge.Numbering.analyzeDocumentStructure(context);
await DocForge.Numbering.previewNumberingChanges(context);
await DocForge.Numbering.fixAllNumbering(context);
await DocForge.Numbering.fixNumberingFromCursor(context);
await DocForge.Numbering.getNumberingStats(context);
await DocForge.Numbering.getSections(context);

// Utilities
DocForge.Numbering.detectPattern(text);
DocForge.Numbering.toRoman(number);
DocForge.Numbering.fromRoman(romanString);
```

### Testing

```javascript
// In browser console with add-in loaded:
runNumberingTests();
```

### Architecture

```
numbering.js
├── NUMBERING_PATTERNS[]     # Pattern definitions
├── DocumentTree             # AST class
├── NumberingCache           # Incremental update cache
├── Pattern Detection        # detectPattern()
├── Number Calculation       # calculateExpectedNumbers()
└── API Functions            # Main Word.js integrations
```

## UI Integration (`numbering-ui.js`)

Handles the connection between the numbering engine and the taskpane UI.

### Functions

```javascript
// Called by UI buttons
window.analyzeNumbering();
window.fixNumbering();
window.fixSingleItem(paragraphIndex);

// Utilities
window.getSectionsForDropdown();
window.highlightParagraph(paragraphIndex);
```

---

## TOC Generator (`toc.js`)

Intelligent Table of Contents that detects document structure from multiple signals, not just Word heading styles (which lawyers rarely use correctly).

### Features

- **Multi-Signal Heading Detection**
  - Word heading styles (Heading 1, Heading 2, etc.)
  - Pattern matching (ARTICLE, SECTION, EXHIBIT, etc.)
  - Formatting signals (bold, ALL CAPS, font size)
  - Length heuristics and content analysis

- **Configurable Sensitivity**
  - LOW: Conservative, high-confidence headings only
  - MEDIUM: Standard detection (default)
  - HIGH: Aggressive, catches more potential headings

- **Smart TOC Generation**
  - Hierarchical structure building
  - ContentControl container for easy updates
  - Configurable levels (1-4)
  - Include/exclude section numbers

- **Incremental Updates**
  - Caches heading data for fast re-scans
  - Updates existing TOC without regenerating
  - Preserves custom formatting when possible

- **Performance**: Target <200ms for full document scan

### API

```javascript
// Main functions
await DocForge.TOC.detectHeadings(context, options);
await DocForge.TOC.generateTOC(context, options);
await DocForge.TOC.updateTOC(context, options);
await DocForge.TOC.previewTOC(context, options);
await DocForge.TOC.deleteTOC(context);
await DocForge.TOC.generateNativeTOC(context);
await DocForge.TOC.analyzeDocumentStructure(context);

// Options
const options = {
    maxLevel: 3,           // Include levels 1-3
    sensitivity: 'MEDIUM', // LOW, MEDIUM, or HIGH
    insertLocation: 'start', // 'start', 'cursor', 'end'
    includeNumbers: true,   // Include section numbers
    createBookmarks: true   // Create navigation bookmarks
};

// Utilities
DocForge.TOC.matchPattern(text);
DocForge.TOC.cleanHeadingText(text);
DocForge.TOC.buildTOCStructure(headings);

// Cache management
DocForge.TOC.invalidateCache();
```

### Detected Patterns

| Pattern | Example | Level |
|---------|---------|-------|
| ARTICLE (Roman) | ARTICLE I - DEFINITIONS | 1 |
| ARTICLE (Arabic) | ARTICLE 1 - DEFINITIONS | 1 |
| SECTION | SECTION 3.2 Payment Terms | Dynamic |
| EXHIBIT | EXHIBIT A - Form of Assignment | 1 |
| SCHEDULE | SCHEDULE 1.1(a) - Properties | 1 |
| APPENDIX | APPENDIX B - Specifications | 1 |
| ANNEX | ANNEX I - Supporting Documents | 1 |
| Decimal | 1.1 Scope of Work | 2 |
| Standalone | RECITALS, DEFINITIONS, BACKGROUND | 1 |
| Outline (Roman) | I. Introduction | 1 |
| Outline (Alpha) | A. First Point | 2 |

### Testing

```bash
cd src/modules
node toc.test.js
```

### Architecture

```
toc.js
├── HEADING_PATTERNS[]       # Pattern definitions (priority ordered)
├── SENSITIVITY              # Detection threshold presets
├── TOCCache                 # Caching for incremental updates
├── calculateHeadingScore()  # Multi-signal confidence scoring
├── matchPattern()           # Pattern detection
├── buildTOCStructure()      # Hierarchy tree building
├── generateTOCContent()     # Text content generation
└── API Functions            # Word.js integrations
```

---

## UI Integration (`toc-ui.js`)

Handles the TOC section in the taskpane.

### Functions

```javascript
// Auto-initialized on load
TOC_UI.init();

// Called by UI buttons
TOC_UI.handlePreview();
TOC_UI.handleGenerate();
TOC_UI.handleUpdate();
TOC_UI.handleDelete();
TOC_UI.handleNative();
```

---

## Other Modules

- `template.js` - Template variable detection and filling
- `xref.js` - Cross-reference validation and fixing
- `utils.js` - Shared utility functions

---

## Performance Benchmarks

Target benchmarks vs Litera Create:

| Operation | Litera | DocForge Target | Actual |
|-----------|--------|-----------------|--------|
| Renumber doc | 3-8 sec | <500ms | ~200ms |
| Analyze structure | 2-5 sec | <200ms | ~100ms |
| Pattern detection | N/A | <0.1ms/pattern | ~0.02ms |

Tested on: 500 paragraph legal document (simulated)

---

*Built for lawyers who just want their numbering to work.*
