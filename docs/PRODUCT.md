# DraftBridge Product Definition

> Last updated: 2026-02-02

---

## What We're Building

**DraftBridge** is a Microsoft Word add-in that gives law firms a centralized clause library with one-tap insert, document template generation, and numbering management.

### One-Liner
> "Stop hunting for clauses. Start drafting."

### Elevator Pitch
> Every law firm has thousands of approved clauses scattered across old documents, emails, and partner hard drives. DraftBridge puts them all in one searchable library, accessible with one tap from inside Word. Associates spend less time hunting, partners get consistent language, and the firm captures institutional knowledge before it walks out the door.

---

## Who It's For

### Primary Users

| Persona | Pain Point | How DraftBridge Helps |
|---------|------------|----------------------|
| **Junior Associates** | "I don't know where to find the 'good' version of this clause" | Searchable library with approved-only clauses |
| **Senior Associates** | "I waste hours searching through old deals" | One-tap insert, no file digging |
| **Partners** | "Associates keep using outdated language" | Firm-controlled approved clause library |
| **Knowledge Management** | "We lose knowledge when people leave" | Centralized, version-tracked clause library |
| **IT/Admin** | "Litera is expensive and complex" | Simple add-in, no heavy infrastructure |

### Target Firms
- Mid-size law firms (50-500 attorneys)
- BigLaw practice groups wanting autonomy from firm-wide systems
- Boutique firms without budget for Litera/iManage
- In-house legal teams

### NOT For (Yet)
- Solo practitioners (no clause sharing benefit)
- Non-legal document work
- Litigation-only firms (less contract drafting)

---

## Features — What Exists Now

### ✅ Clause Library (Library Tab)
- Browse all firm clauses in a "feed" view
- Search by title, content, or tags
- Filter by category (Contracts, Litigation, Corporate, IP)
- One-tap insert at cursor position
- Usage tracking (which clauses are popular)
- 106 real clauses from SEC filings included

### ✅ Document Generation (Generate Tab)
- **Letter template** — Date, recipient, address, RE line, closing
- **Memo template** — TO, FROM, DATE, RE, CC
- **Fax Cover template** — Full fax cover sheet
- Auto-fills current date
- Inserts formatted text at cursor

### ✅ Numbering Management (Numbering Tab)
- Browse numbering schemes (Document / Default / Personal)
- Preview selected scheme format
- 4 built-in schemes:
  - Legal Outline (I → A → 1 → (a) → (i))
  - Contract Sections (ARTICLE I → Section 1)
  - Heading Style (1. → 1.1 → 1.1.1)
  - Pleading Format (1 → a → (1) → (a))
- Full scheme editor:
  - 5 levels configurable
  - Text before/after numbers
  - Numbering style (Roman, Alpha, Numeric)
  - Follow-with (Tab, Space, Nothing)
  - Options: Restart, Legal Style, Right Align
- Apply to selection

### ✅ Edit Tools (Edit Tab)
- Quick link to Numbering panel
- TOC generation (coming soon)
- Pleading format (coming soon)

### ✅ Settings (Settings Tab)
- Firm settings placeholder
- Styles configuration placeholder

### ✅ Backend/Infrastructure
- AWS Lambda + API Gateway
- DynamoDB single-table design
- Waitlist capture API
- CORS enabled for browser requests
- Deployed to us-east-1

### ✅ Supporting Assets
- Landing page (https://aibridges.org/draftbridge/)
- Manifest validated by Microsoft
- 3 SEO blog posts
- Admin dashboard (clause management)
- Mobile PWA version

---

## Features — In Scope (Planned)

### Phase 2 (Current)
- [ ] User authentication (Cognito)
- [ ] Conditional logic in clauses
- [ ] Cross-document term consistency
- [ ] Save clause from selection
- [ ] User profiles and preferences

### Phase 3 (Enterprise)
- [ ] SAML/SSO integration
- [ ] Per-firm encryption (KMS)
- [ ] Audit logging
- [ ] Table of Contents tool
- [ ] Pleading formatting tool
- [ ] AI clause suggestions

---

## Features — OUT of Scope

| Feature | Why Out |
|---------|---------|
| Full document assembly (like HotDocs) | Too complex for MVP, different market |
| E-signature integration | Different product category |
| Contract lifecycle management | Enterprise CLM is separate market |
| Billing/time tracking | Not our lane |
| Client portal | Different product |
| XML manipulation of Word internals | Too fragile, maintenance nightmare |
| Complex nested list generation | Diminishing returns |
| Full programming language for conditionals | Keep it simple |
| Mac-native version | Web add-in works on Mac Word |
| Mobile document editing | Read-only reference is enough |

---

## Competitive Positioning

### vs. Litera Create/NTD
- **DraftBridge:** Simpler, cheaper, cloud-native
- **Litera:** More features, higher complexity, expensive

### vs. Law Insider
- **DraftBridge:** Private firm library, insert into Word
- **Law Insider:** Public clauses, research tool

### vs. Built-in Word features
- **DraftBridge:** Firm-controlled library, better UX
- **Word:** Generic templates, no firm customization

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Waitlist signups | 100+ |
| Paid firms (Year 1) | 10 |
| Clauses inserted/week/user | 20+ |
| Time saved per document | 30+ minutes |
| NPS | 40+ |

---

*This document defines what DraftBridge is and isn't.*
