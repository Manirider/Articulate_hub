import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ai_diagnostics import ai_diagnostics, AIServiceStatus
from app.services.ai_pipeline.group_report import generate_full_report, generate_individual_report
from app.services.ai_pipeline.room_analyzer import get_room_state

@pytest.mark.asyncio
async def test_openai_health_check():
    with patch("app.services.ai_diagnostics.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-" + "a" * 48
        
        mock_client = AsyncMock()
        with patch("app.services.ai_diagnostics.AsyncOpenAI", return_value=mock_client):
            mock_client.chat.completions.create.return_value = MagicMock(model="gpt-4")
            
            # Reset internal state to force new client creation
            ai_diagnostics._openai_client = None
            health = await ai_diagnostics.check_openai_health()
            assert health.status == AIServiceStatus.HEALTHY
            assert health.model == "gpt-4"

@pytest.mark.asyncio
async def test_gladia_health_check():
    with patch("app.services.ai_diagnostics.settings") as mock_settings:
        mock_settings.gladia_api_key = "test_key"
        
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_get.return_value = MagicMock(status_code=200)
            
            health = await ai_diagnostics.check_gladia_health()
            assert health.status == AIServiceStatus.HEALTHY

@pytest.mark.asyncio
async def test_full_diagnostics_report():
    with patch.object(ai_diagnostics, "check_openai_health") as mock_openai, \
         patch.object(ai_diagnostics, "check_gladia_health") as mock_gladia:
        
        mock_openai.return_value = MagicMock(status=AIServiceStatus.HEALTHY, service="openai")
        mock_gladia.return_value = MagicMock(status=AIServiceStatus.UNAVAILABLE, service="gladia")
        
        report = await ai_diagnostics.run_full_diagnostics()
        assert report.overall_status == AIServiceStatus.DEGRADED
        assert len(report.services) == 2

def test_group_report_generation():
    room_id = "group_test_room"
    state = get_room_state(room_id)
    
    # Add participants
    p1 = state.get_or_create_participant("u1", "User A")
    p1.speaking_time_seconds = 100
    p1.word_count = 50
    
    p2 = state.get_or_create_participant("u2", "User B")
    p2.speaking_time_seconds = 20
    p2.word_count = 10
    
    report = generate_full_report(room_id, mode="practice")
    assert len(report.individual_reports) == 2
    assert report.group_metrics.dominant_speaker == "u1"
    assert report.group_metrics.engagement_level == "moderate"  # 1/2 active speakers >= 50%

def test_team_report_generation():
    room_id = "team_test_room"
    state = get_room_state(room_id)
    
    p1 = state.get_or_create_participant("u1", "User A")
    p1.team = "Red"
    p1.transcript_chunks = ["Hello team"]
    
    p2 = state.get_or_create_participant("u2", "User B")
    p2.team = "Blue"
    p2.transcript_chunks = ["Hi there"]
    
    # Note: we need to mock analyze_transcript to avoid errors and get scores
    with patch("app.services.ai_pipeline.group_report.analyze_transcript") as mock_analyze:
        mock_analyze.return_value = MagicMock(
            overall_score=80.0, clarity_score=80.0, confidence_score=80.0,
            content_score=80.0, delivery_score=80.0, 
            strengths=["Good"], weaknesses=["None"], improvements=["None"]
        )
        
        report = generate_full_report(room_id, mode="team_2v2")
        assert len(report.team_reports) == 2
        assert report.winner == "tie" # Both have 80.0
