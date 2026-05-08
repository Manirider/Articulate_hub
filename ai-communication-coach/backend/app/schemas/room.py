"""Pydantic schemas for room endpoints."""

from pydantic import BaseModel, Field


class CreateRoomRequest(BaseModel):
    title: str = Field(default="Practice Room", max_length=200)
    mode: str = Field(default="practice")  # practice | team_2v2 | team_3v3
    max_participants: int = Field(default=6, ge=2, le=6)


class JoinRoomRequest(BaseModel):
    code: str = Field(min_length=4, max_length=10)


class RoomResponse(BaseModel):
    id: str
    code: str
    title: str
    mode: str
    max_participants: int
    status: str
    host_user_id: str
    participant_count: int = 0


class ParticipantResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    team: str | None = None
    role: str


class RoomDetailResponse(BaseModel):
    id: str
    code: str
    title: str
    mode: str
    max_participants: int
    status: str
    host_user_id: str
    participants: list[ParticipantResponse]


class IndividualReportResponse(BaseModel):
    user_id: str
    display_name: str
    confidence_score: float
    clarity_score: float
    content_score: float
    delivery_score: float
    overall_score: float
    eye_contact_score: float
    voice_energy_score: float
    engagement_score: float
    speaking_time_seconds: float
    interruption_count: float
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]


class GroupMetricsResponse(BaseModel):
    discussion_balance: float
    dominant_speaker: str
    dominant_speaker_name: str
    engagement_level: str
    teamwork_quality: float
    total_duration_seconds: float
    speaking_distribution: dict[str, float]


class TeamReportResponse(BaseModel):
    team: str
    team_score: float
    members: list[IndividualReportResponse]


class RoomReportResponse(BaseModel):
    room_id: str
    mode: str
    individual_reports: list[IndividualReportResponse]
    group_metrics: GroupMetricsResponse
    team_reports: list[TeamReportResponse] | None = None
    winner: str | None = None  # "A" | "B" | "tie" for team mode
