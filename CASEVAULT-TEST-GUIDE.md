# CaseVault Test Guide ✅

## Flow Overview

```
User Journey:
1. Visit /casevault-intake.html
2. Fill form (name, email, law firm)
3. Get redirected to /casevault-calculator.html
4. Use calculator (free, unlimited)
5. Click "Contribute a Case & Unlock Dashboard"
6. Fill contribution form (state, amount, type, representation)
7. Submit → Get 10-minute access token
8. Redirected to /casevault-dashboard.html
9. See timer countdown (10:00 → 9:59 → ... → 0:00)
10. When timer hits 0:00 → Lock screen appears with "Subscribe to continue"
```

---

## Test Scenarios

### ✅ Test 1: Complete Happy Path

**Steps:**
1. Visit `https://aibridges.org/casevault-intake.html`
2. Fill intake form:
   - Name: "Jane Doe"
   - Email: "jane@lawfirm.com"
   - Law Firm: "Smith & Associates"
3. Click "Access Calculator"
4. **Expected:** Redirected to calculator page
5. Fill calculator form:
   - State: Massachusetts
   - Injury Type: Car Accident
   - Medical Costs: $15,000
   - Lost Wages: $5,000
   - Severity: Moderate
6. Click "Calculate Settlement Range"
7. **Expected:** See settlement estimate (e.g., "$35,000 - $75,000")
8. Click "Contribute a Case & Unlock Dashboard"
9. Fill contribution form:
   - Email: (should be pre-filled)
   - State: MA
   - Amount: $50,000
   - Case Type: "Car accident rear-end"
   - Represented: Yes
10. Click "Submit Case & Unlock Dashboard"
11. **Expected:** Alert "Thank you for contributing! You now have 10 minutes of dashboard access."
12. **Expected:** Redirected to dashboard
13. **Expected:** See timer banner "⏱️ Expires in: 10:00"
14. **Expected:** Timer counts down every second
15. Wait until timer < 2 minutes
16. **Expected:** Timer banner turns RED
17. Wait until timer hits 0:00
18. **Expected:** Lock screen overlay appears
19. **Expected:** Message: "🔒 Access Expired - Subscribe to continue using CaseVault"

**✅ Pass Criteria:**
- All redirects work correctly
- Calculator shows estimate
- Contribution form submits successfully
- 10-minute timer starts and counts down
- Lock screen appears at 0:00

---

### ✅ Test 2: Try Dashboard Without Contribution

**Steps:**
1. Clear browser localStorage: `localStorage.clear()`
2. Visit `https://aibridges.org/casevault-intake.html`
3. Fill intake form and submit
4. **Expected:** Redirected to calculator
5. Manually navigate to `https://aibridges.org/casevault-dashboard.html`
6. **Expected:** Lock screen immediately appears
7. **Expected:** Cannot access dashboard data

**✅ Pass Criteria:**
- Dashboard is locked without contribution

---

### ✅ Test 3: Token Persistence Across Refreshes

**Steps:**
1. Complete happy path (get 10-min access)
2. On dashboard page, press F5 (refresh)
3. **Expected:** Dashboard still accessible
4. **Expected:** Timer continues counting down from correct time
5. Open new tab, visit `https://aibridges.org/casevault-dashboard.html`
6. **Expected:** Dashboard accessible (token in localStorage persists)

**✅ Pass Criteria:**
- Token persists across page refreshes
- Timer remains accurate

---

### ✅ Test 4: Try Modifying Token in DevTools

**Steps:**
1. Get 10-min access from contribution
2. Open browser DevTools (F12) → Console
3. Run: `localStorage.setItem('casevault_access_expires', Date.now() + 999999999)`
4. Refresh dashboard page
5. **Expected:** Dashboard still locks after 10 minutes (timer checks localStorage expiry)

**Note:** This is a known limitation of client-side auth. In production with backend, the backend would reject expired tokens.

**✅ Pass Criteria:**
- Users can extend client-side time (expected in MVP)
- In production, backend API would prevent this

---

### ✅ Test 5: Multiple Contributions Extend Access

**Steps:**
1. Complete contribution flow → get 10-min access
2. On dashboard, click "Contribute Another Case"
3. **Expected:** Redirected to calculator
4. Scroll to contribution form
5. Submit another case
6. **Expected:** New 10-minute token generated
7. **Expected:** Timer resets to 10:00

**✅ Pass Criteria:**
- Multiple contributions extend access time
- Each submission generates new 10-min window

---

## Developer Console Checks

### Check LocalStorage Data

Open DevTools → Console, run:

```javascript
// View all CaseVault data
console.log('User Info:', {
  name: localStorage.getItem('casevault_user_name'),
  email: localStorage.getItem('casevault_user_email'),
  firm: localStorage.getItem('casevault_user_firm')
});

console.log('Access Token:', localStorage.getItem('casevault_access_token'));
console.log('Expires At:', new Date(parseInt(localStorage.getItem('casevault_access_expires'))).toISOString());
console.log('Time Remaining (ms):', parseInt(localStorage.getItem('casevault_access_expires')) - Date.now());

console.log('Submissions:', JSON.parse(localStorage.getItem('casevault_submissions') || '[]'));
```

### Manually Grant Access (Testing Only)

```javascript
// Give yourself 10 minutes of access without contributing
const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const expires = Date.now() + (10 * 60 * 1000);
localStorage.setItem('casevault_access_token', token);
localStorage.setItem('casevault_access_expires', expires.toString());
console.log('Access granted until:', new Date(expires).toISOString());
// Now visit dashboard
```

### Clear All Data

```javascript
// Reset everything
localStorage.removeItem('casevault_user_name');
localStorage.removeItem('casevault_user_email');
localStorage.removeItem('casevault_user_firm');
localStorage.removeItem('casevault_intake_token');
localStorage.removeItem('casevault_intake_expires');
localStorage.removeItem('casevault_access_token');
localStorage.removeItem('casevault_access_expires');
localStorage.removeItem('casevault_submissions');
console.log('All CaseVault data cleared');
```

---

## Known Limitations (MVP)

1. **Client-side auth only** — Users can manipulate localStorage to extend time. This is acceptable for MVP. Production should use backend token validation.

2. **No backend submission** — Contributions are stored in localStorage only. Production should POST to API Gateway → Lambda → DynamoDB.

3. **No email capture** — Emails are stored locally but not sent anywhere. Production should integrate with mailing list (ConvertKit/Mailchimp).

4. **No actual settlement data** — Dashboard shows mock/static data. Production should fetch real data from DynamoDB.

5. **No payment flow** — "Subscribe to continue" is just text. Production needs Stripe integration.

---

## Production Readiness Checklist

- [ ] Backend API for contribution submission (Lambda + DynamoDB)
- [ ] Backend token validation endpoint
- [ ] Email capture integration (ConvertKit)
- [ ] Real settlement data in dashboard (DynamoDB query)
- [ ] Stripe subscription flow
- [ ] Analytics tracking (Google Analytics / Mixpanel)
- [ ] HTTPS enforcement
- [ ] Rate limiting on submission endpoint
- [ ] Data validation & sanitization
- [ ] GDPR compliance (privacy policy, data deletion)

---

## URLs

- **Intake:** https://aibridges.org/casevault-intake.html
- **Calculator:** https://aibridges.org/casevault-calculator.html
- **Dashboard:** https://aibridges.org/casevault-dashboard.html
- **Homepage:** https://aibridges.org/ (has "CaseVault ⚖️" nav link)

---

*Built by Supernova ✨ — February 7, 2026*
