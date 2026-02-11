# DraftBridge Gold -- Patterns, Lessons & Opportunities

> Generated: 2026-02-07
> Codebase: ~32K LOC across 60+ files (HTML, JS, TS, TSX, CSS, JSON, MD)
> Platform: Microsoft Word Add-in (Office.js)

---

## 1. Architecture Patterns

### 1.1 Dual-Layer Architecture (Vanilla JS + TypeScript)

DraftBridge uses a **two-tier architecture** that reflects its evolution:

**Layer 1: Taskpane (Vanilla JS, no build step)**
- `taskpane.html` loads all CSS and JS via `<link>` and `<script>` tags
- `SmartVariables` namespace is the primary runtime object
- 8 modules (`sv-state.js`, `sv-courts.js`, `sv-contacts.js`, `sv-templates.js`, `sv-profile.js`, `sv-form-renderer.js`, `sv-validation.js`, `sv-document-generator.js`) extend it via `Object.assign()`
- Direct DOM manipulation with `innerHTML` for rendering
- Inline `onclick` handlers reference `SmartVariables.methodName()`

**Layer 2: Services (TypeScript, requires build)**
- `src/services/*.ts` contains the "engine" layer: template rendering, variable processing, cascade resolution, contact derivation
- `src/types/*.ts` provides full type definitions for all domain objects
- `src/components/variables/*.tsx` contains React/TSX components (not yet integrated into the runtime)
- Singleton pattern used for services (`getTemplateRenderer()`, `getUserProfileService()`)

**Key Insight:** The two layers are currently **loosely coupled**. The vanilla JS layer handles its own state, rendering, and document generation directly. The TypeScript services define a richer, more structured approach (Handlebars templates, cascade engines, dependency graphs) but are not yet consumed by the taskpane. This creates an opportunity for convergence.

### 1.2 Module Namespace Pattern

All SmartVariables functionality lives under a single global object. Each `sv-*.js` file extends it:

```javascript
// sv-state.js -- defines the namespace
const SmartVariables = { state: { ... }, ... };

// sv-courts.js -- extends it
Object.assign(SmartVariables, {
  loadCourtsDatabase() { ... },
  getCourtById(id) { ... }
});
```

**Load order matters:** `sv-state.js` must load first (defines namespace), then modules in dependency order:
```
sv-state -> sv-courts -> sv-contacts -> sv-templates -> sv-profile
-> sv-form-renderer -> sv-validation -> sv-document-generator
```

**Trade-offs:**
- (+) Zero build step for the taskpane layer
- (+) All `onclick` handlers work without module resolution
- (-) No true encapsulation -- any module can mutate any state
- (-) Load order is fragile; misordering causes silent `undefined` errors
- (-) No tree-shaking or dead code elimination

### 1.3 State Management

State is managed in a flat object on `SmartVariables.state`:

```javascript
state: {
  template: null,          // Currently selected template definition
  values: {},              // Form field values keyed by variable ID
  derivedValues: {},       // Computed values (e.g., "plaintiffs.namesEtAl")
  errors: {},              // Validation errors keyed by variable ID
  expandedGroups: new Set(), // UI state for collapsible groups
  contactPickerOpen: false,
  contactPickerTarget: null
}
```

State mutations happen directly (`this.state.values[id] = value`) with manual re-renders via `this.renderForm(containerId)`. There is no reactive system, no immutability enforcement, and no state change history.

### 1.4 Data Persistence

All user data is persisted to `localStorage` under three keys defined in `sv-state.js`:

| Key | Content |
|-----|---------|
| `draftbridge_user_profile` | Attorney info, firm details, signature preferences |
| `draftbridge_recent_contacts` | Last 10 used contacts |
| `draftbridge_custom_templates` | User-created template definitions |

**Risk:** `localStorage` is unencrypted and per-origin. Sensitive data (bar numbers, email, phone, addresses) is stored in plaintext. Both `sv-state.js` and `userProfileService.ts` include TODO markers for Web Crypto API encryption.

### 1.5 Office.js Integration

Document insertion happens in `sv-document-generator.js` via `Word.run()`:

```javascript
await Word.run(async (context) => {
  const selection = context.document.getSelection();
  for (const section of sections) {
    const paragraph = selection.insertParagraph(section.text, Word.InsertLocation.after);
    // Apply style based on section.style (caption, title, heading, body, signature)
  }
  await context.sync();
});
```

The recreate service (`recreateService.ts`) wraps `Word.run()` in a 10-second timeout via `wordRunWithTimeout()` to prevent indefinite hangs.

---

## 2. Code Patterns Catalog

### 2.1 HTML Rendering via Template Literals

All UI rendering in the vanilla JS layer uses template literals with `innerHTML`:

```javascript
container.innerHTML = `
  <div class="sv-template-card" onclick="SmartVariables.selectTemplate('${this.safeId(t.id)}', '${this.safeId(containerId)}')">
    <div class="sv-template-name">${this.escapeHtml(t.name)}</div>
  </div>
`;
```

**Pattern rules applied:**
- All user-supplied text goes through `escapeHtml()` (HTML entity encoding)
- All IDs in `onclick` handlers go through `safeId()` (regex allowlist: `[a-zA-Z0-9_\-:.]+`)
- String values in JS attribute contexts go through `escapeAttr()` (JS string + HTML encoding)

### 2.2 Debounced Event Handling

Two debounce patterns are used:

```javascript
// Contact search: 250ms debounce
_contactSearchTimer: null,
handleContactsSearchDebounced(query) {
  clearTimeout(this._contactSearchTimer);
  this._contactSearchTimer = setTimeout(() => {
    this.handleContactsSearch(query);
  }, 250);
}

// Validation: 300ms debounce
_validateTimer: null,
_debouncedValidate() {
  clearTimeout(this._validateTimer);
  this._validateTimer = setTimeout(() => {
    this.validateAll();
  }, 300);
}
```

The `destroy()` method in `sv-state.js` cleans up both timers.

### 2.3 Contact/Party Data Flow

Contact data flows through several stages:

1. **Input:** Manual entry in form fields, or selection from contact picker modal
2. **State Update:** `handleContactChange()` or `selectContact()` writes to `state.values[variableId]`
3. **Derivation:** `processDerivations()` computes `fullName`, `salutation`, `namesEtAl` etc.
4. **Validation:** `_debouncedValidate()` checks required fields
5. **Re-render:** `renderForm(containerId)` rebuilds the entire form HTML
6. **Persistence:** `saveContact()` writes to `userProfile.contacts` and `localStorage`

### 2.4 Template Definition Pattern

Templates are defined as plain objects with typed variable arrays:

```javascript
'motion-to-dismiss': {
  id: 'motion-to-dismiss',
  name: 'Motion to Dismiss',
  category: 'litigation/motions',
  variables: [
    { id: 'court', name: 'Court', type: 'select', required: true, group: 'case', order: 1, config: { options: [...] } },
    { id: 'plaintiffs', name: 'Plaintiffs', type: 'party', required: true, group: 'parties', order: 10, config: { allowedRoles: ['plaintiff'], minItems: 1 } },
    // ...
  ]
}
```

Each template has a corresponding `buildXxxContent()` method in `sv-document-generator.js` that constructs `{ text, style }` sections for Word insertion. The TypeScript layer defines a richer `TemplateDefinition` interface in `src/types/variables.ts` with Handlebars body templates, component references, and versioning -- but this is not yet used at runtime.

### 2.5 Singleton + Factory Pattern (TypeScript Services)

```typescript
let instance: TemplateRenderer | null = null;
export function getTemplateRenderer(): TemplateRenderer {
  if (!instance) {
    instance = new TemplateRenderer();
  }
  return instance;
}
```

Used by: `TemplateRenderer`, `UserProfileService`. Both include `dispose()` methods for cleanup.

### 2.6 LRU Cache Pattern

Two LRU caches protect against unbounded growth:

```typescript
// templateRenderer.ts: 50-entry compiled template cache
if (this.compiledTemplates.size >= TemplateRenderer.MAX_CACHE_SIZE) {
  const firstKey = this.compiledTemplates.keys().next().value;
  if (firstKey) this.compiledTemplates.delete(firstKey);
}

// variableEngine.ts: 100-entry regex cache with LRU promotion
let regex = this.regexCache.get(pattern);
if (regex) {
  this.regexCache.delete(pattern); // LRU: move to end
  this.regexCache.set(pattern, regex);
}
```

### 2.7 Cascade Engine Pattern

The cascade engine in `cascadeEngine.ts` resolves variable dependencies:

- **Cycle detection:** Tracks visited variable IDs in a `Set` passed through recursion
- **Depth limit:** Maximum 20 levels of cascade recursion
- **Change detection:** `valuesEqual()` prevents unnecessary downstream cascades when computed values are identical
- **Prototype pollution protection:** `BLOCKED_KEYS` set rejects `__proto__`, `constructor`, `prototype` in path traversal

---

## 3. Security Patterns

### 3.1 XSS Prevention (Phase 5)

Three sanitization functions in `sv-state.js`:

| Function | Purpose | Regex |
|----------|---------|-------|
| `safeId(id)` | Allowlist for IDs in `onclick` handlers | `/^[a-zA-Z0-9_\-:.]+$/` |
| `escapeAttr(str)` | Escape for JS string literals in HTML attributes | Escapes `\`, `'`, `"`, `<`, `>`, `&` |
| `escapeHtml(str)` | Standard HTML entity encoding | Encodes `&`, `<`, `>`, `"`, `'` |

Applied across **28+ onclick/onchange handlers** in `sv-form-renderer.js`, 6 in `sv-profile.js`, and 4 in `sv-templates.js`.

### 3.2 ReDoS Prevention (variableEngine.ts)

```typescript
if (pattern.length > 200) { /* reject */ }
if (/(\+|\*|\{[^}]+\})\s*\)(\+|\*|\{[^}]+\}|\?)/.test(pattern)) { /* reject nested quantifiers */ }
```

### 3.3 Content Security Policy (taskpane.html)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://appsforoffice.microsoft.com;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com;
  img-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Note:** `'unsafe-inline'` for scripts is required because all JS is loaded via inline `<script>` tags and `onclick` handlers. Migrating to a build step would allow removing this.

### 3.4 Profile Validation (sv-state.js)

`validateProfileShape()` checks parsed localStorage data against expected types before accepting it:

```javascript
validateProfileShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const stringFields = ['firstName', 'lastName'];
  for (const field of stringFields) {
    if (field in obj && typeof obj[field] !== 'string') return false;
  }
  if ('contacts' in obj && !Array.isArray(obj.contacts)) return false;
  return true;
}
```

### 3.5 Cryptographic ID Generation

```javascript
contact.id = typeof crypto?.randomUUID === 'function'
  ? crypto.randomUUID()
  : `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
```

### 3.6 Outstanding Security Items

- **localStorage encryption:** Sensitive fields (barNumber, email, phone, address) are stored in plaintext. TODOs exist for AES-256-GCM encryption via Web Crypto API.
- **API key headers:** Frontend fetch calls need `X-API-Key` header (noted in TODO.md as critical).
- **Template storage migration:** Templates in localStorage need to move to DynamoDB per firm.

---

## 4. CSS & Design System Patterns

### 4.1 Token Architecture

All visual values flow through `var(--db-*)` custom properties defined in `src/styles/tokens.css`. The file is organized into sections:

| Section | Token Count | Examples |
|---------|------------|---------|
| Core Palette | 5 | `--db-primary`, `--db-accent` |
| Surfaces | 6 | `--db-bg`, `--db-surface`, `--db-surface-warm` |
| Borders | 5 | `--db-border`, `--db-border-input` |
| Text | 5 | `--db-text`, `--db-text-muted` |
| Status | 12 | `--db-success`, `--db-error-bg`, `--db-warning-text` |
| Legal Semantic | 5 | `--db-plaintiff`, `--db-defendant` |
| Category Tags | 8 | `--db-cat-contracts-bg/text` |
| Spacing | 7 | `--db-space-xs` (4px) through `--db-space-3xl` (40px) |
| Radius | 7 | `--db-radius-sm` (4px) through `--db-radius-pill` (50%) |
| Typography | 11 | Font stacks + size scale (10px-20px) |
| Shadows | 6 | `--db-shadow-sm` through `--db-shadow-modal` |
| Component | 8 | `--db-input-padding`, `--db-btn-padding`, `--db-card-*` |
| Transitions | 2 | `--db-transition` (0.2s), `--db-transition-fast` (0.15s) |
| Icon Sizes | 4 | `--db-icon-sm` (16px) through `--db-icon-xl` (32px) |

### 4.2 CSS Load Order

```
tokens.css -> base.css -> taskpane.css -> smart-variables.css
```

This order ensures tokens are available to all subsequent files, base resets apply before component styles, and smart-variables styles can override taskpane defaults.

### 4.3 Dark Mode

Full dark mode is implemented via `@media (prefers-color-scheme: dark)` in `tokens.css`. Every token category has dark overrides. Since all styles reference tokens, dark mode "just works" without touching any other CSS file.

### 4.4 Accessibility CSS

| Feature | File | Implementation |
|---------|------|---------------|
| Skip-link | `base.css` | `position: absolute; top: -100%` until `:focus` |
| Focus-visible | `base.css` | `outline: 2px solid var(--db-primary-light); outline-offset: 2px` |
| Reduced motion | `base.css` | `@media (prefers-reduced-motion: reduce)` zeroes all animation durations |
| Loading states | `base.css` | `.loading-spinner`, `.skeleton-line` utilities |
| ARIA-driven visibility | `smart-variables.css` | `[aria-expanded="false"] + .sv-section-content { display: none }` |

### 4.5 Responsive Breakpoints

Three breakpoints in `taskpane.css` for narrow taskpane widths:
- **360px** -- Minimum viable width
- **420px** -- Small taskpane
- **600px** -- Standard taskpane

### 4.6 CSS Inconsistencies

Despite the token system, `smart-variables.css` still has some hardcoded values:
- `padding: 16px` (should be `var(--db-space-lg)`)
- `gap: 10px`, `gap: 12px` (not exact 4px grid tokens)
- `font-size: 18px` (should be `var(--db-text-2xl)`)
- `background: white` (should be `var(--db-surface)`)

These slipped through the tokenization pass and should be cleaned up.

---

## 5. Refactoring Opportunities

### 5.1 Converge the Two-Layer Architecture

**Impact: High | Effort: Large**

The vanilla JS layer (`sv-*.js`) and TypeScript service layer (`src/services/*.ts`) solve overlapping problems independently. The TS layer has richer features (Handlebars rendering, cascade dependency graphs, LRU caches, proper type safety) that the JS layer reimplements more simply. A build step (webpack/esbuild) would allow:

- Consuming TS services from the taskpane
- Removing duplicate logic (contact derivation exists in both layers)
- Leveraging the full type system
- Enabling tree-shaking and minification
- Removing `'unsafe-inline'` from CSP

### 5.2 Replace innerHTML Rendering with a Lightweight Reactivity System

**Impact: High | Effort: Medium**

Every form change triggers a full `renderForm()` that rebuilds the entire DOM tree. This causes:
- Loss of focus position on text inputs (the `onkeyup` handler triggers validation but avoids re-render; `onchange` and contact/party changes do re-render)
- No animation between states
- Potential performance issues with many parties

Options: Preact (3KB), lit-html, or a simple virtual DOM diff. The TSX components in `src/components/variables/` suggest this direction was already planned.

### 5.3 Extract Duplicate State Name Maps

**Impact: Low | Effort: Small**

The `STATE_NAMES` map (US state abbreviation to full name) is duplicated:
- `sv-state.js` line 59 (54 entries including territories)
- `contactHandler.ts` line 434 (51 entries, missing territories)

Should be a single shared module.

### 5.4 Remove the Monolith Backup

**Impact: Low | Effort: Small**

`src/taskpane/smart-variables.js` (2935 lines) is the original monolith kept as a "backup/reference." It is still loaded as the primary script per PROJECT_CONTEXT.md. If the `sv-*.js` modules are now the canonical source, the monolith should be removed to avoid confusion about which code is actually running.

**Critical question:** Are both the monolith AND the modules loaded? If so, the `SmartVariables` object would be defined twice, with the monolith version potentially overwriting the modular version's additions. This needs verification.

### 5.5 Consolidate Template Building Logic

**Impact: Medium | Effort: Medium**

`sv-document-generator.js` has a `switch` statement routing to `buildMotionContent()`, `buildLetterContent()`, `buildComplaintContent()`, etc. Each builder has overlapping structure (caption, body sections, signature, date). The shared helpers (`_buildCaptionSection`, `_buildSignatureSection`, `_buildDateSection`) were a good first step, but the pattern should be extended to a declarative template definition where each template type specifies its sections rather than imperative code.

### 5.6 Add Tests for the Vanilla JS Layer

**Impact: High | Effort: Medium**

Only one test file exists (`src/__tests__/variableEngine.test.ts`). The vanilla JS modules have zero test coverage. Key functions needing tests:
- `safeId()` and `escapeHtml()` with adversarial inputs
- `validateProfileShape()` with malformed data
- `validateAll()` with various field types
- `processDerivations()` for party name formatting
- `buildDocumentContent()` for each template type
- `searchContacts()` with edge cases

### 5.7 Eliminate the `toast()` Global Dependency

**Impact: Low | Effort: Small**

The `toast()` function is called throughout `sv-*.js` modules but is defined somewhere in `taskpane.html` inline JS, not in the modules themselves. This tight coupling to the host page should be replaced with a message bus or callback pattern so modules can be tested independently.

### 5.8 TypeScript Strict Mode

**Impact: Medium | Effort: Medium**

TypeScript services use casts like `value as Record<string, unknown>` and `(error as Error).message` in several places. Enabling `strict: true` in `tsconfig.json` and fixing the resulting errors would improve type safety.

### 5.9 Dead/Unused Code

- `getCategoryIcon()` in `sv-templates.js` returns empty strings for all categories -- icon assets were never created
- `RecreatePanel.tsx` and its CSS exist but the React component is not mounted anywhere in the runtime
- `VariableInput.tsx`, `VariableForm.tsx`, `ContactInput.tsx`, `AttorneyInput.tsx`, `PartyInput.tsx` -- all TSX components that exist but are not used

---

## 6. Lawyer Workflow Opportunities (Prioritized)

### HIGH IMPACT

#### 6.1 Matter/Case Management Integration
**Impact: High | Effort: Large**

Lawyers organize everything by matter. Adding a "matter context" that persists across sessions would allow:
- Auto-populating case number, court, parties, and judge from a saved matter
- Generating multiple documents (complaint, answer, discovery) for the same matter without re-entering party info
- Tracking which documents were generated for which matter
- Integration with case management systems (Clio, PracticePanther, Smokeball) via API

#### 6.2 Clause Library with AI-Powered Search
**Impact: High | Effort: Medium**

The existing clause library (106 clauses from SEC filings) could be dramatically enhanced:
- **Semantic search:** "Find me an indemnification clause that limits liability to 2x contract value" instead of keyword matching
- **Clause suggestions:** Based on document type and context, suggest relevant clauses
- **Risk scoring:** Flag aggressive/one-sided language with an "Aggressiveness Score"
- **Jurisdiction awareness:** Highlight clauses that may not be enforceable in the selected jurisdiction
- **Version comparison:** Show how a clause evolved across different deals

#### 6.3 Smart Defaults and Learning
**Impact: High | Effort: Medium**

The app should learn from usage:
- **Frequently used courts:** Float to top of selection
- **Common party combinations:** "You often file against these defendants together"
- **Preferred closing phrases:** Remember per-attorney preferences
- **Default tone:** If a lawyer always selects "firm" tone for demand letters, make it the default
- **Recent values:** Pre-fill fields from the last document of the same type

#### 6.4 Document Comparison/Redlining
**Impact: High | Effort: Large**

Lawyers spend enormous time comparing document versions:
- **Side-by-side diff:** Show changes between template output and edited version
- **Markup tracking:** Identify which variables were manually overridden after generation
- **Clause-level diff:** Compare specific clauses across document versions
- **Accept/reject changes:** Inline markup workflow within Word

#### 6.5 Batch Document Generation
**Impact: High | Effort: Medium**

For litigation matters with multiple parties or multiple motions:
- Generate the same template for multiple defendants at once
- Create a "document set" (complaint + summons + civil cover sheet) in one operation
- Mail merge for demand letters to multiple recipients
- Discovery request sets (interrogatories + RFPs + RFAs) generated together

### MEDIUM IMPACT

#### 6.6 Conflict Checking
**Impact: Medium | Effort: Medium**

Before adding a new contact or party:
- Check if any existing contacts share the same name, firm, or address
- Flag potential conflicts of interest (same entity appearing as both plaintiff and defendant across matters)
- Integration with the firm's conflicts database if available

#### 6.7 Court Filing Requirements
**Impact: Medium | Effort: Small**

Enhance the court database with:
- Filing deadlines and rules (e.g., "Answers due within 21 days in federal court")
- Page limits for motions per jurisdiction
- Required certificates (certificate of service, certificate of compliance)
- Local rules alerts (e.g., "D. Mass. requires a joint statement before filing discovery motions")
- ECF filing links (partially implemented -- `filingUrl` field exists on court objects)

#### 6.8 Voice Dictation for Legal Content
**Impact: Medium | Effort: Medium**

Per `docs/VOICE.md` and `docs/VOICE-CONTROL-BRAINSTORM.md`, voice control is planned:
- Dictate factual allegations, grounds for dismissal, or demand language
- Voice commands: "Insert clause [name]", "Add plaintiff [name]", "Set court to D. Mass."
- Legal terminology awareness (correctly transcribes "sua sponte", "voir dire", "res judicata")
- This is especially valuable for mobile/tablet use in court

#### 6.9 E-Signature Integration
**Impact: Medium | Effort: Medium**

Per `docs/EFILING.md`, e-filing is planned. Adding e-signature:
- Generate signature blocks compatible with DocuSign, Adobe Sign, or HelloSign
- Insert signature tokens that convert to e-signature fields when uploaded
- Track which documents need signatures and from whom

#### 6.10 Document Analytics
**Impact: Medium | Effort: Small**

Provide insights on generated documents:
- **Reading time estimate** (based on word count and legal complexity)
- **Complexity score** (Flesch-Kincaid adapted for legal text)
- **Defined terms tracker** (list all defined terms and where they appear)
- **Citation checker** (verify case citations are properly formatted)
- **Paragraph count per section** (flag unusually long or short sections)

#### 6.11 Template Versioning
**Impact: Medium | Effort: Medium**

Templates evolve as law changes:
- Track changes between template versions
- Allow rollback to previous versions
- Show which version of a template was used for a given document
- Notifications when a template is updated ("Motion to Dismiss template updated -- review changes?")

### LOW IMPACT (but Easy Wins)

#### 6.12 Quick-Insert Snippets
**Impact: Low | Effort: Small**

Common phrases lawyers type repeatedly:
- "Respectfully submitted" with signature block
- Standard objection boilerplate ("Objection. Vague and ambiguous...")
- Incorporation paragraphs ("Plaintiff incorporates all preceding paragraphs...")
- Certificate of service
- Customizable snippet library per attorney

#### 6.13 Date Calculator
**Impact: Low | Effort: Small**

Deadline computation is critical for lawyers:
- "30 days from service" calculator accounting for weekends/holidays
- Federal vs. state rule differences (e.g., 3-day mailing rule)
- Statute of limitations calculator
- Auto-fill response deadlines based on document type and court

#### 6.14 Contact Import from Other Sources
**Impact: Low | Effort: Small**

- Import contacts from CSV/vCard
- Parse contact info from email signatures (paste text, extract structured data)
- Import from case management system
- Scan Word document for party names and addresses

#### 6.15 Keyboard Shortcuts
**Impact: Low | Effort: Small**

Lawyers work fast:
- `Ctrl+Shift+G` to open Generate panel
- `Ctrl+Shift+L` to open Library
- `Ctrl+Shift+N` to apply numbering
- Tab/Shift+Tab navigation through form fields
- Enter to generate document when form is complete

---

## 7. AI-Powered Features Roadmap

### 7.1 Clause Suggestion Engine (Near-term)
- Analyze document context (type, jurisdiction, parties)
- Suggest relevant clauses from the library
- Rank by relevance and usage frequency
- "Other attorneys at your firm also used these clauses in similar motions"

### 7.2 Risk Analysis (Near-term)
- Scan generated documents for missing standard sections
- Flag one-sided language in contracts
- Check for consistency (e.g., defined terms used but not defined)
- Jurisdiction-specific compliance checks

### 7.3 Intelligent Auto-Fill (Mid-term)
- Extract party info from existing documents ("This complaint mentions ACME Corp at 123 Main St -- use this for defendant?")
- Parse case citations from pasted text
- Auto-detect court from case number format
- Suggest causes of action based on factual allegations

### 7.4 Document Quality Scoring (Mid-term)
- Score generated documents on completeness, consistency, and formatting
- Identify sections that need more detail
- Compare against firm standards
- "This motion is missing a Statement of Facts section -- add one?"

### 7.5 Predictive Templates (Long-term)
- Suggest template based on what the lawyer is currently drafting
- "You're writing about breach of contract -- would you like to generate a formal complaint?"
- Auto-detect when manual document drafting could benefit from template automation

### 7.6 AI-Powered Recreate (Long-term)
- The current recreate service is rule-based pattern matching. AI could enable:
- Intelligent tone adjustment (formal to casual, aggressive to professional)
- Language simplification for client-facing documents
- Translation to plain English for non-legal readers
- Multi-language document generation

---

## 8. Integration Opportunities

### 8.1 Case Management Systems
| System | Opportunity | Priority |
|--------|------------|----------|
| **Clio** | Contacts, matters, time entries, document storage | High |
| **PracticePanther** | Same as Clio, popular with small-mid firms | High |
| **Smokeball** | Deep Word integration already, complementary | Medium |
| **MyCase** | Matter management, client portal | Medium |

### 8.2 Court Filing Systems
| System | Opportunity | Priority |
|--------|------------|----------|
| **PACER/ECF** | Auto-fill case number, judge, deadlines from case lookup | High |
| **State e-filing** (Tyler Odyssey, File & Serve) | Filing format validation, deadline tracking | Medium |

### 8.3 Document Management
| System | Opportunity | Priority |
|--------|------------|----------|
| **iManage** | Save generated docs, clause library sync | High |
| **NetDocuments** | Same as iManage, cloud-first firms | High |
| **SharePoint/OneDrive** | Basic document storage integration | Medium |

### 8.4 Communication
| System | Opportunity | Priority |
|--------|------------|----------|
| **Microsoft Teams** | Share generated documents, request review | Medium |
| **Email (Outlook)** | Generate and attach document to email | Medium |

### 8.5 Billing/Time Tracking
| System | Opportunity | Priority |
|--------|------------|----------|
| **Clio** | Auto-log time spent generating documents | Medium |
| **LEDES** | Generate billing descriptions for document work | Low |

### 8.6 Zapier/Make Integration
Per `docs/ZAPIER-INTEGRATION-SPEC.md`, webhook-based integrations are planned:
- Trigger document generation from external events
- Push generated documents to external systems
- Sync contacts bidirectionally

---

## 9. Lessons Learned (6-Phase Refactor)

### 9.1 What Worked Well

**Phase-based approach:** Breaking the refactor into 6 phases (Foundation, Design Consistency, Code Refactor, Documentation, Security, Accessibility) with clear checkpoints prevented scope creep and made progress visible.

**Design tokens first:** Establishing `tokens.css` before touching any other CSS file meant every subsequent change had a vocabulary. The token system made dark mode "free" -- just override the token values.

**Security as a dedicated phase:** Making security its own phase (Phase 5) with specific XSS payloads to test against (`'); alert('xss`, `<img onerror=alert(1)>`) produced thorough coverage. Sprinkling security fixes throughout other phases would have missed edge cases.

**Keeping the monolith as backup:** During the JS decomposition, keeping the original `smart-variables.js` intact meant there was always a rollback point. This reduced risk of the refactor.

**Checkpoint verification lists:** Each checkpoint had specific verification criteria (e.g., "No unprotected ID interpolations in onclick/onchange handlers -- grep verified"). This made it possible to confirm completeness.

### 9.2 What Would Be Done Differently

**Resolve the two-layer architecture earlier:** The vanilla JS layer and TypeScript service layer solve overlapping problems. Deciding early whether to add a build step would have prevented building parallel implementations. The TSX components (`VariableInput.tsx`, `VariableForm.tsx`, etc.) were created but never integrated -- that effort could have been redirected.

**Start with a test harness:** The refactor added security hardening and performance fixes without a test suite to catch regressions. A minimal test setup (even just for `safeId()`, `escapeHtml()`, and `validateAll()`) would have increased confidence.

**Tackle CSS tokenization per-component, not per-file:** The tokenization pass went file-by-file, which missed inconsistencies within `smart-variables.css` where some values were tokenized and others were not. A component-by-component approach (e.g., "tokenize all buttons, then all inputs, then all cards") would have been more thorough.

**Clarify the monolith loading situation:** PROJECT_CONTEXT.md says the monolith is "still loaded as primary." If both the monolith and the modules are loaded, the namespace is defined twice. This ambiguity should have been resolved in Phase 3.

### 9.3 Common Mistakes to Avoid

1. **Do not add `private extension Color { init(hex:) }` patterns** -- the CSS token system eliminates the need for color extensions. All colors go through `tokens.css`.

2. **Do not hardcode hex values outside `tokens.css`** -- even "just this once" for a quick fix. Every hardcoded value is a dark-mode bug waiting to happen.

3. **Do not add inline `<style>` blocks to HTML files** -- the CSS load order (`tokens -> base -> taskpane -> smart-variables`) is carefully managed. Inline styles bypass this cascade.

4. **Do not break `onclick="SmartVariables.methodName()"` handler signatures** -- the HTML depends on these exact function names. Renaming a method requires updating both JS and HTML.

5. **Do not skip `safeId()` for any new onclick handlers** -- every ID or user-supplied value that appears in an HTML attribute must go through sanitization.

6. **Do not add async initialization without timeout protection** -- the `wordRunWithTimeout()` pattern in `recreateService.ts` should be used for all `Word.run()` calls.

---

## 10. Development Workflow Patterns

### 10.1 Making Changes Safely

1. **Locate targets:** Use PROJECT_CONTEXT.md to find the right files
2. **Read current state:** Understand the existing code before modifying
3. **Make changes:** Follow token system and security patterns
4. **Verify:** Check that `onclick` handlers still resolve, tokens are used, XSS protections are applied

### 10.2 Adding a New Template

1. Add template definition to `sv-templates.js` with variables, groups, and ordering
2. Add `buildXxxContent()` method to `sv-document-generator.js`
3. Add the template ID to the `switch` in `buildDocumentContent()`
4. Test with various party configurations (individual, entity, multiple)
5. Verify court caption formatting for the template's jurisdiction

### 10.3 Adding a New Variable Type

1. Define the type in `src/types/variables.ts` (`VariableType` union)
2. Add rendering in `renderInput()` switch in `sv-form-renderer.js`
3. Add validation in `validateType()` in `variableEngine.ts`
4. Add derivation logic in `processTypeDerivations()` in `cascadeEngine.ts`
5. Add CSS for the new input type in `smart-variables.css`
6. Apply `safeId()` and `escapeHtml()` to all user-facing values

### 10.4 CSS Change Workflow

1. Check if a token already exists in `tokens.css` for the value you need
2. If not, add a new token to the appropriate section in `tokens.css`
3. Add the dark mode override in the `@media (prefers-color-scheme: dark)` block
4. Reference the token in your CSS: `var(--db-your-token)`
5. Never hardcode hex values, pixel spacing, or shadow definitions outside `tokens.css`

### 10.5 Security Checklist for New Code

- [ ] All user-supplied text displayed in HTML goes through `escapeHtml()`
- [ ] All IDs in `onclick`/`onchange` handlers go through `safeId()`
- [ ] All string values in JS attribute contexts go through `escapeAttr()`
- [ ] No `eval()`, `Function()`, or `innerHTML` with unsanitized user input
- [ ] localStorage reads are validated before use
- [ ] Regex patterns are length-limited and checked for nested quantifiers
- [ ] `Word.run()` calls use `wordRunWithTimeout()` wrapper
- [ ] New contact/party IDs use `crypto.randomUUID()` with fallback

### 10.6 Claude Skills Available

Five reusable skill files exist in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `fix-spacing.md` | Fix spacing issues using the token system |
| `add-component.md` | Add a new UI component following design patterns |
| `decompose-module.md` | Extract code from monolith into a new sv-*.js module |
| `token-reference.md` | Quick reference for all design tokens |
| `test-checklist.md` | Pre-deployment verification checklist |

---

*This document serves as the comprehensive reference for DraftBridge Gold's patterns, technical debt, and future opportunities. Update it as the codebase evolves.*

---

## 11. Team Sprint Log (draft-bridges-team)

### Sprint Started: 2026-02-07
**Mode:** Autonomous sequential loop (~30 min)
**Agents:** brainstormer, designer, implementer, exporter, qa-agent

### Cycle 1 Progress
| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| #1 Brainstorm improvements | brainstormer | DONE | 8-item prioritized plan: P0 bugs, P1 data, P2 UX |
| #2 Design UI/UX | designer | DONE | 7 designs: template search, form progress, toasts, export panel, bridge wizard, animations, snippets |
| #3 Implement features | implementer | DONE | P0 fixes verified, 3 UI specs built (search/progress/toast), targeted field updates, entity validation fix |
| #4 Numbering/exports | exporter | DONE | 3 bug fixes (ordinals, partyNum, caption), 2 features (word count, export formatting) |
| #5 QA testing | qa-agent | DONE | APPROVED — 2 P2 bugs (hardcoded white, missing search debounce) |

### Cycle 2 Progress
| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| #6 Brainstorm C2 | brainstormer | DONE | 5 items: 2 P2 fixes (token white, debounce search) + 3 features (transitions, shortcuts, autosave) |
| #7 Design C2 | designer | DONE | 3 specs: transition mapping, shortcuts overlay, autosave + draft recovery |
| #8 Implement C2 | implementer | DONE | 24 token fixes, debounce, transitions, keyboard shortcuts (6 bindings), autosave+draft recovery |
| #9 Numbering/exports C2 | exporter | DONE | Critical numbering fix, DRY refactor, draft clear on export, Ctrl+Enter fix |
| #10 QA C2 | qa-agent | DONE | APPROVED — 1 P2 residual (5 color:white in legacy component CSS) |

### Cycle 3 Progress
| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| #11 Brainstorm C3 | brainstormer | DONE | 5 items: P2 legacy CSS, onboarding, confirm dialogs, shimmers, micro-interactions |
| #12 Design C3 | designer | DONE | 4 specs: onboarding modal, confirm dialog (normal+danger), shimmer skeletons, micro-interactions |
| #13 Implement C3 | implementer | DONE | Token fix (0 hardcoded white left), onboarding modal, Promise-based confirm, shimmer skeletons, micro-interactions |
| #14 Export C3 | exporter | DONE | All verified, found+fixed Ctrl+E validation bypass (fix-011) |
| #15 QA C3 + report | qa-agent | DONE | ALL APPROVED — 19/19 pass, 0 open bugs, report.html generated |

### Cycles 1-3 Complete
- **Tasks completed:** 15 | **Features:** 19 | **Bugs fixed:** 11 | **Status:** ALL APPROVED

### Cycle 4 Progress (FOCUSED: Multilevel Styles, Numbering, TOC)
| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| #16 Brainstorm C4 | brainstormer | DONE | 7 items: multilevel numbering, heading styles, TOC, preview, cross-refs, continuation, save scheme |
| #17 Design C4 | designer | DONE | 5 specs: TOC toggle, style preview, cross-ref scan, continuation indicator, save scheme |
| #18 Implement C4 | implementer | DONE | Multilevel (3 schemes × 5 levels), Heading 1-5 mapping, TOC OOXML, preview, cross-ref scan, continuation style, save scheme |
| #19 Export C4 | exporter | DONE | 2 bugs fixed (clipboard indent, autosave prefs) + JSDoc cleanup |
| #20 QA C4 | qa-agent | DONE | ALL APPROVED — 9/9 pass, 0 bugs, multilevel numbering verified |

### Cycle 4 Complete
- **Focus:** Multilevel styles, numbering, table of contents
- **Built:** 5-level multilevel numbering (3 schemes), Word Heading 1-5 mapping, OOXML TOC insertion, style preview, cross-reference scan, continuation paragraphs, save scheme
- **Bugs found & fixed:** 3 (clipboard indent, autosave prefs, stale JSDoc)
- **Final status:** ALL APPROVED, zero open bugs

### Decisions & Learnings
- Brainstormer confirmed 3/4 P0s resolved by deleting monolith (smart-variables.js)
- Designer produced 7 concrete UI specs with full HTML/CSS using existing --db-* tokens
- All designs include accessibility (ARIA, focus-visible, reduced-motion support)
- RAG index active: agents updating rag-index.json as they work (16+ entries now)
- Implementer confirmed P0 fixes already in place; added template search, progress bars, toast upgrade
- Targeted DOM updates replace full re-render on field keystroke (major UX win)
- isValidContact() now accepts entities (firstName OR lastName OR company)
