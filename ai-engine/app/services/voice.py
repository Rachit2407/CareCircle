import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger

class VoiceService:
    """
    Handles speech-to-text (STT) and text-to-speech (TTS) through Sarvam AI.
    Features graceful fallbacks when keys are not configured or rate limits are hit.
    """

    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.stt_url = settings.SARVAM_STT_URL
        self.tts_url = settings.SARVAM_TTS_URL

    async def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """Sends audio bytes to Sarvam STT."""
        if not self.api_key or self.api_key == "your_sarvam_api_key_here":
            logger.warning("Sarvam API key not set; returning simulated transcript.")
            return "Remind my father to take his blood pressure medicine at 8 PM"

        try:
            files = {"file": (filename, audio_bytes, "audio/wav")}
            headers = {"api-subscription-key": self.api_key}

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.stt_url, headers=headers, files=files)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("transcript", "")
                else:
                    logger.error("Sarvam STT failed with code %d: %s", res.status_code, res.text)
        except Exception as e:
            logger.error("Sarvam STT error: %s", str(e))

        return "Could not transcribe audio."

    async def synthesize_speech(self, text: str, language_code: str = "hi-IN", speaker: str = "meera") -> Optional[bytes]:
        """Synthesizes grounded text to audio bytes via Sarvam TTS."""
        if not self.api_key or self.api_key == "your_sarvam_api_key_here":
            logger.warning("Sarvam API key not set; TTS synthesis skipped.")
            return None

        try:
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "inputs": [text],
                "target_language_code": language_code,
                "speaker": speaker,
                "model": "bulbul:v1"
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.tts_url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.content
        except Exception as e:
            logger.error("Sarvam TTS error: %s", str(e))

        return None

voice_service = VoiceService()
