# CareCircle AI — Product Feedback & Tooling Evaluation

As required by the **Amazon Alexa+ Track** hackathon guidelines, this document provides comprehensive product feedback on every SDK, API, framework, and tool used during the development of CareCircle AI.

---

## 1. Model Context Protocol (MCP) SDK & Specification (Spec `2025-11-25`)

### What we used it for:
We used MCP as the standardized transport and tool-discovery layer connecting our conversational AI engine with the elderly-care domain services (scheduling appointments, creating medication reminders, logging vitals, and dispatching caregiver alerts) via Server-Sent Events (SSE) Streamable HTTP transport.

### What worked well:
- **Strict Typing & JSON-RPC 2.0 Standard:** Defining tools via explicit input schemas (`inputSchema`) eliminated ambiguity in parameter extraction, making tool execution deterministic and verifiable.
- **Protocol Separation:** MCP cleanly decoupled our LLM orchestration engine (`ai-engine`) from backend database mutations, adhering to least-privilege security boundaries.
- **Streaming over SSE (`/mcp/sse`):** Server-Sent Events provided low-latency delivery of tool events suitable for voice-assisted turn cycles.

### What didn't work / Pain points:
- **Documentation & Spec Velocity:** The `2025-11-25` specification is cutting-edge. Python and TypeScript documentation around remote HTTP streamable transports had minimal complete end-to-end examples, requiring custom JSON-RPC protocol handling.
- **Error Propagation in Streamed Sessions:** Mapping upstream domain errors (such as unauthorized patient scope) back through JSON-RPC error objects without leaking internal system traces required extra manual sanitization.

### Onboarding experience:
- Conceptual onboarding was smooth for team members familiar with OpenAPI / JSON Schema, but configuring streamable HTTP session lifetimes required trial and error.

### Would we build with it again?
- **Yes, absolutely.** MCP represents the future of standardized agent-to-tool connectivity, particularly for smart-home assistants like Alexa+.

---

## 2. FastAPI & Uvicorn (Python 3.13)

### What we used it for:
Powering both the **AI Engine Orchestrator** (port 8001) and the **Standalone MCP Server** (port 8000), serving async conversational endpoints, safety policies, and SSE streams.

### What worked well:
- **Blazing Performance & Concurrency:** Async endpoint handling allowed real-time streaming of speech transcripts, LLM decision branches, and tool calls without blocking.
- **Pydantic V2 Validation:** Instant request/response validation guaranteed that malformed payloads from speech-to-text transcripts were caught before reaching domain logic.
- **Interactive OpenAPI Documentation (`/docs`):** Made cross-team testing between frontend, backend, and AI integration effortless.

### What didn't work / Pain points:
- Minor dependency compatibility nuances with Python 3.13 when combining early Pydantic-settings releases, which was easily resolved with pinned dependencies.

### Onboarding experience:
- Seamless. FastAPI remains the industry gold standard for Python AI services.

### Would we build with it again?
- **Yes, 100%.** It is our default choice for AI service orchestration.

---

## 3. Sarvam AI Voice Pipeline (STT & TTS)

### What we used it for:
Speech-to-text (STT) audio transcription and multilingual text-to-speech (TTS) audio synthesis (`bulbul:v1`), enabling conversational voice care coordination.

### What worked well:
- **Indian Accents & Multilingual Support:** Exceptional transcription accuracy on Indian names (e.g., Raghav, Rao, Anita) and regional health terminology where generic Western speech models frequently stumble.
- **Warm Auditory Feedback:** The `meera` voice profile provided an empathetic, respectful tone well-suited for elderly caregiving.

### What didn't work / Pain points:
- **Network Latency:** Audio payload uploads over slower mobile networks added noticeable latency compared to browser-native speech synthesis. We implemented dual-mode fallback to ensure the app never freezes if network voice latency spikes.

### Onboarding experience:
- Straightforward REST endpoints with clear subscription-key authentication headers.

### Would we build with it again?
- **Yes.** Essential for healthcare applications targeting multilingual families and elder care in diverse regions.

---

## 4. Node.js, Express, TypeScript & MongoDB

### What we used it for:
The central source of truth: patient/caregiver relationship management, JWT authentication, immutable audit logging, and core domain collections (tasks, appointments, vitals).

### What worked well:
- **Schema Flexibility with Mongoose:** Rapid modeling of polymorphic health readings (blood pressure systolic/diastolic, glucose, heart rate).
- **Security & Scoping Middleware:** Express middleware allowed strict enforcement of caregiver-patient consent rules before any tool write operation was executed.

### What didn't work / Pain points:
- Handling dual-mounted endpoints for both `/auth/*` and `/api/v1/auth/*` to accommodate both mobile and browser clients required careful route ordering.

### Onboarding experience:
- Very standard; team members with TypeScript experience were productive immediately.

### Would we build with it again?
- **Yes.** Highly reliable foundation for full-stack healthcare coordination.

---

## 5. React 18, Vite & Tailwind CSS

### What we used it for:
Building the responsive, accessible CareCircle web dashboard and conversational Voice Assistant interface.

### What worked well:
- **Vite Developer Experience:** Sub-second hot module replacement (HMR) and fast build times (`vite build`).
- **Accessibility & Design System:** Tailwind tokens combined with Atkinson Hyperlegible and Bricolage Grotesque fonts ensured high contrast and readability for elderly family members.
- **Web Speech API Integration:** Enabled hands-free voice coordination directly in the browser without third-party audio plugin overhead.

### What didn't work / Pain points:
- Initial proxy routing conflicts between mock development mode and live microservices required explicitly defined proxy routes in `vite.config.ts`.

### Onboarding experience:
- Excellent. Modern component-driven architecture kept the UI clean and modular.

### Would we build with it again?
- **Yes, definitely.**
