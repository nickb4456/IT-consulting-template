# DraftBridge E-Filing Compliance

> Export documents that meet court e-filing requirements.

## The Problem

E-filing requirements vary wildly by court:
- **File size limits**: 5MB to 200MB depending on jurisdiction
- **Format requirements**: PDF, PDF/A, specific versions
- **Metadata**: Some courts require/forbid certain metadata
- **Security**: No passwords, no encryption (usually)

## PDF/A Requirements

Federal courts and many state courts are transitioning to PDF/A (ISO 19005):

| Standard | Status | Notes |
|----------|--------|-------|
| PDF/A-1a | Preferred | Full compliance, tagged structure |
| PDF/A-1b | Minimum | Basic compliance, visual appearance |
| PDF/A-2 | Emerging | Newer, supports JPEG2000 |

**Why PDF/A?**
- Long-term archivability (100+ years)
- Self-contained (fonts embedded)
- No external dependencies
- Searchable text required

## Court-Specific Requirements

### Federal Courts (CM/ECF)
- PDF format required
- 50MB typical limit (varies by district)
- Text must be searchable (native PDF, not scanned)
- No security/passwords

### California
- PDF/A strongly recommended
- Text searchable required
- 25MB limit typical
- Specific formatting: 1" margins, double-spaced

### New York
- PDF/A required for NYSCEF
- 200 DPI minimum for scanned docs
- Flattened (no layers)
- No passwords/encryption
- 1" margins all sides

### Massachusetts
- **25MB limit**
- Searchable PDF required
- Scanned docs must use OCR (Adobe Acrobat)
- No locked/password protected documents
- Must follow MA Court Rules for formatting (page limits, font style/size)
- Tyler Technologies system

### Rhode Island
- **~35MB limit**
- Searchable PDF format required
- Uses Tyler Technologies Odyssey File and Serve
- Mandatory e-filing (except self-represented litigants)
- Documents held 30 days in File and Serve, then purged
- Access via courthouse or remote access after purge

### Texas
- PDF required
- Text searchable preferred
- Varies significantly by county

### Florida
- PDF required
- 50MB limit
- Accessible/searchable text required

## DraftBridge Features (Planned)

### E-File Ready Export
One-click export that:
1. Converts to PDF/A-1b
2. Embeds all fonts
3. Ensures text is searchable
4. Strips prohibited metadata
5. Validates file size against selected court

### Court Profiles
Pre-configured settings for:
- Federal districts
- State courts
- Local rules

Select your court → Export → Ready to file.

### Pre-Flight Checklist
Before export, verify:
- [ ] Text is searchable
- [ ] Fonts embedded
- [ ] File size under limit
- [ ] No prohibited elements (passwords, scripts)
- [ ] Margins compliant

## Technical Implementation

```javascript
// Future API
async function exportForEfiling(courtProfile) {
    const doc = await Word.run(async (context) => {
        // Get document as PDF
        const pdf = await context.document.getPdf();
        
        // Convert to PDF/A
        const pdfA = await convertToPdfA(pdf, courtProfile.pdfaVersion);
        
        // Validate
        const issues = await validateForCourt(pdfA, courtProfile);
        
        if (issues.length > 0) {
            showComplianceIssues(issues);
            return null;
        }
        
        return pdfA;
    });
}
```

## Resources

- [PDF/A ISO Standard](https://www.pdfa.org/)
- [Federal CM/ECF](https://www.uscourts.gov/court-records/electronic-filing-cmecf)
- [California Courts E-Filing](https://www.courts.ca.gov/8405.htm)
- [NY NYSCEF](https://iapps.courts.state.ny.us/nyscef/)

---

*E-filing compliance is the unglamorous work that saves lawyers hours of rejection notices.*
