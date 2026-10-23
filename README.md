# CareCircle AI

**Voice-first AI Care Coordination Assistant for Families**  
*Built for the Amazon Alexa+ Track*

---

## Monorepo Architecture

CareCircle AI is organized into 4 modular services:

```text
CareCircle/
├── frontend/         # React 18 + Vite + Tailwind + Web Speech API (Voice & Dashboard UI)
├── backend/          # Express + TypeScript + MongoDB + JWT Auth (Core Care Store & APIs)
├── ai-engine/        # FastAPI + LangChain/LLM + Cross-Session Memory (Agentic Orchestrator)
└── mcp-server/       # Streamable HTTP MCP Server (Spec 2025-11-25+ over SSE)
```

---

## Quick Start Guide

### 1. Backend (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 2. Model Context Protocol (MCP) Server (Port 8000)
```bash
cd mcp-server
pip install -r requirements.txt
python server.py
```

### 3. AI Engine Orchestrator (Port 8001)
```bash
cd ai-engine
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8001 --reload
```

### 4. Frontend Web Dashboard (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## License
MIT License
