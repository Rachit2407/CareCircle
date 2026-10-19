import uuid
from typing import Dict, Any, List
from app.services.policy import MedicalSafetyPolicy
from app.services.mcp_client import mcp_client
from app.services.llm_provider import llm_provider
from app.schemas.requests import AssistantMessageRequest
from app.schemas.responses import AssistantMessageResponse, ToolActionExecution, PendingAction
from app.core.logging import logger

class OrchestrationEngine:
    """
    Main CareCircle conversational orchestrator:
    1. Evaluates safety guardrails (emergency check & medical advice restrictions).
    2. Maintains conversation history and pending action state.
    3. Queries available MCP tools.
    4. Invokes LLM decision layer.
    5. Enforces confirmation policy for destructive/high-priority actions.
    6. Calls MCP tool and composes grounded truth-backed reply.
    """

    def __init__(self):
        # In-memory session store (conversationId -> list of messages)
        self.sessions: Dict[str, List[Dict[str, str]]] = {}
        # Pending confirmation store (actionId -> action dict)
        self.pending_actions: Dict[str, Dict[str, Any]] = {}

    async def process_message(self, req: AssistantMessageRequest) -> AssistantMessageResponse:
        request_id = str(uuid.uuid4())
        conv_id = req.conversationId or str(uuid.uuid4())
        user_text = req.message.strip()

        # Step 1: Safety Gate - Emergency Detection
        emergency_notice = MedicalSafetyPolicy.check_emergency(user_text)
        if emergency_notice:
            return AssistantMessageResponse(
                reply=emergency_notice,
                actions=[],
                needsConfirmation=False,
                conversationId=conv_id,
                requestId=request_id
            )

        # Step 2: Safety Gate - Prescription / Dosage modification prohibition
        advice_notice = MedicalSafetyPolicy.check_medical_advice(user_text)
        if advice_notice:
            return AssistantMessageResponse(
                reply=advice_notice,
                actions=[],
                needsConfirmation=False,
                conversationId=conv_id,
                requestId=request_id
            )

        # Retrieve or initialize conversation history
        history = self.sessions.setdefault(conv_id, [])
        history.append({"role": "user", "content": user_text})

        # Step 3: Fetch allowlisted MCP tools
        available_tools = await mcp_client.list_tools()

        # Step 4: LLM decision
        decision = await llm_provider.decide_action(history, available_tools, {"patientId": req.patientId})

        # Branch A: Direct Reply / Clarification
        if decision.get("type") == "direct_reply":
            reply_text = decision.get("content", "I am here to help.")
            history.append({"role": "assistant", "content": reply_text})
            return AssistantMessageResponse(
                reply=reply_text,
                actions=[],
                needsConfirmation=False,
                conversationId=conv_id,
                requestId=request_id
            )

        # Branch B: Tool Execution
        tool_name = decision.get("tool_name")
        arguments = decision.get("arguments", {})

        # Step 5: Policy Gate - Check if explicit confirmation is needed
        if MedicalSafetyPolicy.requires_confirmation(tool_name, arguments):
            action_id = f"act_{uuid.uuid4().hex[:8]}"
            pending_item = {
                "actionId": action_id,
                "tool": tool_name,
                "arguments": arguments,
                "patientId": req.patientId,
                "description": f"Execute {tool_name} with parameters: {arguments}"
            }
            self.pending_actions[action_id] = pending_item

            confirm_reply = f"This action is marked as high priority or sensitive. Do you confirm you want to {tool_name.replace('_', ' ')}?"
            history.append({"role": "assistant", "content": confirm_reply})

            return AssistantMessageResponse(
                reply=confirm_reply,
                actions=[ToolActionExecution(
                    tool=tool_name,
                    status="pending_confirmation",
                    arguments=arguments
                )],
                needsConfirmation=True,
                pendingAction=PendingAction(
                    actionId=action_id,
                    tool=tool_name,
                    description=pending_item["description"],
                    arguments=arguments
                ),
                conversationId=conv_id,
                requestId=request_id
            )

        # Step 6: Execute Tool through MCP Client
        logger.info("Executing MCP Tool %s with args: %s", tool_name, arguments)
        tool_result = await mcp_client.call_tool(tool_name, arguments, patient_id=req.patientId)

        # Step 7: Compose Grounded Response based on tool outcome
        reply_text, action_record = self._compose_grounded_response(tool_name, arguments, tool_result)
        history.append({"role": "assistant", "content": reply_text})

        return AssistantMessageResponse(
            reply=reply_text,
            actions=[action_record],
            needsConfirmation=False,
            conversationId=conv_id,
            requestId=request_id
        )

    def _compose_grounded_response(
        self, tool_name: str, arguments: Dict[str, Any], tool_result: Dict[str, Any]
    ) -> (str, ToolActionExecution):
        """Composes response strictly grounded in verified tool results."""
        if not tool_result.get("ok"):
            err_msg = tool_result.get("error", {}).get("message", "The care service was unable to complete the request.")
            reply = f"I'm sorry, I could not complete that action: {err_msg}"
            action = ToolActionExecution(
                tool=tool_name,
                status="failed",
                arguments=arguments,
                error=err_msg
            )
            return reply, action

        data = tool_result.get("data", {})
        result_id = data.get("id") or data.get("alertId")

        if tool_name == "create_care_task":
            title = data.get("title", "care task")
            due = data.get("dueAt", "today")
            reply = f"I created the reminder: '{title}' scheduled for {due}."
        elif tool_name == "get_care_tasks":
            tasks = data.get("tasks", [])
            if not tasks:
                reply = "There are no pending care tasks scheduled for today."
            else:
                task_list_str = ", ".join([f"'{t.get('title')}'" for t in tasks[:3]])
                reply = f"You have {len(tasks)} care tasks: {task_list_str}."
        elif tool_name == "add_health_reading":
            vtype = data.get("type", "vital").replace("_", " ")
            val = data.get("value")
            unit = data.get("unit", "")
            reply = f"Logged {vtype} reading of {val} {unit}. It has been saved to the family dashboard."
        elif tool_name == "get_next_appointment":
            apt = data.get("appointment", {})
            provider = apt.get("provider", "your doctor")
            starts = apt.get("startsAt", "upcoming")
            reply = f"The next appointment is with {provider} at {starts}."
        elif tool_name == "send_caregiver_alert":
            reply = "Caregiver alert has been dispatched to the family care circle."
        else:
            reply = f"Action {tool_name} completed successfully."

        action = ToolActionExecution(
            tool=tool_name,
            status="succeeded",
            arguments=arguments,
            resultId=result_id
        )
        return reply, action

    async def execute_pending_action(self, action_id: str, confirmed: bool) -> AssistantMessageResponse:
        """Executes or cancels an action that was held for caregiver confirmation."""
        request_id = str(uuid.uuid4())
        if action_id not in self.pending_actions:
            return AssistantMessageResponse(
                reply="This confirmation request is invalid or has expired.",
                actions=[],
                needsConfirmation=False,
                conversationId="unknown",
                requestId=request_id
            )

        item = self.pending_actions.pop(action_id)
        tool_name = item["tool"]
        arguments = item["arguments"]
        patient_id = item["patientId"]

        if not confirmed:
            return AssistantMessageResponse(
                reply=f"Action '{tool_name}' was cancelled per your instruction.",
                actions=[ToolActionExecution(tool=tool_name, status="cancelled", arguments=arguments)],
                needsConfirmation=False,
                conversationId="confirmed_session",
                requestId=request_id
            )

        # Execute confirmed tool
        tool_result = await mcp_client.call_tool(tool_name, arguments, patient_id=patient_id)
        reply_text, action_record = self._compose_grounded_response(tool_name, arguments, tool_result)

        return AssistantMessageResponse(
            reply=f"Confirmed and executed: {reply_text}",
            actions=[action_record],
            needsConfirmation=False,
            conversationId="confirmed_session",
            requestId=request_id
        )

orchestrator = OrchestrationEngine()
