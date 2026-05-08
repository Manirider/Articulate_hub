from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID

class TeamBase(BaseModel):
    name: str = Field(..., max_length=120)
    description: str | None = Field(None, max_length=500)

class TeamCreate(TeamBase):
    pass

class TeamMemberBase(BaseModel):
    user_id: UUID
    role: str

class TeamMemberResponse(TeamMemberBase):
    id: UUID
    team_id: UUID
    joined_at: datetime
    
    # It would be nice to have user info here as well (full_name, email)
    user_name: str | None = None
    user_email: str | None = None

    model_config = ConfigDict(from_attributes=True)

class TeamResponse(TeamBase):
    id: UUID
    invite_code: str
    created_at: datetime
    members: list[TeamMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)

class TeamJoin(BaseModel):
    invite_code: str

class TeamMemberAnalytics(BaseModel):
    user_id: UUID
    user_name: str | None = None
    user_email: str | None = None
    role: str
    joined_at: datetime
    sessions_count: int
    average_score: float | None = None

class TeamAnalytics(BaseModel):
    average_score: float
    average_clarity: float
    average_confidence: float
    average_pacing: float
    average_vision: float
    total_sessions: int
    member_count: int
    members: list[TeamMemberAnalytics] = []
