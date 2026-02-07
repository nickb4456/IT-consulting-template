# DraftBridge TODO

## 🔴 Critical (Before Beta)
- [ ] **API key headers** — Frontend fetch calls need `X-API-Key` header
- [ ] Move template storage from localStorage → DynamoDB per firm

## 🟡 High Priority
- [ ] **Template Editor Phase 2**
  - [ ] Conditional blocks (IF court.type == "federal")
  - [ ] Insert tables as actual Word tables (OOXML)
  - [ ] "Keep together" paragraph formatting
- [ ] **Fill Variables improvements**
  - [ ] Better modal instead of `prompt()` dialogs
  - [ ] Preview before filling
- [x] **Security fixes** ✅
  - [x] Template ID XSS — data attributes + event delegation
  - [x] User scheme ID XSS — same fix
  - [x] Template data validation from localStorage

## 🟢 Medium Priority (Polish)
- [x] Template Editor UX (from Pip's review) ✅
  - [x] Drop position indicator when reordering blocks ✅
  - [x] Delete block undo (toast with undo button) ✅
  - [x] Variable chips insert at cursor, not just copy ✅
  - [x] Show preview by default ✅
- [x] First-run onboarding experience ✅
- [ ] Keyboard accessibility for scheme cards
- [ ] Context-aware empty states in Library

## 🔵 Future / Phase 3
- [ ] Loop blocks in templates (for parties, recipients)
- [ ] Template categories/folders
- [ ] Template sharing between firms
- [ ] Template versioning
- [ ] Import/export templates
- [ ] Multi-column table blocks

## ✅ Done Today (2026-02-03)
- [x] Template Editor MVP (Settings tab)
  - [x] Drag-drop block palette
  - [x] Text, Variable, Separator, Table blocks
  - [x] Variable substitution preview
  - [x] Save/load templates (localStorage)
  - [x] Insert into document
- [x] Fill Variables tool (Generate tab)
  - [x] Scan for {{placeholders}}
  - [x] Scan for Word bookmarks
  - [x] Batch replace all occurrences
- [x] Enhanced Fix All
  - [x] Preview modal showing what will be fixed
  - [x] Results summary
  - [x] Undo with OOXML save/restore
- [x] Button locking during async operations
- [x] Friendly error messages utility
- [x] Fixed decryptAndOpen data loss risk
- [x] Moved template editor to Settings tab
- [x] Merged Detect Bookmarks + Global Variables → Fill Variables

## 📊 Stats
- **Lines of Code:** ~7,100
- **Functions:** ~130
- **Panels:** 5 (Generate, Edit, Numbering, Library, Settings)
