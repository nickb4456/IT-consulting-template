# DraftBridge Recreate Feature Specification

## Overview

**Recreate** transforms documents between formats (letter → memo, memo → email, etc.) using AI while preserving user-specified content exactly.

## User Stories

1. **As a paralegal**, I want to convert a drafted letter into memo format for internal review
2. **As an attorney**, I want to preserve specific case citations while reformatting a document
3. **As a legal assistant**, I want to quickly convert email content into formal letter format

## UI Components

### Ribbon Button
- **Location:** DraftBridge tab, after "Library" section
- **Icon:** Refresh/transform icon (↻ with document)
- **Label:** "Recreate"
- **Tooltip:** "Transform document to another format"

### Task Pane Panel

```
┌─────────────────────────────────┐
│  ↻ Recreate Document            │
├─────────────────────────────────┤
│                                 │
│  Transform to:                  │
│  ┌─────────────────────────┐   │
│  │ Memo                  ▼ │   │
│  └─────────────────────────┘   │
│                                 │
│  Options:                       │
│  ☑ Preserve selected text       │
│  ☐ Keep original formatting     │
│  ☑ Open in new window           │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Selected text to preserve:     │
│  ┌─────────────────────────┐   │
│  │ "January 15, 2026"      │   │
│  │ "Case No. 2026-CV-1234" │   │
│  │ "Smith & Associates"    │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │      ↻ Transform        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │       Preview...        │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

## Document Types

### Supported Transformations

| Source | Target Options |
|--------|----------------|
| Letter | Memo, Email Draft, Summary, Bullet Points |
| Memo | Letter, Email Draft, Summary, Bullet Points |
| Email | Letter, Memo, Summary, Action Items |
| Contract Clause | Plain English, Summary |
| Any | Custom prompt transformation |

### Auto-Detection Rules

```javascript
const detectDocumentType = (text) => {
  if (/^dear\s/i.test(text.trim())) return 'letter';
  if (/^(memorandum|memo)\s*$/im.test(text)) return 'memo';
  if (/^(from|to|subject|date):/im.test(text)) return 'email';
  if (/^(section|article|\d+\.)/im.test(text)) return 'contract';
  return 'unknown';
};
```

## Data Flow

### Without Selection
```
1. User clicks "Recreate"
2. System reads entire document
3. Auto-detects source type
4. User selects target format
5. AI transforms content
6. Opens in new window (default) or replaces
```

### With Selection (Preserve Mode)
```
1. User selects text in document
2. User clicks "Recreate"
3. System captures selection as "anchors"
4. User selects target format
5. AI transforms, keeping anchors verbatim
6. Opens in new window with anchors intact
```

## API Design

### Transform Request
```typescript
interface RecreateRequest {
  content: string;
  sourceType: 'letter' | 'memo' | 'email' | 'contract' | 'unknown';
  targetType: 'letter' | 'memo' | 'email' | 'summary' | 'bullets' | 'plain';
  preservedText?: string[];  // Exact phrases to keep
  options: {
    keepFormatting: boolean;
    tone?: 'formal' | 'casual' | 'neutral';
    firmName?: string;  // For letterhead context
  };
}
```

### Transform Response
```typescript
interface RecreateResponse {
  success: boolean;
  transformed: string;
  sourceTypeDetected: string;
  preservedCount: number;  // How many anchors were kept
  warnings?: string[];     // e.g., "Could not preserve: 'xyz'"
}
```

## AI Prompt Template

```
Transform this {sourceType} into a {targetType}.

RULES:
1. Maintain all factual content and meaning
2. Adapt structure and formatting for {targetType}
3. Keep professional legal tone
{preserveInstructions}

SOURCE DOCUMENT:
{content}

OUTPUT FORMAT:
Return only the transformed document, no explanations.
```

### Preserve Instructions (when applicable)
```
4. CRITICAL: Keep these exact phrases unchanged:
   - "{preserved[0]}"
   - "{preserved[1]}"
   ...
   These must appear verbatim in the output.
```

## Implementation Phases

### Phase 1: Core Transform (MVP)
- [ ] Recreate button in ribbon
- [ ] Basic task pane UI
- [ ] Letter ↔ Memo conversion
- [ ] Open in new window

### Phase 2: Selection Preservation
- [ ] Capture selected text
- [ ] Pass anchors to AI
- [ ] Verify anchors in output
- [ ] Warning if anchor missing

### Phase 3: Enhanced Options
- [ ] Preview before apply
- [ ] Track changes mode
- [ ] Custom transformation prompts
- [ ] Tone adjustment

### Phase 4: Voice Integration
- [ ] "Recreate as memo"
- [ ] "Convert to letter format"
- [ ] "Make this more formal"

## File Structure

```
src/
├── taskpane/
│   ├── recreate/
│   │   ├── RecreatePanel.tsx
│   │   ├── RecreatePanel.css
│   │   ├── TransformOptions.tsx
│   │   └── PreservedTextList.tsx
├── services/
│   ├── recreateService.ts
│   ├── documentDetector.ts
│   └── transformPrompts.ts
└── types/
    └── recreate.ts
```

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| AI timeout | "Transform taking longer than expected. Retry?" | Retry button |
| Anchor not preserved | "Warning: '{text}' could not be kept exactly" | Show diff |
| Unknown format | "Couldn't detect document type. Please select:" | Manual dropdown |
| API error | "Service unavailable. Try again in a moment." | Retry with backoff |

## Success Metrics

- Transform completion rate > 95%
- Anchor preservation accuracy > 99%
- User satisfaction (keeps result without edits) > 70%
- Average transform time < 5 seconds
