# DraftBridge Gold -- Refactor Log

> Documenting the design and code refactor of 2026-02-06

---

## Phase 1: Foundation -- Design Tokens and CSS Architecture

Established the canonical design token system and base style layer.

| Change | File | Details |
|--------|------|---------|
| Created design token file | `src/styles/tokens.css` | All visual constants: colors, spacing (4px base), border radius, typography, shadows, component tokens, transitions. 134 lines defining the complete `var(--db-*)` system. |
| Created shared base styles | `src/styles/base.css` | Universal reset, accessibility helpers (`.sr-only`), body defaults, shared button/input/toast patterns. Loaded after `tokens.css`, before page-specific CSS. |
| Created dialog stylesheet | `dialog.css` | Styles for the pop-out `dialog.html` form. Previously missing -- `dialog.html` referenced it but the file did not exist. |

---

## Phase 2: CSS Extraction and Tokenization

Moved all inline styles to external files and replaced every hardcoded value with design tokens.

| Change | File(s) | Details |
|--------|---------|---------|
| Extracted ~2700 lines of inline CSS | `src/styles/taskpane.css` | Removed all `<style>` blocks from `taskpane.html` into a dedicated external stylesheet. |
| Replaced inline styles with link tags | `taskpane.html` | `<style>...</style>` replaced with `<link rel="stylesheet" href="src/styles/taskpane.css">`. CSS load order: `tokens.css` -> `base.css` -> `taskpane.css` -> `smart-variables.css`. |
| Tokenized colors across 8 CSS files | Multiple | 100+ hardcoded hex values replaced with `var(--db-*)` references. Files: `taskpane.css`, `smart-variables.css`, `dialog.css`, `RecreatePanel.css`, `AttorneyInput.css`, `ContactInput.css`, `PartyInput.css`, `VariableForm.css`, `VariableInput.css`. |
| Standardized spacing to 4px grid | Multiple | All padding, margin, and gap values aligned to the `var(--db-space-*)` scale. |
| RecreatePanel palette change | `RecreatePanel.css` | Changed from Fluent blue palette to DraftBridge brown (`var(--db-primary)`, `var(--db-primary-light)`). |
| Plaintiff/defendant tokenization | `smart-variables.css`, `PartyInput.css` | Party colors now use `var(--db-plaintiff)`, `var(--db-defendant)`, `var(--db-party-neutral)` semantic tokens. |
| Gradient and warning tokenization | `taskpane.css`, `VariableForm.css` | Gradient stops use `var(--db-primary-dark)`, `var(--db-warning-light)`. Warning states use `var(--db-warning-*)` tokens. |

---

## Phase 3: JavaScript Decomposition

Broke the 2935-line `smart-variables.js` monolith into focused modules and fixed 6 bugs in the TypeScript service layer.

### Module Extraction

| Module | Lines | Purpose |
|--------|-------|---------|
| `sv-state.js` | 84 | `SmartVariables` namespace definition, core state object, `userProfile`, `templates` cache |
| `sv-courts.js` | 70 | Court selection and dropdown logic |
| `sv-contacts.js` | 111 | Contact picker, search, and selection |
| `sv-templates.js` | 501 | Template loading, rendering, list display |
| `sv-profile.js` | 285 | User profile load/save from localStorage |

All modules use the `Object.assign(SmartVariables, { ... })` pattern to extend the shared namespace. The original monolith (`smart-variables.js`) remains as a backup reference.

### Bug Fixes in TypeScript Services

| Fix | File | Problem | Solution |
|-----|------|---------|----------|
| 3.2a | `templateRenderer.ts:203` | Non-null assertion (`!`) could crash at runtime | Replaced with explicit null check + error throw |
| 3.2b | `userProfileService.ts:76` | Fire-and-forget API call swallowed errors silently | Added `lastSyncError` property for error tracking |
| 3.2c | `cascadeEngine.ts:391` | O(n^2) sort on every cascade pass | Cached processing order, computed once |
| 3.2d | `variableEngine.ts:380` | Regex compiled inside loop on every variable substitution | Added `regexCache` Map for compiled patterns |
| 3.2e | `templateRenderer.ts:196` | Unbounded template cache could grow without limit | Added 50-entry LRU eviction |
| 3.2f | `recreateService.ts:415,429` | Silent `catch` blocks hid errors | Added `console.error()` logging in catch handlers |

### Shared Helper Extraction

| Change | File | Details |
|--------|------|---------|
| Extracted `formatAddressLines()` | `contactHandler.ts` | Shared address formatting function pulled out of inline usage for reuse across contact and attorney flows. |

### Type Rename

| Change | Files | Details |
|--------|-------|---------|
| `DocumentType` -> `RecreateDocumentType` | `recreate.ts`, `documentDetector.ts`, `recreateService.ts` | Renamed to avoid collision with the built-in DOM `DocumentType` interface. |

---

## Phase 4: Documentation

| Change | File | Details |
|--------|------|---------|
| Project context and file index | `PROJECT_CONTEXT.md` | Complete architecture overview, file-by-file index, key patterns |
| Claude skills | `.claude/skills/*.md` | 5 reusable skill files: fix-spacing, add-component, decompose-module, token-reference, test-checklist |
| Frontend guidelines update | `docs/FRONTEND-GUIDELINES.md` | Updated with `var(--db-*)` token references, CSS load order, design token section |
| Refactor log | `docs/REFACTOR-LOG.md` | This file |

---

## Migration Notes

### What Changed

- All visual values now flow through `var(--db-*)` CSS custom properties defined in `src/styles/tokens.css`
- Inline `<style>` blocks in `taskpane.html` replaced with external `<link>` tags
- The SmartVariables JS monolith is being decomposed into focused modules

### What Did NOT Change

- All `onclick="SmartVariables.xyz()"` handlers remain identical -- no HTML changes needed for the JS decomposition
- The `SmartVariables` namespace and its public API surface are unchanged
- Template JSON structures are unchanged
- Office.js integration is unchanged
- API endpoints and backend contracts are unchanged

### CSS Variable Migration

Before (hardcoded):
```css
background: #8B7355;
color: #333;
padding: 8px 16px;
border-radius: 6px;
box-shadow: 0 1px 3px rgba(0,0,0,0.08);
```

After (tokenized):
```css
background: var(--db-primary-light);
color: var(--db-text);
padding: var(--db-btn-padding);
border-radius: var(--db-radius-md);
box-shadow: var(--db-shadow-sm);
```
