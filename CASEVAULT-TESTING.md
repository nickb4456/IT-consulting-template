# CaseVault Gated Access - Testing Guide

## Test Flow (Expected Behavior)

### 1️⃣ First-Time User Journey
**Start:** User visits `/casevault-calculator.html` directly

**Expected:**
- ❌ Redirected to `/casevault-intake.html`
- Alert: "Please fill out the intake form first."

---

### 2️⃣ Intake Form Submission
**URL:** `/casevault-intake.html`

**Action:** Fill form with:
- Name: John Doe
- Email: john@lawfirm.com
- Law Firm: Doe & Associates

**Expected:**
- ✅ Form submits successfully
- Alert: "Welcome! Now submit 1 settlement case to unlock your 10-minute preview."
- Redirected to `/casevault-contribute.html`
- localStorage stores: `casevault_user_name`, `casevault_user_email`, `casevault_user_firm`

---

### 3️⃣ Contribution Form Submission
**URL:** `/casevault-contribute.html`

**Action:** Fill form with:
- State: Massachusetts
- Injury Type: Fracture/Broken Bone
- Settlement Amount: 75000
- Representation: Yes

**Expected:**
- ✅ Form submits successfully
- Alert: "Thank you for contributing! You now have 10 minutes of full dashboard access."
- Redirected to `/casevault-dashboard.html`
- localStorage stores:
  - `casevault_access_token`: random 64-char hex string
  - `casevault_access_expires`: timestamp 10 minutes in future
  - `casevault_contribution`: JSON object with submission data
  - `casevault_contributed`: "true"

---

### 4️⃣ Dashboard Access (Valid Token)
**URL:** `/casevault-dashboard.html`

**Expected:**
- ✅ Dashboard loads successfully
- Timer banner shows: "⏱️ Dashboard access expires in: 10:00"
- Countdown decrements every second
- Full dashboard visible with metrics, charts, filters
- When < 2 minutes remain, timer banner turns red

---

### 5️⃣ Calculator Access (Valid Token)
**URL:** `/casevault-calculator.html`

**Expected:**
- ✅ Calculator loads successfully
- Can input case details and calculate settlement estimates
- Shows result with estimated range
- Shows unlock box: "Contribute a Case & Unlock Dashboard"

---

### 6️⃣ Token Expiry (After 10 Minutes)
**Trigger:** Wait 10 minutes OR manually delete `casevault_access_token` from localStorage

**Expected on Dashboard:**
- ❌ Overlay appears: "🔒 Access Expired"
- Message: "Your 10-minute preview has ended..."
- Button: "Contribute Another Case" → redirects to `/casevault-contribute.html`

**Expected on Calculator:**
- ❌ Redirected to `/casevault-contribute.html`
- Alert: "You must contribute a settlement case to access the calculator."

---

### 7️⃣ Return User (Valid Token)
**Start:** User who already contributed returns to `/casevault-intake.html` with valid token

**Expected:**
- ✅ Redirected immediately to `/casevault-dashboard.html`
- (Intake form checks for valid access token and skips form if present)

---

## Manual Testing Checklist

- [ ] **Test 1:** Direct access to calculator without intake redirects properly
- [ ] **Test 2:** Intake form validates all fields (name, email, law firm)
- [ ] **Test 3:** Intake form stores data in localStorage
- [ ] **Test 4:** Contribute form requires intake form completion first
- [ ] **Test 5:** Contribute form validates all fields (state, injury type, amount, representation)
- [ ] **Test 6:** Contribute form generates 10-min token and redirects to dashboard
- [ ] **Test 7:** Dashboard shows timer countdown from 10:00
- [ ] **Test 8:** Dashboard timer turns red under 2 minutes
- [ ] **Test 9:** Dashboard shows paywall overlay when token expires
- [ ] **Test 10:** Calculator accessible only with valid token
- [ ] **Test 11:** "Contribute Another Case" buttons all redirect to `/casevault-contribute.html`
- [ ] **Test 12:** Return user with valid token can access dashboard/calculator immediately

---

## Quick Manual Token Expiry Test

To test expiry without waiting 10 minutes:

```javascript
// In browser console:
localStorage.setItem('casevault_access_expires', Date.now() + 30000); // 30 seconds
```

Then refresh page and watch timer countdown from 0:30.

---

## localStorage Keys Reference

| Key | Purpose | Set By |
|-----|---------|--------|
| `casevault_user_name` | User's name | Intake form |
| `casevault_user_email` | User's email | Intake form |
| `casevault_user_firm` | Law firm name | Intake form |
| `casevault_access_token` | 64-char hex token | Contribution form |
| `casevault_access_expires` | Expiry timestamp (ms) | Contribution form |
| `casevault_contribution` | JSON of submitted case | Contribution form |
| `casevault_contributed` | "true" flag | Contribution form |

---

## Expected Flow Summary

```
/casevault-intake.html
    ↓ (submit form)
/casevault-contribute.html
    ↓ (submit settlement)
/casevault-dashboard.html (10 min access)
    OR
/casevault-calculator.html (10 min access)
    ↓ (after 10 min)
🔒 PAYWALL → /casevault-contribute.html
```

---

## Production Deployment Notes

1. **Backend Integration Needed:**
   - POST contributions to backend API
   - Store tokens server-side for validation
   - Email capture for lead nurturing

2. **Analytics to Track:**
   - Intake form conversion rate
   - Contribution form conversion rate
   - Time to contribution (intake → submit)
   - Token expiry → re-contribution rate
   - Calculator usage during 10-min window

3. **Future Enhancements:**
   - Subscription paywall CTA during countdown
   - Email reminder at 2 min remaining
   - "Extend access" premium upgrade button
   - Save calculation results for logged-in users

---

**✨ Created:** 2026-02-07
**🦉 Deployed By:** Supernova
