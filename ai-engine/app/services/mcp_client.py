import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger

class MCPClientService:
    """
    Client interface to the CareCircle Model Context Protocol (MCP) server.
    Interacts with typed MCP tools over Streamable HTTP / SSE as per spec 2025-11-25.
    Supports a mock/fallback mode so AI Engine can be tested standalone or in vertical slice.
    """

    def __init__(self):
        self.server_url = settings.MCP_SERVER_URL
        self.transport = settings.MCP_TRANSPORT
        # Simulated in-memory tool catalog when external MCP server is not yet booted
        self._mock_data_tasks = []

    async def list_tools(self) -> List[Dict[str, Any]]:
        """Discover tools exposed by the MCP server."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.server_url}/tools")
                if res.status_code == 200:
                    return res.json().get("tools", [])
        except Exception as e:
            logger.info("External MCP Server unavailable, utilizing native tool definitions schema: %s", str(e))

        # Built-in specification tools as defined in CareCircle_MCP_Server_Requirements.pdf
        return [
            {
                "name": "create_care_task",
                "description": "Create a care task or reminder for a patient (e.g. medicine, meal, checkup)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Short description of the task"},
                        "dueAt": {"type": "string", "description": "ISO-8601 datetime or time description"},
                        "timezone": {"type": "string", "description": "IANA timezone, e.g. Asia/Kolkata"},
                        "priority": {"type": "string", "enum": ["low", "normal", "high"], "default": "normal"},
                        "assigneeId": {"type": "string", "description": "User ID of caregiver assigned"}
                    },
                    "required": ["title"]
                }
            },
            {
                "name": "get_care_tasks",
                "description": "List care tasks for the patient with optional status filters",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "overdue"]},
                        "limit": {"type": "integer", "default": 10}
                    }
                }
            },
            {
                "name": "add_health_reading",
                "description": "Record a vital measurement (blood pressure, blood glucose, heart rate, weight)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["blood_pressure", "glucose", "heart_rate", "weight", "temperature"]},
                        "value": {"type": "string", "description": "Measurement value (e.g. '120/80', '110')"},
                        "unit": {"type": "string", "description": "mmHg, mg/dL, bpm, kg, etc."},
                        "notes": {"type": "string", "description": "Qualitative context or symptoms"}
                    },
                    "required": ["type", "value"]
                }
            },
            {
                "name": "get_next_appointment",
                "description": "Fetch details of the patient's next scheduled doctor or clinic visit",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "send_caregiver_alert",
                "description": "Send a high-priority alert notification to designated family caregivers",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "eventType": {"type": "string", "description": "missed_medication, vital_abnormality, assistance_needed"},
                        "message": {"type": "string", "description": "Concise alert details"},
                        "severity": {"type": "string", "enum": ["low", "medium", "critical"]}
                    },
                    "required": ["eventType", "message", "severity"]
                }
            }
        ]

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any], patient_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Invokes an MCP tool. Sends trusted patient_id context.
        Falls back to local mock execution if external MCP server is not reachable.
        """
        payload = {
            "tool": tool_name,
            "arguments": arguments,
            "context": {"patientId": patient_id}
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{self.server_url}/call", json=payload)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.info("Calling mock execution for MCP tool %s: %s", tool_name, str(e))

        # Local handler for standalone AI Engine vertical slice
        return await self._execute_mock_tool(tool_name, arguments, patient_id)

    async def _execute_mock_tool(self, tool_name: str, args: Dict[str, Any], patient_id: Optional[str]) -> Dict[str, Any]:
        import uuid
        from datetime import datetime, timezone

        if tool_name == "create_care_task":
            new_id = f"task_{uuid.uuid4().hex[:8]}"
            task_obj = {
                "id": new_id,
                "title": args.get("title"),
                "dueAt": args.get("dueAt", "Today"),
                "priority": args.get("priority", "normal"),
                "status": "pending",
                "patientId": patient_id or "patient_default",
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            self._mock_data_tasks.append(task_obj)
            return {
                "ok": True,
                "status": "created",
                "data": task_obj,
                "requestId": str(uuid.uuid4())
            }

        elif tool_name == "get_care_tasks":
            return {
                "ok": True,
                "status": "success",
                "data": {"tasks": self._mock_data_tasks},
                "requestId": str(uuid.uuid4())
            }

        elif tool_name == "add_health_reading":
            reading_id = f"vital_{uuid.uuid4().hex[:8]}"
            return {
                "ok": True,
                "status": "created",
                "data": {
                    "id": reading_id,
                    "type": args.get("type"),
                    "value": args.get("value"),
                    "unit": args.get("unit", ""),
                    "notes": args.get("notes", "")
                },
                "requestId": str(uuid.uuid4())
            }

        elif tool_name == "get_next_appointment":
            return {
                "ok": True,
                "status": "success",
                "data": {
                    "appointment": {
                        "id": "apt_101",
                        "provider": "Dr. Sharma (Cardiology)",
                        "startsAt": "Tomorrow at 10:30 AM",
                        "location": "City Care Hospital, Room 302"
                    }
                },
                "requestId": str(uuid.uuid4())
            }

        elif tool_name == "send_caregiver_alert":
            return {
                "ok": True,
                "status": "dispatched",
                "data": {"alertId": f"alt_{uuid.uuid4().hex[:8]}", "recipientCount": 2},
                "requestId": str(uuid.uuid4())
            }

        return {
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": f"Tool {tool_name} not found"},
            "requestId": str(uuid.uuid4())
        }

mcp_client = MCPClientService()
