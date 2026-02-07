# DraftBridge Numbering

> Legal numbering that actually works. Apply schemes, fix corruption, save custom formats.

## The Problem

Word's numbering is **style-based, not character-based**. Every number is tied to hidden style hierarchies. Move one paragraph → everything breaks. This has been complained about since Word 97.

> "I've spent more time fixing numbering than writing my entire report." — Every lawyer ever

## Built-in Schemes

### Legal Outline (Briefs, Pleadings)
```
I.    Article One
  A.    Section
    1.    Paragraph
      (a)    Sub-paragraph
        (i)    Detail (romanette)
```

### Contract Sections (Transactional)
```
ARTICLE I    DEFINITIONS
  Section 1.1    First Definition
    a.    Detail
      (i)    Sub-detail
```

### Heading Style (Decimal)
```
1.    First Heading
  1.1    Sub-heading
    1.1.1    Detail
```

### Pleading Format (California/Federal)
```
1.    First allegation
  a.    Supporting fact
    (1)    Detail
```

## Fix Numbering (Killer Feature)

Scan document for issues:
- **Unexpected restarts** — Goes 1, 2, 3, 1 instead of continuing
- **Fragmented lists** — Multiple separate lists that should be one
- **Manual numbering** — Someone typed "1." instead of using Word's list

One-click repair:
- "Continue Numbering" — Make lists continuous
- "Convert to List" — Turn manual typing into proper Word lists
- "Fix All" — Batch repair everything

## Custom Schemes

Save your firm's numbering format:
1. Select numbered text in document
2. Click "Save from Document"
3. Name your scheme
4. It's now available in your saved schemes

## Style Associations

Link numbering levels to Word styles:
- Level 1 → Heading 1
- Level 2 → Heading 2
- etc.

This enables proper TOC generation from numbered content.

## API Reference

```javascript
// Apply scheme programmatically
const scheme = numberingSchemes['legal-outline'];
await applySelectedScheme();

// Scan for issues
await scanForNumberingIssues();

// Fix specific issue
await fixIssue(issueId, 'continue');
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Promote level | Tab |
| Demote level | Shift+Tab |
| Continue numbering | (coming soon) |

---

*Microsoft has been failing at legal numbering for 29+ years. DraftBridge fixes it.*
