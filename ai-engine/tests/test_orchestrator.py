try:
    import pytest
except ImportError:
    pytest = None
import asyncio
from app.services.policy import MedicalSafetyPolicy
from app.services.orchestrator import orchestrator
from app.schemas.requests import AssistantMessageRequest


async def test_emergency_detection():
    text = "My father has sudden severe chest pain and can't breathe"
    notice = MedicalSafetyPolicy.check_emergency(text)
    assert notice is not None
    assert "CRITICAL NOTICE" in notice
    assert "emergency services" in notice


async def test_prohibit_clinical_prescription():
    text = "Please change the dosage and prescribe 20mg of Amlodipine"
    notice = MedicalSafetyPolicy.check_medical_advice(text)
    assert notice is not None
    assert "cannot modify medication dosages" in notice


async def test_create_care_task_flow():
    req = AssistantMessageRequest(
        message="Remind my father to take his blood pressure medicine at 8 PM",
        patientId="pat_123"
    )
    res = await orchestrator.process_message(req)
    assert res.actions is not None
    assert len(res.actions) > 0
    assert res.actions[0].tool == "create_care_task"
    assert res.actions[0].status == "succeeded"
    assert "8 PM" in res.reply or "created the reminder" in res.reply


async def test_vital_recording_flow():
    req = AssistantMessageRequest(
        message="Dad's blood pressure is 135/88 today",
        patientId="pat_123"
    )
    res = await orchestrator.process_message(req)
    assert len(res.actions) > 0
    assert res.actions[0].tool == "add_health_reading"
    assert res.actions[0].status == "succeeded"
    assert "135/88" in res.reply


async def test_confirmation_gating_for_high_priority_alert():
    req = AssistantMessageRequest(
        message="Send emergency alert to all family members",
        patientId="pat_123"
    )
    res = await orchestrator.process_message(req)
    assert res.needsConfirmation is True
    assert res.pendingAction is not None
