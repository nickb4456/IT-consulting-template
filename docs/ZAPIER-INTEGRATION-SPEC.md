# DraftBridge Zapier Integration Specification

> **Version:** 1.0  
> **Date:** February 4, 2026  
> **Status:** Draft  
> **Author:** AI Research Agent

---

## Executive Summary

This specification outlines the implementation plan for integrating DraftBridge with Zapier, enabling law firms to automate document workflows by connecting DraftBridge with 8,000+ apps. The integration will allow triggers when documents are generated or clauses are used, and actions to generate documents or insert clauses programmatically.

**Key Decisions:**
- **Authentication:** OAuth 2.0 (Authorization Code flow) — Zapier's recommended approach
- **Trigger Type:** Primarily instant (webhook-based) with polling fallbacks
- **Initial Scope:** 3 triggers, 4 actions, 2 searches
- **Timeline:** 6-8 weeks for MVP, 2 weeks for Zapier review/publish

---

## Table of Contents

1. [Research Summary](#1-research-summary)
2. [Triggers](#2-triggers)
3. [Actions](#3-actions)
4. [Searches](#4-searches)
5. [Data to Expose](#5-data-to-expose)
6. [API Endpoints Required](#6-api-endpoints-required)
7. [Authentication Approach](#7-authentication-approach)
8. [Implementation Plan](#8-implementation-plan)
9. [Timeline Estimate](#9-timeline-estimate)
10. [Appendix: Competitive Analysis](#appendix-competitive-analysis)

---

## 1. Research Summary

### How Zapier Integrations Work

Zapier integrations consist of three core components:

| Component | Description | Example |
|-----------|-------------|---------|
| **Triggers** | Events that start a Zap | "Document Generated", "Clause Inserted" |
| **Actions** | Events a Zap performs | "Generate Document", "Create Clause" |
| **Searches** | Find existing data | "Find Clause", "Find Template" |

**Trigger Types:**
- **Instant (Webhook):** App sends data to Zapier immediately when event occurs. Faster, more reliable, recommended.
- **Polling:** Zapier checks API every 1-15 minutes for new data. Simpler but slower.

### What Legal/Document Apps Do on Zapier

Based on research of PandaDoc, DocuSign, and Clio:

**PandaDoc Triggers:**
- Document Status Changed (sent, viewed, completed, paid)
- Document Sent
- Document Completed

**PandaDoc Actions:**
- Create Document (from template)
- Send Document
- Create Contact
- Get Document Files

**DocuSign Triggers:**
- Envelope Completed
- Envelope Sent
- Envelope Declined
- Envelope Corrected

**DocuSign Actions:**
- Create Signature Request
- Create Envelope from Template

**Clio Triggers:**
- New Matter
- New Contact
- Task Created

**Clio Actions:**
- Create Task
- Create Calendar Entry
- Create Contact
- Create Time Entry

### Zapier Publishing Requirements

1. **OAuth 2.0 recommended** (Authorization Code flow)
2. **API must use HTTPS**
3. **Test account required** (integration-testing@zapier.com)
4. **Production API endpoints** (no sandbox/dev)
5. **English-only** for all user-facing text
6. **No financial transactions** through Zapier
7. **Must own or have permission** for all APIs used

---

## 2. Triggers

### 2.1 Document Generated (Instant)

**Name:** New Document Generated  
**Key:** `document_generated`  
**Type:** Instant (webhook)  
**Description:** Triggers when a new document is generated from a template in DraftBridge.

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | String | Unique document identifier |
| `templateType` | String | letter, memo, fax, custom |
| `generatedAt` | DateTime | ISO timestamp |
| `generatedBy` | Object | User who generated (id, name, email) |
| `firmId` | String | Firm identifier |
| `metadata` | Object | Template-specific data (recipient, subject, etc.) |
| `content` | String | Generated document text (optional, for smaller docs) |

**Use Cases:**
- Send Slack notification when document generated
- Log document generation to Google Sheets
- Create follow-up task in Asana/Trello

---

### 2.2 Clause Inserted (Instant)

**Name:** Clause Inserted  
**Key:** `clause_inserted`  
**Type:** Instant (webhook)  
**Description:** Triggers when a clause is inserted into a Word document.

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clauseId` | String | Unique clause identifier |
| `clauseTitle` | String | Title of the clause |
| `category` | String | contracts, litigation, corporate, ip |
| `insertedAt` | DateTime | ISO timestamp |
| `insertedBy` | Object | User who inserted (id, name, email) |
| `firmId` | String | Firm identifier |
| `documentContext` | String | (Optional) Word document filename |
| `usageCount` | Number | Total times this clause has been used |

**Use Cases:**
- Track clause usage in Airtable/Google Sheets
- Notify knowledge management team of popular clauses
- Trigger review workflow when specific clauses used

---

### 2.3 New Clause Created (Polling)

**Name:** New Clause Created  
**Key:** `new_clause`  
**Type:** Polling  
**Description:** Triggers when a new clause is added to the firm's library.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | Dropdown | No | Filter by category |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clauseId` | String | Unique clause identifier |
| `title` | String | Clause title |
| `content` | String | Full clause text |
| `category` | String | contracts, litigation, corporate, ip |
| `tags` | Array | Associated tags |
| `createdAt` | DateTime | ISO timestamp |
| `createdBy` | Object | Author who created (id, name, email) |
| `isApproved` | Boolean | Partner approval status |

**Use Cases:**
- Auto-categorize new clauses in Notion
- Notify team on Slack of new approved clauses
- Sync clauses to external knowledge base

---

## 3. Actions

### 3.1 Generate Document from Template

**Name:** Generate Document  
**Key:** `generate_document`  
**Description:** Generates a new document (letter, memo, fax) using DraftBridge templates.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateType` | Dropdown | Yes | letter, memo, fax |
| `recipientName` | String | Conditional | Required for letter/fax |
| `recipientAddress` | String | Conditional | For letters |
| `recipientFax` | String | Conditional | For fax covers |
| `subject` | String | No | RE: line content |
| `toField` | String | Conditional | Required for memo |
| `fromField` | String | No | Author (defaults to connected user) |
| `ccField` | String | No | CC recipients |
| `body` | String | No | Document body content |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | String | Unique document identifier |
| `templateType` | String | Template used |
| `generatedAt` | DateTime | ISO timestamp |
| `downloadUrl` | String | URL to download generated document |
| `content` | String | Generated document text |

---

### 3.2 Create Clause

**Name:** Create Clause  
**Key:** `create_clause`  
**Description:** Adds a new clause to the firm's DraftBridge library.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | Yes | Clause title |
| `content` | String | Yes | Full clause text |
| `category` | Dropdown | Yes | contracts, litigation, corporate, ip |
| `tags` | String | No | Comma-separated tags |
| `isApproved` | Boolean | No | Mark as approved (default: false) |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clauseId` | String | Unique clause identifier |
| `title` | String | Clause title |
| `content` | String | Full clause text |
| `category` | String | Category |
| `createdAt` | DateTime | ISO timestamp |

**Use Cases:**
- Sync clauses from Notion/Airtable
- Auto-create clauses from email templates
- Import clauses from other systems

---

### 3.3 Update Clause

**Name:** Update Clause  
**Key:** `update_clause`  
**Description:** Updates an existing clause in the firm's library.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clauseId` | String | Yes | Clause to update |
| `title` | String | No | New title |
| `content` | String | No | New content |
| `category` | Dropdown | No | New category |
| `tags` | String | No | New tags (replaces existing) |
| `isApproved` | Boolean | No | Approval status |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clauseId` | String | Updated clause ID |
| `updatedAt` | DateTime | ISO timestamp |
| `version` | Number | New version number |

---

### 3.4 Create Author/Team Member

**Name:** Create Team Member  
**Key:** `create_author`  
**Description:** Adds a new author/team member to the firm.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Full name |
| `email` | String | Yes | Email address |
| `initials` | String | No | Two-letter initials |
| `role` | Dropdown | No | partner, associate, paralegal, admin |
| `phone` | String | No | Phone number |
| `barNumber` | String | No | State bar number |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `authorId` | String | Unique author identifier |
| `name` | String | Full name |
| `email` | String | Email address |
| `createdAt` | DateTime | ISO timestamp |

---

## 4. Searches

### 4.1 Find Clause

**Name:** Find Clause  
**Key:** `find_clause`  
**Description:** Searches for a clause by title, content, or ID.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `searchQuery` | String | Yes | Title, keyword, or ID |
| `category` | Dropdown | No | Filter by category |
| `approvedOnly` | Boolean | No | Only return approved clauses |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `clauseId` | String | Unique clause identifier |
| `title` | String | Clause title |
| `content` | String | Full clause text |
| `category` | String | Category |
| `tags` | Array | Associated tags |
| `usageCount` | Number | Times used |
| `isApproved` | Boolean | Approval status |

**Search or Create Option:** Yes — can create clause if not found.

---

### 4.2 Find Author/Team Member

**Name:** Find Team Member  
**Key:** `find_author`  
**Description:** Searches for a team member by name or email.

**Input Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `searchQuery` | String | Yes | Name or email |
| `role` | Dropdown | No | Filter by role |

**Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `authorId` | String | Unique author identifier |
| `name` | String | Full name |
| `email` | String | Email address |
| `role` | String | Role in firm |
| `initials` | String | Initials |

**Search or Create Option:** Yes — can create author if not found.

---

## 5. Data to Expose

### Required API Data for Zapier

| Entity | Data Points | Notes |
|--------|-------------|-------|
| **Clauses** | id, title, content, category, tags, createdAt, updatedAt, usageCount, isApproved, createdBy | Core data |
| **Authors** | id, name, email, initials, role, phone, barNumber | Team members |
| **Documents** | id, templateType, generatedAt, metadata, content/downloadUrl | Generated docs |
| **Firm** | id, name | For multi-firm support |
| **Usage Events** | clauseId, timestamp, userId, documentContext | For tracking triggers |

### Webhook Event Payloads

**document_generated webhook:**
```json
{
  "event": "document_generated",
  "timestamp": "2026-02-04T03:00:00Z",
  "data": {
    "documentId": "doc_abc123",
    "templateType": "letter",
    "firmId": "morrison",
    "generatedBy": {
      "id": "author_001",
      "name": "John Smith",
      "email": "jsmith@mofo.com"
    },
    "metadata": {
      "recipientName": "Jane Doe",
      "subject": "Settlement Agreement"
    }
  }
}
```

**clause_inserted webhook:**
```json
{
  "event": "clause_inserted",
  "timestamp": "2026-02-04T03:00:00Z",
  "data": {
    "clauseId": "clause_001",
    "clauseTitle": "Standard Indemnification",
    "category": "contracts",
    "firmId": "morrison",
    "insertedBy": {
      "id": "author_002",
      "name": "Sarah Chen",
      "email": "schen@mofo.com"
    },
    "usageCount": 48
  }
}
```

---

## 6. API Endpoints Required

### New Endpoints for Zapier

All endpoints under base URL: `https://api.draftbridge.com/v1` (or existing API Gateway)

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/authorize` | OAuth 2.0 authorization |
| POST | `/oauth/token` | Exchange code for token |
| POST | `/oauth/token/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user (test endpoint) |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/subscribe` | Register webhook subscription |
| DELETE | `/webhooks/{subscriptionId}` | Unsubscribe webhook |
| GET | `/webhooks/subscriptions` | List active subscriptions |

#### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/generate` | Generate document from template |
| GET | `/documents/{documentId}` | Get document details |
| GET | `/documents` | List generated documents (polling) |

#### Clauses (extend existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/firms/{firmId}/clauses` | ✅ Exists — add `since` param for polling |
| GET | `/firms/{firmId}/clauses/{id}` | ✅ Exists |
| POST | `/firms/{firmId}/clauses` | ✅ Exists |
| PUT | `/firms/{firmId}/clauses/{id}` | ✅ Exists |
| GET | `/firms/{firmId}/clauses/search` | **NEW** — Search with query params |

#### Authors (extend existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/firms/{firmId}/authors` | ✅ Exists |
| GET | `/firms/{firmId}/authors/{id}` | ✅ Exists |
| POST | `/firms/{firmId}/authors` | ✅ Exists |
| GET | `/firms/{firmId}/authors/search` | **NEW** — Search authors |

### Endpoint Specifications

#### POST /webhooks/subscribe

**Request:**
```json
{
  "event": "clause_inserted",
  "targetUrl": "https://hooks.zapier.com/hooks/catch/123/abc",
  "filters": {
    "category": "contracts"
  }
}
```

**Response:**
```json
{
  "subscriptionId": "sub_xyz789",
  "event": "clause_inserted",
  "targetUrl": "https://hooks.zapier.com/hooks/catch/123/abc",
  "createdAt": "2026-02-04T03:00:00Z"
}
```

#### GET /firms/{firmId}/clauses/search

**Query Parameters:**
- `q` (string) — Search query
- `category` (string) — Filter by category
- `approved` (boolean) — Filter approved only
- `limit` (number) — Max results (default 25)

**Response:**
```json
{
  "results": [
    {
      "clauseId": "clause_001",
      "title": "Standard Indemnification",
      "content": "The Seller shall...",
      "category": "contracts",
      "tags": ["indemnification", "seller"],
      "usageCount": 47,
      "isApproved": true
    }
  ],
  "total": 1
}
```

#### POST /documents/generate

**Request:**
```json
{
  "templateType": "letter",
  "recipientName": "Jane Doe",
  "recipientAddress": "123 Main St, City, ST 12345",
  "subject": "Settlement Agreement",
  "body": "Dear Ms. Doe,\n\nPlease find enclosed..."
}
```

**Response:**
```json
{
  "documentId": "doc_abc123",
  "templateType": "letter",
  "generatedAt": "2026-02-04T03:00:00Z",
  "content": "February 4, 2026\n\nJane Doe\n123 Main St...",
  "downloadUrl": "https://api.draftbridge.com/v1/documents/doc_abc123/download"
}
```

---

## 7. Authentication Approach

### Recommendation: OAuth 2.0 (Authorization Code)

**Why OAuth 2.0:**
1. **Zapier's recommendation** — "OAuth v2 authentication is the preferred scheme"
2. **Better UX** — Users don't need to find/copy API keys
3. **Security** — Tokens can be scoped and revoked
4. **Standard** — Familiar flow for enterprise users
5. **Refresh tokens** — Long-running Zaps won't break

### OAuth 2.0 Implementation

**Flow:**
1. User clicks "Connect DraftBridge" in Zapier
2. Redirect to DraftBridge authorization page
3. User logs in and grants permission
4. DraftBridge redirects back with authorization code
5. Zapier exchanges code for access/refresh tokens
6. Tokens used for all API calls

**Required Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/authorize` | GET | Shows login/consent screen |
| `/oauth/token` | POST | Exchanges code for tokens |

**Token Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "clauses:read clauses:write documents:write"
}
```

**Scopes:**

| Scope | Description |
|-------|-------------|
| `clauses:read` | Read clause library |
| `clauses:write` | Create/update clauses |
| `documents:write` | Generate documents |
| `authors:read` | Read team members |
| `authors:write` | Create/update team members |
| `webhooks:manage` | Subscribe to webhooks |

### Alternative: API Key (Simpler but Less Preferred)

If OAuth is too complex for MVP:
- Generate API keys in DraftBridge admin dashboard
- User copies key to Zapier
- Include key in `X-Api-Key` header

**Downside:** Less secure, harder for users to manage.

---

## 8. Implementation Plan

### Phase 1: API Preparation (Weeks 1-2)

**Week 1:**
- [ ] Add `since` parameter to GET /clauses for polling
- [ ] Create GET /clauses/search endpoint
- [ ] Create GET /authors/search endpoint
- [ ] Add usage tracking (store insert events)

**Week 2:**
- [ ] Implement OAuth 2.0 endpoints (authorize, token, refresh)
- [ ] Create /auth/me test endpoint
- [ ] Set up webhook subscription storage (DynamoDB)
- [ ] Create webhook subscription endpoints

### Phase 2: Webhook Infrastructure (Week 3)

- [ ] Create webhook delivery system (Lambda → SQS → delivery)
- [ ] Hook into existing clause insert tracking
- [ ] Hook into document generation events
- [ ] Add retry logic for failed webhook deliveries
- [ ] Implement webhook signature (HMAC) for security

### Phase 3: Document Generation API (Week 4)

- [ ] Create POST /documents/generate endpoint
- [ ] Support letter, memo, fax templates
- [ ] Store generated documents with unique IDs
- [ ] Create GET /documents/{id} endpoint
- [ ] (Optional) Create document download endpoint

### Phase 4: Zapier Integration Build (Weeks 5-6)

**Using Zapier Platform UI:**
- [ ] Create new integration in Zapier Developer Platform
- [ ] Configure OAuth 2.0 authentication
- [ ] Build triggers:
  - [ ] Document Generated (instant)
  - [ ] Clause Inserted (instant)
  - [ ] New Clause (polling)
- [ ] Build actions:
  - [ ] Generate Document
  - [ ] Create Clause
  - [ ] Update Clause
  - [ ] Create Team Member
- [ ] Build searches:
  - [ ] Find Clause
  - [ ] Find Team Member
- [ ] Add sample data for each trigger/action
- [ ] Write help text and descriptions

### Phase 5: Testing & Documentation (Week 7)

- [ ] Create test Zaps for each trigger/action
- [ ] Run all test Zaps with real data
- [ ] Verify webhook delivery reliability
- [ ] Create Zapier test account (integration-testing@zapier.com)
- [ ] Document integration in DraftBridge help center
- [ ] Create "Getting Started with Zapier" guide

### Phase 6: Zapier Review & Launch (Week 8+)

- [ ] Submit integration for Zapier review
- [ ] Address any review feedback
- [ ] Create Zap templates for common workflows:
  - "Notify Slack when clause is inserted"
  - "Log document generation to Google Sheets"
  - "Sync clauses to Notion"
- [ ] Announce integration to users
- [ ] Monitor for errors/issues

---

## 9. Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 1: API Prep** | 2 weeks | — |
| **Phase 2: Webhooks** | 1 week | Phase 1 |
| **Phase 3: Doc Gen API** | 1 week | — (parallel) |
| **Phase 4: Zapier Build** | 2 weeks | Phases 1-3 |
| **Phase 5: Testing** | 1 week | Phase 4 |
| **Phase 6: Review** | 1-2 weeks | Phase 5 |
| **Total** | **6-8 weeks** | |

### Resource Requirements

| Resource | Hours |
|----------|-------|
| Backend Developer | 80-100 hrs |
| Integration Setup | 20-30 hrs |
| Testing & QA | 15-20 hrs |
| Documentation | 10-15 hrs |

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth complexity | Medium | High | Start with API key, migrate later |
| Webhook reliability | Medium | Medium | Use SQS for delivery, implement retries |
| Zapier review delays | Low | Medium | Follow all guidelines carefully |
| User adoption | Medium | Medium | Create helpful Zap templates |

---

## Appendix: Competitive Analysis

### Document/Legal Apps on Zapier

| App | Triggers | Actions | Auth |
|-----|----------|---------|------|
| **PandaDoc** | 5 (status changes) | 4 (create doc, send) | OAuth 2.0 |
| **DocuSign** | 10+ (envelope events) | 2 (create request) | OAuth 2.0 |
| **Clio** | 5 (new matter, contact) | 6 (create task, entry) | OAuth 2.0 |
| **Formstack Docs** | 3 (doc created, signed) | 2 (generate doc) | API Key |
| **SignNow** | 4 (document events) | 3 (create, send) | OAuth 2.0 |

### DraftBridge Differentiation

- **Clause-focused:** Only app with deep clause library integration
- **Legal-specific:** Triggers/actions designed for law firm workflows
- **Usage tracking:** Unique insight into which clauses are popular

### Recommended Zap Templates

1. **Slack: New Clause Notification**
   - Trigger: New Clause Created
   - Action: Post to Slack channel
   
2. **Google Sheets: Clause Usage Log**
   - Trigger: Clause Inserted
   - Action: Add row to Google Sheets
   
3. **Notion: Sync Clauses**
   - Trigger: New Clause Created
   - Action: Create Notion page
   
4. **Asana: Document Review Task**
   - Trigger: Document Generated
   - Action: Create Asana task
   
5. **HubSpot: Track Document Sends**
   - Trigger: Document Generated (letter)
   - Action: Create HubSpot activity

---

## Next Steps

1. **Review this spec** with the product team
2. **Prioritize features** — decide MVP vs. later phases
3. **Allocate resources** — backend developer time
4. **Set up Zapier Developer account** at developer.zapier.com
5. **Begin Phase 1** — API preparation

---

*This specification provides an actionable roadmap for implementing DraftBridge's Zapier integration. Questions? Contact the DraftBridge engineering team.*
