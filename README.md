# CareCircle AI 🎙️👵

**Voice-first AI Care Coordination Assistant for Families**

Built for the **Amazon Alexa+ Track**.

CareCircle AI connects families caring for elderly loved ones through natural voice interaction and a centralized live dashboard. Powered by a self-hosted Model Context Protocol (MCP) server, autonomous agentic workflows, and proactive coordination tools.

## License
MIT License

# CareCircle — Alexa+ MCP Caregiving Platform

CareCircle is an ambient, agentic caregiving system built for **Alexa+** using the **Model Context Protocol (MCP)** (Spec: `2025-11-25`, Streamable HTTP/SSE).

## 🚀 Running the Project

### 1. Start the MCP Server
```bash
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
