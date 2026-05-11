"""Tests for Viva/Q&A Module and AI Pipeline.

These tests verify:
1. Viva endpoints require AI (return 503 when unavailable)
2. AI pipeline components function correctly
3. AI diagnostics properly detect service health
"""

import pytest
import uuid
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from app.api.v1.routes.viva import (
    generate_viva_questions, 
    evaluate_viva_answer, 
    VivaAnswerRequest,
    AIUnavailableError
)
from app.services.ai_pipeline.group_report import generate_full_report
from app.services.ai_pipeline.multimodal_fusion import fuse_scores
from app.services.ai_pipeline.vision_analyzer import VisionMetrics, VoiceMetrics
from app.services.ai_diagnostics import AIDiagnostics, AIServiceStatus
from app.models.user import User


class TestVivaAIRequirements:
    """Tests that Viva module properly requires AI and fails gracefully."""

    @pytest.mark.asyncio
    async def test_viva_questions_returns_503_when_ai_unavailable(self):
        """Test that viva questions endpoint returns 503 when AI is not configured."""
        class MockUser:
            id = uuid.uuid4()
        
        class MockDB:
            async def execute(self, *args, **kwargs):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = MagicMock()
                
                class MockRow:
                    content = "This is a test transcript about AI in education."
                
                class MockScalars:
                    def all(self):
                        return [MockRow()]
                
                mock_result.scalars.return_value = MockScalars()
                return mock_result

        user = MockUser()
        db = MockDB()

        # Mock AI as unavailable
        with patch("app.api.v1.routes.viva.ai_diagnostics") as mock_diag:
            mock_diag.is_ai_available.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await generate_viva_questions(uuid.uuid4(), current_user=user, db=db)
            
            assert exc_info.value.status_code == 503
            assert "AI_SERVICE_UNAVAILABLE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_viva_feedback_returns_503_when_ai_unavailable(self):
        """Test that viva feedback endpoint returns 503 when AI is not configured."""
        class MockUser:
            id = uuid.uuid4()
        
        class MockDB:
            async def execute(self, *args, **kwargs):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = MagicMock()
                return mock_result

        user = MockUser()
        db = MockDB()
        
        ans_req = VivaAnswerRequest(
            question="What is the main topic?", 
            answer="This is my detailed answer about the topic."
        )

        # Mock AI as unavailable
        with patch("app.api.v1.routes.viva.ai_diagnostics") as mock_diag:
            mock_diag.is_ai_available.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await evaluate_viva_answer(uuid.uuid4(), ans_req, current_user=user, db=db)
            
            assert exc_info.value.status_code == 503

    @pytest.mark.asyncio
    async def test_generate_viva_questions_success(self):
        """Test successful viva question generation with mocked OpenAI."""
        class MockUser:
            id = uuid.uuid4()
            full_name = "Tester"
            email = "test@example.com"
        
        class MockDB:
            async def execute(self, *args, **kwargs):
                mock_result = MagicMock()
                # Mock session found
                mock_result.scalar_one_or_none.return_value = MagicMock()
                
                class MockRow:
                    content = "Test content"
                
                class MockScalars:
                    def all(self):
                        return [MockRow()]
                
                mock_result.scalars.return_value = MockScalars()
                return mock_result

        user = MockUser()
        db = MockDB()

        # Mock AI as available and mock OpenAI client
        with patch("app.api.v1.routes.viva.ai_diagnostics") as mock_diag, \
             patch("app.api.v1.routes.viva.AsyncOpenAI") as mock_client_class:
            
            mock_diag.is_ai_available.return_value = True
            
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            
            # Mock successful response
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = '{"questions": ["Q1", "Q2", "Q3"]}'
            mock_response.model = "gpt-3.5-turbo"
            mock_client.chat.completions.create.return_value = mock_response
            
            resp = await generate_viva_questions(uuid.uuid4(), current_user=user, db=db)
            
            assert len(resp.questions) == 3
            assert resp.questions[0] == "Q1"
            assert resp.ai_model == "gpt-3.5-turbo"

    @pytest.mark.asyncio
    async def test_evaluate_viva_answer_success(self):
        """Test successful viva answer evaluation with mocked OpenAI."""
        class MockUser:
            id = uuid.uuid4()
            full_name = "Tester"
        
        class MockDB:
            async def execute(self, *args, **kwargs):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = MagicMock()
                return mock_result

        user = MockUser()
        db = MockDB()
        ans_req = VivaAnswerRequest(
            question="What are the key findings of your study?", 
            answer="A very good answer."
        )

        with patch("app.api.v1.routes.viva.ai_diagnostics") as mock_diag, \
             patch("app.api.v1.routes.viva.AsyncOpenAI") as mock_client_class:
            
            mock_diag.is_ai_available.return_value = True
            
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            
            # Mock successful response
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps({
                "content_quality_score": 85.0,
                "confidence_score": 90.0,
                "clarity_score": 88.0,
                "feedback": "Great job!"
            })
            mock_response.model = "gpt-3.5-turbo"
            mock_client.chat.completions.create.return_value = mock_response
            
            resp = await evaluate_viva_answer(uuid.uuid4(), ans_req, current_user=user, db=db)
            
            assert resp.content_quality_score == 85.0
            assert resp.feedback == "Great job!"
            assert resp.ai_model == "gpt-3.5-turbo"


class TestAIDiagnostics:
    """Tests for AI diagnostics service."""

    def test_is_ai_available_detects_valid_key(self):
        """Test that valid OpenAI key is detected."""
        diagnostics = AIDiagnostics()
        
        with patch("app.services.ai_diagnostics.settings") as mock_settings:
            # Valid key format
            mock_settings.openai_api_key = "sk-validkey123456789012345678901234567890"
            assert diagnostics.is_ai_available() is True
            
            # Placeholder key
            mock_settings.openai_api_key = "YOUR_OPENAI_API_KEY"
            assert diagnostics.is_ai_available() is False
            
            # Empty key
            mock_settings.openai_api_key = ""
            assert diagnostics.is_ai_available() is False

    @pytest.mark.asyncio
    async def test_ai_health_report_not_configured(self):
        """Test health report when AI is not configured."""
        diagnostics = AIDiagnostics()
        
        with patch("app.services.ai_diagnostics.settings") as mock_settings:
            mock_settings.openai_api_key = ""
            mock_settings.gladia_api_key = ""
            
            report = await diagnostics.run_full_diagnostics()
            
            assert report.overall_status == AIServiceStatus.NOT_CONFIGURED
            assert len(report.recommendations) > 0

def test_multimodal_fusion():
    """Test the multimodal fusion engine."""
    voice = VoiceMetrics(energy_score=80.0, pace_score=50.0, pause_ratio=0.1, voice_score=80.0)
    vision = VisionMetrics(eye_contact_score=75.0, head_stability_score=60.0, expression_score=50.0, face_score=75.0)
    
    result = fuse_scores(
        vision=vision,
        voice=voice,
        content_score=90.0,
    )
    assert result.confidence_score > 0
    assert len(result.suggestions) > 0



def test_group_report():
    """Test group report generation."""
    report = generate_full_report("test_room_id")
    assert report is not None
    assert report.group_metrics is not None
