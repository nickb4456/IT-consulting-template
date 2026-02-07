# Skill: Fix Spacing

Standardize spacing across DraftBridge CSS files using the design token system.

## Token Reference

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-space-xs)` | 4px | Tight gaps, icon margins |
| `var(--db-space-sm)` | 8px | Small padding, button vertical padding |
| `var(--db-space-md)` | 12px | Standard padding, gap between items |
| `var(--db-space-lg)` | 16px | Section padding, card padding, gap between sections |
| `var(--db-space-xl)` | 20px | Large gaps, section margins |
| `var(--db-space-2xl)` | 24px | Section dividers |
| `var(--db-space-3xl)` | 40px | Empty state padding, large separators |

## Component-Specific Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `var(--db-input-padding)` | `8px 12px` | All text inputs, selects, textareas |
| `var(--db-input-padding-lg)` | `10px 14px` | Large inputs (search, primary fields) |
| `var(--db-btn-padding)` | `8px 16px` | Standard buttons |
| `var(--db-btn-padding-sm)` | `6px 12px` | Small buttons |
| `var(--db-btn-padding-lg)` | `10px 18px` | Large/primary action buttons |

## Procedure

1. Search the target file for hardcoded pixel values in `padding`, `margin`, `gap` properties
2. Map each value to the nearest token:
   - `4px` -> `var(--db-space-xs)`
   - `8px` -> `var(--db-space-sm)`
   - `10px` -> between sm and md; use `var(--db-space-sm)` or `var(--db-space-md)` depending on context
   - `12px` -> `var(--db-space-md)`
   - `14px` -> between md and lg; round to `var(--db-space-md)` or `var(--db-space-lg)`
   - `16px` -> `var(--db-space-lg)`
   - `20px` -> `var(--db-space-xl)`
   - `24px` -> `var(--db-space-2xl)`
   - `40px` -> `var(--db-space-3xl)`
3. For compound values like `padding: 8px 16px`, use the component tokens (`var(--db-btn-padding)`, `var(--db-input-padding)`) when applicable
4. For gap between items in a flex/grid container, prefer `var(--db-space-md)` (12px) or `var(--db-space-lg)` (16px)
5. For section-level margins (between groups of content), prefer `var(--db-space-lg)` (16px) or `var(--db-space-xl)` (20px)

## Rules

- Never introduce new spacing values outside the token scale
- If a value falls between two tokens, round to the nearest one
- The canonical source is `src/styles/tokens.css` -- do not modify token values without discussion
- All CSS files except `tokens.css` should use token references, not raw pixel values
