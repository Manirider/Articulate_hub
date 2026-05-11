"""Tests for session and analytics routes (app/api/v1/routes/sessions.py, analytics.py).

Covers session lifecycle, transcript append, complete flow, and analytics endpoints.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


async def _signup_and_get_token(client, email="session_test@example.com"):
    """Helper to create a user and return the auth token."""
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": "Session Tester"
    })
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_session(client):
    """Test creating a new practice session."""
    token = await _signup_and_get_token(client, "session_create@example.com")
    response = await client.post("/api/v1/sessions", json={
        "module_name": "impromptu",
        "submodule_name": "basic",
        "topic": "Test Topic"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["module_name"] == "impromptu"
    assert data["status"] == "active"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_session_unauthenticated(client):
    """Test creating session without auth returns error."""
    response = await client.post("/api/v1/sessions", json={
        "module_name": "impromptu",
        "submodule_name": "basic",
        "topic": "Test Topic"
    })
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_append_transcript(client):
    """Test appending a transcript chunk to a session."""
    token = await _signup_and_get_token(client, "transcript_test@example.com")
    session_response = await client.post("/api/v1/sessions", json={
        "module_name": "impromptu",
        "submodule_name": "basic",
        "topic": "Transcript Test"
    }, headers={"Authorization": f"Bearer {token}"})
    session_id = session_response.json()["id"]

    response = await client.post(f"/api/v1/sessions/{session_id}/transcript", json={
        "content": "Hello world, this is a test of my speaking ability.",
        "speaker": "user"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["message"] == "Transcript chunk recorded"


@pytest.mark.asyncio
async def test_append_transcript_wrong_session(client):
    """Test appending transcript to non-existent session returns 404."""
    token = await _signup_and_get_token(client, "transcript_404@example.com")
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = await client.post(f"/api/v1/sessions/{fake_uuid}/transcript", json={
        "content": "Test content",
        "speaker": "user"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_complete_session(client):
    """Test completing a session with transcript analysis."""
    token = await _signup_and_get_token(client, "complete_test@example.com")

    # Create session
    session_response = await client.post("/api/v1/sessions", json={
        "module_name": "impromptu",
        "submodule_name": "basic",
        "topic": "Complete Test"
    }, headers={"Authorization": f"Bearer {token}"})
    session_id = session_response.json()["id"]

    # Add transcript
    await client.post(f"/api/v1/sessions/{session_id}/transcript", json={
        "content": "Good morning everyone. Today I want to discuss the importance of clear communication.",
        "speaker": "user"
    }, headers={"Authorization": f"Bearer {token}"})

    # Complete session
    response = await client.post(f"/api/v1/sessions/{session_id}/complete",
        headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert "clarity_score" in data
    assert "strengths" in data


@pytest.mark.asyncio
async def test_complete_session_not_found(client):
    """Test completing a non-existent session returns 404."""
    token = await _signup_and_get_token(client, "complete_404@example.com")
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = await client.post(f"/api/v1/sessions/{fake_uuid}/complete",
        headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_leaderboard(client):
    """Test leaderboard endpoint returns entries."""
    response = await client.get("/api/v1/analytics/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert "leaderboard" in data
    assert isinstance(data["leaderboard"], list)


@pytest.mark.asyncio
async def test_analytics_overview_authenticated(client):
    """Test analytics overview for an authenticated user."""
    token = await _signup_and_get_token(client, "analytics_test@example.com")
    response = await client.get("/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "sessions_completed" in data
    assert "average_score" in data
    assert "level" in data
    assert "xp" in data
    assert "score_trend" in data


@pytest.mark.asyncio
async def test_analytics_overview_unauthenticated(client):
    """Test analytics overview without auth returns error."""
    response = await client.get("/api/v1/analytics/overview")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_transcribe_no_key(client):
    """Test transcribe endpoint returns 503 when Gladia key not configured."""
    token = await _signup_and_get_token(client, "transcribe_test@example.com")
    import io
    # Create a fake audio file
    audio_content = b"fake audio content bytes"
    response = await client.post(
        "/api/v1/sessions/transcribe",
        files={"file": ("audio.wav", io.BytesIO(audio_content), "audio/wav")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_transcribe_empty_audio(client):
    """Test transcribe endpoint rejects empty audio."""
    token = await _signup_and_get_token(client, "transcribe_empty@example.com")
    import io
    response = await client.post(
        "/api/v1/sessions/transcribe",
        files={"file": ("audio.wav", io.BytesIO(b""), "audio/wav")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
