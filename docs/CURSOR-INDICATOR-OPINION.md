# Cursor Location Indicator — UX Recommendation

**Author:** Pip  
**Date:** 2026-02-04  
**Status:** Opinion/Recommendation

---

## TL;DR

**Go with Option 2: Colored Border** — but make it a *left-edge only* border (like a code editor's "current line" indicator). Subtle, professional, doesn't touch document content.

---

## Analysis of Each Option

### Option 1: Paragraph Background Highlight ❌

**Problem:** In legal documents, background colors carry meaning:
- Yellow = comment/note
- Pink/Red = tracked deletion  
- Green = tracked insertion

A bright background will trigger "wait, is this markup?" anxiety. Lawyers are trained to scrutinize any colored background before sending documents out. You'd be adding cognitive load, not reducing it.

Also: full paragraph highlights in dense contracts look *loud*. Legal docs aren't code editors.

### Option 2: Colored Border ✅ (Recommended)

**Why it works:**
- Borders don't have existing "meaning" in legal workflow
- Visual without being intrusive
- Familiar pattern (code editors, modern text tools)
- Doesn't modify document content
- Clear at a glance even in a long scroll

**Refinement:** Don't do a full box border — just a **left-edge vertical bar**. Think VS Code's current line highlight, or Notion's block indicator. It says "you are here" without screaming.

### Option 3: Pin Marker Character ❌

**Hard no.** This inserts content into the document. Risks:
- Marker accidentally left in final document (legal malpractice territory)
- Pollutes undo history
- Could break paragraph numbering logic
- Lawyers will not trust a tool that modifies their document "temporarily"

Never insert content the user didn't ask for.

---

## Better Idea: Hybrid Approach

If the Word API allows it, consider a **left-margin indicator** — something in the gutter area that doesn't touch the paragraph formatting at all. Like a small colored dot or bar in the margin space.

If that's not feasible, the left-border approach is the practical winner.

---

## Implementation Questions

### Should it auto-follow the cursor?
**Yes, but debounced.** 

- Follow cursor position, but don't update on every keystroke
- Wait ~300ms after cursor movement stops before updating
- This prevents distracting flicker while typing

### Toggle on/off?
**Absolutely essential.**

Some lawyers will love it. Some will find any visual addition distracting. This needs to be a user preference, ideally with a keyboard shortcut for quick toggle.

Default: **ON** (show its value), but make it easy to disable.

### What color?

Avoid colors with existing legal document meaning:
- ❌ Red — danger/deletion
- ❌ Green — accepted changes  
- ❌ Blue — hyperlinks, comments
- ❌ Yellow — highlights, comments

**Recommended: Soft amber/orange (#E8A838) or muted purple (#8B7EC8)**

These are:
- Distinctive without being alarming
- Professional looking
- Won't be confused with tracked changes
- Visible in both light and dark themes

Let users customize if they want, but ship a sensible default.

---

## Final Recommendation

```
Left-border indicator
├── Color: Amber (#E8A838) or configurable
├── Width: 3-4px solid
├── Position: Left edge of paragraph only
├── Behavior: Auto-follow cursor (300ms debounce)
├── Toggle: Settings + keyboard shortcut
└── Default: Enabled
```

This gives lawyers the "you are here" signal they need without:
- Modifying document content
- Conflicting with track-changes muscle memory
- Looking unprofessional in dense legal text

---

## One More Thing

Consider adding a **status bar indicator** too — something that shows "¶ 4.2.1" (the current paragraph number) in a fixed UI location. Sometimes knowing *where* you are in the numbering hierarchy is as useful as seeing *which* paragraph is active.

The border shows position visually. The status indicator shows it semantically.

—Pip 🐿️
