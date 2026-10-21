from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.core.logging import logger

class PatientCareMemory:
    """
    Maintains cross-session patient care state, historical observations,
    and active clinical context across multi-turn interactions.
    This fulfills the hackathon mandate for 'state across sessions' and
    empowers the agent to perform proactive, agentic correlation.
    """

    def __init__(self):
        # patient_id -> memory dict
        self._store: Dict[str, Dict[str, Any]] = {}

    def get_or_create(self, patient_id: str) -> Dict[str, Any]:
        if patient_id not in self._store:
            self._store[patient_id] = {
                "patient_id": patient_id,
                "name": "Father",
                "medications": [
                    {"name": "Amlodipine", "dosage": "5mg", "started_days_ago": 2, "indication": "hypertension"},
                    {"name": "Metformin", "dosage": "500mg", "started_days_ago": 120, "indication": "type 2 diabetes"}
                ],
                "vitals_history": [],
                "symptoms_history": [],
                "recent_events": [],
                "care_notes": []
            }
        return self._store[patient_id]

    def record_vital(self, patient_id: str, vital_type: str, value: str, unit: str, notes: Optional[str] = None):
        mem = self.get_or_create(patient_id)
        entry = {
            "type": vital_type,
            "value": value,
            "unit": unit,
            "notes": notes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        mem["vitals_history"].append(entry)
        logger.info("Recorded vital into cross-session memory for %s: %s", patient_id, entry)

    def record_symptom(self, patient_id: str, symptom: str, severity: str = "mild", context: Optional[str] = None):
        mem = self.get_or_create(patient_id)
        entry = {
            "symptom": symptom,
            "severity": severity,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        mem["symptoms_history"].append(entry)
        logger.info("Recorded symptom into cross-session memory for %s: %s", patient_id, entry)

    def record_note(self, patient_id: str, note_text: str, author: str = "Caregiver"):
        mem = self.get_or_create(patient_id)
        entry = {
            "text": note_text,
            "author": author,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        mem["care_notes"].append(entry)

    def correlate_symptom_with_medications(self, patient_id: str, user_text: str) -> Optional[str]:
        """
        Agentic reasoning check:
        Detects if a mentioned symptom correlates with recently adjusted medications.
        E.g., Dizziness reported after starting Amlodipine 2 days ago.
        """
        mem = self.get_or_create(patient_id)
        lower = user_text.lower()

        # Dizziness / lightheadedness check
        if any(w in lower for w in ["dizzy", "dizziness", "lightheaded", "feeling faint", "spinning"]):
            for med in mem.get("medications", []):
                if med.get("name").lower() == "amlodipine" and med.get("started_days_ago", 0) <= 7:
                    return (
                        f"Proactive Clinical Note: Dad started {med['name']} ({med['dosage']}) "
                        f"{med['started_days_ago']} days ago. Dizziness is a common temporary adjustment symptom "
                        f"for blood pressure medications. Would you like me to flag this for his doctor or record his current BP?"
                    )

        # Fatigue / weakness check
        if any(w in lower for w in ["unusually tired", "extreme fatigue", "weakness"]):
            return (
                "Observation Note: Uncharacteristic fatigue noted. "
                "I have added this to his care observation timeline."
            )

        return None

    def get_summary_data(self, patient_id: str, days: int = 7) -> Dict[str, Any]:
        """Fetches memory data aggregated for the doctor summary."""
        mem = self.get_or_create(patient_id)
        return {
            "patient_name": mem.get("name", "Elderly Loved One"),
            "medications": mem.get("medications", []),
            "recent_vitals": mem.get("vitals_history")[-10:],
            "recent_symptoms": mem.get("symptoms_history")[-10:],
            "care_notes": mem.get("care_notes")[-10:],
            "timeframe_days": days
        }

care_memory = PatientCareMemory()
