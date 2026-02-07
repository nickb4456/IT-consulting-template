# DraftBridge Voice Control

> Hands-free document creation. Speak commands, get results.

## Activation

- Click the 🎤 button in header
- Or press **Ctrl+Shift+V**

## Commands

### Document Creation

| Say | Action |
|-----|--------|
| "Letter to [name]" | Opens letter form, pre-fills recipient |
| "Start a letter" | Opens blank letter form |
| "Memo to [name]" | Opens memo form, pre-fills recipient |
| "Start a memo" | Opens blank memo form |

### Clause Insertion

| Say | Action |
|-----|--------|
| "Insert [clause name]" | Inserts matching clause at cursor |
| "Insert indemnification" | Inserts indemnification clause |
| "Insert [clause] at end" | Inserts at document end |
| "Insert [clause] at beginning" | Inserts at document start |

### Numbering

| Say | Action |
|-----|--------|
| "Legal outline" | Applies legal outline scheme |
| "Contract numbering" | Applies contract sections scheme |
| "Pleading style" | Applies pleading format |
| "Heading style" | Applies decimal heading scheme |

### Quick Actions

| Say | Action |
|-----|--------|
| "Add closing" | Inserts "Sincerely," signature block |
| "Add signature" | Inserts /s/ signature block |
| "Today's date" | Inserts current date |

### Navigation

| Say | Action |
|-----|--------|
| "Go to library" | Switches to Library tab |
| "Go to generate" | Switches to Generate tab |
| "Go to numbering" | Switches to Numbering tab |
| "Help" | Shows available commands |
| "Close" / "Cancel" | Closes voice window |

## Smart Cleanup

Voice input is automatically cleaned:
- Filler words removed (um, uh, like, basically, etc.)
- 287 filler patterns recognized
- Aliases expanded (e.g., "correspondence" → "letter")

**Example:**
- You say: "Um, could you please insert the, uh, indemnification clause"
- Processed as: "insert indemnification clause"

## Aliases

| You Say | Interpreted As |
|---------|----------------|
| add, put in, include | insert |
| provision, section | clause |
| correspondence, mail | letter |
| memorandum | memo |
| create, new document | generate |

## Browser Support

Voice control uses Web Speech API:
- ✅ Chrome (best support)
- ✅ Edge
- ⚠️ Firefox (limited)
- ❌ Safari (not supported in add-ins)

## Tips

1. **Speak naturally** — Filler words are filtered out
2. **Wait for the beep** — Indicates listening started
3. **Check transcript** — Shows what was heard
4. **Use aliases** — Multiple ways to say the same thing

## Troubleshooting

**"Microphone access denied"**
- Click the lock icon in browser address bar
- Allow microphone access for the domain

**"Voice not recognized"**
- Speak more clearly
- Try rephrasing
- Check the transcript to see what was heard

**"Command not found"**
- Say "help" for available commands
- Try using aliases

---

*Voice control works best for frequent, repetitive actions. For complex formatting, use the UI.*
