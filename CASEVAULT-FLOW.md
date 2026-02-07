# CaseVault Access Flow

## User Journey Map

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW USER ENTERS SITE                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  /casevault-intake.html │
              │  📝 Intake Form         │
              └─────────────────────────┘
                            │
                    User fills form:
                    - Name
                    - Email
                    - Law Firm
                            │
                            ▼
              ┌─────────────────────────────┐
              │ /casevault-contribute.html  │
              │ 🤝 Contribution Required    │
              └─────────────────────────────┘
                            │
                  User submits case:
                  - State
                  - Injury Type
                  - Settlement Amount
                  - Representation (Y/N)
                            │
                            ▼
              ┌──────────────────────────────┐
              │  TOKEN GENERATED             │
              │  ⏱️ 10-minute access granted │
              └──────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌────────────────────┐   ┌─────────────────────┐
    │ /casevault-        │   │ /casevault-         │
    │  dashboard.html    │   │  calculator.html    │
    │ 📊 Full Analytics  │   │ 🧮 Calculator       │
    └────────────────────┘   └─────────────────────┘
                │                       │
        ⏱️ Timer: 10:00           ⏱️ Timer: 10:00
        (counts down)             (counts down)
                │                       │
                └───────────┬───────────┘
                            │
                  After 10 minutes...
                            │
                            ▼
              ┌─────────────────────────┐
              │  🔒 ACCESS EXPIRED      │
              │  Paywall Overlay        │
              └─────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        Contribute Another      Subscribe for
           Case (FREE)          Unlimited Access
                │                       │
                ▼                       ▼
    /casevault-contribute.html   /contact.html
    (10 more minutes)            (Sales page)
```

---

## Access Gates

### Gate 1: Intake Form Requirement
**Location:** `/casevault-calculator.html`, `/casevault-dashboard.html`

**Check:**
```javascript
if (!localStorage.getItem('casevault_user_name')) {
  redirect('/casevault-intake.html')
}
```

---

### Gate 2: Contribution Requirement
**Location:** `/casevault-calculator.html`, `/casevault-dashboard.html`

**Check:**
```javascript
const token = localStorage.getItem('casevault_access_token')
const expires = localStorage.getItem('casevault_access_expires')

if (!token || Date.now() > expires) {
  redirect('/casevault-contribute.html')
}
```

---

### Gate 3: Time Limit (10 Minutes)
**Location:** `/casevault-dashboard.html` (countdown timer)

**Behavior:**
- Timer starts immediately on dashboard load
- Shows time remaining in sticky banner
- Turns red when < 2 minutes remain
- On expiry (0:00), shows paywall overlay
- Clears token from localStorage

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────┐
│ USER CONTRIBUTES SETTLEMENT CASE                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ Generate Random Token  │
        │ (64-char hex string)   │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────────┐
        │ Store in localStorage:         │
        │ - casevault_access_token       │
        │ - casevault_access_expires     │
        │   (timestamp + 10 minutes)     │
        └────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ User has 10 min access │
        │ to calculator/dashboard│
        └────────────────────────┘
                    │
            Time passes...
                    │
                    ▼
        ┌────────────────────────┐
        │ Token Expires          │
        │ (Date.now() > expires) │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ Show Paywall           │
        │ Remove token from      │
        │ localStorage           │
        └────────────────────────┘
```

---

## Conversion Funnel

| Step | Page | Metric | Expected Rate |
|------|------|--------|---------------|
| 1 | Land on site | Visitors | 100% |
| 2 | View intake form | Intake views | 60% |
| 3 | Submit intake form | Intake conversions | 40% |
| 4 | View contribute form | Contribute views | 90% |
| 5 | Submit contribution | Contributions | 50% |
| 6 | Use calculator/dashboard | Active sessions | 100% |
| 7 | Re-contribute after expiry | Repeat contributions | 20% |
| 8 | Subscribe (paid) | Subscriptions | 5% |

---

## User States

### State A: Anonymous (No Data)
- **Can Access:** Nothing
- **Redirect To:** `/casevault-intake.html`
- **localStorage:** Empty

### State B: Intake Complete (No Contribution)
- **Can Access:** Intake form (already completed)
- **Redirect To:** `/casevault-contribute.html`
- **localStorage:**
  - ✅ `casevault_user_name`
  - ✅ `casevault_user_email`
  - ✅ `casevault_user_firm`

### State C: Active Access (Valid Token)
- **Can Access:** Calculator, Dashboard
- **Redirect To:** N/A (full access)
- **localStorage:**
  - ✅ All from State B
  - ✅ `casevault_access_token`
  - ✅ `casevault_access_expires` (future timestamp)
  - ✅ `casevault_contribution`
  - ✅ `casevault_contributed: "true"`

### State D: Expired Access
- **Can Access:** Nothing (token expired)
- **Redirect To:** `/casevault-contribute.html`
- **localStorage:**
  - ✅ All user data from State B
  - ❌ Token expired (Date.now() > expires)

---

## Security Notes

**Current Implementation (MVP):**
- ✅ Client-side token validation (localStorage)
- ✅ 10-minute expiry enforced via countdown
- ✅ Tokens auto-removed on expiry
- ❌ No server-side validation (tokens not verified by backend)
- ❌ No rate limiting on contributions
- ❌ No duplicate email checks

**Production Improvements Needed:**
1. Store tokens server-side (DynamoDB/Redis)
2. Validate tokens via API endpoint
3. Rate limit contributions (1 per email per day)
4. Email verification before access
5. IP-based rate limiting
6. Token refresh mechanism for subscribers

---

## Analytics Events to Track

```javascript
// Intake form submission
trackEvent('casevault_intake_submit', {
  email: email,
  firm: lawFirm,
  timestamp: Date.now()
})

// Contribution submission
trackEvent('casevault_contribution_submit', {
  email: email,
  state: state,
  injuryType: injuryType,
  amount: settlementAmount,
  timestamp: Date.now()
})

// Token expiry
trackEvent('casevault_token_expired', {
  email: email,
  sessionDuration: '10:00',
  timestamp: Date.now()
})

// Calculator usage
trackEvent('casevault_calculator_use', {
  email: email,
  state: state,
  medicalCosts: medicalCosts,
  timestamp: Date.now()
})
```

---

**✨ Updated:** 2026-02-07
**🦉 Supernova**
