# DraftBridge Gold -- Project Context & File Index

> Last updated: 2026-02-06
> Comprehensive architecture overview and file index

---

## Architecture

- **Platform:** Microsoft Word Add-in (Office.js)
- **Frontend:** Vanilla JS in `taskpane.html` (no build step for the taskpane layer)
- **Service layer:** TypeScript (requires build/transpile)
- **Template engine:** Handlebars for document generation
- **API:** AWS API Gateway + Lambda (`https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod`)
- **Design system:** CSS custom properties (`var(--db-*)`) defined in `src/styles/tokens.css`

---

## File Structure

### Root

| File | Purpose |
|------|---------|
| `taskpane.html` | Main add-in UI -- loads all CSS and JS modules, contains inline application logic (~8850 lines) |
| `dialog.html` | Pop-out form dialog for template generation (loaded via `Office.context.ui.displayDialogAsync`) |
| `dialog.css` | Styles for the pop-out dialog |
| `manifest.xml` | Office Add-in manifest (production) |
| `manifest-aibridges.xml` | Alternate manifest (aibridges variant) |
| `CHANGELOG.md` | Refactor change log with phase tracking |
| `CHECKPOINTS.md` | Checkpoint notes |
| `TODO.md` | Outstanding tasks |
| `OVERNIGHT-CHANGELOG.md` | Overnight session change log |

### `assets/`

| File | Purpose |
|------|---------|
| `icon-16.png` | Add-in icon 16x16 |
| `icon-32.png` | Add-in icon 32x32 |
| `icon-64.png` | Add-in icon 64x64 |
| `icon-80.png` | Add-in icon 80x80 |

### `src/styles/` -- Design System

| File | Purpose |
|------|---------|
| `tokens.css` | **Canonical source** for all design tokens -- colors, spacing, radius, typography, shadows, component tokens, transitions |
| `base.css` | Shared resets, accessibility helpers, universal component patterns (buttons, inputs, toasts) |
| `taskpane.css` | Taskpane-specific styles (~2700 lines extracted from inline `<style>` blocks) |

**CSS load order in `taskpane.html`:**
```
tokens.css -> base.css -> taskpane.css -> smart-variables.css
```

### `src/taskpane/` -- Smart Variables (Vanilla JS)

| File | Lines | Purpose |
|------|-------|---------|
| `smart-variables.js` | 2935 | Original monolith (backup/reference -- still loaded as primary) |
| `sv-state.js` | 84 | `SmartVariables` namespace definition + core state properties |
| `sv-courts.js` | 70 | Court selection logic |
| `sv-contacts.js` | 111 | Contact picker and management |
| `sv-templates.js` | 501 | Template loading, rendering, and selection |
| `sv-profile.js` | 285 | User profile management (load/save from localStorage) |
| `smart-variables.css` | ~700 | Smart Variables panel styles |

**Module pattern:** Each `sv-*.js` file uses `Object.assign(SmartVariables, { ... })` to extend the namespace.

**Script load order (dependency chain):**
```
sv-state -> sv-courts -> sv-contacts -> sv-templates -> sv-profile
-> sv-form-renderer -> sv-validation -> sv-document-generator
```

### `src/taskpane/recreate/` -- Recreate Panel

| File | Purpose |
|------|---------|
| `RecreatePanel.tsx` | Recreate panel React/TSX component |
| `RecreatePanel.css` | Recreate panel styles (uses DraftBridge brown palette, not Fluent blue) |
| `index.ts` | Module barrel export |

### `src/components/variables/` -- Variable Input Components (TypeScript/TSX)

| File | Purpose |
|------|---------|
| `VariableInput.tsx` | Base variable input component |
| `VariableInput.css` | Variable input styles |
| `VariableForm.tsx` | Form container for variable groups |
| `VariableForm.css` | Variable form styles |
| `ContactInput.tsx` | Contact picker input |
| `ContactInput.css` | Contact input styles |
| `AttorneyInput.tsx` | Attorney-specific input with bar number, firm |
| `AttorneyInput.css` | Attorney input styles |
| `PartyInput.tsx` | Plaintiff/defendant party input |
| `PartyInput.css` | Party input styles (uses `var(--db-plaintiff)` / `var(--db-defendant)` semantic tokens) |
| `index.ts` | Barrel export for all components |

### `src/services/` -- TypeScript Service Layer

| File | Purpose |
|------|---------|
| `templateRenderer.ts` | Handlebars template compilation and rendering; 50-entry LRU cache |
| `variableEngine.ts` | Variable extraction, substitution, regex caching |
| `cascadeEngine.ts` | Variable dependency resolution; cached processing order (not O(n^2)) |
| `contactHandler.ts` | Contact CRUD, `formatAddressLines()` shared helper |
| `userProfileService.ts` | Profile persistence, `lastSyncError` tracking |
| `courtService.ts` | Court database queries |
| `documentDetector.ts` | Detect document type from Word content |
| `recreateService.ts` | Recreate/transform existing documents; error logging on catch |
| `index.ts` | Barrel export for all services |

### `src/types/` -- TypeScript Type Definitions

| File | Purpose |
|------|---------|
| `variables.ts` | Variable, VariableGroup, TemplateDefinition types |
| `recreate.ts` | `RecreateDocumentType` (renamed from `DocumentType` to avoid collision), recreate config types |
| `courts.ts` | Court, CourtLevel, Jurisdiction types |
| `index.ts` | Barrel export |

### `src/data/`

| File | Purpose |
|------|---------|
| `courts.json` | Court database (names, addresses, filing requirements) |

### `src/templates/`

| File | Purpose |
|------|---------|
| `motion-to-dismiss.json` | Motion to Dismiss template definition |

### `src/__tests__/`

| File | Purpose |
|------|---------|
| `variableEngine.test.ts` | Unit tests for variable engine |

### `docs/` -- Documentation (43 files)

| File | Purpose |
|------|---------|
| `FRONTEND-GUIDELINES.md` | Design system specification |
| `SMART-VARIABLES-SPEC.md` | Smart Variables feature specification |
| `RECREATE-SPEC.md` | Recreate feature specification |
| `APP-FLOW.md` | Application flow documentation |
| `BACKEND-STRUCTURE.md` | Backend architecture |
| `TECH-STACK.md` | Technology stack overview |
| `PRODUCT.md` | Product requirements |
| `IMPLEMENTATION-PLAN.md` | Implementation roadmap |
| `PROGRESS.md` | Progress tracking |
| `TEMPLATES.md` | Template system documentation |
| `LIBRARY.md` | Clause library documentation |
| `NUMBERING.md` | Numbering system documentation |
| `NUMBERING-RESEARCH.md` | Research on legal numbering formats |
| `EFILING.md` | E-filing integration spec |
| `VOICE.md` | Voice control documentation |
| `VOICE-CONTROL-BRAINSTORM.md` | Voice control ideation |
| `SKILL.md` | Skill definitions |
| `TASKPANE-MINIMAL.md` | Minimal taskpane spec |
| `DESIGN-EXPLORATION.md` | Design exploration notes |
| `DOT-PREMIUM-POLISH.md` | Premium polish details |
| `DOT-QA-REPORT.md` | QA report |
| `RIBBON-TAB-RESEARCH.md` | Ribbon tab research |
| `CURSOR-INDICATOR-OPINION.md` | Cursor indicator notes |
| `MAMA-SHIPPING-STRATEGY.md` | Shipping strategy |
| `MARKET-RESEARCH-MIDSIZE-FIRMS.md` | Market research |
| `ZAPIER-INTEGRATION-SPEC.md` | Zapier integration spec |
| `OCR-API.md` | OCR API documentation |
| `OVERNIGHT-RESEARCH-LOG.md` | Overnight research notes |
| `schema.json` | JSON schema for templates |
| `design-alternatives.css` | Design alternative explorations |
| Security docs: `SECURITY-REPORT.html`, `HOW-HACKERS-HACK.html`, `SQL-INJECTION-GUIDE.html`, `XSS-*` files | Security research and testing |

---

## Key Patterns

### CSS: Design Token System

All visual values reference `var(--db-*)` tokens from `src/styles/tokens.css`. No hardcoded hex values should appear outside `tokens.css`.

```css
/* Correct */
background: var(--db-surface);
color: var(--db-text);
padding: var(--db-space-lg);
border-radius: var(--db-radius-md);

/* Incorrect */
background: #ffffff;
color: #333;
padding: 16px;
border-radius: 6px;
```

### JS: SmartVariables Namespace

All Smart Variables functionality lives under the `SmartVariables` global object. Modules extend it with `Object.assign()`:

```javascript
// In sv-state.js -- defines the namespace
const SmartVariables = { state: { ... }, ... };

// In sv-courts.js -- extends it
Object.assign(SmartVariables, {
    loadCourts() { ... },
    selectCourt(id) { ... }
});
```

### HTML: onclick Handlers

All user interactions use inline `onclick="SmartVariables.methodName()"` handlers. These must remain stable when refactoring JS modules.

### TypeScript: Service + Type Separation

Services in `src/services/` consume types from `src/types/`. Components in `src/components/` import from both.
