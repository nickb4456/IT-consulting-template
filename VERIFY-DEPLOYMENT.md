# 🧪 CaseVault Deployment Verification Checklist

**Quick Manual Test** - Run through this flow to verify everything works:

---

## ✅ Pre-Flight Check

Visit these URLs and verify they load:
- [ ] https://aibridges.org/intake
- [ ] https://aibridges.org/contribute
- [ ] https://aibridges.org/calculator
- [ ] https://aibridges.org/dashboard

---

## 🔍 Step-by-Step Verification

### Step 1: Test Direct Calculator Access (Should Be Blocked)
1. Open incognito window
2. Clear localStorage (just to be safe)
3. Visit: `https://aibridges.org/calculator`
4. **Expected:** 🔒 Paywall overlay appears with "Access Required"
5. **Expected:** CTA button says "Get Started Free →"

**Status:** [ ] PASS / [ ] FAIL

---

### Step 2: Fill Intake Form
1. Click "Get Started Free →"
2. **Expected:** Redirects to `/intake`
3. Fill form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Law Firm: "Test Law LLC"
4. Click "Access Calculator →"
5. **Expected:** Alert: "✅ Welcome! Now submit 1 settlement case..."
6. **Expected:** Redirects to `/contribute`

**Status:** [ ] PASS / [ ] FAIL

---

### Step 3: Submit Contribution
1. On `/contribute` page
2. Fill form:
   - State: Massachusetts
   - Injury Type: Fracture/Broken Bone
   - Settlement Amount: 50000
   - Representation: Yes
3. Click "Unlock Dashboard Access →"
4. **Expected:** Alert: "✅ Thank you for contributing! You now have 10 minutes..."
5. **Expected:** Redirects to `/dashboard`

**Status:** [ ] PASS / [ ] FAIL

---

### Step 4: Verify Dashboard Access
1. On `/dashboard` page
2. **Expected:** Timer banner shows "⏱️ Dashboard access expires in: 10:00"
3. **Expected:** Dashboard content is visible (not blocked)
4. **Expected:** Timer counts down (9:59, 9:58, etc.)
5. Wait 30 seconds, timer should continue counting down

**Status:** [ ] PASS / [ ] FAIL

---

### Step 5: Verify Calculator Access
1. Navigate to `/calculator` (or click Calculator link)
2. **Expected:** No paywall - calculator is fully accessible
3. Fill calculator form:
   - State: Massachusetts
   - Injury Type: Car Accident
   - Medical Costs: 15000
   - Lost Wages: 5000
   - Severity: Moderate
4. Click "Calculate Settlement Range"
5. **Expected:** Results appear with estimated range
6. **Expected:** "Want the full picture?" unlock box appears

**Status:** [ ] PASS / [ ] FAIL

---

### Step 6: Test Token Expiration (Manual)
1. Open browser console (F12)
2. Run this command:
   ```javascript
   localStorage.setItem('casevault_access_expires', Date.now() - 1000);
   ```
3. Refresh `/dashboard`
4. **Expected:** 🔒 Locked overlay appears
5. **Expected:** Title says "Subscribe to Continue"
6. **Expected:** Message mentions "10-minute preview has expired"
7. **Expected:** CTA says "Contribute Another Case →"

**Status:** [ ] PASS / [ ] FAIL

---

### Step 7: Test Contribute Gating
1. Clear localStorage
2. Visit `/contribute` directly
3. **Expected:** Alert: "⚠️ Please fill out the intake form first."
4. **Expected:** Redirects to `/intake`

**Status:** [ ] PASS / [ ] FAIL

---

### Step 8: Test Repeat Contribution
1. After token expires (or manually expire it)
2. Visit `/contribute`
3. Submit another settlement case
4. **Expected:** New 10-minute token generated
5. **Expected:** Redirects to `/dashboard` with timer reset to "10:00"

**Status:** [ ] PASS / [ ] FAIL

---

## 📱 Mobile Verification

Repeat Steps 1-5 on mobile:
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 🐛 Edge Cases to Test

### Test A: Direct Dashboard Access (No Token)
1. Incognito window, clear localStorage
2. Visit `/dashboard` directly
3. **Expected:** Locked overlay appears
4. **Expected:** CTA redirects to `/intake`

**Status:** [ ] PASS / [ ] FAIL

---

### Test B: Timer Turns Red
1. After contributing, manually set timer to 1:30 remaining:
   ```javascript
   localStorage.setItem('casevault_access_expires', Date.now() + 90000);
   ```
2. Refresh `/dashboard`
3. **Expected:** Timer shows 1:30
4. **Expected:** Banner turns red (linear-gradient with #dc2626)

**Status:** [ ] PASS / [ ] FAIL

---

### Test C: Multiple Browser Tabs
1. Contribute and get access in Tab 1
2. Open Tab 2 to `/dashboard`
3. **Expected:** Both tabs have access
4. **Expected:** Both timers count down in sync
5. Let timer expire in Tab 1
6. Refresh Tab 2
7. **Expected:** Tab 2 also shows paywall

**Status:** [ ] PASS / [ ] FAIL

---

## 🚨 Critical Bugs

Document any critical issues here:

1. **Issue:** [Description]
   - **Severity:** High / Medium / Low
   - **Impact:** [User-facing impact]
   - **Fix Required:** Yes / No

---

## ✅ Final Sign-Off

- [ ] All core flows tested and working
- [ ] Mobile responsive on iPhone/Android
- [ ] Timer countdown works correctly
- [ ] Token expiration triggers paywall
- [ ] Contribution gating prevents bypasses
- [ ] No console errors on any page

**Tested By:** _______________
**Date:** _______________
**Status:** 🟢 READY TO LAUNCH / 🔴 NEEDS FIXES

---

**Notes:**
- If all tests pass, CaseVault is ready for real users
- Monitor contact form for user feedback
- Track localStorage submissions via console logs
- Consider adding backend analytics in Phase 2
