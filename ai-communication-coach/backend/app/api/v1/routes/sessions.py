import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.ai_feedback import AIFeedback
from app.models.performance_history import PerformanceHistory
from app.models.score import Score
from app.models.session import Session
from app.models.transcript import Transcript
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.session import (
    CreateSessionRequest,
    SessionCompleteResponse,
    SessionResponse,
    TranscriptChunkRequest,
)
from app.services.agents.orchestrator import run_multi_agent_pipeline

router = APIRouter()


@router.post("", response_model=SessionResponse)
async def create_session(
    payload: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = Session(
        user_id=current_user.id,
        module_name=payload.module_name,
        submodule_name=payload.submodule_name,
        topic=payload.topic,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse(
        id=str(session.id),
        module_name=session.module_name,
        submodule_name=session.submodule_name,
        topic=session.topic,
        status=session.status,
    )


@router.post("/{session_id}/transcript")
async def append_transcript(
    session_id: uuid.UUID,
    payload: TranscriptChunkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id, Session.user_id == current_user.id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = Transcript(session_id=session.id, content=payload.content, speaker=payload.speaker)
    db.add(transcript)
    await db.commit()

    return {"message": "Transcript chunk recorded"}


@router.post("/{session_id}/complete", response_model=SessionCompleteResponse)
async def complete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
        .with_for_update()
    )
    session = session_result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Guard: prevent double-completion (idempotent — return existing scores)
    if session.status == "completed":
        existing_score = await db.execute(select(Score).where(Score.session_id == session.id))
        existing = existing_score.scalar_one_or_none()
        existing_fb = await db.execute(select(AIFeedback).where(AIFeedback.session_id == session.id))
        fb = existing_fb.scalar_one_or_none()
        if existing and fb:
            return SessionCompleteResponse(
                session_id=str(session.id),
                clarity_score=existing.clarity_score,
                confidence_score=existing.confidence_score,
                content_score=existing.content_score,
                delivery_score=existing.delivery_score,
                overall_score=existing.overall_score,
                strengths=fb.strengths.split("\n"),
                weaknesses=fb.weaknesses.split("\n"),
                improvements=fb.improvements.split("\n"),
                explainability=fb.explainability,
            )

    transcript_result = await db.execute(select(Transcript).where(Transcript.session_id == session.id).order_by(Transcript.created_at.asc()))
    transcript_rows = transcript_result.scalars().all()
    merged_transcript = " ".join(row.content for row in transcript_rows)

    agent_output = await run_multi_agent_pipeline(merged_transcript)
    analysis = agent_output["analysis"]
    feedback = agent_output["feedback"]

    score = Score(
        session_id=session.id,
        clarity_score=analysis.clarity_score,
        confidence_score=analysis.confidence_score,
        content_score=analysis.content_score,
        delivery_score=analysis.delivery_score,
        overall_score=analysis.overall_score,
    )
    db.add(score)

    ai_feedback = AIFeedback(
        session_id=session.id,
        strengths="\n".join(feedback["strengths"]),
        weaknesses="\n".join(feedback["weaknesses"]),
        improvements="\n".join(feedback["improvements"]),
        explainability=analysis.explainability,
    )
    db.add(ai_feedback)

    perf = PerformanceHistory(
        user_id=current_user.id,
        session_id=session.id,
        overall_score=analysis.overall_score,
        clarity_score=analysis.clarity_score,
        confidence_score=analysis.confidence_score,
        content_score=analysis.content_score,
        delivery_score=analysis.delivery_score,
    )
    db.add(perf)

    progress_result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == current_user.id, UserProgress.module_name == session.module_name)
    )
    progress = progress_result.scalar_one_or_none()
    if progress is None:
        progress = UserProgress(user_id=current_user.id, module_name=session.module_name, completion_percent=25)
        db.add(progress)
    else:
        progress.completion_percent = min(100.0, progress.completion_percent + 10)

    current_user.xp += int(analysis.overall_score)
    current_user.level = max(1, current_user.xp // 200 + 1)
    current_user.streak_days = min(365, current_user.streak_days + 1)

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)

    await db.commit()

    return SessionCompleteResponse(
        session_id=str(session.id),
        clarity_score=analysis.clarity_score,
        confidence_score=analysis.confidence_score,
        content_score=analysis.content_score,
        delivery_score=analysis.delivery_score,
        overall_score=analysis.overall_score,
        strengths=feedback["strengths"],
        weaknesses=feedback["weaknesses"],
        improvements=feedback["improvements"],
        explainability=analysis.explainability,
    )


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile):
    """Whisper-compatible STT endpoint.

    In local/dev mode this returns a placeholder. The frontend uses the
    browser's Web Speech API for real-time STT, so this endpoint serves
    as a fallback for environments without browser speech support.

    For production: integrate OpenAI Whisper or whisper.cpp here.
    """
    content = await file.read()
    if not content:
        return {"text": "", "engine": "none", "note": "Empty audio payload"}

    size_kb = round(len(content) / 1024, 1)
    return {
        "text": "[Server-side transcription placeholder — use browser Speech API for real-time STT]",
        "engine": "placeholder",
        "audio_size_kb": size_kb,
        "note": "Replace with Whisper model runtime for production-grade STT.",
    }
