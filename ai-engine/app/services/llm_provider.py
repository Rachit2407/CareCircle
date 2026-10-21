import json
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger

CARE_SYSTEM_PROMPT = """You are CareCircle AI, a dedicated, empathetic voice care coordination assistant for families caring for elderly loved ones.

Core Responsibilities:
1. Coordinate care tasks, medication reminders, appointments, and vitals tracking.
2. Ground all answers strictly in facts confirmed by tools or existing patient records.
3. NEVER claim a medication was taken or a reminder was created unless confirmed by an MCP tool.
4. When essential slots (time, patient name, medication name) are ambiguous or missing, politely ask a clarification question before executing.
5. If the user mentions emergency red-flag symptoms (chest pain, stroke signs, difficulty breathing), immediately provide urgent medical guidance and urge them to call emergency services.
6. NEVER diagnose illness or alter prescription dosages. Direct users to licensed clinicians.
7. Tone: Warm, concise, reassuring, and respectful of the elderly and caregivers.
"""

class LLMProvider:
    """
    Adapter for LLM provider (OpenAI / Groq / Anthropic or Fallback Rule-Based Parser).
    Provides structured function/tool-calling format compatible with MCP tool catalog.
    """

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.LLM_MODEL
        self._client = None
        if self.api_key and self.api_key != "your_openai_api_key_here":
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key, base_url=settings.LLM_BASE_URL)
            except Exception as e:
                logger.warning("Failed to initialize AsyncOpenAI client: %s", str(e))

    async def decide_action(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Takes conversation history and available MCP tools, returns either:
        - A tool call: {"type": "tool_call", "tool_name": "...", "arguments": {...}}
        - A direct reply / clarification: {"type": "direct_reply", "content": "..."}
        """
        # If client configured, use OpenAI function calling
        if self._client:
            try:
                formatted_tools = [
                    {
                        "type": "function",
                        "function": {
                            "name": t["name"],
                            "description": t["description"],
                            "parameters": t.get("inputSchema", {})
                        }
                    }
                    for t in tools
                ]

                sys_msg = {"role": "system", "content": CARE_SYSTEM_PROMPT}
                chat_history = [sys_msg] + messages

                response = await self._client.chat.completions.create(
                    model=self.model,
                    messages=chat_history,
                    tools=formatted_tools if formatted_tools else None,
                    tool_choice="auto",
                    temperature=0.2
                )

                choice = response.choices[0].message
                if choice.tool_calls:
                    tc = choice.tool_calls[0]
                    return {
                        "type": "tool_call",
                        "tool_name": tc.function.name,
                        "arguments": json.loads(tc.function.arguments)
                    }
                else:
                    return {
                        "type": "direct_reply",
                        "content": choice.content or "How can I assist your family today?"
                    }
            except Exception as e:
                logger.error("LLM Provider error, falling back to rule-based engine: %s", str(e))

        # Fallback intelligent rule-based intent extraction
        return self._rule_based_intent_extractor(messages[-1]["content"])

    def _rule_based_intent_extractor(self, user_text: str) -> Dict[str, Any]:
        """High-accuracy fallback intent parser for CareCircle elderly care domain."""
        import re
        lower = user_text.lower()

        # 1. Appointment queries
        if "next appointment" in lower or "doctor visit" in lower or ("when is" in lower and "doctor" in lower):
            return {"type": "tool_call", "tool_name": "get_next_appointment", "arguments": {}}

        # 2. Create care task / reminder (check this before vitals so 'remind father to take bp medicine' creates a task)
        if any(w in lower for w in ["remind", "reminder", "schedule a task", "add task", "take his medicine", "take her medicine", "take medicine"]):
            time_match = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))", lower)
            due_at = time_match.group(1).upper() if time_match else "Today at specified time"
            
            # Clean title
            title = user_text
            for prefix in ["remind my father to ", "remind my mother to ", "remind dad to ", "remind mom to ", "create a reminder to ", "add reminder to "]:
                if lower.startswith(prefix):
                    title = user_text[len(prefix):].capitalize()
                    break

            return {
                "type": "tool_call",
                "tool_name": "create_care_task",
                "arguments": {
                    "title": title,
                    "dueAt": due_at,
                    "timezone": "Asia/Kolkata",
                    "priority": "normal"
                }
            }

        # 3. Add health reading / vitals
        # E.g. "blood pressure is 130/85", "glucose reading is 110"
        bp_match = re.search(r"(\d{2,3}\s*/\s*\d{2,3})", user_text)
        if "blood pressure" in lower or "bp" in lower or bp_match:
            val = bp_match.group(1).replace(" ", "") if bp_match else "120/80"
            return {
                "type": "tool_call",
                "tool_name": "add_health_reading",
                "arguments": {
                    "type": "blood_pressure",
                    "value": val,
                    "unit": "mmHg",
                    "notes": user_text
                }
            }

        sugar_match = re.search(r"(\d{2,3})\s*(mg/dl)?", user_text)
        if "sugar" in lower or "glucose" in lower:
            val = sugar_match.group(1) if sugar_match else "105"
            return {
                "type": "tool_call",
                "tool_name": "add_health_reading",
                "arguments": {
                    "type": "glucose",
                    "value": val,
                    "unit": "mg/dL",
                    "notes": user_text
                }
            }

        # 4. Check tasks
        if any(w in lower for w in ["what tasks", "list tasks", "pending tasks", "what's scheduled", "whats scheduled"]):
            return {"type": "tool_call", "tool_name": "get_care_tasks", "arguments": {"status": "pending"}}

        # 5. Alert caregiver
        if "emergency" in lower or "alert family" in lower or "send alert" in lower:
            return {
                "type": "tool_call",
                "tool_name": "send_caregiver_alert",
                "arguments": {
                    "eventType": "assistance_needed",
                    "message": user_text,
                    "severity": "high"
                }
            }

        # Clarification default
        return {
            "type": "direct_reply",
            "content": f"I heard: '{user_text}'. Would you like me to set a medication reminder, record vitals, or check upcoming doctor appointments?"
        }

llm_provider = LLMProvider()
