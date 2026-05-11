"""Tests for database models and schema validation.

Covers:
- Pydantic schema validation rules
- Model field constraints
- Auth schema edge cases
"""

import pytest
from pydantic import ValidationError

from app.schemas.auth import SignUpRequest, LoginRequest
from app.schemas.session import (
    CreateSessionRequest,
    TranscriptChunkRequest,
    SessionCompleteResponse,
)


class TestSignUpSchema:
    """Tests for signup request validation."""

    def test_valid_signup(self):
        req = SignUpRequest(
            email="test@example.com",
            full_name="Test User",
            password="StrongPass123"
        )
        assert req.email == "test@example.com"
        assert req.full_name == "Test User"

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            SignUpRequest(
                email="not-an-email",
                full_name="Test",
                password="StrongPass123"
            )

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError):
            SignUpRequest(
                email="test@example.com",
                full_name="Test",
                password="short"
            )

    def test_empty_full_name_rejected(self):
        with pytest.raises(ValidationError):
            SignUpRequest(
                email="test@example.com",
                full_name="",
                password="StrongPass123"
            )


class TestLoginSchema:
    """Tests for login request validation."""

    def test_valid_login(self):
        req = LoginRequest(
            email="test@example.com",
            password="password123"
        )
        assert req.email == "test@example.com"

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="invalid", password="password123")


class TestCreateSessionSchema:
    """Tests for session creation validation."""

    def test_valid_session(self):
        req = CreateSessionRequest(
            module_name="Debate",
            submodule_name="Practice",
            topic="AI Ethics Discussion"
        )
        assert req.module_name == "Debate"

    def test_topic_too_short(self):
        with pytest.raises(ValidationError):
            CreateSessionRequest(
                module_name="Debate",
                submodule_name="Practice",
                topic="AB"  # Less than 3 chars
            )

    def test_topic_too_long(self):
        with pytest.raises(ValidationError):
            CreateSessionRequest(
                module_name="Debate",
                submodule_name="Practice",
                topic="x" * 256  # Over 255 chars
            )


class TestTranscriptChunkSchema:
    """Tests for transcript chunk validation."""

    def test_valid_chunk(self):
        req = TranscriptChunkRequest(content="Hello world", speaker="user")
        assert req.content == "Hello world"
        assert req.speaker == "user"

    def test_default_speaker(self):
        req = TranscriptChunkRequest(content="Hello world")
        assert req.speaker == "user"

    def test_empty_content_rejected(self):
        with pytest.raises(ValidationError):
            TranscriptChunkRequest(content="")

    def test_too_long_content_rejected(self):
        with pytest.raises(ValidationError):
            TranscriptChunkRequest(content="x" * 8001)


class TestSessionCompleteResponse:
    """Tests for session completion response schema."""

    def test_valid_response(self):
        resp = SessionCompleteResponse(
            session_id="test-id",
            clarity_score=75.0,
            confidence_score=80.0,
            content_score=70.0,
            delivery_score=65.0,
            overall_score=72.5,
            strengths=["Good clarity"],
            weaknesses=["Needs more depth"],
            improvements=["Add examples"],
            explainability="Score based on 100 words.",
        )
        assert resp.is_demo_mode is False  # Default

    def test_demo_mode_flag(self):
        resp = SessionCompleteResponse(
            session_id="test-id",
            clarity_score=50.0,
            confidence_score=50.0,
            content_score=50.0,
            delivery_score=50.0,
            overall_score=50.0,
            strengths=["[Demo Mode] Clear voice"],
            weaknesses=["[Demo Mode] AI unavailable"],
            improvements=["Configure OPENAI_API_KEY"],
            explainability="Heuristic scoring.",
            is_demo_mode=True,
        )
        assert resp.is_demo_mode is True


class TestVivaSchemas:
    """Tests for Viva request/response schemas."""

    def test_viva_answer_request_valid(self):
        from app.api.v1.routes.viva import VivaAnswerRequest
        req = VivaAnswerRequest(
            question="What is the main topic of your presentation?",
            answer="My presentation focused on the impact of AI on education and training."
        )
        assert len(req.question) > 5
        assert len(req.answer) > 10

    def test_viva_answer_request_too_short(self):
        from app.api.v1.routes.viva import VivaAnswerRequest
        with pytest.raises(ValidationError):
            VivaAnswerRequest(question="Hi", answer="No")

    def test_viva_feedback_response(self):
        from app.api.v1.routes.viva import VivaFeedbackResponse
        resp = VivaFeedbackResponse(
            content_quality_score=75.0,
            confidence_score=80.0,
            clarity_score=70.0,
            feedback="Good answer with room for improvement."
        )
        assert resp.ai_model is None
        assert resp.processing_time_ms is None
