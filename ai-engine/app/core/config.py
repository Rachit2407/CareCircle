try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "CareCircle AI Engine"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    PORT: int = 8001
    HOST: str = "0.0.0.0"

    # LLM Settings
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: Optional[str] = None

    # Voice (Sarvam)
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_STT_URL: str = "https://api.sarvam.ai/speech-to-text"
    SARVAM_TTS_URL: str = "https://api.sarvam.ai/text-to-speech"

    # MCP Server
    MCP_SERVER_URL: str = "http://localhost:8000/mcp"
    MCP_TRANSPORT: str = "sse"  # or stdio / streamable-http

    # Backend API (for authorization/patient scope verification)
    BACKEND_API_BASE_URL: str = "http://localhost:5000/api/v1"
    INTERNAL_SERVICE_TOKEN: str = "carecircle_internal_secret_token"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
