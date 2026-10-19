from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ToolActionExecution(BaseModel):
    tool: str = Field(..., description="Name of the MCP tool called")
    status: str = Field(..., description="'succeeded', 'failed', 'pending_confirmation', 'uncertain'")
    arguments: Optional[Dict[str, Any]] = None
    resultId: Optional[str] = None
    error: Optional[str] = None


class PendingAction(BaseModel):
    actionId: str
    tool: str
    description: str
    arguments: Dict[str, Any]
    expiresAt: Optional[str] = None


class AssistantMessageResponse(BaseModel):
    reply: str = Field(..., description="Grounded, safe natural language reply for the user")
    actions: List[ToolActionExecution] = Field(default_factory=list, description="List of MCP tool actions taken or proposed")
    needsConfirmation: bool = Field(False, description="True if action is destructive/consequential and requires explicit user confirmation")
    pendingAction: Optional[PendingAction] = None
    conversationId: str = Field(..., description="Session identifier for multi-turn context")
    requestId: str = Field(..., description="Unique request tracing ID")


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    mcpConnected: bool
