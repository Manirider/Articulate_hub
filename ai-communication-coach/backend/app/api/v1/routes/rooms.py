"""Room management API routes."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.room import Room
from app.models.room_participant import RoomParticipant
from app.models.room_report import RoomReport
from app.models.user import User
from app.schemas.room import (
    CreateRoomRequest,
    JoinRoomRequest,
    RoomResponse,
    RoomDetailResponse,
    ParticipantResponse,
    RoomReportResponse,
    IndividualReportResponse,
    GroupMetricsResponse,
    TeamReportResponse,
)
from app.services.ai_pipeline.group_report import generate_full_report
from app.services.ai_pipeline.room_analyzer import get_room_state, cleanup_room_state

router = APIRouter()


@router.post("", response_model=RoomResponse)
async def create_room(
    payload: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new room and add the creator as host."""
    room = Room(
        host_user_id=current_user.id,
        title=payload.title,
        mode=payload.mode,
        max_participants=payload.max_participants,
    )
    db.add(room)
    await db.flush()

    # Add creator as host participant
    participant = RoomParticipant(
        room_id=room.id,
        user_id=current_user.id,
        display_name=current_user.full_name,
        role="host",
        team="A" if payload.mode != "practice" else None,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(room)

    return RoomResponse(
        id=str(room.id),
        code=room.code,
        title=room.title,
        mode=room.mode,
        max_participants=room.max_participants,
        status=room.status,
        host_user_id=str(room.host_user_id),
        participant_count=1,
    )


@router.post("/join", response_model=RoomDetailResponse)
async def join_room(
    payload: JoinRoomRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join an existing room by code."""
    result = await db.execute(
        select(Room).where(Room.code == payload.code.upper(), Room.status.in_(["waiting", "active"]))
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or already completed")

    # Check if already in room
    existing = await db.execute(
        select(RoomParticipant).where(
            RoomParticipant.room_id == room.id,
            RoomParticipant.user_id == current_user.id,
            RoomParticipant.left_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        pass  # Already joined — just return details
    else:
        # Check capacity
        count_result = await db.execute(
            select(sa_func.count(RoomParticipant.id)).where(
                RoomParticipant.room_id == room.id,
                RoomParticipant.left_at.is_(None),
            )
        )
        count = count_result.scalar() or 0
        if count >= room.max_participants:
            raise HTTPException(status_code=400, detail="Room is full")

        # Auto-assign team for team modes
        team = None
        if room.mode in ("team_2v2", "team_3v3"):
            team = "B" if count % 2 == 1 else "A"

        participant = RoomParticipant(
            room_id=room.id,
            user_id=current_user.id,
            display_name=current_user.full_name,
            role="participant",
            team=team,
        )
        db.add(participant)
        await db.commit()

    return await _get_room_detail(room.id, db)


@router.get("/{room_id}", response_model=RoomDetailResponse)
async def get_room(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get room details including participants."""
    return await _get_room_detail(room_id, db)


@router.post("/{room_id}/start")
async def start_room(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Host starts the session."""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.host_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can start the session")
    if room.status != "waiting":
        raise HTTPException(status_code=400, detail="Room already started or completed")

    room.status = "active"
    room.started_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Session started", "room_id": str(room_id)}


@router.post("/{room_id}/complete")
async def complete_room(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete the session, generate reports."""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "completed":
        return {"message": "Already completed", "room_id": str(room_id)}

    room.status = "completed"
    room.completed_at = datetime.now(timezone.utc)

    # Generate full report
    report = generate_full_report(str(room_id), room.mode)

    # Persist individual reports
    for ir in report.individual_reports:
        db_report = RoomReport(
            room_id=room.id,
            report_type="individual",
            user_id=uuid.UUID(ir.user_id) if ir.user_id and len(ir.user_id) > 10 else None,
            confidence_score=ir.confidence_score,
            clarity_score=ir.clarity_score,
            content_score=ir.content_score,
            delivery_score=ir.delivery_score,
            overall_score=ir.overall_score,
            eye_contact_score=ir.eye_contact_score,
            voice_energy_score=ir.voice_energy_score,
            engagement_score=ir.engagement_score,
            speaking_time_seconds=ir.speaking_time_seconds,
            interruption_count=ir.interruption_count,
            strengths=ir.strengths,
            weaknesses=ir.weaknesses,
            suggestions=ir.suggestions,
        )
        db.add(db_report)

    # Persist group report
    group_report = RoomReport(
        room_id=room.id,
        report_type="group",
        overall_score=report.group_metrics.teamwork_quality,
        group_metrics={
            "discussion_balance": report.group_metrics.discussion_balance,
            "dominant_speaker": report.group_metrics.dominant_speaker,
            "dominant_speaker_name": report.group_metrics.dominant_speaker_name,
            "engagement_level": report.group_metrics.engagement_level,
            "teamwork_quality": report.group_metrics.teamwork_quality,
            "total_duration_seconds": report.group_metrics.total_duration_seconds,
            "speaking_distribution": report.group_metrics.speaking_distribution,
        },
    )
    db.add(group_report)

    # XP reward for all participants
    participants_result = await db.execute(
        select(RoomParticipant).where(RoomParticipant.room_id == room.id, RoomParticipant.left_at.is_(None))
    )
    for p in participants_result.scalars().all():
        user_result = await db.execute(select(User).where(User.id == p.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.xp += 50  # Participation XP
            user.level = max(1, user.xp // 200 + 1)

    await db.commit()

    # Cleanup in-memory state
    cleanup_room_state(str(room_id))

    return {"message": "Session completed and reports generated", "room_id": str(room_id)}


@router.get("/{room_id}/report", response_model=RoomReportResponse)
async def get_room_report(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the full report for a completed room."""
    result = await db.execute(
        select(RoomReport).where(RoomReport.room_id == room_id).order_by(RoomReport.created_at)
    )
    reports = result.scalars().all()
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this room")

    # Get participant display names
    part_result = await db.execute(
        select(RoomParticipant).where(RoomParticipant.room_id == room_id)
    )
    participants = {str(p.user_id): p.display_name for p in part_result.scalars().all()}

    # Get room
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()

    individual_reports = []
    group_metrics = None

    for r in reports:
        if r.report_type == "individual" and r.user_id:
            individual_reports.append(IndividualReportResponse(
                user_id=str(r.user_id),
                display_name=participants.get(str(r.user_id), "Participant"),
                confidence_score=r.confidence_score,
                clarity_score=r.clarity_score,
                content_score=r.content_score,
                delivery_score=r.delivery_score,
                overall_score=r.overall_score,
                eye_contact_score=r.eye_contact_score,
                voice_energy_score=r.voice_energy_score,
                engagement_score=r.engagement_score,
                speaking_time_seconds=r.speaking_time_seconds,
                interruption_count=r.interruption_count,
                strengths=r.strengths or [],
                weaknesses=r.weaknesses or [],
                suggestions=r.suggestions or [],
            ))
        elif r.report_type == "group" and r.group_metrics:
            gm = r.group_metrics
            group_metrics = GroupMetricsResponse(
                discussion_balance=gm.get("discussion_balance", 50),
                dominant_speaker=gm.get("dominant_speaker", ""),
                dominant_speaker_name=gm.get("dominant_speaker_name", ""),
                engagement_level=gm.get("engagement_level", "moderate"),
                teamwork_quality=gm.get("teamwork_quality", 50),
                total_duration_seconds=gm.get("total_duration_seconds", 0),
                speaking_distribution=gm.get("speaking_distribution", {}),
            )

    if not group_metrics:
        group_metrics = GroupMetricsResponse(
            discussion_balance=50, dominant_speaker="", dominant_speaker_name="",
            engagement_level="moderate", teamwork_quality=50, total_duration_seconds=0,
            speaking_distribution={},
        )

    return RoomReportResponse(
        room_id=str(room_id),
        mode=room.mode if room else "practice",
        individual_reports=individual_reports,
        group_metrics=group_metrics,
    )


async def _get_room_detail(room_id: uuid.UUID, db: AsyncSession) -> RoomDetailResponse:
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    part_result = await db.execute(
        select(RoomParticipant).where(
            RoomParticipant.room_id == room.id,
            RoomParticipant.left_at.is_(None),
        )
    )
    participants = part_result.scalars().all()

    return RoomDetailResponse(
        id=str(room.id),
        code=room.code,
        title=room.title,
        mode=room.mode,
        max_participants=room.max_participants,
        status=room.status,
        host_user_id=str(room.host_user_id),
        participants=[
            ParticipantResponse(
                id=str(p.id),
                user_id=str(p.user_id),
                display_name=p.display_name,
                team=p.team,
                role=p.role,
            )
            for p in participants
        ],
    )
