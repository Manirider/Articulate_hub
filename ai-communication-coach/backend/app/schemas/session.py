from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    module_name: str
    submodule_name: str
    topic: str = Field(min_length=3, max_length=255)


class SessionResponse(BaseModel):
    id: str
    module_name: str
    submodule_name: str
    topic: str
    status: str


class TranscriptChunkRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    speaker: str = "user"


class SessionCompleteResponse(BaseModel):
    session_id: str
    clarity_score: float
    confidence_score: float
    content_score: float
    delivery_score: float
    overall_score: float
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    explainability: str
