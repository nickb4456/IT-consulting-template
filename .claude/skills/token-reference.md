# Skill: Token Reference

Quick-reference card for all DraftBridge CSS design tokens.
Canonical source: `src/styles/tokens.css`

---

## Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-primary)` | `#5C4A32` | Logo text, headers, dark accents |
| `var(--db-primary-light)` | `#8B7355` | Buttons, active states, accents |
| `var(--db-primary-hover)` | `#6d5a43` | Button hover states |
| `var(--db-primary-dark)` | `#6B5344` | Gradient dark stop |
| `var(--db-accent)` | `#C4A052` | Gold accent, highlights |
| `var(--db-accent-light)` | `rgba(196, 160, 82, 0.12)` | Accent backgrounds |

## Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-bg)` | `#f5f5f5` | Page background |
| `var(--db-surface)` | `#FFFFFF` | Cards, inputs, panels |
| `var(--db-surface-muted)` | `#f8f8f8` | Muted backgrounds, status bars |
| `var(--db-surface-hover)` | `#f0f0f0` | Hover backgrounds |
| `var(--db-surface-warm)` | `#fdf8f3` | Warm-tinted surfaces |
| `var(--db-surface-warm-subtle)` | `#faf8f5` | Subtle warm tint |

## Borders

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-border)` | `#e0e0e0` | Standard borders, dividers |
| `var(--db-border-light)` | `#e8e8e8` | Card borders, subtle dividers |
| `var(--db-border-input)` | `#ddd` | Input field borders |
| `var(--db-border-subtle)` | `#eee` | Very light borders |
| `var(--db-border-hover)` | `#D4D4D4` | Border on hover |

## Text

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-text)` | `#333` | Primary text, headings |
| `var(--db-text-secondary)` | `#555` | Body text, labels |
| `var(--db-text-muted)` | `#666` | Descriptions, captions |
| `var(--db-text-disabled)` | `#999` | Disabled text, placeholders |
| `var(--db-text-hint)` | `#888` | Hint text |

## Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-success)` | `#2e7d32` | Success text/icons |
| `var(--db-success-bg)` | `#e8f5e9` | Success backgrounds |
| `var(--db-success-border)` | `#c8e6c9` | Success borders |
| `var(--db-error)` | `#c62828` | Error text/icons |
| `var(--db-error-bg)` | `#ffebee` | Error backgrounds |
| `var(--db-error-border)` | `#ffcdd2` | Error borders |
| `var(--db-error-input)` | `#dc3545` | Error input border |
| `var(--db-warning)` | `#f57c00` | Warning text/icons |
| `var(--db-warning-bg)` | `#fff3cd` | Warning backgrounds |
| `var(--db-warning-border)` | `#ffc107` | Warning borders |
| `var(--db-warning-text)` | `#856404` | Warning text (on warning bg) |
| `var(--db-warning-light)` | `#ffe69c` | Light warning (gradient stop) |
| `var(--db-info)` | `#1565c0` | Info text/links |
| `var(--db-info-bg)` | `#e3f2fd` | Info backgrounds |
| `var(--db-info-border)` | `#90caf9` | Info borders |

## Legal Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-plaintiff)` | `#2196F3` | Plaintiff accent |
| `var(--db-plaintiff-bg)` | `#e3f2fd` | Plaintiff backgrounds |
| `var(--db-plaintiff-text)` | `#1976d2` | Plaintiff label text |
| `var(--db-defendant)` | `#f44336` | Defendant accent |
| `var(--db-party-neutral)` | `#9e9e9e` | Neutral party color |

## Category Tags

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-cat-contracts-bg)` | `#e3f2fd` | Contracts category bg |
| `var(--db-cat-contracts-text)` | `#1565c0` | Contracts category text |
| `var(--db-cat-litigation-bg)` | `#ffebee` | Litigation category bg |
| `var(--db-cat-litigation-text)` | `#c62828` | Litigation category text |
| `var(--db-cat-corporate-bg)` | `#e8f5e9` | Corporate category bg |
| `var(--db-cat-corporate-text)` | `#2e7d32` | Corporate category text |
| `var(--db-cat-ip-bg)` | `#f3e5f5` | IP category bg |
| `var(--db-cat-ip-text)` | `#7b1fa2` | IP category text |

## Spacing Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-space-xs)` | 4px | Tight gaps, icon margins |
| `var(--db-space-sm)` | 8px | Small padding, tight gaps |
| `var(--db-space-md)` | 12px | Standard padding, item gaps |
| `var(--db-space-lg)` | 16px | Section padding, card padding |
| `var(--db-space-xl)` | 20px | Large gaps |
| `var(--db-space-2xl)` | 24px | Section dividers |
| `var(--db-space-3xl)` | 40px | Empty state padding |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-radius-sm)` | 4px | Tags, small elements |
| `var(--db-radius-md)` | 6px | Inputs, buttons |
| `var(--db-radius-lg)` | 8px | Cards, panels |
| `var(--db-radius-xl)` | 10px | Modals, large containers |
| `var(--db-radius-2xl)` | 12px | Hero sections |
| `var(--db-radius-pill)` | 50% | Circular elements |
| `var(--db-radius-badge)` | 10px | Badge pill shape |

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-font-sans)` | system stack | Body text, UI |
| `var(--db-font-serif)` | Times New Roman, Georgia | Document preview |
| `var(--db-font-mono)` | Consolas, Monaco | Code, technical |
| `var(--db-text-xs)` | 10px | Tags, tiny labels |
| `var(--db-text-sm)` | 11px | Small labels |
| `var(--db-text-base)` | 12px | Tab labels, small text |
| `var(--db-text-md)` | 13px | Descriptions, body |
| `var(--db-text-lg)` | 14px | Standard body text |
| `var(--db-text-xl)` | 16px | Section headers |
| `var(--db-text-2xl)` | 18px | Page headers |
| `var(--db-text-3xl)` | 20px | Logo, hero text |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-shadow-sm)` | `0 1px 3px rgba(0,0,0,0.08)` | Cards at rest |
| `var(--db-shadow-md)` | `0 2px 8px rgba(0,0,0,0.1)` | Cards on hover, dropdowns |
| `var(--db-shadow-lg)` | `0 4px 12px rgba(0,0,0,0.08)` | Popovers, elevated panels |
| `var(--db-shadow-xl)` | `0 10px 40px rgba(0,0,0,0.2)` | Modals |
| `var(--db-shadow-primary)` | `0 4px 12px rgba(139,115,85,0.15)` | Primary button elevation |
| `var(--db-shadow-modal)` | `0 20px 60px rgba(0,0,0,0.3)` | Modal overlays |

## Component Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-input-padding)` | `8px 12px` | Standard input padding |
| `var(--db-input-padding-lg)` | `10px 14px` | Large input padding |
| `var(--db-input-focus-ring)` | `0 0 0 2px rgba(139,115,85,0.15)` | Input focus ring |
| `var(--db-input-focus-ring-lg)` | `0 0 0 3px rgba(139,115,85,0.15)` | Large input focus ring |
| `var(--db-btn-padding)` | `8px 16px` | Standard button padding |
| `var(--db-btn-padding-sm)` | `6px 12px` | Small button padding |
| `var(--db-btn-padding-lg)` | `10px 18px` | Large button padding |
| `var(--db-card-radius)` | `var(--db-radius-lg)` | Card corner radius |
| `var(--db-card-border)` | `1px solid var(--db-border-light)` | Card border |
| `var(--db-card-shadow)` | `var(--db-shadow-sm)` | Card shadow |

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-transition)` | `all 0.2s` | Standard hover/state transitions |
| `var(--db-transition-fast)` | `all 0.15s` | Active/click state transitions |
