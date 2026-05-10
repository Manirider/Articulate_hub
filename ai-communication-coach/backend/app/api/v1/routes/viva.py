"""Viva/Q&A Module API Routes

Provides AI-powered viva question generation and answer evaluation.
REQUIRES: OpenAI API key configured.
"""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI, OpenAIError

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.session import Session
from app.models.transcript import Transcript
from app.models.user import User
from app.services.ai_diagnostics import ai_diagnostics

router = APIRouter(tags=["viva"])


class VivaQuestionsResponse(BaseModel):
    questions: list[str] = Field(..., description="List of AI-generated viva questions")
    ai_model: str | None = Field(None, description="AI model used for generation")
    processing_time_ms: float | None = None


class VivaAnswerRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000, description="The viva question asked")
    answer: str = Field(..., min_length=10, max_length=10000, description="User's transcribed answer")


class VivaFeedbackResponse(BaseModel):
    content_quality_score: float = Field(..., ge=0, le=100, description="Quality of content (0-100)")
    confidence_score: float = Field(..., ge=0, le=100, description="Perceived confidence (0-100)")
    clarity_score: float = Field(..., ge=0, le=100, description="Answer clarity (0-100)")
    feedback: str = Field(..., description="Actionable coaching feedback")
    ai_model: str | None = None
    processing_time_ms: float | None = None


class AIUnavailableError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_SERVICE_UNAVAILABLE",
                "message": "Viva/Q&A features require OpenAI API key. Please configure OPENAI_API_KEY.",
                "docs_url": "/docs#ai-configuration"
            }
        )


@router.post(
    "/{session_id}/viva_questions",
    response_model=VivaQuestionsResponse,
    summary="Generate AI viva questions from session transcript",
    description="Analyzes session transcript and generates 3 challenging follow-up questions. Requires OpenAI API key."
)
async def generate_viva_questions(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session exists and belongs to user
    session_result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get session transcript
    transcript_result = await db.execute(
        select(Transcript)
        .where(Transcript.session_id == session_id)
        .order_by(Transcript.created_at.asc())
    )
    transcript_rows = transcript_result.scalars().all()
    merged_transcript = " ".join(row.content for row in transcript_rows)

    if not merged_transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript found for this session. Complete a practice session first."
        )

    # REQUIRE AI - no silent fallback
    if not ai_diagnostics.is_ai_available():
        raise AIUnavailableError()

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        import time
        start_time = time.time()

        prompt = (
            f"Based on the following presentation transcript, generate 3 challenging "
            f"follow-up viva (Q&A) questions to test the speaker's knowledge and composure. "
            f"Questions should be specific to the content and require deep understanding.\n\n"
            f"Transcript: {merged_transcript[:4000]}\n\n"
            f"Output JSON with a single key 'questions' containing an array of 3 strings."
        )

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert academic examiner. Generate specific, challenging questions. Output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=500
        )

        processing_time = (time.time() - start_time) * 1000
        data = json.loads(response.choices[0].message.content)
        questions = data.get("questions", [])

        if not questions or len(questions) == 0:
            raise HTTPException(
                status_code=500,
                detail="AI returned empty questions. Please try again."
            )

        return VivaQuestionsResponse(
            questions=questions,
            ai_model=response.model,
            processing_time_ms=round(processing_time, 2)
        )

    except OpenAIError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "AI_PROCESSING_ERROR",
                "message": f"OpenAI API error: {str(e)}",
                "type": type(e).__name__
            }
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned invalid JSON format. Please try again."
        )


@router.post(
    "/{session_id}/viva_feedback",
    response_model=VivaFeedbackResponse,
    summary="Evaluate viva answer with AI",
    description="Evaluates user's answer to a viva question. Returns scores and coaching feedback. Requires OpenAI API key."
)
async def evaluate_viva_answer(
    session_id: uuid.UUID,
    payload: VivaAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session exists
    session_result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # REQUIRE AI - no silent fallback, no heuristic scoring
    if not ai_diagnostics.is_ai_available():
        raise AIUnavailableError()

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        import time
        start_time = time.time()

        prompt = (
            f"You are a strict academic examiner evaluating a viva response.\n\n"
            f"Question: {payload.question}\n\n"
            f"Candidate's Answer: {payload.answer}\n\n"
            f"Evaluate and output JSON with exactly these keys:\n"
            f"- 'content_quality_score' (0-100 float): Depth, accuracy, relevance\n"
            f"- 'confidence_score' (0-100 float): Perceived certainty and assertiveness\n"
            f"- 'clarity_score' (0-100 float): Structure, coherence, articulation\n"
            f"- 'feedback' (string): 2-3 sentences of specific, actionable coaching advice\n\n"
            f"Be rigorous but constructive. Score below 60 for weak answers."
        )

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert academic examiner. Be rigorous in scoring. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=400
        )

        processing_time = (time.time() - start_time) * 1000
        data = json.loads(response.choices[0].message.content)

        # Validate and clamp scores
        content_score = max(0.0, min(100.0, float(data.get("content_quality_score", 50.0))))
        confidence_score = max(0.0, min(100.0, float(data.get("confidence_score", 50.0))))
        clarity_score = max(0.0, min(100.0, float(data.get("clarity_score", 50.0))))

        feedback = data.get("feedback", "").strip()
        if not feedback:
            feedback = "Practice structuring your answers with clear points and supporting evidence."

        return VivaFeedbackResponse(
            content_quality_score=round(content_score, 2),
            confidence_score=round(confidence_score, 2),
            clarity_score=round(clarity_score, 2),
            feedback=feedback,
            ai_model=response.model,
            processing_time_ms=round(processing_time, 2)
        )

    except OpenAIError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "AI_PROCESSING_ERROR",
                "message": f"OpenAI API error: {str(e)}",
                "type": type(e).__name__
            }
        )
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INVALID_AI_RESPONSE",
                "message": f"Failed to parse AI response: {str(e)}"
            }
        )
