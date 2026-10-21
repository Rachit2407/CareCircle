# CareCircle AI — Backend Architecture & Domain Services

**Voice-first elderly-care coordination platform backend**

CareCircle AI connects families caring for elderly loved ones through voice interaction and a centralized dashboard. The backend manages care tasks, medication schedules, appointments, check-ins, health readings, records, notifications, and auditable history.

Built for the **Amazon Alexa+ Track**.

## 1. Technology Stack

- Node.js, TypeScript, Express
- MongoDB Atlas with Mongoose
- Zod for request and environment validation
- JWT-based authentication
- Vitest for integration testing
- Model Context Protocol (MCP) adapter for AI voice-engine integration

## 2. Architecture and Security

- **Strict patient scoping:** Access is derived from authenticated identity and explicit caregiver-patient consent relationships.
- **Idempotent writes:** Mutating requests support idempotency keys to prevent duplicate operations.
- **Privacy:** Environment secrets are kept outside source control. Health-record storage uses short-lived signed URLs.
- **Auditability:** Important actions record the actor, patient scope, outcome, and correlation identifiers.
- **Notifications:** Reminder scheduling and delivery status are tracked separately from medication-dose confirmation.
- **Background processing:** A reminder worker handles pending and retried notifications.

## 3. Repository Structure

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── alerts/
│   │   ├── appointments/
│   │   ├── assistant/
│   │   ├── audit/
│   │   ├── auth/
│   │   ├── checkins/
│   │   ├── health-readings/
│   │   ├── idempotency/
│   │   ├── mcp/
│   │   ├── medications/
│   │   ├── notifications/
│   │   ├── records/
│   │   ├── relationships/
│   │   ├── tasks/
│   │   └── users/
│   ├── services/
│   ├── jobs/
│   ├── mcp/
│   └── utils/
├── tests/
│   ├── setup.ts
│   └── integration/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 4. API Overview

All API routes use the `/api/v1` prefix.

### Authentication and Relationships

- `POST /auth/register` — Register a patient or caregiver.
- `POST /auth/login` — Authenticate and obtain tokens.
- `POST /auth/refresh` — Refresh authentication tokens.
- `GET /auth/me` — Get the current user profile.
- `POST /relationships` — Create a caregiver-patient relationship.
- `GET /relationships` — List accessible care relationships.
- `PATCH /relationships/:id` — Update relationship consent or permissions.

### Care Tasks

- `POST /tasks` — Create a care task.
- `GET /tasks` — List tasks within the authorized patient scope.
- `PATCH /tasks/:id` — Update a task's status.

### Medications

- `POST /medications/schedule` — Create a medication schedule.
- `GET /medications/schedule` — List medication schedules.
- `PATCH /medications/schedule/:id` — Update or pause a schedule.
- `POST /medications/doses/confirm` — Record a reported dose status.

### Appointments and Check-ins

- `POST /appointments` — Create an appointment.
- `GET /appointments` — List appointments.
- `PATCH /appointments/:id` — Reschedule or cancel an appointment.
- `POST /check-ins` — Record a pre-appointment check-in.
- `GET /check-ins` — Retrieve check-in history.

### Health Readings and Records

- `POST /health-readings` — Record vital signs.
- `GET /health-readings` — Query health readings.
- `POST /records/upload-url` — Request a signed upload URL.
- `POST /records/confirm` — Confirm uploaded record metadata.
- `GET /records