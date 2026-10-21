from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AssistantMessageRequest(BaseModel):
    message: str = Field(..., description="User's natural language voice transcript or chat text")
    conversationId: Optional[str] = Field(None, description="Client or server issued session/conversation ID")
    patientId: Optional[str] = Field(None, description="Patient context ID (verified against trusted backend scope)")
    caregiverId: Optional[str] = Field(None, description="Caregiver user ID sending the message")


class VoiceSpeakRequest(BaseModel):
    text: str = Field(..., description="Grounded response text to convert to audio")
    languageCode: str = Field("hi-IN", description="Language code for Sarvam TTS (e.g., hi-IN, en-IN)")
    speaker: str = Field("meera", description="Voice profile/speaker name")


class ActionConfirmationRequest(BaseModel):
    actionId: str = Field(..., description="ID of the pending action to confirm or reject")
    confirmed: bool = Field(..., description="True to execute, False to cancel")
    conversationId: str = Field(..., description="Conversation session ID")


class DoctorSummaryRequest(BaseModel):
    patientId: str = Field("patient_1", description="Patient ID for whom the summary is requested")
    timeframeDays: int = Field(7, description="Number of days to summarize (default 7)")

