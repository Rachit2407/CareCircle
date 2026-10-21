# CareCircle AI — Backend Architecture & Domain Services

> **Voice-first elderly-care coordination platform backend**  
> Source of truth for users, care tasks, medication schedules, appointments, check-ins, health readings, records, notifications, and auditable history.

---

## 1. Architectural Highlights

- **Platform & Stack**: Node.js + TypeScript + Express + MongoDB Atlas (Mongoose) + Zod + JWT.
- **Strict Scoping**: Patient access is derived strictly from authenticated user identity and explicit relationship consent records (`CareRelationship`), never assumed from LLM/model prompts.
- **Contract Parity**: Both web dashboard REST consumers and the AI Voice Engine (via MCP Server Adapter) invoke identical domain service contracts.
- **Idempotent Writes**: All mutating actions (`POST`, `PATCH`) support the `Idempotency-Key` header with cached replaying and 409 conflict detection for payload discrepancies.
- **Privacy & PHI Protection**:
  - Raw health storage keys are strictly kept private; access is issued via short-lived HMAC signed URLs.
  - Automatic redaction of credentials, tokens, and health observations in application logs.
  - Full audit trail recording actor, patient scope, action, result (`SUCCESS`/`DENIED`/`FAILED`), and correlation IDs.
- **Decoupled Reminders**: Scheduled reminders and delivery notifications are tracked separately from user-confirmed medication dose status.
- **Background Worker**: `ReminderWorker` runs periodically to process pending/retried reminders with exponential backoff and delivery tracking across voice (Sarvam), SMS, and push.

---

## 2. Repository Structure

```
backend/
├── src/
│   ├── app.ts                         # Express application assembly & security middleware
│   ├── server.ts                      # Server startup, database connect & graceful shutdown
│   ├── config/
│   │   ├── env.ts                     # Zod environment variable parsing & validation
│   │   └── database.ts                # Mongoose connection manager & lifecycle
│   ├── middleware/
│   │   ├── auth.ts                    # JWT Bearer authentication & role guards
│   │   ├── authorizePatient.ts        # Scoping & CareRelationship consent verification
│   │   ├── errorHandler.ts            # Centralized standardized error envelope
│   │   ├── idempotency.ts             # Idempotency-Key caching & replay middleware
│   │   ├── rateLimiter.ts             # General & strict alert rate limiters
│   │   ├── requestId.ts               # Correlation ID extraction & propagation
│   │   └── validate.ts                # Zod request validation (body, query, params)
│   ├── modules/
│   │   ├── alerts/                    # Caregiver alerts & notification dispatch
│   │   ├── appointments/              # Appointments creation, reschedule, status
│   │   ├── audit/                     # Audit trail persistence & scoped query
│   │   ├── auth/                      # Registration, login, token refresh
│   │   ├── checkins/                  # Pre-appointment check-ins & raw notes
│   │   ├── health-readings/           # Vitals (BP, glucose, heart rate, etc.)
│   │   ├── idempotency/               # Idempotency storage model
│   │   ├── medications/               # Medication schedules & dose confirmation logs
│   │   ├── notifications/             # Notification state tracking (queued/sent/failed)
│   │   ├── records/                   # Health documents & signed upload/download links
│   │   ├── relationships/             # Caregiver-patient consent & permissions
│   │   ├── tasks/                     # Care tasks, assignments, status lifecycle
│   │   └── users/                     # User accounts & roles (patient, caregiver, admin)
│   ├── services/
│   │   ├── audit.service.ts           # Centralized audit logging
│   │   ├── notification.service.ts    # Notification queueing & multi-channel dispatch
│   │   └── storage.service.ts         # Secure signed upload/download URL generator
│   ├── jobs/
│   │   └── reminderWorker.ts          # Scheduled reminder loop with backoff retry
│   ├── mcp/
│   │   └── mcpAdapter.ts              # MCP Server Adapter for AI / Sarvam voice engine
│   └── utils/
│       ├── apiResponse.ts             # Response envelope formatting
│       ├── errors.ts                  # Standardized operational error classes
│       └── logger.ts                  # Sensitive field redaction logger
├── tests/
│   ├── setup.ts                       # Vitest MongoDB test lifecycle setup
│   └── integration/
│       ├── health.test.ts             # Health check & error format tests
│       ├── auth.test.ts               # Registration, login, JWT token tests
│       ├── tasks.test.ts              # Care tasks vertical slice & ownership checks
│       ├── scoping.test.ts            # Security, model untrusted inputs, consent revocation
│       ├── medications.test.ts        # Clinician instruction preservation & dose confirmation
│       ├── appointments_and_checkins.test.ts # Appointments & linked check-in validation
│       ├── records_and_readings.test.ts # Vitals & signed storage URL tests
│       └── alerts_and_idempotency.test.ts # Caregiver alerts, idempotency & MCP adapter
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Standard Response & Error Envelopes

### Success Envelope
```json
{
  "data": { ... },
  "requestId": "9cdbf6a3-5e43-4d47-9250-67e1800d2dda",
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the submitted fields",
    "requestId": "9cdbf6a3-5e43-4d47-9250-67e1800d2dda",
    "details": [
      {
        "field": "contentType",
        "message": "Invalid contentType. Allowed: application/pdf, image/jpeg, ...",
        "rule": "custom"
      }
    ]
  }
}
```

### Status Codes
| Code | Meaning | Example Scenario |
|---|---|---|
| `200` / `201` | Success | Resource retrieved or created |
| `400` | Bad Request | Validation failure on submitted payload |
| `401` | Unauthenticated | Missing or expired JWT access token |
| `403` | Forbidden Scope | Caregiver lacks active consent or patient trying to access another's records |
| `404` | Not Found | Resource or route not found |
| `409` | Conflict | Email already registered or `IDEMPOTENCY_CONFLICT` |
| `422` | Business Rule Violation | Check-in linked to an appointment belonging to another patient |
| `429` | Rate Limited | Alert flood prevention triggered |
| `500` | Internal Error | Unhandled server error |

---

## 4. REST API Contract

### Authentication & Consent
- `POST /api/v1/auth/register`: Register user (`patient` or `caregiver`).
- `POST /api/v1/auth/login`: Login with email and password, returns access and refresh tokens.
- `POST /api/v1/auth/refresh`: Exchange refresh token for new access token.
- `GET /api/v1/auth/me`: Authenticated user profile.
- `POST /api/v1/relationships`: Create caregiver-patient relationship with consent status and explicit permissions (`manage_tasks`, `manage_medications`, `view_records`, etc.).
- `GET /api/v1/relationships`: List authorized care relationships for current user.
- `PATCH /api/v1/relationships/:id`: Update consent status (`active`, `revoked`) or permissions.

### Care Tasks (Milestone 2 Slice)
- `POST /api/v1/tasks`: Create care task (Idempotency supported, patient/caregiver permission verified).
- `GET /api/v1/tasks`: List tasks scoped to permitted patient(s).
- `PATCH /api/v1/tasks/:id`: Update task status (`pending` -> `completed` sets `completedAt` and `completedBy`).

### Medications & Doses
- `POST /api/v1/medications/schedule`: Create schedule; preserves clinician instructions verbatim.
- `GET /api/v1/medications/schedule`: List active medication schedules for authorized patient.
- `PATCH /api/v1/medications/schedule/:id`: Update or pause schedule (`active: false`).
- `POST /api/v1/medications/doses/confirm`: Record user-confirmed dose status (`taken`, `skipped`, `missed`) independently of reminder notifications.

### Appointments & Pre-Appointment Check-ins
- `POST /api/v1/appointments`: Create scheduled appointment with provider, time, and location.
- `GET /api/v1/appointments`: List appointments for authorized patient.
- `PATCH /api/v1/appointments/:id`: Reschedule or cancel appointment.
- `POST /api/v1/check-ins`: Record patient check-in (pain score 0–10, symptoms, raw notes preserved separately from AI summary; verifies linked appointment belongs to patient).
- `GET /api/v1/check-ins`: List check-in history.

### Health Readings & Private Records
- `POST /api/v1/health-readings`: Log vitals (blood pressure, glucose, heart rate, weight, etc.).
- `GET /api/v1/health-readings`: Query vitals with date ranges and type filters.
- `POST /api/v1/records/upload-url`: Request short-lived HMAC signed upload URL (checks file type and size limit).
- `POST /api/v1/records/confirm`: Confirm uploaded record metadata.
- `GET /api/v1/records`: List record metadata without exposing raw storage keys.
- `GET /api/v1/records/:id/download-url`: Generate short-lived (15 min) signed download URL.

### Alerts & Audit Trail
- `POST /api/v1/alerts`: Caregiver alert (rate-limited, audited, enqueues notifications for active caregivers).
- `GET /api/v1/audit`: Query audit logs for authorized patient scope.

---

## 5. AI Voice Engine & MCP Server Adapter

The backend provides direct tool adapters in `src/mcp/mcpAdapter.ts` so the AI engine (e.g., Sarvam Voice) communicates with the backend without circular dependencies:
- `carecircle_create_care_task`
- `carecircle_list_tasks`
- `carecircle_log_health_reading`
- `carecircle_log_check_in`

All tool calls strictly require authenticated user context, derive patient scoping independently from database records, and persist audit logs.

---

## 6. Running Locally & Testing

### Environment Setup
```bash
cp .env.example .env
npm install
```

### Run Tests
```bash
# Run complete test suite with Vitest
npm test

# Run with coverage
npm run test:coverage
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```
