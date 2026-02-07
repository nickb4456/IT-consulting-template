# DraftBridge Frontend Guidelines

> Last updated: 2026-02-06
> Complete design system for consistent UI

---

## Design Philosophy

- **Warm and Professional** -- Not cold corporate, not playful startup
- **Law Firm Appropriate** -- Would look at home on a partner's screen
- **Minimal Cognitive Load** -- Every element earns its place
- **Fast and Responsive** -- No unnecessary animations or delays

---

## Design Tokens

All visual values are defined as CSS custom properties in `src/styles/tokens.css`. This is the **canonical source** for every color, spacing value, radius, shadow, and typography constant in the application.

**Rule:** Never use hardcoded hex values, pixel spacing, or raw shadow definitions outside `tokens.css`. Always reference `var(--db-*)` tokens.

### CSS File Load Order

```
src/styles/tokens.css          -> Design token definitions
src/styles/base.css             -> Shared resets, accessibility, universal components
src/styles/taskpane.css         -> Taskpane-specific styles
src/taskpane/smart-variables.css -> Smart Variables panel styles
```

All four files are linked in `taskpane.html` via `<link rel="stylesheet">` tags. No inline `<style>` blocks should be added to HTML files.

---

## Color Palette

### Primary Colors

| Name | Token | Usage |
|------|-------|-------|
| **Primary Brown** | `var(--db-primary-light)` | Buttons, active states, accents |
| **Primary Dark** | `var(--db-primary)` | Logo text, headers |
| **Primary Hover** | `var(--db-primary-hover)` | Button hover states |

### Neutral Colors

| Name | Token | Usage |
|------|-------|-------|
| **Background** | `var(--db-bg)` | Page background |
| **White** | `var(--db-surface)` | Cards, inputs |
| **Border** | `var(--db-border)` | Card borders, dividers |
| **Border Light** | `var(--db-border-light)` | Subtle borders |
| **Text Primary** | `var(--db-text)` | Headings, titles |
| **Text Secondary** | `var(--db-text-secondary)` | Body text, labels |
| **Text Muted** | `var(--db-text-muted)` | Descriptions |
| **Text Disabled** | `var(--db-text-disabled)` | Placeholders, disabled |

### Semantic Colors

| Name | Token | Usage |
|------|-------|-------|
| **Success** | `var(--db-success)` | Success states, confirmations |
| **Success BG** | `var(--db-success-bg)` | Success backgrounds |
| **Error** | `var(--db-error)` | Error states, alerts |
| **Error BG** | `var(--db-error-bg)` | Error backgrounds |
| **Info Blue** | `var(--db-info)` | Links, selected states |
| **Info BG** | `var(--db-info-bg)` | Info backgrounds |

### Legal Semantic Colors

| Name | Token | Usage |
|------|-------|-------|
| **Plaintiff** | `var(--db-plaintiff)` | Plaintiff accent |
| **Plaintiff BG** | `var(--db-plaintiff-bg)` | Plaintiff backgrounds |
| **Defendant** | `var(--db-defendant)` | Defendant accent |
| **Party Neutral** | `var(--db-party-neutral)` | Neutral party color |

### Category Tag Colors

| Category | Background Token | Text Token |
|----------|-----------------|------------|
| Contracts | `var(--db-cat-contracts-bg)` | `var(--db-cat-contracts-text)` |
| Litigation | `var(--db-cat-litigation-bg)` | `var(--db-cat-litigation-text)` |
| Corporate | `var(--db-cat-corporate-bg)` | `var(--db-cat-corporate-text)` |
| IP | `var(--db-cat-ip-bg)` | `var(--db-cat-ip-text)` |

---

## Typography

### Font Stack

```css
font-family: var(--db-font-sans);
/* Resolves to: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif */
```

### Font Sizes

| Element | Token | Weight | Color Token |
|---------|-------|--------|-------------|
| Header/Logo | `var(--db-text-3xl)` | 700 | `var(--db-primary-light)` / `var(--db-primary)` |
| Section Header | `var(--db-text-xl)` | 600 | `var(--db-text)` |
| Body Text | `var(--db-text-lg)` | 400 | `var(--db-text-secondary)` |
| Tab Label | `var(--db-text-base)` | 500 | `var(--db-text-muted)` |
| Description | `var(--db-text-md)` | 400 | `var(--db-text-muted)` |
| Small/Label | `var(--db-text-base)` | 500 | `var(--db-text-secondary)` |
| Tiny/Tag | `var(--db-text-xs)` | 600 | varies |

### Line Heights

| Context | Line Height |
|---------|-------------|
| Body text | 1.5 |
| Headings | 1.2 |
| Clause preview | 1.5 |
| Numbering preview | 1.8 |

---

## Spacing Scale

All spacing uses a 4px base unit defined in `src/styles/tokens.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-space-xs)` | 4px | Tight gaps |
| `var(--db-space-sm)` | 8px | Icon margins, tight padding |
| `var(--db-space-md)` | 12px | Standard padding |
| `var(--db-space-lg)` | 16px | Section padding, card padding |
| `var(--db-space-xl)` | 20px | Large gaps |
| `var(--db-space-2xl)` | 24px | Section dividers |
| `var(--db-space-3xl)` | 40px | Empty state padding |

### Common Patterns

```css
/* Card padding */
padding: var(--db-space-lg);

/* Search box padding */
padding: var(--db-space-md) var(--db-space-lg);

/* Button padding */
padding: var(--db-btn-padding);

/* Input padding */
padding: var(--db-input-padding);
```

---

## Layout Rules

### Container
- Full viewport height (`100vh`)
- Flexbox column layout
- Background: `var(--db-bg)`

### Header
- Fixed height: ~48px
- Background: `var(--db-surface)`
- Border bottom: `1px solid var(--db-border)`

### Tab Bar
- Background: `var(--db-surface)`
- Tab padding: `var(--db-space-sm) var(--db-space-md)`
- Active indicator: 2px bottom border, `var(--db-primary-light)`

### Content Area
- Flex: 1 (fills remaining space)
- Overflow-y: auto (scrollable)
- Padding: `var(--db-space-md) var(--db-space-lg)`

### Footer/Actions
- Fixed at bottom when present
- Padding: `var(--db-space-md) var(--db-space-lg)`
- Background: `var(--db-surface)`
- Border top: `1px solid var(--db-border)`

---

## Component Styles

### Buttons

**Primary Button**
```css
.btn {
    background: var(--db-primary-light);
    color: white;
    border: none;
    padding: var(--db-btn-padding);
    border-radius: var(--db-radius-md);
    font-weight: 500;
    font-size: var(--db-text-md);
    cursor: pointer;
    transition: var(--db-transition);
}
.btn:hover { background: var(--db-primary-hover); }
.btn:disabled { background: var(--db-text-disabled); cursor: not-allowed; }
```

**Secondary Button**
```css
.btn.secondary {
    background: var(--db-surface);
    color: var(--db-primary-light);
    border: 1px solid var(--db-primary-light);
}
.btn.secondary:hover { background: var(--db-bg); }
```

**Success State**
```css
.btn.success { background: var(--db-success); }
```

**Small Button**
```css
.btn.small {
    padding: var(--db-btn-padding-sm);
    font-size: var(--db-text-base);
}
```

### Cards

**Standard Card**
```css
.card {
    background: var(--db-surface);
    border-radius: var(--db-card-radius);
    padding: var(--db-space-lg);
    margin-bottom: var(--db-space-sm);
    box-shadow: var(--db-card-shadow);
    border: var(--db-card-border);
}
```

**Option Card (Clickable)**
```css
.option-card {
    /* Same as card plus: */
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--db-space-md);
    transition: var(--db-transition);
}
.option-card:hover {
    border-color: var(--db-primary-light);
    box-shadow: var(--db-shadow-md);
}
```

### Form Inputs

```css
input, textarea, select {
    width: 100%;
    padding: var(--db-input-padding);
    border: 1px solid var(--db-border-input);
    border-radius: var(--db-radius-md);
    font-size: var(--db-text-lg);
    font-family: var(--db-font-sans);
    transition: var(--db-transition);
}
input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--db-primary-light);
    box-shadow: var(--db-input-focus-ring);
}
```

### Status Bar

```css
.status {
    background: var(--db-surface-muted);
    color: var(--db-success);
    padding: var(--db-space-sm) var(--db-space-lg);
    font-size: var(--db-text-md);
    border-bottom: 1px solid var(--db-border);
}
.status.error {
    background: var(--db-error-bg);
    color: var(--db-error);
}
```

### Category Tags

```css
.category-tag {
    font-size: var(--db-text-xs);
    padding: 3px var(--db-space-sm);
    border-radius: var(--db-radius-sm);
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
}
```

### Tree View (Numbering)

```css
.tree-header {
    padding: var(--db-space-sm) var(--db-space-md);
    background: var(--db-surface-muted);
    font-weight: 500;
    font-size: var(--db-text-md);
    cursor: pointer;
}
.tree-item {
    padding: var(--db-space-sm) var(--db-space-md) var(--db-space-sm) 32px;
    font-size: var(--db-text-md);
    cursor: pointer;
}
.tree-item.selected {
    background: var(--db-info-bg);
    color: var(--db-info);
}
```

---

## Icons

### Emoji Icons Used
| Emoji | Meaning |
|-------|---------|
| (envelope) | Letter |
| (memo) | Memo |
| (fax) | Fax |
| (bookmark) | Bookmark |
| (globe) | Global |
| (numbers) | Numbering |
| (document) | TOC / Document / Scheme |
| (building) | Firm |
| (palette) | Styles |
| (mailbox) | Empty state |

### Icon Sizes
- Option card icons: 24px
- Tree item icons: 14px
- Empty state icons: 40px

---

## Shadows

| Token | Usage |
|-------|-------|
| `var(--db-shadow-sm)` | Cards at rest |
| `var(--db-shadow-md)` | Cards on hover, dropdowns |
| `var(--db-shadow-lg)` | Popovers, elevated panels |
| `var(--db-shadow-xl)` | Modals |
| `var(--db-shadow-primary)` | Primary button elevation |
| `var(--db-shadow-modal)` | Modal overlays |

---

## Transitions

```css
/* Standard transition */
transition: var(--db-transition);    /* all 0.2s */

/* Fast transition */
transition: var(--db-transition-fast);  /* all 0.15s */
```

### Animation Duration
- Hover effects: 0.2s
- Active states: 0.15s
- Button feedback: 1.5s (success), 2s (error reset)

---

## Responsive Behavior

The taskpane is fixed width (determined by Word), so responsive design is minimal:

- Flex-wrap on tabs if needed
- Scrollable content areas
- No breakpoints needed

---

## Accessibility

### Focus States
All interactive elements have visible focus via `border-color` change and `var(--db-input-focus-ring)` box-shadow.

### Color Contrast
- Primary text on white: 12.6:1
- Secondary text on white: 7.5:1
- Muted text on white: 5.7:1
- White on primary: 4.9:1

### Semantic HTML
- Buttons for actions, not divs
- Labels associated with inputs
- Logical heading hierarchy

---

## Don'ts

- Do not use colors outside the token palette
- Do not use font sizes outside the token scale
- Do not add shadows heavier than `var(--db-shadow-md)` on cards
- Do not use animations longer than 0.3s
- Do not add external CSS frameworks
- Do not use custom fonts (stick to system via `var(--db-font-sans)`)
- Do not add hardcoded hex values anywhere except `src/styles/tokens.css`
- Do not add inline `<style>` blocks to HTML files

---

*This document locks down all visual decisions. All values reference `var(--db-*)` tokens from `src/styles/tokens.css`.*
