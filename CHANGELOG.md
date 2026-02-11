# DraftBridge Gold — Refactor Change Log

## 2026-02-10 — 2-Loop Agent Sweep (Multilevel Numbering + Code Quality)

### Summary
3-agent recursive team with 2 sub-agents each performed 2-loop sweep:
- **Loop 1**: Scanner + Implementer + QA
- **Loop 2**: Re-scan + Polish + Final QA

### Phase 7: Multilevel Numbering Implementation

| # | Change | File | Status |
|---|--------|------|--------|
| 7.1 | Created OOXML-compliant numbering service | `src/services/numberingService.ts` (855 lines) | Done |
| 7.2 | Created numbering type definitions | `src/types/numbering.ts` (124 lines) | Done |
| 7.3 | Created comprehensive test suite | `src/__tests__/numberingService.test.ts` (605 lines) | Done |
| 7.4 | Added numbering helpers to template renderer | `src/services/templateRenderer.ts` | Done |

### Numbering Features Implemented

| Feature | Description |
|---------|-------------|
| 6 Presets | legal, outline, numbered, bulleted, hybrid, mixedLegalOutline |
| OOXML Compliance | Valid abstractNum/num/lvl structure with proper namespaces |
| 9 Levels | lvl indices 0-8 per OOXML spec |
| lvlRestart | Sub-levels restart correctly |
| pStyle Links | Heading1-6 linked for first 6 levels |
| XML Escaping | &, <, >, ", ' properly escaped |
| Level Overrides | Restart at any level |
| Continuation | Uninterrupted numbering instances |

### Template Renderer Helpers Added

| Helper | Description |
|--------|-------------|
| `{{#multilevel type="legal"}}` | Block helper for multilevel content |
| `{{#level N}}` | Mark content at specific level (1-9) |
| `{{#numbered}}` / `{{#bulleted}}` | Simple list helpers |
| `{{numbering}}` | Inline number reference |

### Built-in Partials

| Partial | Use Case |
|---------|----------|
| `legal-outline` | Briefs, contracts |
| `outline-format` | I, A, 1, a, i format |
| `contract-sections` | ARTICLE format |

### Verification Results

| Metric | Count |
|--------|-------|
| Test cases | 56 |
| TypeScript files checked | 25 |
| Regressions found | 0 |
| OOXML compliance checks | 9/9 PASS |

### Full Report
See `SWEEP-REPORT.md` for complete details.

---

## 2026-02-06 — Design & Code Refactor

### Phase 1: Foundation — Design Tokens & CSS Architecture

| # | Change | File | Status |
|---|--------|------|--------|
| 1.1 | Created canonical design token file | `src/styles/tokens.css` | Done |
| 1.2 | Created shared base styles (reset, buttons, inputs, toasts) | `src/styles/base.css` | Done |
| 1.3 | Created missing dialog.css referenced by dialog.html | `dialog.css` | Done |

### Phase 2: Design Consistency — Apply Tokens Everywhere

| # | Change | File | Status |
|---|--------|------|--------|
| 2.1 | Extracted ~2700 lines of inline CSS to external file | `src/styles/taskpane.css` | Done |
| 2.1b | Replaced inline `<style>` with `<link>` tags | `taskpane.html` | Done |
| 2.2 | Token replacement across all CSS (colors, spacing, radius) | 8 CSS files | Done |
| 2.3 | Spacing standardized to 4px grid | Multiple | Done |
| 2.4 | RecreatePanel palette changed from Fluent blue to DraftBridge brown | `RecreatePanel.css` | Done |
| 2.5 | Plaintiff/defendant colors tokenized | `smart-variables.css`, `PartyInput.css` | Done |
| 2.6 | Gradient stops and warning colors tokenized | `taskpane.css`, `VariableForm.css` | Done |

### Phase 3: Code Refactor — Break the Monolith

| # | Change | File | Status |
|---|--------|------|--------|
| 3.1 | Decompose smart-variables.js into 8 modules | `src/taskpane/sv-*.js` | In Progress |
| 3.2a | Non-null assertion → null check with error throw | `templateRenderer.ts:203` | Done |
| 3.2b | Fire-and-forget API → lastSyncError tracking | `userProfileService.ts:76` | Done |
| 3.2c | O(n²) sort → cached processing order | `cascadeEngine.ts:391` | Done |
| 3.2d | Regex in loop → regexCache Map | `variableEngine.ts:380` | Done |
| 3.2e | Unbounded cache → 50-entry LRU eviction | `templateRenderer.ts:196` | Done |
| 3.2f | Silent catch → error logging | `recreateService.ts:415,429` | Done |
| 3.3 | Extract formatAddressLines() shared helper | `contactHandler.ts` | Done |
| 3.4 | Rename DocumentType → RecreateDocumentType | `recreate.ts`, `documentDetector.ts`, `recreateService.ts` | Done |

### Phase 4: Project Index & Skills

| # | Change | File | Status |
|---|--------|------|--------|
| 4.1 | Create project index | `PROJECT_CONTEXT.md` | Done |
| 4.2 | Create reusable Claude skills (5 files) | `.claude/skills/*.md` | Done |
| 4.3 | Update frontend guidelines with tokens | `docs/FRONTEND-GUIDELINES.md` | Done |
| 4.4 | Create refactor documentation | `docs/REFACTOR-LOG.md` | Done |

### Phase 5: Security Hardening

| # | Change | File | Status |
|---|--------|------|--------|
| 5.1 | XSS: Added `safeId()` validator — regex allowlist for all ID interpolations | `sv-state.js` | Done |
| 5.2 | XSS: Added `escapeAttr()` for JS string contexts in HTML attributes | `sv-state.js` | Done |
| 5.3 | XSS: Applied `safeId()` to 28+ onclick/onchange handlers | `sv-form-renderer.js` | Done |
| 5.4 | XSS: Applied `safeId()` to 6 onclick handlers | `sv-profile.js` | Done |
| 5.5 | XSS: Applied `safeId()` to 4 onclick/onchange handlers | `sv-templates.js` | Done |
| 5.6 | Prototype pollution: Block `__proto__`, `constructor`, `prototype` in path traversal | `cascadeEngine.ts` | Done |
| 5.7 | ReDoS prevention: 200-char limit + nested quantifier rejection | `variableEngine.ts` | Done |
| 5.8 | Regex cache: Upgraded FIFO → LRU (delete+reinsert on hit) | `variableEngine.ts` | Done |
| 5.9 | Word.run timeout: 10s `Promise.race` wrapper returning `{success, data, error}` | `recreateService.ts` | Done |
| 5.10 | ID generation: `crypto.randomUUID()` with Date.now() fallback | `sv-contacts.js`, `sv-validation.js` | Done |
| 5.11 | Profile validation: JSON schema check on localStorage reads | `sv-state.js` | Done |
| 5.12 | Cleanup: `SmartVariables.destroy()` method (timers, state, DOM) | `sv-state.js` | Done |
| 5.13 | Cleanup: `dispose()` + `disposeUserProfileService()` export | `userProfileService.ts` | Done |
| 5.14 | Documentation: localStorage encryption TODO markers | `sv-state.js`, `userProfileService.ts` | Done |

### Phase 6: UI & Accessibility

| # | Change | File | Status |
|---|--------|------|--------|
| 6.1 | Dark mode: `@media (prefers-color-scheme: dark)` overrides for all tokens | `tokens.css` | Done |
| 6.2 | Icon size tokens (`--db-icon-sm/md/lg/xl`) | `tokens.css` | Done |
| 6.3 | Skip-link CSS for keyboard navigation | `base.css` | Done |
| 6.4 | `:focus-visible` styles (keyboard-only focus rings) | `base.css` | Done |
| 6.5 | `@media (prefers-reduced-motion: reduce)` | `base.css` | Done |
| 6.6 | Loading state utilities (`.loading-spinner`, `.skeleton-line`) | `base.css` | Done |
| 6.7 | 18 section comment markers for CSS navigation | `taskpane.css` | Done |
| 6.8 | Responsive breakpoints: 360px, 420px, 600px | `taskpane.css` | Done |
| 6.9 | Loading overlay + panel loading utilities | `taskpane.css` | Done |
| 6.10 | ARIA loading/focus/required CSS states | `smart-variables.css` | Done |
| 6.11 | `role="listbox"` + `aria-selected` on template grids/cards | `sv-form-renderer.js` | Done |
| 6.12 | `role="form"` + `aria-label` on form containers | `sv-form-renderer.js`, `sv-profile.js` | Done |
| 6.13 | `aria-required` on all input types (text, select, textarea, date) | `sv-form-renderer.js` | Done |
| 6.14 | `aria-expanded` on collapsible group headers | `sv-form-renderer.js`, `sv-profile.js` | Done |
| 6.15 | `aria-label` on party add/remove buttons | `sv-form-renderer.js` | Done |
| 6.16 | `role="listbox"` + `role="option"` on contact picker | `sv-form-renderer.js` | Done |
| 6.17 | Skip-navigation `<a>` link added | `taskpane.html` | Done |
| 6.18 | `<div class="header">` → `<header role="banner">` | `taskpane.html` | Done |
| 6.19 | Tab container → `<nav role="tablist">` | `taskpane.html` | Done |
| 6.20 | Panel wrapper → `<main id="main-content" role="main">` | `taskpane.html` | Done |
| 6.21 | `role="tabpanel"` on all 5 panel divs | `taskpane.html` | Done |
| 6.22 | `aria-label` on all main tab buttons | `taskpane.html` | Done |
| 6.23 | Dedup documentation comments on 3 component CSS files | `ContactInput.css`, `AttorneyInput.css`, `PartyInput.css` | Done |
