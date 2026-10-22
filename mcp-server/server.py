import asyncio
import json
import uuid
import os
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="CareCircle Alexa+ MCP Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_API_BASE_URL = os.getenv("BACKEND_API_BASE_URL", "http://localhost:4000/api/v1")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "carecircle_internal_secret_token_32_chars_long")

# ---------------------------------------------------------
# State Management: Stateful Sessions across Alexa+ Turns
# ---------------------------------------------------------
class CareCircleState:
    def __init__(self):
        self.patient_profile = {
            "name": "Raghav Rao",
            "age": 74,
            "emergency_contact": {"name": "Anita Rao (Daughter)", "phone": "+91 98765 43210"},
            "primary_physician": "Dr. V. K. Sharma",
        }
        self.medications = [
            {"id": "med-1", "name": "Amlodipine Besylate", "dosage": "5mg", "schedule": "08:30", "taken_today": True},
            {"id": "med-2", "name": "Metformin Hydrochloride", "dosage": "500mg", "schedule": "19:30", "taken_today": False},
        ]
        self.vitals_history: List[Dict[str, Any]] = [
            {"timestamp": "2026-10-22T08:30:00Z", "metric": "blood_pressure", "value": "128/82", "unit": "mmHg"}
        ]
        self.incident_log: List[Dict[str, Any]] = []
        self.session_context: Dict[str, Any] = {"consecutive_missed_doses": 0, "mood": "good"}

state = CareCircleState()

# ---------------------------------------------------------
# MCP Definitions (Streamable HTTP Spec 2025-11-25)
# ---------------------------------------------------------
MCP_TOOLS = [
    {
        "name": "get_patient_status",
        "description": "Retrieves the current status of the patient including meds taken, recent vitals, and urgent alerts.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "log_medication_intake",
        "description": "Records that a patient took or missed a scheduled medication, updating care circles and database.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "medication_name": {"type": "string", "description": "Name of the medication taken or missed"},
                "status": {"type": "string", "enum": ["taken", "missed", "delayed"], "description": "Status of the intake"},
                "notes": {"type": "string", "description": "Optional notes from the patient"}
            },
            "required": ["medication_name", "status"],
        },
    },
    {
        "name": "record_vital_signs",
        "description": "Logs vitals (blood pressure, heart rate, blood glucose) and checks against risk thresholds.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "metric_type": {"type": "string", "enum": ["blood_pressure", "heart_rate", "glucose_level", "spo2"]},
                "value": {"type": "string", "description": "Measurement value (e.g., '120/80', '72', '105')"},
                "unit": {"type": "string", "description": "e.g., mmHg, bpm, mg/dL, %"}
            },
            "required": ["metric_type", "value"],
        },
    },
    {
        "name": "create_care_task",
        "description": "Creates a care chore or reminder task for the elderly care circle.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Task description"},
                "dueAt": {"type": "string", "description": "Scheduled time"},
                "priority": {"type": "string", "enum": ["low", "normal", "high"], "default": "normal"}
            },
            "required": ["title"]
        }
    },
    {
        "name": "escalate_to_caregiver",
        "description": "Triggers an immediate emergency notification to the caregiver or family member.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["low", "medium", "critical"]},
                "reason": {"type": "string", "description": "Detailed reason for triggering escalation"},
            },
            "required": ["severity", "reason"],
        },
    },
]

# ---------------------------------------------------------
# Agentic Tool Logic with Backend Database Synchronization
# ---------------------------------------------------------
def forward_to_backend(endpoint: str, payload: dict) -> Optional[dict]:
    """Helper to forward tool mutations to backend domain services when active."""
    headers = {
        "Content-Type": "application/json",
        "x-internal-service-token": INTERNAL_SERVICE_TOKEN
    }
    try:
        resp = requests.post(f"{BACKEND_API_BASE_URL}{endpoint}", json=payload, headers=headers, timeout=2.5)
        if resp.status_code in [200, 201]:
            return resp.json()
    except Exception:
        # Fallback to local state if backend is offline
        pass
    return None

def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    timestamp = datetime.utcnow().isoformat()

    if tool_name == "get_patient_status":
        return {
            "patient": state.patient_profile["name"],
            "medications": state.medications,
            "recent_vitals": state.vitals_history[-3:],
            "active_alerts": state.incident_log[-2:],
            "context": state.session_context,
        }

    elif tool_name == "log_medication_intake":
        med_name = arguments["medication_name"].strip().lower()
        status_val = arguments["status"]
        matched = False
        for med in state.medications:
            if med["name"].lower() in med_name or med_name in med["name"].lower():
                med["taken_today"] = (status_val == "taken")
                matched = True
                break

        if status_val == "missed":
            state.session_context["consecutive_missed_doses"] += 1
            if state.session_context["consecutive_missed_doses"] >= 2:
                # Agentic auto-escalation
                state.incident_log.append({
                    "timestamp": timestamp,
                    "type": "missed_dose_alert",
                    "details": f"Patient missed 2 consecutive doses. Last missed: {arguments['medication_name']}"
                })
        else:
            state.session_context["consecutive_missed_doses"] = 0

        # Sync with backend
        forward_to_backend("/medications/doses/confirm", {
            "medicationName": arguments["medication_name"],
            "status": status_val,
            "notes": arguments.get("notes", "")
        })

        return {
            "success": True,
            "matched_medication": matched,
            "medication": arguments["medication_name"],
            "status": status_val,
            "timestamp": timestamp,
            "active_alert": state.session_context["consecutive_missed_doses"] >= 2
        }

    elif tool_name == "record_vital_signs" or tool_name == "add_health_reading":
        metric = arguments.get("metric_type") or arguments.get("type", "vital")
        val = arguments["value"]
        vital_record = {
            "timestamp": timestamp,
            "metric": metric,
            "value": val,
            "unit": arguments.get("unit", "")
        }
        state.vitals_history.append(vital_record)

        # Forward to backend health readings
        forward_to_backend("/health-readings", {
            "type": metric,
            "value": val,
            "unit": arguments.get("unit", ""),
            "notes": arguments.get("notes", "")
        })

        is_critical = False
        reason = ""
        if metric == "heart_rate" and (int(val) > 120 or int(val) < 45):
            is_critical = True
            reason = f"Abnormal heart rate detected: {val} bpm."

        if is_critical:
            execute_tool("escalate_to_caregiver", {"severity": "critical", "reason": reason})

        return {"recorded": vital_record, "requires_attention": is_critical}

    elif tool_name == "create_care_task":
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        task_record = {
            "id": task_id,
            "title": arguments["title"],
            "dueAt": arguments.get("dueAt", "today"),
            "priority": arguments.get("priority", "normal"),
            "timestamp": timestamp
        }
        forward_to_backend("/tasks", task_record)
        return {"success": True, "task": task_record}

    elif tool_name == "escalate_to_caregiver" or tool_name == "send_caregiver_alert":
        alert = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": timestamp,
            "severity": arguments.get("severity", "high"),
            "reason": arguments.get("reason") or arguments.get("message", "Caregiver assistance needed"),
            "notified": state.patient_profile["emergency_contact"]
        }
        state.incident_log.append(alert)
        forward_to_backend("/alerts", alert)
        return {"status": "dispatched", "alert": alert}

    raise ValueError(f"Unknown tool: {tool_name}")

# ---------------------------------------------------------
# Streamable HTTP MCP Endpoint (Spec 2025-11-25)
# ---------------------------------------------------------
@app.get("/mcp/sse")
async def mcp_sse(request: Request):
    """Provides server-sent events for streaming tool executions and context sync."""
    async def event_generator():
        yield f"event: endpoint\ndata: /mcp/messages\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(15)
            yield f": ping\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/mcp/messages")
async def mcp_messages(request: Request):
    """Handles standard JSON-RPC 2.0 requests per MCP specification."""
    payload = await request.json()
    msg_id = payload.get("id")
    method = payload.get("method")
    params = payload.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2025-11-25",
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False},
                    "prompts": {"listChanged": False}
                },
                "serverInfo": {
                    "name": "CareCircle-MCP",
                    "version": "1.0.0"
                }
            }
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": MCP_TOOLS
            }
        }

    elif method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})
        try:
            result = execute_tool(name, args)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result)
                        }
                    ],
                    "isError": False
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32000,
                    "message": str(e)
                }
            }

    return {
        "jsonrpc": "2.0",
        "id": msg_id,
        "error": {
            "code": -32601,
            "message": f"Method {method} not found"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
