import asyncio
import json
import uuid
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

# ---------------------------------------------------------
# State Management: Stateful Sessions across Alexa+ Turns
# ---------------------------------------------------------
class CareCircleState:
    def __init__(self):
        self.patient_profile = {
            "name": "Eleanor Vance",
            "age": 78,
            "emergency_contact": {"name": "David Vance (Son)", "phone": "+1-555-0199"},
            "primary_physician": "Dr. Sarah Jenkins",
        }
        self.medications = [
            {"id": "med-1", "name": "Lisinopril", "dosage": "10mg", "schedule": "08:00", "taken_today": False},
            {"id": "med-2", "name": "Metformin", "dosage": "500mg", "schedule": "19:00", "taken_today": False},
        ]
        self.vitals_history: List[Dict[str, Any]] = []
        self.incident_log: List[Dict[str, Any]] = []
        self.session_context: Dict[str, Any] = {"consecutive_missed_doses": 0, "mood": "normal"}

state = CareCircleState()

# ---------------------------------------------------------
# MCP Definitions
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
        "description": "Records that a patient took or missed a scheduled medication, updating care circles.",
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
# Agentic Tool Logic
# ---------------------------------------------------------
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

        return {
            "success": True,
            "matched_medication": matched,
            "medication": arguments["medication_name"],
            "status": status_val,
            "timestamp": timestamp,
            "active_alert": state.session_context["consecutive_missed_doses"] >= 2
        }

    elif tool_name == "record_vital_signs":
        metric = arguments["metric_type"]
        val = arguments["value"]
        vital_record = {
            "timestamp": timestamp,
            "metric": metric,
            "value": val,
            "unit": arguments.get("unit", "")
        }
        state.vitals_history.append(vital_record)

        is_critical = False
        reason = ""
        if metric == "heart_rate" and (int(val) > 120 or int(val) < 45):
            is_critical = True
            reason = f"Abnormal heart rate detected: {val} bpm."

        if is_critical:
            execute_tool("escalate_to_caregiver", {"severity": "critical", "reason": reason})

        return {"recorded": vital_record, "requires_attention": is_critical}

    elif tool_name == "escalate_to_caregiver":
        alert = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": timestamp,
            "severity": arguments["severity"],
            "reason": arguments["reason"],
            "notified": state.patient_profile["emergency_contact"]
        }
        state.incident_log.append(alert)
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
