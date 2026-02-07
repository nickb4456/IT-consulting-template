# DraftBridge Gold -- Integration & Consistency QA Report

**Date:** 2026-02-07
**Auditor:** Claude Code (Integration & Consistency)
**Scope:** HTML/JS integration, CSS consistency, TS/JS gap, assets & manifests

## Summary
- **Total issues: 27**
- HTML/JS Integration: 8 issues
- CSS Consistency: 12 issues
- TS/JS Gap: 4 issues
- Assets/Manifest: 3 issues

---

## HTML/JS Integration Issues

### I-1: `showModal()` and `closeModal()` functions are never defined
**Location:** `taskpane.html` lines 1935, 1949, 1985, 2023, 2032
**Description:** The `showPrintSettings()` function (line 1843) builds HTML and calls `showModal('Print Settings', html)`. The `savePrintSettings()` function calls `closeModal()`. The `exportPdfA()` function calls both `closeModal()` and `showModal()`. Neither `showModal` nor `closeModal` is defined anywhere in the inline script or any loaded JS module. This means Print Settings and the PDF/A export instructions will throw a `ReferenceError` at runtime.
**Fix:** Define `showModal(title, bodyHtml)` and `closeModal()` functions, or refactor to use the existing modal pattern (toggling `.hidden` class on a `.modal-overlay` element, as done with `apikey-modal`, `encrypt-modal`, etc.).

### I-2: `smart-variables.css` loaded twice
**Location:** `taskpane.html` line 11 (`<head>`) and line 8852 (before `</body>`)
**Description:** The stylesheet `src/taskpane/smart-variables.css` is included via `<link>` tags in both the `<head>` section and near the closing `</body>` tag. Duplicate loads waste bandwidth and can cause unexpected cascade behavior if the browser processes the second load after JS modifies the DOM.
**Fix:** Remove the duplicate `<link>` at line 8852. The `<head>` inclusion at line 11 is sufficient.

### I-3: `dialog.html` references non-existent `dialog.js`
**Location:** `dialog.html` line 285
**Description:** `<script src="dialog.js"></script>` references a file that does not exist in the project. Functions like `closeDialog()` (called from onclick at line 20) and other dialog logic would fail with a 404 load error.
**Fix:** Create `dialog.js` with the required dialog functions, or remove the script tag if dialog.html is not currently used.

### I-4: Courts database fetch path likely incorrect at runtime
**Location:** `src/taskpane/sv-courts.js` line 19
**Description:** `fetch('../data/courts.json')` resolves relative to the HTML page URL, not the script file location. Since `taskpane.html` is served from the root (e.g., `https://localhost:3000/taskpane.html`), the fetch resolves to `https://localhost:3000/data/courts.json` (going up from root). The actual file is at `src/data/courts.json`, so the correct relative path from the HTML would be `src/data/courts.json`. The same issue exists in `smart-variables.js` line 79.
**Fix:** Change the fetch path to `src/data/courts.json` (relative to HTML root) or use an absolute path.

### I-5: 128 inline `style` attributes in HTML, 61 with hardcoded hex colors
**Location:** Throughout `taskpane.html`
**Description:** The HTML file contains 128 inline `style` attributes. Of those, 61 contain hardcoded hex color values (e.g., `color: #666`, `background: #e3f2fd`, `color: #856404`). These bypass the design token system and will not respond to dark mode changes. Notable locations:
- API Key modal info box (lines 312-314): `background: #e3f2fd`, `color: #1565c0`
- Encryption warning box (lines 348-350): `background: #fff3cd`, `color: #856404`
- OCR processing states (lines 385-398): multiple hardcoded colors
- JS-generated HTML in `validateAndSaveApiKey()` (lines 1544-1602): `color: #c62828`, `color: #1565c0`, `color: #2e7d32`
- JS-generated HTML in `showFixAllModal()` (lines 6103-6253): `color: #22863a`, `color: #cb2431`, etc.
- JS-generated HTML in `renderBlock()` (lines 7278-7430): `color: #999`, `color: #8B7355`
**Fix:** Replace inline color values with CSS custom property references (e.g., `var(--db-text-muted)` instead of `color: #666`), or extract to CSS classes.

### I-6: `showHelpDialog()` function returns dynamically created modal without reuse
**Location:** `taskpane.html` line 4692
**Description:** `showHelpDialog()` creates a modal overlay by generating HTML and appending it to `document.body`. The modal uses inline `onclick="document.getElementById('help-modal').remove()"` and backdrop click `onclick="if(event.target===this)this.remove()"`. While this works, it is inconsistent with all other modals which use the `.modal-overlay.hidden` pattern with dedicated show/hide functions. The help modal is the only one created this way.
**Fix:** Create a static `#help-modal` in the HTML like other modals, with `showHelpDialog()` toggling the `.hidden` class.

### I-7: Two CSS class naming patterns for secondary buttons
**Location:** `src/styles/base.css` line 75 vs `src/components/variables/VariableForm.css` line 149 vs `dialog.css` line 376
**Description:** base.css defines `.btn.secondary` (compound class), while VariableForm.css and dialog.css define `.btn-secondary` (BEM-style hyphenated class). HTML uses `class="btn secondary"` in taskpane.html (matching base.css), while the TSX components use `btn-secondary`. If VariableForm.css were ever loaded in the same page as base.css, the `.btn-secondary` rules would not apply to elements using `class="btn secondary"` and vice versa.
**Fix:** Standardize on one naming convention. Since the taskpane uses `.btn.secondary`, either update VariableForm.css or namespace the component styles.

### I-8: `motion-to-dismiss.json` template file exists but is never loaded
**Location:** `src/templates/motion-to-dismiss.json` (270 lines)
**Description:** This JSON template file exists in `src/templates/` but is never referenced by any JS, TS, or HTML file. The `SmartVariables` system defines its own inline templates in `sv-templates.js` (and `smart-variables.js`). This file is orphaned.
**Fix:** Either integrate the JSON template by loading it in `sv-templates.js`, or remove it if it was superseded by inline template definitions.

---

## CSS Consistency Issues

### C-1: 41 hardcoded `background: white` in taskpane.css (dark mode breakage)
**Location:** `src/styles/taskpane.css` -- 41 occurrences
**Description:** The design tokens system (`tokens.css`) defines `--db-surface: #FFFFFF` for light mode and `--db-surface: #242424` for dark mode. However, `taskpane.css` uses literal `background: white` in 41 places. In dark mode, these will remain white against dark backgrounds, creating unreadable UI. Examples include:
- `.header` (line 14)
- `.main-tabs-container` (line 43)
- `.search-box` (line 110)
- `.filter-tabs` (line 128)
- `.clause` (line 159)
- `.modal` (line 757)
- `.voice-window` (line 908)
- `.fill-vars-modal` (line 1843)
- All form and card backgrounds throughout
**Fix:** Replace all `background: white` with `background: var(--db-surface)`.

### C-2: 18 hardcoded `color: white` in taskpane.css
**Location:** `src/styles/taskpane.css` -- 18 occurrences
**Description:** While many of these are intentional (white text on colored backgrounds like buttons), some appear on elements that could have dark-mode inversions. The literal `white` should be reviewed case-by-case. Button text `color: white` on `var(--db-primary)` backgrounds is acceptable since the dark mode token adjusts the background. However, some occurrences are on modals/overlays where the background is also hardcoded white.
**Fix:** Review each instance. For button/badge text, `white` is fine. For surfaces and cards, use `var(--db-surface)` for background and `var(--db-text)` for text color.

### C-3: 4 hardcoded color values in base.css
**Location:** `src/styles/base.css` lines 30, 60, 76, 170
**Description:**
- Line 30: `.skip-link { color: white }` -- acceptable (on primary background)
- Line 60: `.btn { color: white }` -- acceptable (on primary button)
- Line 76: `.btn.secondary { background: white }` -- dark mode breakage; should be `var(--db-surface)`
- Line 170: `.toast-notification { color: white }` -- acceptable (toast has dark background)
**Fix:** Change line 76 from `background: white` to `background: var(--db-surface)`.

### C-4: `background: white` in RecreatePanel.css (dark mode breakage)
**Location:** `src/taskpane/recreate/RecreatePanel.css` line 95
**Description:** `.target-section select { background: white }` will create a bright white dropdown against a dark background in dark mode.
**Fix:** Change to `background: var(--db-surface)`.

### C-5: z-index stacking order has conflicts
**Location:** Multiple CSS files
**Description:** Current z-index values across the project:
| z-index | Element | File |
|---------|---------|------|
| 100 | `.loading-overlay` pseudo-element | taskpane.css:2609 |
| 1000 | `.modal-overlay` | taskpane.css:750 |
| 2000 | `.voice-window` | taskpane.css:911 |
| 2000 | `.fill-vars-modal .modal-overlay` | taskpane.css:1831 |
| 3000 | `.toast-notification` | base.css:174 |
| 9999 | `.skip-link` | base.css:27 |

The voice window (z-index: 2000) and fill-vars modal overlay (z-index: 2000) share the same z-index value. If the voice window is open and the user opens Fill Variables, they will overlap unpredictably. The voice window should be below modals.
**Fix:** Assign distinct z-index values. Suggested hierarchy: loading-overlay (100) < modals (1000) < voice-window (1500) < fill-vars-modal (2000) < toast (3000) < skip-link (9999). Or define z-index tokens in `tokens.css`.

### C-6: `.btn` class defined in 3 different files with conflicting properties
**Location:** `src/styles/base.css:58`, `src/components/variables/VariableForm.css:139`, `dialog.css:353`
**Description:** Three files define the `.btn` selector with different `padding`, `font-size`, `font-weight`, and `border-radius` values:
- base.css: `padding: var(--db-btn-padding)` (8px 16px), `font-size: var(--db-text-md)` (13px), `border-radius: 5px`
- VariableForm.css: `padding: 10px 20px`, `font-size: 14px`, `font-weight: 600`, `border-radius: var(--db-radius-md)` (6px)
- dialog.css: likely similar but separate

If any two of these files are loaded on the same page, the later one wins, which creates layout inconsistencies.
**Fix:** VariableForm.css should namespace its button (e.g., `.variable-form .btn` or `.vf-btn`). dialog.css is loaded only in dialog.html so is isolated.

### C-7: `.option-row` class defined in 2 files with different styles
**Location:** `src/styles/taskpane.css:632` and `src/taskpane/recreate/RecreatePanel.css:113`
**Description:** Both files define `.option-row` with different `display`, `align-items`, `gap`, and `margin-bottom` values. If `RecreatePanel.css` were loaded in the same page as `taskpane.css`, the later file would override the former.
**Fix:** Namespace RecreatePanel styles (e.g., `.recreate-panel .option-row` or `.recreate-option-row`).

### C-8: `.preview-content` defined in 2 files with different styles
**Location:** `src/taskpane/recreate/RecreatePanel.css:224` and `dialog.css:285`
**Description:** Both define `.preview-content` with different styling. While currently isolated (RecreatePanel is TSX-only, dialog.css is dialog-only), this is a collision waiting to happen if the component is ever integrated.
**Fix:** Namespace with a parent selector (e.g., `.recreate-panel .preview-content`).

### C-9: `.preview-toggle` defined in 2 files
**Location:** `src/styles/taskpane.css:1697` and `src/components/variables/AttorneyInput.css:165`
**Description:** Both define `.preview-toggle` differently. The taskpane version has margin/text-align styles; the AttorneyInput version has width:100%, padding, and button-like styling.
**Fix:** Namespace component-specific selectors.

### C-10: `.preview-label` defined in 2 files
**Location:** `src/styles/taskpane.css:377` and `src/components/variables/ContactInput.css:161`
**Description:** Both define `.preview-label` with different font-size, font-weight, and color values. Collision risk if both files are loaded together.
**Fix:** Namespace component-specific selectors.

### C-11: No dark mode overrides in any CSS file except tokens.css
**Location:** All CSS files except `src/styles/tokens.css`
**Description:** Only `tokens.css` contains a `@media (prefers-color-scheme: dark)` block. This means the dark mode token overrides will change CSS variable values, but any hardcoded color values (the 41 `background: white` in taskpane.css, the `background: white` in RecreatePanel.css, the `background: white` in base.css, etc.) will not respond. The dark mode experience will be severely broken with white cards on dark backgrounds.
**Fix:** Eliminate all hardcoded `white`/`#FFFFFF` references in CSS files in favor of `var(--db-surface)`. This is the #1 CSS consistency fix needed.

### C-12: `.header-actions` and `.help-btn` used in HTML but undefined in CSS
**Location:** `taskpane.html` lines 17, 19
**Description:** The header contains `<div class="header-actions">` and `<button class="help-btn">`. Neither `.header-actions` nor `.help-btn` is defined in any CSS file (tokens.css, base.css, taskpane.css, or smart-variables.css). The `header-actions` div wraps the Voice and Help buttons; without CSS, it uses default block layout instead of the likely intended flex row.
**Fix:** Add `.header-actions` and `.help-btn` styles to `taskpane.css` with appropriate flex layout and button styling.

---

## TypeScript / Vanilla JS Gap

### T-1: All TypeScript services are unreachable from the vanilla JS layer
**Location:** `src/services/index.ts`, all `src/services/*.ts` files
**Description:** The following TypeScript services are exported and well-defined but never imported, compiled, or referenced by any vanilla JS code or HTML:
- `VariableEngine` / `createVariableEngine` (variableEngine.ts)
- `processCascades` / `processBatchChanges` (cascadeEngine.ts)
- `deriveContactFields` / `derivePartyFields` / `deriveAttorneyFields` (contactHandler.ts)
- `UserProfileService` / `getUserProfileService` (userProfileService.ts)
- `TemplateRenderer` / `getTemplateRenderer` (templateRenderer.ts)
- `CourtService` exports (courtService.ts)
- `DocumentDetector` exports (documentDetector.ts)
- `RecreateService` exports (recreateService.ts)

The taskpane.html loads vanilla JS files (`sv-*.js`) that implement their own versions of these services directly on the `SmartVariables` object. There is no build step (Webpack, Vite, tsc) configured in the project to compile TS to JS.
**Fix:** Either set up a TypeScript build pipeline to compile and bundle the TS services, or acknowledge these as design-phase artifacts. The vanilla JS modules are the runtime implementation.

### T-2: All React (TSX) components are unintegrated
**Location:** `src/components/variables/*.tsx`, `src/taskpane/recreate/RecreatePanel.tsx`
**Description:** Six React components exist:
- `VariableForm.tsx` / `VariableInput.tsx`
- `ContactInput.tsx` / `AttorneyInput.tsx` / `PartyInput.tsx`
- `RecreatePanel.tsx`

None are loaded, compiled, or rendered anywhere. React is not included as a dependency or loaded via `<script>`. The taskpane.html does not mount any React root. The `sv-form-renderer.js` module provides equivalent vanilla JS rendering via `innerHTML` string templates.
**Fix:** If React migration is planned, set up a bundler. If not, these files are design-phase artifacts and should be moved to `docs/` or removed to avoid confusion.

### T-3: Component CSS files are orphaned (only imported by unintegrated TSX)
**Location:** `src/components/variables/ContactInput.css`, `AttorneyInput.css`, `PartyInput.css`, `VariableInput.css`, `VariableForm.css`, `src/taskpane/recreate/RecreatePanel.css`
**Description:** These 6 CSS files are only imported by their companion TSX files via `import './X.css'` (a bundler pattern). Since the TSX components are never compiled or loaded, these CSS files are never applied to any rendered HTML. The `sv-form-renderer.js` vanilla JS module generates its own HTML using CSS classes from `smart-variables.css` and inline styles.
**Fix:** If the CSS classes are desired for the vanilla JS renderers, add `<link>` tags for them in `taskpane.html`. Otherwise, move them alongside the TSX files as design artifacts.

### T-4: TypeScript type definitions do not match vanilla JS runtime objects
**Location:** `src/types/variables.ts` vs `src/taskpane/sv-state.js`, `sv-form-renderer.js`
**Description:** The TypeScript type system defines strict interfaces (e.g., `Contact` with `id`, `prefix`, `firstName`, `middleName`, `lastName`, etc.; `Party extends Contact` with `role`, `isEntity`, `represented`, `counselId`; `Attorney extends Contact` with `barNumber`, `barState`, `firmName`, etc.). The vanilla JS runtime (`SmartVariables`) uses simpler object shapes:
- Contacts in localStorage have `id`, `firstName`, `lastName`, `company`, `email`, `street1`, `city`, `state`, `zip` -- missing `prefix`, `middleName`, `suffix`, `title`, `fax`, `phone`, `address.street2`, `address.country`
- Parties in JS use `firstName`, `lastName`, `company`, `isEntity` -- missing `role` (set dynamically), `entityType`, `aliasNames`, `represented`, `counselId`
- The `TemplateDefinition` type requires `components`, `body`, `version`, `createdAt`, `updatedAt`, `createdBy` -- the JS templates have none of these fields

These type definitions describe a future API contract, not the current runtime shape.
**Fix:** Add a `docs/TYPE-MAPPING.md` noting that TS types are forward-looking API contracts. Alternatively, create simplified types matching the current vanilla JS shapes.

---

## Assets & Manifest

### A-1: Manifest comments reference non-existent `taskpane.js` and `icons/` folder
**Location:** `manifest.xml` lines 20-22, `manifest-aibridges.xml` lines 20-22
**Description:** The XML comments state:
```
- taskpane.html, taskpane.js, taskpane.css (main add-in)
- dialog.html, dialog.js, dialog.css (form dialog windows)
- icons/ folder
```
However:
- `taskpane.js` does not exist (all JS is inline in taskpane.html or in `src/taskpane/`)
- `dialog.js` does not exist
- The `icons/` folder does not exist; icons are in `assets/`
The comments are misleading for developers deploying the add-in.
**Fix:** Update the comments to reflect the actual file structure.

### A-2: Both manifests use `icon-64.png` for `HighResolutionIconUrl` but `Icon.80x80` for ribbon icons
**Location:** `manifest.xml` lines 47-48, 302-304; `manifest-aibridges.xml` same
**Description:** The manifest defines `HighResolutionIconUrl` pointing to `icon-64.png`, and `bt:Image` resources at sizes 16, 32, and 80 pointing to `icon-16.png`, `icon-32.png`, and `icon-80.png`. All four files exist (`assets/icon-16.png` through `assets/icon-80.png`). There is no issue with missing files, but the asymmetry (64px for high-res URL, 80px for ribbon) may be intentional or a sizing gap. Office ribbon guidelines suggest 16, 32, and 80px icons.
**Fix:** This is a minor observation. No fix needed unless a 64px icon is specifically required for the ribbon.

### A-3: Manifest `Taskpane.Url` uses `localhost:3000` (dev only)
**Location:** `manifest.xml` line 307
**Description:** The localhost manifest correctly points to `https://localhost:3000/taskpane.html`. The production manifest (`manifest-aibridges.xml`) correctly points to `https://aibridges.org/draftbridges/dist/taskpane.html`. Both manifests reference all required icon assets. However, the production URL references a `/dist/` path, implying a build step that doesn't appear to exist in the project.
**Fix:** Verify the deployment pipeline creates the `/dist/` directory with all required files before publishing with `manifest-aibridges.xml`.

---

## Appendix: Z-Index Registry

| z-index | Selector | File | Line |
|---------|----------|------|------|
| 100 | `.loading-overlay::before` (pseudo) | taskpane.css | 2609 |
| 1000 | `.modal-overlay` | taskpane.css | 750 |
| 2000 | `.voice-window` | taskpane.css | 911 |
| 2000 | `.fill-vars-modal .modal-overlay` (inner) | taskpane.css | 1831 |
| 3000 | `.toast-notification` | base.css | 174 |
| 9999 | `.skip-link` | base.css | 27 |

## Appendix: Hardcoded Color Count by File

| File | `background: white` | `color: white` | Inline `#hex` colors | Total |
|------|---------------------|----------------|---------------------|-------|
| taskpane.css | 41 | 18 | 0 | 59 |
| base.css | 1 | 3 | 0 | 4 |
| RecreatePanel.css | 1 | 0 | 0 | 1 |
| smart-variables.css | 0 | 1 | 0 | 1 |
| dialog.css | 0 | 3 | 0 | 3 |
| taskpane.html (inline) | 0 | 0 | 61 | 61 |
| **Total** | **43** | **25** | **61** | **129** |

## Appendix: Unintegrated Files Inventory

| File | Type | Status |
|------|------|--------|
| `src/components/variables/VariableForm.tsx` | React | Not compiled, not loaded |
| `src/components/variables/VariableInput.tsx` | React | Not compiled, not loaded |
| `src/components/variables/ContactInput.tsx` | React | Not compiled, not loaded |
| `src/components/variables/AttorneyInput.tsx` | React | Not compiled, not loaded |
| `src/components/variables/PartyInput.tsx` | React | Not compiled, not loaded |
| `src/components/variables/index.ts` | TS barrel | Not compiled |
| `src/taskpane/recreate/RecreatePanel.tsx` | React | Not compiled, not loaded |
| `src/taskpane/recreate/index.ts` | TS barrel | Not compiled |
| `src/services/*.ts` (8 files) | TS services | Not compiled, not used |
| `src/types/*.ts` (4 files) | TS types | Not compiled, design-only |
| `src/__tests__/variableEngine.test.ts` | TS test | No test runner configured |
| `src/components/variables/VariableForm.css` | CSS | Only imported by unused TSX |
| `src/components/variables/VariableInput.css` | CSS | Only imported by unused TSX |
| `src/components/variables/ContactInput.css` | CSS | Only imported by unused TSX |
| `src/components/variables/AttorneyInput.css` | CSS | Only imported by unused TSX |
| `src/components/variables/PartyInput.css` | CSS | Only imported by unused TSX |
| `src/taskpane/recreate/RecreatePanel.css` | CSS | Only imported by unused TSX |
| `src/templates/motion-to-dismiss.json` | JSON | Never referenced or loaded |
| `src/taskpane/smart-variables.js` | JS monolith | Commented out (line 8863), superseded by sv-*.js modules |
