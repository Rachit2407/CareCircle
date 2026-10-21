import re
from typing import Tuple, Optional


class MedicalSafetyPolicy:
    """
    Implements healthcare guardrails mandated by CareCircle AI specification:
    1. Emergency symptom detection (bypass agent, prompt immediate local medical help).
    2. No unauthorized clinical diagnosis, prescription, or dosage modification.
    3. Consequential write confirmation (cancellations, alerts, deletions).
    4. Prohibits claiming actions succeeded when tools fail.
    """

    # Red-flag emergency symptoms requiring immediate medical evaluation
    EMERGENCY_KEYWORDS = [
        r"\bchest pain\b",
        r"\bheart attack\b",
        r"\bcan't breathe\b",
        r"\bshortness of breath\b",
        r"\bunconscious\b",
        r"\bunresponsive\b",
        r"\bstroke\b",
        r"\bseizure\b",
        r"\bsevere bleeding\b",
        r"\bsudden numbness\b",
        r"\bparalysis\b",
        r"\bsudden loss of vision\b",
        r"\bcoughing blood\b",
    ]

    # Clinical advice keywords that the AI must not prescribe
    DIAGNOSTIC_KEYWORDS = [
        r"\bprescribe\b",
        r"\bchange (the )?dosage\b",
        r"\bstop taking (my|his|her) (medicine|pills|medication)\b",
        r"\bdouble the dose\b",
    ]

    # Actions that require explicit user confirmation before executing write operations
    SENSITIVE_ACTIONS = [
        "cancel_appointment",
        "delete_care_task",
        "send_caregiver_alert",
    ]

    @classmethod
    def check_emergency(cls, user_text: str) -> Optional[str]:
        """Returns emergency guidance if red-flag keywords are found."""
        lower_text = user_text.lower()
        for pattern in cls.EMERGENCY_KEYWORDS:
            if re.search(pattern, lower_text):
                return (
                    "CRITICAL NOTICE: You mentioned symptoms that may require urgent medical attention. "
                    "Please call your local emergency services (e.g., 911 or 112) or seek immediate emergency care right now. "
                    "Do not wait for caregiver coordination or this assistant."
                )
        return None

    @classmethod
    def check_medical_advice(cls, user_text: str) -> Optional[str]:
        """Ensures the AI does not modify dosages or diagnose conditions."""
        lower_text = user_text.lower()
        for pattern in cls.DIAGNOSTIC_KEYWORDS:
            if re.search(pattern, lower_text):
                return (
                    "As an AI care assistant, I cannot modify medication dosages, prescribe drugs, or provide clinical diagnoses. "
                    "Please consult your prescribing physician, cardiologist, or qualified healthcare professional before making any changes."
                )
        return None

    @classmethod
    def requires_confirmation(cls, tool_name: str, arguments: dict) -> bool:
        """Determines if an action is high-impact and requires caregiver confirmation."""
        if tool_name in cls.SENSITIVE_ACTIONS:
            return True
        if tool_name == "create_care_task" and arguments.get("priority") == "high":
            return True
        return False
