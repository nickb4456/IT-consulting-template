# DraftBridge Templates

> Generate letters, memos, and fax covers with auto-filled fields.

## Available Templates

### Letter
Professional business letter with:
- Date (auto-filled to today)
- Recipient name & address
- RE: subject line
- Closing phrase (Sincerely, Very truly yours, etc.)
- Delivery method (Via Email, Via Certified Mail, etc.)
- Enclosures notation
- Author/signer from firm roster

**Title Options:**
- Yes — use author's title from profile
- No — omit title
- Custom — enter specific title

### Memorandum
Internal memo format:
- Date
- To / From / CC
- Subject
- Author selection

### Fax Cover Sheet
Classic fax format:
- Date
- To / Fax number
- From / Phone
- Pages count
- RE: subject

## Authors/Signers

Authors are configured in firm settings:
```javascript
const AUTHORS = [
    { name: 'Nick Bridges', title: 'Managing Partner', default: true },
    { name: 'Sarah Chen', title: 'Partner' },
    // ...
];
```

Each author can have an associated title for signature blocks.

## Salutation Formatting

Smart salutation handling:
- "Dr. John Smith" → "Dr. Smith" (preserves honorific)
- "John Smith" → "John" (first name only)

Supported honorifics: Dr., Mr., Mrs., Ms., Prof., Hon., Rev., Judge

## Date Formats

Default: Full date (e.g., "February 3, 2026")

Future: Admin dashboard will allow firm-wide date format preferences:
- MMMM d, yyyy
- MM/dd/yyyy
- d MMMM yyyy

## Closings

Built-in options:
- Sincerely
- Very truly yours
- Best regards
- Respectfully
- Cordially
- Regards
- Yours truly
- With kind regards

## Delivery Methods

- Via Email
- Via Certified Mail
- Via Federal Express
- Via Facsimile
- Via Hand Delivery
- Via First Class Mail
- Via Overnight Delivery

## Enclosures

- Enclosure
- Enclosures
- Enc.
- Attachment
- Attachments
- Enclosures as stated

---

*Future: Email template, Client Intake, Engagement Letter (replacing dated Fax Cover)*
