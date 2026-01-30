# DraftBridge Design Tokens

> Comprehensive design system documentation for the DraftBridge taskpane UI.  
> All values are defined as CSS custom properties in `taskpane.css`.

---

## Spacing Scale

Based on a **4px base unit**. Use these consistently for margins, paddings, and gaps.

| Token | Value | Usage |
|-------|-------|-------|
| `--df-space-1` | 4px | Tight spacing, icon gaps |
| `--df-space-2` | 8px | Small gaps, inline elements |
| `--df-space-3` | 12px | Component internal padding |
| `--df-space-4` | 16px | Standard component spacing |
| `--df-space-5` | 20px | Section spacing |
| `--df-space-6` | 24px | Large section gaps |
| `--df-space-8` | 32px | Major section breaks |
| `--df-space-10` | 40px | Page-level spacing |
| `--df-space-12` | 48px | Hero/empty state spacing |

### Usage Guidelines
- **4px**: Icon-to-text gaps, inline badge spacing
- **8px**: Button icon gaps, list item spacing
- **12px**: Card internal padding, form group margins
- **16px**: Section padding, modal body padding
- **24px+**: Major layout divisions

---

## Border Radius Scale

Consistent radius values for a cohesive, modern feel.

| Token | Value | Usage |
|-------|-------|-------|
| `--df-radius-sm` | 6px | Small elements: badges, tags, chips |
| `--df-radius-md` | 8px | Buttons, inputs, dropdown items |
| `--df-radius-lg` | 12px | Cards, field items, modals |
| `--df-radius-xl` | 16px | Large containers, hero sections |
| `--df-radius-full` | 9999px | Pills, avatars, circular buttons |

### Usage Guidelines
- **6px**: Subtle rounding for small interactive elements
- **8px**: Primary interactive elements (buttons, inputs)
- **12px**: Content containers (cards, toasts, modals)
- **16px**: Oversized containers, featured sections
- **Full**: Circular elements, pill shapes

---

## Shadows

Layered shadows for depth without heaviness. Opacity kept low for subtlety.

| Token | Usage | Definition |
|-------|-------|------------|
| `--df-shadow-xs` | Subtle lift | `0 1px 2px rgba(0, 0, 0, 0.04)` |
| `--df-shadow-sm` | Cards at rest | `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)` |
| `--df-shadow-md` | Hover states | `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` |
| `--df-shadow-lg` | Dropdowns, popovers | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)` |
| `--df-shadow-xl` | Modals | `0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)` |
| `--df-shadow-glow` | Focus rings | `0 0 20px rgba(37, 99, 235, 0.15)` |

### Usage Guidelines
- **xs/sm**: Default card state, subtle depth
- **md**: Hover states to indicate interactivity
- **lg**: Floating elements (dropdowns, tooltips)
- **xl**: Modal overlays
- **glow**: Focus states, active selection

---

## Color Palette

### Brand Colors

| Token | Value | Contrast | Usage |
|-------|-------|----------|-------|
| `--df-primary` | #2563eb | White text safe | Primary actions, links |
| `--df-primary-hover` | #1d4ed8 | White text safe | Hover state |
| `--df-primary-light` | #3b82f6 | Careful with text | Accent highlights |
| `--df-primary-subtle` | rgba(37, 99, 235, 0.08) | N/A | Background tints |
| `--df-primary-glow` | rgba(37, 99, 235, 0.15) | N/A | Focus rings |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--df-success` | #059669 | Confirmations, complete states |
| `--df-success-light` | #10b981 | Success highlights |
| `--df-success-subtle` | rgba(5, 150, 105, 0.1) | Success backgrounds |
| `--df-warning` | #d97706 | Cautions, empty fields |
| `--df-warning-subtle` | rgba(217, 119, 6, 0.1) | Warning backgrounds |
| `--df-error` | #dc2626 | Errors, destructive actions |
| `--df-error-subtle` | rgba(220, 38, 38, 0.1) | Error backgrounds |

### Text Colors (WCAG AA Compliant)

| Token | Value | Contrast Ratio | Usage |
|-------|-------|----------------|-------|
| `--df-text-primary` | #111827 | 16.5:1 | Headings, important text |
| `--df-text-secondary` | #374151 | 10.9:1 | Body text |
| `--df-text-tertiary` | #525252 | 7.5:1 | Supporting text |
| `--df-text-muted` | #6b7280 | 5.0:1 | Placeholders, hints |
| `--df-text-inverse` | #ffffff | Varies | Text on dark backgrounds |

> **Note**: All text colors meet WCAG AA minimum contrast ratio of 4.5:1 against white backgrounds.

### Surface Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--df-bg-base` | #ffffff | Page background |
| `--df-bg-subtle` | #fafafa | Input backgrounds, sections |
| `--df-bg-elevated` | #ffffff | Cards, modals |
| `--df-bg-overlay` | rgba(255, 255, 255, 0.85) | Overlay backgrounds |
| `--df-bg-hover` | rgba(0, 0, 0, 0.03) | Hover state backgrounds |
| `--df-bg-active` | rgba(0, 0, 0, 0.05) | Active/pressed states |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--df-border-subtle` | rgba(0, 0, 0, 0.06) | Dividers, subtle borders |
| `--df-border-default` | rgba(0, 0, 0, 0.1) | Standard borders |
| `--df-border-strong` | rgba(0, 0, 0, 0.15) | Emphasized borders |
| `--df-border-focus` | rgba(37, 99, 235, 0.5) | Focus state borders |

---

## Typography

### Font Stacks

```css
--df-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
--df-font-mono: "SF Mono", "Fira Code", "Consolas", monospace;
```

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--df-text-xs` | 11px | Badges, captions, keyboard hints |
| `--df-text-sm` | 12px | Labels, secondary info |
| `--df-text-base` | 13px | Body text (default) |
| `--df-text-md` | 14px | Input text, prominent body |
| `--df-text-lg` | 16px | Subheadings, card titles |
| `--df-text-xl` | 18px | Section headings |
| `--df-text-2xl` | 20px | Page headings |
| `--df-text-3xl` | 24px | Hero text |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--df-weight-normal` | 400 | Body text |
| `--df-weight-medium` | 500 | Labels, buttons |
| `--df-weight-semibold` | 600 | Headings, emphasis |
| `--df-weight-bold` | 700 | Strong emphasis |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--df-leading-tight` | 1.25 | Headings |
| `--df-leading-normal` | 1.5 | Body text |
| `--df-leading-relaxed` | 1.625 | Readable prose |

---

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--df-transition-fast` | 100ms ease | Hover states, micro-interactions |
| `--df-transition-normal` | 150ms ease | Standard transitions |
| `--df-transition-slow` | 250ms ease | Large element changes |
| `--df-transition-spring` | 300ms cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy, playful animations |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--df-z-base` | 0 | Normal content |
| `--df-z-dropdown` | 100 | Dropdowns, popovers |
| `--df-z-sticky` | 200 | Sticky headers |
| `--df-z-modal` | 500 | Modal dialogs |
| `--df-z-toast` | 1000 | Toast notifications |

---

## Accessibility Guidelines

### Focus States
All interactive elements must have visible focus states:
- **Outline**: `2px solid var(--df-primary)` with `outline-offset: 2px`
- **Glow**: `box-shadow: 0 0 0 4px var(--df-primary-glow)` for extra visibility

### Color Contrast Requirements
- **Normal text**: Minimum 4.5:1 contrast ratio (WCAG AA)
- **Large text (18px+)**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 against adjacent colors

### Motion Preferences
Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Focus order must be logical
- Focus traps properly managed in modals

---

## Icon Guidelines

### No Emoji in UI
All icons must use **SVG** for:
- Consistent rendering across platforms
- Scalability without quality loss
- Better accessibility (can add aria-labels)
- Theme compatibility (stroke/fill colors)

### Icon Sizing
- **Small**: 14-16px (inline with text)
- **Medium**: 18-20px (buttons, menu items)
- **Large**: 32-40px (empty states, heroes)

### Stroke Width
- Default: `stroke-width="1.5"` or `stroke-width="2"`
- Maintain consistency across all icons

---

## Dark Mode

Dark mode colors are automatically applied via `prefers-color-scheme: dark`. Key adjustments:
- Surfaces become dark grays (#111111, #171717, #1f1f1f)
- Text colors invert appropriately
- Shadows increase in opacity
- Primary colors may shift slightly for better visibility

---

## Component Quick Reference

| Component | Padding | Radius | Shadow |
|-----------|---------|--------|--------|
| Button | 8px 16px | md (8px) | sm |
| Button (large) | 12px 24px | lg (12px) | md |
| Input | 8px 12px | md (8px) | none |
| Card | 12px | lg (12px) | sm |
| Modal | 16px | xl (16px) | xl |
| Toast | 12px 16px | lg (12px) | lg |
| Dropdown | 0 | lg (12px) | xl |
| Dropdown Item | 8px 12px | md (8px) | none |

---

*Last updated: Visual Polish Pass*
