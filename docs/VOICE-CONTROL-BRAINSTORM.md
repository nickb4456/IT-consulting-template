# DraftBridge Voice Control — Implementation Brainstorm

## Current Implementation Review

**What We Have:**
- Web Speech API (browser built-in, free, local)
- Keyboard shortcut: `Ctrl+Shift+V`
- Floating voice window with visual feedback
- 287-item filler word cleanup
- Keyword-based command matching

**Working Commands:**
| Command Pattern | Action |
|-----------------|--------|
| "letter to [name]" | Create letter, fill recipient |
| "memo to [name]" | Create memo, fill recipient |
| "insert [clause] at cursor/end/start" | Insert clause by name |
| "legal outline/contract/pleading" | Apply numbering scheme |
| "add closing" | Insert closing phrase |
| "add signature" | Insert signature block |
| "today's date" | Insert current date |
| "go to library/generate/numbering" | Panel navigation |
| "close/cancel/stop" | Close voice window |

---

## Constraints (Hard Rules)

✅ **Allowed:**
- Web Speech API (built into Chrome/Edge)
- Pure JavaScript keyword matching
- Local storage
- Offline operation

❌ **Not Allowed:**
- OpenAI / any AI APIs
- Whisper / cloud transcription
- NLU / intent classification services
- Any paid APIs

---

## Improvement Areas

### 1. Browser Compatibility

**Current Issue:** Web Speech API only works reliably in Chrome

**Options:**
| Approach | Effort | Impact |
|----------|--------|--------|
| Graceful degradation with clear messaging | Low | Users know what works |
| Detect browser and show compatibility warning | Low | Set expectations |
| Remove voice for non-Chrome (clean UI) | Low | Simpler UX |

**Recommendation:** Show browser compatibility notice on first use. Don't hide the feature, just inform.

```javascript
function checkVoiceSupport() {
  const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  
  if (!hasAPI) return { supported: false, reason: 'Browser does not support speech' };
  if (!isChrome) return { supported: true, reason: 'Works best in Chrome. May have issues in other browsers.' };
  return { supported: true, reason: null };
}
```

---

### 2. Command Discoverability

**Current Issue:** Users don't know what commands exist

**Solutions:**

**A. Help Command**
```javascript
if (command === 'help' || command === 'commands' || command === 'what can i say') {
  showVoiceHelp();
  return;
}
```

**B. Voice Window Shows Hints**
```html
<div class="voice-hints">
  <div class="hint">"Insert [clause name]"</div>
  <div class="hint">"Letter to [name]"</div>
  <div class="hint">"Go to library"</div>
  <div class="hint">"Help" for all commands</div>
</div>
```

**C. Context-Aware Hints**
- On Library panel: "Try: Insert confidentiality"
- On Generate panel: "Try: Letter to John Smith"
- On Numbering: "Try: Legal outline"

---

### 3. Fuzzy Matching for Clauses

**Current Issue:** Clause names must match exactly

**Solution:** Levenshtein distance + partial matching (no AI needed)

```javascript
function findClauseByVoice(spokenName) {
  const clauses = getAllClauses();
  let bestMatch = null;
  let bestScore = 0;
  
  for (const clause of clauses) {
    // Exact match
    if (clause.title.toLowerCase() === spokenName) {
      return clause;
    }
    
    // Partial match (contains)
    if (clause.title.toLowerCase().includes(spokenName) ||
        spokenName.includes(clause.title.toLowerCase())) {
      const score = Math.min(spokenName.length, clause.title.length) / 
                    Math.max(spokenName.length, clause.title.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = clause;
      }
    }
    
    // Word overlap
    const spokenWords = spokenName.split(/\s+/);
    const titleWords = clause.title.toLowerCase().split(/\s+/);
    const overlap = spokenWords.filter(w => titleWords.includes(w)).length;
    const overlapScore = overlap / Math.max(spokenWords.length, titleWords.length);
    if (overlapScore > bestScore) {
      bestScore = overlapScore;
      bestMatch = clause;
    }
  }
  
  // Require minimum confidence
  return bestScore > 0.5 ? bestMatch : null;
}
```

---

### 4. Confirmation for Destructive Actions

**Current Issue:** Some commands execute immediately without confirmation

**Solution:** Two-tier commands

```javascript
const SAFE_COMMANDS = ['go to', 'open', 'show', 'help'];
const CONFIRM_COMMANDS = ['delete', 'clear', 'remove', 'replace'];

function processVoiceCommand(command) {
  const needsConfirm = CONFIRM_COMMANDS.some(c => command.includes(c));
  
  if (needsConfirm && !pendingConfirmation) {
    pendingConfirmation = command;
    showVoiceAction('Say "yes" to confirm or "cancel"');
    return;
  }
  
  if (pendingConfirmation && (command === 'yes' || command === 'confirm')) {
    executeCommand(pendingConfirmation);
    pendingConfirmation = null;
    return;
  }
  
  // ... rest of command processing
}
```

---

### 5. Command Aliases

**Current Issue:** Only one phrase works for each command

**Solution:** Alias table

```javascript
const COMMAND_ALIASES = {
  // Clause insertion
  'insert': ['insert', 'add', 'put in', 'include'],
  'clause': ['clause', 'provision', 'section', 'paragraph'],
  
  // Document creation
  'letter': ['letter', 'correspondence', 'mail'],
  'memo': ['memo', 'memorandum', 'internal memo'],
  
  // Navigation
  'library': ['library', 'clauses', 'clause library', 'saved clauses'],
  'generate': ['generate', 'create', 'new document', 'templates'],
  
  // Actions
  'signature': ['signature', 'sign', 'signing block', 'my name'],
  'date': ['date', 'today', 'current date', 'todays date'],
  'closing': ['closing', 'sincerely', 'regards', 'close letter']
};

function normalizeCommand(command) {
  let normalized = command;
  for (const [canonical, aliases] of Object.entries(COMMAND_ALIASES)) {
    for (const alias of aliases) {
      if (command.includes(alias)) {
        normalized = normalized.replace(alias, canonical);
      }
    }
  }
  return normalized;
}
```

---

### 6. Audio Feedback (Optional)

**No cloud APIs needed — use Web Audio API**

```javascript
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, duration = 100) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration/1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration/1000);
}

function playSuccess() { playTone(880, 100); } // High beep
function playError() { playTone(220, 200); }   // Low beep
function playListening() { playTone(440, 50); playTone(550, 50); } // Rising tone
```

---

### 7. New Commands to Add

| Command | Action | Priority |
|---------|--------|----------|
| "undo" | Trigger Ctrl+Z | High |
| "redo" | Trigger Ctrl+Y | High |
| "save" | Trigger Ctrl+S | High |
| "select all" | Select document | Medium |
| "scroll up/down" | Page navigation | Medium |
| "find [text]" | Open find dialog | Medium |
| "bold/italic/underline" | Format selection | Medium |
| "new paragraph" | Insert paragraph break | Low |
| "read that back" | TTS of last insertion (if added) | Low |

---

### 8. Error Recovery

**Current Issue:** Errors show but don't guide recovery

**Solution:** Contextual error messages with suggestions

```javascript
function handleVoiceError(error, command) {
  const suggestions = {
    'clause_not_found': `Clause not found. Try "go to library" to browse available clauses.`,
    'no_document': `No document open. Try "letter to [name]" to create one.`,
    'permission_denied': `Microphone blocked. Click the lock icon in the address bar to allow.`,
    'network': `Speech service unavailable offline. Try typed commands instead.`,
  };
  
  showVoiceAction(suggestions[error] || 'Try "help" for available commands', true);
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
- [ ] Add "help" command with command list
- [ ] Add hints to voice window UI
- [ ] Add command aliases
- [ ] Better error messages

### Phase 2: Robustness (2-3 hours)
- [ ] Fuzzy clause matching
- [ ] Browser compatibility notice
- [ ] Confirmation for destructive actions

### Phase 3: Polish (2-3 hours)
- [ ] Audio feedback (optional toggle)
- [ ] Continuous listening mode
- [ ] Context-aware hints
- [ ] New commands (undo, redo, save, formatting)

---

## Testing Checklist

- [ ] Chrome on Windows (primary target)
- [ ] Chrome on Mac
- [ ] Edge on Windows (may not work)
- [ ] Word Online vs Desktop add-in
- [ ] Offline behavior
- [ ] Noisy environment handling
- [ ] Accent tolerance (Web Speech handles this)

---

## Summary

**No changes needed to the core approach.** The current implementation is solid:
- Web Speech API ✓
- Keyword matching ✓
- No AI ✓
- Free ✓

**Focus improvements on:**
1. Discoverability (help, hints)
2. Flexibility (aliases, fuzzy matching)
3. Robustness (errors, confirmation)
4. Polish (audio feedback, continuous mode)

All improvements use **zero external APIs** — pure browser JavaScript.
