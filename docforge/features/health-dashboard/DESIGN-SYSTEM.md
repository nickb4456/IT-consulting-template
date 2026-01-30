# Health Dashboard Design System

A comprehensive design system for the DocForge Document Health Dashboard. Built for legal professionals who appreciate premium, professional interfaces.

## Design Philosophy

- **Professional** — No emojis, playful fonts, or consumer app aesthetics
- **Premium** — Subtle gradients, refined shadows, smooth animations
- **Informative** — At-a-glance insights with drill-down capability
- **Satisfying** — Micro-interactions and visual feedback that feel good

---

## Score Color Scale

The dashboard uses a **5-tier color scale** that transitions smoothly from critical (red) to excellent (green):

### Color Tokens

| Score Range | Severity | Primary Color | Light Bg | Border |
|-------------|----------|---------------|----------|--------|
| 80-100 | `excellent` | `#059669` | `#d1fae5` | `#6ee7b7` |
| 60-79 | `good` | `#65a30d` | `#ecfccb` | `#bef264` |
| 40-59 | `warning` | `#d97706` | `#fef3c7` | `#fcd34d` |
| 20-39 | `poor` | `#ea580c` | `#ffedd5` | `#fdba74` |
| 0-19 | `critical` | `#dc2626` | `#fee2e2` | `#fca5a5` |

### Usage in CSS

```css
/* Severity classes */
.category-excellent::before { background: var(--score-excellent); }
.category-good::before { background: var(--score-good); }
.category-warning::before { background: var(--score-warning); }
.category-critical::before { background: var(--score-critical); }
```

### Usage in JavaScript

```javascript
import { SCORE_COLORS } from './health-dashboard-ui.js';

const colors = SCORE_COLORS.getColor(75); // { primary, light, border }
const severity = SCORE_COLORS.getSeverity(75); // 'good'
const status = SCORE_COLORS.getStatusText(75); // 'Good'
```

---

## Category Icons (SVG)

All icons are **18x18** viewBox, stroke-based, 1.5px stroke width. They're designed to be clean and professional.

### Available Icons

| Category | Icon Name | Description |
|----------|-----------|-------------|
| Formatting | `formatting` | Horizontal lines, represents text alignment |
| Defined Terms | `definedTerms` | Document with text lines |
| Cross-References | `crossReferences` | Corner brackets with center dot |
| Party Names | `partyNames` | Two person silhouettes |
| Exhibits | `exhibits` | Layered documents |
| Empty Fields | `emptyFields` | Square with dashed line |
| Placeholders | `placeholders` | Code brackets with lines |

### Icon Access

```javascript
import { ICONS, CATEGORY_ICONS } from './health-dashboard-ui.js';

// Individual icons
const refreshIcon = ICONS.refresh;
const checkIcon = ICONS.check;

// Category icons by ID
const formattingIcon = CATEGORY_ICONS['formatting'];
```

### Adding New Icons

Icons should follow these guidelines:

1. **ViewBox**: `0 0 18 18` for category icons, `0 0 16 16` for action icons
2. **Stroke**: `1.5` width, `round` linecap and linejoin
3. **Color**: Use `currentColor` for fill/stroke
4. **Style**: Simple, geometric, professional

```javascript
// Template for new icons
const newIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="..." stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
```

---

## Issue Severity Badges

Issues are displayed with severity indicators:

### Error (Critical Issues)

```html
<div class="issue-item issue-error">
    <span class="issue-icon-wrapper error">
        <!-- X icon in circle -->
    </span>
    <div class="issue-content">
        <span class="issue-message">Error message</span>
        <span class="issue-detail">Details here</span>
    </div>
</div>
```

**Styling:**
- Background: `var(--score-critical-light)`
- Border: `var(--score-critical-border)`
- Icon: White X on red circle

### Warning

```html
<div class="issue-item issue-warning">
    <span class="issue-icon-wrapper warning">
        <!-- Warning triangle -->
    </span>
    ...
</div>
```

**Styling:**
- Background: `var(--score-warning-light)`
- Border: `var(--score-warning-border)`
- Icon: White ! on amber circle

### Pass (Success)

```html
<span class="pass-item">
    <span class="pass-check"><!-- Check icon --></span>
    Pass message
</span>
```

**Styling:**
- Background: `var(--score-excellent-light)`
- Color: `var(--score-excellent)`

---

## Animations

### Score Ring Animation

The score ring animates from 0 to the target score using exponential easing:

```javascript
function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
```

**Duration:** 1200ms

### Celebration (Perfect Score)

When score hits 100, confetti particles animate from top to bottom:

- **Particle count:** 50
- **Colors:** Green, blue, amber, purple, pink
- **Duration:** ~2 seconds
- **Easing:** ease-out fall

### Category Expand

Categories use CSS Grid animation for smooth expand/collapse:

```css
.category-details {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.category-card.expanded .category-details {
    grid-template-rows: 1fr;
}
```

---

## Trend Sparklines

Mini sparkline charts show score history:

```javascript
function buildSparkline(values, width = 60, height = 24) {
    // SVG polyline with dots
}
```

**Styling:**
- Line: 1.5px stroke, 60% opacity
- Current point: 2.5px radius filled circle
- Color: Inherits from parent (currentColor)

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Modal title | 18px | 600 | `--text-primary` |
| Score value (ring) | 36px | 700 | Dynamic by score |
| Category name | 14px | 500 | `--text-primary` |
| Issue message | 13px | 500 | `--text-primary` |
| Issue detail | 12px | 400 | `--text-secondary` |
| Meta text | 11px | 400 | `--text-muted` |

---

## Spacing System

Uses 4px base unit:

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 12px |
| `--space-lg` | 16px |
| `--space-xl` | 24px |
| `--space-2xl` | 32px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Modal |
| `--radius-full` | 9999px | Pills, circles |

---

## Shadow System

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 
             0 2px 4px -1px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 
             0 4px 6px -2px rgba(0, 0, 0, 0.04);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## Dark Mode

All colors automatically adapt to dark mode via `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
    :root {
        --surface-base: #111827;
        --surface-elevated: #1f2937;
        --text-primary: #f9fafb;
        /* ... */
    }
}
```

---

## Accessibility

### Reduced Motion

Animations are disabled for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Keyboard Navigation

All interactive elements are keyboard accessible:
- Modal close: focusable button
- Category expand: `role="button"`, `aria-expanded`
- Buttons: Standard focus states

### Color Contrast

All text meets WCAG AA contrast requirements:
- Primary text on background: 12.6:1
- Secondary text on background: 7.0:1
- Score colors on light backgrounds: 4.5:1+

---

## Component Examples

### Minimal Score Card

```html
<div class="health-score-section score-excellent">
    <div class="score-ring-container">
        <svg class="score-ring">...</svg>
    </div>
    <div class="score-details">
        <div class="score-status">Excellent</div>
    </div>
</div>
```

### Category Card (Collapsed)

```html
<div class="category-card category-good">
    <div class="category-header">
        <div class="category-icon">...</div>
        <div class="category-info">
            <div class="category-name">Formatting</div>
            <div class="category-progress">
                <div class="progress-track">
                    <div class="progress-fill" style="width: 85%"></div>
                </div>
            </div>
        </div>
        <div class="category-score">85</div>
    </div>
</div>
```

---

## Inspiration Sources

The design draws from:

1. **GitHub Contribution Graphs** — The idea of visualizing activity/quality over time
2. **Fitness App Dashboards** — Satisfying score rings, progress indicators
3. **Credit Score Displays** — Color-coded severity, at-a-glance assessment
4. **Financial Apps** — Premium feel, professional typography

---

## Future Enhancements

Potential improvements for future versions:

- [ ] Category-specific sparklines in cards
- [ ] Animated number transitions on all scores
- [ ] Sound effects for celebration (optional)
- [ ] Export to PDF with print styles
- [ ] Comparison mode (compare two reports)
- [ ] Goals/targets feature
