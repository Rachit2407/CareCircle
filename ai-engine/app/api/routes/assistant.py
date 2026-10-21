from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from app.schemas.requests import AssistantMessageRequest, VoiceSpeakRequest, ActionConfirmationRequest, DoctorSummaryRequest
from app.schemas.responses import AssistantMessageResponse, DoctorSummaryResponse
from app.services.orchestrator import orchestrator
from app.services.voice import voice_service
from app.services.summarizer import clinical_summarizer

router = APIRouter(prefix="/api/v1/assistant", tags=["Assistant"])


@router.post("/message", response_model=AssistantMessageResponse)
async def handle_message(req: AssistantMessageRequest):
    """
    Main Assistant Endpoint:
    Accepts text or voice transcripts, executes safety checks, orchestrates LLM,
    calls approved MCP tools, and returns grounded confirmed response.
    """
    return await orchestrator.process_message(req)


@router.post("/actions/confirm", response_model=AssistantMessageResponse)
async def confirm_action(req: ActionConfirmationRequest):
    """
    Confirm or reject a high-priority / sensitive pending action.
    """
    return await orchestrator.execute_pending_action(req.actionId, req.confirmed)


@router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """
    Transcribes audio speech using Sarvam STT.
    """
    audio_bytes = await file.read()
    transcript = await voice_service.transcribe_audio(audio_bytes, file.filename or "audio.wav")
    return {"transcript": transcript}


@router.post("/voice/speak")
async def speak_text(req: VoiceSpeakRequest):
    """
    Converts grounded text response to speech audio using Sarvam TTS.
    """
    audio_content = await voice_service.synthesize_speech(req.text, req.languageCode, req.speaker)
    if audio_content:
        return Response(content=audio_content, media_type="audio/wav")
    return {"message": "Audio synthesis skipped (no API key configured or fallback active)"}


@router.post("/summarize", response_model=DoctorSummaryResponse)
async def generate_clinical_summary(req: DoctorSummaryRequest):
    """
    Generates a concise, evidence-based clinical summary from past caregiver observations,
    vitals, and medication adherence history. Ready for geriatricians and family doctor visits.
    """
    result = clinical_summarizer.generate_doctor_summary(req.patientId, req.timeframeDays)
    return DoctorSummaryResponse(**result)

