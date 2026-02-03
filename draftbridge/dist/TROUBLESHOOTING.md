# DraftBridge Troubleshooting Guide

## Voice Control

### Microphone Access Denied
**Error:** "Microphone access denied. Check Word permissions."

**Solution (Windows):**
1. Open **Windows Settings** → **Privacy & Security** → **Microphone**
2. Ensure **"Let desktop apps access your microphone"** is **ON**
3. Microsoft Office should appear in the list of apps with access
4. Restart Word after changing permissions

**Why this happens:**
Word add-ins run inside a WebView (embedded browser). The WebView needs OS-level permission to access the microphone, separate from browser permissions.

---

## Numbering

### "Cannot read properties of undefined (reading 'convertToNumberedList')"
**Cause:** Office.js requires explicit property loading before use.

**Solution:** Fixed in v2.0.1 - update to latest taskpane.html

### Numbering won't apply to empty document
**Cause:** No paragraphs to apply numbering to.

**Solution:** Fixed in v2.0.1 - now auto-inserts placeholder items when document is empty.

### Edit button doesn't open Word's native dialog
**Why:** Office.js API cannot directly open Word's built-in dialogs.

**Workaround:** Use the native path:
1. **Home** tab → **Numbering** dropdown (click the arrow)
2. Select **"Define New Number Format"**
3. Make your changes
4. Use "Save from Document" in DraftBridge to capture your custom scheme

---

## Table of Contents

### TOC not inserting properly
**Cause:** Word.js API field insertion can be limited in some versions.

**Workaround:** Use Word's native TOC:
1. **References** tab → **Table of Contents**
2. Choose a style or **Custom Table of Contents**

### TOC not updating
**Solution:** 
- Select the TOC and press **F9**
- Or right-click the TOC → **Update Field**

---

## General

### Add-in not loading
1. Check your internet connection (add-in loads from hosted URL)
2. Clear Office cache:
   - Windows: `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
   - Delete the folder contents, restart Word
3. Re-sideload the manifest

### Add-in shows blank panel
1. Check browser console (F12 in Word on Windows)
2. Verify taskpane.html is accessible at the hosted URL
3. Check for CORS errors in console

### Changes not appearing after update
1. Clear Office WebView cache
2. Close all Word windows completely
3. Reopen Word and the add-in

---

## Contact Support

If issues persist, contact support with:
- Word version (File → Account → About Word)
- Windows version
- Screenshot of the error
- Browser console logs (F12 → Console tab)
