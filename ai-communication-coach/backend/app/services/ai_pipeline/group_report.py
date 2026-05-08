"""
Group report engine for multi-user room sessions.

Generates group-level analysis from individual participant data:
- Discussion balance (speaking time distribution)
- Dominant speaker detection
- Engagement level
- Teamwork quality
- Team scoring and winner determination
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.services.ai_pipeline.room_analyzer import (
    RoomAnalyzerState,
    get_room_state,
    compute_participant_multimodal,
)
from app.services.ai_pipeline.analyzer import analyze_transcript


@dataclass
class IndividualReport:
    user_id: str
    display_name: str
    confidence_score: float = 0.0
    clarity_score: float = 0.0
    content_score: float = 0.0
    delivery_score: float = 0.0
    overall_score: float = 0.0
    eye_contact_score: float = 0.0
    voice_energy_score: float = 0.0
    engagement_score: float = 0.0
    speaking_time_seconds: float = 0.0
    interruption_count: int = 0
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class GroupMetrics:
    discussion_balance: float = 50.0       # 0-100
    dominant_speaker: str = ""             # user_id
    dominant_speaker_name: str = ""
    engagement_level: str = "moderate"     # low | moderate | high
    teamwork_quality: float = 50.0         # 0-100
    total_duration_seconds: float = 0.0
    speaking_distribution: Dict[str, float] = field(default_factory=dict)


@dataclass
class TeamReport:
    team: str
    team_score: float = 0.0
    members: List[IndividualReport] = field(default_factory=list)


@dataclass
class FullRoomReport:
    room_id: str
    mode: str
    individual_reports: List[IndividualReport] = field(default_factory=list)
    group_metrics: GroupMetrics = field(default_factory=GroupMetrics)
    team_reports: List[TeamReport] = field(default_factory=list)
    winner: Optional[str] = None  # "A" | "B" | "tie"


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, round(v, 2)))


def generate_individual_report(room_id: str, user_id: str) -> IndividualReport:
    """Generate a comprehensive individual report for one participant."""
    state = get_room_state(room_id)
    participant = state.participants.get(user_id)
    if not participant:
        return IndividualReport(user_id=user_id, display_name="Unknown")

    # Get multi-modal scores
    mm = compute_participant_multimodal(room_id, user_id) or {}

    # Analyze full transcript for detailed feedback
    merged = " ".join(participant.transcript_chunks[-20:])
    analysis = analyze_transcript(merged) if merged.strip() else None

    report = IndividualReport(
        user_id=user_id,
        display_name=participant.display_name or "Participant",
        confidence_score=mm.get("confidence_score", 0.0) * 10,  # scale 0-10 → 0-100
        clarity_score=analysis.clarity_score if analysis else 0.0,
        content_score=analysis.content_score if analysis else 0.0,
        delivery_score=analysis.delivery_score if analysis else 0.0,
        overall_score=analysis.overall_score if analysis else 0.0,
        eye_contact_score=mm.get("face_score", 0.0),
        voice_energy_score=mm.get("voice_score", 0.0),
        engagement_score=_engagement_to_score(mm.get("engagement", "moderate")),
        speaking_time_seconds=round(participant.speaking_time_seconds, 1),
        interruption_count=participant.interruption_count,
        strengths=analysis.strengths if analysis else ["Participated in the discussion"],
        weaknesses=analysis.weaknesses if analysis else ["Insufficient speech for detailed analysis"],
        suggestions=mm.get("suggestions", ["Speak more to enable deeper analysis"]),
    )

    # Enrich with group-context suggestions
    if participant.interruption_count > 3:
        report.suggestions.append("You interrupted others frequently — practice active listening")
    if participant.speaking_time_seconds < 30:
        report.suggestions.append("Try to contribute more to the discussion")

    return report


def _engagement_to_score(level: str) -> float:
    return {"high": 85.0, "moderate": 55.0, "low": 25.0}.get(level, 50.0)


def generate_group_metrics(room_id: str) -> GroupMetrics:
    """Generate group-level metrics from all participant data."""
    state = get_room_state(room_id)
    participants = state.participants

    if not participants:
        return GroupMetrics()

    # Speaking time distribution
    speaking_times = {
        uid: round(p.speaking_time_seconds, 1)
        for uid, p in participants.items()
    }
    total_speaking = sum(speaking_times.values()) or 1.0

    # Discussion balance: how evenly is speaking time distributed?
    # Perfect balance = each person speaks total/n seconds
    n = len(participants)
    ideal = total_speaking / max(n, 1)
    deviations = [abs(t - ideal) for t in speaking_times.values()]
    avg_deviation = sum(deviations) / max(len(deviations), 1)
    balance = _clamp(100.0 - (avg_deviation / max(ideal, 1)) * 100.0)

    # Dominant speaker
    dominant_uid = max(speaking_times, key=speaking_times.get) if speaking_times else ""
    dominant_name = participants[dominant_uid].display_name if dominant_uid in participants else ""

    # Engagement level (based on total words and speaking participation)
    total_words = sum(p.word_count for p in participants.values())
    active_speakers = sum(1 for p in participants.values() if p.speaking_time_seconds > 10)

    if total_words > 200 and active_speakers >= n * 0.7:
        engagement = "high"
    elif total_words > 80 or active_speakers >= n * 0.5:
        engagement = "moderate"
    else:
        engagement = "low"

    # Teamwork quality
    total_interruptions = sum(p.interruption_count for p in participants.values())
    interrupt_penalty = min(30.0, total_interruptions * 3.0)
    participation_bonus = (active_speakers / max(n, 1)) * 40.0
    teamwork = _clamp(50.0 + participation_bonus - interrupt_penalty + (balance * 0.2))

    duration = max(0.0, (max(p.speaking_time_seconds for p in participants.values()) if participants else 0.0))

    return GroupMetrics(
        discussion_balance=balance,
        dominant_speaker=dominant_uid,
        dominant_speaker_name=dominant_name,
        engagement_level=engagement,
        teamwork_quality=teamwork,
        total_duration_seconds=round(duration, 1),
        speaking_distribution={
            uid: round(t / total_speaking * 100, 1) for uid, t in speaking_times.items()
        },
    )


def generate_team_reports(room_id: str) -> tuple[list[TeamReport], str | None]:
    """Generate team comparison reports for team mode."""
    state = get_room_state(room_id)
    teams: Dict[str, list[str]] = {}

    for uid, p in state.participants.items():
        team = p.display_name  # We'll use the actual team field
        # Get team from participant state
        team_label = "A"  # Default
        # Try to determine team from the participant data
        if hasattr(p, 'team') and p.team:
            team_label = p.team
        teams.setdefault(team_label, []).append(uid)

    if len(teams) < 2:
        return [], None

    team_reports = []
    for team_label, members in sorted(teams.items()):
        reports = [generate_individual_report(room_id, uid) for uid in members]
        team_score = sum(r.overall_score for r in reports) / max(len(reports), 1)
        team_reports.append(TeamReport(team=team_label, team_score=round(team_score, 1), members=reports))

    # Determine winner
    if len(team_reports) >= 2:
        scores = [(tr.team, tr.team_score) for tr in team_reports]
        scores.sort(key=lambda x: x[1], reverse=True)
        if abs(scores[0][1] - scores[1][1]) < 3.0:
            winner = "tie"
        else:
            winner = scores[0][0]
    else:
        winner = None

    return team_reports, winner


def generate_full_report(room_id: str, mode: str = "practice") -> FullRoomReport:
    """Generate the complete room report with individual + group + team analysis."""
    state = get_room_state(room_id)

    individual_reports = [
        generate_individual_report(room_id, uid)
        for uid in state.participants
    ]
    group_metrics = generate_group_metrics(room_id)

    team_reports = []
    winner = None
    if mode in ("team_2v2", "team_3v3"):
        team_reports, winner = generate_team_reports(room_id)

    return FullRoomReport(
        room_id=room_id,
        mode=mode,
        individual_reports=individual_reports,
        group_metrics=group_metrics,
        team_reports=team_reports,
        winner=winner,
    )
