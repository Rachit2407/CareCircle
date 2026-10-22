# CareCircle AI Backend — API Specification & Contract Reference

This document defines the complete HTTP REST API for CareCircle AI, serving the React web application (`frontend`), caregiver mobile clients, and internal MCP / AI services.

---

## 1. Global Conventions & Standards

### Base URLs & Dual Mounting
- Default API Port: `4000`
- API Prefix: `/api/v1`
- **Dual Mounted Auth**: Authentication endpoints are mounted at both `/auth/*` and `/api/v1/auth/*` for seamless frontend compatibility.
- **Dual Mounted MCP**: MCP tool endpoints are mounted at both `/mcp/*` and `/api/v1/mcp/*`.

### Response Envelopes
All successful responses return JSON. By default, mutations and queries return standard envelope or domain entities:
```json
{
  "data": { ... }
}
```
Auth endpoints (`/auth/login`, `/auth/register`, `/auth/session`) return top-level `user` and `circle` objects for frontend state hydration:
```json
{
  "user": {
    "id": "67b848...",
    "displayName": "Anita Rao",
    "email": "demo@carecircle.test",
    "role": "caregiver",
    "timezone": "Asia/Kolkata",
    "timeZone": "Asia/Kolkata"
  },
  "circle": {
    "id": "67b849...",
    "name": "Raghav Rao's Circle",
    "recipientName": "Raghav Rao",
    "role": "Primary caregiver"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

### Standard Error Envelope
All error responses adhere to the standard error structure:
```json
{
  "code": "VALIDATION_ERROR",
  "fieldErrors": {
    "email": "Valid email address required"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the submitted fields",
    "requestId": "e142dd08-5c79-40b1-b47b-38a0bf2ceb37",
    "details": [
      {
        "field": "email",
        "message": "Valid email address required",
        "rule": "invalid_string"
      }
    ]
  }
}
```

### Error Codes Summary
| Status | Code | Meaning |
|---|---|---|
| **400** | `VALIDATION_ERROR` | Schema validation failure; details and top-level `fieldErrors` provided |
| **401** | `UNAUTHENTICATED` | Missing, expired, invalid, or revoked token |
| **403** | `FORBIDDEN_SCOPE` | Insufficient caregiver consent or permission for the requested patient |
| **404** | `NOT_FOUND` | Resource or route not found |
| **409** | `CONFLICT` | Resource conflict (e.g., duplicate email address) |
| **409** | `IDEMPOTENCY_CONFLICT` | Idempotency-Key reused with different payload/endpoint or request is currently processing |
| **429** | `RATE_LIMITED` | Too many requests; check `Retry-After` header |
| **503** | `AI_DISABLED` | AI/MCP endpoints called when `AI_ENABLED=false` |

### Authentication & Cookies
1. **JWT in Authorization Header**: `Authorization: Bearer <accessToken>`
2. **HttpOnly Cookie**: `accessToken` (SameSite: `lax`, Path: `/`, Secure in production)
3. **Refresh Cookie**: `refreshToken` (SameSite: `lax`, Path: `/auth/refresh` & `/api/v1/auth/refresh`, HttpOnly)
4. **Token Revocation**: Logout increments user `tokenVersion`, immediately invalidating outstanding tokens.

### Idempotency
Mutating endpoints (`POST`, `PUT`, `PATCH`) accept the `Idempotency-Key` header:
- Scoped to `{ actorId, key }` to isolate across multiple users.
- In-flight requests lock with status `processing`.
- Replaying the same key with identical payload returns cached status and body with header `X-Idempotent-Replay: true`.
- Reusing the key with a different payload or endpoint yields `409 IDEMPOTENCY_CONFLICT`.

---

## 2. Authentication & Session Endpoints

Dual-mounted under `/auth` and `/api/v1/auth`.

### 2.1 Register
- **Method & Path**: `POST /auth/register`, `POST /api/v1/auth/register`
- **Auth**: None
- **Rate Limit**: Default 200/15min in dev, 10/15min in production (`AUTH_RATE_LIMIT_MAX`)
- **Request Body** (`registerSchema`):
```json
{
  "displayName": "Anita Rao",
  "email": "demo@carecircle.test",
  "password": "Password123!",
  "role": "caregiver",
  "timezone": "Asia/Kolkata",
  "phone": "+919876543210"
}
```
*Note: `role` must be `'patient'` or `'caregiver'` (defaults to `'patient'`). `'admin'` registration is rejected.*
- **Success (201 Created)**: Sets `accessToken` cookie.
```json
{
  "user": {
    "id": "67b84814e5907c13a01f5c01",
    "displayName": "Anita Rao",
    "email": "demo@carecircle.test",
    "role": "caregiver",
    "timezone": "Asia/Kolkata",
    "timeZone": "Asia/Kolkata"
  },
  "circle": null,
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Missing/invalid fields (`fieldErrors`)
  - `409 CONFLICT`: Email already registered (`fieldErrors.email`)

---

### 2.2 Login
- **Method & Path**: `POST /auth/login`, `POST /api/v1/auth/login`
- **Auth**: None
- **Rate Limit**: Default 200/15min in dev, 10/15min in production
- **Request Body** (`loginSchema`):
```json
{
  "email": "demo@carecircle.test",
  "password": "Demo-pass-123"
}
```
- **Success (200 OK)**: Sets `accessToken` & `refreshToken` cookies.
```json
{
  "user": {
    "id": "67b84814e5907c13a01f5c01",
    "displayName": "Anita Rao",
    "email": "demo@carecircle.test",
    "role": "caregiver",
    "timezone": "Asia/Kolkata",
    "timeZone": "Asia/Kolkata"
  },
  "circle": {
    "id": "67b84920e5907c13a01f5c10",
    "name": "Raghav Rao's Circle",
    "recipientName": "Raghav Rao",
    "role": "Primary caregiver"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Invalid email format
  - `401 UNAUTHENTICATED`: Invalid email or password

---

### 2.3 Session Refresh
- **Method & Path**: `POST /auth/refresh`, `POST /api/v1/auth/refresh`
- **Auth**: Accepts `{ refreshToken }` in JSON body OR via httpOnly `refreshToken` cookie
- **Request Body** (`refreshSchema.partial()`):
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
*(Body optional if cookie present)*
- **Success (200 OK)**: Sets fresh `accessToken` cookie.
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```
- **Error Codes**:
  - `401 UNAUTHENTICATED`: Refresh token expired or revoked

---

### 2.4 Get Active Session
- **Method & Path**: `GET /auth/session`, `GET /api/v1/auth/session`
- **Auth**: Bearer token or `accessToken` cookie
- **Success (200 OK)**:
```json
{
  "user": {
    "id": "67b84814e5907c13a01f5c01",
    "displayName": "Anita Rao",
    "email": "demo@carecircle.test",
    "role": "caregiver",
    "timezone": "Asia/Kolkata",
    "timeZone": "Asia/Kolkata"
  },
  "circle": {
    "id": "67b84920e5907c13a01f5c10",
    "name": "Raghav Rao's Circle",
    "recipientName": "Raghav Rao",
    "role": "Primary caregiver"
  }
}
```
- **Error Codes**:
  - `401 UNAUTHENTICATED`: Token missing, expired, or revoked

---

### 2.5 Logout
- **Method & Path**: `POST /auth/logout`, `POST /api/v1/auth/logout`
- **Auth**: Optional (clears session and increments `tokenVersion` if authenticated)
- **Success (200 OK)**: Clears `accessToken` and `refreshToken` cookies.
```json
{
  "message": "Successfully logged out"
}
```

---

### 2.6 Current User Profile
- **Method & Path**: `GET /auth/me`, `GET /api/v1/auth/me`
- **Auth**: Bearer token or cookie
- **Success (200 OK)**:
```json
{
  "user": {
    "id": "67b84814e5907c13a01f5c01",
    "displayName": "Anita Rao",
    "email": "demo@carecircle.test",
    "role": "caregiver",
    "timezone": "Asia/Kolkata"
  }
}
```

---

## 3. Care Relationships & Consent Lifecycle

Mounted under `/api/v1/relationships`. All endpoints require authentication.

### 3.1 Create Care Relationship
- **Method & Path**: `POST /api/v1/relationships`
- **Auth**: Bearer token or cookie
- **Request Body** (`createRelationshipSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "caregiverId": "67b84814e5907c13a01f5c01",
  "permissions": [
    "manage_tasks",
    "manage_medications",
    "manage_appointments",
    "manage_health_readings",
    "view_records",
    "upload_records",
    "receive_alerts"
  ],
  "relationshipType": "Primary caregiver",
  "consentStatus": "active",
  "notes": "Daughter and primary contact"
}
```
- **Success (201 Created)**:
```json
{
  "data": {
    "relationship": {
      "id": "67b84920e5907c13a01f5c10",
      "patientId": "67b84814e5907c13a01f5c02",
      "caregiverId": "67b84814e5907c13a01f5c01",
      "permissions": ["manage_tasks", "manage_medications", "manage_appointments"],
      "consentStatus": "active",
      "relationshipType": "Primary caregiver"
    }
  }
}
```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Missing patient or caregiver ID
  - `409 CONFLICT`: Relationship between these users already exists

---

### 3.2 List Relationships
- **Method & Path**: `GET /api/v1/relationships`
- **Auth**: Bearer token or cookie
- **Success (200 OK)**: Lists all relationships for current user (as patient or caregiver).
```json
{
  "data": {
    "relationships": [
      {
        "id": "67b84920e5907c13a01f5c10",
        "patientId": { "displayName": "Raghav Rao", "email": "raghav.rao@carecircle.test" },
        "caregiverId": { "displayName": "Anita Rao", "email": "demo@carecircle.test" },
        "permissions": ["manage_tasks", "manage_medications"],
        "consentStatus": "active"
      }
    ]
  }
}
```

---

### 3.3 Update Relationship / Consent
- **Method & Path**: `PATCH /api/v1/relationships/:id`
- **Auth**: Bearer token or cookie
- **Request Body** (`updateRelationshipSchema`):
```json
{
  "consentStatus": "revoked",
  "permissions": ["view_records"],
  "notes": "Temporary pause on access"
}
```
- **Success (200 OK)**:
```json
{
  "data": {
    "relationship": {
      "id": "67b84920e5907c13a01f5c10",
      "consentStatus": "revoked"
    }
  }
}
```
- **Error Codes**:
  - `403 FORBIDDEN_SCOPE`: User is not a party to this relationship
  - `404 NOT_FOUND`: Relationship not found

---

## 4. Care Tasks

Mounted under `/api/v1/tasks`. Requires `manage_tasks` permission.

### 4.1 Create Task
- **Method & Path**: `POST /api/v1/tasks`
- **Auth**: Bearer token or cookie
- **Headers**: Optional `Idempotency-Key: <unique-uuid>`
- **Request Body** (`createTaskSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "title": "Morning blood pressure check",
  "description": "Record sitting BP reading before breakfast",
  "dueAt": "2026-10-22T08:00:00.000Z",
  "recurrence": "daily",
  "priority": "high",
  "assigneeId": "67b84814e5907c13a01f5c01"
}
```
- **Success (201 Created)**:
```json
{
  "data": {
    "task": {
      "id": "67b84f33e5907c13a01f5c30",
      "patientId": "67b84814e5907c13a01f5c02",
      "title": "Morning blood pressure check",
      "priority": "high",
      "status": "pending",
      "dueAt": "2026-10-22T08:00:00.000Z"
    }
  }
}
```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Invalid datetime or title length
  - `403 FORBIDDEN_SCOPE`: Caregiver lacks active `manage_tasks` consent
  - `409 IDEMPOTENCY_CONFLICT`: Reused key with different payload

---

### 4.2 List Tasks
- **Method & Path**: `GET /api/v1/tasks`
- **Query Parameters** (`listTasksQuerySchema`):
  - `patientId`: Filter by patient (required if caregiver has multiple patients)
  - `status`: `pending` | `in_progress` | `completed` | `cancelled`
  - `priority`: `low` | `medium` | `high` | `urgent`
  - `dueBefore`, `dueAfter`: ISO datetime strings
  - `limit`: default `50` (max 100), `page`: default `1`
- **Success (200 OK)**:
```json
{
  "data": {
    "tasks": [...],
    "pagination": { "total": 12, "page": 1, "limit": 50 }
  }
}
```

---

### 4.3 Update Task Status / Details
- **Method & Path**: `PATCH /api/v1/tasks/:id`
- **Headers**: Optional `Idempotency-Key`
- **Request Body** (`updateTaskSchema`):
```json
{
  "status": "completed"
}
```
- **Success (200 OK)**:
```json
{
  "data": {
    "task": {
      "id": "67b84f33e5907c13a01f5c30",
      "status": "completed",
      "completedAt": "2026-10-21T17:30:00.000Z"
    }
  }
}
```

---

## 5. Medication Schedules & Dose Tracking

Mounted under `/api/v1/medications`. Requires `manage_medications` permission.

### 5.1 Create Medication Schedule
- **Method & Path**: `POST /api/v1/medications/schedule`
- **Headers**: Optional `Idempotency-Key`
- **Request Body** (`createMedicationScheduleSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "medicationName": "Amlodipine",
  "dosage": "5mg",
  "instructions": "Take 1 tablet every morning with water after breakfast",
  "recurrence": {
    "frequency": "daily",
    "times": ["08:00"]
  },
  "timezone": "Asia/Kolkata",
  "startAt": "2026-10-21T00:00:00.000Z",
  "reminderPreferences": {
    "enabled": true,
    "advanceMinutes": 15,
    "channels": ["voice_sarvam", "push"]
  },
  "prescribedBy": "Dr. S. Nair"
}
```
- **Success (201 Created)**:
```json
{
  "data": {
    "schedule": {
      "id": "67b85040e5907c13a01f5c50",
      "medicationName": "Amlodipine",
      "dosage": "5mg",
      "active": true
    }
  }
}
```

---

### 5.2 List Schedules
- **Method & Path**: `GET /api/v1/medications/schedule`
- **Query Parameters**: `patientId`, `activeOnly=true|false`
- **Success (200 OK)**:
```json
{
  "data": {
    "schedules": [...]
  }
}
```

---

### 5.3 Confirm Dose Event
- **Method & Path**: `POST /api/v1/medications/doses/confirm`
- **Headers**: Optional `Idempotency-Key`
- **Request Body** (`confirmDoseSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "medicationScheduleId": "67b85040e5907c13a01f5c50",
  "scheduledFor": "2026-10-21T08:00:00.000Z",
  "doseStatus": "taken",
  "takenAt": "2026-10-21T08:05:00.000Z",
  "notes": "Taken with glass of warm water"
}
```
- **Success (200 OK)**:
```json
{
  "data": {
    "doseLog": {
      "id": "67b8508ae5907c13a01f5c60",
      "doseStatus": "taken",
      "takenAt": "2026-10-21T08:05:00.000Z"
    }
  }
}
```

---

## 6. Appointments & Pre-Appointment Check-ins

Mounted under `/api/v1/appointments` and `/api/v1/check-ins`.

### 6.1 Create Appointment
- **Method & Path**: `POST /api/v1/appointments`
- **Request Body** (`createAppointmentSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "provider": "Dr. V. Sharma",
  "specialty": "Cardiology",
  "startsAt": "2026-10-25T10:00:00.000Z",
  "endsAt": "2026-10-25T10:45:00.000Z",
  "timezone": "Asia/Kolkata",
  "location": "Max Super Specialty Hospital, Room 304",
  "notes": "Bring previous 2 weeks BP log"
}
```
- **Success (201 Created)**: Returns created appointment with auto-scheduled pre-appointment check-in reminder task.

---

### 6.2 Submit Pre-Appointment / Daily Check-in
- **Method & Path**: `POST /api/v1/check-ins`
- **Request Body** (`createCheckInSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "appointmentId": "67b85100e5907c13a01f5c70",
  "feeling": "good",
  "painScore": 2,
  "symptoms": ["mild morning dizziness"],
  "notes": "Dizziness subsided after breakfast",
  "respondentType": "patient"
}
```
- **Success (201 Created)**: Returns saved check-in record.

---

## 7. Health Readings

Mounted under `/api/v1/health-readings`. Requires `manage_health_readings` permission.

### 7.1 Record Reading
- **Method & Path**: `POST /api/v1/health-readings`
- **Request Body** (`createHealthReadingSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "type": "blood_pressure_systolic",
  "value": 128,
  "unit": "mmHg",
  "measuredAt": "2026-10-21T07:30:00.000Z",
  "source": "manual",
  "notes": "Sitting position, right arm"
}
```
- **Success (201 Created)**:
```json
{
  "data": {
    "reading": {
      "id": "67b85200e5907c13a01f5c80",
      "type": "blood_pressure_systolic",
      "value": 128,
      "unit": "mmHg"
    }
  }
}
```

---

## 8. Private Health Records & Storage Service

Mounted under `/api/v1/records`. Private object storage with short-lived HMAC signed URLs.

### 8.1 Request Signed Upload URL
- **Method & Path**: `POST /api/v1/records/upload-url`
- **Auth**: Requires `upload_records` permission
- **Request Body** (`requestUploadUrlSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "fileName": "blood_test_report_oct.pdf",
  "contentType": "application/pdf",
  "fileSizeBytes": 1048576,
  "recordType": "lab_result",
  "notes": "Complete Blood Count & Lipid Profile"
}
```
- **Success (200 OK)**:
```json
{
  "data": {
    "uploadUrl": "https://storage.carecircle.internal/upload?key=records/67b848...&signature=...",
    "storageKey": "records/67b848/blood_test_report_oct.pdf",
    "expiresAt": "2026-10-21T17:45:00.000Z"
  }
}
```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Unsupported MIME type (Allowed: PDF, JPEG, PNG, WEBP, DICOM, Plain Text) or file size > 25MB

---

### 8.2 Confirm Record Upload
- **Method & Path**: `POST /api/v1/records/confirm`
- **Request Body** (`confirmRecordSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "storageKey": "records/67b848/blood_test_report_oct.pdf",
  "fileName": "blood_test_report_oct.pdf",
  "contentType": "application/pdf",
  "fileSizeBytes": 1048576,
  "recordType": "lab_result"
}
```
- **Success (201 Created)**: Returns confirmed record metadata.

---

### 8.3 Get Signed Download URL
- **Method & Path**: `GET /api/v1/records/:id/download-url`
- **Auth**: Requires `view_records` permission
- **Success (200 OK)**:
```json
{
  "data": {
    "downloadUrl": "https://storage.carecircle.internal/download?key=...&signature=...",
    "expiresAt": "2026-10-21T17:45:00.000Z"
  }
}
```

---

## 9. Caregiver Alerts & Notifications

Mounted under `/api/v1/alerts`.

### 9.1 Issue Alert
- **Method & Path**: `POST /api/v1/alerts`
- **Rate Limit**: Max 5 requests/minute (`ALERT_RATE_LIMIT_MAX`), logged in audit history
- **Request Body** (`createAlertSchema`):
```json
{
  "patientId": "67b84814e5907c13a01f5c02",
  "severity": "high",
  "title": "Abnormal Systolic BP Reading",
  "message": "Recorded systolic BP was 165 mmHg. Please check on Raghav.",
  "suggestedAction": "Verify reading and consult doctor if elevated.",
  "channels": ["push", "sms"]
}
```
- **Success (201 Created)**: Dispatches notification jobs to permitted caregivers with `receive_alerts`.

---

## 10. Audit History

Mounted under `/api/v1/audit`.

### 10.1 List Audit Log
- **Method & Path**: `GET /api/v1/audit?patientId=...`
- **Auth**: Scoped to user's permitted patient relationships
- **Success (200 OK)**: Returns chronological immutable audit trail of accesses, updates, and rate-limit events.

---

## 11. AI / MCP Endpoints (Parked & Flag-Guarded)

Mounted at `/mcp`, `/api/v1/mcp`, and `/api/v1/assistant`.

### Behavior when `AI_ENABLED=false` (Default)
All routes under `/mcp`, `/api/v1/mcp`, and `/api/v1/assistant` immediately return HTTP 503:
```json
{
  "code": "AI_DISABLED",
  "error": {
    "code": "AI_DISABLED",
    "message": "AI features are not enabled.",
    "requestId": "229f3721-e701-4467-b50a-e8d193d256da"
  }
}
```

### Behavior when `AI_ENABLED=true`
- Discovery: `GET /mcp/tools` (Requires JWT or `X-Internal-Service-Token`)
- Tool Execution: `POST /mcp/call` (Requires JWT or `X-Internal-Service-Token`)
- Assistant Proxy: `ALL /api/v1/assistant/*` (Requires authenticated user or valid service token)
- Security: `INTERNAL_SERVICE_TOKEN` must be >= 32 characters and validated with constant-time `crypto.timingSafeEqual`.
