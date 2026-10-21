# CareCircle AI Engine

The intelligent language and orchestration layer for **CareCircle AI**.

Built with **FastAPI**, **MCP Client (Spec 2025-11-25+)**, and **Sarvam Voice AI**, this service converts caregiver and patient voice/text requests into structured, safe actions backed by Model Context Protocol tools.

---

## 🛠️ Key Capabilities

1. **Healthcare Guardrails & Safety Policies:**
   - Real-time emergency symptom detection (triggers immediate local EMS guidance).
   - Strict prohibition against prescribing drugs or changing medication dosages.
   - Confirmation gating for high-priority or destructive changes.
2. **MCP Tool Integration:**
   - Queries allowlisted MCP tools (`create_care_task`, `add_health_reading`, `get_next_appointment`, `get_care_tasks`, `send_caregiver_alert`).
   - Grounds every response in verified tool results (never claims success if a tool call fails).
3. **Voice AI Pipeline:**
   - Server-side integration with **Sarvam STT** and **Sarvam TTS**.
   - Resilient fallback for text chat and offline simulation.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd ai-engine
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Interactive API docs will be live at: `http://localhost:8001/docs`

---

## 🧪 Running Tests
```bash
pytest
```
