# Skill: Decompose Module

Pattern for extracting a module from the `SmartVariables` monolith (`smart-variables.js`).

## Steps

### 1. Create the Module File

Create `src/taskpane/sv-[name].js` with a file header:

```javascript
/**
 * DraftBridge Gold - Smart Variables: [Module Name]
 *
 * [Brief description of what this module handles]
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */
```

### 2. Use Object.assign Pattern

Wrap all extracted methods in `Object.assign(SmartVariables, { ... })`:

```javascript
Object.assign(SmartVariables, {
    methodOne() {
        // Copied exactly from smart-variables.js
    },

    methodTwo(param) {
        // Copied exactly from smart-variables.js
    }
});
```

### 3. Copy Methods Without Modification

- Copy each method exactly as it appears in `smart-variables.js`
- Do not rename methods (onclick handlers depend on exact names)
- Do not change method signatures
- Do not refactor logic during extraction (that is a separate step)
- Preserve all `this.` references (they resolve to `SmartVariables` at call time)

### 4. Add Script Tag to taskpane.html

Add the script tag in the correct position in `taskpane.html`. The load order matters because later modules reference earlier ones:

```
sv-state.js          (namespace + state)
sv-courts.js         (court selection)
sv-contacts.js       (contact picker)
sv-templates.js      (template loading)
sv-profile.js        (user profile)
sv-form-renderer.js  (form rendering)
sv-validation.js     (input validation)
sv-document-generator.js  (document output)
```

Add the `<script>` tag after the preceding module and before the next:

```html
<script src="src/taskpane/sv-[name].js"></script>
```

### 5. Verify onclick Handlers

All `onclick="SmartVariables.xyz()"` handlers in `taskpane.html` must still resolve after extraction. Check:

1. Search `taskpane.html` for all `SmartVariables.` references
2. Confirm every referenced method exists in exactly one `sv-*.js` file
3. Confirm no method was accidentally omitted or duplicated

### 6. Test

- Load the add-in in Word
- Verify the Generate panel renders templates
- Verify form inputs accept values
- Verify document generation completes
- Check browser console for `undefined` or `is not a function` errors

## Module Boundaries (Recommended)

| Module | Responsibilities |
|--------|-----------------|
| `sv-state` | `SmartVariables` object, `state`, `userProfile`, `templates` |
| `sv-courts` | `loadCourts()`, `selectCourt()`, court dropdown rendering |
| `sv-contacts` | `openContactPicker()`, `selectContact()`, contact search |
| `sv-templates` | `loadTemplates()`, `selectTemplate()`, template list rendering |
| `sv-profile` | `loadProfile()`, `saveProfile()`, profile form |
| `sv-form-renderer` | `renderForm()`, `renderGroup()`, input creation |
| `sv-validation` | `validateField()`, `validateAll()`, error display |
| `sv-document-generator` | `generateDocument()`, Handlebars compilation, Word insertion |

## Rules

- The monolith `smart-variables.js` remains as a backup/reference
- Each module file must be self-contained (no imports between `sv-*.js` files -- they share via the `SmartVariables` namespace)
- Methods must not be duplicated across modules
- The `Object.assign` calls are additive -- they never overwrite the core `state` object from `sv-state.js`
