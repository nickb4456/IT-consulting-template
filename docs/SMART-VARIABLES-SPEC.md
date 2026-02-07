# DraftBridge Gold: Smart Variables Architecture

*Litera Create power. 10x the speed. Zero training.*

---

## Philosophy

Litera Create = 222 pages of docs, 3-day training, XML nightmares.
DraftBridge Gold = Click, type, done.

We steal their **concepts**, not their complexity.

---

## Architecture: Modern Word Add-in

**NOT XML. NOT COM/VSTO. NOT legacy.**

```
┌─────────────────────────────────────────────────────────┐
│                    Microsoft Word                        │
│  ┌───────────────────────┬───────────────────────────┐  │
│  │                       │    DraftBridge Task Pane  │  │
│  │                       │    ┌───────────────────┐  │  │
│  │    Document Canvas    │    │   React + JSON    │  │  │
│  │    (Live Preview)     │    │   Modern UI       │  │  │
│  │                       │    │   Real-time sync  │  │  │
│  │                       │    └───────────────────┘  │  │
│  └───────────────────────┴───────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Office.js API        │
              │    (Modern Add-in)      │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    DraftBridge API      │
              │    AWS Lambda + DynamoDB│
              └─────────────────────────┘
```

### Storage Format: JSON (Not XML)

**Templates:**
```json
{
  "id": "motion-to-dismiss",
  "name": "Motion to Dismiss",
  "version": "1.0.0",
  "jurisdiction": "federal",
  "components": ["federal-caption", "signature-block"],
  "variables": [...],
  "body": "..."
}
```

**User Data:**
```json
{
  "userId": "user_123",
  "profile": {...},
  "savedData": {...},
  "preferences": {...}
}
```

**Document State:**
```json
{
  "templateId": "motion-to-dismiss",
  "values": {
    "court": "usdc-sdny",
    "caseNumber": "1:24-cv-01234",
    "plaintiffs": [...]
  },
  "generatedAt": "2026-02-03T22:20:00Z"
}
```

### Why Modern Add-in (Office.js) > Legacy (VSTO/COM)

| Feature | Litera (Legacy) | DraftBridge (Modern) |
|---------|-----------------|----------------------|
| Platform | Windows only | Windows, Mac, Web |
| Install | IT deployment, MSI | One-click from AppSource |
| Updates | Manual push | Auto-update |
| Storage | XML in DB | JSON in DynamoDB |
| Auth | AD/LDAP mess | OAuth 2.0 / SSO |
| Offline | Broken | Works (cached) |
| Mobile | Nope | Word Mobile support |

---

## 1. Variable Types

### Basic Types
```yaml
text:        Single line input
textarea:    Multi-line input  
date:        Date picker (with format options)
checkbox:    Boolean toggle
select:      Dropdown from predefined list
number:      Numeric with optional min/max
```

### Smart Types (The Good Stuff)
```yaml
contact:     Person with name/title/company/address/email/phone
             → Auto-generates: salutation, address block, email line
             
party:       Legal party (inherits contact + adds role)
             → Plaintiff, Defendant, Petitioner, Respondent, etc.
             
attorney:    Lawyer (inherits contact + bar number, firm)
             → Auto-generates: signature block, counsel block
             
court:       Court selector with jurisdiction awareness
             → Auto-populates: caption format, filing requirements
             
signature:   Signature block picker (user's saved signatures)

letterhead:  Letterhead picker (firm's letterhead library)
```

---

## 2. Variable Schema

```typescript
interface Variable {
  id: string;              // unique identifier
  name: string;            // display label
  type: VariableType;      // from types above
  required: boolean;       // must fill before generate
  default?: any;           // default value or expression
  cascade?: CascadeRule[]; // what other vars this affects
  conditional?: {          // when to show/hide
    dependsOn: string;     // variable id
    condition: 'equals' | 'notEquals' | 'contains' | 'empty' | 'notEmpty';
    value?: any;
  };
  group?: string;          // UI grouping
  helpText?: string;       // tooltip
}

interface CascadeRule {
  target: string;          // variable id to update
  field: string;           // which field of target
  expression: string;      // how to compute
}
```

---

## 3. Contact Cascade (The Magic)

When user fills a `contact` variable, it cascades:

```yaml
Input: contact.recipient
  ├── name: "John Smith"
  ├── title: "CEO"
  ├── company: "Acme Corp"
  ├── address:
  │     street: "123 Main St"
  │     city: "Boston"
  │     state: "MA"
  │     zip: "02101"
  └── email: "john@acme.com"

Auto-Generated:
  ├── recipient.salutation     → "Dear Mr. Smith:"
  ├── recipient.formalName     → "John Smith, CEO"
  ├── recipient.addressBlock   → "John Smith\nCEO\nAcme Corp\n123 Main St\nBoston, MA 02101"
  ├── recipient.cityState      → "Boston, Massachusetts"
  └── recipient.emailLine      → "Via Email: john@acme.com"
```

**Template Usage:**
```handlebars
{{recipient.addressBlock}}

{{recipient.salutation}}

Re: {{matter.name}}

...

cc: {{#each ccRecipients}}{{this.formalName}}{{/each}}
```

---

## 4. Party System (Litigation Power)

```yaml
parties:
  - type: party[]
    roles:
      - plaintiff
      - defendant  
      - petitioner
      - respondent
      - appellant
      - appellee
      - cross-defendant
      - intervenor

Auto-Generated from parties[]:
  ├── caption.plaintiffs      → "JOHN SMITH,"
  ├── caption.defendants      → "ACME CORP, et al.,"
  ├── caption.versus          → "v." or "vs." (jurisdiction-aware)
  ├── serviceList             → Full service list with addresses
  └── counselBlock            → All counsel of record
```

**Smart Caption Example:**
```handlebars
{{caption.plaintiffs}}
          {{caption.versus}}
{{caption.defendants}}
```

Single plaintiff + single defendant:
```
JOHN SMITH,
          v.
ACME CORPORATION,
```

Multiple plaintiffs:
```
JOHN SMITH, et al.,
          v.
ACME CORPORATION, et al.,
```

---

## 5. Conditional Sections

Simple show/hide without code:

```yaml
variables:
  - id: includeExhibits
    type: checkbox
    name: "Include Exhibit List?"
    
  - id: exhibitList
    type: textarea
    name: "Exhibits"
    conditional:
      dependsOn: includeExhibits
      condition: equals
      value: true
```

**Template:**
```handlebars
{{#if includeExhibits}}
EXHIBIT LIST

{{exhibitList}}
{{/if}}
```

---

## 6. User Profiles (Sticky Preferences)

Each user saves defaults:

```typescript
interface UserProfile {
  userId: string;
  firmId: string;
  
  defaults: {
    letterhead: string;      // letterhead template id
    signature: string;       // signature block id
    dateFormat: string;      // "MMMM D, YYYY" etc
    fontFamily: string;
    fontSize: number;
  };
  
  attorney: {
    name: string;
    barNumber: string;
    email: string;
    phone: string;
    fax?: string;
  };
  
  firm: {
    name: string;
    address: Address;
    logo?: string;
  };
}
```

**Auto-injection:**
When creating any document, user profile auto-fills:
- `{{author.name}}` → User's name
- `{{author.signature}}` → Their saved signature block
- `{{firm.name}}` → Firm name
- `{{firm.letterhead}}` → Their default letterhead

---

## 7. Jurisdiction Engine

```typescript
interface Jurisdiction {
  id: string;
  name: string;              // "California Superior Court"
  level: 'federal' | 'state' | 'local';
  state?: string;
  district?: string;
  
  formatting: {
    captionStyle: 'centered' | 'left' | 'table';
    versusText: 'v.' | 'vs.' | 'VS.';
    caseNumberLabel: 'Case No.' | 'No.' | 'Civil Action No.';
    lineNumbering: boolean;
    lineNumberStart: number;
    paperSize: 'letter' | 'legal' | 'pleading';
    margins: Margins;
  };
  
  requirements: {
    localRules?: string;     // link to local rules
    efiling?: boolean;
    efilingUrl?: string;
    serviceMethod: string[];
  };
}
```

**Usage:**
```handlebars
{{court.name}}
{{court.caseNumberLabel}} {{caseNumber}}

{{#if court.formatting.lineNumbering}}
[Enable line numbers starting at {{court.formatting.lineNumberStart}}]
{{/if}}
```

---

## 8. Component Library

Templates are composed of reusable blocks:

```yaml
components:
  letterheads:
    - firm-standard
    - firm-minimal
    - firm-color
    
  signatures:
    - formal-with-bar
    - formal-no-bar
    - informal
    - electronic
    
  captions:
    - california-superior
    - federal-district
    - bankruptcy
    - family-law
    
  counselBlocks:
    - single-attorney
    - multi-attorney
    - firm-block
    
  serviceBlocks:
    - standard-service
    - electronic-service
    - mail-service
```

**Composing a Pleading:**
```yaml
template: motion-to-dismiss
components:
  - caption: federal-district
  - counselBlock: firm-block
  - signature: formal-with-bar
  - serviceBlock: electronic-service

variables:
  - court (auto-selects caption)
  - parties[]
  - caseNumber
  - motionTitle
  - bodyText
  - exhibits[]
```

---

## 9. Expression Syntax (Keep It Simple)

Litera uses `[Variable__Field] ^= value ^? trueResult ^: falseResult`

We use **readable expressions:**

```handlebars
{{!-- Simple conditionals --}}
{{#if variable}}show this{{/if}}
{{#unless variable}}show if false{{/unless}}

{{!-- Comparisons --}}
{{#if (eq partyCount 1)}}single party{{/if}}
{{#if (gt partyCount 1)}}multiple parties{{/if}}

{{!-- Loops --}}
{{#each parties}}
  {{this.name}}
{{/each}}

{{!-- With index --}}
{{#each parties}}
  {{#if @first}}{{this.name}}{{else}}, {{this.name}}{{/if}}
{{/each}}

{{!-- Formatters --}}
{{date today format="MMMM D, YYYY"}}
{{uppercase plaintiff.name}}
{{titlecase defendant.name}}
```

---

## 10. Data Flow

```
┌─────────────────┐
│   User Input    │
│  (Task Pane)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cascade Engine │  ← Computes derived values
│  (Real-time)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Template Engine │  ← Handlebars + helpers
│  (Render)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DOCX Builder   │  ← Final document
│  (Output)       │
└─────────────────┘
```

---

## 11. UI: The Task Pane

```
┌──────────────────────────────────────┐
│ 📄 Motion to Dismiss                 │
├──────────────────────────────────────┤
│                                      │
│ CASE INFO                            │
│ ┌──────────────────────────────────┐ │
│ │ Court        [Select Court    ▼] │ │
│ │ Case No.     [_______________]   │ │
│ │ Judge        [_______________]   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ PARTIES                              │
│ ┌──────────────────────────────────┐ │
│ │ 👤 John Smith (Plaintiff)    [x] │ │
│ │ 🏢 Acme Corp (Defendant)     [x] │ │
│ │ [+ Add Party]                    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ DOCUMENT                             │
│ ┌──────────────────────────────────┐ │
│ │ Motion Title [Motion to Dismiss] │ │
│ │ ☑ Include Exhibit List           │ │
│ │ ☑ Include Proof of Service       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ YOUR INFO (from profile)             │
│ ┌──────────────────────────────────┐ │
│ │ 📝 Jane Doe, Esq.                │ │
│ │    Bar No. 123456                │ │
│ │    [Edit Profile]                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │     [Preview]    [Generate]      │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 12. Implementation Priority

### Phase 1: Core (Week 1-2)
- [ ] Basic variable types (text, textarea, date, select, checkbox)
- [ ] Simple conditionals (show/hide)
- [ ] User profile with defaults
- [ ] Handlebars template engine

### Phase 2: Smart Types (Week 3-4)
- [ ] Contact type with cascade
- [ ] Party type with roles
- [ ] Attorney type
- [ ] Auto-generated salutations/address blocks

### Phase 3: Components (Week 5-6)
- [ ] Letterhead library
- [ ] Signature library
- [ ] Caption components
- [ ] Component composition in templates

### Phase 4: Jurisdiction (Week 7-8)
- [ ] Jurisdiction database
- [ ] Court-aware formatting
- [ ] Line numbering support
- [ ] Caption style switching

### Phase 5: Polish (Week 9-10)
- [ ] CRM integration hooks
- [ ] Bulk party import
- [ ] Template marketplace
- [ ] Analytics/usage tracking

---

## 13. Example: Full Pleading Template

```yaml
id: motion-to-dismiss
name: Motion to Dismiss
category: litigation/motions
jurisdiction: federal

components:
  caption: federal-district-caption
  counsel: firm-counsel-block
  signature: attorney-signature
  service: electronic-service-block

variables:
  - id: court
    type: court
    name: Court
    required: true
    
  - id: caseNumber
    type: text
    name: Case Number
    required: true
    
  - id: plaintiffs
    type: party[]
    name: Plaintiffs
    required: true
    config:
      role: plaintiff
      min: 1
      
  - id: defendants
    type: party[]
    name: Defendants
    required: true
    config:
      role: defendant
      min: 1
      
  - id: movingParty
    type: select
    name: Moving Party
    options:
      source: defendants
      
  - id: grounds
    type: select[]
    name: Grounds for Dismissal
    options:
      - label: "Failure to State a Claim (12(b)(6))"
        value: "12b6"
      - label: "Lack of Subject Matter Jurisdiction (12(b)(1))"
        value: "12b1"
      - label: "Lack of Personal Jurisdiction (12(b)(2))"
        value: "12b2"
      - label: "Improper Venue (12(b)(3))"
        value: "12b3"
        
  - id: includeDeclaration
    type: checkbox
    name: Include Supporting Declaration
    default: false
    
  - id: declarant
    type: attorney
    name: Declarant
    conditional:
      dependsOn: includeDeclaration
      condition: equals
      value: true

body: |
  {{> federal-district-caption}}
  
  NOTICE OF MOTION AND MOTION TO DISMISS
  
  TO ALL PARTIES AND THEIR ATTORNEYS OF RECORD:
  
  PLEASE TAKE NOTICE that on {{hearingDate}}, at {{hearingTime}}, or as 
  soon thereafter as the matter may be heard, in {{court.department}} of 
  the above-entitled Court, located at {{court.address}}, {{movingParty.name}} 
  ("{{movingParty.shortName}}") will and hereby does move this Court for 
  an order dismissing {{#if (eq plaintiffs.length 1)}}Plaintiff's{{else}}Plaintiffs'{{/if}} 
  Complaint pursuant to Federal Rule of Civil Procedure {{#each grounds}}{{#unless @first}}, {{/unless}}{{this.value}}{{/each}}.
  
  This Motion is made on the grounds that {{groundsStatement}}.
  
  This Motion is based upon this Notice of Motion and Motion, the Memorandum 
  of Points and Authorities filed herewith, {{#if includeDeclaration}}the Declaration 
  of {{declarant.name}} filed herewith, {{/if}}the pleadings and records on 
  file in this action, and such other matters as may be presented to the 
  Court at the hearing of this Motion.
  
  {{> attorney-signature}}
  
  {{> electronic-service-block}}
```

---

*Speed wins. Ship it.* 🚀
