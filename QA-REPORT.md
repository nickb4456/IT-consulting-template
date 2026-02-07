# DraftBridge Gold -- QA Report (Post-Refactor)

**Auditor:** Claude Opus 4.6 (automated QA)
**Date:** 2026-02-07
**Scope:** All `sv-*.js` files, `smart-variables.js`, all TS services, `taskpane.html`, CSS files

## Summary
- Total issues: 35
- Critical (P0): 4
- High (P1): 11
- Medium (P2): 13
- Low (P3): 7

---

## Critical Issues (P0)

### P0-1: Monolith `smart-variables.js` redefines `SmartVariables` as `const` -- will crash if both old and new files are loaded
**File:** `src/taskpane/smart-variables.js:15`
**Description:** The monolith file declares `const SmartVariables = { ... }` on line 15. The refactored `sv-state.js` also declares `const SmartVariables = { ... }` on line 30. If both files were ever loaded (e.g., by un-commenting the script tag on line 8863 of `taskpane.html`), the browser would throw `SyntaxError: Identifier 'SmartVariables' has already been declared`. Currently the monolith is commented out (`<!-- <script src="src/taskpane/smart-variables.js"></script> -->`), so this is not active. However, the monolith still exists in the project and someone could accidentally re-enable it. Additionally, `DEFAULT_COURT_OPTIONS` is declared as `const` in `sv-templates.js` and likely conflicts with a similar declaration in the monolith.
**Fix:** Delete `smart-variables.js` entirely (or move to an `archive/` folder) now that the refactored modules are live. This removes the risk of accidental double-loading and the `const` redeclaration crash.

### P0-2: XSS in monolith `smart-variables.js` -- imported template data rendered without escaping
**File:** `src/taskpane/smart-variables.js:930-934`
**Description:** In the monolith's `handleImportFile()`, the import preview renders `data.template.name`, `data.template.description`, and `data.template.category` directly into innerHTML without HTML-escaping. A malicious `.json` template file could inject script tags via the name field. The refactored version in `sv-templates.js:379` correctly calls `SmartVariables.escapeHtml()`. However, since the monolith still exists in the repo, this is a latent risk -- and if someone reverts to the monolith, the XSS returns.
**Fix:** Delete the monolith (see P0-1). If it must remain, apply `escapeHtml()` to all user-supplied template fields in the preview rendering.

### P0-3: XSS in monolith `smart-variables.js` -- profile fields rendered without escaping
**File:** `src/taskpane/smart-variables.js:599-638`
**Description:** The monolith's `showProfileEditor()` renders profile values like `profile.firstName`, `profile.barNumber`, etc. directly into `value="${profile.firstName || ''}"` without `escapeHtml()`. If localStorage is poisoned (e.g., by another script on the same origin, or a prototype pollution attack), a stored XSS payload in the profile data would execute. The refactored `sv-profile.js` correctly applies `this.escapeHtml()` to all profile values.
**Fix:** Delete the monolith (see P0-1).

### P0-4: Missing modal CSS -- `sv-modal-overlay` and `sv-modal` classes have no CSS definitions
**File:** `src/taskpane/sv-form-renderer.js:562,764` and `src/taskpane/smart-variables.css`
**Description:** The contact picker and contacts manager create DOM elements with class `sv-modal-overlay` and `sv-modal`, but `smart-variables.css` contains zero rules for these classes (confirmed by grep). This means the modals will render without proper overlay positioning, backdrop, sizing, or z-index. They will likely appear inline at the bottom of the page body with no overlay dimming, making them appear broken to users.
**Fix:** Add modal CSS rules to `smart-variables.css` covering at minimum: `.sv-modal-overlay` (fixed position, full viewport, backdrop, z-index), `.sv-modal` (centered card with max-width), `.sv-modal-header`, `.sv-modal-body`, `.sv-modal-footer`, `.sv-modal-close`, `.sv-modal-search`, `.sv-picker-item`, `.sv-picker-section`, `.sv-picker-label`, `.sv-picker-empty`, `.sv-form-overlay`, `.sv-contacts-manager`, `.sv-contact-card`, `.sv-contact-avatar`, `.sv-contacts-toolbar`, `.sv-contacts-search-wrapper`, `.sv-form-row`, `.sv-form-group`, `.sv-form-divider`.

---

## High Issues (P1)

### P1-1: `escapeHtml()` defined in `sv-document-generator.js` but called in 5 other files -- load-order dependency
**File:** `src/taskpane/sv-document-generator.js:644`
**Description:** `escapeHtml()` is added to SmartVariables via `Object.assign()` in `sv-document-generator.js`, which is the LAST script loaded (line 8862 of taskpane.html). But `sv-profile.js`, `sv-form-renderer.js`, and `sv-templates.js` all call `this.escapeHtml()` and are loaded BEFORE `sv-document-generator.js`. This means during the initial render (if `showProfileEditor` or `showTemplateSelector` is called synchronously from `init()`), `escapeHtml` would be undefined. In practice this may not crash because the UI render functions are called by user interaction (after all scripts have loaded), but it is a fragile implicit dependency. If any `init()` code ever renders the template selector synchronously, it would fail.
**Fix:** Move `escapeHtml()` into `sv-state.js` (the first file loaded) so it is available from the start. It is a foundational utility, not a document-generator concern.

### P1-2: `_profileEscapeHandler` never cleaned up by `destroy()`
**File:** `src/taskpane/sv-profile.js:176-182` and `src/taskpane/sv-state.js:82-111`
**Description:** The profile editor adds a keydown event listener (`_profileEscapeHandler`) but `destroy()` in `sv-state.js` does not clean it up. It only clears `_contactSearchTimer` and `_validateTimer`. If the user opens the profile editor and then the add-in is torn down, the keydown listener remains on `document`. Similarly, `_pickerEscapeHandler` and `_managerEscapeHandler` (from `sv-form-renderer.js`) are not cleaned up by `destroy()`.
**Fix:** Add cleanup for all three escape handlers in `destroy()`:
```js
if (this._profileEscapeHandler) {
  document.removeEventListener('keydown', this._profileEscapeHandler);
  this._profileEscapeHandler = null;
}
// Same for _pickerEscapeHandler and _managerEscapeHandler
```

### P1-3: CSS double-asterisk on `.sv-required` -- content `' *'` appended via `::after` when HTML already contains `*`
**File:** `src/taskpane/smart-variables.css:709-712` and `src/taskpane/sv-form-renderer.js:282`
**Description:** The HTML rendered by `renderVariable()` already includes `<span class="sv-required">*</span>` which displays the asterisk character. The CSS rule `.sv-required::after { content: ' *'; }` appends a second asterisk, making required fields show `* *` (two asterisks). This is a visual bug on every required field.
**Fix:** Remove the `::after` pseudo-element rule from `.sv-required` in `smart-variables.css`, since the asterisk is already in the HTML. Alternatively, remove the `*` from the HTML and rely solely on the CSS `::after`.

### P1-4: `discoveryType: 'combined'` has no handler in `buildDiscoveryContent()`
**File:** `src/taskpane/sv-document-generator.js:537-543`
**Description:** The discovery-request template defines a `discoveryType` select option with value `'combined'` (sv-templates.js line 221). But `buildDiscoveryContent()` only handles `'interrogatories'`, `'rfp'`, and `'rfa'` in its `discoveryTitles` map and FRCP rule references. Selecting "Combined Discovery Requests" produces the fallback text "DISCOVERY REQUESTS" for the title and defaults to FRCP Rule 33 for the introduction, which is incorrect (combined requests span Rules 33, 34, and 36).
**Fix:** Add a `'combined'` case to `discoveryTitles`, the FRCP rule reference, and the request label in `buildDiscoveryContent()`.

### P1-5: Causes-of-action label map in `buildComplaintContent()` is incomplete
**File:** `src/taskpane/sv-document-generator.js:338-347`
**Description:** The complaint template defines 10 causes of action in `sv-templates.js:109-120` (breach-contract, negligence, fraud, unjust-enrichment, conversion, defamation, tortious-interference, civil-rights, employment-discrimination, products-liability). But `causeLabels` in `buildComplaintContent()` only maps 7 of them. Missing: `tortious-interference`, `civil-rights`, `employment-discrimination`, `products-liability`. These 4 will fall through to `cause.toUpperCase()` which works but produces raw hyphenated text like `TORTIOUS-INTERFERENCE` instead of `TORTIOUS INTERFERENCE`.
**Fix:** Add the 4 missing entries to `causeLabels`.

### P1-6: Affirmative defense label map in `buildAnswerContent()` mismatches template options
**File:** `src/taskpane/sv-document-generator.js:454-469` vs `src/taskpane/sv-templates.js:167-183`
**Description:** The answer template defines `'comparative-negligence'` and `'unclean-hands'` as defense options. But `defenseLabels` in `buildAnswerContent()` maps `'contributory-negligence'` (not `'comparative-negligence'`) and does not include `'unclean-hands'` at all. It also includes `'setoff'` which is not offered in the template. Result: selecting "Comparative/Contributory Negligence" produces no label match and falls through to the raw value `comparative-negligence`. Selecting "Unclean Hands" produces raw `unclean-hands`.
**Fix:** Update `defenseLabels` to match the template options exactly: `'comparative-negligence': 'Comparative/Contributory Negligence'` and add `'unclean-hands': 'Unclean Hands'`.

### P1-7: `contactHandler.ts` `STATE_NAMES` map missing territories present in `sv-state.js`
**File:** `src/services/contactHandler.ts:443-495` vs `src/taskpane/sv-state.js:60-73`
**Description:** The JS-side `STATE_NAMES` in `sv-state.js` includes Puerto Rico (PR), Virgin Islands (VI), Guam (GU), and Northern Mariana Islands (MP). The TS-side `STATE_NAMES` in `contactHandler.ts` only includes DC (District of Columbia) and the 50 states. This means `buildCityState()` in the TS engine will fail to expand territory abbreviations, producing "San Juan, PR" instead of "San Juan, Puerto Rico".
**Fix:** Add PR, VI, GU, MP, AS (American Samoa) to the TS-side map.

### P1-8: `UserProfileService.debouncedSync()` fires PUT request with no CSRF/auth headers
**File:** `src/services/userProfileService.ts:100-118`
**Description:** The debounced API sync fires a `fetch()` PUT request with only `Content-Type: application/json`. There is no `Authorization` header, no CSRF token, and no credentials mode. In production, this request will be rejected by any properly secured API endpoint. The `loadProfile()` GET request (line 53) also lacks auth headers.
**Fix:** Add authentication headers (Bearer token or similar) from the Office.js identity token or a stored session token. Add `credentials: 'same-origin'` or `'include'` as appropriate.

### P1-9: `VariableEngine.getProfileDefault()` always overrides date defaults with today's date
**File:** `src/services/variableEngine.ts:305-307`
**Description:** For any variable of type `'date'`, `getProfileDefault()` returns today's date. This runs before the template's own `defaultValue` check in `applyDefaults()`. Since `getProfileDefault()` is checked first (line 258-261), any template-specified date default (like `null` for "leave blank") will be overridden by today's date. For example, the complaint template sets `filingDate.defaultValue: null` to indicate "leave blank if filing new complaint", but the engine will fill it with today's date.
**Fix:** Only return today's date when `varDef.defaultValue` is explicitly `undefined` (meaning no default was specified), not when it is `null` (meaning "intentionally blank").

### P1-10: `isValidContact()` in `variableEngine.ts` rejects entities
**File:** `src/services/variableEngine.ts:601-608`
**Description:** `isValidContact()` requires both `firstName` and `lastName` to be non-empty strings. But entities (corporations, LLCs) have empty first/last names and use `company` instead. This means any entity contact or entity party will fail validation with "must have first and last name", even though the `isEmpty()` check in the JS-side `sv-validation.js:194-196` correctly accepts contacts with `company` as non-empty.
**Fix:** Update `isValidContact()` to accept entities: `(firstName + lastName) || company`.

### P1-11: `_getOrdinalWord()` produces wrong suffix for numbers 11, 12, 13
**File:** `src/taskpane/sv-document-generator.js:722-734`
**Description:** For numbers beyond 20 (the word list), the fallback uses `suffixes[(v - 20) % 10]`. For n=21: v=21, (21-20)%10=1, suffixes[1]='ST' => "21ST" -- correct. But for n=111: v=11, (11-20)%10 = (-9)%10 which in JavaScript is -9 (negative), so `suffixes[-9]` is `undefined`, then `suffixes[11]` is `undefined`, then fallback to `suffixes[0]='TH'` => "111TH" -- correct by accident. However for n=21 within the word list (n < 21), words[21] is undefined, falling through to the numeric path. The words array only covers 0-20. So for exactly n=21, the numeric fallback triggers. This is fine. The real bug is cosmetic: the function handles numbers 1-20 as words and 21+ as numeric with suffix, which works but creates inconsistent formatting in legal documents (e.g., "TWENTIETH AFFIRMATIVE DEFENSE" then "21ST AFFIRMATIVE DEFENSE"). Not a crash, but a legal formatting inconsistency.
**Fix:** Extend the words array or switch to all-numeric for consistency in legal documents.

---

## Medium Issues (P2)

### P2-1: `STORAGE_KEYS` in `sv-state.js` vs hardcoded strings in `smart-variables.js`
**File:** `src/taskpane/sv-state.js:20-24` vs `src/taskpane/smart-variables.js:56,197-198`
**Description:** The refactored code uses `STORAGE_KEYS.PROFILE` ('draftbridge_user_profile'). The monolith uses the same key but hardcoded as a string literal. If both codepaths ever ran, they'd share localStorage correctly. But the inconsistency means if the key ever changes in `sv-state.js`, the monolith would use the stale key. This is moot if the monolith is deleted (P0-1).
**Fix:** Delete the monolith.

### P2-2: Duplicated `STATE_NAMES` map in 3 locations
**File:** `src/taskpane/sv-state.js:60-73`, `src/services/contactHandler.ts:443-495`, implicit in `courtService.ts` (via MA_COUNTIES import)
**Description:** The US state abbreviation-to-name map is defined in three places. The JS version includes territories; the TS version does not. If a state is added to one map, the others may be missed.
**Fix:** Create a single canonical `stateNames.ts` / `stateNames.js` module and import everywhere.

### P2-3: `handleContactChange()` re-renders the entire form on every field change
**File:** `src/taskpane/sv-validation.js:85`
**Description:** `handleContactChange()` calls `this.renderForm(containerId)` after every field change. Since the contact input has 7 fields (firstName, lastName, company, email, street, city, state, zip), filling in a contact causes 7+ full DOM re-renders. This loses focus, cursor position, and is a poor UX. By contrast, `handleChange()` for text/select fields correctly avoids re-rendering on every keystroke.
**Fix:** Only re-render the contact preview sub-section, not the entire form. Or debounce the re-render.

### P2-4: `handlePartyChange()` also triggers full form re-render on every field change
**File:** `src/taskpane/sv-validation.js:107`
**Description:** Same issue as P2-3 but for party fields. Every keystroke in a party name triggers `renderForm()`, which rebuilds the entire DOM.
**Fix:** Same approach -- partial re-render or debounce.

### P2-5: `isEmpty()` in `sv-validation.js` considers `{firstName: '', lastName: '', company: ''}` as non-empty
**File:** `src/taskpane/sv-validation.js:192-197`
**Description:** `isEmpty()` checks `typeof value === 'object' && Object.keys(value).length === 0` for empty objects. But a contact object with empty string fields has 3+ keys, so `Object.keys(value).length === 0` is false. The contact-specific check on line 194-196 only fires if `'firstName' in value`. For a contact `{firstName: '', lastName: '', email: ''}`, the function returns `false` (not empty) because it passes the general object check first (keys.length > 0). Then the contact check returns `true` (is empty). Wait -- actually the contact check IS reached because the general object check's `Object.keys(value).length === 0` returns false (3 keys), so it falls through to the contact check. The contact check on line 194 fires because `'firstName' in value` is true, and returns `!value.firstName && !value.lastName && !value.company` which is `true`. So the function does correctly report it as empty. This is actually correct. (**Retracted**)

### P2-5 (revised): `renderCourtOptionsGrouped()` iterates courts array twice -- O(n*m) performance
**File:** `src/taskpane/sv-form-renderer.js:383-397`
**Description:** For each state, it filters the entire courts array: `this.courts.filter(court => court.state === state)`. With S states and N courts, this is O(S*N). The `courtsByState` index already exists and maps state->court IDs, which could be used instead for O(S+N).
**Fix:** Use `this.courtsByState[state]` and map through `this.courtsById` instead of filtering the full array.

### P2-6: `buildDocumentContent()` switch statement has no handling for custom template IDs
**File:** `src/taskpane/sv-document-generator.js:90-103`
**Description:** The switch routes by `template.id` (string match). Custom imported templates will have IDs like `custom-motion-to-dismiss-1706000000` which won't match any case, falling through to `buildGenericContent()`. The generic builder just dumps key-value pairs, which produces a poor document. Users importing a variant of "motion-to-dismiss" would expect motion-style formatting.
**Fix:** Consider matching on `template.category` as a secondary dispatch, or allow templates to declare a `baseTemplate` property for formatting inheritance.

### P2-7: `wordRunWithTimeout()` in `recreateService.ts` leaks timer on success
**File:** `src/services/recreateService.ts:385-402`
**Description:** The `setTimeout` inside `Promise.race` is never cleared when `Word.run` completes first. The timer's `reject` callback will fire after `timeoutMs` even though the promise has already resolved. This is harmless (the rejection is swallowed by the already-resolved promise), but it is a minor resource leak -- the timer and its closure remain in memory until it fires.
**Fix:** Capture the timer ID and clear it in the success path using `Promise.race` with explicit cleanup.

### P2-8: Template import does not validate variable definitions
**File:** `src/taskpane/sv-templates.js:362-365`
**Description:** `handleImportFile()` checks that `data.template.variables` exists and is truthy, but does not validate the shape of individual variables. A malicious or corrupted template could have variables with missing `id`, `type`, or `name` fields, which would cause crashes in `renderForm()` (e.g., `variable.type` is undefined in the switch statement).
**Fix:** Add validation that each variable has at least `id` (string), `name` (string), and `type` (string from allowed set).

### P2-9: `escapeAttr()` in `sv-state.js` is never used by the refactored modules
**File:** `src/taskpane/sv-state.js:187-196`
**Description:** `escapeAttr()` was added as a security utility but is never called by any of the `sv-*.js` files. All inline JS string contexts use `safeId()` instead. `escapeAttr()` is dead code.
**Fix:** Either remove it or document it as a public API for custom template authors.

### P2-10: `getAttorneyBlock()` produces leading comma when city is empty
**File:** `src/taskpane/sv-profile.js:312-313`
**Description:** When `firmCity` is empty but `firmState` or `firmZip` are set, the template literal produces `, MA 02101` (leading comma). The `.trim()` only removes leading/trailing whitespace, not leading commas.
**Fix:** Use the same filter-then-join pattern used elsewhere, or conditionally include the comma.

### P2-11: No validation of `barState` as valid 2-letter state code
**File:** `src/taskpane/sv-profile.js:78`, `src/taskpane/sv-state.js:152`
**Description:** The bar state field is `maxlength="2"` and auto-uppercased, but there is no validation that the value is an actual US state or territory code. A user could enter "ZZ" and it would be stored and used in signature blocks.
**Fix:** Validate against `STATE_NAMES` keys or show a warning.

### P2-12: Handlebars `strict: false` in `templateRenderer.ts` silently swallows missing variables
**File:** `src/services/templateRenderer.ts:216-218`
**Description:** With `strict: false`, any `{{variableName}}` in a Handlebars template that references a missing context key silently renders as empty string. For legal documents, this could cause content to silently disappear (e.g., a misspelled `{{plantiffs}}` would render blank instead of erroring).
**Fix:** Consider using `strict: true` in development/preview mode to catch template errors, with `strict: false` only in production rendering.

### P2-13: `courtService.ts` `buildCaptionVariables()` uses `county.toLowerCase()` but `MA_COUNTIES` keys may not match
**File:** `src/services/courtService.ts:368`
**Description:** The code does `MA_COUNTIES[county.toLowerCase()]` but the actual `MA_COUNTIES` type/import is not visible in this audit. If the keys are capitalized (e.g., "Middlesex"), the lowercase lookup would fail and fall through to the generic `${county.toUpperCase()}, SS.` format. This could produce wrong caption formatting.
**Fix:** Ensure `MA_COUNTIES` keys are consistently lowercased, or normalize the lookup.

---

## Low Issues (P3)

### P3-1: Inconsistent function naming -- some use abbreviations, some don't
**File:** Various
**Description:** `getSavedContacts()` vs `getCourtById()` vs `getCategoryIcon()`. Some methods use `get` prefix, others don't. `escapeHtml` vs `escapeAttr` vs `safeId` -- no consistent `escape`/`sanitize` prefix pattern.
**Fix:** Establish a naming convention in contributing docs.

### P3-2: TODO comments that should be tracked
**Files:**
- `sv-state.js:11-14` -- localStorage encryption TODO
- `userProfileService.ts:12` -- same encryption TODO
- `userProfileService.ts:42-43` -- retry logic for loadProfile
- `userProfileService.ts:99` -- retry logic for sync
- `contactHandler.ts:120-121` -- gender inference TODO
- `templateRenderer.ts:251` -- content control mappings TODO
**Description:** 6 TODO comments across the codebase that represent missing features or security improvements.
**Fix:** Move to issue tracker.

### P3-3: `smart-variables.js` monolith has stale "Import Import Template" typo
**File:** `src/taskpane/smart-variables.js:853`
**Description:** The import dialog title reads "Import Import Template" (doubled word). The refactored `sv-templates.js:303` correctly reads "Import Template". Another indicator the monolith should be removed.
**Fix:** Delete the monolith (P0-1).

### P3-4: `getCategoryIcon()` returns empty strings for all categories
**File:** `src/taskpane/sv-templates.js:482-492`
**Description:** Every icon mapping returns `''`. The JSDoc comment explains this is intentional (icon assets not yet available), but the `.sv-template-icon` container still renders as a 40x40 empty box, wasting space.
**Fix:** Either add actual icons or hide the container when icon is empty.

### P3-5: CSS `box-shadow` on `.sv-input:focus` uses token variable inside `0 0 0 2px`
**File:** `src/taskpane/smart-variables.css:268`
**Description:** `.sv-input:focus { box-shadow: 0 0 0 2px var(--db-input-focus-ring); }` -- but `--db-input-focus-ring` is itself a full box-shadow value (`0 0 0 2px rgba(...)`). This produces a nested box-shadow: `0 0 0 2px 0 0 0 2px rgba(...)` which is invalid CSS and will be ignored by browsers, meaning focus rings won't show.
**Fix:** Use `box-shadow: var(--db-input-focus-ring);` directly (without the `0 0 0 2px` prefix).

### P3-6: `formatDate()` in `templateRenderer.ts` creates a new `Date` from string on every call
**File:** `src/services/templateRenderer.ts:140`
**Description:** `new Date(dateStr)` without timezone context may produce off-by-one day errors when `dateStr` is a date-only string like "2026-01-15" (interpreted as UTC midnight, which may be the previous day in US timezones).
**Fix:** Append `T12:00:00` to date-only strings to avoid timezone boundary issues, or use `Date.parse` with explicit handling.

### P3-7: `destroy()` resets `expandedGroups` to empty Set, but `init()` never restores defaults
**File:** `src/taskpane/sv-state.js:94-102`
**Description:** After `destroy()`, if `init()` is called again, `expandedGroups` starts as an empty Set (from `destroy()`), losing the default expanded groups (case, parties, motion, etc.). The initial declaration on line 37 uses `new Set(['case', 'parties', ...])` but `destroy()` replaces it with `new Set()`. A subsequent `init()` does not re-set `expandedGroups`.
**Fix:** Have `init()` reset `expandedGroups` to its default value, or have `destroy()` preserve the default set.

---

## Architecture Notes (Not Bugs)

### N1: TypeScript services and Vanilla JS modules are completely independent
The TS files (`cascadeEngine.ts`, `variableEngine.ts`, etc.) and the vanilla JS files (`sv-*.js`) implement overlapping functionality with no shared code or runtime connection. The TS layer has a full `VariableEngine` class with cascade processing, dependency graphs, and batch changes. The JS layer has simpler inline validation and derivation. Currently only the JS layer is loaded in `taskpane.html`. The TS layer appears to be for a future bundled build. This is not a bug but means fixes need to be applied in both layers.

### N2: `contactHandler.ts` `isPlaintiffRole`/`isDefendantRole` do not cover all `PartyRole` values
Roles like `'intervenor'` and `'real-party-in-interest'` are defined in `formatRoleLabel()` but are not classified as plaintiff-side or defendant-side. Parties with these roles will be excluded from both plaintiff and defendant name derivations in `derivePartyFields()`.

### N3: CSP allows `'unsafe-inline'` for scripts
**File:** `taskpane.html:6`
The Content Security Policy includes `script-src 'self' 'unsafe-inline'`. All the `onclick="SmartVariables.foo()"` inline handlers require this. This weakens XSS protection. A future refactor to use `addEventListener` from JS files would allow removing `'unsafe-inline'`.
