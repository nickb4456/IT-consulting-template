# DraftBridge Backend Structure

> Last updated: 2026-02-02
> Database schema, API routes, and data model

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│              HTTP API v2 (REST-like)                    │
│                                                         │
│  https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Lambda Function                      │
│                  draftbridge-api                        │
│                                                         │
│  • Node.js 20.x runtime                                │
│  • ESM modules (index.mjs)                             │
│  • Routes requests to handlers                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    DynamoDB                             │
│               draftbridge-data                          │
│                                                         │
│  • Single-table design                                 │
│  • On-demand billing                                   │
│  • Encrypted at rest                                   │
└─────────────────────────────────────────────────────────┘
```

---

## DynamoDB Schema

### Single-Table Design

The table uses a single-table design with composite keys:
- **PK (Partition Key):** String — Groups related items
- **SK (Sort Key):** String — Identifies item within group

### Table Name
`draftbridge-data`

### Key Schema

| PK Pattern | SK Pattern | Entity |
|------------|------------|--------|
| `FIRM#{firmId}` | `META` | Firm metadata |
| `FIRM#{firmId}` | `CLAUSE#{clauseId}` | Clause |
| `FIRM#{firmId}` | `AUTHOR#{authorId}` | Author/User |
| `FIRM#{firmId}` | `CLIENT#{clientId}` | Client |
| `FIRM#{firmId}` | `SCHEME#{schemeId}` | Numbering scheme |
| `WAITLIST` | `{email}` | Waitlist entry |

---

## Entity Schemas

### Firm Entity

```json
{
  "PK": "FIRM#morrison",
  "SK": "META",
  "firmId": "morrison",
  "name": "Morrison & Foerster",
  "domain": "mofo.com",
  "createdAt": "2026-01-28T00:00:00Z",
  "settings": {
    "defaultCategory": "contracts",
    "allowPublicClauses": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| PK | String | ✓ | `FIRM#{firmId}` |
| SK | String | ✓ | `META` |
| firmId | String | ✓ | Unique firm identifier |
| name | String | ✓ | Display name |
| domain | String | | Email domain for SSO |
| createdAt | String | ✓ | ISO timestamp |
| settings | Object | | Firm preferences |

---

### Clause Entity

```json
{
  "PK": "FIRM#morrison",
  "SK": "CLAUSE#clause_001",
  "clauseId": "clause_001",
  "title": "Standard Indemnification",
  "content": "The Seller shall indemnify, defend, and hold harmless...",
  "category": "contracts",
  "tags": ["indemnification", "seller", "liability"],
  "createdBy": "author_001",
  "createdAt": "2026-01-28T00:00:00Z",
  "updatedAt": "2026-01-30T00:00:00Z",
  "usageCount": 47,
  "lastUsedAt": "2026-02-01T14:30:00Z",
  "isApproved": true,
  "version": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| PK | String | ✓ | `FIRM#{firmId}` |
| SK | String | ✓ | `CLAUSE#{clauseId}` |
| clauseId | String | ✓ | Unique clause identifier |
| title | String | ✓ | Display title |
| content | String | ✓ | Full clause text |
| category | String | ✓ | contracts/litigation/corporate/ip |
| tags | Array[String] | | Searchable tags |
| createdBy | String | | Author ID |
| createdAt | String | ✓ | ISO timestamp |
| updatedAt | String | | ISO timestamp |
| usageCount | Number | | Insert count |
| lastUsedAt | String | | Last insert timestamp |
| isApproved | Boolean | | Partner approved |
| version | Number | | Version number |

---

### Author Entity

```json
{
  "PK": "FIRM#morrison",
  "SK": "AUTHOR#author_001",
  "id": "author_001",
  "name": "John Smith",
  "initials": "JS",
  "email": "jsmith@mofo.com",
  "role": "partner",
  "phone": "(555) 123-4567",
  "barNumber": "12345",
  "createdAt": "2026-01-28T00:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| PK | String | ✓ | `FIRM#{firmId}` |
| SK | String | ✓ | `AUTHOR#{authorId}` |
| id | String | ✓ | Unique author identifier |
| name | String | ✓ | Full name |
| initials | String | | Two-letter initials |
| email | String | | Email address |
| role | String | | partner/associate/paralegal |
| phone | String | | Phone number |
| barNumber | String | | State bar number |
| createdAt | String | ✓ | ISO timestamp |

---

### Client Entity (Planned)

```json
{
  "PK": "FIRM#morrison",
  "SK": "CLIENT#client_001",
  "clientId": "client_001",
  "name": "Acme Corporation",
  "shortName": "Acme",
  "address": "123 Main St, San Francisco, CA 94105",
  "defaultVariables": {
    "clientName": "Acme Corporation",
    "clientState": "Delaware"
  },
  "approvedClauses": ["clause_001", "clause_005", "clause_012"],
  "createdAt": "2026-01-28T00:00:00Z"
}
```

---

### Numbering Scheme Entity (Planned)

```json
{
  "PK": "FIRM#morrison",
  "SK": "SCHEME#scheme_001",
  "schemeId": "scheme_001",
  "name": "Legal Outline",
  "levels": [
    { "before": "", "style": "I", "after": ".", "follow": "tab" },
    { "before": "", "style": "A", "after": ".", "follow": "tab" },
    { "before": "", "style": "1", "after": ".", "follow": "tab" },
    { "before": "(", "style": "a", "after": ")", "follow": "tab" },
    { "before": "(", "style": "i", "after": ")", "follow": "tab" }
  ],
  "options": {
    "restart": true,
    "legal": false,
    "rightAlign": false,
    "startAt": 1
  },
  "isDefault": true,
  "createdBy": "author_001",
  "createdAt": "2026-01-28T00:00:00Z"
}
```

---

### Waitlist Entry

```json
{
  "PK": "WAITLIST",
  "SK": "john@example.com",
  "email": "john@example.com",
  "firmName": "Example LLP",
  "role": "Associate",
  "source": "landing-page",
  "createdAt": "2026-01-30T00:00:00Z"
}
```

---

## API Routes

### Base URL
```
https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod
```

### Endpoints

#### Firms

| Method | Path | Description |
|--------|------|-------------|
| GET | `/firms/{firmId}` | Get firm metadata |

#### Clauses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/firms/{firmId}/clauses` | List all clauses |
| GET | `/firms/{firmId}/clauses/{id}` | Get single clause |
| POST | `/firms/{firmId}/clauses` | Create clause |
| PUT | `/firms/{firmId}/clauses/{id}` | Update clause |
| DELETE | `/firms/{firmId}/clauses/{id}` | Delete clause |
| POST | `/firms/{firmId}/clauses/{id}/use` | Increment usage count |

#### Authors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/firms/{firmId}/authors` | List all authors |
| GET | `/firms/{firmId}/authors/{id}` | Get single author |
| POST | `/firms/{firmId}/authors` | Create author |
| PUT | `/firms/{firmId}/authors/{id}` | Update author |
| DELETE | `/firms/{firmId}/authors/{id}` | Delete author |

#### Waitlist

| Method | Path | Description |
|--------|------|-------------|
| POST | `/waitlist` | Add email to waitlist |

---

## Query Patterns

### Get all clauses for a firm
```javascript
const result = await ddb.send(new QueryCommand({
    TableName: "draftbridge-data",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
        ":pk": "FIRM#morrison",
        ":sk": "CLAUSE#"
    }
}));
```

### Get firm metadata + all related entities
```javascript
// Get everything for a firm in one query
const result = await ddb.send(new QueryCommand({
    TableName: "draftbridge-data",
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
        ":pk": "FIRM#morrison"
    }
}));
// Returns: META, all CLAUSE#, all AUTHOR#, all CLIENT#, etc.
```

### Get single item
```javascript
const result = await ddb.send(new GetCommand({
    TableName: "draftbridge-data",
    Key: {
        PK: "FIRM#morrison",
        SK: "CLAUSE#clause_001"
    }
}));
```

---

## Future Indexes (GSI)

### GSI1: By Category (Planned)
For filtering clauses by category across firms (admin use)

| GSI1PK | GSI1SK |
|--------|--------|
| `CATEGORY#{category}` | `FIRM#{firmId}#CLAUSE#{clauseId}` |

### GSI2: By Usage (Planned)
For "most popular" queries

| GSI2PK | GSI2SK |
|--------|--------|
| `FIRM#{firmId}` | `USAGE#{usageCount}` (zero-padded) |

---

## CORS Configuration

API Gateway configured with:

```json
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "AllowHeaders": ["Content-Type", "X-Api-Key"]
}
```

Lambda also returns CORS headers for flexibility:

```javascript
const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key"
};
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 404 | Not found |
| 500 | Server error |

Error response format:
```json
{
  "error": "Human-readable error message"
}
```

---

*This document defines all backend data structures and APIs.*
