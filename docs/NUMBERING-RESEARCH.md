# DraftBridge Numbering: Competitive Research & Opportunities

*Research compiled by Pip 🐿️ | February 2026*
*Updated: Feb 3, 2026 with additional competitor analysis*

---

## Executive Summary

Word's numbering has been broken since 1997. It's not a bug—it's a fundamental architectural decision that makes legal document formatting a nightmare. **This is our opportunity.**

The legal tech market is dominated by expensive enterprise solutions (Litera) or complex, training-heavy tools (Adaugeo). There's a massive gap for a **simple, effective, web-based solution** that "just works."

**Key finding:** Lawyers don't want to learn Word's numbering system. They want it to stop breaking their documents.

---

## 1. Competitor Analysis

### Litera (Market Leader)
**Products:** Litera Check, Litera Numbering, Contract Companion

**Strengths:**
- Comprehensive proofreading (definitions, cross-references, citations)
- "One-click" issue detection and repair
- Active Drafting mode (real-time issue flagging)
- Integration with document management systems (iManage, NetDocuments)
- Enterprise-grade with firm-wide deployment

**Pricing:** Enterprise licensing ($$$$) - typically $50-200/user/month

**Features we should match:**
- ✅ Scan for issues → We have "Fix Numbering" spec
- ⚠️ Cross-reference detection → **Gap**
- ⚠️ Defined term tracking → **Gap**
- ❌ Active Drafting (real-time) → Future opportunity

**Recent Q3 2024 Release - Litera Numbering Updates:**
- **Continuation Styles** - Feature from legacy Innova/Forte tools for styling paragraphs following numbered lists
- **45% faster** actions from the Numbering ribbon
- **90% faster** DocID insertion
- **40% faster** opening documents from DMS

**Quote from Litera customer:**
> "Fee earners are saving around an hour every week, solely in proofreading time."

---

### BigHand Document Formatting & Styling
**Formerly:** DocStyle (acquired by BigHand)

**Strengths:**
- **Scheme Manager** - Store firm's global schemes with configurable previews
- **Unlimited numbering** levels (not limited to Word's 9)
- Import styles from one scheme to another
- "Personal Schemes" when working on external documents
- Create custom families with single click
- Style find/replace
- **Super Copy** - Safe content reuse without format corruption
- Easy section management (cover pages, TOC, execution clauses)

**Key differentiator:** Firm-wide deployment with centralized scheme management

**Pricing:** Enterprise licensing (contact for quote)

---

### Adaugeo Numbering (Power User Tool)
**Product:** Adaugeo Numbering™ add-in for Word

**Strengths:**
- **Most comprehensive numbering solution available**
- Firm Library + User Library + Workgroup Libraries for numbering schemes
- Create, edit, manage multilevel lists with dedicated UI
- "Safe Paste" tool that prevents numbering corruption
- Style separator management for TOC
- "Check Document for Numbering Problems" diagnostic
- Find & Replace multilevel list styles
- Extension styles (unnumbered paragraphs at each level)

**Unique Features We're Missing:**
1. **Blueprint Libraries** - Save/share numbering schemes at firm/user/workgroup level
2. **Safe Paste** - Prevents corruption when copying numbered content
3. **Extension Styles** - Unnumbered continuation paragraphs
4. **Style Separator Tools** - For proper TOC generation
5. **Sequence Numbering** - Exhibit A, B, C with proper lettering (AA, AB after Z)
6. **ListNum Field Insertion** - For inline numbering

**Pricing:** Subscription + setup fee (requires training)

---

### WordPerfect (Legacy Champion)
**Why lawyers still love it:**

1. **Reveal Codes** - See exactly what formatting is applied
2. **Predictable numbering** - No mysterious "black box" behavior
3. **Legal-specific features** - Pleading paper, line numbers, TOA
4. **Make It Fit** - Auto-adjust to page limits

**Key insight:** Lawyers want **transparency** into what's happening with their formatting.

> "WordPerfect has Reveal Codes... allows paralegals and attorneys to ensure every margin, line number, and heading is perfect."

**Opportunity:** Build a "Show Numbering Structure" diagnostic that reveals the black box.

---

### Word's Built-in Numbering (The Problem)

**Root cause of all issues:** Word separates "paragraphs" from "lists"
- Paragraph styles ≠ List styles
- They can be connected, but that connection breaks easily
- Most users don't understand the difference

**Common complaints from Reddit/forums:**

> "Can someone tell me WTF is going on here? Word is Hell." - r/Lawyertalk

> "Does anyone else waste hours upon hours trying to format docs properly in Word?" (127 upvotes) - r/Lawyertalk

> "Lawyers literally spend hours formatting these types of documents" - r/MicrosoftWord

> "Fighting the software more than writing the document" - r/LawFirm

**Technical issues from ClauseBase research (GOLD):**

Word's numbering uses a **three-level structure** that users don't understand:

1. **Abstract numbering list** - Blueprint storing layout for up to 9 levels
2. **Concrete instances** - Each abstract list can have multiple instances
3. **Tagged paragraphs** - Each numbered paragraph references a concrete instance

**Why this breaks:**
- When user clicks "Numbering" button, Word creates an abstract list AND a concrete instance
- Pasting numbered content from another doc creates NEW abstract lists
- Lists that LOOK the same can be different abstract lists
- "Continue numbering" often fails because paragraphs are in different concrete instances
- Section breaks can sever the connection between list instances

**The "Restart Numbering" bug:**
When user right-clicks and chooses "Restart numbering", Word creates a SECOND concrete instance of the same abstract list. This breaks future attempts to "Continue numbering".

**ClauseBase's advice:**
> "Keep doing auto-formatting for your grocery list, but stop doing it in legal documents, because it leads to inconsistencies and circumvents the use of styles."

**Key insight:** Word's approach tilted toward flexibility at the cost of simplicity. Microsoft's engineers assumed users would get training—they didn't.

---

### Other Tools Mentioned

| Tool | Specialty | Notes |
|------|-----------|-------|
| ClauseBase | Contract automation | Excellent technical documentation on Word numbering |
| Loio | AI contract review | Lightweight Word add-in |
| Styles for Lawyers | Training/templates | Educational resource |
| Modern Legal Support | Consulting | Great articles on multiple lists problem |

---

## 2. Feature Gaps in DraftBridge

### Critical Gaps (High Impact)

#### 2.1 Multi-List Support
**Problem:** Legal documents often need multiple independent numbered lists (e.g., Description of Notes in offering memoranda).

**Current behavior:** Applying the same paragraph style continues the same list—you get "3" instead of a new "1".

**Solutions (from research):**
- Use List Styles (not paragraph styles) for independent lists
- Provide "Start New List" and "Continue List" buttons
- Auto-detect when user wants a new list vs continuation

**Competitor:** Adaugeo handles this with multiple "Blueprint" lists

---

#### 2.2 Cross-Reference Numbering
**Problem:** Cross-references don't auto-update when numbers change.

**User complaint:**
> "Cross-references I have included don't keep up with the endnotes they refer to."

**Microsoft confirmed bug:**
> "Microsoft has confirmed that this is a problem" - learn.microsoft.com

**Features needed:**
- Insert cross-reference to numbered paragraph (with UI)
- "Update All Cross-References" button
- Scan for broken/outdated cross-references
- Fix references that point to deleted paragraphs

**Competitor:** Litera Check does this

---

#### 2.3 Numbering Diagnostics ("Reveal Codes" for Numbering)
**Problem:** Users can't see why their numbering is broken.

**Solution:** "Show Numbering Structure" view that displays:
- Which abstract list each paragraph belongs to
- Which concrete instance it's using  
- Whether styles are properly linked
- Where lists restart unexpectedly

**Competitor:** WordPerfect's Reveal Codes is beloved for this

---

#### 2.4 Safe Paste
**Problem:** Copying numbered text between documents corrupts numbering.

**From Adaugeo:**
> "Our Safe Paste tool is worth its weight in gold. It helps you avoid Word anomalies that cause documents to become unruly or corrupt when numbered text is copied and pasted."

**Implementation:**
- Detect when pasting numbered content
- Option to: Keep formatting | Match destination | Paste as plain text with style
- Warn when paste would create conflicting list definitions

---

### Medium Priority Gaps

#### 2.5 Court-Specific Numbering Profiles
**DraftBridge already has:** Court types, caption formats

**Missing:**
- California pleading paper (28 lines, line numbers in left margin)
- Federal formatting rules (no line numbers, specific margins)
- State-specific paragraph numbering requirements

**Research findings (California Rules of Court):**

**Rule 2.108 - Line Spacing & Numbering:**
- Lines must be 1.5 or double-spaced
- Lines numbered **consecutively** on left margin
- Text MUST align with line numbers ("no such thing as line 21.5")

**Rule 2.111 - First Page Format:**
- Title of court below top margin
- Party names on separate lines starting at left margin

**Rule 8.204 - Appellate Briefs:**
- Page numbering begins with cover as page 1
- Must use **Arabic numerals only** (1, 2, 3 - not i, ii, iii)

**Federal:**
- Double-spaced body, varies by district on line numbers

---

#### 2.6 Firm-Wide Scheme Libraries
**Problem:** Each user recreates the same numbering schemes.

**Solution (from Adaugeo model):**
- **Firm Library** - Admin-managed default schemes
- **User Library** - Personal saved schemes
- **Workgroup Libraries** - Shared by practice group

**Implementation:**
- Export scheme as JSON
- Import/apply scheme with one click
- Sync schemes via cloud storage

---

#### 2.7 Extension Styles
**Problem:** Need unnumbered continuation paragraphs at each level.

**Example:**
```
1.1  This is a numbered paragraph.
     This continuation paragraph should be at the same indent
     but without a number.
```

**Adaugeo solution:** "Extension styles" - a second style for each level without numbering.

---

### Lower Priority Gaps

#### 2.8 Sequence Numbering (Exhibits)
**Problem:** After Exhibit Z, Word numbers AA, BB, CC (should be AA, AB, AC).

**Adaugeo solution:** Complex sequence fields with formulas.

**Simpler solution:** Provide Exhibit A-Z, then switch to Exhibit 1, 2, 3...

---

#### 2.9 Style Separator Management
**Problem:** TOC requires style separators for inline headings, but they're fragile.

**Features needed:**
- Insert style separator (with guidance)
- Add separators en masse
- Remove separators en masse
- Detect broken separators

---

## 3. Pain Points (What Lawyers Hate)

### The Big Three:

1. **Numbering reverts unexpectedly**
   > "I've spent more time fixing numbering than writing my entire report"

2. **Changes cascade to other numbering**
   > "Changes all my other numbering"

3. **No visibility into what's wrong**
   > "Word's longest-running unsolved mystery"

### Specific Frustrations:

| Issue | Frequency | Impact |
|-------|-----------|--------|
| List restarts when it shouldn't | Very High | Hours lost |
| Paste corrupts entire document | High | Document unusable |
| Cross-refs show "Error" | High | Embarrassing in court |
| Can't have multiple independent lists | Medium | Workarounds needed |
| TOC picks up wrong headings | Medium | Manual cleanup |
| Inconsistent formatting across levels | Medium | Unprofessional look |

### Time Costs:
- Average lawyer: **1+ hour/week** on formatting issues
- Complex documents: **Several hours** per document
- Learning curve: **Weeks** to understand Word's numbering system

---

## 4. 10x Opportunities

### 🏆 The Vision: "It Just Works"

**Philosophy:** Don't teach users Word's numbering system. Make the problems disappear.

### Opportunity 1: Zero-Config Smart Numbering
**Concept:** AI-powered numbering that understands document structure.

**How it works:**
1. User types or pastes content
2. DraftBridge analyzes structure (headings, lists, body)
3. Applies appropriate numbering scheme automatically
4. Handles multiple lists intelligently

**Differentiator:** No training, no configuration, no "blueprints"

---

### Opportunity 2: "Numbering Health Score"
**Concept:** Traffic-light indicator showing document numbering status.

- 🟢 **Healthy** - All numbering correct
- 🟡 **Issues** - Minor problems detected (click to see)
- 🔴 **Broken** - Critical issues need attention

**Features:**
- Real-time monitoring as user types
- One-click "Fix All" for common issues
- Detailed breakdown on hover

---

### Opportunity 3: Smart Paste
**Concept:** Intelligent paste that prevents corruption.

**When user pastes numbered content:**
1. Detect source formatting
2. Show preview: "This will create a new list starting at 1"
3. Options: 
   - Continue existing list
   - Start new independent list  
   - Paste without numbering
4. Learn user preferences over time

---

### Opportunity 4: Visual Numbering Inspector
**Concept:** "Reveal Codes" for the web generation.

**Split view showing:**
- Left: Document
- Right: Numbering structure diagram
  - Which list each paragraph belongs to
  - Where lists connect/break
  - Highlighted issues

**Click any issue → Jump to location → One-click fix**

---

### Opportunity 5: Court Presets
**Concept:** "I'm filing in California Superior Court" → Done.

**One-click applies:**
- 28-line pleading paper
- Line numbers in left margin
- Proper margins (1.5" left, 0.5" right)
- Footer with document title
- Correct caption format

**Presets for:**
- California state courts
- Federal district courts
- Bankruptcy courts
- Specific local rules (SDNY, NDCA, etc.)

---

### Opportunity 6: Numbering Scheme Marketplace
**Concept:** Share and discover numbering schemes.

- Browse schemes by document type (Contract, Pleading, Brief)
- Preview before applying
- Rate and review schemes
- Firm admins can curate approved schemes

---

## 5. Recommended Roadmap

### Phase 1: Core Fixes (MVP Enhancement)
1. ✅ Fix Numbering scan/repair (already spec'd)
2. ⭐ Add "Numbering Health Score" indicator
3. ⭐ Add "Continue/Restart" controls for each paragraph
4. ⭐ Add multi-list support (treat each section as independent)

### Phase 2: Smart Features
1. Smart Paste with preview
2. Visual Numbering Inspector  
3. Cross-reference detection and repair
4. Court presets (start with CA, Federal)

### Phase 3: Enterprise Features
1. Firm-wide scheme libraries
2. Scheme sync/sharing
3. Active monitoring (real-time issue detection)
4. Integration with document management

### Phase 4: Differentiation
1. AI-powered auto-numbering
2. Scheme marketplace
3. Migration tool from other platforms

---

## 6. Competitive Positioning

### DraftBridge vs Litera
| Factor | Litera | DraftBridge |
|--------|--------|-------------|
| Price | $$$$$ | $ |
| Setup | Complex | Instant |
| Training | Required | Minimal |
| Integration | Deep | Light |
| Target | Am Law 100 | Solo to Mid-size |

**Message:** "Enterprise power, startup simplicity"

### DraftBridge vs Adaugeo
| Factor | Adaugeo | DraftBridge |
|--------|---------|-------------|
| Platform | Windows add-in | Web (Office Add-in) |
| Approach | "Learn the system" | "It just works" |
| Libraries | Manual setup | Auto-discover |
| Target | Power users | Everyone |

**Message:** "You shouldn't need a PhD in Word"

### DraftBridge vs Native Word
| Factor | Word | DraftBridge |
|--------|------|-------------|
| Numbering | "Black box" | Transparent |
| Multi-list | Confusing | Simple |
| Repair | Manual | One-click |
| Court rules | DIY | Presets |

**Message:** "Word numbering that actually works"

---

## Appendix: Key Sources

1. ClauseBase - "Numbering in MS Word: The Ultimate Course" (https://clausebase.com/msword/numbering)
2. Modern Legal Support - "Numbering in Word" series
3. Adaugeo Software - Product documentation
4. Litera - Product sheets and blog
5. Reddit r/Lawyertalk, r/LawFirm, r/MicrosoftWord
6. California Rules of Court 2.108, 2.111
7. Federal Rules of Civil Procedure Rule 10
8. Typography for Lawyers - Line numbers guide

---

---

## 7. Additional Pain Points from Research

### Direct Quotes from Reddit (r/Lawyertalk, r/MicrosoftWord)

> "My murderous rage comes when I'm trying to start a page number 1 that's not the first page of the document."

> "I use Word Perfect 12 for this reason. Turn on reveal codes and actually see what code is the issue."

> "Try not to use the format painter. Use the style palette."

> "There is a Word for lawyers CLE that is put on by a lawyer who is a Word Savant." (CLE = lawyers are so desperate they take courses on Word)

> "I always include a quote when the probationer blames their lawyer... then, silently curse them for not using automatic paragraph numbering."

> "I got chewed for being bad at this by a partner at my old firm. I was like can't we have legal assistant fix it"

> "My obsession - I hate Hate HATE paragraphs that cross to a second page."

### Cross-Reference Nightmare

**From Microsoft Community:**
> "If you add a cross-reference to Chapter 3.4 and then you delete Chapter 3.4 outright, any existing cross-reference that pointed to that Chapter 3.4 will change to 'Error! Reference not found'"

**Users don't know you have to:**
- Press F9 to update cross-references
- Select entire document (Ctrl+A) before F9 to update ALL references
- They think Word should do this automatically

### The Multi-List Problem (Deep Dive)

From legal document experts:
> "In Word, the automatic paragraph numbering system can work well in ONE sequential list. If you have MULTIPLE lists going on in the same document... it turns into a complete nightmare."

**Common scenario:**
- Contract has numbered definitions (1, 2, 3...)
- Contract also has numbered clauses (1.1, 1.2...)
- User adds new definition → it continues from clause numbering
- Chaos ensues

**Workarounds users try:**
1. Manual numbering (defeats the purpose)
2. SEQ fields (too complex)
3. Separate Word documents merged later (fragile)
4. Starting over with clean template (time-consuming)

---

## 8. AI Opportunity Analysis

### Current AI Legal Tech Landscape (2025-2026)

| Tool | Focus | Numbering? |
|------|-------|------------|
| Harvey AI | Contract review/drafting | ❌ |
| Spellbook | Contract language | ❌ |
| CoCounsel | Research/analysis | ❌ |
| Ironclad | CLM | Minimal |
| Gavel | Document automation | Template-based |

**Observation:** Nobody is using AI specifically for **formatting and numbering**. They focus on content.

### DraftBridge AI Opportunity

**"AI Formatting Assistant"** - Nobody's doing this yet!

Features:
1. **Auto-detect document type** → Apply appropriate scheme
2. **Intent detection** - "User started typing 'a.' - do they want a list?"
3. **Smart continuation** - Understand when user wants new list vs continue
4. **Structure recognition** - Identify headings, definitions, clauses automatically
5. **Repair suggestions** - "I see 3 issues. Here's what I'd fix."

**Competitive advantage:** While others chase AI for content, we own AI for formatting.

---

*Research complete. Ready to build something better.* 🐿️
