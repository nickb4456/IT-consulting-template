# DraftBridge Tech Stack

> Last updated: 2026-02-02
> Every dependency with exact versions

---

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Word Add-in)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ taskpane.html (single-file app)                 │   │
│  │ • Office.js (Microsoft hosted)                  │   │
│  │ • Vanilla JS (no framework)                     │   │
│  │ • Inline CSS                                    │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (AWS)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ API Gateway (HTTP API v2)                       │   │
│  │   └── Lambda (Node.js 20.x)                     │   │
│  │         └── DynamoDB (single table)             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Dependencies

### Office.js (Microsoft Office Add-ins Library)
- **CDN:** `https://appsforoffice.microsoft.com/lib/1/hosted/office.js`
- **Version:** Latest (auto-updated by Microsoft)
- **Purpose:** Word document manipulation, add-in lifecycle
- **Documentation:** https://docs.microsoft.com/en-us/office/dev/add-ins/

### Browser APIs Used
| API | Purpose |
|-----|---------|
| `fetch()` | API requests to backend |
| `localStorage` | (planned) User preferences |
| `IndexedDB` | (planned) Offline clause cache |

### NO External JS Libraries
- No React, Vue, Angular, jQuery
- Pure vanilla JavaScript
- Single HTML file with inline CSS and JS
- **Rationale:** Simplicity, fast load, no build step

---

## Backend Dependencies

### AWS Lambda Runtime
- **Runtime:** Node.js 20.x
- **Handler:** `index.handler`
- **Memory:** 128 MB (default)
- **Timeout:** 30 seconds

### Lambda Dependencies (package.json)

```json
{
  "name": "draftbridge-lambda",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.490.0",
    "@aws-sdk/lib-dynamodb": "^3.490.0"
  }
}
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-dynamodb` | ^3.490.0 | DynamoDB low-level client |
| `@aws-sdk/lib-dynamodb` | ^3.490.0 | DynamoDB DocumentClient (simplified API) |

### NO Other Backend Dependencies
- No Express, no Fastify
- No ORM (DynamoDB SDK is sufficient)
- Lambda handles HTTP routing directly

---

## AWS Services

### API Gateway
- **Type:** HTTP API (v2)
- **Stage:** `prod`
- **Base URL:** `https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod`
- **CORS:** Enabled for all origins (`*`)

### DynamoDB
- **Table Name:** `draftbridge-data`
- **Region:** us-east-1
- **Billing Mode:** On-demand (pay-per-request)
- **Encryption:** AWS managed (default)

### Lambda
- **Function Name:** `draftbridge-api`
- **Region:** us-east-1
- **Runtime:** Node.js 20.x

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/firms/{firmId}` | Get firm metadata |
| GET | `/firms/{firmId}/clauses` | List all clauses |
| GET | `/firms/{firmId}/clauses/{id}` | Get single clause |
| POST | `/firms/{firmId}/clauses` | Create clause |
| PUT | `/firms/{firmId}/clauses/{id}` | Update clause |
| DELETE | `/firms/{firmId}/clauses/{id}` | Delete clause |
| GET | `/firms/{firmId}/authors` | List authors |
| POST | `/waitlist` | Add to waitlist |

---

## Manifest Configuration

### manifest.xml
- **Version:** 2.0.1.0
- **Type:** TaskPaneApp
- **Hosts:** Document (Word)
- **Requirements:** Sets 1.1
- **DefaultLocale:** en-US

### Required URLs (Production)
| Resource | URL |
|----------|-----|
| Taskpane | `https://[domain]/taskpane.html` |
| Icon 16x16 | `https://[domain]/assets/icon-16.png` |
| Icon 32x32 | `https://[domain]/assets/icon-32.png` |
| Icon 64x64 | `https://[domain]/assets/icon-64.png` |
| Icon 80x80 | `https://[domain]/assets/icon-80.png` |

---

## Development Tools

### Local Development
| Tool | Version | Purpose |
|------|---------|---------|
| http-server | latest | Serve files locally |
| office-addin-dev-certs | latest | Generate HTTPS certs for localhost |

### Deployment
| Tool | Purpose |
|------|---------|
| AWS Console | Lambda/API Gateway/DynamoDB management |
| aws CLI | (optional) Scripted deployments |

---

## Version History

| Date | Changes |
|------|---------|
| 2026-01-28 | Initial Lambda + DynamoDB setup |
| 2026-01-29 | API Gateway HTTP API configured |
| 2026-01-30 | Manifest validated, version 2.0.1.0 |
| 2026-02-02 | Numbering panel added (no new deps) |

---

## NO Hallucinated Dependencies

The following are **NOT** used (sometimes assumed):

| NOT Used | Why |
|----------|-----|
| React | Overkill for simple add-in |
| TypeScript | Single-file app, no compilation needed |
| Webpack/Vite | No build step required |
| Express.js | Lambda handles routing |
| MongoDB | Using DynamoDB |
| Firebase | Using AWS stack |
| Tailwind CSS | Inline styles, small codebase |
| jQuery | Native APIs sufficient |

---

*This document is the source of truth for all dependencies.*
