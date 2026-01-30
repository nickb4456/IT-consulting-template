# Clause Library

**Your personal clause library, always one click away.**

## Overview

Clause Library lets lawyers save, organize, and instantly reuse their best legal language. Stop hunting through old documents for "that good indemnification clause" — save it once, use it forever.

## Features

### Save Clauses
- Select any text in Word → Save to Vault
- Preserves formatting (bold, italics, numbering)
- Organize by category (18 legal categories)
- Add tags for easy searching
- Add descriptions for context

### Search & Browse
- Full-text search across all clauses
- Filter by category
- View frequently used clauses
- View recently added clauses

### Smart Insert
- One-click insert at cursor
- **Placeholder support**: Use `{{PlaceholderName}}` syntax
- Prompts for placeholder values on insert
- Tracks usage statistics

### Data Management
- Export library as JSON backup
- Import clauses from backup
- Syncs across devices (via Office roaming settings)

## Categories

| Category | Description |
|----------|-------------|
| Indemnification | Hold harmless, defend clauses |
| Limitation of Liability | Caps, exclusions |
| Confidentiality | NDAs, trade secrets |
| Termination | Term, renewal, early exit |
| Governing Law | Choice of law |
| Dispute Resolution | Arbitration, venue |
| Representations | Statements of fact |
| Warranties | Promises about quality |
| Intellectual Property | IP ownership, licenses |
| Payment Terms | Invoicing, late fees |
| Force Majeure | Acts of God |
| Assignment | Transfer of rights |
| Notices | Communication requirements |
| Amendments | How to modify |
| Severability | Invalid provisions |
| Entire Agreement | Merger clause |
| Definitions | Defined terms |
| Boilerplate | Miscellaneous |
| Custom | Everything else |

## Placeholder Syntax

Use double curly braces for dynamic content:

```
{{PartyName}} hereby agrees to indemnify {{OtherParty}} against all claims arising from...
```

When inserting, Clause Library prompts for each placeholder value.

## Technical Details

### Storage
- Uses Office.context.roamingSettings for cloud sync
- Falls back to localStorage if roaming unavailable
- JSON format for easy backup/restore

### Performance
- Lazy loading — only initializes when opened
- In-memory index for fast search
- Debounced UI updates

### File Structure
```
clause-vault/
├── ClauseVault.ts           # Core service
├── ClauseVaultTaskPane.tsx  # React UI
├── ClauseVault.test.ts      # Unit tests
├── index.ts                 # Exports
└── README.md                # This file
```

## Usage Example

```typescript
import { clauseVault } from './features/clause-vault';

// Initialize (call once at app start)
await clauseVault.initialize();

// Save selected text
const clause = await clauseVault.saveFromSelection(
  'Standard Indemnification',
  'indemnification',
  ['contracts', 'mutual'],
  'Use for service agreements'
);

// Search
const results = clauseVault.search('indemnification');

// Insert
await clauseVault.insertClause(clause.id);

// Insert with placeholders filled
await clauseVault.insertWithPlaceholders(clause.id, {
  PartyName: 'Acme Corporation',
  OtherParty: 'Client LLC'
});
```

## Manifest Integration

Add to your Word add-in manifest:

```xml
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <CustomTab id="DraftBridge.Tab">
    <Group id="DraftBridge.ClauseVault">
      <Label resid="ClauseVault.Group.Label"/>
      <Icon>
        <bt:Image size="16" resid="Icon.16x16"/>
        <bt:Image size="32" resid="Icon.32x32"/>
        <bt:Image size="80" resid="Icon.80x80"/>
      </Icon>
      <Control xsi:type="Button" id="ClauseVault.ShowPane">
        <Label resid="ClauseVault.ShowPane.Label"/>
        <Supertip>
          <Title resid="ClauseVault.ShowPane.Title"/>
          <Description resid="ClauseVault.ShowPane.Description"/>
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16x16"/>
          <bt:Image size="32" resid="Icon.32x32"/>
          <bt:Image size="80" resid="Icon.80x80"/>
        </Icon>
        <Action xsi:type="ShowTaskpane">
          <TaskpaneId>ClauseVaultPane</TaskpaneId>
          <SourceLocation resid="ClauseVault.Taskpane.Url"/>
        </Action>
      </Control>
    </Group>
  </CustomTab>
</ExtensionPoint>
```

## Why Lawyers Love It

1. **Time Savings**: No more hunting through old documents
2. **Consistency**: Use your best version every time
3. **Learning**: Build institutional knowledge as you work
4. **Lock-in**: Once they build a library, they're invested in DraftBridge
5. **Offline**: Works without internet, all local processing
