# DraftBridge Clause Library

> 100+ legal clauses, searchable, one-click insert at cursor.

## Overview

The Library tab provides access to a curated collection of legal clauses:
- **Contracts** — Indemnification, limitation of liability, confidentiality, etc.
- **Litigation** — Jurisdiction, venue, choice of law, etc.
- **Corporate** — Board resolutions, officer certificates, etc.
- **IP** — Assignment, license grants, work-for-hire, etc.

## Using the Library

### Search
Type in the search box to filter clauses by:
- Title
- Content
- Keywords

Search is debounced (200ms) for performance.

### Filter by Category
Click category tabs:
- **All** — Show everything
- **Contracts** — Contract-related clauses
- **Litigation** — Court/dispute clauses
- **Corporate** — Corporate governance
- **IP** — Intellectual property

### Insert a Clause
Click on any clause card to insert at cursor position.

The clause content is inserted as plain text, preserving your document's existing formatting.

## Saving Clauses

Save selected text from your document to the library:

1. Highlight text in Word
2. Go to Settings → "Save Highlighted Text"
3. Enter a title
4. Select category
5. Click "Save Clause"

Saved clauses appear in your personal library and sync across devices (when logged in).

## API Integration

Clauses are stored in DynamoDB:

```javascript
// Fetch all clauses
const response = await fetch(`${API}/clauses/${FIRM}`);
const clauses = await response.json();

// Save a clause
await fetch(`${API}/clauses/${FIRM}`, {
    method: 'POST',
    body: JSON.stringify({
        title: 'My Clause',
        content: 'Clause text...',
        category: 'contracts'
    })
});
```

## Clause Structure

```javascript
{
    id: 'clause-123',
    title: 'Standard Indemnification',
    content: 'Party A shall indemnify...',
    category: 'contracts',  // contracts|litigation|corporate|ip
    firm: 'morrison',
    usage: 42,              // Usage tracking
    createdAt: '2026-01-15T...',
    updatedAt: '2026-02-01T...'
}
```

## Security

- All clause content is sanitized on save (XSS prevention)
- HTML tags stripped
- Script injection blocked
- Max content length enforced

---

*106 real clauses sourced from SEC filings + open source legal repos.*
