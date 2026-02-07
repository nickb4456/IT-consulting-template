# Skill: Add Component

Template for creating a new UI component in the DraftBridge design system.

## Steps

### 1. Create the CSS File

Create `src/components/[name]/[Name].css` using design tokens exclusively.

```css
/* ===================================================================
   DRAFTBRIDGE GOLD -- [Component Name]
   [Brief description]
   =================================================================== */

.[component-name] {
  background: var(--db-surface);
  border: 1px solid var(--db-border-light);
  border-radius: var(--db-radius-md);
  padding: var(--db-space-lg);
  font-family: var(--db-font-sans);
  color: var(--db-text);
  transition: var(--db-transition);
}

.[component-name]:hover {
  border-color: var(--db-border-hover);
  box-shadow: var(--db-shadow-md);
}

.[component-name]:focus-within {
  box-shadow: var(--db-input-focus-ring);
  border-color: var(--db-primary-light);
}
```

### 2. Add HTML

Add the component markup to `taskpane.html` or the appropriate container. Use semantic HTML elements (buttons for actions, labels for inputs).

### 3. Wire Up Behavior

If the component needs JS logic:
- Add methods to `SmartVariables` via `Object.assign()` in the appropriate `sv-*.js` module
- Use `onclick="SmartVariables.methodName()"` for event handlers
- Or create a new `sv-[name].js` module if the logic is substantial

### 4. Link the CSS

Add a `<link>` tag in `taskpane.html` after the existing stylesheet chain:
```html
<link rel="stylesheet" href="src/components/[name]/[Name].css">
```

## Design Token Quick Reference

### Colors (never use raw hex)
- Backgrounds: `var(--db-surface)`, `var(--db-surface-muted)`, `var(--db-surface-warm)`
- Text: `var(--db-text)`, `var(--db-text-secondary)`, `var(--db-text-muted)`
- Borders: `var(--db-border)`, `var(--db-border-light)`, `var(--db-border-input)`
- Primary: `var(--db-primary)`, `var(--db-primary-light)`, `var(--db-primary-hover)`
- Accent: `var(--db-accent)`, `var(--db-accent-light)`

### Border Radius
- `var(--db-radius-sm)` -- 4px (tags, small elements)
- `var(--db-radius-md)` -- 6px (inputs, buttons)
- `var(--db-radius-lg)` -- 8px (cards, panels)
- `var(--db-radius-xl)` -- 10px (modals)
- `var(--db-radius-2xl)` -- 12px (large containers)
- `var(--db-radius-pill)` -- 50% (circular elements)

### Shadows
- `var(--db-shadow-sm)` -- cards at rest
- `var(--db-shadow-md)` -- cards on hover
- `var(--db-shadow-lg)` -- dropdowns, popovers
- `var(--db-shadow-xl)` -- modals
- `var(--db-shadow-primary)` -- primary action elevation

### Focus States
- `var(--db-input-focus-ring)` -- 2px ring for standard inputs
- `var(--db-input-focus-ring-lg)` -- 3px ring for large inputs

### Transitions
- `var(--db-transition)` -- all 0.2s (standard)
- `var(--db-transition-fast)` -- all 0.15s (active/click states)

## Rules

- Never use hardcoded hex values -- all colors come from tokens
- Never use hardcoded pixel values for spacing -- use `var(--db-space-*)` tokens
- Never add external CSS frameworks
- All interactive elements must have visible focus states
- Keep font stack as `var(--db-font-sans)` (system fonts)
