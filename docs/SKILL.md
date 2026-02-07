# DraftBridge - Document Automation for Legal Professionals

> Word add-in that brings sanity to legal document formatting. Numbering that works. Templates that save time. Clauses at your fingertips.

## Quick Start

1. Install from Microsoft AppSource (coming soon) or sideload manifest.xml
2. Open Word → Home → Add-ins → DraftBridge
3. Start with Generate tab for letters/memos, or Library for clauses

## Core Features

| Feature | What It Does |
|---------|--------------|
| **Generate** | Create letters, memos, fax covers with auto-filled fields |
| **Numbering** | Apply legal numbering schemes (I→A→1→a→i) that actually work |
| **Fix Numbering** | Scan and repair broken Word numbering — our killer feature |
| **Library** | Browse/search 100+ legal clauses, one-click insert |
| **TOC** | Table of contents with proper legal formatting |
| **OCR** | Make scanned PDFs searchable via AWS Textract |

## Documentation

| File | Purpose |
|------|---------|
| [NUMBERING.md](./NUMBERING.md) | Numbering schemes, formats, fix/repair feature |
| [TEMPLATES.md](./TEMPLATES.md) | Letter, memo, fax generation |
| [LIBRARY.md](./LIBRARY.md) | Clause library, categories, saving clauses |
| [EFILING.md](./EFILING.md) | E-filing requirements, PDF/A, court profiles |
| [VOICE.md](./VOICE.md) | Voice control commands |

## API Endpoint

```
https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod
```

## Tech Stack

- Office.js / Word API
- Vanilla JavaScript (no framework)
- AWS Lambda + DynamoDB backend
- AES-256-GCM encryption for secure documents

---

*DraftBridge — Because Microsoft Word's numbering has been broken since 1997.*
