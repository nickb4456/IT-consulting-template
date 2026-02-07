# DraftBridge Implementation Plan

> Last updated: 2026-02-02
> Prioritized roadmap with task breakdowns

---

## Current Sprint: Phase 2 Completion

### 🎯 Sprint Goal
Complete core Phase 2 features to enable user lock-in through local caching, personalization, and numbering management.

---

## ✅ Recently Completed

### Numbering Panel (Feb 2, 2026)
- [x] New "Numbering" tab in main navigation
- [x] Scheme browser with tree view (Document/Default/Personal)
- [x] Preview pane showing selected scheme
- [x] Full scheme editor (5 levels)
- [x] 4 default schemes
- [x] Apply to selection functionality
- [x] Save scheme functionality

### Local Cache (Jan 31, 2026)
- [x] IndexedDB storage layer
- [x] Offline clause access
- [x] Sync with cloud on reconnect
- [x] Most Used / Recently Used sections

---

## 🚧 Next Up: Authentication

### Priority: HIGH
**Why:** Required for multi-user firms, billing, and clause ownership

### Tasks

#### 1. Cognito Setup (Backend)
- [ ] Create Cognito User Pool
- [ ] Configure email verification
- [ ] Set up password requirements
- [ ] Create app client (no secret for public app)
- [ ] Enable hosted UI

**Estimate:** 2 hours

#### 2. API Gateway Authorizer
- [ ] Create JWT authorizer
- [ ] Attach to protected routes
- [ ] Extract `firmId` from token claims
- [ ] Test with Postman

**Estimate:** 2 hours

#### 3. Frontend Auth Flow
- [ ] Add login/signup UI
- [ ] Integrate Cognito Hosted UI redirect
- [ ] Store tokens securely
- [ ] Add token to API requests
- [ ] Handle token refresh
- [ ] Logout functionality

**Estimate:** 4 hours

#### 4. User Management
- [ ] Create user on Cognito signup
- [ ] Sync to DynamoDB AUTHOR# entity
- [ ] Invite user flow (admin sends invite)
- [ ] Role assignment (admin/contributor/viewer)

**Estimate:** 3 hours

**Total Auth Estimate:** ~11 hours

---

## 📋 Backlog (Prioritized)

### P1: Critical for Launch

| Feature | Effort | Notes |
|---------|--------|-------|
| Auth (Cognito) | 11h | See above |
| Save clause from selection | 3h | Core feature |
| Deploy to production URL | 2h | Currently localhost |
| Firm onboarding flow | 4h | Self-service signup |

### P2: Important for Adoption

| Feature | Effort | Notes |
|---------|--------|-------|
| Conditional clauses (if/then) | 8h | Complex |
| Cross-reference updates | 6h | When sections added/removed |
| Clause versioning UI | 4h | Backend done, need UI |
| TOC generation tool | 4h | Edit tab feature |
| Client profiles | 5h | Filter clauses by client |

### P3: Nice to Have

| Feature | Effort | Notes |
|---------|--------|-------|
| Pleading format tool | 4h | Court document specific |
| AI clause suggestions | 8h | Requires ML/LLM |
| Dark mode | 2h | Follow system setting |
| Keyboard shortcuts | 2h | Power users |
| Bulk clause import | 3h | CSV/JSON upload |

### P4: Enterprise / Future

| Feature | Effort | Notes |
|---------|--------|-------|
| SAML SSO | 10h | Per-firm config |
| Custom encryption (KMS) | 6h | Compliance requirement |
| Audit logging | 4h | Who did what when |
| On-prem deployment | 20h | Only if customer demands |
| API for integrations | 8h | Third-party connections |

---

## Implementation Order Rationale

1. **Auth first** — Unlocks multi-user, billing, ownership
2. **Save clause** — Core feedback loop (insert → like it → save)
3. **Production deploy** — Real users can access
4. **Conditionals** — Differentiating feature vs. competitors
5. **TOC/Pleading** — Complete the Edit tab
6. **Client profiles** — Enterprise upsell feature

---

## Technical Debt to Address

| Item | Priority | Effort |
|------|----------|--------|
| Error boundary in JS | Medium | 1h |
| Logging/monitoring | High | 2h |
| Unit tests for Lambda | Medium | 4h |
| Manifest production URLs | High | 1h |
| Icon assets for all sizes | High | 1h |
| Accessibility audit | Medium | 2h |

---

## Dependencies & Blockers

| Dependency | Status | Impact |
|------------|--------|--------|
| Production domain | Needed | Can't deploy until decided |
| AWS account limits | OK | No issues |
| Microsoft Partner Center | Needed | For AppSource submission |
| SSL certificate | Needed | For custom domain |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cognito complexity | Medium | High | Start simple, email/password only |
| Office.js limitations | Medium | Medium | Test numbering API thoroughly |
| Firm adoption inertia | High | High | Focus on one champion firm |
| Litera competitive response | Low | Medium | Move fast, niche focus |

---

## Milestones

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| Private Beta | Feb 15, 2026 | Auth + 3 pilot firms using |
| Public Beta | Mar 1, 2026 | Landing page + self-signup |
| V1 Launch | Apr 1, 2026 | Paid customers, AppSource listing |
| 10 Firms | Jun 1, 2026 | Product-market fit signal |

---

## Daily Standup Template

```
Yesterday: [what was completed]
Today: [what's planned]
Blockers: [anything stopping progress]
```

---

*This document guides implementation priorities.*
