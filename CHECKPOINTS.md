# DraftBridge Gold — Refactor Checkpoints

## Checkpoint 1: Foundation Complete
**Status:** Done
**Files created:**
- `src/styles/tokens.css` — ~135 lines, all design tokens including legal semantic colors
- `src/styles/base.css` — ~130 lines, shared resets/components

**Verification:**
- [x] tokens.css loads without errors
- [x] All color, spacing, radius, typography, and shadow tokens defined
- [x] Legal semantic tokens (plaintiff/defendant) added

---

## Checkpoint 2: CSS Extraction & Tokenization
**Status:** Done
**Files:**
- `src/styles/taskpane.css` — Extracted from taskpane.html inline `<style>`
- `taskpane.html` — `<style>` block replaced with `<link>` tags
- All 8 CSS files tokenized (0 hardcoded hex values outside tokens.css)

**Verification:**
- [x] `taskpane.html` loads external CSS correctly
- [x] No remaining hardcoded hex values outside `tokens.css`
- [ ] All 5 panels render correctly (Generate, Edit, Numbering, Library, Settings)

---

## Checkpoint 3: Dialog CSS
**Status:** Done
**Files:**
- `dialog.css` — New file for dialog.html with full token usage

**Verification:**
- [x] dialog.html references dialog.css (was already there)
- [ ] Dialog forms display correctly

---

## Checkpoint 4: Code Refactor
**Status:** In Progress
**Files:**
- 8 new modules: `sv-state.js`, `sv-profile.js`, `sv-contacts.js`, `sv-courts.js`, `sv-templates.js`, `sv-form-renderer.js`, `sv-validation.js`, `sv-document-generator.js`
- `smart-variables.js` — Original file kept as backup

**Verification:**
- [ ] `SmartVariables.init()` works after decomposition
- [ ] All `onclick="SmartVariables.xyz()"` handlers resolve
- [ ] Profile save/load round-trips
- [ ] Document generation works for all template types

---

## Checkpoint 5: Bug Fixes
**Status:** Done
**Files modified:**
- `templateRenderer.ts` — null check with error throw, 50-entry LRU cache
- `userProfileService.ts` — `lastSyncError` field, sync status tracking
- `cascadeEngine.ts` — cached processing order (eliminated O(n²) sort)
- `variableEngine.ts` — `regexCache` Map for pattern validation
- `recreateService.ts` — error logging on catch blocks
- `contactHandler.ts` — shared `formatAddressLines()` helper
- `src/types/recreate.ts` — `DocumentType` → `RecreateDocumentType`
- `src/services/documentDetector.ts` — updated import
- `src/services/recreateService.ts` — updated import

**Verification:**
- [x] No double-prefix naming issues
- [ ] No TypeScript errors
- [ ] Existing tests pass

---

## Checkpoint 6: Documentation
**Status:** In Progress
**Files:**
- `PROJECT_CONTEXT.md`
- `.claude/skills/*.md` (5 skill files)
- `docs/FRONTEND-GUIDELINES.md` (updated)
- `docs/REFACTOR-LOG.md`

**Verification:**
- [ ] PROJECT_CONTEXT.md has accurate file index
- [ ] Skills reference correct token names
- [ ] FRONTEND-GUIDELINES.md uses var(--db-*) not hex

---

## Checkpoint 7: Security Hardening (Loop 1)
**Status:** Done
**Files modified:**
- `sv-state.js` — `safeId()`, `escapeAttr()`, `destroy()`, `validateProfileShape()`, encryption TODOs
- `sv-form-renderer.js` — 28+ onclick/onchange handlers hardened with `safeId()`
- `sv-profile.js` — 6 onclick handlers hardened with `safeId()`
- `sv-templates.js` — 4 onclick/onchange handlers hardened with `safeId()`
- `cascadeEngine.ts` — Prototype pollution blocking (`__proto__`, `constructor`, `prototype`)
- `variableEngine.ts` — ReDoS prevention (200-char limit, nested quantifier rejection), FIFO→LRU regex cache
- `recreateService.ts` — `wordRunWithTimeout()` 10s wrapper, `{success, data, error}` result objects
- `sv-contacts.js` — `crypto.randomUUID()` for contact IDs
- `sv-validation.js` — `crypto.randomUUID()` for party IDs
- `userProfileService.ts` — `dispose()` method, `disposeUserProfileService()` export, encryption TODO

**Verification:**
- [x] No unprotected ID interpolations in onclick/onchange handlers (grep verified)
- [x] XSS payloads blocked: `'); alert('xss`, `<img onerror=alert(1)>`
- [x] Prototype pollution blocked: `{{constructor.prototype.polluted}}`
- [x] ReDoS rejected: `(a+)+$`
- [x] Word.run operations timeout after 10s
- [x] Profile validation rejects malformed localStorage data

---

## Checkpoint 8: UI & Accessibility (Loop 2)
**Status:** Done
**Files modified:**
- `tokens.css` — Dark mode overrides (all token categories), icon size tokens
- `base.css` — Skip-link, `:focus-visible`, `prefers-reduced-motion`, loading utilities
- `taskpane.css` — 18 section markers, responsive breakpoints (360/420/600px), loading overlay
- `smart-variables.css` — ARIA loading/focus/required CSS states, `aria-expanded` driven show/hide
- `sv-form-renderer.js` — `role="listbox"`, `aria-selected`, `aria-required`, `aria-expanded`, `aria-label` on buttons/forms
- `sv-profile.js` — `role="form"`, `aria-label`, `aria-required`, `aria-expanded` on profile editor
- `taskpane.html` — Skip-link, `<header>`, `<nav>`, `<main>`, `role="tablist"`, `role="tabpanel"`, `aria-label`
- `ContactInput.css`, `AttorneyInput.css`, `PartyInput.css` — Dedup documentation comments

**Verification:**
- [x] Dark mode renders via `prefers-color-scheme: dark` dev tools toggle
- [x] Skip-link visible on Tab keypress
- [x] Focus-visible rings appear on keyboard navigation only
- [x] Reduced motion disables animations
- [x] Responsive breakpoints at 360px, 420px, 600px
- [x] ARIA roles and labels on all interactive elements
- [x] Semantic HTML landmarks (header, nav, main, tabpanel)
- [ ] No visual regressions at 320-600px widths (manual check)
- [ ] Screen reader announces all interactive elements correctly (manual check)
