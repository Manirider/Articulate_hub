from pydantic import BaseModel


class AnalyticsOverviewResponse(BaseModel):
    sessions_completed: int
    average_score: float
    level: int
    xp: int
    streak_days: int
    score_trend: list[float]
    leaderboard_rank_hint: int
    avg_clarity: float = 0.0
    avg_confidence: float = 0.0
    avg_content: float = 0.0
    avg_delivery: float = 0.0


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    xp: int
    level: int
    sessions: int


class LeaderboardResponse(BaseModel):
    leaderboard: list[LeaderboardEntry]
